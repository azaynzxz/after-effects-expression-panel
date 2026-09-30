/**
 * SFX Browser — Frontend Logic
 * Supports:
 * - Scanned project audio files with favorites & live search
 * - Row click: Directly adds audio to timeline at playhead (native behavior restored)
 * - Play button click: Previews audio in docked player with programmatic waveform
 * - Direct horizontal drag-to-select range (cut segment) on audio waveform
 * - Accurate segment drag-and-drop to timeline (sliced WAV via ffmpeg ensures exact cut on timeline)
 * - Accurate segment insert at playhead ("Place Range at Playhead")
 * - Interactive player scrubber slider & smooth 60fps tracking
 * - "Paste Timeline" functionality to auto-create guided music markers in Premiere Pro
 * - Silence auto-trimming via ffmpeg
 * - Microphone recording
 */

var cs = new CSInterface();
var cachedItems = []; // Full list from ExtendScript
var sortAsc = true;   // Current sort direction

var favorites = JSON.parse(localStorage.getItem('sfx_favorites') || '[]');

// Node.js modules
var childProcess = null;
var path = null;
var fs = null;
try {
    childProcess = require('child_process');
    path = require('path');
    fs = require('fs');
} catch (e) {
    console.warn('Node.js modules not accessible:', e);
}

// ─── Clean Inline Vector SVG Icons (Zero Emojis!) ──────────────────────────────

var ICON_PLAY = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
var ICON_PAUSE = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
var ICON_STOP = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="1.5"/></svg>';
var ICON_STAR_OUTLINE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
var ICON_STAR_FILLED = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#ffc107" stroke="#ffc107" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
var ICON_NOTE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
var VOL_ICON_HIGH = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
var VOL_ICON_MUTED = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

// ─── Favorites Management ──────────────────────────────────────────────────────

function getFavKey(itemOrKey) {
    if (!itemOrKey) return '';
    if (typeof itemOrKey === 'object') {
        return itemOrKey.treePath || itemOrKey.nodeId || itemOrKey.mediaPath || itemOrKey.name || '';
    }
    return String(itemOrKey);
}

function isFavorite(key) {
    return favorites.indexOf(key) !== -1;
}

function toggleFavorite(key, btnElement) {
    var idx = favorites.indexOf(key);
    if (idx !== -1) {
        favorites.splice(idx, 1);
        if (btnElement) {
            btnElement.classList.remove('active');
            btnElement.innerHTML = ICON_STAR_OUTLINE;
        }
    } else {
        favorites.push(key);
        if (btnElement) {
            btnElement.classList.add('active');
            btnElement.innerHTML = ICON_STAR_FILLED;
        }
    }
    localStorage.setItem('sfx_favorites', JSON.stringify(favorites));
}

// ─── Refresh: Scan Project for Audio Files ─────────────────────────────────────

function scanProjectAudio() {
    setStatus('Scanning project for audio files…');

    var extRoot = cs.getSystemPath(SystemPath.EXTENSION);
    var hostPath = (extRoot + '/host/index.jsx').replace(/\\/g, '/');
    var loadCmd = 'try { $.evalFile(new File("' + hostPath + '")); } catch(eEval) {}; getAudioItems()';

    cs.evalScript(loadCmd, function (result) {
        try {
            if (!result || result === 'undefined' || result === 'null') {
                cachedItems = [];
                renderList([]);
                setStatus('No response from Premiere Pro. Is a project open?', 'error');
                return;
            }
            if (result === 'EvalScript error.') {
                cachedItems = [];
                renderList([]);
                setStatus('ExtendScript error executing getAudioItems(). Check host console.', 'error');
                return;
            }
            var parsed = JSON.parse(result);
            if (parsed && parsed.error) {
                cachedItems = [];
                renderList([]);
                setStatus(parsed.error, 'error');
                return;
            }
            if (!Array.isArray(parsed)) {
                cachedItems = [];
                renderList([]);
                setStatus('Unexpected response: ' + String(result).substring(0, 60), 'error');
                return;
            }
            cachedItems = parsed;
            applyFilter();
            if (cachedItems.length === 0) {
                setStatus('Scan completed: 0 audio files found in project panel.', 'warning');
            } else {
                setStatus('Found ' + cachedItems.length + ' audio file(s)', 'success');
            }
        } catch (e) {
            cachedItems = [];
            renderList([]);
            setStatus('Parse error: ' + e.message, 'error');
        }
    });
}

document.getElementById('refreshBtn').addEventListener('click', function () {
    scanProjectAudio();
});

// ─── Live Search Filter & Sorting ──────────────────────────────────────────────

document.getElementById('searchInput').addEventListener('input', function () {
    applyFilter();
});

document.getElementById('sortBtn').addEventListener('click', function () {
    sortAsc = !sortAsc;
    this.innerText = sortAsc ? 'A-Z' : 'Z-A';
    applyFilter();
});

function applyFilter() {
    var q = document.getElementById('searchInput').value.toLowerCase().trim();
    var filtered = [];

    if (!q) {
        filtered = cachedItems.slice();
    } else {
        for (var i = 0; i < cachedItems.length; i++) {
            var it = cachedItems[i];
            var nameMatch = it.name && it.name.toLowerCase().indexOf(q) !== -1;
            var binMatch = it.binPath && it.binPath.toLowerCase().indexOf(q) !== -1;
            if (nameMatch || binMatch) {
                filtered.push(it);
            }
        }
    }

    filtered.sort(function (a, b) {
        var aFav = isFavorite(getFavKey(a));
        var bFav = isFavorite(getFavKey(b));
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;

        var aName = a.name || '';
        var bName = b.name || '';
        var diff = aName.toLowerCase().localeCompare(bName.toLowerCase());
        return sortAsc ? diff : -diff;
    });

    renderList(filtered);
}

// ─── Render Audio List ─────────────────────────────────────────────────────────

function renderList(items) {
    var container = document.getElementById('audioList');
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-msg">No audio files match</div>';
        return;
    }

    for (var i = 0; i < items.length; i++) {
        (function (item) {
            var div = document.createElement('div');
            div.className = 'list-item';
            div.draggable = true;
            div.dataset.treePath = item.treePath;

            var favKey = getFavKey(item);
            var favActive = isFavorite(favKey);
            var isCurrentPlaying = (activeTrackItem && activeTrackItem.treePath === item.treePath && currentAudio && !currentAudio.paused);

            if (isCurrentPlaying) {
                div.classList.add('is-playing');
            }

            div.innerHTML =
                '<div class="icon-box">' +
                '  <span class="icon">' + ICON_NOTE + '</span>' +
                '  <div class="eq-bars"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></div>' +
                '</div>' +
                '<span class="name" title="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) + '</span>' +
                '<span class="path">' + escapeHtml(item.binPath || '') + '</span>' +
                '<div class="actions">' +
                '  <button class="action-btn play ' + (isCurrentPlaying ? 'playing' : '') + '" title="Preview / Play Waveform">' + (isCurrentPlaying ? ICON_STOP : ICON_PLAY) + '</button>' +
                '  <button class="action-btn star ' + (favActive ? 'active' : '') + '" title="Favorite">' + (favActive ? ICON_STAR_FILLED : ICON_STAR_OUTLINE) + '</button>' +
                '</div>' +
                '<div class="item-progress-fill"></div>';

            div.addEventListener('dragstart', function (e) {
                var nativePath = (item.mediaPath || '').replace(/\//g, '\\');
                if (nativePath) {
                    e.dataTransfer.setData('com.adobe.cep.dnd.file.0', nativePath);
                    e.dataTransfer.setData('text/plain', nativePath);
                    setStatus('Dragging "' + item.name + '" to timeline…');
                }
            });

            div.addEventListener('click', function (e) {
                // If Play button clicked: ONLY play/preview audio
                if (e.target.closest('.play')) {
                    e.stopPropagation();
                    togglePlayTrack(item, div.querySelector('.action-btn.play'), div);
                    return;
                }
                // If Star button clicked: toggle favorite
                if (e.target.closest('.star')) {
                    e.stopPropagation();
                    toggleFavorite(favKey, div.querySelector('.action-btn.star'));
                    return;
                }
                // Clicking anywhere else on row: DIRECTLY INSERT TO TIMELINE
                insertItem(item);
            });

            container.appendChild(div);
        })(items[i]);
    }
}

// ─── FFmpeg Audio Slicing for Exact Segment Drops & Inserts ───────────────────

function createAudioSlice(sourcePath, inSec, outSec, baseName) {
    if (!childProcess || !fs || !sourcePath) return sourcePath;
    var ffmpegCmd = findFfmpeg();
    if (!ffmpegCmd) return sourcePath;

    try {
        var tempDir = path.join(require('os').tmpdir(), 'sfx_cuts');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        var cleanName = (baseName || 'audio')
            .replace(/[^\w\d-_.]/g, '_')
            .substring(0, 30);
        var inStr = inSec.toFixed(2).replace('.', '_');
        var outStr = outSec.toFixed(2).replace('.', '_');
        var sliceFileName = cleanName + '_cut_' + inStr + '-' + outStr + '.wav';
        var sliceFilePath = path.join(tempDir, sliceFileName);

        // Check if slice already exists and is non-empty
        if (fs.existsSync(sliceFilePath) && fs.statSync(sliceFilePath).size > 1000) {
            return sliceFilePath;
        }

        var cleanSrc = sourcePath.replace(/\//g, '\\');
        var cmd = ffmpegCmd + ' -y -ss ' + inSec.toFixed(3) + ' -to ' + outSec.toFixed(3) +
            ' -i "' + cleanSrc + '" -c:a pcm_s16le "' + sliceFilePath + '"';

        childProcess.execSync(cmd, { timeout: 8000, stdio: 'pipe' });

        if (fs.existsSync(sliceFilePath) && fs.statSync(sliceFilePath).size > 100) {
            return sliceFilePath;
        }
    } catch (e) {
        console.warn('Audio slice creation failed:', e);
    }

    return sourcePath;
}

// ─── Insert Audio at Playhead ──────────────────────────────────────────────────

function insertItem(item) {
    if (!item) return;
    var trackIndex = document.getElementById('trackSelect').value;
    var autoTrim = document.getElementById('autoTrimCheck').checked;
    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);

    // If marked range is active for the current track, place the marked cut segment!
    if (activeTrackItem && activeTrackItem.treePath === item.treePath && isRangeActive && rangeOut > rangeIn && (rangeIn > 0.02 || (dur > 0 && rangeOut < dur - 0.05))) {
        var segDur = rangeOut - rangeIn;
        var mediaSrc = item.mediaPath || '';
        var sliced = createAudioSlice(mediaSrc, rangeIn, rangeOut, item.name);

        if (sliced && fs && fs.existsSync(sliced)) {
            setStatus('Placing cut segment (' + segDur.toFixed(2) + 's)…');
            var script = 'importAndPlaceAudioFile(' + JSON.stringify(sliced.replace(/\\/g, '/')) + ', ' + trackIndex + ')';
            cs.evalScript(script, function (res) {
                if (res && res.indexOf('ERROR') === 0) {
                    setStatus(res, 'error');
                } else {
                    var parts = res ? res.split('|') : [];
                    var trackLabel = parts.length > 1 ? parts[1] : 'A' + (parseInt(trackIndex) + 1);
                    setStatus('Placed marked segment on ' + trackLabel + ' (' + segDur.toFixed(2) + 's)', 'success');
                }
            });
            return;
        }
    }

    setStatus('Inserting "' + item.name + '"…');

    if (autoTrim) {
        if (item.mediaPath && item.mediaPath.length > 2) {
            var silenceOffset = detectSilence(item.mediaPath);
            if (silenceOffset > 0) {
                setStatus('Silence offset: ' + silenceOffset.toFixed(3) + 's — inserting…');
            }
            doInsert(item, trackIndex, silenceOffset);
        } else {
            var lookupScript = 'getMediaPath(' + JSON.stringify(item.treePath || '') + ', ' + JSON.stringify(item.nodeId || '') + ', ' + JSON.stringify(item.mediaPath || '') + ')';
            cs.evalScript(lookupScript, function (filePath) {
                var cleanPath = (filePath && filePath !== 'undefined' && filePath !== 'null') ? filePath.replace(/"/g, '') : '';
                var silenceOffset = cleanPath ? detectSilence(cleanPath) : 0;
                doInsert(item, trackIndex, silenceOffset);
            });
        }
    } else {
        doInsert(item, trackIndex, 0);
    }
}

function doInsert(item, trackIndex, silenceOffset) {
    var treePath = item.treePath || '';
    var nodeId = item.nodeId || '';
    var mediaPath = item.mediaPath || '';
    var script = 'insertAudioAtPlayhead(' +
        JSON.stringify(treePath) + ', ' +
        trackIndex + ', ' +
        silenceOffset + ', ' +
        JSON.stringify(nodeId) + ', ' +
        JSON.stringify(mediaPath) + ')';

    cs.evalScript(script, function (result) {
        if (result && result.indexOf('ERROR') === 0) {
            setStatus(result, 'error');
        } else {
            var parts = result ? result.split('|') : [];
            var trackLabel = parts.length > 1 ? parts[1] : 'A' + (parseInt(trackIndex) + 1);
            var trimMsg = silenceOffset > 0 ? ' (trimmed ' + silenceOffset.toFixed(2) + 's)' : '';
            setStatus('Inserted on ' + trackLabel + trimMsg, 'success');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── AUDIO ENGINE, WAVEFORM GENERATION & PLAYER DOCK ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

var currentAudio = null;
var activeTrackItem = null;
var activeListItemEl = null;
var activePlayBtn = null;

var audioCtx = null;
var waveformCache = {};
var currentPeaks = [];
var currentDuration = 0;
var isLooping = false;
var playerVolume = parseFloat(localStorage.getItem('sfx_volume') || '0.7');
var isUserDraggingSlider = false;
var playbackRafId = null;

// Range Selection State (Cut Segment on Waveform)
var rangeIn = 0;
var rangeOut = 0;
var isRangeActive = false;
var waveformDragMode = null; // null | 'createRange' | 'inHandle' | 'outHandle'
var dragStartX = 0;
var dragStartTime = 0;

var $playerDock = document.getElementById('activePlayerDock');
var $dockTrackName = document.getElementById('dockTrackName');
var $dockCurrentTime = document.getElementById('dockCurrentTime');
var $dockDuration = document.getElementById('dockDuration');
var $dockTimeBadge = document.getElementById('dockTimeBadge');
var $dockPlayPauseBtn = document.getElementById('dockPlayPauseBtn');
var $dockStopBtn = document.getElementById('dockStopBtn');
var $dockLoopBtn = document.getElementById('dockLoopBtn');
var $dockBack5Btn = document.getElementById('dockBack5Btn');
var $dockFwd5Btn = document.getElementById('dockFwd5Btn');
var $dockMuteBtn = document.getElementById('dockMuteBtn');
var $dockVolume = document.getElementById('dockVolume');
var $dockSlider = document.getElementById('dockSlider');
var $dockInsertBtn = document.getElementById('dockInsertBtn');
var $dockInsertText = document.getElementById('dockInsertText');
var $dockCloseBtn = document.getElementById('dockCloseBtn');
var $dockDragBtn = document.getElementById('dockDragBtn');
var $dockDragText = document.getElementById('dockDragText');

var $waveformWrapper = document.getElementById('waveformWrapper');
var $waveformCanvas = document.getElementById('waveformCanvas');
var $waveformLoading = document.getElementById('waveformLoading');
var $waveformHoverLine = document.getElementById('waveformHoverLine');
var $waveformTooltip = document.getElementById('waveformTooltip');

// Initialize volume slider
if ($dockVolume) {
    $dockVolume.value = playerVolume;
}

function updateVolumeIcon() {
    if ($dockMuteBtn) {
        $dockMuteBtn.innerHTML = playerVolume === 0 ? VOL_ICON_MUTED : VOL_ICON_HIGH;
    }
}
updateVolumeIcon();

function getAudioContext() {
    if (!audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// ─── Toggle Play Track (PREVIEW ONLY) ──────────────────────────────────────────

function togglePlayTrack(item, btnElement, listItemElement) {
    if (activeTrackItem && activeTrackItem.treePath === item.treePath && currentAudio) {
        if (!currentAudio.paused) {
            pausePlayback();
        } else {
            resumePlayback();
        }
        return;
    }

    stopPlayback();

    activeTrackItem = item;
    activeListItemEl = listItemElement;
    activePlayBtn = btnElement;

    rangeIn = 0;
    rangeOut = 0;
    isRangeActive = false;
    updateRangeUI();

    updateListItemsPlayingState(item.treePath);

    $playerDock.style.display = 'flex';
    $dockTrackName.textContent = item.name;
    $dockTrackName.title = item.name;
    $dockCurrentTime.textContent = '00:00';
    $dockDuration.textContent = '--:--';
    $dockSlider.value = 0;
    $dockPlayPauseBtn.innerHTML = ICON_PLAY;

    setStatus('Loading "' + item.name + '"…');

    if (item.mediaPath && item.mediaPath.length > 2) {
        startAudioWithWaveform(item, item.mediaPath);
    } else {
        var lookupScript = 'getMediaPath(' + JSON.stringify(item.treePath || '') + ', ' + JSON.stringify(item.nodeId || '') + ', ' + JSON.stringify(item.mediaPath || '') + ')';
        cs.evalScript(lookupScript, function (filePath) {
            if (!filePath || filePath === 'undefined' || filePath === 'null') {
                setStatus('Cannot preview: file path not found in project', 'error');
                stopPlayback();
                return;
            }
            var cleanPath = filePath.replace(/^"|"$/g, '').replace(/\\/g, '/');
            item.mediaPath = cleanPath;
            startAudioWithWaveform(item, cleanPath);
        });
    }
}

function startAudioWithWaveform(item, cleanPath) {
    var normalPath = cleanPath;
    if (normalPath.charAt(0) !== '/' && normalPath.charAt(1) === ':') {
        normalPath = '/' + normalPath;
    }
    var fileUrl = 'file://' + encodeURI(normalPath).replace(/#/g, '%23').replace(/\?/g, '%3F');

    try {
        currentAudio = new Audio(fileUrl);
        currentAudio.volume = playerVolume;
        currentAudio.loop = isLooping;

        currentAudio.addEventListener('loadedmetadata', function () {
            currentDuration = currentAudio.duration;
            $dockDuration.textContent = formatDurationSec(currentDuration);
            if (!isRangeActive) {
                rangeOut = currentDuration;
                updateRangeUI();
            }
        });

        currentAudio.addEventListener('ended', function () {
            if (!isLooping) {
                stopPlayback();
                setStatus('Finished: ' + item.name);
            }
        });

        currentAudio.addEventListener('error', function (err) {
            console.error('Audio load error:', err);
            setStatus('Playback error for: ' + item.name, 'error');
        });

        var playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(function () {
                onPlaybackStarted();
            }).catch(function (e) {
                console.warn('Auto-play issue:', e);
                onPlaybackStarted();
            });
        } else {
            onPlaybackStarted();
        }

        generateAudioWaveform(cleanPath, function (peaks, duration) {
            currentPeaks = peaks;
            if (duration && (!currentDuration || currentDuration === 0)) {
                currentDuration = duration;
                $dockDuration.textContent = formatDurationSec(duration);
                if (!isRangeActive) {
                    rangeOut = duration;
                    updateRangeUI();
                }
            }
            drawWaveform(currentAudio ? (currentAudio.currentTime / (currentDuration || 1)) : 0);
        });

    } catch (e) {
        setStatus('Error playing audio: ' + e.message, 'error');
    }
}

function onPlaybackStarted() {
    $dockPlayPauseBtn.innerHTML = ICON_PAUSE;
    if (activePlayBtn) {
        activePlayBtn.innerHTML = ICON_STOP;
        activePlayBtn.classList.add('playing');
    }
    setStatus('Playing: ' + (activeTrackItem ? activeTrackItem.name : ''), 'success');
    startPlaybackLoop();
}

function pausePlayback() {
    if (currentAudio) {
        currentAudio.pause();
    }
    $dockPlayPauseBtn.innerHTML = ICON_PLAY;
    if (activePlayBtn) {
        activePlayBtn.innerHTML = ICON_PLAY;
        activePlayBtn.classList.remove('playing');
    }
    stopPlaybackLoop();
    if (activeListItemEl) {
        activeListItemEl.classList.remove('is-playing');
    }
    setStatus('Paused');
}

function resumePlayback() {
    if (currentAudio) {
        currentAudio.play().then(function () {
            $dockPlayPauseBtn.innerHTML = ICON_PAUSE;
            if (activePlayBtn) {
                activePlayBtn.innerHTML = ICON_STOP;
                activePlayBtn.classList.add('playing');
            }
            if (activeListItemEl) {
                activeListItemEl.classList.add('is-playing');
            }
            startPlaybackLoop();
            setStatus('Playing: ' + (activeTrackItem ? activeTrackItem.name : ''), 'success');
        }).catch(function (err) {
            console.error('Resume error:', err);
        });
    }
}

function stopPlayback() {
    stopPlaybackLoop();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    $dockPlayPauseBtn.innerHTML = ICON_PLAY;
    $dockSlider.value = 0;
    $dockCurrentTime.textContent = '00:00';
    drawWaveform(0);

    document.querySelectorAll('.list-item').forEach(function (el) {
        el.classList.remove('is-playing');
        var p = el.querySelector('.item-progress-fill');
        if (p) p.style.width = '0%';
        var b = el.querySelector('.action-btn.play');
        if (b) {
            b.innerHTML = ICON_PLAY;
            b.classList.remove('playing');
        }
    });

    activeTrackItem = null;
    activeListItemEl = null;
    activePlayBtn = null;
}

function updateListItemsPlayingState(treePath) {
    document.querySelectorAll('.list-item').forEach(function (el) {
        var isMatch = el.dataset.treePath === treePath;
        el.classList.toggle('is-playing', isMatch);
        var playBtn = el.querySelector('.action-btn.play');
        if (playBtn) {
            playBtn.innerHTML = isMatch ? ICON_STOP : ICON_PLAY;
            playBtn.classList.toggle('playing', isMatch);
        }
    });
}

// ─── 60fps Playback Animation Loop ─────────────────────────────────────────────

function startPlaybackLoop() {
    stopPlaybackLoop();
    function loop() {
        if (currentAudio && !currentAudio.paused) {
            var cur = currentAudio.currentTime;
            var dur = currentAudio.duration || currentDuration || 1;

            if (isRangeActive && cur >= rangeOut) {
                if (isLooping) {
                    currentAudio.currentTime = rangeIn;
                } else {
                    pausePlayback();
                    currentAudio.currentTime = rangeIn;
                    seekToPercentage(rangeIn / dur);
                    return;
                }
            }

            var pct = Math.max(0, Math.min(1, cur / dur));
            $dockCurrentTime.textContent = formatDurationSec(cur);
            if (!isUserDraggingSlider) {
                $dockSlider.value = (pct * 100).toFixed(2);
            }

            drawWaveform(pct);

            if (activeListItemEl) {
                var pFill = activeListItemEl.querySelector('.item-progress-fill');
                if (pFill) {
                    pFill.style.width = (pct * 100) + '%';
                }
            }

            playbackRafId = requestAnimationFrame(loop);
        }
    }
    playbackRafId = requestAnimationFrame(loop);
}

function stopPlaybackLoop() {
    if (playbackRafId) {
        cancelAnimationFrame(playbackRafId);
        playbackRafId = null;
    }
}

// ─── Programmatic Audio Waveform Generation ────────────────────────────────────

function generateAudioWaveform(filePath, callback) {
    if (waveformCache[filePath]) {
        callback(waveformCache[filePath].peaks, waveformCache[filePath].duration);
        return;
    }

    $waveformLoading.style.display = 'flex';

    var cleanDiskPath = filePath.replace(/^file:\/\//i, '');
    if (process.platform === 'win32' && cleanDiskPath.startsWith('/') && cleanDiskPath.charAt(2) === ':') {
        cleanDiskPath = cleanDiskPath.slice(1);
    }
    try {
        cleanDiskPath = decodeURIComponent(cleanDiskPath);
    } catch (e) {}

    if (fs && fs.readFile) {
        fs.readFile(cleanDiskPath, function (err, fileBuffer) {
            if (err) {
                console.warn('fs.readFile error:', err);
                fallbackSyntheticWaveform(cleanDiskPath, callback);
                return;
            }

            var arrayBuffer = fileBuffer.buffer.slice(
                fileBuffer.byteOffset,
                fileBuffer.byteOffset + fileBuffer.byteLength
            );

            var ctx = getAudioContext();
            if (!ctx) {
                fallbackSyntheticWaveform(cleanDiskPath, callback);
                return;
            }

            ctx.decodeAudioData(arrayBuffer, function (decodedBuffer) {
                $waveformLoading.style.display = 'none';
                var targetBars = 130;
                var peaks = extractPeaksFromAudioBuffer(decodedBuffer, targetBars);
                waveformCache[filePath] = {
                    peaks: peaks,
                    duration: decodedBuffer.duration
                };
                callback(peaks, decodedBuffer.duration);
            }, function (decodeError) {
                console.warn('Web Audio decode failed:', decodeError);
                fallbackSyntheticWaveform(cleanDiskPath, callback);
            });
        });
    } else {
        fallbackSyntheticWaveform(cleanDiskPath, callback);
    }
}

function extractPeaksFromAudioBuffer(audioBuffer, targetBars) {
    var channel = audioBuffer.getChannelData(0);
    var totalSamples = channel.length;
    var blockSize = Math.floor(totalSamples / targetBars);
    var peaks = [];
    var maxVal = 0;

    for (var i = 0; i < targetBars; i++) {
        var start = i * blockSize;
        var end = Math.min(start + blockSize, totalSamples);
        var sumSquares = 0;
        var peak = 0;
        var count = end - start;

        var step = Math.max(1, Math.floor(count / 150));
        var sampled = 0;

        for (var j = start; j < end; j += step) {
            var val = Math.abs(channel[j]);
            if (val > peak) peak = val;
            sumSquares += val * val;
            sampled++;
        }

        var rms = sampled > 0 ? Math.sqrt(sumSquares / sampled) : 0;
        var barScore = (peak * 0.7) + (rms * 0.3);
        peaks.push(barScore);
        if (barScore > maxVal) maxVal = barScore;
    }

    var normalized = [];
    for (var k = 0; k < peaks.length; k++) {
        var n = maxVal > 0 ? (peaks[k] / maxVal) : 0.2;
        normalized.push(Math.max(0.08, Math.min(0.96, n)));
    }
    return normalized;
}

function fallbackSyntheticWaveform(cleanPath, callback) {
    $waveformLoading.style.display = 'none';
    var targetBars = 130;
    var peaks = [];
    var seed = 0;
    for (var i = 0; i < cleanPath.length; i++) seed = (seed * 31 + cleanPath.charCodeAt(i)) & 0xffffff;

    for (var b = 0; b < targetBars; b++) {
        var angle = (b / targetBars) * Math.PI * 4;
        var wave = Math.sin(angle) * 0.35 + Math.sin(angle * 2.7 + seed) * 0.25 + 0.45;
        peaks.push(Math.max(0.1, Math.min(0.95, wave)));
    }
    waveformCache[cleanPath] = { peaks: peaks, duration: currentDuration || 60 };
    callback(peaks, currentDuration || 60);
}

// ─── Draw Waveform (Adobe Solid Flat Colors — Zero Gradients!) ─────────────────

function drawWaveform(progressPct) {
    if (!$waveformCanvas) return;
    var rect = $waveformCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    var dpr = window.devicePixelRatio || 1;
    $waveformCanvas.width = Math.round(rect.width * dpr);
    $waveformCanvas.height = Math.round(rect.height * dpr);

    var ctx = $waveformCanvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var w = rect.width;
    var h = rect.height;

    ctx.clearRect(0, 0, w, h);

    var peaks = (currentPeaks && currentPeaks.length > 0) ? currentPeaks : [];
    if (peaks.length === 0) {
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, h / 2 - 1, w, 2);
        return;
    }

    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 1);
    var inPct = isRangeActive ? Math.max(0, Math.min(1, rangeIn / dur)) : 0;
    var outPct = isRangeActive ? Math.max(0, Math.min(1, rangeOut / dur)) : 1;
    var inX = inPct * w;
    var outX = outPct * w;
    var progressX = progressPct * w;

    // Draw shaded background overlay over selected range (Adobe blue tint)
    if (isRangeActive && outX > inX) {
        ctx.fillStyle = 'rgba(20, 115, 230, 0.16)';
        ctx.fillRect(inX, 0, outX - inX, h);
    }

    var barWidth = 2.2;
    var barGap = 1.2;
    var step = barWidth + barGap;
    var numBars = Math.floor(w / step);

    var drawnPeaks = [];
    for (var b = 0; b < numBars; b++) {
        var pIdx = Math.floor((b / numBars) * peaks.length);
        drawnPeaks.push(peaks[pIdx] || 0.1);
    }

    // Draw Bars
    for (var i = 0; i < numBars; i++) {
        var barX = i * step;
        var val = drawnPeaks[i];
        var barH = Math.max(3, val * (h - 8));
        var barY = (h - barH) / 2;

        var isInsideRange = (!isRangeActive) || (barX + barWidth >= inX && barX <= outX);

        if (barX + barWidth <= progressX) {
            ctx.fillStyle = isInsideRange ? '#1473e6' : '#234468';
        } else {
            ctx.fillStyle = isInsideRange ? '#686868' : '#2c2c2c';
        }

        drawRoundedBar(ctx, barX, barY, barWidth, barH, 1);
    }

    // Draw In/Out range boundary markers (Clean Adobe brackets, NO clumsy text labels)
    if (isRangeActive) {
        ctx.strokeStyle = '#1473e6';
        ctx.lineWidth = 2;

        // In bracket: [
        ctx.beginPath();
        ctx.moveTo(inX, 0);
        ctx.lineTo(inX, h);
        ctx.lineTo(inX + 5, h);
        ctx.moveTo(inX, 0);
        ctx.lineTo(inX + 5, 0);
        ctx.stroke();

        // Out bracket: ]
        ctx.beginPath();
        ctx.moveTo(outX, 0);
        ctx.lineTo(outX, h);
        ctx.lineTo(outX - 5, h);
        ctx.moveTo(outX, 0);
        ctx.lineTo(outX - 5, 0);
        ctx.stroke();
    }

    // Playhead Needle
    if (progressPct >= 0 && progressPct <= 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(progressX, 0);
        ctx.lineTo(progressX, h);
        ctx.stroke();

        ctx.fillStyle = '#1473e6';
        ctx.beginPath();
        ctx.arc(progressX, 3.5, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawRoundedBar(ctx, x, y, w, h, r) {
    if (r * 2 > h) r = h / 2;
    if (r * 2 > w) r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

// ─── Direct Drag-to-Select Segment on Waveform ─────────────────────────────────

function getTimeAtX(clientX) {
    var rect = $waveformWrapper.getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    return pct * dur;
}

function updateRangeUI() {
    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    var cur = currentAudio ? currentAudio.currentTime : 0;

    if (isRangeActive && rangeOut > rangeIn && (rangeIn > 0.02 || (dur > 0 && rangeOut < dur - 0.05))) {
        var segDur = rangeOut - rangeIn;
        $dockTimeBadge.innerHTML = '<span style="color:#1473e6; font-weight:700;">' + formatDurationSec(rangeIn) + ' – ' + formatDurationSec(rangeOut) + ' (' + segDur.toFixed(1) + 's)</span>';
        $dockInsertText.textContent = 'Place Range at Playhead';
        $dockDragText.textContent = 'Drag Segment (' + segDur.toFixed(1) + 's)';
    } else {
        $dockTimeBadge.innerHTML = '<span>' + formatDurationSec(cur) + '</span> / <span>' + formatDurationSec(dur) + '</span>';
        $dockInsertText.textContent = 'Place at Playhead';
        $dockDragText.textContent = 'Drag to Timeline';
    }
}

// Waveform Mouse Interaction (Seeking & Direct Drag-to-Select)
$waveformWrapper.addEventListener('mousedown', function (e) {
    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    if (dur <= 0) return;

    var rect = $waveformWrapper.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var w = rect.width;
    var inX = (rangeIn / dur) * w;
    var outX = (rangeOut / dur) * w;

    dragStartX = e.clientX;
    dragStartTime = getTimeAtX(e.clientX);

    if (isRangeActive && Math.abs(x - inX) <= 8) {
        waveformDragMode = 'inHandle';
    } else if (isRangeActive && Math.abs(x - outX) <= 8) {
        waveformDragMode = 'outHandle';
    } else {
        waveformDragMode = 'createRange';
    }
});

window.addEventListener('mousemove', function (e) {
    if (!waveformDragMode) return;

    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    if (dur <= 0) return;

    var mouseTime = getTimeAtX(e.clientX);
    var movedPixels = Math.abs(e.clientX - dragStartX);

    if (waveformDragMode === 'createRange') {
        if (movedPixels >= 4) {
            isRangeActive = true;
            rangeIn = Math.max(0, Math.min(dragStartTime, mouseTime));
            rangeOut = Math.min(dur, Math.max(dragStartTime, mouseTime));
            updateRangeUI();
            drawWaveform(currentAudio ? (currentAudio.currentTime / dur) : 0);
        }
    } else if (waveformDragMode === 'inHandle') {
        rangeIn = Math.max(0, Math.min(mouseTime, rangeOut - 0.05));
        isRangeActive = true;
        updateRangeUI();
        drawWaveform(currentAudio ? (currentAudio.currentTime / dur) : 0);
    } else if (waveformDragMode === 'outHandle') {
        rangeOut = Math.min(dur, Math.max(mouseTime, rangeIn + 0.05));
        isRangeActive = true;
        updateRangeUI();
        drawWaveform(currentAudio ? (currentAudio.currentTime / dur) : 0);
    }
});

window.addEventListener('mouseup', function (e) {
    if (!waveformDragMode) return;

    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    var movedPixels = Math.abs(e.clientX - dragStartX);

    if (waveformDragMode === 'createRange' && movedPixels < 4) {
        var rect = $waveformWrapper.getBoundingClientRect();
        var pct = (e.clientX - rect.left) / rect.width;
        seekToPercentage(pct);
    }

    if (isRangeActive && rangeOut <= rangeIn + 0.05) {
        isRangeActive = false;
        rangeIn = 0;
        rangeOut = dur;
        updateRangeUI();
        drawWaveform(currentAudio ? (currentAudio.currentTime / dur) : 0);
    }

    waveformDragMode = null;
});

// Double click waveform to clear range
$waveformWrapper.addEventListener('dblclick', function () {
    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    rangeIn = 0;
    rangeOut = dur;
    isRangeActive = false;
    updateRangeUI();
    drawWaveform(currentAudio ? (currentAudio.currentTime / (dur || 1)) : 0);
    setStatus('Range reset to full audio');
});

// Dynamic Cursor & Hover Tooltip on Waveform
$waveformWrapper.addEventListener('mousemove', function (e) {
    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    var rect = $waveformWrapper.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var w = rect.width;

    if (isRangeActive && dur > 0) {
        var inX = (rangeIn / dur) * w;
        var outX = (rangeOut / dur) * w;

        if (Math.abs(x - inX) <= 6 || Math.abs(x - outX) <= 6) {
            $waveformWrapper.style.cursor = 'ew-resize';
        } else {
            $waveformWrapper.style.cursor = 'crosshair';
        }
    } else {
        $waveformWrapper.style.cursor = 'crosshair';
    }

    $waveformHoverLine.style.display = 'block';
    $waveformHoverLine.style.left = x + 'px';

    if (dur > 0) {
        $waveformTooltip.style.display = 'block';
        $waveformTooltip.style.left = x + 'px';
        $waveformTooltip.textContent = formatDurationSec((x / w) * dur);
    }
});

$waveformWrapper.addEventListener('mouseleave', function () {
    $waveformHoverLine.style.display = 'none';
    $waveformTooltip.style.display = 'none';
});

// ─── Drag and Drop directly to Premiere Pro Timeline ───────────────────────────

$dockDragBtn.addEventListener('dragstart', function (e) {
    if (!activeTrackItem) return;
    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    var targetPath = activeTrackItem.mediaPath || '';

    // If marked range is active, produce sliced WAV file so Premiere drops EXACT marked segment!
    if (isRangeActive && rangeOut > rangeIn && (rangeIn > 0.02 || (dur > 0 && rangeOut < dur - 0.05))) {
        var sliced = createAudioSlice(targetPath, rangeIn, rangeOut, activeTrackItem.name);
        if (sliced && fs && fs.existsSync(sliced)) {
            targetPath = sliced;
            setStatus('Dragging marked segment (' + (rangeOut - rangeIn).toFixed(1) + 's) to timeline…');
        } else {
            setStatus('Dragging "' + activeTrackItem.name + '" to timeline…');
        }
    } else {
        setStatus('Dragging "' + activeTrackItem.name + '" to timeline…');
    }

    var nativePath = targetPath.replace(/\//g, '\\');
    e.dataTransfer.setData('com.adobe.cep.dnd.file.0', nativePath);
    e.dataTransfer.setData('text/plain', nativePath);
});

// Clicking "Drag Segment" also acts as quick insert at playhead
$dockDragBtn.addEventListener('click', function () {
    if (activeTrackItem) {
        insertItem(activeTrackItem);
    }
});

// ─── Scrubber Slider & Transport Controls ──────────────────────────────────────

function seekToPercentage(pct) {
    pct = Math.max(0, Math.min(1, pct));
    var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
    if (dur > 0) {
        var seekTime = pct * dur;
        if (currentAudio) {
            currentAudio.currentTime = seekTime;
        }
        $dockSlider.value = (pct * 100).toFixed(2);
        $dockCurrentTime.textContent = formatDurationSec(seekTime);
        drawWaveform(pct);
    }
}

$dockSlider.addEventListener('mousedown', function () {
    isUserDraggingSlider = true;
});

$dockSlider.addEventListener('input', function () {
    isUserDraggingSlider = true;
    var pct = parseFloat(this.value) / 100;
    var dur = currentDuration || (currentAudio ? currentAudio.duration : 0);
    if (dur > 0 && currentAudio) {
        currentAudio.currentTime = pct * dur;
    }
    $dockCurrentTime.textContent = formatDurationSec(pct * dur);
    drawWaveform(pct);
});

$dockSlider.addEventListener('change', function () {
    isUserDraggingSlider = false;
    var pct = parseFloat(this.value) / 100;
    seekToPercentage(pct);
});

window.addEventListener('mouseup', function () {
    isUserDraggingSlider = false;
});

$dockPlayPauseBtn.addEventListener('click', function () {
    if (!currentAudio) return;
    if (currentAudio.paused) {
        resumePlayback();
    } else {
        pausePlayback();
    }
});

$dockStopBtn.addEventListener('click', function () {
    stopPlayback();
});

$dockLoopBtn.addEventListener('click', function () {
    isLooping = !isLooping;
    this.classList.toggle('active', isLooping);
    if (currentAudio) {
        currentAudio.loop = isLooping;
    }
});

$dockBack5Btn.addEventListener('click', function () {
    if (!currentAudio) return;
    var newTime = Math.max(0, currentAudio.currentTime - 5);
    currentAudio.currentTime = newTime;
    seekToPercentage(newTime / (currentAudio.duration || 1));
});

$dockFwd5Btn.addEventListener('click', function () {
    if (!currentAudio) return;
    var newTime = Math.min(currentAudio.duration || 0, currentAudio.currentTime + 5);
    currentAudio.currentTime = newTime;
    seekToPercentage(newTime / (currentAudio.duration || 1));
});

// Volume Controls
$dockVolume.addEventListener('input', function () {
    playerVolume = parseFloat(this.value);
    if (currentAudio) {
        currentAudio.volume = playerVolume;
    }
    localStorage.setItem('sfx_volume', String(playerVolume));
    updateVolumeIcon();
});

$dockMuteBtn.addEventListener('click', function () {
    if (playerVolume > 0) {
        $dockMuteBtn.dataset.prevVol = String(playerVolume);
        playerVolume = 0;
        $dockVolume.value = 0;
    } else {
        var prev = parseFloat($dockMuteBtn.dataset.prevVol || '0.7');
        playerVolume = prev > 0 ? prev : 0.7;
        $dockVolume.value = playerVolume;
    }
    if (currentAudio) {
        currentAudio.volume = playerVolume;
    }
    localStorage.setItem('sfx_volume', String(playerVolume));
    updateVolumeIcon();
});

// Place from Player Dock
$dockInsertBtn.addEventListener('click', function () {
    if (activeTrackItem) {
        insertItem(activeTrackItem);
    }
});

// Close Player Dock
$dockCloseBtn.addEventListener('click', function () {
    stopPlayback();
    $playerDock.style.display = 'none';
});

// ─── Keyboard Shortcuts (Space = Play/Pause, Enter = Insert, Esc / X = Clear Range) ───
window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }

    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (currentAudio) {
            if (currentAudio.paused) resumePlayback();
            else pausePlayback();
        }
    } else if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
        if (isRangeActive) {
            var dur = (currentAudio && currentAudio.duration) ? currentAudio.duration : (currentDuration || 0);
            rangeIn = 0;
            rangeOut = dur;
            isRangeActive = false;
            updateRangeUI();
            drawWaveform(currentAudio ? (currentAudio.currentTime / (dur || 1)) : 0);
            setStatus('Range reset to full audio');
        }
    } else if (e.key === 'Enter') {
        if ($playerDock.style.display !== 'none' && activeTrackItem) {
            e.preventDefault();
            insertItem(activeTrackItem);
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── "PASTE TIMELINE" FUNCTIONALITY ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

var $pasteTimelineModal = document.getElementById('pasteTimelineModal');
var $pasteTimelineBtn = document.getElementById('pasteTimelineBtn');
var $closeTimelineModalBtn = document.getElementById('closeTimelineModalBtn');
var $cancelTimelineBtn = document.getElementById('cancelTimelineBtn');
var $submitTimelineBtn = document.getElementById('submitTimelineBtn');
var $timelineInput = document.getElementById('timelineInput');
var $timelineParseSummary = document.getElementById('timelineParseSummary');
var $pasteClipboardBtn = document.getElementById('pasteClipboardBtn');
var $loadExampleBtn = document.getElementById('loadExampleBtn');
var $clearTimelineBtn = document.getElementById('clearTimelineBtn');
var $markerColorSelect = document.getElementById('markerColorSelect');
var $markerPrefixInput = document.getElementById('markerPrefixInput');
var $durationMarkersCheck = document.getElementById('durationMarkersCheck');
var $clearExistingMarkersCheck = document.getElementById('clearExistingMarkersCheck');

var EXAMPLE_TIMELINE =
    "00:00:00 - 00:01:03\n" +
    "00:01:03 - 00:02:49\n" +
    "00:02:49 - 00:03:52\n" +
    "00:03:52 - 00:05:23\n" +
    "00:05:23 - 00:06:50\n" +
    "00:06:50 - 00:08:10";

// Open Modal
$pasteTimelineBtn.addEventListener('click', function () {
    $pasteTimelineModal.style.display = 'flex';
    if (!$timelineInput.value.trim()) {
        $timelineInput.value = EXAMPLE_TIMELINE;
    }
    updateTimelineLiveSummary();
    $timelineInput.focus();
});

// Close Modal
function closeTimelineModal() {
    $pasteTimelineModal.style.display = 'none';
}
$closeTimelineModalBtn.addEventListener('click', closeTimelineModal);
$cancelTimelineBtn.addEventListener('click', closeTimelineModal);

$pasteTimelineModal.addEventListener('click', function (e) {
    if (e.target === $pasteTimelineModal) {
        closeTimelineModal();
    }
});

$loadExampleBtn.addEventListener('click', function () {
    $timelineInput.value = EXAMPLE_TIMELINE;
    updateTimelineLiveSummary();
});

$clearTimelineBtn.addEventListener('click', function () {
    $timelineInput.value = '';
    updateTimelineLiveSummary();
});

$pasteClipboardBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (text) {
            if (text) {
                $timelineInput.value = text;
                updateTimelineLiveSummary();
            }
        }).catch(function () {
            $timelineInput.focus();
            document.execCommand('paste');
            updateTimelineLiveSummary();
        });
    } else {
        $timelineInput.focus();
        document.execCommand('paste');
        updateTimelineLiveSummary();
    }
});

$timelineInput.addEventListener('input', updateTimelineLiveSummary);

// ─── Timestamp Parser ─────────────────────────────────────────────────────────

function parseTimestampToSeconds(str) {
    if (!str) return null;
    str = str.trim();

    var parts = str.split(':');
    if (parts.length === 1) {
        var s = parseFloat(parts[0]);
        return isNaN(s) ? null : s;
    } else if (parts.length === 2) {
        var m = parseInt(parts[0], 10);
        var s = parseFloat(parts[1]);
        if (isNaN(m) || isNaN(s)) return null;
        return (m * 60) + s;
    } else if (parts.length === 3) {
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var s = parseFloat(parts[2]);
        if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
        return (h * 3600) + (m * 60) + s;
    } else if (parts.length === 4) {
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var s = parseInt(parts[2], 10);
        var f = parseInt(parts[3], 10);
        if (isNaN(h) || isNaN(m) || isNaN(s) || isNaN(f)) return null;
        return (h * 3600) + (m * 60) + s + (f / 30.0);
    }
    return null;
}

function parseTimelineLines(rawText) {
    var lines = rawText.split('\n');
    var parsed = [];
    var invalidCount = 0;
    var prefix = ($markerPrefixInput.value || 'Music ').trim();
    if (prefix.length > 0 && !prefix.endsWith(' ')) prefix += ' ';

    var isDurationMode = $durationMarkersCheck.checked;
    var colorIdx = parseInt($markerColorSelect.value, 10);

    var rangeRegex = /((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[:.]\d{1,3})?)\s*(?:-|–|—|to|->)\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[:.]\d{1,3})?)/i;
    var singleRegex = /((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[:.]\d{1,3})?)/;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        var rangeMatch = line.match(rangeRegex);
        if (rangeMatch) {
            var startSec = parseTimestampToSeconds(rangeMatch[1]);
            var endSec = parseTimestampToSeconds(rangeMatch[2]);

            if (startSec !== null && endSec !== null && endSec > startSec) {
                var cleanComment = line.replace(rangeMatch[0], '').replace(/^\s*[\d.)\]\s]+/, '').replace(/^[-(:]+/, '').trim();
                var markerName = cleanComment ? (prefix + cleanComment) : (prefix + (parsed.length + 1));

                parsed.push({
                    startSec: startSec,
                    endSec: isDurationMode ? endSec : 0,
                    name: markerName,
                    comment: line,
                    colorIndex: colorIdx
                });
            } else {
                invalidCount++;
            }
        } else {
            var singleMatch = line.match(singleRegex);
            if (singleMatch) {
                var sSec = parseTimestampToSeconds(singleMatch[1]);
                if (sSec !== null && sSec >= 0) {
                    var sComment = line.replace(singleMatch[0], '').replace(/^\s*[\d.)\]\s]+/, '').replace(/^[-(:]+/, '').trim();
                    var sName = sComment ? (prefix + sComment) : (prefix + (parsed.length + 1));
                    parsed.push({
                        startSec: sSec,
                        endSec: 0,
                        name: sName,
                        comment: line,
                        colorIndex: colorIdx
                    });
                } else {
                    invalidCount++;
                }
            } else {
                invalidCount++;
            }
        }
    }

    return {
        cues: parsed,
        invalidCount: invalidCount
    };
}

function updateTimelineLiveSummary() {
    var raw = $timelineInput.value;
    var result = parseTimelineLines(raw);
    var cues = result.cues;
    var invalid = result.invalidCount;

    if (cues.length === 0) {
        $timelineParseSummary.className = 'timeline-summary-badge' + (raw.trim().length > 0 ? ' warning' : '');
        $timelineParseSummary.innerHTML = raw.trim().length > 0
            ? '<span>Notice: No valid timestamps detected. Check format (e.g. 00:00:00 - 00:01:03)</span>'
            : '<span>Paste or type timestamps above to preview</span>';
        $submitTimelineBtn.disabled = true;
        $submitTimelineBtn.style.opacity = '0.5';
    } else {
        var minStart = cues[0].startSec;
        var maxEnd = cues[cues.length - 1].endSec || cues[cues.length - 1].startSec;
        var totalDur = Math.max(0, maxEnd - minStart);

        $timelineParseSummary.className = 'timeline-summary-badge';
        var summaryText = '<span>' + cues.length + ' music cue(s) detected (' +
            formatDurationSec(minStart) + ' → ' + formatDurationSec(maxEnd) +
            ') • Duration: ' + formatDurationSec(totalDur) + '</span>';

        if (invalid > 0) {
            summaryText += ' <span style="color:#fbbf24;">• ' + invalid + ' invalid line(s) ignored</span>';
        }

        $timelineParseSummary.innerHTML = summaryText;
        $submitTimelineBtn.disabled = false;
        $submitTimelineBtn.style.opacity = '1';
    }
}

// ─── Submit Timeline Markers to Premiere Pro ───────────────────────────────────

$submitTimelineBtn.addEventListener('click', function () {
    var result = parseTimelineLines($timelineInput.value);
    if (!result.cues || result.cues.length === 0) {
        alert('Please enter at least one valid timestamp range (e.g. 00:00:00 - 00:01:03).');
        return;
    }

    var payload = {
        markers: result.cues,
        clearExisting: $clearExistingMarkersCheck.checked,
        colorIndex: parseInt($markerColorSelect.value, 10)
    };

    $submitTimelineBtn.disabled = true;
    $submitTimelineBtn.textContent = 'Creating Markers…';
    setStatus('Creating ' + result.cues.length + ' markers on active sequence…');

    var jsonStr = JSON.stringify(payload);
    cs.evalScript('createTimelineMarkers(' + JSON.stringify(jsonStr) + ')', function (response) {
        $submitTimelineBtn.disabled = false;
        $submitTimelineBtn.textContent = 'Create Markers on Sequence';

        try {
            var res = JSON.parse(response);
            if (res.success) {
                setStatus(res.message, 'success');
                closeTimelineModal();
            } else {
                setStatus('Marker creation error: ' + res.message, 'error');
                alert('Marker creation failed:\n\n' + res.message);
            }
        } catch (e) {
            setStatus('Script response: ' + response, 'error');
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── 1-CLICK AE FOOTAGE PLACEMENT ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

document.getElementById('syncAEFootageBtn').addEventListener('click', function () {
    var btn = this;
    setStatus('Locating AE rendered footage timing…');

    cs.evalScript('getProjectDraftFolder()', function (draftPath) {
        var foundPath = null;
        if (draftPath && fs) {
            var cand1 = path.join(draftPath, 'Draft', 'PPro_Footage_Timing.json');
            var cand2 = path.join(draftPath, 'PPro_Footage_Timing.json');
            if (fs.existsSync(cand1)) foundPath = cand1;
            else if (fs.existsSync(cand2)) foundPath = cand2;
        }

        if (foundPath && fs) {
            loadAndPlaceTimingFile(foundPath, btn);
        } else {
            var fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';

            fileInput.addEventListener('change', function (e) {
                if (e.target.files && e.target.files.length > 0) {
                    var file = e.target.files[0];
                    if (file.path) {
                        loadAndPlaceTimingFile(file.path, btn);
                    }
                }
            });

            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        }
    });
});

function loadAndPlaceTimingFile(jsonFilePath, btn) {
    try {
        if (!fs) throw new Error('File system access not available');
        var content = fs.readFileSync(jsonFilePath, 'utf8');
        var parsed = JSON.parse(content);

        btn.disabled = true;
        btn.textContent = 'Placing…';
        setStatus('Placing AE clips on timeline…');

        cs.evalScript('placeFootageFromJSON(' + JSON.stringify(JSON.stringify(parsed)) + ')', function (result) {
            btn.disabled = false;
            btn.textContent = 'Place AE Footage';
            try {
                var res = JSON.parse(result);
                if (res.success) {
                    setStatus(res.message, 'success');
                } else {
                    setStatus('Placement failed: ' + res.message, 'error');
                    alert('Placement error:\n\n' + res.message);
                }
            } catch (e) {
                setStatus('Result: ' + result, 'error');
            }
        });
    } catch (e) {
        setStatus('Error reading timing file: ' + e.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SILENCE DETECTION VIA FFMPEG ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function findFfmpeg() {
    if (!childProcess) return null;
    try {
        childProcess.execSync('ffmpeg -version', { timeout: 3000, stdio: 'pipe', shell: true });
        return 'ffmpeg';
    } catch (e) {}

    try {
        var os = require('os');
        var wingetBase = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
        if (fs.existsSync(wingetBase)) {
            var dirs = fs.readdirSync(wingetBase);
            for (var i = 0; i < dirs.length; i++) {
                if (dirs[i].indexOf('FFmpeg') !== -1) {
                    var pkgDir = path.join(wingetBase, dirs[i]);
                    var subDirs = fs.readdirSync(pkgDir);
                    for (var j = 0; j < subDirs.length; j++) {
                        var binPath = path.join(pkgDir, subDirs[j], 'bin', 'ffmpeg.exe');
                        if (fs.existsSync(binPath)) {
                            return '"' + binPath + '"';
                        }
                    }
                }
            }
        }
    } catch (e) {}

    return null;
}

function detectSilence(filePath) {
    if (!childProcess) return 0;
    try {
        var ffmpegCmd = findFfmpeg();
        if (!ffmpegCmd) return 0;

        var detectCmd = ffmpegCmd + ' -i "' + filePath + '" -af silencedetect=noise=-40dB:d=0.01 -t 5 -f null - 2>&1';
        var output = '';
        try {
            output = childProcess.execSync(detectCmd, {
                timeout: 10000,
                encoding: 'utf8',
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } catch (e) {
            output = (e.stderr || '') + (e.stdout || '');
        }

        var lines = output.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var match = lines[i].match(/silence_end:\s*([\d.]+)/);
            if (match) {
                var silenceEnd = parseFloat(match[1]);
                if (silenceEnd > 0 && silenceEnd < 3) {
                    return silenceEnd;
                }
            }
        }
        return 0;
    } catch (e) {
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MICROPHONE RECORDING ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

var mediaRecorder = null;
var recordedChunks = [];
var isRecording = false;

document.getElementById('recordBtn').addEventListener('click', function () {
    var btn = this;
    if (isRecording) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.addEventListener('dataavailable', function (e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        });

        mediaRecorder.addEventListener('stop', function () {
            isRecording = false;
            btn.classList.remove('recording');
            setStatus('Processing mic recording…', 'success');

            stream.getTracks().forEach(function (track) { track.stop(); });

            var blob = new Blob(recordedChunks, { type: 'audio/webm' });
            var reader = new FileReader();
            reader.onload = function () {
                var buffer = Buffer.from(reader.result);
                var tempDir = require('os').tmpdir();
                var webmPath = path.join(tempDir, 'sfx_record_' + Date.now() + '.webm');
                var wavPath = webmPath.replace('.webm', '.wav');

                fs.writeFileSync(webmPath, buffer);

                var ffmpegCmd = findFfmpeg();
                if (ffmpegCmd) {
                    try {
                        childProcess.execSync(ffmpegCmd + ' -y -i "' + webmPath + '" "' + wavPath + '"', { stdio: 'pipe' });
                        showRecordedItem(wavPath);
                        setStatus('Mic recording ready', 'success');
                    } catch (e) {
                        showRecordedItem(webmPath);
                    }
                } else {
                    showRecordedItem(webmPath);
                }
            };
            reader.readAsArrayBuffer(blob);
        });

        mediaRecorder.start();
        isRecording = true;
        btn.classList.add('recording');
        setStatus('Recording microphone…', 'success');
    }).catch(function (err) {
        setStatus('Microphone error: ' + err.message, 'error');
    });
});

function showRecordedItem(filePath) {
    var container = document.getElementById('recordResult');
    container.style.display = 'block';
    container.innerHTML = '';

    var cleanPath = filePath.replace(/\\/g, '/');
    var div = document.createElement('div');
    div.className = 'list-item';
    div.draggable = true;
    div.dataset.treePath = cleanPath;

    var recItem = {
        name: 'Mic Recording (' + new Date().toLocaleTimeString() + ')',
        treePath: cleanPath,
        binPath: 'Recordings',
        mediaPath: cleanPath
    };

    div.innerHTML =
        '<div class="icon-box">' +
        '  <span class="icon">' + ICON_NOTE + '</span>' +
        '</div>' +
        '<span class="name" style="color:#ffffff">' + recItem.name + '</span>' +
        '<span class="path">Drag or Click to Insert</span>' +
        '<div class="actions">' +
        '  <button class="action-btn play" title="Preview with Waveform">' + ICON_PLAY + '</button>' +
        '</div>' +
        '<div class="item-progress-fill"></div>';

    div.addEventListener('dragstart', function (e) {
        var nativeP = cleanPath.replace(/\//g, '\\');
        e.dataTransfer.setData('com.adobe.cep.dnd.file.0', nativeP);
        e.dataTransfer.setData('text/plain', nativeP);
    });

    div.addEventListener('click', function (e) {
        if (e.target.closest('.play')) {
            e.stopPropagation();
            togglePlayTrack(recItem, div.querySelector('.action-btn.play'), div);
            return;
        }
        insertItem(recItem);
    });

    container.appendChild(div);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── AUDIO GAIN PRESETS ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

var gainBtns = document.querySelectorAll('.gain-btn');
for (var i = 0; i < gainBtns.length; i++) {
    (function (btn) {
        btn.addEventListener('click', function () {
            var gainVal = parseFloat(btn.getAttribute('data-gain'));
            var linearGain = Math.pow(10, (gainVal - 15) / 20);
            setStatus('Setting gain to ' + gainVal + ' dB…');
            cs.evalScript('setAudioGain(' + linearGain + ')', function (result) {
                if (result && result.indexOf('ERROR') === 0) {
                    setStatus(result, 'error');
                } else {
                    var parts = result ? result.split('|') : [];
                    var count = parts.length > 1 ? parts[1] : '?';
                    setStatus('Set ' + gainVal + ' dB on ' + count + ' clip(s)', 'success');
                }
            });
        });
    })(gainBtns[i]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HELPERS ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function setStatus(msg, type) {
    var bar = document.getElementById('statusBar');
    if (!bar) return;
    bar.textContent = msg;
    bar.className = type || '';
}

function formatDurationSec(totalSeconds) {
    if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
    var mins = Math.floor(totalSeconds / 60);
    var secs = Math.floor(totalSeconds % 60);
    return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.addEventListener('resize', function () {
    if (activeTrackItem && currentAudio) {
        var pct = currentAudio.currentTime / (currentAudio.duration || 1);
        drawWaveform(pct);
    }
});

setTimeout(function () {
    scanProjectAudio();
}, 300);

window.addEventListener('keydown', function (e) {
    if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        scanProjectAudio();
    }
});
