# AE Expression Panel V2 — Installation Guide

This folder contains the ScriptUI panel scripts and universal cross-platform installers for Adobe After Effects.

---

## 🪟 Windows Installation

You can install using PowerShell (`install.ps1`):

### Option A: Right-Click (Quickest)
1. Right-click **`install.ps1`**.
2. Select **Run with PowerShell**.
3. If prompted by Windows UAC for administrator privileges, click **Yes**.
4. Follow the on-screen menu to choose your After Effects version (e.g. `1` for 2024, `2` for 2025, `3` for 2026, or `A` for all installed versions).

### Option B: PowerShell Terminal
Open PowerShell in this directory and run:
```powershell
# Interactive menu:
.\install.ps1

# Or target a specific version directly:
.\install.ps1 2026

# Or install to all detected After Effects versions:
.\install.ps1 all
```

---

## 🍎 macOS Installation

### Option A: Double-Click (GUI)
1. Double-click **`install.command`** in Finder.
2. Terminal will open automatically and display the version selection menu.
3. If prompted for administrator permissions to write to `/Applications`, enter your macOS user password.

### Option B: Terminal
Open Terminal in this directory and run:
```bash
# Interactive menu:
./install.sh

# Or target a specific version directly:
./install.sh 2026

# Or install to all detected After Effects versions:
./install.sh all
```

---

## 📦 Installed Scripts
The installers deploy the following ScriptUI Panels to `Scripts/ScriptUI Panels`:
- `Expression_Panel_V2.jsx`
- `List_Jumper.jsx`
- `X Crop.jsx`
- `Anchor_Point_Control.jsx`
- `Sync_PSDs_Timeline.jsx`
- `BatchRendering.jsx`
- `SmartRig.jsx`

After installation, restart Adobe After Effects and find the panels under **Window > [Script Name]**.
