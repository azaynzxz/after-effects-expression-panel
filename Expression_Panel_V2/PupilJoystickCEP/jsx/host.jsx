// host.jsx - Loaded by the CEP HTML Extenstion
function applyJoystickValue(targetName, x, y, isMirrored, isFinal) {
    if (!app.project || !app.project.activeItem) return 'No comp';
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return 'Not a comp';
    var layers = comp.selectedLayers;
    if (layers.length === 0) return 'No layers selected';

    // Process string "true"/"false" from evalScript
    if (typeof isMirrored === "string") isMirrored = (isMirrored === "true");
    if (typeof isFinal === "string") isFinal = (isFinal === "true");

    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var targetProp = null;

        var essProps = layer.property("ADBE Master Properties");
        if (!essProps) essProps = layer.property("Essential Properties");
        if (essProps) {
            targetProp = essProps.property(targetName);
        }

        if (!targetProp) {
            var effects = layer.property("ADBE Effect Parade");
            if (!effects) effects = layer.property("Effects");
            if (effects) {
                var fx = effects.property(targetName);
                if (fx) targetProp = fx.property(1);
            }
        }

        if (targetProp && targetProp.canSetExpression) {
            var outX = x;
            var outY = y;
            if (isMirrored) {
                outX = -outX;
            }

            try {
                if (isFinal) {
                    targetProp.setValueAtTime(comp.time, [outX, outY]);
                } else {
                    targetProp.setValue([outX, outY]);
                }
            } catch (e) { }
        }
    }
}
