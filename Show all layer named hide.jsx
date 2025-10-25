{
    function processComp(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);

            // If it's a precomp, process it recursively
            if (layer.source instanceof CompItem) {
                processComp(layer.source);
            }

            // Show layers whose names start with "hide" (case-insensitive)
            if (layer.name.toLowerCase().indexOf("hide") === 0) {
                layer.enabled = true;
                layer.visible = true;
            }
        }
    }

    var mainComp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem && item.name === "main_comp") {
            mainComp = item;
            break;
        }
    }

    if (mainComp) {
        app.beginUndoGroup("Show All 'hide*' Layers");
        processComp(mainComp);
        app.endUndoGroup();
    } else {
        alert("Composition named 'main_comp' not found.");
    }
}
