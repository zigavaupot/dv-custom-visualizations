# Attribute Pivot Viz — Properties Reference

All properties are accessible via the Properties panel (gear icon) in Oracle Analytics Cloud Edit mode.
Most toggle properties use **Auto / On / Off** options. "Auto" resolves to a sensible default as noted below.

---

## Show Edge Labels

**Options:** Auto / On / Off — **Auto = On**

Shows or hides the dimension name labels at the top of each row and column header group (e.g. "Region", "Product Category"). When Off, headers show only the dimension member values without the label row above them.

---

## Show Values

**Options:** Auto / On / Off — **Auto = On**

Controls whether measure/metric values (numbers) are displayed inside the data cells. When Off, all cell content — both attribute values and numeric measures — is hidden, leaving only the header structure visible.

---

## Show Empty Cells

**Options:** Auto / On / Off — **Auto = Off**

When On, the pivot expands to show every possible row × column combination, even those where the underlying data has no records. Empty cells appear for data gaps. When Off (default), only combinations that actually have data are rendered, keeping the table compact.

---

## Auto-fit Columns

**Options:** Auto / On / Off — **Auto = On**

When On, column widths are automatically sized to fit their content on each render. When Off, columns use the widths the author has manually set by dragging the column resizers, and those widths are preserved when the workbook is saved.

---

## Wrap Text

**Options:** Auto / On / Off — **Auto = Off**

When On, long cell content wraps to multiple lines instead of being clipped. Row height expands to accommodate the wrapped text.

---

## Value Alignment

**Options:** Auto / Left / Center / Right — **Auto = Center**

Horizontal alignment of measure values inside data cells. Does not affect header alignment.

---

## Value Format

**Options:** Auto / #,##0 / #,##0.00 / Currency / Percent — **Auto = as provided by data model**

Number format applied to all measure values. Auto uses whatever format the data model supplies. The explicit options override it with thousands-separated integer, two-decimal, currency symbol, or percentage formatting.

---

## Cell Background

**Options:** Color picker — **Default = no color**

Applies a uniform background color to all data cells. When set, every cell in the pivot body receives the chosen color. Cells that already have a more specific color applied (via Attribute Fill Color or Metric Fill Color) retain their specific color — Cell Background acts as a base layer that only fills cells not otherwise colored. Leave the picker empty to disable this property.

---

## Metric Fill Color

**Options:** Color picker — **Default = Blue (#10488c)**

Background color applied to cells that contain a metric (measure) value. Uses a gradient scale from light (low value) to the selected color (high value) within each column. Leave the picker empty to disable metric gradient coloring.

---

## Attribute Fill Color

**Options:** Color picker — **Default = Green (#6f8f5f)**

Background color applied to cells colored by a categorical attribute (when a Color dimension is assigned). Each distinct attribute value receives a tint of the selected color. Leave the picker empty to disable attribute coloring.

---

## Compress Row Headers

**Options:** Auto / On / Off — **Auto = On**

When On, repeated identical values in row headers are merged into a single spanning cell (e.g. "North" appears once across three rows instead of three times). When Off, every row shows all header values independently.

---

## Compress Column Headers

**Options:** Auto / On / Off — **Auto = On**

Same as Compress Row Headers but applied to column headers — repeated values in column header rows are merged into spanning cells.

---

## Row Density

**Options:** Auto / Compact / Comfortable — **Auto = Compact**

Controls the vertical padding inside data rows. Compact gives tighter rows for dense data. Comfortable adds padding for easier reading.

---

## Banded Rows

**Options:** Auto / On / Off — **Auto = Off**

When On, alternating rows are shaded with a subtle background stripe to improve readability across wide tables.

---

## Set Sort

**Options:** Default / Save New Default Sort — **always shows Default**

Controls the default sort that is applied when the workbook is opened in Run/Preview mode.

- **Default** — clears any previously saved custom sort; the table renders in the data source's natural order.
- **Save New Default Sort** — commits the sort currently set via the sort toolbar as the workbook default. This is a one-shot action: after clicking it, the property resets to Default. To update the saved sort, set a new sort in the toolbar and click Save New Default Sort again.
