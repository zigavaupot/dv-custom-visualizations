# Oracle Analytics Custom Visualizations

This project contains two custom visualizations for Oracle Analytics Cloud:

1. **Kanban Visualization** - Task board with percentage-based lanes
2. **Calendar Visualization** - Monthly calendar view with task positioning

## Documentation

### Complete Guides (Start Here)

- **[KANBAN_COMPLETE_GUIDE.md](KANBAN_COMPLETE_GUIDE.md)** - Complete guide for Kanban visualization
  - Language configuration (English/Slovenian)
  - Lane header customization
  - Color configuration
  - Building and deployment
  - Troubleshooting
  - Advanced topics

- **[CALENDAR_COMPLETE_GUIDE.md](CALENDAR_COMPLETE_GUIDE.md)** - Complete guide for Calendar visualization
  - Language configuration (English/Slovenian)
  - Day/month name customization
  - Color configuration
  - Building and deployment
  - Troubleshooting
  - Advanced topics

### Additional Documentation

- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation overview
- **[TEST_INSTRUCTIONS.md](TEST_INSTRUCTIONS.md)** - Testing instructions

## Quick Start

### 1. Build Plugins

```bash
cd /Users/zigavaupot/Documents/dv-custom-plugins
./gradlew clean build
```

### 2. Deploy to Oracle Analytics

Upload the generated ZIP files:
- `build/distributions/customviz_com-smartq-kanbanviz.zip`
- `build/distributions/customviz_com-smartq-calendarviz.zip`

Go to: Oracle Analytics → Console → Plugins → Upload

### 3. Use Visualizations

Both visualizations will appear in the visualization gallery after deployment.

## Key Features

### Both Visualizations

✅ **Multi-language support** (English, Slovenian, German, Spanish, French, Croatian, and Italian)
✅ **Automatic language detection** based on browser settings
✅ **External color configuration** - No code changes needed
✅ **Category-based coloring** with alphabetical mapping
✅ **Conditional highlighting** (RED/YELLOW flags)
✅ **Easy customization** through configuration files

### Kanban Specific

✅ **7 configurable lanes** (0%, 10%, 25%, 50%, 75%, 95%, 100%)
✅ **Two-parameter lane system** - Separate logic and display values
✅ **Task assignment** based on completion percentage
✅ **Customizable lane headers** - Can be any text (not just percentages)

### Calendar Specific

✅ **Monthly calendar grid** with week-based layout
✅ **Configurable day names** (MON/TUE/WED or full names)
✅ **Configurable month names** (full and short versions)
✅ **Month/year navigation** with today button
✅ **Weekend highlighting** with different background color
✅ **Today highlighting** for current date

## Project Structure

```
dv-custom-plugins/
├── README.md                               # This file
├── KANBAN_COMPLETE_GUIDE.md               # Kanban documentation
├── CALENDAR_COMPLETE_GUIDE.md             # Calendar documentation
├── IMPLEMENTATION_SUMMARY.md              # Technical overview
├── build/
│   └── distributions/
│       ├── customviz_com-smartq-kanbanviz.zip
│       └── customviz_com-smartq-calendarviz.zip
└── src/customviz/
    ├── com-smartq-kanbanviz/
    │   ├── kanbanViz.js                   # Main code
    │   ├── colorConfig.js                 # Color settings
    │   └── nls/                           # Translation files
    │       ├── messages.js                # Language registration
    │       ├── root/messages.js           # English
    │       └── sl/messages.js             # Slovenian
    └── com-smartq-calendarviz/
        ├── calendarViz.js                 # Main code
        ├── colorConfig.js                 # Color settings
        └── nls/                           # Translation files
            ├── messages.js                # Language registration
            ├── root/messages.js           # English
            └── sl/messages.js             # Slovenian
```

## Common Customization Tasks

### Change Lane Headers (Kanban)

1. Edit: `src/customviz/com-smartq-kanbanviz/nls/root/messages.js`
2. Find: `LANE_X_PERCENT_HEADER` properties
3. Change: Display text (e.g., "In Progress" → "Working")
4. Rebuild: `./gradlew clean build`
5. Deploy updated ZIP

### Change Day Names (Calendar)

1. Edit: `src/customviz/com-smartq-calendarviz/nls/root/messages.js`
2. Find: `DAY_MONDAY`, `DAY_TUESDAY`, etc.
3. Change: Text (e.g., "MON" → "M" or "Monday")
4. Rebuild: `./gradlew clean build`
5. Deploy updated ZIP

### Change Colors

1. Edit: `colorConfig.js` for either visualization
2. Modify: Hex color values
3. Rebuild: `./gradlew clean build`
4. Deploy updated ZIP

## Language Support

### Current Languages

- **English (en)** - Default language
- **Slovenian (sl)** - Full translation
- **German (de)** - Full translation
- **Spanish (es)** - Full translation
- **French (fr)** - Full translation
- **Croatian (hr)** - Full translation
- **Italian (it)** - Full translation

### Language Detection

The visualizations automatically detect browser language:
- Slovenian browser (sl, sl-SI) → Slovenian translations
- German browser (de, de-DE, de-AT, etc.) → German translations
- Spanish browser (es, es-ES, es-MX, etc.) → Spanish translations
- French browser (fr, fr-FR, fr-CA, etc.) → French translations
- Croatian browser (hr, hr-HR) → Croatian translations
- Italian browser (it, it-IT) → Italian translations
- Any other language → English translations (default)

### Adding New Languages

See the "Advanced Topics" section in the complete guides for instructions on adding new languages (German, French, Spanish, etc.).

## Building and Deployment

### Prerequisites

- Java Development Kit (JDK) 8 or later
- Gradle (included via gradlew wrapper)
- Oracle Analytics Cloud instance

### Build Commands

```bash
# Clean previous build
./gradlew clean

# Build plugins
./gradlew build

# Clean and build
./gradlew clean build
```

### Build Output

Successful build creates:
- `build/distributions/customviz_com-smartq-kanbanviz.zip`
- `build/distributions/customviz_com-smartq-calendarviz.zip`

### Deployment Steps

1. Log in to Oracle Analytics Cloud
2. Click hamburger menu (☰) → Console
3. Click **Plugins** (or **Extensions**)
4. Click **Upload** or **Add Plugin**
5. Select ZIP file
6. Wait for upload to complete
7. Verify status shows "Active" or "Enabled"
8. **Clear browser cache completely**
9. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## Testing

### Verification Checklist

**After deployment:**
- [ ] Clear browser cache completely
- [ ] Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Open browser Developer Tools (F12)
- [ ] Check Console for language detection logs
- [ ] Verify UI text shows in correct language
- [ ] Check colors display correctly
- [ ] Test functionality (navigation, selection, etc.)

**Language testing:**
- [ ] Change browser language to Slovenian
- [ ] Reload Oracle Analytics
- [ ] Verify UI text shows in Slovenian
- [ ] Change browser language back to English
- [ ] Verify UI text shows in English

### Console Logs

Look for these messages in browser console:

```
[KanbanViz] Detected browser language: en-US
[KanbanViz] Using English translations from NLS file (default)
[KanbanViz] Loaded color configuration: {...}
```

```
[CalendarViz] Detected browser language: sl-SI
[CalendarViz] Using Slovenian translations from NLS file
[CalendarViz] Loaded color configuration: {...}
```

## Troubleshooting

### Common Issues

**UI shows old text after update:**
- Clear browser cache completely
- Hard refresh multiple times
- Try incognito/private browsing
- Close and reopen browser

**Wrong language displayed:**
- Check browser language settings
- Must be "sl" or "sl-SI" for Slovenian
- Check console log for detected language

**Colors don't change:**
- Verify you rebuilt after editing
- Upload NEW ZIP file (check timestamp)
- Clear cache and hard refresh
- Check console for color configuration log

**Build fails:**
- Check NLS files for syntax errors (missing commas, quotes)
- Verify all required properties are defined
- Check Gradle output for specific error

## Support

### Documentation

For detailed information, troubleshooting, and advanced topics, see:
- **KANBAN_COMPLETE_GUIDE.md** - Everything about Kanban visualization
- **CALENDAR_COMPLETE_GUIDE.md** - Everything about Calendar visualization

### Console Logging

Both visualizations log helpful debug information to browser console. Open Developer Tools (F12) to view logs.

### File Locations

**Kanban:**
- English: `src/customviz/com-smartq-kanbanviz/nls/root/messages.js`
- Slovenian: `src/customviz/com-smartq-kanbanviz/nls/sl/messages.js`
- German: `src/customviz/com-smartq-kanbanviz/nls/de/messages.js`
- Spanish: `src/customviz/com-smartq-kanbanviz/nls/es/messages.js`
- French: `src/customviz/com-smartq-kanbanviz/nls/fr/messages.js`
- Croatian: `src/customviz/com-smartq-kanbanviz/nls/hr/messages.js`
- Italian: `src/customviz/com-smartq-kanbanviz/nls/it/messages.js`
- Colors: `src/customviz/com-smartq-kanbanviz/colorConfig.js`

**Calendar:**
- English: `src/customviz/com-smartq-calendarviz/nls/root/messages.js`
- Slovenian: `src/customviz/com-smartq-calendarviz/nls/sl/messages.js`
- German: `src/customviz/com-smartq-calendarviz/nls/de/messages.js`
- Spanish: `src/customviz/com-smartq-calendarviz/nls/es/messages.js`
- French: `src/customviz/com-smartq-calendarviz/nls/fr/messages.js`
- Croatian: `src/customviz/com-smartq-calendarviz/nls/hr/messages.js`
- Italian: `src/customviz/com-smartq-calendarviz/nls/it/messages.js`
- Colors: `src/customviz/com-smartq-calendarviz/colorConfig.js`

## Version History

### Version 1.0 (January 2026)
- Initial implementation
- Multi-language support (English, Slovenian, German, Spanish, French, Croatian, Italian)
- External color configuration
- Configurable lane headers (Kanban)
- Configurable day/month names (Calendar)
- Comprehensive documentation

## License

Custom visualizations for Oracle Analytics Cloud.

---

**For complete documentation, see:**
- [KANBAN_COMPLETE_GUIDE.md](KANBAN_COMPLETE_GUIDE.md)
- [CALENDAR_COMPLETE_GUIDE.md](CALENDAR_COMPLETE_GUIDE.md)
