# Kanban Visualization - Complete Configuration Guide

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Language Configuration (NLS)](#language-configuration-nls)
4. [Lane Configuration](#lane-configuration)
5. [Color Configuration](#color-configuration)
6. [Building and Deployment](#building-and-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Topics](#advanced-topics)

---

## Overview

The Kanban visualization displays tasks in columns (lanes) based on their completion percentage. It supports:
- **Multi-language** translations (English, Slovenian, French, German, Spanish, Croatian)
- **Configurable lane headers** with separate logic and display values
- **External color configuration** for easy customization
- **Automatic language detection** based on browser settings

### Key Features
- 7 lanes: 0%, 10%, 25%, 50%, 75%, 95%, 100%
- Task assignment based on completion percentage
- Color-coded category stripes
- Conditional highlighting (RED/YELLOW flags)
- Customizable text without code changes

---

## Quick Start

### Making Quick Changes

**Change lane headers to custom text:**
1. Edit: `src/customviz/com-smartq-kanbanviz/nls/root/messages.js` (English) or `nls/sl/messages.js` (Slovenian)
2. Find: `LANE_X_PERCENT_HEADER` values
3. Change: `"LANE_25_PERCENT_HEADER": "In Progress"` to any text you want
4. Save and rebuild

**Change colors:**
1. Edit: `src/customviz/com-smartq-kanbanviz/colorConfig.js`
2. Find: `categoryPalette` array
3. Change: Any hex color value (e.g., `"#245D63"` → `"#FF0000"`)
4. Save and rebuild

**Rebuild and deploy:**
```bash
cd /Users/zigavaupot/Documents/dv-custom-plugins
./gradlew clean build
```
Upload: `build/distributions/customviz_com-smartq-kanbanviz.zip`

---

## Language Configuration (NLS)

### Overview

All user-facing text is stored in external NLS (National Language Support) files. The visualization automatically detects the browser's language and loads the appropriate translations.

### Language Files Location

The visualization supports 6 languages:

| Language | Code | File Path |
|----------|------|-----------|
| English (default) | en | `nls/root/messages.js` |
| Slovenian | sl | `nls/sl/messages.js` |
| French | fr | `nls/fr/messages.js` |
| German | de | `nls/de/messages.js` |
| Spanish | es | `nls/es/messages.js` |
| Croatian | hr | `nls/hr/messages.js` |

**Language registration:**
```
src/customviz/com-smartq-kanbanviz/nls/messages.js
```

### Available Translation Keys

#### UI Labels

| Key | English Default | Slovenian Default | Description |
|-----|----------------|-------------------|-------------|
| KANBAN_BOARD_TITLE | Kanban Board | Kanban tabela | Main board title |
| TASK_COUNT_LABEL | Number of tasks | Št. nalog | Task count label |
| OVERDUE_LABEL | Overdue | Zamujenih | Overdue tasks label |
| DUE_IN_30_DAYS_LABEL | Due in 30 days | Rok v 30 dnevih | Tasks due soon label |
| TASKS_LABEL | tasks | nalog | Word for "tasks" |

#### Lane Configuration Keys

Each lane has **TWO** properties:

1. **`LANE_X_PERCENT`** - Logic value (percentage)
   - **DO NOT CHANGE** - Used internally to assign tasks to lanes
   - Must remain as percentages: "0%", "10%", "25%", "50%", "75%", "95%", "100%"

2. **`LANE_X_PERCENT_HEADER`** - Display text
   - **CUSTOMIZE THIS** - Can be any text you want
   - Examples: "Not Started", "In Progress", "Complete"

**Available lanes:**

| Lane | Logic Key | Logic Value | Header Key | English Header | Slovenian Header |
|------|-----------|-------------|------------|----------------|------------------|
| 1 | LANE_0_PERCENT | "0%" | LANE_0_PERCENT_HEADER | Not Started | Ni začeto |
| 2 | LANE_10_PERCENT | "10%" | LANE_10_PERCENT_HEADER | Just Started | Pravkar začeto |
| 3 | LANE_25_PERCENT | "25%" | LANE_25_PERCENT_HEADER | In Progress | V teku |
| 4 | LANE_50_PERCENT | "50%" | LANE_50_PERCENT_HEADER | Half Done | Na polovici |
| 5 | LANE_75_PERCENT | "75%" | LANE_75_PERCENT_HEADER | Almost There | Skoraj končano |
| 6 | LANE_95_PERCENT | "95%" | LANE_95_PERCENT_HEADER | Final Review | Končni pregled |
| 7 | LANE_100_PERCENT | "100%" | LANE_100_PERCENT_HEADER | Complete | Dokončano |

### How to Edit Translations

#### Step 1: Open the Language File

For English:
```bash
open src/customviz/com-smartq-kanbanviz/nls/root/messages.js
```

For Slovenian:
```bash
open src/customviz/com-smartq-kanbanviz/nls/sl/messages.js
```

#### Step 2: Edit Values

**Example - Change board title:**
```javascript
"KANBAN_BOARD_TITLE": "Kanban Board",  // Change to "Task Board"
```

**Example - Change lane headers:**
```javascript
"LANE_0_PERCENT": "0%",                    // DO NOT CHANGE
"LANE_0_PERCENT_HEADER": "Not Started",   // Change to "To Do"

"LANE_25_PERCENT": "25%",                  // DO NOT CHANGE
"LANE_25_PERCENT_HEADER": "In Progress",  // Change to "Doing"

"LANE_100_PERCENT": "100%",                // DO NOT CHANGE
"LANE_100_PERCENT_HEADER": "Complete"     // Change to "Done"
```

#### Step 3: Save and Rebuild

```bash
./gradlew clean build
```

#### Step 4: Deploy

Upload `build/distributions/customviz_com-smartq-kanbanviz.zip` to Oracle Analytics (Console → Plugins)

#### Step 5: Test

1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check console: `[KanbanViz] Using [Language] translations from NLS file`

### Language Detection

The visualization automatically detects browser language and loads the appropriate translations:

- **Slovenian** (sl, sl-SI, etc.) → Uses `nls/sl/messages.js`
- **French** (fr, fr-FR, etc.) → Uses `nls/fr/messages.js`
- **German** (de, de-DE, etc.) → Uses `nls/de/messages.js`
- **Spanish** (es, es-ES, etc.) → Uses `nls/es/messages.js`
- **Croatian** (hr, hr-HR, etc.) → Uses `nls/hr/messages.js`
- **Any other language** → Uses `nls/root/messages.js` (English - default)

**To test different languages:**
- **Chrome:** Settings → Languages → Move preferred language to top
- **Firefox:** Settings → Language → Choose language
- **Safari:** System Preferences → Language & Region

Then reload Oracle Analytics with hard refresh.

---

## Lane Configuration

### How Lane Assignment Works

Tasks are automatically assigned to lanes based on their completion percentage:

| Completion % | Logic Value | Assigned To | Display Text Key |
|--------------|-------------|-------------|------------------|
| 0-9% | 0% | Lane 1 | LANE_0_PERCENT_HEADER |
| 10-24% | 10% | Lane 2 | LANE_10_PERCENT_HEADER |
| 25-49% | 25% | Lane 3 | LANE_25_PERCENT_HEADER |
| 50-74% | 50% | Lane 4 | LANE_50_PERCENT_HEADER |
| 75-94% | 75% | Lane 5 | LANE_75_PERCENT_HEADER |
| 95-99% | 95% | Lane 6 | LANE_95_PERCENT_HEADER |
| 100% | 100% | Lane 7 | LANE_100_PERCENT_HEADER |

### Example: Task with 35% Completion

1. **Logic checks:** 35% falls between 25% and 49%
2. **Task assigned to:** "25%" lane (using `LANE_25_PERCENT = "25%"`)
3. **Column displays:** Whatever text is in `LANE_25_PERCENT_HEADER` (e.g., "In Progress")

### Two-Parameter System

The lane configuration uses **two separate parameters** for each lane:

#### 1. Logic Value (`LANE_X_PERCENT`)
- **Purpose:** Used by code to assign tasks to lanes
- **Format:** Must be percentage string: "0%", "10%", "25%", etc.
- **Rule:** **NEVER CHANGE THESE VALUES**
- **Example:** `"LANE_25_PERCENT": "25%"`

#### 2. Display Text (`LANE_X_PERCENT_HEADER`)
- **Purpose:** Text shown to users in column headers
- **Format:** Any text you want
- **Rule:** **CUSTOMIZE THIS FREELY**
- **Example:** `"LANE_25_PERCENT_HEADER": "In Progress"`

### Customization Examples

#### Example 1: Simple Status Labels

**English:**
```javascript
"LANE_0_PERCENT_HEADER": "To Do",
"LANE_25_PERCENT_HEADER": "Doing",
"LANE_100_PERCENT_HEADER": "Done"
```

**Slovenian:**
```javascript
"LANE_0_PERCENT_HEADER": "Opraviti",
"LANE_25_PERCENT_HEADER": "Delam",
"LANE_100_PERCENT_HEADER": "Končano"
```

#### Example 2: Workflow Stages

**English:**
```javascript
"LANE_0_PERCENT_HEADER": "Backlog",
"LANE_10_PERCENT_HEADER": "Planning",
"LANE_25_PERCENT_HEADER": "Development",
"LANE_50_PERCENT_HEADER": "Testing",
"LANE_75_PERCENT_HEADER": "Review",
"LANE_95_PERCENT_HEADER": "Approval",
"LANE_100_PERCENT_HEADER": "Released"
```

#### Example 3: Team-Specific Labels

**English:**
```javascript
"LANE_0_PERCENT_HEADER": "New Request",
"LANE_10_PERCENT_HEADER": "Assigned",
"LANE_25_PERCENT_HEADER": "Working",
"LANE_50_PERCENT_HEADER": "Blocked",
"LANE_75_PERCENT_HEADER": "Ready for QA",
"LANE_95_PERCENT_HEADER": "QA Testing",
"LANE_100_PERCENT_HEADER": "Deployed"
```

#### Example 4: Keep Percentages

If you prefer showing percentages:
```javascript
"LANE_0_PERCENT_HEADER": "0%",
"LANE_10_PERCENT_HEADER": "10%",
"LANE_25_PERCENT_HEADER": "25%",
"LANE_50_PERCENT_HEADER": "50%",
"LANE_75_PERCENT_HEADER": "75%",
"LANE_95_PERCENT_HEADER": "95%",
"LANE_100_PERCENT_HEADER": "100%"
```

### Important Rules

#### ✅ DO:
- Customize `LANE_X_PERCENT_HEADER` values to any text
- Use different text for different languages
- Keep text concise (10-20 characters recommended)
- Rebuild and redeploy after changes

#### ❌ DON'T:
- **NEVER** change `LANE_X_PERCENT` values (must remain "0%", "10%", etc.)
- Don't use special HTML characters (they will be escaped)
- Don't make headers too long (may not fit in narrow columns)

### Technical Flow

```
Task with 35% completion
    ↓
getLaneName(0.35)
    ↓
Returns: messages.LANE_25_PERCENT = "25%"
    ↓
Task assigned to "25%" lane
    ↓
renderLane("25%", [...tasks])
    ↓
getLaneHeader("25%")
    ↓
Returns: messages.LANE_25_PERCENT_HEADER = "In Progress"
    ↓
Column header displays: "In Progress (tasks: 5)"
```

---

## Color Configuration

### Overview

Colors are configured in an external file that can be edited without touching code. The visualization uses colors for:
1. **Category stripes** - Colored left edge on each card
2. **Conditional highlights** - RED/YELLOW backgrounds for flagged tasks

### Color Configuration File

**Location:** `src/customviz/com-smartq-kanbanviz/colorConfig.js`

### Category Stripe Colors

Categories are assigned colors **alphabetically**:

#### How It Works

1. All unique values from the "Color" column are collected
2. They are sorted alphabetically
3. Each value is assigned a color from the palette in order
4. Colors cycle if there are more categories than colors

#### Example

If your Color column has values: **VLO**, **SK J-1**, **SL J-4**, **DODATNA**

After alphabetical sorting:
1. DODATNA → `categoryPalette[0]` → #245D63 (Dark teal)
2. SK J-1 → `categoryPalette[1]` → #DE7F11 (Orange)
3. SL J-4 → `categoryPalette[2]` → #5FB9B5 (Light blue)
4. VLO → `categoryPalette[3]` → #4E4137 (Dark brown)

#### Default Color Palette

```javascript
categoryPalette: [
  "#245D63",    // Color 1 - Dark teal
  "#DE7F11",    // Color 2 - Orange
  "#5FB9B5",    // Color 3 - Light blue/cyan
  "#4E4137",    // Color 4 - Dark brown
  "#A0C98B",    // Color 5 - Light green
  "#B47288",    // Color 6 - Light mauve/pink
  "#83401E",    // Color 7 - Dark brown/rust
  "#BBC26A",    // Color 8 - Light olive/yellow-green
  "#9E7FCC",    // Color 9 - Light purple
  "#58316E",    // Color 10 - Dark purple
  "#5FA2BA",    // Color 11 - Light cyan/blue
  "#317A45"     // Color 12 - Dark green
]
```

### Conditional Card Colors

Tasks can be flagged with RED or YELLOW conditions (from Tooltip columns):

#### RED Condition (Highest Priority)
- **Usage:** Overdue tasks or critical items
- **Background:** `#ffe5e5` (Light red)
- **Border:** `#e09393` (Darker red)
- **Trigger:** First Tooltip column value = "Y" / "Yes" / "1" / "TRUE"

#### YELLOW Condition (Second Priority)
- **Usage:** Warnings or items due soon
- **Background:** `#fff9e5` (Light yellow)
- **Border:** `#e0d093` (Darker yellow)
- **Trigger:** Second Tooltip column value = "Y" / "Yes" / "1" / "TRUE"
- **Note:** If both RED and YELLOW are true, RED takes priority

### How to Change Colors

#### Step 1: Open Color Configuration File

```bash
open src/customviz/com-smartq-kanbanviz/colorConfig.js
```

#### Step 2: Edit Color Values

**Change category stripe colors:**
```javascript
categoryPalette: [
  "#FF0000",    // Bright red (changed)
  "#00FF00",    // Bright green (changed)
  "#0000FF",    // Bright blue (changed)
  "#FFFF00",    // Yellow (changed)
  // ... add more colors or keep existing
]
```

**Change conditional card colors:**
```javascript
// RED condition colors (overdue/critical)
redBackground: "#ffcccc",    // Lighter red (changed)
redBorder: "#ff6666",         // Brighter red (changed)

// YELLOW condition colors (warnings/due soon)
yellowBackground: "#ffffcc",  // Lighter yellow (changed)
yellowBorder: "#ffff66"       // Brighter yellow (changed)
```

#### Step 3: Use a Color Picker

Find hex colors at: https://htmlcolorcodes.com/

#### Step 4: Save and Rebuild

```bash
./gradlew clean build
```

#### Step 5: Deploy and Test

1. Upload new ZIP to Oracle Analytics
2. Clear browser cache
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Check console: `[KanbanViz] Loaded color configuration`

### Color Configuration Examples

#### Example 1: Bright Primary Colors
```javascript
categoryPalette: [
  "#FF0000",    // Red
  "#00FF00",    // Green
  "#0000FF",    // Blue
  "#FFFF00",    // Yellow
  "#FF00FF",    // Magenta
  "#00FFFF"     // Cyan
]
```

#### Example 2: Pastel Colors
```javascript
categoryPalette: [
  "#FFB3BA",    // Light red
  "#FFDFBA",    // Light orange
  "#FFFFBA",    // Light yellow
  "#BAFFC9",    // Light green
  "#BAE1FF",    // Light blue
  "#E0BBE4"     // Light purple
]
```

#### Example 3: Dark Theme
```javascript
categoryPalette: [
  "#8B0000",    // Dark red
  "#006400",    // Dark green
  "#00008B",    // Dark blue
  "#8B8B00",    // Dark yellow
  "#8B008B",    // Dark magenta
  "#008B8B"     // Dark cyan
]
```

### Important Notes

- **Format:** Colors must be in hex format: `#RRGGBB`
- **Order matters:** First color goes to first category alphabetically
- **Cycling:** If you have more categories than colors, colors will repeat
- **Rebuild required:** Changes require rebuilding and redeployment
- **Case insensitive:** `#FF0000` is the same as `#ff0000`

---

## Building and Deployment

### Prerequisites

- Java Development Kit (JDK) installed
- Gradle build tool (included in project)
- Access to Oracle Analytics Cloud

### Build Process

#### Step 1: Navigate to Project Directory

```bash
cd /Users/zigavaupot/Documents/dv-custom-plugins
```

#### Step 2: Clean Previous Build

```bash
./gradlew clean
```

#### Step 3: Build the Plugin

```bash
./gradlew build
```

Expected output:
```
BUILD SUCCESSFUL in Xs
10 actionable tasks: 10 executed
```

#### Step 4: Locate Built Plugin

The plugin ZIP file will be at:
```
build/distributions/customviz_com-smartq-kanbanviz.zip
```

### Deployment to Oracle Analytics

#### Step 1: Access Oracle Analytics Console

1. Log in to Oracle Analytics Cloud
2. Click hamburger menu (☰)
3. Select **Console**

#### Step 2: Navigate to Plugins

1. In Console, click **Plugins** (or **Extensions**)
2. You'll see list of installed plugins

#### Step 3: Upload Plugin

1. Click **Upload** or **Add Plugin** button
2. Select: `build/distributions/customviz_com-smartq-kanbanviz.zip`
3. Wait for upload to complete
4. Plugin status should show "Active" or "Enabled"

#### Step 4: Refresh Browser

1. **Clear browser cache completely**
2. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
3. Or close and reopen browser

### Verification

#### Check Console Logs

Open browser Developer Tools (F12) and check Console:

```
[KanbanViz] Detected browser language: en-US
[KanbanViz] Using English translations from NLS file (default)
[KanbanViz] Loaded color configuration: {categoryPalette: Array(12), ...}
```

#### Visual Verification

1. Create or open a workbook
2. Add Kanban visualization
3. Check:
   - Lane headers show custom text
   - Category colors display correctly
   - UI labels show in correct language

### Build Troubleshooting

#### Error: Permission Denied

```bash
chmod +x gradlew
./gradlew build
```

#### Error: Java Not Found

Install JDK and set JAVA_HOME:
```bash
export JAVA_HOME=/path/to/jdk
```

#### Error: Build Failed with Syntax Error

Check NLS files for:
- Missing commas
- Missing quotes
- Extra comma after last property
- Invalid JSON syntax

---

## Troubleshooting

### Language Issues

#### UI Shows Wrong Language

**Problem:** Visualization displays English but browser is set to Slovenian

**Solutions:**
1. Check browser language settings (must be sl, sl-SI, sl-*)
2. Clear browser cache completely
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Check console log: `[KanbanViz] Detected browser language: ...`

#### UI Still Shows Old Text After Update

**Problem:** Changed translations but UI shows old values

**Solutions:**
1. Verify you rebuilt: `./gradlew clean build`
2. Verify you uploaded the NEW ZIP file (check timestamp)
3. Clear browser cache completely
4. Hard refresh multiple times
5. Try incognito/private browsing window
6. Close and reopen browser

#### Console Shows Error Loading NLS File

**Problem:** `Failed to load resource: nls/root/messages.js`

**Solutions:**
1. Check file exists: `src/customviz/com-smartq-kanbanviz/nls/root/messages.js`
2. Check NLS files have valid syntax (no JSON errors)
3. Rebuild and redeploy

### Lane Configuration Issues

#### Lane Headers Show Percentages Instead of Custom Text

**Problem:** Headers show "0%", "10%" instead of "Not Started", "In Progress"

**Solutions:**
1. Check you edited `LANE_X_PERCENT_HEADER` (not `LANE_X_PERCENT`)
2. Verify NLS file has all header properties
3. Rebuild and redeploy
4. Clear cache and hard refresh

#### Tasks Appear in Wrong Lanes

**Problem:** Task with 30% shows in wrong column

**Solutions:**
1. **NEVER change `LANE_X_PERCENT` values** - they must stay "0%", "10%", etc.
2. If you changed them, restore original percentage values
3. Only change `LANE_X_PERCENT_HEADER` values
4. Rebuild and redeploy

### Color Issues

#### Colors Don't Change After Editing

**Problem:** Changed colors in colorConfig.js but visualization shows old colors

**Solutions:**
1. Verify you saved colorConfig.js
2. Rebuild: `./gradlew clean build`
3. Upload NEW ZIP file
4. Clear browser cache completely
5. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
6. Check console: `[KanbanViz] Loaded color configuration`

#### Category Colors Wrong Order

**Problem:** Colors don't match expected categories

**Solution:** Remember categories are sorted **alphabetically**
- "VLO" comes after "SK J-1" alphabetically
- Check the alphabetical order of your categories
- Adjust color palette order accordingly

#### Conditional Colors Not Working

**Problem:** RED/YELLOW backgrounds don't show

**Solutions:**
1. Check Tooltip columns contain "Y" / "Yes" / "1" / "TRUE" (case-insensitive)
2. First Tooltip column = RED flag
3. Second Tooltip column = YELLOW flag
4. Verify Tooltip columns are mapped correctly in data model

### Build Issues

#### Build Fails with Syntax Error

**Problem:** `./gradlew build` fails with error in messages.js

**Common causes:**
```javascript
// Missing comma
"KANBAN_BOARD_TITLE": "Kanban Board"
"TASK_COUNT_LABEL": "Tasks"  // ERROR: needs comma above

// Extra comma at end
"LANE_100_PERCENT_HEADER": "Complete",  // ERROR: last property can't have comma
});

// Missing quote
"KANBAN_BOARD_TITLE: "Kanban Board",  // ERROR: missing opening quote
```

**Solution:** Fix syntax error, save file, rebuild

#### Gradle Command Not Found

**Problem:** `./gradlew: command not found`

**Solutions:**
```bash
# Make gradlew executable
chmod +x gradlew

# Then run
./gradlew build
```

### Deployment Issues

#### Plugin Upload Fails

**Problem:** Oracle Analytics rejects plugin ZIP

**Solutions:**
1. Verify ZIP file is not corrupted
2. Check file size (not too large)
3. Try removing old plugin first, then upload new one
4. Check Oracle Analytics version compatibility

#### Plugin Installed But Not Visible

**Problem:** Plugin uploaded successfully but doesn't appear in visualization list

**Solutions:**
1. Refresh browser completely (not just F5)
2. Clear browser cache
3. Log out and log back in to Oracle Analytics
4. Check plugin status in Console (should be "Active")

---

## Advanced Topics

### Adding New Languages

To add support for a new language (e.g., German):

#### Step 1: Create Language Folder
```bash
mkdir src/customviz/com-smartq-kanbanviz/nls/de
```

#### Step 2: Create messages.js File

Copy structure from root/messages.js and translate:

```javascript
// src/customviz/com-smartq-kanbanviz/nls/de/messages.js
define({
  "KANBANVIZ_DISPLAY_NAME": "Kanban-Tafel (nach % Abschluss)",
  "KANBAN_BOARD_TITLE": "Kanban-Tafel",
  "TASK_COUNT_LABEL": "Anzahl der Aufgaben",
  "OVERDUE_LABEL": "Überfällig",
  "DUE_IN_30_DAYS_LABEL": "Fällig in 30 Tagen",
  "TASKS_LABEL": "Aufgaben",

  "LANE_0_PERCENT": "0%",
  "LANE_0_PERCENT_HEADER": "Nicht begonnen",
  "LANE_10_PERCENT": "10%",
  "LANE_10_PERCENT_HEADER": "Gerade begonnen",
  // ... all other properties
});
```

#### Step 3: Register Language

Edit `nls/messages.js`:
```javascript
define({
  "root": true,
  "sl": true,
  "de": true  // Add German
});
```

#### Step 4: Update kanbanViz.js

Add German module to dependencies:
```javascript
define([
  // ... other dependencies
  'com-smartq-kanbanviz/nls/root/messages',
  'com-smartq-kanbanviz/nls/sl/messages',
  'com-smartq-kanbanviz/nls/de/messages',  // Add this
  // ...
], function(..., messages_en, messages_sl, messages_de) {
```

Update language detection:
```javascript
if (userLang.indexOf('sl') === 0) {
    messages = messages_sl;
} else if (userLang.indexOf('de') === 0) {
    messages = messages_de;
} else {
    messages = messages_en;
}
```

#### Step 5: Rebuild and Test

```bash
./gradlew clean build
```

### File Structure

```
src/customviz/com-smartq-kanbanviz/
├── kanbanViz.js                 # Main visualization code
├── kanbanVizstyles.css          # Styling
├── colorConfig.js               # Color configuration
├── plugin.xml                   # Plugin metadata
└── nls/                         # Translation files
    ├── messages.js              # Language registration
    ├── root/
    │   └── messages.js          # English (default)
    ├── sl/
    │   └── messages.js          # Slovenian
    └── de/                      # (Optional) German
        └── messages.js
```

### Technical Implementation Notes

#### Language Detection

```javascript
var userLang = navigator.language || navigator.userLanguage || 'en';
userLang = userLang.toLowerCase();

console.log('[KanbanViz] Detected browser language:', userLang);

if (userLang.indexOf('sl') === 0) {
    messages = messages_sl;
    console.log('[KanbanViz] Using Slovenian translations from NLS file');
} else {
    messages = messages_en;
    console.log('[KanbanViz] Using English translations from NLS file (default)');
}
```

#### Lane Header Mapping

```javascript
function getLaneName(pctNum) {
    // Assigns tasks to lanes based on completion %
    if (pctNum < 0.10) return messages.LANE_0_PERCENT;   // Returns "0%"
    if (pctNum < 0.25) return messages.LANE_10_PERCENT;  // Returns "10%"
    // ...
}

function getLaneHeader(laneValue) {
    // Maps lane values to display headers
    switch(laneValue) {
        case messages.LANE_0_PERCENT:   return messages.LANE_0_PERCENT_HEADER;
        case messages.LANE_10_PERCENT:  return messages.LANE_10_PERCENT_HEADER;
        // ...
    }
}
```

#### Color Mapping

```javascript
function initializeCategoryColorMap(tasks) {
    // Collect unique categories
    var uniqueCategories = {};
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].colorKey) {
            uniqueCategories[tasks[i].colorKey] = true;
        }
    }

    // Sort alphabetically
    var sortedCategories = Object.keys(uniqueCategories).sort();

    // Map to colors
    CATEGORY_COLOR_MAP = {};
    var palette = KANBAN_COLORS.categoryPalette;
    for (var i = 0; i < sortedCategories.length; i++) {
        var colorIndex = i % palette.length; // Cycle if needed
        CATEGORY_COLOR_MAP[sortedCategories[i]] = palette[colorIndex];
    }
}
```

### Performance Considerations

- **Language detection** runs once on module load
- **Color mapping** rebuilds on each render (handles dynamic data)
- **Lane assignment** uses simple numeric comparisons (fast)
- **RequireJS** caches loaded modules (no repeated file loads)

### Best Practices

1. **Always test in both languages** after making changes
2. **Keep lane headers concise** (10-20 characters max)
3. **Use color picker tool** for hex values
4. **Document custom colors** in comments
5. **Test with different data** (categories, percentages)
6. **Clear cache thoroughly** after each deployment
7. **Check console logs** for debugging information

---

## Support and Resources

### Console Logging

The visualization logs helpful information to browser console:

```javascript
[KanbanViz] Detected browser language: sl-SI
[KanbanViz] Using Slovenian translations from NLS file
[KanbanViz] Loaded color configuration: {...}
[KanbanViz] Category color mapping: {"VLO": "#245D63", ...}
```

### File Locations Quick Reference

**Build output:**
```
build/distributions/customviz_com-smartq-kanbanviz.zip
```

**English translations:**
```
src/customviz/com-smartq-kanbanviz/nls/root/messages.js
```

**Slovenian translations:**
```
src/customviz/com-smartq-kanbanviz/nls/sl/messages.js
```

**Color configuration:**
```
src/customviz/com-smartq-kanbanviz/colorConfig.js
```

**Main code:**
```
src/customviz/com-smartq-kanbanviz/kanbanViz.js
```

### Common Tasks Checklist

**Change lane headers:**
- [ ] Edit nls/root/messages.js (English) or nls/sl/messages.js (Slovenian)
- [ ] Modify `LANE_X_PERCENT_HEADER` values only
- [ ] Save file
- [ ] Run `./gradlew clean build`
- [ ] Upload new ZIP to Oracle Analytics
- [ ] Clear cache and hard refresh

**Change colors:**
- [ ] Edit colorConfig.js
- [ ] Modify hex color values
- [ ] Save file
- [ ] Run `./gradlew clean build`
- [ ] Upload new ZIP to Oracle Analytics
- [ ] Clear cache and hard refresh

**Add new language:**
- [ ] Create nls/XX/ folder
- [ ] Create nls/XX/messages.js with translations
- [ ] Register language in nls/messages.js
- [ ] Update kanbanViz.js language detection
- [ ] Rebuild and deploy

---

## Appendix: Complete File Examples

### Example: English Messages File

```javascript
// src/customviz/com-smartq-kanbanviz/nls/root/messages.js
define({
  // Plugin metadata
  "KANBANVIZ_DISPLAY_NAME": "Kanban Board (by % Complete)",
  "KANBANVIZ_SHORT_DISPLAY_NAME": "Kanban Board",
  "KANBANVIZ_CATEGORY": "KanbanViz Plugin",
  "KANBANVIZ_ROW": "Task",
  "KANBANVIZ_MEASURE": "Completion %",
  "KANBANVIZ_COLOR": "Color",
  "KANBANVIZ_TOOLTIP": "Tooltip",

  // UI Labels
  "KANBAN_BOARD_TITLE": "Kanban Board",
  "TASK_COUNT_LABEL": "Number of tasks",
  "OVERDUE_LABEL": "Overdue",
  "DUE_IN_30_DAYS_LABEL": "Due in 30 days",
  "TASKS_LABEL": "tasks",

  // Lane configuration
  "LANE_0_PERCENT": "0%",
  "LANE_0_PERCENT_HEADER": "Not Started",
  "LANE_10_PERCENT": "10%",
  "LANE_10_PERCENT_HEADER": "Just Started",
  "LANE_25_PERCENT": "25%",
  "LANE_25_PERCENT_HEADER": "In Progress",
  "LANE_50_PERCENT": "50%",
  "LANE_50_PERCENT_HEADER": "Half Done",
  "LANE_75_PERCENT": "75%",
  "LANE_75_PERCENT_HEADER": "Almost There",
  "LANE_95_PERCENT": "95%",
  "LANE_95_PERCENT_HEADER": "Final Review",
  "LANE_100_PERCENT": "100%",
  "LANE_100_PERCENT_HEADER": "Complete"
});
```

### Example: Color Configuration File

```javascript
// src/customviz/com-smartq-kanbanviz/colorConfig.js
define([], function() {
  "use strict";

  return {
    // Category stripe colors
    categoryPalette: [
      "#245D63",    // Color 1 - Dark teal
      "#DE7F11",    // Color 2 - Orange
      "#5FB9B5",    // Color 3 - Light blue/cyan
      "#4E4137",    // Color 4 - Dark brown
      "#A0C98B",    // Color 5 - Light green
      "#B47288",    // Color 6 - Light mauve/pink
      "#83401E",    // Color 7 - Dark brown/rust
      "#BBC26A",    // Color 8 - Light olive/yellow-green
      "#9E7FCC",    // Color 9 - Light purple
      "#58316E",    // Color 10 - Dark purple
      "#5FA2BA",    // Color 11 - Light cyan/blue
      "#317A45"     // Color 12 - Dark green
    ],

    // Conditional card colors
    redBackground: "#ffe5e5",    // RED - overdue/critical
    redBorder: "#e09393",
    yellowBackground: "#fff9e5",  // YELLOW - warning/due soon
    yellowBorder: "#e0d093"
  };
});
```

---

**Version:** 1.0
**Last Updated:** January 2026
**Plugin:** customviz_com-smartq-kanbanviz
