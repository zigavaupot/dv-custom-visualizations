# Calendar View - Quick Start Guide

## What Has Been Created

A complete skeleton for the **calendarViz** custom visualization for Oracle Analytics Cloud. This visualization displays tasks in a monthly calendar grid based on their completion date (Rok izvedbe).

## File Structure Created

```
src/customviz/com-smartq-calendarviz/
├── calendarViz.js                        # Main visualization component (500+ lines)
├── calendarVizstyles.css                 # Complete styling with responsive design
├── calendarVizdatamodelhandler.js        # Data model handler for OAC integration
├── calendarVizIcon.svg                   # Calendar icon (32x32)
├── README.md                             # Comprehensive documentation
├── QUICK_START.md                        # This file
├── extensions/
│   ├── oracle.bi.tech.plugin.visualization/
│   │   └── com.smartq.calendarViz.json
│   └── oracle.bi.tech.plugin.visualizationDatamodelHandler/
│       └── com.smartq.calendarViz.visualizationDatamodelHandler.json
└── nls/
    ├── messages.js
    └── root/
        └── messages.js
```

## Grammar Configuration

The visualization expects data in this order:

1. **Date** (1 column) - Task completion date (Rok izvedbe)
2. **Task Details** (1-3 columns) - Task title, subtitle1, subtitle2
3. **Color Category** (0-1 column) - Optional color coding
4. **Tooltips** (0-5 columns) - Additional information
5. **Measures** (0-1 column) - Optional (for future use)

## Core Features Implemented

✓ Monthly calendar grid with week layout (Mon-Sun)
✓ Task cards positioned on completion dates
✓ Month navigation (previous/next buttons)
✓ Interactive task selection for "Use as Filter"
✓ Hover tooltips with detailed information
✓ Color-coded task stripes based on category
✓ Weekend and today highlighting
✓ Responsive design for different screen sizes
✓ Full OAC integration with marking service

## Next Steps

### 1. Build the Plugin

```bash
cd /Users/zigavaupot/Documents/dv-custom-plugins
./gradlew clean build
```

This will generate the `plugin.xml` and package everything into a ZIP file.

### 2. Test Locally (if you have Oracle Analytics Desktop)

```bash
./gradlew run
```

### 3. Deploy to Oracle Analytics Cloud

1. Locate the generated plugin ZIP file
2. Go to OAC Console → Extensions
3. Upload the plugin ZIP
4. Enable the extension
5. Refresh your browser

### 4. Use in a Report

1. Create or open a workbook
2. Find "Calendar View" in visualizations
3. Drag it to canvas
4. Configure the grammar:
   - **Date**: Your date column (Rok izvedbe)
   - **Task Details**: Task name, owner, status, etc.
   - **Color Category**: Priority, type, or any categorical field
   - **Additional Info**: Extra fields for tooltips

## Code Architecture

### calendarViz.js (Main Component)
- **_extractTasks()**: Parses OAC data layout
- **_buildCalendarHtml()**: Generates calendar grid
- **_buildMonthHeader()**: Creates month navigation
- **_buildCalendarGrid()**: Builds date cells and positions tasks
- **_attachEventHandlers()**: Sets up click/hover interactions
- **_fireSelectionEvent()**: Sends selections to OAC for filtering

### calendarVizdatamodelhandler.js
- Maps logical grammar (Date, Rows, Color, Tooltip) to physical data edges
- Enables selection/marking capabilities
- Defines data limits and validation

### calendarVizstyles.css
- Responsive grid layout using CSS Grid
- Task card styling with hover effects
- Color-coded stripes for categories
- Tooltip positioning and styling
- Print-friendly styles

## Customization Points

### Colors
Edit `calendarVizstyles.css` - lines defining:
- `.calendar-task-stripe[data-color="..."]` for category colors
- `.calendar-day-today` for current day highlight
- `.calendar-header` for month header styling

### Task Card Layout
Edit `_buildTaskCard()` in `calendarViz.js` to change:
- Information displayed on cards
- Card size and structure
- Stripe positioning

### Grammar Configuration
Edit `extensions/oracle.bi.tech.plugin.visualizationDatamodelHandler/com.smartq.calendarViz.visualizationDatamodelHandler.json` to adjust:
- Min/max column counts
- Content types (temporal, categorical, measures)
- Priority order

## Key Implementation Details

### Date Handling
- First column in data layout is expected to be the date (Rok izvedbe)
- Supports JavaScript Date objects, timestamps, and date strings
- Groups tasks by date key (YYYY-MM-DD format)

### Selection Support
- Click on tasks to select/deselect
- Multiple selection supported
- Selected tasks trigger OAC marking service
- Other visualizations can listen to these selections

### Month Navigation
- Starts at current month by default
- Previous/next buttons adjust `_currentMonth`
- Re-renders calendar with same task data filtered by visible month

### Data Flow
```
OAC Data Layout
    ↓
_extractTasks() - parses columns into task objects
    ↓
_groupTasksByDate() - organizes by date
    ↓
_buildCalendarGrid() - creates HTML structure
    ↓
_attachEventHandlers() - enables interactivity
    ↓
User clicks task
    ↓
_fireSelectionEvent() - sends to OAC marking service
```

## Testing Checklist

- [ ] Build completes without errors
- [ ] Plugin appears in OAC visualization list
- [ ] Can drag Date column to Date slot
- [ ] Can drag task columns to Task Details
- [ ] Calendar grid renders correctly
- [ ] Tasks appear on correct dates
- [ ] Month navigation works (previous/next)
- [ ] Task hover shows tooltip
- [ ] Task click selects/deselects
- [ ] Selection filters other visualizations
- [ ] Color categories display correctly
- [ ] Responsive to window resize
- [ ] Works on different browsers

## Known Limitations

1. **Single Month View**: Currently shows only one month at a time
2. **Static Current Month**: Defaults to today's month on load
3. **No Date Range Filter**: Shows all tasks regardless of month (needs filtering)
4. **Icon Format**: Using SVG instead of PNG (may need conversion for older OAC versions)

## Potential Enhancements

- [ ] Add filter to only show tasks in visible month
- [ ] Multi-month view option
- [ ] Week view / Day view modes
- [ ] Drag-and-drop to reschedule tasks
- [ ] "Go to today" button
- [ ] Task count badge on dates
- [ ] Measure integration (size/color by value)
- [ ] Export calendar to iCal/CSV

## Troubleshooting

### Plugin doesn't appear in OAC
- Check build completed successfully
- Verify plugin.xml was generated
- Check OAC extension manager for errors
- Try browser hard refresh (Ctrl+F5)

### Tasks not showing
- Verify date column has valid dates
- Check date is in the visible month
- Inspect browser console for errors
- Verify data is being passed to visualization

### Styling issues
- Clear browser cache
- Check CSS file loaded correctly
- Inspect elements in browser dev tools
- Verify no CSS conflicts

## Resources

- **Oracle Analytics Documentation**: https://docs.oracle.com/en/cloud/paas/analytics-cloud/
- **Custom Viz Guide**: Search for "Oracle Analytics Custom Visualization Developer Guide"
- **Sample Code**: See kanbanViz in `src/customviz/com-smartq-kanbanviz/`

## Support

For questions or issues:
1. Check README.md for detailed documentation
2. Review kanbanViz implementation as reference
3. Consult Oracle Analytics Cloud documentation
4. Contact your OAC administrator

---

**Status**: ✅ Skeleton Complete - Ready for Build and Testing

**Created**: 2025-01-14
