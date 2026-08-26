(function (thisObj) {
    /*
    Anchor Point Control - After Effects ExtendScript
    Dockable Panel & Standalone Window for moving anchor points with position compensation
    */

    function buildUI(thisObj) {
        // Determine if this is a dockable panel or standalone window
        var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Anchor Point Control", undefined, { resizeable: true });

        myPanel.orientation = "column";
        myPanel.alignChildren = ["center", "top"];
        myPanel.spacing = 6;
        myPanel.margins = 6;
        myPanel.preferredSize.width = 150;
        myPanel.preferredSize.height = 160;

        // 3x3 Button Grid
        var gridGroup = myPanel.add("group");
        gridGroup.orientation = "column";
        gridGroup.alignChildren = ["center", "center"];
        gridGroup.spacing = 2;

        var AP_Symbols = [
            ["↖", "↑", "↗"],
            ["←", "⊙", "→"],
            ["↙", "↓", "↘"]
        ];

        for (var r = 0; r < 3; r++) {
            var row = gridGroup.add("group");
            row.orientation = "row";
            row.spacing = 2;
            for (var c = 0; c < 3; c++) {
                (function (rr, cc, sym) {
                    var btn = row.add("button", undefined, sym);
                    btn.preferredSize = [24, 24]; // Reduced size for a compact square look
                    btn.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 12);
                    btn.onClick = function () {
                        moveAnchorPoint(cc, rr, compensateChk.value);
                    };
                })(r, c, AP_Symbols[r][c]);
            }
        }

        // Checkbox: Compensate position
        var compensateChk = myPanel.add("checkbox", undefined, "Compensate Position");
        compensateChk.value = true;
        compensateChk.alignment = ["fill", "center"];
        compensateChk.helpTip = "Keep the layer in its visual position by adjusting the Position property.";
        compensateChk.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        // Separator
        var sep = myPanel.add("panel");
        sep.alignment = ["fill", "top"];
        sep.preferredSize = [10, 1];

        // Status display
        var statusTxt = myPanel.add("statictext", undefined, "Select layer(s)");
        statusTxt.alignment = ["fill", "center"];
        statusTxt.justify = "center";
        statusTxt.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 8);

        function updateStatus(msg) {
            statusTxt.text = msg;
        }

        // Prevent Spacebar issue in AE (stops button focus from hijacking Spacebar shortcut)
        myPanel.addEventListener("mouseup", function (e) {
            if (e && e.target && e.target.type === "button") {
                app.activate();
            }
        });

        myPanel.addEventListener("keydown", function (e) {
            if (e && e.target && e.target.type === "button") {
                if (e.keyName === "Space" || e.keyName === "space" || e.keyName === " ") {
                    e.preventDefault();
                    app.activate();
                }
            }
        });

        // Anchor point movement function
        function moveAnchorPoint(horizontal, vertical, compensatePosition) {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    updateStatus("No active comp");
                    return;
                }

                var selectedLayers = comp.selectedLayers;
                if (selectedLayers.length === 0) {
                    updateStatus("Select at least 1 layer");
                    return;
                }

                app.beginUndoGroup("Adjust Anchor Point");

                var successCount = 0;
                for (var i = 0; i < selectedLayers.length; i++) {
                    var layer = selectedLayers[i];
                    if (!layer.transform || !layer.transform.anchorPoint || !layer.sourceRectAtTime || layer.locked) {
                        continue;
                    }

                    var rect = layer.sourceRectAtTime(comp.time, false);
                    var oldAnchor = layer.transform.anchorPoint.value;

                    var newAnchorX = rect.left;
                    if (horizontal === 1) newAnchorX = rect.left + rect.width / 2;
                    else if (horizontal === 2) newAnchorX = rect.left + rect.width;

                    var newAnchorY = rect.top;
                    if (vertical === 1) newAnchorY = rect.top + rect.height / 2;
                    else if (vertical === 2) newAnchorY = rect.top + rect.height;

                    var newAnchorZ = (oldAnchor.length > 2) ? oldAnchor[2] : 0;
                    var newAnchor = [newAnchorX, newAnchorY, newAnchorZ];

                    var newPos = layer.transform.position.value;
                    var compensationSuccess = false;

                    if (compensatePosition) {
                        try {
                            var vec = [newAnchorX, newAnchorY, newAnchorZ];
                            var worldPos = layer.toComp(vec);
                            if (layer.parent) {
                                newPos = layer.parent.fromComp(worldPos);
                            } else {
                                newPos = worldPos;
                            }
                            compensationSuccess = true;
                        } catch (compErr) {
                        }

                        if (!compensationSuccess) {
                            try {
                                var scale = layer.transform.scale.value;
                                var sx = scale[0] / 100;
                                var sy = scale[1] / 100;

                                var dx = (newAnchor[0] - oldAnchor[0]) * sx;
                                var dy = (newAnchor[1] - oldAnchor[1]) * sy;

                                var oldPos = layer.transform.position.value;
                                if (oldPos.length === 2) {
                                    newPos = [oldPos[0] + dx, oldPos[1] + dy];
                                } else {
                                    newPos = [oldPos[0] + dx, oldPos[1] + dy, oldPos[2]];
                                }
                            } catch (mathErr) {
                            }
                        }
                    }

                    layer.transform.anchorPoint.setValue(newAnchor);
                    if (compensatePosition) {
                        layer.transform.position.setValue(newPos);
                    }
                    successCount++;
                }

                app.endUndoGroup();

                if (successCount > 0) {
                    var posNames = ["Top-Left", "Top-Center", "Top-Right", "Center-Left", "Center", "Center-Right", "Bottom-Left", "Bottom-Center", "Bottom-Right"];
                    updateStatus("Anchor: " + posNames[vertical * 3 + horizontal]);
                } else {
                    updateStatus("No valid layers selected");
                }
            } catch (error) {
                updateStatus("Error: " + error.toString());
            }
        }

        // Show window or center
        if (myPanel instanceof Window) {
            myPanel.center();
            myPanel.show();
        } else {
            myPanel.layout.layout(true);
        }
    }

    buildUI(thisObj);
})(this);
