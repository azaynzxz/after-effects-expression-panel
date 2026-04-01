/**
 * SFX Browser — Frontend Logic
 * Communicates with host/index.jsx via CSInterface
 * Uses Node.js child_process for ffprobe silence detection
 */

var cs = new CSInterface();
var cachedItems = []; // Full list from ExtendScript

// Node.js modules (available because --enable-nodejs is set)
var childProcess = require('child_process');
var path = require('path');

// ─── Refresh: scan project for audio files ─────────────────────────────────────

document.getElementById('refreshBtn').addEventListener('click', function () {
    setStatus('Scanning project…');
    cs.evalScript('getAudioItems()', function (result) {
        try {
            if (!result || result === 'undefined' || result === 'null' || result === 'EvalScript error.') {
                cachedItems = [];
                renderList([]);
                setStatus('No audio files found or script error', 'error');
                return;
            }
            cachedItems = JSON.parse(result);
            applyFilter();
            setStatus('Found ' + cachedItems.length + ' audio file(s)', 'success');
        } catch (e) {
            cachedItems = [];
            renderList([]);
            setStatus('Parse error: ' + e.message, 'error');
        }
    });
});

// ─── Live search filter ────────────────────────────────────────────────────────

document.getElementById('searchInput').addEventListener('input', function () {
    applyFilter();
});

function applyFilter() {
    var q = document.getElementById('searchInput').value.toLowerCase();
    if (!q) {
        renderList(cachedItems);
        return;
    }
    var filtered = [];
    for (var i = 0; i < cachedItems.length; i++) {
        if (cachedItems[i].name.toLowerCase().indexOf(q) !== -1) {
            filtered.push(cachedItems[i]);
        }
    }
    renderList(filtered);
}

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
            div.innerHTML =
                '<span class="icon">♪</span>' +
                '<span class="name">' + escapeHtml(item.name) + '</span>' +
                '<span class="path">' + escapeHtml(item.binPath || '') + '</span>';

            div.addEventListener('click', function () {
                insertItem(item);
            });
            container.appendChild(div);
        })(items[i]);
    }
}

// ─── Insert audio at playhead ──────────────────────────────────────────────────

function insertItem(item) {
    var trackIndex = document.getElementById('trackSelect').value;
    var autoTrim = document.getElementById('autoTrimCheck').checked;

    setStatus('Inserting "' + item.name + '" …');

    if (autoTrim) {
        // Step 1: Get the file path from ExtendScript
        cs.evalScript('getMediaPath("' + escapeForScript(item.treePath) + '")', function (filePath) {
            if (!filePath || filePath === 'undefined' || filePath === 'null') {
                // Can't get path, insert without trim
                doInsert(item.treePath, trackIndex, 0);
                return;
            }

            // Step 2: Detect silence offset using ffprobe
            var silenceOffset = detectSilence(filePath.replace(/"/g, ''));
            setStatus('Silence offset: ' + silenceOffset.toFixed(3) + 's — inserting…');

            // Step 3: Insert with offset
            doInsert(item.treePath, trackIndex, silenceOffset);
        });
    } else {
        doInsert(item.treePath, trackIndex, 0);
    }
}

function doInsert(treePath, trackIndex, silenceOffset) {
    var script = 'insertAudioAtPlayhead("' + escapeForScript(treePath) + '", ' + trackIndex + ', ' + silenceOffset + ')';
    cs.evalScript(script, function (result) {
        if (result && result.indexOf('ERROR') === 0) {
            setStatus(result, 'error');
        } else {
            // Parse response: "OK|A3"
            var parts = result ? result.split('|') : [];
            var trackLabel = parts.length > 1 ? parts[1] : 'A' + (parseInt(trackIndex) + 1);
            var trimMsg = silenceOffset > 0 ? ' (trimmed ' + silenceOffset.toFixed(2) + 's)' : '';
            setStatus('Inserted on ' + trackLabel + trimMsg, 'success');
        }
    });
}

// ─── Silence Detection via ffmpeg ──────────────────────────────────────────────

function findFfmpeg() {
    // Try 'ffmpeg' from PATH first
    try {
        childProcess.execSync('ffmpeg -version', { timeout: 3000, stdio: 'pipe', shell: true });
        return 'ffmpeg';
    } catch (e) { }

    // Fallback: known WinGet install path
    var os = require('os');
    var fs = require('fs');
    var wingetBase = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
    try {
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
    } catch (e) { }

    return null;
}

function detectSilence(filePath) {
    try {
        var ffmpegCmd = findFfmpeg();
        if (!ffmpegCmd) {
            setStatus('ffmpeg not found, inserting without trim', 'error');
            return 0;
        }

        // Use ffmpeg silencedetect to find where audio starts
        // threshold: -40dB, minimum silence duration: 0.01s, analyze first 5s
        var detectCmd = ffmpegCmd + ' -i "' + filePath + '" -af silencedetect=noise=-40dB:d=0.01 -t 5 -f null -';

        var output = '';
        try {
            output = childProcess.execSync(detectCmd, {
                timeout: 10000,
                encoding: 'utf8',
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } catch (e) {
            // ffmpeg writes to stderr, capture from error object
            output = (e.stderr || '') + (e.stdout || '');
        }

        // Parse silence_end from the output
        // Example: [silencedetect @ 0x...] silence_end: 0.523 | silence_duration: 0.523
        var lines = output.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var match = lines[i].match(/silence_end:\s*([\d.]+)/);
            if (match) {
                var silenceEnd = parseFloat(match[1]);
                // Only trim if silence is less than 3 seconds (sanity check)
                if (silenceEnd > 0 && silenceEnd < 3) {
                    return silenceEnd;
                }
            }
        }

        // No silence detected at the start = audio starts immediately
        return 0;

    } catch (e) {
        // If anything fails, return 0 (no trim)
        return 0;
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(msg, type) {
    var bar = document.getElementById('statusBar');
    bar.textContent = msg;
    bar.className = type || '';
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeForScript(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ─── Gain Preset Buttons ───────────────────────────────────────────────────────

var gainBtns = document.querySelectorAll('.gain-btn');
for (var i = 0; i < gainBtns.length; i++) {
    (function (btn) {
        btn.addEventListener('click', function () {
            var gainVal = parseFloat(btn.getAttribute('data-gain'));
            // Premiere Pro Level property has +15dB internal offset
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
