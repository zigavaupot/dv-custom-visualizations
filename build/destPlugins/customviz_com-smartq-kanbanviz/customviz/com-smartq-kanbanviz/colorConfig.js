/**
 * COLOR CONFIGURATION for Kanban Visualization
 *
 * This file defines the color palette used for the colored stripe on cards.
 * The stripe color is determined by the value in the "Color" grammar placeholder.
 *
 * HOW IT WORKS:
 * 1. All unique values from the Color attribute are collected
 * 2. They are sorted alphabetically
 * 3. Each value is assigned a color from the palette in order
 * 4. Colors cycle if there are more categories than colors
 *
 * EDITING THIS FILE:
 * - You can change any color by replacing the hex code (e.g., "#245D63" → "#FF0000")
 * - You can add more colors to the palette array
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
     * CATEGORY STRIPE COLORS
     * Colors for the colored stripe on the left side of each card
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
    ],

    /**
     * CONDITIONAL CARD COLORS
     * These colors are used when condition flags (RED or YELLOW) are set to "Y"/"Yes"/"1"/"TRUE"
     *
     * RED condition (highest priority):
     * - Typically used for overdue tasks or critical items
     * - Changes card background and border color
     *
     * YELLOW condition (second priority):
     * - Typically used for warnings or items due soon
     * - Changes card background and border color
     * - If both RED and YELLOW are true, RED takes priority
     */

    // RED condition colors (for overdue/critical items)
    redBackground: "#ffe5e5",    // Light red background
    redBorder: "#e09393",         // Darker red border

    // YELLOW condition colors (for warnings/items due soon)
    yellowBackground: "#fff9e5",  // Light yellow background
    yellowBorder: "#e0d093"       // Darker yellow border
  };
});
