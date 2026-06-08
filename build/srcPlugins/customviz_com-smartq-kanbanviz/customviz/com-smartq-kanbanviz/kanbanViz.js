define([
  'jquery',
  'obitech-framework/jsx',
  'obitech-application/gadgets',
  'obitech-report/datavisualization',
  'obitech-report/gadgetdialog',
  'obitech-reportservices/datamodelshapes',
  'obitech-reportservices/data',
  'obitech-reportservices/events',
  'obitech-reportservices/interactionservice',
  'obitech-application/extendable-ui-definitions',
  'obitech-appservices/logger',
  'com-smartq-kanbanviz/colorConfig',
  'com-smartq-kanbanviz/nls/root/messages',
  'com-smartq-kanbanviz/nls/sl/messages',
  'com-smartq-kanbanviz/nls/fr/messages',
  'com-smartq-kanbanviz/nls/de/messages',
  'com-smartq-kanbanviz/nls/es/messages',
  'com-smartq-kanbanviz/nls/hr/messages',
  'com-smartq-kanbanviz/nls/it/messages',
  'css!com-smartq-kanbanviz/kanbanVizstyles'
], function(
  $,
  jsx,
  gadgets,
  dataviz,
  gadgetdialog,
  datamodelshapes,
  data,
  events,
  interactions,
  euidef,
  logger,
  colorConfig,
  messages_en,
  messages_sl,
  messages_fr,
  messages_de,
  messages_es,
  messages_hr,
  messages_it
) {
  "use strict";

  var MODULE_NAME = 'com-smartq-kanbanviz/kanbanViz';
  var _logger = new logger.Logger(MODULE_NAME);

  // ========================================================================
  // LOCALIZATION (NLS) - Language support
  // Translations loaded from external NLS files:
  // - root/messages.js (English - default)
  // - sl/messages.js (Slovenian)
  // - fr/messages.js (French)
  // - de/messages.js (German)
  // - es/messages.js (Spanish)
  // - hr/messages.js (Croatian)
  // - it/messages.js (Italian)
  // ========================================================================
  var messages;

  // Detect browser language and load appropriate messages
  (function() {
    try {
      var userLang = navigator.language || navigator.userLanguage || 'en';
      userLang = userLang.toLowerCase();

      console.log('[KanbanViz] Detected browser language:', userLang);

      // Check language prefix and load appropriate translations
      if (userLang.indexOf('sl') === 0) {
        messages = messages_sl;
        console.log('[KanbanViz] Using Slovenian translations from NLS file');
      } else if (userLang.indexOf('fr') === 0) {
        messages = messages_fr;
        console.log('[KanbanViz] Using French translations from NLS file');
      } else if (userLang.indexOf('de') === 0) {
        messages = messages_de;
        console.log('[KanbanViz] Using German translations from NLS file');
      } else if (userLang.indexOf('es') === 0) {
        messages = messages_es;
        console.log('[KanbanViz] Using Spanish translations from NLS file');
      } else if (userLang.indexOf('hr') === 0) {
        messages = messages_hr;
        console.log('[KanbanViz] Using Croatian translations from NLS file');
      } else if (userLang.indexOf('it') === 0) {
        messages = messages_it;
        console.log('[KanbanViz] Using Italian translations from NLS file');
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

  function getTaskColorSortRank(task) {
    if (task && task.conditionFlagRed) return 0;
    if (task && task.conditionFlagYellow) return 1;
    return 2;
  }

  function compareTaskIds(a, b) {
    var idA = a && a.subtitle1 != null ? String(a.subtitle1).trim() : "";
    var idB = b && b.subtitle1 != null ? String(b.subtitle1).trim() : "";
    if (idA && idB) {
      var compared = idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
      if (compared !== 0) return compared;
    } else if (idA) {
      return -1;
    } else if (idB) {
      return 1;
    }
    return ((a && a.rowIndex) || 0) - ((b && b.rowIndex) || 0);
  }

  function compareTasksForCardOrder(a, b) {
    var colorRank = getTaskColorSortRank(a) - getTaskColorSortRank(b);
    if (colorRank !== 0) return colorRank;
    return compareTaskIds(a, b);
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
    rowCount: 5,      // Number of columns in Rows (Task) grammar - MAX 5
    colorCount: 1,    // Number of columns in Color grammar - MAX 1
    glyphCount: 2,    // Number of columns in Shape/Conditional Formatting grammar - MAX 2
    sizeCount: 1,     // Number of columns in URL grammar - MAX 1
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

  function normalizeUrl(urlValue) {
    if (urlValue === null || urlValue === undefined) return null;
    var raw = String(urlValue).trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^mailto:/i.test(raw)) return raw;
    if (/^www\./i.test(raw)) return "https://" + raw;
    return null;
  }

  function normalizeBooleanOption(value, defaultValue) {
    if (value === undefined || value === null || value === "" || value === "auto") {
      return defaultValue;
    }
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return defaultValue;
  }

  function normalizeAlignmentOption(value, defaultValue) {
    if (value === undefined || value === null || value === "" || value === "auto") {
      return defaultValue;
    }
    if (value === "left" || value === "center" || value === "right") {
      return value;
    }
    return defaultValue;
  }

  function getTextAlignStyle(value, defaultValue) {
    var align = normalizeAlignmentOption(value, defaultValue);
    return "text-align:" + align + ";";
  }

  function getFlexAlignStyle(value, defaultValue) {
    var align = normalizeAlignmentOption(value, defaultValue);
    var alignItems = "center";
    if (align === "left") alignItems = "flex-start";
    if (align === "right") alignItems = "flex-end";
    return "text-align:" + align + ";align-items:" + alignItems + ";";
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
   * - Layer 3: Subtitle line 3 (from Rows - 4th column) - displayed in card body
   * - Layer 4: Bottom label (from Rows - 5th column) - displayed at bottom of card
   * - Layer 5: Color category (from Color grammar placeholder) - for stripe color
   * - Layer 6: Condition flag RED (from Shape/Conditional Formatting - 1st column)
   * - Layer 7: Condition flag YELLOW (from Shape/Conditional Formatting - 2nd column)
   * - Layer 8: URL column - hidden, used for title click navigation
   * - Layer 9+: Tooltip columns - displayed in tooltip
   *
   * Physical.DATA: Completion % measure
   *
   * Priority: RED > YELLOW (if both conditions are true, RED wins)
   */
  KanbanViz.prototype._extractTasks = function(oDataLayout, dateFormat) {
    var tasks = [];
    try {
      var self = this;
      if (!oDataLayout) return tasks;

      // Default date format if not provided (using OAC convention)
      dateFormat = dateFormat || "yyyy-MM-dd";

      var oRootDataModel = this.getRootDataModel();
      var oDataModel = this._currentLogicalDataModel || this._currentDataModel || oRootDataModel;
      if (!oDataModel && !oRootDataModel) return tasks;

      // Get row extent early (needed for low-level row-layer probing fallback)
      var rowCount = 0;
      try {
        rowCount = oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW) || 0;
      } catch (eRowCnt) {
        rowCount = 0;
      }

      // Get all columns on the ROW edge
      var rowCols = [];
      try {
        rowCols = oDataModel.getColumnIDsIn(datamodelshapes.Physical.ROW) || [];
      } catch (e) {
        rowCols = [];
      }

      // Runtime fallback: some OAC builds return no Physical.ROW column IDs even when data exists.
      // In that case, probe row layers directly from oDataLayout.
      if (!rowCols || rowCols.length === 0) {
        var detectedLayers = [];
        var maxProbeLayers = 40;
        var sampleRows = Math.min(Math.max(rowCount, 1), 20);
        var missStreak = 0;
        for (var layerProbe = 0; layerProbe < maxProbeLayers; layerProbe++) {
          var layerReadable = false;
          for (var rr = 0; rr < sampleRows; rr++) {
            try {
              // If no exception, layer exists (value may legitimately be null/empty)
              oDataLayout.getValue(datamodelshapes.Physical.ROW, layerProbe, rr, false);
              layerReadable = true;
              break;
            } catch (eProbe) {}
          }
          if (layerReadable) {
            detectedLayers.push(layerProbe);
            missStreak = 0;
          } else {
            missStreak++;
            if (detectedLayers.length > 0 && missStreak >= 3) {
              break;
            }
          }
        }
        if (detectedLayers.length > 0) {
          rowCols = detectedLayers;
          console.log("[KanbanViz] Using probed Physical.ROW layers:", rowCols.length);
        }
      }

      // Config fallback (used only if logical roles are not available)
      var rowRoleCount = GRAMMAR_CONFIG.rowCount || 0;
      var colorRoleCount = GRAMMAR_CONFIG.colorCount || 0;
      var glyphRoleCount = GRAMMAR_CONFIG.glyphCount || 0;
      var sizeRoleCount = GRAMMAR_CONFIG.sizeCount || 0;
      var tooltipRoleCount = GRAMMAR_CONFIG.tooltipCount || 0;

      console.log("[KanbanViz] GRAMMAR_CONFIG fallback - ROW:", rowRoleCount, "COLOR:", colorRoleCount, "GLYPH:", glyphRoleCount, "SIZE:", sizeRoleCount, "TOOLTIP:", tooltipRoleCount);

      // Helper to get display name for a column
      function resolveDisplayName(colId) {
        if (!colId) return null;
        function cleanDisplayName(name) {
          var cleaned = String(name || "").replace(/\s+/g, " ").trim();
          return cleaned || null;
        }
        function getPreferredEdgeLabelName(rawColId) {
          var propertyKeys = ["label", "displayName", "caption", "name", "heading", "title"];
          for (var pk = 0; pk < propertyKeys.length; pk++) {
            var propValue = getEdgeLabelProperty(rawColId, propertyKeys[pk]);
            var cleanedProp = cleanDisplayName(propValue);
            if (cleanedProp) {
              return cleanedProp;
            }
          }
          return null;
        }
        function deriveDisplayNameFromId(rawColId) {
          if (rawColId == null) return null;
          var colIdText = String(rawColId);
          if (!colIdText) return null;

          // Prefer the last quoted identifier, which commonly preserves the real column caption.
          var quotedParts = [];
          var quoteMatch;
          var quotedRe = /"([^"]+)"/g;
          while ((quoteMatch = quotedRe.exec(colIdText)) !== null) {
            if (quoteMatch[1]) quotedParts.push(quoteMatch[1]);
          }
          for (var qi = quotedParts.length - 1; qi >= 0; qi--) {
            var quotedCandidate = cleanDisplayName(quotedParts[qi]);
            if (quotedCandidate) return quotedCandidate;
          }

          // Fall back to the trailing token from dotted/qualified IDs.
          var lastToken = colIdText.split(/[./:]/).pop();
          if (lastToken) {
            lastToken = lastToken.replace(/^[\[\("'`]+|[\]\)"'`]+$/g, "");
            lastToken = cleanDisplayName(lastToken.replace(/_/g, " "));
            if (lastToken) return lastToken;
          }
          return null;
        }
        function pickReadableName(primaryName, rawColId) {
          var edgeLabelName = getPreferredEdgeLabelName(rawColId);
          if (edgeLabelName && /\s/.test(edgeLabelName)) {
            return edgeLabelName;
          }
          var cleanedPrimary = cleanDisplayName(primaryName);
          var derivedName = deriveDisplayNameFromId(rawColId);
          if (!cleanedPrimary) return derivedName;
          if (!derivedName) return cleanedPrimary;

          var primaryHasSpace = /\s/.test(cleanedPrimary);
          var derivedHasSpace = /\s/.test(derivedName);
          if (!primaryHasSpace && derivedHasSpace) {
            return derivedName;
          }
          return cleanedPrimary;
        }
        function pickBestName(cObj) {
          if (!cObj) return null;
          var candidates = [];
          try { if (cObj.getCaption && cObj.getCaption()) candidates.push(String(cObj.getCaption())); } catch (_) {}
          try { if (cObj.getDisplayName && cObj.getDisplayName()) candidates.push(String(cObj.getDisplayName())); } catch (_) {}
          try { if (cObj.getLabel && cObj.getLabel()) candidates.push(String(cObj.getLabel())); } catch (_) {}
          try { if (cObj.getName && cObj.getName()) candidates.push(String(cObj.getName())); } catch (_) {}

          for (var ci = 0; ci < candidates.length; ci++) {
            var candidate = cleanDisplayName(candidates[ci]);
            if (candidate && /\s/.test(candidate)) {
              return pickReadableName(candidate, colId);
            }
          }
          for (var cj = 0; cj < candidates.length; cj++) {
            var fallbackCandidate = cleanDisplayName(candidates[cj]);
            if (fallbackCandidate) {
              return pickReadableName(fallbackCandidate, colId);
            }
          }
          return deriveDisplayNameFromId(colId);
        }
        var models = [oDataModel, oRootDataModel, self._currentDataModel, self._currentLogicalDataModel];
        for (var mi = 0; mi < models.length; mi++) {
          var model = models[mi];
          if (!model) continue;
          try {
            var cObj = model.getColumnByID && model.getColumnByID(colId);
            if (cObj) {
              var bestName = pickBestName(cObj);
              if (bestName) {
                return bestName;
              }
            }
          } catch (e) {}
        }
        try {
          if (oDataModel && oDataModel.getColumnByID) {
            var cObj2 = oDataModel.getColumnByID(colId);
            if (cObj2) {
              var bestName2 = pickBestName(cObj2);
              if (bestName2) return bestName2;
            }
          }
        } catch (e) {
          console.log("[KanbanViz] Error resolving display name for colId:", colId, e);
        }
        return (typeof colId === "string") ? deriveDisplayNameFromId(colId) : null;
      }

      // Helper to get edge label property for a column
      function getEdgeLabelProperty(colId, propertyId) {
        if (!colId) return null;
        try {
          var models = [oDataModel, oRootDataModel, self._currentDataModel, self._currentLogicalDataModel];
          for (var mi = 0; mi < models.length; mi++) {
            var model = models[mi];
            if (!model || !model.getColumnByID) continue;
            var cObj = model.getColumnByID(colId);
            if (cObj && cObj.getEdgeLabelProperty) {
              var p = cObj.getEdgeLabelProperty(propertyId);
              if (p !== null && p !== undefined && p !== "") return p;
            }
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
          var models = [oDataModel, oRootDataModel, self._currentDataModel, self._currentLogicalDataModel];
          for (var mi = 0; mi < models.length; mi++) {
            var model = models[mi];
            if (!model || !model.getColumnByID) continue;
            var cObj = model.getColumnByID(colId);
            if (cObj && cObj.getLogicalRole) {
              var role = cObj.getLogicalRole();
              if (role !== null && role !== undefined) return role;
            }
          }
        } catch (e) {}
        return null;
      }

      function getRowLayerIndex(colId) {
        if (!colId) return -1;
        var idx = rowCols.indexOf(colId);
        if (idx >= 0) return idx;

        // ID string fallback (handles object vs string ID mismatch)
        var colIdStr = String(colId);
        for (var i = 0; i < rowCols.length; i++) {
          if (String(rowCols[i]) === colIdStr) return i;
        }

        // Display-name fallback (handles different model namespaces)
        var targetName = resolveDisplayName(colId);
        if (targetName) {
          for (var j = 0; j < rowCols.length; j++) {
            var rcName = resolveDisplayName(rowCols[j]);
            if (rcName && rcName === targetName) return j;
          }
        }

        return -1;
      }

      function sameRowColumn(colA, colB) {
        if (!colA || !colB) return false;
        var a = getRowLayerIndex(colA);
        var b = getRowLayerIndex(colB);
        return a >= 0 && b >= 0 && a === b;
      }

      // Try to read columns by logical placeholder directly.
      // This preserves slot boundaries even when some placeholders have fewer columns.
      function tryLogicalColumns(logicalEdge) {
        var cols = null;
        var edgeCandidates = [];
        var models = [oDataModel, oRootDataModel, self._currentDataModel, self._currentLogicalDataModel];
        function pushEdgeCandidate(v) {
          if (v === null || v === undefined) return;
          for (var i = 0; i < edgeCandidates.length; i++) {
            if (edgeCandidates[i] === v) return;
          }
          edgeCandidates.push(v);
        }
        pushEdgeCandidate(logicalEdge);
        try { pushEdgeCandidate(String(logicalEdge)); } catch (eStr) {}
        try { pushEdgeCandidate(String(logicalEdge).toLowerCase()); } catch (eLower) {}
        try { pushEdgeCandidate(String(logicalEdge).toUpperCase()); } catch (eUpper) {}

        for (var mi0 = 0; mi0 < models.length; mi0++) {
          var m0 = models[mi0];
          if (!m0) continue;
          for (var ec0 = 0; ec0 < edgeCandidates.length; ec0++) {
            try {
              cols = m0.getUsedColumnIDsIn && m0.getUsedColumnIDsIn(edgeCandidates[ec0]);
              if (cols && cols.length > 0) return cols.slice();
            } catch (e0) {}
          }
        }
        for (var mi1 = 0; mi1 < models.length; mi1++) {
          var m1 = models[mi1];
          if (!m1) continue;
          for (var ec1 = 0; ec1 < edgeCandidates.length; ec1++) {
            try {
              cols = m1.getColumnIDsIn && m1.getColumnIDsIn(edgeCandidates[ec1]);
              if (cols && cols.length > 0) return cols.slice();
            } catch (e1) {}
          }
        }
        // Some OAC builds expose logical edges only through getLogicalEdges().
        for (var mi2 = 0; mi2 < models.length; mi2++) {
          var m2 = models[mi2];
          if (!m2) continue;
          try {
            if (m2.getLogicalEdges) {
              var edges = m2.getLogicalEdges();
              if (edges && edges.getChildByName) {
                for (var ec2 = 0; ec2 < edgeCandidates.length; ec2++) {
                  var edgeName = String(edgeCandidates[ec2]).toLowerCase();
                  var edgeObj = edges.getChildByName(edgeName);
                  if (edgeObj && edgeObj.getUsedColumnIDsIn) {
                    cols = edgeObj.getUsedColumnIDsIn();
                    if (cols && cols.length > 0) return cols.slice();
                  }
                }
              }
            }
          } catch (e2) {}
        }
        return null;
      }

      // Prefer direct logical-edge lists to keep exact slot boundaries.
      // Fallback to per-column logical role and finally positional split.
      var rowRoleColumns = [];
      var colorRoleColumns = [];
      var glyphRoleColumns = [];
      var sizeRoleColumns = [];
      var tooltipRoleColumns = [];
      var unresolvedColumns = [];

      console.log("[KanbanViz] Total columns in Physical.ROW:", rowCols.length);

      var logicalRowCols = tryLogicalColumns(datamodelshapes.Logical.ROW) || [];
      var logicalColorCols = tryLogicalColumns(datamodelshapes.Logical.COLOR) || [];
      var logicalGlyphCols = tryLogicalColumns(datamodelshapes.Logical.GLYPH) || [];
      var logicalSizeCols = tryLogicalColumns(datamodelshapes.Logical.SIZE) || [];
      var logicalTooltipCols = tryLogicalColumns(datamodelshapes.Logical.TOOLTIP) || [];
      var explicitRowCount = logicalRowCols.length;

      var hasLogicalLists = (logicalRowCols.length || logicalColorCols.length || logicalGlyphCols.length || logicalSizeCols.length || logicalTooltipCols.length);

      if (hasLogicalLists) {
        rowRoleColumns = logicalRowCols.slice();
        colorRoleColumns = logicalColorCols.slice();
        glyphRoleColumns = logicalGlyphCols.slice();
        sizeRoleColumns = logicalSizeCols.slice();
        tooltipRoleColumns = logicalTooltipCols.slice();
        // Keep only columns that exist on Physical.ROW in this model instance
        rowRoleColumns = rowRoleColumns.filter(function(c){ return getRowLayerIndex(c) >= 0; });
        colorRoleColumns = colorRoleColumns.filter(function(c){ return getRowLayerIndex(c) >= 0; });
        glyphRoleColumns = glyphRoleColumns.filter(function(c){ return getRowLayerIndex(c) >= 0; });
        sizeRoleColumns = sizeRoleColumns.filter(function(c){ return getRowLayerIndex(c) >= 0; });
        tooltipRoleColumns = tooltipRoleColumns.filter(function(c){ return getRowLayerIndex(c) >= 0; });
        if (rowRoleColumns.length || colorRoleColumns.length || glyphRoleColumns.length || sizeRoleColumns.length || tooltipRoleColumns.length) {
          console.log("[KanbanViz] Using direct logical-edge column lists");
        } else {
          hasLogicalLists = false;
          console.log("[KanbanViz] Direct logical-edge lists were empty after filtering; using fallback");
        }
      }

      if (!hasLogicalLists) {
        for (var i = 0; i < rowCols.length; i++) {
          var colId = rowCols[i];
          var displayName = resolveDisplayName(colId);
          var logicalRole = getLogicalRole(colId);

          if (logicalRole === datamodelshapes.Logical.ROW || logicalRole === "row") {
            rowRoleColumns.push(colId);
            console.log("[KanbanViz] Column", i, ":", displayName, "-> ROW logical role");
          } else if (logicalRole === datamodelshapes.Logical.COLOR || logicalRole === "color") {
            colorRoleColumns.push(colId);
            console.log("[KanbanViz] Column", i, ":", displayName, "-> COLOR logical role");
          } else if (logicalRole === datamodelshapes.Logical.GLYPH || logicalRole === "glyph") {
            glyphRoleColumns.push(colId);
            console.log("[KanbanViz] Column", i, ":", displayName, "-> GLYPH logical role");
          } else if (logicalRole === datamodelshapes.Logical.SIZE || logicalRole === "size") {
            sizeRoleColumns.push(colId);
            console.log("[KanbanViz] Column", i, ":", displayName, "-> SIZE logical role");
          } else if (logicalRole === datamodelshapes.Logical.TOOLTIP || logicalRole === "tooltip") {
            tooltipRoleColumns.push(colId);
            console.log("[KanbanViz] Column", i, ":", displayName, "-> TOOLTIP logical role");
          } else {
            unresolvedColumns.push(colId);
            console.log("[KanbanViz] Column", i, ":", displayName, "-> unresolved logical role");
          }
        }

        // Positional fallback if per-column logical role detection is unavailable
        if (rowRoleColumns.length === 0 && colorRoleColumns.length === 0 && glyphRoleColumns.length === 0 && sizeRoleColumns.length === 0 && tooltipRoleColumns.length === 0) {
          // Heuristic recovery: detect boolean-like columns as Conditional Formatting (GLYPH)
          // so they don't shift into Rows slots when metadata is unavailable.
          var sampleRows = 0;
          try { sampleRows = Math.min(80, oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW) || 0); } catch (_) { sampleRows = 0; }
          if (sampleRows <= 0) sampleRows = 30;

          function isBoolLikeToken(v) {
            if (v === null || v === undefined) return false;
            var s = String(v).trim().toLowerCase();
            if (s === "") return false;
            return s === "y" || s === "yes" || s === "d" || s === "da" || s === "1" || s === "true" ||
                   s === "n" || s === "no" || s === "0" || s === "false";
          }

          var glyphCandidateIdx = [];
          for (var gc = 0; gc < rowCols.length; gc++) {
            var nonEmpty = 0;
            var boolLike = 0;
            var uniq = {};
            for (var sr = 0; sr < sampleRows; sr++) {
              var raw = null;
              try { raw = oDataLayout.getValue(datamodelshapes.Physical.ROW, gc, sr, false); } catch (_) { raw = null; }
              if (raw === null || raw === undefined) continue;
              var txt = String(raw).trim();
              if (txt === "") continue;
              nonEmpty++;
              uniq[txt.toLowerCase()] = true;
              if (isBoolLikeToken(txt)) boolLike++;
            }

            var uniqCount = Object.keys(uniq).length;
            if (nonEmpty > 0 && (boolLike / nonEmpty) >= 0.8 && uniqCount <= 4) {
              glyphCandidateIdx.push(gc);
            }
          }

          if (glyphCandidateIdx.length > 0) {
            // Use first two bool-like columns as RED/YELLOW condition slots
            glyphCandidateIdx.sort(function(a, b){ return a - b; });
            var g1 = glyphCandidateIdx[0];
            var g2 = glyphCandidateIdx.length > 1 ? glyphCandidateIdx[1] : -1;
            glyphRoleColumns.push(rowCols[g1]);
            if (g2 >= 0) glyphRoleColumns.push(rowCols[g2]);

            // Color is the nearest preceding column before first glyph (if any)
            var colorIdx = g1 - 1;
            if (colorIdx >= 0) {
              colorRoleColumns.push(rowCols[colorIdx]);
            }

            // Rows are columns before color (or before first glyph if color missing)
            var rowEndExclusive = (colorIdx >= 0) ? colorIdx : g1;
            for (var ri = 0; ri < rowEndExclusive; ri++) {
              rowRoleColumns.push(rowCols[ri]);
            }

            // Tooltip columns are all columns after the last glyph column
            var lastGlyph = (g2 >= 0) ? g2 : g1;
            for (var ti = lastGlyph + 1; ti < rowCols.length; ti++) {
              tooltipRoleColumns.push(rowCols[ti]);
            }

            console.log("[KanbanViz] Positional heuristic split (bool-like GLYPH recovery) used");
          } else {
            // Final fallback: configured positional split
            for (var j = 0; j < rowCols.length; j++) {
              var colId2 = rowCols[j];
              if (j < rowRoleCount) {
                rowRoleColumns.push(colId2);
              } else if (j < rowRoleCount + colorRoleCount) {
                colorRoleColumns.push(colId2);
              } else if (j < rowRoleCount + colorRoleCount + glyphRoleCount) {
                glyphRoleColumns.push(colId2);
              } else if (j < rowRoleCount + colorRoleCount + glyphRoleCount + sizeRoleCount) {
                sizeRoleColumns.push(colId2);
              } else {
                tooltipRoleColumns.push(colId2);
              }
            }
            console.log("[KanbanViz] Using configured positional fallback split");
          }
        } else if (unresolvedColumns.length > 0) {
          // Keep unresolved columns visible in tooltip instead of dropping data
          tooltipRoleColumns = tooltipRoleColumns.concat(unresolvedColumns);
        }
      }

      console.log("[KanbanViz] Separated - ROW:", rowRoleColumns.length, "COLOR:", colorRoleColumns.length, "GLYPH:", glyphRoleColumns.length, "SIZE:", sizeRoleColumns.length, "TOOLTIP:", tooltipRoleColumns.length);

      // Column assignments based on FIXED layer positions (not array order)
      // Rows grammar: 5 columns (layers 0-4)
      var taskColId = rowRoleColumns[0] || null;           // Layer 0: Task name (Rows - 1st)
      var subtitle1ColId = rowRoleColumns[1] || null;      // Layer 1: Subtitle line 1 (Rows - 2nd)
      var subtitle2ColId = rowRoleColumns[2] || null;      // Layer 2: Subtitle line 2 (Rows - 3rd)
      var subtitle3ColId = rowRoleColumns[3] || null;      // Layer 3: Subtitle line 3 (Rows - 4th)
      var bottomAttrColId = rowRoleColumns[4] || null;     // Layer 4: Bottom label (Rows - 5th)
      var colorColId = colorRoleColumns[0] || null;        // Layer 5: Color category (Color grammar)

      // Primary source for conditional formatting: GLYPH role
      // Fallback for legacy reports: tooltip columns (edge labels, then first/second tooltip)
      var conditionColId = glyphRoleColumns[0] || null;
      var conditionColId2 = glyphRoleColumns[1] || null;

      if (!conditionColId && !conditionColId2 && tooltipRoleColumns.length > 0) {
        var redConditionIndex = -1;
        var yellowConditionIndex = -1;

        for (var i = 0; i < tooltipRoleColumns.length; i++) {
          var colorRole = getEdgeLabelProperty(tooltipRoleColumns[i], 'colorRole');
          if (colorRole === 'red' && redConditionIndex === -1) {
            redConditionIndex = i;
          } else if (colorRole === 'yellow' && yellowConditionIndex === -1) {
            yellowConditionIndex = i;
          }
        }

        if (redConditionIndex === -1) redConditionIndex = 0;
        if (yellowConditionIndex === -1) yellowConditionIndex = 1;

        conditionColId = tooltipRoleColumns[redConditionIndex] || null;
        conditionColId2 = tooltipRoleColumns[yellowConditionIndex] || null;
      }

      // Safety: when Rows[5] is missing, never let Color/Condition columns leak into bottom slot.
      if (bottomAttrColId &&
          (sameRowColumn(bottomAttrColId, colorColId) ||
           sameRowColumn(bottomAttrColId, conditionColId) ||
           sameRowColumn(bottomAttrColId, conditionColId2))) {
        bottomAttrColId = null;
      }

      // If logical ROW count is explicitly < 5, bottom slot must stay blank.
      if (explicitRowCount > 0 && explicitRowCount < 5) {
        bottomAttrColId = null;
      }

      // Safety: if title mapping failed, use first physical row layer as title.
      if (!taskColId && rowCols.length > 0) {
        taskColId = rowCols[0];
      }

      // Resolve actual Physical.ROW layer numbers from column IDs
      var redConditionLayer = conditionColId ? getRowLayerIndex(conditionColId) : -1;
      var yellowConditionLayer = conditionColId2 ? getRowLayerIndex(conditionColId2) : -1;

      console.log("[KanbanViz] Condition layers - RED:", redConditionLayer, "YELLOW:", yellowConditionLayer);

      // Compute stable slot boundaries.
      // Row slot count must never depend on Color layer position.
      var colorLayer = colorColId ? getRowLayerIndex(colorColId) : -1;
      if (colorLayer < 0 && redConditionLayer > 0) {
        colorLayer = redConditionLayer - 1;
      }
      if (colorLayer < 0 && yellowConditionLayer > 0) {
        colorLayer = yellowConditionLayer - 1;
      }

      var explicitColorCount = logicalColorCols.length;
      var explicitGlyphCount = logicalGlyphCols.length;
      var explicitSizeCount = logicalSizeCols.length;
      var explicitTooltipCount = logicalTooltipCols.length;

      var rowSlotCount = 0;
      if (explicitRowCount > 0) {
        rowSlotCount = explicitRowCount;
      } else if (rowRoleColumns.length > 0) {
        rowSlotCount = rowRoleColumns.length;
      } else if (rowCols.length > 0) {
        // Safe fallback when logical row count is unavailable.
        rowSlotCount = rowCols.length - explicitColorCount - explicitGlyphCount - explicitSizeCount - explicitTooltipCount;
      }

      if (rowSlotCount < 1 && rowCols.length > 0) rowSlotCount = 1;
      if (rowSlotCount > 5) rowSlotCount = 5;

      var taskLayer = (rowSlotCount >= 1) ? 0 : -1;
      var subtitle1Layer = (rowSlotCount >= 2) ? 1 : -1;
      var subtitle2Layer = (rowSlotCount >= 3) ? 2 : -1;
      var subtitle3Layer = (rowSlotCount >= 4) ? 3 : -1;
      var bottomAttrLayer = (rowSlotCount >= 5) ? 4 : -1;

      // If Color is explicitly present, it starts right after row slots.
      if (explicitColorCount > 0) {
        colorLayer = rowSlotCount;
      }

      var urlColId = sizeRoleColumns[0] || logicalSizeCols[0] || null;
      var urlLayer = urlColId ? getRowLayerIndex(urlColId) : -1;
      if (urlLayer < 0 && explicitSizeCount > 0) {
        urlLayer = rowSlotCount + explicitColorCount + explicitGlyphCount;
      }
      var tooltipStartLayer = rowSlotCount + explicitColorCount + explicitGlyphCount + explicitSizeCount;

      var taskDisplayName = resolveDisplayName(taskColId) || "Task";
      var subtitle1DisplayName = resolveDisplayName(subtitle1ColId) || "";
      var subtitle2DisplayName = resolveDisplayName(subtitle2ColId) || "";
      var subtitle3DisplayName = resolveDisplayName(subtitle3ColId) || "";
      var bottomAttrDisplayName = resolveDisplayName(bottomAttrColId) || "";
      var colorDisplayName = resolveDisplayName(colorColId) || "Color";
      var urlDisplayName = resolveDisplayName(urlColId) || "URL";
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

      // Additional tooltip columns are tooltip-role columns excluding non-tooltip helper slots.
      // Keep their physical order so labels and values stay aligned.
      var additionalTooltipColIds = [];
      for (var tc = 0; tc < tooltipRoleColumns.length; tc++) {
        var tipColId = tooltipRoleColumns[tc];
        if (tipColId !== conditionColId &&
            tipColId !== conditionColId2 &&
            tipColId !== urlColId &&
            !sameRowColumn(tipColId, urlColId)) {
          additionalTooltipColIds.push(tipColId);
        }
      }
      additionalTooltipColIds.sort(function(a, b) {
        return getRowLayerIndex(a) - getRowLayerIndex(b);
      });

      function resolveTooltipDisplayName(tooltipColId, tooltipIdx) {
        var directName = resolveDisplayName(tooltipColId);
        if (directName && !/^Attr\s+\d+$/i.test(directName)) {
          return directName;
        }

        if (logicalTooltipCols && logicalTooltipCols.length > tooltipIdx) {
          var logicalName = resolveDisplayName(logicalTooltipCols[tooltipIdx]);
          if (logicalName && !/^Attr\s+\d+$/i.test(logicalName)) {
            return logicalName;
          }
        }

        return "Attr " + (tooltipIdx + 1);
      }

      console.log('[KanbanViz] Row count:', rowCount);

      // Iterate through all rows
      for (var r = 0; r < Math.max(rowCount, 1); r++) {

        function getValueAtLayer(layerIdx, rowIdx) {
          if (layerIdx == null || layerIdx < 0) return null;
          try {
            return oDataLayout.getValue(datamodelshapes.Physical.ROW, layerIdx, rowIdx, false);
          } catch (_) {
            return null;
          }
        }

        // Extract values using the separated column arrays
        // This allows us to read columns based on their logical role, not physical position

        // Task name (Rows[1])
        var taskName = null;
        try {
          taskName = getValueAtLayer(taskLayer, r);
        } catch (e) {
          taskName = null;
        }

        // Subtitle line 1 (Rows[2])
        var subtitle1 = null;
        try {
          subtitle1 = getValueAtLayer(subtitle1Layer, r);
        } catch (e) {
          subtitle1 = null;
        }

        // Subtitle line 2 (Rows[3]) - with date formatting
        var subtitle2 = null;
        try {
          subtitle2 = getValueAtLayer(subtitle2Layer, r);
          if (subtitle2 !== null && subtitle2 !== undefined && subtitle2 !== "") {
            subtitle2 = formatDate(String(subtitle2), dateFormat);
          }
        } catch (e) {
          subtitle2 = null;
        }

        // Subtitle line 3 (Rows[4])
        var subtitle3 = null;
        try {
          subtitle3 = getValueAtLayer(subtitle3Layer, r);
        } catch (e) {
          subtitle3 = null;
        }

        // Bottom label (Rows[5]) - stays blank when Rows[5] missing
        var bottomAttr = null;
        try {
          bottomAttr = getValueAtLayer(bottomAttrLayer, r);
        } catch (e) {
          bottomAttr = null;
        }

        // Color category (Color[1])
        var colorVal = null;
        try {
          colorVal = getValueAtLayer(colorLayer, r);
        } catch (e) {
          colorVal = null;
        }

        var urlVal = null;
        try {
          urlVal = getValueAtLayer(urlLayer, r);
        } catch (e) {
          urlVal = null;
        }

        var cardLinkUrl = normalizeUrl(urlVal);

        // RED condition flag (from Shape/Conditional Formatting 1st column, or legacy tooltip fallback)
        // Check if value indicates "yes" (Y, Yes, D, Da, 1, TRUE, true) for RED
        var conditionFlagRed = false;
        var conditionValueRed = null;
        try {
          if (redConditionLayer >= 0) {
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
          }
        } catch (e) {
          conditionFlagRed = false;
          conditionValueRed = null;
        }

        // YELLOW condition flag (from Shape/Conditional Formatting 2nd column, or legacy tooltip fallback)
        // Check if value indicates "yes" (Y, Yes, D, Da, 1, TRUE, true) for YELLOW
        var conditionFlagYellow = false;
        var conditionValueYellow = null;
        try {
          if (yellowConditionLayer >= 0) {
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

        // Additional tooltip columns
        var tooltipKVPairs = [];
        var tooltipFieldCount = additionalTooltipColIds.length;
        for (var tci = 0; tci < tooltipFieldCount; tci++) {
          try {
            var tooltipColId = additionalTooltipColIds[tci] || null;
            var tooltipLayerIdx = tooltipStartLayer + tci;
            var tVal = oDataLayout.getValue(datamodelshapes.Physical.ROW, tooltipLayerIdx, r, false);
            if (tVal !== null && tVal !== undefined && String(tVal).trim() !== "") {
              var tName = resolveTooltipDisplayName(tooltipColId, tci);
              tooltipKVPairs.push({ k: tName, v: String(tVal) });
            }
          } catch (e) {}
        }

        // Build tooltip HTML.
        var tooltipLines = [];

        function formatPct(pctNum) {
          return (pctNum == null || isNaN(pctNum)) ? "" : ((Math.round(pctNum * 10000) / 100) + "%");
        }

        if (subtitle1 != null && String(subtitle1) !== "" && subtitle1DisplayName) {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(subtitle1DisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(subtitle1) + "</span></span>");
        }

        if (subtitle2 != null && String(subtitle2) !== "" && subtitle2DisplayName) {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(subtitle2DisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(subtitle2) + "</span></span>");
        }

        if (subtitle3 != null && String(subtitle3) !== "" && subtitle3DisplayName) {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(subtitle3DisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(subtitle3) + "</span></span>");
        }

        if (bottomAttr != null && String(bottomAttr) !== "" && bottomAttrDisplayName) {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(bottomAttrDisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(bottomAttr) + "</span></span>");
        }

        if (taskName != null && String(taskName) !== "") {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(taskDisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(taskName) + "</span></span>");
        }

        tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(measureDisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(formatPct(pctNum)) + "</span></span>");

        if (colorVal != null && String(colorVal) !== "") {
          tooltipLines.push("<span class='kt-line'><span class='kt-k'>" + escapeHtml(colorDisplayName) + ":</span> <span class='kt-v'>" + escapeHtml(String(colorVal)) + "</span></span>");
        }

        for (var ti = 0; ti < tooltipKVPairs.length; ti++) {
          var kv = tooltipKVPairs[ti];
          if (/^Attr\s+\d+$/i.test(kv.k)) {
            var kvVal = String(kv.v || "").trim();
            var rawUrl = String(urlVal || "").trim();
            var rawCondRed = String(conditionValueRed || "").trim();
            var rawCondYellow = String(conditionValueYellow || "").trim();
            if ((rawUrl && kvVal === rawUrl) ||
                (rawCondRed && kvVal === rawCondRed) ||
                (rawCondYellow && kvVal === rawCondYellow)) {
              continue;
            }
          }
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
          bottomAttr: (bottomAttr != null ? String(bottomAttr) : ""),
          pct: pctNum,
          pctComplete: pctNum,
          category: (colorVal != null ? String(colorVal) : ""),
          colorKey: (colorVal != null ? String(colorVal) : ""),
          url: cardLinkUrl,
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
    Object.keys(lanes).forEach(function(laneName) {
      lanes[laneName].sort(compareTasksForCardOrder);
    });
    return lanes;
  }

  /**
   * Render a single task card.
   */
  function renderCard(task, colors, options) {
    var pctDisplay = task.pct == null || isNaN(task.pct)
      ? (task.lane === messages.LANE_100_PERCENT ? messages.LANE_100_PERCENT : "-")
      : (Math.round(task.pct * 10000) / 100) + "%";
    var showCompletionPct = normalizeBooleanOption(options && options.showCompletionPct, true);
    var titleAlignStyle = getTextAlignStyle(options && options.row1Alignment, "center");
    var bodyAlignStyle = getFlexAlignStyle(options && options.row4Alignment, "center");
    var bottomAlignStyle = getTextAlignStyle(options && options.row5Alignment, "left");

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
                ? "<td class='kanban-card-subtitle kanban-card-subtitle-left'>" +
                    (task.url
                      ? "<a class='kanban-card-title-link' href='" + escapeHtml(task.url) + "' target='_blank' rel='noopener noreferrer'>ID: " + escapeHtml(task.subtitle1) + "</a>"
                      : "ID: " + escapeHtml(task.subtitle1)
                    ) +
                  "</td>"
                : "<td></td>"
              ) +
              // Center column for percentage
              (showCompletionPct
                ? "<td class='kanban-card-subtitle kanban-card-subtitle-center'>(" + escapeHtml(pctDisplay) + ")</td>"
                : "<td></td>"
              ) +
              (task.subtitle2
                ? "<td class='kanban-card-subtitle kanban-card-subtitle-right'>" + escapeHtml(task.subtitle2) + "</td>"
                : "<td></td>"
              ) +
            "</tr></table>" +
            // Main task title
            "<div class='kanban-card-title' style='" + titleAlignStyle + "'>" +
              escapeHtml(task.title) +
            "</div>" +
          "</div>" +
          // Center position (below title) - subtitle3 (4th ROW column)
          (task.subtitle3
            ? "<div class='kanban-card-right' style='" + bodyAlignStyle + "'>" +
                escapeHtml(task.subtitle3) +
              "</div>"
            : ""
          ) +
          // Bottom row - 5th Rows attribute only
          (task.bottomAttr
            ? "<div class='kanban-card-bottom' style='" + bottomAlignStyle + "'>" +
                escapeHtml(task.bottomAttr) +
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
  function renderLane(laneName, taskList, colors, options) {
    var count = taskList ? taskList.length : 0;
    var headerText = getLaneHeader(laneName); // Get display text for header
    var headerLabel = escapeHtml(headerText) + " (" + count + ")";
    return (
      "<div class='kanban-column'>" +
        "<div class='kanban-column-header'>" +
           headerLabel +
        "</div>" +
        "<div class='kanban-card-list'>" +
           taskList.map(function(task) { return renderCard(task, colors, options); }).join("") +
        "</div>" +
      "</div>"
    );
  }

  /**
   * Tooltip and selection event handler (delegated)
   */
  function detachEventHandlers(selfRef) {
    if (!selfRef || !selfRef._boundRootElem || !selfRef._boundHandlers) return;
    var rootElem = selfRef._boundRootElem;
    var handlers = selfRef._boundHandlers;
    if (handlers.mousemove) rootElem.removeEventListener('mousemove', handlers.mousemove);
    if (handlers.mouseleave) rootElem.removeEventListener('mouseleave', handlers.mouseleave);
    if (handlers.mouseout) rootElem.removeEventListener('mouseout', handlers.mouseout);
    if (handlers.scroll) rootElem.removeEventListener('scroll', handlers.scroll);
    if (handlers.click) rootElem.removeEventListener('click', handlers.click);
    selfRef._boundRootElem = null;
    selfRef._boundHandlers = null;
  }

  function attachEventHandlers(rootElem, selfRef) {
    if (!rootElem || !selfRef) return;
    if (selfRef._boundRootElem === rootElem && selfRef._boundHandlers) return;
    detachEventHandlers(selfRef);

    var handlers = {};

    // Tooltip handlers
    handlers.mousemove = function(e) {
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
    };
    rootElem.addEventListener('mousemove', handlers.mousemove);

    handlers.mouseleave = function() {
      selfRef._hideTooltip();
    };
    rootElem.addEventListener('mouseleave', handlers.mouseleave);

    handlers.mouseout = function(e) {
      var to = e.relatedTarget;
      if (!to || !rootElem.contains(to)) {
        selfRef._hideTooltip();
      }
    };
    rootElem.addEventListener('mouseout', handlers.mouseout);

    handlers.scroll = function() {
      selfRef._hideTooltip();
    };
    rootElem.addEventListener('scroll', handlers.scroll, { passive: true });

    // SELECTION EVENT HANDLERS
    handlers.click = function(e) {
      var titleLink = e.target.closest && e.target.closest('.kanban-card-title-link');
      if (titleLink) {
        e.stopPropagation();
        return;
      }

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
    };
    rootElem.addEventListener('click', handlers.click);

    selfRef._boundRootElem = rootElem;
    selfRef._boundHandlers = handlers;
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
      var oLogicalDataModel = null;
      var oDataModel = null;
      try {
        if (oTransientRenderingContext && typeof oTransientRenderingContext.get === "function") {
          oDataLayout = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_LAYOUT);
          try {
            if (dataviz.DataContextProperty.LOGICAL_DATA_MODEL) {
              oLogicalDataModel = oTransientRenderingContext.get(dataviz.DataContextProperty.LOGICAL_DATA_MODEL);
            }
          } catch (_) {}
          try {
            if (dataviz.DataContextProperty.DATA_MODEL) {
              oDataModel = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_MODEL);
            }
          } catch (_) {}
        }
      } catch (eDL) {
        try { _logger.warn("No DATA_LAYOUT in render context", eDL); } catch(_) {}
      }
      
      this._currentDataLayout = oDataLayout;
      this._currentLogicalDataModel = oLogicalDataModel || null;
      this._currentDataModel = oDataModel || this.getRootDataModel() || null;

      // Get user's date format preference
      var options = this.getViewConfig() || {};
      this._fillDefaultOptions(options);
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

      var metaText = messages.TASK_COUNT_LABEL + ": <strong>" + (tasks ? tasks.length : 0) + "</strong>";
      var flaggedRedCount = tasks.filter(function(t) { return t.conditionFlagRed; }).length;
      var flaggedYellowCount = tasks.filter(function(t) { return t.conditionFlagYellow && !t.conditionFlagRed; }).length;
      if (flaggedRedCount > 0 || flaggedYellowCount > 0) {
        var flagParts = [];
        if (flaggedRedCount > 0) flagParts.push(messages.OVERDUE_LABEL + ": <strong>" + flaggedRedCount + "</strong>");
        if (flaggedYellowCount > 0) flagParts.push(messages.DUE_IN_30_DAYS_LABEL + ": <strong>" + flaggedYellowCount + "</strong>");
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
        return renderLane(laneName, grouped[laneName] || [], flagColors, options);
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
            var currentContainer = self.getContainerElem();
            if (!currentContainer) return;
            var currentBoardEl = currentContainer.querySelector('.kanban-board');
            if (!currentBoardEl) return;
            var headerEl2 = currentContainer.querySelector('.kanban-header');
            var headerH2 = headerEl2 ? headerEl2.offsetHeight : 0;
            var containerH2 = currentContainer.clientHeight || 0;
            var availableH2 = Math.max(0, containerH2 - headerH2);
            if (availableH2 <= 0) {
              availableH2 = Math.max(240, Math.floor(window.innerHeight * 0.6));
            }
            currentBoardEl.style.height = availableH2 + 'px';
            currentBoardEl.style.maxHeight = availableH2 + 'px';
            currentBoardEl.style.overflowY = 'auto';
            applyResponsiveLaneWidths(currentBoardEl, { gap: gapPx, minLane: 140, maxLane: 300 });
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
    if (!oOptions) return oOptions;

    // Date format default
    oOptions.dateFormat = jsx.defaultParam(oOptions.dateFormat, "yyyy-MM-dd");
    oOptions.showCompletionPct = jsx.defaultParam(oOptions.showCompletionPct, "true");
    oOptions.row1Alignment = jsx.defaultParam(oOptions.row1Alignment, "center");
    oOptions.row4Alignment = jsx.defaultParam(oOptions.row4Alignment, "center");
    oOptions.row5Alignment = jsx.defaultParam(oOptions.row5Alignment, "left");

    // Condition colors - now using hex values directly
    oOptions.redColorValue = jsx.defaultParam(oOptions.redColorValue, "red");
    oOptions.redColorCSS = jsx.defaultParam(oOptions.redColorCSS, "#ffe5e5");
    oOptions.redFlagBorder = jsx.defaultParam(oOptions.redFlagBorder, "#e09393");

    oOptions.yellowColorValue = jsx.defaultParam(oOptions.yellowColorValue, "yellow");
    oOptions.yellowColorCSS = jsx.defaultParam(oOptions.yellowColorCSS, "#fff9e5");
    oOptions.yellowFlagBorder = jsx.defaultParam(oOptions.yellowFlagBorder, "#e0d093");

    this.getSettings().setViewConfigJSON(dataviz.SettingsNS.CHART, oOptions);
    return oOptions;
  };

  /**
   * Additional visualization properties are exposed through the OAC properties dialog.
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

    if (sGadgetID === "showCompletionPct") {
      conf.showCompletionPct = oPropChange.value;
      oViewSettings.setViewConfigJSON(dataviz.SettingsNS.CHART, conf);
      bUpdateSettings = true;
    }

    if (sGadgetID === "row1Alignment" || sGadgetID === "row4Alignment" || sGadgetID === "row5Alignment") {
      conf[sGadgetID] = oPropChange.value;
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

  KanbanViz.prototype._addVizSpecificPropsDialog = function(oTabbedPanelsGadgetInfo) {
    KanbanViz.superClass._addVizSpecificPropsDialog.call(this, oTabbedPanelsGadgetInfo);
    this.doAddVizSpecificPropsDialog(this, oTabbedPanelsGadgetInfo);
  };

  KanbanViz.prototype.doAddVizSpecificPropsDialog = function(oTransientRenderingContext, oTabbedPanelsGadgetInfo) {
    jsx.assertObject(oTransientRenderingContext, "oTransientRenderingContext");
    jsx.assertInstanceOf(oTabbedPanelsGadgetInfo, gadgets.TabbedPanelsGadgetInfo, "oTabbedPanelsGadgetInfo", "obitech-application/gadgets.TabbedPanelsGadgetInfo");

    var options = this._fillDefaultOptions(this.getViewConfig() || {});
    var generalPanel = gadgetdialog.forcePanelByID(oTabbedPanelsGadgetInfo, euidef.GD_PANEL_ID_GENERAL);
    generalPanel.setBodyCSSClass("bi_gadgets_no_cell_separator");
    var nOrder = euidef.GD_FIELD_ORDER_GENERAL_VIZ_SPECIFIC;

    var booleanOptions = [
      new gadgets.OptionInfo('true', 'On'),
      new gadgets.OptionInfo('false', 'Off')
    ];
    var alignmentOptions = [
      new gadgets.OptionInfo('left', 'Left'),
      new gadgets.OptionInfo('center', 'Center'),
      new gadgets.OptionInfo('right', 'Right')
    ];

    nOrder += 1;
    var showCompletionPctInfo = new gadgets.TextSwitcherGadgetInfo(
      'showCompletionPct',
      'Show % Completion',
      'Show % Completion',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(options.showCompletionPct)),
      nOrder,
      null,
      booleanOptions
    );
    showCompletionPctInfo.setGroupName('kanbanviz_props');
    generalPanel.addChild(showCompletionPctInfo);

    nOrder += 1;
    var row1AlignmentInfo = new gadgets.TextSwitcherGadgetInfo(
      'row1Alignment',
      'Attribute 1: Alignement',
      'Attribute 1: Alignement',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(options.row1Alignment)),
      nOrder,
      null,
      alignmentOptions
    );
    row1AlignmentInfo.setGroupName('kanbanviz_props');
    generalPanel.addChild(row1AlignmentInfo);

    nOrder += 1;
    var row4AlignmentInfo = new gadgets.TextSwitcherGadgetInfo(
      'row4Alignment',
      'Attribute 2: Alignement',
      'Attribute 2: Alignement',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(options.row4Alignment)),
      nOrder,
      null,
      alignmentOptions
    );
    row4AlignmentInfo.setGroupName('kanbanviz_props');
    generalPanel.addChild(row4AlignmentInfo);

    nOrder += 1;
    var row5AlignmentInfo = new gadgets.TextSwitcherGadgetInfo(
      'row5Alignment',
      'Attribute 3: Alignement',
      'Attribute 3: Alignement',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(options.row5Alignment)),
      nOrder,
      null,
      alignmentOptions
    );
    row5AlignmentInfo.setGroupName('kanbanviz_props');
    generalPanel.addChild(row5AlignmentInfo);

    if (KanbanViz.superClass.doAddVizSpecificPropsDialog) {
      KanbanViz.superClass.doAddVizSpecificPropsDialog.apply(this, arguments);
    }
  };

  KanbanViz.prototype.handlePropChange = function() {
    return this._handlePropChange.apply(this, arguments);
  };

  KanbanViz.prototype.addVizSpecificPropsDialog = function() {
    return this._addVizSpecificPropsDialog.apply(this, arguments);
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
