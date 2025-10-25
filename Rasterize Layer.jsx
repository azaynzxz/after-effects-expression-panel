// Photoshop JSX Script - Batch Rasterize Layer Groups
// This script processes multiple PSD files and rasterizes all layer groups while maintaining structure

#target photoshop

// Main function
function main() {
    // Check if Photoshop is available
    if (!app.documents.length && !confirm("No document is open. Would you like to select a folder with PSD files?")) {
        return;
    }

    // Select parent folder
    var parentFolder = Folder.selectDialog("Select the parent folder containing PSD files");
    if (!parentFolder) {
        alert("No folder selected. Script cancelled.");
        return;
    }

    // Create "Processed" subfolder
    var processedFolder = new Folder(parentFolder + "/Processed");
    if (!processedFolder.exists) {
        processedFolder.create();
    }

    // Get all PSD files in parent folder
    var psdFiles = parentFolder.getFiles("*.psd");
    if (psdFiles.length === 0) {
        alert("No PSD files found in the selected folder.");
        return;
    }

    // Processing variables
    var successCount = 0;
    var errorFiles = [];
    var startTime = new Date();

    // Progress window
    var progressWin = new Window("palette", "Processing PSD Files", undefined);
    progressWin.progressBar = progressWin.add("progressbar", undefined, 0, psdFiles.length);
    progressWin.progressBar.preferredSize = [300, 20];
    progressWin.statusText = progressWin.add("statictext", undefined, "Starting...");
    progressWin.statusText.preferredSize = [300, 20];
    progressWin.show();

    // Process each PSD file
    for (var i = 0; i < psdFiles.length; i++) {
        var file = psdFiles[i];
        progressWin.statusText.text = "Processing: " + file.name + " (" + (i + 1) + "/" + psdFiles.length + ")";
        progressWin.progressBar.value = i + 1;
        progressWin.update();

        try {
            // Open the document
            var doc = app.open(file);
            
            // Process all layers and groups
            processLayerSet(doc, doc);
            
            // Generate unique filename if exists
            var saveName = file.name.replace(/\.psd$/i, "");
            var saveFile = new File(processedFolder + "/" + saveName + ".psd");
            var counter = 1;
            
            while (saveFile.exists) {
                saveFile = new File(processedFolder + "/" + saveName + "_" + counter + ".psd");
                counter++;
            }
            
            // Save the document
            var saveOptions = new PhotoshopSaveOptions();
            saveOptions.layers = true;
            saveOptions.embedColorProfile = true;
            doc.saveAs(saveFile, saveOptions, true);
            
            // Close the document
            doc.close(SaveOptions.DONOTSAVECHANGES);
            
            successCount++;
            
        } catch (e) {
            errorFiles.push({
                name: file.name,
                error: e.message
            });
            
            // Try to close document if it's open
            try {
                if (app.activeDocument) {
                    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
                }
            } catch (closeError) {
                // Ignore close errors
            }
        }
    }

    progressWin.close();

    // Calculate processing time
    var endTime = new Date();
    var processingTime = Math.round((endTime - startTime) / 1000);

    // Show results
    var report = "=== BATCH PROCESSING COMPLETE ===\n\n";
    report += "Total files: " + psdFiles.length + "\n";
    report += "Successfully processed: " + successCount + "\n";
    report += "Failed: " + errorFiles.length + "\n";
    report += "Processing time: " + processingTime + " seconds\n";
    report += "Output folder: " + processedFolder.fsName + "\n\n";

    if (errorFiles.length > 0) {
        report += "=== ERRORS ===\n";
        for (var j = 0; j < errorFiles.length; j++) {
            report += "\n" + (j + 1) + ". " + errorFiles[j].name + "\n";
            report += "   Error: " + errorFiles[j].error + "\n";
        }
    }

    alert(report);
}

// Recursive function to process all layers and layer sets (groups)
function processLayerSet(doc, parent) {
    var layers = parent.layers || parent.artLayers;
    
    // Process in reverse to avoid index issues
    for (var i = layers.length - 1; i >= 0; i--) {
        try {
            var layer = layers[i];
            
            // Make layer visible if hidden
            var wasVisible = layer.visible;
            if (!wasVisible) {
                layer.visible = true;
            }
            
            // Check if it's a layer set (group)
            if (layer.typename === "LayerSet") {
                // First, recursively process nested groups
                processLayerSet(doc, layer);
                
                // Then rasterize this group
                rasterizeGroup(doc, layer);
            }
            
        } catch (e) {
            // Continue processing other layers even if one fails
            continue;
        }
    }
}

// Function to rasterize a layer group (merge group)
function rasterizeGroup(doc, layerSet) {
    try {
        // Store group properties
        var groupName = layerSet.name;
        var groupOpacity = layerSet.opacity;
        var groupBlendMode = layerSet.blendMode;
        var groupVisible = layerSet.visible;
        
        // Make sure the group is visible
        layerSet.visible = true;
        
        // Select the layer set
        app.activeDocument.activeLayer = layerSet;
        
        // Merge the group using Ctrl+E equivalent (mergeLayersNew)
        // This merges the group into a single layer while maintaining its properties
        var idMrg = charIDToTypeID("Mrg2");
        executeAction(idMrg, undefined, DialogModes.NO);
        
        // The merged layer should now be active, restore properties
        var mergedLayer = app.activeDocument.activeLayer;
        mergedLayer.name = groupName;
        mergedLayer.opacity = groupOpacity;
        mergedLayer.blendMode = groupBlendMode;
        mergedLayer.visible = groupVisible;
        
    } catch (e) {
        // If merge fails, skip this group
    }
}

// Helper function to convert string ID to char ID
function charIDToTypeID(charID) {
    return app.charIDToTypeID(charID);
}

// Run the script
main();