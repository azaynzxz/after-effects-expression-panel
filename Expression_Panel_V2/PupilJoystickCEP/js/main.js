var csInterface = new CSInterface();

document.addEventListener("DOMContentLoaded", function () {
    var ddTarget = document.getElementById("ddTarget");
    var btnScan = document.getElementById("btnScan");
    var customTargetRow = document.getElementById("customTargetRow");
    var txtCustomTarget = document.getElementById("txtCustomTarget");
    var btnAddCustom = document.getElementById("btnAddCustom");
    var btnCancelCustom = document.getElementById("btnCancelCustom");

    var txtOriginX = document.getElementById("txtOriginX");
    var txtOriginY = document.getElementById("txtOriginY");
    var btnGetOrigin = document.getElementById("btnGetOrigin");
    var btnResetOrigin = document.getElementById("btnResetOrigin");

    var chkRelative = document.getElementById("chkRelative");
    var chkAutoSync = document.getElementById("chkAutoSync");
    var chkMirrored = document.getElementById("chkMirrored");

    var txtRange = document.getElementById("txtRange");
    var btnReset = document.getElementById("btnReset");

    var pad = document.getElementById("pad");
    var knob = document.getElementById("knob");
    var padSvg = document.getElementById("pad-svg");
    var joyLine = document.getElementById("joy-line");

    var sliderX = document.getElementById("sliderX");
    var txtValX = document.getElementById("txtValX");
    var sliderY = document.getElementById("sliderY");
    var txtValY = document.getElementById("txtValY");

    var lblResult = document.getElementById("lblResult");

    // --- State Variables ---
    var currentX = 0;
    var currentY = 0;
    var originX = 0;
    var originY = 0;
    var isDragging = false;
    var isScrubbingSlider = false;
    var sliderCommitTimer = null;
    var lastValidTarget = "Position";

    // Serialized non-queueing evalScript state for smooth 60fps dragging + single Undo group
    var isEvalBusy = false;
    var pendingStart = null;
    var pendingLive = null;
    var pendingCommit = null;
    var lastAutoSyncTime = 0;

    function escapeForEval(str) {
        return String(str)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n");
    }

    function parseHostJSON(resStr) {
        if (!resStr || typeof resStr !== "string") return null;
        try {
            return JSON.parse(resStr);
        } catch (e) {
            return null;
        }
    }

    function getRangeVal() {
        var r = parseFloat(txtRange.value);
        if (isNaN(r) || r <= 0) r = 100;
        return r;
    }

    function getActiveTargetName() {
        var val = ddTarget.value;
        if (!val || val === "(Custom...)") {
            return lastValidTarget || "Position";
        }
        return val;
    }

    function calculateLocalTargetCoords(rawX, rawY) {
        var outX = Number(rawX) || 0;
        var outY = Number(rawY) || 0;
        if (chkMirrored.checked) {
            outX = -outX;
        }
        if (chkRelative.checked) {
            return [originX + outX, originY + outY];
        }
        return [outX, outY];
    }

    function updateResultDisplay() {
        var coords = calculateLocalTargetCoords(currentX, currentY);
        lblResult.textContent = "Final Target: (" + coords[0].toFixed(1) + ", " + coords[1].toFixed(1) + ")";
    }

    function updatePadAndSlidersUI(skipTextInputs) {
        var rangeVal = getRangeVal();
        var padW = pad.clientWidth || 220;
        var padH = pad.clientHeight || 220;
        var knobW = knob.offsetWidth || 22;
        var knobH = knob.offsetHeight || 22;

        var safeX = Math.max(-rangeVal, Math.min(rangeVal, currentX));
        var safeY = Math.max(-rangeVal, Math.min(rangeVal, currentY));

        var localX = (safeX / rangeVal) * (padW / 2) + (padW / 2);
        var localY = (safeY / rangeVal) * (padH / 2) + (padH / 2);

        knob.style.left = (localX - knobW / 2) + "px";
        knob.style.top = (localY - knobH / 2) + "px";

        padSvg.setAttribute("viewBox", "0 0 " + padW + " " + padH);
        joyLine.setAttribute("x1", String(padW / 2));
        joyLine.setAttribute("y1", String(padH / 2));
        joyLine.setAttribute("x2", String(localX));
        joyLine.setAttribute("y2", String(localY));

        sliderX.value = safeX;
        sliderY.value = safeY;

        if (!skipTextInputs) {
            if (document.activeElement !== txtValX) {
                txtValX.value = currentX;
            }
            if (document.activeElement !== txtValY) {
                txtValY.value = currentY;
            }
        }

        updateResultDisplay();
    }

    function applyHostStateToUI(data, isLiveDrag) {
        if (!data) return;

        if (typeof data.originX === "number" && !isNaN(data.originX)) {
            originX = data.originX;
            if (document.activeElement !== txtOriginX) {
                txtOriginX.value = originX;
            }
        }
        if (typeof data.originY === "number" && !isNaN(data.originY)) {
            originY = data.originY;
            if (document.activeElement !== txtOriginY) {
                txtOriginY.value = originY;
            }
        }

        if (!isLiveDrag) {
            if (data.resetOffset) {
                currentX = 0;
                currentY = 0;
                updatePadAndSlidersUI(false);
            } else if (data.offsetUpdated && typeof data.currentX === "number" && typeof data.currentY === "number") {
                currentX = data.currentX;
                currentY = data.currentY;
                updatePadAndSlidersUI(false);
            }
        }

        updateResultDisplay();
    }

    function populateTargetDropdown(propsList, selectedTarget) {
        ddTarget.innerHTML = "";
        var foundSelected = false;

        for (var i = 0; i < propsList.length; i++) {
            var opt = document.createElement("option");
            opt.value = propsList[i];
            opt.textContent = propsList[i];
            ddTarget.appendChild(opt);
            if (propsList[i] === selectedTarget) {
                foundSelected = true;
            }
        }

        if (selectedTarget && selectedTarget !== "(Custom...)" && !foundSelected) {
            var extraOpt = document.createElement("option");
            extraOpt.value = selectedTarget;
            extraOpt.textContent = selectedTarget;
            ddTarget.appendChild(extraOpt);
        }

        var customOpt = document.createElement("option");
        customOpt.value = "(Custom...)";
        customOpt.textContent = "(Custom...)";
        ddTarget.appendChild(customOpt);

        if (selectedTarget && selectedTarget !== "(Custom...)") {
            ddTarget.value = selectedTarget;
            lastValidTarget = selectedTarget;
        } else if (ddTarget.options.length > 1) {
            ddTarget.selectedIndex = 0;
            lastValidTarget = ddTarget.value;
        }
    }

    // ========================================================================
    // Non-Queueing Live Drag & Single Undo Group Execution Pipeline
    // ========================================================================

    function flushEvalQueue() {
        if (pendingStart) {
            var s = pendingStart;
            pendingStart = null;
            runStartDrag(s);
            return;
        }
        if (pendingCommit) {
            var c = pendingCommit;
            pendingCommit = null;
            pendingLive = null;
            runCommitDrag(c.x, c.y);
            return;
        }
        if (pendingLive) {
            var l = pendingLive;
            pendingLive = null;
            runLiveDrag(l.x, l.y);
            return;
        }
        isEvalBusy = false;
    }

    function runStartDrag(payload) {
        isEvalBusy = true;
        var script = 'host_startDrag("' +
            escapeForEval(payload.targetName) + '", ' +
            payload.x + ', ' +
            payload.y + ', ' +
            payload.isRelative + ', ' +
            payload.isAutoSync + ', ' +
            payload.isMirrored + ', ' +
            payload.wasAtCenter + ')';

        csInterface.evalScript(script, function (res) {
            var data = parseHostJSON(res);
            if (data) {
                applyHostStateToUI(data, true);
            }
            flushEvalQueue();
        });
    }

    function runLiveDrag(x, y) {
        isEvalBusy = true;
        var script = 'host_applyLive(' + x + ', ' + y + ')';
        csInterface.evalScript(script, function (res) {
            var data = parseHostJSON(res);
            if (data) {
                applyHostStateToUI(data, true);
            }
            flushEvalQueue();
        });
    }

    function runCommitDrag(x, y) {
        isEvalBusy = true;
        var script = 'host_commitDrag(' + x + ', ' + y + ')';
        csInterface.evalScript(script, function (res) {
            var data = parseHostJSON(res);
            if (data) {
                applyHostStateToUI(data, true);
            }
            flushEvalQueue();
        });
    }

    function beginInteractiveDrag(wasAtCenter) {
        pendingLive = null;
        pendingCommit = null;
        var payload = {
            targetName: getActiveTargetName(),
            x: currentX,
            y: currentY,
            isRelative: chkRelative.checked,
            isAutoSync: chkAutoSync.checked,
            isMirrored: chkMirrored.checked,
            wasAtCenter: wasAtCenter
        };
        if (!isEvalBusy) {
            runStartDrag(payload);
        } else {
            pendingStart = payload;
        }
    }

    function queueLiveDrag(x, y) {
        if (pendingStart) {
            pendingStart.x = x;
            pendingStart.y = y;
            return;
        }
        if (!isEvalBusy) {
            runLiveDrag(x, y);
        } else {
            pendingLive = { x: x, y: y };
        }
    }

    function finishInteractiveDrag(x, y) {
        pendingLive = null;
        if (!isEvalBusy && !pendingStart) {
            runCommitDrag(x, y);
        } else {
            pendingCommit = { x: x, y: y };
        }
    }

    // ========================================================================
    // Auto-Sync Helper
    // ========================================================================

    function requestAutoSync(force) {
        if (isDragging || isScrubbingSlider || isEvalBusy) return;
        if (!chkAutoSync.checked && !force) return;

        var now = Date.now();
        if (!force && now - lastAutoSyncTime < 150) return;
        lastAutoSyncTime = now;

        var script = 'host_autoSync("' +
            escapeForEval(getActiveTargetName()) + '", ' +
            currentX + ', ' +
            currentY + ', ' +
            chkRelative.checked + ', ' +
            chkAutoSync.checked + ', ' +
            chkMirrored.checked + ', ' +
            getRangeVal() + ')';

        csInterface.evalScript(script, function (res) {
            if (isDragging || isScrubbingSlider) return;
            var data = parseHostJSON(res);
            if (data && data.synced) {
                applyHostStateToUI(data, false);
            }
        });
    }

    // ========================================================================
    // 2D Pad Mouse Handling
    // ========================================================================

    function computePadCoordsFromEvent(e) {
        var rangeVal = getRangeVal();
        var rect = pad.getBoundingClientRect();
        var padW = pad.clientWidth || 220;
        var padH = pad.clientHeight || 220;
        var borderLeft = pad.clientLeft || 0;
        var borderTop = pad.clientTop || 0;

        var rawX = e.clientX - rect.left - borderLeft;
        var rawY = e.clientY - rect.top - borderTop;

        if (rawX < 0) rawX = 0;
        if (rawX > padW) rawX = padW;
        if (rawY < 0) rawY = 0;
        if (rawY > padH) rawY = padH;

        var nextX = ((rawX - padW / 2) / (padW / 2)) * rangeVal;
        var nextY = ((rawY - padH / 2) / (padH / 2)) * rangeVal;

        if (e.shiftKey) {
            if (Math.abs(nextX) >= Math.abs(nextY)) {
                nextY = 0;
            } else {
                nextX = 0;
            }
        }

        currentX = Math.round(nextX * 10) / 10;
        currentY = Math.round(nextY * 10) / 10;
    }

    pad.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault();

        var wasAtCenter = (currentX === 0 && currentY === 0);
        isDragging = true;

        computePadCoordsFromEvent(e);
        updatePadAndSlidersUI(false);
        beginInteractiveDrag(wasAtCenter);
    });

    window.addEventListener("mousemove", function (e) {
        if (!isDragging) return;
        computePadCoordsFromEvent(e);
        updatePadAndSlidersUI(false);
        queueLiveDrag(currentX, currentY);
    });

    function endPadDrag(e) {
        if (!isDragging) return;
        if (e && typeof e.clientX === "number") {
            computePadCoordsFromEvent(e);
            updatePadAndSlidersUI(false);
        }
        isDragging = false;
        finishInteractiveDrag(currentX, currentY);
    }

    window.addEventListener("mouseup", endPadDrag);

    window.addEventListener("mouseleave", function () {
        if (isDragging) {
            endPadDrag(null);
        }
    });

    window.addEventListener("blur", function () {
        if (isDragging) {
            endPadDrag(null);
        }
    });

    // ========================================================================
    // Sliders & Coordinate Inputs
    // ========================================================================

    function scheduleSliderAutoCommit() {
        if (sliderCommitTimer !== null) {
            clearTimeout(sliderCommitTimer);
        }
        sliderCommitTimer = setTimeout(function () {
            sliderCommitTimer = null;
            if (isScrubbingSlider) {
                isScrubbingSlider = false;
                finishInteractiveDrag(currentX, currentY);
            }
        }, 400);
    }

    function handleSliderStart() {
        if (!isScrubbingSlider) {
            var wasAtCenter = (currentX === 0 && currentY === 0);
            isScrubbingSlider = true;
            beginInteractiveDrag(wasAtCenter);
        }
    }

    function handleSliderEnd() {
        if (sliderCommitTimer !== null) {
            clearTimeout(sliderCommitTimer);
            sliderCommitTimer = null;
        }
        if (isScrubbingSlider) {
            isScrubbingSlider = false;
            finishInteractiveDrag(currentX, currentY);
        }
    }

    sliderX.addEventListener("mousedown", handleSliderStart);
    sliderY.addEventListener("mousedown", handleSliderStart);

    sliderX.addEventListener("input", function () {
        var wasAtCenter = (currentX === 0 && currentY === 0);
        currentX = Math.round((parseFloat(this.value) || 0) * 10) / 10;
        txtValX.value = currentX;
        updatePadAndSlidersUI(true);

        if (!isScrubbingSlider) {
            isScrubbingSlider = true;
            beginInteractiveDrag(wasAtCenter);
        } else {
            queueLiveDrag(currentX, currentY);
        }
        scheduleSliderAutoCommit();
    });

    sliderY.addEventListener("input", function () {
        var wasAtCenter = (currentX === 0 && currentY === 0);
        currentY = Math.round((parseFloat(this.value) || 0) * 10) / 10;
        txtValY.value = currentY;
        updatePadAndSlidersUI(true);

        if (!isScrubbingSlider) {
            isScrubbingSlider = true;
            beginInteractiveDrag(wasAtCenter);
        } else {
            queueLiveDrag(currentX, currentY);
        }
        scheduleSliderAutoCommit();
    });

    sliderX.addEventListener("change", handleSliderEnd);
    sliderY.addEventListener("change", handleSliderEnd);
    sliderX.addEventListener("mouseup", handleSliderEnd);
    sliderY.addEventListener("mouseup", handleSliderEnd);

    txtValX.addEventListener("change", function () {
        currentX = parseFloat(this.value) || 0;
        this.value = currentX;
        updatePadAndSlidersUI(true);
        csInterface.evalScript('host_setOffsetDirect(' + currentX + ', ' + currentY + ', "X")', function (res) {
            applyHostStateToUI(parseHostJSON(res), false);
        });
    });

    txtValY.addEventListener("change", function () {
        currentY = parseFloat(this.value) || 0;
        this.value = currentY;
        updatePadAndSlidersUI(true);
        csInterface.evalScript('host_setOffsetDirect(' + currentX + ', ' + currentY + ', "Y")', function (res) {
            applyHostStateToUI(parseHostJSON(res), false);
        });
    });

    // ========================================================================
    // Target Dropdown, Custom Property Input & Scan Button
    // ========================================================================

    ddTarget.addEventListener("change", function () {
        if (this.value === "(Custom...)") {
            customTargetRow.classList.remove("hidden");
            txtCustomTarget.value = "";
            txtCustomTarget.focus();
            return;
        }

        customTargetRow.classList.add("hidden");
        lastValidTarget = this.value;
        csInterface.evalScript('host_selectTarget("' + escapeForEval(this.value) + '")', function (res) {
            applyHostStateToUI(parseHostJSON(res), false);
        });
    });

    function confirmCustomTarget() {
        var customName = txtCustomTarget.value.replace(/^\s+|\s+$/g, "");
        customTargetRow.classList.add("hidden");

        if (!customName) {
            ddTarget.value = lastValidTarget;
            return;
        }

        var exists = false;
        for (var i = 0; i < ddTarget.options.length; i++) {
            if (ddTarget.options[i].value === customName) {
                exists = true;
                break;
            }
        }

        if (!exists) {
            var newOpt = document.createElement("option");
            newOpt.value = customName;
            newOpt.textContent = customName;
            ddTarget.insertBefore(newOpt, ddTarget.options[ddTarget.options.length - 1]);
        }

        ddTarget.value = customName;
        lastValidTarget = customName;

        csInterface.evalScript('host_selectTarget("' + escapeForEval(customName) + '")', function (res) {
            applyHostStateToUI(parseHostJSON(res), false);
        });
    }

    btnAddCustom.addEventListener("click", confirmCustomTarget);

    btnCancelCustom.addEventListener("click", function () {
        customTargetRow.classList.add("hidden");
        ddTarget.value = lastValidTarget;
    });

    txtCustomTarget.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            confirmCustomTarget();
        } else if (e.key === "Escape") {
            e.preventDefault();
            customTargetRow.classList.add("hidden");
            ddTarget.value = lastValidTarget;
        }
    });

    btnScan.addEventListener("click", function () {
        customTargetRow.classList.add("hidden");
        csInterface.evalScript("host_initOrScan(true)", function (res) {
            var data = parseHostJSON(res);
            if (data && data.ok && data.props) {
                populateTargetDropdown(data.props, data.selectedTarget);
                applyHostStateToUI(data, false);
            }
        });
    });

    // ========================================================================
    // Origin (Base Position) & Options Controls
    // ========================================================================

    btnGetOrigin.addEventListener("click", function () {
        csInterface.evalScript("host_getOrigin(true)", function (res) {
            var data = parseHostJSON(res);
            if (data && data.ok) {
                applyHostStateToUI(data, false);
            }
        });
    });

    function resetToOriginal() {
        currentX = 0;
        currentY = 0;
        updatePadAndSlidersUI(false);
        csInterface.evalScript("host_resetToOriginal()", function (res) {
            applyHostStateToUI(parseHostJSON(res), false);
        });
    }

    btnResetOrigin.addEventListener("click", resetToOriginal);
    btnReset.addEventListener("click", resetToOriginal);
    pad.addEventListener("dblclick", resetToOriginal);

    function handleOriginInputChange() {
        originX = parseFloat(txtOriginX.value) || 0;
        originY = parseFloat(txtOriginY.value) || 0;
        txtOriginX.value = originX;
        txtOriginY.value = originY;
        updateResultDisplay();

        var script = 'host_setOriginDirect(' +
            originX + ', ' +
            originY + ', ' +
            currentX + ', ' +
            currentY + ', ' +
            chkRelative.checked + ', ' +
            chkMirrored.checked + ')';
        csInterface.evalScript(script, function (res) {
            applyHostStateToUI(parseHostJSON(res), false);
        });
    }

    txtOriginX.addEventListener("change", handleOriginInputChange);
    txtOriginY.addEventListener("change", handleOriginInputChange);

    chkRelative.addEventListener("change", function () {
        updateResultDisplay();
        var script = 'host_setOptions(' +
            chkRelative.checked + ', ' +
            chkAutoSync.checked + ', ' +
            chkMirrored.checked + ', ' +
            currentX + ', ' +
            currentY + ', "Joystick Toggle Relative")';
        csInterface.evalScript(script, function (res) {
            applyHostStateToUI(parseHostJSON(res), false);
        });
    });

    chkMirrored.addEventListener("change", function () {
        updateResultDisplay();
        var script = 'host_setOptions(' +
            chkRelative.checked + ', ' +
            chkAutoSync.checked + ', ' +
            chkMirrored.checked + ', ' +
            currentX + ', ' +
            currentY + ', "Joystick Toggle Invert X")';
        csInterface.evalScript(script, function (res) {
            applyHostStateToUI(parseHostJSON(res), false);
        });
    });

    chkAutoSync.addEventListener("change", function () {
        var script = 'host_setOptions(' +
            chkRelative.checked + ', ' +
            chkAutoSync.checked + ', ' +
            chkMirrored.checked + ', ' +
            currentX + ', ' +
            currentY + ', "")';
        csInterface.evalScript(script, function () {
            if (chkAutoSync.checked) {
                requestAutoSync(true);
            }
        });
    });

    txtRange.addEventListener("change", function () {
        var r = getRangeVal();
        this.value = r;
        sliderX.min = -r;
        sliderX.max = r;
        sliderY.min = -r;
        sliderY.max = r;
        updatePadAndSlidersUI(false);
    });

    txtRange.addEventListener("input", function () {
        var r = parseFloat(this.value);
        if (!isNaN(r) && r > 0) {
            sliderX.min = -r;
            sliderX.max = r;
            sliderY.min = -r;
            sliderY.max = r;
            updatePadAndSlidersUI(false);
        }
    });

    // ========================================================================
    // Auto-Sync Hover / Focus & Keyboard Undo Forwarding
    // ========================================================================

    window.addEventListener("mouseenter", function () {
        requestAutoSync(false);
    });

    window.addEventListener("focus", function () {
        requestAutoSync(false);
    });

    pad.addEventListener("mouseenter", function () {
        requestAutoSync(false);
    });

    // Forward Ctrl+Z / Cmd+Z to After Effects when CEP panel has focus so Undo works immediately
    window.addEventListener("keydown", function (e) {
        var active = document.activeElement;
        var isTyping = active && (active.tagName === "INPUT" && active.type !== "range" && active.type !== "checkbox");
        if (isTyping) return;

        var isMod = e.ctrlKey || e.metaKey;
        if (isMod && e.key.toLowerCase() === "z") {
            e.preventDefault();
            var isRedo = e.shiftKey;
            csInterface.evalScript("host_triggerUndoRedo(" + isRedo + ")", function (res) {
                applyHostStateToUI(parseHostJSON(res), false);
            });
        } else if (isMod && e.key.toLowerCase() === "y") {
            e.preventDefault();
            csInterface.evalScript("host_triggerUndoRedo(true)", function (res) {
                applyHostStateToUI(parseHostJSON(res), false);
            });
        }
    });

    // ========================================================================
    // Startup Initialization
    // ========================================================================

    var extPath = csInterface.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, "/");
    csInterface.evalScript('$.evalFile("' + extPath + '/jsx/host.jsx")', function () {
        csInterface.evalScript("host_initOrScan(false)", function (res) {
            var data = parseHostJSON(res);
            if (data && data.props) {
                populateTargetDropdown(data.props, data.selectedTarget);
                applyHostStateToUI(data, false);
            } else {
                updatePadAndSlidersUI(false);
            }
        });
    });
});
