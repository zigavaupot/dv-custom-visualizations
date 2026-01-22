# Calendar Visualization - Complete Configuration Guide

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Language Configuration (NLS)](#language-configuration-nls)
4. [Color Configuration](#color-configuration)
5. [Building and Deployment](#building-and-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Topics](#advanced-topics)

---

## Overview

The Calendar visualization displays tasks in a monthly calendar grid format. Tasks are positioned on their completion date (Rok izvedbe). It supports:
- **Multi-language** translations (English, Slovenian, French, German, Spanish, Croatian)
- **Configurable UI text** including day names, month names, and labels
- **External color configuration** for easy customization
- **Automatic language detection** based on browser settings

### Key Features
- Monthly calendar view with week-based grid
- Task cards positioned on dates
- Color-coded category stripes
- Conditional highlighting (RED/YELLOW flags)
- Month/year navigation
- Customizable text without code changes

---

## Quick Start

### Making Quick Changes

**Change UI labels:**
1. Edit: `src/customviz/com-smartq-calendarviz/nls/root/messages.js` (English) or `nls/sl/messages.js` (Slovenian)
2. Find: Label keys (e.g., `TODAY_BUTTON`, `DUE_IN_30_DAYS_LABEL`)
3. Change: Values to desired text
4. Save and rebuild

**Change day names:**
1. Edit: NLS file (root/messages.js or sl/messages.js)
2. Find: `DAY_MONDAY`, `DAY_TUESDAY`, etc.
3. Change: "MON" to "M" or "Monday" (any text you want)
4. Save and rebuild

**Change colors:**
1. Edit: `src/customviz/com-smartq-calendarviz/colorConfig.js`
2. Find: `categoryPalette` array or UI colors
3. Change: Any hex color value (e.g., `"#245D63"` → `"#FF0000"`)
4. Save and rebuild

**Rebuild and deploy:**
```bash
cd /Users/zigavaupot/Documents/dv-custom-plugins
./gradlew clean build
```
Upload: `build/distributions/customviz_com-smartq-calendarviz.zip`

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
src/customviz/com-smartq-calendarviz/nls/messages.js
```

### Available Translation Keys

#### UI Labels

| Key | English Default | Slovenian Default | Description |
|-----|----------------|-------------------|-------------|
| CALENDAR_TITLE | Calendar | Koledar | Main calendar title |
| TASK_COUNT_LABEL | Number of tasks | Št. nalog | Task count label |
| OVERDUE_LABEL | Overdue | Zamujenih | Overdue tasks label |
| DUE_IN_30_DAYS_LABEL | Before deadline | Pred rokom | Tasks due soon label |
| TODAY_BUTTON | Today | Danes | Button text |
| PREV_MONTH_TOOLTIP | Previous month | Prejšnji mesec | Previous button tooltip |
| NEXT_MONTH_TOOLTIP | Next month | Naslednji mesec | Next button tooltip |
| GOTO_TODAY_TOOLTIP | Go to today | Pojdi na danes | Today button tooltip |

#### Day Names (Day Headers)

| Key | English Default | Slovenian Default | Description |
|-----|----------------|-------------------|-------------|
| DAY_MONDAY | MON | PON | Monday header |
| DAY_TUESDAY | TUE | TOR | Tuesday header |
| DAY_WEDNESDAY | WED | SRE | Wednesday header |
| DAY_THURSDAY | THU | ČET | Thursday header |
| DAY_FRIDAY | FRI | PET | Friday header |
| DAY_SATURDAY | SAT | SOB | Saturday header |
| DAY_SUNDAY | SUN | NED | Sunday header |

**Note:** Day names can be customized to any text:
- Short: MON, TUE, WED
- Single letter: M, T, W
- Full names: Monday, Tuesday, Wednesday
- Custom: Any text you want

#### Month Names (Full)

| Key | English Default | Slovenian Default |
|-----|----------------|-------------------|
| MONTH_JANUARY | January | Januar |
| MONTH_FEBRUARY | February | Februar |
| MONTH_MARCH | March | Marec |
| MONTH_APRIL | April | April |
| MONTH_MAY | May | Maj |
| MONTH_JUNE | June | Junij |
| MONTH_JULY | July | Julij |
| MONTH_AUGUST | August | Avgust |
| MONTH_SEPTEMBER | September | September |
| MONTH_OCTOBER | October | Oktober |
| MONTH_NOVEMBER | November | November |
| MONTH_DECEMBER | December | December |

#### Month Names (Short)

Used in date formatting.

| Key | English Default | Slovenian Default |
|-----|----------------|-------------------|
| MONTH_JAN_SHORT | Jan | Jan |
| MONTH_FEB_SHORT | Feb | Feb |
| MONTH_MAR_SHORT | Mar | Mar |
| MONTH_APR_SHORT | Apr | Apr |
| MONTH_MAY_SHORT | May | Maj |
| MONTH_JUN_SHORT | Jun | Jun |
| MONTH_JUL_SHORT | Jul | Jul |
| MONTH_AUG_SHORT | Aug | Avg |
| MONTH_SEP_SHORT | Sep | Sep |
| MONTH_OCT_SHORT | Oct | Okt |
| MONTH_NOV_SHORT | Nov | Nov |
| MONTH_DEC_SHORT | Dec | Dec |

### How to Edit Translations

#### Step 1: Open the Language File

For English:
```bash
open src/customviz/com-smartq-calendarviz/nls/root/messages.js
```

For Slovenian:
```bash
open src/customviz/com-smartq-calendarviz/nls/sl/messages.js
```

#### Step 2: Edit Values

**Example - Change calendar title:**
```javascript
"CALENDAR_TITLE": "Calendar",  // Change to "Task Calendar"
```

**Example - Change "Today" button:**
```javascript
"TODAY_BUTTON": "Today",  // Change to "Current Day"
```

**Example - Change day names to single letters:**
```javascript
"DAY_MONDAY": "MON",     // Change to "M"
"DAY_TUESDAY": "TUE",    // Change to "T"
"DAY_WEDNESDAY": "WED",  // Change to "W"
"DAY_THURSDAY": "THU",   // Change to "T"
"DAY_FRIDAY": "FRI",     // Change to "F"
"DAY_SATURDAY": "SAT",   // Change to "S"
"DAY_SUNDAY": "SUN"      // Change to "S"
```

**Example - Change day names to full names:**
```javascript
"DAY_MONDAY": "MON",        // Change to "Monday"
"DAY_TUESDAY": "TUE",       // Change to "Tuesday"
"DAY_WEDNESDAY": "WED",     // Change to "Wednesday"
"DAY_THURSDAY": "THU",      // Change to "Thursday"
"DAY_FRIDAY": "FRI",        // Change to "Friday"
"DAY_SATURDAY": "SAT",      // Change to "Saturday"
"DAY_SUNDAY": "SUN"         // Change to "Sunday"
```

**Example - Change month names:**
```javascript
"MONTH_JANUARY": "January",   // Change to "Jan" (shorter)
"MONTH_FEBRUARY": "February", // Change to "Feb"
// ... or any custom text
```

#### Step 3: Save and Rebuild

```bash
./gradlew clean build
```

#### Step 4: Deploy

Upload `build/distributions/customviz_com-smartq-calendarviz.zip` to Oracle Analytics (Console → Plugins)

#### Step 5: Test

1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check console: `[CalendarViz] Using [Language] translations from NLS file`

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

### Important Note: "Before deadline" Label

The `DUE_IN_30_DAYS_LABEL` has been changed from:
- **Old English:** "Due in 30 days"
- **New English:** "Before deadline"
- **Old Slovenian:** "Rok v 30 dnevih"
- **New Slovenian:** "Pred rokom"

This label appears in the summary bar showing statistics about tasks.

---

## Color Configuration

### Overview

Colors are configured in an external file that can be edited without touching code. The visualization uses colors for:
1. **UI colors** - Header background, weekend cells, today highlight
2. **Task card colors** - Default background and borders
3. **Category stripes** - Colored left edge on each task card
4. **Conditional highlights** - RED/YELLOW backgrounds for flagged tasks

### Color Configuration File

**Location:** `src/customviz/com-smartq-calendarviz/colorConfig.js`

### UI Colors

These colors control the calendar interface appearance:

```javascript
headerBackground: "#f5f5f5",      // Month/year header background
weekendBackground: "#fafafa",     // Weekend date cells background
todayBackground: "#e3f2fd",       // Today's date cell (light blue)
taskBackground: "#ffffff",        // Default task card background
taskBorder: "#e0e0e0",           // Default task card border
gridBorder: "#dddddd"            // Calendar grid lines
```

#### UI Color Customization Examples

**Dark theme:**
```javascript
headerBackground: "#2c3e50",
weekendBackground: "#34495e",
todayBackground: "#3498db",
taskBackground: "#ecf0f1",
taskBorder: "#95a5a6",
gridBorder: "#7f8c8d"
```

**Light theme:**
```javascript
headerBackground: "#ffffff",
weekendBackground: "#f8f9fa",
todayBackground: "#fff3cd",
taskBackground: "#ffffff",
taskBorder: "#dee2e6",
gridBorder: "#e9ecef"
```

### Category Stripe Colors

Categories are assigned colors **alphabetically** (same as Kanban):

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

### How to Change Colors

#### Step 1: Open Color Configuration File

```bash
open src/customviz/com-smartq-calendarviz/colorConfig.js
```

#### Step 2: Edit Color Values

**Change UI colors:**
```javascript
headerBackground: "#333333",      // Dark header (changed)
weekendBackground: "#f0f0f0",     // Light weekend (changed)
todayBackground: "#ffffcc",       // Light yellow today (changed)
```

**Change category stripe colors:**
```javascript
categoryPalette: [
  "#FF0000",    // Bright red (changed)
  "#00FF00",    // Bright green (changed)
  "#0000FF",    // Bright blue (changed)
  // ... add more or keep existing
]
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
4. Check console: `[CalendarViz] Loaded color configuration`

### Color Configuration Examples

#### Example 1: Bright Theme
```javascript
headerBackground: "#ffffff",
weekendBackground: "#fffacd",     // Light yellow
todayBackground: "#87ceeb",       // Sky blue
taskBackground: "#ffffff",
taskBorder: "#dcdcdc",
gridBorder: "#c0c0c0",

categoryPalette: [
  "#FF0000",    // Red
  "#00FF00",    // Green
  "#0000FF",    // Blue
  "#FFFF00",    // Yellow
  "#FF00FF",    // Magenta
  "#00FFFF"     // Cyan
]
```

#### Example 2: Professional Theme
```javascript
headerBackground: "#2c3e50",      // Dark blue-gray
weekendBackground: "#ecf0f1",     // Light gray
todayBackground: "#3498db",       // Blue
taskBackground: "#ffffff",
taskBorder: "#bdc3c7",
gridBorder: "#95a5a6",

categoryPalette: [
  "#e74c3c",    // Red
  "#3498db",    // Blue
  "#2ecc71",    // Green
  "#f39c12",    // Orange
  "#9b59b6",    // Purple
  "#1abc9c"     // Turquoise
]
```

### Important Notes

- **Format:** Colors must be in hex format: `#RRGGBB`
- **Order matters:** First color goes to first category alphabetically
- **Cycling:** If you have more categories than colors, colors will repeat
- **Rebuild required:** Changes require rebuilding and redeployment
- **Weekend detection:** Saturday (day 0) and Sunday (day 6) use weekend background
- **Today detection:** Current date uses today background

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
build/distributions/customviz_com-smartq-calendarviz.zip
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
2. Select: `build/distributions/customviz_com-smartq-calendarviz.zip`
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
[CalendarViz] Detected browser language: en-US
[CalendarViz] Using English translations from NLS file (default)
[CalendarViz] Loaded color configuration: {headerBackground: "#f5f5f5", ...}
```

#### Visual Verification

1. Create or open a workbook
2. Add Calendar visualization
3. Check:
   - Day headers show custom text (MON/PON, TUE/TOR, etc.)
   - Month names show in correct language
   - "Today" button shows correct text
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
4. Check console log: `[CalendarViz] Detected browser language: ...`

#### UI Still Shows Old Text After Update

**Problem:** Changed translations but UI shows old values

**Solutions:**
1. Verify you rebuilt: `./gradlew clean build`
2. Verify you uploaded the NEW ZIP file (check timestamp)
3. Clear browser cache completely
4. Hard refresh multiple times
5. Try incognito/private browsing window
6. Close and reopen browser

#### Day Names Not Showing Correctly

**Problem:** Day headers show wrong text or not translated

**Solutions:**
1. Check all 7 day properties are defined: `DAY_MONDAY` through `DAY_SUNDAY`
2. Verify syntax (no missing quotes or commas)
3. Rebuild and redeploy
4. Clear cache and hard refresh

#### Month Names Not Showing Correctly

**Problem:** Month selector or date formatting shows wrong language

**Solutions:**
1. Check all 12 month properties are defined
2. Verify both full and short versions exist
3. Properties must be named exactly: `MONTH_JANUARY`, `MONTH_JAN_SHORT`, etc.
4. Rebuild and redeploy

#### "Today" Button Shows Wrong Text

**Problem:** Button still shows "Today" in Slovenian browser

**Solutions:**
1. Check `TODAY_BUTTON` property in nls/sl/messages.js
2. Should be: `"TODAY_BUTTON": "Danes"`
3. Rebuild and redeploy
4. Clear cache completely

### Color Issues

#### Colors Don't Change After Editing

**Problem:** Changed colors in colorConfig.js but visualization shows old colors

**Solutions:**
1. Verify you saved colorConfig.js
2. Rebuild: `./gradlew clean build`
3. Upload NEW ZIP file
4. Clear browser cache completely
5. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
6. Check console: `[CalendarViz] Loaded color configuration`

#### Weekend Colors Not Applied

**Problem:** Weekend cells don't have different background

**Solutions:**
1. Check `weekendBackground` property in colorConfig.js
2. Verify color is different from regular day background
3. Weekend = Saturday (day 0) and Sunday (day 6)
4. Rebuild and redeploy

#### Today Highlight Not Visible

**Problem:** Current date doesn't stand out

**Solutions:**
1. Check `todayBackground` property in colorConfig.js
2. Choose a distinctly different color (e.g., light blue: `#e3f2fd`)
3. Rebuild and redeploy

#### Category Colors Wrong Order

**Problem:** Colors don't match expected categories

**Solution:** Remember categories are sorted **alphabetically**
- Check the alphabetical order of your categories
- Adjust color palette order accordingly

### Navigation Issues

#### Month Navigation Not Working

**Problem:** Previous/Next month buttons don't respond

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify event handlers are attached
3. Try redeploying plugin
4. Clear cache and hard refresh

#### "Today" Button Doesn't Work

**Problem:** Clicking "Today" button doesn't navigate to current month

**Solutions:**
1. Check console for errors
2. Verify button event handler
3. Redeploy plugin
4. Clear cache and hard refresh

### Display Issues

#### Tasks Not Appearing on Dates

**Problem:** Calendar renders but tasks don't show

**Solutions:**
1. Verify date column contains valid dates
2. Check date format compatibility
3. Look for console errors about date parsing
4. Verify data is being loaded (check console logs)

#### Tasks in Wrong Date Cells

**Problem:** Tasks appear on incorrect dates

**Solutions:**
1. Check date values in source data
2. Verify timezone settings
3. Check date column format
4. Review console logs for date parsing messages

### Build Issues

#### Build Fails with Syntax Error

**Problem:** `./gradlew build` fails with error in messages.js

**Common causes:**
```javascript
// Missing comma
"CALENDAR_TITLE": "Calendar"
"TASK_COUNT_LABEL": "Tasks"  // ERROR: needs comma above

// Extra comma at end
"DAY_SUNDAY": "SUN",  // ERROR: last property can't have comma
});

// Missing quote
"CALENDAR_TITLE: "Calendar",  // ERROR: missing opening quote
```

**Solution:** Fix syntax error, save file, rebuild

#### Missing NLS Properties

**Problem:** Build succeeds but visualization breaks

**Solutions:**
1. Verify ALL required properties are defined in NLS files
2. Check spelling of property names (case-sensitive)
3. Ensure both root and sl files have same structure
4. Compare with example files in this guide

---

## Advanced Topics

### Adding New Languages

To add support for a new language (e.g., German):

#### Step 1: Create Language Folder
```bash
mkdir src/customviz/com-smartq-calendarviz/nls/de
```

#### Step 2: Create messages.js File

Copy structure from root/messages.js and translate:

```javascript
// src/customviz/com-smartq-calendarviz/nls/de/messages.js
define({
  // Plugin metadata
  "CALENDARVIZ_DISPLAY_NAME": "Kalenderansicht (nach Aufgabendatum)",
  "CALENDARVIZ_SHORT_DISPLAY_NAME": "Kalenderansicht",
  "CALENDARVIZ_CATEGORY": "CalendarViz Plugin",
  "CALENDARVIZ_ROW": "Aufgabe",
  "CALENDARVIZ_COLOR": "Farbe",
  "CALENDARVIZ_TOOLTIP": "Tooltip",

  // UI Labels
  "CALENDAR_TITLE": "Kalender",
  "TASK_COUNT_LABEL": "Anzahl der Aufgaben",
  "OVERDUE_LABEL": "Überfällig",
  "DUE_IN_30_DAYS_LABEL": "Vor Frist",
  "TODAY_BUTTON": "Heute",
  "PREV_MONTH_TOOLTIP": "Vorheriger Monat",
  "NEXT_MONTH_TOOLTIP": "Nächster Monat",
  "GOTO_TODAY_TOOLTIP": "Gehe zu heute",

  // Month names (full)
  "MONTH_JANUARY": "Januar",
  "MONTH_FEBRUARY": "Februar",
  "MONTH_MARCH": "März",
  "MONTH_APRIL": "April",
  "MONTH_MAY": "Mai",
  "MONTH_JUNE": "Juni",
  "MONTH_JULY": "Juli",
  "MONTH_AUGUST": "August",
  "MONTH_SEPTEMBER": "September",
  "MONTH_OCTOBER": "Oktober",
  "MONTH_NOVEMBER": "November",
  "MONTH_DECEMBER": "Dezember",

  // Month names (short)
  "MONTH_JAN_SHORT": "Jan",
  "MONTH_FEB_SHORT": "Feb",
  "MONTH_MAR_SHORT": "Mär",
  "MONTH_APR_SHORT": "Apr",
  "MONTH_MAY_SHORT": "Mai",
  "MONTH_JUN_SHORT": "Jun",
  "MONTH_JUL_SHORT": "Jul",
  "MONTH_AUG_SHORT": "Aug",
  "MONTH_SEP_SHORT": "Sep",
  "MONTH_OCT_SHORT": "Okt",
  "MONTH_NOV_SHORT": "Nov",
  "MONTH_DEC_SHORT": "Dez",

  // Day names
  "DAY_MONDAY": "MO",
  "DAY_TUESDAY": "DI",
  "DAY_WEDNESDAY": "MI",
  "DAY_THURSDAY": "DO",
  "DAY_FRIDAY": "FR",
  "DAY_SATURDAY": "SA",
  "DAY_SUNDAY": "SO"
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

#### Step 4: Update calendarViz.js

Add German module to dependencies:
```javascript
define([
  // ... other dependencies
  'com-smartq-calendarviz/nls/root/messages',
  'com-smartq-calendarviz/nls/sl/messages',
  'com-smartq-calendarviz/nls/de/messages',  // Add this
  // ...
], function(..., messages_en, messages_sl, messages_de) {
```

Update language detection:
```javascript
if (userLang.indexOf('sl') === 0) {
    messages = buildMessagesWithArrays(messages_sl);
} else if (userLang.indexOf('de') === 0) {
    messages = buildMessagesWithArrays(messages_de);
} else {
    messages = buildMessagesWithArrays(messages_en);
}
```

#### Step 5: Rebuild and Test

```bash
./gradlew clean build
```

### File Structure

```
src/customviz/com-smartq-calendarviz/
├── calendarViz.js               # Main visualization code
├── calendarVizstyles.css        # Styling
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

#### Language Detection with Array Building

```javascript
function buildMessagesWithArrays(nlsMessages) {
    var msgs = {};

    // Copy all properties
    for (var key in nlsMessages) {
        if (nlsMessages.hasOwnProperty(key)) {
            msgs[key] = nlsMessages[key];
        }
    }

    // Build MONTH_NAMES array from individual properties
    msgs.MONTH_NAMES = [
        nlsMessages.MONTH_JANUARY,
        nlsMessages.MONTH_FEBRUARY,
        // ... all 12 months
    ];

    // Build DAY_NAMES array
    msgs.DAY_NAMES = [
        nlsMessages.DAY_MONDAY,
        nlsMessages.DAY_TUESDAY,
        // ... all 7 days
    ];

    return msgs;
}

// Detect and load
var userLang = navigator.language || navigator.userLanguage || 'en';
if (userLang.toLowerCase().indexOf('sl') === 0) {
    messages = buildMessagesWithArrays(messages_sl);
} else {
    messages = buildMessagesWithArrays(messages_en);
}
```

#### Color Mapping

```javascript
function initializeCategoryColorMap(tasks) {
    // Collect unique categories
    var uniqueCategories = {};
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].colorCategory) {
            uniqueCategories[tasks[i].colorCategory] = true;
        }
    }

    // Sort alphabetically
    var sortedCategories = Object.keys(uniqueCategories).sort();

    // Map to colors
    CATEGORY_COLOR_MAP = {};
    var palette = CALENDAR_COLORS.categoryPalette;
    for (var i = 0; i < sortedCategories.length; i++) {
        var colorIndex = i % palette.length;
        CATEGORY_COLOR_MAP[sortedCategories[i]] = palette[colorIndex];
    }
}
```

#### Date Formatting

```javascript
function formatDate(dateStr, format) {
    var date = new Date(dateStr);
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var year = date.getFullYear();

    // Get month names from translations
    var monthNames = messages.MONTH_NAMES_SHORT;
    var monthNamesLong = messages.MONTH_NAMES;
    var mmm = monthNames[month - 1];
    var mmmm = monthNamesLong[month - 1];

    // Format based on pattern
    switch(format) {
        case "MMM dd, yyyy":
            return mmm + " " + day + ", " + year;
        case "dd MMMM yyyy":
            return day + " " + mmmm + " " + year;
        // ... other formats
    }
}
```

### Performance Considerations

- **Language detection** runs once on module load
- **Array building** creates month/day arrays from individual properties
- **Color mapping** rebuilds on each render (handles dynamic data)
- **Date formatting** uses cached month/day name arrays
- **RequireJS** caches loaded modules (no repeated file loads)

### Best Practices

1. **Always test in both languages** after making changes
2. **Keep day names concise** (3-4 characters recommended for headers)
3. **Use color picker tool** for hex values
4. **Document custom colors** in comments
5. **Test with different months** to verify month names
6. **Check weekend highlighting** after color changes
7. **Test navigation** (previous/next month, today button)
8. **Clear cache thoroughly** after each deployment
9. **Check console logs** for debugging information
10. **Verify date formatting** in tooltips and displays

---

## Support and Resources

### Console Logging

The visualization logs helpful information to browser console:

```javascript
[CalendarViz] Detected browser language: sl-SI
[CalendarViz] Using Slovenian translations from NLS file
[CalendarViz] Loaded color configuration: {...}
[CalendarViz] Category color mapping: {"VLO": "#245D63", ...}
[CalendarViz] Extracted 42 valid tasks
```

### File Locations Quick Reference

**Build output:**
```
build/distributions/customviz_com-smartq-calendarviz.zip
```

**English translations:**
```
src/customviz/com-smartq-calendarviz/nls/root/messages.js
```

**Slovenian translations:**
```
src/customviz/com-smartq-calendarviz/nls/sl/messages.js
```

**Color configuration:**
```
src/customviz/com-smartq-calendarviz/colorConfig.js
```

**Main code:**
```
src/customviz/com-smartq-calendarviz/calendarViz.js
```

### Common Tasks Checklist

**Change UI labels:**
- [ ] Edit nls/root/messages.js (English) or nls/sl/messages.js (Slovenian)
- [ ] Modify label values (CALENDAR_TITLE, TODAY_BUTTON, etc.)
- [ ] Save file
- [ ] Run `./gradlew clean build`
- [ ] Upload new ZIP to Oracle Analytics
- [ ] Clear cache and hard refresh

**Change day/month names:**
- [ ] Edit nls/root/messages.js or nls/sl/messages.js
- [ ] Modify DAY_* or MONTH_* values
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
- [ ] Create nls/XX/messages.js with all translations
- [ ] Register language in nls/messages.js
- [ ] Update calendarViz.js language detection
- [ ] Rebuild and deploy

---

## Appendix: Complete File Examples

### Example: English Messages File

```javascript
// src/customviz/com-smartq-calendarviz/nls/root/messages.js
define({
  // Plugin metadata
  "CALENDARVIZ_DISPLAY_NAME": "Calendar View (by Task Date)",
  "CALENDARVIZ_SHORT_DISPLAY_NAME": "Calendar View",
  "CALENDARVIZ_CATEGORY": "CalendarViz Plugin",
  "CALENDARVIZ_ROW": "Task",
  "CALENDARVIZ_COLOR": "Color",
  "CALENDARVIZ_TOOLTIP": "Tooltip",

  // UI Labels
  "CALENDAR_TITLE": "Calendar",
  "TASK_COUNT_LABEL": "Number of tasks",
  "OVERDUE_LABEL": "Overdue",
  "DUE_IN_30_DAYS_LABEL": "Before deadline",
  "TODAY_BUTTON": "Today",
  "PREV_MONTH_TOOLTIP": "Previous month",
  "NEXT_MONTH_TOOLTIP": "Next month",
  "GOTO_TODAY_TOOLTIP": "Go to today",

  // Month names (full)
  "MONTH_JANUARY": "January",
  "MONTH_FEBRUARY": "February",
  "MONTH_MARCH": "March",
  "MONTH_APRIL": "April",
  "MONTH_MAY": "May",
  "MONTH_JUNE": "June",
  "MONTH_JULY": "July",
  "MONTH_AUGUST": "August",
  "MONTH_SEPTEMBER": "September",
  "MONTH_OCTOBER": "October",
  "MONTH_NOVEMBER": "November",
  "MONTH_DECEMBER": "December",

  // Month names (short)
  "MONTH_JAN_SHORT": "Jan",
  "MONTH_FEB_SHORT": "Feb",
  "MONTH_MAR_SHORT": "Mar",
  "MONTH_APR_SHORT": "Apr",
  "MONTH_MAY_SHORT": "May",
  "MONTH_JUN_SHORT": "Jun",
  "MONTH_JUL_SHORT": "Jul",
  "MONTH_AUG_SHORT": "Aug",
  "MONTH_SEP_SHORT": "Sep",
  "MONTH_OCT_SHORT": "Oct",
  "MONTH_NOV_SHORT": "Nov",
  "MONTH_DEC_SHORT": "Dec",

  // Day names
  "DAY_MONDAY": "MON",
  "DAY_TUESDAY": "TUE",
  "DAY_WEDNESDAY": "WED",
  "DAY_THURSDAY": "THU",
  "DAY_FRIDAY": "FRI",
  "DAY_SATURDAY": "SAT",
  "DAY_SUNDAY": "SUN"
});
```

### Example: Slovenian Messages File

```javascript
// src/customviz/com-smartq-calendarviz/nls/sl/messages.js
define({
  // Plugin metadata
  "CALENDARVIZ_DISPLAY_NAME": "Koledarski pogled (po datumu naloge)",
  "CALENDARVIZ_SHORT_DISPLAY_NAME": "Koledarski pogled",
  "CALENDARVIZ_CATEGORY": "CalendarViz vtičnik",
  "CALENDARVIZ_ROW": "Naloga",
  "CALENDARVIZ_COLOR": "Barva",
  "CALENDARVIZ_TOOLTIP": "Namig",

  // UI Labels
  "CALENDAR_TITLE": "Koledar",
  "TASK_COUNT_LABEL": "Št. nalog",
  "OVERDUE_LABEL": "Zamujenih",
  "DUE_IN_30_DAYS_LABEL": "Pred rokom",
  "TODAY_BUTTON": "Danes",
  "PREV_MONTH_TOOLTIP": "Prejšnji mesec",
  "NEXT_MONTH_TOOLTIP": "Naslednji mesec",
  "GOTO_TODAY_TOOLTIP": "Pojdi na danes",

  // Month names (full)
  "MONTH_JANUARY": "Januar",
  "MONTH_FEBRUARY": "Februar",
  "MONTH_MARCH": "Marec",
  "MONTH_APRIL": "April",
  "MONTH_MAY": "Maj",
  "MONTH_JUNE": "Junij",
  "MONTH_JULY": "Julij",
  "MONTH_AUGUST": "Avgust",
  "MONTH_SEPTEMBER": "September",
  "MONTH_OCTOBER": "Oktober",
  "MONTH_NOVEMBER": "November",
  "MONTH_DECEMBER": "December",

  // Month names (short)
  "MONTH_JAN_SHORT": "Jan",
  "MONTH_FEB_SHORT": "Feb",
  "MONTH_MAR_SHORT": "Mar",
  "MONTH_APR_SHORT": "Apr",
  "MONTH_MAY_SHORT": "Maj",
  "MONTH_JUN_SHORT": "Jun",
  "MONTH_JUL_SHORT": "Jul",
  "MONTH_AUG_SHORT": "Avg",
  "MONTH_SEP_SHORT": "Sep",
  "MONTH_OCT_SHORT": "Okt",
  "MONTH_NOV_SHORT": "Nov",
  "MONTH_DEC_SHORT": "Dec",

  // Day names
  "DAY_MONDAY": "PON",
  "DAY_TUESDAY": "TOR",
  "DAY_WEDNESDAY": "SRE",
  "DAY_THURSDAY": "ČET",
  "DAY_FRIDAY": "PET",
  "DAY_SATURDAY": "SOB",
  "DAY_SUNDAY": "NED"
});
```

### Example: Color Configuration File

```javascript
// src/customviz/com-smartq-calendarviz/colorConfig.js
define([], function() {
    "use strict";

    return {
        // Calendar UI colors
        headerBackground: "#f5f5f5",      // Month/year header
        weekendBackground: "#fafafa",     // Weekend cells
        todayBackground: "#e3f2fd",       // Today's cell
        taskBackground: "#ffffff",        // Task cards
        taskBorder: "#e0e0e0",           // Task borders
        gridBorder: "#dddddd",           // Calendar grid

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
        ]
    };
});
```

---

**Version:** 1.0
**Last Updated:** January 2026
**Plugin:** customviz_com-smartq-calendarviz
