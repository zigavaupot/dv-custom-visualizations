# NLS (National Language Support) Implementation for Kanban Visualization

## Overview
The Kanban visualization has been enhanced to support multiple languages based on the browser's language settings. Currently implemented languages:
- **English (en)** - Default language
- **Slovenian (sl)** - Full translation

## How It Works

### Browser Language Detection
The visualization automatically detects the browser's language using `navigator.language` and selects the appropriate translation set.

### Language Implementation
Translations are embedded directly in the kanbanViz.js file:

```javascript
// Default English messages
var messages = {
  "KANBAN_BOARD_TITLE": "Kanban Board",
  "TASK_COUNT_LABEL": "Number of tasks",
  "OVERDUE_LABEL": "Overdue",
  "DUE_IN_30_DAYS_LABEL": "Due in 30 days",
  "TASKS_LABEL": "tasks"
};

// Slovenian translations
var messages_sl = {
  "KANBAN_BOARD_TITLE": "Kanban tabela",
  "TASK_COUNT_LABEL": "Št. nalog",
  "OVERDUE_LABEL": "Zamujenih",
  "DUE_IN_30_DAYS_LABEL": "Rok v 30 dnevih",
  "TASKS_LABEL": "nalog"
};

// Auto-detect and apply language
var userLang = navigator.language || navigator.userLanguage || 'en';
if (userLang.toLowerCase().indexOf('sl') === 0) {
  messages = messages_sl;
}
```

## Translated Strings

### UI Labels
| Key | English | Slovenian |
|-----|---------|-----------|
| KANBAN_BOARD_TITLE | Kanban Board | Kanban tabela |
| TASK_COUNT_LABEL | Number of tasks | Št. nalog |
| OVERDUE_LABEL | Overdue | Zamujenih |
| DUE_IN_30_DAYS_LABEL | Due in 30 days | Rok v 30 dnevih |
| TASKS_LABEL | tasks | nalog |

### Lane Labels (Customizable)
Lane labels are now configurable through the messages object:

| Key | Default | Purpose |
|-----|---------|---------|
| LANE_0_PERCENT | 0% | Not started (0-9% complete) |
| LANE_10_PERCENT | 10% | Just started (10-24% complete) |
| LANE_25_PERCENT | 25% | Quarter done (25-49% complete) |
| LANE_50_PERCENT | 50% | Half done (50-74% complete) |
| LANE_75_PERCENT | 75% | Almost done (75-94% complete) |
| LANE_95_PERCENT | 95% | Nearly complete (95-99% complete) |
| LANE_100_PERCENT | 100% | Completed (100%) |

**Example Customization:**
You can change these to descriptive labels instead of percentages:
```javascript
"LANE_0_PERCENT": "Not Started",
"LANE_10_PERCENT": "Started",
"LANE_25_PERCENT": "In Progress",
"LANE_50_PERCENT": "Half Done",
"LANE_75_PERCENT": "Almost Done",
"LANE_95_PERCENT": "Final Stage",
"LANE_100_PERCENT": "Complete"
```

**Slovenian Example:**
```javascript
"LANE_0_PERCENT": "Neizvedeno",
"LANE_10_PERCENT": "Začeto",
"LANE_25_PERCENT": "V izvajanju",
"LANE_50_PERCENT": "Napol",
"LANE_75_PERCENT": "Skoraj končano",
"LANE_95_PERCENT": "Zaključna faza",
"LANE_100_PERCENT": "Končano"
```

## Adding New Languages

To add support for a new language (e.g., German):

1. **Edit kanbanViz.js** and add the translation object:
   ```javascript
   // German translations
   var messages_de = {
     "KANBAN_BOARD_TITLE": "Kanban Tafel",
     "TASK_COUNT_LABEL": "Anzahl der Aufgaben",
     "OVERDUE_LABEL": "Überfällig",
     "DUE_IN_30_DAYS_LABEL": "Fällig in 30 Tagen",
     "TASKS_LABEL": "Aufgaben"
   };
   ```

2. **Update the language detection logic**:
   ```javascript
   var userLang = navigator.language || navigator.userLanguage || 'en';
   userLang = userLang.toLowerCase();

   if (userLang.indexOf('sl') === 0) {
     messages = messages_sl;
   } else if (userLang.indexOf('de') === 0) {
     messages = messages_de;
   }
   ```

3. **Rebuild the plugin**:
   ```bash
   ./gradlew clean build
   ```

## Testing

### To test language switching:

1. **Change Browser Language**:
   - **Chrome**: Settings → Languages → Add/move preferred language to top
   - **Firefox**: Settings → Language → Choose preferred language
   - **Safari**: System Preferences → Language & Region

2. **Reload Oracle Analytics**: Clear cache and refresh (Cmd+Shift+R / Ctrl+Shift+R)

3. **Check Console**: The visualization logs which language is being used:
   ```
   [KanbanViz] Detected browser language: sl-SI
   [KanbanViz] Using Slovenian translations
   ```

4. **Verify Translations**: Check that all UI elements display correctly:
   - Board title
   - Task count
   - Lane headers (should show "nalog: X" for Slovenian)
   - Flag labels (Zamujenih, Rok v 30 dnevih)

## Implementation Details

### Code Structure in kanbanViz.js

1. **Translation objects** defined at module level (after logger initialization)
2. **Language detection** runs immediately in IIFE (Immediately Invoked Function Expression)
3. **Console logging** for debugging language selection
4. **Fallback to English** if language detection fails

### Usage in Code
All UI strings use the messages object:
```javascript
// Board title
var headerHtml = "<div class='kanban-header-title'>" + messages.KANBAN_BOARD_TITLE + "</div>";

// Task count
var metaText = messages.TASK_COUNT_LABEL + ": " + tasks.length;

// Lane headers
var headerLabel = laneName + " (" + messages.TASKS_LABEL + ": " + count + ")";

// Flag labels
flagParts.push(messages.OVERDUE_LABEL + ": " + flaggedRedCount);
flagParts.push(messages.DUE_IN_30_DAYS_LABEL + ": " + flaggedYellowCount);
```

## Language Fallback

Language detection works as follows:
1. Read `navigator.language` (e.g., "sl-SI", "en-US", "de-DE")
2. Convert to lowercase and check prefix (e.g., "sl-si" → "sl")
3. If language starts with "sl" → use Slovenian
4. Otherwise → use English (default)
5. If detection fails → use English (default)

No error messages are shown to users - the system gracefully falls back to English.

## Troubleshooting

### Problem: Still seeing English when browser is set to Slovenian

**Solution:**
1. **Clear browser cache** (important!)
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
3. Check console for language detection logs
4. Verify the correct ZIP was deployed (timestamp: after 17:20 on 2026-01-21)

### Problem: Console shows wrong language detected

**Check browser language:**
- Open browser console and type: `navigator.language`
- Should return "sl-SI", "sl", or similar for Slovenian

**Force language for testing:**
In kanbanViz.js, temporarily hardcode:
```javascript
messages = messages_sl; // Force Slovenian
```

### Problem: Mixed languages appearing

**Expected behavior:**
- Numeric values (0%, 10%, etc.) are not translated
- Data values (category names, task names) are not translated
- Only UI labels are translated

## Notes

- Language detection is **automatic** based on browser settings
- No configuration required in Oracle Analytics
- Translations are embedded in code (no separate files needed at runtime)
- Very lightweight - adds minimal code overhead
- Easy to extend with new languages
- All numeric values, percentages, and dates maintain their format
- No external dependencies required (no i18n plugin needed)
