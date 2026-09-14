(function (thisObj) {
    var winName = "Pupil Joystick";
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", winName, undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 10;

    var grpTop = win.add("group");
    grpTop.orientation = "row";
    grpTop.alignChildren = ["left", "center"];
    grpTop.add("statictext", undefined, "Property:");
    var txtProp = grpTop.add("edittext", undefined, "pupil-ctrl Position");
    txtProp.preferredSize.width = 120;

    var grpTop2 = win.add("group");
    grpTop2.orientation = "row";
    grpTop2.alignChildren = ["left", "center"];
    grpTop2.add("statictext", undefined, "Range:");
    var txtRange = grpTop2.add("edittext", undefined, "100");
    txtRange.preferredSize.width = 40;
    var chkMirrored = grpTop2.add("checkbox", undefined, "isMirrored");
    chkMirrored.helpTip = "Invert the X axis so it behaves properly for horizontally flipped compositions.";

    var btnReset = win.add("button", undefined, "Reset to 0, 0");

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
        // Force the OS to repaint the group instantly and cleanly
        pad.helpTip = pad.helpTip === " " ? "" : " ";
        if (win instanceof Window) win.update();
        else win.layout.layout(true);
    }

    var isDragging = false;
    var hasStartedUndo = false;

    function applyTargetValue(x, y, isFinal) {
        if (!app.project || !app.project.activeItem) return;
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return;
        var layers = comp.selectedLayers;
        if (layers.length === 0) return;

        var targetName = txtProp.text;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var targetProp = null;

            var essProps = layer.property("ADBE Master Properties");
            if (!essProps) essProps = layer.property("Essential Properties");
            if (essProps) {
                targetProp = essProps.property(targetName);
            }

            if (!targetProp) {
                var effects = layer.property("ADBE Effect Parade");
                if (!effects) effects = layer.property("Effects");
                if (effects) {
                    var fx = effects.property(targetName);
                    if (fx) targetProp = fx.property(1);
                }
            }

            if (targetProp && targetProp.canSetExpression) {
                var outX = x;
                var outY = y;
                if (chkMirrored.value) {
                    outX = -outX;
                }

                try {
                    if (isFinal) {
                        targetProp.setValueAtTime(comp.time, [outX, outY]);
                    } else {
                        targetProp.setValue([outX, outY]);
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
        app.beginUndoGroup("JoyStick Adjust");
        triggerRedraw();
        applyTargetValue(currentX, currentY, true);
        app.endUndoGroup();
    };

    txtValY.onChange = function () {
        currentY = parseFloat(txtValY.text) || 0;
        app.beginUndoGroup("JoyStick Adjust");
        triggerRedraw();
        applyTargetValue(currentX, currentY, true);
        app.endUndoGroup();
    };

    txtRange.onChange = triggerRedraw;

    chkMirrored.onClick = function () {
        app.beginUndoGroup("JoyStick Adjust");
        applyTargetValue(currentX, currentY, true);
        app.endUndoGroup();
    };

    btnReset.onClick = function () {
        app.beginUndoGroup("JoyStick Reset");
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
            app.beginUndoGroup("JoyStick Drag");
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

    // Helper to safely finalize dragging
    function finishDrag(e) {
        if (isDragging) {
            isDragging = false;
            // The user requested a keyframe upon release: Setting isFinal = true here injects the definitive keyframe.
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

    // Attempt to catch drag releases that happen outside the pad
    win.addEventListener("mouseup", finishDrag);

    // Failsafe for stuck drag states on window exit
    win.addEventListener("mouseleave", function (e) {
        finishDrag(e);
    });

    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
        win.layout.resize();
    }
})(this);
