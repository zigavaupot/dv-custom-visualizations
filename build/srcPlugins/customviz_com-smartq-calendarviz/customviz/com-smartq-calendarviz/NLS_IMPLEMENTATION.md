# NLS (National Language Support) Implementation for Calendar Visualization

## Overview
The Calendar visualization has been enhanced to support multiple languages based on the browser's language settings. Currently implemented languages:
- **English (en)** - Default language
- **Slovenian (sl)** - Full translation

## How It Works

### Browser Language Detection
The visualization automatically detects the browser's language using `navigator.language` and selects the appropriate translation set.

### Language Implementation
Translations are embedded directly in the calendarViz.js file:

```javascript
// Default English messages
var messages = {
  "CALENDAR_TITLE": "Calendar",
  "TASK_COUNT_LABEL": "Number of tasks",
  "OVERDUE_LABEL": "Overdue",
  "DUE_IN_30_DAYS_LABEL": "Due in 30 days",
  "TODAY_BUTTON": "Today",
  "MONTH_NAMES": ["January", "February", ...],
  "DAY_NAMES": ["MON", "TUE", "WED", ...]
};

// Slovenian translations
var messages_sl = {
  "CALENDAR_TITLE": "Koledar",
  "TASK_COUNT_LABEL": "Št. nalog",
  "OVERDUE_LABEL": "Zamujenih",
  "DUE_IN_30_DAYS_LABEL": "Rok v 30 dnevih",
  "TODAY_BUTTON": "Danes",
  "MONTH_NAMES": ["Januar", "Februar", ...],
  "DAY_NAMES": ["PON", "TOR", "SRE", ...]
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
| CALENDAR_TITLE | Calendar | Koledar |
| TASK_COUNT_LABEL | Number of tasks | Št. nalog |
| OVERDUE_LABEL | Overdue | Zamujenih |
| DUE_IN_30_DAYS_LABEL | Due in 30 days | Rok v 30 dnevih |
| TODAY_BUTTON | Today | Danes |
| PREV_MONTH_TOOLTIP | Previous month | Prejšnji mesec |
| NEXT_MONTH_TOOLTIP | Next month | Naslednji mesec |
| GOTO_TODAY_TOOLTIP | Go to today | Pojdi na danes |

### Month Names (Full)
| English | Slovenian |
|---------|-----------|
| January | Januar |
| February | Februar |
| March | Marec |
| April | April |
| May | Maj |
| June | Junij |
| July | Julij |
| August | Avgust |
| September | September |
| October | Oktober |
| November | November |
| December | December |

### Month Names (Short)
| English | Slovenian |
|---------|-----------|
| Jan | Jan |
| Feb | Feb |
| Mar | Mar |
| Apr | Apr |
| May | Maj |
| Jun | Jun |
| Jul | Jul |
| Aug | Avg |
| Sep | Sep |
| Oct | Okt |
| Nov | Nov |
| Dec | Dec |

### Day Names
| English | Slovenian |
|---------|-----------|
| MON | PON |
| TUE | TOR |
| WED | SRE |
| THU | ČET |
| FRI | PET |
| SAT | SOB |
| SUN | NED |

## Adding New Languages

To add support for a new language (e.g., German):

1. **Edit calendarViz.js** and add the translation object:
   ```javascript
   // German translations
   var messages_de = {
     "CALENDAR_TITLE": "Kalender",
     "TASK_COUNT_LABEL": "Anzahl der Aufgaben",
     "OVERDUE_LABEL": "Überfällig",
     "DUE_IN_30_DAYS_LABEL": "Fällig in 30 Tagen",
     "TODAY_BUTTON": "Heute",
     "PREV_MONTH_TOOLTIP": "Vorheriger Monat",
     "NEXT_MONTH_TOOLTIP": "Nächster Monat",
     "GOTO_TODAY_TOOLTIP": "Gehe zu heute",
     "MONTH_NAMES": ["Januar", "Februar", "März", "April", "Mai", "Juni",
                     "Juli", "August", "September", "Oktober", "November", "Dezember"],
     "MONTH_NAMES_SHORT": ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
                           "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
     "DAY_NAMES": ["MO", "DI", "MI", "DO", "FR", "SA", "SO"]
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
   [CalendarViz] Detected browser language: sl-SI
   [CalendarViz] Using Slovenian translations
   ```

4. **Verify Translations**: Check that all UI elements display correctly:
   - Calendar title
   - Task count
   - Month names in selector
   - Day headers (PON, TOR, etc. for Slovenian)
   - Button labels ("Danes" instead of "Today")
   - Tooltips on navigation buttons

## Implementation Details

### Code Structure in calendarViz.js

1. **Translation objects** defined at module level (after logger initialization)
2. **Language detection** runs immediately in IIFE (Immediately Invoked Function Expression)
3. **Console logging** for debugging language selection
4. **Fallback to English** if language detection fails

### Usage in Code
All UI strings use the messages object:
```javascript
// Calendar title
html += '<strong>' + messages.CALENDAR_TITLE + '</strong>';

// Task count
html += messages.TASK_COUNT_LABEL + ': <strong>' + totalTasks + '</strong>';

// Month names
html += '<option>' + messages.MONTH_NAMES[m] + '</option>';

// Day headers
html += '<div>' + messages.DAY_NAMES[i] + '</div>';

// Buttons
html += '<button title="' + messages.GOTO_TODAY_TOOLTIP + '">' + messages.TODAY_BUTTON + '</button>';
```

## Language Fallback

Language detection works as follows:
1. Read `navigator.language` (e.g., "sl-SI", "en-US", "de-DE")
2. Convert to lowercase and check prefix (e.g., "sl-si" → "sl")
3. If language starts with "sl" → use Slovenian
4. Otherwise → use English (default)
5. If detection fails → use English (default)

No error messages are shown to users - the system gracefully falls back to English.

## Notes

- Language detection is **automatic** based on browser settings
- No configuration required in Oracle Analytics
- Translations are embedded in code (no separate files needed at runtime)
- Very lightweight - adds minimal code overhead
- Easy to extend with new languages
- Month and day names are used in date formatting and calendar headers
- No external dependencies required (no i18n plugin needed)
