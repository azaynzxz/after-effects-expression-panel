# 🎬 Audio Replacer

A simple and elegant GUI tool for replacing audio tracks in video files using FFmpeg.

![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Required-green.svg)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## Features

- ✅ **Simple GUI** - Clean, intuitive Tkinter interface
- ✅ **Video Selection** - Support for MP4, MOV, MKV, AVI, WebM, and more
- ✅ **Audio Selection** - Support for MP3, WAV, AAC, FLAC, OGG, and more
- ✅ **Automatic Sync** - Uses `-shortest` flag to ensure audio/video sync
- ✅ **Safe Output** - Automatically adds `_X` suffix to output filename
- ✅ **Progress Display** - Real-time FFmpeg output in status log
- ✅ **Error Handling** - Comprehensive validation and error messages

## Requirements

### 1. Python 3.7+
The application uses Python with Tkinter (included in standard Python installation).

### 2. FFmpeg
FFmpeg must be installed and accessible from the command line.

#### Windows Installation:
```bash
# Using Chocolatey
choco install ffmpeg

# Using Scoop
scoop install ffmpeg

# Or download from: https://ffmpeg.org/download.html
# Add to PATH environment variable
```

#### macOS Installation:
```bash
# Using Homebrew
brew install ffmpeg
```

#### Linux Installation:
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg

# Arch Linux
sudo pacman -S ffmpeg
```

## Installation & Running

### Quick Start

1. **Navigate to the application folder:**
   ```bash
   cd d:\Praktek\AE-Script\audio_replacer
   ```

2. **Run the application:**
   ```bash
   python audio_replacer.py
   ```

### No Additional Dependencies Required!
The application uses only Python standard library modules (Tkinter, subprocess, threading, os, sys, pathlib).

## Usage

1. **Launch the application** by running `python audio_replacer.py`

2. **Select Video File** - Click "Browse..." next to "Video File" and select your video

3. **Select Audio File** - Click "Browse..." next to "Audio File" and select your new audio

4. **Review Output Path** - The output file will automatically be named with `_X` suffix
   - Example: `video.mp4` → `video_X.mp4`

5. **Click "Replace Audio"** - The process will start and show progress in the status log

6. **Done!** - A success message will appear with an option to open the output folder

## How It Works

The application uses the following FFmpeg command:

```bash
ffmpeg -i inputVideo.mp4 -i newAudio.mp3 -c:v copy -map 0:v:0 -map 1:a:0 -shortest output.mp4
```

### Command Breakdown:
| Flag | Description |
|------|-------------|
| `-i inputVideo.mp4` | Input video file |
| `-i newAudio.mp3` | Input audio file |
| `-c:v copy` | Copy video stream (no re-encoding = fast!) |
| `-map 0:v:0` | Use video from first input (index 0) |
| `-map 1:a:0` | Use audio from second input (index 1) |
| `-shortest` | Finish when the shortest input ends |
| `-y` | Overwrite output without asking |

## Supported Formats

### Video Formats
- MP4 (`.mp4`)
- MOV (`.mov`)
- MKV (`.mkv`)
- AVI (`.avi`)
- WebM (`.webm`)
- WMV (`.wmv`)
- FLV (`.flv`)

### Audio Formats
- MP3 (`.mp3`)
- WAV (`.wav`)
- AAC (`.aac`)
- FLAC (`.flac`)
- OGG (`.ogg`)
- M4A (`.m4a`)

---

## 🚀 Optional Enhancements (Future Ideas)

### 1. **Batch Processing Mode**
Process multiple video files at once with the same audio track.

```python
# Concept: Add a folder selection option
def batch_process(self, video_folder, audio_file):
    for video in video_folder.glob("*.mp4"):
        self.replace_audio(video, audio_file)
```

### 2. **Drag and Drop Support**
Add drag-and-drop functionality using `tkinterdnd2` library.

```bash
pip install tkinterdnd2
```

### 3. **Audio Trimming**
Add start/end time options to trim audio before replacing.

```bash
# FFmpeg command with audio trimming
ffmpeg -i video.mp4 -i audio.mp3 -ss 00:00:05 -t 00:01:00 -c:v copy -map 0:v:0 -map 1:a:0 output.mp4
```

### 4. **Audio Mixing**
Mix original audio with new audio instead of replacing.

```bash
# FFmpeg command for mixing
ffmpeg -i video.mp4 -i audio.mp3 -filter_complex "[0:a][1:a]amerge=inputs=2[a]" -map 0:v -map "[a]" output.mp4
```

### 5. **Preview Feature**
Add a preview button to play a few seconds of the output before full processing.

### 6. **Custom Output Path**
Allow users to choose a custom output location and filename.

### 7. **Video Trimming**
Add start/end time options to trim the video as well.

### 8. **Settings Panel**
- Audio codec selection (AAC, MP3, copy)
- Video quality settings
- Default output folder

### 9. **Progress Bar with Percentage**
Parse FFmpeg output to show actual progress percentage.

### 10. **History/Recent Files**
Remember recently used files for quick access.

---

## Troubleshooting

### "FFmpeg not found" Error
- Ensure FFmpeg is installed and added to your system PATH
- Test by running `ffmpeg -version` in command prompt/terminal

### "Processing failed" Error
- Check if input files are valid and not corrupted
- Ensure you have write permissions to the output folder
- Check the status log for specific FFmpeg error messages

### GUI Not Displaying Correctly
- Ensure you're using Python 3.7 or higher
- Tkinter should be included with Python, but if missing:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install python3-tk
  ```

---

## License

This project is provided as-is for educational and personal use.

## Author

Created with ❤️ for easy video audio replacement.
