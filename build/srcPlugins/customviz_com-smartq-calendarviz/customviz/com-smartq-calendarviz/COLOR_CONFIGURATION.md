# Color Configuration Guide for Calendar Visualization

## Overview
The Calendar visualization uses colors for:
1. **UI Elements** - Calendar interface (headers, weekends, today, borders)
2. **Task Cards** - Default task background and borders
3. **Category Stripes** - Colored left edge on task cards based on "Color" attribute

All colors are now **externally configurable** via the `colorConfig.js` file.

## File Location
```
src/customviz/com-smartq-calendarviz/colorConfig.js
```

## How Category Colors Work

### Data Flow:
1. User assigns an attribute to the **"Color" grammar placeholder** (e.g., "Nosilec", "Project", "Department")
2. Visualization collects all **unique values** from that attribute
3. Values are **sorted alphabetically**
4. Each value is assigned a color from the `categoryPalette` array **in order**

### Example:
**Color Attribute Values:** "VLO", "SK J-1", "SL J-4", "DODATNA"

**After Alphabetical Sorting:**
1. "DODATNA"
2. "SK J-1"
3. "SL J-4"
4. "VLO"

**Color Assignment:**
- "DODATNA" → `categoryPalette[0]` → #245D63 (Dark teal)
- "SK J-1"  → `categoryPalette[1]` → #DE7F11 (Orange)
- "SL J-4"  → `categoryPalette[2]` → #5FB9B5 (Light blue)
- "VLO"     → `categoryPalette[3]` → #4E4137 (Dark brown)

**If you have more categories than colors:** The palette cycles (repeats).

## Editing Colors

### To Change UI Colors:

1. **Open** `colorConfig.js`

2. **Find** the UI color settings:
   ```javascript
   headerBackground: "#f5f5f5",      // Month/year header
   weekendBackground: "#fafafa",     // Weekend cells
   todayBackground: "#e3f2fd",       // Today's cell (light blue)
   taskBackground: "#ffffff",        // Task cards
   taskBorder: "#e0e0e0",           // Task card borders
   gridBorder: "#dddddd"            // Calendar grid lines
   ```

3. **Replace** any color hex code:
   ```javascript
   todayBackground: "#ffeb3b",       // Now yellow
   weekendBackground: "#e8f5e9"      // Now light green
   ```

4. **Save** the file

5. **Rebuild** the plugin:
   ```bash
   ./gradlew clean build
   ```

### To Change Category Stripe Colors:

1. **Open** `colorConfig.js`

2. **Find** the `categoryPalette` array:
   ```javascript
   categoryPalette: [
     "#245D63",    // Color 1 - Dark teal
     "#DE7F11",    // Color 2 - Orange
     "#5FB9B5",    // Color 3 - Light blue/cyan
     // ... more colors
   ]
   ```

3. **Replace** any color hex code:
   ```javascript
   categoryPalette: [
     "#FF0000",    // Color 1 - Now bright red
     "#00FF00",    // Color 2 - Now bright green
     "#0000FF",    // Color 3 - Now bright blue
     // ... rest unchanged
   ]
   ```

4. **Save** and **rebuild**

## Color Purpose Reference

### Calendar UI Colors

| Property | Default | Purpose |
|----------|---------|---------|
| headerBackground | #f5f5f5 | Month/year selector header background |
| weekendBackground | #fafafa | Saturday and Sunday date cells |
| todayBackground | #e3f2fd | Highlight for today's date |
| taskBackground | #ffffff | Default task card background (white) |
| taskBorder | #e0e0e0 | Default task card border (light gray) |
| gridBorder | #dddddd | Calendar grid cell borders |

### Common UI Customizations

**Dark Mode Style:**
```javascript
headerBackground: "#2c2c2c",
weekendBackground: "#1e1e1e",
todayBackground: "#1a237e",
taskBackground: "#424242",
taskBorder: "#616161",
gridBorder: "#757575"
```

**Bright/High Contrast:**
```javascript
todayBackground: "#ffeb3b",       // Bright yellow
weekendBackground: "#e8f5e9",     // Light green
taskBorder: "#000000"             // Black borders
```

**Subtle/Professional:**
```javascript
headerBackground: "#fafafa",
weekendBackground: "#f5f5f5",
todayBackground: "#e1f5fe",
taskBackground: "#ffffff",
taskBorder: "#e0e0e0",
gridBorder: "#eeeeee"
```

## Adding More Category Colors

To support more than 12 unique categories without cycling:

```javascript
categoryPalette: [
  "#245D63",    // 1
  "#DE7F11",    // 2
  "#5FB9B5",    // 3
  "#4E4137",    // 4
  "#A0C98B",    // 5
  "#B47288",    // 6
  "#83401E",    // 7
  "#BBC26A",    // 8
  "#9E7FCC",    // 9
  "#58316E",    // 10
  "#5FA2BA",    // 11
  "#317A45",    // 12
  "#FF6B6B",    // 13 - NEW: Coral red
  "#4ECDC4",    // 14 - NEW: Turquoise
  "#95E1D3",    // 15 - NEW: Mint green
  "#F38181"     // 16 - NEW: Light red
]
```

## Testing Color Changes

### 1. Quick Test (Development Mode):
```bash
cd /Users/zigavaupot/Documents/dv-custom-plugins
./gradlew run
```

### 2. Check Console:
Open browser console and look for:
```
[CalendarViz] Loaded color configuration: {headerBackground: "#f5f5f5", categoryPalette: Array(12), ...}
```

### 3. Verify Visual Changes:
- Check weekend cells background color
- Check today's date highlight
- Check task card stripes match expected colors
- Check color legend shows correct colors

## Deployment

After editing `colorConfig.js`:

1. **Rebuild:**
   ```bash
   ./gradlew clean build
   ```

2. **Deploy:**
   Upload the new ZIP file:
   ```
   build/distributions/customviz_com-smartq-calendarviz.zip
   ```

3. **Refresh:**
   Clear browser cache and reload Oracle Analytics

## Troubleshooting

### Problem: Colors not changing

**Check:**
1. Did you save `colorConfig.js`?
2. Did you rebuild? (`./gradlew clean build`)
3. Did you deploy the NEW ZIP file (check timestamp)?
4. Did you clear browser cache?

### Problem: JavaScript error in console

**Check:**
1. Color format is correct (must be valid CSS color)
2. No missing commas in arrays or objects
3. All properties have values
4. No syntax errors in the file

**Valid:**
```javascript
categoryPalette: [
  "#FF0000",
  "#00FF00"
]
```

**Invalid:**
```javascript
categoryPalette: [
  "#FF0000"   // ❌ Missing comma
  "#00FF00"
]  // ❌ Missing comma before closing
```

### Problem: Console shows "Cannot read property 'categoryPalette'"

**Issue:** colorConfig.js not loading properly

**Solution:**
1. Check file exists at correct path
2. Rebuild plugin
3. Check console for module loading errors

## Notes

- Colors are loaded once when the module initializes
- Changes require rebuild and redeployment
- The color configuration is logged to console for debugging
- Category-to-color mapping is logged to help verify assignments
- All colors must be valid CSS color values
- Use a color picker tool to find hex codes: https://htmlcolorcodes.com/
- Weekend coloring applies to Saturday (day 6) and Sunday (day 0)
- Today's date uses a special highlight color for easy identification
