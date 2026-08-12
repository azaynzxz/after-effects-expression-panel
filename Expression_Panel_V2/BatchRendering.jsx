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
    var ranges = [];             // Array of { inFrame:int, outFrame:int, suffix:String }
    var pendingInFrame = null;   // integer frame number, waiting for Mark Out
    var pendingSuffix = "";      // Suffix captured during Mark In (e.g. from layer)
    var outputRootFolder = null; // Folder object — user-chosen root, or null for project default

    // =========================================================================
    // --- TIMECODE HELPERS (integer frame-based — no float precision loss) ---
    // =========================================================================

    function pad2(n) {
        return (n < 10 ? "0" : "") + Math.floor(n);
    }

    /**
     * Capture current playhead as integer frame number.
     */
    function captureFrame(comp) {
        return Math.round(comp.time * comp.frameRate);
    }

    /**
     * Convert integer frame number → "HH:MM:SS:FF" string.
     */
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

    /**
     * Convert "HH:MM:SS:FF" timecode → integer frame number.
     */
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

    /** Frame count → seconds for AE render queue */
    function frameToSeconds(frame, fps) {
        return frame / fps;
    }

    /** Get MM_SS from a frame number (formatted as MM_SS for target filename) */
    function getMMSS(frame, fps) {
        var fpsInt = Math.round(fps);
        var totalSec = Math.floor(frame / fpsInt);
        var mm = Math.floor(totalSec / 60);
        var ss = totalSec % 60;
        return pad2(mm) + "_" + pad2(ss);
    }

    /** Sanitize for filesystem — keep spaces and periods, remove illegal chars only */
    function sanitizePath(str) {
        if (!str) return "";
        return str.replace(/[\\\/\*\?"<>\|:]/g, "");
    }

    // =========================================================================
    // --- COMP LOOKUP ---
    // =========================================================================

    function findCompByName(name) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === name) return item;
        }
        return null;
    }

    function getAllComps() {
        var comps = [];
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) comps.push(item);
        }
        return comps;
    }

    /** Get active composition if available */
    function getActiveComp() {
        if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
            return app.project.activeItem;
        }
        return null;
    }

    /** Get project file's parent folder name (truncated to maxLen, default 20) */
    function getParentFolderName(maxLen) {
        var limit = (maxLen !== undefined) ? maxLen : 20;
        var name = "Untitled";
        try {
            var projFile = app.project.file;
            if (projFile && projFile.parent) name = projFile.parent.name;
        } catch (e) {}

        if (limit > 0 && name.length > limit) {
            name = name.substring(0, limit).replace(/[\s\._\-]+$/, "");
        }
        return name;
    }

    // =========================================================================
    // --- UI CONSTRUCTION (Redesigned matching annotation mockup) ---
    // =========================================================================

    // --- ROW 1: Header (Comp dropdown, refresh button, Mark In, Mark Out, Layer range) ---
    var headerRow = win.add("group");
    headerRow.orientation = "row";
    headerRow.alignChildren = ["left", "center"];
    headerRow.spacing = 4;

    var compDropdown = headerRow.add("dropdownlist", undefined, []);
    compDropdown.preferredSize = [140, 24];

    var btnRefresh = headerRow.add("button", undefined, "↻");
    btnRefresh.preferredSize = [24, 24];
    btnRefresh.helpTip = "Refresh comp list";

    var btnMarkIn = headerRow.add("button", undefined, "In");
    btnMarkIn.preferredSize = [50, 24];
    btnMarkIn.helpTip = "Mark In at playhead or selected layer start";

    var btnMarkOut = headerRow.add("button", undefined, "Out");
    btnMarkOut.preferredSize = [50, 24];
    btnMarkOut.helpTip = "Mark Out at playhead or selected layer end";

    var btnFromLayer = headerRow.add("button", undefined, "+ Layer");
    btnFromLayer.preferredSize = [60, 24];
    btnFromLayer.helpTip = "Add range(s) from currently selected layer(s)";

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
        for (var i = 0; i < comps.length; i++) compDropdown.add("item", comps[i].name);
        
        var active = getActiveComp();
        if (active) {
            for (var j = 0; j < compDropdown.items.length; j++) {
                if (compDropdown.items[j].text === active.name) {
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
            setTargetComp(getAllComps()[0]);
        }
        if (targetComp) {
            setStatus("Active comp: " + targetComp.name);
        } else {
            setStatus("No comps found in project.");
        }
    }

    function refreshOMTemplates(forceScan) {
        // If omDropdown is already populated and forceScan is not requested, keep existing selection
        if (!forceScan && omDropdown && omDropdown.items && omDropdown.items.length > 0) return;

        if (omDropdown) omDropdown.removeAll();
        var templates = [];

        try {
            var rq = app.project.renderQueue;
            // 1. Check existing items in render queue without adding new item
            if (rq && rq.numItems > 0) {
                try {
                    templates = rq.item(1).outputModule(1).templates;
                } catch (e1) {}
            }
            
            // 2. Only add dummy item if explicitly requested (forceScan) and queue is empty
            if ((!templates || templates.length === 0) && forceScan && targetComp) {
                var tempItem = rq.items.add(targetComp);
                templates = tempItem.outputModule(1).templates;
                tempItem.remove();
            }
        } catch (e) {}

        // Fallback standard templates list if dynamic scan was deferred
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

            // Priority search for EXACT 5 Mbps preset (must not match 15 Mbps, 25 Mbps, 50 Mbps)
            var found = false;
            var reg5Mbps = /(^|[^0-9])5\s*mb/i;
            for (var j = 0; j < omDropdown.items.length; j++) {
                var itemText = omDropdown.items[j].text;
                if (reg5Mbps.test(itemText)) {
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

    /** Apply output module template with smart fallback matching for 5 Mbps */
    function applyTemplateWithFallback(om, requestedTemplate) {
        if (!om) return false;

        // 1. Try exact requested template name
        if (requestedTemplate) {
            try {
                om.applyTemplate(requestedTemplate);
                return true;
            } catch (e1) {}
        }

        // 2. If exact name failed, search om.templates for exact 5 Mbps preset installed in AE
        try {
            var installed = om.templates;
            var reg5 = /(^|[^0-9])5\s*mb/i;

            for (var i = 0; i < installed.length; i++) {
                if (reg5.test(installed[i])) {
                    om.applyTemplate(installed[i]);
                    return true;
                }
            }

            // 3. Fallback to any H.264 template if 5 Mbps wasn't found
            for (var j = 0; j < installed.length; j++) {
                if (installed[j].indexOf("H.264") !== -1) {
                    om.applyTemplate(installed[j]);
                    return true;
                }
            }
        } catch (e2) {}

        return false;
    }

    function refreshRangeList() {
        rangeList.removeAll();
        if (!targetComp) return;
        var fps = targetComp.frameRate;
        var df = targetComp.dropFrame;
        for (var i = 0; i < ranges.length; i++) {
            var r = ranges[i];
            var durFrames = r.outFrame - r.inFrame;
            var item = rangeList.add("item", String(i + 1));
            item.subItems[0].text = frameToTimecode(r.inFrame, fps, df);
            item.subItems[1].text = frameToTimecode(r.outFrame, fps, df);
            item.subItems[2].text = frameToTimecode(durFrames > 0 ? durFrames : 0, fps, false);
            item.subItems[3].text = r.suffix || "";
        }
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
        var fps = targetComp.frameRate;
        var df = targetComp.dropFrame;
        editInField.text = frameToTimecode(r.inFrame, fps, df);
        editOutField.text = frameToTimecode(r.outFrame, fps, df);
        editSuffixField.text = r.suffix || "";
        updatePreview();
    }

    /** Build file path preview for selected row: RF_[Parent folder]_[MM_SS]_[Suffix] */
    function updatePreview() {
        var sel = rangeList.selection;
        if (sel === null || !targetComp) { previewLabel.text = "(select a range)"; return; }
        var item = (sel instanceof Array) ? sel[0] : sel;
        if (!item) return;
        var idx = item.index;
        if (idx < 0 || idx >= ranges.length) return;
        var r = ranges[idx];
        var fps = targetComp.frameRate;

        var parentName = sanitizePath(getParentFolderName());
        var mmss = getMMSS(r.inFrame, fps);
        var suffix = r.suffix ? "_" + sanitizePath(r.suffix) : "";
        var fileName = "RF_" + parentName + "_" + mmss + suffix + ".mp4";

        var rootPath = getOutputRoot();
        previewLabel.text = rootPath + "\\Draft\\" + fileName;
    }

    function getOutputRoot() {
        if (outputRootFolder) return outputRootFolder.fsName;
        try {
            var projFile = app.project.file;
            if (projFile) return projFile.parent.fsName;
        } catch (e) {}
        return Folder.desktop.fsName;
    }

    /** Add range(s) directly from selected layer(s) in active/target comp */
    function addRangesFromSelectedLayers() {
        if (!targetComp) { setStatus("⚠ No target comp selected."); return false; }
        var selLayers = targetComp.selectedLayers;
        if (!selLayers || selLayers.length === 0) return false;

        var fps = targetComp.frameRate;
        var df = targetComp.dropFrame;

        for (var i = 0; i < selLayers.length; i++) {
            var layer = selLayers[i];
            var inF = Math.round(layer.inPoint * fps);
            var outF = Math.round(layer.outPoint * fps);
            var layerSuffix = sanitizePath(layer.name);
            ranges.push({ inFrame: inF, outFrame: outF, suffix: layerSuffix });
        }

        refreshRangeList();
        setStatus("✓ Added " + selLayers.length + " range(s) from selected layer(s).");
        return true;
    }

    // =========================================================================
    // --- EVENT HANDLERS ---
    // =========================================================================

    btnRefresh.onClick = function () { autoSelectComp(); };

    compDropdown.onChange = function () {
        if (compDropdown.selection === null) return;
        var comp = findCompByName(compDropdown.selection.text);
        if (comp) { setTargetComp(comp); setStatus("Target: " + comp.name); }
    };

    btnMarkIn.onClick = function () {
        if (!targetComp) { setStatus("⚠ No comp selected."); return; }
        
        var selLayers = targetComp.selectedLayers;
        if (selLayers && selLayers.length > 0) {
            var layer = selLayers[0];
            pendingInFrame = Math.round(layer.inPoint * targetComp.frameRate);
            pendingSuffix = layer.name;
            var tc = frameToTimecode(pendingInFrame, targetComp.frameRate, targetComp.dropFrame);
            pendingLabel.text = "In: " + tc + " (layer: " + layer.name + ") — click Out";
            setStatus("In marked at " + tc + " from layer '" + layer.name + "'");
        } else {
            pendingInFrame = captureFrame(targetComp);
            pendingSuffix = "";
            var tc2 = frameToTimecode(pendingInFrame, targetComp.frameRate, targetComp.dropFrame);
            pendingLabel.text = "In: " + tc2 + " — click Out";
            setStatus("In marked at " + tc2);
        }
    };

    btnMarkOut.onClick = function () {
        if (!targetComp) { setStatus("⚠ No comp selected."); return; }
        
        var fps = targetComp.frameRate;
        var df = targetComp.dropFrame;
        var selLayers = targetComp.selectedLayers;

        if (pendingInFrame !== null) {
            var outFrame = captureFrame(targetComp);
            var sfx = pendingSuffix;

            if (selLayers && selLayers.length > 0) {
                outFrame = Math.round(selLayers[0].outPoint * fps);
                if (!sfx) sfx = selLayers[0].name;
            }

            ranges.push({ inFrame: pendingInFrame, outFrame: outFrame, suffix: sanitizePath(sfx) });
            pendingInFrame = null;
            pendingSuffix = "";
            pendingLabel.text = "";
            refreshRangeList();
            setStatus("Range #" + ranges.length + " added.");
        } else {
            // If Mark In wasn't pressed, try adding range directly from selected layer
            if (!addRangesFromSelectedLayers()) {
                setStatus("⚠ Mark In first, or select a layer in the timeline.");
            }
        }
    };

    btnFromLayer.onClick = function () {
        if (!addRangesFromSelectedLayers()) {
            setStatus("⚠ No layer selected in target comp.");
        }
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
                if (editInField.text !== "") ranges[idx].inFrame = timecodeToFrame(editInField.text, fps, df);
                if (editOutField.text !== "") ranges[idx].outFrame = timecodeToFrame(editOutField.text, fps, df);
                ranges[idx].suffix = editSuffixField.text;
            }
        }

        refreshRangeList();

        // Restore selection
        var newSel = [];
        for (var m = 0; m < items.length; m++) {
            if (items[m].index < rangeList.items.length) {
                newSel.push(items[m].index);
            }
        }
        if (newSel.length > 0) rangeList.selection = newSel;

        setStatus("✓ Updated " + items.length + " range(s).");
    };

    btnDeleteRow.onClick = function () {
        var sel = rangeList.selection;
        if (sel === null) { setStatus("⚠ Select range(s) to delete."); return; }

        if (sel instanceof Array) {
            var indices = [];
            for (var i = 0; i < sel.length; i++) indices.push(sel[i].index);
            indices.sort(function (a, b) { return b - a; });
            for (var j = 0; j < indices.length; j++) {
                ranges.splice(indices[j], 1);
            }
            setStatus("Deleted " + indices.length + " range(s).");
        } else {
            ranges.splice(sel.index, 1);
            setStatus("Deleted 1 range.");
        }
        refreshRangeList();
    };

    btnClearAll.onClick = function () {
        ranges = [];
        pendingInFrame = null;
        pendingSuffix = "";
        pendingLabel.text = "";
        editInField.text = ""; editOutField.text = ""; editSuffixField.text = "";
        refreshRangeList();
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
        if (!targetComp) { setStatus("⚠ No comp selected."); return; }
        if (ranges.length === 0) { setStatus("⚠ No ranges. Mark In/Out or add layers first."); return; }

        var fps = targetComp.frameRate;

        // Build output folder: {root}/Draft/
        var rootPath = getOutputRoot();
        var draftFolder = new Folder(rootPath + "/Draft");
        if (!draftFolder.exists) {
            var created = draftFolder.create();
            if (!created) {
                try {
                    var projFile = app.project.file;
                    if (projFile) rootPath = projFile.parent.fsName;
                    else rootPath = Folder.desktop.fsName;
                } catch (e) { rootPath = Folder.desktop.fsName; }
                draftFolder = new Folder(rootPath + "/Draft");
                draftFolder.create();
                setStatus("⚠ Fallback folder: " + rootPath);
            }
        }

        var templateName = (omDropdown.selection !== null) ? omDropdown.selection.text : null;
        var parentName = sanitizePath(getParentFolderName());

        // Track names for duplicate detection
        var nameCount = {};

        app.beginUndoGroup("Batch Rendering — " + ranges.length + " ranges");

        try {
            var rq = app.project.renderQueue;
            var queued = 0;

            for (var i = 0; i < ranges.length; i++) {
                var r = ranges[i];
                var durFrames = r.outFrame - r.inFrame;
                if (durFrames <= 0) continue;

                var rqItem = rq.items.add(targetComp);
                rqItem.timeSpanStart = frameToSeconds(r.inFrame, fps);
                rqItem.timeSpanDuration = frameToSeconds(durFrames, fps);

                // Build filename: RF_{parentFolder}_{MM_SS}{suffix}
                var mmss = getMMSS(r.inFrame, fps);
                var suffix = r.suffix ? "_" + sanitizePath(r.suffix) : "";
                var baseName = "RF_" + parentName + "_" + mmss + suffix;

                // Handle duplicate names
                if (nameCount[baseName] !== undefined) {
                    nameCount[baseName]++;
                    baseName = baseName + "_" + nameCount[baseName];
                } else {
                    nameCount[baseName] = 1;
                }

                var om = rqItem.outputModule(1);
                applyTemplateWithFallback(om, templateName);

                // Extract extension from output module's template file (e.g. ".mp4", ".mov")
                var ext = ".mp4";
                try {
                    if (om.file && om.file.name) {
                        var defaultFileName = om.file.name;
                        var dotIndex = defaultFileName.lastIndexOf(".");
                        if (dotIndex !== -1) {
                            ext = defaultFileName.substring(dotIndex);
                        }
                    }
                } catch (eExt) {}

                var outputFile = new File(draftFolder.fsName + "\\" + baseName + ext);
                om.file = outputFile;
                queued++;
            }

            setStatus("✓ Queued " + queued + " range(s) → " + draftFolder.fsName);

            if (cbRenderNow.value) {
                rq.render();
                setStatus("✓ Render complete.");
            }
        } catch (e) {
            setStatus("✗ Error: " + e.message);
        }

        app.endUndoGroup();
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
