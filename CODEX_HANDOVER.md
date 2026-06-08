# Codex Handover: Sort Persistence in Attribute Pivot Viz

## Goal

OAC custom visualization `com-smartq-attributepivotviz`. Authors set sort via a sort toolbar embedded in the viz. When the workbook is saved and reopened in Run/Preview mode, the sort the author chose must be used. No "Save Sort" button, no toggle — it must happen automatically and silently.

---

## The Core Architecture Constraint

OAC's workbook persistence works via a single mechanism:

```
OAC calls viz._handlePropChange(gadgetID, propChange, oViewSettings, oActionContext)
  → our handler returns bUpdateSettings = true
  → OAC commits the workbook
```

**There is no other way.** `oViewSettings.setViewConfigJSON()` writes are in-session only. `notifyStoredViewConfigChanged()` (which tries setDirty, markDirty, notifyChanged, etc.) has no effect on persistence. The hosting context has only `_getHostedComponent`, `_getParentHostingContext`, `getService` — none of these have commit methods. `getService()` returns null for all tried names. RequireJS module inspection found no workbook commit module. `oViewSettings` prototype chain has only data-model methods (no commit/save).

**`bUpdateSettings = true` is only meaningful when OAC is the caller**, not when our code calls `_handlePropChange` directly.

---

## What Is Confirmed Working

**The piggyback mechanism**: When the user changes ANY Properties panel property (e.g., Show Values, Show Edge Labels, etc.), OAC calls our `_handlePropChange`. Our handler:
1. Processes the property change (sets `changed = true`)  
2. Piggybbacks the current `_sortState` onto the commit
3. Returns `bUpdateSettings = true`
4. OAC commits → sort is saved

This works 100% reliably. The problem is it requires user interaction with the Properties panel.

**The log that confirms this worked**:
```
[AttrPivot] Sort piggybacked in handlePropChange for gadget: showValues | sortLen: N
```

---

## The Properties Panel Lifecycle

- `_addVizSpecificPropsDialog(oTabbedPanelsGadgetInfo)` is called when the Properties panel opens
- `doAddVizSpecificPropsDialog` creates GadgetInfos including `showValuesInfo` with ID `showValues`
- The rendered GadgetView has DOM id `idGadgetViewFor_showValues`
- When the Properties panel closes (user clicks elsewhere), OAC **removes the DOM elements** — `getElementById('idGadgetViewFor_showValues')` returns null
- OAC's "click-outside" handler is in **capture phase on `document`**, which fires BEFORE any handler on child elements (rootElem, the sort button, etc.)
- Therefore: by the time our sort click handler fires, the Properties panel elements are already gone

## Confirmed Dead Ends

| Approach | Result |
|----------|--------|
| `GadgetInfo.setValue(toggle)` | Updates model only; does NOT fire OAC's registered change handler |
| `GadgetInfo._getChangeHandler()` | Returns `null` — OAC doesn't use `_setChangeHandler` for its pipeline |
| `factory.getHostingContext()` methods | Only `_getHostedComponent`, `_getParentHostingContext`, `getService` — no commit methods at any level of the 4-level chain |
| `getService(...)` with 25+ service names | All return null |
| `oViewSettings` prototype chain methods | Only `getLastSavedLogicalDataModel`, `setLastSavedLogicalDataModel`, `updateExcludedFilterIDs` — NOT commit methods. Calling `getLastSavedLogicalDataModel()` caused `Failed to render ReportToolbar` errors — do NOT call methods on oViewSettings |
| DOM click on `idGadgetViewFor_showValues` | Element is null when sort is clicked — Properties panel already closed |
| `stopPropagation()` in rootElem capture-phase mousedown | Too late — OAC's document capture-phase handler fires first |
| `notifyStoredViewConfigChanged()` | Already tries setDirty/markDirty/notifyChanged/notifySettingsChanged — none cause persistence |

---

## Current Code State

**File**: `src/customviz/com-smartq-attributepivotviz/attributePivotViz.js`

**Key constants** (do not change):
```javascript
var VIEW_CONFIG_KEY = 'attrPivotFormatting';
var SORT_CONFIG_KEY = 'attrPivotSortState';
var SORT_VERSION_KEY = 'attrPivotSortStateVersion';
var VIEW_CONFIG_VERSION = '1.0.19';
```

**Constructor** stores: `_sortState`, `_hasUserSortOverride`, `_oViewSettings`, `_oActionContext`, `_showValuesGadgetInfo`, `_tabbedPanelsGadgetInfo`, `_generalPanelRef`

**`_handlePropChange`** (lines ~4075-4181):
- On ANY Properties panel change: piggybacked sort is committed (`_hasUserSortOverride && _sortState.length > 0` → sort added to conf → `bUpdateSettings = true`)
- Handles `sortState` gadget ID natively (for future use)
- Logs: `[AttrPivot] Sort piggybacked in handlePropChange for gadget: X | sortLen: N`

**`_persistSortState`** (lines ~3109-3283): Called whenever user changes sort via toolbar. Currently:
1. Writes sort to ALL in-memory stores (`oViewSettings.setViewConfigJSON`, `setStoredViewConfig`)
2. Tries to find `idGadgetViewFor_showValues` in DOM and trigger a property change via 3 strategies (JET value, button click, custom event dispatch) — currently returns null because panel is closed
3. Always runs superClass fallback (in-session only, no workbook commit)

**`doAddVizSpecificPropsDialog`** (lines ~4197-4444):
- Creates `showValuesInfo` (TextSwitcherGadgetInfo, ID `showValues`)
- Stores `this._showValuesGadgetInfo = showValuesInfo`

**Mousedown handler** (lines ~3552-3569): Capture-phase, handles `.pivot-sort-toolbar-toggle` and `.pivot-sort-control-main, .pivot-sort-dir, .pivot-sort-clear`. Added `stopPropagation()` for sort controls — confirmed insufficient because OAC's handler is on `document` capture phase.

**Build**: `./gradlew build` (not `buildPlugin`). Output: `build/distributions/customviz_com-smartq-attributepivotviz.zip`.

---

## DOM Structure (Confirmed)

From OAC's aria-hidden error output (Properties panel IS in same document, not iframe):

```
<tr data-bi_gadget_row="showValues">
  <td class="bi_gadgets_field_label_cell">
    <label for="idGadgetViewFor_showValues">Show Values</label>
  </td>
  <td class="bi_gadgets_field_cell" data-bind="allowGadgetBinding: false">
    <!-- GadgetView rendered here — OJ-BUTTONSET or similar -->
  </td>
</tr>
```

**GadgetView element ID**: `idGadgetViewFor_showValues` (confirmed from `<label for="...">`)
**Row selector**: `[data-bi_gadget_row="showValues"]`
**Panel container**: `gadgetdialog_102::innerContainer` (with `data-bi-content-id="view!1"`)

---

## What Was Just Implemented (for Codex to test)

### Document-Level Mousedown Pre-Commit Handler

**File**: `src/customviz/com-smartq-attributepivotviz/attributePivotViz.js`

A `document.addEventListener('mousedown', handler, true)` capture handler is now registered in `_attachEventHandlers` (once per viz instance, guarded by `_docSortPreCommitRegistered`). This fires for every mousedown in the document. When:
- The target is inside our viz's `_eventHandlersRoot`
- The target is a `.pivot-sort-clear`, `.pivot-sort-dir`, or `.pivot-sort-control-main` control
- The Properties panel element `idGadgetViewFor_showValues` is in the DOM

It pre-computes the new sort state (same logic as the click handler — `_toggleSort` / `_setSortDirection` / `clear`), sets `_hasUserSortOverride = true`, flags `_sortPreComputedForElement`, and calls `_persistSortState()`.

**Theory**: If our handler was registered on `document` BEFORE OAC's "click-outside" handler (which fires on mousedown to close the Properties panel), our handler fires first while the panel DOM is still present. `idGadgetViewFor_showValues` would be found. The enhanced Strategy B in `_persistSortState` now walks all shadow roots under the GadgetView element to find buttons.

**The click handler** now checks `_sortPreComputedForElement` to skip re-computing sort state (prevents double-toggle for header clicks).

**Build**: `./gradlew build` — BUILD SUCCESSFUL.

**Test plan**:
1. Open workbook in Edit mode
2. Open Properties panel (gear icon on the Attribute Pivot viz)
3. Click a sort column header in the viz (Properties panel must remain open in background)
4. Check console for:
   - `[AttrPivot] showValues GadgetView element: <something>#idGadgetViewFor_showValues` (not null)
   - `[AttrPivot] Buttons found (light+shadow): N` (ideally > 0)
   - `[AttrPivot] Sort piggybacked in handlePropChange for gadget: showValues | sortLen: N`
5. If piggyback fires: Save workbook → Preview → verify sort persists

**If this approach fires in the wrong order** (OAC still closes panel first):
- `idGadgetViewFor_showValues` will still be null
- Log shows `showValues GadgetView not in DOM` + `superClass fallback only`
- OAC registered its "click-outside" handler on document BEFORE ours → need to find another path

**Critical verification needed regardless of above**: Does the current `oViewSettings.setViewConfigJSON()` write in `_persistSortState` persist when the user manually saves (Ctrl+S)?
- Test: Sort a column → **without changing any Properties panel property** → Ctrl+S to save → switch to Preview
- If sort IS preserved: `setViewConfigJSON` writes ARE sufficient — we just need the dirty flag to work
- If sort is NOT preserved: need the DOM commit mechanism

---

## Approaches Still Worth Trying

### Approach 1: Intercept OAC's Save via Keyboard/Save Button DOM Hook

When the user presses Ctrl+S or clicks OAC's Save button, OAC emits DOM events or calls global functions. If we can intercept the save action (via keyboard listener or by finding the Save button and adding a listener), we can:
1. Temporarily trigger a Properties panel property change (or find another way to commit)
2. Then let OAC's save proceed

```javascript
// Register on document in capture phase (before OAC's save handler):
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    // Trigger commit at save time
  }
}, true);
// Also find OAC's Save button by DOM query and add mousedown listener
```

**Key question**: Does OAC's save actually re-read `oViewSettings.getViewConfigJSON()` at save time? If yes, our in-memory writes are already sufficient — we just need to ensure OAC doesn't skip our viz because it thinks nothing changed (dirty flag issue).

### Approach 2: RequireJS Module Access for Workbook Manager

OAC uses RequireJS. The workbook manager module likely has a `markDirty()` or similar. Finding the right module name is the challenge. Try:

```javascript
// Try synchronous require if module is already loaded
var moduleNames = [
  'obitech-visualanalyzer/workbookmanager',
  'obitech-visualanalyzer/workbook',
  'obitech-reportdesign/reportcontroller',
  'obitech-application/workbookcontroller'
];
moduleNames.forEach(function(name) {
  try {
    require([name], function(m) {
      console.log('[AttrPivot] Module', name, ':', typeof m, Object.keys(m).join(', ').substring(0, 200));
    });
  } catch(e) {}
});
```

### Approach 3: Global OAC Object

OAC might expose a global API via `window`:

```javascript
// Explore OAC global objects
var oacGlobals = Object.keys(window).filter(function(k) {
  return /oac|obi|bitech|analytics|workbook|oracle/i.test(k);
});
// Also check: window.bitech, window.obitech, window.oj (JET global)
```

If `window.bitech` or similar exists, it might have a `getWorkbook()` or `save()` method.

### Approach 4: MutationObserver + Pre-commit

When Properties panel IS open (after `_addVizSpecificPropsDialog`), set up a MutationObserver on the panel container. When the panel content is removed (user clicks elsewhere), immediately before the DOM is destroyed... actually MutationObserver fires AFTER the mutation, so this doesn't help for clicking the element (it's already removed).

BUT: could trigger `_persistSortState` one final time if `_hasUserSortOverride` is true at that moment. Problem: the panel element is already detached, so DOM click won't trigger OAC's event handlers.

### Approach 5: JET Component Value API (if Properties panel stays open)

If Approaches 1 or another method can keep the Properties panel in DOM when sort is clicked, the current DOM strategy in `_persistSortState` should work. Strategy A sets `ojBtnSet.value = newVal` which JET should handle as a value change event. Strategy C dispatches `ojoptionchange` event.

The element exists at `idGadgetViewFor_showValues` when the panel is open. All 3 strategies in `_persistSortState` are ready — they just need the element to be in the DOM.

---

## What NOT To Do

- Do NOT reintroduce a "Save Sort" button or toggle
- Do NOT call methods on `oViewSettings` prototype chain blindly — calling `getLastSavedLogicalDataModel()` caused `Failed to render ReportToolbar` errors
- Do NOT remove or change `getStoredViewConfig`/`setStoredViewConfig` merge priority (viz-specific lowest, `getSettings()` highest) — this was fixed specifically to prevent old cached sort from overriding newly committed sort
- Do NOT add localStorage for sort state — localStorage remains only for column widths

---

## Test Verification

**Success**: Sort → (no Properties panel interaction) → Save → Preview → Sort is preserved  
**Current key log** (confirms commit path):
```
[AttrPivot] Sort piggybacked in handlePropChange for gadget: showValues | sortLen: N
```
**Also verify**: No `Failed to render ReportToolbar` errors in console
