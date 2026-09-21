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

        // --- ENSURE TOP VIDEO TRACK ---
        var vTracks = seq.videoTracks;
        var topVIdx = vTracks.numTracks - 1;
        if (topVIdx < 0) {
            return { success: false, message: "Active sequence has no video tracks." };
        }

        var topVTrack = vTracks[topVIdx];
        var needNewVTrack = (topVTrack.clips.numItems > 0);

        if (needNewVTrack) {
            try {
                app.enableQE();
                if (typeof qe !== "undefined" && qe.project) {
                    var qeSeq = qe.project.getActiveSequence();
                    if (qeSeq && qeSeq.addTracks) {
                        qeSeq.addTracks(1); // Adds 1 video track at top
                    }
                }
            } catch (eAddV) {}
            vTracks = seq.videoTracks;
            topVIdx = vTracks.numTracks - 1;
            topVTrack = vTracks[topVIdx];
        }

        // --- ENSURE AUDIO TRACK A3 (Index 2) ---
        while (seq.audioTracks.numTracks < 3) {
            try {
                app.enableQE();
                if (typeof qe !== "undefined" && qe.project) {
                    var qeSeqA = qe.project.getActiveSequence();
                    if (qeSeqA && qeSeqA.addTracks) {
                        qeSeqA.addTracks(0); // Adds audio track
                    }
                }
            } catch (eAddA) {
                break;
            }
        }

        if (seq.audioTracks.numTracks < 3) {
            return { success: false, message: "Sequence must have at least 3 audio tracks (A1, A2, A3)." };
        }

        var trackA3 = seq.audioTracks[2];
        var a3PushedToA4 = false;

        // Check if A3 is empty or not
        if (trackA3.clips.numItems > 0) {
            while (seq.audioTracks.numTracks < 4) {
                try {
                    app.enableQE();
                    if (typeof qe !== "undefined" && qe.project) {
                        var qeSeqA4 = qe.project.getActiveSequence();
                        if (qeSeqA4 && qeSeqA4.addTracks) {
                            qeSeqA4.addTracks(0);
                        }
                    }
                } catch (eAddA4) {
                    break;
                }
            }

            if (seq.audioTracks.numTracks >= 4) {
                var trackA4 = seq.audioTracks[3];

                var a3ClipsData = [];
                for (var c = 0; c < trackA3.clips.numItems; c++) {
                    var clipObj = trackA3.clips[c];
                    a3ClipsData.push({
                        clipRef: clipObj,
                        projectItem: clipObj.projectItem,
                        startSec: parseFloat(clipObj.start.seconds),
                        inPointTicks: clipObj.inPoint ? clipObj.inPoint.ticks : null,
                        outPointTicks: clipObj.outPoint ? clipObj.outPoint.ticks : null
                    });
                }

                for (var m = 0; m < a3ClipsData.length; m++) {
                    var cData = a3ClipsData[m];
                    if (cData.projectItem) {
                        for (var vi = 0; vi < seq.videoTracks.numTracks; vi++) seq.videoTracks[vi].setLocked(1);
                        for (var ai = 0; ai < seq.audioTracks.numTracks; ai++) seq.audioTracks[ai].setLocked(ai === 3 ? 0 : 1);

                        try {
                            trackA4.overwriteClip(cData.projectItem, cData.startSec);

                            for (var cl = 0; cl < trackA4.clips.numItems; cl++) {
                                var chkClip = trackA4.clips[cl];
                                if (Math.abs(parseFloat(chkClip.start.seconds) - cData.startSec) < 0.05) {
                                    if (cData.inPointTicks && chkClip.inPoint) {
                                        var nip = chkClip.inPoint;
                                        nip.ticks = cData.inPointTicks;
                                        chkClip.inPoint = nip;
                                    }
                                    if (cData.outPointTicks && chkClip.outPoint) {
                                        var nop = chkClip.outPoint;
                                        nop.ticks = cData.outPointTicks;
                                        chkClip.outPoint = nop;
                                    }
                                    break;
                                }
                            }
                        } catch (eMov) {}

                        try {
                            cData.clipRef.remove(false, false);
                        } catch (eDel) {}
                    }
                }
                a3PushedToA4 = true;
            }
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

            var clipStartTicks = zeroTicks + Math.round(item.startTimeSeconds * TICKS_PER_SECOND);
            var clipStartSec = clipStartTicks / TICKS_PER_SECOND;

            if (firstStartTicks === null || clipStartTicks < firstStartTicks) {
                firstStartTicks = clipStartTicks;
            }

            for (var v = 0; v < seq.videoTracks.numTracks; v++) {
                seq.videoTracks[v].setLocked(v === topVIdx ? 0 : 1);
            }
            for (var a = 0; a < seq.audioTracks.numTracks; a++) {
                seq.audioTracks[a].setLocked(a === 2 ? 0 : 1);
            }

            var placedOk = false;
            try {
                var timeObj = new Time();
                timeObj.seconds = clipStartSec;
                topVTrack.overwriteClip(pItem, timeObj);
                placedOk = true;
            } catch (eOvr1) {
                try {
                    topVTrack.overwriteClip(pItem, clipStartSec);
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

        var summary = "✓ Placed " + placedCount + " of " + timingItems.length + " footage clip(s) in active sequence!\n"
            + "• Video Track: V" + (topVIdx + 1) + (needNewVTrack ? " (New Top Track)" : " (Top Track)") + "\n"
            + "• Audio Track: A3" + (a3PushedToA4 ? " (Existing A3 clips pushed to A4)" : " (Clean placement)");

        return {
            success: true,
            placedCount: placedCount,
            totalCount: timingItems.length,
            videoTrack: "V" + (topVIdx + 1),
            audioTrack: "A3",
            a3PushedToA4: a3PushedToA4,
            message: summary
        };
    }
})();
