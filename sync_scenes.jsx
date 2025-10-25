// Sync Scenes Script for After Effects
function syncScenes() {
    // Get the active project
    var project = app.project;
    
    // Check if project exists
    if (!project) {
        alert("Please open a project first!");
        return;
    }
    
    // Find main composition named "main_comp"
    var mainComp = null;
    for (var i = 1; i <= project.numItems; i++) {
        if (project.item(i) instanceof CompItem && project.item(i).name === "main_comp") {
            mainComp = project.item(i);
            break;
        }
    }
    
    if (!mainComp) {
        alert("Could not find composition named 'main_comp'!");
        return;
    }

    // Function to parse SRT timestamp to frames
    function srtTimestampToFrames(timestamp) {
        try {
            // Parse timestamp format "00:02:40.017"
            var parts = timestamp.toString().split(':');
            if (parts.length !== 3) return 0;
            
            var seconds = parts[2].toString().split('.');
            if (seconds.length !== 2) return 0;
            
            var hours = parseInt(parts[0]) || 0;
            var minutes = parseInt(parts[1]) || 0;
            var secs = parseInt(seconds[0]) || 0;
            var frames = parseInt(seconds[1]) || 0;
            
            // Calculate total frames
            var totalFrames = Math.round(
                ((hours * 3600) + 
                (minutes * 60) + 
                secs) * mainComp.frameRate + 
                frames
            );
            
            return totalFrames;
        } catch(e) {
            alert("Error parsing timestamp: " + timestamp);
            return 0;
        }
    }

    // Function to read JSON file
    function readJSON(file) {
        try {
            var fileObj = new File(file);
            var content = "";
            
            if (fileObj.exists) {
                fileObj.open('r');
                content = fileObj.read();
                fileObj.close();
                return JSON.parse(content);
            }
            return null;
        } catch(e) {
            alert("Error reading JSON file: " + e.toString());
            return null;
        }
    }

    // Function to remove whitespace from string
    function trimString(str) {
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    }

    // Function to read text file
    function readTXT(file) {
        try {
            var fileObj = new File(file);
            var content = [];
            
            if (fileObj.exists) {
                fileObj.open('r');
                while(!fileObj.eof) {
                    var line = fileObj.readln();
                    if (!line) continue;
                    
                    // Expected format: Scene Name|00:00:00.000
                    var parts = line.toString().split('|');
                    if (parts && parts.length === 2) {
                        var sceneName = trimString(parts[0].toString());
                        var timeCode = trimString(parts[1].toString());
                        
                        if (sceneName && timeCode) {
                            content.push({
                                name: sceneName,
                                time: timeCode
                            });
                        }
                    }
                }
                fileObj.close();
                return content;
            }
            return null;
        } catch(e) {
            alert("Error reading TXT file: " + e.toString());
            return null;
        }
    }

    // Function to find layer by name
    function findLayerByName(comp, name) {
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === name) {
                return comp.layer(i);
            }
        }
        return null;
    }
    
    // File selection dialog
    var file = File.openDialog(
        "Select scenes file", 
        "Acceptable Files:*.json;*.txt",
        false
    );
    
    if (!file) {
        alert("No file selected!");
        return;
    }

    // Read scenes based on file extension
    var sceneTimecodes;
    var fileExt = file.name.toString().split('.').pop().toLowerCase();
    
    if (fileExt === "json") {
        sceneTimecodes = readJSON(file);
    } else if (fileExt === "txt") {
        sceneTimecodes = readTXT(file);
    }

    if (!sceneTimecodes || sceneTimecodes.length === 0) {
        alert("No valid scene data found in file!");
        return;
    }
    
    app.beginUndoGroup("Sync Scenes");
    
    try {
        var movedLayers = 0;
        // Place markers and move layers for each scene
        for (var i = 0; i < sceneTimecodes.length; i++) {
            var scene = sceneTimecodes[i];
            if (!scene || !scene.time || !scene.name) continue;
            
            // Convert SRT timestamp to frames
            var frameNumber = srtTimestampToFrames(scene.time);
            if (frameNumber <= 0) continue;
            
            // Create marker at frame time
            var marker = new MarkerValue(scene.name);
            mainComp.markerProperty.setValueAtTime(frameNumber/mainComp.frameRate, marker);

            // Find and move corresponding layer
            var layer = findLayerByName(mainComp, scene.name);
            if (layer) {
                // Store original duration
                var layerDuration = layer.outPoint - layer.inPoint;
                
                // Move layer to marker position
                layer.startTime = frameNumber/mainComp.frameRate;
                
                // Maintain original duration
                layer.outPoint = layer.startTime + layerDuration;
                
                movedLayers++;
            }
        }
        
        alert("Scene sync complete!\nAdded " + sceneTimecodes.length + " markers\nMoved " + movedLayers + " layers");
    } catch(e) {
        alert("Error syncing scenes: " + e.toString());
    }
    
    app.endUndoGroup();
}

// Run the script
syncScenes(); 