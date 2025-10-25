// Create a script file named "AutoTrim.jsx"
{
    function trimLayers() {
        app.beginUndoGroup("Auto Trim Overlapping Layers");
        
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem) {
            // Get all layers in comp
            var totalLayers = comp.numLayers;
            
            // Loop through layers from bottom to top (reverse order)
            for (var i = totalLayers; i > 1; i--) {
                var currentLayer = comp.layer(i);
                var nextLayer = comp.layer(i-1);
                
                // Check if layers exist and current layer is not locked
                if (currentLayer && nextLayer && !currentLayer.locked) {
                    try {
                        // Trim current layer's out point to next layer's in point
                        currentLayer.outPoint = nextLayer.inPoint;
                    } catch(err) {
                        // Skip any errors and continue with next layer
                        continue;
                    }
                }
            }
            alert("Trim complete! (Locked layers were skipped)");
        } else {
            alert("Please select a composition first!");
        }
        
        app.endUndoGroup();
    }
    
    // Run the function
    trimLayers();
}