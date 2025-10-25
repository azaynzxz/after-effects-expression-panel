// Adobe Photoshop Script: Batch PSD Layer Flip Processor
// This script processes PSD files by flipping all layers twice to remove empty pixels
// FINAL VERSION: Simplified to a single process, removed the "Reprocess" button,
// and saves files back to the source folder instead of a subfolder.
// MODIFIED: UI cleaned up, and source folder path is now an editable field.

// Main function to create GUI and process files
function main() {
    try {
        // Create the GUI dialog
        var dialog = createGUI();
        var result = dialog.show();
        
        if (result == 1) { // User clicked "Process Files"
            var processHidden = dialog.includeHiddenCheckbox.value; // Get checkbox value
            var sourceFolder = dialog.sourceFolderGroup.sourcePath.text;

            if (sourceFolder == "No folder selected" || sourceFolder == "") {
                alert("Please select a source folder first.");
                return;
            }

            var folder = new Folder(sourceFolder);
            if (!folder.exists) {
                alert("Selected folder does not exist.");
                return;
            }

            // Process the folder with the selected option
            processBatchPSD(folder, processHidden); 
        }
        // If user clicks cancel or closes the dialog, the script simply ends.
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// Create the GUI interface
function createGUI() {
    var dialog = new Window("dialog", "Batch PSD Layer Flip Processor");
    dialog.orientation = "column";
    dialog.alignChildren = "fill";
    dialog.spacing = 10;
    dialog.margins = 16;

    // --- Options Group for Checkbox ---
    var optionsGroup = dialog.add("group");
    optionsGroup.orientation = "row";
    var includeHiddenCheckbox = optionsGroup.add("checkbox", undefined, "Process hidden layers");
    includeHiddenCheckbox.value = false; // Default to not processing hidden layers
    dialog.includeHiddenCheckbox = includeHiddenCheckbox;

    // Source folder selection
    var sourceFolderGroup = dialog.add("group");
    sourceFolderGroup.orientation = "row";
    sourceFolderGroup.alignChildren = "center";
    sourceFolderGroup.add("statictext", undefined, "Source Folder:");

    // --- MODIFIED: Changed statictext to edittext to allow pasting ---
    var sourcePath = sourceFolderGroup.add("edittext", undefined, "No folder selected");
    sourcePath.characters = 50;

    var browseBtn = sourceFolderGroup.add("button", undefined, "Browse...");

    // Store reference for later use
    dialog.sourceFolderGroup = sourceFolderGroup;
    dialog.sourceFolderGroup.sourcePath = sourcePath;

    // Browse button functionality
    browseBtn.onClick = function() {
        var folder = Folder.selectDialog("Select folder containing PSD files:");
        if (folder != null) {
            sourcePath.text = folder.fsName;
        }
    };

    // Button group
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";

    var processBtn = buttonGroup.add("button", undefined, "Process Files");
    processBtn.preferredSize.width = 120;
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.preferredSize.width = 120;

    // Button functionality
    processBtn.onClick = function() {
        dialog.close(1); // Return 1 for processing
    };

    cancelBtn.onClick = function() {
        dialog.close(0); // Return 0 for cancel
    };

    return dialog;
}


// Process all PSD files in the batch
function processBatchPSD(sourceFolder, processHidden) {
    try {
        // Get all PSD files
        var psdFiles = sourceFolder.getFiles("*.psd");

        if (psdFiles.length == 0) {
            alert("No PSD files found in the selected folder.");
            return;
        }

        // --- MODIFIED FOLDER LOGIC ---
        // The output folder is now the same as the source folder.
        var outputFolder = sourceFolder;

        // Show progress dialog
        var progressDialog = createProgressDialog(psdFiles.length);
        progressDialog.show();

        // Process each PSD file
        for (var i = 0; i < psdFiles.length; i++) {
            // Check if the user has cancelled the progress dialog
            if (progressDialog.cancelled) {
                break;
            }
            try {
                // Update progress
                progressDialog.progressBar.value = (i / psdFiles.length) * 100;
                progressDialog.statusLabel.text = "Processing: " + psdFiles[i].name + " (" + (i + 1) + "/" + psdFiles.length + ")";
                progressDialog.update();

                // Process the file, passing the hidden layer flag
                processSinglePSD(psdFiles[i], outputFolder, processHidden);

            } catch (fileError) {
                // This will log errors for individual files but continue the batch
                $.writeln("Error processing " + psdFiles[i].name + ": " + fileError.message);
                continue;
            }
        }

        // Complete
        progressDialog.progressBar.value = 100;
        if (progressDialog.cancelled) {
            progressDialog.statusLabel.text = "Processing cancelled by user.";
        } else {
            progressDialog.statusLabel.text = "Processing complete!";
        }
        progressDialog.update();

        // Change the cancel button to a close button
        progressDialog.cancelBtn.text = "Close";
        progressDialog.cancelBtn.onClick = function() {
            progressDialog.close();
        }

    } catch (e) {
        alert("Batch processing error: " + e.message);
    }
}


// Create progress dialog
function createProgressDialog(totalFiles) {
    var progressDialog = new Window("palette", "Processing Files..."); // Use palette for non-blocking UI
    progressDialog.orientation = "column";
    progressDialog.alignChildren = "fill";
    progressDialog.spacing = 10;
    progressDialog.margins = 16;
    progressDialog.cancelled = false; // Flag to track cancellation

    var statusLabel = progressDialog.add("statictext", undefined, "Initializing...");
    statusLabel.preferredSize.width = 400;

    var progressBar = progressDialog.add("progressbar", undefined, 0, 100);
    progressBar.preferredSize.width = 400;
    progressBar.preferredSize.height = 20;

    var cancelBtn = progressDialog.add("button", undefined, "Cancel");
    cancelBtn.alignment = "center";

    progressDialog.statusLabel = statusLabel;
    progressDialog.progressBar = progressBar;
    progressDialog.cancelBtn = cancelBtn;

    cancelBtn.onClick = function() {
        progressDialog.cancelled = true;
    };

    // When the user closes the window, also treat it as a cancel
    progressDialog.onClose = function() {
        progressDialog.cancelled = true;
    };

    progressDialog.center();
    return progressDialog;
}

// Process a single PSD file
function processSinglePSD(psdFile, outputFolder, processHidden) {
    var doc = null; // Ensure doc is defined in this scope
    try {
        // Open the PSD file
        doc = app.open(psdFile);

        // Save current ruler units
        var originalRulerUnits = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        // Process layers based on the checkbox selection
        flipAllLayers(doc, processHidden);

        // Create save options for PSD
        var psdSaveOptions = new PhotoshopSaveOptions();
        psdSaveOptions.embedColorProfile = true;
        psdSaveOptions.layers = true; // Preserve layers
        psdSaveOptions.alphaChannels = true;
        psdSaveOptions.spotColors = true;
        psdSaveOptions.annotations = true;

        // Save back to the same location, overwriting the original
        var outputFile = new File(outputFolder.fsName + "/" + psdFile.name);
        doc.saveAs(outputFile, psdSaveOptions, true, Extension.LOWERCASE);

        // Close the document
        doc.close(SaveOptions.DONOTSAVECHANGES);

        // Restore ruler units
        app.preferences.rulerUnits = originalRulerUnits;

    } catch (e) {
        // Make sure to close document if open
        try {
            if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        } catch (closeError) {}

        throw new Error("Failed to process " + psdFile.name + ": " + e.message);
    }
}


// Flip all layers in the document twice to remove empty pixels
function flipAllLayers(doc, includeHidden) {
    try {
        // Save current active layer
        var originalActiveLayer = doc.activeLayer;

        // Function to flip layers recursively
        function flipLayersRecursive(layerSet) {
            for (var i = layerSet.layers.length - 1; i >= 0; i--) {
                var layer = layerSet.layers[i];

                // Skip background layer and locked layers
                if (layer.isBackgroundLayer || layer.allLocked) {
                    continue;
                }

                if (layer.typename == "ArtLayer") {
                    try {
                        // Process if the layer is visible OR if the user chose to include hidden layers
                        if (layer.visible || includeHidden) {
                            var wasVisible = layer.visible;
                            // Temporarily make hidden layers visible for processing
                            if (!wasVisible) {
                                layer.visible = true;
                            }

                            // Set as active layer
                            doc.activeLayer = layer;

                            // Flip twice back-to-back to correctly remove empty pixels
                            flipLayerHorizontal(); // First flip
                            flipLayerHorizontal(); // Second flip

                            // Restore original visibility state
                            if (!wasVisible) {
                                layer.visible = false;
                            }
                        }

                    } catch (layerError) {
                        // Skip problematic layers and log it
                        $.writeln("Skipping layer '" + layer.name + "': " + layerError.message);
                        continue;
                    }

                } else if (layer.typename == "LayerSet") {
                    // Process layer groups recursively
                    flipLayersRecursive(layer);
                }
            }
        }

        // Single pass through all layers
        flipLayersRecursive(doc);

        // Restore original active layer
        try {
            doc.activeLayer = originalActiveLayer;
        } catch (e) {
            // If original layer no longer exists, ignore
        }

    } catch (e) {
        throw new Error("Error flipping layers: " + e.message);
    }
}


// Simple horizontal flip function using menu commands
function flipLayerHorizontal() {
    try {
        executeAction(stringIDToTypeID("flip"), undefined, DialogModes.NO);
    } catch (e) {
        // Fallback for older Photoshop versions if the simple method fails
        try {
            var desc = new ActionDescriptor();
            var ref = new ActionReference();
            ref.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
            desc.putReference(charIDToTypeID('null'), ref);
            desc.putEnumerated(charIDToTypeID('Axis'), charIDToTypeID('Ornt'), charIDToTypeID('Hrzn'));
            executeAction(charIDToTypeID('Flip'), desc, DialogModes.NO);
        } catch (e2) {
            throw e2; // If both methods fail, report the error
        }
    }
}

// Set application preferences
app.displayDialogs = DialogModes.ERROR;

// Run the main function
main();

