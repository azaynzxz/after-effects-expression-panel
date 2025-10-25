(function (thisObj) {
    function createUI(thisObj) {
        var panel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Comp Duration", undefined, { resizeable: true });

        // Display current active composition name
        var compNameGroup = panel.add("group", undefined, "CompNameGroup");
        compNameGroup.orientation = "column";
        compNameGroup.alignment = ["left", "top"];
        var compLabelText = compNameGroup.add("statictext", undefined, "Active Comp:");
        compLabelText.alignment = ["left", "top"];
        var compNameText = compNameGroup.add("statictext", undefined, "= 'N/A'");
        compNameText.alignment = ["left", "top"];
        compNameText.preferredSize.width = 300; // Ensuring enough width for full comp name

        // Divider line after comp name
        var divider1 = panel.add("panel", undefined, undefined, { borderStyle: "sunken" });
        divider1.alignment = "fill";

        // Info box for displaying frame duration and timecode duration
        var infoGroup = panel.add("group", undefined, "Info");
        infoGroup.orientation = "column";
        infoGroup.alignment = ["left", "top"];
        var currentFrameText = infoGroup.add("statictext", undefined, "Frame Duration: ");
        currentFrameText.alignment = ["left", "top"];
        var currentTimeText = infoGroup.add("statictext", undefined, "Timecode Duration: ");
        currentTimeText.alignment = ["left", "top"];

        // Ensuring enough width for time display
        currentTimeText.preferredSize = [200, 20];

        // Divider line
        var divider2 = panel.add("panel", undefined, undefined, { borderStyle: "sunken" });
        divider2.alignment = "fill";

        // Group for Set Frame Length and input box
        var setFrameGroup = panel.add("group", undefined, "SetFrameGroup");
        setFrameGroup.orientation = "row";
        setFrameGroup.alignment = ["left", "top"];
        var setFrameLabel = setFrameGroup.add("statictext", undefined, "Set Frame Length:");
        var frameInput = setFrameGroup.add("edittext", undefined, "0");
        frameInput.characters = 10;
        frameInput.alignment = ["left", "top"];

        // Group for Set Time Length and input box
        var setTimeGroup = panel.add("group", undefined, "SetTimeGroup");
        setTimeGroup.orientation = "row";
        setTimeGroup.alignment = ["left", "top"];
        var setTimeLabel = setTimeGroup.add("statictext", undefined, "Set Time Length:");
        var timeInput = setTimeGroup.add("edittext", undefined, "0:00:00:00");
        timeInput.characters = 10;
        timeInput.alignment = ["left", "top"];

        // Group for Apply and Refresh buttons
        var buttonGroup = panel.add("group", undefined, "ButtonGroup");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = ["left", "top"];
        var applyButton = buttonGroup.add("button", undefined, "Apply");
        var refreshButton = buttonGroup.add("button", undefined, "Refresh");

        // Second divider line
        var divider3 = panel.add("panel", undefined, undefined, { borderStyle: "sunken" });
        divider3.alignment = "fill";

        // Buttons to adjust composition duration by 1 second (order swapped)
        var adjustGroup = panel.add("group", undefined, "AdjustGroup");
        adjustGroup.orientation = "row";
        adjustGroup.alignment = ["left", "top"];
        var addButton = adjustGroup.add("button", undefined, "+ 1 second");
        var reduceButton = adjustGroup.add("button", undefined, "- 1 second");

        // Function to update composition duration based on frame number
        function updateFrameRangeFromFrame() {
            var comp = app.project.activeItem;
            if (comp && (comp instanceof CompItem)) {
                var frameNumber = parseInt(frameInput.text, 10);
                if (!isNaN(frameNumber) && frameNumber >= 0) {
                    var newDuration = frameNumber / comp.frameRate;
                    comp.duration = newDuration;
                    timeInput.text = formatTime(newDuration, comp.frameRate);
                    updateInfoBox(); // Update info box with new values
                } else {
                    alert("Please enter a valid frame number.");
                }
            } else {
                alert("Please select a composition.");
            }
        }

        // Function to update composition duration based on timecode
        function updateFrameRangeFromTime() {
            var comp = app.project.activeItem;
            if (comp && (comp instanceof CompItem)) {
                var timeArray = timeInput.text.split(":");
                if (timeArray.length === 4) {
                    var hours = parseInt(timeArray[0], 10);
                    var minutes = parseInt(timeArray[1], 10);
                    var seconds = parseInt(timeArray[2], 10);
                    var frames = parseInt(timeArray[3], 10);
                    if (!isNaN(hours) && !isNaN(minutes) && !isNaN(seconds) && !isNaN(frames)) {
                        var newDuration = (hours * 3600 + minutes * 60 + seconds) + (frames / comp.frameRate);
                        comp.duration = newDuration;
                        frameInput.text = Math.round(newDuration * comp.frameRate).toString();
                        updateInfoBox(); // Update info box with new values
                    } else {
                        alert("Please enter a valid timecode.");
                    }
                } else {
                    alert("Please enter a valid timecode.");
                }
            } else {
                alert("Please select a composition.");
            }
        }

        // Function to format time to 0:00:00:00 format
        function formatTime(time, frameRate) {
            var totalSeconds = Math.floor(time);
            var hours = Math.floor(totalSeconds / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = totalSeconds % 60;
            var frames = Math.floor((time - totalSeconds) * frameRate);
            return hours + ":" + zeroPad(minutes) + ":" + zeroPad(seconds) + ":" + zeroPad(frames);
        }

        // Function to add leading zeros
        function zeroPad(number) {
            return number < 10 ? "0" + number : number;
        }

        // Function to update the info box with the current composition's frame duration and timecode duration
        function updateInfoBox() {
            var comp = app.project.activeItem;
            if (comp && (comp instanceof CompItem)) {
                var finalFrame = Math.round(comp.duration * comp.frameRate);
                var finalTime = formatTime(comp.duration, comp.frameRate);
                compNameText.text = "= '" + comp.name + "'";
                currentFrameText.text = "Frame Duration: " + finalFrame.toString();
                currentTimeText.text = "Timecode Duration: " + finalTime;
            } else {
                compNameText.text = "= 'N/A'";
                currentFrameText.text = "Frame Duration: N/A";
                currentTimeText.text = "Timecode Duration: N/A";
            }
        }

        // Pre-fill the inputs with the current final frame and timecode
        function prefillInputs() {
            var comp = app.project.activeItem;
            if (comp && (comp instanceof CompItem)) {
                var finalFrame = Math.round(comp.duration * comp.frameRate);
                frameInput.text = finalFrame.toString();
                timeInput.text = formatTime(comp.duration, comp.frameRate);
            }
        }

        // Function to reduce composition duration by 1 second
        function reduceDurationByOneSecond() {
            var comp = app.project.activeItem;
            if (comp && (comp instanceof CompItem)) {
                comp.duration = Math.max(0, comp.duration - 1);
                prefillInputs();
                updateInfoBox();
            }
        }

        // Function to increase composition duration by 1 second
        function increaseDurationByOneSecond() {
            var comp = app.project.activeItem;
            if (comp && (comp instanceof CompItem)) {
                comp.duration += 1;
                prefillInputs();
                updateInfoBox();
            }
        }

        // Add event listeners
        applyButton.onClick = function () {
            updateFrameRangeFromFrame();
        };
        frameInput.onChange = updateFrameRangeFromFrame;
        timeInput.onChange = updateFrameRangeFromTime;
        refreshButton.onClick = function () {
            prefillInputs();
            updateInfoBox();
        };
        reduceButton.onClick = function () {
            reduceDurationByOneSecond();
        };
        addButton.onClick = function () {
            increaseDurationByOneSecond();
        };

        // Initial setup
        prefillInputs();
        updateInfoBox();

        // Make the panel resizable
        panel.layout.layout(true);
        panel.layout.resize();
        panel.onResizing = panel.onResize = function () { this.layout.resize(); };

        return panel;
    }

    // Create the UI panel
    var frameRangePanel = createUI(thisObj);

    // Show the panel
    if (frameRangePanel instanceof Window) {
        frameRangePanel.center();
        frameRangePanel.show();
    }
})(this);
