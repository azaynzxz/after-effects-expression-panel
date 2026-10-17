(function (thisObj) {
    var winName = "Joystick";
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", winName, undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 8;

    // --- State Variables ---
    var joySize = 220;
    var knobSize = 22;
    var currentX = 0;
    var currentY = 0;
    var originX = 0;
    var originY = 0;
    var isDragging = false;
    var hasLiveUndo = false;
    var lastLiveUpdateTime = 0;
    var sliderTimerId = 0;
    var layerBaseMap = {};
    var lastLayerKey = "";

    function clearLiveUndo() {
        if (hasLiveUndo) {
            try { app.executeCommand(16); } catch (e) { }
            hasLiveUndo = false;
        }
    }

    // Global helper for auto-committing slider scrub when mouseup is dropped by ScriptUI
    $.global.joystick_autoCommit = function () {
        if (!isDragging && hasLiveUndo) {
            commitDrag(currentX, currentY);
        }
    };

    // ==========================================
    // 1. Top Row: Target Dropdown & Scan Button
    // ==========================================
    var grpTop = win.add("group");
    grpTop.orientation = "row";
    grpTop.alignChildren = ["left", "center"];
    grpTop.spacing = 4;
    grpTop.add("statictext", undefined, "Target:");

    var ddTarget = grpTop.add("dropdownlist", undefined, ["Position", "Anchor Point", "(Custom...)"]);
    ddTarget.preferredSize.width = 135;

    var btnScan = grpTop.add("button", undefined, "Scan");
    btnScan.preferredSize = [45, 20];
    btnScan.helpTip = "Scan Essential Properties, Effects, and Transform properties on the selected layer";

    // ==========================================
    // 2. Origin (Base Position) Section
    // ==========================================
    var pnlOrigin = win.add("panel", undefined, "Origin (Base Position)");
    pnlOrigin.orientation = "column";
    pnlOrigin.alignChildren = ["fill", "top"];
    pnlOrigin.spacing = 4;
    pnlOrigin.margins = [6, 8, 6, 6];

    var grpOriginInputs = pnlOrigin.add("group");
    grpOriginInputs.orientation = "row";
    grpOriginInputs.alignChildren = ["left", "center"];
    grpOriginInputs.spacing = 4;

    grpOriginInputs.add("statictext", undefined, "X:");
    var txtOriginX = grpOriginInputs.add("edittext", undefined, "0");
    txtOriginX.preferredSize.width = 52;

    grpOriginInputs.add("statictext", undefined, "Y:");
    var txtOriginY = grpOriginInputs.add("edittext", undefined, "0");
    txtOriginY.preferredSize.width = 52;

    var btnGetOrigin = grpOriginInputs.add("button", undefined, "Get Current");
    btnGetOrigin.preferredSize = [68, 20];
    btnGetOrigin.helpTip = "Capture the current value/position of the selected layer as the base origin";

    var btnResetOrigin = grpOriginInputs.add("button", undefined, "Reset");
    btnResetOrigin.preferredSize = [45, 20];
    btnResetOrigin.helpTip = "Reset object and joystick back to its original base position";

    var grpOriginOptions = pnlOrigin.add("group");
    grpOriginOptions.orientation = "row";
    grpOriginOptions.alignChildren = ["left", "center"];
    grpOriginOptions.spacing = 8;

    var chkRelative = grpOriginOptions.add("checkbox", undefined, "Relative");
    chkRelative.value = true;
    chkRelative.helpTip = "When checked, joystick moves the object from its original base position instead of 0, 0.";

    var chkAutoSync = grpOriginOptions.add("checkbox", undefined, "Auto-Sync");
    chkAutoSync.value = true;
    chkAutoSync.helpTip = "Automatically sample the layer's current position when hovering, selecting layers, or starting a move.";

    var chkMirrored = grpOriginOptions.add("checkbox", undefined, "Invert X");
    chkMirrored.value = false;
    chkMirrored.helpTip = "Invert the X axis so it behaves properly for horizontally flipped compositions.";

    // ==========================================
    // 3. Range & Reset Row
    // ==========================================
    var grpRange = win.add("group");
    grpRange.orientation = "row";
    grpRange.alignChildren = ["left", "center"];
    grpRange.spacing = 6;

    grpRange.add("statictext", undefined, "Range:");
    var txtRange = grpRange.add("edittext", undefined, "100");
    txtRange.preferredSize.width = 40;

    var btnReset = grpRange.add("button", undefined, "Reset to Original");
    btnReset.preferredSize.width = 120;
    btnReset.helpTip = "Reset joystick offset to 0, 0 (returns layer to its original base position)";

    // ==========================================
    // 4. 2D Joystick Pad
    // ==========================================
    var padGrp = win.add("group");
    padGrp.orientation = "column";
    padGrp.alignChildren = ["center", "center"];
    padGrp.margins = 0;

    var pad = padGrp.add("group");
    pad.preferredSize = [joySize, joySize];
    pad.margins = 0;

    pad.onDraw = function () {
        var g = this.graphics;
        if (!g) return;

        // Background
        var bgBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.18, 0.18, 0.18, 1]);
        g.newPath();
        g.rectPath(0, 0, joySize, joySize);
        g.fillPath(bgBrush);

        // Center Crosshair Grid
        var gridPen = g.newPen(g.PenType.SOLID_COLOR, [0.32, 0.32, 0.32, 1], 1);
        g.newPath();
        g.moveTo(joySize / 2, 0); g.lineTo(joySize / 2, joySize);
        g.moveTo(0, joySize / 2); g.lineTo(joySize, joySize / 2);
        g.strokePath(gridPen);

        // Center circle guide
        var centerGuidePen = g.newPen(g.PenType.SOLID_COLOR, [0.25, 0.25, 0.25, 1], 1);
        g.newPath();
        g.ellipsePath(joySize / 2 - 30, joySize / 2 - 30, 60, 60);
        g.strokePath(centerGuidePen);

        // Outer border
        var framePen = g.newPen(g.PenType.SOLID_COLOR, [0.35, 0.35, 0.35, 1], 1);
        g.newPath();
        g.rectPath(0, 0, joySize, joySize);
        g.strokePath(framePen);

        // Knob Position Calculation
        var rangeVal = parseFloat(txtRange.text) || 100;
        if (rangeVal <= 0) rangeVal = 100;

        var safeX = Math.max(-rangeVal, Math.min(rangeVal, currentX));
        var safeY = Math.max(-rangeVal, Math.min(rangeVal, currentY));

        var localX = (safeX / rangeVal) * (joySize / 2) + (joySize / 2);
        var localY = (safeY / rangeVal) * (joySize / 2) + (joySize / 2);

        // Connecting Line from Center to Knob
        var linePen = g.newPen(g.PenType.SOLID_COLOR, [0.2, 0.6, 1.0, 0.5], 2);
        g.newPath();
        g.moveTo(joySize / 2, joySize / 2);
        g.lineTo(localX, localY);
        g.strokePath(linePen);

        // Knob Circle
        var borderPen = g.newPen(g.PenType.SOLID_COLOR, [0.95, 0.95, 0.95, 1], 2);
        var knobBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.1, 0.55, 0.95, 1]);

        g.newPath();
        g.ellipsePath(localX - knobSize / 2, localY - knobSize / 2, knobSize, knobSize);
        g.fillPath(knobBrush);
        g.strokePath(borderPen);
    };

    function triggerRedraw() {
        try {
            if (pad.onDraw) pad.notify("onDraw");
        } catch (e) { }

        if (win instanceof Window) {
            win.update();
        } else if (win && win.layout) {
            win.layout.layout(true);
        }
    }

    // ==========================================
    // 5. Sliders & Coordinate Controls
    // ==========================================
    var pnlSliders = win.add("panel", undefined, "Joystick Sliders (Offset)");
    pnlSliders.orientation = "column";
    pnlSliders.alignChildren = ["fill", "top"];
    pnlSliders.spacing = 4;
    pnlSliders.margins = [6, 8, 6, 6];

    // X Slider & Box
    var grpSliderX = pnlSliders.add("group");
    grpSliderX.orientation = "row";
    grpSliderX.alignChildren = ["left", "center"];
    grpSliderX.spacing = 4;

    var lblSliderX = grpSliderX.add("statictext", undefined, "X:");
    lblSliderX.preferredSize.width = 16;
    var sliderX = grpSliderX.add("slider", undefined, 0, -100, 100);
    sliderX.preferredSize.width = 140;
    var txtValX = grpSliderX.add("edittext", undefined, "0");
    txtValX.preferredSize.width = 45;

    // Y Slider & Box
    var grpSliderY = pnlSliders.add("group");
    grpSliderY.orientation = "row";
    grpSliderY.alignChildren = ["left", "center"];
    grpSliderY.spacing = 4;

    var lblSliderY = grpSliderY.add("statictext", undefined, "Y:");
    lblSliderY.preferredSize.width = 16;
    var sliderY = grpSliderY.add("slider", undefined, 0, -100, 100);
    sliderY.preferredSize.width = 140;
    var txtValY = grpSliderY.add("edittext", undefined, "0");
    txtValY.preferredSize.width = 45;

    // Result Coordinate Label
    var lblResult = win.add("statictext", undefined, "Final Target: (0, 0)");
    lblResult.preferredSize = [joySize + 40, 20];
    lblResult.alignment = ["center", "center"];

    // ==========================================
    // 6. Property Scanner & Target Resolver
    // ==========================================
    function findTargetProperty(layer, targetName) {
        if (!layer || !targetName) return null;

        // 1. Essential Properties
        try {
            var essProps = layer.property("ADBE Master Properties") || layer.property("Essential Properties");
            if (essProps) {
                var p = essProps.property(targetName);
                if (p) return p;
            }
        } catch (e) { }

        // 2. Effects
        try {
            var effects = layer.property("ADBE Effect Parade") || layer.property("Effects");
            if (effects) {
                var fx = effects.property(targetName);
                if (fx) {
                    if (fx.numProperties && fx.numProperties >= 1) {
                        return fx.property(1);
                    }
                    return fx;
                }
            }
        } catch (e) { }

        // 3. Transform Properties
        try {
            var lower = targetName.toLowerCase();
            if (lower === "position") {
                return layer.transform.position;
            } else if (lower === "anchor point") {
                return layer.transform.anchorPoint;
            }
        } catch (e) { }

        return null;
    }

    function getLayerCurrentValue(layer, targetName) {
        if (!layer) return null;
        var prop = findTargetProperty(layer, targetName);
        if (prop && prop.value !== undefined) {
            var val = prop.value;
            if (val instanceof Array) {
                return [val[0], val[1], val.length > 2 ? val[2] : 0];
            } else if (typeof val === "number") {
                return [val, 0, 0];
            }
        }
        return null;
    }

    function scanLayerProperties(layer) {
        var propsList = [];
        if (!layer) return propsList;

        // 1. Essential Properties (ADBE Master Properties)
        try {
            var essProps = layer.property("ADBE Master Properties") || layer.property("Essential Properties");
            if (essProps) {
                for (var i = 1; i <= essProps.numProperties; i++) {
                    var prop = essProps.property(i);
                    if (prop && prop.name) {
                        propsList.push(prop.name);
                    }
                }
            }
        } catch (e) { }

        // 2. Effects (ADBE Effect Parade)
        try {
            var fxParade = layer.property("ADBE Effect Parade") || layer.property("Effects");
            if (fxParade) {
                for (var j = 1; j <= fxParade.numProperties; j++) {
                    var fx = fxParade.property(j);
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

    function getSelectedLayerKey() {
        if (!app.project || !app.project.activeItem) return "";
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) return "";
        var primary = comp.selectedLayers[0];
        return comp.id + "_" + primary.index;
    }

    function captureOriginFromSelection() {
        if (!app.project || !app.project.activeItem) return false;
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) return false;

        var targetName = (ddTarget && ddTarget.selection) ? ddTarget.selection.text : "Position";
        var primaryLayer = comp.selectedLayers[0];
        var val = getLayerCurrentValue(primaryLayer, targetName);

        if (val !== null) {
            originX = Math.round(val[0] * 1000) / 1000;
            originY = Math.round(val[1] * 1000) / 1000;
            txtOriginX.text = originX.toString();
            txtOriginY.text = originY.toString();

            // Cache starting values for all selected layers
            layerBaseMap = {};
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var lyr = comp.selectedLayers[i];
                var lVal = getLayerCurrentValue(lyr, targetName);
                if (lVal !== null) {
                    var lId = lyr.id ? lyr.id : lyr.index;
                    layerBaseMap[lId] = [lVal[0], lVal[1]];
                }
            }

            lastLayerKey = getSelectedLayerKey();
            updateResultDisplay();
            return true;
        }
        return false;
    }

    // Auto-captures current position without requiring button clicks
    function autoSyncOrigin(force) {
        if (isDragging) return;
        if (!chkAutoSync.value && !force) return;
        if (!app.project || !app.project.activeItem) return;
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) return;

        var currentKey = getSelectedLayerKey();
        if (currentKey !== lastLayerKey) {
            // Layer selection changed: auto-reset joystick to center and sample new layer
            currentX = 0;
            currentY = 0;
            sliderX.value = 0;
            sliderY.value = 0;
            txtValX.text = "0";
            txtValY.text = "0";
            captureOriginFromSelection();
            triggerRedraw();
        } else if (currentX === 0 && currentY === 0) {
            // Same layer and joystick is at center: keep origin live-synced
            captureOriginFromSelection();
        }
    }

    function calculateTargetCoords(rawX, rawY, layerRef) {
        var outX = rawX;
        var outY = rawY;
        if (chkMirrored.value) {
            outX = -outX;
        }

        if (chkRelative.value) {
            var baseX = originX;
            var baseY = originY;

            if (layerRef) {
                var lId = layerRef.id ? layerRef.id : layerRef.index;
                if (layerBaseMap[lId]) {
                    baseX = layerBaseMap[lId][0];
                    baseY = layerBaseMap[lId][1];
                }
            }
            return [baseX + outX, baseY + outY];
        } else {
            return [outX, outY];
        }
    }

    function updateResultDisplay() {
        if (!lblResult) return;
        var coords = calculateTargetCoords(currentX, currentY, null);
        lblResult.text = "Final Target: (" + coords[0].toFixed(1) + ", " + coords[1].toFixed(1) + ")";
    }

    function updateTargetDropdown(scannedList) {
        var prevTarget = "";
        if (ddTarget.selection && ddTarget.selection.text !== "(Custom...)") {
            prevTarget = ddTarget.selection.text;
        } else if (app.settings && app.settings.haveSetting("Joystick", "target_prop")) {
            prevTarget = app.settings.getSetting("Joystick", "target_prop");
        } else {
            prevTarget = "Position";
        }

        ddTarget.removeAll();

        var matchedIdx = -1;
        var keywords = ["position", "joystick", "pupil", "look", "eye", "head", "pos", "point", "ctrl"];

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
            for (var m = 0; m < scannedList.length; m++) {
                if (scannedList[m] === prevTarget) {
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

        captureOriginFromSelection();
    }

    // ==========================================
    // 7. Value Application (Realtime & Direct)
    // ==========================================
    function setTargetPropertyValue(x, y) {
        if (!app.project || !app.project.activeItem) return;
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return;
        var layers = comp.selectedLayers;
        if (layers.length === 0) return;

        var targetName = (ddTarget && ddTarget.selection) ? ddTarget.selection.text : "Position";
        if (!targetName || targetName === "(Custom...)") return;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var targetProp = findTargetProperty(layer, targetName);
            if (!targetProp || !targetProp.setValue) continue;

            var coords = calculateTargetCoords(x, y, layer);
            var targetX = coords[0];
            var targetY = coords[1];

            try {
                var curVal = targetProp.value;
                var newVal = [targetX, targetY];

                if (curVal instanceof Array) {
                    if (curVal.length === 3) {
                        newVal = [targetX, targetY, curVal[2]];
                    } else if (curVal.length === 2) {
                        newVal = [targetX, targetY];
                    }
                } else if (typeof curVal === "number") {
                    newVal = targetX;
                }

                // Check whether property has keyframes or is time varying
                var isAnimated = (targetProp.isTimeVarying || (targetProp.numKeys !== undefined && targetProp.numKeys > 0));

                if (isAnimated) {
                    // Update keyframe at current time in realtime
                    targetProp.setValueAtTime(comp.time, newVal);
                } else {
                    // Update static value in realtime
                    targetProp.setValue(newVal);
                }
            } catch (e) { }
        }
    }

    // Live preview during drag/scrub: keeps at most 1 temporary undo step in AE
    function applyLiveValue(x, y) {
        if (hasLiveUndo) {
            try { app.executeCommand(16); } catch (e) { }
            hasLiveUndo = false;
        }

        app.beginUndoGroup("Joystick Live");
        try {
            setTargetPropertyValue(x, y);
        } finally {
            app.endUndoGroup();
        }
        hasLiveUndo = true;
    }

    // Final commit on mouseup: undoes the 1 temporary live step and records 1 clean final undo group
    function commitDrag(x, y) {
        if (hasLiveUndo) {
            try { app.executeCommand(16); } catch (e) { }
            hasLiveUndo = false;
        }

        app.beginUndoGroup("Joystick Move");
        try {
            setTargetPropertyValue(x, y);
        } finally {
            app.endUndoGroup();
        }
    }

    function processMouseCoords(rawX, rawY) {
        var rangeVal = parseFloat(txtRange.text) || 100;
        if (rangeVal <= 0) rangeVal = 100;

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

        sliderX.value = currentX;
        sliderY.value = currentY;

        triggerRedraw();
        updateResultDisplay();
    }

    // Shared Reset to Original Position function
    function resetToOriginal() {
        clearLiveUndo();
        currentX = 0;
        currentY = 0;
        sliderX.value = 0;
        sliderY.value = 0;
        txtValX.text = "0";
        txtValY.text = "0";
        triggerRedraw();
        updateResultDisplay();

        app.beginUndoGroup("Reset to Original Position");
        try {
            setTargetPropertyValue(0, 0);
        } finally {
            app.endUndoGroup();
        }
    }

    // ==========================================
    // 8. Event Handlers & User Interactions
    // ==========================================
    ddTarget.onChange = function () {
        clearLiveUndo();
        if (!this.selection) return;
        if (this.selection.text === "(Custom...)") {
            var custom = prompt("Enter target property or effect name (e.g. Position, pupil-ctrl Position, Point Control):", "");
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
        captureOriginFromSelection();
    };

    btnScan.onClick = function () {
        clearLiveUndo();
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
            alert("Please select a layer with Transform, Essential Properties, or Effects.");
            return;
        }

        var layer = comp.selectedLayers[0];
        var scanned = scanLayerProperties(layer);
        updateTargetDropdown(scanned);
    };

    btnGetOrigin.onClick = function () {
        clearLiveUndo();
        if (!captureOriginFromSelection()) {
            alert("Please select a layer in an active composition.");
        }
    };

    // Reset button in Origin panel - resets to original base position
    btnResetOrigin.onClick = resetToOriginal;

    txtOriginX.onChange = function () {
        clearLiveUndo();
        originX = parseFloat(this.text) || 0;
        updateResultDisplay();
        if (chkRelative.value) {
            app.beginUndoGroup("Joystick Origin Adjust");
            try {
                setTargetPropertyValue(currentX, currentY);
            } finally {
                app.endUndoGroup();
            }
        }
    };

    txtOriginY.onChange = function () {
        clearLiveUndo();
        originY = parseFloat(this.text) || 0;
        updateResultDisplay();
        if (chkRelative.value) {
            app.beginUndoGroup("Joystick Origin Adjust");
            try {
                setTargetPropertyValue(currentX, currentY);
            } finally {
                app.endUndoGroup();
            }
        }
    };

    chkRelative.onClick = function () {
        clearLiveUndo();
        updateResultDisplay();
        app.beginUndoGroup("Joystick Toggle Relative");
        try {
            setTargetPropertyValue(currentX, currentY);
        } finally {
            app.endUndoGroup();
        }
    };

    chkMirrored.onClick = function () {
        clearLiveUndo();
        updateResultDisplay();
        app.beginUndoGroup("Joystick Toggle Invert X");
        try {
            setTargetPropertyValue(currentX, currentY);
        } finally {
            app.endUndoGroup();
        }
    };

    chkAutoSync.onClick = function () {
        if (this.value) {
            autoSyncOrigin(true);
        }
    };

    // Range changes
    txtRange.onChange = function () {
        clearLiveUndo();
        var rangeVal = parseFloat(this.text) || 100;
        if (rangeVal <= 0) rangeVal = 100;
        this.text = rangeVal.toString();

        sliderX.minvalue = -rangeVal;
        sliderX.maxvalue = rangeVal;
        sliderY.minvalue = -rangeVal;
        sliderY.maxvalue = rangeVal;

        sliderX.value = currentX;
        sliderY.value = currentY;

        triggerRedraw();
    };

    // Sliders Realtime Scrubbing with Single Undo Group Management
    sliderX.onChanging = function () {
        if (!isDragging) {
            autoSyncOrigin();
        }
        currentX = Math.round(this.value * 10) / 10;
        txtValX.text = currentX.toString();
        triggerRedraw();
        updateResultDisplay();

        var now = (new Date()).getTime();
        if (now - lastLiveUpdateTime >= 30) {
            lastLiveUpdateTime = now;
            applyLiveValue(currentX, currentY);
        }

        // Auto-commit timer in case mouseup is dropped by ScriptUI
        if (sliderTimerId !== 0) {
            try { app.cancelTask(sliderTimerId); } catch (e) { }
        }
        sliderTimerId = app.scheduleTask("$.global.joystick_autoCommit();", 400, false);
    };

    sliderX.onChange = function () {
        if (sliderTimerId !== 0) {
            try { app.cancelTask(sliderTimerId); } catch (e) { }
            sliderTimerId = 0;
        }
        currentX = Math.round(this.value * 10) / 10;
        txtValX.text = currentX.toString();
        triggerRedraw();
        updateResultDisplay();
        commitDrag(currentX, currentY);
    };

    sliderY.onChanging = function () {
        if (!isDragging) {
            autoSyncOrigin();
        }
        currentY = Math.round(this.value * 10) / 10;
        txtValY.text = currentY.toString();
        triggerRedraw();
        updateResultDisplay();

        var now = (new Date()).getTime();
        if (now - lastLiveUpdateTime >= 30) {
            lastLiveUpdateTime = now;
            applyLiveValue(currentX, currentY);
        }

        // Auto-commit timer in case mouseup is dropped by ScriptUI
        if (sliderTimerId !== 0) {
            try { app.cancelTask(sliderTimerId); } catch (e) { }
        }
        sliderTimerId = app.scheduleTask("$.global.joystick_autoCommit();", 400, false);
    };

    sliderY.onChange = function () {
        if (sliderTimerId !== 0) {
            try { app.cancelTask(sliderTimerId); } catch (e) { }
            sliderTimerId = 0;
        }
        currentY = Math.round(this.value * 10) / 10;
        txtValY.text = currentY.toString();
        triggerRedraw();
        updateResultDisplay();
        commitDrag(currentX, currentY);
    };

    // Text box inputs
    txtValX.onChange = function () {
        clearLiveUndo();
        currentX = parseFloat(this.text) || 0;
        sliderX.value = currentX;
        triggerRedraw();
        updateResultDisplay();

        app.beginUndoGroup("Joystick Move X");
        try {
            setTargetPropertyValue(currentX, currentY);
        } finally {
            app.endUndoGroup();
        }
    };

    txtValY.onChange = function () {
        clearLiveUndo();
        currentY = parseFloat(this.text) || 0;
        sliderY.value = currentY;
        triggerRedraw();
        updateResultDisplay();

        app.beginUndoGroup("Joystick Move Y");
        try {
            setTargetPropertyValue(currentX, currentY);
        } finally {
            app.endUndoGroup();
        }
    };

    // Reset button in Range row
    btnReset.onClick = resetToOriginal;

    // 2D Pad Dragging Listeners
    pad.addEventListener("mousedown", function (e) {
        clearLiveUndo();
        autoSyncOrigin();
        isDragging = true;
        lastLiveUpdateTime = (new Date()).getTime();
        processMouseCoords(e.clientX, e.clientY);
        applyLiveValue(currentX, currentY);
    });

    pad.addEventListener("mousemove", function (e) {
        if (isDragging) {
            processMouseCoords(e.clientX, e.clientY);
            var now = (new Date()).getTime();
            if (now - lastLiveUpdateTime >= 30) {
                lastLiveUpdateTime = now;
                applyLiveValue(currentX, currentY);
            }
        }
    });

    function finishDrag(e) {
        if (isDragging) {
            if (e && typeof e.clientX !== "undefined") {
                processMouseCoords(e.clientX, e.clientY);
            }
            isDragging = false;
            commitDrag(currentX, currentY);
        }
    }

    pad.addEventListener("mouseup", finishDrag);
    win.addEventListener("mouseup", function (e) {
        if (isDragging) {
            finishDrag(e);
        }
    });

    // Auto-sync hooks on hover/focus
    win.addEventListener("mouseover", function () {
        if (!isDragging) {
            autoSyncOrigin();
        }
    });
    pad.addEventListener("mouseover", function () {
        if (!isDragging) {
            autoSyncOrigin();
        }
    });

    // ==========================================
    // 9. Startup Initialization
    // ==========================================
    try {
        if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem) && app.project.activeItem.selectedLayers.length > 0) {
            var initProps = scanLayerProperties(app.project.activeItem.selectedLayers[0]);
            updateTargetDropdown(initProps);
        } else {
            var defaultProps = ["Position", "Anchor Point", "pupil-ctrl Position"];
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
