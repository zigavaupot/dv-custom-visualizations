/**
 * COLOR CONFIGURATION for Calendar Visualization
 *
 * This file defines colors used in the calendar view:
 * 1. UI colors (header, weekends, today, borders)
 * 2. Task card colors (background, borders)
 * 3. Category stripe colors (left edge of each task card)
 *
 * HOW CATEGORY COLORS WORK:
 * 1. All unique values from the Color attribute are collected
 * 2. They are sorted alphabetically
 * 3. Each value is assigned a color from the categoryPalette in order
 * 4. Colors cycle if there are more categories than colors
 *
 * EDITING THIS FILE:
 * - You can change any color by replacing the hex code (e.g., "#245D63" → "#FF0000")
 * - You can add more colors to the categoryPalette array
 * - Colors must be in hex format (#RRGGBB)
 * - The order matters: first color goes to first category alphabetically
 *
 * EXAMPLE:
 * If your Color attribute has values: "VLO", "SK J-1", "SL J-4"
 * After alphabetical sorting: "SK J-1", "SL J-4", "VLO"
 * Color assignment:
 *   - "SK J-1" → #245D63 (categoryPalette[0])
 *   - "SL J-4" → #DE7F11 (categoryPalette[1])
 *   - "VLO"    → #5FB9B5 (categoryPalette[2])
 */

define([], function() {
    "use strict";

    return {
        /**
         * CALENDAR UI COLORS
         * Colors for the calendar interface elements
         */
        headerBackground: "#f5f5f5",      // Month/year header background
        weekendBackground: "#fafafa",     // Weekend date cells background
        todayBackground: "#e3f2fd",       // Today's date cell background (light blue)
        taskBackground: "#ffffff",        // Default task card background
        taskBorder: "#e0e0e0",           // Default task card border
        gridBorder: "#dddddd",           // Calendar grid lines

        /**
         * CATEGORY STRIPE COLORS
         * Colors for the colored left edge of each task card
         * Based on Oracle Redwood Design System color palette
         *
         * Categories are mapped to colors in alphabetical order.
         * If you have more than 12 categories, colors will cycle (repeat).
         */
        categoryPalette: [
            "#245D63",    // Color 1 - Dark teal
            "#DE7F11",    // Color 2 - Orange
            "#5FB9B5",    // Color 3 - Light blue/cyan
            "#4E4137",    // Color 4 - Dark brown
            "#A0C98B",    // Color 5 - Light green
            "#B47288",    // Color 6 - Light mauve/pink
            "#83401E",    // Color 7 - Dark brown/rust
            "#BBC26A",    // Color 8 - Light olive/yellow-green
            "#9E7FCC",    // Color 9 - Light purple
            "#58316E",    // Color 10 - Dark purple
            "#5FA2BA",    // Color 11 - Light cyan/blue
            "#317A45"     // Color 12 - Dark green
        ]
    };
});
