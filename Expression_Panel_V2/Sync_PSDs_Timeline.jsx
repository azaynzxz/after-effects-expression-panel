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

    // Helper to extract normalized scene key (e.g., "S1 D.psd" -> "S1", "S02" -> "S2")
    function getSceneKey(str) {
        if (!str) return null;
        var clean = str.replace(/\.[a-z0-9]+$/i, '').replace(/^\s+|\s+$/g, '');
        
        // Match S1, s1, S01, S12, S1_D, S1 D etc.
        var matchS = clean.match(/(?:^|[\s_.\-\/\\])S(\d+)/i);
        if (matchS) {
            return "S" + parseInt(matchS[1], 10);
        }
        
        // Match Scene 1, Scene1, Scene_01
        var matchScene = clean.match(/(?:^|[\s_.\-\/\\])Scene[\s_]*(\d+)/i);
        if (matchScene) {
            return "S" + parseInt(matchScene[1], 10);
        }
        
        // Match standalone numbers e.g. "01", "1"
        var matchNum = clean.match(/\b(\d+)\b/);
        if (matchNum) {
            return "S" + parseInt(matchNum[1], 10);
        }
        
        return null;
    }

    var content = csvFile.read();
    csvFile.close();

    // Split by newlines, handling both \r\n and \n
    var lines = content.replace(/\r\n/g, '\n').split('\n');
    var syncData = {}; // Dictionary: "S1" / "S1 D" -> time in seconds

    // Skip the first line (header: "Scene Name,Start Time")
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].replace(/^\s+|\s+$/g, '');
        if (line.length === 0) continue;
        
        var parts = line.split(',');
        if (parts.length >= 2) {
            var sceneName = parts[0].replace(/^\s+|\s+$/g, '');
            var timeStr = parts[1].replace(/^\s+|\s+$/g, '');
            var timeInSeconds = parseTimeToSeconds(timeStr, frameRate);
            
            // Allow for exact base name (e.g. "S1 D")
            var cleanSceneName = sceneName.replace(/\.psd$/i, '').replace(/^\s+|\s+$/g, '');
            syncData[cleanSceneName] = timeInSeconds;

            // Also store by normalized scene key (e.g., "S1")
            var sceneKey = getSceneKey(sceneName);
            if (sceneKey && syncData[sceneKey] === undefined) {
                syncData[sceneKey] = timeInSeconds;
            }
        }
    }

    var matchedCount = 0;
    var skippedLockedCount = 0;

    // Iterate through layers in the active comp
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        
        // Skip locked layers (e.g., locked scenes worked on by other illustrators)
        if (layer.locked) {
            skippedLockedCount++;
            continue;
        }
        
        // 1. Try exact base name match (without .psd)
        var baseName = layer.name.replace(/\.psd$/i, '').replace(/^\s+|\s+$/g, '');
        var matchedTime = syncData[baseName];

        // 2. Fallback: match by scene key (e.g., "S1 D.psd" -> "S1")
        if (matchedTime === undefined) {
            var layerKey = getSceneKey(layer.name);
            if (layerKey && syncData[layerKey] !== undefined) {
                matchedTime = syncData[layerKey];
            }
        }
        
        if (matchedTime !== undefined) {
            layer.startTime = matchedTime;
            matchedCount++;
        }
    }

    app.endUndoGroup();

    var msg = "Sync complete.\nMatched and moved " + matchedCount + " layers to their designated timestamps based on a " + frameRate + "fps framerate.";
    if (skippedLockedCount > 0) {
        msg += "\nSkipped " + skippedLockedCount + " locked layer(s).";
    }
    alert(msg);
})();
