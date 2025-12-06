// List Jumper - Jump to timeline positions based on XLSX word data
// Developed for After Effects

(function() {
    
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
        searchInput.helpTip = "Type to search words, then press Enter";
        
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
        
        // Results list
        var listLabel = win.add("statictext", undefined, "Results:");
        listLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
        
        listbox = win.add("listbox", undefined, [], {multiselect: false});
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
        fileBtn.onClick = function() {
            selectFile();
        };
        
        // Search on Enter key instead of real-time to avoid lag
        searchInput.addEventListener('keydown', function(event) {
            if (event.keyName === "Enter") {
                filterAndDisplayResults(searchInput.text);
            }
        });
        
        searchBtn.onClick = function() {
            filterAndDisplayResults(searchInput.text);
        };
        
        showAllBtn.onClick = function() {
            searchInput.text = "";
            filterAndDisplayResults("");
        };
        
        searchForwardOnlyCheckbox.onClick = function() {
            // Re-filter when checkbox state changes
            filterAndDisplayResults(searchInput.text);
        };
        
        exactJumpCheckbox.onClick = function() {
            // Re-filter when checkbox state changes to update display format
            filterAndDisplayResults(searchInput.text);
        };
        
        listbox.onChange = function() {
            if (this.selection !== null) {
                // Use exact jump time if checkbox is enabled, otherwise use next word time
                var timeToJump = exactJumpCheckbox.value ? this.selection.matchTime : this.selection.timeValue;
                jumpToTime(timeToJump);
            }
        };
        
        win.show();
    }
    
    // File selection
    function selectFile() {
        try {
            var file = File.openDialog("Select XLSX or CSV file", "*.xlsx;*.csv");
            
            if (file) {
                selectedFile = file;
                filePathText.text = file.name;
                statusText.text = "Loading file...";
                
                // Try to read the file
                if (file.name.toLowerCase().indexOf(".csv") !== -1) {
                    readCSVFile(file);
                } else {
                    readXLSXFile(file);
                }
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
    
    // Read XLSX file (more complex - ZIP with XML inside)
    function readXLSXFile(file) {
        try {
            statusText.text = "Reading XLSX file...";
            
            // Show a dialog offering to help user export to CSV
            var result = confirm(
                "XLSX parsing in ExtendScript is limited due to compression.\n\n" +
                "For best results:\n" +
                "1. Open the XLSX file in Excel\n" +
                "2. Save As > CSV (Comma delimited)\n" +
                "3. Load the CSV file here\n\n" +
                "Click OK to try parsing XLSX anyway, or Cancel to select a CSV file.",
                false,
                "XLSX Format Limitation"
            );
            
            if (!result) {
                // User chose to select CSV instead
                var csvFile = File.openDialog("Select CSV file", "*.csv");
                if (csvFile) {
                    selectedFile = csvFile;
                    filePathText.text = csvFile.name;
                    readCSVFile(csvFile);
                }
                return;
            }
            
            // Try to parse XLSX anyway
            // Open file as binary
            file.encoding = "BINARY";
            file.open("r");
            var fileContent = file.read();
            file.close();
            
            // Check if it's a ZIP file (XLSX files start with PK\x03\x04)
            if (fileContent.length > 4 && 
                fileContent.charCodeAt(0) === 0x50 && // P
                fileContent.charCodeAt(1) === 0x4B && // K
                fileContent.charCodeAt(2) === 0x03 &&
                fileContent.charCodeAt(3) === 0x04) {
                
                // It's a real XLSX file - we need to extract and parse XML
                parseXLSXBinary(fileContent);
                
            } else {
                // Maybe it's actually a tab-delimited or CSV file with wrong extension
                file.encoding = "UTF-8";
                file.open("r");
                var content = file.read();
                file.close();
                
                parseCSVContent(content);
            }
            
            if (searchData.length > 0) {
                statusText.text = "Loaded " + searchData.length + " entries from XLSX";
                filterAndDisplayResults("");
            } else {
                throw new Error("No valid data found in file");
            }
            
        } catch (error) {
            statusText.text = "Error reading XLSX: " + error.message;
            alert("Error reading XLSX file: " + error.message + 
                  "\n\nPlease export the file as CSV for reliable parsing.");
        }
    }
    
    // Parse XLSX binary data
    function parseXLSXBinary(binaryData) {
        // XLSX files are ZIP archives containing XML files
        // The main data is in xl/worksheets/sheet1.xml
        // Shared strings are in xl/sharedStrings.xml
        
        try {
            // Extract sheet XML and shared strings
            var sheetXML = extractFileFromZip(binaryData, "xl/worksheets/sheet1.xml");
            var stringsXML = extractFileFromZip(binaryData, "xl/sharedStrings.xml");
            
            if (sheetXML) {
                parseXLSXSheet(sheetXML, stringsXML);
            } else {
                throw new Error("Could not find worksheet data in XLSX file");
            }
            
        } catch (error) {
            throw new Error("XLSX parsing failed: " + error.message + 
                          "\n\nPlease export as CSV for reliable parsing.");
        }
    }
    
    // Extract a file from ZIP archive
    function extractFileFromZip(zipData, targetFile) {
        // This is a simplified ZIP parser
        // ZIP format: Local file headers followed by central directory
        
        var pos = 0;
        while (pos < zipData.length - 30) {
            // Check for local file header signature (PK\x03\x04)
            if (zipData.charCodeAt(pos) === 0x50 && 
                zipData.charCodeAt(pos + 1) === 0x4B &&
                zipData.charCodeAt(pos + 2) === 0x03 &&
                zipData.charCodeAt(pos + 3) === 0x04) {
                
                // Read filename length
                var filenameLen = readUInt16(zipData, pos + 26);
                var extraLen = readUInt16(zipData, pos + 28);
                var compressedSize = readUInt32(zipData, pos + 18);
                
                // Read filename
                var filename = "";
                for (var i = 0; i < filenameLen; i++) {
                    filename += zipData.charAt(pos + 30 + i);
                }
                
                // Check if this is the target file
                if (filename === targetFile) {
                    var dataStart = pos + 30 + filenameLen + extraLen;
                    var data = zipData.substr(dataStart, compressedSize);
                    
                    // Try to decompress (most XLSX files use deflate compression)
                    // For simplicity, we'll assume no compression or handle it
                    return data;
                }
                
                pos += 30 + filenameLen + extraLen + compressedSize;
            } else {
                pos++;
            }
        }
        
        return null;
    }
    
    // Helper to read little-endian uint16
    function readUInt16(data, offset) {
        return data.charCodeAt(offset) | (data.charCodeAt(offset + 1) << 8);
    }
    
    // Helper to read little-endian uint32
    function readUInt32(data, offset) {
        return data.charCodeAt(offset) | 
               (data.charCodeAt(offset + 1) << 8) |
               (data.charCodeAt(offset + 2) << 16) |
               (data.charCodeAt(offset + 3) << 24);
    }
    
    // Parse XLSX sheet XML
    function parseXLSXSheet(sheetXML, stringsXML) {
        searchData = [];
        
        // Parse shared strings first
        var sharedStrings = [];
        if (stringsXML) {
            var siMatches = stringsXML.match(/<si[^>]*>.*?<\/si>/g);
            if (siMatches) {
                for (var i = 0; i < siMatches.length; i++) {
                    var tMatch = siMatches[i].match(/<t[^>]*>(.*?)<\/t>/);
                    if (tMatch) {
                        sharedStrings.push(tMatch[1]);
                    }
                }
            }
        }
        
        // Parse rows
        var rowMatches = sheetXML.match(/<row[^>]*>.*?<\/row>/g);
        if (!rowMatches || rowMatches.length < 2) {
            throw new Error("No data rows found in worksheet");
        }
        
        // Parse header row to find column indices
        var headerCells = rowMatches[0].match(/<c[^>]*>.*?<\/c>/g);
        var startCol = -1;
        var wordCol = -1;
        
        if (headerCells) {
            for (var i = 0; i < headerCells.length; i++) {
                var cellValue = getCellValue(headerCells[i], sharedStrings);
                var cellCol = getCellColumn(headerCells[i]);
                
                if (cellValue.toLowerCase() === "start") startCol = cellCol;
                if (cellValue.toLowerCase() === "word") wordCol = cellCol;
            }
        }
        
        if (startCol === -1 || wordCol === -1) {
            throw new Error("Could not find 'start' and 'word' columns in header");
        }
        
        // Parse data rows
        for (var i = 1; i < rowMatches.length; i++) {
            var cells = rowMatches[i].match(/<c[^>]*>.*?<\/c>/g);
            if (!cells) continue;
            
            var timeValue = null;
            var word = null;
            
            for (var j = 0; j < cells.length; j++) {
                var cellCol = getCellColumn(cells[j]);
                var cellValue = getCellValue(cells[j], sharedStrings);
                
                if (cellCol === startCol) {
                    timeValue = timecodeToSeconds(cellValue);
                }
                if (cellCol === wordCol) {
                    word = cellValue;
                }
            }
            
            if (timeValue !== null && !isNaN(timeValue) && timeValue >= 0 && word) {
                searchData.push({
                    time: timeValue,
                    word: word
                });
            }
        }
    }
    
    // Get cell column from reference (A, B, C, etc.)
    function getCellColumn(cellXML) {
        var rMatch = cellXML.match(/r="([A-Z]+)\d+"/);
        if (rMatch) {
            var col = rMatch[1];
            var colNum = 0;
            for (var i = 0; i < col.length; i++) {
                colNum = colNum * 26 + (col.charCodeAt(i) - 64);
            }
            return colNum - 1;
        }
        return -1;
    }
    
    // Get cell value from XML
    function getCellValue(cellXML, sharedStrings) {
        var tMatch = cellXML.match(/<v[^>]*>(.*?)<\/v>/);
        if (!tMatch) return "";
        
        var value = tMatch[1];
        
        // Check if it's a shared string reference
        if (cellXML.indexOf('t="s"') !== -1) {
            var idx = parseInt(value);
            if (!isNaN(idx) && idx < sharedStrings.length) {
                return sharedStrings[idx];
            }
        }
        
        return value;
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
            // Ignore errors
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
        currentPlayheadTime = getCurrentPlayheadTime();
        
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
                
                // Display format: "● match word1 word2 word3 > [timecode]"
                displayText = marker + " " + exactWords.join(" ");
                
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
                    
                    // Display format: "● prev2 prev1 match > [timecode] nextword"
                    displayText = marker + " " + contextWords.join(" ") + " > " + formatTime(nextTime) + " " + nextWord;
                } else {
                    // No next word available
                    displayText = marker + " " + contextWords.join(" ") + " > (end)";
                }
            }
            
            var item = listbox.add("item", displayText);
            // Store both times - exact jump checkbox will determine which to use
            item.matchTime = matchTime; // Time of the matched word
            item.nextTime = nextTime !== null ? nextTime : matchTime; // Time of next word (or match if no next)
            item.timeValue = nextTime !== null ? nextTime : matchTime; // Default: next word (current behavior)
        }
        
        var statusMsg = "Showing " + filtered.length + " matches";
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
        try {
            // Debug: check what value we received
            if (isNaN(seconds) || seconds === null || seconds === undefined) {
                statusText.text = "Invalid time value: " + seconds;
                alert("Invalid time value received: " + seconds);
                return;
            }
            
            // Always find and use main_comp (like Expression_Panel does)
            // But don't open it - keep current active composition open
            var mainComp = findMainComp();
            
            if (!mainComp) {
                statusText.text = "Could not find 'main_comp'";
                alert("Could not find 'main_comp' composition");
                return;
            }
            
            // Clamp to composition duration
            seconds = Math.max(0, Math.min(seconds, mainComp.duration));
            
            // Jump to time in main_comp (without opening it - keeps current viewer active)
            mainComp.time = seconds;
            
            // Auto-move layer if enabled
            if (autoMoveCheckbox.value) {
                moveNextLayerToCurrentTime(mainComp);
            } else {
                statusText.text = "Jumped to " + formatTime(seconds) + " in " + mainComp.name;
            }
            
        } catch (error) {
            statusText.text = "Error jumping to time: " + error.message;
            alert("Error jumping to time: " + error.message);
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
                
                statusText.text = "Jumped to " + formatTime(comp.time) + " in " + comp.name + " | Moved '" + nextLayer.name + "' to time and selected it";
            } else {
                // No layer above, just show normal jump message
                statusText.text = "Jumped to " + formatTime(comp.time) + " in " + comp.name + " | No layer above to move";
            }
            
        } catch (error) {
            // If auto-move fails, just continue with normal jump
            statusText.text = "Jumped to " + formatTime(comp.time) + " | Auto-move error: " + error.toString();
        }
    }
    
    // Start the script
    createListJumperWindow();
    
})();

