/*
 * Auto Anticipation & Overshoot
 * After Effects ScriptUI Panel (dockable)
 *
 * v3.6 — Universal Property & Separated Dimensions Support
 *         Auto-detects selected keyframes on any property:
 *         - Separated Position dimensions (X Position, Y Position, Z Position)
 *         - Puppet Pin Position keyframes
 *         - Path property keyframes (vertices & tangents extrapolated)
 *         - Transform & Effect properties (Position, Rotation, Scale, Opacity, Point Controls, Sliders)
 *
 * Animation Principles applied:
 *   Anticipation  : A1 keyframe — dips opposite to direction of motion
 *   Overshoot     : B1 keyframe — goes past target before settling
 *   Squash        : Scale at A1 & B1 — compresses in travel direction, expands perpendicular
 *   Stretch       : Scale at midpoint — elongates in travel direction, compresses perpendicular
 *
 * Timeline:  A ──► A1 ─────────────────► MID ──► B1 ──► B
 *   Motion:  start  anticipation(dip)    stretch  squash  settle
 *   Scale:   100%   squash               stretch  squash  100%
 *
 * Author: azaynzxz
 * Version: 3.6
 */

(function (thisObj) {

    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & DEFAULTS
    // ─────────────────────────────────────────────────────────────────────────
    var SCRIPT_NAME    = "Auto Anticipation & Overshoot";
    var MIN_GAP_FRAMES = 4; // Minimum frame gap (needs room for A1, mid, B1)

    var DEFAULTS = {
        anticipationTiming   : 30,  // % of gap from A where A1 lands
        anticipationStrength : 40,  // % of delta that A1 dips (opposite direction)
        overshootTiming      : 30,  // % of gap before B where B1 lands
        overshootStrength    : 25,  // % of delta that B1 overshoots
        squashStrength       : 20,  // % for squash/stretch on Scale (e.g. 20 → stretch to 120%)
    };

    // Named presets — add more objects here to get more preset buttons
    var PRESETS = [
        {
            label            : "Subtle (azaynzxz)",
            anticipationTiming   : 30,
            anticipationStrength : 11,
            overshootTiming      : 30,
            overshootStrength    : 12,
        },
    ];

    // ─────────────────────────────────────────────────────────────────────────
    //  MATH HELPERS — SHARED
    // ─────────────────────────────────────────────────────────────────────────

    function snapToFrame(time, fps) {
        return Math.round(time * fps) / fps;
    }

    /**
     * Compute timing for A1, mid, and B1 given a pair's time bounds.
     * Returns null if the gap is too small.
     */
    function computeTiming(timeA, timeB, fps, settings) {
        var gapSec    = timeB - timeA;
        var gapFrames = Math.round(gapSec * fps);

        if (gapFrames < MIN_GAP_FRAMES) return null;

        var a1Time  = snapToFrame(timeA + gapSec * (settings.antTiming / 100), fps);
        var b1Time  = snapToFrame(timeB - gapSec * (settings.ovTiming / 100), fps);
        var midTime = snapToFrame(timeA + gapSec * 0.5, fps);

        // Guard: don't collide with A or B
        if (Math.abs(a1Time - timeA) < 1 / fps) a1Time = snapToFrame(timeA + 1 / fps, fps);
        if (Math.abs(b1Time - timeB) < 1 / fps) b1Time = snapToFrame(timeB - 1 / fps, fps);

        if (a1Time >= b1Time) return null;

        return { a1Time: a1Time, midTime: midTime, b1Time: b1Time };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROPERTY VALUE HELPERS & CALCULATORS (1D, 2D, 3D, COLOR, SHAPE / PATH)
    // ─────────────────────────────────────────────────────────────────────────

    function getPropertyDisplayName(prop) {
        if (!prop) return "Property";
        var name = prop.name;
        var parent = prop.parentProperty;
        if (parent && parent.name && parent.name !== "Properties" && parent.name !== "Root") {
            if (name === "Position" || name === "Path" || name === "Rotation" || name === "Scale" || name === "Opacity" || name.indexOf("Position") !== -1) {
                return parent.name + " " + name;
            }
        }
        return name;
    }

    function getPropertyLayer(prop) {
        var current = prop;
        while (current && !(current instanceof Layer)) {
            current = current.parentProperty;
        }
        return current;
    }

    /**
     * Cross-reference separated position dimensions (X Position & Y Position)
     * to compute true 2D motion vector (dx, dy) for Squash & Stretch.
     */
    function getSiblingDimensionDeltas(layer, prop, timeA, timeB, defaultDx, defaultDy) {
        if (!layer || !prop) return { dx: defaultDx, dy: defaultDy };
        var pName  = prop.name || "";
        var pMatch = prop.matchName || "";

        var isX = (pName.indexOf("X Position") !== -1 || pName === "X" || pMatch === "ADBE Position 0");
        var isY = (pName.indexOf("Y Position") !== -1 || pName === "Y" || pMatch === "ADBE Position 1");

        if (!isX && !isY) return { dx: defaultDx, dy: defaultDy };

        try {
            var transform = layer.property("Transform");
            if (!transform) return { dx: defaultDx, dy: defaultDy };

            var xProp = transform.property("X Position") || transform.property("ADBE Position 0");
            var yProp = transform.property("Y Position") || transform.property("ADBE Position 1");

            var dx = defaultDx;
            var dy = defaultDy;

            if (isX && yProp) {
                dy = yProp.valueAtTime(timeB, false) - yProp.valueAtTime(timeA, false);
            } else if (isY && xProp) {
                dx = xProp.valueAtTime(timeB, false) - xProp.valueAtTime(timeA, false);
            }

            return { dx: dx, dy: dy };
        } catch (e) {
            return { dx: defaultDx, dy: defaultDy };
        }
    }

    /**
     * Universal calculator for anticipation (A1) and overshoot (B1)
     * Handles:
     *   - Separated Dimensions (X Position, Y Position, Z Position)
     *   - Shape (Path) properties (Mask Path, Shape Path)
     *   - Array properties (2D/3D Position, Puppet Pin Position, Scale, Color, Point Control)
     *   - Scalar properties (Rotation, Opacity, Slider, Angle)
     */
    function calculateHelpers(prop, timeA, valueA, timeB, valueB, fps, settings) {
        var timing = computeTiming(timeA, timeB, fps, settings);
        if (!timing) return null;

        var antS = settings.antStrength / 100;
        var ovS  = settings.ovStrength / 100;

        var a1Val, b1Val;
        var dx = 0, dy = 1; // Default spatial delta for Squash & Stretch fallback

        // ── SHAPE / PATH PROPERTY ──────────────────────────────────────────
        if (valueA instanceof Shape || (valueA && typeof valueA === "object" && valueA.vertices !== undefined)) {
            if (!valueB || !valueB.vertices || valueA.vertices.length !== valueB.vertices.length) {
                return null; // Vertex counts must match across keyframes
            }

            var numVerts = valueA.vertices.length;
            var a1Verts = [], b1Verts = [];
            var a1InTan = [], b1InTan = [];
            var a1OutTan = [], b1OutTan = [];
            var sumDx = 0, sumDy = 0;

            for (var v = 0; v < numVerts; v++) {
                // Vertices
                var vA = valueA.vertices[v];
                var vB = valueB.vertices[v];
                var dvX = vB[0] - vA[0];
                var dvY = vB[1] - vA[1];
                sumDx += dvX;
                sumDy += dvY;

                a1Verts.push([ vA[0] - dvX * antS, vA[1] - dvY * antS ]);
                b1Verts.push([ vB[0] + dvX * ovS,  vB[1] + dvY * ovS  ]);

                // InTangents
                var inA = (valueA.inTangents && valueA.inTangents[v]) ? valueA.inTangents[v] : [0, 0];
                var inB = (valueB.inTangents && valueB.inTangents[v]) ? valueB.inTangents[v] : [0, 0];
                var dInX = inB[0] - inA[0];
                var dInY = inB[1] - inA[1];
                a1InTan.push([ inA[0] - dInX * antS, inA[1] - dInY * antS ]);
                b1InTan.push([ inB[0] + dInX * ovS,  inB[1] + dInY * ovS  ]);

                // OutTangents
                var outA = (valueA.outTangents && valueA.outTangents[v]) ? valueA.outTangents[v] : [0, 0];
                var outB = (valueB.outTangents && valueB.outTangents[v]) ? valueB.outTangents[v] : [0, 0];
                var dOutX = outB[0] - outA[0];
                var dOutY = outB[1] - outA[1];
                a1OutTan.push([ outA[0] - dOutX * antS, outA[1] - dOutY * antS ]);
                b1OutTan.push([ outB[0] + dOutX * ovS,  outB[1] + dOutY * ovS  ]);
            }

            var shapeA1 = new Shape();
            shapeA1.closed = (valueA.closed !== undefined) ? valueA.closed : true;
            shapeA1.vertices = a1Verts;
            shapeA1.inTangents = a1InTan;
            shapeA1.outTangents = a1OutTan;

            var shapeB1 = new Shape();
            shapeB1.closed = (valueB.closed !== undefined) ? valueB.closed : true;
            shapeB1.vertices = b1Verts;
            shapeB1.inTangents = b1InTan;
            shapeB1.outTangents = b1OutTan;

            a1Val = shapeA1;
            b1Val = shapeB1;

            if (numVerts > 0) {
                dx = sumDx / numVerts;
                dy = sumDy / numVerts;
            }
        }
        // ── ARRAY PROPERTY (2D, 3D, COLOR, PUPPET PIN POSITION, etc.) ──────
        else if (valueA instanceof Array || (valueA && typeof valueA === "object" && typeof valueA.length === "number")) {
            var len = valueA.length;
            a1Val = [];
            b1Val = [];
            for (var c = 0; c < len; c++) {
                var delta = valueB[c] - valueA[c];
                a1Val.push(valueA[c] - delta * antS);
                b1Val.push(valueB[c] + delta * ovS);
            }
            dx = valueB[0] - valueA[0];
            dy = (len >= 2) ? (valueB[1] - valueA[1]) : 1;
        }
        // ── SCALAR PROPERTY (1D: X Position, Y Position, Rotation, Opacity, Slider, Angle) ──
        else if (typeof valueA === "number") {
            var deltaScalar = valueB - valueA;
            a1Val = valueA - deltaScalar * antS;
            b1Val = valueB + deltaScalar * ovS;

            var pName  = (prop && prop.name) ? prop.name : "";
            var pMatch = (prop && prop.matchName) ? prop.matchName : "";

            if (pName.indexOf("X Position") !== -1 || pName === "X" || pMatch === "ADBE Position 0") {
                dx = deltaScalar;
                dy = 0;
            } else if (pName.indexOf("Y Position") !== -1 || pName === "Y" || pMatch === "ADBE Position 1") {
                dx = 0;
                dy = deltaScalar;
            } else {
                dx = 0;
                dy = 1;
            }
        }
        else {
            return null;
        }

        return {
            a1Time  : timing.a1Time,
            a1Value : a1Val,
            midTime : timing.midTime,
            b1Time  : timing.b1Time,
            b1Value : b1Val,
            dx      : dx,
            dy      : dy
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  MATH HELPERS — SQUASH & STRETCH (Scale, direction-aware)
    // ─────────────────────────────────────────────────────────────────────────

    function calculateSquashStretch(dx, dy, strength) {
        var dist = Math.sqrt(dx * dx + dy * dy);

        var cosA = (dist > 0) ? Math.abs(dx) / dist : 0;
        var sinA = (dist > 0) ? Math.abs(dy) / dist : 1;

        var stretchF = 1 + (strength / 100);          // e.g. 1.20
        var squashF  = 10000 / (stretchF * 100);       // e.g. 83.33  (volume-preserving %)

        var stretchX = stretchF * cosA + squashF / 100 * sinA;
        var stretchY = squashF  / 100 * cosA + stretchF * sinA;

        var squashX = squashF / 100 * cosA + stretchF * sinA;
        var squashY = stretchF * cosA       + squashF  / 100 * sinA;

        return {
            stretch : [stretchX * 100, stretchY * 100],
            squash  : [squashX  * 100, squashY  * 100],
        };
    }

    function getScaleProp(layer) {
        try { return layer.property("Transform").property("Scale"); } catch (e) { return null; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SQUASH & STRETCH — apply to Scale property
    // ─────────────────────────────────────────────────────────────────────────

    function applySquashStretch(scaleProp, timeA, timeB, a1Time, midTime, b1Time, dx, dy, strength) {
        if (!scaleProp) return;

        var baseA, baseB;
        if (scaleProp.numKeys > 0) {
            baseA = scaleProp.valueAtTime(timeA, false);
            baseB = scaleProp.valueAtTime(timeB, false);
        } else {
            baseA = scaleProp.value;
            baseB = scaleProp.value;
        }

        var ss = calculateSquashStretch(dx, dy, strength);
        var stretchScale = [
            baseA[0] * ss.stretch[0] / 100,
            baseA[1] * ss.stretch[1] / 100
        ];
        var squashScale = [
            baseA[0] * ss.squash[0] / 100,
            baseA[1] * ss.squash[1] / 100
        ];

        scaleProp.setValueAtTime(timeA,   baseA);        // 1. start — hold base scale
        scaleProp.setValueAtTime(a1Time,  squashScale);  // 2. squash on windup
        scaleProp.setValueAtTime(midTime, stretchScale); // 3. stretch at peak speed
        scaleProp.setValueAtTime(b1Time,  squashScale);  // 4. squash on landing
        scaleProp.setValueAtTime(timeB,   baseB);        // 5. end — return to base scale
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CORE APPLY — UNIVERSAL PROPERTY ENGINE
    // ─────────────────────────────────────────────────────────────────────────

    function applyToPropertyPairs(layer, prop, pairs, fps, settings) {
        var result    = { applied: 0, skipped: 0, skipReasons: [] };
        var scaleProp = settings.squashOn ? getScaleProp(layer) : null;

        // Process in reverse time order so earlier indices stay valid
        var sorted = pairs.slice();
        sorted.sort(function (a, b) {
            var timeA_a = prop.keyTime(a[0]);
            var timeA_b = prop.keyTime(b[0]);
            return timeA_b - timeA_a;
        });

        for (var i = 0; i < sorted.length; i++) {
            var idxA = sorted[i][0];
            var idxB = sorted[i][1];

            if (idxA > prop.numKeys || idxB > prop.numKeys) continue;

            var timeA  = prop.keyTime(idxA);
            var valueA = prop.keyValue(idxA);
            var timeB  = prop.keyTime(idxB);
            var valueB = prop.keyValue(idxB);

            var h = calculateHelpers(prop, timeA, valueA, timeB, valueB, fps, settings);

            if (!h) {
                result.skipped++;
                result.skipReasons.push(
                    getPropertyDisplayName(prop) + " gap fr" + Math.round(timeA * fps + 1) + "→fr" + Math.round(timeB * fps + 1) +
                    " too small or incompatible value. Skipped."
                );
                continue;
            }

            // Insert B1 then A1 (later first keeps early timestamps stable)
            prop.setValueAtTime(h.b1Time, h.b1Value);
            prop.setValueAtTime(h.a1Time, h.a1Value);

            // Squash & Stretch (if enabled, and prop is not Scale itself)
            if (settings.squashOn && scaleProp && prop !== scaleProp) {
                var sibling = getSiblingDimensionDeltas(layer, prop, timeA, timeB, h.dx, h.dy);
                applySquashStretch(scaleProp, timeA, timeB, h.a1Time, h.midTime, h.b1Time, sibling.dx, sibling.dy, settings.squashStrength);
            }

            result.applied++;
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROPERTY SCANNER & SELECTION GATHERER
    // ─────────────────────────────────────────────────────────────────────────

    function getSelectedKeyIndices(prop) {
        var sel = [];
        if (prop.selectedKeys && prop.selectedKeys.length > 0) {
            for (var i = 0; i < prop.selectedKeys.length; i++) {
                sel.push(prop.selectedKeys[i]);
            }
        } else {
            for (var k = 1; k <= prop.numKeys; k++) {
                if (prop.keySelected(k)) sel.push(k);
            }
        }
        return sel;
    }

    function getPairsFromIndices(selected) {
        var pairs = [];
        for (var i = 0; i + 1 < selected.length; i += 2) {
            pairs.push([selected[i], selected[i + 1]]);
        }
        return pairs;
    }

    function getAllKeyPairs(prop) {
        var n = prop.numKeys;
        var pairs = [];
        for (var k = 1; k < n; k++) {
            pairs.push([k, k + 1]);
        }
        return pairs;
    }

    function detectPropertiesToProcess(comp, layers, selectionMode) {
        var list = [];

        function getPropPath(p) {
            var path = p.name;
            var cur = p.parentProperty;
            while (cur) {
                path = cur.name + "->" + path;
                cur = cur.parentProperty;
            }
            return path;
        }

        function addProp(layer, prop, pairs) {
            if (!prop || pairs.length === 0) return;
            var path = getPropPath(prop);
            for (var i = 0; i < list.length; i++) {
                if (list[i].layer.index === layer.index && list[i].path === path) return;
            }
            list.push({ layer: layer, prop: prop, pairs: pairs, path: path });
        }

        if (selectionMode === "selected") {
            // 1. Check comp.selectedProperties
            var selProps = comp.selectedProperties;
            if (selProps && selProps.length > 0) {
                for (var i = 0; i < selProps.length; i++) {
                    var p = selProps[i];
                    if (p && p.propertyType === PropertyType.PROPERTY && p.canVaryOverTime && p.numKeys >= 2) {
                        var selKeys = getSelectedKeyIndices(p);
                        if (selKeys.length >= 2) {
                            var pairs = getPairsFromIndices(selKeys);
                            var l = getPropertyLayer(p) || layers[0];
                            if (l && pairs.length > 0) addProp(l, p, pairs);
                        }
                    }
                }
            }

            // Only fall back to layer scan if comp.selectedProperties found nothing
            if (list.length === 0) {
                for (var L = 0; L < layers.length; L++) {
                    scanLayerSelected(layers[L]);
                }
            }
        } else { // selectionMode === "all"
            for (var L = 0; L < layers.length; L++) {
                scanLayerAll(layers[L]);
            }
        }

        function scanLayerSelected(propGroup) {
            if (!propGroup) return;
            for (var i = 1; i <= propGroup.numProperties; i++) {
                var p = propGroup.property(i);
                if (!p) continue;
                if (p.propertyType === PropertyType.PROPERTY) {
                    if (p.canVaryOverTime && p.numKeys >= 2) {
                        var selKeys = getSelectedKeyIndices(p);
                        if (selKeys.length >= 2) {
                            var pairs = getPairsFromIndices(selKeys);
                            var l = getPropertyLayer(p) || propGroup;
                            if (l && pairs.length > 0) addProp(l, p, pairs);
                        }
                    }
                } else if (p.propertyType === PropertyType.INDEXED_GROUP || p.propertyType === PropertyType.NAMED_GROUP) {
                    scanLayerSelected(p);
                }
            }
        }

        function scanLayerAll(propGroup) {
            if (!propGroup) return;
            for (var i = 1; i <= propGroup.numProperties; i++) {
                var p = propGroup.property(i);
                if (!p) continue;
                if (p.propertyType === PropertyType.PROPERTY) {
                    if (p.canVaryOverTime && p.numKeys >= 2) {
                        var pairs = getAllKeyPairs(p);
                        var l = getPropertyLayer(p) || propGroup;
                        if (l && pairs.length > 0) addProp(l, p, pairs);
                    }
                } else if (p.propertyType === PropertyType.INDEXED_GROUP || p.propertyType === PropertyType.NAMED_GROUP) {
                    scanLayerAll(p);
                }
            }
        }

        return list;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    //  MAIN ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────────────

    function getCompAndLayers() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please open a composition first.");
            return null;
        }
        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) {
            alert("Please select at least one layer.");
            return null;
        }
        return { comp: comp, layers: layers };
    }

    /**
     * @param {String} selectionMode  "selected" | "all"
     * @param {Object} settings        Timing + strength values from UI
     */
    function runApply(selectionMode, settings, onStatus) {
        var ctx = getCompAndLayers();
        if (!ctx) return;

        var comp   = ctx.comp;
        var layers = ctx.layers;
        var fps    = comp.frameRate;

        var targets = detectPropertiesToProcess(comp, layers, selectionMode);

        if (targets.length === 0) {
            if (selectionMode === "selected") {
                alert(
                    "No selected keyframes detected.\n\n" +
                    "Please select at least 2 keyframes on any property\n" +
                    "(X/Y Position, Rotation, Puppet Pin, Path, Slider, etc.)\n" +
                    "in the timeline before clicking Apply."
                );
            } else {
                alert(
                    "No keyframes found on selected layer(s).\n\n" +
                    "Add at least 2 keyframes to a property first."
                );
            }
            return;
        }

        app.beginUndoGroup(SCRIPT_NAME);

        var totalApplied = 0;
        var totalSkipped = 0;
        var summaries    = [];

        try {
            for (var t = 0; t < targets.length; t++) {
                var target = targets[t];
                var res = applyToPropertyPairs(target.layer, target.prop, target.pairs, fps, settings);
                totalApplied += res.applied;
                totalSkipped += res.skipped;
                var dispName = getPropertyDisplayName(target.prop);
                summaries.push(dispName + ": " + res.applied + "\u2713");
            }
        } catch (e) {
            app.endUndoGroup();
            alert("Error: " + e.toString() + "\nLine: " + e.line);
            return;
        }

        app.endUndoGroup();

        var statusMsg = summaries.join(" | ");
        if (totalSkipped > 0) statusMsg += " (" + totalSkipped + " skipped)";
        if (!statusMsg) statusMsg = "\u2014 Nothing applied";

        if (onStatus) onStatus(statusMsg);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UI BUILDER
    // ─────────────────────────────────────────────────────────────────────────

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });

        win.orientation   = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing       = 5;
        win.margins       = 8;

        // ── HEADER ──────────────────────────────────────────────────────────
        var header = win.add("statictext", undefined, "🎬  " + SCRIPT_NAME);
        header.alignment = ["center", "top"];

        // ── HINT ────────────────────────────────────────────────────────────
        var hintGroup = win.add("group");
        hintGroup.orientation = "row";
        hintGroup.alignChildren = ["fill", "center"];
        hintGroup.margins = [2, 0, 2, 0];
        var hintText = hintGroup.add("statictext", undefined,
            "Auto-detects selected keyframes on any property: X/Y Position, Rotation, Puppet Pin, Path, Scale, etc.",
            { multiline: true });
        hintText.alignment = ["fill", "top"];

        // ── ANTICIPATION ─────────────────────────────────────────────────────
        var panelAnt = win.add("panel", undefined, "Anticipation  (A → A1)");
        panelAnt.orientation   = "column";
        panelAnt.alignChildren = ["fill", "top"];
        panelAnt.spacing       = 4;
        panelAnt.margins       = [8, 12, 8, 8];

        var rowAntT = panelAnt.add("group");
        rowAntT.orientation = "row"; rowAntT.alignChildren = ["left", "center"]; rowAntT.spacing = 5;
        var lblAntT = rowAntT.add("statictext", undefined, "Timing:");
        lblAntT.preferredSize.width = 55;
        var slAntT = rowAntT.add("slider", undefined, DEFAULTS.anticipationTiming, 5, 60);
        slAntT.preferredSize.width = 85;
        var txAntT = rowAntT.add("edittext", undefined, DEFAULTS.anticipationTiming.toString());
        txAntT.characters = 4;
        rowAntT.add("statictext", undefined, "% of gap");

        var rowAntS = panelAnt.add("group");
        rowAntS.orientation = "row"; rowAntS.alignChildren = ["left", "center"]; rowAntS.spacing = 5;
        var lblAntS = rowAntS.add("statictext", undefined, "Strength:");
        lblAntS.preferredSize.width = 55;
        var slAntS = rowAntS.add("slider", undefined, DEFAULTS.anticipationStrength, 0, 100);
        slAntS.preferredSize.width = 85;
        var txAntS = rowAntS.add("edittext", undefined, DEFAULTS.anticipationStrength.toString());
        txAntS.characters = 4;
        rowAntS.add("statictext", undefined, "% of delta");

        // ── OVERSHOOT ────────────────────────────────────────────────────────
        var panelOv = win.add("panel", undefined, "Overshoot  (B1 → B)");
        panelOv.orientation   = "column";
        panelOv.alignChildren = ["fill", "top"];
        panelOv.spacing       = 4;
        panelOv.margins       = [8, 12, 8, 8];

        var rowOvT = panelOv.add("group");
        rowOvT.orientation = "row"; rowOvT.alignChildren = ["left", "center"]; rowOvT.spacing = 5;
        var lblOvT = rowOvT.add("statictext", undefined, "Timing:");
        lblOvT.preferredSize.width = 55;
        var slOvT = rowOvT.add("slider", undefined, DEFAULTS.overshootTiming, 5, 60);
        slOvT.preferredSize.width = 85;
        var txOvT = rowOvT.add("edittext", undefined, DEFAULTS.overshootTiming.toString());
        txOvT.characters = 4;
        rowOvT.add("statictext", undefined, "% of gap");

        var rowOvS = panelOv.add("group");
        rowOvS.orientation = "row"; rowOvS.alignChildren = ["left", "center"]; rowOvS.spacing = 5;
        var lblOvS = rowOvS.add("statictext", undefined, "Strength:");
        lblOvS.preferredSize.width = 55;
        var slOvS = rowOvS.add("slider", undefined, DEFAULTS.overshootStrength, 0, 100);
        slOvS.preferredSize.width = 85;
        var txOvS = rowOvS.add("edittext", undefined, DEFAULTS.overshootStrength.toString());
        txOvS.characters = 4;
        rowOvS.add("statictext", undefined, "% of delta");

        // ── SQUASH & STRETCH ─────────────────────────────────────────────────
        var panelSS = win.add("panel", undefined, "Squash & Stretch (requires Scale)");
        panelSS.orientation   = "column";
        panelSS.alignChildren = ["fill", "top"];
        panelSS.spacing       = 5;
        panelSS.margins       = [8, 12, 8, 8];

        var chkSS = panelSS.add("checkbox", undefined, "Enable Squash & Stretch");
        chkSS.value = false;

        var rowSSS = panelSS.add("group");
        rowSSS.orientation = "row"; rowSSS.alignChildren = ["left", "center"]; rowSSS.spacing = 5;
        rowSSS.enabled = false;
        var lblSSS = rowSSS.add("statictext", undefined, "Strength:");
        lblSSS.preferredSize.width = 55;
        var slSSS = rowSSS.add("slider", undefined, DEFAULTS.squashStrength, 0, 100);
        slSSS.preferredSize.width = 85;
        var txSSS = rowSSS.add("edittext", undefined, DEFAULTS.squashStrength.toString());
        txSSS.characters = 4;
        rowSSS.add("statictext", undefined, "% of stretch");

        var ssNote = panelSS.add("statictext", undefined, "Note: S&S driven by motion direction.", { multiline: true });
        ssNote.enabled = false;

        // ── PREVIEW PANEL ────────────────────────────────────────────────────
        var panelPreview = win.add("panel", undefined, "Preview");
        panelPreview.orientation = "column";
        panelPreview.alignChildren = ["fill", "top"];
        panelPreview.margins = 8;
        var previewText = panelPreview.add("statictext", undefined, "", { multiline: true });
        previewText.preferredSize.height = 120;

        // ── PRESETS ────────────────────────────────────────────────────
        var panelPresets = win.add("panel", undefined, "Presets");
        panelPresets.orientation   = "column";
        panelPresets.alignChildren = ["fill", "top"];
        panelPresets.spacing       = 3;
        panelPresets.margins       = [8, 12, 8, 8];

        function loadPreset(p) {
            slAntT.value = p.anticipationTiming;   txAntT.text = p.anticipationTiming.toString();
            slAntS.value = p.anticipationStrength; txAntS.text = p.anticipationStrength.toString();
            slOvT.value  = p.overshootTiming;      txOvT.text  = p.overshootTiming.toString();
            slOvS.value  = p.overshootStrength;    txOvS.text  = p.overshootStrength.toString();
            updatePreview();
        }

        for (var pi = 0; pi < PRESETS.length; pi++) {
            (function (preset) {
                var btn = panelPresets.add("button", undefined, preset.label);
                btn.onClick = function () { loadPreset(preset); };
            })(PRESETS[pi]);
        }

        // ── BUTTONS ──────────────────────────────────────────────────────────
        var grpBtns = win.add("group");
        grpBtns.orientation = "column";
        var btnSel = grpBtns.add("button", undefined, "Apply to Selected");
        var btnAll = grpBtns.add("button", undefined, "Apply to All Pairs in Layer");

        var btnReset = grpBtns.add("button", undefined, "Reset Defaults");
        btnReset.preferredSize.height = 20;

        // ── SLIDER ↔ TEXT SYNC ───────────────────────────────────────────────
        function syncSlider(slider, txt, onChange) {
            slider.onChanging = function () {
                txt.text = Math.round(slider.value).toString();
                if (onChange) onChange();
            };
            txt.onChange = function () {
                var v = parseFloat(txt.text);
                if (isNaN(v)) return;
                v = Math.max(slider.minvalue, Math.min(slider.maxvalue, v));
                slider.value = v;
                txt.text = Math.round(v).toString();
                if (onChange) onChange();
            };
        }

        syncSlider(slAntT, txAntT, updatePreview);
        syncSlider(slAntS, txAntS, updatePreview);
        syncSlider(slOvT,  txOvT,  updatePreview);
        syncSlider(slOvS,  txOvS,  updatePreview);
        syncSlider(slSSS,  txSSS,  updatePreview);

        chkSS.onClick = function () {
            rowSSS.enabled = chkSS.value;
            ssNote.enabled = chkSS.value;
            updatePreview();
        };

        // ── PREVIEW UPDATER ──────────────────────────────────────────────────
        function updatePreview() {
            var settings = readSettings();
            var fps      = 25;
            var lines    = [];

            lines.push("[1D Scalar (Rotation/Opacity/X Position)]");
            var hR = calculateHelpers(null, 0, 0, 9/fps, 12, fps, settings);
            if (hR) {
                lines.push("A1: fr" + (Math.round(hR.a1Time*fps)+1) + " → " + hR.a1Value.toFixed(1));
                lines.push("B1: fr" + (Math.round(hR.b1Time*fps)+1) + " → " + hR.b1Value.toFixed(1));
            } else lines.push("(Gap too small)");

            lines.push("\n[2D Vector (Position/Puppet Pin)]");
            var hP = calculateHelpers(null, 0, [100,300], 9/fps, [500,300], fps, settings);
            if (hP) {
                lines.push("A1: fr" + (Math.round(hP.a1Time*fps)+1) + " → [" + hP.a1Value[0].toFixed(0) + "," + hP.a1Value[1].toFixed(0) + "]");
                lines.push("B1: fr" + (Math.round(hP.b1Time*fps)+1) + " → [" + hP.b1Value[0].toFixed(0) + "," + hP.b1Value[1].toFixed(0) + "]");
                if (settings.squashOn) {
                    var ss = calculateSquashStretch(hP.dx, hP.dy, settings.squashStrength);
                    lines.push("S&S: sq=" + (ss.squash[0]/100).toFixed(2) + " st=" + (ss.stretch[0]/100).toFixed(2));
                }
            } else lines.push("(Gap too small)");

            previewText.text = lines.join("\n");
        }

        // ── READ SETTINGS ────────────────────────────────────────────────────
        function readSettings() {
            return {
                antTiming      : parseFloat(txAntT.text) || DEFAULTS.anticipationTiming,
                antStrength    : parseFloat(txAntS.text) || DEFAULTS.anticipationStrength,
                ovTiming       : parseFloat(txOvT.text)  || DEFAULTS.overshootTiming,
                ovStrength     : parseFloat(txOvS.text)  || DEFAULTS.overshootStrength,
                squashOn       : chkSS.value,
                squashStrength : parseFloat(txSSS.text)  || DEFAULTS.squashStrength,
            };
        }

        // ── BUTTON CALLBACKS ────────────────────────────────────────────────────
        btnSel.onClick = function () {
            runApply("selected", readSettings(), function (msg) {
                panelPreview.text = "Preview  — " + msg;
            });
        };

        btnAll.onClick = function () {
            runApply("all", readSettings(), function (msg) {
                panelPreview.text = "Preview  — " + msg;
            });
        };

        btnReset.onClick = function () {
            loadPreset(DEFAULTS);
            slSSS.value  = DEFAULTS.squashStrength; txSSS.text = DEFAULTS.squashStrength.toString();
            chkSS.value  = false;
            rowSSS.enabled = false;
            ssNote.enabled = false;
            updatePreview();
        };

        // ── INITIAL PREVIEW ──────────────────────────────────────────────────
        updatePreview();

        // ── SHOW/LAYOUT ──────────────────────────────────────────────────────
        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
            win.layout.resize();
        }

        return win;
    }

    buildUI(thisObj);

})(this);
