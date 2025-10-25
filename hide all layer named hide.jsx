{
    function processComp(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);

            // Check for precomp and process it recursively
            if (layer.source instanceof CompItem) {
                processComp(layer.source); // Recursive
            }

            // Check if name starts with "hide" (case-insensitive)
            if (layer.name.toLowerCase().indexOf("hide") === 0) {
                layer.enabled = false; // Hides the layer (eye icon off)
                layer.visible = false; // Optional UI update
            }
        }
    }

    // Try to start from a comp named "main_comp"
    var mainComp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem && item.name === "main_comp") {
            mainComp = item;
            break;
        }
    }

    if (mainComp) {
        app.beginUndoGroup("Hide Layers Starting with 'hide'");
        processComp(mainComp);
        app.endUndoGroup();
    } else {
        alert("Main Comp not found in the project.");
    }
}
