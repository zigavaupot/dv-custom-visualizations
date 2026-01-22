# Color Configuration Guide for Kanban Visualization

## Overview
The Kanban visualization uses colors in two ways:
1. **Category Stripes** - Colored left border on each card based on the "Color" attribute
2. **Conditional Card Colors** - Full card background colors for flagged items (RED/YELLOW conditions)

All colors are now **externally configurable** via the `colorConfig.js` file.

## File Location
```
src/customviz/com-smartq-kanbanviz/colorConfig.js
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
- Category 13 → `categoryPalette[0]`
- Category 14 → `categoryPalette[1]`
- etc.

## Editing Colors

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

4. **Save** the file

5. **Rebuild** the plugin:
   ```bash
   ./gradlew clean build
   ```

### To Change Conditional Card Colors (RED/YELLOW flags):

1. **Open** `colorConfig.js`

2. **Find** the conditional color settings:
   ```javascript
   // RED condition colors
   redBackground: "#ffe5e5",    // Light red background
   redBorder: "#e09393",         // Darker red border

   // YELLOW condition colors
   yellowBackground: "#fff9e5",  // Light yellow background
   yellowBorder: "#e0d093"       // Darker yellow border
   ```

3. **Replace** with your desired colors:
   ```javascript
   // RED condition colors - Make more intense
   redBackground: "#ffcccc",    // Darker red background
   redBorder: "#cc0000",         // Much darker red border

   // YELLOW condition colors - Make more visible
   yellowBackground: "#fff4cc",  // Slightly darker yellow
   yellowBorder: "#ccaa00"       // Darker yellow border
   ```

4. **Save** and **rebuild**

## Adding More Colors to Palette

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

## Color Format

### Hex Colors (Recommended):
```javascript
"#FF0000"  // Bright red
"#00FF00"  // Bright green
"#0000FF"  // Bright blue
"#CCCCCC"  // Light gray
```

### RGB/RGBA Colors (Also supported):
```javascript
"rgb(255, 0, 0)"           // Red
"rgba(255, 0, 0, 0.5)"     // Semi-transparent red
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
[KanbanViz] Loaded color configuration: {categoryPalette: Array(12), redBackground: "#ffe5e5", ...}
[KanbanViz] Category color mapping: {DODATNA: "#245D63", "SK J-1": "#DE7F11", ...}
```

### 3. Verify Visual Changes:
- Check card stripes match expected colors
- Test RED condition flag (should show red background/border)
- Test YELLOW condition flag (should show yellow background/border)
- Check legend shows correct colors for categories

## Common Customizations

### Use Brand Colors:
```javascript
categoryPalette: [
  "#003366",    // Company primary blue
  "#FF6600",    // Company accent orange
  "#00CC66",    // Company secondary green
  "#660099"     // Company tertiary purple
]
```

### High Contrast (Accessibility):
```javascript
categoryPalette: [
  "#000000",    // Black
  "#FFFFFF",    // White (use on dark cards)
  "#FF0000",    // Red
  "#00FF00",    // Green
  "#0000FF",    // Blue
  "#FFFF00"     // Yellow
]

// Make conditional colors more visible
redBackground: "#ff0000",
redBorder: "#990000",
yellowBackground: "#ffff00",
yellowBorder: "#cccc00"
```

### Subtle/Professional:
```javascript
categoryPalette: [
  "#2C3E50",    // Dark blue-gray
  "#34495E",    // Slate gray
  "#7F8C8D",    // Medium gray
  "#95A5A6",    // Light gray
  "#BDC3C7",    // Very light gray
  "#546E7A"     // Blue gray
]
```

## Deployment

After editing `colorConfig.js`:

1. **Rebuild:**
   ```bash
   ./gradlew clean build
   ```

2. **Deploy:**
   Upload the new ZIP file:
   ```
   build/distributions/customviz_com-smartq-kanbanviz.zip
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
2. No missing commas in the array
3. Array is properly closed with `]`
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

## Advanced: Dynamic Color Assignment

If you need specific colors for specific values (not alphabetical):

Currently, colors are assigned alphabetically. To override this behavior, you would need to modify `kanbanViz.js` directly in the `initializeCategoryColorMap()` function.

**Example custom mapping:**
```javascript
// In kanbanViz.js, modify initializeCategoryColorMap()
function initializeCategoryColorMap(tasks) {
  CATEGORY_COLOR_MAP = {
    "VLO": "#FF0000",      // Specific color for VLO
    "SK J-1": "#00FF00",   // Specific color for SK J-1
    "DODATNA": "#0000FF"   // Specific color for DODATNA
  };

  // Fall back to palette for any unspecified categories
  var palette = KANBAN_COLORS.categoryPalette;
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].colorKey && !CATEGORY_COLOR_MAP[tasks[i].colorKey]) {
      var colorIndex = Object.keys(CATEGORY_COLOR_MAP).length % palette.length;
      CATEGORY_COLOR_MAP[tasks[i].colorKey] = palette[colorIndex];
    }
  }
}
```

## Notes

- Colors are loaded once when the module initializes
- Changes require rebuild and redeployment
- The color configuration is logged to console for debugging
- Category-to-color mapping is also logged to help verify assignments
- All colors must be valid CSS color values
- Use a color picker tool to find hex codes: https://htmlcolorcodes.com/
