// List Jumper - Jump to timeline positions based on XLSX word data
// Developed for After Effects

(function (thisObj) {

    // Global variables
    var searchData = [];
    var listbox;
    var searchInput;
    var statusText;
    var filePathText;
    var selectedFile = null;
    var currentPlayheadTime = -1;
    var searchForwardOnlyCheckbox = { value: true };
    var autoMoveCheckbox = { value: false };
    var exactJumpCheckbox = { value: false };
    var addMarkerCheckbox = { value: true };
    var markerCountLabel = { text: "Count: 0" };
    var calibrationInput = { text: "0" };
    var markerCount = 0; // Counter for marker comments (1, 2, 3...)
    var isProgrammaticSelection = false; // Flag to prevent double execution
    var isJumping = false; // Flag to prevent jumpToTime from executing multiple times
    var isMovingLayer = false; // Flag to prevent moveNextLayerToCurrentTime from executing multiple times

    // Helper: check if After Effects API is accessible (no modal dialog blocking)
    // Returns true if AE is ready to accept script commands
    function canAccessAE() {
        try {
            var test = app.project.numItems;
            return true;
        } catch (e) {
            return false;
        }
    }

    // Helper: safely execute a function that requires AE API access
    // Shows a status message if AE is busy (e.g., Auto Save dialog is open)
    function safeExecute(fn) {
        if (!canAccessAE()) {
            try { statusText.text = "⚠ AE is busy (close any dialog first)"; } catch (e) { }
            // Reset all state flags to prevent stuck UI
            isProgrammaticSelection = false;
            isJumping = false;
            isMovingLayer = false;
            return false;
        }
        try {
            fn();
            return true;
        } catch (error) {
            // Reset flags on unexpected error too
            isProgrammaticSelection = false;
            isJumping = false;
            isMovingLayer = false;
            try { statusText.text = "Error: " + error.message; } catch (e) { }
            return false;
        }
    }

    // Helper function for trim (not available in ExtendScript)
    function trim(str) {
        return str.replace(/^\s+|\s+$/g, '');
    }

    // Convert timecode string to seconds
    // Supports formats: HH:MM:SS:FF, HH:MM:SS.mmm, or decimal seconds
    function timecodeToSeconds(timecodeStr) {
        // Remove whitespace and quotes
        timecodeStr = trim(timecodeStr).replace(/["']/g, '');

        // Check if it contains colons (timecode format)
        if (timecodeStr.indexOf(':') !== -1) {
            var parts = timecodeStr.split(':');

            if (parts.length >= 3) {
                var hours = parseInt(parts[0]) || 0;
                var minutes = parseInt(parts[1]) || 0;
                var seconds = parseInt(parts[2]) || 0;
                var frames = 0;

                // Handle frames/milliseconds (4th part)
                if (parts.length >= 4) {
                    // Assume 30 fps for frame conversion
                    frames = parseInt(parts[3]) || 0;
                    frames = frames / 30.0; // Convert frames to seconds
                }

                return (hours * 3600) + (minutes * 60) + seconds + frames;
            }
        }

        // Otherwise try to parse as decimal seconds
        return parseFloat(timecodeStr) || 0;
    }

    // Main function to create the List Jumper window
    function createListJumperWindow(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "List Jumper", undefined);
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 5;
        win.margins = 8;
        win.preferredSize.width = 195;

        // File selector group
        var fileGroup = win.add("group");
        fileGroup.orientation = "row";
        fileGroup.alignChildren = ["left", "center"];
        fileGroup.spacing = 5;

        var fileBtn = fileGroup.add("button", undefined, "File");
        fileBtn.preferredSize.width = 50;
        fileBtn.preferredSize.height = 22;

        var lastFileBtn = fileGroup.add("button", undefined, "Last");
        lastFileBtn.preferredSize.width = 40;
        lastFileBtn.preferredSize.height = 22;
        lastFileBtn.helpTip = "Open last opened file";

        filePathText = fileGroup.add("statictext", undefined, "No file");
        filePathText.preferredSize.width = 75;
        filePathText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        // Search container
        var searchContainer = win.add("group");
        searchContainer.orientation = "column";
        searchContainer.alignChildren = ["fill", "top"];
        searchContainer.spacing = 3;

        // Search input row
        var searchInputRow = searchContainer.add("group");
        searchInputRow.orientation = "row";
        searchInputRow.alignChildren = ["left", "center"];
        searchInputRow.spacing = 5;

        var searchLabel = searchInputRow.add("statictext", undefined, "Search:");
        searchLabel.preferredSize.width = 45;

        searchInput = searchInputRow.add("edittext", undefined, "");
        searchInput.preferredSize.width = 125;
        searchInput.preferredSize.height = 22;
        searchInput.helpTip = "Type to search words, then press Enter. Press 1-9 to jump to results.";

        // Buttons row (below input)
        var buttonsRow = searchContainer.add("group");
        buttonsRow.orientation = "row";
        buttonsRow.alignChildren = ["left", "center"];
        buttonsRow.spacing = 5;

        var searchBtn = buttonsRow.add("button", undefined, "Search");
        searchBtn.preferredSize.width = 55;
        searchBtn.preferredSize.height = 22;

        var showAllBtn = buttonsRow.add("button", undefined, "Show All");
        showAllBtn.preferredSize.width = 55;
        showAllBtn.preferredSize.height = 22;

        var settingsBtn = buttonsRow.add("button", undefined, "Settings");
        settingsBtn.preferredSize.width = 55;
        settingsBtn.preferredSize.height = 22;
        settingsBtn.helpTip = "Open settings menu";

        settingsBtn.onClick = function () {
            var dlg = new Window("dialog", "Settings");
            dlg.orientation = "column";
            dlg.alignChildren = ["left", "top"];
            dlg.spacing = 8;
            dlg.margins = 15;

            var cbSearchForward = dlg.add("checkbox", undefined, "Search Forward Only");
            cbSearchForward.value = searchForwardOnlyCheckbox.value;

            var cbAutoMove = dlg.add("checkbox", undefined, "Auto-move next layer to time");
            cbAutoMove.value = autoMoveCheckbox.value;

            var cbExactJump = dlg.add("checkbox", undefined, "Exact Jump");
            cbExactJump.value = exactJumpCheckbox.value;

            var markerGroup = dlg.add("group");
            markerGroup.orientation = "row";
            var cbAddMarker = markerGroup.add("checkbox", undefined, "Add Marker");
            cbAddMarker.value = addMarkerCheckbox.value;

            var markerLabel = markerGroup.add("statictext", undefined, "Count: " + markerCount);
            markerLabel.preferredSize.width = 55;

            var btnResetMarker = markerGroup.add("button", undefined, "Reset");
            btnResetMarker.preferredSize.width = 45;
            btnResetMarker.onClick = function () {
                markerCount = 0;
                markerLabel.text = "Count: 0";
                markerCountLabel.text = "Count: 0";
            };

            var calGroup = dlg.add("group");
            calGroup.orientation = "row";
            calGroup.add("statictext", undefined, "Calibration:");
            var calInput = calGroup.add("edittext", undefined, calibrationInput.text);
            calInput.preferredSize.width = 40;
            calGroup.add("statictext", undefined, "frames");

            var btnGroup = dlg.add("group");
            btnGroup.orientation = "row";
            btnGroup.alignChildren = ["right", "center"];
            btnGroup.alignment = ["fill", "bottom"];
            btnGroup.margins = [0, 10, 0, 0];
            var btnCancel = btnGroup.add("button", undefined, "Cancel");
            var btnOk = btnGroup.add("button", undefined, "OK");

            btnCancel.onClick = function () { dlg.close(); };
            btnOk.onClick = function () {
                searchForwardOnlyCheckbox.value = cbSearchForward.value;
                autoMoveCheckbox.value = cbAutoMove.value;
                exactJumpCheckbox.value = cbExactJump.value;
                addMarkerCheckbox.value = cbAddMarker.value;
                calibrationInput.text = calInput.text;
                dlg.close();
                safeExecute(function () { filterAndDisplayResults(searchInput.text); });
            };

            dlg.show();
        };

        // Results list
        var listLabel = win.add("statictext", undefined, "Results:");
        listLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        listbox = win.add("listbox", undefined, [], { multiselect: false });
        listbox.preferredSize.width = 175;
        listbox.preferredSize.height = 100;

        // Status bar
        var statusGroup = win.add("group");
        statusGroup.orientation = "row";
        statusGroup.alignChildren = ["fill", "center"];

        statusText = statusGroup.add("statictext", undefined, "Ready");
        statusText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 8);
        statusText.alignment = ["fill", "center"];

        // Event handlers
        fileBtn.onClick = function () {
            safeExecute(function () { selectFile(); });
        };

        lastFileBtn.onClick = function () {
            safeExecute(function () { openLastFile(); });
        };

        // Re-adding addEventListener but with deferred execution to conquer Line 0 crashes!
        searchInput.addEventListener('keydown', function (event) {
            var keyName = event.keyName;

            if (keyName === "Enter") {
                event.preventDefault();
                event.stopPropagation();

                // By decoupling the execution with a timeout, OS-level key presses won't crash 
                // the DOM wrapper while a modal dialog like Auto-Save is rendering.
                app.setTimeout(function () {
                    safeExecute(function () {
                        filterAndDisplayResults(searchInput.text);
                        try {
                            if (listbox.items.length > 0) {
                                listbox.active = true;
                            }
                        } catch (e) { }
                    });
                }, 20);
            } else {
                event.stopPropagation(); // prevent window from hijacking numbers when typing
            }
        });

        searchBtn.onClick = function () {
            safeExecute(function () { filterAndDisplayResults(searchInput.text); });
        };

        showAllBtn.onClick = function () {
            searchInput.text = "";
            safeExecute(function () { filterAndDisplayResults(""); });
        };



        listbox.onChange = function () {
            // Skip if this is a programmatic selection (from keyboard shortcut)
            if (isProgrammaticSelection) {
                isProgrammaticSelection = false;
                return;
            }

            var sel = this.selection;
            if (sel !== null) {
                safeExecute(function () {
                    // Use exact jump time if checkbox is enabled, otherwise use next word time
                    var timeToJump = exactJumpCheckbox.value ? sel.matchTime : sel.timeValue;
                    jumpToTime(timeToJump);
                    searchInput.text = "";
                    searchInput.active = true;
                });
            }
        };

        // Helper to process 1-9 key presses and safely jump
        function handleNumberKeyJump(event, listboxRef) {
            var keyName = event.keyName;
            if (listboxRef.items.length > 0 && keyName) {
                var numKey = null;
                if (keyName.length === 1) {
                    var charCode = keyName.charCodeAt(0);
                    if (charCode >= 49 && charCode <= 57) { // '1' to '9'
                        numKey = charCode - 48;
                    }
                }

                if (numKey !== null) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (isJumping) return;

                    var targetIndex = numKey - 1;
                    if (targetIndex >= 0 && targetIndex < listboxRef.items.length) {
                        // Defer completely! Solves the "Can not run a script at line 0" Auto-Save freeze!
                        app.setTimeout(function () {
                            safeExecute(function () {
                                isProgrammaticSelection = true;
                                listboxRef.selection = targetIndex;
                                var selectedItem = listboxRef.items[targetIndex];
                                if (selectedItem) {
                                    var timeToJump = exactJumpCheckbox.value ? selectedItem.matchTime : selectedItem.timeValue;
                                    jumpToTime(timeToJump);
                                    searchInput.text = "";
                                    searchInput.active = true;
                                }
                            });
                        }, 20);
                    }
                }
            }
        }

        // Add keyboard handler to listbox for shortcuts
        listbox.addEventListener('keydown', function (event) {
            handleNumberKeyJump(event, this);
        });

        // Keyboard shortcuts: Press 1-9 anywhere in the window
        win.addEventListener('keydown', function (event) {
            handleNumberKeyJump(event, listbox);
        });

        win.layout.layout(true);
        return win;
    }

    // File selection
    function selectFile() {
        try {
            var file = File.openDialog("Select CSV file", "*.csv");

            if (file) {
                selectedFile = file;
                filePathText.text = file.name;
                statusText.text = "Loading file...";
                readCSVFile(file);

                // Save last file path
                if (app.settings) {
                    app.settings.saveSetting("ListJumper", "LastFilePath", file.fsName);
                }
            }
        } catch (error) {
            statusText.text = "Error selecting file: " + error.message;
            alert("Error selecting file: " + error.message);
        }
    }

    // Open last file
    function openLastFile() {
        try {
            if (app.settings && app.settings.haveSetting("ListJumper", "LastFilePath")) {
                var lastPath = app.settings.getSetting("ListJumper", "LastFilePath");
                var file = new File(lastPath);
                if (file.exists) {
                    selectedFile = file;
                    filePathText.text = file.name;
                    statusText.text = "Loading file...";
                    readCSVFile(file);
                } else {
                    statusText.text = "Last file not found.";
                    alert("Last opened file no longer exists at:\n" + lastPath);
                }
            } else {
                statusText.text = "No last file saved.";
                alert("No last file saved.");
            }
        } catch (error) {
            statusText.text = "Error loading last file: " + error.message;
            alert("Error loading last file: " + error.message);
        }
    }

    // Read CSV file (simpler format)
    function readCSVFile(file) {
        try {
            file.encoding = "UTF-8";
            file.open("r");
            var content = file.read();
            file.close();

            parseCSVContent(content);
            statusText.text = "Loaded " + searchData.length + " entries from CSV";
            filterAndDisplayResults("");

        } catch (error) {
            statusText.text = "Error reading CSV: " + error.message;
            alert("Error reading CSV file: " + error.message);
        }
    }

    // Parse CSV content
    function parseCSVContent(content) {
        searchData = [];
        var lines = content.split('\n');

        if (lines.length < 2) {
            alert("CSV file appears to be empty or invalid");
            return;
        }

        // Parse header
        var header = parseCSVLine(lines[0]);
        var startIdx = -1;
        var wordIdx = -1;

        // Find 'start' and 'word' columns
        for (var i = 0; i < header.length; i++) {
            var col = header[i].toLowerCase().replace(/\s+/g, '');
            if (col === "start") startIdx = i;
            if (col === "word") wordIdx = i;
        }

        if (startIdx === -1 || wordIdx === -1) {
            alert("Could not find 'start' and 'word' columns in CSV header.\nFound columns: " + header.join(", "));
            return;
        }

        // Parse data rows
        var validRows = 0;
        var skippedRows = 0;

        for (var i = 1; i < lines.length; i++) {
            if (trim(lines[i]) === "") continue;

            var cells = parseCSVLine(lines[i]);
            if (cells.length > Math.max(startIdx, wordIdx)) {
                var timeValue = timecodeToSeconds(cells[startIdx]);
                var word = trim(cells[wordIdx]);

                if (!isNaN(timeValue) && timeValue >= 0 && word !== "") {
                    searchData.push({
                        time: timeValue,
                        word: word
                    });
                    validRows++;
                } else {
                    skippedRows++;
                }
            }
        }

        // Show parsing summary
        if (searchData.length > 0) {
            var firstTime = searchData[0].time;
            var lastTime = searchData[searchData.length - 1].time;
            statusText.text = "Parsed " + validRows + " rows (time range: " +
                firstTime.toFixed(3) + "s to " + lastTime.toFixed(3) + "s)";
        }
    }

    // Parse a single CSV line (handles quoted fields)
    function parseCSVLine(line) {
        var result = [];
        var current = "";
        var inQuotes = false;

        for (var i = 0; i < line.length; i++) {
            var ch = line.charAt(i);

            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                result.push(current);
                current = "";
            } else {
                current += ch;
            }
        }
        result.push(current);

        // Clean up the result
        for (var i = 0; i < result.length; i++) {
            result[i] = result[i].replace(/^["'\s]+|["'\s]+$/g, '');
        }

        return result;
    }



    // Helper function to find main_comp
    function findMainComp() {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === "main_comp") {
                return item;
            }
        }
        return null;
    }

    // Helper function to get active composition (fallback to main_comp)
    function getTargetComp() {
        var activeComp = app.project.activeItem;
        if (activeComp && activeComp instanceof CompItem) {
            return activeComp;
        }
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === "main_comp") {
                return item;
            }
        }
        return null;
    }

    // Get current playhead time from main_comp (always use main_comp for search filtering)
    function getCurrentPlayheadTime() {
        try {
            var comp = findMainComp();
            if (comp) {
                return comp.time;
            }
        } catch (error) {
            // Ignore errors (e.g., when modal dialog is active)
            // Return -1 to indicate playhead time is unavailable
        }
        return -1;
    }

    // Find closest item index to given time
    function findClosestIndex(time) {
        if (searchData.length === 0 || time < 0) return -1;

        var closestIdx = 0;
        var minDiff = Math.abs(searchData[0].time - time);

        for (var i = 1; i < searchData.length; i++) {
            var diff = Math.abs(searchData[i].time - time);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }

        return closestIdx;
    }

    // Filter and display results based on search
    function filterAndDisplayResults(searchTerm) {
        listbox.removeAll();

        if (searchData.length === 0) {
            statusText.text = "No data loaded";
            return;
        }

        // Auto-update playhead position
        // Wrap in try-catch to handle modal dialog conflicts
        try {
            currentPlayheadTime = getCurrentPlayheadTime();
        } catch (error) {
            // If we can't get playhead time (e.g., modal dialog is active),
            // use the last known time or -1
            statusText.text = "AE busy, using cached playhead position";
        }

        var filtered = [];
        searchTerm = searchTerm.toLowerCase();
        var searchForwardOnly = searchForwardOnlyCheckbox.value;

        // Find matches and store their indices
        for (var i = 0; i < searchData.length; i++) {
            // Check if word matches search term
            var wordMatches = (searchTerm === "" || searchData[i].word.toLowerCase().indexOf(searchTerm) !== -1);

            // If search forward only is enabled, also check if time is at or after playhead
            var timeMatches = true;
            if (searchForwardOnly && currentPlayheadTime >= 0) {
                timeMatches = (searchData[i].time >= currentPlayheadTime);
            }

            if (wordMatches && timeMatches) {
                filtered.push({
                    data: searchData[i],
                    index: i
                });
            }
        }

        // Find closest to playhead
        var closestIdx = findClosestIndex(currentPlayheadTime);
        var exactJumpMode = exactJumpCheckbox.value;

        // Display based on exact jump mode
        for (var i = 0; i < filtered.length; i++) {
            var matchIdx = filtered[i].index;
            var matchWord = filtered[i].data.word;

            // Check if this match word is closest to playhead
            var isClosest = (matchIdx === closestIdx || matchIdx === closestIdx - 1 || matchIdx === closestIdx - 2);
            var marker = isClosest ? "●" : " ";

            // Store both match time and next time
            var matchTime = filtered[i].data.time;
            var nextTime = null;
            var nextWord = null;
            var rowNumber = (i + 1) + ". "; // Add row number label (1, 2, 3, etc.)
            var displayText = "";

            if (exactJumpMode) {
                // Exact jump mode: show only match word + next 3 words
                var exactWords = [matchWord];

                // Get next 3 words
                for (var j = 1; j <= 3; j++) {
                    var nextIdx = matchIdx + j;
                    if (nextIdx < searchData.length) {
                        exactWords.push(searchData[nextIdx].word);
                    }
                }

                // Display format: "1. ● match word1 word2 word3 > [timecode]"
                displayText = rowNumber + marker + " " + exactWords.join(" ");

                // In exact mode, we jump to match time, but show next word's timecode for reference
                var nextIdx = matchIdx + 1;
                if (nextIdx < searchData.length) {
                    nextTime = searchData[nextIdx].time;
                    nextWord = searchData[nextIdx].word;
                    displayText += " > " + formatTime(matchTime); // Show match word's time
                } else {
                    displayText += " > " + formatTime(matchTime) + " (end)";
                }
            } else {
                // Regular mode: show prev2 prev1 match > [timecode] nextword
                var contextWords = [];

                // Get 2 previous words
                for (var j = 2; j >= 1; j--) {
                    var prevIdx = matchIdx - j;
                    if (prevIdx >= 0) {
                        contextWords.push(searchData[prevIdx].word);
                    }
                }

                // Add match word
                contextWords.push(matchWord);

                // Get next word
                var nextIdx = matchIdx + 1;
                if (nextIdx < searchData.length) {
                    nextTime = searchData[nextIdx].time;
                    nextWord = searchData[nextIdx].word;

                    // Display format: "1. ● prev2 prev1 match > [timecode] nextword"
                    displayText = rowNumber + marker + " " + contextWords.join(" ") + " > " + formatTime(nextTime) + " " + nextWord;
                } else {
                    // No next word available
                    displayText = rowNumber + marker + " " + contextWords.join(" ") + " > (end)";
                }
            }

            var item = listbox.add("item", displayText);
            // Store both times - exact jump checkbox will determine which to use
            item.matchTime = matchTime; // Time of the matched word
            item.nextTime = nextTime !== null ? nextTime : matchTime; // Time of next word (or match if no next)
            item.timeValue = nextTime !== null ? nextTime : matchTime; // Default: next word (current behavior)
        }

        var statusMsg = "Showing " + filtered.length + " matches";
        if (filtered.length > 0) {
            statusMsg += " | Press 1-" + Math.min(filtered.length, 9) + " to jump";
        }
        if (currentPlayheadTime >= 0) {
            statusMsg += " | ● = " + formatTime(currentPlayheadTime);
            if (searchForwardOnly) {
                statusMsg += " (forward only)";
            }
        }
        statusText.text = statusMsg;
    }

    // Format time as HH:MM:SS.mmm
    function formatTime(seconds) {
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var secs = Math.floor(seconds % 60);
        var ms = Math.floor((seconds % 1) * 1000);

        function pad(num, size) {
            var s = num + "";
            while (s.length < size) s = "0" + s;
            return s;
        }

        return pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(secs, 2) + "." + pad(ms, 3);
    }

    // Convert a main_comp time to the local time inside a precomp
    function getPrecompLocalTime(precomp, mainComp, mainTime) {
        if (!mainComp || precomp === mainComp) return mainTime;

        var fallbackLocalTime = mainTime;
        var foundAny = false;

        for (var i = 1; i <= mainComp.numLayers; i++) {
            var layer = mainComp.layer(i);
            if (layer.source && layer.source === precomp) {
                var localTime;
                if (layer.timeRemapEnabled) {
                    localTime = layer.property("ADBE Time Remapping").valueAtTime(mainTime, false);
                } else {
                    localTime = (mainTime - layer.startTime) * (100 / layer.stretch);
                }

                if (!foundAny) {
                    fallbackLocalTime = localTime;
                    foundAny = true;
                }

                // Focus on the instance of the precomp that actually overlaps the target word
                if (mainTime >= layer.inPoint && mainTime <= layer.outPoint) {
                    return localTime;
                }
            }
        }

        return fallbackLocalTime;
    }

    // Jump to time in target comp
    function jumpToTime(seconds) {
        // Prevent double execution
        if (isJumping) {
            return;
        }

        try {
            isJumping = true; // Set flag to prevent re-entry

            // Debug: check what value we received
            if (isNaN(seconds) || seconds === null || seconds === undefined) {
                statusText.text = "Invalid time value: " + seconds;
                alert("Invalid time value received: " + seconds);
                isJumping = false;
                return;
            }

            var comp = getTargetComp();

            if (!comp) {
                statusText.text = "Could not find active composition or 'main_comp'";
                isJumping = false;
                return;
            }

            // Apply calibration offset (in frames)
            var calibrationFrames = parseFloat(calibrationInput.text) || 0;
            var frameRate = comp.frameRate || 30; // Get comp frame rate, default to 30fps
            var calibrationSeconds = calibrationFrames / frameRate;
            seconds += calibrationSeconds;

            // Update main comp playhead FIRST (using the global time string from CSV)
            var mainComp = findMainComp();
            if (mainComp) {
                var clampedMain = Math.max(0, Math.min(seconds, mainComp.duration));
                if (mainComp !== comp) {
                    mainComp.time = clampedMain;
                } else {
                    seconds = clampedMain; // Clamp original if working purely in main_comp
                }
            }

            // Convert global CSV time to local precomp time for the viewer and marker
            var localSeconds = getPrecompLocalTime(comp, mainComp, seconds);

            // Clamp to precomposition duration
            localSeconds = Math.max(0, Math.min(localSeconds, comp.duration));

            // Jump to time in target comp
            comp.time = localSeconds;

            // Add composition marker if enabled
            if (addMarkerCheckbox.value) {
                try {
                    markerCount++;
                    var markerValue = new MarkerValue(markerCount.toString());
                    comp.markerProperty.setValueAtTime(localSeconds, markerValue);
                    // Update the counter label in the UI
                    try { markerCountLabel.text = "Count: " + markerCount; } catch (e) { }
                } catch (markerError) {
                    // If marker already exists at this exact time, skip silently
                }
            }

            // Auto-move layer if enabled
            if (autoMoveCheckbox.value) {
                moveNextLayerToCurrentTime(comp);
            } else {
                var calMessage = calibrationFrames !== 0 ? " (cal: " + calibrationFrames + "f)" : "";
                var markerMessage = addMarkerCheckbox.value ? " | Marker #" + markerCount : "";
                statusText.text = "Jumped to " + formatTime(seconds) + " in " + comp.name + calMessage + markerMessage;
            }

            isJumping = false; // Reset flag

        } catch (error) {
            isJumping = false; // Reset flag on error
            isProgrammaticSelection = false; // Reset selection flag too
            // Check if the error is due to a modal dialog
            if (error.message && error.message.indexOf("modal") !== -1) {
                statusText.text = "⚠ AE is busy (close any dialog first)";
            } else {
                statusText.text = "Error jumping to time: " + error.message;
            }
        }
    }

    // Function to move next layer to current time
    function moveNextLayerToCurrentTime(comp) {
        // Prevent double execution
        if (isMovingLayer) {
            return;
        }

        try {
            isMovingLayer = true; // Set flag to prevent re-entry

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                isMovingLayer = false;
                return; // No layer selected, skip auto-move
            }

            // Get the first selected layer only (to avoid moving multiple layers)
            var currentLayer = selectedLayers[0];
            var currentLayerIndex = currentLayer.index;


            // Find the layer above (layer above = lower index, exactly 1 above)
            var nextLayerIndex = currentLayerIndex - 1;

            // Make sure there's exactly one layer above (index >= 1 means at least layer 1 exists)
            if (nextLayerIndex >= 1) {
                var nextLayer = comp.layer(nextLayerIndex);


                // Move only the one layer above to current time
                nextLayer.startTime = comp.time;


                // Deselect the current layer and select the moved layer
                // This creates a sequential workflow: Layer 3 selected → moves Layer 2 and selects it
                // → next shortcut moves Layer 1 and selects it, etc.
                currentLayer.selected = false;
                nextLayer.selected = true;


                statusText.text = "Jumped to " + formatTime(comp.time) + " in " + comp.name + " | Moved '" + nextLayer.name + "' to time and selected it";
            } else {
                // No layer above, just show normal jump message
                statusText.text = "Jumped to " + formatTime(comp.time) + " in " + comp.name + " | No layer above to move";
            }

            isMovingLayer = false; // Reset flag

        } catch (error) {
            isMovingLayer = false; // Reset flag on error
            // If auto-move fails, just continue with normal jump
            statusText.text = "Jumped to " + formatTime(comp.time) + " | Auto-move error: " + error.toString();
        }
    }

    // Start the script
    var myPanel = createListJumperWindow(thisObj);
    if (myPanel != null && myPanel instanceof Window) {
        myPanel.center();
        myPanel.show();
    }

})(this);

