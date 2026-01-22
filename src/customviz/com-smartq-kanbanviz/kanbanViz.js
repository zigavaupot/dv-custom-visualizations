define([
  'jquery',
  'obitech-framework/jsx',
  'obitech-report/datavisualization',
  'obitech-reportservices/datamodelshapes',
  'obitech-reportservices/data',
  'obitech-reportservices/events',
  'obitech-reportservices/interactionservice',
  'obitech-appservices/logger',
  'com-smartq-kanbanviz/colorConfig',
  'com-smartq-kanbanviz/nls/root/messages',
  'com-smartq-kanbanviz/nls/sl/messages',
  'css!com-smartq-kanbanviz/kanbanVizstyles'
], function(
  $,
  jsx,
  dataviz,
  datamodelshapes,
  data,
  events,
  interactions,
  logger,
  colorConfig,
  messages_en,
  messages_sl
) {
  "use strict";

  var MODULE_NAME = 'com-smartq-kanbanviz/kanbanViz';
  var _logger = new logger.Logger(MODULE_NAME);

  // ========================================================================
  // LOCALIZATION (NLS) - Language support
  // Translations loaded from external NLS files:
  // - com-smartq-kanbanviz/nls/root/messages.js (English)
  // - com-smartq-kanbanviz/nls/sl/messages.js (Slovenian)
  // ========================================================================
  var messages;

  // Detect browser language and load appropriate messages
  (function() {
    try {
      var userLang = navigator.language || navigator.userLanguage || 'en';
      userLang = userLang.toLowerCase();

      console.log('[KanbanViz] Detected browser language:', userLang);

      // Check for Slovenian (sl, sl-SI, etc.)
      if (userLang.indexOf('sl') === 0) {
        messages = messages_sl;
        console.log('[KanbanViz] Using Slovenian translations from NLS file');
      } else {
        messages = messages_en;
        console.log('[KanbanViz] Using English translations from NLS file (default)');
      }
    } catch (e) {
      console.log('[KanbanViz] Error detecting language, using English:', e);
      messages = messages_en;
    }
  })();
  // ========================================================================

  // ========================================================================
  // COLOR CONFIGURATION - Loaded from external colorConfig.js file
  // ========================================================================
  // To customize colors, edit the colorConfig.js file in this plugin folder
  var KANBAN_COLORS = colorConfig;

  console.log('[KanbanViz] Loaded color configuration:', KANBAN_COLORS);
  // ========================================================================

  /**
   * Global category-to-color mapping (initialized on first render)
   * Maps category values to colors in alphabetical order
   */
  var CATEGORY_COLOR_MAP = null;

  /**
   * Initialize category color mapping based on sorted distinct values
   * Always rebuilds the map to handle changes in the Color attribute
   */
  function initializeCategoryColorMap(tasks) {
    // Always rebuild the map (don't check if already initialized)
    // This ensures colors update when user changes which attribute is in Color section

    // Collect all unique category values
    var uniqueCategories = {};
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].colorKey) {
        uniqueCategories[tasks[i].colorKey] = true;
      }
    }

    // Sort categories alphabetically
    var sortedCategories = Object.keys(uniqueCategories).sort();

    // Map each category to a color in order
    CATEGORY_COLOR_MAP = {};
    var palette = KANBAN_COLORS.categoryPalette;
    for (var i = 0; i < sortedCategories.length; i++) {
      var colorIndex = i % palette.length; // Cycle through palette if more categories than colors
      CATEGORY_COLOR_MAP[sortedCategories[i]] = palette[colorIndex];
    }

    console.log("[KanbanViz] Category color mapping:", CATEGORY_COLOR_MAP);
  }

  /**
   * Get color for category stripe (ordered by alphabetical sorting)
   */
  function getColorForCategory(categoryValue) {
    if (!categoryValue || categoryValue === "") return null;
    if (CATEGORY_COLOR_MAP === null) return null; // Not initialized yet

    return CATEGORY_COLOR_MAP[categoryValue] || null;
  }

  // ========================================================================
  // GRAMMAR CONFIGURATION - Specify how many columns in each grammar slot
  // ========================================================================
  // IMPORTANT: Set these values to match your actual grammar configuration!
  // These numbers tell the visualization where each type of column is located.
  //
  // Example: If you have 2 columns in Rows (Task), 1 in Color, and 3 in Tooltip:
  //   GRAMMAR_CONFIG = { rowCount: 2, colorCount: 1, tooltipCount: 3 };
  //
  var GRAMMAR_CONFIG = {
    rowCount: 4,      // Number of columns in Rows (Task) grammar - MAX 4
    colorCount: 1,    // Number of columns in Color grammar - MAX 1
    tooltipCount: 0   // Number of columns in Tooltip grammar (excluding condition flags)
  };
  // ========================================================================

  /**
   * KanbanViz constructor
   */
  function KanbanViz(sID, sDisplayName, sOrigin, sVersion) {
    KanbanViz.baseConstructor.call(this, sID, sDisplayName, sOrigin, sVersion);
    
    // Track selected cards
    this._selectedCards = [];
  }
  jsx.extend(KanbanViz, dataviz.DataVisualization);

  /**
   * Decide which lane a task belongs to from its % complete
   * pctNum is expected 0..1 (e.g. 0.25 = 25%)
   * Returns: lane value from messages (e.g. "0%", "10%", etc.) - used for logic
   */
  function getLaneName(pctNum) {
    if (pctNum == null || isNaN(pctNum)) return messages.LANE_0_PERCENT;
    if (pctNum < 0.10) return messages.LANE_0_PERCENT;
    if (pctNum < 0.25) return messages.LANE_10_PERCENT;
    if (pctNum < 0.50) return messages.LANE_25_PERCENT;
    if (pctNum < 0.75) return messages.LANE_50_PERCENT;
    if (pctNum < 0.95) return messages.LANE_75_PERCENT;
    if (pctNum < 1.00) return messages.LANE_95_PERCENT;
    return messages.LANE_100_PERCENT;
  }

  /**
   * Get the display header text for a lane value
   * laneValue is the lane identifier (e.g. "0%", "10%", etc.)
   * Returns: header text from messages (e.g. "Not Started", "In Progress", etc.)
   */
  function getLaneHeader(laneValue) {
    switch(laneValue) {
      case messages.LANE_0_PERCENT:   return messages.LANE_0_PERCENT_HEADER;
      case messages.LANE_10_PERCENT:  return messages.LANE_10_PERCENT_HEADER;
      case messages.LANE_25_PERCENT:  return messages.LANE_25_PERCENT_HEADER;
      case messages.LANE_50_PERCENT:  return messages.LANE_50_PERCENT_HEADER;
      case messages.LANE_75_PERCENT:  return messages.LANE_75_PERCENT_HEADER;
      case messages.LANE_95_PERCENT:  return messages.LANE_95_PERCENT_HEADER;
      case messages.LANE_100_PERCENT: return messages.LANE_100_PERCENT_HEADER;
      default: return laneValue; // Fallback to lane value if no header defined
    }
  }

  /**
   * Escape text for safe HTML
   */
  function escapeHtml(str){
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  /**
   * Map color names to CSS hex values, or return hex value if already provided
   */
  function colorNameToHex(colorValue) {
    // If it's already a hex value (starts with #), return as-is
    if (colorValue && String(colorValue).trim().startsWith('#')) {
      return String(colorValue).trim();
    }

    // Otherwise try to map from color name
    var colorMap = {
      "light red": "#ffe5e5",
      "red": "#ff0000",
      "dark red": "#8b0000",
      "light yellow": "#fff9e5",
      "yellow": "#ffff00",
      "orange": "#ffa500",
      "light green": "#e5ffe5",
      "green": "#00ff00",
      "dark green": "#006400",
      "light blue": "#e5f5ff",
      "blue": "#0000ff",
      "dark blue": "#00008b",
      "light purple": "#f5e5ff",
      "purple": "#800080",
      "pink": "#ffc0cb",
      "gray": "#808080",
      "dark yellow": "#e0d093"
    };

    if (!colorValue) return "#ffffff";

    var key = String(colorValue).trim().toLowerCase();
    return colorMap[key] || colorValue; // Return hex or original if not found
  }

  // --- Tooltip helpers ---
  KanbanViz.prototype._ensureTooltip = function(containerEl) {
    if (this._tooltipEl) return this._tooltipEl;
    var tt = document.createElement('div');
    tt.className = 'kanban-tooltip';
    (containerEl || this.getContainerElem()).appendChild(tt);
    this._tooltipEl = tt;
    return tt;
  };

  KanbanViz.prototype._showTooltip = function(html, x, y) {
    var tt = this._ensureTooltip();
    tt.innerHTML = html;
    tt.style.display = 'block';
    tt.classList.add('visible');
    this._moveTooltip(x, y);
  };

  KanbanViz.prototype._moveTooltip = function(x, y) {
    var tt = this._tooltipEl;
    if (!tt) return;
    var pad = 12;
    
    var left = x + pad;
    var top = y + pad;
    
    var ttWidth = tt.offsetWidth;
    var ttHeight = tt.offsetHeight;
    
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    
    if (left + ttWidth > viewportWidth - 10) {
      left = x - ttWidth - pad;
      if (left < 10) left = 10;
    }
    
    if (top + ttHeight > viewportHeight - 10) {
      top = y - ttHeight - pad;
      if (top < 10) top = 10;
    }
    
    tt.style.left = left + 'px';
    tt.style.top = top + 'px';
  };

  KanbanViz.prototype._hideTooltip = function() {
    if (this._tooltipEl) {
      this._tooltipEl.classList.remove('visible');
      this._tooltipEl.style.display = 'none';
    }
  };

  /**
   * Get color from Color Grammar value using alphabetically-sorted mapping
   * (uses the CATEGORY_COLOR_MAP initialized during task extraction)
   */
  function colorFromGrammarValue(key) {
    if (key === null || key === undefined || key === "") return null;
    return getColorForCategory(String(key));
  }

  /**
   * Default lane-based colors
   */
  function laneFallbackColor(lane) {
    switch (lane) {
      case messages.LANE_0_PERCENT:    return "#d32f2f";
      case messages.LANE_10_PERCENT:   return "#e91e63";
      case messages.LANE_25_PERCENT:   return "#1976d2";
      case messages.LANE_50_PERCENT:   return "#fbc02d";
      case messages.LANE_75_PERCENT:   return "#f57c00";
      case messages.LANE_95_PERCENT:   return "#8e24aa";
      case messages.LANE_100_PERCENT:  return "#388e3c";
      default:      return "#9e9e9e";
    }
  }

  /**
   * Pick a colored stripe for a card
   */
  function getBorderColor(task) {
    if (task && task.colorKey) {
      var c = colorFromGrammarValue(task.colorKey);
      if (c) return c;
    }
    return laneFallbackColor(task && task.lane);
  }

  /**
   * Compute responsive lane widths
   */
  function applyResponsiveLaneWidths(boardEl, opts) {
    if (!boardEl) return;

    var lanes = boardEl.querySelectorAll('.kanban-column');
    var n = lanes.length;
    if (n === 0) return;

    opts = opts || {};
    var gap = (typeof opts.gap === 'number') ? opts.gap : 8;
    var minLane = (typeof opts.minLane === 'number') ? opts.minLane : 140;

    var W = boardEl.clientWidth;
    var cs = window.getComputedStyle(boardEl);
    var padL = parseFloat(cs.paddingLeft) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    var usableW = Math.max(0, W - padL - padR);
    var totalGaps = (n - 1) * gap;

    // Calculate lane width to fill 100% of available space
    var lane = Math.floor((usableW - totalGaps) / n);

    // Only enforce minimum width, let lanes expand to fill space
    if (lane < minLane) {
      lane = minLane;
    }

    var appliedWidth = Math.max(minLane, lane);

    for (var i = 0; i < lanes.length; i++) {
      lanes[i].style.width = appliedWidth + 'px';
      lanes[i].style.flex = '0 0 auto';
      lanes[i].style.boxSizing = 'border-box';
    }

    var finalTotal = (appliedWidth * n) + totalGaps;
    boardEl.style.overflowX = (finalTotal > usableW) ? 'auto' : 'hidden';
    boardEl.style.overflowY = 'auto';
  }

  /**
   * SELECTION HANDLING: Fire selection event to enable "Use as filter"
   */
  KanbanViz.prototype._fireSelectionEvent = function(task, isCtrlKey) {
    try {
      if (!task || typeof task.rowIndex !== "number") {
        _logger.warn("[KanbanViz] _fireSelectionEvent: invalid task", task);
        return;
      }

      // Marking service is the standard way DV supports Use as Filter
      if (typeof this.getMarkingService !== "function") {
        _logger.warn("[KanbanViz] _fireSelectionEvent: getMarkingService() not available");
        return;
      }

      var oDataLayout = this._currentDataLayout;
      if (!oDataLayout) {
        _logger.warn("[KanbanViz] _fireSelectionEvent: no current data layout");
        return;
      }

      var oMarkingService = this.getMarkingService();
      if (!oMarkingService) {
        _logger.warn("[KanbanViz] _fireSelectionEvent: marking service not available");
        return;
      }

      // Ensure local selection array exists
      if (!Array.isArray(this._selectedCards)) {
        this._selectedCards = [];
      }

      var rowIdx = task.rowIndex;

      if (!isCtrlKey) {
        this._selectedCards = [rowIdx];
      } else {
        var existingIdx = this._selectedCards.indexOf(rowIdx);
        if (existingIdx === -1) {
          this._selectedCards.push(rowIdx);
        } else {
          this._selectedCards.splice(existingIdx, 1);
        }
      }

      // Clear previous marks
      try {
        if (typeof oMarkingService.clearMarksForDataLayout === "function") {
          oMarkingService.clearMarksForDataLayout(oDataLayout);
        }
      } catch (eClear) {
        _logger.warn("[KanbanViz] _fireSelectionEvent: clearMarksForDataLayout failed", eClear);
      }

      // Apply marks on ROW axis
      try {
        if (typeof oMarkingService.setMark === "function") {
          for (var i = 0; i < this._selectedCards.length; i++) {
            var selRow = this._selectedCards[i];
            oMarkingService.setMark(
              oDataLayout,
              datamodelshapes.Physical.ROW,
              0,
              selRow
            );
          }
        }

        try {
          if (typeof this._publishMarkEvent === "function") {
            this._publishMarkEvent(oDataLayout);
          }
        } catch (ePub) {
          _logger.warn("[KanbanViz] _fireSelectionEvent: _publishMarkEvent failed", ePub);
        }
      } catch (eMark) {
        _logger.error("[KanbanViz] _fireSelectionEvent: setMark failed", eMark);
      }

      if (typeof this._updateCardSelectionVisuals === "function") {
        this._updateCardSelectionVisuals();
      }

      _logger.info("[KanbanViz] Selection updated for " + this._selectedCards.length + " card(s)");

    } catch (eOuter) {
      _logger.error("KanbanViz._fireSelectionEvent: unexpected error", eOuter);
    }
  };

  /**
   * Clear selection
   */
  KanbanViz.prototype._clearSelection = function() {
    this._selectedCards = [];

    try {
      var oDataLayout = this._currentDataLayout;
      var oMarkingService = (typeof this.getMarkingService === "function") ? this.getMarkingService() : null;
      if (oDataLayout && oMarkingService && typeof oMarkingService.clearMarksForDataLayout === "function") {
        oMarkingService.clearMarksForDataLayout(oDataLayout);
        try {
          if (typeof this._publishMarkEvent === "function") {
            this._publishMarkEvent(oDataLayout);
          }
        } catch (ePubClear) {}
      }
    } catch (e) {}

    try {
      if (typeof this._updateCardSelectionVisuals === "function") {
        this._updateCardSelectionVisuals();
      }
    } catch (e2) {}
  };

  /**
   * Publish a marking event
   */
  KanbanViz.prototype._publishMarkEvent = function(oDataLayout, eMarkContext) {
    try {
      if (!interactions || !interactions.MarkingEvent) {
        return;
      }
      var markingEvent = new interactions.MarkingEvent(
        this.getID(),
        this.getViewName(),
        oDataLayout,
        null,
        eMarkContext || null
      );
      var eventRouter = this.getEventRouter && this.getEventRouter();
      if (eventRouter) {
        eventRouter.publish(markingEvent);
      }
    } catch (e) {}
  };

  /**
   * Update card visual selection state
   */
  KanbanViz.prototype._updateCardSelectionVisuals = function() {
    var elContainer = this.getContainerElem();
    if (!elContainer) return;
    
    var allCards = elContainer.querySelectorAll('.kanban-card');
    for (var i = 0; i < allCards.length; i++) {
      var card = allCards[i];
      var rowIndex = parseInt(card.getAttribute('data-row-index'), 10);
      
      if (this._selectedCards.indexOf(rowIndex) >= 0) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    }
  };

  /**
   * Build array of "task" objects from the DV data layout.
   *
   * DATA LAYOUT STRUCTURE (Physical.ROW layers):
   *
   * - Layer 0: Task title (from Rows - 1st column)
   * - Layer 1: Subtitle line 1 (from Rows - 2nd column) - displayed above title (top-left)
   * - Layer 2: Subtitle line 2 (from Rows - 3rd column) - displayed above title (top-right)
   * - Layer 3: Subtitle line 3 (from Rows - 4th column) - displayed at bottom of card
   * - Layer 4: Color category (from Color grammar placeholder) - for stripe color
   * - Layer 5: Condition flag RED (from Tooltips - 1st column) - Y/Yes/D/Da/1/TRUE -> light red background
   * - Layer 6: Condition flag YELLOW (from Tooltips - 2nd column) - Y/Yes/D/Da/1/TRUE -> light yellow background
   * - Layer 7+: Additional Tooltip columns - displayed in tooltip
   *
   * Physical.DATA: Completion % measure
   *
   * Priority: RED > YELLOW (if both conditions are true, RED wins)
   */
  KanbanViz.prototype._extractTasks = function(oDataLayout, dateFormat) {
    var tasks = [];
    try {
      if (!oDataLayout) return tasks;

      // Default date format if not provided (using OAC convention)
      dateFormat = dateFormat || "yyyy-MM-dd";

      var oDataModel = this.getRootDataModel();
      if (!oDataModel) return tasks;

      // Get all columns on the ROW edge
      var rowCols = [];
      try {
        rowCols = oDataModel.getColumnIDsIn(datamodelshapes.Physical.ROW) || [];
      } catch (e) {
        rowCols = [];
      }

      // Use manual grammar configuration from GRAMMAR_CONFIG
      var rowRoleCount = GRAMMAR_CONFIG.rowCount || 0;
      var colorRoleCount = GRAMMAR_CONFIG.colorCount || 0;
      var tooltipRoleCount = GRAMMAR_CONFIG.tooltipCount || 0;

      console.log("[KanbanViz] Using GRAMMAR_CONFIG - ROW:", rowRoleCount, "COLOR:", colorRoleCount, "TOOLTIP:", tooltipRoleCount);

      // Helper to get display name for a column
      function resolveDisplayName(colId) {
        if (!colId) return null;
        try {
          var cObj = oDataModel.getColumnByID(colId);
          if (cObj) {
            // Try getLabel() first - this is the user-friendly display name
            if (cObj.getLabel && cObj.getLabel()) {
              return cObj.getLabel();
            }
            // Fallback to other methods
            if (cObj.getDisplayName && cObj.getDisplayName()) {
              return cObj.getDisplayName();
            } else if (cObj.getCaption && cObj.getCaption()) {
              return cObj.getCaption();
            } else if (cObj.getName && cObj.getName()) {
              return cObj.getName();
            }
          }
        } catch (e) {
          console.log("[KanbanViz] Error resolving display name for colId:", colId, e);
        }
        return (typeof colId === "string") ? colId : null;
      }

      // Helper to get edge label property for a column
      function getEdgeLabelProperty(colId, propertyId) {
        if (!colId) return null;
        try {
          var cObj = oDataModel.getColumnByID(colId);
          if (cObj && cObj.getEdgeLabelProperty) {
            return cObj.getEdgeLabelProperty(propertyId);
          }
        } catch (e) {
          // Edge labels not supported in this Oracle Analytics version
        }
        return null;
      }

      // Helper to get the logical role of a column
      function getLogicalRole(colId) {
        if (!colId) return null;
        try {
          var cObj = oDataModel.getColumnByID(colId);
          if (cObj && cObj.getLogicalRole) {
            return cObj.getLogicalRole();
          }
        } catch (e) {}
        return null;
      }

      // Separate columns based on grammar slot counts
      // Oracle Analytics places columns in Physical.ROW in this order:
      // 1. ROW grammar columns (0 to rowRoleCount-1)
      // 2. COLOR grammar columns (rowRoleCount to rowRoleCount+colorRoleCount-1)
      // 3. TOOLTIP grammar columns (remaining)
      var rowRoleColumns = [];
      var colorRoleColumns = [];
      var tooltipRoleColumns = [];

      console.log("[KanbanViz] Total columns in Physical.ROW:", rowCols.length);

      for (var i = 0; i < rowCols.length; i++) {
        var colId = rowCols[i];
        var displayName = resolveDisplayName(colId);

        if (i < rowRoleCount) {
          // First N columns are from ROW grammar
          rowRoleColumns.push(colId);
          console.log("[KanbanViz] Column", i, ":", displayName, "-> ROW grammar");
        } else if (i < rowRoleCount + colorRoleCount) {
          // Next M columns are from COLOR grammar
          colorRoleColumns.push(colId);
          console.log("[KanbanViz] Column", i, ":", displayName, "-> COLOR grammar");
        } else {
          // Remaining columns are from TOOLTIP grammar
          tooltipRoleColumns.push(colId);
          console.log("[KanbanViz] Column", i, ":", displayName, "-> TOOLTIP grammar");
        }
      }

      console.log("[KanbanViz] Separated - ROW:", rowRoleColumns.length, "COLOR:", colorRoleColumns.length, "TOOLTIP:", tooltipRoleColumns.length);

      // Column assignments based on FIXED layer positions (not array order)
      // Rows grammar: 4 columns (layers 0-3)
      var taskColId = rowRoleColumns[0] || null;           // Layer 0: Task name (Rows - 1st)
      var subtitle1ColId = rowRoleColumns[1] || null;      // Layer 1: Subtitle line 1 (Rows - 2nd)
      var subtitle2ColId = rowRoleColumns[2] || null;      // Layer 2: Subtitle line 2 (Rows - 3rd)
      var subtitle3ColId = rowRoleColumns[3] || null;      // Layer 3: Subtitle line 3 (Rows - 4th) - bottom of card
      var colorColId = colorRoleColumns[0] || null;        // Layer 4: Color category (Color grammar)

      // Detect RED and YELLOW columns based on edge labels within TOOLTIP role columns
      var redConditionIndex = -1;
      var yellowConditionIndex = -1;

      // Check tooltip columns for color roles
      for (var i = 0; i < tooltipRoleColumns.length; i++) {
        var colorRole = getEdgeLabelProperty(tooltipRoleColumns[i], 'colorRole');

        if (colorRole === 'red' && redConditionIndex === -1) {
          redConditionIndex = i;
        } else if (colorRole === 'yellow' && yellowConditionIndex === -1) {
          yellowConditionIndex = i;
        }
      }

      // Fall back to default positions within tooltip columns if no edge labels set
      if (redConditionIndex === -1) redConditionIndex = 0;    // Default: 1st tooltip column
      if (yellowConditionIndex === -1) yellowConditionIndex = 1;  // Default: 2nd tooltip column

      var conditionColId = tooltipRoleColumns[redConditionIndex] || null;
      var conditionColId2 = tooltipRoleColumns[yellowConditionIndex] || null;

      // Calculate actual Physical.ROW layer numbers for condition columns
      // Structure: ROW columns + COLOR columns + TOOLTIP columns
      // RED is first tooltip column, YELLOW is second tooltip column
      var redConditionLayer = rowRoleCount + colorRoleCount + redConditionIndex;
      var yellowConditionLayer = rowRoleCount + colorRoleCount + yellowConditionIndex;

      console.log("[KanbanViz] Condition layers - RED:", redConditionLayer, "YELLOW:", yellowConditionLayer);

      var taskDisplayName = resolveDisplayName(taskColId) || "Task";
      var subtitle1DisplayName = resolveDisplayName(subtitle1ColId) || "";
      var subtitle2DisplayName = resolveDisplayName(subtitle2ColId) || "";
      var subtitle3DisplayName = resolveDisplayName(subtitle3ColId) || "";
      var colorDisplayName = resolveDisplayName(colorColId) || "Color";
      var conditionDisplayName = resolveDisplayName(conditionColId) || "Condition";
      var conditionDisplayName2 = resolveDisplayName(conditionColId2) || "Condition 2";

      // Get measure column info
      var measureDisplayName = "Completion";
      try {
        var measureCols = oDataModel.getColumnIDsIn(datamodelshapes.Physical.DATA) || [];
        if (measureCols.length > 0) {
          var mName = resolveDisplayName(measureCols[0]);
          if (mName) measureDisplayName = mName;
        }
      } catch (e) {}

      // Determine where additional tooltip columns start
      // Structure: ROW columns + COLOR columns + 2 condition flag columns (RED+YELLOW) + additional tooltip columns
      var firstTooltipLayer = rowRoleCount + colorRoleCount;  // First tooltip column (for RED condition)
      var tooltipStartLayer = firstTooltipLayer + 2;           // Additional tooltip columns start after RED (layer 5) and YELLOW (layer 6)

      console.log("[KanbanViz] Tooltip layers - First:", firstTooltipLayer, "Additional start at:", tooltipStartLayer);

      // Get row count
      var rowCount = 0;
      try {
        rowCount = oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW) || 0;
      } catch (e) {
        rowCount = 0;
      }

      console.log('[KanbanViz] Row count:', rowCount);

      // Iterate through all rows
      for (var r = 0; r < Math.max(rowCount, 1); r++) {

        // Extract values using the separated column arrays
        // This allows us to read columns based on their logical role, not physical position

        // Task name (1st ROW column)
        var taskName = null;
        try {
          if (taskColId) {
            var taskLayerIdx = rowCols.indexOf(taskColId);
            if (taskLayerIdx >= 0) {
              taskName = oDataLayout.getValue(datamodelshapes.Physical.ROW, taskLayerIdx, r, false);
            }
          }
        } catch (e) {
          taskName = null;
        }

        // Subtitle line 1 (2nd ROW column)
        var subtitle1 = null;
        try {
          if (subtitle1ColId) {
            var sub1LayerIdx = rowCols.indexOf(subtitle1ColId);
            if (sub1LayerIdx >= 0) {
              subtitle1 = oDataLayout.getValue(datamodelshapes.Physical.ROW, sub1LayerIdx, r, false);
            }
          }
        } catch (e) {
          subtitle1 = null;
        }

        // Subtitle line 2 (3rd ROW column) - with date formatting
        var subtitle2 = null;
        try {
          if (subtitle2ColId) {
            var sub2LayerIdx = rowCols.indexOf(subtitle2ColId);
            if (sub2LayerIdx >= 0) {
              subtitle2 = oDataLayout.getValue(datamodelshapes.Physical.ROW, sub2LayerIdx, r, false);
              // Apply date formatting if subtitle2 looks like a date
              if (subtitle2 !== null && subtitle2 !== undefined && subtitle2 !== "") {
                subtitle2 = formatDate(String(subtitle2), dateFormat);
              }
            }
          }
        } catch (e) {
          subtitle2 = null;
        }

        // Subtitle line 3 (4th ROW column) - displayed at bottom of card
        var subtitle3 = null;
        try {
          if (subtitle3ColId) {
            var sub3LayerIdx = rowCols.indexOf(subtitle3ColId);
            if (sub3LayerIdx >= 0) {
              subtitle3 = oDataLayout.getValue(datamodelshapes.Physical.ROW, sub3LayerIdx, r, false);
            }
          }
        } catch (e) {
          subtitle3 = null;
        }

        // Color category (COLOR column)
        var colorVal = null;
        try {
          if (colorColId) {
            var colorLayerIdx = rowCols.indexOf(colorColId);
            if (colorLayerIdx >= 0) {
              colorVal = oDataLayout.getValue(datamodelshapes.Physical.ROW, colorLayerIdx, r, false);
            }
          }
        } catch (e) {
          colorVal = null;
        }

        // RED condition flag (from column with colorRole='red' edge label)
        // Check if value indicates "yes" (Y, Yes, D, Da, 1, TRUE, true) for RED
        var conditionFlagRed = false;
        var conditionValueRed = null;
        try {
          var redVal = oDataLayout.getValue(datamodelshapes.Physical.ROW, redConditionLayer, r, false);
          if (redVal !== null && redVal !== undefined && String(redVal).trim() !== "") {
            conditionValueRed = String(redVal).trim();
            var redValLower = conditionValueRed.toLowerCase();
            // Check if value is a positive indicator (Y/Yes/D/Da/1/TRUE)
            if (redValLower === 'y' || redValLower === 'yes' ||
                redValLower === 'd' || redValLower === 'da' ||
                redValLower === '1' || redValLower === 'true') {
              conditionFlagRed = true;
            }
          }
        } catch (e) {
          conditionFlagRed = false;
          conditionValueRed = null;
        }

        // YELLOW condition flag (from column with colorRole='yellow' edge label)
        // Check if value indicates "yes" (Y, Yes, D, Da, 1, TRUE, true) for YELLOW
        var conditionFlagYellow = false;
        var conditionValueYellow = null;
        try {
          var yellowVal = oDataLayout.getValue(datamodelshapes.Physical.ROW, yellowConditionLayer, r, false);
          if (yellowVal !== null && yellowVal !== undefined && String(yellowVal).trim() !== "") {
            conditionValueYellow = String(yellowVal).trim();
            var yellowValLower = conditionValueYellow.toLowerCase();
            // Check if value is a positive indicator (Y/Yes/D/Da/1/TRUE)
            if (yellowValLower === 'y' || yellowValLower === 'yes' ||
                yellowValLower === 'd' || yellowValLower === 'da' ||
                yellowValLower === '1' || yellowValLower === 'true') {
              conditionFlagYellow = true;
            }
          }
        } catch (e) {
          conditionFlagYellow = false;
          conditionValueYellow = null;
        }

        // Measure value (completion %)
        var pctNum = null;
        try {
          var pctValRaw = oDataLayout.getValue(datamodelshapes.Physical.DATA, r, 0);
          if (pctValRaw !== undefined && pctValRaw !== null && pctValRaw !== "") {
            pctNum = parseFloat(pctValRaw);
            if (isNaN(pctNum)) pctNum = null;
          }
        } catch (e) {}

        // Layers 3+: Additional tooltip columns
        var tooltipKVPairs = [];
        for (var layerIdx = tooltipStartLayer; layerIdx < rowCols.length; layerIdx++) {
          try {
            var tVal = oDataLayout.getValue(datamodelshapes.Physical.ROW, layerIdx, r, false);
            if (tVal !== null && tVal !== undefined && String(tVal).trim() !== "") {
              var tName = resolveDisplayName(rowCols[layerIdx]) || ("Attr " + (layerIdx - tooltipStartLayer + 1));
              tooltipKVPairs.push({ k: tName, v: String(tVal) });
            }
          } catch (e) {}
        }

        // Build tooltip HTML
        function formatPct(pctNum) {
          return (pctNum == null || isNaN(pctNum)) ? "" : ((Math.round(pctNum * 10000) / 100) + "%");
        }

        var tooltipLines = [];

        // Subtitle 1 (if present)
        if (subtitle1 != null && String(subtitle1) !== "" && subtitle1DisplayName) {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(subtitle1DisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(subtitle1) + "</span></span>");
        }

        // Subtitle 2 (if present)
        if (subtitle2 != null && String(subtitle2) !== "" && subtitle2DisplayName) {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(subtitle2DisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(subtitle2) + "</span></span>");
        }

        // Subtitle 3 (if present)
        if (subtitle3 != null && String(subtitle3) !== "" && subtitle3DisplayName) {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(subtitle3DisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(subtitle3) + "</span></span>");
        }

        // Task
        if (taskName != null && String(taskName) !== "") {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(taskDisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(taskName) + "</span></span>");
        }

        // Completion
        tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(measureDisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(formatPct(pctNum)) + "</span></span>");

        // Color category
        if (colorVal != null && String(colorVal) !== "") {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(colorDisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(String(colorVal)) + "</span></span>");
        }

        // RED condition flag (show in tooltip if value exists)
        if (conditionValueRed != null && String(conditionValueRed) !== "") {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(conditionDisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(String(conditionValueRed)) + "</span></span>");
        }

        // YELLOW condition flag (show in tooltip if value exists)
        if (conditionValueYellow != null && String(conditionValueYellow) !== "") {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(conditionDisplayName2) + ":</span> <span class='kt-v'>" + escapeHtml(String(conditionValueYellow)) + "</span></span>");
        }

        // Additional tooltip fields
        for (var ti = 0; ti < tooltipKVPairs.length; ti++) {
          var kv = tooltipKVPairs[ti];
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(kv.k) + ":</span> <span class='kt-v'>" + escapeHtml(kv.v) + "</span></span>");
        }

        var tooltipHtml = tooltipLines.join("");

        tasks.push({
          id: r,
          rowIndex: r,
          title: (taskName != null ? String(taskName) : "(no title)"),
          subtitle1: (subtitle1 != null ? String(subtitle1) : ""),
          subtitle2: (subtitle2 != null ? String(subtitle2) : ""),
          subtitle3: (subtitle3 != null ? String(subtitle3) : ""),
          pct: pctNum,
          pctComplete: pctNum,
          category: (colorVal != null ? String(colorVal) : ""),
          colorKey: (colorVal != null ? String(colorVal) : ""),
          lane: getLaneName(pctNum),
          measureLabel: measureDisplayName,
          conditionFlagRed: conditionFlagRed,           // RED condition flag (boolean)
          conditionFlagYellow: conditionFlagYellow,     // YELLOW condition flag (boolean)
          tooltipHtml: tooltipHtml
        });
      }

      // Summary (for header display)
      var flaggedRedCount = tasks.filter(function(t) { return t.conditionFlagRed; }).length;
      var flaggedYellowCount = tasks.filter(function(t) { return t.conditionFlagYellow && !t.conditionFlagRed; }).length;
      
    } catch (err) {
      console.error('[KanbanViz] _extractTasks failed:', err);
      try { _logger.error("KanbanViz._extractTasks failed", err); } catch(ignore){}
    }

    // Initialize category color mapping with alphabetically-sorted order
    initializeCategoryColorMap(tasks);

    return tasks;
  };

  /**
   * Bucket tasks by lane
   */
  function groupTasksByLane(tasks) {
    var lanes = {};
    lanes[messages.LANE_0_PERCENT] = [];
    lanes[messages.LANE_10_PERCENT] = [];
    lanes[messages.LANE_25_PERCENT] = [];
    lanes[messages.LANE_50_PERCENT] = [];
    lanes[messages.LANE_75_PERCENT] = [];
    lanes[messages.LANE_95_PERCENT] = [];
    lanes[messages.LANE_100_PERCENT] = [];

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (!lanes[t.lane]) lanes[t.lane] = [];
      lanes[t.lane].push(t);
    }
    return lanes;
  }

  /**
   * Render a single task card.
   */
  function renderCard(task, colors) {
    var pctDisplay = task.pct == null || isNaN(task.pct)
      ? (task.lane === messages.LANE_100_PERCENT ? messages.LANE_100_PERCENT : "-")
      : (Math.round(task.pct * 10000) / 100) + "%";

    var metricLabel = task.measureLabel || "Completion";
    var stripeColor = getBorderColor(task);

    // Use colors from KANBAN_COLORS if not provided
    colors = colors || {
      redColorCSS: KANBAN_COLORS.redBackground,
      redFlagBorder: KANBAN_COLORS.redBorder,
      yellowColorCSS: KANBAN_COLORS.yellowBackground,
      yellowFlagBorder: KANBAN_COLORS.yellowBorder
    };

    // Conditional styling for flagged cards
    // Priority: RED > YELLOW > Normal
    var extraClass = "";
    var styleAttr = "";

    if (task.conditionFlagRed) {
      // RED - highest priority
      extraClass = " kanban-card-flagged";
      var redBg = colors.redColorCSS || "#ffe5e5";
      var redBorder = colors.redFlagBorder || "#e09393";
      styleAttr = " style='background-color:" + redBg + ";border-color:" + redBorder + ";'";
    } else if (task.conditionFlagYellow) {
      // YELLOW - second priority
      extraClass = " kanban-card-flagged-yellow";
      var yellowBg = colors.yellowColorCSS || "#fff9e5";
      var yellowBorder = colors.yellowFlagBorder || "#e0d093";
      styleAttr = " style='background-color:" + yellowBg + ";border-color:" + yellowBorder + ";'";
    }

    return (
      "<div class='kanban-card" + extraClass + "'" + styleAttr + " data-row-index='" + task.rowIndex + "'>" +
        "<div class='kanban-card-stripe' style='background-color:" + stripeColor + ";'></div>" +
        "<div class='kanban-card-content'>" +
          "<div class='kanban-card-left'>" +
            // Subtitle row with table layout - 3 columns: left (ID), center (%), right (Date)
            "<table class='kanban-card-subtitle-table'><tr>" +
              (task.subtitle1
                ? "<td class='kanban-card-subtitle kanban-card-subtitle-left'>" + escapeHtml(task.subtitle1) + "</td>"
                : "<td></td>"
              ) +
              // Center column for percentage
              "<td class='kanban-card-subtitle kanban-card-subtitle-center'>(" + escapeHtml(pctDisplay) + ")</td>" +
              (task.subtitle2
                ? "<td class='kanban-card-subtitle kanban-card-subtitle-right'>" + escapeHtml(task.subtitle2) + "</td>"
                : "<td></td>"
              ) +
            "</tr></table>" +
            // Main task title
            "<div class='kanban-card-title'>" +
              escapeHtml(task.title) +
            "</div>" +
          "</div>" +
          // Center position (below title) - subtitle3 (4th ROW column)
          (task.subtitle3
            ? "<div class='kanban-card-right'>" +
                escapeHtml(task.subtitle3) +
              "</div>"
            : ""
          ) +
          // Bottom row - category (COLOR column)
          (task.category
            ? "<div class='kanban-card-bottom'>" +
                escapeHtml(task.category) +
              "</div>"
            : ""
          ) +
        "</div>" +
      "</div>"
    );
  }

  /**
   * Render a lane (column).
   * laneName is the lane value (e.g. "0%", "10%") used for logic
   */
  function renderLane(laneName, taskList, colors) {
    var count = taskList ? taskList.length : 0;
    var headerText = getLaneHeader(laneName); // Get display text for header
    var headerLabel = escapeHtml(headerText) + " (" + messages.TASKS_LABEL + ": " + count + ")";
    return (
      "<div class='kanban-column'>" +
        "<div class='kanban-column-header'>" +
           headerLabel +
        "</div>" +
        "<div class='kanban-card-list'>" +
           taskList.map(function(task) { return renderCard(task, colors); }).join("") +
        "</div>" +
      "</div>"
    );
  }

  /**
   * Tooltip and selection event handler (delegated)
   */
  function attachEventHandlers(rootElem, selfRef) {
    // Tooltip handlers
    rootElem.addEventListener('mousemove', function(e) {
      var card = e.target.closest && e.target.closest('.kanban-card');
      if (!card) { 
        selfRef._hideTooltip(); 
        return; 
      }
      
      var rowIndex = parseInt(card.getAttribute('data-row-index'), 10);
      if (isNaN(rowIndex)) { 
        selfRef._hideTooltip(); 
        return; 
      }
      
      var task = null;
      if (selfRef._tasks) {
        for (var i = 0; i < selfRef._tasks.length; i++) {
          if (selfRef._tasks[i].rowIndex === rowIndex) {
            task = selfRef._tasks[i];
            break;
          }
        }
      }
      
      if (!task || !task.tooltipHtml) { 
        selfRef._hideTooltip(); 
        return; 
      }
      
      selfRef._showTooltip(task.tooltipHtml, e.clientX, e.clientY);
    });

    rootElem.addEventListener('mouseleave', function() {
      selfRef._hideTooltip();
    });

    rootElem.addEventListener('mouseout', function(e) {
      var to = e.relatedTarget;
      if (!to || !rootElem.contains(to)) {
        selfRef._hideTooltip();
      }
    });

    rootElem.addEventListener('scroll', function() {
      selfRef._hideTooltip();
    }, { passive: true });

    // SELECTION EVENT HANDLERS
    rootElem.addEventListener('click', function(e) {
      var card = e.target.closest && e.target.closest('.kanban-card');
      if (!card) {
        if (!e.target.closest('.kanban-card')) {
          selfRef._clearSelection();
          selfRef._updateCardSelectionVisuals();
        }
        return;
      }
      
      var rowIndex = parseInt(card.getAttribute('data-row-index'), 10);
      if (isNaN(rowIndex)) return;
      
      var task = null;
      if (selfRef._tasks) {
        for (var i = 0; i < selfRef._tasks.length; i++) {
          if (selfRef._tasks[i].rowIndex === rowIndex) {
            task = selfRef._tasks[i];
            break;
          }
        }
      }
      
      if (!task) return;

      console.log("[KanbanViz] Card clicked - task:", task.title, "conditionFlag:", task.conditionFlag);
      
      var isCtrlKey = e.ctrlKey || e.metaKey;
      selfRef._fireSelectionEvent(task, isCtrlKey);
      selfRef._updateCardSelectionVisuals();
    });
  }

  /**
   * Render the whole Kanban board into the viz container
   */
  KanbanViz.prototype.render = function(oTransientRenderingContext) {
    try {
      var elContainer = this.getContainerElem();
      
      elContainer.style.display = "flex";
      elContainer.style.flexDirection = "column";
      elContainer.style.justifyContent = "center";
      elContainer.style.alignItems = "center";
      elContainer.style.overflow = "hidden";
      elContainer.style.background = "#fff";
      elContainer.style.height = "100%";
      elContainer.style.width = "100%";
      elContainer.innerHTML = "";

      var oDataLayout = null;
      try {
        if (oTransientRenderingContext && typeof oTransientRenderingContext.get === "function") {
          oDataLayout = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_LAYOUT);
        }
      } catch (eDL) {
        try { _logger.warn("No DATA_LAYOUT in render context", eDL); } catch(_) {}
      }
      
      this._currentDataLayout = oDataLayout;

      // Get user's date format preference
      var options = this.getViewConfig() || {};
      var dateFormat = options.dateFormat || "yyyy-MM-dd";

      // Use hardcoded colors from KANBAN_COLORS configuration
      var flagColors = {
        redColorCSS: KANBAN_COLORS.redBackground,
        redFlagBorder: KANBAN_COLORS.redBorder,
        yellowColorCSS: KANBAN_COLORS.yellowBackground,
        yellowFlagBorder: KANBAN_COLORS.yellowBorder
      };

      var tasks = this._extractTasks(oDataLayout, dateFormat) || [];
      this._tasks = tasks;
      this._hideTooltip && this._hideTooltip();
      var grouped = groupTasksByLane(tasks);

      var laneOrder = [
        messages.LANE_0_PERCENT,
        messages.LANE_10_PERCENT,
        messages.LANE_25_PERCENT,
        messages.LANE_50_PERCENT,
        messages.LANE_75_PERCENT,
        messages.LANE_95_PERCENT,
        messages.LANE_100_PERCENT
      ];
      var gapPx = 8;

      var metaText = messages.TASK_COUNT_LABEL + ": " + (tasks ? tasks.length : 0);
      var flaggedRedCount = tasks.filter(function(t) { return t.conditionFlagRed; }).length;
      var flaggedYellowCount = tasks.filter(function(t) { return t.conditionFlagYellow && !t.conditionFlagRed; }).length;
      if (flaggedRedCount > 0 || flaggedYellowCount > 0) {
        var flagParts = [];
        if (flaggedRedCount > 0) flagParts.push(messages.OVERDUE_LABEL + ": " + flaggedRedCount);
        if (flaggedYellowCount > 0) flagParts.push(messages.DUE_IN_30_DAYS_LABEL + ": " + flaggedYellowCount);
        metaText += " | " + flagParts.join(", ");
      }

      // Build legend HTML from category color map
      var legendHtml = "";
      if (CATEGORY_COLOR_MAP && Object.keys(CATEGORY_COLOR_MAP).length > 0) {
        legendHtml = "<div class='kanban-legend'>";
        var sortedCategories = Object.keys(CATEGORY_COLOR_MAP).sort();
        for (var i = 0; i < sortedCategories.length; i++) {
          var category = sortedCategories[i];
          var color = CATEGORY_COLOR_MAP[category];
          legendHtml += "<div class='kanban-legend-item'>";
          legendHtml += "<span class='kanban-legend-color' style='background-color:" + color + ";'></span>";
          legendHtml += "<span class='kanban-legend-label'>" + escapeHtml(category) + "</span>";
          legendHtml += "</div>";
        }
        legendHtml += "</div>";
      }

      var headerHtml =
        "<div class='kanban-header'>" +
          "<div class='kanban-header-left'>" +
            "<div class='kanban-header-title'>" + messages.KANBAN_BOARD_TITLE + "</div>" +
            "<div class='kanban-header-meta'>" + metaText + "</div>" +
          "</div>" +
          legendHtml +
        "</div>";

      var boardHtmlOpen =
        "<div class='kanban-board' style='box-sizing:border-box;width:100%;max-width:100%;padding:0 4px;margin:0 auto;display:flex;flex-direction:row;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;column-gap:" + gapPx + "px;overflow-x:hidden;overflow-y:auto;'>";

      var boardHtmlCols = laneOrder.map(function(laneName){
        return renderLane(laneName, grouped[laneName] || [], flagColors);
      }).join("");

      var boardHtmlClose = "</div>";

      elContainer.innerHTML = headerHtml + boardHtmlOpen + boardHtmlCols + boardHtmlClose;

      var boardEl = elContainer.querySelector('.kanban-board');

      var headerEl = elContainer.querySelector('.kanban-header');
      var headerH = headerEl ? headerEl.offsetHeight : 0;
      var containerH = elContainer.clientHeight || 0;
      var availableH = Math.max(0, containerH - headerH);

      if (availableH <= 0) {
        availableH = Math.max(240, Math.floor(window.innerHeight * 0.6));
      }
      boardEl.style.height = availableH + 'px';
      boardEl.style.maxHeight = availableH + 'px';
      boardEl.style.overflowY = 'auto';
      boardEl.style.overflowX = 'auto';

      applyResponsiveLaneWidths(boardEl, { gap: gapPx, minLane: 140, maxLane: 300 });

      if (!this._onWindowResize) {
        var self = this;
        this._onWindowResize = function () {
          if (self._resizeTimer) {
            clearTimeout(self._resizeTimer);
          }
          self._resizeTimer = setTimeout(function () {
            var headerEl2 = elContainer.querySelector('.kanban-header');
            var headerH2 = headerEl2 ? headerEl2.offsetHeight : 0;
            var containerH2 = elContainer.clientHeight || 0;
            var availableH2 = Math.max(0, containerH2 - headerH2);
            if (availableH2 <= 0) {
              availableH2 = Math.max(240, Math.floor(window.innerHeight * 0.6));
            }
            boardEl.style.height = availableH2 + 'px';
            boardEl.style.maxHeight = availableH2 + 'px';
            boardEl.style.overflowY = 'auto';
            applyResponsiveLaneWidths(boardEl, { gap: gapPx, minLane: 140, maxLane: 300 });
          }, 60);
        };
        window.addEventListener('resize', this._onWindowResize);
      }

      attachEventHandlers(elContainer, this);
      this._updateCardSelectionVisuals();
    }
    catch (e) {
      console.error('[KanbanViz] Render failed:', e);
      try { _logger.error("KanbanViz.render failed", e); } catch(ignore){}
      var fallback =
        "<div style='font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif;font-size:12px;padding:10px;color:#222;border:1px solid #ccc;border-radius:6px;background:#fafafa;'>" +
          "<div style='font-weight:600;margin-bottom:4px;'>" + (messages ? messages.KANBAN_BOARD_TITLE : "Kanban Board") + "</div>" +
          "<div style='font-size:11px;color:#555;'>Unable to render. Check console for details.</div>" +
        "</div>";
      var elContainer2 = this.getContainerElem();
      elContainer2.innerHTML = fallback;
    }
    finally {
      this._setIsRendered(true);
    }
  };

  /**
   * Re-render on resize
   */
  KanbanViz.prototype.resizeVisualization = function(oVizDimensions, oTransientVizContext){
    try {
      var elContainer = this.getContainerElem();
      var boardEl = elContainer ? elContainer.querySelector('.kanban-board') : null;
      if (boardEl) {
        var headerEl = elContainer.querySelector('.kanban-header');
        var headerH = headerEl ? headerEl.offsetHeight : 0;
        var containerH = elContainer.clientHeight || 0;
        var availableH = Math.max(0, containerH - headerH);
        if (availableH <= 0) {
          availableH = Math.max(240, Math.floor(window.innerHeight * 0.6));
        }
        boardEl.style.height = availableH + 'px';
        boardEl.style.maxHeight = availableH + 'px';
        boardEl.style.overflowY = 'auto';
        applyResponsiveLaneWidths(boardEl, { gap: 8, minLane: 140, maxLane: 300 });
      } else {
        var ctx = this.createRenderingContext(oTransientVizContext);
        this.render(ctx);
      }
    } catch (e) {
      try { _logger.warn("resizeVisualization fallback to render", e); } catch(ignore){}
      var ctx2 = this.createRenderingContext(oTransientVizContext);
      this.render(ctx2);
    }
  };

  /**
   * Normalize date format pattern for backward compatibility
   * Converts old uppercase patterns (YYYY-MM-DD) to new lowercase patterns (yyyy-MM-dd)
   */
  function normalizeDateFormat(format) {
    if (!format) return "yyyy-MM-dd";

    // Map old uppercase patterns to new lowercase patterns
    var formatMap = {
      "YYYY-MM-DD": "yyyy-MM-dd",
      "DD/MM/YYYY": "dd/MM/yyyy",
      "MM/DD/YYYY": "MM/dd/yyyy",
      "DD.MM.YYYY": "dd.MM.yyyy",
      "DD-MM-YYYY": "dd-MM-yyyy",
      "MMM DD, YYYY": "MMM dd, yyyy",
      "DD MMM YYYY": "dd MMM yyyy",
      "MMMM DD, YYYY": "MMMM dd, yyyy"
    };

    // Check if format needs conversion
    if (formatMap[format]) {
      console.log('[KanbanViz] Converting old format:', format, '→', formatMap[format]);
      return formatMap[format];
    }

    return format;
  }

  /**
   * Format date string according to user's preferred format
   */
  function formatDate(dateStr, format) {
    if (!dateStr || dateStr === "" || dateStr === null) return "";

    // Normalize format for backward compatibility
    format = normalizeDateFormat(format);

    // Try to parse the date
    var date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // If parsing fails, return original string
      return dateStr;
    }

    var day = date.getDate();
    var month = date.getMonth() + 1; // 0-indexed
    var year = date.getFullYear();

    // Pad with zeros
    var dd = day < 10 ? '0' + day : day;
    var mm = month < 10 ? '0' + month : month;

    // Month names
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var monthNamesLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var mmm = monthNames[month - 1];
    var mmmm = monthNamesLong[month - 1];

    var result;
    switch(format) {
      // OAC standard formats - US style (M/d)
      case "M/d/yy":
        result = month + "/" + day + "/" + String(year).substr(-2);
        break;
      case "M/d/yyyy":
        result = month + "/" + day + "/" + year;
        break;
      case "MM/dd/yy":
        result = mm + "/" + dd + "/" + String(year).substr(-2);
        break;
      case "MM/dd/yyyy":
        result = mm + "/" + dd + "/" + year;
        break;

      // OAC standard formats - European style (d/M)
      case "d/M/yy":
        result = day + "/" + month + "/" + String(year).substr(-2);
        break;
      case "d/M/yyyy":
        result = day + "/" + month + "/" + year;
        break;
      case "dd/MM/yy":
        result = dd + "/" + mm + "/" + String(year).substr(-2);
        break;
      case "dd/MM/yyyy":
        result = dd + "/" + mm + "/" + year;
        break;

      // OAC standard formats - dot separator
      case "d.M.yy":
        result = day + "." + month + "." + String(year).substr(-2);
        break;
      case "d.M.yyyy":
        result = day + "." + month + "." + year;
        break;
      case "dd.MM.yy":
        result = dd + "." + mm + "." + String(year).substr(-2);
        break;
      case "dd.MM.yyyy":
        result = dd + "." + mm + "." + year;
        break;

      // OAC standard formats - dash separator
      case "d-M-yy":
        result = day + "-" + month + "-" + String(year).substr(-2);
        break;
      case "d-M-yyyy":
        result = day + "-" + month + "-" + year;
        break;
      case "dd-MM-yy":
        result = dd + "-" + mm + "-" + String(year).substr(-2);
        break;
      case "dd-MM-yyyy":
        result = dd + "-" + mm + "-" + year;
        break;

      // OAC standard formats - ISO style (year first)
      case "yyyy-M-d":
        result = year + "-" + month + "-" + day;
        break;
      case "yyyy-MM-dd":
        result = year + "-" + mm + "-" + dd;
        break;
      case "yy/MM/dd":
        result = String(year).substr(-2) + "/" + mm + "/" + dd;
        break;
      case "yy/M/d":
        result = String(year).substr(-2) + "/" + month + "/" + day;
        break;

      // OAC standard formats - Month name formats (comma separator)
      case "MMM d, yy":
        result = mmm + " " + day + ", " + String(year).substr(-2);
        break;
      case "MMM d, yyyy":
        result = mmm + " " + day + ", " + year;
        break;
      case "MMM dd, yyyy":
        result = mmm + " " + dd + ", " + year;
        break;

      // OAC standard formats - Month name formats (space separator)
      case "d MMM yy":
        result = day + " " + mmm + " " + String(year).substr(-2);
        break;
      case "d MMM yyyy":
        result = day + " " + mmm + " " + year;
        break;
      case "dd MMM yyyy":
        result = dd + " " + mmm + " " + year;
        break;

      // OAC standard formats - Month name formats (dash separator)
      case "d-MMM-yy":
        result = day + "-" + mmm + "-" + String(year).substr(-2);
        break;
      case "d-MMM-yyyy":
        result = day + "-" + mmm + "-" + year;
        break;
      case "dd-MMM-yy":
        result = dd + "-" + mmm + "-" + String(year).substr(-2);
        break;
      case "dd-MMM-yyyy":
        result = dd + "-" + mmm + "-" + year;
        break;

      // OAC standard formats - Full month name
      case "MMMM d, yyyy":
        result = mmmm + " " + day + ", " + year;
        break;
      case "MMMM dd, yyyy":
        result = mmmm + " " + dd + ", " + year;
        break;
      case "d MMMM yyyy":
        result = day + " " + mmmm + " " + year;
        break;
      case "dd MMMM yyyy":
        result = dd + " " + mmmm + " " + year;
        break;
      case "dd MMMM, yyyy":
        result = dd + " " + mmmm + ", " + year;
        break;

      // OAC formats with day names (dddd) - we'll skip the day name for simplicity
      case "dddd, MMMM dd, yyyy":
      case "dddd, MMMM d, yyyy":
        result = mmmm + " " + dd + ", " + year;
        break;
      case "dddd, dd MMMM, yyyy":
      case "dddd, d MMMM, yyyy":
        result = dd + " " + mmmm + ", " + year;
        break;

      // Auto format - use ISO format
      case "Auto":
      default:
        result = year + "-" + mm + "-" + dd;
        break;
    }
    console.log('[KanbanViz] Formatted date result:', result, 'using format:', format);
    return result;
  }

  /**
   * Set default options for visualization properties
   */
  KanbanViz.prototype._fillDefaultOptions = function(oOptions) {
    if (!oOptions) return;

    // Date format default
    oOptions.dateFormat = jsx.defaultParam(oOptions.dateFormat, "yyyy-MM-dd");

    // Condition colors - now using hex values directly
    oOptions.redColorValue = jsx.defaultParam(oOptions.redColorValue, "red");
    oOptions.redColorCSS = jsx.defaultParam(oOptions.redColorCSS, "#ffe5e5");
    oOptions.redFlagBorder = jsx.defaultParam(oOptions.redFlagBorder, "#e09393");

    oOptions.yellowColorValue = jsx.defaultParam(oOptions.yellowColorValue, "yellow");
    oOptions.yellowColorCSS = jsx.defaultParam(oOptions.yellowColorCSS, "#fff9e5");
    oOptions.yellowFlagBorder = jsx.defaultParam(oOptions.yellowFlagBorder, "#e0d093");

    this.getSettings().setViewConfigJSON(dataviz.SettingsNS.CHART, oOptions);
  };

  /**
   * NOTE: Custom properties dialog is not supported in this Oracle Analytics version.
   * To customize colors, edit the KANBAN_COLORS constant at the top of this file.
   */

  /**
   * Handle property changes from the Properties dialog
   */
  KanbanViz.prototype._handlePropChange = function(sGadgetID, oPropChange, oViewSettings, oActionContext) {
    var conf = oViewSettings.getViewConfigJSON(dataviz.SettingsNS.CHART) || {};
    var bUpdateSettings = KanbanViz.superClass._handlePropChange.call(this, sGadgetID, oPropChange, oViewSettings, oActionContext);

    // Handle custom date format property (if dateFormat dropdown is available)
    if (sGadgetID === "dateFormat" || sGadgetID === "kanbanDateFormat") {
      conf.dateFormat = oPropChange.value;
      oViewSettings.setViewConfigJSON(dataviz.SettingsNS.CHART, conf);
      bUpdateSettings = true;
    }

    // Handle OAC's built-in column date format
    if (sGadgetID && sGadgetID.indexOf('date_format_outputformat') === 0) {
      if (oPropChange && oPropChange.valueObject) {
        var vo = oPropChange.valueObject;
        var newFormat = null;

        // When user types custom format, useValue is 'custom' and value has the actual format
        if (vo.useValue === 'custom' && vo.value) {
          newFormat = vo.value;
        }
        // For dropdown selections, prefer useValue
        else if (vo.useValue && vo.useValue !== 'custom') {
          newFormat = vo.useValue;
        }
        // Fallback to value
        else if (vo.value) {
          newFormat = vo.value;
        }

        if (newFormat) {

          // Save the format
          conf.dateFormat = newFormat;
          oViewSettings.setViewConfigJSON(dataviz.SettingsNS.CHART, conf);
          bUpdateSettings = true;
        }
      }
    }

    return bUpdateSettings;
  };

  /**
   * Factory for plugin.xml
   */
  function createClientComponent(sID, sDisplayName, sOrigin, sVersion) {
    return new KanbanViz(sID, sDisplayName, sOrigin, sVersion);
  }

  return {
    createClientComponent: createClientComponent
  };
});
