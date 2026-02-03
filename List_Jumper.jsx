// List Jumper - Jump to timeline positions based on XLSX word data
// Developed for After Effects

(function () {

    // Global variables
    var searchData = [];
    var listbox;
    var searchInput;
    var statusText;
    var filePathText;
    var selectedFile = null;
    var currentPlayheadTime = -1;
    var searchForwardOnlyCheckbox;
    var autoMoveCheckbox;
    var exactJumpCheckbox;
    var calibrationInput; // Calibration input field
    var isProgrammaticSelection = false; // Flag to prevent double execution
    var isJumping = false; // Flag to prevent jumpToTime from executing multiple times
    var isMovingLayer = false; // Flag to prevent moveNextLayerToCurrentTime from executing multiple times

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
    function createListJumperWindow() {
        var win = new Window("palette", "List Jumper", undefined);
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 5;
        win.margins = 8;
        win.preferredSize.width = 350;

        // File selector group
        var fileGroup = win.add("group");
        fileGroup.orientation = "row";
        fileGroup.alignChildren = ["left", "center"];
        fileGroup.spacing = 5;

        var fileBtn = fileGroup.add("button", undefined, "File");
        fileBtn.preferredSize.width = 50;
        fileBtn.preferredSize.height = 22;

        filePathText = fileGroup.add("statictext", undefined, "No file");
        filePathText.preferredSize.width = 280;
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
        searchInput.preferredSize.width = 285;
        searchInput.preferredSize.height = 22;
        searchInput.helpTip = "Type to search words, then press Enter. Press 1-9 to jump to results.";

        // Buttons row (below input)
        var buttonsRow = searchContainer.add("group");
        buttonsRow.orientation = "row";
        buttonsRow.alignChildren = ["right", "center"];
        buttonsRow.spacing = 5;

        var searchBtn = buttonsRow.add("button", undefined, "Search");
        searchBtn.preferredSize.width = 60;
        searchBtn.preferredSize.height = 22;

        var showAllBtn = buttonsRow.add("button", undefined, "Show All");
        showAllBtn.preferredSize.width = 60;
        showAllBtn.preferredSize.height = 22;

        // Search direction checkbox
        var searchDirectionRow = searchContainer.add("group");
        searchDirectionRow.orientation = "row";
        searchDirectionRow.alignChildren = ["left", "center"];
        searchDirectionRow.spacing = 5;

        searchForwardOnlyCheckbox = searchDirectionRow.add("checkbox", undefined, "Search Forward Only");
        searchForwardOnlyCheckbox.value = true; // Default: search forward (downward)
        searchForwardOnlyCheckbox.helpTip = "When checked, only shows results at or after current playhead time";
        searchForwardOnlyCheckbox.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        // Auto-move layer checkbox
        var autoMoveRow = searchContainer.add("group");
        autoMoveRow.orientation = "row";
        autoMoveRow.alignChildren = ["left", "center"];
        autoMoveRow.spacing = 5;

        autoMoveCheckbox = autoMoveRow.add("checkbox", undefined, "Auto-move next layer to time");
        autoMoveCheckbox.value = false; // Default: disabled
        autoMoveCheckbox.helpTip = "When enabled, automatically move the layer above the selected one to the jumped time";
        autoMoveCheckbox.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        // Exact jump checkbox
        var exactJumpRow = searchContainer.add("group");
        exactJumpRow.orientation = "row";
        exactJumpRow.alignChildren = ["left", "center"];
        exactJumpRow.spacing = 5;

        exactJumpCheckbox = exactJumpRow.add("checkbox", undefined, "Exact Jump");
        exactJumpCheckbox.value = false; // Default: disabled (jump to next word)
        exactJumpCheckbox.helpTip = "When enabled, jump to the matched word's time instead of the next word's time";
        exactJumpCheckbox.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        // Calibration row
        var calibrationRow = searchContainer.add("group");
        calibrationRow.orientation = "row";
        calibrationRow.alignChildren = ["left", "center"];
        calibrationRow.spacing = 5;

        var calLabel = calibrationRow.add("statictext", undefined, "Calibration:");
        calLabel.preferredSize.width = 65;
        calLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);

        calibrationInput = calibrationRow.add("edittext", undefined, "0");
        calibrationInput.preferredSize.width = 50;
        calibrationInput.preferredSize.height = 22;
        calibrationInput.helpTip = "Frame offset (+/-) for all jumps";

        var framesLabel = calibrationRow.add("statictext", undefined, "frames");
        framesLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        var calPlusBtn = calibrationRow.add("button", undefined, "+1");
        calPlusBtn.preferredSize.width = 35;
        calPlusBtn.preferredSize.height = 22;
        calPlusBtn.helpTip = "Add 1 frame to calibration";
        calPlusBtn.onClick = function () {
            var current = parseFloat(calibrationInput.text) || 0;
            calibrationInput.text = (current + 1).toString();
        };

        var calMinusBtn = calibrationRow.add("button", undefined, "-1");
        calMinusBtn.preferredSize.width = 35;
        calMinusBtn.preferredSize.height = 22;
        calMinusBtn.helpTip = "Subtract 1 frame from calibration";
        calMinusBtn.onClick = function () {
            var current = parseFloat(calibrationInput.text) || 0;
            calibrationInput.text = (current - 1).toString();
        };

        var calResetBtn = calibrationRow.add("button", undefined, "Reset");
        calResetBtn.preferredSize.width = 45;
        calResetBtn.preferredSize.height = 22;
        calResetBtn.helpTip = "Reset calibration to 0";
        calResetBtn.onClick = function () {
            calibrationInput.text = "0";
        };

        // Results list
        var listLabel = win.add("statictext", undefined, "Results:");
        listLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        listbox = win.add("listbox", undefined, [], { multiselect: false });
        listbox.preferredSize.width = 334;
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
            selectFile();
        };

        // Search on Enter key instead of real-time to avoid lag
        // Also handle number keys (1-9) for shortcuts after Enter
        searchInput.addEventListener('keydown', function (event) {
            var keyName = event.keyName;

            if (keyName === "Enter") {
                event.preventDefault();

                // Safety check: Don't execute if AE has a modal dialog open
                try {
                    // Test if we can access AE API (will fail if modal dialog is active)
                    var testAccess = app.project.numItems;

                    // If we get here, AE is accessible - proceed with search
                    filterAndDisplayResults(searchInput.text);

                    // After Enter, focus the listbox so shortcuts work immediately
                    try {
                        if (listbox.items.length > 0) {
                            // Force UI update first, then set focus
                            win.update();
                            listbox.active = true;
                        }
                    } catch (e) {
                        // Ignore if focus fails - shortcuts will still work via search input handler
                    }
                } catch (modalError) {
                    // Modal dialog is active - show message and don't execute
                    statusText.text = "Please close AE dialog first";
                    return;
                }
            } else {
                // Handle number keys (1-9) for shortcuts even when search input is focused
                // Check if results exist
                if (listbox.items.length > 0) {
                    var numKey = null;

                    // Check if it's a number key (1-9) from main keyboard
                    if (keyName && keyName.length === 1) {
                        var charCode = keyName.charCodeAt(0);
                        if (charCode >= 49 && charCode <= 57) { // '1' to '9'
                            numKey = charCode - 48; // Convert to 1-9
                        }
                    }

                    // If it's a number key, jump to that item
                    if (numKey !== null) {
                        // Prevent default behavior and stop event propagation IMMEDIATELY
                        event.preventDefault();
                        event.stopPropagation();

                        // Prevent multiple handlers from executing the same shortcut
                        if (isJumping) {
                            return;
                        }

                        // Convert to 0-based index (1 -> 0, 2 -> 1, etc.)
                        var targetIndex = numKey - 1;

                        // Only jump if the index is valid
                        if (targetIndex >= 0 && targetIndex < listbox.items.length) {
                            // Set flag to prevent onChange from firing
                            isProgrammaticSelection = true;

                            // Select the item in the listbox
                            listbox.selection = targetIndex;

                            // Trigger the jump directly (onChange will be skipped due to flag)
                            var selectedItem = listbox.items[targetIndex];
                            if (selectedItem) {
                                var timeToJump = exactJumpCheckbox.value ? selectedItem.matchTime : selectedItem.timeValue;
                                jumpToTime(timeToJump);
                                // Reset flag after jump completes
                                isProgrammaticSelection = false;
                                // Clear search input to prepare for next search
                                searchInput.text = "";
                            }
                        }
                    }
                }
            }
        });

        searchBtn.onClick = function () {
            filterAndDisplayResults(searchInput.text);
        };

        showAllBtn.onClick = function () {
            searchInput.text = "";
            filterAndDisplayResults("");
        };

        searchForwardOnlyCheckbox.onClick = function () {
            // Re-filter when checkbox state changes
            filterAndDisplayResults(searchInput.text);
        };

        exactJumpCheckbox.onClick = function () {
            // Re-filter when checkbox state changes to update display format
            filterAndDisplayResults(searchInput.text);
        };

        listbox.onChange = function () {
            // Skip if this is a programmatic selection (from keyboard shortcut)
            if (isProgrammaticSelection) {
                isProgrammaticSelection = false;
                return;
            }

            if (this.selection !== null) {
                // Use exact jump time if checkbox is enabled, otherwise use next word time
                var timeToJump = exactJumpCheckbox.value ? this.selection.matchTime : this.selection.timeValue;
                jumpToTime(timeToJump);
            }
        };

        // Add keyboard handler to listbox for shortcuts
        listbox.addEventListener('keydown', function (event) {
            var keyName = event.keyName;

            // Handle number keys (1-9) to jump to results
            if (this.items.length > 0 && keyName) {
                var numKey = null;

                // Check if it's a number key (1-9) from main keyboard
                if (keyName.length === 1) {
                    var charCode = keyName.charCodeAt(0);
                    if (charCode >= 49 && charCode <= 57) { // '1' to '9'
                        numKey = charCode - 48; // Convert to 1-9
                    }
                }

                // If it's a number key, jump to that item
                if (numKey !== null) {
                    // Prevent default behavior and stop event propagation IMMEDIATELY
                    event.preventDefault();
                    event.stopPropagation();

                    // Prevent multiple handlers from executing the same shortcut
                    if (isJumping) {
                        return;
                    }

                    // Convert to 0-based index (1 -> 0, 2 -> 1, etc.)
                    var targetIndex = numKey - 1;

                    // Only jump if the index is valid
                    if (targetIndex >= 0 && targetIndex < this.items.length) {
                        // Set flag to prevent onChange from firing
                        isProgrammaticSelection = true;

                        // Select the item in the listbox
                        this.selection = targetIndex;

                        // Trigger the jump directly (onChange will be skipped due to flag)
                        var selectedItem = this.items[targetIndex];
                        if (selectedItem) {
                            var timeToJump = exactJumpCheckbox.value ? selectedItem.matchTime : selectedItem.timeValue;
                            jumpToTime(timeToJump);
                            // Clear search input to prepare for next search
                            searchInput.text = "";
                        }
                    }
                }
            }
        });

        // Keyboard shortcuts: Press 1-9 to jump to corresponding result
        // Note: Number keys will work when listbox has results
        // If you need to type numbers in search, click outside the search box first
        win.addEventListener('keydown', function (event) {
            var keyName = event.keyName;

            // Handle number keys (1-9) to jump to results
            // Only intercept if listbox has items (results are shown)
            if (listbox.items.length > 0 && keyName) {
                var numKey = null;

                // Check if it's a number key (1-9) from main keyboard
                if (keyName.length === 1) {
                    var charCode = keyName.charCodeAt(0);
                    if (charCode >= 49 && charCode <= 57) { // '1' to '9'
                        numKey = charCode - 48; // Convert to 1-9
                    }
                }

                // If it's a number key, jump to that item
                if (numKey !== null) {
                    // Prevent default behavior and stop event propagation IMMEDIATELY
                    event.preventDefault();
                    event.stopPropagation();

                    // Prevent multiple handlers from executing the same shortcut
                    if (isJumping) {
                        return;
                    }

                    // Convert to 0-based index (1 -> 0, 2 -> 1, etc.)
                    var targetIndex = numKey - 1;

                    // Only jump if the index is valid
                    if (targetIndex >= 0 && targetIndex < listbox.items.length) {
                        // Set flag to prevent onChange from firing
                        isProgrammaticSelection = true;

                        // Select the item in the listbox
                        listbox.selection = targetIndex;

                        // Trigger the jump directly (onChange will be skipped due to flag)
                        var selectedItem = listbox.items[targetIndex];
                        if (selectedItem) {
                            var timeToJump = exactJumpCheckbox.value ? selectedItem.matchTime : selectedItem.timeValue;
                            jumpToTime(timeToJump);
                            // Clear search input to prepare for next search
                            searchInput.text = "";
                        }
                    }
                }
            }
        });

        win.show();
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
            }
        } catch (error) {
            statusText.text = "Error selecting file: " + error.message;
            alert("Error selecting file: " + error.message);
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

    // Get current playhead time from main_comp (always use main_comp, not active comp)
    function getCurrentPlayheadTime() {
        try {
            var mainComp = findMainComp();
            if (mainComp) {
                return mainComp.time;
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

    // Jump to time in main_comp (always use main_comp, not active comp)
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

            // Always find and use main_comp (like Expression_Panel does)
            // But don't open it - keep current active composition open
            var mainComp = findMainComp();

            if (!mainComp) {
                statusText.text = "Could not find 'main_comp'";
                isJumping = false;
                return;
            }

            // Apply calibration offset (in frames)
            var calibrationFrames = parseFloat(calibrationInput.text) || 0;
            var frameRate = mainComp.frameRate || 30; // Get comp frame rate, default to 30fps
            var calibrationSeconds = calibrationFrames / frameRate;
            seconds += calibrationSeconds;

            // Clamp to composition duration
            seconds = Math.max(0, Math.min(seconds, mainComp.duration));

            // Jump to time in main_comp (without opening it - keeps current viewer active)
            mainComp.time = seconds;

            // Auto-move layer if enabled
            if (autoMoveCheckbox.value) {
                moveNextLayerToCurrentTime(mainComp);
            } else {
                var calMessage = calibrationFrames !== 0 ? " (cal: " + calibrationFrames + "f)" : "";
                statusText.text = "Jumped to " + formatTime(seconds) + " in " + mainComp.name + calMessage;
            }

            isJumping = false; // Reset flag

        } catch (error) {
            isJumping = false; // Reset flag on error
            statusText.text = "Error jumping to time: " + error.message;
            alert("Error jumping to time: " + error.message);
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
    createListJumperWindow();

})();

