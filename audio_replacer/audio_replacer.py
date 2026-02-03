"""
Audio Replacer - A GUI tool for replacing audio tracks in video files
======================================================================
This application allows users to:
- Select a video file (mp4, mov, mkv, avi, webm)
- Select a new audio file (mp3, wav, aac, flac, ogg)
- Replace the original audio track with the new audio
- Output a new video file with "_X" suffix

Uses FFmpeg under the hood for processing.

Author: Audio Replacer Tool
Version: 1.0.0
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import subprocess
import threading
import os
import sys
from pathlib import Path


class AudioReplacerApp:
    """Main application class for the Audio Replacer GUI."""
    
    # Supported file formats
    VIDEO_FORMATS = [
        ("Video Files", "*.mp4 *.mov *.mkv *.avi *.webm *.wmv *.flv"),
        ("MP4 Files", "*.mp4"),
        ("MOV Files", "*.mov"),
        ("MKV Files", "*.mkv"),
        ("AVI Files", "*.avi"),
        ("All Files", "*.*")
    ]
    
    AUDIO_FORMATS = [
        ("Audio Files", "*.mp3 *.wav *.aac *.flac *.ogg *.m4a"),
        ("MP3 Files", "*.mp3"),
        ("WAV Files", "*.wav"),
        ("AAC Files", "*.aac"),
        ("FLAC Files", "*.flac"),
        ("All Files", "*.*")
    ]
    
    def __init__(self, root):
        """Initialize the application."""
        self.root = root
        self.root.title("🎬 Audio Replacer")
        self.root.geometry("650x550")
        self.root.minsize(550, 450)
        self.root.resizable(True, True)
        
        # Configure style
        self.setup_style()
        
        # Variables
        self.video_path = tk.StringVar()
        self.audio_path = tk.StringVar()
        self.output_path = tk.StringVar()
        self.is_processing = False
        self.process = None
        
        # Build UI
        self.create_widgets()
        
        # Center window on screen
        self.center_window()
    
    def setup_style(self):
        """Configure ttk styles for a modern look."""
        style = ttk.Style()
        style.theme_use('clam')  # Use 'clam' theme for better cross-platform look
        
        # Configure colors
        style.configure('TFrame', background='#f5f5f5')
        style.configure('TLabel', background='#f5f5f5', font=('Segoe UI', 10))
        style.configure('TButton', font=('Segoe UI', 10), padding=8)
        style.configure('Header.TLabel', font=('Segoe UI', 14, 'bold'), foreground='#333')
        style.configure('Status.TLabel', font=('Segoe UI', 9), foreground='#666')
        
        # Primary button style
        style.configure('Primary.TButton', font=('Segoe UI', 11, 'bold'))
        style.map('Primary.TButton',
                  background=[('active', '#0056b3'), ('!disabled', '#007bff')],
                  foreground=[('!disabled', 'white')])
        
        self.root.configure(bg='#f5f5f5')
    
    def center_window(self):
        """Center the window on the screen."""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')
    
    def create_widgets(self):
        """Create all UI widgets."""
        # Main container with padding
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header
        header_label = ttk.Label(
            main_frame, 
            text="🎬 Video Audio Replacer",
            style='Header.TLabel'
        )
        header_label.pack(pady=(0, 5))
        
        subtitle_label = ttk.Label(
            main_frame,
            text="Replace audio tracks in video files using FFmpeg",
            style='Status.TLabel'
        )
        subtitle_label.pack(pady=(0, 20))
        
        # === Video Selection Section ===
        video_frame = ttk.LabelFrame(main_frame, text="📹 Video File", padding="10")
        video_frame.pack(fill=tk.X, pady=(0, 10))
        
        video_entry_frame = ttk.Frame(video_frame)
        video_entry_frame.pack(fill=tk.X)
        
        self.video_entry = ttk.Entry(
            video_entry_frame, 
            textvariable=self.video_path,
            state='readonly',
            font=('Segoe UI', 9)
        )
        self.video_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        
        self.video_btn = ttk.Button(
            video_entry_frame,
            text="Browse...",
            command=self.select_video
        )
        self.video_btn.pack(side=tk.RIGHT)
        
        # === Audio Selection Section ===
        audio_frame = ttk.LabelFrame(main_frame, text="🎵 Audio File", padding="10")
        audio_frame.pack(fill=tk.X, pady=(0, 10))
        
        audio_entry_frame = ttk.Frame(audio_frame)
        audio_entry_frame.pack(fill=tk.X)
        
        self.audio_entry = ttk.Entry(
            audio_entry_frame,
            textvariable=self.audio_path,
            state='readonly',
            font=('Segoe UI', 9)
        )
        self.audio_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        
        self.audio_btn = ttk.Button(
            audio_entry_frame,
            text="Browse...",
            command=self.select_audio
        )
        self.audio_btn.pack(side=tk.RIGHT)
        
        # === Output Section ===
        output_frame = ttk.LabelFrame(main_frame, text="💾 Output File", padding="10")
        output_frame.pack(fill=tk.X, pady=(0, 15))
        
        self.output_label = ttk.Label(
            output_frame,
            textvariable=self.output_path,
            font=('Segoe UI', 9),
            foreground='#28a745'
        )
        self.output_label.pack(fill=tk.X)
        
        # === Process Button ===
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(0, 15))
        
        self.process_btn = ttk.Button(
            button_frame,
            text="🚀 Replace Audio",
            command=self.start_processing,
            style='Primary.TButton'
        )
        self.process_btn.pack(fill=tk.X, ipady=5)
        
        # === Progress Bar ===
        self.progress = ttk.Progressbar(
            main_frame,
            mode='indeterminate',
            length=300
        )
        self.progress.pack(fill=tk.X, pady=(0, 10))
        
        # === Status/Log Section ===
        status_frame = ttk.LabelFrame(main_frame, text="📋 Status Log", padding="10")
        status_frame.pack(fill=tk.BOTH, expand=True)
        
        # Text widget with scrollbar
        log_container = ttk.Frame(status_frame)
        log_container.pack(fill=tk.BOTH, expand=True)
        
        self.log_text = tk.Text(
            log_container,
            height=8,
            font=('Consolas', 9),
            bg='#1e1e1e',
            fg='#d4d4d4',
            insertbackground='white',
            wrap=tk.WORD,
            state=tk.DISABLED
        )
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(log_container, orient=tk.VERTICAL, command=self.log_text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.config(yscrollcommand=scrollbar.set)
        
        # Configure text tags for colored output
        self.log_text.tag_configure('info', foreground='#4fc3f7')
        self.log_text.tag_configure('success', foreground='#81c784')
        self.log_text.tag_configure('error', foreground='#e57373')
        self.log_text.tag_configure('warning', foreground='#ffb74d')
        
        # Initial log message
        self.log_message("Ready. Please select a video and audio file.", 'info')
    
    def log_message(self, message, tag='info'):
        """Add a message to the log with optional styling."""
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"{message}\n", tag)
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)
    
    def clear_log(self):
        """Clear the log text widget."""
        self.log_text.config(state=tk.NORMAL)
        self.log_text.delete(1.0, tk.END)
        self.log_text.config(state=tk.DISABLED)
    
    def select_video(self):
        """Open file dialog to select video file."""
        file_path = filedialog.askopenfilename(
            title="Select Video File",
            filetypes=self.VIDEO_FORMATS
        )
        if file_path:
            self.video_path.set(file_path)
            self.update_output_path()
            self.log_message(f"Video selected: {os.path.basename(file_path)}", 'info')
    
    def select_audio(self):
        """Open file dialog to select audio file."""
        file_path = filedialog.askopenfilename(
            title="Select Audio File",
            filetypes=self.AUDIO_FORMATS
        )
        if file_path:
            self.audio_path.set(file_path)
            self.log_message(f"Audio selected: {os.path.basename(file_path)}", 'info')
    
    def update_output_path(self):
        """Generate output file path with _X suffix."""
        video = self.video_path.get()
        if video:
            path = Path(video)
            output_name = f"{path.stem}_X{path.suffix}"
            output_full = path.parent / output_name
            self.output_path.set(str(output_full))
    
    def validate_inputs(self):
        """Validate that all required inputs are provided."""
        errors = []
        
        # Check video file
        video = self.video_path.get()
        if not video:
            errors.append("Please select a video file.")
        elif not os.path.isfile(video):
            errors.append("Selected video file does not exist.")
        
        # Check audio file
        audio = self.audio_path.get()
        if not audio:
            errors.append("Please select an audio file.")
        elif not os.path.isfile(audio):
            errors.append("Selected audio file does not exist.")
        
        # Check FFmpeg availability
        if not self.check_ffmpeg():
            errors.append("FFmpeg is not installed or not in PATH.")
        
        return errors
    
    def check_ffmpeg(self):
        """Check if FFmpeg is available in the system."""
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            )
            return result.returncode == 0
        except FileNotFoundError:
            return False
        except Exception:
            return False
    
    def start_processing(self):
        """Start the audio replacement process."""
        if self.is_processing:
            messagebox.showwarning("Warning", "Processing is already in progress.")
            return
        
        # Validate inputs
        errors = self.validate_inputs()
        if errors:
            messagebox.showerror("Validation Error", "\n".join(errors))
            return
        
        # Check if output file exists
        output = self.output_path.get()
        if os.path.exists(output):
            if not messagebox.askyesno(
                "File Exists",
                f"Output file already exists:\n{os.path.basename(output)}\n\nDo you want to overwrite it?"
            ):
                return
        
        # Start processing in a separate thread
        self.is_processing = True
        self.set_ui_state(False)
        self.clear_log()
        self.progress.start(10)
        
        thread = threading.Thread(target=self.run_ffmpeg, daemon=True)
        thread.start()
    
    def set_ui_state(self, enabled):
        """Enable or disable UI controls during processing."""
        state = 'normal' if enabled else 'disabled'
        self.video_btn.config(state=state)
        self.audio_btn.config(state=state)
        self.process_btn.config(state=state)
    
    def run_ffmpeg(self):
        """Run FFmpeg command to replace audio."""
        video = self.video_path.get()
        audio = self.audio_path.get()
        output = self.output_path.get()
        
        self.log_message("Starting audio replacement...", 'info')
        self.log_message(f"Input video: {os.path.basename(video)}", 'info')
        self.log_message(f"New audio: {os.path.basename(audio)}", 'info')
        self.log_message(f"Output: {os.path.basename(output)}", 'info')
        self.log_message("-" * 50, 'info')
        
        # Build FFmpeg command
        # -i inputVideo: input video file
        # -i newAudio: input audio file  
        # -c:v copy: copy video stream without re-encoding
        # -map 0:v:0: use video from first input
        # -map 1:a:0: use audio from second input
        # -shortest: finish encoding when shortest input ends
        # -y: overwrite output file without asking
        
        cmd = [
            'ffmpeg',
            '-i', video,
            '-i', audio,
            '-c:v', 'copy',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            '-y',
            output
        ]
        
        self.log_message(f"Command: ffmpeg -i [video] -i [audio] -c:v copy -map 0:v:0 -map 1:a:0 -shortest [output]", 'info')
        self.log_message("-" * 50, 'info')
        
        try:
            # Run FFmpeg process
            creation_flags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=creation_flags
            )
            
            # Read stderr (FFmpeg outputs progress to stderr)
            for line in self.process.stderr:
                line = line.strip()
                if line:
                    # Schedule UI update from main thread
                    self.root.after(0, lambda l=line: self.log_message(l, 'info'))
            
            # Wait for process to complete
            self.process.wait()
            
            if self.process.returncode == 0:
                self.root.after(0, self.on_success)
            else:
                self.root.after(0, lambda: self.on_error("FFmpeg process failed."))
                
        except FileNotFoundError:
            self.root.after(0, lambda: self.on_error("FFmpeg not found. Please install FFmpeg and add it to PATH."))
        except Exception as e:
            self.root.after(0, lambda: self.on_error(str(e)))
        finally:
            self.process = None
    
    def on_success(self):
        """Handle successful processing completion."""
        self.progress.stop()
        self.is_processing = False
        self.set_ui_state(True)
        
        self.log_message("-" * 50, 'success')
        self.log_message("✅ Audio replacement completed successfully!", 'success')
        self.log_message(f"Output saved to: {self.output_path.get()}", 'success')
        
        # Show success dialog with option to open output folder
        result = messagebox.askyesno(
            "Success",
            f"Audio replacement completed!\n\nOutput: {os.path.basename(self.output_path.get())}\n\nOpen output folder?"
        )
        
        if result:
            self.open_output_folder()
    
    def on_error(self, error_message):
        """Handle processing error."""
        self.progress.stop()
        self.is_processing = False
        self.set_ui_state(True)
        
        self.log_message("-" * 50, 'error')
        self.log_message(f"❌ Error: {error_message}", 'error')
        
        messagebox.showerror("Error", f"Processing failed:\n{error_message}")
    
    def open_output_folder(self):
        """Open the output folder in file explorer."""
        output = self.output_path.get()
        if output:
            folder = os.path.dirname(output)
            if sys.platform == 'win32':
                os.startfile(folder)
            elif sys.platform == 'darwin':
                subprocess.run(['open', folder])
            else:
                subprocess.run(['xdg-open', folder])


def main():
    """Main entry point for the application."""
    root = tk.Tk()
    
    # Set window icon (optional, uses default if file not found)
    try:
        # You can add a custom icon here
        pass
    except:
        pass
    
    app = AudioReplacerApp(root)
    
    # Handle window close
    def on_closing():
        if app.is_processing:
            if messagebox.askokcancel("Quit", "Processing is in progress. Do you want to cancel and exit?"):
                if app.process:
                    app.process.terminate()
                root.destroy()
        else:
            root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()


if __name__ == "__main__":
    main()
