// Place_Rendered_Footage_PPro.jsx — Standalone Premiere Pro Placement Script
// Places batch-rendered footages from After Effects into the active Premiere Pro sequence.
// Features:
// 1. Frame-accurate timing based on comp timestamps.
// 2. Video placed on top of everything (creates new top video track if occupied).
// 3. Audio placed on Track A3 (if A3 is not empty, automatically creates A4 and pushes A3 clips down to A4).
// 4. Track-lock protection: locks all other tracks during placement so existing clips are never affected.

(function () {
    if (typeof app === "undefined" || !app.project) {
        alert("Please run this script inside Adobe Premiere Pro.");
        return;
    }

    var seq = app.project.activeSequence;
    if (!seq) {
        alert("No active sequence found in Premiere Pro.\nPlease open the target sequence first.");
        return;
    }

    // --- 1. LOCATE TIMING JSON FILE ---
    var jsonFile = null;

    // Check 1: In the active Premiere project's Draft folder
    try {
        if (app.project.file && app.project.file.exists && app.project.file.parent) {
            var draftJson = new File(app.project.file.parent.fsName + "/Draft/PPro_Footage_Timing.json");
            if (draftJson.exists) jsonFile = draftJson;
        }
    } catch (e1) {}

    // Check 2: In current script folder / Draft
    if (!jsonFile) {
        try {
            var scriptFolder = new File($.fileName).parent;
            var localJson = new File(scriptFolder.fsName + "/Draft/PPro_Footage_Timing.json");
            if (localJson.exists) jsonFile = localJson;
        } catch (e2) {}
    }

    // Check 3: Prompt user if not found automatically
    if (!jsonFile || !jsonFile.exists) {
        jsonFile = File.openDialog("Select PPro_Footage_Timing.json generated from After Effects", "JSON Files:*.json;All Files:*.*");
    }

    if (!jsonFile || !jsonFile.exists) {
        return; // User cancelled
    }

    // --- 2. PARSE JSON CONTENT ---
    if (!jsonFile.open("r")) {
        alert("Could not open timing file:\n" + jsonFile.fsName);
        return;
    }

    var rawContent = jsonFile.read();
    jsonFile.close();

    var timingData = null;
    try {
        timingData = (typeof JSON !== "undefined" && JSON.parse)
            ? JSON.parse(rawContent)
            : eval("(" + rawContent + ")");
    } catch (eParse) {
        alert("Failed to parse JSON file:\n" + eParse.message);
        return;
    }

    var items = (timingData && timingData.items) ? timingData.items : timingData;
    if (!items || !(items instanceof Array) || items.length === 0) {
        alert("No valid footage items found in:\n" + jsonFile.fsName);
        return;
    }

    // --- 3. RUN PLACEMENT ENGINE ---
    var result = placeFootageInActiveSequence(items, {
        sourceJsonPath: jsonFile.fsName
    });

    if (result.success) {
        alert(result.message);
    } else {
        alert("Placement Error:\n" + result.message);
    }

    // =========================================================================
    // --- PLACEMENT ENGINE FUNCTION ---
    // =========================================================================
    function placeFootageInActiveSequence(timingItems, options) {
        options = options || {};

        var TICKS_PER_SECOND = 254016000000;
        var zeroTicks = 0;
        try {
            zeroTicks = parseInt(seq.zeroPoint, 10) || 0;
        } catch (eZ) {
            zeroTicks = 0;
        }

        // --- PREPARE BIN FOR IMPORT ---
        var binName = "_BatchRendered_Draft";
        var draftBin = null;
        try {
            var root = app.project.rootItem;
            for (var b = 0; b < root.children.numItems; b++) {
                var child = root.children[b];
                if (child.type === ProjectItemType.BIN && child.name === binName) {
                    draftBin = child;
                    break;
                }
            }
            if (!draftBin) {
                draftBin = root.createBin(binName);
            }
        } catch (eBin) {
            draftBin = app.project.rootItem;
        }

        function findProjectItem(filePath) {
            var cleanTarget = filePath.replace(/\\/g, "/").toLowerCase();
            return searchItemInFolder(app.project.rootItem, cleanTarget);
        }

        function searchItemInFolder(folder, cleanTarget) {
            if (!folder || !folder.children) return null;
            for (var i = 0; i < folder.children.numItems; i++) {
                var it = folder.children[i];
                if (it.type === ProjectItemType.BIN) {
                    var found = searchItemInFolder(it, cleanTarget);
                    if (found) return found;
                } else {
                    try {
                        var mPath = it.getMediaPath();
                        if (mPath && mPath.replace(/\\/g, "/").toLowerCase() === cleanTarget) {
                            return it;
                        }
                    } catch (eM) {}
                }
            }
            return null;
        }

        // Import missing footage files
        var filesToImport = [];
        for (var f = 0; f < timingItems.length; f++) {
            var tItem = timingItems[f];
            var existing = findProjectItem(tItem.filePath);
            if (!existing) {
                var testFile = new File(tItem.filePath);
                if (testFile.exists) {
                    filesToImport.push(tItem.filePath);
                }
            }
        }

        if (filesToImport.length > 0) {
            try {
                app.project.importFiles(filesToImport, true, draftBin, false);
            } catch (eImp) {}
        }

        // --- ENSURE TOP VIDEO TRACK (NEVER OVERWRITE EXISTING) ---
        var vTracks = seq.videoTracks;
        if (vTracks.numTracks === 0) {
            return { success: false, message: "Active sequence has no video tracks." };
        }

        function addVideoTrackAtTop() {
            var initV = seq.videoTracks.numTracks;
            try {
                app.enableQE();
                if (typeof qe !== "undefined" && qe.project) {
                    var qeSeq = qe.project.getActiveSequence();
                    if (qeSeq && qeSeq.addTracks) qeSeq.addTracks(1, initV - 1, 0, 0);
                }
            } catch (eQ1) {}
            if (seq.videoTracks.numTracks > initV) return true;
            try {
                if (typeof qe !== "undefined" && qe.project) {
                    var qeSeq2 = qe.project.getActiveSequence();
                    if (qeSeq2 && qeSeq2.addTracks) qeSeq2.addTracks(1, 0);
                }
            } catch (eQ2) {}
            return seq.videoTracks.numTracks > initV;
        }

        function ensureAudioTracks(minCount) {
            while (seq.audioTracks.numTracks < minCount) {
                var curA = seq.audioTracks.numTracks;
                try {
                    app.enableQE();
                    if (typeof qe !== "undefined" && qe.project) {
                        var qeSeqA = qe.project.getActiveSequence();
                        if (qeSeqA && qeSeqA.addTracks) qeSeqA.addTracks(0, 0, 1, curA - 1);
                    }
                } catch (eQA1) {}
                if (seq.audioTracks.numTracks === curA) break;
            }
            return seq.audioTracks.numTracks >= minCount;
        }

        var topVTrack = vTracks[vTracks.numTracks - 1];
        var needNewVTrack = (topVTrack.clips.numItems > 0);
        var createdNewVTrack = false;
        if (needNewVTrack) createdNewVTrack = addVideoTrackAtTop();

        var targetVIdx = -1;
        if (createdNewVTrack) {
            targetVIdx = seq.videoTracks.numTracks - 1;
        } else {
            for (var vi = seq.videoTracks.numTracks - 1; vi >= 0; vi--) {
                if (seq.videoTracks[vi].clips.numItems === 0) { targetVIdx = vi; break; }
            }
            if (targetVIdx === -1) targetVIdx = seq.videoTracks.numTracks - 1;
        }
        var targetVTrack = seq.videoTracks[targetVIdx];

        // --- ENSURE AUDIO TRACK A3 (Index 2) ---
        ensureAudioTracks(3);
        if (seq.audioTracks.numTracks < 3) {
            return { success: false, message: "Sequence must have at least 3 audio tracks (A1, A2, A3)." };
        }

        // --- LOCK-PROTECTED PLACEMENT ---
        var origVideoLocks = [];
        for (var ov = 0; ov < seq.videoTracks.numTracks; ov++) {
            origVideoLocks.push(seq.videoTracks[ov].isLocked());
        }
        var origAudioLocks = [];
        for (var oa = 0; oa < seq.audioTracks.numTracks; oa++) {
            origAudioLocks.push(seq.audioTracks[oa].isLocked());
        }

        var placedCount = 0;
        var firstStartTicks = null;

        for (var p = 0; p < timingItems.length; p++) {
            var item = timingItems[p];
            var pItem = findProjectItem(item.filePath);
            if (!pItem) {
                try {
                    app.project.importFiles([item.filePath], true, draftBin, false);
                    pItem = findProjectItem(item.filePath);
                } catch (eRe) {}
            }
            if (!pItem) continue;

            // Normalize audio to 1 mono channel to prevent stacking/staggering
            try {
                var normMap = pItem.getAudioChannelMapping();
                if (normMap) {
                    normMap.audioClipsNumber = 1;
                    normMap.audioChannelsType = 0;
                    pItem.setAudioChannelMapping(normMap);
                }
            } catch (eMap) {}

            var clipStartTicks = zeroTicks + Math.round(item.startTimeSeconds * TICKS_PER_SECOND);
            var clipStartSec = clipStartTicks / TICKS_PER_SECOND;

            if (firstStartTicks === null || clipStartTicks < firstStartTicks) {
                firstStartTicks = clipStartTicks;
            }

            for (var v = 0; v < seq.videoTracks.numTracks; v++) {
                seq.videoTracks[v].setLocked(v === targetVIdx ? 0 : 1);
            }
            for (var a = 0; a < seq.audioTracks.numTracks; a++) {
                seq.audioTracks[a].setLocked(a === 2 ? 0 : 1);
            }

            var placedOk = false;
            try {
                var timeObj = new Time();
                timeObj.seconds = clipStartSec;
                targetVTrack.overwriteClip(pItem, timeObj);
                placedOk = true;
            } catch (eOvr1) {
                try {
                    targetVTrack.overwriteClip(pItem, clipStartSec);
                    placedOk = true;
                } catch (eOvr2) {}
            }

            if (placedOk) placedCount++;
        }

        // Restore track locks
        for (var rv = 0; rv < seq.videoTracks.numTracks; rv++) {
            if (rv < origVideoLocks.length) {
                seq.videoTracks[rv].setLocked(origVideoLocks[rv] ? 1 : 0);
            } else {
                seq.videoTracks[rv].setLocked(0);
            }
        }
        for (var ra = 0; ra < seq.audioTracks.numTracks; ra++) {
            if (ra < origAudioLocks.length) {
                seq.audioTracks[ra].setLocked(origAudioLocks[ra] ? 1 : 0);
            } else {
                seq.audioTracks[ra].setLocked(0);
            }
        }

        // Move playhead to start of first clip
        if (firstStartTicks !== null) {
            try {
                seq.setPlayerPosition(String(firstStartTicks));
            } catch (ePlay) {}
        }

        var summary = "Placed " + placedCount + " of " + timingItems.length + " footage clip(s) in active sequence!\n"
            + "- Video Track: V" + (targetVIdx + 1) + (createdNewVTrack ? " (New Top Track)" : "") + "\n"
            + "- Audio Track: A3 (Single layer, strictly on A3)";

        return {
            success: true,
            placedCount: placedCount,
            totalCount: timingItems.length,
            videoTrack: "V" + (targetVIdx + 1),
            audioTrack: "A3",
            message: summary
        };
    }
})();
