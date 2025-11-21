# After Effects Expression Panel

A comprehensive After Effects script panel that provides quick access to common expressions, animations, and utilities for motion graphics and video editing workflows.

## Features

### 🎬 Basic Animations
- **Fast Wiggle** - Quick wiggle expressions with customizable frequency and amplitude
- **Posterize Time** - Frame rate reduction effects
- **Stop Motion** - Create stop-motion animation effects
- **Time Rotation** - Rotate time-based animations
- **Up/Down & Left/Right** - Directional movement animations with presets
- **Rotation PingPong** - Oscillating rotation effects
- **Thunder Flicker** - Random flickering effects
- **Scale Pulse** - Pulsing scale animations with 6 presets

### 🔄 Loops
- **Loop Out** - Seamless loop expressions
- **Loop In** - Loop from start
- **Ping Pong** - Back-and-forth loop animations

### 🎨 Complex Animations
- **Water Float** - Floating water-like movement
- **Glitter** - Sparkling particle effects
- **Fish-like** - Organic swimming motion

### 🛠️ Utilities
- **XLock** - Toggle lock status for layers named 'x' or 'X'
- **Layer Navigation** - Jump between layers quickly
- **Auto Trim** - Automatically trim overlapping layers
- **Create Null** - Generate control null objects
- **Sync Audio** - Apply time remapping for audio sync
- **Puppet to Null** - Create null objects for puppet pins (inspired by [marpinen/AE-scripts](https://github.com/marpinen/AE-scripts))
- **Flip H/V** - Horizontal and vertical layer flipping
- **Reverse KF** - Reverse selected keyframes
- **Batch Scale** - Scale multiple layers with presets
- **Smart Precomp** - Create precomps while retaining properties
- **3x3 Anchor** - Grid-based anchor point positioning
- **Mask to Crop** - Trim selected layers to work area

### 📚 Library System
- **Add to Library** - Save compositions to organized libraries
- **Library Browser** - Browse and load from saved libraries
- **Category Management** - Organize by Backgrounds, Characters, Effects, etc.
- **Thumbnail Generation** - Automatic preview generation

### ⏰ Time Controls
- **Time Jump** - Quick timeline navigation
- **Layer Jump** - Jump between layers with timing
- **Separate Jump Window** - Floating timeline controls

## Installation

1. Download the script files
2. Place `Expression_Panel.jsx` in your After Effects Scripts folder:
   - **Windows**: `C:\Program Files\Adobe\Adobe After Effects [version]\Support Files\Scripts\ScriptUI Panels\`
   - **Mac**: `/Applications/Adobe After Effects [version]/Scripts/ScriptUI Panels/`
3. Restart After Effects
4. Go to `Window > Expression Panel` to open the panel

## Usage

### Basic Workflow
1. Select a layer in your composition
2. Choose the desired animation or utility from the panel
3. Click the button to apply the expression or effect
4. Customize parameters in the dialog that appears

### Scale Pulse Presets
- **Subtle**: 95-105%, 1 cycle/sec
- **Normal**: 90-110%, 2 cycles/sec
- **Strong**: 80-120%, 3 cycles/sec
- **Fast**: 90-110%, 4 cycles/sec
- **90,110,6**: 90-110%, 6 cycles/sec
- **100,115,3**: 100-115%, 3 cycles/sec

### Up/Down Animation Presets
- **Subtle**: 12,12
- **Normal**: 50,5
- **Crazy**: 20,3
- **7,9**: 7,9
- **24,24**: 24,24
- **35,24**: 35,24
- **24,12**: 24,12
- **50,24**: 50,24
- **35,12**: 35,12

## Library System

The script includes a comprehensive library system for organizing and reusing compositions:

### Categories
- Backgrounds
- Characters
- Effects
- Logos
- Overlays
- Particles
- Text Animations
- Transitions

### Adding to Library
1. Select a composition
2. Click "Add to Library"
3. Choose category and name
4. Add description and tags
5. Save with automatic thumbnail generation

### Browsing Libraries
1. Click "Library Browser"
2. Select category to filter
3. Preview compositions with thumbnails
4. Load directly into your project

## Recent Updates

### Version 2.0
- ✅ Added Scale Pulse dialog with 6 presets
- ✅ Added Mask to Crop Layer utility
- ✅ Improved Up/Down dialog with 9 presets
- ✅ Enhanced Scale and Center functionality with anchor point approach
- ✅ Compact UI design for better workflow
- ✅ Removed redundant preview text
- ✅ Single-row input layout for better space utilization

## System Requirements

- Adobe After Effects CC 2018 or later
- Windows 10/11 or macOS 10.14 or later
- 4GB RAM minimum (8GB recommended)

## Support

For support, questions, or feature requests, please open an issue on GitHub.

## Acknowledgments

- **Puppet to Null functionality** inspired by [marpinen/AE-scripts](https://github.com/marpinen/AE-scripts) - A collection of useful After Effects scripts that provided inspiration for the puppet pin to null object conversion feature.

## License

This project is open source and available under the MIT License.

---

**Created by**: azaynzxz  
**Last Updated**: January 2025  
**Version**: 2.0
