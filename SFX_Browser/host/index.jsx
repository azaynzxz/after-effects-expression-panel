/**
 * SFX Browser — ExtendScript Backend (Premiere Pro)
 * Scans the project for audio files and inserts them at the playhead.
 */

// ─── Scan Project for Audio Files ──────────────────────────────────────────────

function getAudioItems() {
    var results = [];
    var root = app.project.rootItem;
    scanFolder(root, "", results);
    return JSON.stringify(results);
}

function scanFolder(folder, parentPath, results) {
    for (var i = 0; i < folder.children.numItems; i++) {
        var item = folder.children[i];

        if (item.type === ProjectItemType.BIN) {
            var binPath = parentPath ? (parentPath + "/" + item.name) : item.name;
            scanFolder(item, binPath, results);
        } else if (item.type === ProjectItemType.FILE || item.type === ProjectItemType.CLIP) {
            if (isAudioFile(item)) {
                results.push({
                    name: item.name,
                    treePath: item.treePath,
                    binPath: parentPath || "root"
                });
            }
        }
    }
}

function isAudioFile(item) {
    try {
        if (item.mediaType && item.mediaType.toLowerCase() === "audio") {
            return true;
        }
    } catch (e) { }

    var name = item.name.toLowerCase();
    var audioExts = [".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac", ".aiff", ".aif", ".wma", ".mpeg", ".mpga", ".mp2"];
    for (var i = 0; i < audioExts.length; i++) {
        if (name.indexOf(audioExts[i], name.length - audioExts[i].length) !== -1) {
            return true;
        }
    }
    return false;
}

// ─── Get Media File Path ───────────────────────────────────────────────────────

function getMediaPath(treePath) {
    var item = findItemByTreePath(treePath);
    if (item) {
        try {
            return item.getMediaPath();
        } catch (e) {
            return null;
        }
    }
    return null;
}

// ─── Insert Audio at Playhead (with auto-track if overlap) ─────────────────────

function insertAudioAtPlayhead(treePath, trackIdx, silenceOffset) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "ERROR: No active sequence";
        }

        var projectItem = findItemByTreePath(treePath);
        if (!projectItem) {
            return "ERROR: Could not find item: " + treePath;
        }

        var playheadTime = seq.getPlayerPosition();
        var playheadSec = ticksToSeconds(playheadTime.ticks);

        // Find a free track starting from the preferred trackIdx
        var usedTrack = findFreeAudioTrack(seq, trackIdx, playheadSec);
        if (usedTrack === -1) {
            return "ERROR: No free audio track available at playhead";
        }

        var targetTrack = seq.audioTracks[usedTrack];

        // Insert clip at playhead
        targetTrack.insertClip(projectItem, playheadTime);

        // Apply silence trim if offset > 0
        if (silenceOffset && silenceOffset > 0) {
            trimClipStart(targetTrack, playheadTime, silenceOffset);
        }

        var trackLabel = "A" + (usedTrack + 1);
        return "OK|" + trackLabel;

    } catch (e) {
        return "ERROR: " + e.message;
    }
}

// ─── Find free audio track (no overlap at playhead) ────────────────────────────

function findFreeAudioTrack(seq, preferredIdx, playheadSec) {
    // Try the preferred track first
    if (preferredIdx >= 0 && preferredIdx < seq.audioTracks.numTracks) {
        if (!hasClipAtTime(seq.audioTracks[preferredIdx], playheadSec)) {
            return preferredIdx;
        }
    }

    // Preferred track is occupied — scan all tracks from preferredIdx onward
    for (var t = preferredIdx + 1; t < seq.audioTracks.numTracks; t++) {
        if (!hasClipAtTime(seq.audioTracks[t], playheadSec)) {
            return t;
        }
    }

    // Also try tracks before preferredIdx (wrap around)
    for (var t = 0; t < preferredIdx; t++) {
        if (!hasClipAtTime(seq.audioTracks[t], playheadSec)) {
            return t;
        }
    }

    // All tracks occupied — return preferred anyway (will overlay)
    return preferredIdx;
}

function hasClipAtTime(track, timeSec) {
    var clips = track.clips;
    for (var i = 0; i < clips.numItems; i++) {
        var clip = clips[i];
        var clipStart = ticksToSeconds(clip.start.ticks);
        var clipEnd = ticksToSeconds(clip.end.ticks);

        // Check if playhead falls within this clip's range
        if (timeSec >= clipStart && timeSec < clipEnd) {
            return true;
        }
    }
    return false;
}

// ─── Trim silence from inserted clip ───────────────────────────────────────────

function trimClipStart(track, insertTime, silenceOffset) {
    try {
        var clips = track.clips;
        var targetClip = null;
        var insertTimeSec = ticksToSeconds(insertTime.ticks);

        for (var i = 0; i < clips.numItems; i++) {
            var clip = clips[i];
            var clipStartSec = ticksToSeconds(clip.start.ticks);

            if (Math.abs(clipStartSec - insertTimeSec) < 0.05) {
                targetClip = clip;
                break;
            }
        }

        if (!targetClip) return;

        var currentInTicks = parseInt(targetClip.inPoint.ticks);
        var offsetTicks = Math.round(silenceOffset * TICKS_PER_SECOND);
        var newInTicks = currentInTicks + offsetTicks;

        var newInPoint = targetClip.inPoint;
        newInPoint.ticks = String(newInTicks);
        targetClip.inPoint = newInPoint;

    } catch (e) {
        // Silence trimming is best-effort
    }
}

// ─── Audio Gain ────────────────────────────────────────────────────────────────

function setAudioGain(linearValue) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "ERROR: No active sequence";
        }

        var count = 0;

        // Apply to selected clips across all audio tracks
        for (var t = 0; t < seq.audioTracks.numTracks; t++) {
            var track = seq.audioTracks[t];
            var clips = track.clips;

            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                if (clip.isSelected()) {
                    try {
                        // Get the audio component
                        var components = clip.components;
                        for (var i = 0; i < components.numItems; i++) {
                            var comp = components[i];
                            // Look for "Volume" component
                            if (comp.displayName === "Volume") {
                                var props = comp.properties;
                                for (var p = 0; p < props.numItems; p++) {
                                    var prop = props[p];
                                    if (prop.displayName === "Level") {
                                        // linearValue is pre-computed in frontend
                                        // 0dB = 1.0, -6dB ≈ 0.5, +6dB ≈ 2.0
                                        prop.setValue(linearValue, true);
                                        count++;
                                    }
                                }
                            }
                        }
                    } catch (clipErr) {
                        // Skip clips that can't be modified
                    }
                }
            }
        }

        if (count > 0) {
            return "OK|" + count;
        } else {
            return "ERROR: No selected audio clips found";
        }

    } catch (e) {
        return "ERROR: " + e.message;
    }
}

// ─── Find project item by treePath ─────────────────────────────────────────────

function findItemByTreePath(treePath) {
    return searchTreePath(app.project.rootItem, treePath);
}

function searchTreePath(folder, treePath) {
    for (var i = 0; i < folder.children.numItems; i++) {
        var item = folder.children[i];
        if (item.treePath === treePath) {
            return item;
        }
        if (item.type === ProjectItemType.BIN) {
            var found = searchTreePath(item, treePath);
            if (found) return found;
        }
    }
    return null;
}

// ─── Tick Conversion ───────────────────────────────────────────────────────────

var TICKS_PER_SECOND = 254016000000;

function ticksToSeconds(ticks) {
    return parseInt(ticks) / TICKS_PER_SECOND;
}
