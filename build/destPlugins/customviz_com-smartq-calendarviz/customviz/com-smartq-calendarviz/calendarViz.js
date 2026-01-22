/**
 * Oracle Analytics Cloud Custom Visualization - Calendar View
 *
 * This visualization displays tasks in a calendar grid format organized by weeks and dates.
 * Tasks are positioned on their completion date (Rok izvedbe).
 */
define([
    'jquery',
    'obitech-framework/jsx',
    'obitech-report/datavisualization',
    'obitech-reportservices/datamodelshapes',
    'obitech-reportservices/data',
    'obitech-reportservices/events',
    'obitech-reportservices/interactionservice',
    'obitech-appservices/logger',
    'com-smartq-calendarviz/colorConfig',
    'com-smartq-calendarviz/nls/root/messages',
    'com-smartq-calendarviz/nls/sl/messages',
    'css!com-smartq-calendarviz/calendarVizstyles'
], function($, jsx, dataviz, datamodelshapes, data, events, interactions, logger, colorConfig, messages_en, messages_sl) {
    'use strict';

    var MODULE_NAME = "CalendarViz";
    var _logger = new logger.Logger(MODULE_NAME);

    // ========================================================================
    // LOCALIZATION (NLS) - Language support
    // Translations loaded from external NLS files:
    // - com-smartq-calendarviz/nls/root/messages.js (English)
    // - com-smartq-calendarviz/nls/sl/messages.js (Slovenian)
    // ========================================================================

    /**
     * Helper function to build arrays from individual NLS properties
     */
    function buildMessagesWithArrays(nlsMessages) {
        var msgs = {};

        // Copy all properties from NLS file
        for (var key in nlsMessages) {
            if (nlsMessages.hasOwnProperty(key)) {
                msgs[key] = nlsMessages[key];
            }
        }

        // Build MONTH_NAMES array from individual month properties
        msgs.MONTH_NAMES = [
            nlsMessages.MONTH_JANUARY,
            nlsMessages.MONTH_FEBRUARY,
            nlsMessages.MONTH_MARCH,
            nlsMessages.MONTH_APRIL,
            nlsMessages.MONTH_MAY,
            nlsMessages.MONTH_JUNE,
            nlsMessages.MONTH_JULY,
            nlsMessages.MONTH_AUGUST,
            nlsMessages.MONTH_SEPTEMBER,
            nlsMessages.MONTH_OCTOBER,
            nlsMessages.MONTH_NOVEMBER,
            nlsMessages.MONTH_DECEMBER
        ];

        // Build MONTH_NAMES_SHORT array from individual short month properties
        msgs.MONTH_NAMES_SHORT = [
            nlsMessages.MONTH_JAN_SHORT,
            nlsMessages.MONTH_FEB_SHORT,
            nlsMessages.MONTH_MAR_SHORT,
            nlsMessages.MONTH_APR_SHORT,
            nlsMessages.MONTH_MAY_SHORT,
            nlsMessages.MONTH_JUN_SHORT,
            nlsMessages.MONTH_JUL_SHORT,
            nlsMessages.MONTH_AUG_SHORT,
            nlsMessages.MONTH_SEP_SHORT,
            nlsMessages.MONTH_OCT_SHORT,
            nlsMessages.MONTH_NOV_SHORT,
            nlsMessages.MONTH_DEC_SHORT
        ];

        // Build DAY_NAMES array from individual day properties
        msgs.DAY_NAMES = [
            nlsMessages.DAY_MONDAY,
            nlsMessages.DAY_TUESDAY,
            nlsMessages.DAY_WEDNESDAY,
            nlsMessages.DAY_THURSDAY,
            nlsMessages.DAY_FRIDAY,
            nlsMessages.DAY_SATURDAY,
            nlsMessages.DAY_SUNDAY
        ];

        return msgs;
    }

    var messages;

    // Detect browser language and load appropriate messages
    (function() {
        try {
            var userLang = navigator.language || navigator.userLanguage || 'en';
            userLang = userLang.toLowerCase();

            console.log('[CalendarViz] Detected browser language:', userLang);

            // Check for Slovenian (sl, sl-SI, etc.)
            if (userLang.indexOf('sl') === 0) {
                messages = buildMessagesWithArrays(messages_sl);
                console.log('[CalendarViz] Using Slovenian translations from NLS file');
            } else {
                messages = buildMessagesWithArrays(messages_en);
                console.log('[CalendarViz] Using English translations from NLS file (default)');
            }
        } catch (e) {
            console.log('[CalendarViz] Error detecting language, using English:', e);
            messages = buildMessagesWithArrays(messages_en);
        }
    })();
    // ========================================================================

    // ========================================================================
    // GRAMMAR CONFIGURATION - Set these values to match your visualization setup
    // ========================================================================
    // IMPORTANT: Adjust these numbers based on how many columns you add to each grammar slot!
    //
    // Current setup: 3 columns in Rows (ID, Task Name, Date), 1 in Color, 2 in Tooltip
    //
    // Layer mapping:
    //   Layer 0: ID (Rows - 1st column)
    //   Layer 1: Task Name (Rows - 2nd column)
    //   Layer 2: Date (Rows - 3rd column)
    //   Layer 3: Color Category (Color placeholder) - for left edge stripe
    //   Layer 4: RED condition flag (Tooltip - 1st column) - for red background
    //   Layer 5: YELLOW condition flag (Tooltip - 2nd column) - for yellow background
    //
    // The first 2 tooltip columns will always be used for red/yellow color flags
    // ========================================================================
    var CALENDAR_CONFIG = {
        rowCount: 3,      // Number of columns in Rows grammar (ID, Task Name, Date)
        colorCount: 1     // Number of columns in Color grammar (0 or 1)
    };
    // ========================================================================

    // ========================================================================
    // COLOR CONFIGURATION - Loaded from external colorConfig.js file
    // ========================================================================
    // To customize colors, edit the colorConfig.js file in this plugin folder
    var CALENDAR_COLORS = colorConfig;

    console.log('[CalendarViz] Loaded color configuration:', CALENDAR_COLORS);
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
            if (tasks[i].colorCategory) {
                uniqueCategories[tasks[i].colorCategory] = true;
            }
        }

        // Sort categories alphabetically
        var sortedCategories = Object.keys(uniqueCategories).sort();

        // Map each category to a color in order
        CATEGORY_COLOR_MAP = {};
        var palette = CALENDAR_COLORS.categoryPalette;
        for (var i = 0; i < sortedCategories.length; i++) {
            var colorIndex = i % palette.length; // Cycle through palette if more categories than colors
            CATEGORY_COLOR_MAP[sortedCategories[i]] = palette[colorIndex];
        }

        console.log("[CalendarViz] Category color mapping:", CATEGORY_COLOR_MAP);
    }

    /**
     * Get color for category stripe (ordered by alphabetical sorting)
     */
    function getColorForCategory(categoryValue) {
        if (!categoryValue || categoryValue === "") return null;
        if (CATEGORY_COLOR_MAP === null) return null; // Not initialized yet

        return CATEGORY_COLOR_MAP[categoryValue] || null;
    }

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
            console.log('[CalendarViz] Converting old format:', format, '→', formatMap[format]);
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

        // Month names from translations
        var monthNames = messages.MONTH_NAMES_SHORT;
        var monthNamesLong = messages.MONTH_NAMES;
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

        return result;
    }

    /**
     * Main Calendar Visualization Component
     */
    function CalendarVisualization(sID, sDisplayName, sOrigin, sVersion) {
        CalendarVisualization.baseConstructor.call(this, sID, sDisplayName, sOrigin, sVersion);

        this._selectedTasks = [];
        this._tooltipElement = null;
        this._currentMonth = new Date();
        this._tasks = [];
    }

    // Inherit from dataviz.DataVisualization base class
    jsx.extend(CalendarVisualization, dataviz.DataVisualization);

    /**
     * Initialize the visualization (optional override)
     */
    CalendarVisualization.prototype.initialize = function(oCfg) {
        CalendarVisualization.superclass.initialize.call(this, oCfg);
        _logger.info("CalendarViz initialized");

        // Set up resize handler
        var self = this;
        $(window).on('resize', function() {
            self.resizeVisualization();
        });
    };

    /**
     * SELECTION HANDLING: Fire selection event to enable "Use as filter"
     */
    CalendarVisualization.prototype._fireSelectionEvent = function(task, isCtrlKey) {
        var self = this;

        // Clear any pending selection timeout
        if (this._selectionTimeout) {
            clearTimeout(this._selectionTimeout);
        }

        try {
            if (!task || typeof task.rowIndex !== "number") {
                _logger.warn("[CalendarViz] _fireSelectionEvent: invalid task", task);
                return;
            }

            // Marking service is the standard way DV supports Use as Filter
            if (typeof this.getMarkingService !== "function") {
                _logger.warn("[CalendarViz] _fireSelectionEvent: getMarkingService() not available");
                return;
            }

            var oDataLayout = this._currentDataLayout;
            if (!oDataLayout) {
                _logger.warn("[CalendarViz] _fireSelectionEvent: no current data layout");
                return;
            }

            var oMarkingService = this.getMarkingService();
            if (!oMarkingService) {
                _logger.warn("[CalendarViz] _fireSelectionEvent: marking service not available");
                return;
            }

            // Ensure local selection array exists
            if (!Array.isArray(this._selectedTasks)) {
                this._selectedTasks = [];
            }

            var rowIdx = task.rowIndex;

            if (!isCtrlKey) {
                this._selectedTasks = [rowIdx];
            } else {
                var existingIdx = this._selectedTasks.indexOf(rowIdx);
                if (existingIdx === -1) {
                    this._selectedTasks.push(rowIdx);
                } else {
                    this._selectedTasks.splice(existingIdx, 1);
                }
            }

            // Clear previous marks
            try {
                if (typeof oMarkingService.clearMarksForDataLayout === "function") {
                    oMarkingService.clearMarksForDataLayout(oDataLayout);
                }
            } catch (eClear) {
                _logger.warn("[CalendarViz] _fireSelectionEvent: clearMarksForDataLayout failed", eClear);
            }

            // Apply marks on ROW axis
            try {
                if (typeof oMarkingService.setMark === "function") {
                    for (var i = 0; i < this._selectedTasks.length; i++) {
                        var selRow = this._selectedTasks[i];
                        oMarkingService.setMark(
                            oDataLayout,
                            datamodelshapes.Physical.ROW,
                            0,
                            selRow
                        );
                    }
                }

                // Publish mark event with a small delay to avoid conflicts
                this._selectionTimeout = setTimeout(function() {
                    try {
                        if (typeof self._publishMarkEvent === "function") {
                            self._publishMarkEvent(oDataLayout);
                        }
                    } catch (ePub) {
                        _logger.warn("[CalendarViz] _fireSelectionEvent: _publishMarkEvent failed", ePub);
                    }
                }, 50); // Small delay to ensure marks are set first
            } catch (eMark) {
                _logger.error("[CalendarViz] _fireSelectionEvent: setMark failed", eMark);
            }

            if (typeof this._updateCardSelectionVisuals === "function") {
                this._updateCardSelectionVisuals();
            }

            _logger.info("[CalendarViz] Selection updated for " + this._selectedTasks.length + " task(s)")

        } catch (eOuter) {
            _logger.error("CalendarViz._fireSelectionEvent: unexpected error", eOuter);
        }
    };

    /**
     * Clear selection
     */
    CalendarVisualization.prototype._clearSelection = function() {
        var self = this;

        // Clear any pending selection timeout
        if (this._selectionTimeout) {
            clearTimeout(this._selectionTimeout);
        }

        this._selectedTasks = [];

        try {
            var oDataLayout = this._currentDataLayout;
            var oMarkingService = (typeof this.getMarkingService === "function") ? this.getMarkingService() : null;
            if (oDataLayout && oMarkingService && typeof oMarkingService.clearMarksForDataLayout === "function") {
                oMarkingService.clearMarksForDataLayout(oDataLayout);
                try {
                    // Publish mark event with a small delay
                    this._selectionTimeout = setTimeout(function() {
                        if (typeof self._publishMarkEvent === "function") {
                            self._publishMarkEvent(oDataLayout);
                        }
                    }, 50);
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
    CalendarVisualization.prototype._publishMarkEvent = function(oDataLayout, eMarkContext) {
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
    CalendarVisualization.prototype._updateCardSelectionVisuals = function() {
        var elContainer = this.getContainerElem();
        if (!elContainer) return;

        var allCards = elContainer.querySelectorAll('.calendar-task');
        for (var i = 0; i < allCards.length; i++) {
            var card = allCards[i];
            var rowIndex = parseInt(card.getAttribute('data-row'), 10);

            if (this._selectedTasks.indexOf(rowIndex) >= 0) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
    };

    /**
     * Main render function - builds the calendar view
     */
    CalendarVisualization.prototype.render = function(oTransientRenderingContext) {
        try {
            _logger.info("CalendarViz render called");

            // Get container
            var container = this.getContainerElem();

            // Extract data layout from rendering context (like kanbanViz does)
            var oDataLayout = null;
            try {
                if (oTransientRenderingContext && typeof oTransientRenderingContext.get === "function") {
                    oDataLayout = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_LAYOUT);
                }
            } catch (error) {
                _logger.warn("No DATA_LAYOUT in render context", error);
            }

            if (!oDataLayout) {
                _logger.warn("No data layout provided");
                container.innerHTML = '<div class="calendar-error">No data provided. Please add columns to Rows placeholder.</div>';
                this._setIsRendered(true);
                return;
            }

            // Check if we have the minimum required data using data model (like kanbanViz)
            var oDataModel = this.getRootDataModel();
            var rowCols = [];
            try {
                if (oDataModel) {
                    rowCols = oDataModel.getColumnIDsIn(datamodelshapes.Physical.ROW) || [];
                }
            } catch (e) {
                rowCols = [];
            }

            if (rowCols.length < 2) {
                var columnCount = rowCols.length;
                container.innerHTML = '<div class="calendar-error">' +
                    '<p><strong>Calendar View requires at least 2 columns in Rows</strong></p>' +
                    '<p>Currently have: ' + columnCount + ' column(s)</p>' +
                    '<ol>' +
                    '<li><strong>Column 1:</strong> Task Name (required)</li>' +
                    '<li><strong>Column 2:</strong> Date / Rok izvedbe (required)</li>' +
                    '<li><strong>Column 3-4:</strong> Additional details (optional)</li>' +
                    '</ol>' +
                    '<p>Please add the required columns to the Rows placeholder.</p>' +
                    '</div>';
                this._setIsRendered(true);
                return;
            }

            // Store current data layout for marking/selection service
            this._currentDataLayout = oDataLayout;

            // Get user's date format preference
            var options = this.getViewConfig() || {};
            this._dateFormat = options.dateFormat || "yyyy-MM-dd";
            console.log("CalendarViz: Using date format:", this._dateFormat);

            // Extract tasks from data layout
            this._tasks = this._extractTasks(oDataLayout);
            try {
                _logger.info("Extracted " + this._tasks.length + " tasks");
            } catch (e) {
                console.log("Extracted " + this._tasks.length + " tasks");
            }

            // Show message if no valid tasks were extracted
            if (this._tasks.length === 0) {
                container.innerHTML = '<div class="calendar-error">' +
                    '<p><strong>No valid tasks found</strong></p>' +
                    '<p>Make sure the 2nd column (Date) contains valid date values.</p>' +
                    '<p>Check browser console for detailed error messages.</p>' +
                    '</div>';
                this._setIsRendered(true);
                return;
            }

            // Build calendar HTML
            var calendarHtml = this._buildCalendarHtml();

            // Render
            container.innerHTML = calendarHtml;

            // Attach event handlers
            this._attachEventHandlers();

            // Mark as rendered - REQUIRED by Oracle Analytics
            this._setIsRendered(true);

        } catch (error) {
            _logger.error("Error rendering calendar: " + error.message);
            var container = this.getContainerElem();
            if (container) {
                container.innerHTML = '<div class="calendar-error">Error rendering calendar: ' + error.message + '</div>';
            }
            this._setIsRendered(true);
        }
    };

    /**
     * Extract task data from OAC data layout (following kanbanViz pattern)
     */
    CalendarVisualization.prototype._extractTasks = function(oDataLayout) {
        var tasks = [];

        try {
            if (!oDataLayout) {
                console.warn("CalendarViz: No data layout provided to _extractTasks");
                return tasks;
            }

            // Get data model and column IDs (like kanbanViz)
            var oDataModel = this.getRootDataModel();
            if (!oDataModel) {
                console.warn("CalendarViz: No data model available");
                return tasks;
            }

            // Get all columns on the ROW edge
            var rowCols = [];
            try {
                rowCols = oDataModel.getColumnIDsIn(datamodelshapes.Physical.ROW) || [];
            } catch (e) {
                console.error("CalendarViz: Error getting column IDs:", e);
                return tasks;
            }

            console.log("CalendarViz: Found " + rowCols.length + " columns in Physical.ROW");

            if (rowCols.length < 2) {
                console.warn("CalendarViz: Need at least 2 columns: task name and date");
                return tasks;
            }

            // Separate columns based on grammar slot configuration
            // Oracle Analytics places columns in Physical.ROW in this order:
            // 1. ROW grammar columns (0 to rowCount-1)
            // 2. COLOR grammar column (if colorCount = 1)
            // 3. TOOLTIP grammar columns (remaining)
            var rowRoleCount = CALENDAR_CONFIG.rowCount || 2;
            var colorRoleCount = CALENDAR_CONFIG.colorCount || 0;

            var rowRoleColumns = [];
            var colorRoleColumns = [];
            var tooltipRoleColumns = [];

            for (var i = 0; i < rowCols.length; i++) {
                if (i < rowRoleCount) {
                    rowRoleColumns.push(rowCols[i]);
                } else if (i < rowRoleCount + colorRoleCount) {
                    colorRoleColumns.push(rowCols[i]);
                } else {
                    tooltipRoleColumns.push(rowCols[i]);
                }
            }

            console.log("CalendarViz: Config - ROW:", rowRoleCount, "COLOR:", colorRoleCount);
            console.log("CalendarViz: Separated - ROW:", rowRoleColumns.length, "COLOR:", colorRoleColumns.length, "TOOLTIP:", tooltipRoleColumns.length);

            // Column assignments (3 ROW columns: ID, Task Name, Date)
            var idColId = rowRoleColumns[0] || null;            // Layer 0: ID (required)
            var taskColId = rowRoleColumns[1] || null;          // Layer 1: Task name (required)
            var dateColId = rowRoleColumns[2] || null;          // Layer 2: Date (required)
            var colorColId = colorRoleColumns[0] || null;       // Color category

            if (!idColId || !taskColId || !dateColId) {
                console.warn("CalendarViz: Missing required columns (ID, task name, or date)");
                return tasks;
            }

            console.log("CalendarViz: Using ID column:", idColId, "task column:", taskColId, "and date column:", dateColId);

            // Get row count from data layout
            var rowCount = 0;
            try {
                rowCount = oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW) || 0;
            } catch (e) {
                console.error("CalendarViz: Error getting row count:", e);
                return tasks;
            }

            console.log("CalendarViz: Processing " + rowCount + " rows of data");

            // Iterate through all rows
            for (var r = 0; r < rowCount; r++) {
                var task = {};

                // Extract ID (required)
                try {
                    var idLayerIdx = rowCols.indexOf(idColId);
                    if (idLayerIdx >= 0) {
                        task.id = oDataLayout.getValue(datamodelshapes.Physical.ROW, idLayerIdx, r, false);
                        if (!task.id) task.id = "";
                    } else {
                        task.id = "";
                    }
                } catch (e) {
                    console.error("CalendarViz: Error extracting ID at row " + r + ":", e);
                    task.id = "";
                }

                // Extract task name (required)
                try {
                    var taskLayerIdx = rowCols.indexOf(taskColId);
                    if (taskLayerIdx >= 0) {
                        task.title = oDataLayout.getValue(datamodelshapes.Physical.ROW, taskLayerIdx, r, false);
                        if (!task.title) task.title = "Untitled";
                    } else {
                        task.title = "Untitled";
                    }
                } catch (e) {
                    console.error("CalendarViz: Error extracting task name at row " + r + ":", e);
                    task.title = "Untitled";
                }

                // Extract date (required)
                var dateValue = null;
                try {
                    var dateLayerIdx = rowCols.indexOf(dateColId);
                    if (dateLayerIdx >= 0) {
                        dateValue = oDataLayout.getValue(datamodelshapes.Physical.ROW, dateLayerIdx, r, false);
                    }
                } catch (e) {
                    console.error("CalendarViz: Error extracting date at row " + r + ":", e);
                }

                // Log first date value for debugging
                if (r === 0) {
                    console.log("CalendarViz: First date value type: " + typeof dateValue + ", value: " + dateValue);
                }

                task.date = this._parseDate(dateValue);
                if (!task.date) {
                    console.warn("CalendarViz: Invalid date at row " + r + ": " + JSON.stringify(dateValue));
                    continue; // Skip tasks without valid dates
                }

                // Extract color category
                if (colorColId) {
                    try {
                        var colorLayerIdx = rowCols.indexOf(colorColId);
                        if (colorLayerIdx >= 0) {
                            task.colorCategory = oDataLayout.getValue(datamodelshapes.Physical.ROW, colorLayerIdx, r, false) || "";
                        }
                    } catch (e) {
                        task.colorCategory = "";
                    }
                }

                // Extract measure value from VALUES (Physical.DATA) edge
                task.measureValue = null;
                try {
                    var measureVal = oDataLayout.getValue(datamodelshapes.Physical.DATA, r, 0);
                    if (measureVal !== null && measureVal !== undefined) {
                        task.measureValue = measureVal;
                    }
                } catch (e) {
                    // No measure value available
                }

                // Extract tooltip columns
                task.tooltips = [];
                for (var t = 0; t < tooltipRoleColumns.length; t++) {
                    try {
                        var tooltipColId = tooltipRoleColumns[t];
                        var tooltipLayerIdx = rowCols.indexOf(tooltipColId);
                        if (tooltipLayerIdx >= 0) {
                            var tooltipValue = oDataLayout.getValue(datamodelshapes.Physical.ROW, tooltipLayerIdx, r, false);
                            if (tooltipValue) {
                                task.tooltips.push(tooltipValue);
                            }
                        }
                    } catch (e) {
                        // Skip tooltip on error
                    }
                }

                // Check first two tooltip columns for condition flags (like kanbanViz)
                // 1st tooltip column: RED flag (deadline passed) - value = Y
                // 2nd tooltip column: YELLOW flag (30 day warning) - value = Y
                task.conditionFlagRed = false;
                task.conditionFlagYellow = false;

                if (task.tooltips.length >= 1) {
                    var redVal = task.tooltips[0];
                    if (redVal !== null && redVal !== undefined && String(redVal).trim() !== "") {
                        var redValLower = String(redVal).trim().toLowerCase();
                        // Check if value indicates "yes" (Y, Yes, D, Da, 1, TRUE, true)
                        if (redValLower === 'y' || redValLower === 'yes' ||
                            redValLower === 'd' || redValLower === 'da' ||
                            redValLower === '1' || redValLower === 'true') {
                            task.conditionFlagRed = true;
                        }
                    }
                }

                if (task.tooltips.length >= 2) {
                    var yellowVal = task.tooltips[1];
                    if (yellowVal !== null && yellowVal !== undefined && String(yellowVal).trim() !== "") {
                        var yellowValLower = String(yellowVal).trim().toLowerCase();
                        // Check if value indicates "yes" (Y, Yes, D, Da, 1, TRUE, true)
                        if (yellowValLower === 'y' || yellowValLower === 'yes' ||
                            yellowValLower === 'd' || yellowValLower === 'da' ||
                            yellowValLower === '1' || yellowValLower === 'true') {
                            task.conditionFlagYellow = true;
                        }
                    }
                }

                // Store row index for selection
                task.rowIndex = r;

                // Build tooltip HTML (like kanbanViz)
                task.tooltipHtml = this._buildTooltipHtml(task);

                tasks.push(task);
            }

        } catch (error) {
            console.error("CalendarViz: Error extracting tasks:", error);
        }

        console.log("CalendarViz: Extracted " + tasks.length + " valid tasks");

        // Initialize category color mapping with alphabetically-sorted order
        initializeCategoryColorMap(tasks);

        return tasks;
    };

    /**
     * Build tooltip HTML for task (like kanbanViz)
     */
    CalendarVisualization.prototype._buildTooltipHtml = function(task) {
        var html = '';
        var self = this;

        function escapeHtml(text) {
            if (!text) return '';
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ID
        if (task.id) {
            html += '<div class="ct-line"><span class="ct-k">ID:</span> <span class="ct-v">' + escapeHtml(task.id) + '</span></div>';
        }

        // Task name (Title)
        if (task.title) {
            html += '<div class="ct-line"><span class="ct-k">Naloga:</span> <span class="ct-v"><strong>' + escapeHtml(task.title) + '</strong></span></div>';
        }

        // Date
        if (task.date) {
            var dateFormat = this._dateFormat || "yyyy-MM-dd";
            var dateDisplay = formatDate(task.date, dateFormat);
            html += '<div class="ct-line"><span class="ct-k">Datum:</span> <span class="ct-v">' + escapeHtml(dateDisplay) + '</span></div>';
        }

        // Color category (if present)
        if (task.colorCategory) {
            html += '<div class="ct-line"><span class="ct-k">Status:</span> <span class="ct-v">' + escapeHtml(task.colorCategory) + '</span></div>';
        }

        // Additional tooltip columns (skip first 2 which are condition flags)
        if (task.tooltips && task.tooltips.length > 2) {
            for (var i = 2; i < task.tooltips.length; i++) {
                if (task.tooltips[i] !== null && task.tooltips[i] !== undefined && String(task.tooltips[i]).trim() !== "") {
                    html += '<div class="ct-line">' + escapeHtml(String(task.tooltips[i])) + '</div>';
                }
            }
        }

        return html;
    };

    /**
     * Extract value from column data at specific index
     */
    CalendarVisualization.prototype._extractValue = function(column, index) {
        if (!column || !column.data || index >= column.data.length) {
            return null;
        }

        var value = column.data[index];

        // Handle different value types
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'object' && value.value !== undefined) {
            return value.value;
        }

        return value;
    };

    /**
     * Parse date from various formats
     */
    CalendarVisualization.prototype._parseDate = function(dateValue) {
        if (!dateValue) {
            return null;
        }

        // If already a Date object
        if (dateValue instanceof Date) {
            return dateValue;
        }

        // If it's a timestamp number (milliseconds since epoch)
        if (typeof dateValue === 'number') {
            var date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        // If it's a string
        if (typeof dateValue === 'string') {
            // Try parsing as ISO date
            var parsed = new Date(dateValue);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }

            // Try parsing as date string with time
            var timestamp = Date.parse(dateValue);
            if (!isNaN(timestamp)) {
                return new Date(timestamp);
            }
        }

        // If it's an object with a value property (OAC sometimes wraps values)
        if (typeof dateValue === 'object' && dateValue !== null) {
            if (dateValue.value !== undefined) {
                return this._parseDate(dateValue.value);
            }

            // Check if it's a date-like object with getTime method
            if (typeof dateValue.getTime === 'function') {
                return dateValue;
            }
        }

        _logger.warn("Could not parse date value: " + JSON.stringify(dateValue) + " (type: " + typeof dateValue + ")");
        return null;
    };

    /**
     * Build the calendar HTML structure
     */
    CalendarVisualization.prototype._buildCalendarHtml = function() {
        var html = '<div class="calendar-container">';

        // Add month header with navigation
        html += this._buildMonthHeader();

        // Add summary bar with task statistics
        html += this._buildSummaryBar();

        // Add day headers (Mon, Tue, Wed, etc.)
        html += this._buildDayHeaders();

        // Add calendar grid with weeks and dates
        html += this._buildCalendarGrid();

        html += '</div>';

        return html;
    };

    /**
     * Build month header with navigation
     */
    CalendarVisualization.prototype._buildMonthHeader = function() {
        var monthNames = messages.MONTH_NAMES;

        // Use _currentMonth or default to today (but don't modify _currentMonth here)
        var displayDate = this._currentMonth;
        if (!(displayDate instanceof Date) || isNaN(displayDate.getTime())) {
            displayDate = new Date();
        }

        var month = displayDate.getMonth();
        var year = displayDate.getFullYear();
        var currentYear = new Date().getFullYear();

        var html = '<div class="calendar-header">';

        // Previous month button
        html += '<button class="calendar-nav-btn calendar-nav-btn-small" data-action="prev-month" title="' + messages.PREV_MONTH_TOOLTIP + '">';
        html += '<span class="calendar-nav-arrow">&lt;</span>';
        html += '</button>';

        // Month selector
        html += '<select class="calendar-month-select" data-action="select-month">';
        for (var m = 0; m < 12; m++) {
            var selected = (m === month) ? ' selected' : '';
            html += '<option value="' + m + '"' + selected + '>' + monthNames[m] + '</option>';
        }
        html += '</select>';

        // Year selector (current year -5 to +5)
        html += '<select class="calendar-year-select" data-action="select-year">';
        for (var y = currentYear - 5; y <= currentYear + 5; y++) {
            var selected = (y === year) ? ' selected' : '';
            html += '<option value="' + y + '"' + selected + '>' + y + '</option>';
        }
        html += '</select>';

        // Today button
        html += '<button class="calendar-today-btn" data-action="today" title="' + messages.GOTO_TODAY_TOOLTIP + '">' + messages.TODAY_BUTTON + '</button>';

        // Next month button
        html += '<button class="calendar-nav-btn calendar-nav-btn-small" data-action="next-month" title="' + messages.NEXT_MONTH_TOOLTIP + '">';
        html += '<span class="calendar-nav-arrow">&gt;</span>';
        html += '</button>';

        html += '</div>';

        return html;
    };

    /**
     * Build summary bar with task statistics
     */
    CalendarVisualization.prototype._buildSummaryBar = function() {
        if (!this._tasks || this._tasks.length === 0) {
            return '';
        }

        // Count total tasks
        var totalTasks = this._tasks.length;

        // Count tasks by status flags
        var overdueCount = 0;
        var dueSoonCount = 0;

        for (var i = 0; i < this._tasks.length; i++) {
            if (this._tasks[i].conditionFlagRed) {
                overdueCount++;
            } else if (this._tasks[i].conditionFlagYellow) {
                dueSoonCount++;
            }
        }

        // Calculate tasks within 30 days from today
        var today = new Date();
        var thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        var upcomingCount = 0;
        for (var i = 0; i < this._tasks.length; i++) {
            var taskDate = this._tasks[i].date;
            if (taskDate >= today && taskDate <= thirtyDaysFromNow) {
                upcomingCount++;
            }
        }

        // Build statistics section
        var html = '<div class="calendar-summary-bar">';
        html += '<div class="calendar-summary-stats">';
        html += '<strong>' + messages.CALENDAR_TITLE + '</strong> ' + messages.TASK_COUNT_LABEL + ': <strong>' + totalTasks + '</strong>';

        if (overdueCount > 0) {
            html += ' | ' + messages.OVERDUE_LABEL + ': <strong>' + overdueCount + '</strong>';
        }

        if (upcomingCount > 0) {
            html += ', ' + messages.DUE_IN_30_DAYS_LABEL + ': <strong>' + upcomingCount + '</strong>';
        }
        html += '</div>';

        // Build color legend section
        var uniqueCategories = {};
        for (var i = 0; i < this._tasks.length; i++) {
            var cat = this._tasks[i].colorCategory;
            if (cat && cat !== "") {
                uniqueCategories[cat] = getColorForCategory(cat);
            }
        }

        var categoryKeys = Object.keys(uniqueCategories);
        if (categoryKeys.length > 0) {
            html += '<div class="calendar-summary-legend">';
            for (var i = 0; i < categoryKeys.length; i++) {
                var cat = categoryKeys[i];
                var color = uniqueCategories[cat];
                html += '<span class="calendar-legend-item">';
                html += '<span class="calendar-legend-color" style="background-color:' + color + ';"></span>';
                html += '<span class="calendar-legend-label">' + this._escapeHtml(cat) + '</span>';
                html += '</span>';
            }
            html += '</div>';
        }

        html += '</div>';

        return html;
    };

    /**
     * Build day headers (MON, TUE, WED, etc.)
     */
    CalendarVisualization.prototype._buildDayHeaders = function() {
        var dayNames = messages.DAY_NAMES;

        var html = '<div class="calendar-day-headers">';
        for (var i = 0; i < dayNames.length; i++) {
            html += '<div class="calendar-day-header">' + dayNames[i] + '</div>';
        }
        html += '</div>';

        return html;
    };

    /**
     * Build calendar grid with dates and tasks
     */
    CalendarVisualization.prototype._buildCalendarGrid = function() {
        var year = this._currentMonth.getFullYear();
        var month = this._currentMonth.getMonth();

        // Get first day of month and total days
        var firstDay = new Date(year, month, 1);
        var lastDay = new Date(year, month + 1, 0);
        var daysInMonth = lastDay.getDate();

        // Get day of week for first day (0=Sunday, 1=Monday, etc.)
        // Adjust to start week on Monday
        var startDay = firstDay.getDay();
        startDay = (startDay === 0) ? 6 : startDay - 1;

        // Group tasks by date
        var tasksByDate = this._groupTasksByDate();

        var html = '<div class="calendar-grid">';

        // Add empty cells for days before month starts
        for (var i = 0; i < startDay; i++) {
            html += '<div class="calendar-day calendar-day-empty"></div>';
        }

        // Add cells for each day of the month
        var today = new Date();
        var isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);

        for (var day = 1; day <= daysInMonth; day++) {
            var date = new Date(year, month, day);
            var dateKey = this._formatDateKey(date);
            var dayOfWeek = date.getDay();
            var isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            var isToday = (isCurrentMonth && today.getDate() === day);

            var dayClass = 'calendar-day';
            if (isWeekend) dayClass += ' calendar-day-weekend';
            if (isToday) dayClass += ' calendar-day-today';

            html += '<div class="' + dayClass + '" data-date="' + dateKey + '">';
            html += '<div class="calendar-day-number">' + day + '</div>';

            // Add tasks for this date
            var tasksForDate = tasksByDate[dateKey] || [];
            if (tasksForDate.length > 0) {
                html += '<div class="calendar-tasks">';
                for (var t = 0; t < tasksForDate.length; t++) {
                    html += this._buildTaskCard(tasksForDate[t]);
                }
                html += '</div>';
            }

            html += '</div>';
        }

        html += '</div>';

        return html;
    };

    /**
     * Group tasks by date
     */
    CalendarVisualization.prototype._groupTasksByDate = function() {
        var grouped = {};

        for (var i = 0; i < this._tasks.length; i++) {
            var task = this._tasks[i];
            if (task.date) {
                var dateKey = this._formatDateKey(task.date);
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(task);
            }
        }

        return grouped;
    };

    /**
     * Format date as YYYY-MM-DD for use as key
     */
    CalendarVisualization.prototype._formatDateKey = function(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    };

    /**
     * Build HTML for a single task card (matching kanbanViz layout)
     */
    CalendarVisualization.prototype._buildTaskCard = function(task) {
        // Determine CSS class and inline styles based on condition flags
        var extraClass = "";
        var styleAttr = "";

        if (task.conditionFlagRed) {
            // RED - highest priority (deadline passed)
            extraClass = " calendar-task-flagged-red";
            styleAttr = " style='background-color:#ffe5e5;border-color:#e09393;'";
        } else if (task.conditionFlagYellow) {
            // YELLOW - second priority (30 day warning)
            extraClass = " calendar-task-flagged-yellow";
            styleAttr = " style='background-color:#fff9e5;border-color:#e0d093;'";
        }

        // Get stripe color from category (Color column)
        var stripeColor = getColorForCategory(task.colorCategory);

        // Format date for display using user's preferred format
        var dateDisplay = "";
        if (task.date) {
            var dateFormat = this._dateFormat || "yyyy-MM-dd";
            dateDisplay = formatDate(task.date, dateFormat);
        }

        var html = '<div class="calendar-task' + extraClass + '" data-row="' + task.rowIndex + '"' + styleAttr + '>';

        // Add color stripe on left edge if category exists
        if (stripeColor) {
            html += '<div class="calendar-task-stripe" style="background-color:' + stripeColor + ';"></div>';
        }

        // Card content container
        html += '<div class="calendar-task-content">';

        // Simplified format: (ID) Task Name in bold
        // 1st column = task.id (ID)
        // 2nd column = task.title (Task Name) - in bold
        html += '<div class="calendar-task-simple">';
        html += '(' + this._escapeHtml(task.id) + ') ';
        html += '<strong>' + this._escapeHtml(task.title) + '</strong>';
        html += '</div>';

        html += '</div>'; // close calendar-task-content
        html += '</div>'; // close calendar-task

        return html;
    };

    /**
     * Escape HTML to prevent XSS
     */
    CalendarVisualization.prototype._escapeHtml = function(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    /**
     * Attach event handlers
     */
    CalendarVisualization.prototype._attachEventHandlers = function() {
        var self = this;
        var container = $(this.getContainerElem());

        // Remove all existing handlers to prevent duplicates
        container.off('click');
        container.off('change');
        container.off('mouseenter');
        container.off('mouseleave');

        // Task selection handler (using jQuery to ensure proper cleanup)
        container.on('click', '.calendar-task', function(e) {
            e.preventDefault();
            e.stopPropagation();

            var rowIndex = parseInt($(this).attr('data-row'), 10);
            if (isNaN(rowIndex)) return;

            var task = null;
            if (self._tasks) {
                for (var i = 0; i < self._tasks.length; i++) {
                    if (self._tasks[i].rowIndex === rowIndex) {
                        task = self._tasks[i];
                        break;
                    }
                }
            }

            if (!task) return;

            console.log("[CalendarViz] Task clicked:", task.title, "rowIndex:", rowIndex);

            var isCtrlKey = e.ctrlKey || e.metaKey;
            self._fireSelectionEvent(task, isCtrlKey);
            self._updateCardSelectionVisuals();
        });

        // Click outside calendar to clear selection
        container.on('click', function(e) {
            // Only clear if clicking on the container itself or calendar elements (not tasks)
            if (!$(e.target).closest('.calendar-task').length &&
                !$(e.target).is('.calendar-nav-btn') &&
                !$(e.target).is('.calendar-today-btn') &&
                !$(e.target).is('.calendar-month-select') &&
                !$(e.target).is('.calendar-year-select')) {
                self._clearSelection();
                self._updateCardSelectionVisuals();
            }
        });

        // Tooltip handlers (using mousemove like kanbanViz for better positioning)
        var rootElem = this.getContainerElem();
        if (rootElem) {
            rootElem.addEventListener('mousemove', function(e) {
                var taskCard = e.target.closest && e.target.closest('.calendar-task');
                if (!taskCard) {
                    self._hideTooltip();
                    return;
                }

                var rowIndex = parseInt(taskCard.getAttribute('data-row'), 10);
                if (isNaN(rowIndex)) {
                    self._hideTooltip();
                    return;
                }

                var task = null;
                if (self._tasks) {
                    for (var i = 0; i < self._tasks.length; i++) {
                        if (self._tasks[i].rowIndex === rowIndex) {
                            task = self._tasks[i];
                            break;
                        }
                    }
                }

                if (!task || !task.tooltipHtml) {
                    self._hideTooltip();
                    return;
                }

                self._showTooltip(task.tooltipHtml, e.clientX, e.clientY);
            });

            rootElem.addEventListener('mouseleave', function() {
                self._hideTooltip();
            });

            rootElem.addEventListener('mouseout', function(e) {
                var to = e.relatedTarget;
                if (!to || !rootElem.contains(to)) {
                    self._hideTooltip();
                }
            });

            rootElem.addEventListener('scroll', function() {
                self._hideTooltip();
            }, { passive: true });
        }

        // Month navigation buttons
        container.on('click', '.calendar-nav-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var action = $(this).attr('data-action');
            console.log("CalendarViz: Button clicked, action:", action);
            if (action === 'prev-month') {
                self._navigateMonth(-1);
            } else if (action === 'next-month') {
                self._navigateMonth(1);
            }
        });

        // Today button
        container.on('click', '.calendar-today-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            self._navigateToToday();
        });

        // Month selector
        container.on('change', '.calendar-month-select', function(e) {
            e.stopPropagation();
            var newMonth = parseInt($(this).val());
            self._changeMonth(newMonth);
        });

        // Year selector
        container.on('change', '.calendar-year-select', function(e) {
            e.stopPropagation();
            var newYear = parseInt($(this).val());
            self._changeYear(newYear);
        });
    };

    /**
     * Ensure tooltip element exists
     */
    CalendarVisualization.prototype._ensureTooltip = function(containerEl) {
        if (this._tooltipElement) return this._tooltipElement;
        var tt = document.createElement('div');
        tt.className = 'calendar-tooltip';
        (containerEl || this.getContainerElem()).appendChild(tt);
        this._tooltipElement = tt;
        return tt;
    };

    /**
     * Show tooltip with HTML content
     */
    CalendarVisualization.prototype._showTooltip = function(html, x, y) {
        var tt = this._ensureTooltip();
        tt.innerHTML = html;
        tt.style.display = 'block';
        tt.classList.add('visible');
        this._moveTooltip(x, y);
    };

    /**
     * Move tooltip to position (with boundary checking)
     */
    CalendarVisualization.prototype._moveTooltip = function(x, y) {
        var tt = this._tooltipElement;
        if (!tt) return;

        var pad = 12;
        var left = x + pad;
        var top = y + pad;

        var ttWidth = tt.offsetWidth;
        var ttHeight = tt.offsetHeight;

        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;

        // Adjust if tooltip would go off right edge
        if (left + ttWidth > viewportWidth - 10) {
            left = x - ttWidth - pad;
            if (left < 10) left = 10;
        }

        // Adjust if tooltip would go off bottom edge
        if (top + ttHeight > viewportHeight - 10) {
            top = y - ttHeight - pad;
            if (top < 10) top = 10;
        }

        tt.style.left = left + 'px';
        tt.style.top = top + 'px';
    };

    /**
     * Hide tooltip
     */
    CalendarVisualization.prototype._hideTooltip = function() {
        if (this._tooltipElement) {
            this._tooltipElement.classList.remove('visible');
            this._tooltipElement.style.display = 'none';
        }
    };

    /**
     * Navigate to previous or next month
     */
    CalendarVisualization.prototype._navigateMonth = function(offset) {
        // Ensure _currentMonth is a valid Date
        if (!(this._currentMonth instanceof Date) || isNaN(this._currentMonth.getTime())) {
            console.warn("CalendarViz: _currentMonth was invalid, resetting to today");
            this._currentMonth = new Date();
        }

        var oldMonth = this._currentMonth.getMonth();
        var oldYear = this._currentMonth.getFullYear();

        console.log("CalendarViz: Before navigation - Year:", oldYear, "Month:", oldMonth, "Offset:", offset);

        this._currentMonth = new Date(
            this._currentMonth.getFullYear(),
            this._currentMonth.getMonth() + offset,
            1
        );

        console.log("CalendarViz: After navigation - Year:", this._currentMonth.getFullYear(), "Month:", this._currentMonth.getMonth());

        this._rerender();
    };

    /**
     * Navigate to today's date
     */
    CalendarVisualization.prototype._navigateToToday = function() {
        this._currentMonth = new Date();
        this._rerender();
    };

    /**
     * Change to a specific month (keep current year)
     */
    CalendarVisualization.prototype._changeMonth = function(newMonth) {
        if (!(this._currentMonth instanceof Date) || isNaN(this._currentMonth.getTime())) {
            this._currentMonth = new Date();
        }

        this._currentMonth = new Date(
            this._currentMonth.getFullYear(),
            newMonth,
            1
        );

        this._rerender();
    };

    /**
     * Change to a specific year (keep current month)
     */
    CalendarVisualization.prototype._changeYear = function(newYear) {
        if (!(this._currentMonth instanceof Date) || isNaN(this._currentMonth.getTime())) {
            this._currentMonth = new Date();
        }

        this._currentMonth = new Date(
            newYear,
            this._currentMonth.getMonth(),
            1
        );

        this._rerender();
    };

    /**
     * Re-render the calendar view
     */
    CalendarVisualization.prototype._rerender = function() {
        console.log("CalendarViz: _rerender called - displaying", this._currentMonth.getFullYear(), "month", this._currentMonth.getMonth());
        var container = this.getContainerElem();
        if (!container) {
            console.error("CalendarViz: Container not found during rerender");
            return;
        }
        var calendarHtml = this._buildCalendarHtml();
        container.innerHTML = calendarHtml;
        this._attachEventHandlers();
        console.log("CalendarViz: _rerender complete");
    };

    /**
     * Handle resize events
     */
    CalendarVisualization.prototype.resizeVisualization = function() {
        // Calendar is responsive via CSS, but we can add additional logic here if needed
        _logger.info("CalendarViz resized");
    };

    /**
     * Cleanup on destroy
     */
    CalendarVisualization.prototype.destroy = function() {
        $(window).off('resize');

        if (this._tooltipElement && this._tooltipElement.parentNode) {
            this._tooltipElement.parentNode.removeChild(this._tooltipElement);
        }

        CalendarVisualization.superclass.destroy.call(this);
    };

    /**
     * Factory function to create visualization instance
     */
    var createClientComponent = function(sID, sDisplayName, sOrigin, sVersion) {
        return new CalendarVisualization(sID, sDisplayName, sOrigin, sVersion);
    };

    // Export factory function
    return {
        createClientComponent: createClientComponent
    };
});
