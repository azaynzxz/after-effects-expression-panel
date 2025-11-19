/*
Expression Panel - After Effects ExtendScript
Non-modal dockable panel for expression snippets
*/

// Expression definitions
var EXPRESSIONS = {
    "Fast Wiggle": "wiggle(50,35)",
    "Stop Motion": "posterizeTime(2);\nvalue",
    "Time Rotation": "// Settings\nspeed = 360; // degrees per second\n\n// Rotation animation\ntime * speed",
    "Loop Cycle": 'loopOut("cycle")',
    "Loop Continue": 'loopOut("offset")',
    "Loop PingPong": 'loopOut("pingpong")',
    "Loop Wiggle": "loop = loopOut(\"cycle\");\nwig = wiggle(75, 15);\n\nloop + (wig - value)",
    "Up Down": "amp = 50;\nframesPerCycle = 5;\nfps = thisComp.frameDuration;\nt = time / (framesPerCycle * fps);\nvalue + [0, Math.sin(t * 2 * Math.PI) * amp];",
    "Left Right": "amp = 50;\nframesPerCycle = 5;\nfps = thisComp.frameDuration;\nt = time / (framesPerCycle * fps);\nvalue + [Math.sin(t * 2 * Math.PI) * amp, 0];",
    "Water Float": "wiggle(1,50)",
    "Glitter": "offset = 0.5;\nframesPerToggle = 12;\nflicker = Math.floor(timeToFrames(time - offset)) % (framesPerToggle * 2) < framesPerToggle ? 100 : 0;\nflicker",
    "Fish Position": "speed = 150;\nx = time * speed;\nwiggleFreq = 1;\nwiggleAmp = 5;\ny = Math.sin(time * wiggleFreq * 2 * Math.PI) * wiggleAmp;\nvalue + [x, y]",
    "Fish Rotation": "wiggleFreq = 0.5;\nrotationAmp = 5;\nMath.sin(time * wiggleFreq * 2 * Math.PI) * rotationAmp",
    "Dynamic Loop": 'loopOut("cycle")',
    "Posterize Time": "posterizeTime(12);\nvalue",
    "Rotation PingPong": "let amp = 2;\nlet rotateFreq = 8;\n\n// Get a stable cycle index based on time\nlet cycleIndex = Math.floor(time);\n\n// Generate a pseudo-random value per cycle (0...1)\nfunction random(seed) {\n  return fract(Math.sin(seed * 91.345) * 47453.321);\n}\nfunction fract(x) {\n  return x - Math.floor(x);\n}\n\n// Get a random pause duration between 0.3 and 0.8 seconds\nlet rand = random(cycleIndex);\nlet pauseDuration = 0.3 + rand * (0.8 - 0.3);\n\n// Total cycle time: rotateDuration + pauseDuration\nlet rotateDuration = 0.5; // how long it rotates each cycle\nlet cycleTime = rotateDuration + pauseDuration;\n\n// Where we are in the current cycle\nlet t = time % cycleTime;\n\nlet output = (t < rotateDuration)\n  ? Math.sin(time * rotateFreq * 2 * Math.PI) * amp\n  : 0;\n\noutput;",
    "Thunder Flicker": "seedRandom(index + Math.floor(time), true);\n\nrand = random();  // Random chance per second\nrate = rand > 0.7 ? 20 : rand > 0.4 ? 8 : 2;\n\nt = time * rate;\nflicker = Math.floor(t) % 2 == 0 ? 100 : 0;\n\nflicker",
    "Horror Light": "// Seed randomness per cycle\ncycleIndex = Math.floor(time);\nseedRandom(index + cycleIndex, true);\n\n// Random pause duration (0.3s–1.0s)\npauseDuration = 0.3 + random() * 0.7;\nflickerDuration = 0.4; // duration of flicker before pausing\ncycleTime = pauseDuration + flickerDuration;\n\nt = time % cycleTime;\n\n// If within flicker time, do horror flicker; otherwise, stay dim\nif (t < flickerDuration) {\n  // Seed for flicker randomness\n  seedRandom(index + Math.floor(time * 10), true);\n\n  rate = 10 + random() * 40;\n  flick = (Math.sin(time * rate * 6.2831) * 43758.5453) % 1;\n  flick = flick - Math.floor(flick); // same as fract()\n\n  // Flicker behavior\n  flickerValue = flick < 0.2 ? 100 :\n                 flick < 0.25 ? 70 :\n                 flick < 0.3 ? 40 : \n                 10 + flick * 20; // low-level jitter\n} else {\n  flickerValue = 0; // paused (off)\n}\n\nflickerValue;",
    "Scale Pulse": "// Settings\nminScale = 90;\nmaxScale = 110;\nspeed = 2; // cycles per second\n\n// Oscillate value using sine\ns = (Math.sin(time * Math.PI * speed) + 1) / 2; // normalized between 0–1\n\n// Interpolate scale using linear easing\nscaleVal = linear(s, 0, 1, minScale, maxScale);\n[scaleVal, scaleVal]",
    "Walk/Run Arc": "// Settings\nspeed = 100; // pixels per second\narcHeight = 20; // arc height in pixels\nfrequency = 2; // steps per second\ndirection = 1; // 1 for right, -1 for left\n\n// Calculate movement\nx = time * speed * direction;\ny = Math.sin(time * frequency * 2 * Math.PI) * arcHeight;\n\nvalue + [x, y]"
};

// ===== LIBRARIES SYSTEM =====

// Libraries configuration
var LIBRARIES_FOLDER = File($.fileName).parent.absoluteURI + "/Libraries/";
var LIBRARIES_DATA_FILE = LIBRARIES_FOLDER + "library_index.json";

// Default library categories
var DEFAULT_CATEGORIES = [
    "Characters",
    "Transitions", 
    "Effects",
    "Backgrounds",
    "Logos",
    "Text_Animations",
    "Particles",
    "Overlays"
];

// Initialize libraries data structure
var LIBRARIES_DATA = {
    categories: {},
    version: "1.0"
};

// Initialize libraries system
function initLibrariesSystem() {
    try {
        // Create Libraries folder if it doesn't exist
        var librariesFolder = new Folder(LIBRARIES_FOLDER);
        if (!librariesFolder.exists) {
            librariesFolder.create();
        }
        
        // Create default category folders
        for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
            var categoryPath = LIBRARIES_FOLDER + DEFAULT_CATEGORIES[i];
            var categoryFolder = new Folder(categoryPath);
            if (!categoryFolder.exists) {
                categoryFolder.create();
            }
            
            // Create thumbnails subfolder
            var thumbsPath = categoryPath + "/thumbnails";
            var thumbsFolder = new Folder(thumbsPath);
            if (!thumbsFolder.exists) {
                thumbsFolder.create();
            }
        }
        
        // Load existing library data
        loadLibrariesData();
        
    } catch (error) {
        alert("Error initializing libraries system: " + error.toString());
    }
}

// Load libraries data from JSON file
function loadLibrariesData() {
    try {
        var dataFile = new File(LIBRARIES_DATA_FILE);
        if (dataFile.exists) {
            dataFile.open("r");
            var content = dataFile.read();
            dataFile.close();
            
            if (content) {
                LIBRARIES_DATA = JSON.parse(content);
            }
        }
        
        // Ensure all default categories exist in data
        for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
            var category = DEFAULT_CATEGORIES[i];
            if (!LIBRARIES_DATA.categories[category]) {
                LIBRARIES_DATA.categories[category] = [];
            }
        }
        
    } catch (error) {
        // If loading fails, use default structure
        LIBRARIES_DATA = { categories: {}, version: "1.0" };
        for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
            LIBRARIES_DATA.categories[DEFAULT_CATEGORIES[i]] = [];
        }
    }
}

// Save libraries data to JSON file
function saveLibrariesData() {
    try {
        var dataFile = new File(LIBRARIES_DATA_FILE);
        dataFile.open("w");
        dataFile.write(JSON.stringify(LIBRARIES_DATA, null, 2));
        dataFile.close();
    } catch (error) {
        alert("Error saving libraries data: " + error.toString());
    }
}

// Save composition/precomp to library
function saveToLibrary(comp, libraryName, category) {
    try {
        // Enhanced null checks
        if (!comp || !(comp instanceof CompItem)) {
            alert("Invalid composition selected");
            return false;
        }
        
        if (!libraryName || trimString(libraryName) === "") {
            alert("Please provide a valid library name");
            return false;
        }
        
        if (!category || trimString(category) === "") {
            alert("Please provide a valid category");
            return false;
        }
        
        app.beginUndoGroup("Save to Library");
        
        // Store the current project
        var currentProject = app.project;
        if (!currentProject) {
            app.endUndoGroup();
            alert("No current project found");
            return false;
        }
        
        // Check if current project needs to be saved first
        if (!currentProject.file) {
            var shouldSave = confirm("Current project hasn't been saved. Save it first to continue with library save?");
            if (shouldSave) {
                var saveDialog = currentProject.save();
                if (!saveDialog) {
                    app.endUndoGroup();
                    alert("Project save cancelled. Cannot save to library without saving project first.");
                    return false;
                }
            } else {
                app.endUndoGroup();
                alert("Cannot save to library without saving project first.");
                return false;
            }
        }
        
        // Simple and safe approach: Save current project as library file
        // This preserves everything and avoids dependency issues
        
        // Create filename (sanitize name)
        var safeName = libraryName.replace(/[^\w\s-_]/g, "").replace(/\s+/g, "_");
        if (safeName === "") {
            safeName = "Library_Item_" + Date.now();
        }
        var fileName = safeName + ".aep";
        var filePath = LIBRARIES_FOLDER + category + "/" + fileName;
        
        // Simply save current project to library location
        var saveFile = new File(filePath);
        var saveResult = currentProject.save(saveFile);
        
        if (!saveResult) {
            app.endUndoGroup();
            alert("Could not save library file to: " + filePath);
            return false;
        }
        
        // Determine composition type safely
        var compType = "composition";
        try {
            if (comp.usedIn && comp.usedIn.length > 0) {
                compType = "precomposition";
            }
        } catch (e) {
            // If usedIn check fails, default to composition
            compType = "composition";
        }
        
        // Create library entry metadata with safe property access
        var libraryItem = {
            name: libraryName,
            fileName: fileName,
            category: category,
            type: compType,
            width: comp.width || 1920,
            height: comp.height || 1080,
            duration: comp.duration || 1,
            frameRate: comp.frameRate || 30,
            thumbnailPath: null,
            dateCreated: formatDateISO(new Date()),
            sourceProject: (currentProject.file && currentProject.file.name) ? currentProject.file.name : "Unsaved Project"
        };
        
        // Add to libraries data
        if (!LIBRARIES_DATA.categories[category]) {
            LIBRARIES_DATA.categories[category] = [];
        }
        LIBRARIES_DATA.categories[category].push(libraryItem);
        
        // Save libraries data
        saveLibrariesData();
        
        // Library file saved successfully
        
        app.endUndoGroup();
        
        return true;
        
    } catch (error) {
        app.endUndoGroup();
        alert("Error saving to library: " + error.toString());
        return false;
    }
}



// Generate thumbnail for library item
function generateThumbnail(comp, category, safeName) {
    try {
        // Set comp to frame 0 or middle frame
        var thumbnailTime = comp.duration > 0 ? comp.duration / 2 : 0;
        
        // Create render queue item for thumbnail
        var renderQueue = app.project.renderQueue;
        var renderItem = renderQueue.items.add(comp);
        
        // Set up render settings for thumbnail
        renderItem.timeSpan = TimeSpan.COMP;
        renderItem.outputModules[1].applyTemplate("Lossless");
        
        // Set thumbnail output path
        var thumbnailFileName = safeName + ".png";
        var outputPath = LIBRARIES_FOLDER + category + "/thumbnails/" + thumbnailFileName;
        renderItem.outputModules[1].file = new File(outputPath);
        
        // Render thumbnail (small size)
        renderItem.outputModules[1].setSettings({
            "Output File Info": {
                "Base Path": LIBRARIES_FOLDER + category + "/thumbnails/",
                "Subfolder Path": "",
                "File Name": safeName + "_[#####]"
            }
        });
        
        return "thumbnails/" + thumbnailFileName;
        
    } catch (error) {
        // If thumbnail generation fails, return null
        return null;
    }
}

// Load library item into current project
function loadFromLibrary(libraryItem) {
    try {
        if (!libraryItem || !libraryItem.fileName || !libraryItem.category) {
            return false;
        }
        
        var libraryFilePath = LIBRARIES_FOLDER + libraryItem.category + "/" + libraryItem.fileName;
        var libraryFile = new File(libraryFilePath);
        
        if (!libraryFile.exists) {
            alert("Library file not found: " + libraryItem.fileName);
            return false;
        }
        
        app.beginUndoGroup("Load from Library");
        
        // Import the .aep file directly as project footage
        // This creates a footage item that references the entire project
        var importOptions = new ImportOptions(libraryFile);
        importOptions.importAs = ImportAsType.PROJECT;
        
        var importedItems = app.project.importFile(importOptions);
        
        app.endUndoGroup();
        
        updateStatus("Imported '" + libraryItem.name + "' from library - check Project panel");
        return true;
        
    } catch (error) {
        app.endUndoGroup();
        
        // If project import fails, try a different approach
        try {
            app.beginUndoGroup("Load from Library (Alternative)");
            
            // Simply import the file as composition footage
            var importOptions = new ImportOptions(libraryFile);
            importOptions.importAs = ImportAsType.COMP;
            
            var importedItem = app.project.importFile(importOptions);
            
            app.endUndoGroup();
            updateStatus("Imported '" + libraryItem.name + "' as composition from library");
            return true;
            
        } catch (error2) {
            app.endUndoGroup();
            alert("Error loading from library: " + error2.toString());
            return false;
        }
    }
}

// Show Add to Library dialog
function showAddToLibraryDialog() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition or precomposition");
        return;
    }
    
    var dialog = new Window("dialog", "Add to Library");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 15;
    dialog.margins = 20;
    dialog.preferredSize = [400, 300];
    
    // Library name input
    var nameGroup = dialog.add("group");
    nameGroup.orientation = "row";
    nameGroup.alignChildren = ["left", "center"];
    nameGroup.add("statictext", undefined, "Library Name:");
    var nameInput = nameGroup.add("edittext", undefined, comp.name);
    nameInput.preferredSize.width = 250;
    
    // Category selection
    var categoryGroup = dialog.add("group");
    categoryGroup.orientation = "row";
    categoryGroup.alignChildren = ["left", "center"];
    categoryGroup.add("statictext", undefined, "Category:");
    var categoryList = categoryGroup.add("dropdownlist", undefined, DEFAULT_CATEGORIES);
    categoryList.preferredSize.width = 150;
    categoryList.selection = 0; // Default to first category
    
    // New category option
    var newCatGroup = dialog.add("group");
    newCatGroup.orientation = "row";
    newCatGroup.alignChildren = ["left", "center"];
    var newCatCheck = newCatGroup.add("checkbox", undefined, "Create new category:");
    var newCatInput = newCatGroup.add("edittext", undefined, "");
    newCatInput.preferredSize.width = 150;
    newCatInput.enabled = false;
    
    newCatCheck.onClick = function() {
        newCatInput.enabled = this.value;
        categoryList.enabled = !this.value;
        if (this.value) {
            newCatInput.active = true;
        }
    };
    
    // Composition info display
    var infoPanel = dialog.add("panel", undefined, "Composition Info");
    infoPanel.orientation = "column";
    infoPanel.alignChildren = ["fill", "top"];
    infoPanel.spacing = 5;
    infoPanel.margins = 10;
    
    infoPanel.add("statictext", undefined, "Source: " + comp.name);
    infoPanel.add("statictext", undefined, "Type: " + (comp.usedIn.length > 0 ? "Precomposition" : "Composition"));
    infoPanel.add("statictext", undefined, "Size: " + comp.width + " × " + comp.height);
    infoPanel.add("statictext", undefined, "Duration: " + comp.duration.toFixed(2) + " seconds");
    infoPanel.add("statictext", undefined, "Frame Rate: " + comp.frameRate + " fps");
    
    // Buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    buttonGroup.spacing = 10;
    
    var saveBtn = buttonGroup.add("button", undefined, "Save to Library");
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    
    saveBtn.onClick = function() {
        var libraryName = trimString(nameInput.text);
        if (!libraryName) {
            alert("Please enter a name for the library item");
            return;
        }
        
        var category = newCatCheck.value ? trimString(newCatInput.text) : categoryList.selection.text;
        if (!category) {
            alert("Please select or enter a category");
            return;
        }
        
        // Create new category folder if needed
        if (newCatCheck.value) {
            var newCategoryPath = LIBRARIES_FOLDER + category;
            var newCategoryFolder = new Folder(newCategoryPath);
            if (!newCategoryFolder.exists) {
                newCategoryFolder.create();
            }
            
            // Create thumbnails subfolder
            var thumbsPath = newCategoryPath + "/thumbnails";
            var thumbsFolder = new Folder(thumbsPath);
            if (!thumbsFolder.exists) {
                thumbsFolder.create();
            }
        }
        
        if (saveToLibrary(comp, libraryName, category)) {
            updateStatus("Saved '" + libraryName + "' to library");
            dialog.close();
        }
    };
    
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.show();
}

// Show Library Browser dialog
function showLibraryBrowserDialog() {
    loadLibrariesData(); // Refresh data
    
    var dialog = new Window("dialog", "Library Browser");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "fill"];
    dialog.spacing = 10;
    dialog.margins = 16;
    dialog.preferredSize = [600, 500];
    
    // Category tabs
    var categoryGroup = dialog.add("group");
    categoryGroup.orientation = "row";
    categoryGroup.alignChildren = ["center", "center"];
    categoryGroup.spacing = 5;
    
    categoryGroup.add("statictext", undefined, "Category:");
    var categoryDropdown = categoryGroup.add("dropdownlist");
    categoryDropdown.preferredSize.width = 150;
    
    // Populate categories
    var categories = [];
    for (var cat in LIBRARIES_DATA.categories) {
        categories.push(cat);
        categoryDropdown.add("item", cat);
    }
    
    if (categories.length > 0) {
        categoryDropdown.selection = 0;
    }
    
    var refreshBtn = categoryGroup.add("button", undefined, "Refresh");
    var manageBtn = categoryGroup.add("button", undefined, "Manage Categories");
    
    // Items list panel
    var listPanel = dialog.add("panel", undefined, "Library Items");
    listPanel.orientation = "column";
    listPanel.alignChildren = ["fill", "fill"];
    listPanel.spacing = 5;
    listPanel.margins = 10;
    
    var itemsList = listPanel.add("listbox");
    itemsList.preferredSize = [560, 250];
    
    // Item details panel
    var detailsPanel = dialog.add("panel", undefined, "Item Details");
    detailsPanel.orientation = "column";
    detailsPanel.alignChildren = ["fill", "top"];
    detailsPanel.spacing = 5;
    detailsPanel.margins = 10;
    detailsPanel.preferredSize.height = 100;
    
    var detailsText = detailsPanel.add("statictext", undefined, "Select an item to view details", {multiline: true});
    detailsText.preferredSize = [560, 80];
    
    // Buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    buttonGroup.spacing = 10;
    
    var loadBtn = buttonGroup.add("button", undefined, "Load into Project");
    var deleteBtn = buttonGroup.add("button", undefined, "Delete from Library");
    var closeBtn = buttonGroup.add("button", undefined, "Close");
    
    loadBtn.enabled = false;
    deleteBtn.enabled = false;
    
    // Populate items list for selected category
    function populateItemsList() {
        itemsList.removeAll();
        
        if (!categoryDropdown.selection) return;
        
        var selectedCategory = categoryDropdown.selection.text;
        var items = LIBRARIES_DATA.categories[selectedCategory] || [];
        
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var displayName = item.name + " (" + item.type + ")";
            var listItem = itemsList.add("item", displayName);
            listItem.libraryData = item;
            listItem.libraryIndex = i;
            listItem.categoryName = selectedCategory;
        }
    }
    
    // Show item details
    function showItemDetails(selectedItem) {
        if (selectedItem && selectedItem.libraryData) {
            var data = selectedItem.libraryData;
            var details = "Name: " + data.name + "\n";
            details += "Type: " + data.type + "\n";
            details += "Size: " + data.width + " × " + data.height + "\n";
            details += "Duration: " + data.duration.toFixed(2) + " seconds\n";
            details += "Frame Rate: " + data.frameRate + " fps\n";
            details += "Created: " + formatDateISO(new Date(data.dateCreated)).split('T')[0] + "\n";
            details += "Source: " + (data.sourceProject || "Unknown");
            
            detailsText.text = details;
            loadBtn.enabled = true;
            deleteBtn.enabled = true;
        } else {
            detailsText.text = "Select an item to view details";
            loadBtn.enabled = false;
            deleteBtn.enabled = false;
        }
    }
    
    // Event handlers
    categoryDropdown.onChange = function() {
        populateItemsList();
        showItemDetails(null);
    };
    
    itemsList.onChange = function() {
        showItemDetails(this.selection);
    };
    
    refreshBtn.onClick = function() {
        loadLibrariesData();
        populateItemsList();
        showItemDetails(null);
    };
    
    loadBtn.onClick = function() {
        var selectedItem = itemsList.selection;
        if (selectedItem && selectedItem.libraryData) {
            if (loadFromLibrary(selectedItem.libraryData)) {
                dialog.close();
            }
        }
    };
    
    deleteBtn.onClick = function() {
        var selectedItem = itemsList.selection;
        if (selectedItem && selectedItem.libraryData) {
            var result = confirm("Are you sure you want to delete '" + selectedItem.libraryData.name + "' from the library?");
            if (result) {
                // Remove from data
                var category = selectedItem.categoryName;
                var index = selectedItem.libraryIndex;
                LIBRARIES_DATA.categories[category].splice(index, 1);
                
                // Delete files
                try {
                    var filePath = LIBRARIES_FOLDER + category + "/" + selectedItem.libraryData.fileName;
                    var file = new File(filePath);
                    if (file.exists) {
                        file.remove();
                    }
                    
                    // Delete thumbnail if exists
                    if (selectedItem.libraryData.thumbnailPath) {
                        var thumbPath = LIBRARIES_FOLDER + category + "/" + selectedItem.libraryData.thumbnailPath;
                        var thumbFile = new File(thumbPath);
                        if (thumbFile.exists) {
                            thumbFile.remove();
                        }
                    }
                } catch (e) {
                    // Continue even if file deletion fails
                }
                
                saveLibrariesData();
                populateItemsList();
                showItemDetails(null);
                updateStatus("Deleted '" + selectedItem.libraryData.name + "' from library");
            }
        }
    };
    
    closeBtn.onClick = function() {
        dialog.close();
    };
    
    // Initialize
    populateItemsList();
    
    dialog.show();
}

// Helper function for trimming strings (ExtendScript doesn't have native trim)
function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, '');
}

// Helper function for date formatting (ExtendScript doesn't have toISOString)
function formatDateISO(date) {
    if (!date) date = new Date();
    
    var year = date.getFullYear();
    var month = ("0" + (date.getMonth() + 1)).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);
    var seconds = ("0" + date.getSeconds()).slice(-2);
    
    return year + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds + "Z";
}

// Initialize libraries system on startup
initLibrariesSystem();

// Create the main panel function
function createPanel(thisObj) {
    // Determine if this is a dockable panel or standalone window
    var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Expression Panel");
    
    // Panel properties
    myPanel.orientation = "column";
    myPanel.alignChildren = ["fill", "top"];
    myPanel.spacing = 1; // Reduced from 2
    myPanel.margins = 3; // Reduced from 4
    myPanel.preferredSize.width = 230; // More compact width
    
    // Title
    var titleGroup = myPanel.add("group");
    titleGroup.orientation = "row";
    titleGroup.alignChildren = ["center", "center"];
    
    var title = titleGroup.add("statictext", undefined, "Expression Snippets");
    title.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);
    
    // Timeline jumper group
    var timelineGroup = myPanel.add("group");
    timelineGroup.orientation = "column";
    timelineGroup.alignChildren = ["fill", "top"];
    timelineGroup.spacing = 2; // Reduced from 3
    timelineGroup.margins = 3; // Reduced from 4

    // Top row with label and timecode input
    var topRow = timelineGroup.add("group");
    topRow.orientation = "row";
    topRow.alignChildren = ["left", "center"];
    topRow.spacing = 3;
    
    var timelineLabel = topRow.add("statictext", undefined, "Jump:");
    timelineLabel.preferredSize.width = 40;
    timelineLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);
    
    var timeInput = topRow.add("edittext", undefined, "");
    timeInput.preferredSize.width = 100;
    timeInput.preferredSize.height = 24;
    timeInput.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 12);
    timeInput.helpTip = "Paste timecode (e.g. 00:00:30:00 or 00:00:30.017)";
    
    // Calibration controls next to input
    var calLabel = topRow.add("statictext", undefined, "Cal:");
    calLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    
    var calibrationInput = topRow.add("edittext", undefined, "0");
    calibrationInput.preferredSize.width = 30;
    calibrationInput.preferredSize.height = 24;
    calibrationInput.helpTip = "Milliseconds offset (+/-) for all jumps";
    
    var msLabel = topRow.add("statictext", undefined, "ms");
    msLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
    
    var calPlusBtn = topRow.add("button", undefined, "+");
    calPlusBtn.preferredSize.width = 16;
    calPlusBtn.preferredSize.height = 24;
    calPlusBtn.onClick = function() {
        var current = parseFloat(calibrationInput.text) || 0;
        calibrationInput.text = (current + 50).toString();
    };
    
    var calMinusBtn = topRow.add("button", undefined, "-");
    calMinusBtn.preferredSize.width = 16;
    calMinusBtn.preferredSize.height = 24;
    calMinusBtn.onClick = function() {
        var current = parseFloat(calibrationInput.text) || 0;
        calibrationInput.text = (current - 50).toString();
    };

    // Auto-move layer feature row
    var autoMoveRow = timelineGroup.add("group");
    autoMoveRow.orientation = "row";
    autoMoveRow.alignChildren = ["left", "center"];
    autoMoveRow.spacing = 3;
    
    var autoMoveCheck = autoMoveRow.add("checkbox", undefined, "Auto-move next layer");
    autoMoveCheck.helpTip = "When pasting timecode, automatically move the layer above the selected one to that time";
    autoMoveCheck.value = false;

    // Bottom row with navigation buttons and frame input
    var bottomRow = timelineGroup.add("group");
    bottomRow.orientation = "row";
    bottomRow.alignChildren = ["left", "center"];
    bottomRow.spacing = 2;

    // Jump backward buttons
    var jumpBack1s = bottomRow.add("button", undefined, "-1s");
    jumpBack1s.preferredSize.width = 38;
    jumpBack1s.onClick = function() {
        jumpByTime(-1);
    };

    var jumpBack05s = bottomRow.add("button", undefined, "-0.5s");
    jumpBack05s.preferredSize.width = 38;
    jumpBack05s.onClick = function() {
        jumpByTime(-0.5);
    };

    // Add -4 frame button
    var jumpBack4f = bottomRow.add("button", undefined, "-4f");
    jumpBack4f.preferredSize.width = 30;
    jumpBack4f.onClick = function() {
        jumpByFrames(-4);
    };

    // Frame input group
    var frameGroup = bottomRow.add("group");
    frameGroup.orientation = "row";
    frameGroup.alignChildren = ["left", "center"];
    frameGroup.spacing = 2;

    var frameInput = frameGroup.add("edittext", undefined, "");
    frameInput.preferredSize.width = 40;
    frameInput.helpTip = "Enter number of frames to jump";

    var frameJumpBtn = frameGroup.add("button", undefined, "Go");
    frameJumpBtn.preferredSize.width = 32;
    frameJumpBtn.onClick = function() {
        jumpByFrames(parseInt(frameInput.text));
    };

    // Add +4 frame button
    var jumpForward4f = bottomRow.add("button", undefined, "+4f");
    jumpForward4f.preferredSize.width = 30;
    jumpForward4f.onClick = function() {
        jumpByFrames(4);
    };

    // Jump forward buttons
    var jumpForward05s = bottomRow.add("button", undefined, "+0.5s");
    jumpForward05s.preferredSize.width = 38;
    jumpForward05s.onClick = function() {
        jumpByTime(0.5);
    };

    var jumpForward1s = bottomRow.add("button", undefined, "+1s");
    jumpForward1s.preferredSize.width = 38;
    jumpForward1s.onClick = function() {
        jumpByTime(1);
    };

    // Function to jump by seconds
    function jumpByTime(seconds) {
        try {
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                // Apply calibration offset
                var calibrationMs = parseFloat(calibrationInput.text) || 0;
                var calibrationSeconds = calibrationMs / 1000;
                
                var newTime = comp.time + seconds + calibrationSeconds;
                // Clamp to composition duration
                newTime = Math.max(0, Math.min(newTime, comp.duration));
                comp.time = newTime;
                
                // Update status with the new time
                var timeInFrames = Math.floor(newTime * comp.frameRate);
                var calMessage = calibrationMs !== 0 ? " (cal: " + calibrationMs + "ms)" : "";
                updateStatus("Jumped to frame " + timeInFrames + " (" + newTime.toFixed(2) + "s)" + calMessage);
            }
        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Function to jump by frames
    function jumpByFrames(frames) {
        try {
            if (isNaN(frames)) {
                updateStatus("Please enter a valid frame number");
                return;
            }

            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                // Apply calibration offset
                var calibrationMs = parseFloat(calibrationInput.text) || 0;
                var calibrationSeconds = calibrationMs / 1000;
                
                var seconds = frames / comp.frameRate;
                var newTime = comp.time + seconds + calibrationSeconds;
                // Clamp to composition duration
                newTime = Math.max(0, Math.min(newTime, comp.duration));
                comp.time = newTime;
                
                var calMessage = calibrationMs !== 0 ? " (cal: " + calibrationMs + "ms)" : "";
                updateStatus("Jumped " + frames + " frames to " + newTime.toFixed(2) + "s" + calMessage);
            }
        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }
    
    // Add some visual spacing after the timeline group
    var spacer = myPanel.add("group");
    spacer.preferredSize.height = 2;
    
    // Parse timecode and jump
    function parseTimeAndJump(timeStr) {
        try {
            // Find main composition
            var mainComp = null;
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.name === "main_comp") {
                    mainComp = item;
                    break;
                }
            }
            
            if (!mainComp) {
                updateStatus("Could not find 'main_comp'");
                return;
            }
            
            // Remove any whitespace
            timeStr = timeStr.replace(/\s/g, '');
            
            var totalSeconds = 0;
            var fps = mainComp.frameRate; // Get composition frame rate
            
            // Helper function to parse time parts
            function parseTimeParts(h, m, s, f) {
                return parseInt(h) * 3600 + // Hours
                       parseInt(m) * 60 + // Minutes
                       parseInt(s) + // Seconds
                       parseFloat(f || 0); // Frames as decimal of a second
            }
            
            // Try different time formats
            if (timeStr.indexOf(':') !== -1) {
                // Split by colon first
                var mainParts = timeStr.split(':');
                
                // Check if the last part contains a period (frames in decimal format)
                if (mainParts[mainParts.length - 1].indexOf('.') !== -1) {
                    // Handle subtitle engine format (HH:MM:SS.FFF)
                    var lastPart = mainParts[mainParts.length - 1].split('.');
                    mainParts[mainParts.length - 1] = lastPart[0];
                    
                    // Convert frame number to seconds
                    // If it's 3 digits (e.g., .017), treat as frame number
                    var frameNumber = parseInt(lastPart[1]);
                    if (lastPart[1].length === 3) {
                        // Remove leading zeros and convert to actual frame number
                        frameNumber = parseInt(lastPart[1].replace(/^0+/, ''));
                    }
                    var frameSeconds = frameNumber / fps;
                    
                    if (mainParts.length === 3) {
                        // Format: HH:MM:SS.FFF
                        totalSeconds = parseTimeParts(mainParts[0], mainParts[1], mainParts[2], frameSeconds);
                    } else if (mainParts.length === 2) {
                        // Format: MM:SS.FFF
                        totalSeconds = parseTimeParts(0, mainParts[0], mainParts[1], frameSeconds);
                    }
                } else {
                    // Handle standard frame format (HH:MM:SS:FF)
                    if (mainParts.length === 4) {
                        // Format: HH:MM:SS:FF
                        totalSeconds = parseTimeParts(mainParts[0], mainParts[1], mainParts[2], mainParts[3] / fps);
                    } else if (mainParts.length === 3) {
                        // Format: MM:SS:FF
                        totalSeconds = parseTimeParts(0, mainParts[0], mainParts[1], mainParts[2] / fps);
                    } else if (mainParts.length === 2) {
                        // Format: SS:FF
                        totalSeconds = parseTimeParts(0, 0, mainParts[0], mainParts[1] / fps);
                    }
                }
            } else {
                // Try parsing as seconds
                totalSeconds = parseFloat(timeStr);
            }
            
            if (isNaN(totalSeconds)) {
                updateStatus("Invalid time format");
                return;
            }
            
            // Apply calibration offset
            var calibrationMs = parseFloat(calibrationInput.text) || 0;
            var calibrationSeconds = calibrationMs / 1000;
            totalSeconds += calibrationSeconds;
            
            // Clamp to composition duration
            totalSeconds = Math.max(0, Math.min(totalSeconds, mainComp.duration));
            
            // Jump to time
            mainComp.time = totalSeconds;
            
            // Auto-move next layer if enabled
            if (autoMoveCheck.value) {
                moveNextLayerToCurrentTime(mainComp);
            }
            
            // Format the time for status display
            var hours = Math.floor(totalSeconds / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = Math.floor(totalSeconds % 60);
            var frames = Math.floor((totalSeconds % 1) * fps);
            
            // Helper function to pad numbers with leading zeros
            function padNumber(num, width) {
                var str = num.toString();
                while (str.length < width) {
                    str = '0' + str;
                }
                return str;
            }
            
            // Format display time with frames
            var timeDisplay = (hours > 0 ? padNumber(hours, 2) + ':' : '') +
                             padNumber(minutes, 2) + ':' +
                             padNumber(seconds, 2) + '.' +
                             padNumber(frames, 2); // Display frames as two digits
            
            updateStatus("Jumped to " + timeDisplay);
            
        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Function to move next layer to current time
    function moveNextLayerToCurrentTime(comp) {
        try {
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                return; // No layer selected, skip auto-move
            }
            
            // Get the first selected layer
            var currentLayer = selectedLayers[0];
            var currentLayerIndex = currentLayer.index;
            
            // Find the next layer (layer above = lower index)
            var nextLayerIndex = currentLayerIndex - 1;
            
            if (nextLayerIndex >= 1) { // Make sure there's a layer above
                var nextLayer = comp.layer(nextLayerIndex);
                
                // Move the next layer to current time
                nextLayer.startTime = comp.time;
                
                // Deselect all layers first
                for (var i = 0; i < selectedLayers.length; i++) {
                    selectedLayers[i].selected = false;
                }
                
                // Select the moved layer
                nextLayer.selected = true;
                
                updateStatus("Moved '" + nextLayer.name + "' to current time and selected it");
            } else {
                updateStatus("No layer above current selection to move");
            }
            
        } catch (error) {
            updateStatus("Auto-move error: " + error.toString());
        }
    }
    
    // Auto-jump when text changes (including paste)
    timeInput.onChanging = function() {
        if (this.text) {
            parseTimeAndJump(this.text);
            // Clear input and refocus for next input
            var self = this;
            app.setTimeout(function() {
                self.text = "";
                self.active = true;
            }, 100);
        }
    };
    
    // Also add onClick to ensure it stays focused when clicked
    timeInput.onClick = function() {
        this.active = true;
    };
    
    // Separator
    myPanel.add("panel");
    
    // Quick Utilities - 3x2 Layout
    var quickUtilGroup = myPanel.add("group");
    quickUtilGroup.orientation = "column";
    quickUtilGroup.alignChildren = ["fill", "top"];
    quickUtilGroup.spacing = 1;
    
    // First row of utilities
    var utilRow1 = quickUtilGroup.add("group");
    utilRow1.orientation = "row";
    utilRow1.alignChildren = ["fill", "center"];
    utilRow1.spacing = 1;
    
    // Add Current Keyframes button
    var addKeyframesBtn = utilRow1.add("button", undefined, "Add Keyframes");
    addKeyframesBtn.preferredSize.height = 16;
    addKeyframesBtn.helpTip = "Adds keyframes for current position, scale and rotation values";
    addKeyframesBtn.onClick = function() {
        addCurrentKeyframes();
    };
    
    // Add Hide Layers button
    var hideLayersBtn = utilRow1.add("button", undefined, "Hide Layers");
    hideLayersBtn.preferredSize.height = 16;
    hideLayersBtn.helpTip = "Hide all layers starting with 'hide' or 'x' in main_comp";
    hideLayersBtn.onClick = function() {
        hideAllLayersNamedHide();
    };
    
    // Add Show Layers button
    var showLayersBtn = utilRow1.add("button", undefined, "Show Layers");
    showLayersBtn.preferredSize.height = 16;
    showLayersBtn.helpTip = "Show all layers starting with 'hide' or 'x' in main_comp";
    showLayersBtn.onClick = function() {
        showAllLayersNamedHide();
    };
    
    // Second row of utilities
    var utilRow2 = quickUtilGroup.add("group");
    utilRow2.orientation = "row";
    utilRow2.alignChildren = ["fill", "center"];
    utilRow2.spacing = 1;

    // Add Trim Selected button
    var trimSelectedBtn = utilRow2.add("button", undefined, "Trim Selected");
    trimSelectedBtn.preferredSize.height = 16;
    trimSelectedBtn.helpTip = "Trim selected layers to avoid overlapping";
    trimSelectedBtn.onClick = function() {
        trimSelectedLayers();
    };
    
    // Add Batch Duration button
    var batchDurationBtn = utilRow2.add("button", undefined, "Batch Duration");
    batchDurationBtn.preferredSize.height = 16;
    batchDurationBtn.helpTip = "Change duration of selected precomp source compositions";
    batchDurationBtn.onClick = function() {
        changeBatchDuration();
    };
    
    // Add Separate Jump Window button
    var separateJumpBtn = utilRow2.add("button", undefined, "Jump Window");
    separateJumpBtn.preferredSize.height = 16;
    separateJumpBtn.helpTip = "Open timeline jump controls in a separate window";
    separateJumpBtn.onClick = function() {
        createSeparateJumpWindow();
    };
    
    // Main content group with two columns
    var mainGroup = myPanel.add("group");
    mainGroup.orientation = "row";
    mainGroup.alignChildren = ["fill", "top"];
    mainGroup.spacing = 2; // Reduced from 3
    
    // Left Column
    var leftCol = mainGroup.add("group");
    leftCol.orientation = "column";
    leftCol.alignChildren = ["fill", "top"];
    leftCol.spacing = 1; // Reduced from 2
    leftCol.preferredSize.width = 110;
    
    // Basic Animations (Left Column)
    leftCol.add("panel");
    var basicTitle = leftCol.add("statictext", undefined, "Basic Animations");
    basicTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    basicTitle.alignment = "center";
    
    var basicGroup = leftCol.add("group");
    basicGroup.orientation = "column";
    basicGroup.alignChildren = ["fill", "top"];
    basicGroup.spacing = 1;
    
    // Basic animation buttons
    var basicButtons = ["Fast Wiggle", "Posterize Time", "Stop Motion", "Time Rotation", "Up Down", "Left Right", "Rotation PingPong", "Thunder Flicker", "Horror Light", "Scale Pulse"];
    addButtonsToGroup(basicGroup, basicButtons);
    
    // Loops (Left Column)
    leftCol.add("panel");
    var loopTitle = leftCol.add("statictext", undefined, "Loops");
    loopTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    loopTitle.alignment = "center";
    
    var loopGroup = leftCol.add("group");
    loopGroup.orientation = "column";
    loopGroup.alignChildren = ["fill", "top"];
    loopGroup.spacing = 1;
    
    // Loop buttons (Loop Wiggle moved to accordion)
    var loopButtons = ["Loop Cycle", "Loop Continue", "Loop PingPong"];
    addButtonsToGroup(loopGroup, loopButtons);
    
    // Add separator before shape scaling section
    leftCol.add("panel");
    
    // Scale & Center Section (below Loop)
    var scaleTitle = leftCol.add("statictext", undefined, "Scale & Center");
    scaleTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    scaleTitle.alignment = "center";
    
    var scaleCenterGroup = leftCol.add("group");
    scaleCenterGroup.orientation = "column";
    scaleCenterGroup.alignChildren = ["fill", "top"];
    scaleCenterGroup.spacing = 2;
    
    // Dropdown for shape layer selection (first line)
    var shapeLayerDropdown = scaleCenterGroup.add("dropdownlist");
    shapeLayerDropdown.alignment = ["fill", "center"];
    shapeLayerDropdown.helpTip = "Select a shape layer to scale and center";
    
    // Button row (second line)
    var scaleButtonRow = scaleCenterGroup.add("group");
    scaleButtonRow.orientation = "row";
    scaleButtonRow.alignChildren = ["fill", "center"];
    scaleButtonRow.spacing = 2;
    
    // Scale & Center button
    var scaleAndCenterBtn = scaleButtonRow.add("button", undefined, "Scale & Center");
    scaleAndCenterBtn.alignment = ["fill", "center"];
    scaleAndCenterBtn.preferredSize.height = 16;
    scaleAndCenterBtn.helpTip = "Zoom selected layer based on shape layer area (like a crop/zoom window)";
    
    // Refresh button
    var refreshBtn = scaleButtonRow.add("button", undefined, "↻");
    refreshBtn.preferredSize.width = 20;
    refreshBtn.preferredSize.height = 16;
    refreshBtn.helpTip = "Refresh shape layer list";
    
    // Function to update shape layer list
    function updateShapeLayerList() {
        try {
            shapeLayerDropdown.removeAll();
            
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i);
                    if (layer instanceof ShapeLayer) {
                        shapeLayerDropdown.add("item", layer.name);
                    }
                }
                
                if (shapeLayerDropdown.items.length > 0) {
                    shapeLayerDropdown.selection = 0;
                }
            }
        } catch (error) {
            // Silently handle errors during refresh
        }
    }
    
    // Refresh on dropdown click/focus
    shapeLayerDropdown.onActivate = function() {
        updateShapeLayerList();
    };
    
    // Function to zoom target layer based on shape layer area
    function scaleAndCenterShapeLayer() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                updateStatus("No active composition");
                return;
            }

            // Check if we have a selected layer to zoom
            if (comp.selectedLayers.length === 0) {
                updateStatus("No layer selected");
                return;
            }

            if (!shapeLayerDropdown.selection) {
                updateStatus("No shape layer selected");
                return;
            }

            var shapeLayerName = shapeLayerDropdown.selection.text;
            var shapeLayer = comp.layer(shapeLayerName);
            
            if (!shapeLayer) {
                updateStatus("Shape layer not found");
                return;
            }

            var targetLayer = comp.selectedLayers[0];

            app.beginUndoGroup("Scale & Center Layer");

            // Get shape layer bounds
            var shapeRect = shapeLayer.sourceRectAtTime(comp.time, false);
            var shapeWidth = shapeRect.width;
            var shapeHeight = shapeRect.height;
            
            // Calculate zoom factor based on composition size
            var compWidth = comp.width;
            var compHeight = comp.height;
            var zoomFactorX = compWidth / shapeWidth;
            var zoomFactorY = compHeight / shapeHeight;
            var zoomFactor = Math.min(zoomFactorX, zoomFactorY);
            
            // Get current scale and calculate new scale
            var currentScale = targetLayer.transform.scale.value;
            var newScale = [currentScale[0] * zoomFactor, currentScale[1] * zoomFactor];
            
            // Add scale keyframe at current time
            targetLayer.transform.scale.setValueAtTime(comp.time, newScale);
            
            // Get shape position in comp space (center of the rectangle)
            var shapeCenterX = shapeLayer.transform.position.value[0] + shapeRect.left + shapeWidth/2;
            var shapeCenterY = shapeLayer.transform.position.value[1] + shapeRect.top + shapeHeight/2;
            
            // Get target layer's current position and bounds
            var targetPos = targetLayer.transform.position.value;
            var targetRect = targetLayer.sourceRectAtTime(comp.time, false);
            
            // Calculate the rectangle center relative to the target layer's coordinate space
            // This is where the anchor point should be set
            var anchorX = shapeCenterX - (targetPos[0] - targetRect.width/2);
            var anchorY = shapeCenterY - (targetPos[1] - targetRect.height/2);
            
            // Move the anchor point of the target layer to the rectangle center
            // This way, scaling will happen from the rectangle center
            targetLayer.transform.anchorPoint.setValueAtTime(comp.time, [anchorX, anchorY]);
            
            // Now position the layer so the rectangle area becomes centered in the composition
            var compCenterX = compWidth / 2;
            var compCenterY = compHeight / 2;
            
            // Apply new position to target layer (the rectangle center will now be at comp center)
            targetLayer.transform.position.setValueAtTime(comp.time, [compCenterX, compCenterY]);

            // Delete the shape layer after using it as reference
            shapeLayer.remove();

            app.endUndoGroup();
            
            updateStatus("Zoomed '" + targetLayer.name + "' based on '" + shapeLayerName + "' area");

        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    scaleAndCenterBtn.onClick = function() {
        scaleAndCenterShapeLayer();
        // Refresh the dropdown after operation (in case shape layers were deleted)
        updateShapeLayerList();
    };
    
    refreshBtn.onClick = function() {
        updateShapeLayerList();
        updateStatus("Shape layer list refreshed");
    };
    
    // Right Column
    var rightCol = mainGroup.add("group");
    rightCol.orientation = "column";
    rightCol.alignChildren = ["fill", "top"];
    rightCol.spacing = 1; // Reduced from 2
    rightCol.preferredSize.width = 110;
    
    // Complex Animations (Right Column)
    rightCol.add("panel");
    var complexTitle = rightCol.add("statictext", undefined, "Complex Animations");
    complexTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    complexTitle.alignment = "center";
    
    var complexGroup = rightCol.add("group");
    complexGroup.orientation = "column";
    complexGroup.alignChildren = ["fill", "top"];
    complexGroup.spacing = 1;
    
    // Complex animation buttons (Fish-like moved to accordion)
    var complexButtons = ["Water Float", "Glitter"];
    addButtonsToGroup(complexGroup, complexButtons);
    
    // Utility (Right Column)
    rightCol.add("panel");
    var utilityTitle = rightCol.add("statictext", undefined, "Utilities");
    utilityTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    utilityTitle.alignment = "center";
    
    var utilityGroup = rightCol.add("group");
    utilityGroup.orientation = "column";
    utilityGroup.alignChildren = ["fill", "top"];
    utilityGroup.spacing = 1;
    
    // Add XLock button
    var xLockBtn = utilityGroup.add("button", undefined, "XLock");
    xLockBtn.preferredSize.height = 16;
    xLockBtn.helpTip = "Toggle lock status for layers named 'x' or 'X' in main_comp";
    xLockBtn.onClick = function() {
        toggleXLockLayers();
    };
    
    // Add Auto Trim button
    var autoTrimBtn = utilityGroup.add("button", undefined, "Auto Trim");
    autoTrimBtn.preferredSize.height = 16;
    autoTrimBtn.helpTip = "Trim overlapping layers automatically in main_comp";
    autoTrimBtn.onClick = function() {
        autoTrimLayers();
    };
    
    // Add Copy Audio button
    var copyAudioBtn = utilityGroup.add("button", undefined, "Copy Audio");
    copyAudioBtn.preferredSize.height = 16;
    copyAudioBtn.helpTip = "Copy audio comp from main_comp to current comp and sync it";
    copyAudioBtn.onClick = function() {
        copyAndSyncAudio();
    };

    // Add Choppy Flip button
    var choppyFlipBtn = utilityGroup.add("button", undefined, "Choppy Flip");
    choppyFlipBtn.preferredSize.height = 16;
    choppyFlipBtn.helpTip = "Add choppy left-right flip animation to selected layers";
    choppyFlipBtn.onClick = function() {
        showChoppyFlipDialog();
    };
    
    // Add Water Distort button
    var waterDistortBtn = utilityGroup.add("button", undefined, "Water Distort");
    waterDistortBtn.preferredSize.height = 16;
    waterDistortBtn.helpTip = "Adds water distortion effect to selected layers";
    waterDistortBtn.onClick = function() {
        showWaterDistortionDialog();
    };
    
    // Add Bounce x2 button
    var bounceX2Btn = utilityGroup.add("button", undefined, "Bounce x2");
    bounceX2Btn.preferredSize.height = 16;
    bounceX2Btn.helpTip = "Creates 2 bouncy keyframes: 0→100 (scale only)";
    bounceX2Btn.onClick = function() {
        addBounceKeyframes();
    };
    
    // Add Puppet→Null button
    var puppetToNullBtn = utilityGroup.add("button", undefined, "Puppet→Null");
    puppetToNullBtn.preferredSize.height = 16;
    puppetToNullBtn.helpTip = "Create null objects for puppet pins on selected layer(s) - supports multiple layers";
    puppetToNullBtn.onClick = function() {
        createPuppetNulls();
    };
    
    // Add Flip H button
    var flipHorizontalBtn = utilityGroup.add("button", undefined, "Flip H");
    flipHorizontalBtn.preferredSize.height = 16;
    flipHorizontalBtn.helpTip = "Flip layers horizontally (invert X scale)";
    flipHorizontalBtn.onClick = function() {
        flipHorizontal();
    };
    
    // Add Flip V button
    var flipVerticalBtn = utilityGroup.add("button", undefined, "Flip V");
    flipVerticalBtn.preferredSize.height = 16;
    flipVerticalBtn.helpTip = "Flip layers vertically (invert Y scale)";
    flipVerticalBtn.onClick = function() {
        flipVertical();
    };
    
    // Add Reverse KF button
    var reverseKeyframesBtn = utilityGroup.add("button", undefined, "Reverse KF");
    reverseKeyframesBtn.preferredSize.height = 16;
    reverseKeyframesBtn.helpTip = "Reverse selected keyframes (select keyframes in timeline first)";
    reverseKeyframesBtn.onClick = function() {
        reverseAllKeyframes();
    };
    
    // Add Batch Scale button
    var batchScaleBtn = utilityGroup.add("button", undefined, "Batch Scale");
    batchScaleBtn.preferredSize.height = 16;
    batchScaleBtn.helpTip = "Batch scale layers with presets (34%, 50%, 100%)";
    batchScaleBtn.onClick = function() {
        showBatchScaleDialog();
    };
    
    // More button (opens popup window)
    var advancedToolsBtn = utilityGroup.add("button", undefined, "More");
    advancedToolsBtn.preferredSize.height = 16;
    advancedToolsBtn.helpTip = "Open advanced tools window";
    advancedToolsBtn.onClick = function() {
        showAdvancedToolsWindow();
    };
    
    // Layer Navigation Section (below More button)
    rightCol.add("panel");
    var layerNavTitle = rightCol.add("statictext", undefined, "Layer Navigation");
    layerNavTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    layerNavTitle.alignment = "center";
    
    var layerNavGroup = rightCol.add("group");
    layerNavGroup.orientation = "row";
    layerNavGroup.alignChildren = ["fill", "center"];
    layerNavGroup.spacing = 2;
    
    // Previous Layer button
    var prevLayerBtn = layerNavGroup.add("button", undefined, "<");
    prevLayerBtn.preferredSize.width = 30;
    prevLayerBtn.preferredSize.height = 20;
    prevLayerBtn.helpTip = "Jump to previous layer start";
    prevLayerBtn.onClick = function() {
        jumpToPreviousLayerDirect();
    };
    
    // Next Layer button
    var nextLayerBtn = layerNavGroup.add("button", undefined, ">");
    nextLayerBtn.preferredSize.width = 30;
    nextLayerBtn.preferredSize.height = 20;
    nextLayerBtn.helpTip = "Jump to next layer start";
    nextLayerBtn.onClick = function() {
        jumpToNextLayerDirect();
    };
    
    // Status area at the bottom
    myPanel.add("panel");
    
    var statusGroup = myPanel.add("group");
    statusGroup.orientation = "row";
    statusGroup.alignChildren = ["fill", "center"];
    
    var statusLabel = statusGroup.add("statictext", undefined, "Status:");
    statusLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 8);
    
    var statusText = statusGroup.add("statictext", undefined, "Ready");
    statusText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 8);
    statusText.alignment = ["fill", "center"];
    
    // Store reference for status updates
    myPanel.statusText = statusText;
    
    // Make timeline input always active/focused (do this after all UI is created)
    timeInput.active = true;
    
    // Helper function to add buttons to a group
    function addButtonsToGroup(group, buttonNames) {
        for (var i = 0; i < buttonNames.length; i++) {
            var key = buttonNames[i];
            if (EXPRESSIONS.hasOwnProperty(key) || key === "Fish-like") {
                var btn = group.add("button", undefined, key);
                btn.alignment = "fill";
                btn.preferredSize.height = 16;
                btn.helpTip = key === "Fish-like" ? "Swimming fish animation" : EXPRESSIONS[key];
                
                // Create closure for button click
                (function(expressionName, expressionCode) {
                    btn.onClick = function() {
                        if (expressionName === "Time Rotation") {
                            showTimeRotationDialog();
                        } else if (expressionName === "Up Down") {
                            showUpDownDialog();
                        } else if (expressionName === "Left Right") {
                            showLeftRightDialog();
                        } else if (expressionName === "Water Float") {
                            showWaterFloatDialog();
                        } else if (expressionName === "Glitter") {
                            showGlitterDialog();
                        } else if (expressionName === "Fish-like") {
                            showFishDialog();
                        } else if (expressionName === "Fast Wiggle") {
                            showWigglePresetsDialog();
                        } else if (expressionName === "Posterize Time") {
                            showPosterizeTimeDialog();
                        } else if (expressionName === "Rotation PingPong") {
                            showRotationPingPongDialog();
                        } else if (expressionName === "Thunder Flicker") {
                            showThunderFlickerDialog();
                        } else if (expressionName === "Scale Pulse") {
                            showScalePulseDialog();
                        } else if (expressionName === "Walk/Run Arc") {
                            showWalkRunDialog();
                        } else {
                            handleExpressionClick(expressionName, expressionCode);
                        }
                    };
                })(key, EXPRESSIONS[key]);
            }
        }
    }
    
    // Layout and show
    myPanel.layout.layout(true);
    
    if (myPanel instanceof Window) {
        myPanel.center();
        myPanel.show();
    }
    
    return myPanel;
}

// Time Remap Expression function (Sync Audio)
function applyTimeRemapExpression() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            updateStatus("No layers selected");
            return;
        }

        app.beginUndoGroup("Sync Audio with Main Comp");

        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            
            // Enable time remapping if not already enabled
            if (!layer.timeRemapEnabled) {
                layer.timeRemapEnabled = true;
            }

            // Apply the expression
            var expression = 'MasterC = "main_comp";\n' +
                           'PreC = thisComp.name;\n\n' +
                           'C = comp(MasterC);\n' +
                           'L = C.layer(PreC);\n' +
                           'Main_T = time + L.startTime;';
            
            layer.timeRemap.expression = expression;
        }

        app.endUndoGroup();
        updateStatus("Synced " + selectedLayers.length + " layer(s) with main_comp");

    } catch (error) {
        updateStatus("Error: " + error.toString());
    }
}

// Copy Audio comp from main_comp and sync it
function copyAndSyncAudio() {
    try {
        var currentComp = app.project.activeItem;
        if (!currentComp || !(currentComp instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }

        // Find main_comp in the project
        var mainComp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === "main_comp") {
                mainComp = item;
                break;
            }
        }

        if (!mainComp) {
            updateStatus("main_comp not found");
            return;
        }

        // Search for audio layer in main_comp (case insensitive)
        var audioLayer = null;
        for (var i = 1; i <= mainComp.numLayers; i++) {
            var layer = mainComp.layer(i);
            var layerName = layer.name.toLowerCase();
            if (layerName === "audio" || layerName.indexOf("audio") === 0) {
                audioLayer = layer;
                break;
            }
        }

        if (!audioLayer) {
            updateStatus("Audio layer not found in main_comp");
            return;
        }

        app.beginUndoGroup("Copy and Sync Audio");

        // Check if audio already exists in current comp
        var existingAudio = null;
        for (var i = 1; i <= currentComp.numLayers; i++) {
            var layer = currentComp.layer(i);
            var layerName = layer.name.toLowerCase();
            if (layerName === "audio" || layerName.indexOf("audio") === 0) {
                existingAudio = layer;
                break;
            }
        }

        // If audio already exists, remove it
        if (existingAudio) {
            existingAudio.remove();
        }

        // Get the source item of the audio layer
        var audioSource = audioLayer.source;
        
        // Add the audio source to current comp
        var newAudioLayer = currentComp.layers.add(audioSource);
        
        // Copy properties from original layer
        newAudioLayer.startTime = 0;
        newAudioLayer.inPoint = audioLayer.inPoint;
        newAudioLayer.outPoint = audioLayer.outPoint;
        
        // Enable time remapping if not already enabled
        if (!newAudioLayer.timeRemapEnabled) {
            newAudioLayer.timeRemapEnabled = true;
        }

        // Apply the sync expression
        var expression = 'MasterC = "main_comp";\n' +
                       'PreC = thisComp.name;\n\n' +
                       'C = comp(MasterC);\n' +
                       'L = C.layer(PreC);\n' +
                       'Main_T = time + L.startTime;';
        
        newAudioLayer.timeRemap.expression = expression;

        // Auto-lock the audio layer to prevent overlapping with other layers
        newAudioLayer.locked = true;

        // Deselect all layers and select the audio layer
        var allLayers = currentComp.selectedLayers;
        for (var i = 0; i < allLayers.length; i++) {
            allLayers[i].selected = false;
        }
        newAudioLayer.selected = true;

        app.endUndoGroup();
        updateStatus("Copied, synced, and locked audio to " + currentComp.name);

    } catch (error) {
        app.endUndoGroup();
        updateStatus("Error: " + error.toString());
    }
}

// Create Null Object function
function createNullObject() {
    try {
        var comp = app.project.activeItem;
        
        if (!comp || !(comp instanceof CompItem)) {
            alert("No active composition found");
            return;
        }
        
        app.beginUndoGroup("Create Null Object");
        
        // Create null object
        var nullLayer = comp.layers.addNull();
        nullLayer.name = "Control_null";
        
        // Set null properties
        // Anchor Point: 50, 50
        nullLayer.transform.anchorPoint.setValue([50, 50]);
        
        // Scale: 500%, 500%
        nullLayer.transform.scale.setValue([500, 500]);
        
        // Position null at specific coordinates
        nullLayer.transform.position.setValue([2880, 1620]);
        
        app.endUndoGroup();
        
        updateStatus("Created null object");
        
    } catch (error) {
        alert("Error creating null object: " + error.message);
    }
}

// Mask to Crop Layer function - trims selected layers to work area
function maskToCropLayer() {
    try {
        var comp = app.project.activeItem;
        
        if (!comp || !(comp instanceof CompItem)) {
            alert("No active composition found");
            return;
        }
        
        // Check if any layers are selected
        if (comp.selectedLayers.length === 0) {
            alert("Please select one or more layers to crop");
            return;
        }
        
        app.beginUndoGroup("Mask to Crop Selected Layers");
        
        // Get the work area start and end times
        var workAreaStart = comp.workAreaStart;
        var workAreaDuration = comp.workAreaDuration;
        var workAreaEnd = workAreaStart + workAreaDuration;
        
        var croppedLayers = 0;
        var skippedLayers = 0;
        
        // Process only selected layers
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            
            try {
                // Check if layer is locked
                if (layer.locked) {
                    skippedLayers++;
                    continue;
                }
                
                var currentInPoint = layer.inPoint;
                var currentOutPoint = layer.outPoint;
                
                // Calculate the new in and out points relative to work area start
                var newInPoint = currentInPoint - workAreaStart;
                var newOutPoint = currentOutPoint - workAreaStart;
                
                // Set the new in and out points
                layer.inPoint = newInPoint;
                layer.outPoint = newOutPoint;
                
                croppedLayers++;
                
            } catch (layerError) {
                // Skip this layer if there's an error (e.g., locked layer)
                skippedLayers++;
                continue;
            }
        }
        
        app.endUndoGroup();
        
        if (croppedLayers > 0) {
            var message = "Cropped " + croppedLayers + " layer(s) to work area";
            if (skippedLayers > 0) {
                message += " (" + skippedLayers + " locked layers skipped)";
            }
            updateStatus(message);
        } else {
            updateStatus("No layers could be cropped (all selected layers are locked)");
        }
        
    } catch (error) {
        app.endUndoGroup();
        alert("Error cropping layers: " + error.message);
    }
}

// Show time rotation dialog with custom value
function showTimeRotationDialog() {
    var dialog = new Window("dialog", "Time Rotation Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Speed input
    var speedGroup = dialog.add("group");
    speedGroup.orientation = "row";
    speedGroup.alignChildren = ["left", "center"];
    speedGroup.add("statictext", undefined, "Rotation Speed (°/sec):");
    var speedInput = speedGroup.add("edittext", undefined, "360");
    speedInput.preferredSize.width = 60;
    
    // Direction checkbox
    var directionCheck = dialog.add("checkbox", undefined, "Reverse Direction");
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var slowBtn = presetGroup.add("button", undefined, "Slow");
    slowBtn.onClick = function() {
        speedInput.text = "90";
        directionCheck.value = false;
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        speedInput.text = "360";
        directionCheck.value = false;
    };
    
    var fastBtn = presetGroup.add("button", undefined, "Fast");
    fastBtn.onClick = function() {
        speedInput.text = "720";
        directionCheck.value = false;
    };
    
    // Preview
    var previewGroup = dialog.add("group");
    previewGroup.orientation = "column";
    previewGroup.alignChildren = ["fill", "top"];
    
    var previewLabel = previewGroup.add("statictext", undefined, "Preview:");
    previewLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var previewText = previewGroup.add("statictext", undefined, "");
    previewText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
    
    // Update preview function
    function updatePreview() {
        var speed = parseFloat(speedInput.text);
        if (!isNaN(speed)) {
            if (directionCheck.value) {
                speed = -speed;
            }
            var expression = "// Settings\nspeed = " + speed + "; // degrees per second\n\n// Rotation animation\ntime * speed";
            previewText.text = expression;
        }
    }
    
    // Add change handlers
    speedInput.onChanging = updatePreview;
    directionCheck.onClick = updatePreview;
    
    // Initial preview update
    updatePreview();
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var speed = parseFloat(speedInput.text);
        if (!isNaN(speed)) {
            if (directionCheck.value) {
                speed = -speed;
            }
            var expression = "// Settings\nspeed = " + speed + "; // degrees per second\n\n// Rotation animation\ntime * speed";
            handleExpressionClick("Time Rotation", expression);
            dialog.close();
        } else {
            alert("Please enter a valid number");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show combination dialog for Stop Motion + Time
function showCombinationDialog(name, defaultExpression) {
    var dialog = new Window("dialog", name + " Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Posterize Time setting
    var posterizeGroup = dialog.add("group");
    posterizeGroup.orientation = "row";
    posterizeGroup.alignChildren = ["fill", "center"];
    
    posterizeGroup.add("statictext", undefined, "posterizeTime(");
    var posterizeInput = posterizeGroup.add("edittext", undefined, "1");
    posterizeInput.preferredSize.width = 50;
    posterizeGroup.add("statictext", undefined, ")");
    
    // Time multiplier setting
    var timeGroup = dialog.add("group");
    timeGroup.orientation = "row";
    timeGroup.alignChildren = ["fill", "center"];
    
    timeGroup.add("statictext", undefined, "time * ");
    var timeInput = timeGroup.add("edittext", undefined, "360");
    timeInput.preferredSize.width = 80;
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var posterizeValue = posterizeInput.text;
        var timeValue = timeInput.text;
        
        if (posterizeValue && timeValue && !isNaN(parseFloat(posterizeValue)) && !isNaN(parseFloat(timeValue))) {
            var expression = "posterizeTime(" + posterizeValue + ");\ntime*" + timeValue;
            handleExpressionClick(name, expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show wiggle + time combination dialog
function showWiggleTimeDialog() {
    var dialog = new Window("dialog", "Wiggle + Time Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Wiggle settings
    var wiggleGroup = dialog.add("group");
    wiggleGroup.orientation = "row";
    wiggleGroup.alignChildren = ["fill", "center"];
    
    wiggleGroup.add("statictext", undefined, "wiggle(");
    var freqInput = wiggleGroup.add("edittext", undefined, "10");
    freqInput.preferredSize.width = 50;
    wiggleGroup.add("statictext", undefined, ", ");
    var ampInput = wiggleGroup.add("edittext", undefined, "20");
    ampInput.preferredSize.width = 50;
    wiggleGroup.add("statictext", undefined, ")");
    
    // Time settings
    var timeGroup = dialog.add("group");
    timeGroup.orientation = "row";
    timeGroup.alignChildren = ["fill", "center"];
    
    timeGroup.add("statictext", undefined, "+ time * ");
    var timeInput = timeGroup.add("edittext", undefined, "180");
    timeInput.preferredSize.width = 80;
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var freq = freqInput.text;
        var amp = ampInput.text;
        var timeValue = timeInput.text;
        
        if (freq && amp && timeValue && !isNaN(parseFloat(freq)) && !isNaN(parseFloat(amp)) && !isNaN(parseFloat(timeValue))) {
            var expression = "wiggle(" + freq + "," + amp + ") + time*" + timeValue;
            handleExpressionClick("Wiggle + Time", expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Function to get current playhead time and format as HH:MM:SS:FF
function getCurrentTimeFormatted() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition first.");
            return null;
        }
        
        var currentTime = comp.time;
        var fps = comp.frameRate;
        
        // Convert seconds to HH:MM:SS:FF format
        var hours = Math.floor(currentTime / 3600);
        var minutes = Math.floor((currentTime % 3600) / 60);
        var seconds = Math.floor(currentTime % 60);
        var frames = Math.floor((currentTime % 1) * fps);
        
        // Helper function to pad numbers with leading zeros
        function padNumber(num, width) {
            var str = num.toString();
            while (str.length < width) {
                str = '0' + str;
            }
            return str;
        }
        
        // Format as HH:MM:SS:FF
        var timeString = padNumber(hours, 2) + ':' + 
                        padNumber(minutes, 2) + ':' + 
                        padNumber(seconds, 2) + ':' + 
                        padNumber(frames, 2);
        
        return timeString;
        
    } catch (error) {
        alert("Error getting current time: " + error.message);
        return null;
    }
}

// Function to convert H:MM:SS:FF to seconds
function timeToSeconds(timeString, frameRate) {
    if (!timeString) {
        return null;
    }
    timeString = timeString.trim();
    if (timeString === "") {
        return null;
    }
    var parts = timeString.split(':');
    if (parts.length !== 4) {
        alert("Invalid time format. Please use H:MM:SS:FF (e.g., 0:00:10:12)");
        return null;
    }
    try {
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var s = parseInt(parts[2], 10);
        var f = parseInt(parts[3], 10);

        if (isNaN(h) || isNaN(m) || isNaN(s) || isNaN(f)) {
            alert("Invalid time format. Contains non-numeric values. Please use H:MM:SS:FF.");
            return null;
        }

        return (h * 3600) + (m * 60) + s + (f / frameRate);
    } catch (e) {
        alert("Error parsing time: " + e);
        return null;
    }
}

// Show up down animation dialog
function showUpDownDialog() {
    var dialog = new Window("dialog", "Up Down Animation Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 8;
    dialog.margins = 12;
    dialog.preferredSize.width = 280;
    dialog.preferredSize.height = 200;
    
    // Input settings in a more compact layout
    var inputGroup = dialog.add("group");
    inputGroup.orientation = "row";
    inputGroup.alignChildren = ["fill", "center"];
    inputGroup.spacing = 8;
    
    // Left column for amplitude and frames
    var leftCol = inputGroup.add("group");
    leftCol.orientation = "column";
    leftCol.alignChildren = ["fill", "center"];
    leftCol.spacing = 4;
    
    var ampGroup = leftCol.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["left", "center"];
    ampGroup.spacing = 4;
    ampGroup.add("statictext", undefined, "Amp:");
    var ampInput = ampGroup.add("edittext", undefined, "50");
    ampInput.preferredSize.width = 50;
    
    var framesGroup = leftCol.add("group");
    framesGroup.orientation = "row";
    framesGroup.alignChildren = ["left", "center"];
    framesGroup.spacing = 4;
    framesGroup.add("statictext", undefined, "Frames:");
    var framesInput = framesGroup.add("edittext", undefined, "5");
    framesInput.preferredSize.width = 50;
    
    // Right column for stop time
    var rightCol = inputGroup.add("group");
    rightCol.orientation = "column";
    rightCol.alignChildren = ["fill", "center"];
    rightCol.spacing = 4;
    
    var stopTimeGroup = rightCol.add("group");
    stopTimeGroup.orientation = "row";
    stopTimeGroup.alignChildren = ["left", "center"];
    stopTimeGroup.spacing = 4;
    stopTimeGroup.add("statictext", undefined, "Stop:");
    var stopTimeInput = stopTimeGroup.add("edittext", undefined, "");
    stopTimeInput.preferredSize.width = 80;
    stopTimeInput.helpTip = "Leave empty for no stop time.";
    
    // Stop Here checkbox
    var stopHereCheck = rightCol.add("checkbox", undefined, "Stop Here");
    stopHereCheck.helpTip = "Check to fill stop time with current playhead position";
    stopHereCheck.onClick = function() {
        if (stopHereCheck.value) {
            var currentTime = getCurrentTimeFormatted();
            if (currentTime) {
                stopTimeInput.text = currentTime;
            }
        }
    };
    
    // Preset buttons in 4x2 grid
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "column";
    presetGroup.alignChildren = ["fill", "top"];
    presetGroup.spacing = 3;
    
    var presetLabel = presetGroup.add("statictext", undefined, "Presets:");
    presetLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    // First row of presets
    var presetRow1 = presetGroup.add("group");
    presetRow1.orientation = "row";
    presetRow1.alignChildren = ["fill", "center"];
    presetRow1.spacing = 3;
    
    var subtleBtn = presetRow1.add("button", undefined, "Subtle");
    subtleBtn.preferredSize.width = 60;
    subtleBtn.preferredSize.height = 20;
    subtleBtn.onClick = function() {
        ampInput.text = "12";
        framesInput.text = "12";
    };
    
    var normalBtn = presetRow1.add("button", undefined, "Normal");
    normalBtn.preferredSize.width = 60;
    normalBtn.preferredSize.height = 20;
    normalBtn.onClick = function() {
        ampInput.text = "50";
        framesInput.text = "5";
    };
    
    var crazyBtn = presetRow1.add("button", undefined, "Crazy");
    crazyBtn.preferredSize.width = 60;
    crazyBtn.preferredSize.height = 20;
    crazyBtn.onClick = function() {
        ampInput.text = "20";
        framesInput.text = "3";
    };
    
    var preset1Btn = presetRow1.add("button", undefined, "7,9");
    preset1Btn.preferredSize.width = 60;
    preset1Btn.preferredSize.height = 20;
    preset1Btn.onClick = function() {
        ampInput.text = "7";
        framesInput.text = "9";
    };
    
    // Second row of presets
    var presetRow2 = presetGroup.add("group");
    presetRow2.orientation = "row";
    presetRow2.alignChildren = ["fill", "center"];
    presetRow2.spacing = 3;
    
    var preset2Btn = presetRow2.add("button", undefined, "24,24");
    preset2Btn.preferredSize.width = 60;
    preset2Btn.preferredSize.height = 20;
    preset2Btn.onClick = function() {
        ampInput.text = "24";
        framesInput.text = "24";
    };
    
    var preset3Btn = presetRow2.add("button", undefined, "35,24");
    preset3Btn.preferredSize.width = 60;
    preset3Btn.preferredSize.height = 20;
    preset3Btn.onClick = function() {
        ampInput.text = "35";
        framesInput.text = "24";
    };
    
    var preset4Btn = presetRow2.add("button", undefined, "24,12");
    preset4Btn.preferredSize.width = 60;
    preset4Btn.preferredSize.height = 20;
    preset4Btn.onClick = function() {
        ampInput.text = "24";
        framesInput.text = "12";
    };
    
    // Third row of presets
    var presetRow3 = presetGroup.add("group");
    presetRow3.orientation = "row";
    presetRow3.alignChildren = ["fill", "center"];
    presetRow3.spacing = 3;
    
    var preset5Btn = presetRow3.add("button", undefined, "50,24");
    preset5Btn.preferredSize.width = 60;
    preset5Btn.preferredSize.height = 20;
    preset5Btn.onClick = function() {
        ampInput.text = "50";
        framesInput.text = "24";
    };
    
    var preset6Btn = presetRow3.add("button", undefined, "35,12");
    preset6Btn.preferredSize.width = 60;
    preset6Btn.preferredSize.height = 20;
    preset6Btn.onClick = function() {
        ampInput.text = "35";
        framesInput.text = "12";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        try {
        var amp = ampInput.text;
        var frames = framesInput.text;
            var stopTimeStr = stopTimeInput.text;
        
        if (amp && frames && !isNaN(parseFloat(amp)) && !isNaN(parseFloat(frames))) {
            var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    alert("Please select a composition.");
                    return;
                }

                var stopTimeComponents = null;
                if (stopTimeStr !== "") {
                    var parts = stopTimeStr.split(':');
                    if (parts.length === 4 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2])) && !isNaN(parseInt(parts[3]))) {
                        stopTimeComponents = {
                            h: parseInt(parts[0]),
                            m: parseInt(parts[1]),
                            s: parseInt(parts[2]),
                            f: parseInt(parts[3])
                        };
                    } else {
                        alert("Invalid time format. Please use H:MM:SS:FF or leave it empty.");
                        return;
                    }
                }

                var selectedLayers = comp.selectedLayers;
            
            if (selectedLayers.length > 1) {
                // Multiple layers selected - randomize frames per cycle
                for (var i = 0; i < selectedLayers.length; i++) {
                    var randomFrames = Math.floor(Math.random() * (35 - 12 + 1)) + 12; // Random value between 12-35
                        var expression;
                        if (stopTimeComponents) {
                            var stopTimeCalculation = "(" + stopTimeComponents.h + " * 3600) + (" + stopTimeComponents.m + " * 60) + " + stopTimeComponents.s + " + (" + stopTimeComponents.f + " * thisComp.frameDuration);";
                            expression = "amp = " + amp + ";\n" +
                                         "framesPerCycle = " + randomFrames + ";\n" +
                                         "stopTime = " + stopTimeCalculation + "\n" +
                                         "t = time;\n" +
                                         "if (time >= stopTime) {\n" +
                                         "  t = stopTime;\n" +
                                         "}\n" +
                                         "freq = 1 / (framesPerCycle * thisComp.frameDuration);\n" +
                                         "y_movement = Math.sin(t * freq * 2 * Math.PI) * amp;\n" +
                                         "value + [0, y_movement];";
                        } else {
                            expression = "amp = " + amp + ";\n" +
                                   "framesPerCycle = " + randomFrames + ";\n" +
                                   "fps = thisComp.frameDuration;\n" +
                                   "t = time / (framesPerCycle * fps);\n" +
                                   "value + [0, Math.sin(t * 2 * Math.PI) * amp];";
                        }
                        if (selectedLayers[i].transform && selectedLayers[i].transform.position) {
                    selectedLayers[i].transform.position.expression = expression;
                        }
                }
            } else {
                    if (selectedLayers.length === 0) {
                        alert("Please select at least one layer.");
                        return;
                    }
                // Single layer - use normal settings
                    var expression;
                    if (stopTimeComponents) {
                         var stopTimeCalculation = "(" + stopTimeComponents.h + " * 3600) + (" + stopTimeComponents.m + " * 60) + " + stopTimeComponents.s + " + (" + stopTimeComponents.f + " * thisComp.frameDuration);";
                         expression = "amp = " + amp + ";\n" +
                                      "framesPerCycle = " + frames + ";\n" +
                                      "stopTime = " + stopTimeCalculation + "\n" +
                                      "t = time;\n" +
                                      "if (time >= stopTime) {\n" +
                                      "  t = stopTime;\n" +
                                      "}\n" +
                                      "freq = 1 / (framesPerCycle * thisComp.frameDuration);\n" +
                                      "y_movement = Math.sin(t * freq * 2 * Math.PI) * amp;\n" +
                                      "value + [0, y_movement];";
                    } else {
                        expression = "amp = " + amp + ";\n" +
                               "framesPerCycle = " + frames + ";\n" +
                               "fps = thisComp.frameDuration;\n" +
                               "t = time / (framesPerCycle * fps);\n" +
                               "value + [0, Math.sin(t * 2 * Math.PI) * amp];";
                    }
                handleExpressionClick("Up Down", expression);
            }
            dialog.close();
        } else {
                alert("Please enter valid numbers for Amplitude and Frames.");
            }
        } catch(e) {
            alert("An error occurred in the script.\n\nError: " + e.toString() + "\nLine: " + e.line);
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show left right animation dialog
function showLeftRightDialog() {
    var dialog = new Window("dialog", "Left Right Animation Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 8;
    dialog.margins = 12;
    dialog.preferredSize.width = 280;
    dialog.preferredSize.height = 200;
    
    // Input settings in a more compact layout
    var inputGroup = dialog.add("group");
    inputGroup.orientation = "row";
    inputGroup.alignChildren = ["fill", "center"];
    inputGroup.spacing = 8;
    
    // Left column for amplitude and frames
    var leftCol = inputGroup.add("group");
    leftCol.orientation = "column";
    leftCol.alignChildren = ["fill", "center"];
    leftCol.spacing = 4;
    
    var ampGroup = leftCol.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["left", "center"];
    ampGroup.spacing = 4;
    ampGroup.add("statictext", undefined, "Amp:");
    var ampInput = ampGroup.add("edittext", undefined, "50");
    ampInput.preferredSize.width = 50;
    
    var framesGroup = leftCol.add("group");
    framesGroup.orientation = "row";
    framesGroup.alignChildren = ["left", "center"];
    framesGroup.spacing = 4;
    framesGroup.add("statictext", undefined, "Frames:");
    var framesInput = framesGroup.add("edittext", undefined, "5");
    framesInput.preferredSize.width = 50;
    
    // Right column for stop time
    var rightCol = inputGroup.add("group");
    rightCol.orientation = "column";
    rightCol.alignChildren = ["fill", "center"];
    rightCol.spacing = 4;
    
    var stopTimeGroup = rightCol.add("group");
    stopTimeGroup.orientation = "row";
    stopTimeGroup.alignChildren = ["left", "center"];
    stopTimeGroup.spacing = 4;
    stopTimeGroup.add("statictext", undefined, "Stop:");
    var stopTimeInput = stopTimeGroup.add("edittext", undefined, "");
    stopTimeInput.preferredSize.width = 80;
    stopTimeInput.helpTip = "Leave empty for no stop time.";
    
    // Stop Here checkbox
    var stopHereCheck = rightCol.add("checkbox", undefined, "Stop Here");
    stopHereCheck.helpTip = "Check to fill stop time with current playhead position";
    stopHereCheck.onClick = function() {
        if (stopHereCheck.value) {
            var currentTime = getCurrentTimeFormatted();
            if (currentTime) {
                stopTimeInput.text = currentTime;
            }
        }
    };
    
    // Preset buttons in 4x2 grid
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "column";
    presetGroup.alignChildren = ["fill", "top"];
    presetGroup.spacing = 3;
    
    var presetLabel = presetGroup.add("statictext", undefined, "Presets:");
    presetLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    // First row of presets
    var presetRow1 = presetGroup.add("group");
    presetRow1.orientation = "row";
    presetRow1.alignChildren = ["fill", "center"];
    presetRow1.spacing = 3;
    
    var subtleBtn = presetRow1.add("button", undefined, "Subtle");
    subtleBtn.preferredSize.width = 60;
    subtleBtn.preferredSize.height = 20;
    subtleBtn.onClick = function() {
        ampInput.text = "12";
        framesInput.text = "12";
    };
    
    var normalBtn = presetRow1.add("button", undefined, "Normal");
    normalBtn.preferredSize.width = 60;
    normalBtn.preferredSize.height = 20;
    normalBtn.onClick = function() {
        ampInput.text = "50";
        framesInput.text = "5";
    };
    
    var crazyBtn = presetRow1.add("button", undefined, "Crazy");
    crazyBtn.preferredSize.width = 60;
    crazyBtn.preferredSize.height = 20;
    crazyBtn.onClick = function() {
        ampInput.text = "20";
        framesInput.text = "3";
    };
    
    var preset1Btn = presetRow1.add("button", undefined, "7,9");
    preset1Btn.preferredSize.width = 60;
    preset1Btn.preferredSize.height = 20;
    preset1Btn.onClick = function() {
        ampInput.text = "7";
        framesInput.text = "9";
    };
    
    // Second row of presets
    var presetRow2 = presetGroup.add("group");
    presetRow2.orientation = "row";
    presetRow2.alignChildren = ["fill", "center"];
    presetRow2.spacing = 3;
    
    var preset2Btn = presetRow2.add("button", undefined, "24,24");
    preset2Btn.preferredSize.width = 60;
    preset2Btn.preferredSize.height = 20;
    preset2Btn.onClick = function() {
        ampInput.text = "24";
        framesInput.text = "24";
    };
    
    var preset3Btn = presetRow2.add("button", undefined, "35,24");
    preset3Btn.preferredSize.width = 60;
    preset3Btn.preferredSize.height = 20;
    preset3Btn.onClick = function() {
        ampInput.text = "35";
        framesInput.text = "24";
    };
    
    var preset4Btn = presetRow2.add("button", undefined, "70,90");
    preset4Btn.preferredSize.width = 60;
    preset4Btn.preferredSize.height = 20;
    preset4Btn.onClick = function() {
        ampInput.text = "70";
        framesInput.text = "90";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        try {
        var amp = ampInput.text;
        var frames = framesInput.text;
            var stopTimeStr = stopTimeInput.text;
        
        if (amp && frames && !isNaN(parseFloat(amp)) && !isNaN(parseFloat(frames))) {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    alert("Please select a composition.");
                    return;
                }

                var stopTimeComponents = null;
                if (stopTimeStr !== "") {
                    var parts = stopTimeStr.split(':');
                    if (parts.length === 4 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2])) && !isNaN(parseInt(parts[3]))) {
                        stopTimeComponents = {
                            h: parseInt(parts[0]),
                            m: parseInt(parts[1]),
                            s: parseInt(parts[2]),
                            f: parseInt(parts[3])
                        };
                    } else {
                        alert("Invalid time format. Please use H:MM:SS:FF or leave it empty.");
                        return;
                    }
                }

                var selectedLayers = comp.selectedLayers;
                
                if (selectedLayers.length > 1) {
                    // Multiple layers selected - randomize frames per cycle
                    for (var i = 0; i < selectedLayers.length; i++) {
                        var randomFrames = Math.floor(Math.random() * (35 - 12 + 1)) + 12; // Random value between 12-35
                        var expression;
                        if (stopTimeComponents) {
                            var stopTimeCalculation = "(" + stopTimeComponents.h + " * 3600) + (" + stopTimeComponents.m + " * 60) + " + stopTimeComponents.s + " + (" + stopTimeComponents.f + " * thisComp.frameDuration);";
                            expression = "amp = " + amp + ";\n" +
                                         "framesPerCycle = " + randomFrames + ";\n" +
                                         "stopTime = " + stopTimeCalculation + "\n" +
                                         "t = time;\n" +
                                         "if (time >= stopTime) {\n" +
                                         "  t = stopTime;\n" +
                                         "}\n" +
                                         "freq = 1 / (framesPerCycle * thisComp.frameDuration);\n" +
                                         "x_movement = Math.sin(t * freq * 2 * Math.PI) * amp;\n" +
                                         "value + [x_movement, 0];";
                        } else {
                            expression = "amp = " + amp + ";\n" +
                                         "framesPerCycle = " + randomFrames + ";\n" +
                                         "fps = thisComp.frameDuration;\n" +
                                         "t = time / (framesPerCycle * fps);\n" +
                                         "value + [Math.sin(t * 2 * Math.PI) * amp, 0];";
                        }
                        if (selectedLayers[i].transform && selectedLayers[i].transform.position) {
                            selectedLayers[i].transform.position.expression = expression;
                        }
                    }
                } else {
                    if (selectedLayers.length === 0) {
                        alert("Please select at least one layer.");
                        return;
                    }
                    // Single layer - use normal settings
                    var expression;
                    if (stopTimeComponents) {
                        var stopTimeCalculation = "(" + stopTimeComponents.h + " * 3600) + (" + stopTimeComponents.m + " * 60) + " + stopTimeComponents.s + " + (" + stopTimeComponents.f + " * thisComp.frameDuration);";
                        expression = "amp = " + amp + ";\n" +
                                     "framesPerCycle = " + frames + ";\n" +
                                     "stopTime = " + stopTimeCalculation + "\n" +
                                     "t = time;\n" +
                                     "if (time >= stopTime) {\n" +
                                     "  t = stopTime;\n" +
                                     "}\n" +
                                     "freq = 1 / (framesPerCycle * thisComp.frameDuration);\n" +
                                     "x_movement = Math.sin(t * freq * 2 * Math.PI) * amp;\n" +
                                     "value + [x_movement, 0];";
                    } else {
                        expression = "amp = " + amp + ";\n" +
                           "framesPerCycle = " + frames + ";\n" +
                           "fps = thisComp.frameDuration;\n" +
                           "t = time / (framesPerCycle * fps);\n" +
                           "value + [Math.sin(t * 2 * Math.PI) * amp, 0];";
                    }
            handleExpressionClick("Left Right", expression);
                }
            dialog.close();
        } else {
                alert("Please enter valid numbers for Amplitude and Frames.");
            }
        } catch(e) {
            alert("An error occurred in the script.\n\nError: " + e.toString() + "\nLine: " + e.line);
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show water float dialog
function showWaterFloatDialog() {
    var dialog = new Window("dialog", "Water Float Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Frequency setting
    var freqGroup = dialog.add("group");
    freqGroup.orientation = "row";
    freqGroup.alignChildren = ["fill", "center"];
    
    freqGroup.add("statictext", undefined, "Frequency (slower < 1 < faster):");
    var freqInput = freqGroup.add("edittext", undefined, "1");
    freqInput.preferredSize.width = 80;
    
    // Amplitude setting
    var ampGroup = dialog.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["fill", "center"];
    
    ampGroup.add("statictext", undefined, "Amplitude (movement range):");
    var ampInput = ampGroup.add("edittext", undefined, "50");
    ampInput.preferredSize.width = 80;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var gentleBtn = presetGroup.add("button", undefined, "Gentle");
    gentleBtn.onClick = function() {
        freqInput.text = "0.5";
        ampInput.text = "30";
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        freqInput.text = "1";
        ampInput.text = "50";
    };
    
    var roughBtn = presetGroup.add("button", undefined, "Rough");
    roughBtn.onClick = function() {
        freqInput.text = "2";
        ampInput.text = "70";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var freq = freqInput.text;
        var amp = ampInput.text;
        
        if (freq && amp && !isNaN(parseFloat(freq)) && !isNaN(parseFloat(amp))) {
            var expression = "wiggle(" + freq + "," + amp + ")";
            handleExpressionClick("Water Float", expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show glitter dialog
function showGlitterDialog() {
    var dialog = new Window("dialog", "Glitter Animation Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Offset setting
    var offsetGroup = dialog.add("group");
    offsetGroup.orientation = "row";
    offsetGroup.alignChildren = ["fill", "center"];
    
    offsetGroup.add("statictext", undefined, "Start Delay (seconds):");
    var offsetInput = offsetGroup.add("edittext", undefined, "0.5");
    offsetInput.preferredSize.width = 80;
    
    // Frames per toggle setting
    var framesGroup = dialog.add("group");
    framesGroup.orientation = "row";
    framesGroup.alignChildren = ["fill", "center"];
    
    framesGroup.add("statictext", undefined, "Frames per Toggle:");
    var framesInput = framesGroup.add("edittext", undefined, "12");
    framesInput.preferredSize.width = 80;
    
    // Value range setting
    var rangeGroup = dialog.add("group");
    rangeGroup.orientation = "row";
    rangeGroup.alignChildren = ["fill", "center"];
    
    rangeGroup.add("statictext", undefined, "Toggle Values (min,max):");
    var minInput = rangeGroup.add("edittext", undefined, "0");
    minInput.preferredSize.width = 40;
    rangeGroup.add("statictext", undefined, "to");
    var maxInput = rangeGroup.add("edittext", undefined, "100");
    maxInput.preferredSize.width = 40;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var fastBtn = presetGroup.add("button", undefined, "Fast");
    fastBtn.onClick = function() {
        offsetInput.text = "0";
        framesInput.text = "6";
        minInput.text = "0";
        maxInput.text = "100";
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        offsetInput.text = "0.5";
        framesInput.text = "12";
        minInput.text = "0";
        maxInput.text = "100";
    };
    
    var slowBtn = presetGroup.add("button", undefined, "Slow");
    slowBtn.onClick = function() {
        offsetInput.text = "1";
        framesInput.text = "24";
        minInput.text = "0";
        maxInput.text = "100";
    };
    
    var subtleBtn = presetGroup.add("button", undefined, "Subtle");
    subtleBtn.onClick = function() {
        offsetInput.text = "0.5";
        framesInput.text = "12";
        minInput.text = "50";
        maxInput.text = "100";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var offset = offsetInput.text;
        var frames = framesInput.text;
        var minVal = minInput.text;
        var maxVal = maxInput.text;
        
        if (offset && frames && minVal && maxVal && 
            !isNaN(parseFloat(offset)) && !isNaN(parseFloat(frames)) &&
            !isNaN(parseFloat(minVal)) && !isNaN(parseFloat(maxVal))) {
            var expression = "offset = " + offset + ";\n" +
                           "framesPerToggle = " + frames + ";\n" +
                           "flicker = Math.floor(timeToFrames(time - offset)) % (framesPerToggle * 2) < framesPerToggle ? " + maxVal + " : " + minVal + ";\n" +
                           "flicker";
            handleExpressionClick("Glitter", expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show fish animation dialog
function showFishDialog() {
    var dialog = new Window("dialog", "Fish-like Animation Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Position Settings Group
    var posGroup = dialog.add("panel", undefined, "Position Settings");
    posGroup.orientation = "column";
    posGroup.alignChildren = ["fill", "top"];
    posGroup.spacing = 5;
    posGroup.margins = 10;
    
    // Direction radio buttons
    var dirGroup = posGroup.add("group");
    dirGroup.orientation = "row";
    dirGroup.alignChildren = ["left", "center"];
    dirGroup.add("statictext", undefined, "Swim Direction:");
    
    var leftBtn = dirGroup.add("button", undefined, "<");
    leftBtn.preferredSize.width = 30;
    leftBtn.preferredSize.height = 30;
    var rightBtn = dirGroup.add("button", undefined, ">");
    rightBtn.preferredSize.width = 30;
    rightBtn.preferredSize.height = 30;
    
    // Default selection
    var selectedDirection = 1; // 1 for right, -1 for left
    rightBtn.fillBrush = rightBtn.graphics.newBrush(rightBtn.graphics.BrushType.SOLID_COLOR, [0.3, 0.3, 0.3, 1]);
    
    leftBtn.onClick = function() {
        selectedDirection = -1; // LEFT direction (negative)
        leftBtn.fillBrush = leftBtn.graphics.newBrush(leftBtn.graphics.BrushType.SOLID_COLOR, [0.3, 0.3, 0.3, 1]);
        rightBtn.fillBrush = rightBtn.graphics.newBrush(rightBtn.graphics.BrushType.SOLID_COLOR, [0.1, 0.1, 0.1, 1]);
        updatePreview();
    };
    
    rightBtn.onClick = function() {
        selectedDirection = 1; // RIGHT direction (positive)
        rightBtn.fillBrush = rightBtn.graphics.newBrush(rightBtn.graphics.BrushType.SOLID_COLOR, [0.3, 0.3, 0.3, 1]);
        leftBtn.fillBrush = leftBtn.graphics.newBrush(leftBtn.graphics.BrushType.SOLID_COLOR, [0.1, 0.1, 0.1, 1]);
        updatePreview();
    };
    
    // Forward speed
    var speedGroup = posGroup.add("group");
    speedGroup.orientation = "row";
    speedGroup.alignChildren = ["fill", "center"];
    speedGroup.add("statictext", undefined, "Swim Speed (px/sec):");
    var speedInput = speedGroup.add("edittext", undefined, "150");
    speedInput.preferredSize.width = 60;
    
    // Tail wiggle frequency
    var freqGroup = posGroup.add("group");
    freqGroup.orientation = "row";
    freqGroup.alignChildren = ["fill", "center"];
    freqGroup.add("statictext", undefined, "Tail Wiggle Frequency:");
    var freqInput = freqGroup.add("edittext", undefined, "1");
    freqInput.preferredSize.width = 60;
    
    // Tail wiggle amplitude
    var ampGroup = posGroup.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["fill", "center"];
    ampGroup.add("statictext", undefined, "Tail Wiggle Range (px):");
    var ampInput = ampGroup.add("edittext", undefined, "5");
    ampInput.preferredSize.width = 60;
    
    // Rotation Settings Group
    var rotGroup = dialog.add("panel", undefined, "Rotation Settings");
    rotGroup.orientation = "column";
    rotGroup.alignChildren = ["fill", "top"];
    rotGroup.spacing = 5;
    rotGroup.margins = 10;
    
    // Rotation frequency
    var rotFreqGroup = rotGroup.add("group");
    rotFreqGroup.orientation = "row";
    rotFreqGroup.alignChildren = ["fill", "center"];
    rotFreqGroup.add("statictext", undefined, "Body Sway Frequency:");
    var rotFreqInput = rotFreqGroup.add("edittext", undefined, "0.5");
    rotFreqInput.preferredSize.width = 60;
    
    // Rotation amplitude
    var rotAmpGroup = rotGroup.add("group");
    rotAmpGroup.orientation = "row";
    rotAmpGroup.alignChildren = ["fill", "center"];
    rotAmpGroup.add("statictext", undefined, "Body Sway Angle (°):");
    var rotAmpInput = rotAmpGroup.add("edittext", undefined, "5");
    rotAmpInput.preferredSize.width = 60;
    
    // Presets
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var slowFishBtn = presetGroup.add("button", undefined, "Slow Fish");
    slowFishBtn.onClick = function() {
        speedInput.text = "100";
        freqInput.text = "0.8";
        ampInput.text = "3";
        rotFreqInput.text = "0.4";
        rotAmpInput.text = "3";
    };
    
    var normalFishBtn = presetGroup.add("button", undefined, "Normal");
    normalFishBtn.onClick = function() {
        speedInput.text = "150";
        freqInput.text = "1";
        ampInput.text = "5";
        rotFreqInput.text = "0.5";
        rotAmpInput.text = "5";
    };
    
    var fastFishBtn = presetGroup.add("button", undefined, "Fast Fish");
    fastFishBtn.onClick = function() {
        speedInput.text = "250";
        freqInput.text = "1.5";
        ampInput.text = "8";
        rotFreqInput.text = "0.75";
        rotAmpInput.text = "8";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var speed = parseFloat(speedInput.text);
        var freq = parseFloat(freqInput.text);
        var amp = parseFloat(ampInput.text);
        var rotFreq = parseFloat(rotFreqInput.text);
        var rotAmp = parseFloat(rotAmpInput.text);
        
        // Apply direction
        speed = selectedDirection === 1 ? Math.abs(speed) : -Math.abs(speed);
        
        if (!isNaN(speed) && !isNaN(freq) && !isNaN(amp) && !isNaN(rotFreq) && !isNaN(rotAmp)) {
            // Create position expression
            var posExpression = "speed = " + speed + "; // " + (selectedDirection === 1 ? "Swimming right" : "Swimming left") + "\n" +
                              "wiggleFreq = " + freq + ";\n" +
                              "wiggleAmp = " + amp + ";\n\n" +
                              "x = time * speed;\n" +
                              "y = Math.sin(time * wiggleFreq * 2 * Math.PI) * wiggleAmp;\n\n" +
                              "value + [x, y]";
            
            // Create rotation expression
            var rotExpression = "wiggleFreq = " + rotFreq + ";\n" +
                              "rotationAmp = " + rotAmp + ";\n" +
                              "Math.sin(time * wiggleFreq * 2 * Math.PI) * rotationAmp" +
                              (selectedDirection === 1 ? "" : " * -1") + " // Invert rotation for left swimming";
            
            // Apply expressions
            applyFishAnimation(posExpression, rotExpression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Apply fish animation to position and rotation
function applyFishAnimation(posExpression, rotExpression) {
    try {
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }
        
        var comp = app.project.activeItem;
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length === 0) {
            updateStatus("No layer selected");
            return;
        }
        
        app.beginUndoGroup("Apply Fish Animation");
        
        var successCount = 0;
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (layer.transform.position && layer.transform.rotation) {
                if (applyExpression(layer.transform.position, posExpression)) {
                    successCount++;
                }
                applyExpression(layer.transform.rotation, rotExpression);
            }
        }
        
        app.endUndoGroup();
        
        if (successCount > 0) {
            updateStatus("Applied fish animation to " + successCount + " layer(s)");
        } else {
            updateStatus("Failed to apply fish animation");
        }
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Handle expression button clicks
function handleExpressionClick(name, expression) {
    try {
        // Check for active composition
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            updateStatus("No active composition");
            showExpressionDialog(expression);
            return;
        }
        
        var comp = app.project.activeItem;
        var selectedProps = [];
        
        // Special handling for specific effects
        if (name === "Glitter" || name === "Thunder Flicker" || name === "Horror Light") {
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                updateStatus("No layer selected");
                showExpressionDialog(expression);
                return;
            }
            
            // Get opacity property from each selected layer
            for (var i = 0; i < selectedLayers.length; i++) {
                if (selectedLayers[i].transform.opacity) {
                    selectedProps.push(selectedLayers[i].transform.opacity);
                }
            }
        } else if (name === "Time Rotation") {
            // Always target rotation property of selected layers
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                updateStatus("No layer selected");
                showExpressionDialog(expression);
                return;
            }
            for (var i = 0; i < selectedLayers.length; i++) {
                if (selectedLayers[i].transform.rotation) {
                    selectedProps.push(selectedLayers[i].transform.rotation);
                }
            }
        } else if (name === "Rotation PingPong") {
            // Always target rotation property of selected layers
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                updateStatus("No layer selected");
                showExpressionDialog(expression);
                return;
            }
            for (var i = 0; i < selectedLayers.length; i++) {
                if (selectedLayers[i].transform.rotation) {
                    selectedProps.push(selectedLayers[i].transform.rotation);
                }
            }
        } else if (name === "Scale Pulse") {
            // Always target scale property of selected layers
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                updateStatus("No layer selected");
                showExpressionDialog(expression);
                return;
            }
            for (var i = 0; i < selectedLayers.length; i++) {
                if (selectedLayers[i].transform.scale) {
                    selectedProps.push(selectedLayers[i].transform.scale);
                }
            }
        } else {
            // Get all selected properties for other effects
            selectedProps = getSelectedProperties();
            
            // If no property is selected and it's not a loop expression, default to position
            if (selectedProps.length === 0 && 
                name !== "Loop Cycle" && 
                name !== "Loop Continue" && 
                name !== "Loop PingPong") {
                var selectedLayers = comp.selectedLayers;
                for (var i = 0; i < selectedLayers.length; i++) {
                    if (selectedLayers[i].transform.position) {
                        selectedProps.push(selectedLayers[i].transform.position);
                    }
                }
            }
        }
        
        if (selectedProps.length === 0) {
            updateStatus("No property selected");
            showExpressionDialog(expression);
            return;
        }
        
        // Apply expression
        app.beginUndoGroup("Apply " + name);
        
        var successCount = 0;
        for (var i = 0; i < selectedProps.length; i++) {
            if (applyExpression(selectedProps[i], expression)) {
                successCount++;
            }
        }
        
        app.endUndoGroup();
        
        if (successCount > 0) {
            updateStatus("Applied to " + successCount + " property(s)");
        } else {
            updateStatus("Failed to apply");
            showExpressionDialog(expression);
        }
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Get selected properties
function getSelectedProperties() {
    var props = [];
    var comp = app.project.activeItem;
    
    if (!comp || !(comp instanceof CompItem)) {
        return props;
    }
    
    var selectedLayers = comp.selectedLayers;
    
    for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        // Check transform properties
        var transformProps = [
            layer.transform.position,
            layer.transform.rotation,
            layer.transform.scale,
            layer.transform.opacity,
            layer.transform.anchorPoint
        ];
        
        for (var j = 0; j < transformProps.length; j++) {
            if (transformProps[j] && transformProps[j].selected) {
                props.push(transformProps[j]);
            }
        }
        
        // Check text properties
        if (layer instanceof TextLayer && layer.text && layer.text.sourceText) {
            if (layer.text.sourceText.selected) {
                props.push(layer.text.sourceText);
            }
        }
        
        // Check for other selected properties (effects, etc.)
        if (layer.selectedProperties) {
            var selectedProps = layer.selectedProperties;
            for (var k = 0; k < selectedProps.length; k++) {
                if (selectedProps[k].canSetExpression) {
                    props.push(selectedProps[k]);
                }
            }
        }
    }
    
    return props;
}

// Apply expression to property
function applyExpression(property, expression) {
    try {
        if (property && property.canSetExpression) {
            property.expression = expression;
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Show expression in non-modal dialog
function showExpressionDialog(expression) {
    var dialog = new Window("window", "Expression Code");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    dialog.preferredSize.width = 350;
    
    dialog.add("statictext", undefined, "Expression code:");
    
    var editText = dialog.add("edittext", undefined, expression, {multiline: true, readonly: true});
    editText.preferredSize.height = 80;
    editText.active = true;
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var selectBtn = buttonGroup.add("button", undefined, "Select All");
    selectBtn.onClick = function() {
        editText.active = true;
        editText.textselection = editText.text;
    };
    
    var closeBtn = buttonGroup.add("button", undefined, "Close");
    closeBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show Advanced Tools popup window
function showAdvancedToolsWindow() {
    var dialog = new Window("dialog", "More Tools");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 1; // Minimal spacing
    dialog.margins = 4; // Minimal margins
    
    // Title
    var titleGroup = dialog.add("group");
    titleGroup.orientation = "row";
    titleGroup.alignChildren = ["center", "center"];
    titleGroup.spacing = 0;
    titleGroup.margins = 0;
    var title = titleGroup.add("statictext", undefined, "More Tools");
    title.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10); // Smaller font
    
    // Buttons container with 3 columns
    var buttonsContainer = dialog.add("group");
    buttonsContainer.orientation = "row";
    buttonsContainer.alignChildren = ["fill", "top"];
    buttonsContainer.spacing = 2; // Minimal spacing between columns
    buttonsContainer.margins = 0;
    
    // Column 1
    var col1 = buttonsContainer.add("group");
    col1.orientation = "column";
    col1.alignChildren = ["fill", "top"];
    col1.spacing = 1; // Minimal spacing
    col1.margins = 0;
    col1.preferredSize.width = 130; // Compact width
    
    var libraryBrowserBtn = col1.add("button", undefined, "Browse Lib");
    libraryBrowserBtn.preferredSize.height = 20; // Reduced from 24
    libraryBrowserBtn.helpTip = "Browse and load compositions from library";
    libraryBrowserBtn.onClick = function() {
        dialog.close();
        showLibraryBrowserDialog();
    };
    
    var maskToCropBtn = col1.add("button", undefined, "Mask to Crop");
    maskToCropBtn.preferredSize.height = 20;
    maskToCropBtn.helpTip = "Trim selected layers to work area (replaces Ctrl+Shift+X)";
    maskToCropBtn.onClick = function() {
        dialog.close();
        maskToCropLayer();
    };
    
    var layerNavBtn = col1.add("button", undefined, "Layer Nav");
    layerNavBtn.preferredSize.height = 20;
    layerNavBtn.helpTip = "Open layer navigation window to jump between layers";
    layerNavBtn.onClick = function() {
        dialog.close();
        showLayerNavigationWindow();
    };
    
    var walkRunBtn = col1.add("button", undefined, "Walk/Run Arc");
    walkRunBtn.preferredSize.height = 20;
    walkRunBtn.helpTip = "Add walking/running arc movement to selected layers";
    walkRunBtn.onClick = function() {
        dialog.close();
        showWalkRunDialog();
    };
    
    // Column 2
    var col2 = buttonsContainer.add("group");
    col2.orientation = "column";
    col2.alignChildren = ["fill", "top"];
    col2.spacing = 1; // Minimal spacing
    col2.margins = 0;
    col2.preferredSize.width = 130; // Compact width
    
    var addToLibraryBtn = col2.add("button", undefined, "Add to Lib");
    addToLibraryBtn.preferredSize.height = 20;
    addToLibraryBtn.helpTip = "Save selected composition or precomposition to library";
    addToLibraryBtn.onClick = function() {
        dialog.close();
        showAddToLibraryDialog();
    };
    
    var anchorGridBtn = col2.add("button", undefined, "3x3 Anchor");
    anchorGridBtn.preferredSize.height = 20;
    anchorGridBtn.helpTip = "Move anchor point using 3x3 grid controller";
    anchorGridBtn.onClick = function() {
        dialog.close();
        show3x3AnchorDialog();
    };
    
    var createNullBtn = col2.add("button", undefined, "Create Null");
    createNullBtn.preferredSize.height = 20;
    createNullBtn.helpTip = "Creates a null object for the selected layer";
    createNullBtn.onClick = function() {
        dialog.close();
        createNullObject();
    };
    
    var loopWiggleBtn = col2.add("button", undefined, "Loop Wiggle");
    loopWiggleBtn.preferredSize.height = 20;
    loopWiggleBtn.helpTip = EXPRESSIONS["Loop Wiggle"];
    loopWiggleBtn.onClick = function() {
        dialog.close();
        handleExpressionClick("Loop Wiggle", EXPRESSIONS["Loop Wiggle"]);
    };
    
    // Column 3
    var col3 = buttonsContainer.add("group");
    col3.orientation = "column";
    col3.alignChildren = ["fill", "top"];
    col3.spacing = 1; // Minimal spacing
    col3.margins = 0;
    col3.preferredSize.width = 130; // Compact width
    
    var smartPrecompBtn = col3.add("button", undefined, "Smart Precomp");
    smartPrecompBtn.preferredSize.height = 20;
    smartPrecompBtn.helpTip = "Create precomp from selected layers while retaining size, scale and position";
    smartPrecompBtn.onClick = function() {
        dialog.close();
        createSmartPrecomp();
    };
    
    var syncAudioBtn = col3.add("button", undefined, "Sync Audio");
    syncAudioBtn.preferredSize.height = 20;
    syncAudioBtn.helpTip = "Apply time remapping expression to sync audio with main_comp";
    syncAudioBtn.onClick = function() {
        dialog.close();
        applyTimeRemapExpression();
    };
    
    var fishLikeBtn = col3.add("button", undefined, "Fish-like");
    fishLikeBtn.preferredSize.height = 20;
    fishLikeBtn.helpTip = "Swimming fish animation";
    fishLikeBtn.onClick = function() {
        dialog.close();
        showFishDialog();
    };
    
    // Calculate exact size: 3 columns × 130px + 2 gaps × 2px + 2 margins × 4px = 390 + 4 + 8 = 402px width
    // Height: title (~18px) + spacing (1px) + 4 buttons × 20px + 3 gaps × 1px + 2 margins × 4px = 18 + 1 + 80 + 3 + 8 = 110px
    dialog.preferredSize = [402, 110];
    
    dialog.center();
    dialog.show();
}

// Show batch scale dialog with presets
function showBatchScaleDialog() {
    var dialog = new Window("dialog", "Batch Scale Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Add description
    var desc = dialog.add("statictext", undefined, "Select scale preset for selected layers:");
    desc.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);
    
    // Preset buttons group
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    presetGroup.spacing = 10;
    
    var preset34Btn = presetGroup.add("button", undefined, "34%");
    preset34Btn.preferredSize.width = 60;
    preset34Btn.onClick = function() {
        applyBatchScale(34);
        dialog.close();
    };
    
    var preset50Btn = presetGroup.add("button", undefined, "50%");
    preset50Btn.preferredSize.width = 60;
    preset50Btn.onClick = function() {
        applyBatchScale(50);
        dialog.close();
    };
    
    var preset100Btn = presetGroup.add("button", undefined, "100%");
    preset100Btn.preferredSize.width = 60;
    preset100Btn.onClick = function() {
        applyBatchScale(100);
        dialog.close();
    };
    
    // Custom scale input
    var customGroup = dialog.add("group");
    customGroup.orientation = "row";
    customGroup.alignChildren = ["left", "center"];
    customGroup.spacing = 5;
    
    customGroup.add("statictext", undefined, "Custom:");
    var customInput = customGroup.add("edittext", undefined, "100");
    customInput.preferredSize.width = 60;
    customGroup.add("statictext", undefined, "%");
    
    var customBtn = customGroup.add("button", undefined, "Apply");
    customBtn.onClick = function() {
        var customScale = parseFloat(customInput.text);
        if (!isNaN(customScale)) {
            applyBatchScale(customScale);
            dialog.close();
        } else {
            alert("Please enter a valid number");
        }
    };
    
    // Cancel button
    var cancelBtn = dialog.add("button", undefined, "Cancel");
    cancelBtn.alignment = "center";
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Apply batch scale to selected layers
function applyBatchScale(scalePercentage) {
    try {
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            alert("No active composition found");
            return;
        }
        
        var comp = app.project.activeItem;
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length === 0) {
            alert("No layers selected");
            return;
        }
        
        app.beginUndoGroup("Batch Scale " + scalePercentage + "%");
        
        var successCount = 0;
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (layer.transform.scale) {
                layer.transform.scale.setValue([scalePercentage, scalePercentage]);
                successCount++;
            }
        }
        
        app.endUndoGroup();
        
        if (successCount > 0) {
            updateStatus("Applied " + scalePercentage + "% scale to " + successCount + " layer(s)");
        } else {
            alert("No layers could be scaled");
        }
        
    } catch (error) {
        alert("Error applying batch scale: " + error.message);
    }
}

// Create smart precomposition that retains layer size, scale and position
function createSmartPrecomp() {
    try {
        var comp = app.project.activeItem;
        
        if (!comp || !(comp instanceof CompItem)) {
            alert("No active composition found");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer");
            return;
        }
        
        app.beginUndoGroup("Smart Precomp");
        
        // Calculate bounding box of selected layers
        var bounds = calculateLayerBounds(selectedLayers);
        if (!bounds) {
            alert("Could not calculate layer bounds");
            app.endUndoGroup();
            return;
        }
        
        // Create new composition with calculated dimensions + 300px expansion
        var precompName = prompt("Enter precomp name:", "Smart Precomp");
        if (!precompName) {
            app.endUndoGroup();
            return;
        }
        
        // Add 300px expansion while maintaining aspect ratio
        var expansion = 300;
        var originalWidth = bounds.width;
        var originalHeight = bounds.height;
        var originalAspectRatio = originalWidth / originalHeight;
        
        // Calculate expanded dimensions
        var expandedWidth = originalWidth + expansion;
        var expandedHeight = originalHeight + expansion;
        
        // Adjust to maintain aspect ratio by using the larger expansion
        var newAspectRatio = expandedWidth / expandedHeight;
        if (newAspectRatio > originalAspectRatio) {
            // Width expanded more, adjust height to match aspect ratio
            expandedHeight = expandedWidth / originalAspectRatio;
        } else {
            // Height expanded more, adjust width to match aspect ratio
            expandedWidth = expandedHeight * originalAspectRatio;
        }
        
        var precomp = app.project.items.addComp(
            precompName,
            Math.ceil(expandedWidth),
            Math.ceil(expandedHeight),
            1, // Square pixels
            comp.duration,
            comp.frameRate
        );
        
        // Store original layer info before moving
        var layerInfo = [];
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            layerInfo.push({
                layer: layer,
                originalPosition: layer.transform.position.value,
                originalScale: layer.transform.scale.value,
                originalRotation: layer.transform.rotation.value,
                originalOpacity: layer.transform.opacity.value,
                originalAnchorPoint: layer.transform.anchorPoint.value,
                originalInPoint: layer.inPoint,
                originalOutPoint: layer.outPoint,
                index: layer.index
            });
        }
        
        // Move layers to precomp (in reverse order to maintain stacking)
        for (var i = layerInfo.length - 1; i >= 0; i--) {
            var info = layerInfo[i];
            var layer = info.layer;
            
            // Move layer to precomp
            layer.copyToComp(precomp);
            
            // Get the copied layer (it will be at index 1 since we're copying in reverse)
            var copiedLayer = precomp.layer(1);
            
            // Adjust position relative to the bounding box and center in expanded precomp
            var offsetX = (expandedWidth - originalWidth) / 2;
            var offsetY = (expandedHeight - originalHeight) / 2;
            
            var newPos = [
                info.originalPosition[0] - bounds.left + offsetX,
                info.originalPosition[1] - bounds.top + offsetY
            ];
            copiedLayer.transform.position.setValue(newPos);
            
            // Remove original layer from main comp
            layer.remove();
        }
        
        // Add precomp layer to original composition
        var precompLayer = comp.layers.add(precomp);
        
        // Position precomp layer to match original appearance
        precompLayer.transform.position.setValue([
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2
        ]);
        
        // Set anchor point to center of expanded precomp
        precompLayer.transform.anchorPoint.setValue([
            expandedWidth / 2,
            expandedHeight / 2
        ]);
        
        // Position at the average index of the original layers
        var indexSum = 0;
        for (var j = 0; j < layerInfo.length; j++) {
            indexSum += layerInfo[j].index;
        }
        var averageIndex = Math.floor(indexSum / layerInfo.length);
        
        if (averageIndex > 0 && averageIndex <= comp.numLayers) {
            precompLayer.moveBefore(comp.layer(averageIndex));
        }
        
        // Select the new precomp layer
        precompLayer.selected = true;
        
        app.endUndoGroup();
        
        updateStatus("Smart precomp '" + precompName + "' created with " + layerInfo.length + " layers");
        
    } catch (error) {
        app.endUndoGroup();
        alert("Error creating smart precomp: " + error.message);
    }
}

// Calculate bounding box of selected layers
function calculateLayerBounds(layers) {
    try {
        var minLeft = Infinity;
        var minTop = Infinity;
        var maxRight = -Infinity;
        var maxBottom = -Infinity;
        
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            
            // Get layer bounds - this is a simplified calculation
            // For more accurate bounds, we'd need to account for effects, masks, etc.
            var layerWidth = layer.width || layer.source.width || 100;
            var layerHeight = layer.height || layer.source.height || 100;
            
            var pos = layer.transform.position.value;
            var anchor = layer.transform.anchorPoint.value;
            var scale = layer.transform.scale.value;
            
            // Calculate scaled dimensions
            var scaledWidth = layerWidth * (scale[0] / 100);
            var scaledHeight = layerHeight * (scale[1] / 100);
            
            // Calculate actual position based on anchor point
            var actualLeft = pos[0] - (anchor[0] * scale[0] / 100);
            var actualTop = pos[1] - (anchor[1] * scale[1] / 100);
            var actualRight = actualLeft + scaledWidth;
            var actualBottom = actualTop + scaledHeight;
            
            minLeft = Math.min(minLeft, actualLeft);
            minTop = Math.min(minTop, actualTop);
            maxRight = Math.max(maxRight, actualRight);
            maxBottom = Math.max(maxBottom, actualBottom);
        }
        
        if (minLeft === Infinity) {
            return null;
        }
        
        return {
            left: minLeft,
            top: minTop,
            right: maxRight,
            bottom: maxBottom,
            width: maxRight - minLeft,
            height: maxBottom - minTop
        };
        
    } catch (error) {
        return null;
    }
}

// Show 3x3 anchor point controller dialog
function show3x3AnchorDialog() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("No active composition found");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer");
            return;
        }
        
        var dialog = new Window("palette", "3x3 Anchor Point Controller");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 16;
        
        // Title
        var titleText = dialog.add("statictext", undefined, "Click to set anchor point position:");
        titleText.alignment = "center";
        
        // 3x3 Grid
        var gridGroup = dialog.add("group");
        gridGroup.orientation = "column";
        gridGroup.alignChildren = ["fill", "top"];
        gridGroup.spacing = 2;
        
        // Row 1 (Top)
        var row1 = gridGroup.add("group");
        row1.orientation = "row";
        row1.alignChildren = ["fill", "center"];
        row1.spacing = 2;
        
        var tlBtn = row1.add("button", undefined, "↖");
        tlBtn.preferredSize = [40, 30];
        tlBtn.helpTip = "Top Left";
        tlBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("TL", comp.selectedLayers);
            }
        };
        
        var tcBtn = row1.add("button", undefined, "↑");
        tcBtn.preferredSize = [40, 30];
        tcBtn.helpTip = "Top Center";
        tcBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("TC", comp.selectedLayers);
            }
        };
        
        var trBtn = row1.add("button", undefined, "↗");
        trBtn.preferredSize = [40, 30];
        trBtn.helpTip = "Top Right";
        trBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("TR", comp.selectedLayers);
            }
        };
        
        // Row 2 (Middle)
        var row2 = gridGroup.add("group");
        row2.orientation = "row";
        row2.alignChildren = ["fill", "center"];
        row2.spacing = 2;
        
        var mlBtn = row2.add("button", undefined, "←");
        mlBtn.preferredSize = [40, 30];
        mlBtn.helpTip = "Middle Left";
        mlBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("ML", comp.selectedLayers);
            }
        };
        
        var mcBtn = row2.add("button", undefined, "●");
        mcBtn.preferredSize = [40, 30];
        mcBtn.helpTip = "Middle Center";
        mcBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("MC", comp.selectedLayers);
            }
        };
        
        var mrBtn = row2.add("button", undefined, "→");
        mrBtn.preferredSize = [40, 30];
        mrBtn.helpTip = "Middle Right";
        mrBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("MR", comp.selectedLayers);
            }
        };
        
        // Row 3 (Bottom)
        var row3 = gridGroup.add("group");
        row3.orientation = "row";
        row3.alignChildren = ["fill", "center"];
        row3.spacing = 2;
        
        var blBtn = row3.add("button", undefined, "↙");
        blBtn.preferredSize = [40, 30];
        blBtn.helpTip = "Bottom Left";
        blBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("BL", comp.selectedLayers);
            }
        };
        
        var bcBtn = row3.add("button", undefined, "↓");
        bcBtn.preferredSize = [40, 30];
        bcBtn.helpTip = "Bottom Center";
        bcBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("BC", comp.selectedLayers);
            }
        };
        
        var brBtn = row3.add("button", undefined, "↘");
        brBtn.preferredSize = [40, 30];
        brBtn.helpTip = "Bottom Right";
        brBtn.onClick = function() { 
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                setAnchorPoint("BR", comp.selectedLayers);
            }
        };
        
        // Separator
        dialog.add("panel");
        
        // Info text and refresh functionality
        var infoGroup = dialog.add("group");
        infoGroup.orientation = "row";
        infoGroup.alignChildren = ["fill", "center"];
        
        var infoText = infoGroup.add("statictext", undefined, "Selected layers: " + selectedLayers.length);
        infoText.alignment = ["fill", "center"];
        
        var refreshBtn = infoGroup.add("button", undefined, "↻");
        refreshBtn.preferredSize = [25, 20];
        refreshBtn.helpTip = "Refresh selected layers";
        refreshBtn.onClick = function() {
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                selectedLayers = comp.selectedLayers;
                infoText.text = "Selected layers: " + selectedLayers.length;
            }
        };
        
        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignChildren = ["fill", "center"];
        
        var closeBtn = buttonGroup.add("button", undefined, "Close");
        closeBtn.onClick = function() {
            dialog.close();
        };
        
        // Make window stay on top and non-modal
        dialog.show();
        
    } catch (error) {
        alert("Error opening 3x3 anchor dialog: " + error.message);
    }
}

// Set anchor point to specified position
function setAnchorPoint(position, layers) {
    try {
        app.beginUndoGroup("Set Anchor Point " + position);
        
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            
            // Get layer dimensions based on layer type
            var layerWidth, layerHeight;
            
            try {
                // Try different methods to get layer dimensions
                if (layer.source && layer.source.width && layer.source.height) {
                    // For footage layers, precomps, etc.
                    layerWidth = layer.source.width;
                    layerHeight = layer.source.height;
                } else if (layer.width && layer.height) {
                    // For solid layers
                    layerWidth = layer.width;
                    layerHeight = layer.height;
                } else {
                    // Fallback: use sourceRect (works for shape layers, text layers)
                    var sourceRect = layer.sourceRectAtTime(layer.containingComp.time, false);
                    layerWidth = sourceRect.width;
                    layerHeight = sourceRect.height;
                }
            } catch (e) {
                // Final fallback
                layerWidth = 100;
                layerHeight = 100;
            }
            
            var anchorX, anchorY;
            
            // Calculate anchor point based on position
            switch (position) {
                case "TL": // Top Left
                    anchorX = 0;
                    anchorY = 0;
                    break;
                case "TC": // Top Center
                    anchorX = layerWidth / 2;
                    anchorY = 0;
                    break;
                case "TR": // Top Right
                    anchorX = layerWidth;
                    anchorY = 0;
                    break;
                case "ML": // Middle Left
                    anchorX = 0;
                    anchorY = layerHeight / 2;
                    break;
                case "MC": // Middle Center
                    anchorX = layerWidth / 2;
                    anchorY = layerHeight / 2;
                    break;
                case "MR": // Middle Right
                    anchorX = layerWidth;
                    anchorY = layerHeight / 2;
                    break;
                case "BL": // Bottom Left
                    anchorX = 0;
                    anchorY = layerHeight;
                    break;
                case "BC": // Bottom Center
                    anchorX = layerWidth / 2;
                    anchorY = layerHeight;
                    break;
                case "BR": // Bottom Right
                    anchorX = layerWidth;
                    anchorY = layerHeight;
                    break;
                default:
                    anchorX = layerWidth / 2;
                    anchorY = layerHeight / 2;
            }
            
            // Get current position to maintain visual position
            var currentPos = layer.transform.position.value;
            var currentAnchor = layer.transform.anchorPoint.value;
            
            // Calculate offset
            var offsetX = anchorX - currentAnchor[0];
            var offsetY = anchorY - currentAnchor[1];
            
            // Set new anchor point
            layer.transform.anchorPoint.setValue([anchorX, anchorY]);
            
            // Adjust position to maintain visual location
            layer.transform.position.setValue([
                currentPos[0] + offsetX,
                currentPos[1] + offsetY
            ]);
        }
        
        app.endUndoGroup();
        
        var positionName = getPositionName(position);
        updateStatus("Anchor point set to " + positionName + " for " + layers.length + " layer(s)");
        
    } catch (error) {
        app.endUndoGroup();
        alert("Error setting anchor point: " + error.message);
    }
}

// Get readable position name
function getPositionName(position) {
    switch (position) {
        case "TL": return "Top Left";
        case "TC": return "Top Center";
        case "TR": return "Top Right";
        case "ML": return "Middle Left";
        case "MC": return "Middle Center";
        case "MR": return "Middle Right";
        case "BL": return "Bottom Left";
        case "BC": return "Bottom Center";
        case "BR": return "Bottom Right";
        default: return "Center";
    }
}

// Update status text
function updateStatus(message) {
    // This is a simplified version - in a real panel you'd store the panel reference
    // For now, just show an alert for major errors
    if (message.indexOf("Error") === 0) {
        alert(message);
    }
}

// Main execution
function main() {
    return createPanel(this);
}

// Check if running as dockable panel or standalone
if (typeof this === "object" && this instanceof Panel) {
    main();
} else {
    main();
}

// Add water distortion effect
function addWaterDistortion() {
    try {
        app.beginUndoGroup("Add Turbulent Displace with Settings");

        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                var effect = layer.Effects.addProperty("ADBE Turbulent Displace");

                if (effect) {
                    // Set Amount to 10
                    effect.property("Amount").setValue(10);

                    // Set Size to 100
                    effect.property("Size").setValue(100);

                    // Set Evolution expression: time * 100
                    effect.property("Evolution").expression = "time * 100";
                }
            }
            updateStatus("Added water distortion to " + comp.selectedLayers.length + " layer(s)");
        } else {
            alert("Please select at least one layer in a comp.");
            updateStatus("No layers selected");
        }

        app.endUndoGroup();
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Show water distortion settings dialog
function showWaterDistortionDialog() {
    var dialog = new Window("dialog", "Water Distortion Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Amount setting
    var amountGroup = dialog.add("group");
    amountGroup.orientation = "row";
    amountGroup.alignChildren = ["left", "center"];
    amountGroup.add("statictext", undefined, "Distortion Amount:");
    var amountInput = amountGroup.add("edittext", undefined, "10");
    amountInput.preferredSize.width = 60;
    
    // Size setting
    var sizeGroup = dialog.add("group");
    sizeGroup.orientation = "row";
    sizeGroup.alignChildren = ["left", "center"];
    sizeGroup.add("statictext", undefined, "Wave Size:");
    var sizeInput = sizeGroup.add("edittext", undefined, "100");
    sizeInput.preferredSize.width = 60;
    
    // Evolution Speed
    var speedGroup = dialog.add("group");
    speedGroup.orientation = "row";
    speedGroup.alignChildren = ["left", "center"];
    speedGroup.add("statictext", undefined, "Evolution Speed:");
    var speedInput = speedGroup.add("edittext", undefined, "100");
    speedInput.preferredSize.width = 60;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var subtleBtn = presetGroup.add("button", undefined, "Subtle");
    subtleBtn.onClick = function() {
        amountInput.text = "25";
        sizeInput.text = "150";
        speedInput.text = "250";
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        amountInput.text = "50";
        sizeInput.text = "150";
        speedInput.text = "360";
    };
    
    var strongBtn = presetGroup.add("button", undefined, "Strong");
    strongBtn.onClick = function() {
        amountInput.text = "25";
        sizeInput.text = "75";
        speedInput.text = "780";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var amount = parseFloat(amountInput.text);
        var size = parseFloat(sizeInput.text);
        var speed = parseFloat(speedInput.text);
        
        if (!isNaN(amount) && !isNaN(size) && !isNaN(speed)) {
            app.beginUndoGroup("Add Turbulent Displace with Settings");

            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
                for (var i = 0; i < comp.selectedLayers.length; i++) {
                    var layer = comp.selectedLayers[i];
                    var effect = layer.Effects.addProperty("ADBE Turbulent Displace");

                    if (effect) {
                        effect.property("Amount").setValue(amount);
                        effect.property("Size").setValue(size);
                        effect.property("Evolution").expression = "time * " + speed;
                    }
                }
                updateStatus("Added water distortion to " + comp.selectedLayers.length + " layer(s)");
                dialog.close();
            } else {
                alert("Please select at least one layer in a comp.");
                updateStatus("No layers selected");
            }

            app.endUndoGroup();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Add keyframes for current position and scale
function addCurrentKeyframes() {
    try {
        app.beginUndoGroup("Add Current Position, Scale & Rotation Keyframes");

        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
            var currentTime = comp.time;
            var addedCount = 0;

            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                
                // Add position keyframe
                if (layer.transform.position.canSetExpression) {
                    var currentPos = layer.transform.position.value;
                    layer.transform.position.setValueAtTime(currentTime, currentPos);
                    addedCount++;
                }
                
                // Add scale keyframe
                if (layer.transform.scale.canSetExpression) {
                    var currentScale = layer.transform.scale.value;
                    layer.transform.scale.setValueAtTime(currentTime, currentScale);
                    addedCount++;
                }
                
                // Add rotation keyframe
                if (layer.transform.rotation.canSetExpression) {
                    var currentRotation = layer.transform.rotation.value;
                    layer.transform.rotation.setValueAtTime(currentTime, currentRotation);
                    addedCount++;
                }
            }
            
            updateStatus("Added " + addedCount + " keyframe(s) at " + currentTime.toFixed(2) + "s");
        } else {
            alert("Please select at least one layer in a comp.");
            updateStatus("No layers selected");
        }

        app.endUndoGroup();
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Add bouncy keyframes (0 to 100 scale values with bounce easing)
function addBounceKeyframes() {
    try {
        app.beginUndoGroup("Add Bounce x2 Keyframes");

        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
            var currentTime = comp.time;
            var frameRate = comp.frameRate;
            var secondKeyframeTime = currentTime + (4 / frameRate); // 4 frames later
            var addedCount = 0;

            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                
                // Add scale keyframes with bounce (0% to 100%)
                if (layer.transform.scale.canSetExpression) {
                    // Create first keyframe at 0%
                    layer.transform.scale.setValueAtTime(currentTime, [0, 0]);
                    // Create second keyframe at 100%
                    layer.transform.scale.setValueAtTime(secondKeyframeTime, [100, 100]);
                    
                    // Apply bounce easing (0.68, -0.55, 0.27, 1.55)
                    // Convert to After Effects temporal ease values
                    try {
                        // For bounce effect: strong ease out from first keyframe, strong ease in to second keyframe
                        var strongEaseOut = new KeyframeEase(68, 83);  // Fast out from 0%
                        var bounceEaseIn = new KeyframeEase(27, 100);  // Slow in to 100% with overshoot
                        
                        var numKeys = layer.transform.scale.numKeys;
                        if (numKeys >= 2) {
                            // Apply to first keyframe (0% scale) - strong ease out
                            layer.transform.scale.setTemporalEaseAtKey(numKeys - 1, [strongEaseOut, strongEaseOut], [strongEaseOut, strongEaseOut]);
                            // Apply to second keyframe (100% scale) - bounce ease in  
                            layer.transform.scale.setTemporalEaseAtKey(numKeys, [bounceEaseIn, bounceEaseIn], [bounceEaseIn, bounceEaseIn]);
                        }
                    } catch (easeError) {
                        updateStatus("Applied keyframes (easing error: " + easeError.toString() + ")");
                    }
                    
                    addedCount += 2;
                }
            }
            
            updateStatus("Added " + addedCount + " bouncy scale keyframes (0→100) with custom easing - " + currentTime.toFixed(2) + "s to " + secondKeyframeTime.toFixed(2) + "s");
        } else {
            alert("Please select at least one layer in a comp.");
            updateStatus("No layers selected");
        }

        app.endUndoGroup();
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Show choppy flip dialog
function showChoppyFlipDialog() {
    var dialog = new Window("dialog", "Choppy Left-Right Flip Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Flip every setting
    var flipGroup = dialog.add("group");
    flipGroup.orientation = "row";
    flipGroup.alignChildren = ["fill", "center"];
    flipGroup.add("statictext", undefined, "Flip Every (frames):");
    var flipInput = flipGroup.add("edittext", undefined, "3");
    flipInput.preferredSize.width = 60;
    flipInput.helpTip = "Number of frames to hold before flipping";
    
    // Presets
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var fastBtn = presetGroup.add("button", undefined, "Fast (2f)");
    fastBtn.onClick = function() {
        flipInput.text = "2";
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal (3f)");
    normalBtn.onClick = function() {
        flipInput.text = "3";
    };
    
    var slowBtn = presetGroup.add("button", undefined, "Slow (5f)");
    slowBtn.onClick = function() {
        flipInput.text = "5";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var flipEvery = parseInt(flipInput.text);
        
        if (!isNaN(flipEvery) && flipEvery > 0) {
            var expression = "// Choppy left-right flip\n" +
                           "flipEvery = " + flipEvery + "; // frames to hold before flipping\n\n" +
                           "fd = thisComp.frameDuration;\n" +
                           "frame = Math.floor((time - inPoint) / fd);\n\n" +
                           "if (Math.floor(frame / flipEvery) % 2 == 0){\n" +
                           "    [-100, 100]; // normal\n" +
                           "} else {\n" +
                           "    [100, 100];  // mirrored\n" +
                           "}";
            
            // Apply the expression
            applyChoppyFlip(expression);
            dialog.close();
        } else {
            alert("Please enter a valid positive number for flip frames");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Apply choppy flip expression
function applyChoppyFlip(expression) {
    try {
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            updateStatus("No active composition");
            showExpressionDialog(expression);
            return;
        }
        
        var comp = app.project.activeItem;
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length === 0) {
            updateStatus("No layer selected");
            showExpressionDialog(expression);
            return;
        }
        
        app.beginUndoGroup("Apply Choppy Flip");
        
        var successCount = 0;
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (layer.transform.scale) {
                if (applyExpression(layer.transform.scale, expression)) {
                    successCount++;
                }
            }
        }
        
        app.endUndoGroup();
        
        if (successCount > 0) {
            updateStatus("Applied choppy flip to " + successCount + " layer(s)");
        } else {
            updateStatus("Failed to apply choppy flip");
            showExpressionDialog(expression);
        }
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Show wiggle presets dialog
function showWigglePresetsDialog() {
    var dialog = new Window("dialog", "Wiggle Presets");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Preset buttons group
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "column";
    presetGroup.alignChildren = ["fill", "top"];
    presetGroup.spacing = 5;
    
    // Add description
    var desc = dialog.add("statictext", undefined, "Select a wiggle intensity preset:");
    desc.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);
    
    // Wiggle presets
    var presets = {
        "Gentle": { freq: 2, amp: 35 },
        "Normal": { freq: 25, amp: 5 },
        "Fast": { freq: 50, amp: 15 },
        "Crazy": { freq: 75, amp: 20 }
    };
    
    // Custom values group
    var customGroup = dialog.add("panel", undefined, "Custom Values");
    customGroup.orientation = "column";
    customGroup.alignChildren = ["fill", "top"];
    customGroup.spacing = 5;
    customGroup.margins = 10;
    
    // Frequency input
    var freqGroup = customGroup.add("group");
    freqGroup.orientation = "row";
    freqGroup.alignChildren = ["left", "center"];
    freqGroup.add("statictext", undefined, "Frequency:");
    var freqInput = freqGroup.add("edittext", undefined, "4");
    freqInput.preferredSize.width = 60;
    
    // Amplitude input
    var ampGroup = customGroup.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["left", "center"];
    ampGroup.add("statictext", undefined, "Amplitude:");
    var ampInput = ampGroup.add("edittext", undefined, "25");
    ampInput.preferredSize.width = 60;
    
    // Add preset buttons
    for (var presetName in presets) {
        var btn = dialog.add("button", undefined, presetName);
        btn.preset = presets[presetName];
        btn.onClick = function() {
            var preset = this.preset;
            freqInput.text = preset.freq.toString();
            ampInput.text = preset.amp.toString();
        };
    }
    
    // Preview text
    var previewGroup = dialog.add("group");
    previewGroup.orientation = "column";
    previewGroup.alignChildren = ["fill", "top"];
    
    var previewLabel = previewGroup.add("statictext", undefined, "Expression Preview:");
    previewLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var previewText = previewGroup.add("statictext", undefined, "wiggle(4,25)");
    previewText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
    
    // Update preview when values change
    function updatePreview() {
        var freq = parseFloat(freqInput.text);
        var amp = parseFloat(ampInput.text);
        if (!isNaN(freq) && !isNaN(amp)) {
            previewText.text = "wiggle(" + freq + "," + amp + ")";
        }
    }
    
    freqInput.onChanging = updatePreview;
    ampInput.onChanging = updatePreview;
    
    // Buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var freq = parseFloat(freqInput.text);
        var amp = parseFloat(ampInput.text);
        
        if (!isNaN(freq) && !isNaN(amp)) {
            var expression = "wiggle(" + freq + "," + amp + ")";
            handleExpressionClick("Wiggle", expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show posterize time dialog
function showPosterizeTimeDialog() {
    var dialog = new Window("dialog", "Posterize Time Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Add description
    var desc = dialog.add("statictext", undefined, "Set frames per second (lower = more choppy):");
    desc.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);
    
    // FPS input
    var fpsGroup = dialog.add("group");
    fpsGroup.orientation = "row";
    fpsGroup.alignChildren = ["left", "center"];
    fpsGroup.add("statictext", undefined, "Frames per second:");
    var fpsInput = fpsGroup.add("edittext", undefined, "12");
    fpsInput.preferredSize.width = 60;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var presets = [
        { name: "Very Choppy", fps: 2 },
        { name: "Choppy", fps: 6 },
        { name: "Smooth", fps: 12 },
        { name: "Very Smooth", fps: 24 }
    ];
    
    for (var i = 0; i < presets.length; i++) {
        var btn = presetGroup.add("button", undefined, presets[i].name);
        btn.fps = presets[i].fps;
        btn.onClick = function() {
            fpsInput.text = this.fps.toString();
            updatePreview();
        };
    }
    
    // Add checkbox for applying to existing expression
    var appendCheck = dialog.add("checkbox", undefined, "Add to existing expression");
    appendCheck.value = true;
    
    // Preview
    var previewGroup = dialog.add("group");
    previewGroup.orientation = "column";
    previewGroup.alignChildren = ["fill", "top"];
    
    var previewLabel = previewGroup.add("statictext", undefined, "Expression Preview:");
    previewLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var previewText = previewGroup.add("statictext", undefined, "posterizeTime(12);\nvalue");
    previewText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
    
    // Update preview when values change
    function updatePreview() {
        var fps = parseFloat(fpsInput.text);
        if (!isNaN(fps)) {
            previewText.text = "posterizeTime(" + fps + ");\nvalue";
        }
    }
    
    fpsInput.onChanging = updatePreview;
    
    // Buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var fps = parseFloat(fpsInput.text);
        
        if (!isNaN(fps)) {
            applyPosterizeTime(fps, appendCheck.value);
            dialog.close();
        } else {
            alert("Please enter a valid number");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Apply posterize time expression
function applyPosterizeTime(fps, appendToExisting) {
    try {
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }
        
        var comp = app.project.activeItem;
        var selectedProps = getSelectedProperties();
        
        if (selectedProps.length === 0) {
            updateStatus("No property selected");
            return;
        }
        
        app.beginUndoGroup("Apply Posterize Time");
        
        var successCount = 0;
        for (var i = 0; i < selectedProps.length; i++) {
            var prop = selectedProps[i];
            if (prop && prop.canSetExpression) {
                var currentExpression = prop.expression;
                var newExpression;
                
                if (appendToExisting && currentExpression && currentExpression !== "") {
                    // Add posterizeTime to the beginning of existing expression
                    newExpression = "posterizeTime(" + fps + ");\n" + currentExpression;
                } else {
                    // Just use posterizeTime
                    newExpression = "posterizeTime(" + fps + ");\nvalue";
                }
                
                if (applyExpression(prop, newExpression)) {
                    successCount++;
                }
            }
        }
        
        app.endUndoGroup();
        
        if (successCount > 0) {
            updateStatus("Applied posterize time to " + successCount + " property(s)");
        } else {
            updateStatus("Failed to apply posterize time");
        }
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Show rotation pingpong dialog
function showRotationPingPongDialog() {
    var dialog = new Window("dialog", "Rotation PingPong Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Add description
    var desc = dialog.add("statictext", undefined, "Set rotation pingpong parameters:");
    desc.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);
    
    // Amplitude input
    var ampGroup = dialog.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["left", "center"];
    ampGroup.add("statictext", undefined, "Amplitude (degrees):");
    var ampInput = ampGroup.add("edittext", undefined, "10");
    ampInput.preferredSize.width = 60;
    
    // Frequency input
    var freqGroup = dialog.add("group");
    freqGroup.orientation = "row";
    freqGroup.alignChildren = ["left", "center"];
    freqGroup.add("statictext", undefined, "Frequency (cycles/sec):");
    var freqInput = freqGroup.add("edittext", undefined, "2");
    freqInput.preferredSize.width = 60;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var presets = [
        { name: "Gentle", amp: 5, freq: 1 },
        { name: "Normal", amp: 10, freq: 2 },
        { name: "Quick", amp: 15, freq: 3 },
        { name: "Intense", amp: 20, freq: 4 }
    ];
    
    for (var i = 0; i < presets.length; i++) {
        var btn = presetGroup.add("button", undefined, presets[i].name);
        btn.preset = presets[i];
        btn.onClick = function() {
            ampInput.text = this.preset.amp.toString();
            freqInput.text = this.preset.freq.toString();
            updatePreview();
        };
    }
    
    // Preview
    var previewGroup = dialog.add("group");
    previewGroup.orientation = "column";
    previewGroup.alignChildren = ["fill", "top"];
    
    var previewLabel = previewGroup.add("statictext", undefined, "Expression Preview:");
    previewLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var previewText = previewGroup.add("statictext", undefined, "let amp = 10; let rotateFreq = 2;\n// Complex rotation with random pauses\n// 0.5s rotation + 0.3-0.8s pause cycles\n// (Full expression applied on OK)");
    previewText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
    
    // Update preview when values change
    function updatePreview() {
        var amp = parseFloat(ampInput.text);
        var freq = parseFloat(freqInput.text);
        if (!isNaN(amp) && !isNaN(freq)) {
            previewText.text = "let amp = " + amp + "; let rotateFreq = " + freq + ";\n" +
                             "// Complex rotation with random pauses\n" +
                             "// 0.5s rotation + 0.3-0.8s pause cycles\n" +
                             "// (Full expression applied on OK)";
        }
    }
    
    ampInput.onChanging = updatePreview;
    freqInput.onChanging = updatePreview;
    
    // Buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var amp = parseFloat(ampInput.text);
        var freq = parseFloat(freqInput.text);
        
        if (!isNaN(amp) && !isNaN(freq)) {
            // Use the complex Rotation PingPong expression with custom amp and freq values
            var expression = "let amp = " + amp + ";\n" +
                           "let rotateFreq = " + freq + ";\n\n" +
                           "// Get a stable cycle index based on time\n" +
                           "let cycleIndex = Math.floor(time);\n\n" +
                           "// Generate a pseudo-random value per cycle (0...1)\n" +
                           "function random(seed) {\n" +
                           "  return fract(Math.sin(seed * 91.345) * 47453.321);\n" +
                           "}\n" +
                           "function fract(x) {\n" +
                           "  return x - Math.floor(x);\n" +
                           "}\n\n" +
                           "// Get a random pause duration between 0.3 and 0.8 seconds\n" +
                           "let rand = random(cycleIndex);\n" +
                           "let pauseDuration = 0.3 + rand * (0.8 - 0.3);\n\n" +
                           "// Total cycle time: rotateDuration + pauseDuration\n" +
                           "let rotateDuration = 0.5; // how long it rotates each cycle\n" +
                           "let cycleTime = rotateDuration + pauseDuration;\n\n" +
                           "// Where we are in the current cycle\n" +
                           "let t = time % cycleTime;\n\n" +
                           "let output = (t < rotateDuration)\n" +
                           "  ? Math.sin(time * rotateFreq * 2 * Math.PI) * amp\n" +
                           "  : 0;\n\n" +
                           "output;";
            handleExpressionClick("Rotation PingPong", expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Add the Thunder Flicker dialog function
function showThunderFlickerDialog() {
    var dialog = new Window("dialog", "Thunder Flicker Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Add description
    var desc = dialog.add("statictext", undefined, "Customize thunder/laser flicker effect:");
    desc.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);
    
    // Rate thresholds
    var thresholdGroup = dialog.add("panel", undefined, "Rate Thresholds");
    thresholdGroup.orientation = "column";
    thresholdGroup.alignChildren = ["fill", "top"];
    thresholdGroup.spacing = 5;
    thresholdGroup.margins = 10;
    
    // High threshold
    var highGroup = thresholdGroup.add("group");
    highGroup.orientation = "row";
    highGroup.alignChildren = ["left", "center"];
    highGroup.add("statictext", undefined, "High Threshold (0-1):");
    var highInput = highGroup.add("edittext", undefined, "0.7");
    highInput.preferredSize.width = 60;
    
    // Mid threshold
    var midGroup = thresholdGroup.add("group");
    midGroup.orientation = "row";
    midGroup.alignChildren = ["left", "center"];
    midGroup.add("statictext", undefined, "Mid Threshold (0-1):");
    var midInput = midGroup.add("edittext", undefined, "0.4");
    midInput.preferredSize.width = 60;
    
    // Rates
    var rateGroup = dialog.add("panel", undefined, "Flicker Rates");
    rateGroup.orientation = "column";
    rateGroup.alignChildren = ["fill", "top"];
    rateGroup.spacing = 5;
    rateGroup.margins = 10;
    
    // High rate
    var highRateGroup = rateGroup.add("group");
    highRateGroup.orientation = "row";
    highRateGroup.alignChildren = ["left", "center"];
    highRateGroup.add("statictext", undefined, "High Rate:");
    var highRateInput = highRateGroup.add("edittext", undefined, "20");
    highRateInput.preferredSize.width = 60;
    
    // Mid rate
    var midRateGroup = rateGroup.add("group");
    midRateGroup.orientation = "row";
    midRateGroup.alignChildren = ["left", "center"];
    midRateGroup.add("statictext", undefined, "Mid Rate:");
    var midRateInput = midRateGroup.add("edittext", undefined, "8");
    midRateInput.preferredSize.width = 60;
    
    // Low rate
    var lowRateGroup = rateGroup.add("group");
    lowRateGroup.orientation = "row";
    lowRateGroup.alignChildren = ["left", "center"];
    lowRateGroup.add("statictext", undefined, "Low Rate:");
    var lowRateInput = lowRateGroup.add("edittext", undefined, "2");
    lowRateInput.preferredSize.width = 60;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var thunderBtn = presetGroup.add("button", undefined, "Thunder");
    thunderBtn.onClick = function() {
        highInput.text = "0.7";
        midInput.text = "0.4";
        highRateInput.text = "20";
        midRateInput.text = "8";
        lowRateInput.text = "2";
    };
    
    var laserBtn = presetGroup.add("button", undefined, "Laser");
    laserBtn.onClick = function() {
        highInput.text = "0.8";
        midInput.text = "0.5";
        highRateInput.text = "30";
        midRateInput.text = "15";
        lowRateInput.text = "5";
    };
    
    var strobeBtn = presetGroup.add("button", undefined, "Strobe");
    strobeBtn.onClick = function() {
        highInput.text = "0.9";
        midInput.text = "0.6";
        highRateInput.text = "40";
        midRateInput.text = "25";
        lowRateInput.text = "10";
    };
    
    // Preview
    var previewGroup = dialog.add("group");
    previewGroup.orientation = "column";
    previewGroup.alignChildren = ["fill", "top"];
    
    var previewLabel = previewGroup.add("statictext", undefined, "Expression Preview:");
    previewLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var previewText = previewGroup.add("statictext", undefined, "");
    previewText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
    
    // Update preview function
    function updatePreview() {
        var highThreshold = parseFloat(highInput.text);
        var midThreshold = parseFloat(midInput.text);
        var highRate = parseFloat(highRateInput.text);
        var midRate = parseFloat(midRateInput.text);
        var lowRate = parseFloat(lowRateInput.text);
        
        if (!isNaN(highThreshold) && !isNaN(midThreshold) && 
            !isNaN(highRate) && !isNaN(midRate) && !isNaN(lowRate)) {
            var expression = "seedRandom(index + Math.floor(time), true);\n\n" +
                           "rand = random();  // Random chance per second\n" +
                           "rate = rand > " + highThreshold + " ? " + highRate + " : " +
                           "rand > " + midThreshold + " ? " + midRate + " : " + lowRate + ";\n\n" +
                           "t = time * rate;\n" +
                           "flicker = Math.floor(t) % 2 == 0 ? 100 : 0;\n\n" +
                           "flicker";
            previewText.text = expression;
        }
    }
    
    // Add change handlers
    highInput.onChanging = updatePreview;
    midInput.onChanging = updatePreview;
    highRateInput.onChanging = updatePreview;
    midRateInput.onChanging = updatePreview;
    lowRateInput.onChanging = updatePreview;
    
    // Initial preview update
    updatePreview();
    
    // Buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var highThreshold = parseFloat(highInput.text);
        var midThreshold = parseFloat(midInput.text);
        var highRate = parseFloat(highRateInput.text);
        var midRate = parseFloat(midRateInput.text);
        var lowRate = parseFloat(lowRateInput.text);
        
        if (!isNaN(highThreshold) && !isNaN(midThreshold) && 
            !isNaN(highRate) && !isNaN(midRate) && !isNaN(lowRate)) {
            var expression = "seedRandom(index + Math.floor(time), true);\n\n" +
                           "rand = random();  // Random chance per second\n" +
                           "rate = rand > " + highThreshold + " ? " + highRate + " : " +
                           "rand > " + midThreshold + " ? " + midRate + " : " + lowRate + ";\n\n" +
                           "t = time * rate;\n" +
                           "flicker = Math.floor(t) % 2 == 0 ? 100 : 0;\n\n" +
                           "flicker";
            handleExpressionClick("Thunder Flicker", expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show scale pulse dialog
function showScalePulseDialog() {
    var dialog = new Window("dialog", "Scale Pulse Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 6;
    dialog.margins = 12;
    dialog.preferredSize.width = 280;
    dialog.preferredSize.height = 160;
    
    // Input settings in a single row
    var inputGroup = dialog.add("group");
    inputGroup.orientation = "row";
    inputGroup.alignChildren = ["fill", "center"];
    inputGroup.spacing = 8;
    
    var minScaleGroup = inputGroup.add("group");
    minScaleGroup.orientation = "row";
    minScaleGroup.alignChildren = ["left", "center"];
    minScaleGroup.spacing = 4;
    minScaleGroup.add("statictext", undefined, "Min:");
    var minScaleInput = minScaleGroup.add("edittext", undefined, "90");
    minScaleInput.preferredSize.width = 50;
    
    var maxScaleGroup = inputGroup.add("group");
    maxScaleGroup.orientation = "row";
    maxScaleGroup.alignChildren = ["left", "center"];
    maxScaleGroup.spacing = 4;
    maxScaleGroup.add("statictext", undefined, "Max:");
    var maxScaleInput = maxScaleGroup.add("edittext", undefined, "110");
    maxScaleInput.preferredSize.width = 50;
    
    var speedGroup = inputGroup.add("group");
    speedGroup.orientation = "row";
    speedGroup.alignChildren = ["left", "center"];
    speedGroup.spacing = 4;
    speedGroup.add("statictext", undefined, "Speed:");
    var speedInput = speedGroup.add("edittext", undefined, "2");
    speedInput.preferredSize.width = 50;
    
    // Preset buttons in 3x2 grid
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "column";
    presetGroup.alignChildren = ["fill", "top"];
    presetGroup.spacing = 3;
    
    var presetLabel = presetGroup.add("statictext", undefined, "Presets:");
    presetLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    // First row of presets
    var presetRow1 = presetGroup.add("group");
    presetRow1.orientation = "row";
    presetRow1.alignChildren = ["fill", "center"];
    presetRow1.spacing = 3;
    
    var subtleBtn = presetRow1.add("button", undefined, "Subtle");
    subtleBtn.preferredSize.width = 60;
    subtleBtn.preferredSize.height = 20;
    subtleBtn.onClick = function() {
        minScaleInput.text = "95";
        maxScaleInput.text = "105";
        speedInput.text = "1";
        updatePreview();
    };
    
    var normalBtn = presetRow1.add("button", undefined, "Normal");
    normalBtn.preferredSize.width = 60;
    normalBtn.preferredSize.height = 20;
    normalBtn.onClick = function() {
        minScaleInput.text = "90";
        maxScaleInput.text = "110";
        speedInput.text = "2";
        updatePreview();
    };
    
    var strongBtn = presetRow1.add("button", undefined, "Strong");
    strongBtn.preferredSize.width = 60;
    strongBtn.preferredSize.height = 20;
    strongBtn.onClick = function() {
        minScaleInput.text = "80";
        maxScaleInput.text = "120";
        speedInput.text = "3";
        updatePreview();
    };
    
    // Second row of presets
    var presetRow2 = presetGroup.add("group");
    presetRow2.orientation = "row";
    presetRow2.alignChildren = ["fill", "center"];
    presetRow2.spacing = 3;
    
    var fastBtn = presetRow2.add("button", undefined, "Fast");
    fastBtn.preferredSize.width = 60;
    fastBtn.preferredSize.height = 20;
    fastBtn.onClick = function() {
        minScaleInput.text = "90";
        maxScaleInput.text = "110";
        speedInput.text = "4";
        updatePreview();
    };
    
    var preset1Btn = presetRow2.add("button", undefined, "90,110,6");
    preset1Btn.preferredSize.width = 60;
    preset1Btn.preferredSize.height = 20;
    preset1Btn.onClick = function() {
        minScaleInput.text = "90";
        maxScaleInput.text = "110";
        speedInput.text = "6";
        updatePreview();
    };
    
    var preset2Btn = presetRow2.add("button", undefined, "100,115,3");
    preset2Btn.preferredSize.width = 60;
    preset2Btn.preferredSize.height = 20;
    preset2Btn.onClick = function() {
        minScaleInput.text = "100";
        maxScaleInput.text = "115";
        speedInput.text = "3";
        updatePreview();
    };
    
    // Update preview function
    function updatePreview() {
        var minScale = parseFloat(minScaleInput.text);
        var maxScale = parseFloat(maxScaleInput.text);
        var speed = parseFloat(speedInput.text);
        
        if (!isNaN(minScale) && !isNaN(maxScale) && !isNaN(speed)) {
            var expression = "minScale = " + minScale + ";\nmaxScale = " + maxScale + ";\nspeed = " + speed + ";\n\ns = (Math.sin(time * Math.PI * speed) + 1) / 2;\nscaleVal = linear(s, 0, 1, minScale, maxScale);\n[scaleVal, scaleVal]";
            // No preview text needed - removed for compactness
        }
    }
    
    // Add change handlers
    minScaleInput.onChanging = updatePreview;
    maxScaleInput.onChanging = updatePreview;
    speedInput.onChanging = updatePreview;
    
    // Initial preview update
    updatePreview();
    
    // Buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var minScale = parseFloat(minScaleInput.text);
        var maxScale = parseFloat(maxScaleInput.text);
        var speed = parseFloat(speedInput.text);
        
        if (!isNaN(minScale) && !isNaN(maxScale) && !isNaN(speed)) {
            var expression = "minScale = " + minScale + ";\nmaxScale = " + maxScale + ";\nspeed = " + speed + ";\n\ns = (Math.sin(time * Math.PI * speed) + 1) / 2;\nscaleVal = linear(s, 0, 1, minScale, maxScale);\n[scaleVal, scaleVal]";
            handleExpressionClick("Scale Pulse", expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Show walking/running arc dialog
function showWalkRunDialog() {
    var dialog = new Window("dialog", "Walk/Run Arc Movement");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Direction radio buttons
    var dirGroup = dialog.add("group");
    dirGroup.orientation = "row";
    dirGroup.alignChildren = ["left", "center"];
    dirGroup.add("statictext", undefined, "Direction:");
    
    var leftBtn = dirGroup.add("button", undefined, "<");
    leftBtn.preferredSize.width = 30;
    leftBtn.preferredSize.height = 30;
    var rightBtn = dirGroup.add("button", undefined, ">");
    rightBtn.preferredSize.width = 30;
    rightBtn.preferredSize.height = 30;
    
    // Default selection
    var selectedDirection = 1; // 1 for right, -1 for left
    rightBtn.fillBrush = rightBtn.graphics.newBrush(rightBtn.graphics.BrushType.SOLID_COLOR, [0.3, 0.3, 0.3, 1]);
    
    leftBtn.onClick = function() {
        selectedDirection = -1; // LEFT direction (negative)
        leftBtn.fillBrush = leftBtn.graphics.newBrush(leftBtn.graphics.BrushType.SOLID_COLOR, [0.3, 0.3, 0.3, 1]);
        rightBtn.fillBrush = rightBtn.graphics.newBrush(rightBtn.graphics.BrushType.SOLID_COLOR, [0.1, 0.1, 0.1, 1]);
        updatePreview();
    };
    
    rightBtn.onClick = function() {
        selectedDirection = 1; // RIGHT direction (positive)
        rightBtn.fillBrush = rightBtn.graphics.newBrush(rightBtn.graphics.BrushType.SOLID_COLOR, [0.3, 0.3, 0.3, 1]);
        leftBtn.fillBrush = leftBtn.graphics.newBrush(leftBtn.graphics.BrushType.SOLID_COLOR, [0.1, 0.1, 0.1, 1]);
        updatePreview();
    };
    
    // Speed setting
    var speedGroup = dialog.add("group");
    speedGroup.orientation = "row";
    speedGroup.alignChildren = ["left", "center"];
    speedGroup.add("statictext", undefined, "Speed (pixels/sec):");
    var speedInput = speedGroup.add("edittext", undefined, "100");
    speedInput.preferredSize.width = 60;
    
    // Arc height setting
    var arcGroup = dialog.add("group");
    arcGroup.orientation = "row";
    arcGroup.alignChildren = ["left", "center"];
    arcGroup.add("statictext", undefined, "Arc Height (pixels):");
    var arcInput = arcGroup.add("edittext", undefined, "20");
    arcInput.preferredSize.width = 60;
    
    // Frequency setting
    var freqGroup = dialog.add("group");
    freqGroup.orientation = "row";
    freqGroup.alignChildren = ["left", "center"];
    freqGroup.add("statictext", undefined, "Steps per second:");
    var freqInput = freqGroup.add("edittext", undefined, "2");
    freqInput.preferredSize.width = 60;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var walkBtn = presetGroup.add("button", undefined, "Walk");
    walkBtn.onClick = function() {
        speedInput.text = "300";
        arcInput.text = "15";
        freqInput.text = "1.5";
        updatePreview();
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        speedInput.text = "500";
        arcInput.text = "15";
        freqInput.text = "2";
        updatePreview();
    };
    
    var runBtn = presetGroup.add("button", undefined, "Run");
    runBtn.onClick = function() {
        speedInput.text = "700";
        arcInput.text = "15";
        freqInput.text = "4";
        updatePreview();
    };
    
    var sprintBtn = presetGroup.add("button", undefined, "Sprint");
    sprintBtn.onClick = function() {
        speedInput.text = "1500";
        arcInput.text = "15";
        freqInput.text = "4";
        updatePreview();
    };
    
    // Preview
    var previewGroup = dialog.add("group");
    previewGroup.orientation = "column";
    previewGroup.alignChildren = ["fill", "top"];
    
    var previewLabel = previewGroup.add("statictext", undefined, "Preview:");
    previewLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var previewText = previewGroup.add("statictext", undefined, "");
    previewText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
    
    // Update preview function
    function updatePreview() {
        var speed = parseFloat(speedInput.text);
        var arcHeight = parseFloat(arcInput.text);
        var frequency = parseFloat(freqInput.text);
        var direction = selectedDirection === 1 ? 1 : -1;
        
        if (!isNaN(speed) && !isNaN(arcHeight) && !isNaN(frequency)) {
            var expression = "// Settings\nspeed = " + speed + "; // pixels per second\narcHeight = " + arcHeight + "; // arc height in pixels\nfrequency = " + frequency + "; // steps per second\ndirection = " + direction + "; // " + (direction === 1 ? "right" : "left") + "\n\n// Calculate movement\nx = time * speed * direction;\ny = Math.sin(time * frequency * 2 * Math.PI) * arcHeight;\n\nvalue + [x, y]";
            previewText.text = expression;
        }
    }
    
    // Add change handlers
    speedInput.onChanging = updatePreview;
    arcInput.onChanging = updatePreview;
    freqInput.onChanging = updatePreview;
    // Direction buttons already have their onClick handlers set above
    
    // Initial preview update
    updatePreview();
    
    // Buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var speed = parseFloat(speedInput.text);
        var arcHeight = parseFloat(arcInput.text);
        var frequency = parseFloat(freqInput.text);
        var direction = selectedDirection === 1 ? 1 : -1;
        
        if (!isNaN(speed) && !isNaN(arcHeight) && !isNaN(frequency)) {
            var expression = "// Settings\nspeed = " + speed + "; // pixels per second\narcHeight = " + arcHeight + "; // arc height in pixels\nfrequency = " + frequency + "; // steps per second\ndirection = " + direction + "; // " + (direction === 1 ? "right" : "left") + "\n\n// Calculate movement\nx = time * speed * direction;\ny = Math.sin(time * frequency * 2 * Math.PI) * arcHeight;\n\nvalue + [x, y]";
            applyWalkRunAnimation(expression);
            dialog.close();
        } else {
            alert("Please enter valid numbers");
        }
    };
    
    var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
    cancelBtn.onClick = function() {
        dialog.close();
    };
    
    dialog.center();
    dialog.show();
}

// Apply walk/run animation to position property
function applyWalkRunAnimation(expression) {
    try {
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            updateStatus("No active composition");
            showExpressionDialog(expression);
            return;
        }
        
        var comp = app.project.activeItem;
        var selectedLayers = comp.selectedLayers;
        
        if (selectedLayers.length === 0) {
            updateStatus("No layer selected");
            showExpressionDialog(expression);
            return;
        }
        
        app.beginUndoGroup("Apply Walk/Run Arc Animation");
        
        var successCount = 0;
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (layer.transform.position) {
                if (applyExpression(layer.transform.position, expression)) {
                    successCount++;
                }
            }
        }
        
        app.endUndoGroup();
        
        if (successCount > 0) {
            updateStatus("Applied walk/run arc to " + successCount + " layer(s)");
        } else {
            updateStatus("Failed to apply walk/run arc");
            showExpressionDialog(expression);
        }
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Create null objects for selected puppet pins (supports multiple layers)
function createPuppetNulls() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            updateStatus("No layer selected");
            return;
        }
        
        // Function to get a random integer between min and max (inclusive)
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        
        // Scan for all puppet pins from all selected layers
        var pinData = [];
        var totalPins = 0;
        var layersWithPuppets = 0;
        
        // Process all selected layers
        for (var layerIdx = 0; layerIdx < selectedLayers.length; layerIdx++) {
            var myLayer = selectedLayers[layerIdx];
            
            // Check for Puppet effect
            var puppetEffect = myLayer.effect("Puppet");
            if (!puppetEffect) {
                continue; // Skip layers without Puppet effect
            }
            
            layersWithPuppets++;
            var layerPinCount = 0; // Counter for pins in this layer (P1, P2, P3...)
            
            try {
                // Loop through meshes
                for (var m = 1; m <= 10; m++) {
                    try {
                        var mesh = puppetEffect.arap.mesh("Mesh " + m);
                        if (!mesh) break;
                        
                        // Loop through pins
                        for (var p = 1; p <= 100; p++) {
                            try {
                                var pin = mesh.deform("Puppet Pin " + p);
                                if (!pin) break;
                                
                                // Check if position property exists
                                var pinPos = pin.position;
                                if (pinPos) {
                                    totalPins++;
                                    layerPinCount++;
                                    
                                    // Store pin data with layer reference
                                    // Simple format: {layer name}_P{number}
                                    var pinInfo = {
                                        layer: myLayer,
                                        layerName: myLayer.name,
                                        layerIndex: layerIdx,
                                        puppetEffect: puppetEffect,
                                        meshIndex: m,
                                        pinIndex: p,
                                        meshName: "Mesh " + m,
                                        pinName: "Puppet Pin " + p,
                                        displayName: myLayer.name + "_P" + layerPinCount
                                    };
                                    pinData.push(pinInfo);
                                }
                            } catch(e) {
                                break; // No more pins
                            }
                        }
                    } catch(e) {
                        break; // No more meshes
                    }
                }
            } catch(e) {
                // Continue with other layers if one fails
            }
        }
        
        if (totalPins === 0) {
            if (layersWithPuppets === 0) {
                updateStatus("No Puppet effect found on selected layers");
            } else {
                updateStatus("No puppet pins found");
            }
            return;
        }
        
        // Show selection dialog
        var dialog = new Window("dialog", "Select Puppet Pins");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 15;
        
        // Info text
        var infoText = dialog.add("statictext", undefined, "Found " + totalPins + " puppet pin(s) in " + layersWithPuppets + " layer(s)\nHold Ctrl/Cmd to select multiple pins");
        infoText.preferredSize = [500, 40];
        
        dialog.add("panel", undefined, "", {borderStyle: "gray"});
        
        // Pin selection area
        var pinSelectGroup = dialog.add("group");
        pinSelectGroup.orientation = "column";
        pinSelectGroup.alignChildren = ["fill", "top"];
        
        pinSelectGroup.add("statictext", undefined, "Select Puppet Pins to Create Nulls For (multi-select enabled):");
        var pinList = pinSelectGroup.add("listbox", undefined, [], {multiline: true, multiselect: true});
        pinList.preferredSize = [500, 300];
        
        // Populate list with simple format: {layer name}_P{number}
        for (var i = 0; i < pinData.length; i++) {
            var listItem = pinList.add("item", pinData[i].displayName);
            listItem.selected = true; // Select all by default
        }
        
        // Selection buttons
        var selectBtnGroup = dialog.add("group");
        selectBtnGroup.orientation = "row";
        selectBtnGroup.alignment = "center";
        
        var selectAllBtn = selectBtnGroup.add("button", undefined, "Select All");
        var deselectAllBtn = selectBtnGroup.add("button", undefined, "Deselect All");
        
        selectAllBtn.onClick = function() {
            for (var i = 0; i < pinList.items.length; i++) {
                pinList.items[i].selected = true;
            }
        };
        
        deselectAllBtn.onClick = function() {
            for (var i = 0; i < pinList.items.length; i++) {
                pinList.items[i].selected = false;
            }
        };
        
        // Action buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";
        buttonGroup.spacing = 10;
        
        var createBtn = buttonGroup.add("button", undefined, "Create Nulls");
        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        
        createBtn.onClick = function() {
            // Get selected pins from the list
            var selectedPins = [];
            for (var i = 0; i < pinList.items.length; i++) {
                if (pinList.items[i].selected) {
                    selectedPins.push(pinData[i]);
                }
            }
            
            if (selectedPins.length === 0) {
                return;
            }
            
            app.beginUndoGroup("Create Nulls for Selected Puppet Pins");
            
            try {
                var createdNulls = 0;
                var processedLayers = {}; // Track layers we've processed to restore rotation/scale
                
                // Loop through selected pins
                for (var s = 0; s < selectedPins.length; s++) {
                    var pinInfo = selectedPins[s];
                    var myLayer = pinInfo.layer;
                    var puppetEffect = pinInfo.puppetEffect;
                    var m = pinInfo.meshIndex;
                    var p = pinInfo.pinIndex;
                    
                    // Store original rotation and scale for each layer (only once per layer)
                    if (!processedLayers[myLayer.name]) {
                        processedLayers[myLayer.name] = {
                            rotation: myLayer.property("Transform").property("Rotation").value,
                            scale: myLayer.property("Transform").property("Scale").value
                        };
                    }
                    
                    try {
                        var mesh = puppetEffect.arap.mesh("Mesh " + m);
                        var puppetPin = mesh.deform("Puppet Pin " + p);
                        
                        if (puppetPin != null) {
                            // Reset rotation and scale values of myLayer before operation
                            myLayer.property("Transform").property("Rotation").setValue(0);
                            myLayer.property("Transform").property("Scale").setValue([100, 100, 100]);
                            
                            // Calculate the position
                            var puppetPos = puppetPin.position.value;
                            var myLanchor = myLayer.transform.anchorPoint.value;
                            var myLpos = myLayer.transform.position.value;
                            var pos = [myLpos[0] + puppetPos[0] - myLanchor[0], myLpos[1] + puppetPos[1] - myLanchor[1]];
                            
                            // Create a new null layer at the calculated position
                            var myNull = comp.layers.addNull();
                            myNull.name = pinInfo.displayName;
                            myNull.transform.position.setValue(pos);
                            myNull.source.width = 350;
                            myNull.source.height = 350;
                            myNull.moveBefore(myLayer);
                            
                            // Set the anchor point of the null to its center
                            myNull.transform.anchorPoint.setValue([myNull.source.width/2, myNull.source.height/2]);
                            
                            // Assign a random label color to the null layer
                            myNull.label = getRandomInt(1, 15);
                            
                            // Link the Puppet Pin position to the null layer position
                            var expr = "n=thisComp.layer(\"" + myNull.name + "\");\n";
                            expr += "nullpos=n.toComp(n.anchorPoint);\n";
                            expr += "fromComp(nullpos);";
                            puppetPin.position.expression = expr;
                            
                            // Link null to myLayer
                            myNull.parent = myLayer;
                            
                            createdNulls++;
                        }
                    } catch(e) {
                        // Continue with other pins if one fails
                    }
                }
                
                // Restore original rotation and scale values for all processed layers
                for (var layerName in processedLayers) {
                    for (var i = 1; i <= comp.numLayers; i++) {
                        var layer = comp.layer(i);
                        if (layer.name === layerName) {
                            layer.property("Transform").property("Rotation").setValue(processedLayers[layerName].rotation);
                            layer.property("Transform").property("Scale").setValue(processedLayers[layerName].scale);
                            break;
                        }
                    }
                }
                
            app.endUndoGroup();
            
            if (createdNulls > 0) {
                updateStatus("Created " + createdNulls + " null object(s) for puppet pins");
                dialog.close();
            } else {
                updateStatus("No nulls created");
            }
                
            } catch(e) {
                app.endUndoGroup();
                updateStatus("Error: " + e.toString());
            }
        };
        
        cancelBtn.onClick = function() {
            dialog.close();
        };
        
        dialog.center();
        dialog.show();
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Flip layers horizontally
function flipHorizontal() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            updateStatus("No layers selected");
            return;
        }
        
        app.beginUndoGroup("Flip Horizontal");
        
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var scaleProp = layer.transform.scale;
            var currentScale = scaleProp.value;
            var currentTime = comp.time;
            
            // Flip to negative of current X scale value (dynamic: 34% → -34%)
            var newXScale = -currentScale[0];
            
            // Add keyframe at current time with flipped X scale
            scaleProp.setValueAtTime(currentTime, [newXScale, currentScale[1], currentScale[2]]);
        }
        
        app.endUndoGroup();
        updateStatus("Flipped " + selectedLayers.length + " layer(s) horizontally");
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Flip layers vertically
function flipVertical() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            updateStatus("No layers selected");
            return;
        }
        
        app.beginUndoGroup("Flip Vertical");
        
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var scaleProp = layer.transform.scale;
            var currentScale = scaleProp.value;
            var currentTime = comp.time;
            
            // Flip to negative of current Y scale value (dynamic: 34% → -34%)
            var newYScale = -currentScale[1];
            
            // Add keyframe at current time with flipped Y scale
            scaleProp.setValueAtTime(currentTime, [currentScale[0], newYScale, currentScale[2]]);
        }
        
        app.endUndoGroup();
        updateStatus("Flipped " + selectedLayers.length + " layer(s) vertically");
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Reverse all keyframes on selected layers
function reverseAllKeyframes() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("No active composition found");
            updateStatus("No active composition");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer");
            updateStatus("No layers selected");
            return;
        }
        
        app.beginUndoGroup("Reverse Selected Keyframes");
        
        var totalReversed = 0;
        var hasSelectedKeys = false;
        
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            
            // Get all properties recursively
            var properties = getAllAnimatedProperties(layer);
            
            for (var j = 0; j < properties.length; j++) {
                var prop = properties[j];
                
                // Check if this property has selected keyframes
                var selectedKeys = prop.selectedKeys;
                
                if (selectedKeys.length > 1) {
                    hasSelectedKeys = true;
                    
                    // Store only selected keyframe data
                    var keyData = [];
                    for (var k = 0; k < selectedKeys.length; k++) {
                        var keyIndex = selectedKeys[k];
                        keyData.push({
                            index: keyIndex,
                            time: prop.keyTime(keyIndex),
                            value: prop.keyValue(keyIndex),
                            inInterp: prop.keyInInterpolationType(keyIndex),
                            outInterp: prop.keyOutInterpolationType(keyIndex),
                            inEase: prop.keyInTemporalEase(keyIndex),
                            outEase: prop.keyOutTemporalEase(keyIndex)
                        });
                    }
                    
                    // Get time range of selected keyframes
                    var firstTime = keyData[0].time;
                    var lastTime = keyData[keyData.length - 1].time;
                    var duration = lastTime - firstTime;
                    
                    // Remove selected keyframes (in reverse order to maintain indices)
                    for (var k = keyData.length - 1; k >= 0; k--) {
                        prop.removeKey(keyData[k].index);
                    }
                    
                    // Re-add keyframes in reverse order with reversed timing
                    for (var k = keyData.length - 1; k >= 0; k--) {
                        var newTime = firstTime + (duration - (keyData[k].time - firstTime));
                        var newKeyIndex = prop.setValueAtTime(newTime, keyData[k].value);
                        
                        // Restore interpolation (swap in/out for reverse)
                        try {
                            prop.setInterpolationTypeAtKey(newKeyIndex, keyData[k].outInterp, keyData[k].inInterp);
                            prop.setTemporalEaseAtKey(newKeyIndex, keyData[k].outEase, keyData[k].inEase);
                        } catch(e) {
                            // Some interpolation types may not be compatible
                        }
                    }
                    
                    totalReversed++;
                }
            }
        }
        
        app.endUndoGroup();
        
        if (!hasSelectedKeys) {
            alert("Please select keyframes first.\n\nTo select keyframes:\n1. Open the property in the timeline\n2. Click on keyframes to select them\n3. Then run this tool");
            updateStatus("No keyframes selected");
        } else if (totalReversed > 0) {
            updateStatus("Reversed " + totalReversed + " property(s) with selected keyframes");
        } else {
            updateStatus("No valid keyframe selection found");
        }
        
    } catch (error) {
        updateStatus("Error: " + error.message);
    }
}

// Helper function to get all animated properties recursively
function getAllAnimatedProperties(layerOrGroup, propList) {
    if (!propList) propList = [];
    
    try {
        var numProps = layerOrGroup.numProperties;
        for (var i = 1; i <= numProps; i++) {
            var prop = layerOrGroup.property(i);
            
            if (prop.numKeys > 0) {
                // This property has keyframes
                propList.push(prop);
            }
            
            // Recurse into property groups
            if (prop.numProperties > 0) {
                getAllAnimatedProperties(prop, propList);
            }
        }
    } catch(e) {
        // Some properties may not be accessible
    }
    
    return propList;
}

// Hide all layers starting with 'hide' in main_comp
function hideAllLayersNamedHide() {
    try {
        // Function to process a composition recursively
        function processComp(comp) {
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);

                // Check for precomp and process it recursively
                if (layer.source instanceof CompItem) {
                    processComp(layer.source); // Recursive
                }

                // Check if name starts with "hide" or "x" (case-insensitive)
                var lowerName = layer.name.toLowerCase();
                if (lowerName.indexOf("hide") === 0 || lowerName.indexOf("x") === 0) {
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
            app.beginUndoGroup("Hide Layers Starting with 'hide' or 'x'");
            processComp(mainComp);
            app.endUndoGroup();
            updateStatus("Hidden all layers starting with 'hide' or 'x' in main_comp and precomps");
        } else {
            alert("Main Comp not found in the project.");
            updateStatus("Main Comp not found");
        }
        
    } catch (error) {
        alert("Error hiding layers: " + error.message);
        updateStatus("Error: " + error.message);
    }
}

// Show all layers starting with 'hide' in main_comp
function showAllLayersNamedHide() {
    try {
        // Function to process a composition recursively
        function processComp(comp) {
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);

                // Check for precomp and process it recursively
                if (layer.source instanceof CompItem) {
                    processComp(layer.source); // Recursive
                }

                // Check if name starts with "hide" or "x" (case-insensitive)
                var lowerName = layer.name.toLowerCase();
                if (lowerName.indexOf("hide") === 0 || lowerName.indexOf("x") === 0) {
                    layer.enabled = true; // Shows the layer (eye icon on)
                    layer.visible = true; // Optional UI update
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
            app.beginUndoGroup("Show Layers Starting with 'hide' or 'x'");
            processComp(mainComp);
            app.endUndoGroup();
            updateStatus("Shown all layers starting with 'hide' or 'x' in main_comp and precomps");
        } else {
            alert("Main Comp not found in the project.");
            updateStatus("Main Comp not found");
        }
        
    } catch (error) {
        alert("Error showing layers: " + error.message);
        updateStatus("Error: " + error.message);
    }
}

// Toggle lock status of layers named 'x' or 'X' in main_comp
function toggleXLockLayers() {
    try {
        // Function to process a composition recursively
        function processComp(comp) {
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);

                // Check for precomp and process it recursively
                if (layer.source instanceof CompItem) {
                    processComp(layer.source); // Recursive
                }

                // Check if name is exactly "x" or "X" (case-sensitive for exact match)
                var layerName = layer.name;
                if (layerName === "x" || layerName === "X") {
                    layer.locked = !layer.locked; // Toggle lock status
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
            app.beginUndoGroup("Toggle Lock for Layers Named 'x' or 'X'");
            processComp(mainComp);
            app.endUndoGroup();
            updateStatus("Toggled lock status for layers named 'x' or 'X' in main_comp and precomps");
        } else {
            alert("Main Comp not found in the project.");
            updateStatus("Main Comp not found");
        }
        
    } catch (error) {
        alert("Error toggling layer locks: " + error.message);
        updateStatus("Error: " + error.message);
    }
}

// Trim selected layers to avoid overlapping
function trimSelectedLayers() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition first.");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length < 2) {
            alert("Please select at least 2 layers to trim.");
            return;
        }

        app.beginUndoGroup("Trim Selected Layers");

        // Sort layers by inPoint
        selectedLayers.sort(function(a, b) {
            return a.inPoint - b.inPoint;
        });

        // Trim layers from first to second-to-last
        for (var i = 0; i < selectedLayers.length - 1; i++) {
            var currentLayer = selectedLayers[i];
            var nextLayer = selectedLayers[i + 1];

            if (!currentLayer.locked) {
                try {
                    // Trim current layer's out point to next layer's in point
                    currentLayer.outPoint = nextLayer.inPoint;
                } catch(err) {
                    // Skip any errors and continue with next layer
                    continue;
                }
            }
        }

        app.endUndoGroup();
        updateStatus("Successfully trimmed " + selectedLayers.length + " layers.");

    } catch (error) {
        updateStatus("Error trimming selected layers: " + error.toString());
    }
}

// Auto Trim overlapping layers
function autoTrimLayers() {
    try {
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
            updateStatus("Trim complete! (Locked layers were skipped)");
        } else {
            alert("Please select a composition first!");
            updateStatus("No active composition");
        }
        
        app.endUndoGroup();
    } catch (error) {
        alert("Error trimming layers: " + error.message);
        updateStatus("Error: " + error.message);
    }
}

// Change Batch Duration for precomps
function changeBatchDuration() {
    try {
        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("Please select a composition.");
            updateStatus("No active composition");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            updateStatus("No layers selected");
            return;
        }

        var input = prompt("Enter new duration in seconds:", "10");
        if (!input || isNaN(input)) {
            alert("Invalid duration.");
            updateStatus("Invalid duration input");
            return;
        }

        var newDuration = parseFloat(input);
        if (newDuration <= 0) {
            alert("Duration must be greater than 0.");
            updateStatus("Duration must be positive");
            return;
        }

        app.beginUndoGroup("Change Precomp Durations and Stretch Layers");

        var changedCount = 0;
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var source = layer.source;

            if (source instanceof CompItem) {
                // Store old duration before changing
                var oldDuration = source.duration;
                
                // Change comp duration
                source.duration = newDuration;
                source.displayStartTime = 0;
                
                // Calculate stretch ratio
                var stretchRatio = newDuration / oldDuration;
                
                // Stretch all layers inside the comp to match new duration
                for (var j = 1; j <= source.numLayers; j++) {
                    var innerLayer = source.layer(j);
                    
                    try {
                        // Enable time remapping if not already enabled
                        if (!innerLayer.timeRemapEnabled) {
                            innerLayer.timeRemapEnabled = true;
                        }
                        
                        // Remove existing time remap keyframes
                        var timeRemapProp = innerLayer.timeRemap;
                        while (timeRemapProp.numKeys > 0) {
                            timeRemapProp.removeKey(1);
                        }
                        
                        // Add time remap keyframes to stretch the layer
                        // At time 0, remap to 0
                        timeRemapProp.setValueAtTime(0, 0);
                        // At new duration, remap to old duration
                        timeRemapProp.setValueAtTime(newDuration, oldDuration);
                        
                        // Stretch in/out points proportionally
                        var oldInPoint = innerLayer.inPoint;
                        var oldOutPoint = innerLayer.outPoint;
                        
                        innerLayer.inPoint = oldInPoint * stretchRatio;
                        innerLayer.outPoint = oldOutPoint * stretchRatio;
                        
                    } catch(e) {
                        // Some layers may not support time remapping (e.g., solids, text)
                        // Try to just stretch in/out points instead
                        try {
                            var oldInPoint = innerLayer.inPoint;
                            var oldOutPoint = innerLayer.outPoint;
                            innerLayer.inPoint = oldInPoint * stretchRatio;
                            innerLayer.outPoint = oldOutPoint * stretchRatio;
                        } catch(e2) {
                            // Skip this layer if it can't be stretched
                        }
                    }
                }
                
                changedCount++;
            }
        }

        app.endUndoGroup();
        
        if (changedCount > 0) {
            updateStatus("Duration updated and layers stretched for " + changedCount + " precomp(s)");
        } else {
            alert("No precomp layers found in selection.");
            updateStatus("No precomps found");
        }
        
    } catch (error) {
        alert("Error changing batch duration: " + error.message);
        updateStatus("Error: " + error.message);
    }
}

// Create separate jump window with full functionality
function createSeparateJumpWindow() {
    var jumpWindow = new Window("window", "Timeline Jump Controls");
    jumpWindow.orientation = "column";
    jumpWindow.alignChildren = ["fill", "top"];
    jumpWindow.spacing = 6;
    jumpWindow.margins = 8;
    jumpWindow.preferredSize.width = 300;
    jumpWindow.preferredSize.height = 120;
    
    // Timeline jumper group
    var timelineGroup = jumpWindow.add("group");
    timelineGroup.orientation = "column";
    timelineGroup.alignChildren = ["fill", "top"];
    timelineGroup.spacing = 6;
    timelineGroup.margins = 8;

    // Top row with label and timecode input
    var topRow = timelineGroup.add("group");
    topRow.orientation = "row";
    topRow.alignChildren = ["left", "center"];
    topRow.spacing = 6;
    
    var timelineLabel = topRow.add("statictext", undefined, "Jump to:");
    timelineLabel.preferredSize.width = 70;
    timelineLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);
    
    var timeInput = topRow.add("edittext", undefined, "");
    timeInput.preferredSize.width = 120;
    timeInput.preferredSize.height = 30;
    timeInput.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 16);
    timeInput.helpTip = "Paste timecode (e.g. 00:00:30:00 or 00:00:30.017)";
    
    // Calibration controls next to input for separate window
    var calLabelWindow = topRow.add("statictext", undefined, "Cal:");
    calLabelWindow.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var calibrationInputWindow = topRow.add("edittext", undefined, "0");
    calibrationInputWindow.preferredSize.width = 35;
    calibrationInputWindow.preferredSize.height = 30;
    calibrationInputWindow.helpTip = "Milliseconds offset (+/-) for all jumps";
    
    var msLabelWindow = topRow.add("statictext", undefined, "ms");
    msLabelWindow.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
    
    var calPlusBtnWindow = topRow.add("button", undefined, "+");
    calPlusBtnWindow.preferredSize.width = 18;
    calPlusBtnWindow.preferredSize.height = 30;
    calPlusBtnWindow.onClick = function() {
        var current = parseFloat(calibrationInputWindow.text) || 0;
        calibrationInputWindow.text = (current + 50).toString();
    };
    
    var calMinusBtnWindow = topRow.add("button", undefined, "-");
    calMinusBtnWindow.preferredSize.width = 18;
    calMinusBtnWindow.preferredSize.height = 30;
    calMinusBtnWindow.onClick = function() {
        var current = parseFloat(calibrationInputWindow.text) || 0;
        calibrationInputWindow.text = (current - 50).toString();
    };

    // Auto-move layer feature row for separate window
    var autoMoveRowWindow = timelineGroup.add("group");
    autoMoveRowWindow.orientation = "row";
    autoMoveRowWindow.alignChildren = ["left", "center"];
    autoMoveRowWindow.spacing = 6;
    
    var autoMoveCheckWindow = autoMoveRowWindow.add("checkbox", undefined, "Auto-move next layer to time");
    autoMoveCheckWindow.helpTip = "When pasting timecode, automatically move the layer above the selected one to that time";
    autoMoveCheckWindow.value = false;


    // Status area
    var statusGroup = jumpWindow.add("group");
    statusGroup.orientation = "row";
    statusGroup.alignChildren = ["fill", "center"];
    
    var statusText = statusGroup.add("statictext", undefined, "Ready");
    statusText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
    statusText.alignment = ["fill", "center"];

    
    // Auto-jump when text changes (including paste) for this window
    timeInput.onChanging = function() {
        if (this.text) {
            parseTimeAndJumpInWindow(this.text);
            // Clear input and refocus for next input
            var self = this;
            app.setTimeout(function() {
                self.text = "";
                self.active = true;
            }, 100);
        }
    };
    
    // Also add onClick to ensure it stays focused when clicked
    timeInput.onClick = function() {
        this.active = true;
    };
    
    // Parse time and jump function for this window
    function parseTimeAndJumpInWindow(timeStr) {
        try {
            // Find main composition
            var mainComp = null;
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.name === "main_comp") {
                    mainComp = item;
                    break;
                }
            }
            
            if (!mainComp) {
                statusText.text = "Could not find 'main_comp'";
                return;
            }
            
            // Remove any whitespace
            timeStr = timeStr.replace(/\s/g, '');
            
            var totalSeconds = 0;
            var fps = mainComp.frameRate; // Get composition frame rate
            
            // Helper function to parse time parts
            function parseTimeParts(h, m, s, f) {
                return parseInt(h) * 3600 + // Hours
                       parseInt(m) * 60 + // Minutes
                       parseInt(s) + // Seconds
                       parseFloat(f || 0); // Frames as decimal of a second
            }
            
            // Try different time formats
            if (timeStr.indexOf(':') !== -1) {
                // Split by colon first
                var mainParts = timeStr.split(':');
                
                // Check if the last part contains a period (frames in decimal format)
                if (mainParts[mainParts.length - 1].indexOf('.') !== -1) {
                    // Handle subtitle engine format (HH:MM:SS.FFF)
                    var lastPart = mainParts[mainParts.length - 1].split('.');
                    mainParts[mainParts.length - 1] = lastPart[0];
                    
                    // Convert frame number to seconds
                    // If it's 3 digits (e.g., .017), treat as frame number
                    var frameNumber = parseInt(lastPart[1]);
                    if (lastPart[1].length === 3) {
                        // Remove leading zeros and convert to actual frame number
                        frameNumber = parseInt(lastPart[1].replace(/^0+/, ''));
                    }
                    var frameSeconds = frameNumber / fps;
                    
                    if (mainParts.length === 3) {
                        // Format: HH:MM:SS.FFF
                        totalSeconds = parseTimeParts(mainParts[0], mainParts[1], mainParts[2], frameSeconds);
                    } else if (mainParts.length === 2) {
                        // Format: MM:SS.FFF
                        totalSeconds = parseTimeParts(0, mainParts[0], mainParts[1], frameSeconds);
                    }
                } else {
                    // Handle standard frame format (HH:MM:SS:FF)
                    if (mainParts.length === 4) {
                        // Format: HH:MM:SS:FF
                        totalSeconds = parseTimeParts(mainParts[0], mainParts[1], mainParts[2], mainParts[3] / fps);
                    } else if (mainParts.length === 3) {
                        // Format: MM:SS:FF
                        totalSeconds = parseTimeParts(0, mainParts[0], mainParts[1], mainParts[2] / fps);
                    } else if (mainParts.length === 2) {
                        // Format: SS:FF
                        totalSeconds = parseTimeParts(0, 0, mainParts[0], mainParts[1] / fps);
                    }
                }
            } else {
                // Try parsing as seconds
                totalSeconds = parseFloat(timeStr);
            }
            
            if (isNaN(totalSeconds)) {
                statusText.text = "Invalid time format";
                return;
            }
            
            // Apply calibration offset
            var calibrationMs = parseFloat(calibrationInputWindow.text) || 0;
            var calibrationSeconds = calibrationMs / 1000;
            totalSeconds += calibrationSeconds;
            
            // Clamp to composition duration
            totalSeconds = Math.max(0, Math.min(totalSeconds, mainComp.duration));
            
            // Jump to time
            mainComp.time = totalSeconds;
            
            // Auto-move next layer if enabled
            if (autoMoveCheckWindow.value) {
                moveNextLayerToCurrentTimeWindow(mainComp, statusText);
            }
            
            // Format the time for status display
            var hours = Math.floor(totalSeconds / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = Math.floor(totalSeconds % 60);
            var frames = Math.floor((totalSeconds % 1) * fps);
            
            // Helper function to pad numbers with leading zeros
            function padNumber(num, width) {
                var str = num.toString();
                while (str.length < width) {
                    str = '0' + str;
                }
                return str;
            }
            
            // Format display time with frames
            var timeDisplay = (hours > 0 ? padNumber(hours, 2) + ':' : '') +
                             padNumber(minutes, 2) + ':' +
                             padNumber(seconds, 2) + '.' +
                             padNumber(frames, 2); // Display frames as two digits
            
            statusText.text = "Jumped to " + timeDisplay;
            
        } catch (error) {
            statusText.text = "Error: " + error.toString();
        }
    }

    // Function to move next layer to current time for separate window
    function moveNextLayerToCurrentTimeWindow(comp, statusText) {
        try {
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                return; // No layer selected, skip auto-move
            }
            
            // Get the first selected layer
            var currentLayer = selectedLayers[0];
            var currentLayerIndex = currentLayer.index;
            
            // Find the next layer (layer above = lower index)
            var nextLayerIndex = currentLayerIndex - 1;
            
            if (nextLayerIndex >= 1) { // Make sure there's a layer above
                var nextLayer = comp.layer(nextLayerIndex);
                
                // Move the next layer to current time
                nextLayer.startTime = comp.time;
                
                // Deselect all layers first
                for (var i = 0; i < selectedLayers.length; i++) {
                    selectedLayers[i].selected = false;
                }
                
                // Select the moved layer
                nextLayer.selected = true;
                
                statusText.text = "Moved '" + nextLayer.name + "' to current time and selected it";
            } else {
                statusText.text = "No layer above current selection to move";
            }
            
        } catch (error) {
            statusText.text = "Auto-move error: " + error.toString();
        }
    }
    
    // Make timeline input always active/focused (do this after all UI is created)
    timeInput.active = true;
    
    jumpWindow.center();
    jumpWindow.show();
}

// Show layer navigation window
function showLayerNavigationWindow() {
    var layerNavWindow = new Window("window", "Layer Navigation");
    layerNavWindow.orientation = "column";
    layerNavWindow.alignChildren = ["fill", "top"];
    layerNavWindow.spacing = 10;
    layerNavWindow.margins = 16;
    layerNavWindow.preferredSize.width = 250;
    layerNavWindow.preferredSize.height = 120;
    
    // Current layer info
    var infoGroup = layerNavWindow.add("group");
    infoGroup.orientation = "column";
    infoGroup.alignChildren = ["fill", "top"];
    infoGroup.spacing = 5;
    
    var currentTimeLabel = infoGroup.add("statictext", undefined, "Current Time:");
    currentTimeLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var currentTimeText = infoGroup.add("statictext", undefined, "00:00:00:00");
    currentTimeText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 12);
    currentTimeText.alignment = ["fill", "center"];
    
    var currentLayerLabel = infoGroup.add("statictext", undefined, "Current Layer:");
    currentLayerLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var currentLayerText = infoGroup.add("statictext", undefined, "None");
    currentLayerText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
    currentLayerText.alignment = ["fill", "center"];
    
    // Navigation buttons
    var buttonGroup = layerNavWindow.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignChildren = ["fill", "center"];
    buttonGroup.spacing = 10;
    
    var prevLayerBtn = buttonGroup.add("button", undefined, "← Previous Layer");
    prevLayerBtn.preferredSize.width = 100;
    prevLayerBtn.preferredSize.height = 30;
    prevLayerBtn.helpTip = "Jump to the start of the previous layer";
    prevLayerBtn.onClick = function() {
        jumpToPreviousLayer(currentTimeText, currentLayerText);
    };
    
    var nextLayerBtn = buttonGroup.add("button", undefined, "Next Layer →");
    nextLayerBtn.preferredSize.width = 100;
    nextLayerBtn.preferredSize.height = 30;
    nextLayerBtn.helpTip = "Jump to the start of the next layer";
    nextLayerBtn.onClick = function() {
        jumpToNextLayer(currentTimeText, currentLayerText);
    };
    
    // Update display function
    function updateDisplay() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                currentTimeText.text = "No composition";
                currentLayerText.text = "None";
                return;
            }
            
            var currentTime = comp.time;
            var fps = comp.frameRate;
            
            // Format current time
            var hours = Math.floor(currentTime / 3600);
            var minutes = Math.floor((currentTime % 3600) / 60);
            var seconds = Math.floor(currentTime % 60);
            var frames = Math.floor((currentTime % 1) * fps);
            
            function padNumber(num, width) {
                var str = num.toString();
                while (str.length < width) {
                    str = '0' + str;
                }
                return str;
            }
            
            var timeString = padNumber(hours, 2) + ':' + 
                           padNumber(minutes, 2) + ':' + 
                           padNumber(seconds, 2) + ':' + 
                           padNumber(frames, 2);
            
            currentTimeText.text = timeString;
            
            // Find current layer
            var currentLayer = null;
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);
                if (currentTime >= layer.inPoint && currentTime <= layer.outPoint) {
                    currentLayer = layer;
                    break;
                }
            }
            
            if (currentLayer) {
                currentLayerText.text = currentLayer.name;
            } else {
                currentLayerText.text = "No layer at current time";
            }
            
        } catch (error) {
            currentTimeText.text = "Error";
            currentLayerText.text = "Error";
        }
    }
    
    // Function to jump to next layer
    function jumpToNextLayer(timeText, layerText) {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition first.");
                return;
            }
            
            var currentTime = comp.time;
            var nextLayer = null;
            var nextLayerTime = null;
            
            // Find the next layer (layer that starts after current time)
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);
                if (layer.inPoint > currentTime) {
                    if (!nextLayer || layer.inPoint < nextLayerTime) {
                        nextLayer = layer;
                        nextLayerTime = layer.inPoint;
                    }
                }
            }
            
            if (nextLayer) {
                comp.time = nextLayer.inPoint;
                updateDisplay();
                updateStatus("Jumped to layer: " + nextLayer.name);
            } else {
                updateStatus("No next layer found");
            }
            
        } catch (error) {
            alert("Error jumping to next layer: " + error.toString());
        }
    }
    
    // Function to jump to previous layer
    function jumpToPreviousLayer(timeText, layerText) {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition first.");
                return;
            }
            
            var currentTime = comp.time;
            var prevLayer = null;
            var prevLayerTime = null;
            
            // Find the previous layer (layer that starts before current time)
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);
                if (layer.inPoint < currentTime) {
                    if (!prevLayer || layer.inPoint > prevLayerTime) {
                        prevLayer = layer;
                        prevLayerTime = layer.inPoint;
                    }
                }
            }
            
            if (prevLayer) {
                comp.time = prevLayer.inPoint;
                updateDisplay();
                updateStatus("Jumped to layer: " + prevLayer.name);
            } else {
                updateStatus("No previous layer found");
            }
            
        } catch (error) {
            alert("Error jumping to previous layer: " + error.toString());
        }
    }
    
    // Initial display update
    updateDisplay();
    
    // Update display every 100ms to keep it current
    var updateInterval = app.setInterval(updateDisplay, 100);
    
    // Clean up interval when window closes
    layerNavWindow.onClose = function() {
        app.clearInterval(updateInterval);
    };
    
    layerNavWindow.center();
    layerNavWindow.show();
}

// Direct function to jump to next layer
function jumpToNextLayerDirect() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }
        
        var currentTime = comp.time;
        var nextLayer = null;
        var nextLayerTime = null;
        
        // Find the next layer (layer that starts after current time)
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer.inPoint > currentTime) {
                if (!nextLayer || layer.inPoint < nextLayerTime) {
                    nextLayer = layer;
                    nextLayerTime = layer.inPoint;
                }
            }
        }
        
        if (nextLayer) {
            comp.time = nextLayer.inPoint;
            updateStatus("Jumped to layer: " + nextLayer.name);
        } else {
            updateStatus("No next layer found");
        }
        
    } catch (error) {
        updateStatus("Error jumping to next layer: " + error.toString());
    }
}

// Direct function to jump to previous layer
function jumpToPreviousLayerDirect() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            updateStatus("No active composition");
            return;
        }
        
        var currentTime = comp.time;
        var prevLayer = null;
        var prevLayerTime = null;
        
        // Find the previous layer (layer that starts before current time)
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer.inPoint < currentTime) {
                if (!prevLayer || layer.inPoint > prevLayerTime) {
                    prevLayer = layer;
                    prevLayerTime = layer.inPoint;
                }
            }
        }
        
        if (prevLayer) {
            comp.time = prevLayer.inPoint;
            updateStatus("Jumped to layer: " + prevLayer.name);
        } else {
            updateStatus("No previous layer found");
        }
        
    } catch (error) {
        updateStatus("Error jumping to previous layer: " + error.toString());
    }
}



 