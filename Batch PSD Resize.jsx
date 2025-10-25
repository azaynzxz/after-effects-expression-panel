// Photoshop Batch PSD Resizer Script
// This script resizes all PSD files in a selected folder

#target photoshop

// Main function
function main() {
    // Check if Photoshop is available
    if (app.documents.length > 0) {
        app.activeDocument.suspendHistory("Batch PSD Resize", "batchResizePSDs");
    } else {
        batchResizePSDs();
    }
}

function batchResizePSDs() {
    // Create the UI dialog
    var dialog = new Window("dialog", "Batch PSD Resizer");
    dialog.orientation = "column";
    dialog.alignChildren = "fill";
    
    // Title
    var titlePanel = dialog.add("panel");
    titlePanel.add("statictext", undefined, "Batch Resize PSD Files");
    titlePanel.children[0].graphics.font = ScriptUI.newFont("dialog", "BOLD", 14);
    
    // Folder selection group
    var folderGroup = dialog.add("group");
    folderGroup.orientation = "row";
    folderGroup.alignChildren = "center";
    
    folderGroup.add("statictext", undefined, "Source Folder:");
    var folderPath = folderGroup.add("edittext", undefined, "No folder selected");
    folderPath.preferredSize.width = 300;
    folderPath.enabled = false;
    
    var browseBtn = folderGroup.add("button", undefined, "Browse...");
    
    // Dimensions group
    var dimensionsGroup = dialog.add("group");
    dimensionsGroup.orientation = "row";
    dimensionsGroup.alignChildren = "center";
    
    dimensionsGroup.add("statictext", undefined, "Width:");
    var widthInput = dimensionsGroup.add("edittext", undefined, "1920");
    widthInput.preferredSize.width = 80;
    
    dimensionsGroup.add("statictext", undefined, "Height:");
    var heightInput = dimensionsGroup.add("edittext", undefined, "1080");
    heightInput.preferredSize.width = 80;
    
    dimensionsGroup.add("statictext", undefined, "pixels");
    
    // DPI group
    var dpiGroup = dialog.add("group");
    dpiGroup.orientation = "row";
    dpiGroup.alignChildren = "center";
    
    dpiGroup.add("statictext", undefined, "DPI:");
    var dpiInput = dpiGroup.add("edittext", undefined, "72");
    dpiInput.preferredSize.width = 80;
    
    // Resize method group
    var methodGroup = dialog.add("group");
    methodGroup.orientation = "row";
    methodGroup.alignChildren = "center";
    
    methodGroup.add("statictext", undefined, "Resize Method:");
    var resizeMethod = methodGroup.add("dropdownlist", undefined, ["Bicubic", "Bicubic Smoother", "Bicubic Sharper", "Bilinear", "Nearest Neighbor"]);
    resizeMethod.selection = 0; // Default to Bicubic
    
    // Options group
    var optionsGroup = dialog.add("group");
    optionsGroup.orientation = "column";
    optionsGroup.alignChildren = "left";
    
    var saveToNewFolder = optionsGroup.add("checkbox", undefined, "Save resized files to 'Resized' subfolder");
    saveToNewFolder.value = true;
    
    var closeAfterResize = optionsGroup.add("checkbox", undefined, "Close documents after processing");
    closeAfterResize.value = true;
    
    // Progress group
    var progressGroup = dialog.add("group");
    progressGroup.orientation = "column";
    progressGroup.alignChildren = "fill";
    
    var progressText = progressGroup.add("statictext", undefined, "Ready to process...");
    var progressBar = progressGroup.add("progressbar", undefined, 0, 100);
    progressBar.preferredSize.width = 400;
    
    // Button group
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var processBtn = buttonGroup.add("button", undefined, "Process Files");
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    
    // Variables to store selected folder
    var selectedFolder = null;
    
    // Browse button event
    browseBtn.onClick = function() {
        var folder = Folder.selectDialog("Select folder containing PSD files:");
        if (folder) {
            selectedFolder = folder;
            folderPath.text = folder.fsName;
        }
    };
    
    // Process button event
    processBtn.onClick = function() {
        // Validate inputs
        var width = parseInt(widthInput.text);
        var height = parseInt(heightInput.text);
        var dpi = parseInt(dpiInput.text);
        
        if (!selectedFolder) {
            alert("Please select a source folder.");
            return;
        }
        
        if (isNaN(width) || width <= 0) {
            alert("Please enter a valid width value.");
            return;
        }
        
        if (isNaN(height) || height <= 0) {
            alert("Please enter a valid height value.");
            return;
        }
        
        if (isNaN(dpi) || dpi <= 0) {
            alert("Please enter a valid DPI value.");
            return;
        }
        
        // Get resize method
        var resizeMethodName = ResampleMethod.BICUBIC;
        switch (resizeMethod.selection.index) {
            case 0: resizeMethodName = ResampleMethod.BICUBIC; break;
            case 1: resizeMethodName = ResampleMethod.BICUBICSMOOTHER; break;
            case 2: resizeMethodName = ResampleMethod.BICUBICSHARPER; break;
            case 3: resizeMethodName = ResampleMethod.BILINEAR; break;
            case 4: resizeMethodName = ResampleMethod.NEARESTNEIGHBOR; break;
        }
        
        // Process files
        processFiles(selectedFolder, width, height, dpi, resizeMethodName, saveToNewFolder.value, closeAfterResize.value, progressText, progressBar);
        
        dialog.close();
    };
    
    // Cancel button event
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    // Show dialog
    dialog.show();
}

function processFiles(sourceFolder, targetWidth, targetHeight, targetDPI, resizeMethod, saveToNewFolder, closeAfterResize, progressText, progressBar, isDpiOnly) {
    try {
        // Get all PSD files in the folder
        var psdFiles = sourceFolder.getFiles("*.psd");
        
        if (psdFiles.length === 0) {
            alert("No PSD files found in the selected folder.");
            return;
        }
        
        // Create output folder if needed
        var outputFolder = sourceFolder;
        if (saveToNewFolder) {
            outputFolder = new Folder(sourceFolder.fsName + "/Resized");
            if (!outputFolder.exists) {
                outputFolder.create();
            }
        }
        
        var totalFiles = psdFiles.length;
        var processedFiles = 0;
        var errors = [];
        
        progressText.text = "Processing " + totalFiles + " PSD files...";
        
        // Process each PSD file
        for (var i = 0; i < psdFiles.length; i++) {
            try {
                var file = psdFiles[i];
                progressText.text = "Processing: " + file.name + " (" + (i + 1) + "/" + totalFiles + ")";
                progressBar.value = (i / totalFiles) * 100;
                
                // Open the document
                var doc = app.open(file);
                
                // Get original dimensions and DPI for information
                var originalWidth = doc.width.as("px");
                var originalHeight = doc.height.as("px");
                var originalDPI = doc.resolution;
                
                if (isDpiOnly) {
                    // Only change DPI, keep pixel dimensions the same
                    doc.resizeImage(null, null, targetDPI, resizeMethod);
                } else {
                    // Resize dimensions AND change DPI
                    doc.resizeImage(UnitValue(targetWidth, "px"), UnitValue(targetHeight, "px"), targetDPI, resizeMethod);
                }
                
                // Save the resized file
                var outputFile = new File(outputFolder.fsName + "/" + file.name);
                var saveOptions = new PhotoshopSaveOptions();
                saveOptions.layers = true;
                saveOptions.embedColorProfile = true;
                
                doc.saveAs(outputFile, saveOptions);
                
                // Close document if requested
                if (closeAfterResize) {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                }
                
                processedFiles++;
                
            } catch (fileError) {
                errors.push("Error processing " + psdFiles[i].name + ": " + fileError.message);
                
                // Try to close the document if it's still open
                try {
                    if (app.documents.length > 0) {
                        app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
                    }
                } catch (closeError) {
                    // Ignore close errors
                }
            }
        }
        
        // Update progress
        progressBar.value = 100;
        progressText.text = "Processing complete!";
        
        // Show results
        var resultMessage = "Processing complete!\n\n";
        resultMessage += "Files processed: " + processedFiles + "/" + totalFiles + "\n";
        
        if (isDpiOnly) {
            resultMessage += "Mode: DPI change only (from various DPI to " + targetDPI + " DPI)\n";
            resultMessage += "Pixel dimensions: Unchanged (this reduces file size)\n";
        } else {
            resultMessage += "Mode: Full resize\n";
            resultMessage += "New dimensions: " + targetWidth + " x " + targetHeight + " pixels at " + targetDPI + " DPI\n";
        }
        
        if (errors.length > 0) {
            resultMessage += "\nErrors encountered:\n" + errors.join("\n");
        }
        
        if (saveToNewFolder) {
            resultMessage += "\nResized files saved to: " + outputFolder.fsName;
        }
        
        alert(resultMessage);
        
    } catch (error) {
        alert("An error occurred during processing: " + error.message);
    }
}

// Run the script
main();