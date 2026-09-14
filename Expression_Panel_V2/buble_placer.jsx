/**
 * bubble_placer.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Dockable ScriptUI panel for After Effects.
 * Reads bubble feedback data (Bryan Feedback — Leech Girl) and places a
 * "bubble-rig" precomp directly above the target layer in "main_comp" at
 * each specified timecode.
 *
 * How it works per entry:
 *   1. Parse HH:MM:SS:FF  →  seconds (using comp's frame rate)
 *   2. Find the layer in main_comp whose in-point is closest to / at the TC
 *   3. Add bubble-rig from project library
 *   4. Move it directly ABOVE that target layer (moveBefore)
 *   5. startTime = TC  (so rig's frame 0 aligns with the timecode)
 *   6. inPoint   = TC  (layer becomes visible at the timecode)
 *   7. Transform Scale  → 40%  (centered)
 *   8. Transform Position → comp center
 *   9. Essential Property "text" → keyframe with feedback note at TC
 *
 * Install: File > Scripts > Run Script File   (or place in ScriptUI Panels)
 * Requires: Comp named "main_comp" and Comp named "bubble-rig" in the project.
 * ─────────────────────────────────────────────────────────────────────────
 */

(function bubblePlacer(thisObj) {
    "use strict";

    // ===================================================================
    //  BUBBLE DATA  --  filtered & cleaned from CSV
    //  Source: Bryan Feedback - Leech Girl - Sheet1.csv
    //  Filter: Category (col D) contains "Bubble"
    //  Total : 106 entries
    // ===================================================================
    var BUBBLES = [
        { id: "#12", tc: "00:00:18:19", text: "Who's my little girl?" },
        { id: "#13", tc: "00:00:29:15", text: "Who wants to fly?" },
        { id: "#14", tc: "00:00:32:19", text: "Give it back." },
        { id: "#15", tc: "00:00:34:19", text: "She's picking on me." },
        { id: "#10", tc: "00:00:41:10", text: "I love you guys." },
        { id: "#16", tc: "00:00:44:12", text: "Hey You. How are you today?" },
        { id: "#17", tc: "00:00:49:15", text: "Why are your hands so dark, Dad?" },
        { id: "#21", tc: "00:00:55:21", text: "Oh, You...You You You" },
        { id: "#23", tc: "00:01:03:15", text: "Stop it, Dad. You sing horribly." },
        { id: "#25", tc: "00:01:19:28", text: "Uh-oh, what's going on?" },
        { id: "#27", tc: "00:01:23:28", text: "A roof fell in the mines." },
        { id: "#29", tc: "00:01:29:06", text: "Oh no, Father..." },
        { id: "#31", tc: "00:01:38:09", text: "Thank God." },
        { id: "#38", tc: "00:02:10:20", text: "What are we going to do?" },
        { id: "#45", tc: "00:02:35:09", text: "I have to get better fast." },
        { id: "#49", tc: "00:03:10:06", text: "How can I help? They all look so sad." },
        { id: "#50", tc: "00:03:21:03", text: "Oh, it's a letter from my aunt." },
        { id: "#53", tc: "00:03:41:27", text: "I need to go." },
        { id: "#54", tc: "00:03:47:00", text: "Mother, please let me go." },
        { id: "#56", tc: "00:03:49:06", text: "I want to help." },
        { id: "#57", tc: "00:04:01:03", text: "Good luck, sweetheart. We'll see you soon." },
        { id: "#60", tc: "00:04:16:15", text: "I think she should be okay." },
        { id: "#61", tc: "00:04:18:19", text: "Why is she looking at me like that?" },
        { id: "#64", tc: "00:04:50:00", text: "Don't worry, you'll get your own soon enough." },
        { id: "#68", tc: "00:04:54:06", text: "Your mom didn't tell you what I do, did she?" },
        { id: "#69", tc: "00:04:56:06", text: "I'm a leech gatherer." },
        { id: "#71", tc: "00:05:33:12", text: "Wait, Auntie, don't leave me!" },
        { id: "#72", tc: "00:05:35:27", text: "You can't move too much." },
        { id: "#73", tc: "00:05:38:24", text: "Stand still, or you'll scare them away." },
        { id: "#75", tc: "00:05:39:21", text: "That's the trick." },
        { id: "#76", tc: "00:05:49:21", text: "How long is this going to take?" },
        { id: "#78", tc: "00:05:50:21", text: "A lot of people don't like to do this." },
        { id: "#79", tc: "00:05:53:09", text: "But that's why it's such a good opportunity." },
        { id: "#85", tc: "00:06:29:21", text: "Thank you for the leeches. I'll be back next week." },
        { id: "#86", tc: "00:06:34:24", text: "Does it actually cure anything, Auntie?" },
        { id: "#88", tc: "00:06:42:03", text: "Cha-ching!" },
        { id: "#89", tc: "00:06:43:12", text: "It's honest work for people like us." },
        { id: "#90", tc: "00:06:49:24", text: "Ow!" },
        { id: "#91", tc: "00:06:52:00", text: "I think something got me." },
        { id: "#92", tc: "00:06:54:19", text: "[Bubble resize note -- see feedback #92]" },
        { id: "#95", tc: "00:07:10:28", text: "But don't let too many gather before you take them off." },
        { id: "#97", tc: "00:07:31:16", text: "Make sure you empty them into the jar when you have a fair few." },
        { id: "#98", tc: "00:07:46:15", text: "Great! I'm going to get some more." },
        { id: "#99", tc: "00:07:48:13", text: "Wait!" },
        { id: "#100", tc: "00:07:49:28", text: "Are you sure?" },
        { id: "#101", tc: "00:07:52:12", text: "Remember, you should not stay longer than you need." },
        { id: "#102", tc: "00:07:56:09", text: "I understand, Auntie, but I'm fine." },
        { id: "#103", tc: "00:08:00:07", text: "1...2...3..." },
        { id: "#104", tc: "00:08:06:15", text: "Wow, that's amazing, honey. Thank you so much." },
        { id: "#106", tc: "00:08:26:00", text: "Here is today's take." },
        { id: "#111", tc: "00:08:52:12", text: "I mean, what else can I do? I'm just a kid." },
        { id: "#114", tc: "00:09:36:01", text: "That's enough for today." },
        { id: "#115", tc: "00:09:57:27", text: "Not feeling so well today." },
        { id: "#116", tc: "00:10:01:28", text: "I don't care. I have to do this." },
        { id: "#121", tc: "00:10:21:12", text: "How have you been, honey?" },
        { id: "#122", tc: "00:10:23:07", text: "I'm okay." },
        { id: "#124", tc: "00:10:30:12", text: "Mom... Are you okay?" },
        { id: "#125", tc: "00:10:33:00", text: "Wha...?" },
        { id: "#126", tc: "00:10:34:15", text: "Oh! yeah...I'm okay..." },
        { id: "#127", tc: "00:10:39:04", text: "I need to help more." },
        { id: "#129", tc: "00:10:45:01", text: "You!! You're back." },
        { id: "#130", tc: "00:10:52:06", text: "You!" },
        { id: "#131", tc: "00:10:53:04", text: "You!" },
        { id: "#133", tc: "00:11:11:00", text: "Don't stay in too long today You." },
        { id: "#135", tc: "00:11:12:27", text: "I'll see you in a little bit, auntie." },
        { id: "#137", tc: "00:11:21:21", text: "It's simple..." },
        { id: "#138", tc: "00:11:23:09", text: "[Keep original text style -- see feedback #138]" },
        { id: "#140", tc: "00:11:40:24", text: "This girl is staying too long." },
        { id: "#141", tc: "00:11:42:27", text: "You, we need to talk." },
        { id: "#142", tc: "00:11:44:00", text: "What is it, auntie?" },
        { id: "#144", tc: "00:11:53:19", text: "You, we've discussed this before..." },
        { id: "#145", tc: "00:11:58:15", text: "[Revert to original text style -- see feedback #145]" },
        { id: "#146", tc: "00:12:00:24", text: "Your body is not an endless well." },
        { id: "#149", tc: "00:12:13:15", text: "Okay, auntie." },
        { id: "#151", tc: "00:12:17:28", text: "Okay, let's get this work done." },
        { id: "#152", tc: "00:12:19:28", text: "Didn't we talk about this?!" },
        { id: "#153", tc: "00:12:22:09", text: "Auntie, I'm just doing what's best for my family!" },
        { id: "#154", tc: "00:12:36:16", text: "Hi Mom, hi Dad." },
        { id: "#155", tc: "00:12:46:12", text: "I'm going to get them a little surprise this time." },
        { id: "#156", tc: "00:13:03:07", text: "She's growing up so quick. She really is a big help." },
        { id: "#159", tc: "00:13:06:03", text: "Hi Mom, are you doing okay?" },
        { id: "#160", tc: "00:13:08:15", text: "Yes, sweetheart. Thank you." },
        { id: "#162", tc: "00:13:20:03", text: "Your leg is healing much better." },
        { id: "#165", tc: "00:13:30:04", text: "Careful, Daddy." },
        { id: "#167", tc: "00:13:37:18", text: "Your dad's a strong man, isn't he?" },
        { id: "#168", tc: "00:13:40:12", text: "Yes..." },
        { id: "#170", tc: "00:13:44:15", text: "Come sit with me, You." },
        { id: "#172", tc: "00:13:52:16", text: "I'm proud of you." },
        { id: "#173", tc: "00:13:55:09", text: "You're the reason this family has made it through this winter." },
        { id: "#174", tc: "00:13:59:18", text: "I'll never forget what you've done for us." },
        { id: "#176", tc: "00:14:05:03", text: "The doctor thinks I should be okay soon enough." },
        { id: "#177", tc: "00:14:10:09", text: "Stop moving so much." },
        { id: "#178", tc: "00:14:15:06", text: "You'll never have to go back to that marsh again." },
        { id: "#179", tc: "00:14:27:03", text: "I love you, Dad." },
        { id: "#181", tc: "00:14:33:24", text: "[Revert to old text style -- see feedback #181]" },
        { id: "#180", tc: "00:14:33:24", text: "Did you hear the parliament is considering a law?" },
        { id: "#182", tc: "00:15:08:00", text: "Things are finally working out." },
        { id: "#183", tc: "00:15:32:21", text: "They're going to need plenty of desks." },
        { id: "#186", tc: "00:15:42:15", text: "And look at this..." },
        { id: "#188", tc: "00:16:14:04", text: "I won't have to keep doing this anymore." },
        { id: "#190", tc: "00:16:37:07", text: "You! That's too many!!" },
        { id: "#193", tc: "00:17:29:00", text: "Something has gotten into it." },
        { id: "#198", tc: "00:18:25:10", text: "It's just a bad few days. I'll get better soon." },
        { id: "#199", tc: "00:18:28:07", text: "You need to stop, You." },
        { id: "#201", tc: "00:19:02:25", text: "Auntie, are the jars full?" },
        { id: "#203", tc: "00:19:51:09", text: "Something tragic has happened." }
    ];

    // ===================================================================
    //  UTILITY -- Timecode HH:MM:SS:FF -> seconds
    // ===================================================================
    function tcToSeconds(tc, fps) {
        var parts = tc.split(":");
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var s = parseInt(parts[2], 10);
        var f = parseInt(parts[3], 10);
        return h * 3600 + m * 60 + s + f / fps;
    }

    // ===================================================================
    //  UTILITY -- Find a CompItem by name in the project
    // ===================================================================
    function findProjectItem(name) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item.name === name && item instanceof CompItem) {
                return item;
            }
        }
        return null;
    }

    // ===================================================================
    //  UTILITY -- Find target layer (latest inPoint <= time)
    //  Ties broken by picking the lowest index (topmost layer in stack).
    // ===================================================================
    function findTargetLayer(comp, time) {
        var target = null;
        var latestIn = -Infinity;
        var TOL = 0.002; // 2ms floating-point tolerance
        for (var j = 1; j <= comp.numLayers; j++) {
            var lyr = comp.layer(j);
            var ip = lyr.inPoint;
            if (ip <= time + TOL && ip > latestIn) {
                latestIn = ip;
                target = lyr;
            }
        }
        return target;
    }

    // ===================================================================
    //  CORE -- Set Essential Property "text" via keyframe at [time]
    // ===================================================================
    function setEssentialText(rigLayer, text, time) {
        var essGroup;
        try { essGroup = rigLayer.property("ADBE Layer Overrides"); }
        catch (e) { return false; }
        if (!essGroup || essGroup.numProperties === 0) return false;

        for (var k = 1; k <= essGroup.numProperties; k++) {
            var prop = essGroup.property(k);
            if (prop.name !== "text") continue;

            // Attempt 1: new TextDocument constructor
            try {
                var td = new TextDocument(text);
                prop.setValueAtTime(time, td);
                return true;
            } catch (e1) { }

            // Attempt 2: mutate existing TextDocument value
            try {
                var existing = prop.value;
                if (existing && typeof existing === "object"
                    && existing.hasOwnProperty("text")) {
                    existing.text = text;
                    prop.setValueAtTime(time, existing);
                    return true;
                }
            } catch (e2) { }

            // Attempt 3: plain string (older host behaviour)
            try { prop.setValueAtTime(time, text); return true; }
            catch (e3) { }

            return false;
        }
        return false;
    }

    // ===================================================================
    //  CORE -- Place a single bubble-rig for one entry
    // ===================================================================
    function placeBubble(entry, mainComp, bubbleRigItem) {
        var fps = mainComp.frameRate;
        var time = tcToSeconds(entry.tc, fps);

        // 1. Find the layer active at this timecode
        var targetLayer = findTargetLayer(mainComp, time);

        // 2. Add bubble-rig as a new layer in the comp
        var rigLayer = mainComp.layers.add(bubbleRigItem);

        // 3. Name for identification
        rigLayer.name = "bubble-rig " + entry.id + " | " + entry.tc;

        // 4. Align rig frame-0 with the timecode, then trim in-point
        //    startTime: which comp-time maps to source-time 0
        //    inPoint:   where the layer first becomes visible
        rigLayer.startTime = time;
        rigLayer.inPoint = time;
        // outPoint stays at default -- user will trim manually

        // 5. Place directly ABOVE the matched layer
        if (targetLayer) {
            rigLayer.moveBefore(targetLayer);
        }

        // 6. Transform: Scale 40%, Position = comp centre
        var xform = rigLayer.property("ADBE Transform Group");
        xform.property("ADBE Scale").setValue([40, 40]);
        xform.property("ADBE Position").setValue([mainComp.width / 2, mainComp.height / 2]);

        // 7. Essential Property "text" -- keyframe at timecode
        var textOK = setEssentialText(rigLayer, entry.text, time);

        return { layer: rigLayer, textSet: textOK };
    }

    // ===================================================================
    //  UI
    // ===================================================================
    function buildUI(thisObj) {
        var w = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Bubble Placer -- Leech Girl", undefined, { resizeable: true });

        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.spacing = 6;
        w.margins = [10, 10, 10, 10];

        // Title bar
        var hdr = w.add("group");
        hdr.orientation = "row";
        hdr.alignChildren = ["fill", "center"];
        var titleTxt = hdr.add("statictext", undefined, "Bubble Placer");
        titleTxt.graphics.font = ScriptUI.newFont("Arial", "BOLD", 13);
        var cntTxt = hdr.add("statictext", undefined, BUBBLES.length + " entries");
        cntTxt.alignment = ["right", "center"];

        w.add("panel", undefined, "").preferredSize = [1, 1];

        // Search row
        var sg = w.add("group");
        sg.orientation = "row";
        sg.alignChildren = ["left", "center"];
        sg.add("statictext", undefined, "Search:");
        var searchBox = sg.add("edittext", undefined, "");
        searchBox.preferredSize = [220, 22];
        var clearBtn = sg.add("button", undefined, "X");
        clearBtn.preferredSize = [24, 22];

        // Listbox
        var lb = w.add("listbox", [0, 0, 360, 280], [], {
            multiselect: true,
            numberOfColumns: 3,
            columnWidths: [44, 88, 228],
            showHeaders: true,
            columnTitles: ["ID", "Timecode", "Text / Note"]
        });

        function populateList(filter) {
            lb.removeAll();
            var f = (filter || "").toLowerCase();
            for (var i = 0; i < BUBBLES.length; i++) {
                var b = BUBBLES[i];
                if (f && (b.id + b.tc + b.text).toLowerCase().indexOf(f) === -1) continue;
                var li = lb.add("item", b.id);
                li.subItems[0].text = b.tc;
                li.subItems[1].text = b.text.length > 38
                    ? b.text.substring(0, 35) + "..." : b.text;
            }
        }
        populateList("");

        // Select controls
        var selGrp = w.add("group");
        selGrp.orientation = "row";
        selGrp.alignChildren = ["left", "center"];
        var selAllBtn = selGrp.add("button", undefined, "Select All");
        var deselBtn = selGrp.add("button", undefined, "Deselect All");
        var selCntTxt = selGrp.add("statictext", undefined, "0 selected");
        selCntTxt.alignment = ["right", "center"];

        function updateSelCount() {
            var n = 0;
            for (var i = 0; i < lb.items.length; i++) { if (lb.items[i].selected) n++; }
            selCntTxt.text = n + " selected";
        }

        w.add("panel", undefined, "").preferredSize = [1, 1];

        // Comp name inputs (editable so user can override if needed)
        var cnGrp = w.add("group");
        cnGrp.orientation = "column";
        cnGrp.alignChildren = ["fill", "top"];
        cnGrp.spacing = 4;

        var r1 = cnGrp.add("group");
        r1.orientation = "row"; r1.alignChildren = ["left", "center"];
        r1.add("statictext", undefined, "main comp name: ");
        var mainCompInput = r1.add("edittext", undefined, "main_comp");
        mainCompInput.preferredSize = [170, 20];

        var r2 = cnGrp.add("group");
        r2.orientation = "row"; r2.alignChildren = ["left", "center"];
        r2.add("statictext", undefined, "bubble rig name: ");
        var rigNameInput = r2.add("edittext", undefined, "bubble-rig");
        rigNameInput.preferredSize = [170, 20];

        w.add("panel", undefined, "").preferredSize = [1, 1];

        // Action buttons
        var placeSelBtn = w.add("button", undefined, "Place Selected Bubbles");
        placeSelBtn.preferredSize = [360, 28];
        var placeAllBtn = w.add("button", undefined, "Place ALL " + BUBBLES.length + " Bubbles");
        placeAllBtn.preferredSize = [360, 28];

        w.add("panel", undefined, "").preferredSize = [1, 1];

        // Status
        var statusTxt = w.add("statictext", undefined, "Ready. Select entries then click Place.");
        statusTxt.preferredSize = [360, 32];

        // --- Handlers ---

        searchBox.onChanging = function () {
            populateList(searchBox.text);
            updateSelCount();
        };
        clearBtn.onClick = function () {
            searchBox.text = ""; populateList(""); updateSelCount();
        };
        lb.onChange = function () { updateSelCount(); };
        selAllBtn.onClick = function () {
            for (var i = 0; i < lb.items.length; i++) lb.items[i].selected = true;
            updateSelCount();
        };
        deselBtn.onClick = function () {
            for (var i = 0; i < lb.items.length; i++) lb.items[i].selected = false;
            updateSelCount();
        };

        function getSelectedEntries() {
            var out = [];
            for (var i = 0; i < lb.items.length; i++) {
                if (!lb.items[i].selected) continue;
                var itemId = lb.items[i].text;
                for (var j = 0; j < BUBBLES.length; j++) {
                    if (BUBBLES[j].id === itemId) { out.push(BUBBLES[j]); break; }
                }
            }
            return out;
        }

        function runPlacement(entries) {
            if (entries.length === 0) {
                alert("No entries selected.\nCtrl+click rows, or use 'Select All'."); return;
            }
            var mcName = mainCompInput.text || "main_comp";
            var rigName = rigNameInput.text || "bubble-rig";
            var mainComp = findProjectItem(mcName);
            if (!mainComp) {
                alert("ERROR: No comp named \"" + mcName + "\" found in the project."); return;
            }
            var rigItem = findProjectItem(rigName);
            if (!rigItem) {
                alert("ERROR: No comp named \"" + rigName + "\" found in the project."); return;
            }

            app.beginUndoGroup("Bubble Placer: Place " + entries.length + " rigs");
            var success = 0, noText = 0, errors = [];

            for (var i = 0; i < entries.length; i++) {
                var e = entries[i];
                statusTxt.text = "Placing " + (i + 1) + "/" + entries.length
                    + "  " + e.id + " @ " + e.tc + "...";
                w.update();
                try {
                    var r = placeBubble(e, mainComp, rigItem);
                    success++;
                    if (!r.textSet) noText++;
                } catch (err) {
                    errors.push(e.id + " @ " + e.tc + ": " + err.message);
                }
            }
            app.endUndoGroup();

            var msg = "Done!  Placed " + success + " / " + entries.length + " bubble rigs.";
            if (noText > 0) {
                msg += "\n\nWarning: " + noText + " rig(s) could not set the \"text\" Essential Property.\n"
                    + "Verify the property is named exactly \"text\" in bubble-rig.";
            }
            if (errors.length > 0) {
                msg += "\n\nErrors (" + errors.length + "):\n"
                    + errors.slice(0, 8).join("\n")
                    + (errors.length > 8 ? "\n...+" + (errors.length - 8) + " more" : "");
            }
            statusTxt.text = "Done! " + success + " placed."
                + (errors.length > 0 ? " (" + errors.length + " errors)" : "");
            alert(msg);
        }

        placeSelBtn.onClick = function () { runPlacement(getSelectedEntries()); };
        placeAllBtn.onClick = function () {
            if (!confirm("Place ALL " + BUBBLES.length + " bubble rigs into\n\""
                + (mainCompInput.text || "main_comp") + "\"?\n\nContinue?")) return;
            runPlacement(BUBBLES);
        };

        if (w instanceof Panel) {
            w.onResizing = w.onResize = function () { w.layout.resize(); };
        }
        return w;
    }

    // ===================================================================
    //  INIT
    // ===================================================================
    var ui = buildUI(thisObj);
    if (ui instanceof Window) {
        ui.center();
        ui.show();
    } else {
        ui.layout.layout(true);
        ui.layout.resize();
    }

}(this));
