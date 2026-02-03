// Global variable to store the selected crop offset preset
var CROP_OFFSET = 0; // Default: 0px

/**
* Recursively searches a group for any stroke and returns the maximum stroke width found.
*/
function getStrokeBufferFromGroup(group) {
    var maxStroke = 0;
    for (var i = 1; i <= group.numProperties; i++) {
        var prop = group.property(i);
        if (prop.matchName === "ADBE Vector Graphic - Stroke") {
            var sw = prop.property("Stroke Width").value;
            if (sw > maxStroke) {
                maxStroke = sw;
            }
        } else if (prop.matchName === "ADBE Vector Group" || (prop instanceof PropertyGroup)) {
            var subStroke = getStrokeBufferFromGroup(prop);
            if (subStroke > maxStroke) {
                maxStroke = subStroke;
            }
        }
    }
    return maxStroke;
}

/**
* Returns the maximum stroke width detected in a vector layer.
* Multiplies the value by a factor (1.2 in this case) to ensure sufficient padding.
*/
function getStrokeBuffer(layer) {
    try {
        var contents = layer.property("Contents");
        if (contents) {
            var detected = getStrokeBufferFromGroup(contents);
            if (detected > 0) {
                return detected * 1.2;
            }
        }
    } catch (e) {
        return 20; // Fallback value
    }
    return 0;
}

/**
* Fallback function to convert a local point to comp space.
* If layer.toComp() exists, it is used; otherwise, a custom 2D matrix calculation is performed.
*/
function myLayerToComp(layer, localPoint, t) {
    if (typeof layer.toComp === "function") {
        return layer.toComp(localPoint);
    } else {
        var matrix = getLayerMatrix(layer, t);
        var point = [localPoint[0], localPoint[1], 1];
        var worldPoint = multiplyMatrixAndPoint(matrix, point);
        return [worldPoint[0], worldPoint[1]];
    }
}

/**
* Computes the 3x3 transformation matrix for a given layer at time t (2D only).
* This includes the layer’s own transform and recursively its parent transforms.
*/
function getLayerMatrix(layer, t) {
    var pos = layer.property("Position").valueAtTime(t, false);
    var scale = layer.property("Scale").valueAtTime(t, false);
    var anchor = layer.property("Anchor Point").valueAtTime(t, false);
    var rotation = 0;
    if (layer.property("Rotation") !== null) {
        rotation = layer.property("Rotation").valueAtTime(t, false) * Math.PI / 180;
    }
    var T = [
        [1, 0, pos[0]],
        [0, 1, pos[1]],
        [0, 0, 1]
    ];
    var R = [
        [Math.cos(rotation), -Math.sin(rotation), 0],
        [Math.sin(rotation), Math.cos(rotation), 0],
        [0, 0, 1]
    ];
    var S = [
        [scale[0] / 100, 0, 0],
        [0, scale[1] / 100, 0],
        [0, 0, 1]
    ];
    var A = [
        [1, 0, -anchor[0]],
        [0, 1, -anchor[1]],
        [0, 0, 1]
    ];
    var matrix = multiplyMatrices(T, multiplyMatrices(R, multiplyMatrices(S, A)));
    if (layer.parent !== null) {
        var parentMatrix = getLayerMatrix(layer.parent, t);
        matrix = multiplyMatrices(parentMatrix, matrix);
    }
    return matrix;
}

/**
* Multiplies two 3x3 matrices.
*/
function multiplyMatrices(a, b) {
    var result = [];
    for (var i = 0; i < 3; i++) {
        result[i] = [];
        for (var j = 0; j < 3; j++) {
            result[i][j] = 0;
            for (var k = 0; k < 3; k++) {
                result[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    return result;
}

/**
* Multiplies a 3x3 matrix with a 3x1 point vector.
*/
function multiplyMatrixAndPoint(matrix, point) {
    var result = [];
    for (var i = 0; i < 3; i++) {
        var sum = 0;
        for (var j = 0; j < 3; j++) {
            sum += matrix[i][j] * point[j];
        }
        result[i] = sum;
    }
    return result;
}

/**
* Creates the resizable UI panel.
* - Panel title: "𝐗 Crop"
* - Three buttons are created:
* • ⛶ X Crop
* • ▣ Xact Crop
* • ⚡ Xpert Crop
* - The button group automatically switches between horizontal and vertical layouts based on panel width.
* - The credits group is arranged in a horizontal row.
* - The panel is resizable, and the layout adjusts dynamically as the user resizes it.
*/
function createXBoltCropUI(thisObj) {
    // Use the passed object if it's a Panel or Window, otherwise create a new palette window
    var panel;
    if (thisObj instanceof Panel) {
        panel = thisObj;
    } else if (thisObj instanceof Window) {
        panel = thisObj;
    } else {
        panel = new Window("palette", "X Crop", undefined, { resizeable: true });
    }

    // Main container group (centered)
    var mainGroup = panel.add("group");
    mainGroup.orientation = "column";
    mainGroup.alignChildren = ["center", "center"];

    // Button Group (default horizontal)
    var buttonGroup = mainGroup.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignChildren = ["center", "center"];

    // X Crop Button
    var xCropBtn = buttonGroup.add("button", undefined, "X Crop");
    xCropBtn.helpTip = "Simply crops the current comp or selected precomp at the current frame.";
    xCropBtn.onClick = function () {
        app.beginUndoGroup("X Crop");
        try {
            processXCrop();
        } catch (e) {
            alert("Error: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
    };

    // Bolt Crop Button
    var boltCropBtn = buttonGroup.add("button", undefined, "Xact Crop");
    boltCropBtn.helpTip = "Crops the selected precomp using advanced detection.";
    boltCropBtn.onClick = function () {
        app.beginUndoGroup("Xact Crop");
        try {
            processBoltCrop(false);
        } catch (e) {
            alert("Error: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
    };

    // XBolt Crop Button
    var precompBtn = buttonGroup.add("button", undefined, "Xpert Crop");
    precompBtn.helpTip = "Automatically precomposes and then crops the selected layer(s).";
    precompBtn.onClick = function () {
        app.beginUndoGroup("Xpert Crop");
        try {
            processBoltCrop(true);
        } catch (e) {
            alert("Error: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
    };

    // Offset Preset Group
    var offsetGroup = mainGroup.add("group");
    offsetGroup.orientation = "row";
    offsetGroup.alignChildren = ["center", "center"];
    offsetGroup.spacing = 10;

    var offsetLabel = offsetGroup.add("statictext", undefined, "Crop Offset:");
    offsetLabel.helpTip = "Add padding around the detected bounds to prevent movement from being cut off";

    var offsetDropdown = offsetGroup.add("dropdownlist", undefined, ["0 px", "50 px", "100 px"]);
    offsetDropdown.selection = 0; // Default to 0px
    offsetDropdown.helpTip = "Select the offset padding to add around the crop area";
    offsetDropdown.onChange = function () {
        var selectedText = offsetDropdown.selection.text;
        CROP_OFFSET = parseInt(selectedText.replace(" px", ""));
    };

    // Dynamic Layout Adjustment on Resize
    panel.onResizing = panel.onResize = function () {
        if (panel.size.width < 200) {
            buttonGroup.orientation = "column";
        } else {
            buttonGroup.orientation = "row";
        }
        panel.layout.layout(true);
    };

    panel.layout.layout(true);
    return panel;
}

/**
* Processes the cropping (full version) for precomps.
*/
function processBoltCrop(precompFirst) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select an active composition.");
        return;
    }
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        alert("Please select at least one layer.");
        return;
    }
    if (precompFirst) {
        var indices = [];
        for (var i = 0; i < selectedLayers.length; i++) {
            indices.push(selectedLayers[i].index);
        }
        var newComp = comp.layers.precompose(indices, "Precomp", true);
        if (!newComp) {
            alert("Precomposition failed.");
            return;
        }
        var newLayer = null;
        for (var j = 1; j <= comp.layers.length; j++) {
            var tempLayer = comp.layer(j);
            if (tempLayer.source === newComp) {
                newLayer = tempLayer;
                break;
            }
        }
        if (!newLayer) {
            alert("Could not locate the new precomp layer in the main comp.");
            return;
        }
        selectedLayers = [newLayer];
    }
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        if (!layer.source || !(layer.source instanceof CompItem)) {
            alert("Selected layer " + (i + 1) + " is not a valid precomp.");
            continue;
        }
        var precompItem = layer.source;
        var layersInPrecomp = precompItem.layers;
        if (layersInPrecomp.length === 0) {
            alert("Precomp " + precompItem.name + " has no layers.");
            continue;
        }
        var bounds = getCompBoundsOverTime(precompItem, layersInPrecomp);
        if (!bounds) {
            alert("Could not determine bounding box for " + precompItem.name);
            continue;
        }
        var origWidth = precompItem.width;
        var origHeight = precompItem.height;
        var offset = cropComp(precompItem, bounds);
        var newCenterX = precompItem.width / 2;
        var newCenterY = precompItem.height / 2;
        var oldCenterX = origWidth / 2;
        var oldCenterY = origHeight / 2;
        var compensationX = offset.x + (newCenterX - oldCenterX);
        var compensationY = offset.y + (newCenterY - oldCenterY);
        var posProp = layer.property("Position");
        if (posProp) {
            if (posProp.numKeys > 0) {
                for (var k = 1; k <= posProp.numKeys; k++) {
                    var oldVal = posProp.keyValue(k);
                    var keyT = posProp.keyTime(k);
                    var newX = oldVal[0] + compensationX;
                    var newY = oldVal[1] + compensationY;
                    if (oldVal.length > 2) {
                        posProp.setValueAtTime(keyT, [newX, newY, oldVal[2]]);
                    } else {
                        posProp.setValueAtTime(keyT, [newX, newY]);
                    }
                }
            } else {
                var currentVal = posProp.value;
                if (currentVal.length > 2) {
                    posProp.setValue([currentVal[0] + compensationX, currentVal[1] + compensationY, currentVal[2]]);
                } else {
                    posProp.setValue([currentVal[0] + compensationX, currentVal[1] + compensationY]);
                }
            }
        }
    }
}

/**
* Calculates a bounding box over time for the precomp by sampling frames.
*/
function getCompBoundsOverTime(comp, layers) {
    var earliest = +Infinity, latest = -Infinity;
    for (var i = 1; i <= layers.length; i++) {
        var layer = layers[i];
        if (!layer) continue;
        if (layer.inPoint < earliest) earliest = layer.inPoint;
        if (layer.outPoint > latest) latest = layer.outPoint;
    }
    if (earliest === Infinity || latest === -Infinity) return null;
    var maxSamples = 20;
    var duration = latest - earliest;
    var frameDuration = 1 / comp.frameRate;
    var sampleStep = duration / (maxSamples - 1);
    if (sampleStep < frameDuration) sampleStep = frameDuration;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var t = earliest; t <= latest + 0.0001; t += sampleStep) {
        var boundsAtT = getCompBoundsAtTime(layers, t);
        if (!boundsAtT) continue;
        var left = boundsAtT.x, top = boundsAtT.y,
            right = boundsAtT.x + boundsAtT.width, bottom = boundsAtT.y + boundsAtT.height;
        if (left < minX) minX = left;
        if (top < minY) minY = top;
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
    }
    // Ensure the very last frame is sampled
    var finalBounds = getCompBoundsAtTime(layers, latest);
    if (finalBounds) {
        var left = finalBounds.x, top = finalBounds.y,
            right = finalBounds.x + finalBounds.width, bottom = finalBounds.y + finalBounds.height;
        if (left < minX) minX = left;
        if (top < minY) minY = top;
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
    }
    if (minX === Infinity) return null;

    // Apply the crop offset to add padding around the bounds
    return {
        x: Math.floor(minX - CROP_OFFSET),
        y: Math.floor(minY - CROP_OFFSET),
        width: Math.ceil(maxX - minX + (CROP_OFFSET * 2)),
        height: Math.ceil(maxY - minY + (CROP_OFFSET * 2))
    };
}

/**
* Returns a bounding box for all layers at time t.
*/
function getCompBoundsAtTime(layers, t) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 1; i <= layers.length; i++) {
        var layer = layers[i];
        if (!layer || !layer.enabled) continue;
        if (t < layer.inPoint || t > layer.outPoint) continue;
        var rect = null;
        try {
            rect = layer.sourceRectAtTime(t, false);
        } catch (e) {
            continue;
        }
        if (!rect || rect.width === 0 || rect.height === 0) continue;
        var extraBuffer = 0;
        if (layer.matchName === "ADBE Vector Layer") {
            extraBuffer = getStrokeBuffer(layer);
        }
        var corners = [
            [rect.left, rect.top],
            [rect.left + rect.width, rect.top],
            [rect.left, rect.top + rect.height],
            [rect.left + rect.width, rect.top + rect.height]
        ];
        for (var c = 0; c < corners.length; c++) {
            var localPoint = corners[c];
            var worldPos = myLayerToComp(layer, localPoint, t);
            var x1 = worldPos[0] - extraBuffer;
            var x2 = worldPos[0] + extraBuffer;
            var y1 = worldPos[1] - extraBuffer;
            var y2 = worldPos[1] + extraBuffer;
            if (x1 < minX) minX = x1;
            if (y1 < minY) minY = y1;
            if (x2 > maxX) maxX = x2;
            if (y2 > maxY) maxY = y2;
        }
    }
    if (minX === Infinity) return null;

    // Apply the crop offset to add padding around the bounds
    return {
        x: Math.floor(minX - CROP_OFFSET),
        y: Math.floor(minY - CROP_OFFSET),
        width: Math.ceil(maxX - minX + (CROP_OFFSET * 2)),
        height: Math.ceil(maxY - minY + (CROP_OFFSET * 2))
    };
}

/**
* Crops the comp to the bounding box and adjusts internal layers.
*/
function cropComp(comp, bounds) {
    var newWidth = Math.max(1, Math.ceil(bounds.width));
    var newHeight = Math.max(1, Math.ceil(bounds.height));
    var offsetX = bounds.x, offsetY = bounds.y;
    var origWidth = comp.width, origHeight = comp.height;
    var centerShiftX = (origWidth - newWidth) / 2;
    var centerShiftY = (origHeight - newHeight) / 2;
    comp.width = newWidth;
    comp.height = newHeight;
    for (var i = 1; i <= comp.layers.length; i++) {
        var layer = comp.layers[i];
        if (!layer) continue;
        if (layer.parent !== null) continue;
        var posProp = layer.property("Position");
        if (!posProp) continue;
        var numKeys = posProp.numKeys;
        if (numKeys > 0) {
            for (var k = 1; k <= numKeys; k++) {
                var oldVal = posProp.keyValue(k);
                var keyT = posProp.keyTime(k);
                var newX = oldVal[0] - offsetX;
                var newY = oldVal[1] - offsetY;
                if (layer.threeDLayer) {
                    newX += centerShiftX;
                    newY += centerShiftY;
                }
                if (oldVal.length > 2) {
                    posProp.setValueAtTime(keyT, [newX, newY, oldVal[2]]);
                } else {
                    posProp.setValueAtTime(keyT, [newX, newY]);
                }
            }
        } else {
            var currentVal = posProp.value;
            var newX = currentVal[0] - offsetX;
            var newY = currentVal[1] - offsetY;
            if (layer.threeDLayer) {
                newX += centerShiftX;
                newY += centerShiftY;
            }
            if (currentVal.length > 2) {
                posProp.setValue([newX, newY, currentVal[2]]);
            } else {
                posProp.setValue([newX, newY]);
            }
        }
    }
    return { x: offsetX, y: offsetY };
}

/**
* Process X Crop:
* This function crops based solely on the current time's bounding box.
*/
function processXCrop() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select an active composition.");
        return;
    }
    var targetComp = comp;
    if (comp.selectedLayers.length > 0) {
        var sel = comp.selectedLayers[0];
        if (sel.source && sel.source instanceof CompItem) {
            targetComp = sel.source;
        }
    }
    var layersInTarget = targetComp.layers;
    if (layersInTarget.length === 0) {
        alert("Target comp has no layers.");
        return;
    }
    var t = targetComp.time;
    var bounds = getCompBoundsAtTime(layersInTarget, t);
    if (!bounds) {
        alert("Could not determine bounding box.");
        return;
    }
    var origWidth = targetComp.width, origHeight = targetComp.height;
    var offset = cropComp(targetComp, bounds);
    if (targetComp !== comp) {
        var precompLayer = null;
        for (var i = 1; i <= comp.layers.length; i++) {
            var lyr = comp.layer(i);
            if (lyr.source === targetComp) {
                precompLayer = lyr;
                break;
            }
        }
        if (precompLayer) {
            var newCenterX = targetComp.width / 2;
            var newCenterY = targetComp.height / 2;
            var oldCenterX = origWidth / 2;
            var oldCenterY = origHeight / 2;
            var compensationX = offset.x + (newCenterX - oldCenterX);
            var compensationY = offset.y + (newCenterY - oldCenterY);
            var posProp = precompLayer.property("Position");
            if (posProp) {
                if (posProp.numKeys > 0) {
                    for (var k = 1; k <= posProp.numKeys; k++) {
                        var oldVal = posProp.keyValue(k);
                        var keyT = posProp.keyTime(k);
                        var newX = oldVal[0] + compensationX;
                        var newY = oldVal[1] + compensationY;
                        if (oldVal.length > 2) {
                            posProp.setValueAtTime(keyT, [newX, newY, oldVal[2]]);
                        } else {
                            posProp.setValueAtTime(keyT, [newX, newY]);
                        }
                    }
                } else {
                    var currentVal = posProp.value;
                    if (currentVal.length > 2) {
                        posProp.setValue([currentVal[0] + compensationX, currentVal[1] + compensationY, currentVal[2]]);
                    } else {
                        posProp.setValue([currentVal[0] + compensationX, currentVal[1] + compensationY]);
                    }
                }
            }
        }
    }
}

// Function to show X Crop as a modal dialog
function showXCropDialog() {
    var dialog = new Window("dialog", "X Crop", undefined, { resizeable: true });
    createXBoltCropUI(dialog);
    dialog.show();
}

// Create and show the UI panel only if run standalone
if (typeof module === 'undefined') {
    var xboltCropPanel = createXBoltCropUI(this);
    if (xboltCropPanel instanceof Window) {
        xboltCropPanel.show();
    }
}
