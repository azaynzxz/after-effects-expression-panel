# List Jumper for After Effects

A script that reads word-level timing data from XLSX/CSV files and allows you to search and jump to specific words in your After Effects timeline.

## Features

- 📂 Load XLSX or CSV files with timing data
- 🔍 Search for specific words (press Enter to search)
- 📋 Show context: 2 words before + match + 1 word after
- ➡️ Click to jump to where the NEXT word starts
- 🎯 Auto-highlights entry closest to current playhead with ● 
- ⚡ No extra button clicks needed - syncs automatically
- ⏱️ Perfect for finding edit points at word boundaries
- 🪟 Works with any active composition (stays in your current comp!)
- 🎬 Falls back to "main_comp" if no comp is open
- ✨ Ultra-compact display format

## Installation

1. Copy `List_Jumper.jsx` to your After Effects Scripts folder:
   - **Windows**: `C:\Program Files\Adobe\Adobe After Effects [version]\Support Files\Scripts\`
   - **Mac**: `/Applications/Adobe After Effects [version]/Scripts/`

2. Restart After Effects or run the script from File > Scripts > Run Script File

## Usage

### Step 1: Prepare Your Data File

The script expects a file with at least two columns:
- **start**: The time in seconds (e.g., 5.234)
- **word**: The word spoken at that time

#### Option A: Use CSV (Recommended)

CSV files work natively and are most reliable. To create a CSV from Excel:

1. Open your XLSX file in Microsoft Excel
2. Go to **File > Save As**
3. Choose **CSV (Comma delimited) (*.csv)** as the file format
4. Save the file

#### Option B: Use XLSX (Limited Support)

XLSX parsing in ExtendScript is limited due to file compression. The script will attempt to parse XLSX files but may fail on some files. If it doesn't work, please use the CSV option above.

### Step 2: Run the Script

1. In After Effects, open any composition you want to work in
2. Run the script: **File > Scripts > List_Jumper.jsx**
3. The List Jumper window will open
4. The script will jump in your **currently active composition** (no more forced switches!)

### Step 3: Load Your Data

1. Click **"Select XLSX/CSV File"**
2. Browse to your data file and select it
3. The script will load and parse the data
4. You'll see a count of entries loaded in the status bar

### Step 4: Search and Jump

1. Type in the **Search** field to filter words
   - Press **Enter** or click **Search** button to execute search
   - Search is case-insensitive and matches partial words
   - Leave empty and click **Show All** to display all entries

2. **Auto-Sync with Playhead**
   - The entry closest to your current playhead is automatically highlighted with ● (colored dot)
   - Updates every time you search or refresh the list
   - Helps you see where you are in the timeline relative to your search results

3. Results show: **2 previous words + match > timecode nextword**
   - Example: `  my loyal subjects. > 00:00:03.300 King`
   - Example (closest): `● my loyal subjects. > 00:00:03.300 King`
   - See context: what comes before and after your match
   - Click any item to jump to the NEXT word's timestamp

4. Use case: Finding the perfect cut point
   - Search for the word you want to find
   - The ● shows which entry matches your current playhead position
   - See the full context (2 words before, your match, 1 word after)
   - Click to jump to where the NEXT word begins
   - Perfect for editing at word boundaries!

## Data Format Example

Your CSV/XLSX should look like this:

```csv
start,word
00:00:01:003,Hello,
00:00:02:000,my
00:00:02:003,loyal
00:00:02:011,subjects.
00:00:03:009,King
00:00:03:014,Crappy
```

- **start** (required): Timestamp in format HH:MM:SS:FFF (hours:minutes:seconds:frames) or decimal seconds
- **word** (required): The word at that timestamp
- Other columns (optional): Can include additional data like end time, confidence score, etc.

### Example Display

When you search for "subjects":

```
  my loyal subjects. > 00:00:03.300 King
● Hello, my loyal > 00:00:02.000 my
  loyal subjects. King > 00:00:03.467 Crappy
```

- **●** - Automatically shows which entry is closest to your current playhead
- **my loyal subjects.** - Shows 2 words before + your match for context
- **> 00:00:03.300 King** - The next word with its timecode
- **Click anywhere** - Jumps to 00:00:03.300 (where "King" starts)

The ● indicator automatically updates every time you search or refresh the list!

## Troubleshooting

### "Could not find 'main_comp'"

Make sure you have a composition named exactly **"main_comp"** in your project. The name is case-sensitive.

### "Could not find 'start' and 'word' columns"

Check that your CSV/XLSX file has headers named "start" and "word" (case-insensitive). The script looks for these column names in the first row.

### XLSX files not loading

XLSX format uses compression that's difficult to parse in ExtendScript. Solutions:
1. Export your XLSX file as CSV (recommended)
2. Use the provided `XLSX_to_CSV_Converter.jsx` helper script
3. Manually open in Excel and Save As CSV

### No results showing

- Check that your data has valid numeric values in the "start" column
- Make sure the "word" column has text values
- Verify the file loaded successfully (check status bar)

## Technical Details

- **Supported Formats**: CSV (best), XLSX (limited)
- **Time Format**: Decimal seconds (e.g., 5.234 = 5 seconds and 234 milliseconds)
- **Display Format**: HH:MM:SS.mmm
- **Composition**: Must be named "main_comp"
- **Search**: Case-insensitive, partial matching

## Sample Data

A sample file is included: `Your life as the brothel madam VO_en_word_level.xlsx`

This file contains word-level transcription data with start times that you can use to test the script.

## Version History

**v1.4** - Active Composition Support
- Now works with whatever composition you're currently viewing!
- No more forced switches to main_comp
- Stays in precomps, nested comps, anywhere you're working
- Falls back to main_comp if no composition is active

**v1.3** - Auto-Sync & Ultra-Compact UI
- Auto-sync: Entry closest to playhead is automatically highlighted with ●
- No extra button needed - syncs every time you search
- Ultra-compact: Window width reduced, height optimized
- Streamlined workflow - less clicking, more editing

**v1.2** - Context Display
- Show 2 previous words + match + next word
- Clean format: `prev2 prev1 match > timecode nextword`
- Removed redundant "Match:" and "[CLICK]" labels
- Click any result to jump to the NEXT word's timestamp
- Perfect for finding cut points with full context

**v1.1** - Context Update
- Added "Next Words" feature to show words after the match
- Fixed timecode parsing (HH:MM:SS:FFF format)
- Added "Show All" button
- Search now triggers on Enter key (no more lag)

**v1.0** - Initial release
- CSV and XLSX support
- Search filtering
- Timeline jump functionality

## Support

For issues or questions, refer to the Expression_Panel.jsx script in the same directory for similar timeline jumping implementation details.

---

**Created for After Effects | Native JSX/ExtendScript**

