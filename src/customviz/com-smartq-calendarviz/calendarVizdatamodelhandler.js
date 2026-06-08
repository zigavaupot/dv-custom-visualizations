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
   * - ROW edge: Task/title columns, Color column, Conditional Formatting columns, URL column, Tooltip columns
   * - DATA edge: Optional measures
   *
   * GRAMMAR PLACEHOLDERS:
   * - Rows: 1st: Task title, 2nd: subtitle left, 3rd: date (calendar placement), 4th: middle text, 5th: bottom text
   * - Color: Category for color-coding tasks (0-1 categorical column)
   * - Shape (Conditional Formatting): up to 2 condition flags (RED, YELLOW)
   * - Size (URL): optional hidden hyperlink target
   * - Tooltip: Additional information (0-5 categorical columns)
   * - Values: Optional numeric values (0-1 measure)
   *
   * Logical.ROW      -> Physical.ROW
   * Logical.COLOR    -> Physical.ROW
   * Logical.GLYPH    -> Physical.ROW
   * Logical.SIZE     -> Physical.ROW
   * Logical.TOOLTIP  -> Physical.ROW
   * Logical.MEASURES -> Physical.DATA (optional measures)
   */
  CalendarVizDataModelHandler.prototype.getLogicalMapper = function () {
    var physData = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.DATA);
    var physRow  = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.ROW);

    var mapper = new vdm.Mapper();

    // ROW logical -> ROW physical
    mapper.addCategoricalMapping(datamodelshapes.Logical.ROW, physRow);

    // COLOR logical -> ROW physical (color category for task stripe)
    mapper.addCategoricalMapping(datamodelshapes.Logical.COLOR, physRow);

    // GLYPH logical -> ROW physical (conditional formatting flags)
    mapper.addCategoricalMapping(datamodelshapes.Logical.GLYPH, physRow);

    // SIZE logical -> ROW physical (hidden URL target)
    mapper.addCategoricalMapping(datamodelshapes.Logical.SIZE, physRow);

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
