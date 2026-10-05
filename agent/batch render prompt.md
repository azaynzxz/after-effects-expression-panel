# Prompt: Build "Batch Rendering" — After Effects ScriptUI Panel

## Context
Build a ScriptUI panel script for Adobe After Effects called **Batch Rendering**, written entirely in ExtendScript (.jsx). It lets a user mark multiple in/out time ranges on the current playhead position inside a target composition (default target: a comp named `main_comp`), then send all marked ranges to After Effects' native Render Queue in one click — each range as its own render queue item, auto-named, auto-foldered.

Build this as a single `.jsx` file using ScriptUI (`Window`, `Panel`, `Group`, `Button`, `ListBox`/`EditText`, etc.) so it can be dropped straight into After Effects' `Scripts/ScriptUI Panels` folder (dockable panel) or `Scripts` folder (run-once dialog) with no packaging, manifest, or signing step. No HTML/CSS/CEP — pure ExtendScript UI and logic in one context.

## Core Requirements

### 1. Target composition
- Default target comp: look up by name `"main_comp"` in `app.project` (search all items for `CompItem` with matching name).
- If not found, show a dropdown (`DropDownList`) of all open comps so the user can pick one instead (don't hard-fail).
- Show the currently targeted comp name in the panel header (static text).

### 2. Marking ranges from the playhead
- Two buttons: **Mark In** and **Mark Out**.
- Clicking either grabs `comp.time` (current playhead / time-indicator position, in seconds) from the target comp at the moment of the click — do not require the user to type timecode manually.
- Convert seconds → timecode using the comp's `frameRate` (respect drop-frame vs non-drop if `comp.dropFrame` is true), formatted as `HH:MM:SS:FF`.
- Each Mark In + Mark Out pair becomes one "range" entry in a list.
- Support marking multiple ranges in one session (repeat Mark In/Out as many times as needed) — this is the main use case, e.g.:
  - `00:07:33:00 → 00:10:06:03`
  - `00:02:00:00 → 00:02:12:00`
- Validate: Out must be after In; ranges may not need to be sorted or non-overlapping (allow overlap — user's call), but flag (not block) if Out < In.

### 3. Range list UI
- Show all marked ranges in a `ListBox` (multi-column via `addItem` + subitems, or a fixed-width text-formatted row) showing: index, In timecode, Out timecode, duration, name/suffix field.
- Since ScriptUI's `ListBox` doesn't support inline editable cells well, handle per-row editing via: select a row → its In/Out/suffix populate into small edit fields below the list → "Update Row" button applies changes back into the list.
- Include +/- 1 frame nudge buttons next to the In/Out edit fields, in case the click wasn't frame-accurate.
- "Delete selected" and "Clear all" buttons.

### 4. Render button → native Render Queue
- **Render** button takes every range in the list and, for each one:
  - Adds the target comp to `app.project.renderQueue.items` (one queue item per range).
  - Sets the item's time span to that range using `timeSpanStart` and `timeSpanDuration` (convert timecode back to seconds using comp frame rate).
  - Applies the output module: use the project's currently-set default Output Module template if present, otherwise fall back to a sensible default (e.g. "Lossless" or whatever is first available) — expose this as a `DropDownList` in the panel (read templates via `app.project.renderQueue.items[i].outputModule(1).templates`).
  - Sets the output file path per the naming/folder rules below (section 5).
- After building all queue items, either:
  - Auto-start rendering (`app.project.renderQueue.render()`), or
  - Just queue them and leave it to the user to hit Render in AE's queue panel.
  - Make this a toggle: **"Render immediately"** checkbox (default off, since users often want to review the queue first).

### 5. Auto-naming and output folder
- Create one subfolder per batch session under the project's default render output folder (or a user-chosen root folder, exposed via a folder picker button using `Folder.selectDialog()`).
- Subfolder name pattern: `{compName}_batch_{YYYYMMDD}_{HHMM}` (e.g. `main_comp_batch_20260722_1430`).
- Per-range file name pattern: `{compName}_{index}_{inTC}-{outTC}{suffix}` with timecode colons replaced by hyphens for filesystem safety (e.g. `main_comp_01_00-07-33-00_to_00-10-06-03`).
- `{suffix}` = the editable name field from the range list (optional, appended if the user typed one, e.g. `_intro`, `_v2`).
- Sanitize all name components (strip `:`, `/`, spaces → underscores) before writing to disk.
- Show a live preview text field of the resolved file path per selected row so the user sees the final name before rendering.

## Suggested file structure
```
BatchRendering.jsx     (single file — UI build + all logic + render queue calls)
```
Keep it as one file for easy distribution; internally separate into clearly commented sections: `// --- UI ---`, `// --- Timecode helpers ---`, `// --- Render Queue logic ---`.

## Key ExtendScript API points to use
- `app.project.activeItem` / search `app.project.items` for `main_comp`
- `comp.time`, `comp.frameRate`, `comp.dropFrame`
- `app.project.renderQueue.items.add(comp)`
- `renderQueueItem.timeSpanStart`, `.timeSpanDuration`
- `renderQueueItem.outputModule(1).file = new File(path)`
- `renderQueueItem.outputModule(1).applyTemplate(templateName)`
- `app.project.renderQueue.render()`
- `Folder.selectDialog()`, `Folder(path).create()`
- Wrap all project-mutating calls in `app.beginUndoGroup(...)` / `app.endUndoGroup()`
- Build the panel with `this instanceof Panel ? this : new Window("palette", "Batch Rendering", undefined, {resizeable:true})` at the top of the script, so it works both as a dockable ScriptUI panel and as a run-once dialog.

## Edge cases to handle
- `main_comp` missing → prompt comp picker, don't crash.
- User clicks Render with zero ranges → disable button / show inline warning (`StaticText` message).
- Duplicate range names → auto-suffix with `_2`, `_3`, etc. to avoid overwriting files.
- Output folder not writable / doesn't exist → create it (`Folder(path).create()`), or fall back to project's default render location with a warning shown in-panel.
- Panel resizing: use `layout.resize()` on window resize so the ListBox and buttons scale reasonably.

## Deliverable
A single working `BatchRendering.jsx` script installable in After Effects by placing it in `Scripts/ScriptUI Panels` (for a dockable panel, accessed via Window menu) matching the above — no external dependencies, no build step, no packaging.