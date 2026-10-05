// PupilJoystick.jsx has been renamed to Joystick.jsx (Universal 2D Joystick Controller).
// This wrapper ensures backward compatibility with any shortcuts or bookmarks.
(function (thisObj) {
    var targetFile = new File(new File($.fileName).parent.fsName + "/Joystick.jsx");
    if (targetFile.exists) {
        $.evalFile(targetFile);
    }
})(this);
