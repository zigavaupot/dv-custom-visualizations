# Calendar Visualization - Changelog

## Version 1.1.0 (2025-01-15)

### Major Changes - Data Structure Update

**Changed Grammar Structure:**
- **Removed**: Separate "Date" placeholder
- **Updated**: "Rows" placeholder now handles all task data

### New Data Structure

**Rows Placeholder** (2-4 columns required):
1. **Column 1 (Required)**: Task Name - The task title to display
2. **Column 2 (Required)**: Date (Rok izvedbe) - When the task should appear on calendar
3. **Column 3 (Optional)**: Additional Detail 1
4. **Column 4 (Optional)**: Additional Detail 2

**Color Placeholder** (0-1 column):
- Category for color-coding tasks with left border stripe

**Tooltip Placeholder** (0-5 columns):
- Additional information to show in hover tooltips

**Values Placeholder** (0-1 measure):
- Optional numeric values (for future enhancements)

### Technical Changes

1. **calendarVizdatamodelhandler.js**:
   - Removed `Logical.DATE` mapping
   - All data now maps through `Logical.ROW` to `Physical.ROW`
   - Updated documentation to reflect new structure

2. **calendarViz.js**:
   - Updated `CALENDAR_CONFIG.rowCount` from 3 to 4
   - Rewrote `_extractTasks()` method:
     - Column 0: Task name (required)
     - Column 1: Date (required)
     - Column 2-3: Optional details
   - Added validation for minimum 2 columns
   - Improved error handling for missing dates

3. **Configuration JSON**:
   - Removed `date` edge configuration
   - Updated `row` edge:
     - `minCount`: 2 (task name + date required)
     - `maxCount`: 4 (up to 2 additional details)
     - Updated description text

4. **Localization**:
   - Updated `CALENDARVIZ_ROW` description
   - Removed separate `CALENDARVIZ_DATE` strings

### Migration Guide

**Before (Version 1.0.0):**
```
Date: [Task Completion Date]
Task Details:
  - Task Name
  - Subtitle 1
  - Subtitle 2
Color: Priority
```

**After (Version 1.1.0):**
```
Rows:
  - Task Name          (required)
  - Task Date          (required - Rok izvedbe)
  - Additional Detail 1 (optional)
  - Additional Detail 2 (optional)
Color: Priority
```

### Benefits

1. **Simpler Configuration**: One placeholder for all task data instead of separate Date and Task Details
2. **More Flexible**: Can now have 2-4 columns in Rows instead of fixed structure
3. **Better OAC Integration**: Follows standard pattern used by other visualizations
4. **Clearer Intent**: Column order clearly shows what each position represents

### Breaking Changes

⚠️ **This is a breaking change!** Existing visualizations using version 1.0.0 will need to be reconfigured:
1. Remove the date column from "Date" placeholder
2. Move it as the 2nd column in "Rows" placeholder
3. First column in "Rows" should be the task name

### Files Modified

- `src/customviz/com-smartq-calendarviz/calendarVizdatamodelhandler.js`
- `src/customviz/com-smartq-calendarviz/calendarViz.js`
- `src/customviz/com-smartq-calendarviz/extensions/oracle.bi.tech.plugin.visualizationDatamodelHandler/com.smartq.calendarViz.visualizationDatamodelHandler.json`
- `src/customviz/com-smartq-calendarviz/nls/root/messages.js`

---

## Version 1.0.0 (2025-01-14)

### Initial Release

- Monthly calendar grid view
- Week-based layout (Monday - Sunday)
- Task cards on completion dates
- Month navigation
- Interactive selection
- Color coding support
- Tooltip support
- Responsive design
