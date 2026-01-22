# Calendar Visualization - Troubleshooting Guide

## Issue: "Adding $[ID$] to Table's Rows edge" failed when converting from Table

### Problem Description
When trying to change visualization type from Table to CalendarViz, the conversion fails with:
```
Please wait for current action...
"Adding $[ID$] to Table's Rows edge" failed.
```

### Root Cause
Oracle Analytics is trying to automatically map the Table's columns to CalendarViz's structure, but the conversion logic is failing. This can happen because:

1. **Column order mismatch**: Table may have columns in different order than CalendarViz expects
2. **Data type recognition**: The Date column might not be recognized as a temporal type
3. **Insufficient columns**: Need exactly 2+ columns in specific order

### Solution

**Instead of converting, create CalendarViz fresh:**

1. **Add CalendarViz to canvas directly**
   - Drag CalendarViz visualization icon to an empty area of canvas
   - Don't drag it on top of existing Table

2. **Configure columns in correct order**
   - **Rows - Column 1**: Task Name (categorical/text)
   - **Rows - Column 2**: Deadline/Date (date/temporal field)
   - **Rows - Column 3-4**: Optional additional details

3. **Verify date column format**
   - Make sure your date column is recognized as a Date type
   - Check in data panel that the column has a date icon
   - If needed, cast text to date in your data preparation

## Issue: Workbook freezes when dragging visualization to canvas

### Symptoms
- Drag CalendarViz to canvas
- Message: "Please wait for current action..."
- Workbook becomes unresponsive

### Root Cause (Fixed in latest version)
Previous versions didn't call `_setIsRendered(true)` in all code paths.

### Solution
Update to latest plugin version (build after 2025-01-15 11:16).

## Issue: "No valid tasks found" message

### Symptoms
Calendar displays but shows error:
```
No valid tasks found
Make sure the 2nd column (Date) contains valid date values.
```

### Root Cause
The date parser couldn't recognize the date format in your 2nd column.

### Solution

1. **Check browser console** (F12 → Console tab) for detailed error messages
   - Look for: "Could not parse date value..."
   - This will show the actual value and type

2. **Verify date column type**
   - Column should be Date/Time type, not Text
   - If stored as text, dates must be in ISO format: `YYYY-MM-DD` or `YYYY-MM-DD HH:mm:ss`

3. **Supported date formats:**
   - Date objects (native JavaScript Date)
   - Timestamps (milliseconds since epoch)
   - ISO strings: `2025-01-15`, `2025-01-15T10:30:00`
   - Standard date strings parseable by `Date.parse()`

4. **If dates are text, convert them:**
   ```sql
   -- In your data preparation
   TO_DATE(your_text_column, 'YYYY-MM-DD')
   ```

## Issue: Calendar shows but no tasks appear

### Symptoms
- Calendar grid renders correctly
- Month navigation works
- But no task cards appear on any dates

### Possible Causes

1. **Tasks are in different month**
   - Calendar defaults to current month
   - Your task dates might be in past/future months
   - **Solution**: Use navigation buttons to browse months

2. **All dates failed to parse**
   - Check console for "Invalid date" warnings
   - **Solution**: Fix date format (see above)

3. **Tasks extracted but dates null**
   - **Solution**: Check that 2nd column is actually a date field

## Issue: Only showing "Currently have: X column(s)" error

### Symptoms
Error message shows:
```
Calendar View requires at least 2 columns in Rows
Currently have: 1 column(s)
```

### Root Cause
Not enough columns added to Rows placeholder.

### Solution
Add at minimum:
1. A task name column (text/categorical)
2. A date column (date/temporal)

## Debugging Tips

### Enable detailed logging

1. Open browser console (F12)
2. Filter by "CalendarViz"
3. Look for log messages:
   - "CalendarViz initialized"
   - "CalendarViz render called"
   - "Extracted N tasks"
   - "First date value type: ..."
   - "Invalid date at row..."

### Check data structure

Add this to browser console after visualization loads:
```javascript
// Get the viz instance
var viz = document.querySelector('[data-viz-type="calendarViz"]');
// This should show the extracted tasks
console.log(viz._tasks);
```

### Verify column order

The Rows placeholder should show columns in this exact order:
```
Rows
├── Task Name        ← Text/Categorical
├── Deadline         ← Date/Temporal
├── Detail 1         ← Optional
└── Detail 2         ← Optional
```

## Best Practices

### Data Preparation

1. **Always use proper date types**
   - Don't store dates as text if avoidable
   - Use `TO_DATE()` or `CAST(... AS DATE)` in SQL

2. **Ensure date column is second**
   - First column: Task name
   - Second column: Date
   - Order matters!

3. **Test with small dataset first**
   - Start with 5-10 rows
   - Verify dates parse correctly
   - Then scale up

### Creating Visualization

1. **Start fresh, don't convert**
   - Add CalendarViz directly to canvas
   - Don't try to convert from Table

2. **Add columns one at a time**
   - First: Add task name to Rows
   - Second: Add date to Rows
   - Third: Add optional details
   - Fourth: Add Color/Tooltip if needed

3. **Check after each addition**
   - Does calendar still render?
   - Any error messages?
   - Check console for warnings

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "No data layout provided" | No data columns added | Add columns to Rows |
| "Currently have: X column(s)" | Need at least 2 columns | Add task name + date |
| "No valid tasks found" | Dates couldn't be parsed | Check date format |
| "Invalid date at row X" | Specific row has bad date | Fix that row's date value |
| "Date column missing" | 2nd column is null/empty | Ensure 2nd column exists |

## Still Having Issues?

1. **Check plugin version**
   - Latest: 2025-01-15 11:23 or later
   - Older versions had freezing issues

2. **Verify data types**
   - Use Data Panel to check column types
   - Date columns should have calendar icon

3. **Test with sample data**
   - Create simple dataset:
     ```
     Task Name | Deadline
     ---------|----------
     Task 1   | 2025-01-15
     Task 2   | 2025-01-20
     Task 3   | 2025-02-01
     ```

4. **Check browser console**
   - Always check for JavaScript errors
   - CalendarViz logs detailed information

5. **Try in different browser**
   - Chrome, Firefox, or Edge
   - Some date parsing varies by browser

## Contact Support

If issues persist, provide:
- Browser console logs (CalendarViz messages)
- Screenshot of error
- Sample of your date values
- Column types from Data Panel
- OAD/OAC version
