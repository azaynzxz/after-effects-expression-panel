/*******************************************************************************
 *
 * Adobe Photoshop JSX Script: Batch Posterize Background Layer
 *
 * Description:
 * This script automates the process of applying a Posterize adjustment to a
 * specific background layer across multiple PSD files in a selected folder.
 * It's designed to help reduce file size by simplifying the color information
 * in the background layer.
 *
 * How it works:
 * 1. Prompts the user to select a source folder containing PSD files.
 * 2. Prompts the user to enter a Posterize level (45-50).
 * 3. Creates a new subfolder named "Processed_Files" in the source directory.
 * 4. Iterates through each PSD file in the source folder.
 * 5. For each file, it searches for a layer named "bg", "BG", or "background".
 * 6. If the layer is found, it applies the specified Posterize adjustment.
 * 7. Saves a copy of the modified PSD file into the "Processed_Files" folder.
 *
 * Author: Gemini (Generated for User)
 *
 ******************************************************************************/

#target photoshop;

// Set Photoshop to display dialogs
app.displayDialogs = DialogModes.NO;

// Main function to run the script logic
function batchPosterizeBackground() {

    // 1. SELECT SOURCE FOLDER
    var sourceFolder = Folder.selectDialog("Select the folder with your PSD files");
    if (!sourceFolder) {
        alert("Script canceled: No source folder selected.");
        return;
    }

    // Get all PSD files from the selected folder
    var fileList = sourceFolder.getFiles(/\.(psd)$/i);
    if (fileList.length === 0) {
        alert("No PSD files found in the selected folder.");
        return;
    }

    // 2. GET POSTERIZE LEVEL FROM USER
    var posterizeLevel;
    while (true) {
        var userInput = prompt("Enter Posterize Level (between 45 and 50):", "45");
        if (userInput === null) {
            alert("Script canceled by user.");
            return; // Exit if user clicks "Cancel"
        }
        posterizeLevel = parseInt(userInput, 10);
        if (!isNaN(posterizeLevel) && posterizeLevel >= 45 && posterizeLevel <= 50) {
            break; // Valid input, exit loop
        } else {
            alert("Invalid input. Please enter a number between 45 and 50.");
        }
    }

    // 3. CREATE DESTINATION FOLDER
    var destFolder = new Folder(sourceFolder.fsName + "/Processed_Files");
    if (!destFolder.exists) {
        destFolder.create();
    }

    // 4. PROCESS EACH FILE
    for (var i = 0; i < fileList.length; i++) {
        var doc = open(fileList[i]);
        if (!doc) {
            continue; // Skip if file could not be opened
        }

        var bgLayer = findLayer(doc, ["bg", "BG", "background"]);

        if (bgLayer) {
            // Make the target layer active
            doc.activeLayer = bgLayer;

            // Apply Posterize adjustment
            doc.activeLayer.posterize(posterizeLevel);

            // Save the file to the new folder
            var saveOptions = new PhotoshopSaveOptions();
            saveOptions.layers = true; // Keep layers
            saveOptions.embedColorProfile = true;
            var destFile = new File(destFolder.fsName + "/" + doc.name);
            doc.saveAs(destFile, saveOptions, true); // true = save as copy
        } else {
            // Alert user if the specific layer was not found in a file
            alert("Could not find a 'bg', 'BG', or 'background' layer in the file: " + doc.name);
        }

        // Close the original document without saving changes
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }

    alert("Batch processing complete! \nProcessed files are saved in the 'Processed_Files' folder.");
}

/**
 * Finds a layer by its name within a document.
 * @param {Document} doc The Photoshop document to search in.
 * @param {Array} layerNames An array of possible layer names to find.
 * @returns {Layer|null} The found layer object or null if not found.
 */
function findLayer(doc, layerNames) {
    for (var i = 0; i < doc.layers.length; i++) {
        var currentLayer = doc.layers[i];
        for (var j = 0; j < layerNames.length; j++) {
            if (currentLayer.name.toLowerCase() === layerNames[j].toLowerCase()) {
                // Check if layer is visible, if not, make it visible to apply effect
                if (!currentLayer.visible) {
                    currentLayer.visible = true;
                }
                return currentLayer;
            }
        }
    }
    return null; // Return null if no matching layer was found
}

// Run the main function
batchPosterizeBackground();