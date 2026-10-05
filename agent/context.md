# AE-Script Workspace Context & AI Guidelines

This document serves as the primary context file for AI agents interacting with this workspace. It summarizes the architecture, file structure, design patterns, and strict coding rules to ensure consistency and save context tokens during future interactions.

## Workspace Structure

- `Expression_Panel_V2/Expression_Panel_V2.jsx`: **(Core Script)** The main dockable ScriptUI panel for After Effects. It contains 10,000+ lines of code and serves as a master toolkit for animations, utilities, and expressions.
- `Expression_Panel_V2/List_Jumper.jsx`: A helper script for timeline navigation based on CSV word data.
- `Expression_Panel_V2/Anchor_Point_Control.jsx`: A utility script for manipulating layer anchor points.
- `Expression_Panel_V2/X Crop.jsx`: A tool for cropping precomps cleanly.
- `agent/`: This folder stores context files, rulebooks, and AI-specific metadata to assist code generation.

---

## Architecture of `Expression_Panel_V2.jsx`

### 1. Global Wrapper
The entire script is wrapped in a single Immediately Invoked Function Expression (IIFE) to prevent polluting the After Effects global scope:
```javascript
(function (thisObj) {
    // All code here
    var panel = createPanel(thisObj);
    if (panel != null && panel instanceof Window) {
        panel.center();
        panel.show();
    }
})(this);
```

### 2. UI Layout & Design System
**CRITICAL RULE:** All UI additions MUST prioritize a **compact layout** matching the existing ScriptUI style.
- **Preferred Width**: `160px` for the main panel, allowing it to dock neatly on the side of the AE interface. Dialogs should be around `220px - 240px`.
- **Spacing & Margins**: Use tight spacing (e.g., `spacing = 2` or `4`) and small margins (`margins = 2` for panels, `margins = 8` for dialogs).
- **Tab System**: The UI is divided into categories:
  - `♥ Favourites` (Tab 0)
  - `★ Basic Animations` (Tab 1)
  - `✵ Complex Animations` (Tab 2)
  - `⚙ Utilities` (Tab 3)
  - `↻ Loops` (Tab 4)
  - `⚒ Tools` (Tab 5) - *Contains complex generative tools like Smart Precomp and Text Counter.*
  - `☰ Layer Utilities` (Tab 6)
  - `Search` Tab - Displays dynamic results from the `searchableItems` array.

### 3. Adding New Features
To add a new tool or preset to the panel:
1. Define the UI element in the respective Tab (e.g., `toolPairs` array). Use the format:
   `["Icon Name", "Search Key", actionFunction, "Help tooltip"]`
2. Register the tool in the `searchableItems` array for the search bar to find it.
3. Define the tool's logic (e.g., `showTextCounterDialog()`) at the bottom of the script, just above the IIFE closing bracket.

---

## Core Coding Patterns

### 1. Layer & Composition Handling
Always verify that a composition is active before running logic:
```javascript
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    alert("Please select a composition.");
    return;
}
```

### 2. Undo Groups
All layer and property modifications **must** be wrapped in an Undo group. This allows the user to press `Ctrl+Z` to revert a complex script execution in a single step.
```javascript
app.beginUndoGroup("Action Name");
try {
    // logic
} catch (e) {
    alert(e.toString());
} finally {
    app.endUndoGroup();
}
```

### 3. Numerical Controllers & Limits
When generating controllers for large values (like million-dollar counters or long timecodes):
- **ALWAYS use `ADBE Point Control` (X coordinate) or `ADBE Angle Control`** by default for large numbers.
- Standard `ADBE Slider Control` imposes a hard UI slider limit (usually 100 or 100,000) making it difficult for users to scrub to large values. Point Control allows infinite scrubbing.
- *Example reference in expression:* `effect("Control Name")("Point")[0]`

### 4. Text Generation & Auto-Scaling
When scripts create text layers dynamically (e.g., the Text Counter tool):
- Always center the text anchor and position to the middle of the composition.
- Make the font size responsive to the composition height (e.g., `comp.height / 15`) so the text isn't too small on 4K comps or too big on 720p comps.
- Use `ParagraphJustification.CENTER_JUSTIFY` to ensure text scales symmetrically.

### 5. Coordinate Transformations & Script Performance
- **`toComp()` Does Not Exist in ExtendScript**: In After Effects, `toComp()`, `toWorld()`, `fromComp()`, and `fromWorld()` are Expression-only methods on the `Layer` object. Calling `layer.toComp()` in ExtendScript `.jsx` throws a runtime `TypeError` (`undefined is not a function`).
- **Never Change `comp.time` in Calculation Loops**: Modifying `comp.time = t` moves the Current Time Indicator (CTI) and forces After Effects to evaluate expressions, clear caches, and fully render the active Composition Viewer frame-by-frame. Looping over layers while setting `comp.time` causes severe UI freezes, triggers Windows "(Not Responding)" states, and introduces multi-second lags.
- **Analytical 2D Coordinate Transformation (`localPointToComp`)**: When projecting points from layer local space (e.g. from `layer.sourceRectAtTime(t, false)`) to composition coordinates in scripts (such as calculating collective bounding boxes for tools like `Squash 2`), use analytical matrix/trigonometric transforms (`localPointToComp`). Recursively walk up `curLayer.parent` to apply anchor point, position, scale, and rotation in pure JavaScript memory. This executes sub-millisecond with zero playhead movement or viewport redraws.
- **Single-Pass Keyframe Sampling**: When parenting layers and compensating keyframed transforms, sample all keyframe times and values before reparenting rather than toggling `layer.parent` repeatedly inside a keyframe loop.
- **Selected Layers Bounding Box Bottom-Center Placement**: For Squash 2 (staggered transitions), the control Null is placed at the exact bottom center of the combined bounding box of all selected layers (`bounds.left + bounds.width / 2, bounds.top + bounds.height`). The Null's anchor point is placed at its bottom center (`[50, 100]` for 2D, `[50, 100, 0]` for 3D), and layer bounds are sampled using the current comp time if within range or inPoint/outPoint boundaries.

---

## Common Expressions & Regex Rules

The panel frequently injects JavaScript expressions into After Effects properties.
- **Backslashes:** Remember to double-escape backslashes when writing regex inside ExtendScript strings.
  - *Correct:* `replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")`
  - *Incorrect:* `replace(/\B(?=(\d{3})+(?!\d))/g, ",")` (This will break when injected into AE).
- **Time Formatting:** 
  - Standard time conversions rely on dividing seconds (`val / 3600` for hours, `(val % 3600) / 60` for minutes).
  - Use `Math.floor()` extensively to lock integers.
- **Currency Symbols:** Always support a variety of formats (US `$`, Rp `Rp`, Euro `€`, Yen `¥`, Pound `£`, Rupee `₹`) and allow toggling between commas and dots for thousands separators depending on the locale.

## Directives for Future AI Agents
1. **Ban emoji use:** Do not use emojis in code, documentation, or markdown files.
2. **Prioritize the compact UI over redundant spacing:** Never build sprawling windows. Keep ScriptUI layouts incredibly tight and minimal. Prioritizing a compact UI over redundant spacing is a strict requirement. See the "UI Layout & Design System" section above for the exact styling reference (e.g., spacing = 2 to 6, margins = 2 to 8, dialog width = 220px-240px, panel width = 160px).
3. **Read this file first:** Always read `agent/context.md` to understand the rules before suggesting massive refactors.
4. **Safety First:** Wrap everything in `try/catch` blocks and `beginUndoGroup` / `endUndoGroup`.
5. **Use Exact Match Names:** Always use internal MatchNames for properties (e.g., `"ADBE Point Control"`, `"ADBE Slider Control"`) to ensure compatibility across different AE language versions.
