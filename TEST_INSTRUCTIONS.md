# Testing Instructions for KanbanViz Color Properties

## Current Status
✅ Y/N color coding is working (red/yellow backgrounds appear)
❌ Custom color properties not appearing in Properties dialog

## Debug Steps

### 1. Deploy the Plugin
Upload the plugin file from:
```
/Users/zigavaupot/Documents/dv-custom-plugins/build/destPlugins/customviz_com-smartq-kanbanviz
```

### 2. Open Browser Console (CRITICAL!)
Before opening the visualization properties:
- Press F12 (or right-click → Inspect)
- Go to Console tab
- Keep it open

### 3. Open Properties Dialog
- Right-click on the visualization
- Click "Properties"

### 4. Check Console Output
Look for these log messages:
```
[KanbanViz] _addVizSpecificPropsDialog called
[KanbanViz] oTabbedPanelsGadgetInfo: {...}
[KanbanViz] Current options: {...}
[KanbanViz] Added dateFormatGadget to general tab
[KanbanViz] Created style tab
[KanbanViz] Added 4 color gadgets to style tab. Total gadgets: 4
[KanbanViz] Also added 4 color gadgets to general tab. Total gadgets: 5
[KanbanViz] Final oTabbedPanelsGadgetInfo: {...}
[KanbanViz] Called superClass._addVizSpecificPropsDialog
```

### 5. Check for Properties
Look in these tabs:
- **General** tab - should have "Date Format" + 4 color dropdowns
- **Style** tab - should have 4 color dropdowns

### 6. If Properties Don't Appear
Check console for:
- Any JavaScript errors (red text)
- Whether `_addVizSpecificPropsDialog` was called at all
- The structure of `oTabbedPanelsGadgetInfo` in the logs

### 7. If Console Shows Nothing
This means:
- The method isn't being called
- Oracle Analytics might be using a cached version
- Try: Clear browser cache, restart OAC, or re-upload plugin

## Expected Properties

### In General or Style Tab:
1. **Date Format** - dropdown with formats like yyyy-MM-dd
2. **RED Background Color** - dropdown (Light Red, Red, Dark Red, etc.)
3. **RED Border Color** - dropdown
4. **YELLOW Background Color** - dropdown  
5. **YELLOW Border Color** - dropdown

## Current Color Behavior
- Layer 5 (1st Tooltip column): Y/Yes/D/Da/1/TRUE → RED background
- Layer 6 (2nd Tooltip column): Y/Yes/D/Da/1/TRUE → YELLOW background
- RED has priority over YELLOW

## If Still Not Working
Share the console output so we can diagnose further!
