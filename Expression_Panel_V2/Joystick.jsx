(function (thisObj) {
    var winName = "Joystick";
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", winName, undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 10;

    // Top Row: Target Dropdown & Scan Button
    var grpTop = win.add("group");
    grpTop.orientation = "row";
    grpTop.alignChildren = ["left", "center"];
    grpTop.spacing = 4;
    grpTop.add("statictext", undefined, "Target:");

    var ddTarget = grpTop.add("dropdownlist", undefined, ["Position", "(Custom...)"]);
    ddTarget.preferredSize.width = 135;

    var btnScan = grpTop.add("button", undefined, "Scan");
    btnScan.preferredSize = [45, 20];
    btnScan.helpTip = "Scan Essential Properties and Effects on the selected layer";

    // Row 2: Range & Mirrored
    var grpTop2 = win.add("group");
    grpTop2.orientation = "row";
    grpTop2.alignChildren = ["left", "center"];
    grpTop2.spacing = 6;
    grpTop2.add("statictext", undefined, "Range:");
    var txtRange = grpTop2.add("edittext", undefined, "100");
    txtRange.preferredSize.width = 40;
    var chkMirrored = grpTop2.add("checkbox", undefined, "isMirrored");
    chkMirrored.helpTip = "Invert the X axis so it behaves properly for horizontally flipped compositions.";

    var btnReset = win.add("button", undefined, "Reset to 0, 0");

    // Coordinates Row
    var valGrp = win.add("group");
    valGrp.orientation = "row";
    valGrp.alignChildren = ["left", "center"];
    var lblX = valGrp.add("statictext", undefined, "X:");
    var txtValX = valGrp.add("edittext", undefined, "0");
    txtValX.preferredSize.width = 50;
    var lblY = valGrp.add("statictext", undefined, "Y:");
    var txtValY = valGrp.add("edittext", undefined, "0");
    txtValY.preferredSize.width = 50;

    var joySize = 250;
    var knobSize = 24;
    var currentX = 0;
    var currentY = 0;

    // 2D Joystick Pad
    var pad = win.add("group");
    pad.preferredSize = [joySize, joySize];
    pad.margins = 0;

    pad.onDraw = function () {
        var g = this.graphics;
        if (!g) return;

        var bgBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.18, 0.18, 0.18, 1]);
        g.newPath();
        g.rectPath(0, 0, joySize, joySize);
        g.fillPath(bgBrush);

        var gridPen = g.newPen(g.PenType.SOLID_COLOR, [0.3, 0.3, 0.3, 1], 1);
        g.newPath();
        g.moveTo(joySize / 2, 0); g.lineTo(joySize / 2, joySize);
        g.moveTo(0, joySize / 2); g.lineTo(joySize, joySize / 2);
        g.strokePath(gridPen);

        var rangeVal = parseFloat(txtRange.text) || 100;
        var safeX = Math.max(-rangeVal, Math.min(rangeVal, currentX));
        var safeY = Math.max(-rangeVal, Math.min(rangeVal, currentY));

        var localX = (safeX / rangeVal) * (joySize / 2) + (joySize / 2);
        var localY = (safeY / rangeVal) * (joySize / 2) + (joySize / 2);

        var borderPen = g.newPen(g.PenType.SOLID_COLOR, [0.9, 0.9, 0.9, 1], 2);
        var knobBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.1, 0.5, 0.9, 1]);

        g.newPath();
        g.ellipsePath(localX - knobSize / 2, localY - knobSize / 2, knobSize, knobSize);
        g.fillPath(knobBrush);
        g.strokePath(borderPen);
    };

    function triggerRedraw() {
        pad.helpTip = pad.helpTip === " " ? "" : " ";
        if (win instanceof Window) win.update();
        else win.layout.layout(true);
    }

    // Property scanner modeled after SmartRig.jsx
    function scanLayerProperties(layer) {
        var propsList = [];
        if (!layer) return propsList;

        // 1. Scan Essential Properties (ADBE Master Properties)
        try {
            var essProps = layer.property("ADBE Master Properties");
            if (!essProps) essProps = layer.property("Essential Properties");
            if (essProps) {
                for (var i = 1; i <= essProps.numProperties; i++) {
                    var prop = essProps.property(i);
                    if (prop && prop.name) {
                        propsList.push(prop.name);
                    }
                }
            }
        } catch (e) { }

        // 2. Scan Effects (ADBE Effect Parade)
        try {
            var fxParade = layer.property("ADBE Effect Parade");
            if (!fxParade) fxParade = layer.property("Effects");
            if (fxParade) {
                for (var i = 1; i <= fxParade.numProperties; i++) {
                    var fx = fxParade.property(i);
                    if (fx && fx.name) {
                        var alreadyIn = false;
                        for (var k = 0; k < propsList.length; k++) {
                            if (propsList[k] === fx.name) {
                                alreadyIn = true;
                                break;
                            }
                        }
                        if (!alreadyIn) {
                            propsList.push(fx.name);
                        }
                    }
                }
            }
        } catch (e) { }

        // 3. Transform properties
        propsList.push("Position");
        propsList.push("Anchor Point");

        return propsList;
    }

    function updateTargetDropdown(scannedList) {
        var prevTarget = "";
        if (ddTarget.selection && ddTarget.selection.text !== "(Custom...)") {
            prevTarget = ddTarget.selection.text;
        } else if (app.settings && app.settings.haveSetting("Joystick", "target_prop")) {
            prevTarget = app.settings.getSetting("Joystick", "target_prop");
        } else {
            prevTarget = "pupil-ctrl Position";
        }

        ddTarget.removeAll();

        var matchedIdx = -1;
        var keywords = ["joystick", "pupil", "look", "eye", "head", "face", "pos", "point", "ctrl"];

        for (var i = 0; i < scannedList.length; i++) {
            var itemText = scannedList[i];
            ddTarget.add("item", itemText);

            if (itemText === prevTarget) {
                matchedIdx = i;
            } else if (matchedIdx === -1) {
                var lower = itemText.toLowerCase();
                for (var k = 0; k < keywords.length; k++) {
                    if (lower.indexOf(keywords[k]) !== -1) {
                        matchedIdx = i;
                        break;
                    }
                }
            }
        }

        if (prevTarget && prevTarget !== "" && prevTarget !== "(Custom...)") {
            var foundPrev = false;
            for (var i = 0; i < scannedList.length; i++) {
                if (scannedList[i] === prevTarget) {
                    foundPrev = true;
                    break;
                }
            }
            if (!foundPrev) {
                ddTarget.add("item", prevTarget);
                if (matchedIdx === -1) matchedIdx = ddTarget.items.length - 1;
            }
        }

        ddTarget.add("item", "(Custom...)");

        if (matchedIdx >= 0 && matchedIdx < ddTarget.items.length) {
            ddTarget.selection = matchedIdx;
        } else if (ddTarget.items.length > 1) {
            ddTarget.selection = 0;
        }

        if (ddTarget.selection && ddTarget.selection.text !== "(Custom...)" && app.settings) {
            app.settings.saveSetting("Joystick", "target_prop", ddTarget.selection.text);
        }
    }

    ddTarget.onChange = function () {
        if (!this.selection) return;
        if (this.selection.text === "(Custom...)") {
            var custom = prompt("Enter target property or effect name (e.g. pupil-ctrl Position, Point Control):", "");
            if (custom && custom !== "") {
                var itm = this.add("item", custom);
                this.selection = itm;
                if (app.settings) app.settings.saveSetting("Joystick", "target_prop", custom);
            } else {
                this.selection = 0;
            }
        } else {
            if (app.settings) app.settings.saveSetting("Joystick", "target_prop", this.selection.text);
        }
    };

    btnScan.onClick = function () {
        if (!app.project || !app.project.activeItem) {
            alert("Please open an active composition first.");
            return;
        }
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("Active item is not a composition.");
            return;
        }
        if (comp.selectedLayers.length === 0) {
            alert("Please select a layer with Essential Properties, Effects, or Transform properties.");
            return;
        }

        var layer = comp.selectedLayers[0];
        var scanned = scanLayerProperties(layer);
        updateTargetDropdown(scanned);
    };

    var isDragging = false;
    var hasStartedUndo = false;

    function applyTargetValue(x, y, isFinal) {
        if (!app.project || !app.project.activeItem) return;
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return;
        var layers = comp.selectedLayers;
        if (layers.length === 0) return;

        var targetName = (ddTarget && ddTarget.selection) ? ddTarget.selection.text : "Position";
        if (!targetName || targetName === "(Custom...)") return;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var targetProp = null;

            // 1. Essential Properties
            try {
                var essProps = layer.property("ADBE Master Properties");
                if (!essProps) essProps = layer.property("Essential Properties");
                if (essProps) {
                    targetProp = essProps.property(targetName);
                }
            } catch (e) { }

            // 2. Effects
            if (!targetProp) {
                try {
                    var effects = layer.property("ADBE Effect Parade") || layer.property("Effects");
                    if (effects) {
                        var fx = effects.property(targetName);
                        if (fx) {
                            if (fx.numProperties && fx.numProperties >= 1) {
                                targetProp = fx.property(1);
                            } else {
                                targetProp = fx;
                            }
                        }
                    }
                } catch (e) { }
            }

            // 3. Transform Properties
            if (!targetProp) {
                try {
                    var lower = targetName.toLowerCase();
                    if (lower === "position") {
                        targetProp = layer.transform.position;
                    } else if (lower === "anchor point") {
                        targetProp = layer.transform.anchorPoint;
                    }
                } catch (e) { }
            }

            if (targetProp && targetProp.setValue) {
                var outX = x;
                var outY = y;
                if (chkMirrored.value) {
                    outX = -outX;
                }

                try {
                    var curVal = targetProp.value;
                    var newVal = [outX, outY];
                    if (curVal instanceof Array) {
                        if (curVal.length === 3) {
                            newVal = [outX, outY, curVal[2]];
                        } else if (curVal.length === 2) {
                            newVal = [outX, outY];
                        }
                    } else if (typeof curVal === "number") {
                        newVal = outX;
                    }

                    if (isFinal) {
                        if (targetProp.canSetExpression && targetProp.numKeys !== undefined) {
                            targetProp.setValueAtTime(comp.time, newVal);
                        } else {
                            targetProp.setValue(newVal);
                        }
                    } else {
                        targetProp.setValue(newVal);
                    }
                } catch (e) { }
            }
        }
    }

    function processMouseCoords(rawX, rawY, isFinal) {
        var rangeVal = parseFloat(txtRange.text) || 100;

        if (rawX < 0) rawX = 0;
        if (rawX > joySize) rawX = joySize;
        if (rawY < 0) rawY = 0;
        if (rawY > joySize) rawY = joySize;

        currentX = ((rawX - joySize / 2) / (joySize / 2)) * rangeVal;
        currentY = ((rawY - joySize / 2) / (joySize / 2)) * rangeVal;

        currentX = Math.round(currentX * 10) / 10;
        currentY = Math.round(currentY * 10) / 10;

        txtValX.text = currentX.toString();
        txtValY.text = currentY.toString();

        triggerRedraw();
        applyTargetValue(currentX, currentY, isFinal);
    }

    // Interactions
    txtValX.onChange = function () {
        currentX = parseFloat(txtValX.text) || 0;
        app.beginUndoGroup("Joystick Adjust");
        triggerRedraw();
        applyTargetValue(currentX, currentY, true);
        app.endUndoGroup();
    };

    txtValY.onChange = function () {
        currentY = parseFloat(txtValY.text) || 0;
        app.beginUndoGroup("Joystick Adjust");
        triggerRedraw();
        applyTargetValue(currentX, currentY, true);
        app.endUndoGroup();
    };

    txtRange.onChange = triggerRedraw;

    chkMirrored.onClick = function () {
        app.beginUndoGroup("Joystick Adjust");
        applyTargetValue(currentX, currentY, true);
        app.endUndoGroup();
    };

    btnReset.onClick = function () {
        app.beginUndoGroup("Joystick Reset");
        currentX = 0;
        currentY = 0;
        txtValX.text = "0";
        txtValY.text = "0";
        triggerRedraw();
        applyTargetValue(0, 0, true);
        app.endUndoGroup();
    };

    // Safe Event Listeners
    pad.addEventListener("mousedown", function (e) {
        if (!hasStartedUndo) {
            app.beginUndoGroup("Joystick Drag");
            hasStartedUndo = true;
        }
        isDragging = true;
        processMouseCoords(e.clientX, e.clientY, false);
    });

    pad.addEventListener("mousemove", function (e) {
        if (isDragging) {
            processMouseCoords(e.clientX, e.clientY, false);
        }
    });

    function finishDrag(e) {
        if (isDragging) {
            isDragging = false;
            if (e && typeof e.clientX !== "undefined") {
                processMouseCoords(e.clientX, e.clientY, true);
            } else {
                applyTargetValue(currentX, currentY, true);
            }
            if (hasStartedUndo) {
                app.endUndoGroup();
                hasStartedUndo = false;
            }
        }
    }

    pad.addEventListener("mouseup", finishDrag);
    win.addEventListener("mouseup", finishDrag);
    win.addEventListener("mouseleave", function (e) {
        finishDrag(e);
    });

    // Auto-scan on load if a layer is selected, otherwise initialize with default/cached targets
    try {
        if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem) && app.project.activeItem.selectedLayers.length > 0) {
            var initProps = scanLayerProperties(app.project.activeItem.selectedLayers[0]);
            updateTargetDropdown(initProps);
        } else {
            var defaultProps = ["pupil-ctrl Position", "Position", "Anchor Point"];
            updateTargetDropdown(defaultProps);
        }
    } catch (e) { }

    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
        win.layout.resize();
    }
})(this);
