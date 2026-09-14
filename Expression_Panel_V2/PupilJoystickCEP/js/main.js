var csInterface = new CSInterface();

// Load the host script file
csInterface.evalScript('$.evalFile("' + csInterface.getSystemPath(SystemPath.EXTENSION) + '/jsx/host.jsx")');

document.addEventListener("DOMContentLoaded", function () {
    var pad = document.getElementById("pad");
    var knob = document.getElementById("knob");
    var valXText = document.getElementById("valX");
    var valYText = document.getElementById("valY");
    var propNameInput = document.getElementById("propName");
    var rangeInput = document.getElementById("joyRange");
    var chkMirrored = document.getElementById("chkMirrored");

    var isDragging = false;
    var currentX = 0;
    var currentY = 0;

    // Hardcoded dimensions to match CSS
    var joySize = 180;
    var knobSize = 20;

    function applyTargetValue(isFinal) {
        var propName = propNameInput.value.replace(/"/g, '\\"');
        var mirror = chkMirrored.checked;

        // Build the JS string to execute in ExtendScript
        // We pass the stringified parameters
        var script = 'applyJoystickValue("' + propName + '", ' + currentX + ', ' + currentY + ', ' + mirror + ', ' + isFinal + ')';
        csInterface.evalScript(script);
    }

    function updateKnobUI() {
        var rangeVal = parseFloat(rangeInput.value) || 100;
        var safeX = Math.max(-rangeVal, Math.min(rangeVal, currentX));
        var safeY = Math.max(-rangeVal, Math.min(rangeVal, currentY));

        var localX = (safeX / rangeVal) * (joySize / 2) + (joySize / 2);
        var localY = (safeY / rangeVal) * (joySize / 2) + (joySize / 2);

        // Center the knob (transform instead of left/top is smoother, but left/top works fine for this)
        knob.style.left = (localX - knobSize / 2) + 'px';
        knob.style.top = (localY - knobSize / 2) + 'px';

        valXText.textContent = currentX.toFixed(1);
        valYText.textContent = currentY.toFixed(1);
    }

    function processMouseCoords(clientX, clientY, isFinal) {
        var rangeVal = parseFloat(rangeInput.value) || 100;

        var rect = pad.getBoundingClientRect();
        var rawX = clientX - rect.left;
        var rawY = clientY - rect.top;

        if (rawX < 0) rawX = 0;
        if (rawX > joySize) rawX = joySize;
        if (rawY < 0) rawY = 0;
        if (rawY > joySize) rawY = joySize;

        var nextX = ((rawX - joySize / 2) / (joySize / 2)) * rangeVal;
        var nextY = ((rawY - joySize / 2) / (joySize / 2)) * rangeVal;

        currentX = Math.round(nextX * 10) / 10;
        currentY = Math.round(nextY * 10) / 10;

        updateKnobUI();
        applyTargetValue(isFinal);
    }

    var isDragging = false;
    var lastExecTime = 0;

    pad.addEventListener("mousedown", function (e) {
        isDragging = true;
        processMouseCoords(e.clientX, e.clientY, false);
    });

    window.addEventListener("mousemove", function (e) {
        if (!isDragging) return;

        var now = Date.now();
        if (now - lastExecTime > 33) { // limit to ~30 calls per second for smooth performance
            lastExecTime = now;
            processMouseCoords(e.clientX, e.clientY, false);
        } else {
            // Update UI knob only (no evalScript) to keep HTML perfectly smooth at high refresh rate
            var rangeVal = parseFloat(rangeInput.value) || 100;
            var rect = pad.getBoundingClientRect();
            var rawX = e.clientX - rect.left;
            var rawY = e.clientY - rect.top;
            if (rawX < 0) rawX = 0; if (rawX > joySize) rawX = joySize;
            if (rawY < 0) rawY = 0; if (rawY > joySize) rawY = joySize;
            var nextX = ((rawX - joySize / 2) / (joySize / 2)) * rangeVal;
            var nextY = ((rawY - joySize / 2) / (joySize / 2)) * rangeVal;
            currentX = Math.round(nextX * 10) / 10;
            currentY = Math.round(nextY * 10) / 10;
            updateKnobUI();
        }
    });

    window.addEventListener("mouseup", function (e) {
        if (isDragging) {
            isDragging = false;
            csInterface.evalScript('app.beginUndoGroup("HTML Joystick")');
            processMouseCoords(e.clientX, e.clientY, true);
            csInterface.evalScript('app.endUndoGroup()');
        }
    });

    // In CEP, dragging out of the panel entirely natively ends the mouse operation sometimes,
    // but window.mouseleave captures it perfectly.
    window.addEventListener("mouseleave", function (e) {
        if (isDragging) {
            isDragging = false;
            csInterface.evalScript('app.beginUndoGroup("HTML Joystick")');
            applyTargetValue(true);
            csInterface.evalScript('app.endUndoGroup()');
        }
    });

    document.getElementById("btnReset").addEventListener("click", function () {
        csInterface.evalScript('app.beginUndoGroup("HTML Joystick Reset")');
        currentX = 0;
        currentY = 0;
        updateKnobUI();
        applyTargetValue(true);
        csInterface.evalScript('app.endUndoGroup()');
    });

    rangeInput.addEventListener("input", updateKnobUI);
    chkMirrored.addEventListener("change", function () {
        csInterface.evalScript('app.beginUndoGroup("HTML Joystick Invert")');
        applyTargetValue(true);
        csInterface.evalScript('app.endUndoGroup()');
    });
});
