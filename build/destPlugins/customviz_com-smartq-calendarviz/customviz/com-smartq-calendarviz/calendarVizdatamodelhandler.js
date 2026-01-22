define([
  'obitech-framework/jsx',
  'obitech-reportservices/datamodelshapes',
  'obitech-viz/genericDataModelHandler',
  'obitech-report/vizdatamodelsmanager'
], function(
  jsx,
  datamodelshapes,
  genericDataModelHandler,
  vdm
) {
  "use strict";

  var calendarVizDataModelHandler = {};

  function CalendarVizDataModelHandler(oConfig, sId, sDisplayName, sOrigin, sVersion) {
    CalendarVizDataModelHandler.baseConstructor.call(
      this,
      oConfig,
      sId,
      sDisplayName,
      sOrigin,
      sVersion
    );
  }

  // Inherit from GenericDataModelHandler
  jsx.extend(CalendarVizDataModelHandler, genericDataModelHandler.GenericDataModelHandler);
  calendarVizDataModelHandler.CalendarVizDataModelHandler = CalendarVizDataModelHandler;

  /**
   * Tell Oracle DV how logical roles map to the physical data edges.
   *
   * DATA LAYOUT STRUCTURE:
   * - ROW edge: Task name (layer 0), Date (layer 1), Additional details (layers 2-3), Color (layer 4), Tooltip columns (layers 5+)
   * - DATA edge: Optional measures
   *
   * GRAMMAR PLACEHOLDERS:
   * - Rows: 1st: Task name, 2nd: Date (Rok izvedbe), 3rd-4th: Additional details (optional)
   * - Color: Category for color-coding tasks (0-1 categorical column)
   * - Tooltip: Additional information (0-5 categorical columns)
   * - Values: Optional numeric values (0-1 measure)
   *
   * Logical.ROW      -> Physical.ROW (layers 0-3: task name, date, details)
   * Logical.COLOR    -> Physical.ROW (layer 4: color category)
   * Logical.TOOLTIP  -> Physical.ROW (layers 5+: tooltip attributes)
   * Logical.MEASURES -> Physical.DATA (optional measures)
   */
  CalendarVizDataModelHandler.prototype.getLogicalMapper = function () {
    var physData = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.DATA);
    var physRow  = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.ROW);

    var mapper = new vdm.Mapper();

    // ROW logical -> ROW physical
    // Layer 0: Task name
    // Layer 1: Date (Rok izvedbe) - the date when task should appear on calendar
    // Layer 2-3: Additional details (optional)
    mapper.addCategoricalMapping(datamodelshapes.Logical.ROW, physRow);

    // COLOR logical -> ROW physical (color category for task stripe)
    mapper.addCategoricalMapping(datamodelshapes.Logical.COLOR, physRow);

    // TOOLTIP logical -> ROW physical (additional information)
    mapper.addCategoricalMapping(datamodelshapes.Logical.TOOLTIP, physRow);

    // Measure mapping (optional)
    // MEASURES logical -> DATA physical
    mapper.addMeasureMapping(datamodelshapes.Logical.MEASURES, physData);

    // Where to show measure label when no explicit layer is present
    mapper.setDefaultPhysicalMeasureLabel(
      datamodelshapes.Physical.COLUMN,
      this.getMeasureLabelConfig().visibility
    );

    return mapper;
  };

  /**
   * OPTIONAL: Override to customize how selection events are handled
   */
  CalendarVizDataModelHandler.prototype.getSelectionConfig = function() {
    var config = CalendarVizDataModelHandler.superclass.getSelectionConfig.call(this);

    if (!config) {
      config = {
        includeAllDimensions: true,
        includeAllMeasures: true
      };
    }

    return config;
  };

  /**
   * OPTIONAL: Provide additional metadata about how this viz uses data
   */
  CalendarVizDataModelHandler.prototype.getDataModelCapabilities = function() {
    var capabilities = CalendarVizDataModelHandler.superclass.getDataModelCapabilities.call(this);

    if (!capabilities) {
      capabilities = {};
    }

    capabilities.supportsSelection = true;
    capabilities.supportsMarking = true;
    capabilities.exposeAllColumns = true;

    return capabilities;
  };

  /**
   * Explicitly advertise supported physical edges for this viz.
   */
  CalendarVizDataModelHandler.prototype.getSupportedPhysicalEdges = function () {
    return [
      datamodelshapes.Physical.ROW,
      datamodelshapes.Physical.DATA
    ];
  };

  /**
   * Provide a stable order for physical edges.
   */
  CalendarVizDataModelHandler.prototype.getPhysicalEdgeOrder = function () {
    return [
      datamodelshapes.Physical.ROW,
      datamodelshapes.Physical.DATA
    ];
  };

  /**
   * Factory required by plugin.xml configuration.method = "getHandler"
   */
  calendarVizDataModelHandler.getHandler = function(extensionPointName, config) {
    return new CalendarVizDataModelHandler(config, extensionPointName);
  };

  return calendarVizDataModelHandler;
});
