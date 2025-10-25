{
    function changePrecompDurations() {
        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }

        var input = prompt("Enter new duration in seconds:", "10");
        if (!input || isNaN(input)) {
            alert("Invalid duration.");
            return;
        }

        var newDuration = parseFloat(input);
        if (newDuration <= 0) {
            alert("Duration must be greater than 0.");
            return;
        }

        app.beginUndoGroup("Change Precomp Durations");

        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var source = layer.source;

            if (source instanceof CompItem) {
                source.duration = newDuration;
                source.displayStartTime = 0; // Optional: reset start time
                $.writeln("Changed duration of: " + source.name + " to " + newDuration + "s");
            }
        }

        app.endUndoGroup();
        alert("Duration updated for all selected precomps.");
    }

    changePrecompDurations();
}
