/**
 * Oracle Analytics Cloud Custom Visualization - Calendar View
 *
 * This visualization displays tasks in a calendar grid format organized by weeks and dates.
 * Tasks are positioned on their completion date (Rok izvedbe).
 */
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
    'com-smartq-calendarviz/colorConfig',
    'com-smartq-calendarviz/nls/root/messages',
    'com-smartq-calendarviz/nls/sl/messages',
    'com-smartq-calendarviz/nls/fr/messages',
    'com-smartq-calendarviz/nls/de/messages',
    'com-smartq-calendarviz/nls/es/messages',
    'com-smartq-calendarviz/nls/hr/messages',
    'com-smartq-calendarviz/nls/it/messages',
    'css!com-smartq-calendarviz/calendarVizstyles'
], function($, jsx, gadgets, dataviz, gadgetdialog, datamodelshapes, data, events, interactions, euidef, logger, colorConfig, messages_en, messages_sl, messages_fr, messages_de, messages_es, messages_hr, messages_it) {
    'use strict';

    var MODULE_NAME = "CalendarViz";
    var _logger = new logger.Logger(MODULE_NAME);
    var VIEW_CONFIG_KEY = 'calendarFormatting';

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

            // Check language prefix and load appropriate translations
            if (userLang.indexOf('sl') === 0) {
                messages = buildMessagesWithArrays(messages_sl);
                console.log('[CalendarViz] Using Slovenian translations from NLS file');
            } else if (userLang.indexOf('fr') === 0) {
                messages = buildMessagesWithArrays(messages_fr);
                console.log('[CalendarViz] Using French translations from NLS file');
            } else if (userLang.indexOf('de') === 0) {
                messages = buildMessagesWithArrays(messages_de);
                console.log('[CalendarViz] Using German translations from NLS file');
            } else if (userLang.indexOf('es') === 0) {
                messages = buildMessagesWithArrays(messages_es);
                console.log('[CalendarViz] Using Spanish translations from NLS file');
            } else if (userLang.indexOf('hr') === 0) {
                messages = buildMessagesWithArrays(messages_hr);
                console.log('[CalendarViz] Using Croatian translations from NLS file');
            } else if (userLang.indexOf('it') === 0) {
                messages = buildMessagesWithArrays(messages_it);
                console.log('[CalendarViz] Using Italian translations from NLS file');
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
    // Current setup: 5 columns in Rows (title, subtitle, date, middle text, bottom text),
    // 1 in Color, 2 in Conditional Formatting, 1 in URL, N in Tooltip
    //
    // Layer mapping:
    //   Layer 0: Task Title (Rows - 1st column)
    //   Layer 1: Subtitle Left (Rows - 2nd column)
    //   Layer 2: Date (Rows - 3rd column) - used for calendar placement
    //   Layer 3: Middle text (Rows - 4th column)
    //   Layer 4: Bottom text (Rows - 5th column)
    //   Layer 5: Color Category (Color placeholder) - for left edge stripe
    //   Layer 6: RED condition flag (Conditional Formatting - 1st column)
    //   Layer 7: YELLOW condition flag (Conditional Formatting - 2nd column)
    //   Layer 8: URL column - hidden, used for title click navigation
    //   Layer 9+: Tooltip columns
    //
    // ========================================================================
    var CALENDAR_CONFIG = {
        rowCount: 5,
        colorCount: 1,
        glyphCount: 2,
        sizeCount: 1,
        tooltipCount: 0
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

    function normalizeUrl(urlValue) {
        if (urlValue === null || urlValue === undefined) return null;
        var raw = String(urlValue).trim();
        if (!raw) return null;
        if (/^https?:\/\//i.test(raw)) return raw;
        if (/^mailto:/i.test(raw)) return raw;
        if (/^www\./i.test(raw)) return "https://" + raw;
        return null;
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
        return 'text-align:' + normalizeAlignmentOption(value, defaultValue) + ';width:100%;';
    }

    function getFlexAlignStyle(value, defaultValue) {
        var align = normalizeAlignmentOption(value, defaultValue);
        var flexAlign = align === "left" ? "flex-start" : (align === "right" ? "flex-end" : "center");
        return 'align-items:' + flexAlign + ';text-align:' + align + ';';
    }

    function isFullyCompletedMeasure(rawValue, valueFormat) {
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return false;
        }

        var num = parseFloat(rawValue);
        if (isNaN(num)) {
            return false;
        }

        if (valueFormat === 'percent') {
            return Math.abs(num - 1) < 0.000001 || Math.abs(num - 100) < 0.000001;
        }

        return Math.abs(num - 100) < 0.000001;
    }

    function formatMeasureValue(rawValue, valueFormat) {
        if (rawValue === null || rawValue === undefined || rawValue === "") return "";
        var num = parseFloat(rawValue);
        if (isNaN(num)) return String(rawValue);

        if (valueFormat === "auto") {
            return String(rawValue);
        }
        if (valueFormat === "#,##0") {
            return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
        }
        if (valueFormat === "#,##0.00") {
            return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
        }
        if (valueFormat === "currency") {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(num);
        }
        if (valueFormat === "percent") {
            return new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
        }

        return String(rawValue);
    }

    function getDefaultFormattingOptions() {
        return {
            valueFormat: 'percent',
            attribute1Alignment: 'center',
            attribute2Alignment: 'center',
            attribute3Alignment: 'center'
        };
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
    CalendarVisualization.superClass = CalendarVisualization.superClass || CalendarVisualization.superclass;

    /**
     * Initialize the visualization (optional override)
     */
    CalendarVisualization.prototype.initialize = function(oCfg) {
        CalendarVisualization.superClass.initialize.call(this, oCfg);
        _logger.info("CalendarViz initialized");

        // Set up resize handler
        var self = this;
        $(window).off('resize.calendarViz');
        $(window).on('resize.calendarViz', function() {
            self.resizeVisualization();
        });
    };

    CalendarVisualization.prototype._fillDefaultOptions = function(oOptions) {
        oOptions = oOptions || {};
        var formatting = oOptions[VIEW_CONFIG_KEY] || {};
        var defaults = getDefaultFormattingOptions();
        formatting.valueFormat = jsx.defaultParam(formatting.valueFormat, defaults.valueFormat);
        formatting.attribute1Alignment = jsx.defaultParam(formatting.attribute1Alignment, defaults.attribute1Alignment);
        formatting.attribute2Alignment = jsx.defaultParam(formatting.attribute2Alignment, defaults.attribute2Alignment);
        formatting.attribute3Alignment = jsx.defaultParam(formatting.attribute3Alignment, defaults.attribute3Alignment);
        oOptions[VIEW_CONFIG_KEY] = formatting;
        this.getSettings().setViewConfigJSON(dataviz.SettingsNS.CHART, oOptions);
        return oOptions;
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
            var activeDataModel = oLogicalDataModel || oDataModel || this.getRootDataModel();
            var rowCols = [];
            try {
                if (activeDataModel) {
                    rowCols = activeDataModel.getColumnIDsIn(datamodelshapes.Physical.ROW) || [];
                }
            } catch (e) {
                rowCols = [];
            }

            if (!rowCols || rowCols.length === 0) {
                try {
                    var probeCount = oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW) || 0;
                    if (probeCount > 0) {
                        rowCols = new Array(probeCount);
                    }
                } catch (_) {
                    rowCols = [];
                }
            }

            if (rowCols.length < 3) {
                var columnCount = rowCols.length;
                container.innerHTML = '<div class="calendar-error">' +
                    '<p><strong>Calendar View requires at least 3 columns in Rows</strong></p>' +
                    '<p>Currently have: ' + columnCount + ' column(s)</p>' +
                    '<ol>' +
                    '<li><strong>Column 1:</strong> Task title (required)</li>' +
                    '<li><strong>Column 2:</strong> Subtitle left (optional)</li>' +
                    '<li><strong>Column 3:</strong> Date / Rok izvedbe (required)</li>' +
                    '<li><strong>Column 4-5:</strong> Additional details (optional)</li>' +
                    '</ol>' +
                    '<p>Please add the required columns to the Rows placeholder.</p>' +
                    '</div>';
                this._setIsRendered(true);
                return;
            }

            // Store current data layout for marking/selection service
            this._currentDataLayout = oDataLayout;
            this._currentLogicalDataModel = oLogicalDataModel || null;
            this._currentDataModel = activeDataModel || null;

            // Get user's date format preference
            var options = this._fillDefaultOptions(this.getViewConfig() || {});
            this._dateFormat = options.dateFormat || "yyyy-MM-dd";
            this._valueFormat = (options[VIEW_CONFIG_KEY] && options[VIEW_CONFIG_KEY].valueFormat) || "percent";
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
                    '<p>Make sure the 3rd column (Date) contains valid date values.</p>' +
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
            var self = this;
            var oRootDataModel = this.getRootDataModel();
            var oDataModel = this._currentLogicalDataModel || this._currentDataModel || oRootDataModel;
            if (!oDataModel && !oRootDataModel) {
                console.warn("CalendarViz: No data model available");
                return tasks;
            }

            var rowCount = 0;
            try {
                rowCount = oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW) || 0;
            } catch (eRowCnt) {
                rowCount = 0;
            }

            var rowCols = [];
            try {
                rowCols = oDataModel.getColumnIDsIn(datamodelshapes.Physical.ROW) || [];
            } catch (eCols) {
                rowCols = [];
            }

            if (!rowCols || rowCols.length === 0) {
                var detectedLayers = [];
                var maxProbeLayers = 40;
                var sampleRows = Math.min(Math.max(rowCount, 1), 20);
                var missStreak = 0;
                for (var layerProbe = 0; layerProbe < maxProbeLayers; layerProbe++) {
                    var layerReadable = false;
                    for (var rr = 0; rr < sampleRows; rr++) {
                        try {
                            oDataLayout.getValue(datamodelshapes.Physical.ROW, layerProbe, rr, false);
                            layerReadable = true;
                            break;
                        } catch (_) {}
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
                    console.log("[CalendarViz] Using probed Physical.ROW layers:", rowCols.length);
                }
            }

            function resolveDisplayName(colId) {
                if (colId === null || colId === undefined) return null;
                var models = [oDataModel, oRootDataModel, self._currentDataModel, self._currentLogicalDataModel];
                for (var mi = 0; mi < models.length; mi++) {
                    var model = models[mi];
                    if (!model || !model.getColumnByID) continue;
                    try {
                        var cObj = model.getColumnByID(colId);
                        if (!cObj) continue;
                        if (cObj.getCaption && cObj.getCaption()) return String(cObj.getCaption()).trim();
                        if (cObj.getDisplayName && cObj.getDisplayName()) return String(cObj.getDisplayName()).trim();
                        if (cObj.getLabel && cObj.getLabel()) return String(cObj.getLabel()).trim();
                        if (cObj.getName && cObj.getName()) return String(cObj.getName()).trim();
                    } catch (_) {}
                }
                return (typeof colId === "string") ? colId : null;
            }

            function getLogicalRole(colId) {
                if (colId === null || colId === undefined) return null;
                var models = [oDataModel, oRootDataModel, self._currentDataModel, self._currentLogicalDataModel];
                for (var mi = 0; mi < models.length; mi++) {
                    var model = models[mi];
                    if (!model || !model.getColumnByID) continue;
                    try {
                        var cObj = model.getColumnByID(colId);
                        if (cObj && cObj.getLogicalRole) {
                            var role = cObj.getLogicalRole();
                            if (role !== null && role !== undefined) return role;
                        }
                    } catch (_) {}
                }
                return null;
            }

            function getRowLayerIndex(colId) {
                if (colId === null || colId === undefined) return -1;
                var idx = rowCols.indexOf(colId);
                if (idx >= 0) return idx;
                var colIdStr = String(colId);
                for (var i = 0; i < rowCols.length; i++) {
                    if (String(rowCols[i]) === colIdStr) return i;
                }
                var targetName = resolveDisplayName(colId);
                if (targetName) {
                    for (var j = 0; j < rowCols.length; j++) {
                        var rowName = resolveDisplayName(rowCols[j]);
                        if (rowName && rowName === targetName) return j;
                    }
                }
                return -1;
            }

            function sameRowColumn(colA, colB) {
                if (colA === null || colA === undefined || colB === null || colB === undefined) return false;
                var a = getRowLayerIndex(colA);
                var b = getRowLayerIndex(colB);
                return a >= 0 && b >= 0 && a === b;
            }

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
                try { pushEdgeCandidate(String(logicalEdge)); } catch (_) {}
                try { pushEdgeCandidate(String(logicalEdge).toLowerCase()); } catch (_) {}
                try { pushEdgeCandidate(String(logicalEdge).toUpperCase()); } catch (_) {}

                for (var mi0 = 0; mi0 < models.length; mi0++) {
                    var m0 = models[mi0];
                    if (!m0) continue;
                    for (var ec0 = 0; ec0 < edgeCandidates.length; ec0++) {
                        try {
                            cols = m0.getUsedColumnIDsIn && m0.getUsedColumnIDsIn(edgeCandidates[ec0]);
                            if (cols && cols.length > 0) return cols.slice();
                        } catch (_) {}
                    }
                }
                for (var mi1 = 0; mi1 < models.length; mi1++) {
                    var m1 = models[mi1];
                    if (!m1) continue;
                    for (var ec1 = 0; ec1 < edgeCandidates.length; ec1++) {
                        try {
                            cols = m1.getColumnIDsIn && m1.getColumnIDsIn(edgeCandidates[ec1]);
                            if (cols && cols.length > 0) return cols.slice();
                        } catch (_) {}
                    }
                }
                for (var mi2 = 0; mi2 < models.length; mi2++) {
                    var m2 = models[mi2];
                    if (!m2 || !m2.getLogicalEdges) continue;
                    try {
                        var edges = m2.getLogicalEdges();
                        if (edges && edges.getChildByName) {
                            for (var ec2 = 0; ec2 < edgeCandidates.length; ec2++) {
                                var edgeObj = edges.getChildByName(String(edgeCandidates[ec2]).toLowerCase());
                                if (edgeObj && edgeObj.getUsedColumnIDsIn) {
                                    cols = edgeObj.getUsedColumnIDsIn();
                                    if (cols && cols.length > 0) return cols.slice();
                                }
                            }
                        }
                    } catch (_) {}
                }
                return null;
            }

            var logicalRowCols = tryLogicalColumns(datamodelshapes.Logical.ROW) || [];
            var logicalColorCols = tryLogicalColumns(datamodelshapes.Logical.COLOR) || [];
            var logicalGlyphCols = tryLogicalColumns(datamodelshapes.Logical.GLYPH) || [];
            var logicalSizeCols = tryLogicalColumns(datamodelshapes.Logical.SIZE) || [];
            var logicalTooltipCols = tryLogicalColumns(datamodelshapes.Logical.TOOLTIP) || [];

            var rowRoleColumns = [];
            var colorRoleColumns = [];
            var glyphRoleColumns = [];
            var sizeRoleColumns = [];
            var tooltipRoleColumns = [];

            var hasLogicalLists = logicalRowCols.length || logicalColorCols.length || logicalGlyphCols.length || logicalSizeCols.length || logicalTooltipCols.length;
            if (hasLogicalLists) {
                rowRoleColumns = logicalRowCols.filter(function(c){ return getRowLayerIndex(c) >= 0; });
                colorRoleColumns = logicalColorCols.filter(function(c){ return getRowLayerIndex(c) >= 0; });
                glyphRoleColumns = logicalGlyphCols.filter(function(c){ return getRowLayerIndex(c) >= 0; });
                sizeRoleColumns = logicalSizeCols.filter(function(c){ return getRowLayerIndex(c) >= 0; });
                tooltipRoleColumns = logicalTooltipCols.filter(function(c){ return getRowLayerIndex(c) >= 0; });
                if (!(rowRoleColumns.length || colorRoleColumns.length || glyphRoleColumns.length || sizeRoleColumns.length || tooltipRoleColumns.length)) {
                    hasLogicalLists = false;
                }
            }

            if (!hasLogicalLists) {
                var rowRoleCount = CALENDAR_CONFIG.rowCount || 3;
                var colorRoleCount = CALENDAR_CONFIG.colorCount || 0;
                var glyphRoleCount = CALENDAR_CONFIG.glyphCount || 0;
                var sizeRoleCount = CALENDAR_CONFIG.sizeCount || 0;
                for (var rc = 0; rc < rowCols.length; rc++) {
                    var colId = rowCols[rc];
                    var logicalRole = getLogicalRole(colId);
                    if (logicalRole === datamodelshapes.Logical.ROW || logicalRole === "row") {
                        rowRoleColumns.push(colId);
                    } else if (logicalRole === datamodelshapes.Logical.COLOR || logicalRole === "color") {
                        colorRoleColumns.push(colId);
                    } else if (logicalRole === datamodelshapes.Logical.GLYPH || logicalRole === "glyph") {
                        glyphRoleColumns.push(colId);
                    } else if (logicalRole === datamodelshapes.Logical.SIZE || logicalRole === "size") {
                        sizeRoleColumns.push(colId);
                    } else if (logicalRole === datamodelshapes.Logical.TOOLTIP || logicalRole === "tooltip") {
                        tooltipRoleColumns.push(colId);
                    }
                }
                if (!(rowRoleColumns.length || colorRoleColumns.length || glyphRoleColumns.length || sizeRoleColumns.length || tooltipRoleColumns.length)) {
                    for (var pi = 0; pi < rowCols.length; pi++) {
                        if (pi < rowRoleCount) {
                            rowRoleColumns.push(rowCols[pi]);
                        } else if (pi < rowRoleCount + colorRoleCount) {
                            colorRoleColumns.push(rowCols[pi]);
                        } else if (pi < rowRoleCount + colorRoleCount + glyphRoleCount) {
                            glyphRoleColumns.push(rowCols[pi]);
                        } else if (pi < rowRoleCount + colorRoleCount + glyphRoleCount + sizeRoleCount) {
                            sizeRoleColumns.push(rowCols[pi]);
                        } else {
                            tooltipRoleColumns.push(rowCols[pi]);
                        }
                    }
                }
            }

            var explicitRowCount = logicalRowCols.length;
            var explicitColorCount = logicalColorCols.length;
            var explicitGlyphCount = logicalGlyphCols.length;
            var explicitSizeCount = logicalSizeCols.length;
            var actualColorCount = colorRoleColumns.length;
            var actualGlyphCount = glyphRoleColumns.length;
            var actualSizeCount = sizeRoleColumns.length;

            var rowSlotCount = explicitRowCount > 0 ? explicitRowCount : rowRoleColumns.length;
            if (rowSlotCount < 3 && rowCols.length > 0) rowSlotCount = Math.min(Math.max(rowCols.length, 3), 5);
            if (rowSlotCount > 5) rowSlotCount = 5;

            var taskColId = rowRoleColumns.length > 0 ? rowRoleColumns[0] : null;
            var subtitle1ColId = rowRoleColumns.length > 1 ? rowRoleColumns[1] : null;
            var dateColId = rowRoleColumns.length > 2 ? rowRoleColumns[2] : null;
            var subtitle3ColId = rowRoleColumns.length > 3 ? rowRoleColumns[3] : null;
            var bottomAttrColId = rowRoleColumns.length > 4 ? rowRoleColumns[4] : null;
            var colorColId = colorRoleColumns.length > 0 ? colorRoleColumns[0] : null;
            var urlColId = sizeRoleColumns.length > 0 ? sizeRoleColumns[0] : (logicalSizeCols.length > 0 ? logicalSizeCols[0] : null);
            var redConditionColId = glyphRoleColumns.length > 0 ? glyphRoleColumns[0] : (logicalGlyphCols.length > 0 ? logicalGlyphCols[0] : null);
            var yellowConditionColId = glyphRoleColumns.length > 1 ? glyphRoleColumns[1] : (logicalGlyphCols.length > 1 ? logicalGlyphCols[1] : null);

            var taskLayer = rowSlotCount >= 1 ? 0 : -1;
            var subtitle1Layer = rowSlotCount >= 2 ? 1 : -1;
            var dateLayer = rowSlotCount >= 3 ? 2 : -1;
            var subtitle3Layer = rowSlotCount >= 4 ? 3 : -1;
            var bottomAttrLayer = rowSlotCount >= 5 ? 4 : -1;
            var colorLayer = colorColId ? getRowLayerIndex(colorColId) : -1;
            if (explicitColorCount > 0) colorLayer = rowSlotCount;

            var redConditionLayer = redConditionColId ? getRowLayerIndex(redConditionColId) : -1;
            if (redConditionLayer < 0 && actualGlyphCount > 0) redConditionLayer = rowSlotCount + actualColorCount;

            var yellowConditionLayer = yellowConditionColId ? getRowLayerIndex(yellowConditionColId) : -1;
            if (yellowConditionLayer < 0 && actualGlyphCount > 1) yellowConditionLayer = rowSlotCount + actualColorCount + 1;

            var urlLayer = urlColId ? getRowLayerIndex(urlColId) : -1;
            if (urlLayer < 0 && actualSizeCount > 0) urlLayer = rowSlotCount + actualColorCount + actualGlyphCount;

            var tooltipStartLayer = rowSlotCount + actualColorCount + actualGlyphCount + actualSizeCount;
            var additionalTooltipColIds = [];
            for (var tc = 0; tc < tooltipRoleColumns.length; tc++) {
                var tipColId = tooltipRoleColumns[tc];
                if (tipColId !== redConditionColId &&
                    tipColId !== yellowConditionColId &&
                    tipColId !== urlColId &&
                    !sameRowColumn(tipColId, urlColId)) {
                    additionalTooltipColIds.push(tipColId);
                }
            }
            additionalTooltipColIds.sort(function(a, b) {
                return getRowLayerIndex(a) - getRowLayerIndex(b);
            });

            if (taskColId === null || taskColId === undefined || dateColId === null || dateColId === undefined) {
                console.warn("CalendarViz: Missing required rows columns (task title or date)");
                return tasks;
            }

            function getValueAtLayer(layerIdx, rowIdx) {
                if (layerIdx == null || layerIdx < 0) return null;
                try {
                    return oDataLayout.getValue(datamodelshapes.Physical.ROW, layerIdx, rowIdx, false);
                } catch (_) {
                    return null;
                }
            }

            function isPositiveFlag(rawValue) {
                if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") return false;
                var val = String(rawValue).trim().toLowerCase();
                return val === 'y' || val === 'yes' || val === 'd' || val === 'da' || val === '1' || val === 'true';
            }

            var titleDisplayName = resolveDisplayName(taskColId) || "Task";
            var subtitle1DisplayName = resolveDisplayName(subtitle1ColId) || "";
            var dateDisplayName = resolveDisplayName(dateColId) || "Date";
            var subtitle3DisplayName = resolveDisplayName(subtitle3ColId) || "";
            var bottomAttrDisplayName = resolveDisplayName(bottomAttrColId) || "";
            var colorDisplayName = resolveDisplayName(colorColId) || "Color";

            console.log("CalendarViz: Processing " + rowCount + " rows of data");

            for (var r = 0; r < rowCount; r++) {
                var taskTitle = getValueAtLayer(taskLayer, r);
                var subtitle1 = getValueAtLayer(subtitle1Layer, r);
                var dateValue = getValueAtLayer(dateLayer, r);
                var subtitle3 = getValueAtLayer(subtitle3Layer, r);
                var bottomAttr = getValueAtLayer(bottomAttrLayer, r);
                var colorValue = getValueAtLayer(colorLayer, r);
                var urlValue = getValueAtLayer(urlLayer, r);
                var redValue = getValueAtLayer(redConditionLayer, r);
                var yellowValue = getValueAtLayer(yellowConditionLayer, r);

                var parsedDate = this._parseDate(dateValue);
                if (!parsedDate) {
                    console.warn("CalendarViz: Invalid date at row " + r + ": " + JSON.stringify(dateValue));
                    continue;
                }

                var tooltipFields = [];
                for (var t = 0; t < additionalTooltipColIds.length; t++) {
                    try {
                        var tooltipLayerIdx = tooltipStartLayer + t;
                        var tooltipValue = oDataLayout.getValue(datamodelshapes.Physical.ROW, tooltipLayerIdx, r, false);
                        if (tooltipValue !== null && tooltipValue !== undefined && String(tooltipValue).trim() !== "") {
                            tooltipFields.push({
                                k: resolveDisplayName(additionalTooltipColIds[t]) || ("Attr " + (t + 1)),
                                v: String(tooltipValue)
                            });
                        }
                    } catch (_) {}
                }

                var task = {
                    rowIndex: r,
                    title: taskTitle != null && String(taskTitle).trim() !== "" ? String(taskTitle) : "Untitled",
                    subtitle1: subtitle1 != null ? String(subtitle1) : "",
                    subtitle2: dateValue != null ? String(dateValue) : "",
                    subtitle3: subtitle3 != null ? String(subtitle3) : "",
                    bottomAttr: bottomAttr != null ? String(bottomAttr) : "",
                    date: parsedDate,
                    dateRaw: dateValue != null ? String(dateValue) : "",
                    colorCategory: colorValue != null ? String(colorValue) : "",
                    url: normalizeUrl(urlValue),
                    conditionFlagRed: isPositiveFlag(redValue),
                    conditionFlagYellow: isPositiveFlag(yellowValue),
                    measureValue: null,
                    tooltipFields: tooltipFields,
                    displayNames: {
                        title: titleDisplayName,
                        subtitle1: subtitle1DisplayName,
                        subtitle2: dateDisplayName,
                        subtitle3: subtitle3DisplayName,
                        bottomAttr: bottomAttrDisplayName,
                        date: dateDisplayName,
                        color: colorDisplayName
                    }
                };

                try {
                    var measureVal = oDataLayout.getValue(datamodelshapes.Physical.DATA, r, 0);
                    if (measureVal !== null && measureVal !== undefined) {
                        task.measureValue = measureVal;
                    }
                } catch (_) {}

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

        function escapeHtml(text) {
            if (!text) return '';
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        if (task.subtitle1) {
            html += '<div class="ct-line"><span class="ct-k">' + escapeHtml(task.displayNames.subtitle1 || 'Info') + ':</span> <span class="ct-v">' + escapeHtml(task.subtitle1) + '</span></div>';
        }

        if (task.title) {
            html += '<div class="ct-line"><span class="ct-k">' + escapeHtml(task.displayNames.title || 'Task') + ':</span> <span class="ct-v"><strong>' + escapeHtml(task.title) + '</strong></span></div>';
        }

        if (task.date) {
            var dateFormat = this._dateFormat || "yyyy-MM-dd";
            var dateDisplay = formatDate(task.date, dateFormat);
            html += '<div class="ct-line"><span class="ct-k">' + escapeHtml(task.displayNames.date || 'Date') + ':</span> <span class="ct-v">' + escapeHtml(dateDisplay) + '</span></div>';
        }

        if (task.subtitle3) {
            html += '<div class="ct-line"><span class="ct-k">' + escapeHtml(task.displayNames.subtitle3 || 'Info') + ':</span> <span class="ct-v">' + escapeHtml(task.subtitle3) + '</span></div>';
        }

        if (task.bottomAttr) {
            html += '<div class="ct-line"><span class="ct-k">' + escapeHtml(task.displayNames.bottomAttr || 'Info') + ':</span> <span class="ct-v">' + escapeHtml(task.bottomAttr) + '</span></div>';
        }

        if (task.colorCategory) {
            html += '<div class="ct-line"><span class="ct-k">' + escapeHtml(task.displayNames.color || 'Color') + ':</span> <span class="ct-v">' + escapeHtml(task.colorCategory) + '</span></div>';
        }

        if (task.tooltipFields && task.tooltipFields.length > 0) {
            for (var i = 0; i < task.tooltipFields.length; i++) {
                var field = task.tooltipFields[i];
                html += '<div class="ct-line"><span class="ct-k">' + escapeHtml(field.k) + ':</span> <span class="ct-v">' + escapeHtml(field.v) + '</span></div>';
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

        Object.keys(grouped).forEach(function(dateKey) {
            grouped[dateKey].sort(compareTasksForCardOrder);
        });

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
        var stripeColor = getColorForCategory(task.colorCategory) || "#cfcfcf";

        var formatting = (this.getViewConfig() || {})[VIEW_CONFIG_KEY] || getDefaultFormattingOptions();
        var attribute1AlignStyle = getTextAlignStyle(formatting.attribute1Alignment, 'center');
        var attribute2AlignStyle = getFlexAlignStyle(formatting.attribute2Alignment, 'center');
        var attribute3AlignStyle = getTextAlignStyle(formatting.attribute3Alignment, 'left');
        var titleDecorationStyle = isFullyCompletedMeasure(task.measureValue, this._valueFormat)
            ? 'text-decoration:line-through;'
            : '';
        var measureDisplay = (task.measureValue !== null && task.measureValue !== undefined && String(task.measureValue).trim() !== "")
            ? formatMeasureValue(task.measureValue, this._valueFormat)
            : "";
        var dateDisplay = task.date
            ? formatDate(task.date, this._dateFormat || "yyyy-MM-dd")
            : (task.dateRaw || task.subtitle2 || "");

        var html = '<div class="calendar-task' + extraClass + '" data-row="' + task.rowIndex + '"' + styleAttr + '>';
        html += '<div class="calendar-task-stripe" style="background-color:' + stripeColor + ';"></div>';
        html += '<div class="calendar-task-content">';
        html += '<div class="calendar-task-left">';

        html += '<table class="calendar-task-subtitle-table"><tr>';
        html += task.subtitle1
            ? '<td class="calendar-task-subtitle calendar-task-subtitle-left">' +
                (task.url
                    ? '<a class="calendar-task-title-link" href="' + this._escapeHtml(task.url) + '" target="_blank" rel="noopener noreferrer">ID: ' + this._escapeHtml(task.subtitle1) + '</a>'
                    : 'ID: ' + this._escapeHtml(task.subtitle1)
                ) +
              '</td>'
            : '<td></td>';
        html += measureDisplay
            ? '<td class="calendar-task-subtitle calendar-task-subtitle-center">(' + this._escapeHtml(measureDisplay) + ')</td>'
            : '<td></td>';
        html += dateDisplay
            ? '<td class="calendar-task-subtitle calendar-task-subtitle-right">' + this._escapeHtml(dateDisplay) + '</td>'
            : '<td></td>';
        html += '</tr></table>';

        html += '<div class="calendar-task-title" style="' + attribute1AlignStyle + titleDecorationStyle + '">';
        html += this._escapeHtml(task.title);
        html += '</div>';

        html += '</div>'; // close calendar-task-left

        if (task.subtitle3) {
            html += '<div class="calendar-task-middle" style="' + attribute2AlignStyle + '">';
            html += this._escapeHtml(task.subtitle3);
            html += '</div>';
        }

        if (task.bottomAttr) {
            html += '<div class="calendar-task-bottom" style="' + attribute3AlignStyle + '">';
            html += this._escapeHtml(task.bottomAttr);
            html += '</div>';
        }

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
        container.off('click', '.calendar-task-title-link');

        // Task selection handler (using jQuery to ensure proper cleanup)
        container.on('click', '.calendar-task', function(e) {
            if ($(e.target).closest('.calendar-task-title-link').length) {
                return;
            }
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

        container.on('click', '.calendar-task-title-link', function(e) {
            e.stopPropagation();
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
            if (this._boundRootElem && this._boundHandlers) {
                if (this._boundHandlers.mousemove) this._boundRootElem.removeEventListener('mousemove', this._boundHandlers.mousemove);
                if (this._boundHandlers.mouseleave) this._boundRootElem.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
                if (this._boundHandlers.mouseout) this._boundRootElem.removeEventListener('mouseout', this._boundHandlers.mouseout);
                if (this._boundHandlers.scroll) this._boundRootElem.removeEventListener('scroll', this._boundHandlers.scroll);
            }

            this._boundHandlers = {};
            this._boundRootElem = rootElem;

            this._boundHandlers.mousemove = function(e) {
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
            };
            rootElem.addEventListener('mousemove', this._boundHandlers.mousemove);

            this._boundHandlers.mouseleave = function() {
                self._hideTooltip();
            };
            rootElem.addEventListener('mouseleave', this._boundHandlers.mouseleave);

            this._boundHandlers.mouseout = function(e) {
                var to = e.relatedTarget;
                if (!to || !rootElem.contains(to)) {
                    self._hideTooltip();
                }
            };
            rootElem.addEventListener('mouseout', this._boundHandlers.mouseout);

            this._boundHandlers.scroll = function() {
                self._hideTooltip();
            };
            rootElem.addEventListener('scroll', this._boundHandlers.scroll, { passive: true });
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
        $(window).off('resize.calendarViz');

        if (this._boundRootElem && this._boundHandlers) {
            var rootElem = this._boundRootElem;
            if (this._boundHandlers.mousemove) rootElem.removeEventListener('mousemove', this._boundHandlers.mousemove);
            if (this._boundHandlers.mouseleave) rootElem.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
            if (this._boundHandlers.mouseout) rootElem.removeEventListener('mouseout', this._boundHandlers.mouseout);
            if (this._boundHandlers.scroll) rootElem.removeEventListener('scroll', this._boundHandlers.scroll);
            this._boundRootElem = null;
            this._boundHandlers = null;
        }

        if (this._tooltipElement && this._tooltipElement.parentNode) {
            this._tooltipElement.parentNode.removeChild(this._tooltipElement);
        }

        CalendarVisualization.superClass.destroy.call(this);
    };

    CalendarVisualization.prototype._handlePropChange = function(sGadgetID, oPropChange, oViewSettings, oActionContext) {
        var conf = oViewSettings.getViewConfigJSON(dataviz.SettingsNS.CHART) || {};
        var formatting = conf[VIEW_CONFIG_KEY] || getDefaultFormattingOptions();
        var bUpdateSettings = CalendarVisualization.superClass._handlePropChange.call(this, sGadgetID, oPropChange, oViewSettings, oActionContext);

        if (sGadgetID === 'valueFormat') {
            formatting.valueFormat = oPropChange.value;
            conf[VIEW_CONFIG_KEY] = formatting;
            oViewSettings.setViewConfigJSON(dataviz.SettingsNS.CHART, conf);
            bUpdateSettings = true;
        }

        if (sGadgetID === 'attribute1Alignment' || sGadgetID === 'attribute2Alignment' || sGadgetID === 'attribute3Alignment') {
            formatting[sGadgetID] = oPropChange.value;
            conf[VIEW_CONFIG_KEY] = formatting;
            oViewSettings.setViewConfigJSON(dataviz.SettingsNS.CHART, conf);
            bUpdateSettings = true;
        }

        return bUpdateSettings;
    };

    CalendarVisualization.prototype._addVizSpecificPropsDialog = function(oTabbedPanelsGadgetInfo) {
        CalendarVisualization.superClass._addVizSpecificPropsDialog.call(this, oTabbedPanelsGadgetInfo);
        this.doAddVizSpecificPropsDialog(this, oTabbedPanelsGadgetInfo);
    };

    CalendarVisualization.prototype.doAddVizSpecificPropsDialog = function(oTransientRenderingContext, oTabbedPanelsGadgetInfo) {
        jsx.assertObject(oTransientRenderingContext, "oTransientRenderingContext");
        jsx.assertInstanceOf(oTabbedPanelsGadgetInfo, gadgets.TabbedPanelsGadgetInfo, "oTabbedPanelsGadgetInfo", "obitech-application/gadgets.TabbedPanelsGadgetInfo");

        var options = this._fillDefaultOptions(this.getViewConfig() || {});
        var formatting = options[VIEW_CONFIG_KEY] || getDefaultFormattingOptions();
        var generalPanel = gadgetdialog.forcePanelByID(oTabbedPanelsGadgetInfo, euidef.GD_PANEL_ID_GENERAL);
        generalPanel.setBodyCSSClass("bi_gadgets_no_cell_separator");
        var nOrder = euidef.GD_FIELD_ORDER_GENERAL_VIZ_SPECIFIC;

        var valueFormatOptions = [
            new gadgets.OptionInfo('auto', 'Auto'),
            new gadgets.OptionInfo('#,##0', '#,##0'),
            new gadgets.OptionInfo('#,##0.00', '#,##0.00'),
            new gadgets.OptionInfo('currency', 'Currency'),
            new gadgets.OptionInfo('percent', 'Percent')
        ];
        var alignmentOptions = [
            new gadgets.OptionInfo('left', 'Left'),
            new gadgets.OptionInfo('center', 'Center'),
            new gadgets.OptionInfo('right', 'Right')
        ];

        nOrder += 1;
        var valueFormatInfo = new gadgets.TextSwitcherGadgetInfo(
            'valueFormat',
            'Value Format',
            'Value Format',
            new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, formatting.valueFormat),
            nOrder,
            null,
            valueFormatOptions
        );
        valueFormatInfo.setGroupName('calendarviz_props');
        generalPanel.addChild(valueFormatInfo);

        nOrder += 1;
        var attribute1AlignmentInfo = new gadgets.TextSwitcherGadgetInfo(
            'attribute1Alignment',
            'Attribute 1: Alignement',
            'Attribute 1: Alignement',
            new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, formatting.attribute1Alignment),
            nOrder,
            null,
            alignmentOptions
        );
        attribute1AlignmentInfo.setGroupName('calendarviz_props');
        generalPanel.addChild(attribute1AlignmentInfo);

        nOrder += 1;
        var attribute2AlignmentInfo = new gadgets.TextSwitcherGadgetInfo(
            'attribute2Alignment',
            'Attribute 2: Alignement',
            'Attribute 2: Alignement',
            new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, formatting.attribute2Alignment),
            nOrder,
            null,
            alignmentOptions
        );
        attribute2AlignmentInfo.setGroupName('calendarviz_props');
        generalPanel.addChild(attribute2AlignmentInfo);

        nOrder += 1;
        var attribute3AlignmentInfo = new gadgets.TextSwitcherGadgetInfo(
            'attribute3Alignment',
            'Attribute 3: Alignement',
            'Attribute 3: Alignement',
            new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, formatting.attribute3Alignment),
            nOrder,
            null,
            alignmentOptions
        );
        attribute3AlignmentInfo.setGroupName('calendarviz_props');
        generalPanel.addChild(attribute3AlignmentInfo);

        if (CalendarVisualization.superClass.doAddVizSpecificPropsDialog) {
            CalendarVisualization.superClass.doAddVizSpecificPropsDialog.apply(this, arguments);
        }
    };

    // Compatibility aliases for OAC builds that look for non-underscored hooks.
    CalendarVisualization.prototype.handlePropChange = function() {
        return this._handlePropChange.apply(this, arguments);
    };

    CalendarVisualization.prototype.addVizSpecificPropsDialog = function() {
        return this._addVizSpecificPropsDialog.apply(this, arguments);
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
