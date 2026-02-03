/*
Auto Puppet Pin - After Effects ExtendScript
Automatically places puppet pins on selected layer in 3 rows
Author: azaynzxz
*/

(function autoPuppetPin() {
    // Main function
    app.beginUndoGroup("Auto Puppet Pin");

    try {
        // Get active composition
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please open a composition first.");
            app.endUndoGroup();
            return;
        }

        // Get selected layers
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select a layer first.");
            app.endUndoGroup();
            return;
        }

        if (selectedLayers.length > 1) {
            alert("Please select only one layer.");
            app.endUndoGroup();
            return;
        }

        var layer = selectedLayers[0];

        // Get layer dimensions - works for both regular layers and precompositions
        var layerWidth, layerHeight;

        if (layer.source) {
            // For precompositions and footage layers
            layerWidth = layer.source.width;
            layerHeight = layer.source.height;
        } else {
            // For shape layers, text layers, etc.
            layerWidth = layer.width;
            layerHeight = layer.height;
        }

        if (!layerWidth || !layerHeight) {
            alert("Unable to determine layer size. Make sure the layer has valid dimensions.");
            app.endUndoGroup();
            return;
        }

        // Check if Puppet Pin effect already exists
        var puppetEffect = null;
        for (var i = 1; i <= layer.property("Effects").numProperties; i++) {
            var effect = layer.property("Effects").property(i);
            if (effect.matchName === "ADBE FreePin3") {
                puppetEffect = effect;
                break;
            }
        }

        // Add Puppet Pin effect if it doesn't exist
        if (!puppetEffect) {
            puppetEffect = layer.property("Effects").addProperty("ADBE FreePin3");
        }

        // Calculate row positions (divide height into 3 equal parts)
        var rowHeight = layerHeight / 3;
        var row1Y = rowHeight / 2;        // Center of first third
        var row2Y = rowHeight + (rowHeight / 2);  // Center of second third
        var row3Y = (rowHeight * 2) + (rowHeight / 2);  // Center of third third

        // Calculate horizontal center
        var centerX = layerWidth / 2;

        // Based on the debug info, the structure is:
        // Effect > ARAP Group (index 4) > Deform Pins
        // The "Mesh" property is actually "Mesh Rotation Refinement" which is not what we need

        var arap = null;
        var deformPins = null;

        // Get ARAP group directly from the effect (it's at index 4)
        for (var i = 1; i <= puppetEffect.numProperties; i++) {
            var prop = puppetEffect.property(i);
            if (prop.matchName === "ADBE FreePin3 ARAP Group") {
                arap = prop;
                break;
            }
        }

        if (!arap) {
            alert("Could not find ARAP Group in Puppet Pin effect.");
            app.endUndoGroup();
            return;
        }

        // Since ExtendScript doesn't support programmatically adding puppet pins,
        // we'll create visual guides (null objects) at the exact positions where pins should be placed

        // Create 3 null objects as visual guides
        var guide1 = comp.layers.addNull();
        guide1.name = "PIN GUIDE 1 - Top Row";
        guide1.property("Transform").property("Position").setValue([centerX, row1Y]);
        guide1.label = 6; // Orange color

        var guide2 = comp.layers.addNull();
        guide2.name = "PIN GUIDE 2 - Middle Row";
        guide2.property("Transform").property("Position").setValue([centerX, row2Y]);
        guide2.label = 6; // Orange color

        var guide3 = comp.layers.addNull();
        guide3.name = "PIN GUIDE 3 - Bottom Row";
        guide3.property("Transform").property("Position").setValue([centerX, row3Y]);
        guide3.label = 6; // Orange color

        // Move guides above the target layer
        guide3.moveBefore(layer);
        guide2.moveBefore(layer);
        guide1.moveBefore(layer);

        alert("Auto Puppet Pin Setup Complete!\n\n" +
            "✓ Puppet Pin effect added to: " + layer.name + "\n" +
            "✓ 3 guide nulls created at pin positions\n\n" +
            "Layer size: " + layerWidth + " × " + layerHeight + "\n\n" +
            "NEXT STEPS:\n" +
            "1. Select the Puppet Pin Tool (Ctrl+P or Cmd+P)\n" +
            "2. Click on the layer at each orange null guide position\n" +
            "3. Delete the guide nulls when done\n\n" +
            "The nulls show exactly where to place each pin!");

    } catch (error) {
        alert("Error: " + error.toString() + "\n\nLine: " + error.line);
    }

    app.endUndoGroup();
})();
