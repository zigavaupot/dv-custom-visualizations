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
  'com-smartq-attributepivotviz/nls/root/messages',
  'css!com-smartq-attributepivotviz/attributePivotVizstyles'
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
  messages_en
) {
  "use strict";

  var MODULE_NAME = 'com-smartq-attributepivotviz/attributePivotViz';
  var _logger = new logger.Logger(MODULE_NAME);
  var DEBUG_PIVOT = false;

  var messages = messages_en;
  var VIEW_CONFIG_KEY = 'attrPivotFormatting';
  var SORT_CONFIG_KEY = 'attrPivotSortState';
  var SORT_VERSION_KEY = 'attrPivotSortStateVersion';
  var COLUMN_WIDTHS_KEY = 'attrPivotColumnWidths';
  var COLUMN_WIDTHS_VERSION_KEY = 'attrPivotColumnWidthsVersion';
  var VIZ_CONFIG_SETTING_KEY = 'settings';
  var VIEW_CONFIG_VERSION = '1.0.19';

  // =========================================================================
  // GRAMMAR CONFIGURATION
  // =========================================================================
  // These values are used as FALLBACK when automatic detection of logical
  // edge boundaries fails.  Normally the viz auto-detects slot sizes by
  // querying logical edge column lists.
  //
  // Only change these if auto-detection produces incorrect results:
  //   rowCount    – columns placed in the "Rows"    slot (row dimensions)
  //   columnCount – columns placed in the "Columns" slot (column dimensions)
  //   valueCount  – columns placed in the "Values"  slot (cell values)
  //
  var GRAMMAR_CONFIG = {
    rowCount:    1,   // row dimension columns  (max 5 in edgeConfig)
    columnCount: 1,   // column dimension columns (SIZE edge, max 5)
    valueCount:  1,   // cell value columns       (GLYPH edge, max 3)
    colorCount:  0,   // optional color attrs     (COLOR edge, max 1)
    tooltipCount: 0   // optional tooltip attrs   (TOOLTIP edge, max 5)
  };
  // =========================================================================

  function getDefaultFormattingOptions() {
    return {
      showEdgeLabels: 'auto',
      showValues: 'auto',
      showAllValues: 'auto',
      autoFitColumns: 'auto',
      wrapText: 'auto',
      valueAlignment: 'center',
      valueFormat: 'auto',
      dateFormat: 'auto',
      metricColorScheme: '#10488c',
      attributeFillColor: '#6f8f5f',
      cellBackground: 'none',
      compressRows: 'auto',
      compressCols: 'auto',
      unfixHeaders: false,
      rowDensity: 'auto',
      bandedRows: 'auto',
      columnWidths: {},
      columnWidthsVersion: '',
      sortSaveNonce: '',
      sortState: [],
      applyDefaultSort: 'auto'
    };
  }

  function debugLog(label, payload) {
    if (!DEBUG_PIVOT || typeof console === 'undefined' || !console.log) return;
    try {
      if (typeof window !== 'undefined') {
        if (!window.__attrPivotDebug) window.__attrPivotDebug = {};
        window.__attrPivotDebug[label] = payload;
      }
      console.log('[AttrPivotDebug] ' + label, payload);
    } catch (e) {}
  }

  function asSwitcherBoolean(value) {
    return value ? 'true' : 'false';
  }

  function fromSwitcherBoolean(value, fallback) {
    var v = String(value).trim().toLowerCase();
    if (v === 'auto') return 'auto';
    if (value === true || v === 'true' || v === 'on' || v === 'yes' || v === 'y' || v === '1') return true;
    if (value === false || v === 'false' || v === 'off' || v === 'no' || v === 'n' || v === '0') return false;
    return fallback;
  }

  function normalizeAlignment(value, fallback) {
    var v = String(value || '').toLowerCase();
    if (v === 'auto') return 'center';
    if (v === 'centre') v = 'center';
    if (v === 'left' || v === 'center' || v === 'right') return v;
    return fallback;
  }

  function normalizeDensity(value, fallback) {
    var v = String(value || '').toLowerCase();
    if (v === 'auto') return 'auto';
    if (v === 'compact' || v === 'comfortable') return v;
    return fallback;
  }

  function getEffectiveBoolean(value, defaultValue) {
    return value === 'auto' ? defaultValue : !!value;
  }

  function getEffectiveDensity(value) {
    return value === 'auto' ? 'compact' : value;
  }

  function normalizeValueFormat(value, fallback) {
    var v = String(value || '').toLowerCase();
    if (v === 'auto' || v === '#,##0' || v === '#,##0.00' || v === 'currency' || v === 'percent') return v;
    return fallback;
  }


  var _MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var _MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function formatDimValue(value, dateFormat) {
    var s = (value === null || value === undefined) ? '' : String(value);
    if (!dateFormat || dateFormat === 'auto' || dateFormat === 'yyyy-MM-dd') return s;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    var year  = parseInt(m[1], 10);
    var month = parseInt(m[2], 10);
    var day   = parseInt(m[3], 10);
    var yyyy  = m[1], yy = m[1].slice(-2), MM = m[2], dd = m[3];
    var mmm   = _MONTH_SHORT[month - 1] || MM;
    var mmmm  = _MONTH_FULL[month - 1]  || MM;
    switch (dateFormat) {
      case 'M/d/yy':         return month + '/' + day + '/' + yy;
      case 'M/d/yyyy':       return month + '/' + day + '/' + yyyy;
      case 'MM/dd/yy':       return MM + '/' + dd + '/' + yy;
      case 'MM/dd/yyyy':     return MM + '/' + dd + '/' + yyyy;
      case 'd/M/yy':         return day + '/' + month + '/' + yy;
      case 'd/M/yyyy':       return day + '/' + month + '/' + yyyy;
      case 'dd/MM/yy':       return dd + '/' + MM + '/' + yy;
      case 'dd/MM/yyyy':     return dd + '/' + MM + '/' + yyyy;
      case 'd.M.yy':         return day + '.' + month + '.' + yy;
      case 'd.M.yyyy':       return day + '.' + month + '.' + yyyy;
      case 'dd.MM.yy':       return dd + '.' + MM + '.' + yy;
      case 'dd.MM.yyyy':     return dd + '.' + MM + '.' + yyyy;
      case 'd-M-yy':         return day + '-' + month + '-' + yy;
      case 'd-M-yyyy':       return day + '-' + month + '-' + yyyy;
      case 'dd-MM-yy':       return dd + '-' + MM + '-' + yy;
      case 'dd-MM-yyyy':     return dd + '-' + MM + '-' + yyyy;
      case 'yyyy-M-d':       return yyyy + '-' + month + '-' + day;
      case 'yy/MM/dd':       return yy + '/' + MM + '/' + dd;
      case 'yy/M/d':         return yy + '/' + month + '/' + day;
      case 'MMM d, yy':      return mmm + ' ' + day + ', ' + yy;
      case 'MMM d, yyyy':    return mmm + ' ' + day + ', ' + yyyy;
      case 'MMM dd, yyyy':   return mmm + ' ' + dd + ', ' + yyyy;
      case 'd MMM yy':       return day + ' ' + mmm + ' ' + yy;
      case 'd MMM yyyy':     return day + ' ' + mmm + ' ' + yyyy;
      case 'dd MMM yyyy':    return dd + ' ' + mmm + ' ' + yyyy;
      case 'd-MMM-yy':       return day + '-' + mmm + '-' + yy;
      case 'd-MMM-yyyy':     return day + '-' + mmm + '-' + yyyy;
      case 'dd-MMM-yy':      return dd + '-' + mmm + '-' + yy;
      case 'dd-MMM-yyyy':    return dd + '-' + mmm + '-' + yyyy;
      case 'MMMM d, yyyy':   return mmmm + ' ' + day + ', ' + yyyy;
      case 'MMMM dd, yyyy':  return mmmm + ' ' + dd + ', ' + yyyy;
      case 'd MMMM yyyy':    return day + ' ' + mmmm + ' ' + yyyy;
      case 'dd MMMM yyyy':   return dd + ' ' + mmmm + ' ' + yyyy;
      case 'dd MMMM, yyyy':  return dd + ' ' + mmmm + ', ' + yyyy;
      case 'dddd, MMMM dd, yyyy':
      case 'dddd, MMMM d, yyyy':  return mmmm + ' ' + dd + ', ' + yyyy;
      case 'dddd, dd MMMM, yyyy':
      case 'dddd, d MMMM, yyyy':  return dd + ' ' + mmmm + ', ' + yyyy;
      default:               return s;
    }
  }

  function normalizeWrapText(value, fallback) {
    var v = String(value || '').toLowerCase();
    if (v === 'auto' || v === 'true' || v === 'false') return v;
    return fallback;
  }

  function getLegacyMetricColorHex(value) {
    var key = String(value || '').toLowerCase();
    var map = {
      blue: '#10488c',
      red: '#991b1b',
      green: '#1c6335',
      orange: '#8c4708',
      purple: '#4f2d7f'
    };
    return map[key] || '';
  }

  function rgbToHex(rgb) {
    if (!rgb) return '';
    function toHexPart(value) {
      var clamped = Math.max(0, Math.min(255, Math.round(value)));
      var hex = clamped.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }
    return '#' + toHexPart(rgb.r) + toHexPart(rgb.g) + toHexPart(rgb.b);
  }

  function normalizePickerColor(value, fallback) {
    var raw = (value === null || value === undefined) ? '' : String(value).trim();
    var legacyHex = getLegacyMetricColorHex(raw);
    if (legacyHex) return legacyHex;

    var color = sanitizeCssColor(raw);
    if (color) {
      var rgb = parseColorToRgb(color);
      return rgb ? rgbToHex(rgb) : color;
    }

    var fallbackLegacyHex = getLegacyMetricColorHex(fallback);
    if (fallbackLegacyHex) return fallbackLegacyHex;

    var fallbackColor = sanitizeCssColor(fallback);
    if (fallbackColor) {
      var fallbackRgb = parseColorToRgb(fallbackColor);
      return fallbackRgb ? rgbToHex(fallbackRgb) : fallbackColor;
    }

    return '#10488c';
  }

  function normalizeMetricColorScheme(value, fallback) {
    if (value === 'none') return 'none';
    return normalizePickerColor(value, fallback);
  }

  function normalizeAttributeFillColor(value, fallback) {
    if (value === 'none') return 'none';
    return normalizePickerColor(value, fallback || '#6f8f5f');
  }

  function normalizeCellBackground(value) {
    if (!value || value === 'none') return 'none';
    var color = sanitizeCssColor(String(value).trim());
    return color || 'none';
  }

  function formatMeasureValue(rawValue, displayValue, formatKey) {
    if (formatKey === 'auto') return displayValue;
    if (rawValue === null || rawValue === undefined || rawValue === '') return displayValue || '';

    var n = Number(rawValue);
    if (!isFinite(n)) return displayValue || String(rawValue);

    try {
      if (formatKey === '#,##0') {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
      }
      if (formatKey === '#,##0.00') {
        return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
      }
      if (formatKey === 'currency') {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
      }
      if (formatKey === 'percent') {
        return new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
      }
    } catch (e) {}

    return displayValue || String(rawValue);
  }


  /**
   * PivotViz constructor
   */
  function PivotViz(sID, sDisplayName, sOrigin, sVersion) {
    PivotViz.baseConstructor.call(this, sID, sDisplayName, sOrigin, sVersion);
    this._selectedRowKeys = [];
    this._selectedCellKeys = [];
    this._columnWidths = {};
    this._currentDataLayout = null;
    this._currentDataModel = null;
    this._currentLogicalDataModel = null;
    this._pivotData = null;
    this._tooltipEl = null;
    this._sortState = [];
    this._hasUserSortOverride = false;
    this._sortToolbarCollapsed = true;
    this._oViewSettings = null;
    this._oActionContext = null;
    this._docSortPreCommitRegistered = false;
    this._docSortPreCommitHandler = null;
    this._sortPreComputedForElement = null;
    this._applyDefaultSortGadgetInfo = null;
    this._suppressApplySortHandler = false;
  }
  jsx.extend(PivotViz, dataviz.DataVisualization);

  // =========================================================================
  // UTILITIES
  // =========================================================================

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function sanitizeCssColor(str) {
    if (str === null || str === undefined) return '';
    var color = String(str).trim();
    if (!color || color.length > 80) return '';
    if (!/^[#(),.%\-\sA-Za-z0-9]+$/.test(color)) return '';
    // Validate against browser CSS parser; rejects arbitrary categorical text.
    if (typeof document !== 'undefined') {
      if (!sanitizeCssColor._probeEl) {
        sanitizeCssColor._probeEl = document.createElement('span');
      }
      var probe = sanitizeCssColor._probeEl;
      probe.style.color = '';
      probe.style.color = color;
      if (!probe.style.color) return '';
    }
    return color;
  }

  function toSortedKeys(obj) {
    var arr = [];
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) arr.push(k);
    }
    arr.sort(function(a, b) { return a.localeCompare(b); });
    return arr;
  }

  function hasNonEmptyItem(arr) {
    if (!arr || !arr.length) return false;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] !== '') return true;
    }
    return false;
  }

  function normalizeDimValue(v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    if (s.normalize) s = s.normalize('NFKC');
    // Remove zero-width chars and normalize whitespace to avoid visually identical duplicate headers.
    s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function compareDimTuples(aVals, bVals) {
    var len = Math.max((aVals || []).length, (bVals || []).length);
    for (var i = 0; i < len; i++) {
      var a = (aVals && aVals[i] !== undefined) ? String(aVals[i]) : '';
      var b = (bVals && bVals[i] !== undefined) ? String(bVals[i]) : '';
      var cmp = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
    return 0;
  }

  function normalizeSortState(sortState) {
    if (typeof sortState === 'string') {
      try {
        sortState = JSON.parse(sortState);
      } catch (e) {
        sortState = [];
      }
    }
    if (!sortState || !sortState.length) return [];

    var normalized = [];
    var seen = {};
    for (var i = 0; i < sortState.length; i++) {
      var item = sortState[i] || {};
      var type = item.type === 'row' || item.type === 'col' ? item.type : '';
      var dimIdx = parseInt(item.dimIdx, 10);
      var dir = item.dir === 'desc' ? 'desc' : (item.dir === 'asc' ? 'asc' : '');
      if (!type || isNaN(dimIdx) || dimIdx < 0 || !dir) continue;

      var key = type + '|' + dimIdx;
      if (seen[key]) continue;
      seen[key] = true;
      normalized.push({ type: type, dimIdx: dimIdx, dir: dir });
    }
    return normalized;
  }

  function getEffectiveToolbarSortState(instance, pivotData) {
    var sortState = normalizeSortState(instance && instance._sortState);
    if (!sortState.length && pivotData && pivotData.formatting) {
      sortState = normalizeSortState(pivotData.formatting.sortState);
    }
    return sortState;
  }

  function normalizeColumnWidths(widths) {
    if (typeof widths === 'string') {
      try {
        widths = JSON.parse(widths);
      } catch (e) {
        widths = {};
      }
    }
    if (!widths || typeof widths !== 'object') return {};

    var normalized = {};
    for (var key in widths) {
      if (!Object.prototype.hasOwnProperty.call(widths, key)) continue;
      if (!/^(row|data)-\d+$/.test(key)) continue;
      var width = parseFloat(widths[key]);
      if (!isFinite(width) || width <= 0) continue;
      normalized[key] = Math.max(getManualResizeMinimumWidth(key), Math.min(2000, width));
    }
    return normalized;
  }

  function hasOwn(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function getVizSpecificSettingsConfig(instance) {
    try {
      if (!instance || typeof instance.getVizSpecificViewConfigSettingJSON !== 'function') return null;
      var specific = instance.getVizSpecificViewConfigSettingJSON() || null;
      if (!specific) return null;
      if (specific[VIEW_CONFIG_KEY] || specific[SORT_CONFIG_KEY]) return specific;
      if (specific[VIZ_CONFIG_SETTING_KEY] && typeof specific[VIZ_CONFIG_SETTING_KEY] === 'object') {
        return specific[VIZ_CONFIG_SETTING_KEY];
      }
    } catch (e) {}
    return null;
  }

  function getStoredViewConfig(instance) {
    var conf = {};
    // Priority order (lowest → highest): viz-specific cached config, getViewConfig(), getSettings()
    // getSettings().getViewConfigJSON() must win because setStoredViewConfig writes there and
    // it reflects the most recent in-session state, while the viz-specific config may hold a
    // stale sort from an older workbook save that went through bUpdateSettings=true.

    // 1. Viz-specific (lowest priority – may be an old cached sort from a prior save)
    var specificConf = getVizSpecificSettingsConfig(instance);
    if (specificConf) {
      for (var specKey in specificConf) {
        if (Object.prototype.hasOwnProperty.call(specificConf, specKey)) {
          conf[specKey] = specificConf[specKey];
        }
      }
    }

    // 2. getViewConfig() – overwrites viz-specific where present
    try {
      var viewConfig = instance.getViewConfig && instance.getViewConfig();
      if (viewConfig) {
        for (var viewKey in viewConfig) {
          if (Object.prototype.hasOwnProperty.call(viewConfig, viewKey)) {
            conf[viewKey] = viewConfig[viewKey];
          }
        }
        var chartViewConfig = viewConfig[dataviz.SettingsNS.CHART] || viewConfig['viz:chart'];
        if (chartViewConfig && typeof chartViewConfig === 'object') {
          for (var chartKey in chartViewConfig) {
            if (Object.prototype.hasOwnProperty.call(chartViewConfig, chartKey)) {
              conf[chartKey] = chartViewConfig[chartKey];
            }
          }
        }
      }
    } catch (e0) {}

    // 3. getSettings().getViewConfigJSON() – highest priority; OAC serialises this on workbook
    //    save and it receives our writes from setStoredViewConfig → setViewConfigJSON.
    try {
      var settingsConf = instance.getSettings().getViewConfigJSON(dataviz.SettingsNS.CHART) || {};
      for (var settingsKey in settingsConf) {
        if (Object.prototype.hasOwnProperty.call(settingsConf, settingsKey)) {
          conf[settingsKey] = settingsConf[settingsKey];
        }
      }
    } catch (e) {}

    try {
      if (typeof window !== 'undefined') {
        if (!window.__attrPivotDebug) window.__attrPivotDebug = {};
        window.__attrPivotDebug.src1_vizSpecific = specificConf;
        window.__attrPivotDebug.src2_viewConfig = viewConfig;
        window.__attrPivotDebug.src3_settings = settingsConf;
        window.__attrPivotDebug.merged = conf;
        window.__attrPivotDebug.instance = instance;
      }
    } catch(dbgE) {}

    return conf;
  }

  function setStoredViewConfig(instance, conf) {
    try {
      if (instance && typeof instance.getViewConfig === 'function') {
        var viewConfig = instance.getViewConfig() || {};
        for (var viewKey in conf) {
          if (Object.prototype.hasOwnProperty.call(conf, viewKey)) {
            viewConfig[viewKey] = conf[viewKey];
          }
        }
        var chartNs = dataviz.SettingsNS.CHART || 'viz:chart';
        var chartConfig = viewConfig[chartNs] || viewConfig['viz:chart'];
        if (chartConfig && typeof chartConfig === 'object') {
          for (var chartKey in conf) {
            if (Object.prototype.hasOwnProperty.call(conf, chartKey)) {
              chartConfig[chartKey] = conf[chartKey];
            }
          }
          viewConfig[chartNs] = chartConfig;
          if (chartNs !== 'viz:chart' && viewConfig['viz:chart']) {
            viewConfig['viz:chart'] = chartConfig;
          }
        }
        if (typeof instance.setViewConfig === 'function') {
          instance.setViewConfig(viewConfig);
        }
      }
    } catch (e0) {}

    try {
      instance.getSettings().setViewConfigJSON(dataviz.SettingsNS.CHART, conf);
    } catch (e) {}

    try {
      if (typeof instance.setVizSpecificViewConfigSetting === 'function') {
        instance.setVizSpecificViewConfigSetting(instance.getSettings(), VIZ_CONFIG_SETTING_KEY, conf);
        instance.setVizSpecificViewConfigSetting(instance.getSettings(), VIEW_CONFIG_KEY, conf[VIEW_CONFIG_KEY] || {});
        instance.setVizSpecificViewConfigSetting(instance.getSettings(), SORT_CONFIG_KEY, normalizeSortState(conf[SORT_CONFIG_KEY]));
        instance.setVizSpecificViewConfigSetting(instance.getSettings(), SORT_VERSION_KEY, conf[SORT_VERSION_KEY] || '');
        instance.setVizSpecificViewConfigSetting(instance.getSettings(), COLUMN_WIDTHS_KEY, normalizeColumnWidths(conf[COLUMN_WIDTHS_KEY]));
        instance.setVizSpecificViewConfigSetting(instance.getSettings(), COLUMN_WIDTHS_VERSION_KEY, conf[COLUMN_WIDTHS_VERSION_KEY] || '');
      }
    } catch (e2) {}
  }

  function notifyStoredViewConfigChanged(instance) {
    var settings = null;
    try { settings = instance && instance.getSettings && instance.getSettings(); } catch (e0) {}

    function tryCall(target, methodName, args) {
      try {
        if (target && typeof target[methodName] === 'function') {
          target[methodName].apply(target, args || []);
          return true;
        }
      } catch (e) {}
      return false;
    }

    tryCall(settings, 'setDirty', [true]);
    tryCall(settings, 'markDirty');
    tryCall(settings, 'setModified', [true]);
    tryCall(settings, 'setChanged', [true]);
    tryCall(settings, 'notifyChanged');
    tryCall(settings, 'notifySettingsChanged');

    tryCall(instance, 'setDirty', [true]);
    tryCall(instance, 'markDirty');
    tryCall(instance, 'setModified', [true]);
    tryCall(instance, 'setChanged', [true]);
    tryCall(instance, 'notifyChanged');
    tryCall(instance, 'notifySettingsChanged');
  }

  function hasCurrentSortStateVersion(oOptions, formatting) {
    return (formatting && formatting.sortStateVersion === VIEW_CONFIG_VERSION) ||
      (oOptions && oOptions[SORT_VERSION_KEY] === VIEW_CONFIG_VERSION);
  }

  function hasCurrentColumnWidthsVersion(oOptions, formatting) {
    return (formatting && formatting.columnWidthsVersion === VIEW_CONFIG_VERSION) ||
      (oOptions && oOptions[COLUMN_WIDTHS_VERSION_KEY] === VIEW_CONFIG_VERSION);
  }

  function getSortStorageKeys(instance, pivotData) {
    var keys = [];
    var id = '';
    try {
      id = (instance.getViewName && instance.getViewName()) ||
        (instance.getID && instance.getID()) ||
        '';
    } catch (e) {}
    if (id) keys.push('com.smartq.attributePivotViz.sortState.' + id);

    var signatureParts = [];
    if (pivotData) {
      signatureParts = []
        .concat(pivotData.rowDimNames || [])
        .concat(['|'])
        .concat(pivotData.colDimNames || [])
        .concat(['|'])
        .concat(pivotData.valNames || [])
        .concat(['|'])
        .concat(pivotData.measureNames || []);
    } else if (instance && instance._pivotData) {
      return getSortStorageKeys(instance, instance._pivotData);
    }
    if (signatureParts.length) {
      keys.push('com.smartq.attributePivotViz.sortState.signature.' + signatureParts.join('||'));
    }
    return keys;
  }

  function getColumnWidthsStorageKeys(instance, pivotData) {
    var keys = getSortStorageKeys(instance, pivotData);
    for (var i = 0; i < keys.length; i++) {
      keys[i] = keys[i].replace('.sortState.', '.columnWidths.');
    }
    return keys;
  }

  function loadLocalColumnWidths(instance, pivotData) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return { found: false, columnWidths: {} };
      var keys = getColumnWidthsStorageKeys(instance, pivotData);
      for (var i = 0; i < keys.length; i++) {
        var raw = window.localStorage.getItem(keys[i]);
        if (!raw) continue;
        var stored = JSON.parse(raw);
        if (!stored || stored.version !== VIEW_CONFIG_VERSION) continue;
        return { found: true, columnWidths: normalizeColumnWidths(stored.columnWidths) };
      }
    } catch (e) {
      return { found: false, columnWidths: {} };
    }
    return { found: false, columnWidths: {} };
  }

  function saveLocalColumnWidths(instance, columnWidths) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      var keys = getColumnWidthsStorageKeys(instance);
      if (!keys.length) return;
      var payload = JSON.stringify({
        version: VIEW_CONFIG_VERSION,
        columnWidths: normalizeColumnWidths(columnWidths)
      });
      for (var i = 0; i < keys.length; i++) {
        window.localStorage.setItem(keys[i], payload);
      }
    } catch (e) {}
  }

  function applySortState(pivotData, sortState) {
    sortState = normalizeSortState(sortState);
    if (!pivotData || !sortState.length) return;

    var rowSorts = [];
    var colSorts = [];
    for (var i = 0; i < sortState.length; i++) {
      if (sortState[i].type === 'row') rowSorts.push(sortState[i]);
      else if (sortState[i].type === 'col') colSorts.push(sortState[i]);
    }

    if (rowSorts.length) {
      pivotData.rowKeys.sort(function(a, b) {
        var aLabels = pivotData.rowLabels[a] || [];
        var bLabels = pivotData.rowLabels[b] || [];
        for (var ri = 0; ri < rowSorts.length; ri++) {
          var rowSort = rowSorts[ri];
          var aVal = (rowSort.dimIdx < aLabels.length) ? String(aLabels[rowSort.dimIdx]) : '';
          var bVal = (rowSort.dimIdx < bLabels.length) ? String(bLabels[rowSort.dimIdx]) : '';
          var cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
          if (cmp !== 0) return rowSort.dir === 'desc' ? -cmp : cmp;
        }
        return compareDimTuples(aLabels, bLabels);
      });
    }

    if (colSorts.length) {
      pivotData.colKeys.sort(function(a, b) {
        var aLabels = pivotData.colLabels[a] || [];
        var bLabels = pivotData.colLabels[b] || [];
        for (var ci = 0; ci < colSorts.length; ci++) {
          var colSort = colSorts[ci];
          var aVal = (colSort.dimIdx < aLabels.length) ? String(aLabels[colSort.dimIdx]) : '';
          var bVal = (colSort.dimIdx < bLabels.length) ? String(bLabels[colSort.dimIdx]) : '';
          var cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
          if (cmp !== 0) return colSort.dir === 'desc' ? -cmp : cmp;
        }
        return compareDimTuples(aLabels, bLabels);
      });
    }
  }

  function resetPivotOrder(pivotData) {
    if (!pivotData) return;
    if (pivotData.baseRowKeys && pivotData.baseRowKeys.length) {
      pivotData.rowKeys = pivotData.baseRowKeys.slice();
    }
    if (pivotData.baseColKeys && pivotData.baseColKeys.length) {
      pivotData.colKeys = pivotData.baseColKeys.slice();
    }
  }

  function buildContiguousColumnGroups(colKeys, colLabels, level) {
    var groups = [];
    for (var i = 0; i < colKeys.length; i++) {
      var labels = colLabels[colKeys[i]] || [];
      var prefix = labels.slice(0, level).join('\x1f');
      var label = labels[level] || '';
      var last = groups.length ? groups[groups.length - 1] : null;
      if (last && last.label === label && last.prefix === prefix) {
        last.count++;
        last.lastColIdx = i;
      } else {
        groups.push({
          prefix: prefix,
          label: label,
          count: 1,
          lastColIdx: i
        });
      }
    }
    return groups;
  }

  function toNormToken(v) {
    return normalizeDimValue(v).toLowerCase();
  }

  function getDisplayValueOrder(numVals) {
    var order = [];
    for (var i = numVals - 1; i >= 0; i--) order.push(i);
    return order;
  }

  function buildDisplayEntriesForCell(cellEntries, numVals) {
    if (!cellEntries || !cellEntries.length) return [];

    var valueOrder = getDisplayValueOrder(numVals);
    var displayEntries = [];

    for (var i = 0; i < cellEntries.length; i++) {
      var entry = cellEntries[i];
      var placed = false;
      var vals = (entry && entry.vals) ? entry.vals : [];
      var hasMeasureOnly = !hasNonEmptyItem(vals) && hasNonEmptyItem(entry ? entry.measureVals : null);

      for (var rowIdx = 0; rowIdx < valueOrder.length; rowIdx++) {
        var valueIdx = valueOrder[rowIdx];
        var hasValueAtIdx = vals.length > valueIdx && vals[valueIdx] !== '';
        if ((!hasValueAtIdx && !(hasMeasureOnly && rowIdx === 0)) || displayEntries[rowIdx]) continue;

        displayEntries[rowIdx] = {
          entry: entry,
          valueIdx: hasValueAtIdx ? valueIdx : -1
        };
        placed = true;
        break;
      }

      if (!placed) {
        var fallbackValueIdx = -1;
        for (var oi = 0; oi < valueOrder.length; oi++) {
          var candidateIdx = valueOrder[oi];
          if (vals.length > candidateIdx && vals[candidateIdx] !== '') {
            fallbackValueIdx = candidateIdx;
            break;
          }
        }
        displayEntries.push({
          entry: entry,
          valueIdx: fallbackValueIdx
        });
      }
    }

    return displayEntries;
  }

  function expandToAllCombinations(result) {
    var SEP = '\x00';
    var numRowDims = result.rowDimNames.length;
    var numColDims = result.colDimNames.length;
    if (numRowDims === 0 && numColDims === 0) return;

    // Collect unique values per dimension from existing labels
    function collectUniquesPerDim(keys, labels, numDims) {
      var perDim = [];
      for (var d = 0; d < numDims; d++) perDim.push([]);
      var seen = [];
      for (var d2 = 0; d2 < numDims; d2++) seen.push({});
      for (var i = 0; i < keys.length; i++) {
        var vals = labels[keys[i]] || [];
        for (var d3 = 0; d3 < numDims; d3++) {
          var v = (vals[d3] !== undefined && vals[d3] !== null) ? String(vals[d3]) : '';
          if (!seen[d3][v]) {
            seen[d3][v] = true;
            perDim[d3].push(v);
          }
        }
      }
      return perDim;
    }

    // Build cartesian product of dimension values
    function cartesian(arrays) {
      if (arrays.length === 0) return [[]];
      var results = [[]];
      for (var i = 0; i < arrays.length; i++) {
        var next = [];
        for (var j = 0; j < results.length; j++) {
          for (var k = 0; k < arrays[i].length; k++) {
            next.push(results[j].concat([arrays[i][k]]));
          }
        }
        results = next;
      }
      return results;
    }

    // Expand rows
    if (numRowDims > 0) {
      var rowUniques = collectUniquesPerDim(result.rowKeys, result.rowLabels, numRowDims);
      var allRowCombos = cartesian(rowUniques);
      for (var ri = 0; ri < allRowCombos.length; ri++) {
        var rowKey = allRowCombos[ri].join(SEP);
        if (!result.rowLabels[rowKey]) {
          result.rowKeys.push(rowKey);
          result.rowLabels[rowKey] = allRowCombos[ri];
          result.rowIndexMap[rowKey] = [];
        }
      }
    }

    // Expand columns
    if (numColDims > 0) {
      var colUniques = collectUniquesPerDim(result.colKeys, result.colLabels, numColDims);
      var allColCombos = cartesian(colUniques);
      for (var ci = 0; ci < allColCombos.length; ci++) {
        var colKey = allColCombos[ci].join(SEP);
        if (!result.colLabels[colKey]) {
          result.colKeys.push(colKey);
          result.colLabels[colKey] = allColCombos[ci];
        }
      }
    }
  }

  function buildDisplayCellMap(cellMap, rowKeys, colKeys, numVals) {
    var out = {};
    for (var ri = 0; ri < rowKeys.length; ri++) {
      var rowKey = rowKeys[ri];
      var rowCells = cellMap[rowKey] || {};
      out[rowKey] = {};
      for (var ci = 0; ci < colKeys.length; ci++) {
        var colKey = colKeys[ci];
        out[rowKey][colKey] = buildDisplayEntriesForCell(rowCells[colKey] || [], numVals);
      }
    }
    return out;
  }

  function getRowGroupSubRowCount(rowKey, cellMap, colKeys, numVals) {
    var maxSubRows = (numVals > 1) ? numVals : 1;
    for (var ci = 0; ci < colKeys.length; ci++) {
      var cellValues = (cellMap[rowKey] && cellMap[rowKey][colKeys[ci]]) ? cellMap[rowKey][colKeys[ci]] : [];
      if (cellValues.length > maxSubRows) maxSubRows = cellValues.length;
    }
    return maxSubRows;
  }

  function labelsMatchThroughDim(aVals, bVals, dimIdx) {
    for (var i = 0; i <= dimIdx; i++) {
      var a = (aVals && aVals[i] !== undefined) ? String(aVals[i]) : '';
      var b = (bVals && bVals[i] !== undefined) ? String(bVals[i]) : '';
      if (a !== b) return false;
    }
    return true;
  }

  function buildRowHeaderLayout(rowKeys, rowLabels, cellMap, colKeys, numVals, numRowDims, compressRows) {
    var subRowCountByKey = {};
    var spanByKey = {};
    var ri;
    var d;

    for (ri = 0; ri < rowKeys.length; ri++) {
      subRowCountByKey[rowKeys[ri]] = getRowGroupSubRowCount(rowKeys[ri], cellMap, colKeys, numVals);
      spanByKey[rowKeys[ri]] = {};
    }

    for (ri = 0; ri < rowKeys.length; ri++) {
      var rowKey = rowKeys[ri];
      var currentLabels = rowLabels[rowKey] || [];
      for (d = 0; d < numRowDims; d++) {
        if (!compressRows) {
          spanByKey[rowKey][d] = subRowCountByKey[rowKey];
          continue;
        }
        if (ri > 0) {
          var prevKey = rowKeys[ri - 1];
          var prevLabels = rowLabels[prevKey] || [];
          if (labelsMatchThroughDim(prevLabels, currentLabels, d)) {
            spanByKey[rowKey][d] = 0;
            continue;
          }
        }

        var span = subRowCountByKey[rowKey];
        for (var next = ri + 1; next < rowKeys.length; next++) {
          var nextKey = rowKeys[next];
          var nextLabels = rowLabels[nextKey] || [];
          if (!labelsMatchThroughDim(currentLabels, nextLabels, d)) break;
          span += subRowCountByKey[nextKey];
        }
        spanByKey[rowKey][d] = span;
      }
    }

    return {
      subRowCountByKey: subRowCountByKey,
      spanByKey: spanByKey
    };
  }

  function closestElement(target, selector) {
    if (!target) return null;
    var el = (target.nodeType === 1) ? target : target.parentElement;
    if (!el || !el.closest) return null;
    return el.closest(selector);
  }

  function hslToRgb(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var hp = h / 60;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var r1 = 0, g1 = 0, b1 = 0;
    if (hp >= 0 && hp < 1) { r1 = c; g1 = x; b1 = 0; }
    else if (hp < 2) { r1 = x; g1 = c; b1 = 0; }
    else if (hp < 3) { r1 = 0; g1 = c; b1 = x; }
    else if (hp < 4) { r1 = 0; g1 = x; b1 = c; }
    else if (hp < 5) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    var m = l - c / 2;
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function parseColorToRgb(cssColor) {
    if (!cssColor) return null;
    var txt = String(cssColor).trim();
    var m;

    m = txt.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      var hex = m[1];
      if (hex.length === 3) {
        return {
          r: parseInt(hex.charAt(0) + hex.charAt(0), 16),
          g: parseInt(hex.charAt(1) + hex.charAt(1), 16),
          b: parseInt(hex.charAt(2) + hex.charAt(2), 16)
        };
      }
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }

    m = txt.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      var parts = m[1].split(',');
      if (parts.length >= 3) {
        return {
          r: Math.max(0, Math.min(255, parseFloat(parts[0]))),
          g: Math.max(0, Math.min(255, parseFloat(parts[1]))),
          b: Math.max(0, Math.min(255, parseFloat(parts[2])))
        };
      }
    }

    m = txt.match(/^hsla?\(([^)]+)\)$/i);
    if (m) {
      var hslParts = m[1].split(',');
      if (hslParts.length >= 3) {
        var h = parseFloat(hslParts[0]);
        var s = parseFloat(String(hslParts[1]).replace('%', '')) / 100;
        var l = parseFloat(String(hslParts[2]).replace('%', '')) / 100;
        if (isFinite(h) && isFinite(s) && isFinite(l)) {
          h = ((h % 360) + 360) % 360;
          s = Math.max(0, Math.min(1, s));
          l = Math.max(0, Math.min(1, l));
          return hslToRgb(h, s, l);
        }
      }
    }
    return null;
  }

  function getContrastingTextColor(hexOrCssColor) {
    var rgb = parseColorToRgb(hexOrCssColor);
    if (!rgb && typeof document !== 'undefined') {
      if (!getContrastingTextColor._probeEl) {
        getContrastingTextColor._probeEl = document.createElement('span');
      }
      var probe = getContrastingTextColor._probeEl;
      probe.style.color = '';
      probe.style.color = hexOrCssColor;
      rgb = parseColorToRgb(probe.style.color || '');
    }
    if (!rgb) return '#161616';
    var r = rgb.r;
    var g = rgb.g;
    var b = rgb.b;
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 140 ? '#161616' : '#ffffff';
  }

  function getContinuousCellColor(value, min, max, scheme) {
    if (!isFinite(value) || !isFinite(min) || !isFinite(max)) return '';
    return normalizeMetricColorScheme(scheme, '#10488c');
  }

  function tryCreateColorGadget(gadgets, euidef, gadgetId, gadgetLabel, currentValue, nOrder) {
    var colorCtorNames = ['ColorPickerGadgetInfo', 'ColorChooserGadgetInfo', 'ColorGadgetInfo'];
    var colorTypeNames = ['COLOR_PICKER', 'COLOR_CHOOSER', 'COLOR'];
    var textCtorNames = ['TextFieldGadgetInfo', 'TextInputGadgetInfo', 'EditGadgetInfo'];
    var textTypeNames = ['TEXT_FIELD', 'TEXT_INPUT', 'EDIT'];
    var i;

    for (i = 0; i < colorCtorNames.length; i++) {
      var ColorCtor = gadgets[colorCtorNames[i]];
      if (!ColorCtor) continue;
      try {
        return new ColorCtor(
          gadgetId,
          gadgetLabel,
          gadgetLabel,
          new gadgets.GadgetValueProperties(
            euidef.GadgetTypeIDs[colorTypeNames[i]],
            currentValue
          ),
          nOrder
        );
      } catch (e1) {}
    }

    for (i = 0; i < textCtorNames.length; i++) {
      var TextCtor = gadgets[textCtorNames[i]];
      if (!TextCtor) continue;
      try {
        return new TextCtor(
          gadgetId,
          gadgetLabel,
          gadgetLabel,
          new gadgets.GadgetValueProperties(
            euidef.GadgetTypeIDs[textTypeNames[i]],
            currentValue
          ),
          nOrder
        );
      } catch (e2) {}
    }

    return null;
  }

  function tryCreateMetricColorGadget(gadgets, euidef, formatting, nOrder) {
    return tryCreateColorGadget(
      gadgets,
      euidef,
      'metricColorScheme',
      'Metric Fill Color',
      normalizeMetricColorScheme(formatting.metricColorScheme, '#10488c'),
      nOrder
    );
  }

  function tryCreateAttributeColorGadget(gadgets, euidef, formatting, nOrder) {
    return tryCreateColorGadget(
      gadgets,
      euidef,
      'attributeFillColor',
      'Attribute Fill Color',
      normalizeAttributeFillColor(formatting.attributeFillColor, '#6f8f5f'),
      nOrder
    );
  }

  function tryCreateCellBackgroundGadget(gadgets, euidef, formatting, nOrder) {
    var current = normalizeCellBackground(formatting.cellBackground);
    return tryCreateColorGadget(gadgets, euidef, 'cellBackground', 'Cell Background', current === 'none' ? '' : current, nOrder);
  }

  function getDefaultColumnWidth(colKey, isRowDim) {
    if (isRowDim) return 92;
    if (!colKey) return 96;
    if (String(colKey).toLowerCase().indexOf('value-text') >= 0) return 112;
    return 96;
  }

  function estimateTextColumnWidth(text, isRowDim) {
    var s = (text === null || text === undefined) ? '' : String(text);
    var len = s.length;
    var base = isRowDim ? 36 : 44;
    var perChar = isRowDim ? 7 : 7;
    var padding = isRowDim ? 18 : 16;
    var maxWidth = isRowDim ? 260 : 220;
    return Math.max(getDefaultColumnWidth(s, isRowDim), Math.min(maxWidth, base + (len * perChar) + padding));
  }

  function getLongestUnbrokenToken(text) {
    var s = (text === null || text === undefined) ? '' : String(text);
    var tokens = s.split(/\s+/);
    var longest = '';
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].length > longest.length) longest = tokens[i];
    }
    return longest || s;
  }

  function estimateMinimumColumnWidth(text, isRowDim) {
    var token = getLongestUnbrokenToken(text);
    if (!token) return isRowDim ? 44 : 48;
    var perChar = isRowDim ? 7 : 7;
    var padding = isRowDim ? 18 : 16;
    return Math.max(isRowDim ? 44 : 48, Math.ceil((token.length * perChar) + padding));
  }

  function getRowDimensionColumnWidth(pivotData, dimIdx) {
    var label = (pivotData.rowDimNames && pivotData.rowDimNames[dimIdx]) ? pivotData.rowDimNames[dimIdx] : '';
    var maxWidth = estimateTextColumnWidth(label, true);
    var keys = pivotData.rowKeys || [];
    var labels = pivotData.rowLabels || {};

    for (var i = 0; i < keys.length; i++) {
      var rowVals = labels[keys[i]] || [];
      var value = (rowVals[dimIdx] !== undefined && rowVals[dimIdx] !== null) ? rowVals[dimIdx] : '';
      var width = estimateTextColumnWidth(value, true);
      if (width > maxWidth) maxWidth = width;
    }
    return maxWidth;
  }

  function getRowDimensionMinimumWidth(pivotData, dimIdx) {
    var label = (pivotData.rowDimNames && pivotData.rowDimNames[dimIdx]) ? pivotData.rowDimNames[dimIdx] : '';
    var minWidth = estimateMinimumColumnWidth(label, true);
    var keys = pivotData.rowKeys || [];
    var labels = pivotData.rowLabels || {};

    for (var i = 0; i < keys.length; i++) {
      var rowVals = labels[keys[i]] || [];
      var value = (rowVals[dimIdx] !== undefined && rowVals[dimIdx] !== null) ? rowVals[dimIdx] : '';
      var width = estimateMinimumColumnWidth(value, true);
      if (width > minWidth) minWidth = width;
    }
    return minWidth;
  }

  function getDataColumnMinimumWidth(pivotData, colIdx, formatting) {
    var colKey = pivotData.colKeys && pivotData.colKeys[colIdx];
    var colLabel = pivotData.colLabels && pivotData.colLabels[colKey] ? pivotData.colLabels[colKey].join(' / ') : colKey;
    var minWidth = estimateMinimumColumnWidth(colLabel, false);
    var showValues = getEffectiveBoolean(formatting && formatting.showValues, true);
    var rowKeys = pivotData.rowKeys || [];
    var cellMap = pivotData.cellMap || {};

    for (var ri = 0; ri < rowKeys.length; ri++) {
      var rowCells = cellMap[rowKeys[ri]] || {};
      var entries = rowCells[colKey] || [];
      for (var ei = 0; ei < entries.length; ei++) {
        var entry = entries[ei] || {};
        var vals = entry.vals || [];
        for (var vi = 0; vi < vals.length; vi++) {
          var valWidth = estimateMinimumColumnWidth(vals[vi], false);
          if (valWidth > minWidth) minWidth = valWidth;
        }
        if (showValues && entry.measureVals) {
          for (var mi = 0; mi < entry.measureVals.length; mi++) {
            var measureText = formatMeasureValue(
              entry.measureRawVals && entry.measureRawVals[mi] !== undefined ? entry.measureRawVals[mi] : '',
              entry.measureVals[mi],
              formatting && formatting.valueFormat ? formatting.valueFormat : 'auto'
            );
            var measureWidth = estimateMinimumColumnWidth(measureText, false);
            if (measureWidth > minWidth) minWidth = measureWidth;
          }
        }
      }
    }
    return minWidth;
  }

  function getColumnMinimumWidthMap(pivotData, formatting) {
    var minMap = {};
    var i;
    for (i = 0; i < (pivotData.rowDimNames || []).length; i++) {
      minMap['row-' + i] = getRowDimensionMinimumWidth(pivotData, i);
    }
    for (i = 0; i < (pivotData.colKeys || []).length; i++) {
      minMap['data-' + i] = getDataColumnMinimumWidth(pivotData, i, formatting);
    }
    return minMap;
  }

  function getManualResizeMinimumWidth(colId) {
    return colId && colId.indexOf('row-') === 0 ? 44 : 48;
  }

  function getColumnWidthMap(instance, pivotData, formatting) {
    var widthMap = {};
    var saved = instance._columnWidths || {};
    var minMap = getColumnMinimumWidthMap(pivotData, formatting);
    var useAutoFit = getEffectiveBoolean(formatting && formatting.autoFitColumns, true);
    var i;

    for (i = 0; i < pivotData.rowDimNames.length; i++) {
      var rowColId = 'row-' + i;
      var rowDefaultWidth = getRowDimensionColumnWidth(pivotData, i);
      widthMap[rowColId] = useAutoFit ?
        Math.max(minMap[rowColId] || 0, rowDefaultWidth) :
        Math.max(minMap[rowColId] || getManualResizeMinimumWidth(rowColId), saved[rowColId] || rowDefaultWidth);
    }
    for (i = 0; i < pivotData.colKeys.length; i++) {
      var dataColId = 'data-' + i;
      var colLabel = pivotData.colLabels[pivotData.colKeys[i]] ? pivotData.colLabels[pivotData.colKeys[i]].join(' / ') : pivotData.colKeys[i];
      var dataDefaultWidth = Math.max(getDefaultColumnWidth(colLabel, false), minMap[dataColId] || 0);
      widthMap[dataColId] = useAutoFit ?
        dataDefaultWidth :
        Math.max(minMap[dataColId] || getManualResizeMinimumWidth(dataColId), saved[dataColId] || dataDefaultWidth);
    }
    return widthMap;
  }

  function getStickyLeftOffset(widthMap, idx) {
    var left = 0;
    for (var i = 0; i < idx; i++) left += widthMap['row-' + i] || 0;
    return Math.max(0, left - idx);
  }

  function getStickyZIndex(baseZIndex, idx, totalStickyCols) {
    var total = Math.max(1, totalStickyCols || 1);
    return baseZIndex + (total - idx);
  }

  function getResizeHandleHtml(colId) {
    return '<span class="pivot-col-resizer" data-resize-col="' + escapeHtml(colId) + '"></span>';
  }

  function getGroupedResizeHandleHtml(colIds) {
    var ids = colIds || [];
    var primaryCol = ids.length ? ids[ids.length - 1] : '';
    return '<span class="pivot-col-resizer" data-resize-col="' + escapeHtml(primaryCol) + '" data-resize-group="' + escapeHtml(ids.join(',')) + '"></span>';
  }

  function getSortIndicatorHtml(type, dimIdx, sortState) {
    var dir = '';
    var order = 0;
    for (var i = 0; i < sortState.length; i++) {
      if (sortState[i].type === type && sortState[i].dimIdx === dimIdx) {
        dir = sortState[i].dir;
        order = i + 1;
        break;
      }
    }

    var arrow = dir === 'asc' ? '\u25B2' : (dir === 'desc' ? '\u25BC' : '\u25B2');
    var arrowClass = 'pivot-sort-arrow' + (dir ? '' : ' pivot-sort-idle');
    var orderBadge = (dir && sortState.length > 1) ? '<sup class="pivot-sort-order">' + order + '</sup>' : '';

    return '<span class="pivot-sort-btn" data-sort-type="' + type + '" data-sort-dim="' + dimIdx +
      '" aria-hidden="true">' +
      '<span class="' + arrowClass + '">' + arrow + '</span>' +
      orderBadge +
      '</span>';
  }

  function getSortControlHtml(type, dimIdx, label, sortState) {
    var activeClass = '';
    var activeDir = '';
    for (var i = 0; i < sortState.length; i++) {
      if (sortState[i].type === type && sortState[i].dimIdx === dimIdx) {
        activeClass = ' pivot-sort-control-active';
        activeDir = sortState[i].dir;
        break;
      }
    }
    var ascClass = activeDir === 'asc' ? ' pivot-sort-dir-active' : '';
    var descClass = activeDir === 'desc' ? ' pivot-sort-dir-active' : '';
    return '<div class="pivot-sort-control' + activeClass + '" data-sort-type="' + type + '" data-sort-dim="' + dimIdx + '">' +
      '<button type="button" class="pivot-sort-control-main" data-sort-type="' + type + '" data-sort-dim="' + dimIdx + '">' +
      '<span class="pivot-sort-control-label">' + escapeHtml(label) + '</span>' +
      getSortIndicatorHtml(type, dimIdx, sortState) +
      '</button>' +
      '<button type="button" class="pivot-sort-dir' + ascClass + '" data-sort-type="' + type + '" data-sort-dim="' + dimIdx + '" data-sort-dir="asc">Asc</button>' +
      '<button type="button" class="pivot-sort-dir' + descClass + '" data-sort-type="' + type + '" data-sort-dim="' + dimIdx + '" data-sort-dir="desc">Desc</button>' +
      '</div>';
  }

  function getExportButtonHtml() {
    return '<button type="button" class="pivot-export-xlsx" aria-label="Export to Excel" title="Export to Excel">' +
      '<span class="pivot-export-xlsx-icon" aria-hidden="true">X</span>' +
      '<span class="pivot-export-xlsx-label">Export to Excel</span>' +
      '</button>';
  }

  function getUnfixHeadersControlHtml(formatting) {
    var checked = getEffectiveBoolean(formatting.unfixHeaders, false) ? ' checked' : '';
    return '<label class="pivot-unfix-headers-control" title="When checked, row and column headers scroll with the values">' +
      '<input type="checkbox" class="pivot-unfix-headers-toggle"' + checked + '>' +
      '<span class="pivot-unfix-headers-label">Unfix Rows and Columns</span>' +
      '</label>';
  }

  function renderSortToolbar(instance, pivotData) {
    var sortState = getEffectiveToolbarSortState(instance, pivotData);
    var collapsedClass = instance._sortToolbarCollapsed ? ' pivot-sort-toolbar-collapsed' : '';
    var html = '<div class="pivot-sort-toolbar-wrap' + collapsedClass + '">';
    html += '<div class="pivot-sort-toolbar-toggle-row">';
    html += '<button type="button" class="pivot-sort-toolbar-toggle" aria-label="Toggle sort controls" title="Toggle sort controls">&#9776;</button>';
    html += getExportButtonHtml();
    html += getUnfixHeadersControlHtml(pivotData.formatting || instance._getFormattingOptions());
    html += '</div>';
    html += '<div class="pivot-sort-toolbar">';
    var i;

    html += '<div class="pivot-sort-toolbar-meta">';
    html += '<span class="pivot-sort-help">Click to sort, Shift+click to multi-sort</span>';
    if (sortState.length) {
      html += '<button type="button" class="pivot-sort-clear">Clear Sort</button>';
    }
    html += '</div>';

    if (pivotData.rowDimNames && pivotData.rowDimNames.length) {
      html += '<div class="pivot-sort-row"><div class="pivot-sort-group"><span class="pivot-sort-group-label">Rows</span>';
      for (i = 0; i < pivotData.rowDimNames.length; i++) {
        html += getSortControlHtml('row', i, pivotData.rowDimNames[i], sortState);
      }
      html += '</div></div>';
    }

    if (pivotData.colDimNames && pivotData.colDimNames.length) {
      html += '<div class="pivot-sort-row"><div class="pivot-sort-group"><span class="pivot-sort-group-label">Columns</span>';
      for (i = 0; i < pivotData.colDimNames.length; i++) {
        html += getSortControlHtml('col', i, pivotData.colDimNames[i], sortState);
      }
      html += '</div></div>';
    }

    html += '</div>';
    html += '</div>';
    return html;
  }

  function crc32(str) {
    var table = crc32._table;
    if (!table) {
      table = [];
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
      }
      crc32._table = table;
    }

    var crc = 0 ^ (-1);
    for (var i = 0; i < str.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function utf8Encode(str) {
    str = String(str || '');
    if (typeof TextEncoder !== 'undefined') {
      var bytes = new TextEncoder().encode(str);
      var out = '';
      for (var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
      return out;
    }
    return unescape(encodeURIComponent(str));
  }

  function putUint16(value) {
    return String.fromCharCode(value & 0xFF, (value >>> 8) & 0xFF);
  }

  function putUint32(value) {
    return String.fromCharCode(
      value & 0xFF,
      (value >>> 8) & 0xFF,
      (value >>> 16) & 0xFF,
      (value >>> 24) & 0xFF
    );
  }

  function createZip(files) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    for (var i = 0; i < files.length; i++) {
      var name = utf8Encode(files[i].name);
      var content = utf8Encode(files[i].content);
      var crc = crc32(content);
      var size = content.length;

      var localHeader =
        putUint32(0x04034b50) +
        putUint16(20) +
        putUint16(0x0800) +
        putUint16(0) +
        putUint16(0) +
        putUint16(0) +
        putUint32(crc) +
        putUint32(size) +
        putUint32(size) +
        putUint16(name.length) +
        putUint16(0) +
        name;

      localParts.push(localHeader, content);

      var centralHeader =
        putUint32(0x02014b50) +
        putUint16(20) +
        putUint16(20) +
        putUint16(0x0800) +
        putUint16(0) +
        putUint16(0) +
        putUint16(0) +
        putUint32(crc) +
        putUint32(size) +
        putUint32(size) +
        putUint16(name.length) +
        putUint16(0) +
        putUint16(0) +
        putUint16(0) +
        putUint16(0) +
        putUint32(0) +
        putUint32(offset) +
        name;

      centralParts.push(centralHeader);
      offset += localHeader.length + size;
    }

    var central = centralParts.join('');
    var local = localParts.join('');
    var end =
      putUint32(0x06054b50) +
      putUint16(0) +
      putUint16(0) +
      putUint16(files.length) +
      putUint16(files.length) +
      putUint32(central.length) +
      putUint32(local.length) +
      putUint16(0);

    return local + central + end;
  }

  function excelColumnName(index) {
    var name = '';
    var n = index + 1;
    while (n > 0) {
      var rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function excelCellRef(rowIdx, colIdx) {
    return excelColumnName(colIdx) + String(rowIdx + 1);
  }

  function excelMergeRef(startRowIdx, startColIdx, endRowIdx, endColIdx) {
    return excelCellRef(startRowIdx, startColIdx) + ':' + excelCellRef(endRowIdx, endColIdx);
  }

  function toExcelRgb(cssColor, fallback) {
    var rgb = parseColorToRgb(cssColor);
    if (!rgb && typeof document !== 'undefined') {
      var safe = sanitizeCssColor(cssColor);
      if (safe) {
        if (!toExcelRgb._probeEl) toExcelRgb._probeEl = document.createElement('span');
        var probe = toExcelRgb._probeEl;
        probe.style.color = '';
        probe.style.color = safe;
        rgb = parseColorToRgb(probe.style.color || '');
      }
    }
    if (!rgb) rgb = parseColorToRgb(fallback || '#ffffff');
    if (!rgb) return 'FFFFFFFF';
    function hexPart(v) {
      var h = Math.max(0, Math.min(255, Math.round(v))).toString(16).toUpperCase();
      return h.length === 1 ? '0' + h : h;
    }
    return 'FF' + hexPart(rgb.r) + hexPart(rgb.g) + hexPart(rgb.b);
  }

  function getExportTitle(instance) {
    if (!instance) return '';
    var methodNames = [
      'getTitle',
      'getCaption',
      'getViewDisplayName',
      'getViewName'
    ];
    for (var i = 0; i < methodNames.length; i++) {
      try {
        var fn = instance[methodNames[i]];
        if (typeof fn !== 'function') continue;
        var value = fn.call(instance);
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          var title = String(value).trim();
          var normalizedTitle = title.toLowerCase();
          if (
            normalizedTitle === 'attribute pivot' ||
            normalizedTitle === 'attr pivot' ||
            normalizedTitle === 'com.smartq.attributepivotviz'
          ) {
            continue;
          }
          return title;
        }
      } catch (e) {}
    }
    return '';
  }

  function getWorkbookRows(pivotData, formatting, instance) {
    var rows = [];
    if (!pivotData) return rows;
    var merges = [];
    var styleRows = [];
    var customStyleDefs = {};

    var rowDimNames = pivotData.rowDimNames || [];
    var colDimNames = pivotData.colDimNames || [];
    var valNames = pivotData.valNames || [];
    var colKeys = pivotData.colKeys || [];
    var rowKeys = pivotData.rowKeys || [];
    var rowLabels = pivotData.rowLabels || {};
    var colLabels = pivotData.colLabels || {};
    var cellMap = pivotData.displayCellMap || pivotData.cellMap || {};
    var numVals = valNames.length || 1;
    var numMeasures = (pivotData.measureNames && pivotData.measureNames.length) ? pivotData.measureNames.length : 0;
    var dateFormat = (formatting && formatting.dateFormat) ? formatting.dateFormat : 'auto';
    var showValues = getEffectiveBoolean(formatting && formatting.showValues, true);
    var compressRows = getEffectiveBoolean(formatting && formatting.compressRows, true);
    var compressCols = getEffectiveBoolean(formatting && formatting.compressCols, true);
    var showEdgeLabels = getEffectiveBoolean(formatting && formatting.showEdgeLabels, true);

    function fmtDim(v) { return formatDimValue(v, dateFormat); }
    function getCustomStyleKey(bgColor, fgColor) {
      var fillRgb = toExcelRgb(bgColor, '#ffffff');
      var fontRgb = toExcelRgb(fgColor || getContrastingTextColor(bgColor), '#202020');
      var key = 'fill:' + fillRgb + ':font:' + fontRgb;
      customStyleDefs[key] = {
        fillRgb: fillRgb,
        fontRgb: fontRgb
      };
      return key;
    }

    var totalColumnCount = rowDimNames.length + colKeys.length;
    var exportTitle = getExportTitle(instance);
    var titleRowCount = 0;
    if (exportTitle && totalColumnCount > 0) {
      var titleRow = [exportTitle];
      var titleStyleRow = ['title'];
      for (var titleCol = 1; titleCol < totalColumnCount; titleCol++) {
        titleRow.push('');
        titleStyleRow.push('title');
      }
      rows.push(titleRow);
      styleRows.push(titleStyleRow);
      if (totalColumnCount > 1) {
        merges.push(excelMergeRef(0, 0, 0, totalColumnCount - 1));
      }

      var spacerRow = [];
      var spacerStyleRow = [];
      for (var spacerCol = 0; spacerCol < totalColumnCount; spacerCol++) {
        spacerRow.push('');
        spacerStyleRow.push('spacer');
      }
      rows.push(spacerRow);
      styleRows.push(spacerStyleRow);
      titleRowCount = 2;
    }

    var headerRowCount = Math.max(1, colDimNames.length);
    var headerStartRow = rows.length;
    for (var hr = 0; hr < headerRowCount; hr++) {
      var header = [];
      var headerStyles = [];
      for (var rdHeader = 0; rdHeader < rowDimNames.length; rdHeader++) {
        header.push((showEdgeLabels && hr === headerRowCount - 1) ? rowDimNames[rdHeader] : '');
        headerStyles.push('rowHeader');
      }
      for (var c = 0; c < colKeys.length; c++) {
        var labels = colLabels[colKeys[c]] || [];
        var headerValue = labels[hr];
        if (headerValue === undefined || headerValue === null || headerValue === '') {
          headerValue = (headerRowCount === 1) ? colKeys[c] : '';
        }
        header.push(fmtDim(headerValue));
        headerStyles.push('colHeader');
      }
      rows.push(header);
      styleRows.push(headerStyles);

      if (compressCols) {
        var groupStart = 0;
        for (var gc = 1; gc <= colKeys.length; gc++) {
          var prevLabels = colLabels[colKeys[gc - 1]] || [];
          var currLabels = gc < colKeys.length ? (colLabels[colKeys[gc]] || []) : null;
          var prevLabel = prevLabels[hr] || '';
          var currLabel = currLabels ? (currLabels[hr] || '') : null;
          var prevPrefix = prevLabels.slice(0, hr).join('\x1f');
          var currPrefix = currLabels ? currLabels.slice(0, hr).join('\x1f') : null;
          if (gc === colKeys.length || prevLabel !== currLabel || prevPrefix !== currPrefix) {
            var groupCount = gc - groupStart;
            if (groupCount > 1 && prevLabel !== '') {
              var headerRowIdx = headerStartRow + hr;
              merges.push(excelMergeRef(headerRowIdx, rowDimNames.length + groupStart, headerRowIdx, rowDimNames.length + gc - 1));
              for (var blankCol = groupStart + 1; blankCol < gc; blankCol++) {
                rows[headerStartRow + hr][rowDimNames.length + blankCol] = '';
              }
            }
            groupStart = gc;
          }
        }
      }
    }

    var rowHeaderLayout = buildRowHeaderLayout(rowKeys, rowLabels, cellMap, colKeys, numVals, rowDimNames.length, compressRows);
    for (var ri = 0; ri < rowKeys.length; ri++) {
      var rowKey = rowKeys[ri];
      var maxSubRows = rowHeaderLayout.subRowCountByKey[rowKey] || 1;
      for (var subRow = 0; subRow < maxSubRows; subRow++) {
        var outRow = [];
        var outStyleRow = [];
        var rowVals = rowLabels[rowKey] || [];
        for (var rd = 0; rd < rowDimNames.length; rd++) {
          var rowHeaderSpan = rowHeaderLayout.spanByKey[rowKey] ? rowHeaderLayout.spanByKey[rowKey][rd] : maxSubRows;
          outRow.push((subRow === 0 && rowHeaderSpan) ? fmtDim(rowVals[rd] || '') : '');
          outStyleRow.push('rowHeader');
          if (subRow === 0 && compressRows && rowHeaderSpan > 1) {
            merges.push(excelMergeRef(rows.length, rd, rows.length + rowHeaderSpan - 1, rd));
          }
        }

        for (var ci = 0; ci < colKeys.length; ci++) {
          var colKey = colKeys[ci];
          var displayEntries = (cellMap[rowKey] && cellMap[rowKey][colKey]) ? cellMap[rowKey][colKey] : [];
          var displayEntry = displayEntries[subRow] || null;
          var entry = displayEntry ? displayEntry.entry : null;
          var valueIdx = displayEntry ? displayEntry.valueIdx : -1;
          var cellParts = [];
          var cellVal = '';

          if (entry && valueIdx >= 0 && entry.vals && entry.vals.length > valueIdx) {
            cellVal = fmtDim(entry.vals[valueIdx]);
            if (cellVal !== '') cellParts.push(cellVal);
          }

          var safeColor = '';
          if (entry && entry.color) {
            safeColor = sanitizeCssColor(entry.color);
            if (!safeColor && pivotData.colorCategoryMap && pivotData.colorCategoryMap[entry.color]) {
              safeColor = pivotData.colorCategoryMap[entry.color];
            }
          }
          var metricBg = '';
          var metricFg = '';
          var entryMetricColorRawVals = (entry && entry.metricColorRawVals) ? entry.metricColorRawVals : [];
          if (pivotData.metricColorRange && entryMetricColorRawVals.length && formatting.metricColorScheme !== 'none') {
            var mcNum = Number(entryMetricColorRawVals[0]);
            if (isFinite(mcNum)) {
              metricBg = getContinuousCellColor(
                mcNum,
                pivotData.metricColorRange.min,
                pivotData.metricColorRange.max,
                formatting.metricColorScheme
              );
              if (metricBg) metricFg = getContrastingTextColor(metricBg);
            }
          }

          if (showValues && entry && numMeasures > 0) {
            for (var mi = 0; mi < numMeasures; mi++) {
              var mvStr = formatMeasureValue(
                (entry.measureRawVals && entry.measureRawVals[mi] !== undefined) ? entry.measureRawVals[mi] : '',
                (entry.measureVals && entry.measureVals[mi] !== undefined) ? entry.measureVals[mi] : '',
                (formatting && formatting.valueFormat) ? formatting.valueFormat : 'auto'
              );
              if (mvStr !== '') {
                cellParts.push(mvStr);
              }
            }
          }

          outRow.push(showValues ? cellParts.join('\n') : '');
          var cellBgExport = normalizeCellBackground(formatting && formatting.cellBackground);
          if (safeColor) {
            outStyleRow.push(getCustomStyleKey(safeColor, getContrastingTextColor(safeColor)));
          } else if (metricBg && cellVal === '') {
            outStyleRow.push(getCustomStyleKey(metricBg, metricFg || '#202020'));
          } else if (cellBgExport !== 'none') {
            outStyleRow.push(getCustomStyleKey(cellBgExport, getContrastingTextColor(cellBgExport)));
          } else {
            outStyleRow.push('data');
          }
        }
        rows.push(outRow);
        styleRows.push(outStyleRow);
      }
    }
    rows._merges = merges;
    rows._headerRowCount = headerRowCount;
    rows._titleRowCount = titleRowCount;
    rows._rowDimCount = rowDimNames.length;
    rows._styleRows = styleRows;
    rows._customStyleDefs = customStyleDefs;
    return rows;
  }

  function getWorksheetStyleIndex(rowIdx, colIdx, rows) {
    if (rows && rows._styleRows && rows._styleRows[rowIdx] && rows._styleRows[rowIdx][colIdx]) {
      var styleKey = rows._styleRows[rowIdx][colIdx];
      if (rows._styleIndexMap && rows._styleIndexMap[styleKey] !== undefined) {
        return rows._styleIndexMap[styleKey];
      }
    }
    var headerRowCount = (rows && rows._headerRowCount) ? rows._headerRowCount : 1;
    var rowDimCount = (rows && rows._rowDimCount) ? rows._rowDimCount : 0;
    if (rowIdx < headerRowCount && colIdx >= rowDimCount) return 1;
    if (colIdx < rowDimCount) return 2;
    return 3;
  }

  function createWorksheetXml(rows) {
    var merges = (rows && rows._merges) ? rows._merges : [];
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>';

    for (var r = 0; r < rows.length; r++) {
      xml += '<row r="' + (r + 1) + '">';
      var row = rows[r] || [];
      for (var c = 0; c < row.length; c++) {
        var cellRef = excelColumnName(c) + (r + 1);
        var value = (row[c] === null || row[c] === undefined) ? '' : String(row[c]);
        xml += '<c r="' + cellRef + '" s="' + getWorksheetStyleIndex(r, c, rows) + '" t="inlineStr"><is><t xml:space="preserve">' +
          escapeXml(value) +
          '</t></is></c>';
      }
      xml += '</row>';
    }

    xml += '</sheetData>';
    if (merges.length) {
      xml += '<mergeCells count="' + merges.length + '">';
      for (var m = 0; m < merges.length; m++) {
        xml += '<mergeCell ref="' + escapeXml(merges[m]) + '"/>';
      }
      xml += '</mergeCells>';
    }
    xml += '</worksheet>';
    return xml;
  }

  function createStylesXml(rows) {
    var customDefs = (rows && rows._customStyleDefs) ? rows._customStyleDefs : {};
    var customKeys = toSortedKeys(customDefs);
    var fontMap = { 'FF202020': 0 };
    var fonts = ['<font><sz val="11"/><color rgb="FF202020"/><name val="Calibri"/><family val="2"/></font>'];
    var fills = [
      '<fill><patternFill patternType="none"/></fill>',
      '<fill><patternFill patternType="gray125"/></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F3F3"/><bgColor indexed="64"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF5F5F5"/><bgColor indexed="64"/></patternFill></fill>'
    ];
    var styleIndexMap = {
      colHeader: 1,
      rowHeader: 2,
      data: 3,
      title: 4,
      spacer: 5
    };
    var xfs = [
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
      '<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
      '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>',
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>',
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="0"/></xf>',
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    ];

    for (var i = 0; i < customKeys.length; i++) {
      var def = customDefs[customKeys[i]];
      if (fontMap[def.fontRgb] === undefined) {
        fontMap[def.fontRgb] = fonts.length;
        fonts.push('<font><sz val="11"/><color rgb="' + escapeXml(def.fontRgb) + '"/><name val="Calibri"/><family val="2"/></font>');
      }
      var fillId = fills.length;
      fills.push('<fill><patternFill patternType="solid"><fgColor rgb="' + escapeXml(def.fillRgb) + '"/><bgColor indexed="64"/></patternFill></fill>');
      styleIndexMap[customKeys[i]] = xfs.length;
      xfs.push('<xf numFmtId="0" fontId="' + fontMap[def.fontRgb] + '" fillId="' + fillId + '" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>');
    }

    if (rows) rows._styleIndexMap = styleIndexMap;

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="' + fonts.length + '">' + fonts.join('') + '</fonts>' +
      '<fills count="' + fills.length + '">' + fills.join('') + '</fills>' +
      '<borders count="2">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border>' +
      '<left style="thin"><color rgb="FFD0D0D0"/></left>' +
      '<right style="thin"><color rgb="FFD0D0D0"/></right>' +
      '<top style="thin"><color rgb="FFD0D0D0"/></top>' +
      '<bottom style="thin"><color rgb="FFD0D0D0"/></bottom>' +
      '<diagonal/>' +
      '</border>' +
      '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
      '</styleSheet>';
  }

  function createXlsxBlob(rows) {
    var stylesXml = createStylesXml(rows);
    var worksheetXml = createWorksheetXml(rows);
    var workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Attribute Pivot" sheetId="1" r:id="rId1"/></sheets></workbook>';
    var workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>';
    var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';
    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>';

    var zip = createZip([
      { name: '[Content_Types].xml', content: contentTypes },
      { name: '_rels/.rels', content: rootRels },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
      { name: 'xl/styles.xml', content: stylesXml },
      { name: 'xl/worksheets/sheet1.xml', content: worksheetXml }
    ]);

    var bytes = new Uint8Array(zip.length);
    for (var i = 0; i < zip.length; i++) bytes[i] = zip.charCodeAt(i) & 0xFF;
    return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function downloadBlob(blob, filename) {
    var urlApi = (typeof URL !== 'undefined') ? URL : ((typeof window !== 'undefined') ? (window.URL || window.webkitURL) : null);
    if (!urlApi || !urlApi.createObjectURL) return;
    var url = urlApi.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(function() {
      try { document.body.removeChild(link); } catch (e) {}
      try { urlApi.revokeObjectURL(url); } catch (e2) {}
    }, 0);
  }

  function getExportFilename() {
    var stamp = '';
    try {
      stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    } catch (e) {
      stamp = String(new Date().getTime());
    }
    return 'attribute-pivot-' + stamp + '.xlsx';
  }

  function getColGroupHtml(pivotData, widthMap) {
    var html = '<colgroup>';
    var i;
    for (i = 0; i < pivotData.rowDimNames.length; i++) {
      html += '<col data-col-id="row-' + i + '" style="width:' + (widthMap['row-' + i] || 0) + 'px;">';
    }
    for (i = 0; i < pivotData.colKeys.length; i++) {
      html += '<col data-col-id="data-' + i + '" style="width:' + (widthMap['data-' + i] || 0) + 'px;">';
    }
    html += '</colgroup>';
    return html;
  }

  // =========================================================================
  // TOOLTIP
  // =========================================================================

  PivotViz.prototype._ensureTooltip = function(containerEl) {
    if (this._tooltipEl) return this._tooltipEl;
    var tt = document.createElement('div');
    tt.className = 'pivot-tooltip';
    (containerEl || this.getContainerElem()).appendChild(tt);
    this._tooltipEl = tt;
    return tt;
  };

  PivotViz.prototype._showTooltip = function(html, x, y) {
    var tt = this._ensureTooltip();
    tt.innerHTML = html;
    tt.style.display = 'block';
    tt.classList.add('visible');
    this._moveTooltip(x, y);
  };

  PivotViz.prototype._moveTooltip = function(x, y) {
    var tt = this._tooltipEl;
    if (!tt) return;
    var pad = 12;
    var left = x + pad;
    var top  = y + pad;
    var ttW  = tt.offsetWidth;
    var ttH  = tt.offsetHeight;
    if (left + ttW > window.innerWidth  - 10) left = Math.max(10, x - ttW - pad);
    if (top  + ttH > window.innerHeight - 10) top  = Math.max(10, y - ttH - pad);
    tt.style.left = left + 'px';
    tt.style.top  = top  + 'px';
  };

  PivotViz.prototype._hideTooltip = function() {
    if (this._tooltipEl) {
      this._tooltipEl.classList.remove('visible');
      this._tooltipEl.style.display = 'none';
    }
  };

  // =========================================================================
  // DATA EXTRACTION
  // =========================================================================

  /**
   * Try to get column IDs for a specific logical edge.
   * Returns null when not supported by the running OAC version.
   */
  function tryLogicalColumns(oDataModel, logicalEdge) {
    var cols = null;
    var edgeCandidates = [];
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

    // Newer/alternate model API seen in OAC internals.
    for (var ec0 = 0; ec0 < edgeCandidates.length; ec0++) {
      try {
        cols = oDataModel.getUsedColumnIDsIn && oDataModel.getUsedColumnIDsIn(edgeCandidates[ec0]);
        if (cols && cols.length > 0) return cols.slice();
      } catch (e0) {}
    }
    // Common API used by many custom visualizations.
    for (var ec1 = 0; ec1 < edgeCandidates.length; ec1++) {
      try {
        cols = oDataModel.getColumnIDsIn && oDataModel.getColumnIDsIn(edgeCandidates[ec1]);
        if (cols && cols.length > 0) return cols.slice();
      } catch (e) {}
    }
    // Some models expose logical edges by name only.
    try {
      if (oDataModel.getLogicalEdges) {
        var edges = oDataModel.getLogicalEdges();
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
    return null;
  }

  /**
   * Resolve a user-visible display name for a column.
   */
  function resolveDisplayName(oDataModel, colId) {
    if (!colId) return null;
    try {
      var cObj = oDataModel.getColumnByID(colId);
      if (cObj) {
        if (cObj.getCaption     && cObj.getCaption())     return cObj.getCaption();
        if (cObj.getDisplayName && cObj.getDisplayName()) return cObj.getDisplayName();
        if (cObj.getName        && cObj.getName())        return cObj.getName();
        if (cObj.getLabel       && cObj.getLabel())       return cObj.getLabel();
      }
    } catch (e) {}
    return (typeof colId === 'string') ? colId : ('Col' + colId);
  }

  /**
   * Extract all pivot data from the OAC data layout.
   *
   * Returns an object:
   * {
   *   rowKeys:    string[]               – ordered unique row-dim combination keys
   *   colKeys:    string[]               – ordered unique col-dim combination keys
   *   rowLabels:  {key: string[]}        – rowKey -> array of dim values (one per row dim)
   *   colLabels:  {key: string[]}        – colKey -> array of dim values (one per col dim)
   *   cellMap:    {rowKey: {colKey: object[]}} – per intersection: list of entry objects
   *   rowDimNames: string[]              – display names of row dimension columns
   *   colDimNames: string[]              – display names of column dimension columns
   *   valNames:   string[]              – display names of cell value columns
   *   colorName:  string|null            – display name of optional color column
   *   tooltipNames: string[]             – display names of optional tooltip columns
   *   rowIndexMap: {rowKey: number[]}   – rowKey -> list of Physical.ROW indices (for marking)
   * }
   */
  PivotViz.prototype._extractPivotData = function(oDataLayout) {
    var result = {
      rowKeys:    [],
      colKeys:    [],
      rowLabels:  {},
      colLabels:  {},
      cellMap:    {},
      rowDimNames:[],
      colDimNames:[],
      valNames:   [],
      measureNames: [],
      metricColorName: null,
      colorName:  null,
      tooltipNames: [],
      colorCategoryMap: {},
      metricColorRange: null,
      rowIndexMap:{}
    };

    try {
      if (!oDataLayout) return result;

      var oDataModel = this._currentLogicalDataModel || this._currentDataModel || this.getRootDataModel();
      if (!oDataModel) return result;

      // -- Determine slot column ID lists --
      // Matrix core: ROW + SIZE + GLYPH
      // Optional enrichments: COLOR + TOOLTIP
      var rowDimCols = tryLogicalColumns(oDataModel, datamodelshapes.Logical.ROW);
      var colDimCols = tryLogicalColumns(oDataModel, datamodelshapes.Logical.SIZE);
      var valueCols  = tryLogicalColumns(oDataModel, datamodelshapes.Logical.GLYPH);
      var colorCols  = tryLogicalColumns(oDataModel, datamodelshapes.Logical.COLOR);
      var tooltipCols = tryLogicalColumns(oDataModel, datamodelshapes.Logical.TOOLTIP);
      var logicalDetailEdge = (datamodelshapes.Logical && datamodelshapes.Logical.DETAIL) ? datamodelshapes.Logical.DETAIL : 'detail';

      // Measure columns live in Physical.DATA (separate from Physical.ROW).
      // Main measure: Logical.MEASURES
      // Metric color measure: Logical.DETAIL
      var measureCols = [];
      var metricColorMeasureCols = [];
      var metricColorUsesMainMeasure = false;
      var physDataColIds = [];
      try {
        physDataColIds = (oDataModel.getColumnIDsIn && oDataModel.getColumnIDsIn(datamodelshapes.Physical.DATA)) ||
                         (oDataModel.getUsedColumnIDsIn && oDataModel.getUsedColumnIDsIn(datamodelshapes.Physical.DATA)) || [];
      } catch(ePhys) {}

      try {
        var logMeasureCols = tryLogicalColumns(oDataModel, datamodelshapes.Logical.MEASURES);
        if (logMeasureCols && logMeasureCols.length > 0) measureCols = logMeasureCols;
      } catch(e) {}
      try {
        var logMetricColorCols = tryLogicalColumns(oDataModel, logicalDetailEdge);
        if (logMetricColorCols && logMetricColorCols.length > 0) metricColorMeasureCols = logMetricColorCols;
      } catch(eDetail) {}

      // If the same measure is assigned to both Values and Metric Color,
      // reuse main measure values for coloring to avoid duplicated logical rows.
      if (metricColorMeasureCols.length && measureCols.length &&
          measureCols.indexOf(metricColorMeasureCols[0]) >= 0) {
        metricColorUsesMainMeasure = true;
        metricColorMeasureCols = [];
      }

      // Physical.ROW holds all categorical layers in mapper order.
      var allCols = [];
      try {
        allCols = (oDataModel.getColumnIDsIn && oDataModel.getColumnIDsIn(datamodelshapes.Physical.ROW)) ||
                  (oDataModel.getUsedColumnIDsIn && oDataModel.getUsedColumnIDsIn(datamodelshapes.Physical.ROW)) || [];
      } catch(e) {}

      // Ensure allCols is populated even when getColumnIDsIn(Physical.ROW) throws
      if (allCols.length === 0) {
        allCols = [].concat(rowDimCols || [], colDimCols || [], valueCols || [], colorCols || [], tooltipCols || []);
      }

      var rowDimLayers = [];
      var colDimLayers = [];
      var valueLayers = [];
      var colorLayers = [];
      var tooltipLayers = [];

      function buildSequentialLayers(startIdx, count) {
        var layers = [];
        for (var li = 0; li < count; li++) layers.push(startIdx + li);
        return layers;
      }

      function useSequentialPhysicalSplit() {
        var rowCount = (rowDimCols || []).length;
        var colCount = (colDimCols || []).length;
        var valueCount = (valueCols || []).length;
        var colorCount = (colorCols || []).length;
        var tooltipCount = (tooltipCols || []).length;
        var totalCount = rowCount + colCount + valueCount + colorCount + tooltipCount;

        if (!allCols.length || totalCount <= 0 || totalCount !== allCols.length) return false;

        var posSeq = 0;
        rowDimLayers = buildSequentialLayers(posSeq, rowCount);
        rowDimCols = allCols.slice(posSeq, posSeq + rowCount); posSeq += rowCount;
        colDimLayers = buildSequentialLayers(posSeq, colCount);
        colDimCols = allCols.slice(posSeq, posSeq + colCount); posSeq += colCount;
        valueLayers = buildSequentialLayers(posSeq, valueCount);
        valueCols = allCols.slice(posSeq, posSeq + valueCount); posSeq += valueCount;
        colorLayers = buildSequentialLayers(posSeq, colorCount);
        colorCols = allCols.slice(posSeq, posSeq + colorCount); posSeq += colorCount;
        tooltipLayers = buildSequentialLayers(posSeq, tooltipCount);
        tooltipCols = allCols.slice(posSeq, posSeq + tooltipCount);
        return true;
      }

      useSequentialPhysicalSplit();

      function firstIndexOfAny(cols) {
        var idx = -1;
        if (!cols || !cols.length) return -1;
        for (var i = 0; i < cols.length; i++) {
          var p = allCols.indexOf(cols[i]);
          if (p >= 0 && (idx < 0 || p < idx)) idx = p;
        }
        return idx;
      }

      function concatCols() {
        var out = [];
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i] || [];
          for (var j = 0; j < a.length; j++) out.push(a[j]);
        }
        return out;
      }

      // Strategy 2: infer missing slots by Physical.ROW order boundaries:
      // [row..., size..., glyph..., color..., tooltip...]
      function sameSet(a, b) {
        var i;
        if (!a || !b) return false;
        if (a.length !== b.length) return false;
        var s = {};
        for (i = 0; i < a.length; i++) s[a[i]] = (s[a[i]] || 0) + 1;
        for (i = 0; i < b.length; i++) {
          if (!s[b[i]]) return false;
          s[b[i]]--;
        }
        return true;
      }

      // Recovery: on some OAC builds all categorical edges collapse into TOOLTIP.
      // When that happens, recover by splitting Physical.ROW in declared edge order.
      var collapsedIntoTooltip =
        (!rowDimCols || rowDimCols.length === 0) &&
        (!colDimCols || colDimCols.length === 0) &&
        (!valueCols || valueCols.length === 0) &&
        (!colorCols || colorCols.length === 0) &&
        (tooltipCols && tooltipCols.length > 0) &&
        sameSet(tooltipCols, allCols);

      if (collapsedIntoTooltip) {
        var collapsedRowCount = 0;
        try { collapsedRowCount = oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW) || 0; } catch (e) {}

        function looksLikeColorName(colId) {
          var n = (resolveDisplayName(oDataModel, colId) || '').toLowerCase();
          return n.indexOf('color') >= 0 || n.indexOf('colour') >= 0 || n.indexOf('barva') >= 0;
        }

        function looksLikeCssColorColumn(colId) {
          var sampleN = Math.min(collapsedRowCount, 50);
          if (sampleN <= 0) return false;
          var layer = allCols.indexOf(colId);
          if (layer < 0) return false;
          var nonEmpty = 0;
          var cssLike = 0;
          for (var s = 0; s < sampleN; s++) {
            var raw = null;
            try { raw = oDataLayout.getValue(datamodelshapes.Physical.ROW, layer, s, false); } catch (e2) {}
            var txt = (raw !== null && raw !== undefined) ? String(raw).trim() : '';
            if (!txt) continue;
            nonEmpty++;
            if (sanitizeCssColor(txt)) cssLike++;
          }
          return nonEmpty > 0 && (cssLike / nonEmpty) >= 0.6;
        }

        var total = allCols.length;
        var cCount = Math.max(1, GRAMMAR_CONFIG.columnCount || 1);
        var vCount = Math.max(1, GRAMMAR_CONFIG.valueCount || 1);
        var clrCount = Math.max(0, GRAMMAR_CONFIG.colorCount || 0);
        var ttCount = Math.max(0, GRAMMAR_CONFIG.tooltipCount || 0);
        var possibleColorPos = total - 1 - ttCount;
        if (clrCount === 0 && possibleColorPos >= (cCount + vCount)) {
          var possibleColorCol = allCols[possibleColorPos];
          if (possibleColorCol && (looksLikeColorName(possibleColorCol) || looksLikeCssColorColumn(possibleColorCol))) {
            clrCount = 1;
          }
        }
        var reserved = cCount + vCount + clrCount + ttCount;
        var rCount = Math.max(1, total - reserved);
        if (rCount + reserved > total) {
          rCount = Math.max(1, total - (cCount + vCount));
          clrCount = 0;
          ttCount = Math.max(0, total - rCount - cCount - vCount);
        }
        var pos = 0;
        rowDimCols = allCols.slice(pos, pos + rCount); pos += rCount;
        colDimCols = allCols.slice(pos, pos + Math.min(cCount, total - pos)); pos += cCount;
        valueCols = allCols.slice(pos, pos + Math.min(vCount, total - pos)); pos += vCount;
        colorCols = allCols.slice(pos, pos + Math.min(clrCount, total - pos)); pos += clrCount;
        tooltipCols = allCols.slice(pos, pos + Math.min(ttCount, total - pos));
      }

      if (!rowDimCols || !rowDimCols.length) {
        var rowBoundary = firstIndexOfAny(concatCols(colDimCols, valueCols, colorCols, tooltipCols));
        if (rowBoundary > 0) {
          rowDimCols = allCols.slice(0, rowBoundary);
        }
      }

      if (!colDimCols || !colDimCols.length) {
        var rowEnd = firstIndexOfAny(rowDimCols);
        if (rowEnd >= 0) rowEnd += rowDimCols.length;
        else rowEnd = 0;
        var colBoundary = firstIndexOfAny(concatCols(valueCols, colorCols, tooltipCols));
        if (colBoundary > rowEnd) {
          colDimCols = allCols.slice(rowEnd, colBoundary);
        }
      }

      if (!valueCols || !valueCols.length) {
        var cEnd = firstIndexOfAny(colDimCols);
        if (cEnd >= 0) cEnd += colDimCols.length;
        else cEnd = (rowDimCols && rowDimCols.length) ? (firstIndexOfAny(rowDimCols) + rowDimCols.length) : 0;
        var valBoundary = firstIndexOfAny(concatCols(colorCols, tooltipCols));
        if (valBoundary > cEnd) {
          valueCols = allCols.slice(cEnd, valBoundary);
        }
      }

      if (!colorCols || !colorCols.length) {
        var vEnd = firstIndexOfAny(valueCols);
        if (vEnd >= 0) vEnd += valueCols.length;
        else vEnd = 0;
        var colorBoundary = firstIndexOfAny(tooltipCols);
        if (colorBoundary > vEnd) {
          colorCols = allCols.slice(vEnd, colorBoundary);
        }
      }

      if (!tooltipCols || !tooltipCols.length) {
        var colorEnd = firstIndexOfAny(colorCols);
        if (colorEnd >= 0) colorEnd += colorCols.length;
        else {
          colorEnd = firstIndexOfAny(valueCols);
          colorEnd = (colorEnd >= 0) ? (colorEnd + valueCols.length) : 0;
        }
        if (colorEnd < allCols.length) {
          tooltipCols = allCols.slice(colorEnd);
        }
      }

      function asSet(arr) {
        var s = {};
        for (var i = 0; i < (arr || []).length; i++) s[arr[i]] = true;
        return s;
      }

      // Recovery 2: if required slots are still empty and tooltip has most/all cols,
      // reassign from tooltip pool using physical slot order:
      //   COLOR -> SIZE(Columns) -> GLYPH(Values) -> TOOLTIP extras
      // Note: valueCols (glyph) is optional when measureCols are present.
      var hasValues = (valueCols && valueCols.length > 0) || (measureCols && measureCols.length > 0);
      var requiredMissing =
        (!rowDimCols || rowDimCols.length === 0) ||
        (!colDimCols || colDimCols.length === 0) ||
        !hasValues;

      if (requiredMissing && tooltipCols && tooltipCols.length) {
        var taken = asSet([].concat(rowDimCols || [], colDimCols || [], valueCols || [], colorCols || []));
        var tooltipPool = [];
        for (var tp = 0; tp < tooltipCols.length; tp++) {
          if (!taken[tooltipCols[tp]]) tooltipPool.push(tooltipCols[tp]);
        }

        if ((!rowDimCols || rowDimCols.length === 0) && allCols.length > 0) {
          rowDimCols = [allCols[0]];
          taken[allCols[0]] = true;
          tooltipPool = tooltipPool.filter(function(c) { return c !== allCols[0]; });
        }

        var needCols = (!colDimCols || colDimCols.length === 0) ? 1 : 0;
        var needVals = (!valueCols || valueCols.length === 0) ? 1 : 0;
        var needRequired = needCols + needVals;
        var reserveTooltip = Math.max(0, GRAMMAR_CONFIG.tooltipCount || 0);
        var canAssignColor = (!colorCols || colorCols.length === 0) && tooltipPool.length > (needRequired + reserveTooltip);

        var pos2 = 0;
        if (canAssignColor && pos2 < tooltipPool.length) {
          colorCols = [tooltipPool[pos2++]];
        }
        if (needCols && pos2 < tooltipPool.length) {
          colDimCols = [tooltipPool[pos2++]];
        }
        if (needVals && pos2 < tooltipPool.length) {
          valueCols = [tooltipPool[pos2++]];
        }
        tooltipCols = tooltipPool.slice(pos2);
      }

      // Strategy 3: hard fallback split only if inference still failed.
      // valueCols (glyph) is optional when measureCols are present.
      var hasValues3 = (valueCols && valueCols.length > 0) || (measureCols && measureCols.length > 0);
      if (!rowDimCols || !colDimCols || !valueCols || !colorCols || !tooltipCols ||
          rowDimCols.length === 0 || colDimCols.length === 0 || !hasValues3) {
        var assignedCols = {};
        (rowDimCols || []).forEach(function(c) { assignedCols[c] = true; });
        (colDimCols || []).forEach(function(c) { assignedCols[c] = true; });
        (valueCols  || []).forEach(function(c) { assignedCols[c] = true; });
        (colorCols  || []).forEach(function(c) { assignedCols[c] = true; });
        (tooltipCols || []).forEach(function(c) { assignedCols[c] = true; });

        var unassigned = allCols.filter(function(c) { return !assignedCols[c]; });

        if (!rowDimCols || rowDimCols.length === 0) {
          rowDimCols = unassigned.splice(0, Math.min(GRAMMAR_CONFIG.rowCount || 1, unassigned.length));
        }
        if (!colDimCols || colDimCols.length === 0) {
          colDimCols = unassigned.splice(0, Math.min(GRAMMAR_CONFIG.columnCount || 1, unassigned.length));
        }
        if (!valueCols || valueCols.length === 0) {
          valueCols = unassigned.splice(0, Math.min(GRAMMAR_CONFIG.valueCount || 1, unassigned.length));
        }
        if (!colorCols || colorCols.length === 0) {
          colorCols = unassigned.splice(0, Math.min(GRAMMAR_CONFIG.colorCount || 0, unassigned.length));
        }
        if (!tooltipCols || tooltipCols.length === 0) {
          tooltipCols = unassigned.splice(0, Math.min(GRAMMAR_CONFIG.tooltipCount || 0, unassigned.length));
        }
      }

      // -- Final fallback: if rowDimCols is still empty, derive from allCols --
      // Remove all columns that belong to other detected slots, remainder = row dims.
      if (!rowDimCols || rowDimCols.length === 0) {
        var otherSlotCols = {};
        var otherSlots = [colDimCols, valueCols, colorCols, tooltipCols];
        for (var os = 0; os < otherSlots.length; os++) {
          var sl = otherSlots[os] || [];
          for (var osi = 0; osi < sl.length; osi++) otherSlotCols[sl[osi]] = true;
        }
        var seen = {};
        rowDimCols = [];
        for (var fi = 0; fi < allCols.length; fi++) {
          var fid = allCols[fi];
          if (!otherSlotCols[fid] && !seen[fid]) {
            rowDimCols.push(fid);
            seen[fid] = true;
          }
        }
      }

      // Do not remove columns from one logical slot just because the same
      // source attribute is also placed in another slot. OAC allows the same
      // attribute to be reused across Rows, Value (Attribute), Tooltip, etc.,
      // and stripping overlaps here causes row headers to disappear or the
      // viz to fall into the "No data available" state.

      // -- Collect display names --
      for (var i = 0; i < rowDimCols.length; i++) {
        result.rowDimNames.push(resolveDisplayName(oDataModel, rowDimCols[i]) || ('Row ' + (i + 1)));
      }
      for (var i = 0; i < colDimCols.length; i++) {
        result.colDimNames.push(resolveDisplayName(oDataModel, colDimCols[i]) || ('Column ' + (i + 1)));
      }
      for (var i = 0; i < valueCols.length; i++) {
        result.valNames.push(resolveDisplayName(oDataModel, valueCols[i]) || ('Value ' + (i + 1)));
      }
      result.colorName = colorCols.length ? (resolveDisplayName(oDataModel, colorCols[0]) || 'Color') : null;
      for (var i = 0; i < tooltipCols.length; i++) {
        result.tooltipNames.push(resolveDisplayName(oDataModel, tooltipCols[i]) || ('Tooltip ' + (i + 1)));
      }
      for (var i = 0; i < measureCols.length; i++) {
        result.measureNames.push(resolveDisplayName(oDataModel, measureCols[i]) || ('Measure ' + (i + 1)));
      }
      result.metricColorName = metricColorMeasureCols.length ?
        (resolveDisplayName(oDataModel, metricColorMeasureCols[0]) || 'Metric Color') :
        (metricColorUsesMainMeasure && result.measureNames.length ? result.measureNames[0] : null);

      debugLog('slot-resolution', {
        allCols: allCols.slice(),
        rowDimCols: rowDimCols.slice(),
        colDimCols: colDimCols.slice(),
        valueCols: valueCols.slice(),
        colorCols: colorCols.slice(),
        tooltipCols: tooltipCols.slice(),
        rowDimLayers: rowDimLayers.slice(),
        colDimLayers: colDimLayers.slice(),
        valueLayers: valueLayers.slice(),
        colorLayers: colorLayers.slice(),
        tooltipLayers: tooltipLayers.slice(),
        rowDimNames: result.rowDimNames.slice(),
        colDimNames: result.colDimNames.slice(),
        valNames: result.valNames.slice()
      });

      // -- Read all data rows --
      var dataRowCount = 0;
      try { dataRowCount = oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW) || 0; } catch(e) {}

      // Build robust index map for layer lookup.
      // In some OA mappings, logical slot column IDs differ from Physical.ROW IDs;
      // fallback by normalized display/name tokens keeps slot reads stable.
      var layerByToken = {};
      for (var aci = 0; aci < allCols.length; aci++) {
        var aid = allCols[aci];
        var candidates = [
          aid,
          resolveDisplayName(oDataModel, aid)
        ];
        try {
          var cObj = oDataModel.getColumnByID && oDataModel.getColumnByID(aid);
          if (cObj) {
            if (cObj.getName) candidates.push(cObj.getName());
            if (cObj.getDisplayName) candidates.push(cObj.getDisplayName());
            if (cObj.getCaption) candidates.push(cObj.getCaption());
            if (cObj.getLabel) candidates.push(cObj.getLabel());
          }
        } catch (eMeta) {}
        for (var ciTok = 0; ciTok < candidates.length; ciTok++) {
          var tok = toNormToken(candidates[ciTok]);
          if (!tok) continue;
          if (layerByToken[tok] === undefined) layerByToken[tok] = aci;
        }
      }

      var dataColByToken = {};
      for (var dci = 0; dci < physDataColIds.length; dci++) {
        var did = physDataColIds[dci];
        var dataCandidates = [
          did,
          resolveDisplayName(oDataModel, did)
        ];
        try {
          var dObj = oDataModel.getColumnByID && oDataModel.getColumnByID(did);
          if (dObj) {
            if (dObj.getName) dataCandidates.push(dObj.getName());
            if (dObj.getDisplayName) dataCandidates.push(dObj.getDisplayName());
            if (dObj.getCaption) dataCandidates.push(dObj.getCaption());
            if (dObj.getLabel) dataCandidates.push(dObj.getLabel());
          }
        } catch (eDataMeta) {}
        for (var dTokIdx = 0; dTokIdx < dataCandidates.length; dTokIdx++) {
          var dTok = toNormToken(dataCandidates[dTokIdx]);
          if (!dTok) continue;
          if (dataColByToken[dTok] === undefined) dataColByToken[dTok] = dci;
        }
      }

      function layerOf(colId) {
        var idx = allCols.indexOf(colId);
        if (idx >= 0) return idx;

        var fallbackCandidates = [
          colId,
          resolveDisplayName(oDataModel, colId)
        ];
        try {
          var colObj = oDataModel.getColumnByID && oDataModel.getColumnByID(colId);
          if (colObj) {
            if (colObj.getName) fallbackCandidates.push(colObj.getName());
            if (colObj.getDisplayName) fallbackCandidates.push(colObj.getDisplayName());
            if (colObj.getCaption) fallbackCandidates.push(colObj.getCaption());
            if (colObj.getLabel) fallbackCandidates.push(colObj.getLabel());
          }
        } catch (eCol) {}

        for (var fi = 0; fi < fallbackCandidates.length; fi++) {
          var token = toNormToken(fallbackCandidates[fi]);
          if (!token) continue;
          if (layerByToken[token] !== undefined) return layerByToken[token];
        }
        return -1;
      }

      function readLayersAsStrings(layers, rowIdx, normalize) {
        var out = [];
        for (var i = 0; i < layers.length; i++) {
          var v = null;
          try { v = oDataLayout.getValue(datamodelshapes.Physical.ROW, layers[i], rowIdx, false); } catch (e) {}
          if (normalize) out.push(normalizeDimValue(v));
          else out.push((v !== null && v !== undefined) ? String(v) : '');
        }
        return out;
      }

      // Seen-set for deduplicating entries per (rowKey, colKey) intersection
      var cellValueSeen = {};
      var nonCssColorValues = {};

      function readColsAsStrings(cols, rowIdx, normalize) {
        var out = [];
        for (var i = 0; i < cols.length; i++) {
          var v = null;
          try { v = oDataLayout.getValue(datamodelshapes.Physical.ROW, layerOf(cols[i]), rowIdx, false); } catch (e) {}
          if (normalize) {
            out.push(normalizeDimValue(v));
          } else {
            out.push((v !== null && v !== undefined) ? String(v) : '');
          }
        }
        return out;
      }

      function readSlotAsStrings(cols, layers, rowIdx, normalize) {
        if (layers && layers.length === cols.length) {
          return readLayersAsStrings(layers, rowIdx, normalize);
        }
        return readColsAsStrings(cols, rowIdx, normalize);
      }


      function dataColIndexOf(colId, fallbackIdx) {
        if (physDataColIds && physDataColIds.length) {
          var idx = physDataColIds.indexOf(colId);
          if (idx >= 0) return idx;
        }
        var fallbackCandidates = [
          colId,
          resolveDisplayName(oDataModel, colId)
        ];
        try {
          var colObj = oDataModel.getColumnByID && oDataModel.getColumnByID(colId);
          if (colObj) {
            if (colObj.getName) fallbackCandidates.push(colObj.getName());
            if (colObj.getDisplayName) fallbackCandidates.push(colObj.getDisplayName());
            if (colObj.getCaption) fallbackCandidates.push(colObj.getCaption());
            if (colObj.getLabel) fallbackCandidates.push(colObj.getLabel());
          }
        } catch (eDataCol) {}
        for (var fi = 0; fi < fallbackCandidates.length; fi++) {
          var token = toNormToken(fallbackCandidates[fi]);
          if (!token) continue;
          if (dataColByToken[token] !== undefined) return dataColByToken[token];
        }
        return fallbackIdx;
      }

      function readDataValue(rowIdx, colIdx, useDisplayValue) {
        var v = null;
        try { v = oDataLayout.getValue(datamodelshapes.Physical.DATA, rowIdx, colIdx, useDisplayValue); } catch(e0) {}
        if (v === null || v === undefined) {
          try { v = oDataLayout.getValue(datamodelshapes.Physical.DATA, colIdx, rowIdx, useDisplayValue); } catch(e1) {}
        }
        return v;
      }

      function readValueColsAsStrings(rowIdx) {
        return readColsAsStrings(valueCols, rowIdx, false);
      }

      var metricColorMin = Number.POSITIVE_INFINITY;
      var metricColorMax = Number.NEGATIVE_INFINITY;

      for (var r = 0; r < dataRowCount; r++) {
        var rowDimVals = readSlotAsStrings(rowDimCols, rowDimLayers, r, true);
        var colDimVals = readSlotAsStrings(colDimCols, colDimLayers, r, true);
        var cellVals   = valueLayers && valueLayers.length === valueCols.length ?
          readLayersAsStrings(valueLayers, r, false) : readValueColsAsStrings(r);
        var colorVals  = readSlotAsStrings(colorCols, colorLayers, r, false);
        var tooltipVals = readSlotAsStrings(tooltipCols, tooltipLayers, r, false);
        var cellColor = colorVals.length ? colorVals[0] : '';
        if (cellColor && !sanitizeCssColor(cellColor)) {
          nonCssColorValues[cellColor] = true;
        }

        // Read measure values from Physical.DATA.
        // Prefer OA's formatted display value so the visual respects Values formatting.
        // OA exposes DATA as getValue(edge, rowIndex, colIndex, useDisplayValue),
        // unlike ROW which is read as getValue(edge, layerIndex, rowIndex, ...).
        var measureVals = [];
        var measureRawVals = [];
        for (var mi = 0; mi < measureCols.length; mi++) {
          var mDataColIdx = dataColIndexOf(measureCols[mi], mi);
          var mv = readDataValue(r, mDataColIdx, true);
          var mvRaw = readDataValue(r, mDataColIdx, false);
          if (mv === null || mv === undefined) mv = readDataValue(r, mDataColIdx, false);
          if ((mv === null || mv === undefined) && mvRaw !== null && mvRaw !== undefined) {
            mv = mvRaw;
          }
          measureVals.push((mv !== null && mv !== undefined) ? String(mv) : '');
          measureRawVals.push((mvRaw !== null && mvRaw !== undefined) ? String(mvRaw) : '');
        }

        var metricColorVals = [];
        var metricColorRawVals = [];
        if (metricColorUsesMainMeasure && measureVals.length) {
          metricColorVals.push(measureVals[0]);
          metricColorRawVals.push(measureRawVals[0]);
          var mainMcn = Number(measureRawVals[0]);
          if (isFinite(mainMcn)) {
            if (mainMcn < metricColorMin) metricColorMin = mainMcn;
            if (mainMcn > metricColorMax) metricColorMax = mainMcn;
          }
        } else {
          for (var mci = 0; mci < metricColorMeasureCols.length; mci++) {
            var mcDataColIdx = dataColIndexOf(metricColorMeasureCols[mci], measureCols.length + mci);
            var mcv = readDataValue(r, mcDataColIdx, true);
            var mcvRaw = readDataValue(r, mcDataColIdx, false);
            if (mcv === null || mcv === undefined) mcv = readDataValue(r, mcDataColIdx, false);
            if ((mcv === null || mcv === undefined) && mcvRaw !== null && mcvRaw !== undefined) {
              mcv = mcvRaw;
            }
            metricColorVals.push((mcv !== null && mcv !== undefined) ? String(mcv) : '');
            metricColorRawVals.push((mcvRaw !== null && mcvRaw !== undefined) ? String(mcvRaw) : '');

            var mcn = Number(mcvRaw);
            if (isFinite(mcn)) {
              if (mcn < metricColorMin) metricColorMin = mcn;
              if (mcn > metricColorMax) metricColorMax = mcn;
            }
          }
        }

        var rowKey     = rowDimVals.join('\x00');
        var colKey     = colDimVals.join('\x00');
        var cellValKey = cellVals.join('\x00') + '\x1f' + cellColor + '\x1f' + tooltipVals.join('\x00') + '\x1f' + measureRawVals.join('\x00');

        // Register unique row key (preserve data order)
        if (!result.rowLabels[rowKey]) {
          result.rowKeys.push(rowKey);
          result.rowLabels[rowKey]  = rowDimVals;
          result.rowIndexMap[rowKey] = [];
          cellValueSeen[rowKey] = {};
        }
        result.rowIndexMap[rowKey].push(r);

        // Register unique col key (preserve data order)
        if (!result.colLabels[colKey]) {
          result.colKeys.push(colKey);
          result.colLabels[colKey] = colDimVals;
        }

        // Store cell value (deduplicated per intersection)
        if (!result.cellMap[rowKey]) result.cellMap[rowKey] = {};
        if (!result.cellMap[rowKey][colKey]) {
          result.cellMap[rowKey][colKey] = [];
          cellValueSeen[rowKey][colKey] = {};
        }
        if (!cellValueSeen[rowKey][colKey][cellValKey]) {
          result.cellMap[rowKey][colKey].push({
            vals: cellVals,
            color: cellColor,
            tooltipVals: tooltipVals,
            measureVals: measureVals,
            measureRawVals: measureRawVals,
            metricColorVals: metricColorVals,
            metricColorRawVals: metricColorRawVals
          });
          cellValueSeen[rowKey][colKey][cellValKey] = true;
        }
      }

      // Use the configured attribute fill color for non-CSS category values.
      var colorKeys = toSortedKeys(nonCssColorValues);
      var attributeFillColor = normalizeAttributeFillColor(
        this._getFormattingOptions().attributeFillColor,
        '#6f8f5f'
      );
      if (attributeFillColor !== 'none') {
        for (var cix = 0; cix < colorKeys.length; cix++) {
          result.colorCategoryMap[colorKeys[cix]] = attributeFillColor;
        }
      }
      if (isFinite(metricColorMin) && isFinite(metricColorMax)) {
        result.metricColorRange = { min: metricColorMin, max: metricColorMax };
      }

      // Expand to all row/column combinations if "Show All Values" is enabled
      var currentFormatting = this._getFormattingOptions();
      if (getEffectiveBoolean(currentFormatting.showAllValues, false)) {
        expandToAllCombinations(result);
      }

      // Keep rows and columns deterministic and user-friendly: sort by dimension labels ascending.
      result.rowKeys.sort(function(a, b) {
        return compareDimTuples(result.rowLabels[a], result.rowLabels[b]);
      });
      result.colKeys.sort(function(a, b) {
        return compareDimTuples(result.colLabels[a], result.colLabels[b]);
      });

      result.baseRowKeys = result.rowKeys.slice();
      result.baseColKeys = result.colKeys.slice();

      result.displayCellMap = buildDisplayCellMap(result.cellMap, result.rowKeys, result.colKeys, result.valNames.length || 1);

      debugLog('pivot-shape', {
        rowKeyCount: result.rowKeys.length,
        colKeyCount: result.colKeys.length,
        firstRowKey: result.rowKeys.length ? result.rowKeys[0] : null,
        firstRowLabels: result.rowKeys.length ? result.rowLabels[result.rowKeys[0]] : null,
        firstColKey: result.colKeys.length ? result.colKeys[0] : null,
        firstColLabels: result.colKeys.length ? result.colLabels[result.colKeys[0]] : null
      });

    } catch (err) {
      console.error('[PivotViz] _extractPivotData failed:', err);
      try { _logger.error('PivotViz._extractPivotData failed', err); } catch(e) {}
    }

    return result;
  };

  // =========================================================================
  // RENDERING
  // =========================================================================

  /**
   * Build the pivot table HTML string.
   *
   * Layout:
   *   - Header: row-dim name cells (rowspan = numHeaderRows) | col-dim group headers
   *   - Body: for each unique rowKey, render maxSubRows <tr> elements.
   *     The row-dim cells appear only in the first <tr> with rowspan=maxSubRows.
   *     Each <tr> shows the cell values for its sub-row index.
   *     If a (rowKey, colKey) intersection has fewer values than maxSubRows,
   *     the extra sub-row cells are empty.
   */
  function renderPivotTable(instance, pivotData, formatting) {
    var rowKeys    = pivotData.rowKeys;
    var colKeys    = pivotData.colKeys;
    var cellMap    = pivotData.displayCellMap || pivotData.cellMap;
    var rowLabels  = pivotData.rowLabels;
    var colLabels  = pivotData.colLabels;
    var rowDimNames = pivotData.rowDimNames;
    var colDimNames = pivotData.colDimNames;
    var valNames   = pivotData.valNames;
    var sortState  = instance._sortState || [];

    var numRowDims  = rowDimNames.length;
    var numColDims  = colDimNames.length;
    var numVals     = valNames.length || 1;
    var numCols     = colKeys.length;
    var widthMap    = getColumnWidthMap(instance, pivotData, formatting);
    var compressRows = getEffectiveBoolean(formatting.compressRows, true);
    var compressCols = getEffectiveBoolean(formatting.compressCols, true);
    var _dateFormat = formatting.dateFormat || 'auto';
    function fmtDim(v) { return formatDimValue(v, _dateFormat); }
    var rowHeaderLayout = buildRowHeaderLayout(rowKeys, rowLabels, cellMap, colKeys, numVals, numRowDims, compressRows);

    debugLog('render-layout', {
      rowDimNames: rowDimNames.slice(),
      colDimNames: colDimNames.slice(),
      rowKeysSample: rowKeys.slice(0, 3),
      colKeysSample: colKeys.slice(0, 5),
      widthMap: widthMap
    });

    if (!numRowDims || !numCols) return '<div class="pivot-empty">' + escapeHtml(messages.NO_DATA_MESSAGE) + '</div>';

    // ---- HEADER ----
    var html = '<table class="pivot-table">' + getColGroupHtml(pivotData, widthMap) + '<thead>';

    if (numColDims <= 1) {
      // Single header row
      html += '<tr>';
      for (var d = 0; d < numRowDims; d++) {
        var rowColId = 'row-' + d;
        var rowLeft = getStickyLeftOffset(widthMap, d);
        var rowWidth = widthMap[rowColId] || 0;
        var rowZIndex = getStickyZIndex(20, d, numRowDims);
        var rowLabel = getEffectiveBoolean(formatting.showEdgeLabels, true) ? rowDimNames[d] : '';
        html += '<th class="pivot-th pivot-th-row" data-col-id="' + rowColId + '" style="left:' + rowLeft + 'px;z-index:' + rowZIndex + ';width:' + rowWidth + 'px;min-width:' + rowWidth + 'px;max-width:' + rowWidth + 'px;">' +
          '<span class="pivot-th-label">' + escapeHtml(rowLabel) + '</span>' +
          getResizeHandleHtml(rowColId) +
          '</th>';
      }
      for (var c = 0; c < numCols; c++) {
        var colLabel = colLabels[colKeys[c]] ? colLabels[colKeys[c]].map(fmtDim).join(' / ') : fmtDim(colKeys[c]);
        html += '<th class="pivot-th pivot-th-col" data-col-id="data-' + c + '">' +
          '<span class="pivot-th-label">' + escapeHtml(colLabel) + '</span>' +
          getResizeHandleHtml('data-' + c) +
          '</th>';
      }
      html += '</tr>';
    } else {
      // Multi-level column headers (>1 col dim)
      // Restore the original working header geometry: row headers rowspan across
      // the column-header rows, with sort indicators absolutely positioned.
      var headerRows = numColDims;
      html += '<tr>';
      for (var d = 0; d < numRowDims; d++) {
        var rowColKey = 'row-' + d;
        var stickyLeft = getStickyLeftOffset(widthMap, d);
        var stickyWidth = widthMap[rowColKey] || 0;
        var stickyZIndex = getStickyZIndex(20, d, numRowDims);
        var rowLabel = getEffectiveBoolean(formatting.showEdgeLabels, true) ? rowDimNames[d] : '';
        html += '<th class="pivot-th pivot-th-row" data-col-id="' + rowColKey + '" rowspan="' + headerRows + '" style="left:' + stickyLeft + 'px;z-index:' + stickyZIndex + ';width:' + stickyWidth + 'px;min-width:' + stickyWidth + 'px;max-width:' + stickyWidth + 'px;">' +
          '<span class="pivot-th-label">' + escapeHtml(rowLabel) + '</span>' +
          getResizeHandleHtml(rowColKey) +
          '</th>';
      }

      // Group colKeys by level-0 dim value for colspan calculation
      if (compressCols) {
        var level0Groups = buildContiguousColumnGroups(colKeys, colLabels, 0);
        for (var g = 0; g < level0Groups.length; g++) {
          var cs = level0Groups[g].count;
          var topGroupColIds = [];
          for (var tgc = level0Groups[g].startColIdx; tgc <= level0Groups[g].lastColIdx; tgc++) topGroupColIds.push('data-' + tgc);
          html += '<th class="pivot-th pivot-th-col pivot-th-level1" colspan="' + cs + '">' +
            '<span class="pivot-th-label">' + escapeHtml(fmtDim(level0Groups[g].label)) + '</span>' +
            (cs > 1 ? getGroupedResizeHandleHtml(topGroupColIds) : getResizeHandleHtml('data-' + level0Groups[g].lastColIdx)) +
            '</th>';
        }
      } else {
        for (var c0 = 0; c0 < numCols; c0++) {
          var level0Vals = colLabels[colKeys[c0]] || [];
          html += '<th class="pivot-th pivot-th-col pivot-th-level1" data-col-id="data-' + c0 + '">' +
            '<span class="pivot-th-label">' + escapeHtml(fmtDim(level0Vals[0] || '')) + '</span>' +
            getResizeHandleHtml('data-' + c0) +
            '</th>';
        }
      }
      html += '</tr>';

      for (var level = 1; level < numColDims; level++) {
        html += '<tr>';
        if (compressCols) {
          var levelGroups = buildContiguousColumnGroups(colKeys, colLabels, level);
          for (var lg = 0; lg < levelGroups.length; lg++) {
            var group = levelGroups[lg];
            var groupedColIds = [];
            for (var gi = group.startColIdx; gi <= group.lastColIdx; gi++) groupedColIds.push('data-' + gi);
            html += '<th class="pivot-th pivot-th-col pivot-th-level2" colspan="' + group.count + '">' +
              '<span class="pivot-th-label">' + escapeHtml(fmtDim(group.label)) + '</span>' +
              (group.count > 1 ? getGroupedResizeHandleHtml(groupedColIds) : getResizeHandleHtml('data-' + group.lastColIdx)) +
              '</th>';
          }
        } else {
          for (var c = 0; c < numCols; c++) {
            var colVals = colLabels[colKeys[c]] || [];
            html += '<th class="pivot-th pivot-th-col pivot-th-level2" data-col-id="data-' + c + '">' +
              '<span class="pivot-th-label">' + escapeHtml(fmtDim(colVals[level] || '')) + '</span>' +
              getResizeHandleHtml('data-' + c) +
              '</th>';
          }
        }
        html += '</tr>';
      }
    }

    html += '</thead><tbody>';

    // ---- BODY ----
    for (var ri = 0; ri < rowKeys.length; ri++) {
      var rowKey     = rowKeys[ri];
      var rowDimVals = rowLabels[rowKey] || [];
      var maxSubRows = rowHeaderLayout.subRowCountByKey[rowKey] || 1;

      // Alternate row shading based on row group index
      var rowGroupClass = (ri % 2 === 0) ? ' pivot-row-even' : ' pivot-row-odd';

      for (var subRow = 0; subRow < maxSubRows; subRow++) {
        var trClass = 'pivot-data-row' + rowGroupClass + (subRow > 0 ? ' pivot-sub-row' : '');
        html += '<tr class="' + trClass + '" data-row-idx="' + ri + '">';

        // Row dimension header cells – only in first sub-row, with rowspan
        if (subRow === 0) {
          for (var d = 0; d < numRowDims; d++) {
            var headerSpan = rowHeaderLayout.spanByKey[rowKey][d];
            if (!headerSpan) continue;
            var tdClass = 'pivot-td-row' + (d === numRowDims - 1 ? ' pivot-td-row-last' : '');
            var rsAttr  = (headerSpan > 1) ? ' rowspan="' + headerSpan + '"' : '';
            var stickyCellLeft = getStickyLeftOffset(widthMap, d);
            var stickyCellWidth = widthMap['row-' + d] || 0;
            var stickyCellZIndex = getStickyZIndex(5, d, numRowDims);
            html += '<td class="' + tdClass + '" data-col-id="row-' + d + '" style="left:' + stickyCellLeft + 'px;z-index:' + stickyCellZIndex + ';width:' + stickyCellWidth + 'px;min-width:' + stickyCellWidth + 'px;max-width:' + stickyCellWidth + 'px;"' + rsAttr + '><span class="pivot-td-row-label">' + escapeHtml(fmtDim(rowDimVals[d] || '')) + '</span></td>';
          }
        }

        // Cell values for each column intersection
        for (var ci = 0; ci < colKeys.length; ci++) {
          var colKey     = colKeys[ci];
          var displayEntries = (cellMap[rowKey] && cellMap[rowKey][colKey]) ? cellMap[rowKey][colKey] : [];
          var displayEntry = displayEntries[subRow] || null;
          var entry      = displayEntry ? displayEntry.entry : null;
          var valueIdx   = displayEntry ? displayEntry.valueIdx : -1;
          var cellVal    = fmtDim((entry && valueIdx >= 0 && entry.vals && entry.vals.length > valueIdx) ? entry.vals[valueIdx] : '');
          var safeColor  = '';
          if (entry && entry.color) {
            safeColor = sanitizeCssColor(entry.color);
            if (!safeColor && pivotData.colorCategoryMap && pivotData.colorCategoryMap[entry.color]) {
              safeColor = pivotData.colorCategoryMap[entry.color];
            }
          }
          var metricBg = '';
          var metricFg = '';
          var entryMetricColorRawVals = (entry && entry.metricColorRawVals) ? entry.metricColorRawVals : [];
          if (pivotData.metricColorRange && entryMetricColorRawVals.length && formatting.metricColorScheme !== 'none') {
            var mcNum = Number(entryMetricColorRawVals[0]);
            if (isFinite(mcNum)) {
              metricBg = getContinuousCellColor(
                mcNum,
                pivotData.metricColorRange.min,
                pivotData.metricColorRange.max,
                formatting.metricColorScheme
              );
              if (metricBg) metricFg = getContrastingTextColor(metricBg);
            }
          }
          var cellBg = normalizeCellBackground(formatting.cellBackground);
          var colorStyle = '';
          var isMetricColoredCell = false;
          if (safeColor) {
            var textColor = getContrastingTextColor(safeColor);
            // Use !important to override base white-cell CSS in all states.
            colorStyle = ' style="background-color:' + escapeHtml(safeColor) + ' !important;color:' + escapeHtml(textColor) + ' !important;"';
          } else if (metricBg && cellVal === '') {
            isMetricColoredCell = true;
            colorStyle = ' style="background-color:' + escapeHtml(metricBg) + ' !important;color:' + escapeHtml(metricFg || '#161616') + ' !important;"';
          } else if (cellBg !== 'none') {
            colorStyle = ' style="background-color:' + escapeHtml(cellBg) + ' !important;color:' + escapeHtml(getContrastingTextColor(cellBg)) + ' !important;"';
          }

          var numMeasures = (pivotData.measureNames && pivotData.measureNames.length) ? pivotData.measureNames.length : 0;
          var entryMeasureVals = (entry && entry.measureVals) ? entry.measureVals : [];
          var entryMeasureRawVals = (entry && entry.measureRawVals) ? entry.measureRawVals : [];
          var measureHtml = '';
          if (getEffectiveBoolean(formatting.showValues, true) && numMeasures > 0) {
            for (var mi = 0; mi < numMeasures; mi++) {
              var mvStr = formatMeasureValue(
                (entryMeasureRawVals[mi] !== undefined) ? entryMeasureRawVals[mi] : '',
                (entryMeasureVals[mi] !== undefined) ? entryMeasureVals[mi] : '',
                formatting.valueFormat || 'auto'
              );
              if (mvStr !== '') {
                var metricMeasureColorStyle = '';
                if (metricBg && safeColor) {
                  // Dual-color mode: keep cell color from categorical Color and color only measure chip by metric.
                  metricMeasureColorStyle = ' style="background-color:' + escapeHtml(metricBg) + ';color:' + escapeHtml(metricFg || '#161616') + ';"';
                }
                measureHtml += '<span class="pivot-cell-measure"' + metricMeasureColorStyle + '>' + escapeHtml(mvStr) + '</span>';
              }
            }
          }
          if (!getEffectiveBoolean(formatting.showValues, true)) {
            cellVal = '';
            measureHtml = '';
          }
          var isEmpty = (cellVal === '' && measureHtml === '');
          var cellClass = 'pivot-td-cell' +
            (isEmpty ? ' pivot-td-empty' : '') +
            (safeColor ? ' pivot-td-colored' : '') +
            (isMetricColoredCell ? ' pivot-td-metric-colored' : '');
          html += '<td class="' + cellClass + '" data-col-id="data-' + ci + '" data-col-idx="' + ci + '" data-sub-row="' + subRow + '" data-val-idx="' + valueIdx + '"' + colorStyle + '>' + escapeHtml(cellVal) + measureHtml + '</td>';
        }

        html += '</tr>';
      }
    }

    html += '</tbody></table>';
    return html;
  }

  PivotViz.prototype._fillDefaultOptions = function(oOptions) {
    if (!oOptions) oOptions = {};
    var defaults = getDefaultFormattingOptions();
    var existing = oOptions[VIEW_CONFIG_KEY] || {};
    var hasFormattingSortState = hasOwn(existing, 'sortState');
    var hasRootSortState = hasOwn(oOptions, SORT_CONFIG_KEY);
    var savedSortState = defaults.sortState.slice();
    if (hasCurrentSortStateVersion(oOptions, existing)) {
      savedSortState = hasFormattingSortState ?
        normalizeSortState(existing.sortState) :
        (hasRootSortState ? normalizeSortState(oOptions[SORT_CONFIG_KEY]) : defaults.sortState.slice());
    } else if (hasFormattingSortState || hasRootSortState) {
      savedSortState = hasFormattingSortState ?
        normalizeSortState(existing.sortState) :
        normalizeSortState(oOptions[SORT_CONFIG_KEY]);
    }
    var hasFormattingColumnWidths = hasOwn(existing, 'columnWidths');
    var hasRootColumnWidths = hasOwn(oOptions, COLUMN_WIDTHS_KEY);
    var savedColumnWidths = {};
    if (hasCurrentColumnWidthsVersion(oOptions, existing)) {
      savedColumnWidths = hasFormattingColumnWidths ?
        normalizeColumnWidths(existing.columnWidths) :
        (hasRootColumnWidths ? normalizeColumnWidths(oOptions[COLUMN_WIDTHS_KEY]) : {});
    }

    var nextFormatting = {
      showEdgeLabels: (existing.showEdgeLabels !== undefined) ? existing.showEdgeLabels : defaults.showEdgeLabels,
      showValues: (existing.showValues !== undefined) ? existing.showValues : defaults.showValues,
      showAllValues: (existing.showAllValues !== undefined) ? existing.showAllValues : defaults.showAllValues,
      autoFitColumns: (existing.autoFitColumns !== undefined) ? existing.autoFitColumns : defaults.autoFitColumns,
      wrapText: normalizeWrapText((existing.wrapText !== undefined) ? existing.wrapText : defaults.wrapText, defaults.wrapText),
      valueAlignment: existing.valueAlignment || defaults.valueAlignment,
      valueFormat: existing.valueFormat || defaults.valueFormat,
      dateFormat: (existing.dateFormat !== undefined && existing.dateFormat !== null) ? String(existing.dateFormat) : defaults.dateFormat,
      metricColorScheme: normalizeMetricColorScheme(existing.metricColorScheme || defaults.metricColorScheme, defaults.metricColorScheme),
      attributeFillColor: normalizeAttributeFillColor(existing.attributeFillColor || defaults.attributeFillColor, defaults.attributeFillColor),
      cellBackground: normalizeCellBackground(existing.cellBackground !== undefined ? existing.cellBackground : defaults.cellBackground),
      compressRows: (existing.compressRows !== undefined) ? existing.compressRows : defaults.compressRows,
      compressCols: (existing.compressCols !== undefined) ? existing.compressCols : defaults.compressCols,
      unfixHeaders: fromSwitcherBoolean((existing.unfixHeaders !== undefined) ? existing.unfixHeaders : defaults.unfixHeaders, defaults.unfixHeaders),
      rowDensity: existing.rowDensity || defaults.rowDensity,
      bandedRows: (existing.bandedRows !== undefined) ? existing.bandedRows : defaults.bandedRows,
      columnWidths: savedColumnWidths,
      columnWidthsVersion: hasCurrentColumnWidthsVersion(oOptions, existing) ? VIEW_CONFIG_VERSION : '',
      sortSaveNonce: (existing.sortSaveNonce !== undefined && existing.sortSaveNonce !== null) ? String(existing.sortSaveNonce) : defaults.sortSaveNonce,
      sortStateVersion: hasCurrentSortStateVersion(oOptions, existing) ? VIEW_CONFIG_VERSION : '',
      sortState: savedSortState
    };
    var nextRootSortState = nextFormatting.sortState.slice();
    var nextRootSortVersion = nextFormatting.sortStateVersion;
    var nextRootColumnWidths = {};
    for (var widthKey in nextFormatting.columnWidths) {
      if (Object.prototype.hasOwnProperty.call(nextFormatting.columnWidths, widthKey)) {
        nextRootColumnWidths[widthKey] = nextFormatting.columnWidths[widthKey];
      }
    }
    var nextRootColumnWidthsVersion = nextFormatting.columnWidthsVersion;
    var shouldUpdateSettings = false;
    try {
      shouldUpdateSettings =
        JSON.stringify(existing || {}) !== JSON.stringify(nextFormatting) ||
        JSON.stringify(normalizeSortState(oOptions[SORT_CONFIG_KEY])) !== JSON.stringify(nextRootSortState) ||
        String(oOptions[SORT_VERSION_KEY] || '') !== String(nextRootSortVersion || '') ||
        JSON.stringify(normalizeColumnWidths(oOptions[COLUMN_WIDTHS_KEY])) !== JSON.stringify(nextRootColumnWidths) ||
        String(oOptions[COLUMN_WIDTHS_VERSION_KEY] || '') !== String(nextRootColumnWidthsVersion || '');
    } catch (e) {
      shouldUpdateSettings = true;
    }
    oOptions[VIEW_CONFIG_KEY] = nextFormatting;
    oOptions[SORT_CONFIG_KEY] = nextRootSortState;
    oOptions[SORT_VERSION_KEY] = nextRootSortVersion;
    oOptions[COLUMN_WIDTHS_KEY] = nextRootColumnWidths;
    oOptions[COLUMN_WIDTHS_VERSION_KEY] = nextRootColumnWidthsVersion;
    if (shouldUpdateSettings) {
      setStoredViewConfig(this, oOptions);
    }
    return nextFormatting;
  };

  PivotViz.prototype._getFormattingOptions = function() {
    var conf = getStoredViewConfig(this);
    return this._fillDefaultOptions(conf);
  };

  PivotViz.prototype._persistSortState = function() {
    this._sortState = normalizeSortState(this._sortState);
    this._hasUserSortOverride = true;
    try {
      var sortState = this._sortState.slice();
      var conf = getStoredViewConfig(this);
      var fmt = this._fillDefaultOptions(conf);
      fmt.sortState = sortState;
      fmt.sortStateVersion = VIEW_CONFIG_VERSION;
      fmt.sortSaveNonce = String(new Date().getTime());
      conf[VIEW_CONFIG_KEY] = fmt;
      conf[SORT_CONFIG_KEY] = sortState;
      conf[SORT_VERSION_KEY] = VIEW_CONFIG_VERSION;

      var ows = this._oViewSettings;

      // 1. Write to all in-memory stores so the sort survives any read that happens before commit.
      if (ows && typeof ows.setViewConfigJSON === 'function') {
        try { ows.setViewConfigJSON(dataviz.SettingsNS.CHART, conf); } catch(e) {}
      }
      setStoredViewConfig(this, conf);

      // 2. Trigger OAC's handlePropChange pipeline via DOM click on the rendered showValues control.
      //    The Properties panel renders each gadget view with id="idGadgetViewFor_<gadgetID>".
      //    OAC's event listeners on GadgetViews (visible from the DOM structure) go through the
      //    full property-change pipeline: DOM event → OAC handler → handlePropChange →
      //    bUpdateSettings=true → workbook commit.  Sort is piggybacked in the piggyback block.
      //    We click a non-current option, then restore immediately (net change = zero for showValues).
      var triggered = false;
      try {
        // The rendered GadgetView for showValues has id="idGadgetViewFor_showValues"
        var svEl = document.getElementById('idGadgetViewFor_showValues');
        console.log('[AttrPivot] showValues GadgetView element:', svEl ? (svEl.tagName + '#' + svEl.id) : 'null');

        if (svEl) {
          // Log the element's structure for diagnostics
          console.log('[AttrPivot] svEl outerHTML preview:', svEl.outerHTML.substring(0, 300));

          // Strategy A: look for an OJ-BUTTONSET web component and toggle its value property
          var ojBtnSet = null;
          if (svEl.tagName && /oj-buttonset/i.test(svEl.tagName)) {
            ojBtnSet = svEl;
          } else {
            ojBtnSet = svEl.querySelector('oj-buttonset-one, oj-buttonset-many, [class*="oj-buttonset"]');
          }
          if (!ojBtnSet) {
            // Check parent in case svEl is nested inside the buttonset
            var p = svEl.parentElement;
            while (p && p !== document.body) {
              if (p.tagName && /oj-buttonset/i.test(p.tagName)) { ojBtnSet = p; break; }
              p = p.parentElement;
            }
          }
          console.log('[AttrPivot] OJ-BUTTONSET:', ojBtnSet ? (ojBtnSet.tagName + '#' + ojBtnSet.id) : 'null');

          if (ojBtnSet && typeof ojBtnSet.value !== 'undefined') {
            // JET web component exposes a .value property; setting it fires internal change events
            var oldVal = String(ojBtnSet.value || 'auto');
            var newVal = (oldVal === 'auto') ? 'true' : 'auto';
            try {
              ojBtnSet.value = newVal;
              var restoreEl = ojBtnSet;
              var restoreVal = oldVal;
              setTimeout(function() {
                try { restoreEl.value = restoreVal; } catch(re) {}
              }, 30);
              triggered = true;
              console.log('[AttrPivot] Sort trigger: JET .value toggle fired (' + oldVal + '→' + newVal + ')');
            } catch(je) {
              console.log('[AttrPivot] JET .value toggle failed:', String(je));
            }
          }

          // Strategy B: find buttons in light DOM or shadow DOM and click them.
          // JET web components (oj-buttonset, oj-radioset, oj-c-button-set) render their
          // interactive elements inside a shadow root. We walk all custom elements under
          // svEl (and svEl itself) looking for an open shadow root with clickable inputs.
          if (!triggered) {
            var allBtns = svEl.querySelectorAll('button, input[type="radio"], [role="radio"]');
            if (allBtns.length === 0) {
              // Walk every element in svEl's subtree looking for shadow roots
              var allEls = [svEl].concat(Array.prototype.slice.call(svEl.querySelectorAll('*')));
              for (var sei = 0; sei < allEls.length && allBtns.length === 0; sei++) {
                var seEl = allEls[sei];
                var sr = seEl.shadowRoot || (typeof seEl.getRootNode === 'function' && seEl.getRootNode() !== document ? seEl.getRootNode() : null);
                if (sr) {
                  var shadowBtns = sr.querySelectorAll('button, input[type="radio"], label[for], [role="radio"], [role="button"]');
                  if (shadowBtns.length > 0) { allBtns = shadowBtns; }
                }
              }
            }
            console.log('[AttrPivot] Buttons found (light+shadow):', allBtns.length, '| svEl:', svEl.outerHTML.substring(0, 200));
            if (allBtns.length >= 2) {
              // Find one that is NOT currently selected and click it, then click the original back
              var selectedBtn = null, otherBtn = null;
              for (var bi = 0; bi < allBtns.length; bi++) {
                var b = allBtns[bi];
                var isSel = b.getAttribute('aria-checked') === 'true' ||
                            b.getAttribute('aria-pressed') === 'true' ||
                            b.classList.contains('oj-selected') ||
                            (b.type === 'radio' && b.checked);
                if (isSel) { selectedBtn = b; } else if (!otherBtn) { otherBtn = b; }
              }
              console.log('[AttrPivot] Selected btn:', selectedBtn ? (selectedBtn.textContent || '').trim() : 'null',
                          '| Other btn:', otherBtn ? (otherBtn.textContent || '').trim() : 'null');
              if (otherBtn && selectedBtn) {
                otherBtn.click();
                var restoreBtn = selectedBtn;
                setTimeout(function() { try { restoreBtn.click(); } catch(re) {} }, 30);
                triggered = true;
                console.log('[AttrPivot] Sort trigger: DOM button click fired');
              }
            }
          }

          // Strategy C: dispatch a valuechange event directly on the GadgetView element
          if (!triggered) {
            try {
              var gpi2 = this._showValuesGadgetInfo;
              var currVal2 = 'auto';
              try {
                var vp2 = gpi2 && typeof gpi2.getValueProperties === 'function' ? gpi2.getValueProperties() : null;
                if (vp2) {
                  currVal2 = (typeof vp2.getValue === 'function') ? String(vp2.getValue() || 'auto') :
                             (vp2.value !== undefined ? String(vp2.value || 'auto') : 'auto');
                }
              } catch(e) {}
              var toggleVal2 = (currVal2 === 'auto') ? 'true' : 'auto';
              // Dispatch OJ-style value change events
              ['ojoptionchange', 'valuechange', 'change', 'ojaction'].forEach(function(evtName) {
                try {
                  var evt = new CustomEvent(evtName, {
                    detail: { attribute: 'value', previousValue: currVal2, value: toggleVal2 },
                    bubbles: true, cancelable: true
                  });
                  svEl.dispatchEvent(evt);
                } catch(ee) {}
              });
              // Then restore after 30ms
              setTimeout(function() {
                ['ojoptionchange', 'valuechange', 'change', 'ojaction'].forEach(function(evtName) {
                  try {
                    var evt = new CustomEvent(evtName, {
                      detail: { attribute: 'value', previousValue: toggleVal2, value: currVal2 },
                      bubbles: true, cancelable: true
                    });
                    svEl.dispatchEvent(evt);
                  } catch(ee) {}
                });
              }, 30);
              triggered = true;
              console.log('[AttrPivot] Sort trigger: custom event dispatch fired (val=' + currVal2 + ')');
            } catch(evtE) {
              console.log('[AttrPivot] Event dispatch failed:', String(evtE));
            }
          }
        } else {
          console.log('[AttrPivot] showValues GadgetView not in DOM — Properties panel not open');
        }
      } catch(e) {
        console.log('[AttrPivot] DOM approach exception:', String(e));
      }

      // 3. Fallback: superClass call (always runs for in-session state consistency).
      try {
        PivotViz.superClass._handlePropChange.call(
          this, 'sortState',
          { value: JSON.stringify(sortState) },
          ows || this.getSettings(),
          null
        );
      } catch(e) {}
      if (!triggered) {
        console.log('[AttrPivot] Sort trigger: superClass fallback only (Properties panel not open)');
      }

      notifyStoredViewConfigChanged(this);
    } catch (e) {
      try { _logger.warn('[PivotViz] Unable to persist sort state', e); } catch(ignore) {}
    }
  };

  PivotViz.prototype._persistColumnWidths = function() {
    this._columnWidths = normalizeColumnWidths(this._columnWidths);
    try {
      var conf = getStoredViewConfig(this);
      var fmt = this._fillDefaultOptions(conf);
      fmt.columnWidths = normalizeColumnWidths(this._columnWidths);
      fmt.columnWidthsVersion = VIEW_CONFIG_VERSION;
      conf[VIEW_CONFIG_KEY] = fmt;
      conf[COLUMN_WIDTHS_KEY] = normalizeColumnWidths(this._columnWidths);
      conf[COLUMN_WIDTHS_VERSION_KEY] = VIEW_CONFIG_VERSION;
      setStoredViewConfig(this, conf);
      notifyStoredViewConfigChanged(this);
      saveLocalColumnWidths(this, this._columnWidths);
    } catch (e) {
      try { _logger.warn('[PivotViz] Unable to persist column widths', e); } catch(ignore) {}
    }
  };

  PivotViz.prototype._persistUnfixHeaders = function(unfixHeaders) {
    try {
      var conf = getStoredViewConfig(this);
      var fmt = this._fillDefaultOptions(conf);
      fmt.unfixHeaders = !!unfixHeaders;
      conf[VIEW_CONFIG_KEY] = fmt;
      setStoredViewConfig(this, conf);
      notifyStoredViewConfigChanged(this);
      if (this._pivotData && this._pivotData.formatting) {
        this._pivotData.formatting.unfixHeaders = !!unfixHeaders;
      }
    } catch (e) {
      try { _logger.warn('[PivotViz] Unable to persist header fixation setting', e); } catch(ignore) {}
    }
  };

  PivotViz.prototype.getCurrentViewConfigVersion = function() {
    return VIEW_CONFIG_VERSION;
  };

  PivotViz.prototype.getViewConfig = function() {
    var config = {};
    var k;
    // Base from superclass (the OAC-managed view config store)
    try {
      if (typeof PivotViz.superClass.getViewConfig === 'function') {
        var superCfg = PivotViz.superClass.getViewConfig.call(this) || {};
        for (k in superCfg) {
          if (Object.prototype.hasOwnProperty.call(superCfg, k)) config[k] = superCfg[k];
        }
      }
    } catch(e) {}
    // Merge design settings – these are serialised by OAC on workbook save and have
    // the most current author-written values (highest priority).
    try {
      var settingsCfg = this.getSettings().getViewConfigJSON(dataviz.SettingsNS.CHART) || {};
      for (k in settingsCfg) {
        if (Object.prototype.hasOwnProperty.call(settingsCfg, k)) config[k] = settingsCfg[k];
      }
    } catch(e) {}
    // Overlay in-session sort state so OAC always reads the current sort during save.
    if (this._hasUserSortOverride && this._sortState) {
      var sortState = normalizeSortState(this._sortState);
      var existingFmt = config[VIEW_CONFIG_KEY] || {};
      var fmt = {};
      for (k in existingFmt) {
        if (Object.prototype.hasOwnProperty.call(existingFmt, k)) fmt[k] = existingFmt[k];
      }
      fmt.sortState = sortState;
      fmt.sortStateVersion = VIEW_CONFIG_VERSION;
      fmt.sortSaveNonce = String(new Date().getTime());
      config[VIEW_CONFIG_KEY] = fmt;
      config[SORT_CONFIG_KEY] = sortState;
      config[SORT_VERSION_KEY] = VIEW_CONFIG_VERSION;
    }
    return config;
  };

  PivotViz.prototype._buildFormattingClassName = function(formatting) {
    var classes = ['pivot-wrapper'];
    classes.push(getEffectiveBoolean(formatting.showEdgeLabels, true) ? 'pivot-show-edge-labels' : 'pivot-hide-edge-labels');
    classes.push(getEffectiveBoolean(formatting.showValues, true) ? 'pivot-show-values' : 'pivot-hide-values');
    classes.push(formatting.wrapText === 'true' ? 'pivot-wrap-on' : (formatting.wrapText === 'false' ? 'pivot-wrap-off' : 'pivot-wrap-auto'));
    classes.push('pivot-align-' + formatting.valueAlignment);
    classes.push('pivot-density-' + getEffectiveDensity(formatting.rowDensity));
    if (getEffectiveBoolean(formatting.bandedRows, false)) classes.push('pivot-banded-rows');
    if (getEffectiveBoolean(formatting.unfixHeaders, false)) classes.push('pivot-unfixed-headers');
    return classes.join(' ');
  };

  PivotViz.prototype._debugRenderedLayout = function(rootElem) {
    if (!DEBUG_PIVOT || typeof console === 'undefined' || !rootElem) return;
    try {
      var wrapper = rootElem.querySelector('.pivot-wrapper');
      var table = rootElem.querySelector('.pivot-table');
      if (!wrapper || !table) return;

      var rowHeaderCells = rootElem.querySelectorAll('thead th[data-col-id^="row-"]');
      var bodyRowCells = rootElem.querySelectorAll('tbody td[data-col-id^="row-"]');
      var colDefs = rootElem.querySelectorAll('colgroup col[data-col-id]');

      function collectNodes(nodeList, limit) {
        var out = [];
        for (var i = 0; i < nodeList.length && i < limit; i++) {
          var node = nodeList[i];
          var rect = node.getBoundingClientRect();
          out.push({
            colId: node.getAttribute('data-col-id'),
            text: (node.textContent || '').trim(),
            leftStyle: node.style.left || '',
            widthStyle: node.style.width || '',
            offsetWidth: node.offsetWidth,
            clientWidth: node.clientWidth,
            rectLeft: Math.round(rect.left),
            rectRight: Math.round(rect.right),
            rowSpan: node.getAttribute('rowspan') || '',
            className: node.className
          });
        }
        return out;
      }

      debugLog('dom-layout', {
        wrapperWidth: wrapper.clientWidth,
        tableScrollWidth: table.scrollWidth,
        tableRectWidth: Math.round(table.getBoundingClientRect().width),
        colDefs: collectNodes(colDefs, 20),
        rowHeaderCells: collectNodes(rowHeaderCells, 20),
        bodyRowCells: collectNodes(bodyRowCells, 20)
      });
    } catch (e) {
      debugLog('dom-layout-error', String(e));
    }
  };

  PivotViz.prototype._syncSortToolbarWidth = function(rootElem) {
    var host = rootElem || this.getContainerElem();
    if (!host) return;
    var wrapper = host.querySelector('.pivot-wrapper');
    if (!wrapper) return;
    var table = wrapper.querySelector('.pivot-table');
    var toolbarWrap = wrapper.querySelector('.pivot-sort-toolbar-wrap');
    if (!table || !toolbarWrap) return;

    var tableWidth = Math.max(
      0,
      Math.ceil(table.scrollWidth || 0),
      Math.ceil(table.getBoundingClientRect().width || 0)
    );
    if (tableWidth > 0) {
      toolbarWrap.style.width = tableWidth + 'px';
      toolbarWrap.style.minWidth = tableWidth + 'px';
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  PivotViz.prototype.render = function(oTransientRenderingContext) {
    try {
      var elContainer = this.getContainerElem();
      elContainer.innerHTML = '';
      elContainer.style.overflow   = 'hidden';
      elContainer.style.height     = '100%';
      elContainer.style.width      = '100%';
      elContainer.style.boxSizing  = 'border-box';
      elContainer.style.fontFamily = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

      var oDataLayout = null;
      try {
        if (oTransientRenderingContext && typeof oTransientRenderingContext.get === 'function') {
          oDataLayout = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_LAYOUT);
          this._currentDataModel = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_MODEL) || null;
          this._currentLogicalDataModel = oTransientRenderingContext.get(dataviz.DataContextProperty.LOGICAL_DATA_MODEL) || null;
        }
      } catch(e) {}
      this._currentDataLayout = oDataLayout;

      if (!oDataLayout) {
        elContainer.innerHTML = '<div class="pivot-empty">' + escapeHtml(messages.NO_DATA_MESSAGE) + '</div>';
        this._setIsRendered(true);
        return;
      }

      try { if (!this._oViewSettings) this._oViewSettings = this.getSettings(); } catch(e) {}
      var pivotData = this._extractPivotData(oDataLayout);
      var formatting = this._getFormattingOptions();
      pivotData.formatting = formatting;
      this._columnWidths = normalizeColumnWidths(formatting.columnWidths);
      if (!formatting.columnWidthsVersion) {
        var localColumnWidths = loadLocalColumnWidths(this, pivotData);
        if (localColumnWidths.found) {
          this._columnWidths = localColumnWidths.columnWidths;
          formatting.columnWidths = normalizeColumnWidths(this._columnWidths);
          formatting.columnWidthsVersion = VIEW_CONFIG_VERSION;
        }
      }
      if (this._hasUserSortOverride) {
        this._sortState = normalizeSortState(this._sortState);
        formatting.sortState = this._sortState.slice();
      } else {
        this._sortState = normalizeSortState(formatting.sortState);
      }
      resetPivotOrder(pivotData);
      applySortState(pivotData, this._sortState);
      pivotData.displayCellMap = buildDisplayCellMap(pivotData.cellMap, pivotData.rowKeys, pivotData.colKeys, pivotData.valNames.length || 1);
      this._pivotData = pivotData;

      if (!pivotData.rowKeys.length || !pivotData.colKeys.length) {
        elContainer.innerHTML = '<div class="pivot-empty">' + escapeHtml(messages.CONFIGURE_MESSAGE) + '</div>';
        this._setIsRendered(true);
        return;
      }

      var tableHtml = renderSortToolbar(this, pivotData) + renderPivotTable(this, pivotData, formatting);

      var wrapper = document.createElement('div');
      wrapper.className = this._buildFormattingClassName(formatting);
      wrapper.innerHTML = tableHtml;
      elContainer.appendChild(wrapper);

      // Re-create tooltip element in new DOM
      this._tooltipEl = null;
      this._ensureTooltip(elContainer);

      this._attachEventHandlers(elContainer);
      this._fixStickyHeaderOffsets(elContainer);
      this._updateHorizontalOverflowState(elContainer);
      this._syncSortToolbarWidth(elContainer);
      this._debugRenderedLayout(elContainer);
      setTimeout(function() {
        this._fixStickyHeaderOffsets(elContainer);
        this._updateHorizontalOverflowState(elContainer);
        this._syncSortToolbarWidth(elContainer);
      }.bind(this), 0);

    } catch(e) {
      console.error('[PivotViz] Render failed:', e);
      try { _logger.error('PivotViz.render failed', e); } catch(ignore) {}
      try {
        this.getContainerElem().innerHTML =
          '<div class="pivot-error">Error rendering pivot table. Check console for details.</div>';
      } catch(e2) {}
    } finally {
      this._setIsRendered(true);
    }
  };

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  PivotViz.prototype._attachEventHandlers = function(rootElem) {
    if (this._eventHandlersRoot === rootElem) return;
    this._eventHandlersRoot = rootElem;

    var self = this;

    // Register a document-level capture mousedown handler ONCE per viz instance.
    // Goal: fire BEFORE OAC's "click-outside → close Properties panel" handler so that
    // idGadgetViewFor_showValues is still in the DOM when we trigger the DOM commit.
    // We pre-compute the new sort state (same logic as the click handler) so the
    // piggyback in _handlePropChange sees the correct final sort state.
    if (!this._docSortPreCommitRegistered) {
      this._docSortPreCommitRegistered = true;
      var selfD = this;

      selfD._docSortPreCommitHandler = function(e) {
        var root = selfD._eventHandlersRoot;
        if (!root || !root.contains(e.target)) return;

        // Only relevant when Properties panel is open
        var svEl = document.getElementById('idGadgetViewFor_showValues');
        if (!svEl) return;

        var clearBtn = closestElement(e.target, '.pivot-sort-clear');
        var dirBtn = clearBtn ? null : closestElement(e.target, '.pivot-sort-dir');
        var sortHeader = (clearBtn || dirBtn) ? null : closestElement(e.target, '.pivot-sort-control-main');
        var sortControl = clearBtn || dirBtn || sortHeader;
        if (!sortControl) return;

        // Pre-compute the sort state that the click handler would produce
        if (clearBtn) {
          selfD._sortState = [];
        } else if (dirBtn) {
          var dt = dirBtn.getAttribute('data-sort-type');
          var di = parseInt(dirBtn.getAttribute('data-sort-dim'), 10);
          var dd = dirBtn.getAttribute('data-sort-dir');
          if (!dt || isNaN(di) || (dd !== 'asc' && dd !== 'desc')) return;
          selfD._setSortDirection(dt, di, dd, !!e.shiftKey);
        } else {
          var st = sortHeader.getAttribute('data-sort-type');
          var si = parseInt(sortHeader.getAttribute('data-sort-dim'), 10);
          if (!st || isNaN(si)) return;
          selfD._toggleSort(st, si, !!e.shiftKey);
        }

        selfD._hasUserSortOverride = true;
        selfD._sortPreComputedForElement = sortControl; // click handler checks this to skip re-computing

        // Trigger the DOM-based commit while the Properties panel is still open.
        // _persistSortState will now find svEl and attempt the commit strategies.
        selfD._persistSortState();
      };

      document.addEventListener('mousedown', selfD._docSortPreCommitHandler, true);
    }

    function isToolbarInteractionTarget(target) {
      return !!closestElement(
        target,
        '.pivot-sort-toolbar-wrap, .pivot-sort-toolbar-toggle, .pivot-export-xlsx, .pivot-unfix-headers-control, .pivot-sort-clear, .pivot-sort-dir, .pivot-sort-control-main'
      );
    }

    function toggleSortToolbar(toolbarToggle) {
      if (!toolbarToggle) return;
      self._sortToolbarCollapsed = !self._sortToolbarCollapsed;
      var toolbarWrap = closestElement(toolbarToggle, '.pivot-sort-toolbar-wrap');
      if (toolbarWrap) {
        if (self._sortToolbarCollapsed) toolbarWrap.classList.add('pivot-sort-toolbar-collapsed');
        else toolbarWrap.classList.remove('pivot-sort-toolbar-collapsed');
      }
    }

    rootElem.addEventListener('mousedown', function(e) {
      var toolbarToggle = closestElement(e.target, '.pivot-sort-toolbar-toggle');
      if (toolbarToggle) {
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.stopPropagation();
        toggleSortToolbar(toolbarToggle);
        return;
      }
      // Stop mousedown propagation for sort controls so OAC's "click-outside-panel" handler
      // (registered on an ancestor in bubble phase) does not fire and close the Properties
      // panel before the click event.  With the panel still in the DOM when click fires,
      // _persistSortState can find idGadgetViewFor_showValues and trigger a property change.
      var sortControl = closestElement(e.target, '.pivot-sort-control-main, .pivot-sort-dir, .pivot-sort-clear');
      if (sortControl) {
        e.stopPropagation();
      }
    }, true);

    rootElem.addEventListener('click', function(e) {
      if (closestElement(e.target, '.pivot-col-resizer')) return;
      var clearBtn = closestElement(e.target, '.pivot-sort-clear');
      if (clearBtn) {
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.stopPropagation();
        // If mousedown pre-commit already computed this sort, skip recomputation
        if (self._sortPreComputedForElement !== clearBtn) {
          self._sortState = [];
        }
        self._sortPreComputedForElement = null;
        self._persistSortState();
        self._reRenderWithSort();
        return;
      }
      var toolbarToggle = closestElement(e.target, '.pivot-sort-toolbar-toggle');
      if (toolbarToggle) {
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.stopPropagation();
        return;
      }
      var exportBtn = closestElement(e.target, '.pivot-export-xlsx');
      if (exportBtn) {
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.stopPropagation();
        self._exportToExcel();
        return;
      }
      var dirBtn = closestElement(e.target, '.pivot-sort-dir');
      if (dirBtn) {
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.stopPropagation();
        // If mousedown pre-commit already computed this sort, skip recomputation
        if (self._sortPreComputedForElement !== dirBtn) {
          var dirType = dirBtn.getAttribute('data-sort-type');
          var dirIdx = parseInt(dirBtn.getAttribute('data-sort-dim'), 10);
          var dir = dirBtn.getAttribute('data-sort-dir');
          if (!dirType || isNaN(dirIdx) || (dir !== 'asc' && dir !== 'desc')) return;
          self._setSortDirection(dirType, dirIdx, dir, !!e.shiftKey);
        }
        self._sortPreComputedForElement = null;
        self._persistSortState();
        self._reRenderWithSort();
        return;
      }
      var sortHeader = closestElement(e.target, '.pivot-sort-control-main');
      if (!sortHeader) return;
      e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      e.stopPropagation();

      // If mousedown pre-commit already computed this sort, skip recomputation
      if (self._sortPreComputedForElement !== sortHeader) {
        var type = sortHeader.getAttribute('data-sort-type');
        var dimIdx = parseInt(sortHeader.getAttribute('data-sort-dim'), 10);
        if (!type || isNaN(dimIdx)) return;
        self._toggleSort(type, dimIdx, !!e.shiftKey);
      }
      self._sortPreComputedForElement = null;
      self._persistSortState();
      self._reRenderWithSort();
    });

    rootElem.addEventListener('change', function(e) {
      var unfixToggle = closestElement(e.target, '.pivot-unfix-headers-toggle');
      if (!unfixToggle) return;
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      e.stopPropagation();
      self._persistUnfixHeaders(!!unfixToggle.checked);
      self._reRenderWithSort();
    });

    rootElem.addEventListener('mousedown', function(e) {
      var handle = closestElement(e.target, '.pivot-col-resizer');
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();

      var colId = handle.getAttribute('data-resize-col');
      var resizeGroupAttr = handle.getAttribute('data-resize-group') || '';
      var resizeGroupCols = resizeGroupAttr ? resizeGroupAttr.split(',').filter(function(v) { return !!v; }) : [];
      if (!colId) return;

      var table = rootElem.querySelector('.pivot-table');
      if (!table) return;
      var currentFormatting = self._getFormattingOptions();
      if (getEffectiveBoolean(currentFormatting.autoFitColumns, true)) return;

      var startX = e.clientX;
      var _resizePivotData = self._pivotData || { rowDimNames: [], colKeys: [], colLabels: {} };
      var widthMap = getColumnWidthMap(self, _resizePivotData, currentFormatting);
      var contentMinMap = getColumnMinimumWidthMap(_resizePivotData, currentFormatting);
      var startWidth = 0;
      var resizeTargets = resizeGroupCols.length ? resizeGroupCols : [colId];
      var startTargetWidths = [];
      var minTotalWidth = 0;
      for (var rt = 0; rt < resizeTargets.length; rt++) {
        var targetWidth = widthMap[resizeTargets[rt]] || 120;
        startTargetWidths.push(targetWidth);
        startWidth += targetWidth;
        minTotalWidth += contentMinMap[resizeTargets[rt]] || getManualResizeMinimumWidth(resizeTargets[rt]);
      }

      function applyWidths(nextWidth) {
        if (!self._columnWidths) self._columnWidths = {};
        if (resizeGroupCols.length) {
          var nextTotalWidth = Math.max(minTotalWidth, nextWidth);
          var flexibleStartWidth = Math.max(1, startWidth - minTotalWidth);
          var flexibleNextWidth = Math.max(0, nextTotalWidth - minTotalWidth);
          for (var rti = 0; rti < resizeTargets.length; rti++) {
            var groupedColId = resizeTargets[rti];
            var groupedMinWidth = contentMinMap[groupedColId] || getManualResizeMinimumWidth(groupedColId);
            var groupedStartWidth = startTargetWidths[rti] || groupedMinWidth;
            var groupedExtraRatio = Math.max(0, groupedStartWidth - groupedMinWidth) / flexibleStartWidth;
            var groupedWidth = groupedMinWidth + (flexibleNextWidth * groupedExtraRatio);
            self._columnWidths[groupedColId] = groupedWidth;
            var groupedColEl = table.querySelector('col[data-col-id="' + groupedColId + '"]');
            if (groupedColEl) groupedColEl.style.width = groupedWidth + 'px';
            var groupedWidthNodes = table.querySelectorAll('[data-col-id="' + groupedColId + '"]');
            for (var gwn = 0; gwn < groupedWidthNodes.length; gwn++) {
              groupedWidthNodes[gwn].style.width = groupedWidth + 'px';
              groupedWidthNodes[gwn].style.minWidth = groupedWidth + 'px';
              groupedWidthNodes[gwn].style.maxWidth = groupedWidth + 'px';
            }
          }
        } else {
          nextWidth = Math.max(contentMinMap[colId] || getManualResizeMinimumWidth(colId), nextWidth);
          self._columnWidths[colId] = nextWidth;

          var colEl = table.querySelector('col[data-col-id="' + colId + '"]');
          if (colEl) colEl.style.width = nextWidth + 'px';

          var widthNodes = table.querySelectorAll('[data-col-id="' + colId + '"]');
          for (var wn = 0; wn < widthNodes.length; wn++) {
            widthNodes[wn].style.width = nextWidth + 'px';
            widthNodes[wn].style.minWidth = nextWidth + 'px';
            widthNodes[wn].style.maxWidth = nextWidth + 'px';
          }
        }

        var rowDimCount = self._pivotData ? self._pivotData.rowDimNames.length : 0;
        for (var i = 0; i < rowDimCount; i++) {
          var left = getStickyLeftOffset(getColumnWidthMap(self, self._pivotData, self._getFormattingOptions()), i);
          var stickyNodes = table.querySelectorAll('[data-col-id="row-' + i + '"]');
          for (var n = 0; n < stickyNodes.length; n++) {
            stickyNodes[n].style.left = left + 'px';
            stickyNodes[n].style.zIndex = String(getStickyZIndex(
              stickyNodes[n].tagName === 'TH' ? 20 : 5,
              i,
              rowDimCount
            ));
          }
        }
        self._updateHorizontalOverflowState(rootElem);
      }

      var _resizeMoved = false;

      function onMouseMove(moveEvt) {
        _resizeMoved = true;
        var delta = moveEvt.clientX - startX;
        applyWidths(Math.max(minTotalWidth, startWidth + delta));
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('mouseup', onMouseUp, true);
        document.body.classList.remove('pivot-resizing');
        if (_resizeMoved) {
          self._persistColumnWidths();
          self._reRenderWithSort();
        }
      }

      document.body.classList.add('pivot-resizing');
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    });

    rootElem.addEventListener('dblclick', function(e) {
      var handle = closestElement(e.target, '.pivot-col-resizer');
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();
      var currentFormatting = self._getFormattingOptions();
      if (getEffectiveBoolean(currentFormatting.autoFitColumns, true)) return;
      var colId = handle.getAttribute('data-resize-col');
      var resizeGroupAttr = handle.getAttribute('data-resize-group') || '';
      var resizeGroupCols = resizeGroupAttr ? resizeGroupAttr.split(',').filter(function(v) { return !!v; }) : [];
      var targets = resizeGroupCols.length ? resizeGroupCols : (colId ? [colId] : []);
      if (!targets.length) return;
      if (self._columnWidths) {
        for (var i = 0; i < targets.length; i++) delete self._columnWidths[targets[i]];
      }
      self._persistColumnWidths();
      self._reRenderWithSort();
    });

    // --- Tooltip on hover ---
    rootElem.addEventListener('mousemove', function(e) {
      var cell = closestElement(e.target, '.pivot-td-cell');
      if (!cell || cell.classList.contains('pivot-td-empty')) {
        self._hideTooltip();
        return;
      }
      var cellText = (cell.textContent || '').trim();
      if (!cellText) { self._hideTooltip(); return; }

      var rowEl  = closestElement(cell, 'tr[data-row-idx]');
      if (!rowEl) { self._hideTooltip(); return; }

      var pivData = self._pivotData;
      if (!pivData) { self._hideTooltip(); return; }
      var rowIdx = parseInt(rowEl.getAttribute('data-row-idx'), 10);
      if (isNaN(rowIdx) || rowIdx < 0 || rowIdx >= pivData.rowKeys.length) {
        self._hideTooltip();
        return;
      }
      var rowKey = pivData.rowKeys[rowIdx];

      var colIdx = parseInt(cell.getAttribute('data-col-idx'), 10);
      var subRow = parseInt(cell.getAttribute('data-sub-row'), 10);
      var valIdx = parseInt(cell.getAttribute('data-val-idx'), 10);
      if (isNaN(colIdx) || isNaN(subRow) || isNaN(valIdx)) {
        self._hideTooltip();
        return;
      }

      var colKey = pivData.colKeys[colIdx];
      var displayEntries = (pivData.displayCellMap && pivData.displayCellMap[rowKey] && pivData.displayCellMap[rowKey][colKey]) ?
        pivData.displayCellMap[rowKey][colKey] :
        (((pivData.cellMap[rowKey] && pivData.cellMap[rowKey][colKey]) ? pivData.cellMap[rowKey][colKey] : []));
      var displayEntry = displayEntries[subRow] || null;
      var entry = displayEntry ? displayEntry.entry : null;
      if (!entry) { self._hideTooltip(); return; }

      var tooltipLines = [];

      if (pivData.rowLabels[rowKey]) {
        var rDims = pivData.rowLabels[rowKey];
        var rNames = pivData.rowDimNames;
        for (var i = 0; i < rDims.length; i++) {
          tooltipLines.push('<span class="pt-line"><span class="pt-k">' + escapeHtml(rNames[i] || '') + ':</span> <span class="pt-v">' + escapeHtml(rDims[i]) + '</span></span>');
        }
      }

      if (pivData.colLabels[colKey]) {
        var cDims = pivData.colLabels[colKey];
        var cNames = pivData.colDimNames;
        for (var j = 0; j < cDims.length; j++) {
          tooltipLines.push('<span class="pt-line"><span class="pt-k">' + escapeHtml(cNames[j] || '') + ':</span> <span class="pt-v">' + escapeHtml(cDims[j]) + '</span></span>');
        }
      }

      tooltipLines.push('<hr class="pt-sep">');
      if (valIdx >= 0) {
        var displayCellText = (entry.vals && entry.vals.length > valIdx) ? entry.vals[valIdx] : cellText;
        tooltipLines.push('<span class="pt-line"><span class="pt-k">' + escapeHtml(pivData.valNames[valIdx] || 'Value') + ':</span> <span class="pt-v pivot-tooltip-value">' + escapeHtml(displayCellText) + '</span></span>');
      }

      if (entry.measureVals && entry.measureVals.length && pivData.measureNames && pivData.measureNames.length) {
        for (var tmi = 0; tmi < entry.measureVals.length; tmi++) {
          var tmv = formatMeasureValue(
            (entry.measureRawVals && entry.measureRawVals[tmi] !== undefined) ? entry.measureRawVals[tmi] : '',
            entry.measureVals[tmi],
            (pivData.formatting && pivData.formatting.valueFormat) ? pivData.formatting.valueFormat : 'auto'
          );
          if (tmv !== '') {
            tooltipLines.push('<span class="pt-line"><span class="pt-k">' + escapeHtml(pivData.measureNames[tmi] || 'Measure') + ':</span> <span class="pt-v pivot-tooltip-value">' + escapeHtml(tmv) + '</span></span>');
          }
        }
      }
      if (entry.metricColorVals && entry.metricColorVals.length && pivData.metricColorName) {
        var mcvDisplay = (entry.metricColorVals[0] !== undefined) ? entry.metricColorVals[0] : '';
        if (mcvDisplay !== '') {
          tooltipLines.push('<span class="pt-line"><span class="pt-k">' + escapeHtml(pivData.metricColorName) + ':</span> <span class="pt-v pivot-tooltip-value">' + escapeHtml(mcvDisplay) + '</span></span>');
        }
      }

      if (entry.color && pivData.colorName) {
        tooltipLines.push('<span class="pt-line"><span class="pt-k">' + escapeHtml(pivData.colorName) + ':</span> <span class="pt-v">' + escapeHtml(entry.color) + '</span></span>');
      }

      if (entry.tooltipVals && entry.tooltipVals.length) {
        for (var t = 0; t < entry.tooltipVals.length; t++) {
          var tv = entry.tooltipVals[t];
          if (!tv) continue;
          tooltipLines.push('<span class="pt-line"><span class="pt-k">' + escapeHtml(pivData.tooltipNames[t] || ('Tooltip ' + (t + 1))) + ':</span> <span class="pt-v">' + escapeHtml(tv) + '</span></span>');
        }
      }

      self._showTooltip(tooltipLines.join(''), e.clientX, e.clientY);
    });

    rootElem.addEventListener('mouseleave', function() { self._hideTooltip(); });

    rootElem.addEventListener('mouseout', function(e) {
      if (!rootElem.contains(e.relatedTarget)) self._hideTooltip();
    });

    rootElem.addEventListener('scroll', function() { self._hideTooltip(); }, { passive: true });

    // --- Row selection on click ---
    rootElem.addEventListener('click', function(e) {
      if (isToolbarInteractionTarget(e.target)) return;

      var row = closestElement(e.target, 'tr[data-row-idx]');
      var cell = closestElement(e.target, '.pivot-td-cell');
      if (!row) {
        self._clearSelection();
        return;
      }

      var rowIdx = parseInt(row.getAttribute('data-row-idx'), 10);
      if (isNaN(rowIdx) || !self._pivotData || rowIdx < 0 || rowIdx >= self._pivotData.rowKeys.length) {
        self._clearSelection();
        return;
      }
      var rowKey  = self._pivotData.rowKeys[rowIdx];
      var isCtrl  = e.ctrlKey || e.metaKey;

      var allRows = rootElem.querySelectorAll('tr[data-row-idx]');
      var allCells = rootElem.querySelectorAll('.pivot-td-cell, .pivot-td-empty');

      if (!isCtrl) {
        // Deselect all
        for (var i = 0; i < allRows.length; i++) {
          allRows[i].classList.remove('pivot-row-selected');
        }
        for (var c = 0; c < allCells.length; c++) {
          allCells[c].classList.remove('pivot-cell-selected');
        }
        self._selectedRowKeys = [];
        self._selectedCellKeys = [];
      }

      // Toggle row-key selection (marking payload)
      var alreadySelected = self._selectedRowKeys.indexOf(rowKey) >= 0;

      if (alreadySelected) {
        self._selectedRowKeys.splice(self._selectedRowKeys.indexOf(rowKey), 1);
      } else {
        self._selectedRowKeys.push(rowKey);
      }

      // Cell-only visual selection (no row background washout).
      if (cell) {
        var cellKey = [rowIdx, cell.getAttribute('data-col-idx'), cell.getAttribute('data-sub-row')].join('|');
        var cellAlreadySelected = self._selectedCellKeys.indexOf(cellKey) >= 0;
        if (cellAlreadySelected && isCtrl) {
          cell.classList.remove('pivot-cell-selected');
          self._selectedCellKeys.splice(self._selectedCellKeys.indexOf(cellKey), 1);
        } else {
          cell.classList.add('pivot-cell-selected');
          if (!cellAlreadySelected) self._selectedCellKeys.push(cellKey);
        }
      }

      // Fire marking for all data rows belonging to selected row groups
      var rowIndices = [];
      for (var k = 0; k < self._selectedRowKeys.length; k++) {
        var rk = self._selectedRowKeys[k];
        if (self._pivotData && self._pivotData.rowIndexMap[rk]) {
          var rix = self._pivotData.rowIndexMap[rk];
          for (var m = 0; m < rix.length; m++) rowIndices.push(rix[m]);
        }
      }
      self._fireMarkingEvent(rowIndices);
    });
  };

  PivotViz.prototype._toggleSort = function(type, dimIdx, isMultiSort) {
    var sortState = this._sortState || [];
    var existing = -1;
    for (var i = 0; i < sortState.length; i++) {
      if (sortState[i].type === type && sortState[i].dimIdx === dimIdx) {
        existing = i;
        break;
      }
    }

    if (!isMultiSort) {
      if (existing >= 0 && sortState.length === 1) {
        if (sortState[0].dir === 'asc') this._sortState = [{ type: type, dimIdx: dimIdx, dir: 'desc' }];
        else this._sortState = [];
      } else {
        this._sortState = [{ type: type, dimIdx: dimIdx, dir: 'asc' }];
      }
      return;
    }

    if (existing >= 0) {
      if (sortState[existing].dir === 'asc') sortState[existing].dir = 'desc';
      else sortState.splice(existing, 1);
    } else {
      sortState.push({ type: type, dimIdx: dimIdx, dir: 'asc' });
    }
    this._sortState = sortState;
  };

  PivotViz.prototype._setSortDirection = function(type, dimIdx, dir, isMultiSort) {
    var sortState = this._sortState || [];
    var existing = -1;
    for (var i = 0; i < sortState.length; i++) {
      if (sortState[i].type === type && sortState[i].dimIdx === dimIdx) {
        existing = i;
        break;
      }
    }

    if (!isMultiSort) {
      this._sortState = [{ type: type, dimIdx: dimIdx, dir: dir }];
      return;
    }

    if (existing >= 0) {
      sortState[existing].dir = dir;
    } else {
      sortState.push({ type: type, dimIdx: dimIdx, dir: dir });
    }
    this._sortState = sortState;
  };

  PivotViz.prototype._reRenderWithSort = function() {
    var pivotData = this._pivotData;
    if (!pivotData) return;

    var formatting = this._getFormattingOptions();
    pivotData.formatting = formatting;
    resetPivotOrder(pivotData);
    applySortState(pivotData, this._sortState);
    pivotData.displayCellMap = buildDisplayCellMap(pivotData.cellMap, pivotData.rowKeys, pivotData.colKeys, pivotData.valNames.length || 1);

    var elContainer = this.getContainerElem();
    elContainer.innerHTML = '';

    var wrapper = document.createElement('div');
    wrapper.className = this._buildFormattingClassName(formatting);
    wrapper.innerHTML = renderSortToolbar(this, pivotData) + renderPivotTable(this, pivotData, formatting);
    elContainer.appendChild(wrapper);

    this._tooltipEl = null;
    this._ensureTooltip(elContainer);
    this._attachEventHandlers(elContainer);
    this._fixStickyHeaderOffsets(elContainer);
    this._updateHorizontalOverflowState(elContainer);
    this._syncSortToolbarWidth(elContainer);
    this._debugRenderedLayout(elContainer);
  };

  PivotViz.prototype._exportToExcel = function() {
    try {
      var pivotData = this._pivotData;
      if (!pivotData || !pivotData.rowKeys || !pivotData.rowKeys.length || !pivotData.colKeys || !pivotData.colKeys.length) {
        return;
      }
      var formatting = pivotData.formatting || this._getFormattingOptions();
      var rows = getWorkbookRows(pivotData, formatting, this);
      if (!rows.length) return;
      downloadBlob(createXlsxBlob(rows), getExportFilename());
    } catch (e) {
      try { _logger.error('[PivotViz] Excel export failed', e); } catch(ignore) {}
      if (typeof console !== 'undefined' && console.error) {
        console.error('[PivotViz] Excel export failed:', e);
      }
    }
  };

  PivotViz.prototype._fixStickyHeaderOffsets = function(rootElem) {
    var host = rootElem || this.getContainerElem();
    if (!host) return;
    var thead = host.querySelector('.pivot-table thead');
    if (!thead) return;
    var headerRows = thead.querySelectorAll('tr');
    if (headerRows.length <= 1) return;
    var cumulativeTop = 0;
    for (var r = 0; r < headerRows.length; r++) {
      var cells = headerRows[r].querySelectorAll('th');
      var rowHeight = 0;
      for (var c = 0; c < cells.length; c++) {
        if (r > 0 && !cells[c].getAttribute('rowspan')) {
          cells[c].style.top = cumulativeTop + 'px';
        }
      }
      // Measure actual row height from first non-rowspan cell
      for (var c2 = 0; c2 < cells.length; c2++) {
        var rs = parseInt(cells[c2].getAttribute('rowspan'), 10) || 0;
        if (rs <= 1) {
          var h = cells[c2].offsetHeight;
          if (h > rowHeight) rowHeight = h;
        }
      }
      cumulativeTop += rowHeight;
    }
  };

  PivotViz.prototype._updateHorizontalOverflowState = function(rootElem) {
    var host = rootElem || this.getContainerElem();
    if (!host) return;
    var wrapper = host.querySelector('.pivot-wrapper');
    if (!wrapper) return;
    var table = wrapper.querySelector('.pivot-table');
    if (!table) return;

    // Measure in full-width mode to avoid fit-content false positives.
    wrapper.style.width = '100%';
    wrapper.classList.add('pivot-overflow-x');
    var availableWidth = Math.max(0, Math.floor(wrapper.clientWidth || 0));
    var tableWidth = Math.max(
      0,
      Math.ceil(table.scrollWidth || 0),
      Math.ceil(table.getBoundingClientRect().width || 0)
    );
    var hasOverflowX = availableWidth > 0 && (tableWidth - availableWidth) > 1;

    if (hasOverflowX) {
      wrapper.style.width = '100%';
      wrapper.classList.add('pivot-overflow-x');
    } else {
      wrapper.style.width = 'fit-content';
      wrapper.classList.remove('pivot-overflow-x');
      wrapper.scrollLeft = 0;
    }
  };

  // =========================================================================
  // MARKING (Use as Filter)
  // =========================================================================

  PivotViz.prototype._fireMarkingEvent = function(rowIndices) {
    try {
      var oDataLayout = this._currentDataLayout;
      if (!oDataLayout) return;

      var oMarkingService = (typeof this.getMarkingService === 'function') ? this.getMarkingService() : null;
      if (!oMarkingService) return;

      // Clear existing marks
      try {
        if (typeof oMarkingService.clearMarksForDataLayout === 'function') {
          oMarkingService.clearMarksForDataLayout(oDataLayout);
        }
      } catch(e) {}

      // Apply new marks
      for (var i = 0; i < rowIndices.length; i++) {
        try {
          if (typeof oMarkingService.setMark === 'function') {
            oMarkingService.setMark(oDataLayout, datamodelshapes.Physical.ROW, 0, rowIndices[i]);
          }
        } catch(e) {}
      }

      try {
        if (typeof this._publishMarkEvent === 'function') {
          this._publishMarkEvent(oDataLayout);
        }
      } catch(e) {}

    } catch(e) {
      _logger.warn('[PivotViz] _fireMarkingEvent failed', e);
    }
  };

  PivotViz.prototype._clearSelection = function() {
    this._selectedRowKeys = [];
    var elContainer = this.getContainerElem();
    if (elContainer) {
      var allRows = elContainer.querySelectorAll('tr[data-row-idx]');
      for (var i = 0; i < allRows.length; i++) {
        allRows[i].classList.remove('pivot-row-selected');
      }
      var allCells = elContainer.querySelectorAll('.pivot-td-cell, .pivot-td-empty');
      for (var c = 0; c < allCells.length; c++) {
        allCells[c].classList.remove('pivot-cell-selected');
      }
    }
    this._selectedCellKeys = [];
    try {
      var oDataLayout = this._currentDataLayout;
      var oMark = (typeof this.getMarkingService === 'function') ? this.getMarkingService() : null;
      if (oDataLayout && oMark && typeof oMark.clearMarksForDataLayout === 'function') {
        // clearMarksForDataLayout already handles OAC's internal marking state.
        // Do NOT call _publishMarkEvent here — it creates a second ActionContext
        // simultaneously, causing "does not support multiple actions" errors.
        oMark.clearMarksForDataLayout(oDataLayout);
      }
    } catch(e) {}
  };

  PivotViz.prototype._publishMarkEvent = function(oDataLayout) {
    try {
      if (!interactions || !interactions.MarkingEvent) return;
      var ev = new interactions.MarkingEvent(
        this.getID(), this.getViewName(), oDataLayout, null, null
      );
      var router = this.getEventRouter && this.getEventRouter();
      if (router) router.publish(ev);
    } catch(e) {}
  };

  // =========================================================================
  // RESIZE
  // =========================================================================

  PivotViz.prototype.resizeVisualization = function(oVizDimensions, oTransientVizContext) {
    // The container uses overflow:auto; no special resize math needed.
    // Re-render to pick up any size changes.
    try {
      var ctx = this.createRenderingContext(oTransientVizContext);
      this.render(ctx);
    } catch(e) {
      try { _logger.warn('PivotViz.resizeVisualization failed', e); } catch(ignore) {}
    }
  };

  PivotViz.prototype._handlePropChange = function(sGadgetID, oPropChange, oViewSettings, oActionContext) {
    if (oViewSettings) {
      this._oViewSettings = oViewSettings;
      this._oActionContext = oActionContext;
    }
    var conf = oViewSettings.getViewConfigJSON(dataviz.SettingsNS.CHART) || {};
    var bUpdateSettings = PivotViz.superClass._handlePropChange.call(this, sGadgetID, oPropChange, oViewSettings, oActionContext);
    var specificConf = getVizSpecificSettingsConfig(this);
    if (specificConf) {
      for (var key in specificConf) {
        if (Object.prototype.hasOwnProperty.call(specificConf, key)) {
          conf[key] = specificConf[key];
        }
      }
    }
    var fmt = conf[VIEW_CONFIG_KEY] || getDefaultFormattingOptions();
    var changed = false;

    if (sGadgetID === 'showEdgeLabels') {
      fmt.showEdgeLabels = fromSwitcherBoolean(oPropChange.value, fmt.showEdgeLabels);
      changed = true;
    } else if (sGadgetID === 'showValues') {
      fmt.showValues = fromSwitcherBoolean(oPropChange.value, fmt.showValues);
      changed = true;
    } else if (sGadgetID === 'showAllValues') {
      fmt.showAllValues = fromSwitcherBoolean(oPropChange.value, fmt.showAllValues);
      changed = true;
    } else if (sGadgetID === 'autoFitColumns') {
      fmt.autoFitColumns = fromSwitcherBoolean(oPropChange.value, fmt.autoFitColumns);
      changed = true;
    } else if (sGadgetID === 'wrapText') {
      fmt.wrapText = normalizeWrapText(oPropChange.value, fmt.wrapText);
      changed = true;
    } else if (sGadgetID === 'valueAlignment') {
      fmt.valueAlignment = normalizeAlignment(oPropChange.value, fmt.valueAlignment);
      changed = true;
    } else if (sGadgetID === 'valueFormat') {
      fmt.valueFormat = normalizeValueFormat(oPropChange.value, fmt.valueFormat);
      changed = true;
    } else if (sGadgetID === 'dateFormat') {
      fmt.dateFormat = (oPropChange.value !== null && oPropChange.value !== undefined) ? String(oPropChange.value) : fmt.dateFormat;
      changed = true;
    } else if (sGadgetID && sGadgetID.indexOf('date_format_outputformat') === 0) {
      var vo = oPropChange && oPropChange.valueObject;
      if (vo) {
        var newDateFmt = null;
        if (vo.useValue === 'custom' && vo.value) {
          newDateFmt = vo.value;
        } else if (vo.useValue && vo.useValue !== 'custom') {
          newDateFmt = vo.useValue;
        } else if (vo.value) {
          newDateFmt = vo.value;
        }
        if (newDateFmt) {
          fmt.dateFormat = newDateFmt;
          changed = true;
        }
      }
    } else if (sGadgetID === 'metricColorScheme') {
      fmt.metricColorScheme = normalizeMetricColorScheme(oPropChange.value, fmt.metricColorScheme);
      changed = true;
    } else if (sGadgetID === 'attributeFillColor') {
      fmt.attributeFillColor = normalizeAttributeFillColor(oPropChange.value, fmt.attributeFillColor);
      changed = true;
    } else if (sGadgetID === 'cellBackground') {
      fmt.cellBackground = normalizeCellBackground(oPropChange.value);
      changed = true;
    } else if (sGadgetID === 'compressRows') {
      fmt.compressRows = fromSwitcherBoolean(oPropChange.value, fmt.compressRows);
      changed = true;
    } else if (sGadgetID === 'compressCols') {
      fmt.compressCols = fromSwitcherBoolean(oPropChange.value, fmt.compressCols);
      changed = true;
    } else if (sGadgetID === 'rowDensity') {
      fmt.rowDensity = normalizeDensity(oPropChange.value, fmt.rowDensity);
      changed = true;
    } else if (sGadgetID === 'bandedRows') {
      fmt.bandedRows = fromSwitcherBoolean(oPropChange.value, fmt.bandedRows);
      changed = true;
    } else if (sGadgetID === 'applyDefaultSort') {
      var newApply = (oPropChange.value === 'custom') ? 'custom' : 'auto';
      if (newApply === 'auto' && this._suppressApplySortHandler) {
        // This 'auto' event was triggered by our programmatic setValue reset — ignore it.
        this._suppressApplySortHandler = false;
        return bUpdateSettings;
      }
      this._suppressApplySortHandler = false;
      fmt.applyDefaultSort = 'auto';
      changed = true;
      if (newApply === 'auto') {
        // Author explicitly cleared the custom sort via "None"
        fmt.sortState = [];
        fmt.sortStateVersion = VIEW_CONFIG_VERSION;
        fmt.sortSaveNonce = '';
        conf[SORT_CONFIG_KEY] = [];
        conf[SORT_VERSION_KEY] = VIEW_CONFIG_VERSION;
        this._hasUserSortOverride = false;
        this._sortState = [];
      }
      if (newApply === 'custom') {
        // Reset the GadgetInfo display value back to 'auto' after OAC finishes its own post-click update.
        // OAC caches the GadgetInfo between panel opens; setValue re-arms the button for the next click.
        // _suppressApplySortHandler guards against setValue firing the 'auto' handler (which would clear sort).
        var selfReset = this;
        setTimeout(function() {
          if (selfReset._applyDefaultSortGadgetInfo && typeof selfReset._applyDefaultSortGadgetInfo.setValue === 'function') {
            selfReset._suppressApplySortHandler = true;
            selfReset._applyDefaultSortGadgetInfo.setValue('auto');
            // Safety: clear flag after 500ms in case setValue didn't trigger the handler
            setTimeout(function() { selfReset._suppressApplySortHandler = false; }, 500);
          }
        }, 0);
      }
    } else if (sGadgetID === 'sortState') {
      try {
        var sortVal = oPropChange && oPropChange.value;
        var parsedSort = (typeof sortVal === 'string') ? JSON.parse(sortVal) : (Array.isArray(sortVal) ? sortVal : []);
        fmt.sortState = normalizeSortState(parsedSort);
        fmt.sortStateVersion = VIEW_CONFIG_VERSION;
        fmt.sortSaveNonce = String(new Date().getTime());
        changed = true;
      } catch(e) {}
    }

    if (changed) {
      // Piggyback any in-session sort override onto this commit.
      // This fires for every Properties-panel change AND for every setValue() trigger
      // from _persistSortState, so sort is committed whenever any property changes.
      if (this._hasUserSortOverride && this._sortState) {
        fmt.sortState = normalizeSortState(this._sortState);
        fmt.sortStateVersion = VIEW_CONFIG_VERSION;
        fmt.sortSaveNonce = String(new Date().getTime());
        conf[SORT_CONFIG_KEY] = fmt.sortState;
        conf[SORT_VERSION_KEY] = VIEW_CONFIG_VERSION;
        console.log('[AttrPivot] Sort piggybacked in handlePropChange for gadget:', sGadgetID, '| sortLen:', fmt.sortState.length);
      }
      conf[VIEW_CONFIG_KEY] = fmt;
      try { oViewSettings.setViewConfigJSON(dataviz.SettingsNS.CHART, conf); } catch(e) {}
      setStoredViewConfig(this, conf);
      bUpdateSettings = true;
    }

    return bUpdateSettings;
  };

  PivotViz.prototype.handlePropChange = function() {
    return this._handlePropChange.apply(this, arguments);
  };

  PivotViz.prototype._addVizSpecificPropsDialog = function(oTabbedPanelsGadgetInfo) {
    this._tabbedPanelsGadgetInfo = oTabbedPanelsGadgetInfo;
    PivotViz.superClass._addVizSpecificPropsDialog.call(this, oTabbedPanelsGadgetInfo);
    this.doAddVizSpecificPropsDialog(this, oTabbedPanelsGadgetInfo);
    // If there is a pending sort override, try to commit it now that the Properties panel opened
    if (this._hasUserSortOverride && this._sortState) {
      this._pendingSortAfterPanelOpen = true;
    }
  };

  PivotViz.prototype.doAddVizSpecificPropsDialog = function(oTransientRenderingContext, oTabbedPanelsGadgetInfo) {
    jsx.assertObject(oTransientRenderingContext, "oTransientRenderingContext");
    jsx.assertInstanceOf(oTabbedPanelsGadgetInfo, gadgets.TabbedPanelsGadgetInfo, "oTabbedPanelsGadgetInfo", "obitech-application/gadgets.TabbedPanelsGadgetInfo");

    var options = getStoredViewConfig(this);
    var formatting = this._fillDefaultOptions(options);
    var generalPanel = gadgetdialog.forcePanelByID(oTabbedPanelsGadgetInfo, euidef.GD_PANEL_ID_GENERAL);
    generalPanel.setBodyCSSClass("bi_gadgets_no_cell_separator");
    var nOrder = euidef.GD_FIELD_ORDER_GENERAL_VIZ_SPECIFIC;

    var factory = this.getGadgetFactory();
    var autoBooleanOptions = [
      new gadgets.OptionInfo('auto', 'Auto'),
      new gadgets.OptionInfo('true', 'On'),
      new gadgets.OptionInfo('false', 'Off')
    ];
    var densityOptions = [
      new gadgets.OptionInfo('auto', 'Auto'),
      new gadgets.OptionInfo('compact', 'Compact'),
      new gadgets.OptionInfo('comfortable', 'Comfortable')
    ];
    var valueFormatOptions = [
      new gadgets.OptionInfo('auto', 'Auto'),
      new gadgets.OptionInfo('#,##0', '#,##0'),
      new gadgets.OptionInfo('#,##0.00', '#,##0.00'),
      new gadgets.OptionInfo('currency', 'Currency'),
      new gadgets.OptionInfo('percent', 'Percent')
    ];
    var wrapTextOptions = [
      new gadgets.OptionInfo('auto', 'Auto'),
      new gadgets.OptionInfo('true', 'On'),
      new gadgets.OptionInfo('false', 'Off')
    ];

    nOrder += 1;
    var showEdgeLabelsInfo = new gadgets.TextSwitcherGadgetInfo(
      'showEdgeLabels',
      'Show Edge Labels',
      'Show Edge Labels',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.showEdgeLabels)),
      nOrder,
      null,
      autoBooleanOptions
    );
    showEdgeLabelsInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(showEdgeLabelsInfo);

    nOrder += 1;
    var showValuesInfo = new gadgets.TextSwitcherGadgetInfo(
      'showValues',
      'Show Values',
      'Show Values',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.showValues)),
      nOrder,
      null,
      autoBooleanOptions
    );
    showValuesInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(showValuesInfo);
    // Store gadget and panel references so _persistSortState can try programmatic triggers
    this._showValuesGadgetInfo = showValuesInfo;
    this._generalPanelRef = generalPanel;

    nOrder += 1;
    var showAllValuesInfo = new gadgets.TextSwitcherGadgetInfo(
      'showAllValues',
      'Show Empty Cells',
      'Show Empty Cells: show all row/column combinations, including those with no data',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.showAllValues)),
      nOrder,
      null,
      autoBooleanOptions
    );
    showAllValuesInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(showAllValuesInfo);

    nOrder += 1;
    var autoFitColumnsInfo = new gadgets.TextSwitcherGadgetInfo(
      'autoFitColumns',
      'Auto-fit Columns',
      'Auto-fit Columns',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.autoFitColumns)),
      nOrder,
      null,
      autoBooleanOptions
    );
    autoFitColumnsInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(autoFitColumnsInfo);

    nOrder += 1;
    var wrapTextInfo = new gadgets.TextSwitcherGadgetInfo(
      'wrapText',
      'Wrap Text',
      'Wrap Text',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.wrapText)),
      nOrder,
      null,
      wrapTextOptions
    );
    wrapTextInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(wrapTextInfo);

    nOrder += 1;
    var alignmentOptions = [
      new gadgets.OptionInfo('auto', 'Auto'),
      new gadgets.OptionInfo('left', 'Left'),
      new gadgets.OptionInfo('center', 'Center'),
      new gadgets.OptionInfo('right', 'Right')
    ];
    var valueAlignmentProps = new gadgets.GadgetValueProperties(
      euidef.GadgetTypeIDs.TEXT_SWITCHER,
      formatting.valueAlignment === 'center' ? 'auto' : formatting.valueAlignment
    );
    var valueAlignmentInfo = new gadgets.TextSwitcherGadgetInfo(
      'valueAlignment',
      'Value Alignment',
      'Value Alignment',
      valueAlignmentProps,
      nOrder,
      null,
      alignmentOptions
    );
    valueAlignmentInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(valueAlignmentInfo);

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
    valueFormatInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(valueFormatInfo);

    nOrder += 1;
    var cellBackgroundInfo = tryCreateCellBackgroundGadget(gadgets, euidef, formatting, nOrder);
    if (cellBackgroundInfo) {
      cellBackgroundInfo.setGroupName('attrpivot_props');
      generalPanel.addChild(cellBackgroundInfo);
    }

    nOrder += 1;
    var metricColorSchemeInfo = tryCreateMetricColorGadget(gadgets, euidef, formatting, nOrder);
    if (metricColorSchemeInfo) {
      metricColorSchemeInfo.setGroupName('attrpivot_props');
      generalPanel.addChild(metricColorSchemeInfo);
    }

    nOrder += 1;
    var attributeFillColorInfo = tryCreateAttributeColorGadget(gadgets, euidef, formatting, nOrder);
    if (attributeFillColorInfo) {
      attributeFillColorInfo.setGroupName('attrpivot_props');
      generalPanel.addChild(attributeFillColorInfo);
    }

    nOrder += 1;
    var compressRowsInfo = new gadgets.TextSwitcherGadgetInfo(
      'compressRows',
      'Compress Row Headers',
      'Compress Row Headers: merge repeated values in row headers',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.compressRows)),
      nOrder,
      null,
      autoBooleanOptions
    );
    compressRowsInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(compressRowsInfo);

    nOrder += 1;
    var compressColsInfo = new gadgets.TextSwitcherGadgetInfo(
      'compressCols',
      'Compress Column Headers',
      'Compress Column Headers: merge repeated values in column headers',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.compressCols)),
      nOrder,
      null,
      autoBooleanOptions
    );
    compressColsInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(compressColsInfo);

    nOrder += 1;
    var rowDensityInfo = new gadgets.TextSwitcherGadgetInfo(
      'rowDensity',
      'Row Density',
      'Row Density',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.rowDensity)),
      nOrder,
      null,
      densityOptions
    );
    rowDensityInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(rowDensityInfo);

    nOrder += 1;
    var bandedRowsInfo = new gadgets.TextSwitcherGadgetInfo(
      'bandedRows',
      'Banded Rows',
      'Banded Rows',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, String(formatting.bandedRows)),
      nOrder,
      null,
      autoBooleanOptions
    );
    bandedRowsInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(bandedRowsInfo);

    nOrder += 1;
    var applyDefaultSortOptions = [
      new gadgets.OptionInfo('auto', 'Default'),
      new gadgets.OptionInfo('custom', 'Save New Default Sort')
    ];
    var applyDefaultSortValue = 'auto'; // always show 'Default' — 'Save New Default Sort' is a one-shot action that resets itself
    var applyDefaultSortInfo = new gadgets.TextSwitcherGadgetInfo(
      'applyDefaultSort',
      'Set Sort',
      'Set Sort: Default = natural data order; Save New Default Sort = commit current toolbar sort as the workbook default',
      new gadgets.GadgetValueProperties(euidef.GadgetTypeIDs.TEXT_SWITCHER, applyDefaultSortValue),
      nOrder,
      null,
      applyDefaultSortOptions
    );
    applyDefaultSortInfo.setGroupName('attrpivot_props');
    generalPanel.addChild(applyDefaultSortInfo);
    this._applyDefaultSortGadgetInfo = applyDefaultSortInfo;

    if (factory && factory.createGadgetInfo) {
      // no-op; factory lookup confirms gadget factory exists in this OAC build
    }

    if (PivotViz.superClass.doAddVizSpecificPropsDialog) {
      PivotViz.superClass.doAddVizSpecificPropsDialog.apply(this, arguments);
    }
  };

  // =========================================================================
  // FACTORY
  // =========================================================================

  function createClientComponent(sID, sDisplayName, sOrigin, sVersion) {
    return new PivotViz(sID, sDisplayName, sOrigin, sVersion);
  }

  return { createClientComponent: createClientComponent };
});
