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

// Create the main panel function
function createPanel(thisObj) {
    // Determine if this is a dockable panel or standalone window
    var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Expression Panel");
    
    // Panel properties
    myPanel.orientation = "column";
    myPanel.alignChildren = ["fill", "top"];
    myPanel.spacing = 4;
    myPanel.margins = 6;
    myPanel.preferredSize.width = 380; // Compact width
    
    // Title
    var titleGroup = myPanel.add("group");
    titleGroup.orientation = "row";
    titleGroup.alignChildren = ["center", "center"];
    
    var title = titleGroup.add("statictext", undefined, "Expression Snippets");
    title.graphics.font = ScriptUI.newFont("Arial", "BOLD", 12);
    
    // Timeline jumper group
    var timelineGroup = myPanel.add("group");
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
    
    // Calibration controls next to input
    var calLabel = topRow.add("statictext", undefined, "Cal:");
    calLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    
    var calibrationInput = topRow.add("edittext", undefined, "0");
    calibrationInput.preferredSize.width = 35;
    calibrationInput.preferredSize.height = 30;
    calibrationInput.helpTip = "Milliseconds offset (+/-) for all jumps";
    
    var msLabel = topRow.add("statictext", undefined, "ms");
    msLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
    
    var calPlusBtn = topRow.add("button", undefined, "+");
    calPlusBtn.preferredSize.width = 18;
    calPlusBtn.preferredSize.height = 30;
    calPlusBtn.onClick = function() {
        var current = parseFloat(calibrationInput.text) || 0;
        calibrationInput.text = (current + 50).toString();
    };
    
    var calMinusBtn = topRow.add("button", undefined, "-");
    calMinusBtn.preferredSize.width = 18;
    calMinusBtn.preferredSize.height = 30;
    calMinusBtn.onClick = function() {
        var current = parseFloat(calibrationInput.text) || 0;
        calibrationInput.text = (current - 50).toString();
    };

    // Auto-move layer feature row
    var autoMoveRow = timelineGroup.add("group");
    autoMoveRow.orientation = "row";
    autoMoveRow.alignChildren = ["left", "center"];
    autoMoveRow.spacing = 6;
    
    var autoMoveCheck = autoMoveRow.add("checkbox", undefined, "Auto-move next layer to time");
    autoMoveCheck.helpTip = "When pasting timecode, automatically move the layer above the selected one to that time";
    autoMoveCheck.value = false;

    // Bottom row with navigation buttons and frame input
    var bottomRow = timelineGroup.add("group");
    bottomRow.orientation = "row";
    bottomRow.alignChildren = ["left", "center"];
    bottomRow.spacing = 3;

    // Jump backward buttons
    var jumpBack1s = bottomRow.add("button", undefined, "-1s");
    jumpBack1s.preferredSize.width = 45;
    jumpBack1s.onClick = function() {
        jumpByTime(-1);
    };

    var jumpBack05s = bottomRow.add("button", undefined, "-0.5s");
    jumpBack05s.preferredSize.width = 45;
    jumpBack05s.onClick = function() {
        jumpByTime(-0.5);
    };

    // Add -4 frame button
    var jumpBack4f = bottomRow.add("button", undefined, "-4f");
    jumpBack4f.preferredSize.width = 35;
    jumpBack4f.onClick = function() {
        jumpByFrames(-4);
    };

    // Frame input group
    var frameGroup = bottomRow.add("group");
    frameGroup.orientation = "row";
    frameGroup.alignChildren = ["left", "center"];
    frameGroup.spacing = 5;

    var frameInput = frameGroup.add("edittext", undefined, "");
    frameInput.preferredSize.width = 50;
    frameInput.helpTip = "Enter number of frames to jump";

    var frameJumpBtn = frameGroup.add("button", undefined, "Jump");
    frameJumpBtn.preferredSize.width = 45;
    frameJumpBtn.onClick = function() {
        jumpByFrames(parseInt(frameInput.text));
    };

    // Add +4 frame button
    var jumpForward4f = bottomRow.add("button", undefined, "+4f");
    jumpForward4f.preferredSize.width = 35;
    jumpForward4f.onClick = function() {
        jumpByFrames(4);
    };

    // Jump forward buttons
    var jumpForward05s = bottomRow.add("button", undefined, "+0.5s");
    jumpForward05s.preferredSize.width = 45;
    jumpForward05s.onClick = function() {
        jumpByTime(0.5);
    };

    var jumpForward1s = bottomRow.add("button", undefined, "+1s");
    jumpForward1s.preferredSize.width = 45;
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
    quickUtilGroup.spacing = 2;
    
    // First row of utilities
    var utilRow1 = quickUtilGroup.add("group");
    utilRow1.orientation = "row";
    utilRow1.alignChildren = ["fill", "center"];
    utilRow1.spacing = 2;
    
    // Add Current Keyframes button
    var addKeyframesBtn = utilRow1.add("button", undefined, "Add Keyframes");
    addKeyframesBtn.preferredSize.height = 20;
    addKeyframesBtn.helpTip = "Adds keyframes for current position and scale values";
    addKeyframesBtn.onClick = function() {
        addCurrentKeyframes();
    };
    
    // Add Hide Layers button
    var hideLayersBtn = utilRow1.add("button", undefined, "Hide Layers");
    hideLayersBtn.preferredSize.height = 20;
    hideLayersBtn.helpTip = "Hide all layers starting with 'hide' in main_comp";
    hideLayersBtn.onClick = function() {
        hideAllLayersNamedHide();
    };
    
    // Add Show Layers button
    var showLayersBtn = utilRow1.add("button", undefined, "Show Layers");
    showLayersBtn.preferredSize.height = 20;
    showLayersBtn.helpTip = "Show all layers starting with 'hide' in main_comp";
    showLayersBtn.onClick = function() {
        showAllLayersNamedHide();
    };
    
    // Second row of utilities
    var utilRow2 = quickUtilGroup.add("group");
    utilRow2.orientation = "row";
    utilRow2.alignChildren = ["fill", "center"];
    utilRow2.spacing = 2;
    
    // Add Auto Trim button
    var autoTrimBtn = utilRow2.add("button", undefined, "Auto Trim");
    autoTrimBtn.preferredSize.height = 20;
    autoTrimBtn.helpTip = "Trim overlapping layers automatically";
    autoTrimBtn.onClick = function() {
        autoTrimLayers();
    };
    
    // Add Batch Duration button
    var batchDurationBtn = utilRow2.add("button", undefined, "Batch Duration");
    batchDurationBtn.preferredSize.height = 20;
    batchDurationBtn.helpTip = "Change duration of selected precomp source compositions";
    batchDurationBtn.onClick = function() {
        changeBatchDuration();
    };
    
    // Add Separate Jump Window button
    var separateJumpBtn = utilRow2.add("button", undefined, "Jump Window");
    separateJumpBtn.preferredSize.height = 20;
    separateJumpBtn.helpTip = "Open timeline jump controls in a separate window";
    separateJumpBtn.onClick = function() {
        createSeparateJumpWindow();
    };
    
    // Main content group with two columns
    var mainGroup = myPanel.add("group");
    mainGroup.orientation = "row";
    mainGroup.alignChildren = ["fill", "top"];
    mainGroup.spacing = 6;
    
    // Left Column
    var leftCol = mainGroup.add("group");
    leftCol.orientation = "column";
    leftCol.alignChildren = ["fill", "top"];
    leftCol.spacing = 4;
    leftCol.preferredSize.width = 190;
    
    // Basic Animations (Left Column)
    leftCol.add("panel");
    var basicTitle = leftCol.add("statictext", undefined, "Basic Animations");
    basicTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    basicTitle.alignment = "center";
    
    var basicGroup = leftCol.add("group");
    basicGroup.orientation = "column";
    basicGroup.alignChildren = ["fill", "top"];
    basicGroup.spacing = 2;
    
    // Basic animation buttons
    var basicButtons = ["Fast Wiggle", "Posterize Time", "Stop Motion", "Time Rotation", "Up Down", "Left Right", "Rotation PingPong", "Thunder Flicker", "Horror Light", "Scale Pulse"];
    addButtonsToGroup(basicGroup, basicButtons);
    
    // Loops (Left Column)
    leftCol.add("panel");
    var loopTitle = leftCol.add("statictext", undefined, "Loops");
    loopTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    loopTitle.alignment = "center";
    
    var loopGroup = leftCol.add("group");
    loopGroup.orientation = "column";
    loopGroup.alignChildren = ["fill", "top"];
    loopGroup.spacing = 2;
    
    // Loop buttons
    var loopButtons = ["Loop Cycle", "Loop Continue", "Loop PingPong", "Loop Wiggle"];
    addButtonsToGroup(loopGroup, loopButtons);
    
    // Right Column
    var rightCol = mainGroup.add("group");
    rightCol.orientation = "column";
    rightCol.alignChildren = ["fill", "top"];
    rightCol.spacing = 4;
    rightCol.preferredSize.width = 190;
    
    // Complex Animations (Right Column)
    rightCol.add("panel");
    var complexTitle = rightCol.add("statictext", undefined, "Complex Animations");
    complexTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    complexTitle.alignment = "center";
    
    var complexGroup = rightCol.add("group");
    complexGroup.orientation = "column";
    complexGroup.alignChildren = ["fill", "top"];
    complexGroup.spacing = 2;
    
    // Complex animation buttons
    var complexButtons = ["Water Float", "Glitter", "Fish-like"];
    addButtonsToGroup(complexGroup, complexButtons);
    
    // Utility (Right Column)
    rightCol.add("panel");
    var utilityTitle = rightCol.add("statictext", undefined, "Utilities");
    utilityTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
    utilityTitle.alignment = "center";
    
    var utilityGroup = rightCol.add("group");
    utilityGroup.orientation = "column";
    utilityGroup.alignChildren = ["fill", "top"];
    utilityGroup.spacing = 2;
    
    // Create Null button
    var createNullBtn = utilityGroup.add("button", undefined, "Create Null Object");
    createNullBtn.alignment = "fill";
    createNullBtn.preferredSize.height = 22;
    createNullBtn.helpTip = "Creates a null object for the selected layer";
    createNullBtn.onClick = function() {
        createNullObject();
    };
    
    // Add Layer Movement button
    var layerMovementBtn = utilityGroup.add("button", undefined, "Layer Movement");
    layerMovementBtn.alignment = "fill";
    layerMovementBtn.preferredSize.height = 22;
    layerMovementBtn.helpTip = "Add movement animation to selected layers";
    layerMovementBtn.onClick = function() {
        showLayerMovementDialog();
    };
    
    // Add Water Distortion button
    var waterDistortBtn = utilityGroup.add("button", undefined, "Water Distortion");
    waterDistortBtn.alignment = "fill";
    waterDistortBtn.preferredSize.height = 22;
    waterDistortBtn.helpTip = "Adds water distortion effect to selected layers";
    waterDistortBtn.onClick = function() {
        showWaterDistortionDialog();
    };
    

    
    // Add Bounce x2 button
    var bounceX2Btn = utilityGroup.add("button", undefined, "Bounce x2");
    bounceX2Btn.alignment = "fill";
    bounceX2Btn.preferredSize.height = 22;
    bounceX2Btn.helpTip = "Creates 2 bouncy keyframes: 0→100 (scale only)";
    bounceX2Btn.onClick = function() {
        addBounceKeyframes();
    };
    
        // Add Walking/Running Arc button
    var walkRunBtn = utilityGroup.add("button", undefined, "Walk/Run Arc");
    walkRunBtn.alignment = "fill";
    walkRunBtn.preferredSize.height = 22;
    walkRunBtn.helpTip = "Add walking/running arc movement to selected layers";
    walkRunBtn.onClick = function() {
        showWalkRunDialog();
    };
    
    // Add Batch Scale button
    var batchScaleBtn = utilityGroup.add("button", undefined, "Batch Scale");
    batchScaleBtn.alignment = "fill";
    batchScaleBtn.preferredSize.height = 22;
    batchScaleBtn.helpTip = "Batch scale layers with presets (34%, 50%, 100%)";
    batchScaleBtn.onClick = function() {
        showBatchScaleDialog();
    };
    
    // Add Smart Precomp button
    var smartPrecompBtn = utilityGroup.add("button", undefined, "Smart Precomp");
    smartPrecompBtn.alignment = "fill";
    smartPrecompBtn.preferredSize.height = 22;
    smartPrecompBtn.helpTip = "Create precomp from selected layers while retaining size, scale and position";
    smartPrecompBtn.onClick = function() {
        createSmartPrecomp();
    };
    
    // Add 3x3 Anchor Point button
    var anchorGridBtn = utilityGroup.add("button", undefined, "3x3 Anchor Point");
    anchorGridBtn.alignment = "fill";
    anchorGridBtn.preferredSize.height = 22;
    anchorGridBtn.helpTip = "Move anchor point using 3x3 grid controller";
    anchorGridBtn.onClick = function() {
        show3x3AnchorDialog();
    };
    
    // Status area at the bottom
    myPanel.add("panel");
    
    var statusGroup = myPanel.add("group");
    statusGroup.orientation = "row";
    statusGroup.alignChildren = ["fill", "center"];
    
    var statusLabel = statusGroup.add("statictext", undefined, "Status:");
    statusLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    
    var statusText = statusGroup.add("statictext", undefined, "Ready");
    statusText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
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
                btn.preferredSize.height = 22;
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

// Show up down animation dialog
function showUpDownDialog() {
    var dialog = new Window("dialog", "Up Down Animation Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Amplitude setting
    var ampGroup = dialog.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["fill", "center"];
    
    ampGroup.add("statictext", undefined, "Amplitude:");
    var ampInput = ampGroup.add("edittext", undefined, "50");
    ampInput.preferredSize.width = 80;
    
    // Frames per cycle setting
    var framesGroup = dialog.add("group");
    framesGroup.orientation = "row";
    framesGroup.alignChildren = ["fill", "center"];
    
    framesGroup.add("statictext", undefined, "Frames per cycle:");
    var framesInput = framesGroup.add("edittext", undefined, "5");
    framesInput.preferredSize.width = 80;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var subtleBtn = presetGroup.add("button", undefined, "Subtle");
    subtleBtn.onClick = function() {
        ampInput.text = "12";
        framesInput.text = "12";
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        ampInput.text = "50";
        framesInput.text = "5";
    };
    
    var crazyBtn = presetGroup.add("button", undefined, "Crazy");
    crazyBtn.onClick = function() {
        ampInput.text = "20";
        framesInput.text = "3";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var amp = ampInput.text;
        var frames = framesInput.text;
        
        if (amp && frames && !isNaN(parseFloat(amp)) && !isNaN(parseFloat(frames))) {
            var expression = "amp = " + amp + ";\n" +
                           "framesPerCycle = " + frames + ";\n" +
                           "fps = thisComp.frameDuration;\n" +
                           "t = time / (framesPerCycle * fps);\n" +
                           "value + [0, Math.sin(t * 2 * Math.PI) * amp];";
            handleExpressionClick("Up Down", expression);
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

// Show left right animation dialog
function showLeftRightDialog() {
    var dialog = new Window("dialog", "Left Right Animation Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Amplitude setting
    var ampGroup = dialog.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["fill", "center"];
    
    ampGroup.add("statictext", undefined, "Amplitude:");
    var ampInput = ampGroup.add("edittext", undefined, "50");
    ampInput.preferredSize.width = 80;
    
    // Frames per cycle setting
    var framesGroup = dialog.add("group");
    framesGroup.orientation = "row";
    framesGroup.alignChildren = ["fill", "center"];
    
    framesGroup.add("statictext", undefined, "Frames per cycle:");
    var framesInput = framesGroup.add("edittext", undefined, "5");
    framesInput.preferredSize.width = 80;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var subtleBtn = presetGroup.add("button", undefined, "Subtle");
    subtleBtn.onClick = function() {
        ampInput.text = "12";
        framesInput.text = "12";
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        ampInput.text = "50";
        framesInput.text = "5";
    };
    
    var crazyBtn = presetGroup.add("button", undefined, "Crazy");
    crazyBtn.onClick = function() {
        ampInput.text = "20";
        framesInput.text = "3";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var amp = ampInput.text;
        var frames = framesInput.text;
        
        if (amp && frames && !isNaN(parseFloat(amp)) && !isNaN(parseFloat(frames))) {
            var expression = "amp = " + amp + ";\n" +
                           "framesPerCycle = " + frames + ";\n" +
                           "fps = thisComp.frameDuration;\n" +
                           "t = time / (framesPerCycle * fps);\n" +
                           "value + [Math.sin(t * 2 * Math.PI) * amp, 0];";
            handleExpressionClick("Left Right", expression);
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
        
        // Create new composition with calculated dimensions
        var precompName = prompt("Enter precomp name:", "Smart Precomp");
        if (!precompName) {
            app.endUndoGroup();
            return;
        }
        
        var precomp = app.project.items.addComp(
            precompName,
            Math.ceil(bounds.width),
            Math.ceil(bounds.height),
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
            
            // Adjust position relative to the bounding box
            var newPos = [
                info.originalPosition[0] - bounds.left,
                info.originalPosition[1] - bounds.top
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
        
        // Set anchor point to center
        precompLayer.transform.anchorPoint.setValue([
            bounds.width / 2,
            bounds.height / 2
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
        app.beginUndoGroup("Add Current Position & Scale Keyframes");

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

// Show layer movement dialog
function showLayerMovementDialog() {
    var dialog = new Window("dialog", "Layer Movement Settings");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Direction radio buttons
    var dirGroup = dialog.add("group");
    dirGroup.orientation = "row";
    dirGroup.alignChildren = ["left", "center"];
    dirGroup.add("statictext", undefined, "Movement Direction:");
    
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
    speedGroup.alignChildren = ["fill", "center"];
    speedGroup.add("statictext", undefined, "Movement Speed:");
    var speedInput = speedGroup.add("edittext", undefined, "100");
    speedInput.preferredSize.width = 60;
    
    // Wiggle toggle
    var wiggleCheck = dialog.add("checkbox", undefined, "Enable Wiggle");
    wiggleCheck.value = false;
    
    // Wiggle settings group (initially hidden)
    var wiggleGroup = dialog.add("group");
    wiggleGroup.orientation = "column";
    wiggleGroup.alignChildren = ["fill", "top"];
    wiggleGroup.spacing = 5;
    wiggleGroup.enabled = false;
    
    // Wiggle frequency
    var freqGroup = wiggleGroup.add("group");
    freqGroup.orientation = "row";
    freqGroup.alignChildren = ["fill", "center"];
    freqGroup.add("statictext", undefined, "Wiggle Frequency:");
    var freqInput = freqGroup.add("edittext", undefined, "0.8");
    freqInput.preferredSize.width = 60;
    
    // Wiggle amplitude
    var ampGroup = wiggleGroup.add("group");
    ampGroup.orientation = "row";
    ampGroup.alignChildren = ["fill", "center"];
    ampGroup.add("statictext", undefined, "Wiggle Amplitude:");
    var ampInput = ampGroup.add("edittext", undefined, "3");
    ampInput.preferredSize.width = 60;
    
    // Enable/disable wiggle settings based on checkbox
    wiggleCheck.onClick = function() {
        wiggleGroup.enabled = wiggleCheck.value;
    };
    
    // Presets
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var slowBtn = presetGroup.add("button", undefined, "Slow");
    slowBtn.onClick = function() {
        speedInput.text = "50";
        freqInput.text = "0.5";
        ampInput.text = "2";
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        speedInput.text = "100";
        freqInput.text = "0.8";
        ampInput.text = "3";
    };
    
    var fastBtn = presetGroup.add("button", undefined, "Fast");
    fastBtn.onClick = function() {
        speedInput.text = "200";
        freqInput.text = "1.2";
        ampInput.text = "5";
    };
    
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    
    var okBtn = buttonGroup.add("button", undefined, "Apply");
    okBtn.onClick = function() {
        var speed = parseFloat(speedInput.text);
        var freq = parseFloat(freqInput.text);
        var amp = parseFloat(ampInput.text);
        
        if (!isNaN(speed) && (!wiggleCheck.value || (!isNaN(freq) && !isNaN(amp)))) {
            // Create the expression
            var expression = "// Movement settings\n" +
                           "var speed = " + speed + ";\n" +
                           "var direction = " + (selectedDirection === 1 ? "1" : "-1") + "; // " + (selectedDirection === 1 ? "Right" : "Left") + "\n" +
                           "var x = time * speed * direction;\n\n";
            
            if (wiggleCheck.value) {
                expression += "// Wiggle settings\n" +
                            "var wiggleFreq = " + freq + ";\n" +
                            "var wiggleAmp = " + amp + ";\n" +
                            "var y = Math.sin(time * wiggleFreq * 2 * Math.PI) * wiggleAmp;\n\n";
            } else {
                expression += "var y = 0;\n\n";
            }
            
            expression += "value + [x, y]";
            
            // Apply the expression
            applyLayerMovement(expression);
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

// Apply layer movement expression
function applyLayerMovement(expression) {
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
        
        app.beginUndoGroup("Apply Layer Movement");
        
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
            updateStatus("Applied movement to " + successCount + " layer(s)");
        } else {
            updateStatus("Failed to apply movement");
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
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Min scale input
    var minScaleGroup = dialog.add("group");
    minScaleGroup.orientation = "row";
    minScaleGroup.alignChildren = ["left", "center"];
    minScaleGroup.add("statictext", undefined, "Minimum Scale (%):");
    var minScaleInput = minScaleGroup.add("edittext", undefined, "90");
    minScaleInput.preferredSize.width = 60;
    
    // Max scale input
    var maxScaleGroup = dialog.add("group");
    maxScaleGroup.orientation = "row";
    maxScaleGroup.alignChildren = ["left", "center"];
    maxScaleGroup.add("statictext", undefined, "Maximum Scale (%):");
    var maxScaleInput = maxScaleGroup.add("edittext", undefined, "110");
    maxScaleInput.preferredSize.width = 60;
    
    // Speed input
    var speedGroup = dialog.add("group");
    speedGroup.orientation = "row";
    speedGroup.alignChildren = ["left", "center"];
    speedGroup.add("statictext", undefined, "Cycles per second:");
    var speedInput = speedGroup.add("edittext", undefined, "2");
    speedInput.preferredSize.width = 60;
    
    // Preset buttons
    var presetGroup = dialog.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignment = "center";
    
    presetGroup.add("statictext", undefined, "Presets:");
    
    var subtleBtn = presetGroup.add("button", undefined, "Subtle");
    subtleBtn.onClick = function() {
        minScaleInput.text = "95";
        maxScaleInput.text = "105";
        speedInput.text = "1";
        updatePreview();
    };
    
    var normalBtn = presetGroup.add("button", undefined, "Normal");
    normalBtn.onClick = function() {
        minScaleInput.text = "90";
        maxScaleInput.text = "110";
        speedInput.text = "2";
        updatePreview();
    };
    
    var strongBtn = presetGroup.add("button", undefined, "Strong");
    strongBtn.onClick = function() {
        minScaleInput.text = "80";
        maxScaleInput.text = "120";
        speedInput.text = "3";
        updatePreview();
    };
    
    var fastBtn = presetGroup.add("button", undefined, "Fast");
    fastBtn.onClick = function() {
        minScaleInput.text = "90";
        maxScaleInput.text = "110";
        speedInput.text = "4";
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
        var minScale = parseFloat(minScaleInput.text);
        var maxScale = parseFloat(maxScaleInput.text);
        var speed = parseFloat(speedInput.text);
        
        if (!isNaN(minScale) && !isNaN(maxScale) && !isNaN(speed)) {
            var expression = "// Settings\nminScale = " + minScale + ";\nmaxScale = " + maxScale + ";\nspeed = " + speed + "; // cycles per second\n\n// Oscillate value using sine\ns = (Math.sin(time * Math.PI * speed) + 1) / 2; // normalized between 0–1\n\n// Interpolate scale using linear easing\nscaleVal = linear(s, 0, 1, minScale, maxScale);\n[scaleVal, scaleVal]";
            previewText.text = expression;
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
            var expression = "// Settings\nminScale = " + minScale + ";\nmaxScale = " + maxScale + ";\nspeed = " + speed + "; // cycles per second\n\n// Oscillate value using sine\ns = (Math.sin(time * Math.PI * speed) + 1) / 2; // normalized between 0–1\n\n// Interpolate scale using linear easing\nscaleVal = linear(s, 0, 1, minScale, maxScale);\n[scaleVal, scaleVal]";
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

                // Check if name starts with "hide" (case-insensitive)
                if (layer.name.toLowerCase().indexOf("hide") === 0) {
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
            app.beginUndoGroup("Hide Layers Starting with 'hide'");
            processComp(mainComp);
            app.endUndoGroup();
            updateStatus("Hidden all layers starting with 'hide' in main_comp and precomps");
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

                // Check if name starts with "hide" (case-insensitive)
                if (layer.name.toLowerCase().indexOf("hide") === 0) {
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
            app.beginUndoGroup("Show Layers Starting with 'hide'");
            processComp(mainComp);
            app.endUndoGroup();
            updateStatus("Shown all layers starting with 'hide' in main_comp and precomps");
        } else {
            alert("Main Comp not found in the project.");
            updateStatus("Main Comp not found");
        }
        
    } catch (error) {
        alert("Error showing layers: " + error.message);
        updateStatus("Error: " + error.message);
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

        app.beginUndoGroup("Change Precomp Durations");

        var changedCount = 0;
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var source = layer.source;

            if (source instanceof CompItem) {
                source.duration = newDuration;
                source.displayStartTime = 0; // Optional: reset start time
                changedCount++;
            }
        }

        app.endUndoGroup();
        
        if (changedCount > 0) {
            updateStatus("Duration updated for " + changedCount + " precomp(s)");
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
    jumpWindow.preferredSize.width = 380;
    
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

    // Bottom row with navigation buttons and frame input
    var bottomRow = timelineGroup.add("group");
    bottomRow.orientation = "row";
    bottomRow.alignChildren = ["left", "center"];
    bottomRow.spacing = 3;

    // Jump backward buttons
    var jumpBack1s = bottomRow.add("button", undefined, "-1s");
    jumpBack1s.preferredSize.width = 45;
    jumpBack1s.onClick = function() {
        jumpByTimeInWindow(-1);
    };

    var jumpBack05s = bottomRow.add("button", undefined, "-0.5s");
    jumpBack05s.preferredSize.width = 45;
    jumpBack05s.onClick = function() {
        jumpByTimeInWindow(-0.5);
    };

    // Add -4 frame button
    var jumpBack4f = bottomRow.add("button", undefined, "-4f");
    jumpBack4f.preferredSize.width = 35;
    jumpBack4f.onClick = function() {
        jumpByFramesInWindow(-4);
    };

    // Frame input group
    var frameGroup = bottomRow.add("group");
    frameGroup.orientation = "row";
    frameGroup.alignChildren = ["left", "center"];
    frameGroup.spacing = 5;

    var frameInput = frameGroup.add("edittext", undefined, "");
    frameInput.preferredSize.width = 50;
    frameInput.helpTip = "Enter number of frames to jump";

    var frameJumpBtn = frameGroup.add("button", undefined, "Jump");
    frameJumpBtn.preferredSize.width = 45;
    frameJumpBtn.onClick = function() {
        jumpByFramesInWindow(parseInt(frameInput.text));
    };

    // Add +4 frame button
    var jumpForward4f = bottomRow.add("button", undefined, "+4f");
    jumpForward4f.preferredSize.width = 35;
    jumpForward4f.onClick = function() {
        jumpByFramesInWindow(4);
    };

    // Jump forward buttons
    var jumpForward05s = bottomRow.add("button", undefined, "+0.5s");
    jumpForward05s.preferredSize.width = 45;
    jumpForward05s.onClick = function() {
        jumpByTimeInWindow(0.5);
    };

    var jumpForward1s = bottomRow.add("button", undefined, "+1s");
    jumpForward1s.preferredSize.width = 45;
    jumpForward1s.onClick = function() {
        jumpByTimeInWindow(1);
    };

    // Status area
    jumpWindow.add("panel");
    
    var statusGroup = jumpWindow.add("group");
    statusGroup.orientation = "row";
    statusGroup.alignChildren = ["fill", "center"];
    
    var statusLabel = statusGroup.add("statictext", undefined, "Status:");
    statusLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
    
    var statusText = statusGroup.add("statictext", undefined, "Ready");
    statusText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
    statusText.alignment = ["fill", "center"];

    // Function to jump by seconds for this window
    function jumpByTimeInWindow(seconds) {
        try {
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                // Apply calibration offset
                var calibrationMs = parseFloat(calibrationInputWindow.text) || 0;
                var calibrationSeconds = calibrationMs / 1000;
                
                var newTime = comp.time + seconds + calibrationSeconds;
                // Clamp to composition duration
                newTime = Math.max(0, Math.min(newTime, comp.duration));
                comp.time = newTime;
                
                // Update status with the new time
                var timeInFrames = Math.floor(newTime * comp.frameRate);
                var calMessage = calibrationMs !== 0 ? " (cal: " + calibrationMs + "ms)" : "";
                statusText.text = "Jumped to frame " + timeInFrames + " (" + newTime.toFixed(2) + "s)" + calMessage;
            }
        } catch (error) {
            statusText.text = "Error: " + error.toString();
        }
    }

    // Function to jump by frames for this window
    function jumpByFramesInWindow(frames) {
        try {
            if (isNaN(frames)) {
                statusText.text = "Please enter a valid frame number";
                return;
            }

            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                // Apply calibration offset
                var calibrationMs = parseFloat(calibrationInputWindow.text) || 0;
                var calibrationSeconds = calibrationMs / 1000;
                
                var seconds = frames / comp.frameRate;
                var newTime = comp.time + seconds + calibrationSeconds;
                // Clamp to composition duration
                newTime = Math.max(0, Math.min(newTime, comp.duration));
                comp.time = newTime;
                
                var calMessage = calibrationMs !== 0 ? " (cal: " + calibrationMs + "ms)" : "";
                statusText.text = "Jumped " + frames + " frames to " + newTime.toFixed(2) + "s" + calMessage;
            }
        } catch (error) {
            statusText.text = "Error: " + error.toString();
        }
    }
    
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
    
    // Close button
    var closeBtn = jumpWindow.add("button", undefined, "Close");
    closeBtn.onClick = function() {
        jumpWindow.close();
    };
    
    jumpWindow.center();
    jumpWindow.show();
}



 