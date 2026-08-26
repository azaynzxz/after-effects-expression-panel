/**
 * SFX Browser — Frontend Logic
 * Communicates with host/index.jsx via CSInterface
 * Uses Node.js child_process for ffprobe silence detection
 */

var cs = new CSInterface();
var cachedItems = []; // Full list from ExtendScript
var sortAsc = true;   // Current sort direction

var favorites = JSON.parse(localStorage.getItem('sfx_favorites') || '[]');
var currentAudio = null;
var currentPlayBtn = null;

function isFavorite(treePath) {
    return favorites.indexOf(treePath) !== -1;
}

function toggleFavorite(treePath, btnElement) {
    var idx = favorites.indexOf(treePath);
    if (idx !== -1) {
        favorites.splice(idx, 1);
        if (btnElement) {
            btnElement.classList.remove('active');
            btnElement.innerText = '☆';
        }
    } else {
        favorites.push(treePath);
        if (btnElement) {
            btnElement.classList.add('active');
            btnElement.innerText = '★';
        }
    }
    localStorage.setItem('sfx_favorites', JSON.stringify(favorites));
}

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

document.getElementById('sortBtn').addEventListener('click', function () {
    sortAsc = !sortAsc;
    this.innerText = sortAsc ? 'A-Z' : 'Z-A';
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

    // Sort by favorite, then by name
    filtered.sort(function (a, b) {
        var aFav = isFavorite(a.treePath);
        var bFav = isFavorite(b.treePath);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;

        var diff = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        return sortAsc ? diff : -diff;
    });

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
            div.draggable = true;

            var favActive = isFavorite(item.treePath);
            div.innerHTML =
                '<span class="icon">♪</span>' +
                '<span class="name">' + escapeHtml(item.name) + '</span>' +
                '<span class="path">' + escapeHtml(item.binPath || '') + '</span>' +
                '<div class="actions">' +
                '  <button class="action-btn play" title="Preview">▶</button>' +
                '  <button class="action-btn star ' + (favActive ? 'active' : '') + '" title="Favorite">' + (favActive ? '★' : '☆') + '</button>' +
                '</div>';

            div.addEventListener('dragstart', function(e) {
                if (item.mediaPath) {
                    e.dataTransfer.setData('com.adobe.cep.dnd.file.0', item.mediaPath);
                }
            });

            div.addEventListener('click', function (e) {
                if (e.target.classList.contains('play')) {
                    e.stopPropagation();
                    togglePlay(item, e.target);
                    return;
                }
                if (e.target.classList.contains('star')) {
                    e.stopPropagation();
                    toggleFavorite(item.treePath, e.target);
                    return;
                }
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

// ─── Play / Preview Audio ──────────────────────────────────────────────────────

function togglePlay(item, btn) {
    if (currentAudio) {
        currentAudio.pause();
        if (currentPlayBtn) {
            currentPlayBtn.innerText = '▶';
            currentPlayBtn.classList.remove('playing');
        }
        var wasPlayingSame = (currentPlayBtn === btn);
        currentAudio = null;
        currentPlayBtn = null;
        if (wasPlayingSame) {
            return;
        }
    }

    setStatus('Loading preview for "' + item.name + '" …');
    cs.evalScript('getMediaPath("' + escapeForScript(item.treePath) + '")', function (filePath) {
        if (!filePath || filePath === 'undefined' || filePath === 'null') {
            setStatus('Cannot preview: file path not found', 'error');
            return;
        }

        var cleanPath = filePath.replace(/^"|"$/g, '');
        cleanPath = cleanPath.replace(/\\/g, '/');
        if (cleanPath.charAt(0) !== '/') {
            cleanPath = '/' + cleanPath;
        }
        // Properly encode the URI to handle spaces and special chars
        var fileUrl = 'file://' + encodeURI(cleanPath).replace(/#/g, '%23').replace(/\?/g, '%3F');

        try {
            currentAudio = new Audio(fileUrl);
            currentAudio.volume = 0.6;

            var playPromise = currentAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(function () {
                    setStatus('Playing: ' + item.name, 'success');
                    btn.innerText = '■';
                    btn.classList.add('playing');
                    currentPlayBtn = btn;
                }).catch(function (e) {
                    setStatus('Preview error: ' + e.message, 'error');
                });
            } else {
                // For older environments where play() does not return a promise
                setStatus('Playing: ' + item.name, 'success');
                btn.innerText = '■';
                btn.classList.add('playing');
                currentPlayBtn = btn;
            }

            currentAudio.addEventListener('ended', function () {
                if (currentPlayBtn === btn) {
                    btn.innerText = '▶';
                    btn.classList.remove('playing');
                    currentPlayBtn = null;
                    currentAudio = null;
                    setStatus('Ready');
                }
            });
        } catch (e) {
            setStatus('Error playing audio: ' + e.message, 'error');
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
        // MUST append 2>&1 so stderr is redirected to stdout in childProcess.execSync
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

// ─── Microphone Recording ──────────────────────────────────────────────────────

var mediaRecorder = null;
var recordedChunks = [];
var isRecording = false;

document.getElementById('recordBtn').addEventListener('click', function() {
    var btn = this;
    if (isRecording) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];
        
        mediaRecorder.addEventListener('dataavailable', function(e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        });

        mediaRecorder.addEventListener('stop', function() {
            isRecording = false;
            btn.classList.remove('recording');
            setStatus('Processing recording...', 'success');
            
            stream.getTracks().forEach(function(track) { track.stop(); });

            var blob = new Blob(recordedChunks, { type: 'audio/webm' });
            var reader = new FileReader();
            reader.onload = function() {
                var buffer = Buffer.from(reader.result);
                var tempDir = require('os').tmpdir();
                var webmPath = path.join(tempDir, 'sfx_record_' + Date.now() + '.webm');
                var wavPath = webmPath.replace('.webm', '.wav');
                
                require('fs').writeFileSync(webmPath, buffer);
                
                var ffmpegCmd = findFfmpeg();
                if (ffmpegCmd) {
                    try {
                        childProcess.execSync(ffmpegCmd + ' -y -i "' + webmPath + '" "' + wavPath + '"', {stdio: 'pipe'});
                        showRecordedItem(wavPath);
                        setStatus('Recording ready', 'success');
                    } catch (e) {
                        setStatus('Error converting recording', 'error');
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
        setStatus('Recording microphone...', 'success');
    }).catch(function(err) {
        setStatus('Microphone error: ' + err.message, 'error');
    });
});

function showRecordedItem(filePath) {
    var container = document.getElementById('recordResult');
    container.style.display = 'block';
    container.innerHTML = '';
    
    var div = document.createElement('div');
    div.className = 'list-item';
    div.draggable = true;
    div.style.background = '#2a3a2a';
    div.style.border = '1px solid #4caf50';
    div.innerHTML =
        '<span class="icon" style="color:#4caf50">🎤</span>' +
        '<span class="name">Recorded Audio</span>' +
        '<span class="path">Drag to timeline!</span>' +
        '<div class="actions">' +
        '  <button class="action-btn play" title="Preview">▶</button>' +
        '</div>';
        
    div.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('com.adobe.cep.dnd.file.0', filePath.replace(/\\/g, '/'));
    });
    
    div.addEventListener('click', function(e) {
        if (e.target.classList.contains('play')) {
            e.stopPropagation();
            if (currentAudio) {
                currentAudio.pause();
                if (currentPlayBtn) {
                    currentPlayBtn.innerText = '▶';
                    currentPlayBtn.classList.remove('playing');
                }
                var wasPlaying = (currentPlayBtn === e.target);
                currentAudio = null;
                currentPlayBtn = null;
                if (wasPlaying) return;
            }
            
            var fileUrl = 'file://' + encodeURI(filePath.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/\?/g, '%3F');
            currentAudio = new Audio(fileUrl);
            currentAudio.volume = 0.6;
            currentAudio.play().catch(function(){});
            
            e.target.innerText = '■';
            e.target.classList.add('playing');
            currentPlayBtn = e.target;
            
            currentAudio.addEventListener('ended', function() {
                e.target.innerText = '▶';
                e.target.classList.remove('playing');
                currentPlayBtn = null;
                currentAudio = null;
            });
        }
    });
    
    container.appendChild(div);
}
