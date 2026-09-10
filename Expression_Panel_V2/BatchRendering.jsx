// BatchRendering.jsx — Batch Rendering ScriptUI Panel for After Effects
// Drop into Scripts/ScriptUI Panels for a dockable panel, or Scripts for run-once dialog.
// Pure ExtendScript — no CEP, no HTML, no external dependencies.

(function (thisObj) {
    // =========================================================================
    // --- PANEL / WINDOW SETUP ---
    // =========================================================================
    var scriptName = "Batch Rendering";
    var win = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette", scriptName, undefined, { resizeable: true });

    if (!(win instanceof Panel)) win.center();

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 8;

    // =========================================================================
    // --- STATE ---
    // =========================================================================
    var targetComp = null;       // CompItem reference
    var compLookup = {};         // O(1) hash map of CompItem.id -> CompItem
    var ranges = [];             // Array of cached range objects
    var pendingInFrame = null;   // integer frame number, waiting for Mark Out
    var pendingSuffix = "";      // Suffix captured during Mark In (e.g. from layer)
    var outputRootFolder = null; // Folder object — user-chosen root, or null for project default

    // =========================================================================
    // --- TIMECODE HELPERS (integer frame-based — no float precision loss) ---
    // =========================================================================

    function pad2(n) {
        return (n < 10 ? "0" : "") + Math.floor(n);
    }

    function captureFrame(comp) {
        return Math.round(comp.time * comp.frameRate);
    }

    function frameToTimecode(frame, fps, dropFrame) {
        var fpsInt = Math.round(fps);
        var f = frame;

        if (dropFrame && (fpsInt === 30 || fpsInt === 60)) {
            var dropPerMin = (fpsInt === 30) ? 2 : 4;
            var framesPerTenMin = fpsInt * 60 * 10 - dropPerMin * 9;
            var D = f;
            var d = Math.floor(D / framesPerTenMin);
            var m = D % framesPerTenMin;
            if (m < dropPerMin) {
                f = D + dropPerMin * 9 * d;
            } else {
                f = D + dropPerMin * 9 * d + dropPerMin * Math.floor((m - dropPerMin) / (fpsInt * 60 - dropPerMin));
            }
        }

        var ff = f % fpsInt;
        var ss = Math.floor(f / fpsInt) % 60;
        var mm = Math.floor(f / (fpsInt * 60)) % 60;
        var hh = Math.floor(f / (fpsInt * 3600));
        return pad2(hh) + ":" + pad2(mm) + ":" + pad2(ss) + (dropFrame ? ";" : ":") + pad2(ff);
    }

    function timecodeToFrame(tc, fps, dropFrame) {
        var parts = tc.replace(/;/g, ":").split(":");
        if (parts.length !== 4) return 0;
        var hh = parseInt(parts[0], 10) || 0;
        var mm = parseInt(parts[1], 10) || 0;
        var ss = parseInt(parts[2], 10) || 0;
        var ff = parseInt(parts[3], 10) || 0;
        var fpsInt = Math.round(fps);

        var totalFrames = hh * fpsInt * 3600 + mm * fpsInt * 60 + ss * fpsInt + ff;

        if (dropFrame && (fpsInt === 30 || fpsInt === 60)) {
            var dropPerMin = (fpsInt === 30) ? 2 : 4;
            var totalMinutes = hh * 60 + mm;
            totalFrames -= dropPerMin * (totalMinutes - Math.floor(totalMinutes / 10));
        }

        return totalFrames;
    }

    function frameToSeconds(frame, fps) {
        return frame / fps;
    }

    function getMMSS(frame, fps) {
        var fpsInt = Math.round(fps);
        var totalSec = Math.floor(frame / fpsInt);
        var mm = Math.floor(totalSec / 60);
        var ss = totalSec % 60;
        return pad2(mm) + "_" + pad2(ss);
    }

    function sanitizePath(str) {
        if (!str) return "";
        try { str = decodeURIComponent(str); } catch (e) { }
        return str.replace(/[\\\/\*\?"<>\|:%]/g, "").replace(/\s+/g, " ");
    }

    /** Helper to create optimized range objects with pre-calculated timecode strings */
    function createRangeObj(inF, outF, suffixStr) {
        var fps = targetComp ? targetComp.frameRate : 30;
        var df = targetComp ? targetComp.dropFrame : false;

        var inF_safe = Math.min(inF, outF);
        var outF_safe = Math.max(inF, outF);
        var durF = outF_safe - inF_safe;

        return {
            inFrame: inF_safe,
            outFrame: outF_safe,
            durationFrames: durF,
            suffix: sanitizePath(suffixStr),
            inTimecode: frameToTimecode(inF_safe, fps, df),
            outTimecode: frameToTimecode(outF_safe, fps, df),
            durTimecode: frameToTimecode(durF > 0 ? durF : 0, fps, false)
        };
    }

    // =========================================================================
    // --- COMP LOOKUP ---
    // =========================================================================

    function getAllComps() {
        var comps = [];
        compLookup = {}; // clear hash map
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) {
                comps.push(item);
                compLookup[item.id] = item;
            }
        }
        return comps;
    }

    function getActiveComp() {
        if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
            return app.project.activeItem;
        }
        return null;
    }

    function getParentFolderName(maxLen) {
        var limit = (maxLen !== undefined) ? maxLen : 20;
        var name = "Untitled";
        try {
            var projFile = app.project.file;
            if (projFile && projFile.name) {
                var pName = projFile.name;
                var dotIdx = pName.lastIndexOf(".");
                if (dotIdx !== -1) pName = pName.substring(0, dotIdx);
                if (pName) name = pName;
            } else if (projFile && projFile.parent) {
                name = projFile.parent.name;
            }
        } catch (e) { }

        name = sanitizePath(name);

        if (limit > 0 && name.length > limit) {
            name = name.substring(0, limit).replace(/[\s\._\-]+$/, "");
        }
        return name;
    }

    // =========================================================================
    // --- UI CONSTRUCTION ---
    // =========================================================================

    // =========================================================================
    // --- LOGGING & DIAGNOSTICS ---
    // =========================================================================
    var debugLogs = [];

    function logMsg(msg) {
        var t = new Date();
        var timeStr = pad2(t.getHours()) + ":" + pad2(t.getMinutes()) + ":" + pad2(t.getSeconds());
        debugLogs.push("[" + timeStr + "] " + msg);
    }

    function showLogDialog() {
        var logWin = new Window("dialog", "Batch Rendering — Diagnostic Log", undefined, { resizeable: true });
        logWin.orientation = "column";
        logWin.alignChildren = ["fill", "fill"];
        logWin.preferredSize = [640, 420];

        var txt = logWin.add("edittext", undefined, debugLogs.join("\n"), { multiline: true, readonly: true, scrollable: true });
        txt.alignment = ["fill", "fill"];

        var btnRow = logWin.add("group");
        btnRow.orientation = "row";
        btnRow.alignment = ["right", "bottom"];
        var btnClose = btnRow.add("button", undefined, "Close");
        btnClose.onClick = function () { logWin.close(); };

        logWin.center();
        logWin.show();
    }

    function safeSetOMFile(om, draftFolder, fileNameWithExt) {
        logMsg("--- Setting OM File ---");
        logMsg("Folder fsName: " + draftFolder.fsName + " (exists: " + draftFolder.exists + ")");

        var dotIndex = fileNameWithExt.lastIndexOf(".");
        var base = (dotIndex !== -1) ? fileNameWithExt.substring(0, dotIndex) : fileNameWithExt;
        var ext = (dotIndex !== -1) ? fileNameWithExt.substring(dotIndex) : "";
        var cleanFileName = sanitizePath(base) + ext;

        logMsg("Target Clean File Name: " + cleanFileName);

        var winPath = draftFolder.fsName + "\\" + cleanFileName;
        var unixPath = (draftFolder.fsName + "/" + cleanFileName).replace(/\\/g, "/");

        // Attempt 1: Direct File(winPath)
        try {
            om.file = new File(winPath);
            var res1 = om.file ? decodeURIComponent(om.file.name) : "null";
            logMsg("Attempt 1 (winPath): " + res1);
            if (om.file && decodeURIComponent(om.file.name) === cleanFileName) return true;
        } catch (e1) { logMsg("Attempt 1 Error: " + e1.message); }

        // Attempt 2: Direct File(unixPath)
        try {
            om.file = new File(unixPath);
            var res2 = om.file ? decodeURIComponent(om.file.name) : "null";
            logMsg("Attempt 2 (unixPath): " + res2);
            if (om.file && decodeURIComponent(om.file.name) === cleanFileName) return true;
        } catch (e2) { logMsg("Attempt 2 Error: " + e2.message); }

        // Attempt 3: File(draftFolder, cleanFileName)
        try {
            om.file = new File(draftFolder, cleanFileName);
            var res3 = om.file ? decodeURIComponent(om.file.name) : "null";
            logMsg("Attempt 3 (Folder, Name): " + res3);
            if (om.file && decodeURIComponent(om.file.name) === cleanFileName) return true;
        } catch (e3) { logMsg("Attempt 3 Error: " + e3.message); }

        // Attempt 4: File(draftFolder.fullName + "/" + cleanFileName)
        try {
            om.file = new File(draftFolder.fullName + "/" + cleanFileName);
            var res4 = om.file ? decodeURIComponent(om.file.name) : "null";
            logMsg("Attempt 4 (fullName): " + res4);
            if (om.file && decodeURIComponent(om.file.name) === cleanFileName) return true;
        } catch (e4) { logMsg("Attempt 4 Error: " + e4.message); }

        return false;
    }

    // --- ROW 1: Header (Comp dropdown, refresh button, Mark In, Mark Out, Layer range, Log) ---
    var headerRow = win.add("group");
    headerRow.orientation = "row";
    headerRow.alignChildren = ["left", "center"];
    headerRow.spacing = 4;

    var compDropdown = headerRow.add("dropdownlist", undefined, []);
    compDropdown.preferredSize = [130, 24];

    var btnRefresh = headerRow.add("button", undefined, "↻");
    btnRefresh.preferredSize = [24, 24];
    btnRefresh.helpTip = "Refresh comp list";

    var btnMarkIn = headerRow.add("button", undefined, "In");
    btnMarkIn.preferredSize = [45, 24];
    btnMarkIn.helpTip = "Mark In at playhead";

    var btnMarkOut = headerRow.add("button", undefined, "Out");
    btnMarkOut.preferredSize = [45, 24];
    btnMarkOut.helpTip = "Mark Out at playhead";

    var btnFromLayer = headerRow.add("button", undefined, "+ Layer");
    btnFromLayer.preferredSize = [55, 24];
    btnFromLayer.helpTip = "Add range(s) from currently selected layer(s)";

    var btnLog = headerRow.add("button", undefined, "Log");
    btnLog.preferredSize = [35, 24];
    btnLog.helpTip = "View detailed execution log";
    btnLog.onClick = function () { showLogDialog(); };

    // Pending status label under top bar
    var pendingLabel = win.add("statictext", undefined, "");
    pendingLabel.alignment = ["center", "top"];
    pendingLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    // --- ROW 2: Range List Box (Main area) ---
    var rangeList = win.add("listbox", undefined, [], {
        numberOfColumns: 5,
        showHeaders: true,
        columnTitles: ["#", "In", "Out", "Duration", "Suffix"],
        columnWidths: [24, 95, 95, 75, 90],
        multiselect: true
    });
    rangeList.preferredSize = [0, 130];
    rangeList.alignment = ["fill", "top"];

    // --- ROW 3: Settings & Edit Panel ---
    var panelBox = win.add("panel", undefined, "");
    panelBox.orientation = "column";
    panelBox.alignChildren = ["fill", "top"];
    panelBox.spacing = 4;
    panelBox.margins = 6;

    var lblWidth = 55;

    // Inline Range Edit Row
    var editRow1 = panelBox.add("group");
    editRow1.orientation = "row";
    editRow1.alignChildren = ["left", "center"];
    editRow1.spacing = 3;

    var lblIn = editRow1.add("statictext", undefined, "In:");
    lblIn.preferredSize = [lblWidth, 20];
    lblIn.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    var editInField = editRow1.add("edittext", undefined, "");
    editInField.preferredSize = [65, 20];
    var btnNudgeInMinus = editRow1.add("button", undefined, "◄");
    btnNudgeInMinus.preferredSize = [20, 20];
    btnNudgeInMinus.helpTip = "-1 frame";
    var btnNudgeInPlus = editRow1.add("button", undefined, "►");
    btnNudgeInPlus.preferredSize = [20, 20];
    btnNudgeInPlus.helpTip = "+1 frame";

    var lblOut = editRow1.add("statictext", undefined, " Out:");
    lblOut.preferredSize = [32, 20];
    lblOut.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    var editOutField = editRow1.add("edittext", undefined, "");
    editOutField.preferredSize = [65, 20];
    var btnNudgeOutMinus = editRow1.add("button", undefined, "◄");
    btnNudgeOutMinus.preferredSize = [20, 20];
    btnNudgeOutMinus.helpTip = "-1 frame";
    var btnNudgeOutPlus = editRow1.add("button", undefined, "►");
    btnNudgeOutPlus.preferredSize = [20, 20];
    btnNudgeOutPlus.helpTip = "+1 frame";

    // Suffix & Row actions
    var editRow2 = panelBox.add("group");
    editRow2.orientation = "row";
    editRow2.alignChildren = ["left", "center"];
    editRow2.spacing = 3;

    var lblSuffix = editRow2.add("statictext", undefined, "Suffix:");
    lblSuffix.preferredSize = [lblWidth, 20];
    lblSuffix.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    var editSuffixField = editRow2.add("edittext", undefined, "");
    editSuffixField.preferredSize = [75, 20];

    var btnUpdateRow = editRow2.add("button", undefined, "Update");
    btnUpdateRow.preferredSize = [50, 20];
    var btnDeleteRow = editRow2.add("button", undefined, "Delete");
    btnDeleteRow.preferredSize = [50, 20];
    var btnClearAll = editRow2.add("button", undefined, "Clear All");
    btnClearAll.preferredSize = [55, 20];

    // Output folder row
    var outRow = panelBox.add("group");
    outRow.orientation = "row";
    outRow.alignChildren = ["left", "center"];
    outRow.spacing = 3;

    var lblOutput = outRow.add("statictext", undefined, "Output:");
    lblOutput.preferredSize = [lblWidth, 20];
    lblOutput.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    var folderLabel = outRow.add("statictext", undefined, "(project default)");
    folderLabel.preferredSize = [135, 20];
    folderLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    var btnPickFolder = outRow.add("button", undefined, "Browse");
    btnPickFolder.preferredSize = [50, 20];
    var btnResetFolder = outRow.add("button", undefined, "Reset");
    btnResetFolder.preferredSize = [40, 20];

    // Template row
    var omRow = panelBox.add("group");
    omRow.orientation = "row";
    omRow.alignChildren = ["left", "center"];
    omRow.spacing = 3;

    var lblTemplate = omRow.add("statictext", undefined, "Template:");
    lblTemplate.preferredSize = [lblWidth, 20];
    lblTemplate.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    var omDropdown = omRow.add("dropdownlist", undefined, []);
    omDropdown.preferredSize = [235, 20];

    // Preview row
    var prevRow = panelBox.add("group");
    prevRow.orientation = "row";
    prevRow.alignChildren = ["left", "center"];
    prevRow.spacing = 3;

    var lblPreview = prevRow.add("statictext", undefined, "Preview:");
    lblPreview.preferredSize = [lblWidth, 20];
    lblPreview.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    var previewLabel = prevRow.add("statictext", undefined, "(select a range)");
    previewLabel.preferredSize = [235, 20];
    previewLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    // --- ROW 4: Centered Render Controls ---
    var renderGroup = win.add("group");
    renderGroup.orientation = "column";
    renderGroup.alignment = ["center", "top"];
    renderGroup.alignChildren = ["center", "center"];
    renderGroup.spacing = 4;

    var cbRenderNow = renderGroup.add("checkbox", undefined, "Render immediately");
    cbRenderNow.value = false;
    cbRenderNow.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    var btnRender = renderGroup.add("button", undefined, "RENDER");
    btnRender.preferredSize = [180, 32];
    btnRender.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);

    // Status bar
    var statusLabel = win.add("statictext", undefined, "");
    statusLabel.alignment = ["fill", "bottom"];
    statusLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 8);

    // =========================================================================
    // --- UI LOGIC ---
    // =========================================================================

    function setStatus(msg) { statusLabel.text = msg; }

    function refreshCompList() {
        compDropdown.removeAll();
        var comps = getAllComps();
        for (var i = 0; i < comps.length; i++) {
            var dpItem = compDropdown.add("item", comps[i].name);
            dpItem.compId = comps[i].id; // Cache ID for O(1) lookup
        }

        var active = getActiveComp();
        if (active) {
            for (var j = 0; j < compDropdown.items.length; j++) {
                if (compDropdown.items[j].compId === active.id) {
                    compDropdown.selection = j;
                    setTargetComp(active);
                    return;
                }
            }
        }
        if (comps.length > 0) {
            compDropdown.selection = 0;
            setTargetComp(comps[0]);
        }
    }

    function setTargetComp(comp) {
        targetComp = comp;
        pendingInFrame = null;
        pendingSuffix = "";
        pendingLabel.text = "";
        refreshOMTemplates();
    }

    function autoSelectComp() {
        refreshCompList();
        if (!targetComp && compDropdown.items.length > 0) {
            var firstCompId = compDropdown.items[0].compId;
            setTargetComp(compLookup[firstCompId]);
        }
        if (targetComp) {
            setStatus("Active comp: " + targetComp.name);
        } else {
            setStatus("No comps found in project.");
        }
    }

    function refreshOMTemplates(forceScan) {
        if (!forceScan && omDropdown && omDropdown.items && omDropdown.items.length > 0) return;

        if (omDropdown) omDropdown.removeAll();
        var templates = [];

        try {
            var rq = app.project.renderQueue;
            if (rq && rq.numItems > 0) {
                try { templates = rq.item(1).outputModule(1).templates; } catch (e1) { }
            }

            if ((!templates || templates.length === 0) && forceScan && targetComp) {
                var tempItem = rq.items.add(targetComp);
                templates = tempItem.outputModule(1).templates;
                tempItem.remove();
            }
        } catch (e) { }

        if (!templates || templates.length === 0) {
            templates = [
                "H.264 - Match Render Settings - 5 Mbps",
                "H.264 - 5 Mbps",
                "Lossless",
                "Best Settings",
                "Draft Settings"
            ];
        }

        if (omDropdown) {
            for (var i = 0; i < templates.length; i++) {
                if (templates[i].indexOf("_HIDDEN") !== 0) omDropdown.add("item", templates[i]);
            }

            var found = false;
            var reg5Mbps = /(^|[^0-9])5\s*mb/i;
            for (var j = 0; j < omDropdown.items.length; j++) {
                if (reg5Mbps.test(omDropdown.items[j].text)) {
                    omDropdown.selection = j;
                    found = true;
                    break;
                }
            }

            if (!found) {
                var preferred = ["H.264 - Match Render Settings - 5 Mbps", "H.264 - 5 Mbps", "H.264", "Lossless", "Best Settings"];
                for (var p = 0; p < preferred.length && !found; p++) {
                    for (var k = 0; k < omDropdown.items.length; k++) {
                        if (omDropdown.items[k].text === preferred[p]) { omDropdown.selection = k; found = true; break; }
                    }
                }
            }

            if (!found && omDropdown.items.length > 0) omDropdown.selection = 0;
        }
    }

    function applyTemplateWithFallback(om, requestedTemplate) {
        if (!om) return false;
        if (requestedTemplate) {
            try { om.applyTemplate(requestedTemplate); return true; } catch (e1) { }
        }
        try {
            var installed = om.templates;
            var reg5 = /(^|[^0-9])5\s*mb/i;
            for (var i = 0; i < installed.length; i++) {
                if (reg5.test(installed[i])) { om.applyTemplate(installed[i]); return true; }
            }
            for (var j = 0; j < installed.length; j++) {
                if (installed[j].indexOf("H.264") !== -1) { om.applyTemplate(installed[j]); return true; }
            }
        } catch (e2) { }
        return false;
    }

    function addRangeUI(r, idx) {
        var item = rangeList.add("item", String(idx + 1));
        item.subItems[0].text = r.inTimecode;
        item.subItems[1].text = r.outTimecode;
        item.subItems[2].text = r.durTimecode;
        item.subItems[3].text = r.suffix;
        return item;
    }

    /** Optimised direct UI refresh instead of full rebuild */
    function refreshRangeList() {
        rangeList.removeAll();
        if (!targetComp) return;
        for (var i = 0; i < ranges.length; i++) addRangeUI(ranges[i], i);
        updatePreview();
    }

    function populateEditFields() {
        var sel = rangeList.selection;
        if (sel === null) { editInField.text = ""; editOutField.text = ""; editSuffixField.text = ""; return; }
        var item = (sel instanceof Array) ? sel[0] : sel;
        if (!item) return;
        var idx = item.index;
        if (idx < 0 || idx >= ranges.length) return;
        var r = ranges[idx];
        editInField.text = r.inTimecode;
        editOutField.text = r.outTimecode;
        editSuffixField.text = r.suffix || "";
        updatePreview();
    }

    function ensureFolderExists(f) {
        if (!f) return false;
        if (f.exists) return true;
        if (f.parent && !f.parent.exists) {
            ensureFolderExists(f.parent);
        }
        return f.create();
    }

    function getOutputRootFolder() {
        if (outputRootFolder && outputRootFolder.exists) return outputRootFolder;
        try {
            var projFile = app.project.file;
            if (projFile && projFile.exists && projFile.parent) return projFile.parent;
        } catch (e) { }
        return Folder.desktop;
    }

    function updatePreview() {
        var sel = rangeList.selection;
        if (sel === null || !targetComp) { previewLabel.text = "(select a range)"; return; }
        var item = (sel instanceof Array) ? sel[0] : sel;
        if (!item) return;
        var idx = item.index;
        if (idx < 0 || idx >= ranges.length) return;
        var r = ranges[idx];

        var parentName = sanitizePath(getParentFolderName());
        var mmss = getMMSS(r.inFrame, targetComp.frameRate);
        var suffix = r.suffix ? "_" + r.suffix : "";
        var fileName = "RF_" + parentName + "_" + mmss + suffix + ".mp4";

        var rootFolder = getOutputRootFolder();
        previewLabel.text = rootFolder.fsName + "\\Draft\\" + fileName;
    }

    function addRangesFromSelectedLayers() {
        var active = getActiveComp();
        if (active) {
            setTargetComp(active);
            if (compDropdown) {
                for (var j = 0; j < compDropdown.items.length; j++) {
                    if (compDropdown.items[j].compId === active.id) {
                        compDropdown.selection = j;
                        break;
                    }
                }
            }
        }

        if (!targetComp) { setStatus("⚠ No target comp selected."); return false; }

        var selLayers = targetComp.selectedLayers;
        if (!selLayers || selLayers.length === 0) {
            setStatus("⚠ No layer selected in target comp.");
            return false;
        }

        var fps = targetComp.frameRate;

        for (var i = 0; i < selLayers.length; i++) {
            var layer = selLayers[i];
            var inF = Math.round(layer.inPoint * fps);
            var outF = Math.round(layer.outPoint * fps);
            var layerSuffix = layer.name;
            var r = createRangeObj(inF, outF, layerSuffix);
            ranges.push(r);
            addRangeUI(r, ranges.length - 1);
        }

        setStatus("✓ Added " + selLayers.length + " range(s) from selected layer(s).");
        return true;
    }

    // =========================================================================
    // --- EVENT HANDLERS ---
    // =========================================================================

    btnRefresh.onClick = function () { autoSelectComp(); };

    compDropdown.onChange = function () {
        if (compDropdown.selection === null) return;
        var cId = compDropdown.selection.compId;
        var comp = compLookup[cId] || null;
        if (comp) { setTargetComp(comp); setStatus("Target: " + comp.name); }
    };

    btnMarkIn.onClick = function () {
        if (!targetComp) { setStatus("⚠ No comp selected."); return; }

        pendingInFrame = captureFrame(targetComp);
        pendingSuffix = "";
        var tc = frameToTimecode(pendingInFrame, targetComp.frameRate, targetComp.dropFrame);
        pendingLabel.text = "In: " + tc + " — click Out";
        setStatus("In marked at " + tc);
    };

    btnMarkOut.onClick = function () {
        if (!targetComp) { setStatus("⚠ No comp selected."); return; }

        if (pendingInFrame !== null) {
            var outFrame = captureFrame(targetComp);
            var r = createRangeObj(pendingInFrame, outFrame, pendingSuffix);

            ranges.push(r);
            addRangeUI(r, ranges.length - 1);

            pendingInFrame = null;
            pendingSuffix = "";
            pendingLabel.text = "";
            setStatus("Range #" + ranges.length + " added.");
        } else {
            if (!addRangesFromSelectedLayers()) {
                setStatus("⚠ Mark In first, or select a layer in the timeline.");
            }
        }
    };

    btnFromLayer.onClick = function () {
        if (!addRangesFromSelectedLayers()) setStatus("⚠ No layer selected in target comp.");
    };

    rangeList.onChange = function () { populateEditFields(); };

    function nudgeField(field, delta) {
        if (!targetComp) return;
        var fps = targetComp.frameRate;
        var df = targetComp.dropFrame;
        var frame = timecodeToFrame(field.text, fps, df);
        frame += delta;
        if (frame < 0) frame = 0;
        field.text = frameToTimecode(frame, fps, df);
    }

    btnNudgeInMinus.onClick = function () { nudgeField(editInField, -1); };
    btnNudgeInPlus.onClick = function () { nudgeField(editInField, 1); };
    btnNudgeOutMinus.onClick = function () { nudgeField(editOutField, -1); };
    btnNudgeOutPlus.onClick = function () { nudgeField(editOutField, 1); };

    btnUpdateRow.onClick = function () {
        var sel = rangeList.selection;
        if (sel === null) { setStatus("⚠ Select range(s) to update."); return; }
        if (!targetComp) { setStatus("⚠ No target comp."); return; }

        var fps = targetComp.frameRate;
        var df = targetComp.dropFrame;
        var items = (sel instanceof Array) ? sel : [sel];
        if (items.length === 0) return;

        for (var k = 0; k < items.length; k++) {
            var idx = items[k].index;
            if (idx >= 0 && idx < ranges.length) {
                var inF = (editInField.text !== "") ? timecodeToFrame(editInField.text, fps, df) : ranges[idx].inFrame;
                var outF = (editOutField.text !== "") ? timecodeToFrame(editOutField.text, fps, df) : ranges[idx].outFrame;

                // createRangeObj automatically handles sorting min/max if they are out of order
                var newR = createRangeObj(inF, outF, editSuffixField.text);
                ranges[idx] = newR;

                // Update UI directly without tearing down listbox
                var uiItem = rangeList.items[idx];
                uiItem.subItems[0].text = newR.inTimecode;
                uiItem.subItems[1].text = newR.outTimecode;
                uiItem.subItems[2].text = newR.durTimecode;
                uiItem.subItems[3].text = newR.suffix;
            }
        }

        updatePreview();
        setStatus("✓ Updated " + items.length + " range(s).");
    };

    btnDeleteRow.onClick = function () {
        var sel = rangeList.selection;
        if (sel === null) { setStatus("⚠ Select range(s) to delete."); return; }

        var items = (sel instanceof Array) ? sel : [sel];
        var indices = [];
        for (var i = 0; i < items.length; i++) indices.push(items[i].index);

        // Sort descending so splicing doesn't shift remaining indices being processed
        indices.sort(function (a, b) { return b - a; });

        for (var j = 0; j < indices.length; j++) {
            var idx = indices[j];
            ranges.splice(idx, 1);
            rangeList.remove(rangeList.items[idx]); // Remove directly from DOM
        }

        // Fix index column labels (#) for all remaining items
        for (var k = 0; k < rangeList.items.length; k++) {
            rangeList.items[k].text = String(k + 1);
        }

        populateEditFields(); // Clear or update fields based on new selection state
        setStatus("Deleted " + indices.length + " range(s).");
    };

    btnClearAll.onClick = function () {
        ranges = [];
        pendingInFrame = null;
        pendingSuffix = "";
        pendingLabel.text = "";
        editInField.text = ""; editOutField.text = ""; editSuffixField.text = "";
        rangeList.removeAll();
        updatePreview();
        setStatus("Cleared.");
    };

    btnPickFolder.onClick = function () {
        var folder = Folder.selectDialog("Choose output root folder");
        if (folder) { outputRootFolder = folder; folderLabel.text = folder.fsName; updatePreview(); }
    };

    btnResetFolder.onClick = function () {
        outputRootFolder = null;
        folderLabel.text = "(project default)";
        updatePreview();
    };

    // =========================================================================
    // --- RENDER QUEUE LOGIC ---
    // =========================================================================

    btnRender.onClick = function () {
        debugLogs = []; // reset log
        logMsg("=== Starting Batch Render ===");

        if (!targetComp) {
            logMsg("Error: No target comp selected.");
            setStatus("⚠ No comp selected.");
            showLogDialog();
            return;
        }
        if (ranges.length === 0) {
            logMsg("Error: No ranges added.");
            setStatus("⚠ No ranges. Mark In/Out or add layers first.");
            showLogDialog();
            return;
        }

        logMsg("Target Comp: " + targetComp.name + " (" + targetComp.width + "x" + targetComp.height + " @ " + targetComp.frameRate + "fps)");

        var fps = targetComp.frameRate;

        // Output Root
        var rootFolder = getOutputRootFolder();
        logMsg("Output Root Folder: " + rootFolder.fsName);

        var draftPath = (rootFolder.fsName + "/Draft").replace(/\\/g, "/");
        var draftFolder = new Folder(draftPath);
        ensureFolderExists(draftFolder);
        logMsg("Draft Folder: " + draftFolder.fsName + " (exists: " + draftFolder.exists + ")");

        if (!draftFolder.exists) {
            draftPath = (Folder.desktop.fsName + "/Draft").replace(/\\/g, "/");
            draftFolder = new Folder(draftPath);
            ensureFolderExists(draftFolder);
            logMsg("Fallback Desktop Draft Folder: " + draftFolder.fsName + " (exists: " + draftFolder.exists + ")");
        }

        var templateName = (omDropdown.selection !== null) ? omDropdown.selection.text : null;
        logMsg("Selected OM Template: " + (templateName || "None (Default)"));

        var parentName = sanitizePath(getParentFolderName());
        logMsg("Parent Name for prefix: " + parentName);

        var nameCount = {};
        var renderNow = cbRenderNow.value;
        var createdItems = [];

        app.beginUndoGroup("Batch Rendering — " + ranges.length + " ranges");

        try {
            var rq = app.project.renderQueue;
            var queued = 0;

            for (var i = 0; i < ranges.length; i++) {
                var r = ranges[i];
                if (r.durationFrames <= 0) {
                    logMsg("Range #" + (i + 1) + " skipped (duration <= 0).");
                    continue;
                }

                logMsg("--- Processing Range #" + (i + 1) + " ---");
                logMsg("In: " + r.inFrame + " f (" + r.inTimecode + "), Out: " + r.outFrame + " f (" + r.outTimecode + ")");

                var rqItem = rq.items.add(targetComp);
                rqItem.timeSpanStart = frameToSeconds(r.inFrame, fps);
                rqItem.timeSpanDuration = frameToSeconds(r.durationFrames, fps);

                var mmss = getMMSS(r.inFrame, fps);
                var suffix = r.suffix ? "_" + r.suffix : "";
                var baseName = "RF_" + parentName + "_" + mmss + suffix;
                logMsg("Base File Name: " + baseName);

                var om = rqItem.outputModule(1);
                var applied = applyTemplateWithFallback(om, templateName);
                logMsg("Template applied: " + applied);

                var ext = ".mp4";
                try {
                    if (om.file && om.file.name) {
                        var defaultFileName = om.file.name;
                        var dotIndex = defaultFileName.lastIndexOf(".");
                        if (dotIndex !== -1) ext = defaultFileName.substring(dotIndex);
                    }
                } catch (eExt) { }
                logMsg("Extension determined: " + ext);

                var finalName = baseName;
                var counter = 1;
                while (nameCount[finalName] !== undefined || new File((draftFolder.fsName + "/" + finalName + ext).replace(/\\/g, "/")).exists) {
                    finalName = baseName + "_" + counter;
                    counter++;
                }
                nameCount[finalName] = 1;
                logMsg("Final Target File Name: " + finalName + ext);

                var success = safeSetOMFile(om, draftFolder, finalName + ext);
                logMsg("Initial OM File Assignment Success: " + success);

                createdItems.push({
                    rqItem: rqItem,
                    om: om,
                    draftFolder: draftFolder,
                    fileNameWithExt: finalName + ext
                });

                queued++;
            }

            if (queued > 0) setStatus("✓ Queued " + queued + " range(s) → " + draftFolder.fsName);
        } catch (e) {
            logMsg("Critical Error in Render Loop: " + e.message);
            setStatus("✗ Error: " + e.message);
        }

        app.endUndoGroup();
        logMsg("UndoGroup closed.");

        // Post-Undo Pass: Re-verify and re-apply OM file outside UndoGroup if AE reverted it
        logMsg("=== Starting Post-Undo OM File Re-verification Pass ===");
        var allVerified = true;
        for (var k = 0; k < createdItems.length; k++) {
            var ci = createdItems[k];
            logMsg("Post-Undo Check #" + (k + 1) + ": " + ci.fileNameWithExt);
            var currentFile = null;
            try { currentFile = ci.om.file; } catch (eCF) { }
            var currentName = currentFile ? decodeURIComponent(currentFile.name) : "(null)";
            logMsg("Current om.file name: " + currentName);

            if (currentName !== ci.fileNameWithExt) {
                logMsg("⚠ Reversion detected! Re-applying safeSetOMFile outside UndoGroup...");
                var reApplied = safeSetOMFile(ci.om, ci.draftFolder, ci.fileNameWithExt);
                logMsg("Re-apply result: " + reApplied);
                if (!reApplied) allVerified = false;
            } else {
                logMsg("✓ Verified om.file match.");
            }
        }

        logMsg("=== Batch Render Queue Prep Finished ===");

        if (!allVerified) {
            logMsg("WARNING: One or more Output Modules could not be assigned the custom name.");
            showLogDialog();
        }

        if (renderNow) {
            logMsg("Triggering app.project.renderQueue.render()...");
            try {
                app.project.renderQueue.render();
                logMsg("✓ app.project.renderQueue.render() completed successfully.");
                setStatus("✓ Render complete.");
            } catch (rErr) {
                logMsg("✗ Render Error: " + rErr.message);
                setStatus("✗ Render Error: " + rErr.message);
                showLogDialog();
            }
        }
    };

    // =========================================================================
    // --- INIT ---
    // =========================================================================

    autoSelectComp();

    // =========================================================================
    // --- RESIZE ---
    // =========================================================================

    win.onResizing = win.onResize = function () { this.layout.resize(); };

    if (!(win instanceof Panel)) {
        win.show();
    } else {
        win.layout.layout(true);
        win.layout.resize();
    }

})(this);
