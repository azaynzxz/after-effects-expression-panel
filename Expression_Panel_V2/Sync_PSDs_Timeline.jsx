// Sync_PSDs_Timeline.jsx
// This script reads the generated Timeline Sync.csv and sets the startTime of layers in the active composition.
// Usage: Run this script in After Effects with a composition active.

(function() {
    app.beginUndoGroup("Sync PSDs to Timeline");

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select an active composition first.");
        return;
    }

    var csvFile = File.openDialog("Select Timeline Sync CSV file", "*.csv");
    if (!csvFile) return;

    if (!csvFile.open("r")) {
        alert("Failed to open the file.");
        return;
    }

    // Use the active composition's framerate for time calculation
    var frameRate = comp.frameRate;

    // Helper to parse HH:MM:SS:FF format into seconds
    function parseTimeToSeconds(timeStr, fps) {
        var parts = timeStr.split(":");
        if (parts.length >= 4) {
            var h = parseInt(parts[0], 10) || 0;
            var m = parseInt(parts[1], 10) || 0;
            var s = parseInt(parts[2], 10) || 0;
            var f = parseInt(parts[3], 10) || 0;
            return h * 3600 + m * 60 + s + (f / fps);
        }
        return 0;
    }

    var content = csvFile.read();
    csvFile.close();

    // Split by newlines, handling both \r\n and \n
    var lines = content.replace(/\r\n/g, '\n').split('\n');
    var syncData = {}; // Dictionary: "S1" -> time in seconds

    // Skip the first line (header: "Scene Name,Start Time")
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].replace(/^\s+|\s+$/g, '');
        if (line.length === 0) continue;
        
        var parts = line.split(',');
        if (parts.length >= 2) {
            var sceneName = parts[0].replace(/^\s+|\s+$/g, '');
            var timeStr = parts[1].replace(/^\s+|\s+$/g, '');
            var timeInSeconds = parseTimeToSeconds(timeStr, frameRate);
            
            // Allow for variations like "S1.psd" just in case, but map to the base "S1"
            var cleanSceneName = sceneName.replace(/\.psd$/i, '');
            syncData[cleanSceneName] = timeInSeconds;
        }
    }

    var matchedCount = 0;
    // Iterate through layers in the active comp
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        
        // Strip out any .psd extension in case the layer retains the filename
        var baseName = layer.name.replace(/\.psd$/i, '').replace(/^\s+|\s+$/g, '');
        
        if (syncData[baseName] !== undefined) {
            layer.startTime = syncData[baseName];
            matchedCount++;
        }
    }

    app.endUndoGroup();
    alert("Sync complete.\nMatched and moved " + matchedCount + " layers to their designated timestamps based on a " + frameRate + "fps framerate.");
})();
