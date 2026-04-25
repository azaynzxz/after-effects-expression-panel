(function (thisObj) {
    /*
    Expression Panel - After Effects ExtendScript
    Non-modal dockable panel for expression snippets
    Author: azaynzxz
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
        "Rotation PingPong": "// Egg crack motion: rapid left-right rotations, then pause, then repeat\nlet amp = 15; // rotation amplitude\nlet pauseDuration = 0.8; // pause duration between bursts\nlet rotationSpeed = 12; // oscillations per second during rotation phase\n\n// Helper functions\nfunction random(seed) {\n  return fract(Math.sin(seed * 91.345) * 47453.321);\n}\nfunction fract(x) {\n  return x - Math.floor(x);\n}\n\n// Use a fixed cycle period (max possible cycle time)\n// This ensures consistent cycle boundaries\nlet maxRotations = 7;\nlet maxRotationDuration = maxRotations / rotationSpeed;\nlet fixedCycleTime = maxRotationDuration + pauseDuration;\n\n// Calculate which cycle we're in\nlet cycleIndex = Math.floor(time / fixedCycleTime);\n\n// Randomize number of rotations for this cycle (4-7 rotations)\nlet randRotations = random(cycleIndex * 7.3);\nlet numRotations = Math.floor(4 + randRotations * 4); // 4, 5, 6, or 7\n\n// Calculate rotation duration for this cycle\nlet rotationDuration = numRotations / rotationSpeed;\n\n// Time within current cycle\nlet t = time - (cycleIndex * fixedCycleTime);\n\n// Output: rotate during rotation phase, pause otherwise\nlet output = (t < rotationDuration)\n  ? Math.sin(t * rotationSpeed * 2 * Math.PI) * amp\n  : 0;\n\noutput;",
        "Thunder Flicker": "seedRandom(index + Math.floor(time), true);\n\nrand = random();  // Random chance per second\nrate = rand > 0.7 ? 20 : rand > 0.4 ? 8 : 2;\n\nt = time * rate;\nflicker = Math.floor(t) % 2 == 0 ? 100 : 0;\n\nflicker",
        "Horror Light": "// Seed randomness per cycle\ncycleIndex = Math.floor(time);\nseedRandom(index + cycleIndex, true);\n\n// Random pause duration (0.3s–1.0s)\npauseDuration = 0.3 + random() * 0.7;\nflickerDuration = 0.4; // duration of flicker before pausing\ncycleTime = pauseDuration + flickerDuration;\n\nt = time % cycleTime;\n\n// If within flicker time, do horror flicker; otherwise, stay dim\nif (t < flickerDuration) {\n  // Seed for flicker randomness\n  seedRandom(index + Math.floor(time * 10), true);\n\n  rate = 10 + random() * 40;\n  flick = (Math.sin(time * rate * 6.2831) * 43758.5453) % 1;\n  flick = flick - Math.floor(flick); // same as fract()\n\n  // Flicker behavior\n  flickerValue = flick < 0.2 ? 100 :\n                 flick < 0.25 ? 70 :\n                 flick < 0.3 ? 40 : \n                 10 + flick * 20; // low-level jitter\n} else {\n  flickerValue = 0; // paused (off)\n}\n\nflickerValue;",
        "Scale Pulse": "// Settings\nminScale = 90;\nmaxScale = 110;\nspeed = 2; // cycles per second\n\n// Oscillate value using sine\ns = (Math.sin(time * Math.PI * speed) + 1) / 2; // normalized between 0–1\n\n// Interpolate scale using linear easing\nscaleVal = linear(s, 0, 1, minScale, maxScale);\n[scaleVal, scaleVal]",
        "Walk/Run Arc": "// Settings\nspeed = 100; // pixels per second\narcHeight = 20; // arc height in pixels\nfrequency = 2; // steps per second\ndirection = 1; // 1 for right, -1 for left\n\n// Calculate movement\nx = time * speed * direction;\ny = Math.sin(time * frequency * 2 * Math.PI) * arcHeight;\n\nvalue + [x, y]",
        "Audio Sync": "thisComp.layer(\"Audio Amplitude\").effect(\"Both Channels\")(\"Slider\")/75",
        "V Scale": "// Settings\nminScaleY = 100;\nmaxScaleY = 102;\nspeed = 2; // cycles per second\n\n// Oscillate value using sine\ns = (Math.sin(time * Math.PI * speed) + 1) / 2; // normalized between 0–1\n\n// Interpolate scale using linear easing\nscaleY = linear(s, 0, 1, minScaleY, maxScaleY);\n[100, scaleY]",
        "B Posterizer": "Enable time remapping on selected layers and apply posterizeTime"
    };
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



        // Bottom row with navigation buttons and frame input
        var bottomRow = myPanel.add("group");
        bottomRow.orientation = "row";
        bottomRow.alignChildren = ["left", "center"];
        bottomRow.spacing = 2;

        // Jump backward buttons
        var jumpBack1s = bottomRow.add("button", undefined, "-1s");
        jumpBack1s.preferredSize.width = 38;
        jumpBack1s.onClick = function () {
            jumpByTime(-1);
        };

        var jumpBack05s = bottomRow.add("button", undefined, "-0.5s");
        jumpBack05s.preferredSize.width = 38;
        jumpBack05s.onClick = function () {
            jumpByTime(-0.5);
        };

        // Add -4 frame button
        var jumpBack4f = bottomRow.add("button", undefined, "-4f");
        jumpBack4f.preferredSize.width = 30;
        jumpBack4f.onClick = function () {
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
        frameJumpBtn.onClick = function () {
            jumpByFrames(parseInt(frameInput.text));
        };

        // Add +4 frame button
        var jumpForward4f = bottomRow.add("button", undefined, "+4f");
        jumpForward4f.preferredSize.width = 30;
        jumpForward4f.onClick = function () {
            jumpByFrames(4);
        };

        // Jump forward buttons
        var jumpForward05s = bottomRow.add("button", undefined, "+0.5s");
        jumpForward05s.preferredSize.width = 38;
        jumpForward05s.onClick = function () {
            jumpByTime(0.5);
        };

        var jumpForward1s = bottomRow.add("button", undefined, "+1s");
        jumpForward1s.preferredSize.width = 38;
        jumpForward1s.onClick = function () {
            jumpByTime(1);
        };

        // Function to jump by seconds
        function jumpByTime(seconds) {
            try {
                var comp = app.project.activeItem;
                if (comp && comp instanceof CompItem) {
                    var newTime = comp.time + seconds;
                    // Clamp to composition duration
                    newTime = Math.max(0, Math.min(newTime, comp.duration));
                    comp.time = newTime;

                    // Update status with the new time
                    var timeInFrames = Math.floor(newTime * comp.frameRate);
                    updateStatus("Jumped to frame " + timeInFrames + " (" + newTime.toFixed(2) + "s)");
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
                    var seconds = frames / comp.frameRate;
                    var newTime = comp.time + seconds;
                    // Clamp to composition duration
                    newTime = Math.max(0, Math.min(newTime, comp.duration));
                    comp.time = newTime;

                    updateStatus("Jumped " + frames + " frames to " + newTime.toFixed(2) + "s");
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

                // Clamp to composition duration
                totalSeconds = Math.max(0, Math.min(totalSeconds, mainComp.duration));

                // Jump to time
                mainComp.time = totalSeconds;

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
        addKeyframesBtn.onClick = function () {
            addCurrentKeyframes();
        };

        // Add Hide Layers button
        var hideLayersBtn = utilRow1.add("button", undefined, "Hide Layers");
        hideLayersBtn.preferredSize.height = 16;
        hideLayersBtn.helpTip = "Hide all layers starting with 'hide' or 'x' in main_comp";
        hideLayersBtn.onClick = function () {
            hideAllLayersNamedHide();
        };

        // Add Show Layers button
        var showLayersBtn = utilRow1.add("button", undefined, "Show Layers");
        showLayersBtn.preferredSize.height = 16;
        showLayersBtn.helpTip = "Show all layers starting with 'hide' or 'x' in main_comp";
        showLayersBtn.onClick = function () {
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
        trimSelectedBtn.onClick = function () {
            trimSelectedLayers();
        };

        // Add Batch Duration button
        var batchDurationBtn = utilRow2.add("button", undefined, "Batch Duration");
        batchDurationBtn.preferredSize.height = 16;
        batchDurationBtn.helpTip = "Change duration of selected precomp source compositions";
        batchDurationBtn.onClick = function () {
            changeBatchDuration();
        };

        // Add X Crop button
        var xCropBtn = utilRow2.add("button", undefined, "X Crop");
        xCropBtn.preferredSize.height = 16;
        xCropBtn.helpTip = "Open X Crop tool for smart composition cropping";
        xCropBtn.onClick = function () {
            openXCropTool();
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

        // Basic animation buttons - paired in 2-column rows
        var basicPairs = [
            ["Fast Wiggle", "Posterize Time"],
            ["Stop Motion", "Time Rotation"],
            ["Up Down", "Left Right"],
            ["Rot PingPong", "Thunder Flicker"],
            ["Horror Light", "Scale Pulse"],
            ["V Scale", "B Posterizer"]
        ];
        // Map short labels to expression keys
        var labelToKey = { "Rot PingPong": "Rotation PingPong" };

        for (var bp = 0; bp < basicPairs.length; bp++) {
            var bRow = basicGroup.add("group");
            bRow.orientation = "row";
            bRow.alignChildren = ["fill", "center"];
            bRow.spacing = 2;

            for (var bc = 0; bc < basicPairs[bp].length; bc++) {
                var label = basicPairs[bp][bc];
                var key = labelToKey[label] || label;
                (function (lbl, expressionKey) {
                    var btn = bRow.add("button", undefined, lbl);
                    btn.alignment = ["fill", "center"];
                    btn.preferredSize.height = 16;
                    btn.helpTip = EXPRESSIONS[expressionKey] || expressionKey;
                    btn.onClick = function () {
                        if (expressionKey === "Time Rotation") {
                            showTimeRotationDialog();
                        } else if (expressionKey === "Up Down") {
                            showUpDownDialog();
                        } else if (expressionKey === "Left Right") {
                            showLeftRightDialog();
                        } else if (expressionKey === "Fast Wiggle") {
                            showWigglePresetsDialog();
                        } else if (expressionKey === "Posterize Time") {
                            showPosterizeTimeDialog();
                        } else if (expressionKey === "Rotation PingPong") {
                            showRotationPingPongDialog();
                        } else if (expressionKey === "Thunder Flicker") {
                            showThunderFlickerDialog();
                        } else if (expressionKey === "Scale Pulse") {
                            showScalePulseDialog();
                        } else if (expressionKey === "V Scale") {
                            showVScaleDialog();
                        } else if (expressionKey === "B Posterizer") {
                            showBPosterizerDialog();
                        } else {
                            handleExpressionClick(expressionKey, EXPRESSIONS[expressionKey]);
                        }
                    };
                })(label, key);
            }
        }

        // Loops (Left Column)
        leftCol.add("panel");
        var loopTitle = leftCol.add("statictext", undefined, "Loops");
        loopTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
        loopTitle.alignment = "center";

        var loopsGrid = leftCol.add("group");
        loopsGrid.orientation = "row";
        loopsGrid.alignChildren = ["fill", "top"];
        loopsGrid.spacing = 2;

        var loopCol1 = loopsGrid.add("group");
        loopCol1.orientation = "column";
        loopCol1.alignChildren = ["fill", "top"];
        loopCol1.spacing = 1;

        var loopCol2 = loopsGrid.add("group");
        loopCol2.orientation = "column";
        loopCol2.alignChildren = ["fill", "top"];
        loopCol2.spacing = 1;

        addButtonsToGroup(loopCol1, ["Loop Cycle", "Loop Continue"]);
        addButtonsToGroup(loopCol2, ["Loop PingPong"]);


        // Looper button (part of Loops category)
        var looperBtn = loopCol2.add("button", undefined, "Looper");
        looperBtn.alignment = ["fill", "center"];
        looperBtn.preferredSize.height = 16;
        looperBtn.helpTip = "Enable time remap loop on selected precomp layer";
        looperBtn.onClick = function () {
            looperTool();
        };

        // Tools section (separated from Loops)
        leftCol.add("panel");
        var toolsTitle = leftCol.add("statictext", undefined, "Tools");
        toolsTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
        toolsTitle.alignment = "center";

        // Tools row 1: Create Null | Reverse KF
        var toolsRow1 = leftCol.add("group");
        toolsRow1.orientation = "row";
        toolsRow1.alignChildren = ["fill", "center"];
        toolsRow1.spacing = 2;

        var createNullBtnMain = toolsRow1.add("button", undefined, "Create Null");
        createNullBtnMain.alignment = ["fill", "center"];
        createNullBtnMain.preferredSize.height = 16;
        createNullBtnMain.helpTip = "Creates a null object for the selected layer";
        createNullBtnMain.onClick = function () {
            createNullObject();
        };

        var reverseKFBtn2 = toolsRow1.add("button", undefined, "Reverse KF");
        reverseKFBtn2.alignment = ["fill", "center"];
        reverseKFBtn2.preferredSize.height = 16;
        reverseKFBtn2.helpTip = "Reverse selected keyframes (select keyframes in timeline first)";
        reverseKFBtn2.onClick = function () {
            reverseAllKeyframes();
        };

        // Tools row 2: Batch Scale | Smart Precomp
        var toolsRow2 = leftCol.add("group");
        toolsRow2.orientation = "row";
        toolsRow2.alignChildren = ["fill", "center"];
        toolsRow2.spacing = 2;

        var batchScaleBtn2 = toolsRow2.add("button", undefined, "Batch Scale");
        batchScaleBtn2.alignment = ["fill", "center"];
        batchScaleBtn2.preferredSize.height = 16;
        batchScaleBtn2.helpTip = "Batch scale layers with presets (34%, 50%, 100%)";
        batchScaleBtn2.onClick = function () {
            showBatchScaleDialog();
        };

        var smartPrecompBtn2 = toolsRow2.add("button", undefined, "Smart Precomp");
        smartPrecompBtn2.alignment = ["fill", "center"];
        smartPrecompBtn2.preferredSize.height = 16;
        smartPrecompBtn2.helpTip = "Create precomp from selected layers while retaining size, scale and position";
        smartPrecompBtn2.onClick = function () {
            createSmartPrecomp();
        };

        // Tools row 3: CP Movement | Auto Zoom
        var toolsRow3 = leftCol.add("group");
        toolsRow3.orientation = "row";
        toolsRow3.alignChildren = ["fill", "center"];
        toolsRow3.spacing = 2;

        var cpMovementBtn2 = toolsRow3.add("button", undefined, "CP Movement");
        cpMovementBtn2.alignment = ["fill", "center"];
        cpMovementBtn2.preferredSize.height = 16;
        cpMovementBtn2.helpTip = "Copy movement from a layer inside a precomp to this layer's position";
        cpMovementBtn2.onClick = function () {
            showCPMovementDialog();
        };

        var autoZoomBtn2 = toolsRow3.add("button", undefined, "Auto Zoom");
        autoZoomBtn2.alignment = ["fill", "center"];
        autoZoomBtn2.preferredSize.height = 16;
        autoZoomBtn2.helpTip = "Add zoom in/out keyframes to selected layers with easing";
        autoZoomBtn2.onClick = function () {
            showAutoZoomDialog();
        };

        // Tools row 4: Walk/Run | Fish-like
        var toolsRow4 = leftCol.add("group");
        toolsRow4.orientation = "row";
        toolsRow4.alignChildren = ["fill", "center"];
        toolsRow4.spacing = 2;

        var walkRunBtn2 = toolsRow4.add("button", undefined, "Walk/Run");
        walkRunBtn2.alignment = ["fill", "center"];
        walkRunBtn2.preferredSize.height = 16;
        walkRunBtn2.helpTip = "Add walking/running arc movement to selected layers";
        walkRunBtn2.onClick = function () {
            showWalkRunDialog();
        };

        var fishLikeBtn2 = toolsRow4.add("button", undefined, "Fish-like");
        fishLikeBtn2.alignment = ["fill", "center"];
        fishLikeBtn2.preferredSize.height = 16;
        fishLikeBtn2.helpTip = "Swimming fish animation";
        fishLikeBtn2.onClick = function () {
            showFishDialog();
        };

        // Tools row 5: Attach Leg & Add Mouth
        var toolsRow5 = leftCol.add("group");
        toolsRow5.orientation = "row";
        toolsRow5.alignChildren = ["fill", "center"];
        toolsRow5.spacing = 2;

        var attachLegBtn = toolsRow5.add("button", undefined, "Attach Leg");
        attachLegBtn.alignment = ["fill", "center"];
        attachLegBtn.preferredSize.height = 16;
        attachLegBtn.helpTip = "Attach a leg comp to the selected layer";
        attachLegBtn.onClick = function () {
            showAttachLegDialog();
        };

        var attachMouthBtn = toolsRow5.add("button", undefined, "Add Mouth");
        attachMouthBtn.alignment = ["fill", "center"];
        attachMouthBtn.preferredSize.height = 16;
        attachMouthBtn.helpTip = "Attach a mouth comp to the selected layer";
        attachMouthBtn.onClick = function () {
            showAttachMouthDialog();
        };

        // Tools row 6: Pinch | List Jumper
        var toolsRow6 = leftCol.add("group");
        toolsRow6.orientation = "row";
        toolsRow6.alignChildren = ["fill", "center"];
        toolsRow6.spacing = 2;

        var pinchBtn = toolsRow6.add("button", undefined, "Pinch");
        pinchBtn.alignment = ["fill", "center"];
        pinchBtn.preferredSize.height = 16;
        pinchBtn.helpTip = "Add a pinch preset animation (+12%, -15%, etc.)";
        pinchBtn.onClick = function () {
            showPinchDialog();
        };

        var listJumperBtn = toolsRow6.add("button", undefined, "List Jumper");
        listJumperBtn.alignment = ["fill", "center"];
        listJumperBtn.preferredSize.height = 16;
        listJumperBtn.helpTip = "Open List Jumper - jump to timeline positions based on CSV word data";
        listJumperBtn.onClick = function () {
            var scriptFile = new File($.fileName).parent.absoluteURI + "/List_Jumper.jsx";
            $.evalFile(new File(scriptFile));
        };

        // Layer Utils Section - 2 column layout
        leftCol.add("panel");
        var layUtilTitle = leftCol.add("statictext", undefined, "Layer Utils");
        layUtilTitle.graphics.font = ScriptUI.newFont("Arial", "BOLD", 9);
        layUtilTitle.alignment = "center";

        var layUtilRow = leftCol.add("group");
        layUtilRow.orientation = "row";
        layUtilRow.alignChildren = ["fill", "top"];
        layUtilRow.spacing = 2;

        // Sub-col 1: Stagger + Anchor Point
        var layUtilSubCol1 = layUtilRow.add("group");
        layUtilSubCol1.orientation = "column";
        layUtilSubCol1.alignChildren = ["center", "top"];
        layUtilSubCol1.spacing = 1;

        // Stagger UI Section
        var staggerRow = layUtilSubCol1.add("group");
        staggerRow.orientation = "row";
        staggerRow.alignChildren = ["center", "center"];
        staggerRow.spacing = 1;

        var staggerLeftBtn = staggerRow.add("button", undefined, "<");
        staggerLeftBtn.preferredSize.width = 24;
        staggerLeftBtn.preferredSize.height = 16;
        staggerLeftBtn.helpTip = "Stagger Ascending";
        staggerLeftBtn.onClick = function () {
            staggerLayers(parseFloat(staggerInput.text) || 1, "Ascending");
        };

        var staggerInput = staggerRow.add("edittext", undefined, "1");
        staggerInput.preferredSize.width = 32;
        staggerInput.preferredSize.height = 18;
        staggerInput.helpTip = "Offset frames";
        staggerInput.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
        staggerInput.justify = "center";

        var staggerRightBtn = staggerRow.add("button", undefined, ">");
        staggerRightBtn.preferredSize.width = 24;
        staggerRightBtn.preferredSize.height = 16;
        staggerRightBtn.helpTip = "Stagger Descending";
        staggerRightBtn.onClick = function () {
            staggerLayers(parseFloat(staggerInput.text) || 1, "Descending");
        };

        // Anchor Point Section
        var anchorGroup = layUtilSubCol1.add("group");
        anchorGroup.orientation = "column";
        anchorGroup.alignChildren = ["center", "center"];
        anchorGroup.spacing = 1;

        var symbols = [["\\", "^", "/"], ["<", "o", ">"], ["/", "v", "\\"]];
        for (var r = 0; r < 3; r++) {
            var row = anchorGroup.add("group");
            row.orientation = "row";
            row.spacing = 1;
            for (var c = 0; c < 3; c++) {
                (function (rr, cc, sym) {
                    var btn = row.add("button", undefined, sym);
                    btn.preferredSize = [24, 18];
                    btn.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 8);
                    btn.onClick = function () {
                        moveAnchorPoint(cc, rr);
                    };
                })(r, c, symbols[r][c]);
            }
        }

        // Sub-col 2: Linker, Bellow, Align KF Only, Align to MK
        var layUtilSubCol2 = layUtilRow.add("group");
        layUtilSubCol2.orientation = "column";
        layUtilSubCol2.alignChildren = ["fill", "top"];
        layUtilSubCol2.spacing = 2;

        var linkerBtnLU = layUtilSubCol2.add("button", undefined, "Linker");
        linkerBtnLU.preferredSize.height = 16;
        linkerBtnLU.helpTip = "Parent selected layers to the last selected layer";
        linkerBtnLU.onClick = function () {
            linkerLayers();
        };

        var bellowBtnLU = layUtilSubCol2.add("button", undefined, "Bellow");
        bellowBtnLU.preferredSize.height = 16;
        bellowBtnLU.helpTip = "Move selected layers below the last selected layer";
        bellowBtnLU.onClick = function () {
            Bellow();
        };

        var alignKfOnlyChk = layUtilSubCol2.add("checkbox", undefined, "Align KF Only");
        alignKfOnlyChk.value = true;
        alignKfOnlyChk.helpTip = "Check to align keyframes, uncheck to align layers to markers";

        var alignMkBtn = layUtilSubCol2.add("button", undefined, "Align to MK");
        alignMkBtn.preferredSize.height = 16;
        alignMkBtn.helpTip = "Align selected keyframes or layers to active composition markers";
        alignMkBtn.onClick = function () {
            if (alignKfOnlyChk.value) {
                alignKeyframesToMarkers();
            } else {
                alignLayersToMarkers();
            }
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
        xLockBtn.onClick = function () {
            toggleXLockLayers();
        };

        // Add Auto Trim button
        var autoTrimBtn = utilityGroup.add("button", undefined, "Auto Trim");
        autoTrimBtn.preferredSize.height = 16;
        autoTrimBtn.helpTip = "Trim overlapping layers automatically in main_comp";
        autoTrimBtn.onClick = function () {
            autoTrimLayers();
        };

        // Add Copy Audio button
        var copyAudioBtn = utilityGroup.add("button", undefined, "Copy Audio");
        copyAudioBtn.preferredSize.height = 16;
        copyAudioBtn.helpTip = "Copy audio comp from main_comp to current comp and sync it";
        copyAudioBtn.onClick = function () {
            copyAndSyncAudio();
        };

        // Add Audio Sync button
        var audioSyncBtn = utilityGroup.add("button", undefined, "Audio Sync");
        audioSyncBtn.preferredSize.height = 16;
        audioSyncBtn.helpTip = "Apply audio sync expression to time remap property";
        audioSyncBtn.onClick = function () {
            applyAudioSyncExpression();
        };

        // Add Lips CTRL button
        var lipsCtrlBtn = utilityGroup.add("button", undefined, "Lips CTRL");
        lipsCtrlBtn.preferredSize.height = 16;
        lipsCtrlBtn.helpTip = "Open Lips CTRL panel to add Stop/Resume markers for audio sync";
        lipsCtrlBtn.onClick = function () {
            showLipsCtrlDialog();
        };

        // Add Audio Marker button
        var audioMarkersBtn = utilityGroup.add("button", undefined, "Audio Marker");
        audioMarkersBtn.preferredSize.height = 16;
        audioMarkersBtn.helpTip = "Copy Audio, analyze spikes, and add markers";
        audioMarkersBtn.onClick = function () {
            copyAndSyncAudio();
            showAudioMarkersDialog();
        };

        // Add Choppy Flip button
        var choppyFlipBtn = utilityGroup.add("button", undefined, "Choppy Flip");
        choppyFlipBtn.preferredSize.height = 16;
        choppyFlipBtn.helpTip = "Add choppy left-right flip animation to selected layers";
        choppyFlipBtn.onClick = function () {
            showChoppyFlipDialog();
        };

        // Add Water Distort button
        var waterDistortBtn = utilityGroup.add("button", undefined, "Water Distort");
        waterDistortBtn.preferredSize.height = 16;
        waterDistortBtn.helpTip = "Adds water distortion effect to selected layers";
        waterDistortBtn.onClick = function () {
            showWaterDistortionDialog();
        };

        // Add Rim Light button
        var rimLightBtn = utilityGroup.add("button", undefined, "Rim Light");
        rimLightBtn.preferredSize.height = 16;
        rimLightBtn.helpTip = "Adds Drop Shadow, Set Matte, CC Composite, Glow";
        rimLightBtn.onClick = function () {
            addRimLightEffects();
        };

        // Add Bounce x2 button
        var bounceX2Btn = utilityGroup.add("button", undefined, "Bounce x2");
        bounceX2Btn.preferredSize.height = 16;
        bounceX2Btn.helpTip = "Creates 2 bouncy keyframes: 0→100 (scale only)";
        bounceX2Btn.onClick = function () {
            addBounceKeyframes();
        };

        // Add Squash button
        var squashBtn = utilityGroup.add("button", undefined, "Squash");
        squashBtn.preferredSize.height = 16;
        squashBtn.helpTip = "Squash animation with keyframes on scale";
        squashBtn.onClick = function () {
            applySquashAnimation();
        };

        // Add Puppet→Null button
        var puppetToNullBtn = utilityGroup.add("button", undefined, "Puppet→Null");
        puppetToNullBtn.preferredSize.height = 16;
        puppetToNullBtn.helpTip = "Create null objects for puppet pins on selected layer(s) - supports multiple layers";
        puppetToNullBtn.onClick = function () {
            createPuppetNulls();
        };

        // Add Mask Fit button
        var maskFitBtn = utilityGroup.add("button", undefined, "Mask Fit");
        maskFitBtn.preferredSize.height = 16;
        maskFitBtn.helpTip = "Use selected or first mask to auto-position and scale layer to fit comp";
        maskFitBtn.onClick = function () {
            applyMaskAutoFit();
        };

        // Add Flip H button
        var flipHorizontalBtn = utilityGroup.add("button", undefined, "Flip H");
        flipHorizontalBtn.preferredSize.height = 16;
        flipHorizontalBtn.helpTip = "Flip layers horizontally (invert X scale)";
        flipHorizontalBtn.onClick = function () {
            flipHorizontal();
        };

        // Add Flip V button
        var flipVerticalBtn = utilityGroup.add("button", undefined, "Flip V");
        flipVerticalBtn.preferredSize.height = 16;
        flipVerticalBtn.helpTip = "Flip layers vertically (invert Y scale)";
        flipVerticalBtn.onClick = function () {
            flipVertical();
        };

        // Add Kick Out button
        var kickOutBtn = utilityGroup.add("button", undefined, "Kick Out");
        kickOutBtn.preferredSize.height = 16;
        kickOutBtn.helpTip = "Kick layer out of frame (up or right) with keyframes";
        kickOutBtn.onClick = function () {
            showKickOutOfFrameDialog();
        };

        // Add Put Here button
        var putHereBtn = utilityGroup.add("button", undefined, "Put Here");
        putHereBtn.preferredSize.height = 16;
        putHereBtn.helpTip = "Auto animate layer entering the frame";
        putHereBtn.onClick = function () {
            showPutHereDialog();
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
        prevLayerBtn.onClick = function () {
            jumpToPreviousLayerDirect();
        };

        // Next Layer button
        var nextLayerBtn = layerNavGroup.add("button", undefined, ">");
        nextLayerBtn.preferredSize.width = 30;
        nextLayerBtn.preferredSize.height = 20;
        nextLayerBtn.helpTip = "Jump to next layer start";
        nextLayerBtn.onClick = function () {
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
                    (function (expressionName, expressionCode) {
                        btn.onClick = function () {
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
                            } else if (expressionName === "B Posterizer") {
                                showBPosterizerDialog();
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

        // Layout
        myPanel.layout.layout(true);

        return myPanel;
    }


    // Audio Sync Expression function (Audio Amplitude)
    function applyAudioSyncExpression() {
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

            app.beginUndoGroup("Apply Audio Sync Expression");

            var expression = [
                'try {',
                '    var ampLayer = thisComp.layer("Audio Amplitude");',
                '    var ampVal = ampLayer.effect("Both Channels")("Slider") / 75;',
                '    var isFrozen = false;',
                '    var freezeTime = 0;',
                '    ',
                '    if (marker.numKeys > 0) {',
                '        for (var i = 1; i <= marker.numKeys; i++) {',
                '            var mk = marker.key(i);',
                '            if (mk.time <= time) {',
                '                var c = mk.comment.toLowerCase();',
                '                if (c.indexOf("stop") !== -1) {',
                '                    isFrozen = true;',
                '                    freezeTime = mk.time;',
                '                } else if (c.indexOf("sync") !== -1 || c.indexOf("resume") !== -1) {',
                '                    isFrozen = false;',
                '                }',
                '            } else {',
                '                break;',
                '            }',
                '        }',
                '    }',
                '    ',
                '    if (isFrozen) {',
                '        ampLayer.effect("Both Channels")("Slider").valueAtTime(freezeTime) / 75;',
                '    } else {',
                '        ampVal;',
                '    }',
                '} catch(e) {',
                '    value;',
                '}'
            ].join('\n');

            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];

                if (!layer.timeRemapEnabled) {
                    layer.timeRemapEnabled = true;
                }

                layer.timeRemap.expression = expression;
            }

            app.endUndoGroup();
            updateStatus("Applied marker-aware audio sync to " + selectedLayers.length + " layer(s)");

        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Lips CTRL dialog — add Stop / Resume comp markers at current playhead
    function showLipsCtrlDialog() {
        var dlg = new Window("palette", "Lips CTRL", undefined, { resizeable: false });
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.spacing = 6;
        dlg.margins = 12;

        // Info label
        var infoTxt = dlg.add("statictext", undefined, "Adds marker at current playhead:");
        infoTxt.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

        // Buttons row
        var btnRow = dlg.add("group");
        btnRow.orientation = "row";
        btnRow.alignChildren = ["fill", "center"];
        btnRow.spacing = 6;

        var stopBtn = btnRow.add("button", undefined, "\u23F9 Stop");
        stopBtn.preferredSize.height = 28;
        stopBtn.helpTip = "Freeze lips at current playhead time (adds \"stop\" marker)";
        stopBtn.onClick = function () {
            addLipsMarker("stop");
        };

        var resumeBtn = btnRow.add("button", undefined, "\u25B6 Resume");
        resumeBtn.preferredSize.height = 28;
        resumeBtn.helpTip = "Resume audio-driven lips at current playhead time (adds \"sync\" marker)";
        resumeBtn.onClick = function () {
            addLipsMarker("sync");
        };

        // Status label
        var statusLbl = dlg.add("statictext", undefined, "Ready");
        statusLbl.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
        statusLbl.alignment = ["fill", "center"];

        function addLipsMarker(comment) {
            try {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    statusLbl.text = "No active comp!";
                    return;
                }

                var selectedLayers = comp.selectedLayers;
                if (selectedLayers.length === 0) {
                    statusLbl.text = "No layers selected!";
                    return;
                }

                app.beginUndoGroup("Add Lips Marker");

                var t = comp.time;
                var markerVal = new MarkerValue(comment);

                for (var i = 0; i < selectedLayers.length; i++) {
                    selectedLayers[i].property("Marker").setValueAtTime(t, markerVal);
                }

                app.endUndoGroup();

                var label = comment === "stop" ? "STOP" : "RESUME";
                var ts = Math.floor(t / 60) + ":" +
                    (t % 60 < 10 ? "0" : "") + t.toFixed(2).replace(".", ":");
                statusLbl.text = label + " @ " + ts + " on " + selectedLayers.length + " layer(s)";
                updateStatus("Lips " + label + " marker added to " + selectedLayers.length + " layer(s) at " + t.toFixed(2) + "s");

            } catch (error) {
                statusLbl.text = "Error: " + error.toString();
                updateStatus("Lips CTRL error: " + error.toString());
            }
        }

        dlg.center();
        dlg.show();
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
        slowBtn.onClick = function () {
            speedInput.text = "90";
            directionCheck.value = false;
        };

        var normalBtn = presetGroup.add("button", undefined, "Normal");
        normalBtn.onClick = function () {
            speedInput.text = "360";
            directionCheck.value = false;
        };

        var fastBtn = presetGroup.add("button", undefined, "Fast");
        fastBtn.onClick = function () {
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
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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
        stopHereCheck.onClick = function () {
            if (stopHereCheck.value) {
                var currentTime = getCurrentTimeFormatted();
                if (currentTime) {
                    stopTimeInput.text = currentTime;
                }
            }
        };

        // Randomize duration section
        var randomizeGroup = dialog.add("group");
        randomizeGroup.orientation = "column";
        randomizeGroup.alignChildren = ["fill", "top"];
        randomizeGroup.spacing = 4;

        var randomizeCheck = randomizeGroup.add("checkbox", undefined, "Randomize duration");
        randomizeCheck.value = false;
        randomizeCheck.helpTip = "When multiple layers selected, randomize frames per cycle between min and max";

        var randomizeInputGroup = randomizeGroup.add("group");
        randomizeInputGroup.orientation = "row";
        randomizeInputGroup.alignChildren = ["left", "center"];
        randomizeInputGroup.spacing = 4;

        randomizeInputGroup.add("statictext", undefined, "Min:");
        var minFramesInput = randomizeInputGroup.add("edittext", undefined, "12");
        minFramesInput.preferredSize.width = 50;

        randomizeInputGroup.add("statictext", undefined, "Max:");
        var maxFramesInput = randomizeInputGroup.add("edittext", undefined, "35");
        maxFramesInput.preferredSize.width = 50;

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
        subtleBtn.onClick = function () {
            ampInput.text = "12";
            framesInput.text = "12";
        };

        var normalBtn = presetRow1.add("button", undefined, "Normal");
        normalBtn.preferredSize.width = 60;
        normalBtn.preferredSize.height = 20;
        normalBtn.onClick = function () {
            ampInput.text = "50";
            framesInput.text = "5";
        };

        var crazyBtn = presetRow1.add("button", undefined, "Crazy");
        crazyBtn.preferredSize.width = 60;
        crazyBtn.preferredSize.height = 20;
        crazyBtn.onClick = function () {
            ampInput.text = "20";
            framesInput.text = "3";
        };

        var preset1Btn = presetRow1.add("button", undefined, "7,9");
        preset1Btn.preferredSize.width = 60;
        preset1Btn.preferredSize.height = 20;
        preset1Btn.onClick = function () {
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
        preset2Btn.onClick = function () {
            ampInput.text = "24";
            framesInput.text = "24";
        };

        var preset3Btn = presetRow2.add("button", undefined, "35,24");
        preset3Btn.preferredSize.width = 60;
        preset3Btn.preferredSize.height = 20;
        preset3Btn.onClick = function () {
            ampInput.text = "35";
            framesInput.text = "24";
        };

        var preset4Btn = presetRow2.add("button", undefined, "24,12");
        preset4Btn.preferredSize.width = 60;
        preset4Btn.preferredSize.height = 20;
        preset4Btn.onClick = function () {
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
        preset5Btn.onClick = function () {
            ampInput.text = "50";
            framesInput.text = "24";
        };

        var preset6Btn = presetRow3.add("button", undefined, "35,12");
        preset6Btn.preferredSize.width = 60;
        preset6Btn.preferredSize.height = 20;
        preset6Btn.onClick = function () {
            ampInput.text = "35";
            framesInput.text = "12";
        };

        var preset7Btn = presetRow3.add("button", undefined, "12,57");
        preset7Btn.preferredSize.width = 60;
        preset7Btn.preferredSize.height = 20;
        preset7Btn.onClick = function () {
            ampInput.text = "12";
            framesInput.text = "57";
        };

        var preset8Btn = presetRow3.add("button", undefined, "24,72");
        preset8Btn.preferredSize.width = 60;
        preset8Btn.preferredSize.height = 20;
        preset8Btn.onClick = function () {
            ampInput.text = "24";
            framesInput.text = "72";
        };

        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
            try {
                var amp = ampInput.text;
                var frames = framesInput.text;
                var stopTimeStr = stopTimeInput.text;

                var randomizeDuration = randomizeCheck.value;
                var minFrames = minFramesInput.text;
                var maxFrames = maxFramesInput.text;

                // Validate randomize inputs if checkbox is checked
                if (randomizeDuration) {
                    if (!minFrames || !maxFrames || isNaN(parseFloat(minFrames)) || isNaN(parseFloat(maxFrames))) {
                        alert("Please enter valid numbers for Min and Max frames when Randomize duration is checked.");
                        return;
                    }
                    if (parseFloat(minFrames) >= parseFloat(maxFrames)) {
                        alert("Min frames must be less than Max frames.");
                        return;
                    }
                }

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

                    if (selectedLayers.length > 1 && randomizeDuration) {
                        // Multiple layers selected AND randomize duration checked - randomize frames per cycle using min/max
                        var minFramesNum = Math.floor(parseFloat(minFrames));
                        var maxFramesNum = Math.floor(parseFloat(maxFrames));

                        // Track used values to ensure no duplicates
                        var usedFrames = [];

                        for (var i = 0; i < selectedLayers.length; i++) {
                            var randomFrames;

                            if (i === 0) {
                                // First layer gets the min value
                                randomFrames = minFramesNum;
                            } else {
                                // Other layers get random values that are NOT the same as min value
                                // Generate random value between min+1 and max (inclusive)
                                var availableMin = minFramesNum + 1;
                                var availableMax = maxFramesNum;

                                // Handle edge case: if min+1 > max
                                if (availableMin > availableMax) {
                                    // If min+1 > max, use max (but ensure it's different from min)
                                    if (maxFramesNum > minFramesNum) {
                                        randomFrames = maxFramesNum;
                                    } else {
                                        // If max equals min, use max+1
                                        randomFrames = maxFramesNum + 1;
                                    }
                                } else {
                                    // Normal case: generate random value between min+1 and max
                                    // Keep generating until we get a value that's not min and not already used
                                    var foundUniqueValue = false;
                                    var attempts = 0;
                                    var maxAttempts = 100;

                                    while (!foundUniqueValue && attempts < maxAttempts) {
                                        // Generate random value between availableMin and availableMax
                                        randomFrames = Math.floor(Math.random() * (availableMax - availableMin + 1)) + availableMin;

                                        // Ensure it's not the min value
                                        if (randomFrames === minFramesNum) {
                                            attempts++;
                                            continue;
                                        }

                                        // Check if this value is already used
                                        var isUsed = false;
                                        for (var j = 0; j < usedFrames.length; j++) {
                                            if (usedFrames[j] === randomFrames) {
                                                isUsed = true;
                                                break;
                                            }
                                        }

                                        if (!isUsed) {
                                            foundUniqueValue = true;
                                        } else {
                                            attempts++;
                                        }
                                    }

                                    // If we couldn't find a unique value, find the first unused value that's not min
                                    if (!foundUniqueValue) {
                                        randomFrames = availableMax; // Start with max
                                        for (var k = availableMin; k <= availableMax; k++) {
                                            var isKUsed = false;
                                            for (var m = 0; m < usedFrames.length; m++) {
                                                if (usedFrames[m] === k) {
                                                    isKUsed = true;
                                                    break;
                                                }
                                            }
                                            if (!isKUsed && k !== minFramesNum) {
                                                randomFrames = k;
                                                break;
                                            }
                                        }
                                    }
                                }

                                // Final safety check: ensure other layers never get the min value
                                if (randomFrames === minFramesNum) {
                                    randomFrames = maxFramesNum > minFramesNum ? maxFramesNum : maxFramesNum + 1;
                                }
                            }

                            // Add to used values
                            usedFrames.push(randomFrames);

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
                    } else if (selectedLayers.length > 1) {
                        // Multiple layers selected but randomize NOT checked - use same frames for all
                        for (var i = 0; i < selectedLayers.length; i++) {
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
            } catch (e) {
                alert("An error occurred in the script.\n\nError: " + e.toString() + "\nLine: " + e.line);
            }
        };

        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        cancelBtn.onClick = function () {
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
        stopHereCheck.onClick = function () {
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
        subtleBtn.onClick = function () {
            ampInput.text = "12";
            framesInput.text = "12";
        };

        var normalBtn = presetRow1.add("button", undefined, "Normal");
        normalBtn.preferredSize.width = 60;
        normalBtn.preferredSize.height = 20;
        normalBtn.onClick = function () {
            ampInput.text = "50";
            framesInput.text = "5";
        };

        var crazyBtn = presetRow1.add("button", undefined, "Crazy");
        crazyBtn.preferredSize.width = 60;
        crazyBtn.preferredSize.height = 20;
        crazyBtn.onClick = function () {
            ampInput.text = "20";
            framesInput.text = "3";
        };

        var preset1Btn = presetRow1.add("button", undefined, "7,9");
        preset1Btn.preferredSize.width = 60;
        preset1Btn.preferredSize.height = 20;
        preset1Btn.onClick = function () {
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
        preset2Btn.onClick = function () {
            ampInput.text = "24";
            framesInput.text = "24";
        };

        var preset3Btn = presetRow2.add("button", undefined, "35,24");
        preset3Btn.preferredSize.width = 60;
        preset3Btn.preferredSize.height = 20;
        preset3Btn.onClick = function () {
            ampInput.text = "35";
            framesInput.text = "24";
        };

        var preset4Btn = presetRow2.add("button", undefined, "70,90");
        preset4Btn.preferredSize.width = 60;
        preset4Btn.preferredSize.height = 20;
        preset4Btn.onClick = function () {
            ampInput.text = "70";
            framesInput.text = "90";
        };

        // Third row of presets
        var presetRow3 = presetGroup.add("group");
        presetRow3.orientation = "row";
        presetRow3.alignChildren = ["fill", "center"];
        presetRow3.spacing = 3;

        var preset5Btn = presetRow3.add("button", undefined, "12,57");
        preset5Btn.preferredSize.width = 60;
        preset5Btn.preferredSize.height = 20;
        preset5Btn.onClick = function () {
            ampInput.text = "12";
            framesInput.text = "57";
        };

        var preset6Btn = presetRow3.add("button", undefined, "24,72");
        preset6Btn.preferredSize.width = 60;
        preset6Btn.preferredSize.height = 20;
        preset6Btn.onClick = function () {
            ampInput.text = "24";
            framesInput.text = "72";
        };

        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
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
            } catch (e) {
                alert("An error occurred in the script.\n\nError: " + e.toString() + "\nLine: " + e.line);
            }
        };

        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        cancelBtn.onClick = function () {
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
        gentleBtn.onClick = function () {
            freqInput.text = "0.5";
            ampInput.text = "30";
        };

        var normalBtn = presetGroup.add("button", undefined, "Normal");
        normalBtn.onClick = function () {
            freqInput.text = "1";
            ampInput.text = "50";
        };

        var roughBtn = presetGroup.add("button", undefined, "Rough");
        roughBtn.onClick = function () {
            freqInput.text = "2";
            ampInput.text = "70";
        };

        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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

        // Smooth checkbox
        var smoothGroup = dialog.add("group");
        smoothGroup.orientation = "row";
        smoothGroup.alignChildren = ["left", "center"];

        var smoothCheckbox = smoothGroup.add("checkbox", undefined, "Smooth");
        smoothCheckbox.value = false;

        // Preset buttons
        var presetGroup = dialog.add("group");
        presetGroup.orientation = "row";
        presetGroup.alignment = "center";

        presetGroup.add("statictext", undefined, "Presets:");

        var fastBtn = presetGroup.add("button", undefined, "Fast");
        fastBtn.onClick = function () {
            offsetInput.text = "0";
            framesInput.text = "6";
            minInput.text = "0";
            maxInput.text = "100";
        };

        var normalBtn = presetGroup.add("button", undefined, "Normal");
        normalBtn.onClick = function () {
            offsetInput.text = "0.5";
            framesInput.text = "12";
            minInput.text = "0";
            maxInput.text = "100";
        };

        var slowBtn = presetGroup.add("button", undefined, "Slow");
        slowBtn.onClick = function () {
            offsetInput.text = "1";
            framesInput.text = "24";
            minInput.text = "0";
            maxInput.text = "100";
        };

        var subtleBtn = presetGroup.add("button", undefined, "Subtle");
        subtleBtn.onClick = function () {
            offsetInput.text = "0.5";
            framesInput.text = "12";
            minInput.text = "50";
            maxInput.text = "100";
        };

        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
            var offset = offsetInput.text;
            var frames = framesInput.text;
            var minVal = minInput.text;
            var maxVal = maxInput.text;
            var smooth = smoothCheckbox.value;

            if (offset && frames && minVal && maxVal &&
                !isNaN(parseFloat(offset)) && !isNaN(parseFloat(frames)) &&
                !isNaN(parseFloat(minVal)) && !isNaN(parseFloat(maxVal))) {
                var expression;
                if (smooth) {
                    // Smooth transition using sine wave interpolation
                    expression = "offset = " + offset + ";\n" +
                        "framesPerToggle = " + frames + ";\n" +
                        "minVal = " + minVal + ";\n" +
                        "maxVal = " + maxVal + ";\n" +
                        "cycleTime = framesToTime(framesPerToggle * 2);\n" +
                        "t = (time - offset) % cycleTime;\n" +
                        "progress = t / cycleTime;\n" +
                        "sineWave = Math.sin(progress * Math.PI * 2);\n" +
                        "normalized = (sineWave + 1) / 2;\n" +
                        "flicker = linear(normalized, 0, 1, minVal, maxVal);\n" +
                        "flicker";
                } else {
                    // Abrupt blinking (original behavior)
                    expression = "offset = " + offset + ";\n" +
                        "framesPerToggle = " + frames + ";\n" +
                        "flicker = Math.floor(timeToFrames(time - offset)) % (framesPerToggle * 2) < framesPerToggle ? " + maxVal + " : " + minVal + ";\n" +
                        "flicker";
                }
                handleExpressionClick("Glitter", expression);
                dialog.close();
            } else {
                alert("Please enter valid numbers");
            }
        };

        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        cancelBtn.onClick = function () {
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

        leftBtn.onClick = function () {
            selectedDirection = -1; // LEFT direction (negative)
            leftBtn.fillBrush = leftBtn.graphics.newBrush(leftBtn.graphics.BrushType.SOLID_COLOR, [0.3, 0.3, 0.3, 1]);
            rightBtn.fillBrush = rightBtn.graphics.newBrush(rightBtn.graphics.BrushType.SOLID_COLOR, [0.1, 0.1, 0.1, 1]);
            updatePreview();
        };

        rightBtn.onClick = function () {
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
        slowFishBtn.onClick = function () {
            speedInput.text = "100";
            freqInput.text = "0.8";
            ampInput.text = "3";
            rotFreqInput.text = "0.4";
            rotAmpInput.text = "3";
        };

        var normalFishBtn = presetGroup.add("button", undefined, "Normal");
        normalFishBtn.onClick = function () {
            speedInput.text = "150";
            freqInput.text = "1";
            ampInput.text = "5";
            rotFreqInput.text = "0.5";
            rotAmpInput.text = "5";
        };

        var fastFishBtn = presetGroup.add("button", undefined, "Fast Fish");
        fastFishBtn.onClick = function () {
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
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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

    // Show scale pulse dialog - uniform XY scaling
    function showScalePulseDialog() {
        var dialog = new Window("dialog", "Scale Pulse Settings");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 16;

        // Scale Settings
        var scalePanel = dialog.add("panel", undefined, "Scale (X & Y)");
        scalePanel.orientation = "column";
        scalePanel.alignChildren = ["fill", "top"];
        scalePanel.spacing = 5;
        scalePanel.margins = 10;

        var minGroup = scalePanel.add("group");
        minGroup.orientation = "row";
        minGroup.alignChildren = ["fill", "center"];
        minGroup.add("statictext", undefined, "Min Scale (%):");
        var minInput = minGroup.add("edittext", undefined, "90");
        minInput.preferredSize.width = 60;

        var maxGroup = scalePanel.add("group");
        maxGroup.orientation = "row";
        maxGroup.alignChildren = ["fill", "center"];
        maxGroup.add("statictext", undefined, "Max Scale (%):");
        var maxInput = maxGroup.add("edittext", undefined, "110");
        maxInput.preferredSize.width = 60;

        // Speed Setting
        var speedGroup = dialog.add("group");
        speedGroup.orientation = "row";
        speedGroup.alignChildren = ["fill", "center"];
        speedGroup.add("statictext", undefined, "Speed (cycles/sec):");
        var speedInput = speedGroup.add("edittext", undefined, "2");
        speedInput.preferredSize.width = 40;

        var randomSpeedCheck = speedGroup.add("checkbox", undefined, "Cycle Speed (Index Offset)");
        randomSpeedCheck.helpTip = "If checked, speed will be offset by layer index (e.g. Speed 12 becomes 12, 13, 14, 15)";

        // Preset buttons
        var presetGroup = dialog.add("group");
        presetGroup.orientation = "row";
        presetGroup.alignment = "center";
        presetGroup.spacing = 5;

        presetGroup.add("statictext", undefined, "Presets:");

        var subtleBtn = presetGroup.add("button", undefined, "Subtle");
        subtleBtn.preferredSize.width = 60;
        subtleBtn.onClick = function () {
            minInput.text = "95";
            maxInput.text = "105";
            speedInput.text = "1";
        };

        var normalBtn = presetGroup.add("button", undefined, "Normal");
        normalBtn.preferredSize.width = 60;
        normalBtn.onClick = function () {
            minInput.text = "90";
            maxInput.text = "110";
            speedInput.text = "2";
        };

        var strongBtn = presetGroup.add("button", undefined, "Strong");
        strongBtn.preferredSize.width = 60;
        strongBtn.onClick = function () {
            minInput.text = "80";
            maxInput.text = "120";
            speedInput.text = "3";
        };

        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
            var minVal = parseFloat(minInput.text);
            var maxVal = parseFloat(maxInput.text);
            var speed = parseFloat(speedInput.text);

            if (isNaN(minVal) || isNaN(maxVal) || isNaN(speed)) {
                alert("Please enter valid numbers for all fields");
                return;
            }

            var speedLine;
            if (randomSpeedCheck.value) {
                speedLine = "speed = " + speed + " + ((index - 1) % 4); // cycled offset by index";
            } else {
                speedLine = "speed = " + speed + "; // cycles per second";
            }

            var expression = "// Settings\n" +
                "minScale = " + minVal + ";\n" +
                "maxScale = " + maxVal + ";\n" +
                speedLine + "\n\n" +
                "// Oscillate value using sine\n" +
                "s = (Math.sin(time * Math.PI * speed) + 1) / 2; // normalized between 0–1\n\n" +
                "// Interpolate scale using linear easing\n" +
                "scaleVal = linear(s, 0, 1, minScale, maxScale);\n" +
                "[scaleVal, scaleVal]";

            handleExpressionClick("Scale Pulse", expression);
            dialog.close();
        };

        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        cancelBtn.onClick = function () {
            dialog.close();
        };

        // Layout and show dialog
        dialog.layout.layout(true);
        dialog.center();
        dialog.show();
    }

    // Show V Scale dialog - vertical (Y-axis) scale pulse with anchor at bottom
    function showVScaleDialog() {
        var dialog = new Window("dialog", "V Scale Settings");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 16;

        // Y Scale Settings
        var yScalePanel = dialog.add("panel", undefined, "Vertical Scale (Y)");
        yScalePanel.orientation = "column";
        yScalePanel.alignChildren = ["fill", "top"];
        yScalePanel.spacing = 5;
        yScalePanel.margins = 10;

        var yMinGroup = yScalePanel.add("group");
        yMinGroup.orientation = "row";
        yMinGroup.alignChildren = ["fill", "center"];
        yMinGroup.add("statictext", undefined, "Min Scale (%):");
        var yMinInput = yMinGroup.add("edittext", undefined, "100");
        yMinInput.preferredSize.width = 60;

        var yMaxGroup = yScalePanel.add("group");
        yMaxGroup.orientation = "row";
        yMaxGroup.alignChildren = ["fill", "center"];
        yMaxGroup.add("statictext", undefined, "Max Scale (%):");
        var yMaxInput = yMaxGroup.add("edittext", undefined, "102");
        yMaxInput.preferredSize.width = 60;

        // X Scale hint
        var xHint = yScalePanel.add("statictext", undefined, "X scale stays at 100% (no horizontal change)");
        xHint.graphics.font = ScriptUI.newFont("Arial", "ITALIC", 9);
        xHint.alignment = "center";

        // Speed Setting
        var speedGroup = dialog.add("group");
        speedGroup.orientation = "row";
        speedGroup.alignChildren = ["fill", "center"];
        speedGroup.add("statictext", undefined, "Speed (cycles/sec):");
        var speedInput = speedGroup.add("edittext", undefined, "2");
        speedInput.preferredSize.width = 40;

        var randomSpeedCheck = speedGroup.add("checkbox", undefined, "Cycle Speed (Index Offset)");
        randomSpeedCheck.helpTip = "If checked, speed will be offset by layer index (e.g. Speed 12 becomes 12, 13, 14, 15)";

        // Preset buttons
        var presetGroup = dialog.add("group");
        presetGroup.orientation = "row";
        presetGroup.alignment = "center";
        presetGroup.spacing = 5;

        presetGroup.add("statictext", undefined, "Presets:");

        var subtleBtn = presetGroup.add("button", undefined, "Subtle");
        subtleBtn.preferredSize.width = 60;
        subtleBtn.onClick = function () {
            yMinInput.text = "100";
            yMaxInput.text = "102";
            speedInput.text = "1";
        };

        var normalBtn = presetGroup.add("button", undefined, "Normal");
        normalBtn.preferredSize.width = 60;
        normalBtn.onClick = function () {
            yMinInput.text = "100";
            yMaxInput.text = "102";
            speedInput.text = "2";
        };

        var strongBtn = presetGroup.add("button", undefined, "Strong");
        strongBtn.preferredSize.width = 60;
        strongBtn.onClick = function () {
            yMinInput.text = "100";
            yMaxInput.text = "103";
            speedInput.text = "6";
        };

        var crazyBtn = presetGroup.add("button", undefined, "Crazy");
        crazyBtn.preferredSize.width = 60;
        crazyBtn.onClick = function () {
            yMinInput.text = "100";
            yMaxInput.text = "106";
            speedInput.text = "8";
        };

        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
            var yMin = parseFloat(yMinInput.text);
            var yMax = parseFloat(yMaxInput.text);
            var speed = parseFloat(speedInput.text);

            if (isNaN(yMin) || isNaN(yMax) || isNaN(speed)) {
                alert("Please enter valid numbers for all fields");
                return;
            }

            // Move anchor point to bottom center (keeping visual position)
            try {
                var comp = app.project.activeItem;
                if (comp && comp.selectedLayers.length > 0) {
                    app.beginUndoGroup("V Scale - Move Anchor to Bottom");
                    for (var i = 0; i < comp.selectedLayers.length; i++) {
                        try {
                            var layer = comp.selectedLayers[i];
                            if (layer.transform && layer.transform.anchorPoint && layer.sourceRectAtTime && !layer.locked) {
                                var rect = layer.sourceRectAtTime(comp.time, false);
                                var newAnchorX = rect.left + rect.width / 2;
                                var newAnchorY = rect.top + rect.height;
                                var oldAnchor = layer.transform.anchorPoint.value;

                                var newAnchorZ = (oldAnchor.length > 2) ? oldAnchor[2] : 0;
                                var newAnchor = [newAnchorX, newAnchorY, newAnchorZ];

                                var newPos = layer.transform.position.value;
                                var compensationSuccess = false;

                                try {
                                    var vec = [newAnchorX, newAnchorY, newAnchorZ];
                                    var worldPos = layer.toComp(vec);
                                    if (layer.parent) {
                                        newPos = layer.parent.fromComp(worldPos);
                                    } else {
                                        newPos = worldPos;
                                    }
                                    compensationSuccess = true;
                                } catch (compErr) {
                                    // toComp failed, try manual math
                                }

                                if (!compensationSuccess) {
                                    try {
                                        var scale = layer.transform.scale.value;
                                        var sx = scale[0] / 100;
                                        var sy = scale[1] / 100;

                                        var dx = (newAnchor[0] - oldAnchor[0]) * sx;
                                        var dy = (newAnchor[1] - oldAnchor[1]) * sy;

                                        var oldPos = layer.transform.position.value;
                                        if (oldPos.length === 2) {
                                            newPos = [oldPos[0] + dx, oldPos[1] + dy];
                                        } else {
                                            newPos = [oldPos[0] + dx, oldPos[1] + dy, oldPos[2]];
                                        }
                                        compensationSuccess = true;
                                    } catch (mathErr) {
                                        // Skip compensation
                                    }
                                }

                                layer.transform.anchorPoint.setValue(newAnchor);
                                layer.transform.position.setValue(newPos);
                            }
                        } catch (layerErr) {
                            // Skip problematic layer
                        }
                    }
                    app.endUndoGroup();
                }
            } catch (e) {
                alert("Error setup: " + e.toString());
            }

            var speedLine;
            if (randomSpeedCheck.value) {
                speedLine = "speed = " + speed + " + ((index - 1) % 4); // cycled offset by index";
            } else {
                speedLine = "speed = " + speed + "; // cycles per second";
            }

            var expression = "// Settings\n" +
                "minScaleY = " + yMin + ";\n" +
                "maxScaleY = " + yMax + ";\n" +
                speedLine + "\n\n" +
                "// Oscillate value using sine\n" +
                "s = (Math.sin(time * Math.PI * speed) + 1) / 2; // normalized between 0–1\n\n" +
                "// Interpolate scale using linear easing\n" +
                "scaleY = linear(s, 0, 1, minScaleY, maxScaleY);\n" +
                "[100, scaleY]";

            handleExpressionClick("V Scale", expression);
            dialog.close();
        };

        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        cancelBtn.onClick = function () {
            dialog.close();
        };

        // Layout and show dialog
        dialog.layout.layout(true);
        dialog.center();
        dialog.show();
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
            } else if (name === "Scale Pulse" || name === "V Scale") {
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

        var editText = dialog.add("edittext", undefined, expression, { multiline: true, readonly: true });
        editText.preferredSize.height = 80;
        editText.active = true;

        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var selectBtn = buttonGroup.add("button", undefined, "Select All");
        selectBtn.onClick = function () {
            editText.active = true;
            editText.textselection = editText.text;
        };

        var closeBtn = buttonGroup.add("button", undefined, "Close");
        closeBtn.onClick = function () {
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
        preset34Btn.onClick = function () {
            applyBatchScale(34);
            dialog.close();
        };

        var preset50Btn = presetGroup.add("button", undefined, "50%");
        preset50Btn.preferredSize.width = 60;
        preset50Btn.onClick = function () {
            applyBatchScale(50);
            dialog.close();
        };

        var preset100Btn = presetGroup.add("button", undefined, "100%");
        preset100Btn.preferredSize.width = 60;
        preset100Btn.onClick = function () {
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
        customBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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

            // Calculate duration based on selected layers
            // Find the earliest inPoint and latest outPoint
            var earliestInPoint = Infinity;
            var latestOutPoint = -Infinity;
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                var layerInPoint = layer.inPoint;
                var layerOutPoint = layer.outPoint;

                if (layerInPoint < earliestInPoint) {
                    earliestInPoint = layerInPoint;
                }
                if (layerOutPoint > latestOutPoint) {
                    latestOutPoint = layerOutPoint;
                }
            }

            // Calculate duration from selected layers
            var precompDuration = latestOutPoint - earliestInPoint;
            // Ensure minimum duration of at least 1 frame
            if (precompDuration <= 0) {
                precompDuration = comp.frameDuration;
            }

            var precomp = app.project.items.addComp(
                precompName,
                Math.ceil(expandedWidth),
                Math.ceil(expandedHeight),
                1, // Square pixels
                precompDuration,
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

                // Adjust timing so layers start at time 0 in precomp
                // Shift inPoint and outPoint relative to earliestInPoint
                var timeOffset = earliestInPoint;
                copiedLayer.inPoint = info.originalInPoint - timeOffset;
                copiedLayer.outPoint = info.originalOutPoint - timeOffset;
                copiedLayer.startTime = 0;

                // Remove original layer from main comp
                layer.remove();
            }

            // Add precomp layer to original composition
            var precompLayer = comp.layers.add(precomp);

            // Set timing to match original layers
            precompLayer.startTime = earliestInPoint;
            precompLayer.inPoint = 0;
            precompLayer.outPoint = precompDuration;

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


    // Update status text
    // ===== AUTO ZOOM =====
    // Show Auto Zoom dialog with presets
    function showAutoZoomDialog() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition first.");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }

            // Build dialog
            var dialog = new Window("dialog", "Auto Zoom");
            dialog.orientation = "column";
            dialog.alignChildren = ["fill", "top"];
            dialog.spacing = 10;
            dialog.margins = 16;
            dialog.preferredSize.width = 300;

            // Info
            var infoText = dialog.add("statictext", undefined,
                selectedLayers.length + " layer(s) selected", { multiline: false });
            infoText.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);
            infoText.alignment = "center";

            // Description
            var descPanel = dialog.add("panel", undefined, "How it works");
            descPanel.orientation = "column";
            descPanel.alignChildren = ["fill", "top"];
            descPanel.spacing = 4;
            descPanel.margins = 10;

            var descText;
            if (selectedLayers.length === 1) {
                descText = "Zooms IN from current scale to current + X%\nKeyframes at layer start → layer end.";
            } else {
                descText = "Alternates zoom direction (bottom to top):\n" +
                    "Layer 1 (bottom): Zoom IN\n" +
                    "Layer 2: Zoom OUT\n" +
                    "Layer 3: Zoom IN  ...and so on.\n" +
                    "Keyframes at each layer's start → end.";
            }
            var desc = descPanel.add("statictext", undefined, descText, { multiline: true });
            desc.preferredSize.height = selectedLayers.length === 1 ? 40 : 80;
            desc.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);

            // Preview current scale
            var previewPanel = dialog.add("panel", undefined, "Current Scale");
            previewPanel.orientation = "column";
            previewPanel.alignChildren = ["fill", "top"];
            previewPanel.spacing = 3;
            previewPanel.margins = 10;

            // Sort by index descending (bottom layer first) for display
            var sortedLayers = [];
            for (var s = 0; s < selectedLayers.length; s++) {
                sortedLayers.push(selectedLayers[s]);
            }
            sortedLayers.sort(function (a, b) {
                return b.index - a.index; // descending = bottom first
            });

            for (var p = 0; p < sortedLayers.length; p++) {
                var lyr = sortedLayers[p];
                var curScale = lyr.transform.scale.value;
                var direction = (p % 2 === 0) ? "↗ Zoom IN" : "↙ Zoom OUT";
                var scaleStr = Math.round(curScale[0]) + "%, " + Math.round(curScale[1]) + "%";
                var previewLine = previewPanel.add("statictext", undefined,
                    (p + 1) + ". \"" + lyr.name + "\"  [" + scaleStr + "]  →  " + direction);
                previewLine.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
            }

            // Preset buttons
            var presetPanel = dialog.add("panel", undefined, "Zoom Amount");
            presetPanel.orientation = "column";
            presetPanel.alignChildren = ["fill", "top"];
            presetPanel.spacing = 6;
            presetPanel.margins = 10;

            // Custom input row
            var customRow = presetPanel.add("group");
            customRow.orientation = "row";
            customRow.alignChildren = ["left", "center"];
            customRow.spacing = 6;

            customRow.add("statictext", undefined, "Custom %:");
            var customInput = customRow.add("edittext", undefined, "10");
            customInput.preferredSize.width = 50;
            customInput.helpTip = "Enter a custom zoom percentage";

            // Preset button row
            var btnRow = presetPanel.add("group");
            btnRow.orientation = "row";
            btnRow.alignment = "center";
            btnRow.spacing = 8;

            var btn5 = btnRow.add("button", undefined, "+5%");
            btn5.preferredSize.width = 60;
            var btn10 = btnRow.add("button", undefined, "+10%");
            btn10.preferredSize.width = 60;
            var btn20 = btnRow.add("button", undefined, "+20%");
            btn20.preferredSize.width = 60;

            // Apply custom button
            var applyRow = presetPanel.add("group");
            applyRow.orientation = "row";
            applyRow.alignment = "center";
            applyRow.spacing = 8;

            var applyCustomBtn = applyRow.add("button", undefined, "Apply Custom");
            applyCustomBtn.preferredSize.width = 120;

            // Cancel
            var cancelBtn = dialog.add("button", undefined, "Cancel");
            cancelBtn.alignment = "center";

            // Button handlers
            btn5.onClick = function () {
                applyAutoZoom(comp, sortedLayers, 5);
                dialog.close();
            };
            btn10.onClick = function () {
                applyAutoZoom(comp, sortedLayers, 10);
                dialog.close();
            };
            btn20.onClick = function () {
                applyAutoZoom(comp, sortedLayers, 20);
                dialog.close();
            };
            applyCustomBtn.onClick = function () {
                var val = parseFloat(customInput.text);
                if (isNaN(val) || val <= 0) {
                    alert("Please enter a valid positive number.");
                    return;
                }
                applyAutoZoom(comp, sortedLayers, val);
                dialog.close();
            };
            cancelBtn.onClick = function () {
                dialog.close();
            };

            dialog.show();

        } catch (error) {
            alert("Auto Zoom Error: " + error.toString());
        }
    }

    // Apply auto zoom keyframes to sorted layers
    // sortedLayers: sorted by index descending (bottom layer first)
    // zoomPercent: the % to add to current scale
    function applyAutoZoom(comp, sortedLayers, zoomPercent) {
        try {
            app.beginUndoGroup("Auto Zoom +" + zoomPercent + "%");

            var successCount = 0;

            for (var i = 0; i < sortedLayers.length; i++) {
                var layer = sortedLayers[i];
                if (layer.locked) continue;

                var scaleProp = layer.transform.scale;
                var currentScale = scaleProp.value;
                var scaleX = currentScale[0];
                var scaleY = currentScale[1];

                // Calculate target scale (add zoomPercent)
                var targetX = scaleX + zoomPercent;
                var targetY = scaleY + zoomPercent;

                // Determine direction: even index = zoom IN, odd index = zoom OUT
                var zoomIn = (i % 2 === 0);

                // Use layer inPoint and outPoint as keyframe times
                var startTime = layer.inPoint;
                var endTime = layer.outPoint;

                if (zoomIn) {
                    // Zoom IN: start at current scale, end at bigger scale
                    scaleProp.setValueAtTime(startTime, [scaleX, scaleY]);
                    scaleProp.setValueAtTime(endTime, [targetX, targetY]);
                } else {
                    // Zoom OUT: start at bigger scale, end at current scale
                    scaleProp.setValueAtTime(startTime, [targetX, targetY]);
                    scaleProp.setValueAtTime(endTime, [scaleX, scaleY]);
                }

                // Apply smooth ease in/out to the keyframes
                try {
                    var numKeys = scaleProp.numKeys;
                    if (numKeys >= 2) {
                        // Find the two keyframes we just added
                        var key1 = -1, key2 = -1;
                        for (var k = 1; k <= numKeys; k++) {
                            if (Math.abs(scaleProp.keyTime(k) - startTime) < 0.001) key1 = k;
                            if (Math.abs(scaleProp.keyTime(k) - endTime) < 0.001) key2 = k;
                        }

                        if (key1 > 0 && key2 > 0) {
                            // Smooth ease: speed 0, influence 33% (classic smooth ease)
                            var easeIn = new KeyframeEase(0, 33);
                            var easeOut = new KeyframeEase(0, 33);

                            // Key 1: ease out (leaving this keyframe smoothly)
                            scaleProp.setTemporalEaseAtKey(key1,
                                [easeIn, easeIn],   // incoming
                                [easeOut, easeOut]   // outgoing
                            );

                            // Key 2: ease in (arriving at this keyframe smoothly)
                            scaleProp.setTemporalEaseAtKey(key2,
                                [easeIn, easeIn],   // incoming
                                [easeOut, easeOut]   // outgoing
                            );
                        }
                    }
                } catch (easeError) {
                    // Keyframes still applied even if easing fails
                }

                successCount++;
            }

            app.endUndoGroup();

            var msg = "Auto Zoom +" + zoomPercent + "% applied to " + successCount + " layer(s)";
            updateStatus(msg);

        } catch (error) {
            alert("Auto Zoom Error: " + error.toString());
        }
    }

    // ---- Helper: create a searchable dropdown ----
    // Returns { searchInput, dropdown, allItems, getSelectedName }
    function createSearchableDropdown(parentGroup, labelText, initialItems) {
        // Search row
        var searchGroup = parentGroup.add("group");
        searchGroup.orientation = "row";
        searchGroup.alignChildren = ["left", "center"];
        var searchLabel = searchGroup.add("statictext", undefined, "Search:");
        searchLabel.preferredSize.width = 50;
        var searchInput = searchGroup.add("edittext", undefined, "");
        searchInput.preferredSize.width = 250;
        searchInput.helpTip = "Type to filter the list below (case-insensitive)";

        // Dropdown (listbox for multi-visible items with search)
        var ddGroup = parentGroup.add("group");
        ddGroup.orientation = "row";
        ddGroup.alignChildren = ["left", "center"];
        var ddLabel = ddGroup.add("statictext", undefined, labelText);
        ddLabel.preferredSize.width = 50;
        var dropdown = ddGroup.add("listbox", undefined, initialItems || [],
            { numberOfColumns: 1, columnWidths: [240] });
        dropdown.preferredSize = [250, 100];

        // Count label
        var countLabel = parentGroup.add("statictext", undefined, "");
        countLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);
        countLabel.alignment = "right";

        // Store all items for filtering
        var data = {
            searchInput: searchInput,
            dropdown: dropdown,
            allItems: initialItems ? initialItems.slice() : [],
            countLabel: countLabel
        };

        function updateCount() {
            var total = data.allItems.length;
            var shown = dropdown.items.length;
            if (searchInput.text.length > 0) {
                countLabel.text = "Showing " + shown + " of " + total;
            } else {
                countLabel.text = total + " items";
            }
        }

        // Filter function
        function filterDropdown() {
            var query = searchInput.text.toLowerCase();
            dropdown.removeAll();

            if (query.length === 0) {
                // Show all
                for (var i = 0; i < data.allItems.length; i++) {
                    dropdown.add("item", data.allItems[i]);
                }
            } else {
                // Filter: show items containing the query
                for (var i = 0; i < data.allItems.length; i++) {
                    if (data.allItems[i].toLowerCase().indexOf(query) !== -1) {
                        dropdown.add("item", data.allItems[i]);
                    }
                }
            }

            // Auto-select first match
            if (dropdown.items.length > 0) {
                dropdown.selection = 0;
            }
            updateCount();
        }

        searchInput.onChanging = function () {
            filterDropdown();
        };

        // Get the selected name (search text is used as override/manual entry if no selection)
        data.getSelectedName = function () {
            if (dropdown.selection) {
                return dropdown.selection.text;
            }
            // Fallback: use search text as manual entry
            if (searchInput.text.length > 0) {
                return searchInput.text;
            }
            return "";
        };

        // Method to repopulate with new items
        data.setItems = function (newItems) {
            data.allItems = newItems.slice();
            searchInput.text = "";
            dropdown.removeAll();
            for (var i = 0; i < newItems.length; i++) {
                dropdown.add("item", newItems[i]);
            }
            if (dropdown.items.length > 0) {
                dropdown.selection = 0;
            }
            updateCount();
        };

        // Initial count
        updateCount();

        // Auto-select first precomp-like item
        if (initialItems) {
            for (var p = 0; p < initialItems.length; p++) {
                if (initialItems[p].toLowerCase().indexOf("precomp") !== -1) {
                    dropdown.selection = p;
                    break;
                }
            }
            if (!dropdown.selection && dropdown.items.length > 0) {
                dropdown.selection = 0;
            }
        }

        return data;
    }

    // ===== CP MOVEMENT DIALOG =====
    // Show CP Movement dialog - copy movement from a layer inside a precomp
    function showCPMovementDialog() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition first.");
                return;
            }

            // Collect all compositions in the project
            var compNames = [];
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem) {
                    compNames.push(item.name);
                }
            }

            if (compNames.length === 0) {
                alert("No compositions found in this project.");
                return;
            }

            // Build dialog
            var dialog = new Window("dialog", "CP Movement");
            dialog.orientation = "column";
            dialog.alignChildren = ["fill", "top"];
            dialog.spacing = 10;
            dialog.margins = 16;
            dialog.preferredSize.width = 380;

            // --- Source Precomp ---
            var precompPanel = dialog.add("panel", undefined, "Source Precomp");
            precompPanel.orientation = "column";
            precompPanel.alignChildren = ["fill", "top"];
            precompPanel.spacing = 6;
            precompPanel.margins = 10;

            var precompSearch = createSearchableDropdown(precompPanel, "Comp:", compNames);

            // --- Target Layer ---
            var layerPanel = dialog.add("panel", undefined, "Target Layer (inside the precomp)");
            layerPanel.orientation = "column";
            layerPanel.alignChildren = ["fill", "top"];
            layerPanel.spacing = 6;
            layerPanel.margins = 10;

            var layerSearch = createSearchableDropdown(layerPanel, "Layer:", []);

            // Function to collect layer names from a comp name
            function getLayerNames(compName) {
                var names = [];
                if (!compName) return names;
                for (var c = 1; c <= app.project.numItems; c++) {
                    var ci = app.project.item(c);
                    if (ci instanceof CompItem && ci.name === compName) {
                        for (var l = 1; l <= ci.numLayers; l++) {
                            names.push(ci.layer(l).name);
                        }
                        break;
                    }
                }
                return names;
            }

            // Populate layers when precomp selection changes
            precompSearch.dropdown.onChange = function () {
                if (precompSearch.dropdown.selection) {
                    var selectedComp = precompSearch.dropdown.selection.text;
                    layerSearch.setItems(getLayerNames(selectedComp));
                    pcLayerInput.text = selectedComp;
                }
            };

            // Initial populate of layers
            var initialCompName = precompSearch.getSelectedName();
            if (initialCompName) {
                layerSearch.setItems(getLayerNames(initialCompName));
            }

            // --- Precomp Layer Name in main comp ---
            var precompLayerPanel = dialog.add("panel", undefined, "Precomp Layer Name (in this comp)");
            precompLayerPanel.orientation = "column";
            precompLayerPanel.alignChildren = ["fill", "top"];
            precompLayerPanel.spacing = 6;
            precompLayerPanel.margins = 10;

            var precompLayerInfo = precompLayerPanel.add("statictext", undefined,
                "The name of the precomp layer in the current composition.\nUsually the same as the precomp name.",
                { multiline: true });
            precompLayerInfo.preferredSize.height = 36;
            precompLayerInfo.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);

            var pcLayerGroup = precompLayerPanel.add("group");
            pcLayerGroup.orientation = "row";
            pcLayerGroup.alignChildren = ["left", "center"];
            var pcLayerLabel = pcLayerGroup.add("statictext", undefined, "Name:");
            pcLayerLabel.preferredSize.width = 50;
            var pcLayerInput = pcLayerGroup.add("edittext", undefined, initialCompName || "");
            pcLayerInput.preferredSize.width = 250;
            pcLayerInput.helpTip = "Layer name of the precomp in the current comp (auto-filled from selection above)";

            // --- Buttons ---
            var btnGroup = dialog.add("group");
            btnGroup.orientation = "row";
            btnGroup.alignment = "center";
            btnGroup.spacing = 10;

            var applyBtn = btnGroup.add("button", undefined, "Apply Expression");
            var copyBtn = btnGroup.add("button", undefined, "Copy to Clipboard");
            var cancelBtn = btnGroup.add("button", undefined, "Cancel");

            // --- Build expression helper ---
            function buildExpression() {
                var precompName = precompSearch.getSelectedName();
                if (precompName === "") {
                    alert("Please select or type a precomp name.");
                    return null;
                }

                var targetLayerName = layerSearch.getSelectedName();
                if (targetLayerName === "") {
                    alert("Please select or type a target layer name.");
                    return null;
                }

                var precompLayerName = pcLayerInput.text;
                if (precompLayerName === "") {
                    precompLayerName = precompName;
                }

                var expr = '// CP Movement - copy position from layer inside precomp\n';
                expr += 'var innerComp = comp("' + precompName + '");\n';
                expr += 'var innerLayer = innerComp.layer("' + targetLayerName + '");\n';
                expr += 'var innerPos = innerLayer.toWorld(innerLayer.anchorPoint);\n';
                expr += 'thisComp.layer("' + precompLayerName + '").toWorld(innerPos);';
                return expr;
            }

            applyBtn.onClick = function () {
                var expr = buildExpression();
                if (!expr) return;

                var activeComp = app.project.activeItem;
                if (!activeComp || !(activeComp instanceof CompItem)) {
                    alert("No active composition.");
                    return;
                }

                var selectedLayers = activeComp.selectedLayers;
                if (selectedLayers.length === 0) {
                    alert("No layer selected. Please select at least one layer.");
                    return;
                }

                // Determine the precomp name used in the expression
                var precompName = precompSearch.getSelectedName();
                var precompLayerName = pcLayerInput.text || precompName;

                app.beginUndoGroup("CP Movement Expression");

                // Check if precomp already exists as a layer in the current comp
                var precompLayerExists = false;
                for (var f = 1; f <= activeComp.numLayers; f++) {
                    if (activeComp.layer(f).name === precompLayerName) {
                        precompLayerExists = true;
                        break;
                    }
                }

                // If precomp layer doesn't exist, find and add it
                if (!precompLayerExists) {
                    var precompSource = null;
                    for (var p = 1; p <= app.project.numItems; p++) {
                        var projItem = app.project.item(p);
                        if (projItem instanceof CompItem && projItem.name === precompName) {
                            precompSource = projItem;
                            break;
                        }
                    }

                    if (precompSource) {
                        var newPrecompLayer = activeComp.layers.add(precompSource);
                        // Rename if the layer name should differ from comp name
                        if (precompLayerName !== precompName) {
                            newPrecompLayer.name = precompLayerName;
                        }

                        // Deselect it so it doesn't interfere with the expression apply below
                        newPrecompLayer.selected = false;
                    } else {
                        alert("Could not find composition '" + precompName + "' in the project.");
                        app.endUndoGroup();
                        return;
                    }
                }

                // Re-select the originally selected layers (adding the precomp may have deselected them)
                var successCount = 0;
                for (var s = 0; s < selectedLayers.length; s++) {
                    try {
                        selectedLayers[s].transform.position.expression = expr;
                        successCount++;
                    } catch (e) {
                        // skip layers that can't have expressions
                    }
                }

                app.endUndoGroup();

                if (successCount > 0) {
                    updateStatus("CP Movement applied to " + successCount + " layer(s)");
                    dialog.close();
                } else {
                    alert("Failed to apply expression to any selected layer.");
                }
            };

            copyBtn.onClick = function () {
                var expr = buildExpression();
                if (!expr) return;

                var clipDialog = new Window("dialog", "Expression Copied");
                clipDialog.orientation = "column";
                clipDialog.alignChildren = ["fill", "top"];
                clipDialog.margins = 12;

                clipDialog.add("statictext", undefined, "Expression generated. Select all and copy:");
                var clipText = clipDialog.add("edittext", undefined, expr, { multiline: true });
                clipText.preferredSize = [400, 120];

                var okBtn = clipDialog.add("button", undefined, "OK");
                okBtn.onClick = function () { clipDialog.close(); };

                clipDialog.show();
            };

            cancelBtn.onClick = function () {
                dialog.close();
            };

            dialog.show();

        } catch (error) {
            alert("CP Movement Error: " + error.toString());
        }
    }

    // ===== ATTACH LEG =====
    function showAttachLegDialog() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition first.");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                alert("Please select at least one parent layer first.");
                return;
            }

            // Cache selected layers into an array since adding new layers alters selection
            var parentLayersToAttach = [];
            for (var i = 0; i < selectedLayers.length; i++) {
                parentLayersToAttach.push(selectedLayers[i]);
            }

            // Collect all compositions in the project
            var compNames = [];
            var compByName = {};
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem) {
                    compNames.push(item.name);
                    compByName[item.name] = item;
                }
            }

            if (compNames.length === 0) {
                alert("No compositions found in this project.");
                return;
            }

            // Build dialog
            var dialog = new Window("dialog", "Attach Leg");
            dialog.orientation = "column";
            dialog.alignChildren = ["fill", "top"];
            dialog.spacing = 10;
            dialog.margins = 16;
            dialog.preferredSize.width = 380;

            var panel = dialog.add("panel", undefined, "Select Leg Comp");
            panel.orientation = "column";
            panel.alignChildren = ["fill", "top"];
            panel.spacing = 6;
            panel.margins = 10;

            var compSearch = createSearchableDropdown(panel, "Leg:", compNames);

            // Try to auto-select "kaki"
            for (var p = 0; p < compSearch.dropdown.items.length; p++) {
                if (compSearch.dropdown.items[p].text.toLowerCase().indexOf("kaki walk") !== -1) {
                    compSearch.dropdown.selection = p;
                    break;
                }
            }

            var optionsGroup = dialog.add("group");
            optionsGroup.orientation = "row";
            optionsGroup.alignment = "left";
            optionsGroup.margins = [0, 0, 0, 5];
            var flipCheckbox = optionsGroup.add("checkbox", undefined, "Flip Leg (Horizontal)");

            var btnGroup = dialog.add("group");
            btnGroup.orientation = "row";
            btnGroup.alignment = "center";
            btnGroup.spacing = 10;

            var applyBtn = btnGroup.add("button", undefined, "Apply");
            var cancelBtn = btnGroup.add("button", undefined, "Cancel");

            applyBtn.onClick = function () {
                var legName = compSearch.getSelectedName();
                if (!legName) {
                    alert("Please select a leg comp.");
                    return;
                }

                var legComp = compByName[legName];
                if (!legComp) {
                    alert("Leg comp not found.");
                    return;
                }

                app.beginUndoGroup("Attach Leg");

                for (var j = 0; j < parentLayersToAttach.length; j++) {
                    var parentLyr = parentLayersToAttach[j];
                    var legLayer = comp.layers.add(legComp);

                    // Perform flip horizontal before attaching the leg
                    if (flipCheckbox.value) {
                        var preScale = legLayer.transform.scale.value;
                        if (preScale.length > 2) {
                            legLayer.transform.scale.setValueAtTime(comp.time, [-preScale[0], preScale[1], preScale[2]]);
                        } else {
                            legLayer.transform.scale.setValueAtTime(comp.time, [-preScale[0], preScale[1]]);
                        }
                    }

                    // Parent and place below first so layer space translates to parent space
                    legLayer.moveAfter(parentLyr);
                    legLayer.parent = parentLyr;

                    // Now that it is parented, set the position relative to parent's anchor point
                    legLayer.transform.position.setValue(parentLyr.transform.anchorPoint.value);

                    // Get dimensions of parent and leg to calculate scale proportions
                    var pRect = parentLyr.sourceRectAtTime(comp.time, false);
                    var lRect = legLayer.sourceRectAtTime(comp.time, false);

                    var parentSum = pRect.width + pRect.height;
                    var legSum = lRect.width + lRect.height;

                    // Auto scale to 64% relatively based on the sums
                    var scaleFactor = (legSum > 0) ? (parentSum / legSum) : 1;
                    var baseScale = 64 * scaleFactor;

                    var targetX = flipCheckbox.value ? -baseScale : baseScale;
                    var targetY = baseScale;
                    var currentScale = legLayer.transform.scale.value;

                    if (flipCheckbox.value) {
                        // Use setValueAtTime to update the keyframe created by the flip
                        if (currentScale.length > 2) {
                            legLayer.transform.scale.setValueAtTime(comp.time, [targetX, targetY, targetY]);
                        } else {
                            legLayer.transform.scale.setValueAtTime(comp.time, [targetX, targetY]);
                        }
                    } else {
                        // Use normal setValue
                        if (currentScale.length > 2) {
                            legLayer.transform.scale.setValue([targetX, targetY, targetY]);
                        } else {
                            legLayer.transform.scale.setValue([targetX, targetY]);
                        }
                    }
                }

                app.endUndoGroup();
                updateStatus("Leg attached to " + parentLayersToAttach.length + " layer(s)");
                dialog.close();
            };

            cancelBtn.onClick = function () {
                dialog.close();
            };

            dialog.show();

        } catch (error) {
            alert("Attach Leg Error: " + error.toString());
        }
    }

    // ===== ATTACH MOUTH =====
    function showAttachMouthDialog() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition first.");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                alert("Please select at least one parent layer first.");
                return;
            }

            // Cache selected layers into an array since adding new layers alters selection
            var parentLayersToAttach = [];
            for (var i = 0; i < selectedLayers.length; i++) {
                parentLayersToAttach.push(selectedLayers[i]);
            }

            // Collect all compositions in the project
            var compNames = [];
            var compByName = {};
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem) {
                    compNames.push(item.name);
                    compByName[item.name] = item;
                }
            }

            if (compNames.length === 0) {
                alert("No compositions found in this project.");
                return;
            }

            // Build dialog
            var dialog = new Window("dialog", "Add Mouth");
            dialog.orientation = "column";
            dialog.alignChildren = ["fill", "top"];
            dialog.spacing = 10;
            dialog.margins = 16;
            dialog.preferredSize.width = 380;

            var panel = dialog.add("panel", undefined, "Select Mouth Comp");
            panel.orientation = "column";
            panel.alignChildren = ["fill", "top"];
            panel.spacing = 6;
            panel.margins = 10;

            var compSearch = createSearchableDropdown(panel, "Mouth:", compNames);

            // Auto-select priority: 1. Yapping, 2. Lipsync, 3. Komat Kamit
            var foundMouthIndex = -1;

            // Pass 1: Look for Yapping (Highest Priority)
            for (var p = 0; p < compSearch.dropdown.items.length; p++) {
                if (compSearch.dropdown.items[p].text.toLowerCase().indexOf("yapping") !== -1) {
                    foundMouthIndex = p;
                    break;
                }
            }

            // Pass 2: Look for Lipsync
            if (foundMouthIndex === -1) {
                for (var p = 0; p < compSearch.dropdown.items.length; p++) {
                    if (compSearch.dropdown.items[p].text.toLowerCase().indexOf("lipsync") !== -1) {
                        foundMouthIndex = p;
                        break;
                    }
                }
            }

            // Pass 3: Look for Komat Kamit
            if (foundMouthIndex === -1) {
                for (var p = 0; p < compSearch.dropdown.items.length; p++) {
                    if (compSearch.dropdown.items[p].text.toLowerCase().indexOf("komat kamit") !== -1) {
                        foundMouthIndex = p;
                        break;
                    }
                }
            }

            if (foundMouthIndex !== -1) {
                compSearch.dropdown.selection = foundMouthIndex;
            }

            var optionsGroup = dialog.add("group");
            optionsGroup.orientation = "row";
            optionsGroup.alignment = "left";
            optionsGroup.margins = [0, 0, 0, 5];
            var flipCheckbox = optionsGroup.add("checkbox", undefined, "Flip Mouth (Horizontal)");

            var btnGroup = dialog.add("group");
            btnGroup.orientation = "row";
            btnGroup.alignment = "center";
            btnGroup.spacing = 10;

            var applyBtn = btnGroup.add("button", undefined, "Apply");
            var cancelBtn = btnGroup.add("button", undefined, "Cancel");

            applyBtn.onClick = function () {
                var mouthName = compSearch.getSelectedName();
                if (!mouthName) {
                    alert("Please select a mouth comp.");
                    return;
                }

                var mouthComp = compByName[mouthName];
                if (!mouthComp) {
                    alert("Mouth comp not found.");
                    return;
                }

                app.beginUndoGroup("Add Mouth");

                for (var j = 0; j < parentLayersToAttach.length; j++) {
                    var parentLyr = parentLayersToAttach[j];
                    var mouthLayer = comp.layers.add(mouthComp);

                    // Place ABOVE the primary layer
                    mouthLayer.moveBefore(parentLyr);

                    // Parent it to the selected layer
                    mouthLayer.parent = parentLyr;

                    // Set the position relative to parent's anchor point
                    mouthLayer.transform.position.setValue(parentLyr.transform.anchorPoint.value);

                    // Auto scale to 15% relatively
                    var targetX = flipCheckbox.value ? -15 : 15;
                    var currentScale = mouthLayer.transform.scale.value;

                    // Perform scale override directly (keyframed if it was already keyed, though standard adds don't have keys)
                    if (flipCheckbox.value) {
                        if (currentScale.length > 2) {
                            mouthLayer.transform.scale.setValueAtTime(comp.time, [targetX, 15, 15]);
                        } else {
                            mouthLayer.transform.scale.setValueAtTime(comp.time, [targetX, 15]);
                        }
                    } else {
                        if (currentScale.length > 2) {
                            mouthLayer.transform.scale.setValue([targetX, 15, 15]);
                        } else {
                            mouthLayer.transform.scale.setValue([targetX, 15]);
                        }
                    }
                }

                app.endUndoGroup();
                updateStatus("Mouth attached to " + parentLayersToAttach.length + " layer(s)");
                dialog.close();
            };

            cancelBtn.onClick = function () {
                dialog.close();
            };

            dialog.show();

        } catch (error) {
            alert("Add Mouth Error: " + error.toString());
        }
    }

    // ===== AUDIO MARKERS =====
    function showAudioMarkersDialog() {
        var win = new Window("palette", "Audio Markers", undefined, { resizeable: false });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 5;
        win.margins = 10;

        // Threshold
        var threshGroup = win.add("group");
        threshGroup.orientation = "row";
        threshGroup.add("statictext", undefined, "Threshold (0-100):");
        var threshInput = threshGroup.add("edittext", undefined, "6");
        threshInput.preferredSize.width = 40;

        // Min Distance
        var distGroup = win.add("group");
        distGroup.orientation = "row";
        distGroup.add("statictext", undefined, "Min Frames Gap:");
        var distInput = distGroup.add("edittext", undefined, "8");
        distInput.preferredSize.width = 40;

        // Target Selection
        var targetGroup = win.add("panel", undefined, "Target");
        targetGroup.orientation = "column";
        targetGroup.alignChildren = ["left", "top"];
        var radioComp = targetGroup.add("radiobutton", undefined, "On Current Composition");
        var radioLayer = targetGroup.add("radiobutton", undefined, "On Selected Layers");
        radioComp.value = true;

        // Buttons
        var btnGroup = win.add("group");
        btnGroup.alignment = ["center", "bottom"];
        var btnGenerate = btnGroup.add("button", undefined, "Generate", { name: "ok" });
        var btnCancel = btnGroup.add("button", undefined, "Cancel", { name: "cancel" });

        btnCancel.onClick = function () { win.close(); };

        btnGenerate.onClick = function () {
            var threshold = parseFloat(threshInput.text) || 6;
            var minFrames = parseInt(distInput.text) || 8;
            win.close();
            generateAudioSpikeMarkers(threshold, minFrames, radioComp.value);
        };

        win.center();
        win.show();
    }

    function generateAudioSpikeMarkers(threshold, minFrames, targetComp) {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                updateStatus("Error: No active composition");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0 && !targetComp) {
                alert("Error: Please select at least one layer to attach markers to.");
                return;
            }

            // Find Audio Amplitude layer
            var audioLayer = null;
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === "Audio Amplitude") {
                    audioLayer = comp.layer(i);
                    break;
                }
            }

            if (!audioLayer) {
                // Attempt to auto-generate from the first available audio layer
                var originalSelection = [];
                for (var s = 0; s < selectedLayers.length; s++) {
                    originalSelection.push(selectedLayers[s]);
                }

                var generatedAudio = false;
                for (var i = 1; i <= comp.numLayers; i++) {
                    if (comp.layer(i).hasAudio && comp.layer(i).audioEnabled) {
                        var wasLocked = comp.layer(i).locked;
                        if (wasLocked) comp.layer(i).locked = false;

                        // Deselect all
                        for (var j = 1; j <= comp.numLayers; j++) comp.layer(j).selected = false;
                        comp.layer(i).selected = true;

                        try {
                            app.executeCommand(app.findMenuCommandId("Convert Audio to Keyframes"));
                            generatedAudio = true;
                        } catch (e) { }

                        if (wasLocked) comp.layer(i).locked = true;
                        break;
                    }
                }

                if (generatedAudio) {
                    // Find the newly generated Audio Amplitude layer
                    for (var i = 1; i <= comp.numLayers; i++) {
                        if (comp.layer(i).name === "Audio Amplitude") {
                            audioLayer = comp.layer(i);
                            break;
                        }
                    }
                    // Restore original selection
                    for (var j = 1; j <= comp.numLayers; j++) comp.layer(j).selected = false;
                    for (var j = 0; j < originalSelection.length; j++) originalSelection[j].selected = true;
                    selectedLayers = originalSelection; // Make sure we use the restored selection
                }
            }

            if (!audioLayer) {
                updateStatus("Error: Could not find or automatically generate 'Audio Amplitude' layer.\nPlease insert an audio layer with sound enabled, or create the Audio Amplitude manually by right-clicking your audio layer -> Keyframe Assistant -> Convert Audio to Keyframes.");
                return;
            }

            var effectGroup = audioLayer.property("ADBE Effect Parade");
            if (!effectGroup) return;
            var bothChannels = effectGroup.property("Both Channels") || effectGroup.property("ADBE Audio Amplitude Both");
            if (!bothChannels) return;
            var slider = bothChannels.property("ADBE Slider Control-0001") || bothChannels.property("Slider");

            if (!slider || slider.numKeys === 0) {
                updateStatus("Error: Audio Amplitude has no keyframes");
                return;
            }

            app.beginUndoGroup("Generate Audio Markers");

            var valThreshold = threshold;
            var minTime = minFrames * comp.frameDuration;

            var tempSpikes = [];
            var inSpike = false;
            var currentPeakVal = 0;
            var currentPeakTime = 0;

            for (var i = 1; i <= slider.numKeys; i++) {
                var val = slider.keyValue(i);
                var t = slider.keyTime(i);

                if (val > valThreshold) {
                    if (!inSpike) {
                        inSpike = true;
                        currentPeakVal = val;
                        currentPeakTime = t;
                    } else {
                        if (val > currentPeakVal) {
                            currentPeakVal = val;
                            currentPeakTime = t;
                        }
                    }
                } else {
                    if (inSpike) {
                        tempSpikes.push({ time: currentPeakTime, value: currentPeakVal });
                        inSpike = false;
                    }
                }
            }
            if (inSpike) {
                tempSpikes.push({ time: currentPeakTime, value: currentPeakVal });
            }

            var spikes = [];
            if (tempSpikes.length > 0) {
                var lastSpikeTime = tempSpikes[0].time;
                spikes.push(tempSpikes[0]);

                for (var j = 1; j < tempSpikes.length; j++) {
                    if (tempSpikes[j].time - lastSpikeTime >= minTime) {
                        spikes.push(tempSpikes[j]);
                        lastSpikeTime = tempSpikes[j].time;
                    } else {
                        if (tempSpikes[j].value > spikes[spikes.length - 1].value) {
                            spikes[spikes.length - 1] = tempSpikes[j];
                            lastSpikeTime = tempSpikes[j].time;
                        }
                    }
                }
            }

            if (spikes.length === 0) {
                app.endUndoGroup();
                updateStatus("No spikes found above threshold " + threshold);
                return;
            }

            if (targetComp) {
                for (var s = 0; s < spikes.length; s++) {
                    try {
                        var mv = new MarkerValue("");
                        comp.markerProperty.setValueAtTime(spikes[s].time, mv);
                    } catch (e) { }
                }
                updateStatus("Added " + spikes.length + " markers to current composition");
            } else {
                for (var l = 0; l < selectedLayers.length; l++) {
                    var layer = selectedLayers[l];
                    for (var s = 0; s < spikes.length; s++) {
                        var mv = new MarkerValue("");
                        layer.property("Marker").setValueAtTime(spikes[s].time, mv);
                    }
                }
                updateStatus("Added " + spikes.length + " markers to " + selectedLayers.length + " layer(s)");
            }


            app.endUndoGroup();

        } catch (error) {
            if (app.project) app.endUndoGroup();
            updateStatus("Error: " + error.toString());
        }
    }

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

    // Add fire distortion effect
    function addFireDistortion() {
        try {
            app.beginUndoGroup("Add Turbulent Displace (Fire)");

            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
                for (var i = 0; i < comp.selectedLayers.length; i++) {
                    var layer = comp.selectedLayers[i];
                    var effect = layer.Effects.addProperty("ADBE Turbulent Displace");

                    if (effect) {
                        // Set Amount to 90
                        effect.property("Amount").setValue(90);

                        // Set Size to 35
                        effect.property("Size").setValue(35);

                        // Set Evolution expression: time * 988
                        effect.property("Evolution").expression = "time * 988";
                    }
                }
                updateStatus("Added fire distortion to " + comp.selectedLayers.length + " layer(s)");
            } else {
                alert("Please select at least one layer in a comp.");
                updateStatus("No layers selected");
            }

            app.endUndoGroup();
        } catch (error) {
            updateStatus("Error: " + error.message);
        }
    }

    // Add Rim Light Effects
    function addRimLightEffects() {
        try {
            app.beginUndoGroup("Add Rim Light");

            var comp = app.project.activeItem;
            if (!(comp && comp instanceof CompItem)) {
                alert("Please select a composition first.");
                updateStatus("No active composition");
                app.endUndoGroup();
                return;
            }

            var layers = comp.selectedLayers;
            if (!layers || layers.length === 0) {
                alert("Please select at least one layer.");
                updateStatus("No layers selected");
                app.endUndoGroup();
                return;
            }

            function tryAddEffect(layer, matchNames) {
                if (!(matchNames instanceof Array)) {
                    matchNames = [matchNames];
                }
                for (var i = 0; i < matchNames.length; i++) {
                    try {
                        var fx = layer.Effects.addProperty(matchNames[i]);
                        if (fx) {
                            return fx;
                        }
                    } catch (err) {
                        // Try next matchName
                    }
                }
                return null;
            }

            function setProp(effect, names, value) {
                if (!effect) return false;
                if (!(names instanceof Array)) {
                    names = [names];
                }
                for (var i = 0; i < names.length; i++) {
                    var prop = effect.property(names[i]);
                    if (prop) {
                        try {
                            prop.setValue(value);
                            return true;
                        } catch (err) {
                            // Skip if cannot set
                        }
                    }
                }
                return false;
            }

            function setFxValue(effect, targets, value) {
                if (!effect) return false;
                if (!(targets instanceof Array)) {
                    targets = [targets];
                }
                for (var i = 0; i < targets.length; i++) {
                    var p = effect.property(targets[i]);
                    if (p) {
                        try {
                            p.setValue(value);
                            return true;
                        } catch (err1) { }
                    }
                }
                // Fallback: index if number provided at end of list
                for (var j = 0; j < targets.length; j++) {
                    if (typeof targets[j] === "number") {
                        var pIdx = effect.property(targets[j]);
                        if (pIdx) {
                            try {
                                pIdx.setValue(value);
                                return true;
                            } catch (err2) { }
                        }
                    }
                }
                return false;
            }

            function findPuppetEffect(layer) {
                try {
                    var fxGroup = layer.property("ADBE Effect Parade");
                    if (!fxGroup) return null;
                    var direct = layer.effect("Puppet");
                    if (direct) return direct;
                    for (var i = 1; i <= fxGroup.numProperties; i++) {
                        var fx = fxGroup.property(i);
                        if (!fx) continue;
                        if (fx.matchName === "ADBE FreePin3" || (fx.name && fx.name.toLowerCase().indexOf("puppet") === 0)) {
                            return fx;
                        }
                    }
                } catch (err) { }
                return null;
            }

            function reorderRimLightEffects(layer, refs) {
                try {
                    var parade = layer.property("ADBE Effect Parade");
                    if (!parade) return;

                    // Get the total number of effects
                    var totalEffects = parade.numProperties;

                    // Move all Rim Light effects to the end first to clear their positions
                    if (refs.glow) { try { refs.glow.moveTo(totalEffects); } catch (e) { } }
                    if (refs.puppetFx) { try { refs.puppetFx.moveTo(totalEffects); } catch (e) { } }
                    if (refs.ccComposite) { try { refs.ccComposite.moveTo(totalEffects); } catch (e) { } }
                    if (refs.setMatte) { try { refs.setMatte.moveTo(totalEffects); } catch (e) { } }
                    if (refs.dropShadow) { try { refs.dropShadow.moveTo(totalEffects); } catch (e) { } }

                    // Now move them to correct order from position 1
                    var targetIdx = 1;

                    if (refs.dropShadow) {
                        try { refs.dropShadow.moveTo(targetIdx++); } catch (e) { }
                    }
                    if (refs.setMatte) {
                        try { refs.setMatte.moveTo(targetIdx++); } catch (e) { }
                    }
                    if (refs.ccComposite) {
                        try { refs.ccComposite.moveTo(targetIdx++); } catch (e) { }
                    }
                    if (refs.puppetFx) {
                        try { refs.puppetFx.moveTo(targetIdx++); } catch (e) { }
                    }
                    if (refs.glow) {
                        try { refs.glow.moveTo(targetIdx++); } catch (e) { }
                    }
                } catch (err) { }
            }

            var processed = 0;
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                if (!layer || layer.locked) {
                    continue;
                }

                var refs = {
                    dropShadow: null,
                    setMatte: null,
                    ccComposite: null,
                    puppetFx: null,
                    glow: null
                };

                // Drop Shadow
                var dropShadow = tryAddEffect(layer, "ADBE Drop Shadow");
                if (dropShadow) {
                    setFxValue(dropShadow, ["ADBE Drop Shadow-0002", "Opacity", 3], 125);
                    setFxValue(dropShadow, ["ADBE Drop Shadow-0003", "Direction", 4], 254);
                    setFxValue(dropShadow, ["ADBE Drop Shadow-0004", "Distance", 5], 128);
                    setFxValue(dropShadow, ["ADBE Drop Shadow-0006", "Softness", 6], 0);
                    setFxValue(dropShadow, ["ADBE Drop Shadow-0007", "Shadow Only", 7], true);
                }
                refs.dropShadow = dropShadow;

                // Set Matte
                var setMatte = tryAddEffect(layer, ["ADBE Set Matte3", "ADBE Set Matte"]);
                if (setMatte) {
                    setProp(setMatte, "Take Matte From Layer", layer.index);
                    setProp(setMatte, "Use For Matte", 4); // Alpha Channel
                    setProp(setMatte, "Invert Matte", false);
                    setProp(setMatte, ["Stretch Matte to Fit", "Stretch Matte To Fit"], true);
                    setProp(setMatte, ["Composite Matte with Original", "Composite Matte With Original"], true);
                    setProp(setMatte, "Premultiply Matte Layer", true);
                }
                refs.setMatte = setMatte;

                // CC Composite
                var ccComposite = tryAddEffect(layer, ["CC Composite", "ADBE CC Composite"]);
                if (ccComposite) {
                    setProp(ccComposite, ["Top Layer", "Layer"], layer.index);
                    setProp(ccComposite, "Opacity", 100);
                    var multiplyValue = (typeof BlendingMode !== "undefined" && BlendingMode.MULTIPLY) ? BlendingMode.MULTIPLY : 17;
                    setProp(ccComposite, ["Transfer Mode", "Blending Mode", "Mode"], multiplyValue);
                    setProp(ccComposite, "Composite Original", 2); // Behind
                    setProp(ccComposite, ["RGB Only", "RGB"], false);
                }
                refs.ccComposite = ccComposite;

                // Puppet (existing)
                refs.puppetFx = findPuppetEffect(layer);
                if (!refs.puppetFx) {
                    var puppetByName = layer.effect ? layer.effect("Puppet") : null;
                    if (puppetByName) refs.puppetFx = puppetByName;
                }

                // Glow
                var glow = tryAddEffect(layer, ["ADBE Glow2", "ADBE Glo2"]);
                if (glow) {
                    setFxValue(glow, ["ADBE Glow-0001", "Glow Based On", 1], 2); // Color Channels
                    setFxValue(glow, ["ADBE Glow-0002", "Glow Threshold", 2], 182);
                    setFxValue(glow, ["ADBE Glow-0003", "Glow Radius", 3], 241);
                    setFxValue(glow, ["ADBE Glow-0004", "Glow Intensity", 4], 1);
                    setFxValue(glow, ["ADBE Glow-0005", "Composite Original", 5], 2); // Behind
                    setFxValue(glow, ["ADBE Glow-0006", "Glow Operation", 6], 6); // Screen
                    setFxValue(glow, ["ADBE Glow-0007", "Glow Colors", 7], 2); // A & B Colors
                    setFxValue(glow, ["ADBE Glow-0008", "Color Looping", 8], 3); // Triangle A>B>A
                    setFxValue(glow, ["ADBE Glow-0009", "Color Loops", 9], 1);
                    setFxValue(glow, ["ADBE Glow-0010", "Color Phase", 10], 0);
                    setFxValue(glow, ["ADBE Glow-0011", "A & B Midpoint", 11], 50);
                    setFxValue(glow, ["ADBE Glow-0012", "Color A", 12], [1, 0, 0, 1]); // Red
                    setFxValue(glow, ["ADBE Glow-0013", "Color B", 13], [1, 1, 1, 1]); // White
                    setFxValue(glow, ["ADBE Glow-0014", "Glow Dimensions", 14], 1); // Horizontal and Vertical
                    refs.glow = glow;
                }

                reorderRimLightEffects(layer, refs);
                processed++;
            }

            updateStatus("Rim Light applied to " + processed + " layer(s)");
            app.endUndoGroup();
        } catch (error) {
            app.endUndoGroup();
            alert("Error adding Rim Light: " + error.message);
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
        subtleBtn.onClick = function () {
            amountInput.text = "25";
            sizeInput.text = "150";
            speedInput.text = "250";
        };

        var normalBtn = presetGroup.add("button", undefined, "Normal");
        normalBtn.onClick = function () {
            amountInput.text = "50";
            sizeInput.text = "150";
            speedInput.text = "360";
        };

        var strongBtn = presetGroup.add("button", undefined, "Strong");
        strongBtn.onClick = function () {
            amountInput.text = "25";
            sizeInput.text = "75";
            speedInput.text = "780";
        };

        var fireBtn = presetGroup.add("button", undefined, "Fire");
        fireBtn.onClick = function () {
            amountInput.text = "90";
            sizeInput.text = "35";
            speedInput.text = "988";
        };

        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
            dialog.close();
        };

        dialog.center();
        dialog.show();
    }

    // ===== PINCH DIALOG =====
    function showPinchDialog() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition first.");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }

            // Build dialog
            var dialog = new Window("dialog", "Pinch Scale");
            dialog.orientation = "column";
            dialog.alignChildren = ["fill", "top"];
            dialog.spacing = 10;
            dialog.margins = 16;

            var infoText = dialog.add("statictext", undefined, selectedLayers.length + " layer(s) selected", { multiline: false });
            infoText.alignment = "center";

            var presetPanel = dialog.add("panel", undefined, "Pinch Amount");
            presetPanel.orientation = "column";
            presetPanel.spacing = 6;
            presetPanel.margins = 10;

            var customRow = presetPanel.add("group");
            customRow.orientation = "row";
            customRow.add("statictext", undefined, "Custom %:");
            var customInput = customRow.add("edittext", undefined, "12");
            customInput.preferredSize.width = 50;

            var inBtnRow = presetPanel.add("group");
            inBtnRow.orientation = "row";

            var btnIn12 = inBtnRow.add("button", undefined, "In +12%");
            var btnIn15 = inBtnRow.add("button", undefined, "In +15%");
            var btnIn20 = inBtnRow.add("button", undefined, "In +20%");

            var outBtnRow = presetPanel.add("group");
            outBtnRow.orientation = "row";

            var btnOut12 = outBtnRow.add("button", undefined, "Out -12%");
            var btnOut15 = outBtnRow.add("button", undefined, "Out -15%");
            var btnOut20 = outBtnRow.add("button", undefined, "Out -20%");

            var applyCustomBtn = presetPanel.add("button", undefined, "Apply Custom");

            var cancelBtn = dialog.add("button", undefined, "Cancel");

            btnIn12.onClick = function () { applyPinch(comp, selectedLayers, 12); dialog.close(); };
            btnIn15.onClick = function () { applyPinch(comp, selectedLayers, 15); dialog.close(); };
            btnIn20.onClick = function () { applyPinch(comp, selectedLayers, 20); dialog.close(); };
            btnOut12.onClick = function () { applyPinch(comp, selectedLayers, -12); dialog.close(); };
            btnOut15.onClick = function () { applyPinch(comp, selectedLayers, -15); dialog.close(); };
            btnOut20.onClick = function () { applyPinch(comp, selectedLayers, -20); dialog.close(); };
            applyCustomBtn.onClick = function () {
                var val = parseFloat(customInput.text);
                if (!isNaN(val)) applyPinch(comp, selectedLayers, val);
                dialog.close();
            };
            cancelBtn.onClick = function () { dialog.close(); };

            dialog.show();

        } catch (error) {
            alert("Pinch Error: " + error.toString());
        }
    }

    function applyPinch(comp, layers, pinchPercent) {
        try {
            app.beginUndoGroup("Pinch +" + pinchPercent + "%");
            var currentTime = comp.time;
            var endTime = currentTime + 8 * comp.frameDuration;
            var successCount = 0;

            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                if (layer.locked) continue;

                // Add position keyframe
                if (layer.transform.position.canSetExpression) {
                    layer.transform.position.setValueAtTime(currentTime, layer.transform.position.value);
                }

                // Add rotation keyframe
                if (layer.transform.rotation.canSetExpression) {
                    layer.transform.rotation.setValueAtTime(currentTime, layer.transform.rotation.value);
                }

                // Add scale keyframe + pinch
                var scaleProp = layer.transform.scale;
                if (scaleProp.canSetExpression) {
                    var currentScale = scaleProp.value;
                    scaleProp.setValueAtTime(currentTime, currentScale);

                    var targetX = currentScale[0] > 0 ? currentScale[0] + pinchPercent : currentScale[0] - pinchPercent;
                    var targetY = currentScale[1] > 0 ? currentScale[1] + pinchPercent : currentScale[1] - pinchPercent;
                    var targetZ = (currentScale.length > 2) ? (currentScale[2] > 0 ? currentScale[2] + pinchPercent : currentScale[2] - pinchPercent) : 0;

                    var targetScale = currentScale.length > 2 ? [targetX, targetY, targetZ] : [targetX, targetY];
                    scaleProp.setValueAtTime(endTime, targetScale);

                    // Easing: 0.90, 0.00, 0.10, 1.00 -> Speed 0, Influence 90
                    try {
                        var key1 = -1, key2 = -1;
                        for (var k = 1; k <= scaleProp.numKeys; k++) {
                            var kt = scaleProp.keyTime(k);
                            if (Math.abs(kt - currentTime) < 0.001) key1 = k;
                            if (Math.abs(kt - endTime) < 0.001) key2 = k;
                        }
                        if (key1 > 0 && key2 > 0) {
                            var easeIn = new KeyframeEase(0, 90);
                            var easeOut = new KeyframeEase(0, 90);
                            var inEaseArray = currentScale.length > 2 ? [easeIn, easeIn, easeIn] : [easeIn, easeIn];
                            var outEaseArray = currentScale.length > 2 ? [easeOut, easeOut, easeOut] : [easeOut, easeOut];

                            scaleProp.setTemporalEaseAtKey(key1, inEaseArray, outEaseArray);
                            scaleProp.setTemporalEaseAtKey(key2, inEaseArray, outEaseArray);
                        }
                    } catch (e) { }

                    successCount++;
                }
            }

            app.endUndoGroup();
            updateStatus("Pinch applied to " + successCount + " layer(s)");

        } catch (error) {
            alert("Pinch Error: " + error.toString());
        }
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
                        var scaleProp = layer.transform.scale;

                        // Create first keyframe at 0%
                        var k1 = scaleProp.addKey(currentTime);
                        scaleProp.setValueAtKey(k1, [0, 0]);

                        // Create second keyframe at 100%
                        var k2 = scaleProp.addKey(secondKeyframeTime);
                        scaleProp.setValueAtKey(k2, [100, 100]);

                        try {
                            // Apply cubic bezier easing (0.17, 0.89, 0.32, 1.27)
                            var bezierData = [0.17, 0.89, 0.32, 1.27];
                            applyCubicBezierToKeyframes(scaleProp, k1, k2, bezierData);
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
        fastBtn.onClick = function () {
            flipInput.text = "2";
        };

        var normalBtn = presetGroup.add("button", undefined, "Normal (3f)");
        normalBtn.onClick = function () {
            flipInput.text = "3";
        };

        var slowBtn = presetGroup.add("button", undefined, "Slow (5f)");
        slowBtn.onClick = function () {
            flipInput.text = "5";
        };

        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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
            btn.onClick = function () {
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
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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
            { name: "6", fps: 6 },
            { name: "7", fps: 7 },
            { name: "9", fps: 9 },
            { name: "12", fps: 12 },
            { name: "24", fps: 24 }
        ];

        for (var i = 0; i < presets.length; i++) {
            var btn = presetGroup.add("button", undefined, presets[i].name);
            btn.preferredSize.width = 35;
            btn.fps = presets[i].fps;
            btn.onClick = function () {
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
        okBtn.onClick = function () {
            var fps = parseFloat(fpsInput.text);

            if (!isNaN(fps)) {
                applyPosterizeTime(fps, appendCheck.value);
                dialog.close();
            } else {
                alert("Please enter a valid number");
            }
        };

        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        cancelBtn.onClick = function () {
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

    // Show B Posterizer dialog
    function showBPosterizerDialog() {
        var dialog = new Window("dialog", "B Posterizer Settings");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 16;

        // Add description
        var desc = dialog.add("statictext", undefined, "Set frames per second:");
        desc.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);

        // FPS input
        var fpsGroup = dialog.add("group");
        fpsGroup.orientation = "row";
        fpsGroup.alignChildren = ["left", "center"];
        fpsGroup.add("statictext", undefined, "Frames per second:");
        var fpsInput = fpsGroup.add("edittext", undefined, "6");
        fpsInput.preferredSize.width = 60;

        // Preset buttons
        var presetGroup = dialog.add("group");
        presetGroup.orientation = "row";
        presetGroup.alignment = "center";

        presetGroup.add("statictext", undefined, "Presets:");

        var presets = [
            { name: "6", fps: 6 },
            { name: "7", fps: 7 },
            { name: "9", fps: 9 },
            { name: "12", fps: 12 },
            { name: "24", fps: 24 }
        ];

        for (var i = 0; i < presets.length; i++) {
            var btn = presetGroup.add("button", undefined, presets[i].name);
            btn.preferredSize.width = 40;
            btn.fps = presets[i].fps;
            btn.onClick = function () {
                fpsInput.text = this.fps.toString();
            };
        }

        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
            var fps = parseFloat(fpsInput.text);

            if (!isNaN(fps)) {
                applyBPosterizer(fps);
                dialog.close();
            } else {
                alert("Please enter a valid number");
            }
        };

        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        cancelBtn.onClick = function () {
            dialog.close();
        };

        dialog.center();
        dialog.show();
    }

    // Apply B Posterizer
    function applyBPosterizer(fps) {
        try {
            if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
                updateStatus("No active composition");
                return;
            }

            var comp = app.project.activeItem;
            var selectedLayers = comp.selectedLayers;

            if (selectedLayers.length === 0) {
                updateStatus("No layers selected");
                return;
            }

            app.beginUndoGroup("Apply B Posterizer");

            var successCount = 0;
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];

                // Activate time remapping
                if (!layer.timeRemapEnabled) {
                    layer.timeRemapEnabled = true;
                }

                var timeRemapProp = layer.timeRemap;
                if (timeRemapProp && timeRemapProp.canSetExpression) {
                    timeRemapProp.expression = "posterizeTime(" + fps + ");\nvalue";
                    successCount++;
                }
            }

            app.endUndoGroup();

            if (successCount > 0) {
                updateStatus("Applied B Posterizer to " + successCount + " layer(s)");
            } else {
                updateStatus("Failed to apply B Posterizer");
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
        var ampInput = ampGroup.add("edittext", undefined, "5");
        ampInput.preferredSize.width = 60;

        // Speed input
        var speedGroup = dialog.add("group");
        speedGroup.orientation = "row";
        speedGroup.alignChildren = ["left", "center"];
        speedGroup.add("statictext", undefined, "Speed (cycles/sec):");
        var speedInput = speedGroup.add("edittext", undefined, "1");
        speedInput.preferredSize.width = 60;

        // Stop time input
        var stopTimeGroup = dialog.add("group");
        stopTimeGroup.orientation = "row";
        stopTimeGroup.alignChildren = ["left", "center"];
        stopTimeGroup.add("statictext", undefined, "Stop Time:");
        var stopTimeInput = stopTimeGroup.add("edittext", undefined, "");
        stopTimeInput.preferredSize.width = 80;
        stopTimeInput.helpTip = "Leave empty for no stop time. Format H:MM:SS:FF";

        var stopHereCheck = stopTimeGroup.add("checkbox", undefined, "Stop Here");
        stopHereCheck.helpTip = "Check to fill stop time with current playhead position";
        stopHereCheck.onClick = function () {
            if (stopHereCheck.value) {
                var currentTime = getCurrentTimeFormatted();
                if (currentTime) {
                    stopTimeInput.text = currentTime;
                    if (typeof updatePreview === 'function') updatePreview();
                }
            }
        };

        // Preset buttons
        var presetGroup = dialog.add("group");
        presetGroup.orientation = "row";
        presetGroup.alignment = "center";

        presetGroup.add("statictext", undefined, "Presets:");

        var presets = [
            { name: "Gentle", amp: 2, speed: 1 },
            { name: "Normal", amp: 5, speed: 2 },
            { name: "Quick", amp: 10, speed: 3 },
            { name: "Intense", amp: 20, speed: 4 }
        ];

        for (var i = 0; i < presets.length; i++) {
            var btn = presetGroup.add("button", undefined, presets[i].name);
            btn.preset = presets[i];
            btn.onClick = function () {
                ampInput.text = this.preset.amp.toString();
                speedInput.text = this.preset.speed.toString();
                updatePreview();
            };
        }

        // Preview
        var previewGroup = dialog.add("group");
        previewGroup.orientation = "column";
        previewGroup.alignChildren = ["fill", "top"];

        var previewLabel = previewGroup.add("statictext", undefined, "Expression Preview:");
        previewLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);

        var previewText = previewGroup.add("statictext", undefined, "var amp = 5;\nvar speed = 1;\n\namp * Math.sin(2 * Math.PI * speed * time);");
        previewText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);

        // Update preview when values change
        function updatePreview() {
            var amp = parseFloat(ampInput.text);
            var speed = parseFloat(speedInput.text);
            var hasStopTime = stopTimeInput.text !== "";
            if (!isNaN(amp) && !isNaN(speed)) {
                if (hasStopTime) {
                    previewText.text = "var amp = " + amp + ";\nvar speed = " + speed + ";\nvar stopTime = [...];\nvar t = time >= stopTime ? stopTime : time;\namp * Math.sin(2 * Math.PI * speed * t);";
                } else {
                    previewText.text = "var amp = " + amp + ";\nvar speed = " + speed + ";\n\namp * Math.sin(2 * Math.PI * speed * time);";
                }
            }
        }

        ampInput.onChanging = updatePreview;
        speedInput.onChanging = updatePreview;
        stopTimeInput.onChanging = updatePreview;

        // Buttons
        var buttonGroup = dialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";

        var okBtn = buttonGroup.add("button", undefined, "Apply");
        okBtn.onClick = function () {
            var amp = parseFloat(ampInput.text);
            var speed = parseFloat(speedInput.text);
            var stopTimeStr = stopTimeInput.text;

            if (!isNaN(amp) && !isNaN(speed)) {
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

                var expression;
                if (stopTimeComponents) {
                    var stopTimeCalculation = "(" + stopTimeComponents.h + " * 3600) + (" + stopTimeComponents.m + " * 60) + " + stopTimeComponents.s + " + (" + stopTimeComponents.f + " * thisComp.frameDuration);";
                    expression = "var amp   = " + amp + ";   // degrees each direction\n" +
                        "var speed = " + speed + ";    // cycles per second\n" +
                        "var stopTime = " + stopTimeCalculation + "\n" +
                        "var t = time;\n" +
                        "if (time >= stopTime) {\n" +
                        "  t = stopTime;\n" +
                        "}\n" +
                        "amp * Math.sin(2 * Math.PI * speed * t);";
                } else {
                    expression = "var amp   = " + amp + ";   // degrees each direction\n" +
                        "var speed = " + speed + ";    // cycles per second\n\n" +
                        "amp * Math.sin(2 * Math.PI * speed * time);";
                }

                handleExpressionClick("Rotation PingPong", expression);
                dialog.close();
            } else {
                alert("Please enter valid numbers");
            }
        };

        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        cancelBtn.onClick = function () {
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
        thunderBtn.onClick = function () {
            highInput.text = "0.7";
            midInput.text = "0.4";
            highRateInput.text = "20";
            midRateInput.text = "8";
            lowRateInput.text = "2";
        };

        var laserBtn = presetGroup.add("button", undefined, "Laser");
        laserBtn.onClick = function () {
            highInput.text = "0.8";
            midInput.text = "0.5";
            highRateInput.text = "30";
            midRateInput.text = "15";
            lowRateInput.text = "5";
        };

        var strobeBtn = presetGroup.add("button", undefined, "Strobe");
        strobeBtn.onClick = function () {
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
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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

        leftBtn.onClick = function () {
            selectedDirection = -1; // LEFT direction (negative)
            leftBtn.fillBrush = leftBtn.graphics.newBrush(leftBtn.graphics.BrushType.SOLID_COLOR, [0.3, 0.3, 0.3, 1]);
            rightBtn.fillBrush = rightBtn.graphics.newBrush(rightBtn.graphics.BrushType.SOLID_COLOR, [0.1, 0.1, 0.1, 1]);
            updatePreview();
        };

        rightBtn.onClick = function () {
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
        walkBtn.onClick = function () {
            speedInput.text = "300";
            arcInput.text = "15";
            freqInput.text = "1.5";
            updatePreview();
        };

        var normalBtn = presetGroup.add("button", undefined, "Normal");
        normalBtn.onClick = function () {
            speedInput.text = "500";
            arcInput.text = "15";
            freqInput.text = "2";
            updatePreview();
        };

        var runBtn = presetGroup.add("button", undefined, "Run");
        runBtn.onClick = function () {
            speedInput.text = "700";
            arcInput.text = "15";
            freqInput.text = "4";
            updatePreview();
        };

        var sprintBtn = presetGroup.add("button", undefined, "Sprint");
        sprintBtn.onClick = function () {
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
        okBtn.onClick = function () {
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
        cancelBtn.onClick = function () {
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
                                } catch (e) {
                                    break; // No more pins
                                }
                            }
                        } catch (e) {
                            break; // No more meshes
                        }
                    }
                } catch (e) {
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

            dialog.add("panel", undefined, "", { borderStyle: "gray" });

            // Pin selection area
            var pinSelectGroup = dialog.add("group");
            pinSelectGroup.orientation = "column";
            pinSelectGroup.alignChildren = ["fill", "top"];

            pinSelectGroup.add("statictext", undefined, "Select Puppet Pins to Create Nulls For (multi-select enabled):");
            var pinList = pinSelectGroup.add("listbox", undefined, [], { multiline: true, multiselect: true });
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

            selectAllBtn.onClick = function () {
                for (var i = 0; i < pinList.items.length; i++) {
                    pinList.items[i].selected = true;
                }
            };

            deselectAllBtn.onClick = function () {
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

            createBtn.onClick = function () {
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
                                myNull.transform.anchorPoint.setValue([myNull.source.width / 2, myNull.source.height / 2]);

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
                        } catch (e) {
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

                } catch (e) {
                    app.endUndoGroup();
                    updateStatus("Error: " + e.toString());
                }
            };

            cancelBtn.onClick = function () {
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

    // Show Kick Out of Frame dialog
    function showKickOutOfFrameDialog() {
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

        var dialog = new Window("palette", "Kick Out of Frame", undefined, { closeButton: true });
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 16;

        // Keep window always on top
        if (dialog.show) {
            dialog.active = true;
        }

        // Info text
        var infoText = dialog.add("statictext", undefined, "Choose direction to kick layer out:");
        infoText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 11);

        // Composition info
        var compInfo = dialog.add("statictext", undefined, "Comp: " + comp.width + " x " + comp.height + " px");
        compInfo.graphics.font = ScriptUI.newFont("Arial", "ITALIC", 10);

        // Direction buttons - arranged in cross pattern
        var topRow = dialog.add("group");
        topRow.orientation = "row";
        topRow.alignChildren = ["center", "center"];

        var kickUpBtn = topRow.add("button", undefined, "^");
        kickUpBtn.preferredSize.width = 50;
        kickUpBtn.preferredSize.height = 35;
        kickUpBtn.helpTip = "Kick Up";

        var middleRow = dialog.add("group");
        middleRow.orientation = "row";
        middleRow.alignChildren = ["center", "center"];
        middleRow.spacing = 10;

        var kickLeftBtn = middleRow.add("button", undefined, "<");
        kickLeftBtn.preferredSize.width = 50;
        kickLeftBtn.preferredSize.height = 35;
        kickLeftBtn.helpTip = "Kick Left";

        var kickRightBtn = middleRow.add("button", undefined, ">");
        kickRightBtn.preferredSize.width = 50;
        kickRightBtn.preferredSize.height = 35;
        kickRightBtn.helpTip = "Kick Right";

        var bottomRow = dialog.add("group");
        bottomRow.orientation = "row";
        bottomRow.alignChildren = ["center", "center"];

        var kickDownBtn = bottomRow.add("button", undefined, "v");
        kickDownBtn.preferredSize.width = 50;
        kickDownBtn.preferredSize.height = 35;
        kickDownBtn.helpTip = "Kick Down";

        // Additional options
        var optionsPanel = dialog.add("panel", undefined, "Options");
        optionsPanel.alignChildren = ["fill", "top"];
        optionsPanel.spacing = 5;
        optionsPanel.margins = 10;

        // Margin input
        var marginGroup = optionsPanel.add("group");
        marginGroup.orientation = "row";
        marginGroup.alignChildren = ["left", "center"];

        marginGroup.add("statictext", undefined, "Extra margin (px):");
        var marginInput = marginGroup.add("edittext", undefined, "50");
        marginInput.preferredSize.width = 60;
        marginInput.helpTip = "Extra distance beyond the frame edge";

        // Close button
        var closeBtn = dialog.add("button", undefined, "Close");
        closeBtn.onClick = function () {
            dialog.close();
        };

        // Button handlers - auto close window after clicking
        kickUpBtn.onClick = function () {
            var margin = parseInt(marginInput.text) || 50;
            kickLayersOutOfFrame("up", margin);
            dialog.close();
        };

        kickRightBtn.onClick = function () {
            var margin = parseInt(marginInput.text) || 50;
            kickLayersOutOfFrame("right", margin);
            dialog.close();
        };

        kickDownBtn.onClick = function () {
            var margin = parseInt(marginInput.text) || 50;
            kickLayersOutOfFrame("down", margin);
            dialog.close();
        };

        kickLeftBtn.onClick = function () {
            var margin = parseInt(marginInput.text) || 50;
            kickLayersOutOfFrame("left", margin);
            dialog.close();
        };

        // Show window and keep it on top
        dialog.show();
    }

    // Kick layers out of frame
    function kickLayersOutOfFrame(direction, margin) {
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

            var compWidth = comp.width;
            var compHeight = comp.height;
            var currentTime = comp.time;

            app.beginUndoGroup("Kick Out of Frame - " + direction);

            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                var positionProp = layer.transform.position;
                var currentPos = positionProp.value;

                // Get layer bounds to calculate how far to move
                var layerRect;
                try {
                    // Try to get the source rect at current time
                    layerRect = layer.sourceRectAtTime(currentTime, false);
                } catch (e) {
                    // Fallback: estimate based on layer source dimensions
                    layerRect = {
                        left: 0,
                        top: 0,
                        width: layer.source ? layer.source.width : 100,
                        height: layer.source ? layer.source.height : 100
                    };
                }

                // Get layer scale to account for scaled dimensions
                var scaleProp = layer.transform.scale.value;
                var scaleX = Math.abs(scaleProp[0]) / 100;
                var scaleY = Math.abs(scaleProp[1]) / 100;

                // Calculate scaled layer dimensions
                var layerWidth = layerRect.width * scaleX;
                var layerHeight = layerRect.height * scaleY;

                var newPos;
                if (direction === "up") {
                    // Kick up: move Y so the bottom of the layer is above the top of the composition
                    var newY = -(layerHeight / 2) - margin;
                    newPos = [currentPos[0], newY];
                } else if (direction === "down") {
                    // Kick down: move Y so the top of the layer is below the bottom of the composition
                    var newY = compHeight + (layerHeight / 2) + margin;
                    newPos = [currentPos[0], newY];
                } else if (direction === "right") {
                    // Kick right: move X so the left edge is past the right edge of the composition
                    var newX = compWidth + (layerWidth / 2) + margin;
                    newPos = [newX, currentPos[1]];
                } else if (direction === "left") {
                    // Kick left: move X so the right edge is past the left edge of the composition
                    var newX = -(layerWidth / 2) - margin;
                    newPos = [newX, currentPos[1]];
                }

                // Handle 3D layers (position has 3 values)
                if (currentPos.length === 3) {
                    newPos = [newPos[0], newPos[1], currentPos[2]];
                }

                // Add keyframe at current playhead position
                positionProp.setValueAtTime(currentTime, newPos);
            }

            app.endUndoGroup();
            updateStatus("Kicked " + selectedLayers.length + " layer(s) " + direction + " out of frame");

        } catch (error) {
            updateStatus("Error: " + error.message);
        }
    }

    // Show Put Here dialog
    function showPutHereDialog() {
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

        var dialog = new Window("palette", "Put Here", undefined, { closeButton: true });
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 10;
        dialog.margins = 16;

        if (dialog.show) {
            dialog.active = true;
        }

        var infoText = dialog.add("statictext", undefined, "Choose start origin direction:");
        infoText.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 11);

        var compInfo = dialog.add("statictext", undefined, "Comp: " + comp.width + " x " + comp.height + " px");
        compInfo.graphics.font = ScriptUI.newFont("Arial", "ITALIC", 10);

        var topRow = dialog.add("group");
        topRow.orientation = "row";
        topRow.alignChildren = ["center", "center"];

        var upBtn = topRow.add("button", undefined, "^");
        upBtn.preferredSize.width = 50;
        upBtn.preferredSize.height = 35;
        upBtn.helpTip = "Start from Up";

        var middleRow = dialog.add("group");
        middleRow.orientation = "row";
        middleRow.alignChildren = ["center", "center"];
        middleRow.spacing = 10;

        var leftBtn = middleRow.add("button", undefined, "<");
        leftBtn.preferredSize.width = 50;
        leftBtn.preferredSize.height = 35;
        leftBtn.helpTip = "Start from Left";

        var rightBtn = middleRow.add("button", undefined, ">");
        rightBtn.preferredSize.width = 50;
        rightBtn.preferredSize.height = 35;
        rightBtn.helpTip = "Start from Right";

        var bottomRow = dialog.add("group");
        bottomRow.orientation = "row";
        bottomRow.alignChildren = ["center", "center"];

        var downBtn = bottomRow.add("button", undefined, "v");
        downBtn.preferredSize.width = 50;
        downBtn.preferredSize.height = 35;
        downBtn.helpTip = "Start from Down";

        // Margin input
        var optionsPanel = dialog.add("panel", undefined, "Options");
        optionsPanel.alignChildren = ["fill", "top"];
        optionsPanel.spacing = 5;
        optionsPanel.margins = 10;

        var marginGroup = optionsPanel.add("group");
        marginGroup.orientation = "row";
        marginGroup.alignChildren = ["left", "center"];

        marginGroup.add("statictext", undefined, "Extra margin (px):");
        var marginInput = marginGroup.add("edittext", undefined, "50");
        marginInput.preferredSize.width = 60;
        marginInput.helpTip = "Extra distance beyond the frame edge";

        // Walk option
        var walkGroup = optionsPanel.add("group");
        walkGroup.orientation = "row";
        walkGroup.alignChildren = ["left", "center"];
        var walkCheckbox = walkGroup.add("checkbox", undefined, "Walk");
        walkCheckbox.value = false;
        walkCheckbox.helpTip = "Add walking oscillation before stopping";

        var closeBtn = dialog.add("button", undefined, "Close");
        closeBtn.onClick = function () {
            dialog.close();
        };

        upBtn.onClick = function () {
            var margin = parseInt(marginInput.text) || 50;
            putLayersHere("up", margin, walkCheckbox.value);
            dialog.close();
        };

        rightBtn.onClick = function () {
            var margin = parseInt(marginInput.text) || 50;
            putLayersHere("right", margin, walkCheckbox.value);
            dialog.close();
        };

        downBtn.onClick = function () {
            var margin = parseInt(marginInput.text) || 50;
            putLayersHere("down", margin, walkCheckbox.value);
            dialog.close();
        };

        leftBtn.onClick = function () {
            var margin = parseInt(marginInput.text) || 50;
            putLayersHere("left", margin, walkCheckbox.value);
            dialog.close();
        };

        dialog.show();
    }

    // Put layers here from outside frame
    function putLayersHere(direction, margin, isWalk) {
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

            var compWidth = comp.width;
            var compHeight = comp.height;
            var currentTime = comp.time;
            var fps = comp.frameRate;

            app.beginUndoGroup("Put Here - " + direction + (isWalk ? " (Walk)" : ""));

            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];

                var posProp = layer.transform.position;
                var scaleProp = layer.transform.scale;
                var rotProp = layer.transform.rotation;

                if (layer.threeDLayer && layer.transform.zRotation) {
                    rotProp = layer.transform.zRotation;
                }

                var startPos = posProp.valueAtTime(currentTime, false);
                var startScale = scaleProp.valueAtTime(currentTime, false);
                var startRot = rotProp.valueAtTime(currentTime, false);

                if (!posProp.numKeys && posProp.canSetExpression) posProp.setValue(startPos);
                if (!scaleProp.numKeys && scaleProp.canSetExpression) scaleProp.setValue(startScale);
                if (!rotProp.numKeys && rotProp.canSetExpression) rotProp.setValue(startRot);

                // 1. Create keyframes at current playhead (Destination)
                posProp.setValueAtTime(currentTime, startPos);
                scaleProp.setValueAtTime(currentTime, startScale);
                rotProp.setValueAtTime(currentTime, startRot);

                var destPosKeyIdx = posProp.nearestKeyIndex(currentTime);
                var destScaleKeyIdx = scaleProp.nearestKeyIndex(currentTime);
                var destRotKeyIdx = rotProp.nearestKeyIndex(currentTime);

                // Apply easing to the destination keyframes
                var easeIn = new KeyframeEase(0, 33);
                var easeOut = new KeyframeEase(0, 33);

                // For spatial paths, provide only 1 value
                if (posProp.propertyValueType === PropertyValueType.TwoD_SPATIAL || posProp.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                    posProp.setTemporalEaseAtKey(destPosKeyIdx, [easeIn], [easeOut]);
                } else {
                    var pDim = posProp.propertyValueType === PropertyValueType.OneD ? 1 : (posProp.propertyValueType === PropertyValueType.TwoD ? 2 : 3);
                    var pIn = [], pOut = [];
                    for (var d = 0; d < pDim; d++) { pIn.push(easeIn); pOut.push(easeOut); }
                    posProp.setTemporalEaseAtKey(destPosKeyIdx, pIn, pOut);
                }

                var sDim = scaleProp.propertyValueType === PropertyValueType.OneD ? 1 : (scaleProp.propertyValueType === PropertyValueType.TwoD ? 2 : 3);
                var sIn = [], sOut = [];
                for (var d = 0; d < sDim; d++) { sIn.push(easeIn); sOut.push(easeOut); }
                scaleProp.setTemporalEaseAtKey(destScaleKeyIdx, sIn, sOut);

                rotProp.setTemporalEaseAtKey(destRotKeyIdx, [easeIn], [easeOut]);

                // 2. Create keyframes at the beginning of the layer (Origin)
                var layerStart = layer.inPoint;

                scaleProp.setValueAtTime(layerStart, startScale);
                rotProp.setValueAtTime(layerStart, startRot);

                // Calculate offscreen position
                var layerRect;
                try {
                    layerRect = layer.sourceRectAtTime(layerStart, false);
                } catch (e) {
                    layerRect = {
                        left: 0,
                        top: 0,
                        width: layer.source ? layer.source.width : 100,
                        height: layer.source ? layer.source.height : 100
                    };
                }

                var scaleX = Math.abs(startScale[0]) / 100;
                var scaleY = Math.abs(startScale[1]) / 100;

                var layerWidth = layerRect.width * scaleX;
                var layerHeight = layerRect.height * scaleY;

                var originPos;
                if (direction === "up") {
                    var newY = -(layerHeight / 2) - margin;
                    originPos = [startPos[0], newY];
                } else if (direction === "down") {
                    var newY = compHeight + (layerHeight / 2) + margin;
                    originPos = [startPos[0], newY];
                } else if (direction === "right") {
                    var newX = compWidth + (layerWidth / 2) + margin;
                    originPos = [newX, startPos[1]];
                } else if (direction === "left") {
                    var newX = -(layerWidth / 2) - margin;
                    originPos = [newX, startPos[1]];
                }

                if (startPos.length === 3) {
                    originPos = [originPos[0], originPos[1], startPos[2]];
                }

                posProp.setValueAtTime(layerStart, originPos);

                // 3. Add Walking movement using expression if enabled
                if (isWalk) {
                    var expression = "amp = 24;\n" +
                        "framesPerCycle = 12;\n" +
                        "stopTime = " + currentTime.toFixed(4) + ";\n" +
                        "t = time;\n" +
                        "if (time >= stopTime) {\n" +
                        "  t = stopTime;\n" +
                        "}\n" +
                        "freq = 1 / (framesPerCycle * thisComp.frameDuration);\n" +
                        "y_movement = Math.sin(t * freq * 2 * Math.PI) * amp;\n" +
                        "value + [0, y_movement];";

                    if (posProp.canSetExpression) {
                        posProp.expression = expression;
                    }
                }
            }

            app.endUndoGroup();
            updateStatus("Put Here: " + selectedLayers.length + " layer(s) from " + direction + (isWalk ? " (Walking)" : ""));

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
                            } catch (e) {
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
        } catch (e) {
            // Some properties may not be accessible
        }

        return propList;
    }

    // Hide all layers starting with 'hide' in main_comp
    function hideAllLayersNamedHide() {
        try {
            var processedComps = {};
            var missingXComps = [];

            // Function to process a composition recursively up to depth 1
            function processComp(comp, depth) {
                if (processedComps[comp.id]) return;
                processedComps[comp.id] = true;

                var hasXLayer = false;

                for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i);

                    // Check for precomp and process it recursively IF depth < 1
                    // Ignore layers with "audio" in the name
                    if (layer.source instanceof CompItem && depth < 1 && layer.name.toLowerCase().indexOf("audio") === -1) {
                        processComp(layer.source, depth + 1); // limited depth
                    }

                    // Check if name starts with "hide" or "x" (case-insensitive)
                    var lowerName = layer.name.toLowerCase();
                    if (lowerName.indexOf("hide") === 0 || lowerName.indexOf("x") === 0) {
                        layer.enabled = false; // Hides the layer (eye icon off)
                        layer.visible = false; // Optional UI update
                        hasXLayer = true;
                    }
                }

                // If this is a precomp (not main_comp) and does not have an X or hide layer
                // Also ignore any compositions that have "audio" in their name
                if (!hasXLayer && comp.name !== "main_comp" && comp.name.toLowerCase().indexOf("audio") === -1) {
                    missingXComps.push(comp.name);
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
                processComp(mainComp, 0); // Start at depth 0
                app.endUndoGroup();

                var logPathMsg = "";
                if (missingXComps.length > 0) {
                    var dateStr = new Date().toLocaleString();
                    var reportText = "==================================================\n";
                    reportText += "        MISSING \"X\" LAYERS REPORT\n";
                    reportText += "==================================================\n";
                    reportText += "Date: " + dateStr + "\n\n";
                    reportText += "The following precompositions do NOT contain an\n";
                    reportText += " \"x\" or \"hide\" layer inside them. Please review\n";
                    reportText += " them and manually hide or adjust if necessary.\n\n";
                    reportText += "--------------------------------------------------\n";
                    for (var m = 0; m < missingXComps.length; m++) {
                        reportText += "[ ] " + missingXComps[m] + "\n";
                    }
                    reportText += "--------------------------------------------------\n";
                    reportText += "Total Missing: " + missingXComps.length + " precomps\n";
                    reportText += "==================================================\n";

                    var alertMsg = "⚠ ACTION REQUIRED ⚠\n\nFound " + missingXComps.length + " precomps missing an 'x' or 'hide' layer!\n\n";
                    var maxAlertComps = 15;
                    for (var k = 0; k < Math.min(missingXComps.length, maxAlertComps); k++) {
                        alertMsg += " • " + missingXComps[k] + "\n";
                    }
                    if (missingXComps.length > maxAlertComps) {
                        alertMsg += " • ... and " + (missingXComps.length - maxAlertComps) + " more.\n";
                    }
                    alertMsg += "\nA detailed report has been saved to your project folder.";

                    alert(alertMsg);

                    if (app.project.file) {
                        var folder = app.project.file.parent;
                        var logFile = new File(folder.fsName + "/missing_x_layers_report.txt");
                        if (logFile.open("w")) {
                            logFile.encoding = "UTF-8";
                            logFile.write(reportText);
                            logFile.close();
                            logPathMsg = " | Log saved to project folder";
                        }
                    } else {
                        logPathMsg = " | (Project not saved, no log created)";
                    }
                }

                updateStatus("Hidden all layers starting with 'hide' or 'x' in main_comp and precomps" + logPathMsg);
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

                    // Check if name is "x", "X", or expressions like "X and x"
                    var layerNameStr = layer.name.toString().replace(/^\s+|\s+$/g, '').toLowerCase();
                    if (layerNameStr === "x" || layerNameStr === "x and x" || layerNameStr === "x & x") {
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
            selectedLayers.sort(function (a, b) {
                return a.inPoint - b.inPoint;
            });

            // Trim layers from first to second-to-last
            for (var i = 0; i < selectedLayers.length - 1; i++) {
                var currentLayer = selectedLayers[i];
                var nextLayer = selectedLayers[i + 1];

                if (!currentLayer.locked) {
                    try {
                        var trimTime = nextLayer.inPoint;

                        // Trim current layer's out point to next layer's in point
                        currentLayer.outPoint = trimTime;

                        // Add marker inside precomp if it is one
                        if (currentLayer.source instanceof CompItem) {
                            var innerComp = currentLayer.source;
                            var localTime;

                            // Convert the main comp trimTime to local time inside the precomp
                            if (currentLayer.timeRemapEnabled) {
                                localTime = currentLayer.property("ADBE Time Remapping").valueAtTime(trimTime, false);
                            } else {
                                localTime = (trimTime - currentLayer.startTime) * (100 / currentLayer.stretch);
                            }

                            // Add the composition marker
                            var mv = new MarkerValue("End");
                            innerComp.markerProperty.setValueAtTime(localTime, mv);
                        }
                    } catch (err) {
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
                    var nextLayer = comp.layer(i - 1);

                    // Check if layers exist and current layer is not locked
                    if (currentLayer && nextLayer && !currentLayer.locked) {
                        try {
                            // Trim current layer's out point to next layer's in point
                            currentLayer.outPoint = nextLayer.inPoint;
                        } catch (err) {
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

            // Create dialog instead of prompt
            var dialog = new Window("dialog", "Batch Duration Settings");
            dialog.orientation = "column";
            dialog.alignChildren = ["fill", "top"];
            dialog.spacing = 10;
            dialog.margins = 16;

            // Duration input
            var durGroup = dialog.add("group");
            durGroup.orientation = "row";
            durGroup.alignChildren = ["left", "center"];
            durGroup.spacing = 5;

            durGroup.add("statictext", undefined, "Duration (seconds):");
            var durInput = durGroup.add("edittext", undefined, "10");
            durInput.preferredSize.width = 60;

            // Separator
            dialog.add("panel");

            // Batch Scale checkbox + input
            var scaleGroup = dialog.add("group");
            scaleGroup.orientation = "row";
            scaleGroup.alignChildren = ["left", "center"];
            scaleGroup.spacing = 5;

            var scaleCheck = scaleGroup.add("checkbox", undefined, "Batch Scale:");
            scaleCheck.value = false;
            scaleCheck.helpTip = "Also scale selected layers to this percentage";

            var scaleInput = scaleGroup.add("edittext", undefined, "100");
            scaleInput.preferredSize.width = 50;
            scaleInput.enabled = false;

            scaleGroup.add("statictext", undefined, "%");

            // Toggle scale input enabled state
            scaleCheck.onClick = function () {
                scaleInput.enabled = scaleCheck.value;
            };

            // Buttons
            var btnGroup = dialog.add("group");
            btnGroup.orientation = "row";
            btnGroup.alignment = "center";
            btnGroup.spacing = 10;

            var okBtn = btnGroup.add("button", undefined, "Apply");
            var cancelBtn = btnGroup.add("button", undefined, "Cancel");

            cancelBtn.onClick = function () {
                dialog.close(0);
            };

            okBtn.onClick = function () {
                dialog.close(1);
            };

            dialog.center();
            var result = dialog.show();

            if (result !== 1) {
                return;
            }

            var newDuration = parseFloat(durInput.text);
            if (isNaN(newDuration) || newDuration <= 0) {
                alert("Duration must be a positive number.");
                updateStatus("Invalid duration input");
                return;
            }

            var shouldScale = scaleCheck.value;
            var scalePercentage = parseFloat(scaleInput.text);
            if (shouldScale && (isNaN(scalePercentage) || scalePercentage <= 0)) {
                alert("Scale percentage must be a positive number.");
                updateStatus("Invalid scale input");
                return;
            }

            app.beginUndoGroup("Change Precomp Durations and Stretch Layers");

            var changedCount = 0;
            var scaledCount = 0;
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

                        } catch (e) {
                            // Some layers may not support time remapping (e.g., solids, text)
                            // Try to just stretch in/out points instead
                            try {
                                var oldInPoint = innerLayer.inPoint;
                                var oldOutPoint = innerLayer.outPoint;
                                innerLayer.inPoint = oldInPoint * stretchRatio;
                                innerLayer.outPoint = oldOutPoint * stretchRatio;
                            } catch (e2) {
                                // Skip this layer if it can't be stretched
                            }
                        }
                    }

                    changedCount++;
                }

                // Apply batch scale if checkbox was checked
                if (shouldScale && layer.transform.scale) {
                    layer.transform.scale.setValue([scalePercentage, scalePercentage]);
                    scaledCount++;
                }
            }

            app.endUndoGroup();

            if (changedCount > 0) {
                var statusMsg = "Duration updated for " + changedCount + " precomp(s)";
                if (shouldScale && scaledCount > 0) {
                    statusMsg += ", scaled " + scaledCount + " layer(s) to " + scalePercentage + "%";
                }
                updateStatus(statusMsg);
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
        calPlusBtnWindow.onClick = function () {
            var current = parseFloat(calibrationInputWindow.text) || 0;
            calibrationInputWindow.text = (current + 50).toString();
        };

        var calMinusBtnWindow = topRow.add("button", undefined, "-");
        calMinusBtnWindow.preferredSize.width = 18;
        calMinusBtnWindow.preferredSize.height = 30;
        calMinusBtnWindow.onClick = function () {
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
        timeInput.onChanging = function () {
            if (this.text) {
                parseTimeAndJumpInWindow(this.text);
                // Clear input and refocus for next input
                var self = this;
                app.setTimeout(function () {
                    self.text = "";
                    self.active = true;
                }, 100);
            }
        };

        // Also add onClick to ensure it stays focused when clicked
        timeInput.onClick = function () {
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

    // Function to open X Crop tool
    function openXCropTool() {
        try {
            // Get the path to X Crop.jsx in the same directory
            var scriptFile = new File($.fileName);
            var scriptFolder = scriptFile.parent;
            var xCropPath = scriptFolder.absoluteURI + "/X Crop.jsx";
            var xCropFile = new File(xCropPath);

            if (!xCropFile.exists) {
                alert("X Crop.jsx not found in the same directory as Expression Panel.");
                return;
            }

            // Set flag so X Crop.jsx won't auto-show its own window
            $.global.__XCROP_LOADED_AS_MODULE = true;

            // Evaluate the X Crop script
            $.evalFile(xCropFile);

            // Call the showXCropDialog function
            if (typeof showXCropDialog === 'function') {
                showXCropDialog();
            } else {
                alert("Error: X Crop dialog function not found.");
            }

        } catch (error) {
            alert("Error opening X Crop tool: " + error.toString());
        }
    }

    // Looper Tool: Enable time remap loop on selected precomp
    function looperTool() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition first.");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                alert("Please select at least one precomp layer.");
                return;
            }

            app.beginUndoGroup("Looper Tool");

            var processedCount = 0;
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];

                // Check if the layer is a precomp
                if (!layer.source || !(layer.source instanceof CompItem)) {
                    continue;
                }

                // 1. Enable time remapping if not already enabled
                // When enabled, AE auto-creates 2 keyframes: at first frame and last frame
                if (!layer.timeRemapEnabled) {
                    layer.timeRemapEnabled = true;
                }

                var timeRemap = layer.property("ADBE Time Remapping");
                if (!timeRemap) continue;

                // 2. Calculate the total number of frames in the layer's time span
                var layerDuration = layer.source.duration;
                var fps = comp.frameRate;
                var totalFrames = Math.round(layerDuration * fps);

                if (totalFrames < 2) {
                    continue; // Need at least 2 frames to loop
                }

                // 3. Add a keyframe at the second-to-last frame (totalFrames - 1)
                // e.g. if totalFrames = 12, add keyframe at frame 11
                var startTime = layer.inPoint;
                var secondToLastFrameTime = startTime + (totalFrames - 1) / fps;
                var secondToLastFrameValue = (totalFrames - 1) / fps;
                timeRemap.setValueAtTime(secondToLastFrameTime, secondToLastFrameValue);

                // 4. Remove the last keyframe (the auto-generated one at the last frame)
                // After adding our keyframe, the last keyframe is now at the end
                // Find and remove any keyframe beyond our second-to-last frame
                for (var k = timeRemap.numKeys; k >= 1; k--) {
                    if (timeRemap.keyTime(k) > secondToLastFrameTime + 0.001) {
                        timeRemap.removeKey(k);
                    }
                }

                // 5. Apply loopOut expression
                timeRemap.expression = 'loopOut("cycle")';

                processedCount++;
            }

            app.endUndoGroup();

            if (processedCount > 0) {
                updateStatus("Looper applied to " + processedCount + " layer(s)");
            } else {
                alert("No valid precomp layers found in selection.");
                updateStatus("No precomps found");
            }

        } catch (error) {
            alert("Error in Looper Tool: " + error.toString());
            updateStatus("Error: " + error.toString());
        }
    }

    // Function to parent selected layers to the last selected layer
    function linkerLayers() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                updateStatus("No active composition found");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length < 2) {
                updateStatus("Please select at least 2 layers");
                return;
            }

            app.beginUndoGroup("Linker Layers");

            // The last element in the selectedLayers array is the last one selected
            var targetLayer = selectedLayers[selectedLayers.length - 1];
            var linkedCount = 0;

            for (var i = 0; i < selectedLayers.length - 1; i++) {
                var layerToLink = selectedLayers[i];

                if (layerToLink !== targetLayer) {
                    layerToLink.parent = targetLayer;
                    linkedCount++;
                }
            }

            app.endUndoGroup();
            updateStatus("Linked " + linkedCount + " layer(s) to " + targetLayer.name);

        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Function to move selected layers below the last selected layer
    function Bellow() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                updateStatus("No active composition found");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length < 2) {
                updateStatus("Please select at least 2 layers");
                return;
            }

            app.beginUndoGroup("Move Layers Below");

            // The last element in the selectedLayers array is the last one selected
            var targetLayer = selectedLayers[selectedLayers.length - 1];
            var movedCount = 0;

            var currentTarget = targetLayer;

            for (var i = 0; i < selectedLayers.length - 1; i++) {
                var layerToMove = selectedLayers[i];

                if (layerToMove !== targetLayer) {
                    layerToMove.moveAfter(currentTarget);
                    currentTarget = layerToMove;
                    movedCount++;
                }
            }

            app.endUndoGroup();
            updateStatus("Moved " + movedCount + " layer(s) below " + targetLayer.name);

        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Function to align selected keyframes to active composition markers
    // Function to align selected keyframes to active composition markers
    function alignKeyframesToMarkers() {
        var undoGroupStarted = false;
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                if (typeof updateStatus === "function") updateStatus("No active composition found");
                return;
            }

            var selectedProps = comp.selectedProperties;
            if (!selectedProps || selectedProps.length === 0) {
                if (typeof updateStatus === "function") updateStatus("Please select keyframes");
                return;
            }

            var compMarkers = comp.markerProperty;
            if (!compMarkers || compMarkers.numKeys === 0) {
                if (typeof updateStatus === "function") updateStatus("No markers found in composition");
                return;
            }

            var markerTimes = [];
            for (var m = 1; m <= compMarkers.numKeys; m++) {
                markerTimes.push(compMarkers.keyTime(m));
            }
            markerTimes.sort(function (a, b) { return a - b; });

            app.beginUndoGroup("Align to MK");
            undoGroupStarted = true;

            var propRecords = [];
            var allClusters = [];

            for (var p = 0; p < selectedProps.length; p++) {
                var prop = selectedProps[p];
                if (!prop.canVaryOverTime || prop.selectedKeys.length === 0) {
                    continue;
                }

                var layer = prop.propertyGroup(prop.propertyDepth);
                var layerIndex = layer ? layer.index : -1;

                var selKeyIndices = prop.selectedKeys;
                var keysData = [];
                for (var k = 0; k < selKeyIndices.length; k++) {
                    var idx = selKeyIndices[k];
                    var t = prop.keyTime(idx);

                    var cluster = null;
                    for (var c = 0; c < allClusters.length; c++) {
                        if (allClusters[c].layerIndex === layerIndex && Math.abs(allClusters[c].time - t) < 0.005) {
                            cluster = allClusters[c];
                            break;
                        }
                    }
                    if (!cluster) {
                        cluster = { layerIndex: layerIndex, time: t };
                        allClusters.push(cluster);
                    }

                    var data = {
                        time: t,
                        value: prop.keyValue(idx),
                        clusterInfo: cluster
                    };

                    if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                        try { data.inSpatialTangent = prop.keyInSpatialTangent(idx); } catch (e) { }
                        try { data.outSpatialTangent = prop.keyOutSpatialTangent(idx); } catch (e) { }
                        try { data.roving = prop.keyRoving(idx); } catch (e) { }
                    }

                    try { data.inInterpolationType = prop.keyInInterpolationType(idx); } catch (e) { }
                    try { data.outInterpolationType = prop.keyOutInterpolationType(idx); } catch (e) { }

                    if (data.inInterpolationType === KeyframeInterpolationType.BEZIER || data.outInterpolationType === KeyframeInterpolationType.BEZIER) {
                        try { data.inTemporalEase = prop.keyInTemporalEase(idx); } catch (e) { }
                        try { data.outTemporalEase = prop.keyOutTemporalEase(idx); } catch (e) { }
                    }
                    try { data.spatialContinuous = prop.keySpatialContinuous(idx); } catch (e) { }
                    try { data.spatialAutoBezier = prop.keySpatialAutoBezier(idx); } catch (e) { }
                    try { data.temporalContinuous = prop.keyTemporalContinuous(idx); } catch (e) { }
                    try { data.temporalAutoBezier = prop.keyTemporalAutoBezier(idx); } catch (e) { }

                    keysData.push(data);
                }

                keysData.sort(function (a, b) { return a.time - b.time; });

                var revIndices = [];
                for (var k = 0; k < selKeyIndices.length; k++) { revIndices.push(selKeyIndices[k]); }
                revIndices.sort(function (a, b) { return b - a; });

                var dummyTime = (prop.numKeys > 0 ? prop.keyTime(prop.numKeys) : comp.time) + 9000;

                propRecords.push({
                    prop: prop,
                    keysData: keysData,
                    revIndices: revIndices,
                    dummyTime: dummyTime
                });
            }

            allClusters.sort(function (a, b) {
                if (Math.abs(a.time - b.time) > 0.005) {
                    return a.time - b.time;
                }
                return a.layerIndex - b.layerIndex;
            });

            for (var c = 0; c < allClusters.length; c++) {
                allClusters[c].rank = c;
            }

            var totalKeysMoved = 0;

            for (var r = 0; r < propRecords.length; r++) {
                var record = propRecords[r];
                var prop = record.prop;

                prop.addKey(record.dummyTime);

                for (var k = 0; k < record.revIndices.length; k++) {
                    prop.removeKey(record.revIndices[k]);
                }

                for (var k = 0; k < record.keysData.length; k++) {
                    var d = record.keysData[k];
                    var newTime = d.time;
                    var rank = d.clusterInfo.rank;

                    if (rank < markerTimes.length) {
                        newTime = markerTimes[rank];
                        totalKeysMoved++;
                    }

                    var newIdx = prop.addKey(newTime);
                    prop.setValueAtKey(newIdx, d.value);

                    if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
                        try { prop.setSpatialTangentsAtKey(newIdx, d.inSpatialTangent, d.outSpatialTangent); } catch (e) { }
                        try { prop.setRovingAtKey(newIdx, d.roving); } catch (e) { }
                        try { prop.setSpatialContinuousAtKey(newIdx, d.spatialContinuous); } catch (e) { }
                        try { prop.setSpatialAutoBezierAtKey(newIdx, d.spatialAutoBezier); } catch (e) { }
                    }
                    try { prop.setTemporalContinuousAtKey(newIdx, d.temporalContinuous); } catch (e) { }
                    try { prop.setTemporalAutoBezierAtKey(newIdx, d.temporalAutoBezier); } catch (e) { }

                    if (d.inTemporalEase && d.outTemporalEase) {
                        try { prop.setTemporalEaseAtKey(newIdx, d.inTemporalEase, d.outTemporalEase); } catch (e) { }
                    }

                    try { prop.setInterpolationTypeAtKey(newIdx, d.inInterpolationType, d.outInterpolationType); } catch (e) { }
                }

                var finalDummyIdx = prop.nearestKeyIndex(record.dummyTime);
                if (finalDummyIdx > 0 && Math.abs(prop.keyTime(finalDummyIdx) - record.dummyTime) < 0.1) {
                    prop.removeKey(finalDummyIdx);
                }
            }

            app.endUndoGroup();
            if (typeof updateStatus === "function") updateStatus("Aligned " + allClusters.length + " keyframe cluster(s) to markers");

        } catch (e) {
            if (undoGroupStarted) app.endUndoGroup();
            if (typeof updateStatus === "function") updateStatus("Error: " + e.toString());
            else alert("Error: " + e.toString());
        }
    }

    // Function to align selected layers to active composition markers
    function alignLayersToMarkers() {
        var undoGroupStarted = false;
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                if (typeof updateStatus === "function") updateStatus("No active composition found");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (!selectedLayers || selectedLayers.length === 0) {
                if (typeof updateStatus === "function") updateStatus("Please select layers");
                return;
            }

            var compMarkers = comp.markerProperty;
            if (!compMarkers || compMarkers.numKeys === 0) {
                if (typeof updateStatus === "function") updateStatus("No markers found in composition");
                return;
            }

            var markerTimes = [];
            for (var m = 1; m <= compMarkers.numKeys; m++) {
                markerTimes.push(compMarkers.keyTime(m));
            }
            markerTimes.sort(function (a, b) { return a - b; });

            app.beginUndoGroup("Align Layers to MK");
            undoGroupStarted = true;

            var layersToAlign = [];
            for (var i = 0; i < selectedLayers.length; i++) {
                layersToAlign.push(selectedLayers[i]);
            }
            // Reverse the array so bottom layers align to earlier markers
            layersToAlign.reverse();

            var movedCount = 0;
            for (var i = 0; i < layersToAlign.length; i++) {
                if (i < markerTimes.length) {
                    var layer = layersToAlign[i];
                    var offset = markerTimes[i] - layer.inPoint;
                    layer.startTime += offset;
                    movedCount++;
                }
            }

            app.endUndoGroup();
            if (typeof updateStatus === "function") updateStatus("Aligned " + movedCount + " layer(s) to markers");

        } catch (e) {
            if (undoGroupStarted) app.endUndoGroup();
            if (typeof updateStatus === "function") updateStatus("Error: " + e.toString());
            else alert("Error: " + e.toString());
        }
    }

    // Stagger Layers function

    function staggerLayers(frames, type) {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                updateStatus("No active composition found");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length < 2) {
                updateStatus("Please select at least 2 layers");
                return;
            }

            app.beginUndoGroup("Stagger Layers");

            var fps = comp.frameRate;
            var offsetSec = frames / fps;

            var layersToStagger = [];
            for (var i = 0; i < selectedLayers.length; i++) {
                layersToStagger.push(selectedLayers[i]);
            }

            if (type === "Descending") {
                layersToStagger.reverse();
            } else if (type === "Random") {
                // Random shuffle
                for (var i = layersToStagger.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var temp = layersToStagger[i];
                    layersToStagger[i] = layersToStagger[j];
                    layersToStagger[j] = temp;
                }
            }

            for (var i = 1; i < layersToStagger.length; i++) {
                layersToStagger[i].startTime += (i * offsetSec);
            }

            app.endUndoGroup();
            updateStatus("Staggered " + layersToStagger.length + " layers");
        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Add Anchor Point 3x3 function
    function moveAnchorPoint(horizontal, vertical) {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                updateStatus("No active composition found");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                updateStatus("Please select at least 1 layer");
                return;
            }

            app.beginUndoGroup("Adjust Anchor Point");

            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                if (!layer.transform || !layer.transform.anchorPoint || !layer.sourceRectAtTime || layer.locked) {
                    continue;
                }

                var rect = layer.sourceRectAtTime(comp.time, false);
                var oldAnchor = layer.transform.anchorPoint.value;

                var newAnchorX = rect.left;
                if (horizontal === 1) newAnchorX = rect.left + rect.width / 2;
                else if (horizontal === 2) newAnchorX = rect.left + rect.width;

                var newAnchorY = rect.top;
                if (vertical === 1) newAnchorY = rect.top + rect.height / 2;
                else if (vertical === 2) newAnchorY = rect.top + rect.height;

                var newAnchorZ = (oldAnchor.length > 2) ? oldAnchor[2] : 0;
                var newAnchor = [newAnchorX, newAnchorY, newAnchorZ];

                var newPos = layer.transform.position.value;
                var compensationSuccess = false;

                try {
                    var vec = [newAnchorX, newAnchorY, newAnchorZ];
                    var worldPos = layer.toComp(vec);
                    if (layer.parent) {
                        newPos = layer.parent.fromComp(worldPos);
                    } else {
                        newPos = worldPos;
                    }
                    compensationSuccess = true;
                } catch (compErr) {
                }

                if (!compensationSuccess) {
                    try {
                        var scale = layer.transform.scale.value;
                        var sx = scale[0] / 100;
                        var sy = scale[1] / 100;

                        var dx = (newAnchor[0] - oldAnchor[0]) * sx;
                        var dy = (newAnchor[1] - oldAnchor[1]) * sy;

                        var oldPos = layer.transform.position.value;
                        if (oldPos.length === 2) {
                            newPos = [oldPos[0] + dx, oldPos[1] + dy];
                        } else {
                            newPos = [oldPos[0] + dx, oldPos[1] + dy, oldPos[2]];
                        }
                    } catch (mathErr) {
                    }
                }

                layer.transform.anchorPoint.setValue(newAnchor);
                layer.transform.position.setValue(newPos);
            }

            app.endUndoGroup();
            var posNames = ["Top-Left", "Top-Center", "Top-Right", "Center-Left", "Center", "Center-Right", "Bottom-Left", "Bottom-Center", "Bottom-Right"];
            updateStatus("Anchor set to " + posNames[vertical * 3 + horizontal]);
        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Function to apply Squash animation
    function applySquashAnimation() {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                updateStatus("No active composition found");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                updateStatus("Please select at least 1 layer");
                return;
            }

            app.beginUndoGroup("Squash Animation");

            var frameDur = comp.frameDuration;
            var currentTime = comp.time;
            var time1 = currentTime;
            var time2 = currentTime + (3 * frameDur);
            var time3 = currentTime + (7 * frameDur); // +4 frames from previous keyframe

            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];

                // 1. Move anchor point to bottom center (keeping visual position)
                if (layer.transform && layer.transform.anchorPoint && layer.sourceRectAtTime && !layer.locked) {
                    var rect = layer.sourceRectAtTime(comp.time, false);
                    var newAnchorX = rect.left + rect.width / 2;
                    var newAnchorY = rect.top + rect.height;
                    var oldAnchor = layer.transform.anchorPoint.value;

                    var newAnchorZ = (oldAnchor.length > 2) ? oldAnchor[2] : 0;
                    var newAnchor = [newAnchorX, newAnchorY, newAnchorZ];

                    var newPos = layer.transform.position.value;
                    var compensationSuccess = false;

                    try {
                        var vec = [newAnchorX, newAnchorY, newAnchorZ];
                        var worldPos = layer.toComp(vec);
                        if (layer.parent) {
                            newPos = layer.parent.fromComp(worldPos);
                        } else {
                            newPos = worldPos;
                        }
                        compensationSuccess = true;
                    } catch (compErr) {
                        // toComp failed, try manual math
                    }

                    if (!compensationSuccess) {
                        try {
                            var scale = layer.transform.scale.value;
                            var sx = scale[0] / 100;
                            var sy = scale[1] / 100;

                            var dx = (newAnchor[0] - oldAnchor[0]) * sx;
                            var dy = (newAnchor[1] - oldAnchor[1]) * sy;

                            var oldPos = layer.transform.position.value;
                            if (oldPos.length === 2) {
                                newPos = [oldPos[0] + dx, oldPos[1] + dy];
                            } else {
                                newPos = [oldPos[0] + dx, oldPos[1] + dy, oldPos[2]];
                            }
                            compensationSuccess = true;
                        } catch (mathErr) {
                            // Skip compensation
                        }
                    }

                    layer.transform.anchorPoint.setValue(newAnchor);
                    layer.transform.position.setValue(newPos);
                }

                // 2. Make new keyframes on Scale
                if (layer.transform && layer.transform.scale) {
                    var scaleProp = layer.transform.scale;

                    // Keep original Z if 3D
                    var currentScale = scaleProp.value;
                    var is3D = currentScale.length > 2;

                    var scale1 = is3D ? [100, 100, currentScale[2]] : [100, 100];
                    var scale2 = is3D ? [100, 94, currentScale[2]] : [100, 94];
                    var scale3 = is3D ? [100, 100, currentScale[2]] : [100, 100];

                    var k1 = scaleProp.addKey(time1);
                    scaleProp.setValueAtKey(k1, scale1);

                    var k2 = scaleProp.addKey(time2);
                    scaleProp.setValueAtKey(k2, scale2);

                    var k3 = scaleProp.addKey(time3);
                    scaleProp.setValueAtKey(k3, scale3);

                    // 3. Apply easing using cubic-bezier
                    var bezierData = [0.17, 0.89, 0.32, 1.27];
                    applyCubicBezierToKeyframes(scaleProp, k1, k2, bezierData);
                    applyCubicBezierToKeyframes(scaleProp, k2, k3, bezierData);
                }
            }

            app.endUndoGroup();
            updateStatus("Applied Squash to " + selectedLayers.length + " layer(s)");

        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Helper function to apply CSS cubic-bezier values to After Effects keyframes
    function applyCubicBezierToKeyframes(prop, keyIndex1, keyIndex2, cubicBezier) {
        if (!prop.isTimeVarying) return;
        try {
            var x1 = cubicBezier[0];
            var y1 = cubicBezier[1];
            var x2 = cubicBezier[2];
            var y2 = cubicBezier[3];

            var t1 = prop.keyTime(keyIndex1);
            var t2 = prop.keyTime(keyIndex2);
            var v1 = prop.keyValue(keyIndex1);
            var v2 = prop.keyValue(keyIndex2);
            var dx = t2 - t1;
            if (dx <= 0) return;

            // Ensure interpolation is bezier
            prop.setInterpolationTypeAtKey(keyIndex1, prop.keyInInterpolationType(keyIndex1), KeyframeInterpolationType.BEZIER);
            prop.setInterpolationTypeAtKey(keyIndex2, KeyframeInterpolationType.BEZIER, prop.keyOutInterpolationType(keyIndex2));

            var isMulti = (prop.propertyValueType == PropertyValueType.TwoD_SPATIAL ||
                prop.propertyValueType == PropertyValueType.ThreeD_SPATIAL ||
                prop.propertyValueType == PropertyValueType.TwoD ||
                prop.propertyValueType == PropertyValueType.ThreeD ||
                prop.propertyValueType == PropertyValueType.COLOR);

            var dimension = isMulti ? v1.length : 1;
            var outEase = [];
            var inEase = [];

            for (var i = 0; i < dimension; i++) {
                var startVal = isMulti ? v1[i] : v1;
                var endVal = isMulti ? v2[i] : v2;
                var dy = endVal - startVal;

                var sOut = (x1 === 0) ? 0 : (dy * (y1 / x1) / dx);
                var sIn = (x2 === 1) ? 0 : (dy * ((1 - y2) / (1 - x2)) / dx);

                var infOut = Math.min(Math.max(x1 * 100, 0.1), 100);
                var infIn = Math.min(Math.max((1 - x2) * 100, 0.1), 100);

                outEase.push(new KeyframeEase(sOut, infOut));
                inEase.push(new KeyframeEase(sIn, infIn));
            }

            prop.setTemporalEaseAtKey(keyIndex1, prop.keyInTemporalEase(keyIndex1), outEase);
            prop.setTemporalEaseAtKey(keyIndex2, inEase, prop.keyOutTemporalEase(keyIndex2));
        } catch (e) {
            // Fallback or ignore if properties conflict
        }
    }

    // Apply Mask Auto Fit
    function applyMaskAutoFit() {
        try {
            if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
                updateStatus("No active composition");
                return;
            }

            var comp = app.project.activeItem;
            var selectedLayers = comp.selectedLayers;

            if (selectedLayers.length === 0) {
                updateStatus("No layers selected");
                return;
            }

            var time = comp.time; // Current time for keyframing
            app.beginUndoGroup("Mask Auto Fit");
            var successCount = 0;

            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];

                // Mask must exist on layer
                var maskPropGroup = layer.property("ADBE Mask Parade");
                if (!maskPropGroup || maskPropGroup.numProperties === 0) continue;

                var targetMask = null;
                // First check if any mask is selected
                var props = layer.selectedProperties;
                for (var j = 0; j < props.length; j++) {
                    if (props[j].matchName === "ADBE Mask Atom") {
                        targetMask = props[j];
                        break;
                    }
                }

                // If not, use the first mask
                if (!targetMask) {
                    targetMask = maskPropGroup.property(1);
                }

                var maskShape = targetMask.property("ADBE Mask Shape");
                if (maskShape && maskShape.value) {
                    // Get mask value at the current time!
                    var shape = maskShape.valueAtTime(time, true);
                    var vertices = shape.vertices;

                    if (vertices && vertices.length > 0) {
                        var minX = vertices[0][0];
                        var maxX = vertices[0][0];
                        var minY = vertices[0][1];
                        var maxY = vertices[0][1];

                        for (var v = 1; v < vertices.length; v++) {
                            if (vertices[v][0] < minX) minX = vertices[v][0];
                            if (vertices[v][0] > maxX) maxX = vertices[v][0];
                            if (vertices[v][1] < minY) minY = vertices[v][1];
                            if (vertices[v][1] > maxY) maxY = vertices[v][1];
                        }

                        var maskW = Math.max(maxX - minX, 1);
                        var maskH = Math.max(maxY - minY, 1);
                        var cx = minX + maskW / 2;
                        var cy = minY + maskH / 2;

                        var transformGroup = layer.property("ADBE Transform Group");
                        var anchorProp = transformGroup.property("ADBE Anchor Point");
                        var posProp = transformGroup.property("ADBE Position");
                        var scaleProp = transformGroup.property("ADBE Scale");

                        if (maskW > 0 && maskH > 0 && anchorProp && posProp && scaleProp) {
                            // DO NOT change anchor point. Retrieve original anchor.
                            var a = anchorProp.valueAtTime(time, true);

                            // 1. Calculate Scale to fill the composition
                            var scaleX = comp.width / maskW;
                            var scaleY = comp.height / maskH;

                            // Maximize scale so the mask covers the whole canvas (Fill)
                            var scaleFactor = Math.max(scaleX, scaleY);
                            var newScale = scaleFactor * 100;

                            // 2. Calculate New Position to center the mask accurately
                            // Math: p_new = comp_center - (mask_center - anchor) * scaleFactor
                            var newX = (comp.width / 2) - (cx - a[0]) * scaleFactor;
                            var newY = (comp.height / 2) - (cy - a[1]) * scaleFactor;

                            var oldPos = posProp.valueAtTime(time, true);
                            var posValue = [newX, newY, oldPos.length > 2 ? oldPos[2] : 0];

                            var currentScale = scaleProp.valueAtTime(time, true);
                            var scaleValue = currentScale.length > 2 ? [newScale, newScale, currentScale[2]] : [newScale, newScale];

                            // Ensure properties can record keyframes
                            if (posProp.canVaryOverTime) {
                                posProp.setValueAtTime(time, posValue);
                            } else {
                                posProp.setValue(posValue);
                            }

                            if (scaleProp.canVaryOverTime) {
                                scaleProp.setValueAtTime(time, scaleValue);
                            } else {
                                scaleProp.setValue(scaleValue);
                            }

                            // Delete the mask as it's no longer needed
                            targetMask.remove();

                            successCount++;
                        }
                    }
                }
            }

            app.endUndoGroup();

            if (successCount > 0) {
                updateStatus("Mask Fit keyframed on " + successCount + " layer(s)");
            } else {
                updateStatus("No masks found for selected layer(s)");
            }

        } catch (error) {
            updateStatus("Error: " + error.toString());
        }
    }

    // Execute the panel
    var panel = createPanel(thisObj);
    if (panel != null && panel instanceof Window) {
        panel.center();
        panel.show();
    }
})(this);
