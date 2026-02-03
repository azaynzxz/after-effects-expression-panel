/**
 * ExtractShapeColorsSimpleNoBraces.jsx
 * For each selected shape, creates a rectangle swatch with the same fill color
 * and adds a text label in the format:
 *
 * #HEX
 * R : xxx
 * G : xxx
 * B : xxx
 */

(function () {
    if (app.documents.length === 0) {
        alert("No document open.");
        return;
    }
    var doc = app.activeDocument;
    if (!app.selection || app.selection.length === 0) {
        alert("Please select at least one shape.");
        return;
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function rgbToHex(r, g, b) {
        function toHex(n) {
            n = clamp(Math.round(n), 0, 255);
            var s = n.toString(16).toUpperCase();
            return s.length === 1 ? "0" + s : s;
        }
        return "#" + toHex(r) + toHex(g) + toHex(b);
    }
    function cmykToRgb(c, m, y, k) {
        c = clamp(c, 0, 100) / 100;
        m = clamp(m, 0, 100) / 100;
        y = clamp(y, 0, 100) / 100;
        k = clamp(k, 0, 100) / 100;
        var r = 255 * (1 - c) * (1 - k);
        var g = 255 * (1 - m) * (1 - k);
        var b = 255 * (1 - y) * (1 - k);
        return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
    }

    function getRGB(color) {
        if (!color) return null;
        if (color.typename === "RGBColor") {
            return { r: color.red, g: color.green, b: color.blue };
        } else if (color.typename === "CMYKColor") {
            return cmykToRgb(color.cyan, color.magenta, color.yellow, color.black);
        } else if (color.typename === "GrayColor") {
            var v = Math.round(255 * (1 - (color.gray / 100)));
            return { r: v, g: v, b: v };
        } else if (color.typename === "SpotColor") {
            return getRGB(color.spot.color);
        }
        return null;
    }

    var startX = 100, startY = -100;
    var offsetY = -120;

    for (var i = 0; i < app.selection.length; i++) {
        var it = app.selection[i];
        if (!it.filled) continue;

        var rgb = getRGB(it.fillColor);
        if (!rgb) continue;

        var hex = rgbToHex(rgb.r, rgb.g, rgb.b);

        // Create swatch rectangle
        var rect = doc.pathItems.rectangle(startY + i * offsetY, startX, 80, 80);
        rect.fillColor = it.fillColor;
        rect.stroked = false;

        // Create text label
        var tf = doc.textFrames.add();
        tf.contents = hex + "\nR : " + rgb.r + "\nG : " + rgb.g + "\nB : " + rgb.b;
        tf.position = [startX + 100, startY + i * offsetY - 20];
    }

    alert("Swatches with simplified color info created.");
})();
