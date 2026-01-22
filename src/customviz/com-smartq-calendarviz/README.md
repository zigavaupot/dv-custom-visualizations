# Calendar View Visualization for Oracle Analytics Cloud

A custom visualization plugin that displays tasks in a calendar grid format, organized by weeks and dates for the selected month. Tasks are positioned based on their completion date (Rok izvedbe).

## Overview

The Calendar View visualization provides an intuitive way to view tasks and events on a monthly calendar grid. Users can see when tasks are due, navigate between months, and interact with tasks to filter data.

## Features

- **Monthly Calendar Grid**: Displays a traditional calendar layout with weeks and dates
- **Task Cards**: Shows tasks on their completion dates with title and subtitles
- **Color Coding**: Supports color categories to visually distinguish task types
- **Interactive Navigation**: Navigate between months using previous/next buttons
- **Tooltips**: Hover over tasks to see additional information
- **Selection Support**: Click tasks to use as filters in Oracle Analytics
- **Responsive Design**: Adapts to different screen sizes
- **Weekend Highlighting**: Visual distinction for weekend days
- **Today Indicator**: Highlights the current date

## Data Requirements

### Required Columns

1. **Date** (1 column, temporal)
   - The task completion date (Rok izvedbe)
   - Must be a valid date column
   - Used to position tasks on the calendar

2. **Task Details** (1-3 columns, categorical)
   - First column: Task title (required)
   - Second column: First subtitle (optional)
   - Third column: Second subtitle (optional)

### Optional Columns

3. **Color Category** (0-1 column, categorical)
   - Used to color-code tasks with a left border stripe
   - Predefined colors for: High, Medium, Low, Red, Yellow, Green, Blue

4. **Additional Info** (0-5 columns, categorical)
   - Additional fields to display in tooltips
   - Shown when hovering over tasks

5. **Measures** (0-1 column, numeric)
   - Reserved for future enhancements
   - Not currently used in the visualization

## Usage Instructions

### Adding the Visualization to a Report

1. Open Oracle Analytics Cloud
2. Create a new workbook or open an existing one
3. From the visualizations panel, find "Calendar View"
4. Drag it onto the canvas

### Configuring the Grammar

1. **Date**: Drag your date column (Rok izvedbe) to the Date slot
2. **Task Details**: Drag 1-3 categorical columns for task information
   - First column becomes the task title
   - Second and third columns become subtitles
3. **Color Category** (optional): Drag a categorical column to color-code tasks
4. **Additional Info** (optional): Drag columns with extra information for tooltips

### Example Configuration

```
Date: Task Completion Date (Rok izvedbe)
Task Details:
  - Project Name
  - Task Owner
  - Status
Color Category: Priority
Additional Info:
  - Department
  - Budget
```

## User Interactions

### Navigation
- **Previous Month**: Click the `<` button to view the previous month
- **Next Month**: Click the `>` button to view the next month

### Task Selection
- **Single Click**: Select/deselect a task
- **Selected tasks**: Highlighted with blue border and background
- **Use as Filter**: Selected tasks can filter other visualizations on the canvas

### Tooltips
- **Hover**: Move mouse over a task to see detailed information
- **Content**: Shows title, subtitles, and all additional info fields

## Styling and Colors

### Default Color Scheme
- **Header**: Blue (#0572ce)
- **Weekends**: Light gray background
- **Today**: Light blue background
- **Tasks**: White background with gray border

### Color Categories
Pre-configured colors for the Color Category field:
- **High / Red**: Red (#d32f2f)
- **Medium / Yellow**: Orange (#f57c00)
- **Low / Green**: Green (#388e3c)
- **Blue**: Blue (#1976d2)

## File Structure

```
com-smartq-calendarviz/
├── calendarViz.js                        # Main visualization component
├── calendarVizstyles.css                 # Styling
├── calendarVizdatamodelhandler.js        # Data model handler
├── calendarVizIcon.svg                   # Icon for OAC
├── extensions/
│   ├── oracle.bi.tech.plugin.visualization/
│   │   └── com.smartq.calendarViz.json
│   └── oracle.bi.tech.plugin.visualizationDatamodelHandler/
│       └── com.smartq.calendarViz.visualizationDatamodelHandler.json
├── nls/
│   ├── messages.js
│   └── root/
│       └── messages.js
└── README.md
```

## Technical Details

### Architecture
- **Base Class**: Extends `obitech-report/datavisualization`
- **Module System**: AMD (RequireJS)
- **Dependencies**: jQuery, OAC framework libraries

### Data Processing
1. Extracts date and task data from OAC data layout
2. Groups tasks by date
3. Builds calendar grid for selected month
4. Positions tasks on their completion dates
5. Handles user interactions and selection events

### Performance
- **Data Limits**: Up to 10,000 rows and 10 columns
- **Rendering**: Optimized for monthly view with dynamic task loading
- **Responsive**: CSS-based responsive design

## Development

### Prerequisites
- Oracle Analytics Cloud development environment
- Gradle build system
- Java 8 or higher

### Building the Plugin

```bash
# Navigate to project directory
cd /path/to/dv-custom-plugins

# Clean and build the plugin
./gradlew clean build

# Run with Oracle Analytics Desktop (if available)
./gradlew run
```

### Testing
1. Build the plugin
2. Deploy to Oracle Analytics Cloud or Desktop
3. Create a test dataset with date and task columns
4. Add the visualization to a canvas
5. Configure the grammar with your test data
6. Verify calendar rendering and interactions

## Customization

### Modifying Colors
Edit `calendarVizstyles.css` to change:
- Task card appearance
- Calendar grid colors
- Header and navigation styling
- Color category mappings

### Adjusting Layout
Modify `calendarViz.js` to change:
- Calendar grid structure
- Task card layout
- Month navigation behavior
- Tooltip content

### Adding Features
Potential enhancements:
- Multi-month view
- Week/Day view modes
- Drag-and-drop task rescheduling
- Task creation/editing
- Integration with measures for sizing/coloring
- Export to iCal format

## Troubleshooting

### Tasks Not Appearing
- Verify date column contains valid dates
- Check that dates fall within the current month view
- Ensure task detail columns are properly mapped

### Incorrect Date Positioning
- Verify date format is recognized by JavaScript Date parser
- Check timezone settings
- Ensure date column is mapped to the Date grammar slot (not Task Details)

### Selection Not Working
- Verify marking is enabled in OAC
- Check that other visualizations are listening to filters
- Ensure data model handler is properly configured

### Styling Issues
- Clear browser cache
- Check CSS file is loaded correctly
- Verify no CSS conflicts with OAC styles

## Version History

### Version 1.0.0 (Initial Release)
- Monthly calendar view
- Task positioning by completion date
- Interactive navigation
- Selection/filtering support
- Color coding
- Tooltip support
- Responsive design

## License

Copyright (c) 2025. All rights reserved.

## Support

For issues, questions, or feature requests, please contact your Oracle Analytics administrator or the plugin developer.

## Credits

Developed based on the Oracle Analytics Cloud custom visualization framework and inspired by the kanbanViz plugin architecture.
