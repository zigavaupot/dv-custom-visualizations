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

  var kanbanVizDataModelHandler = {};

  function KanbanVizDataModelHandler(oConfig, sId, sDisplayName, sOrigin, sVersion) {
    KanbanVizDataModelHandler.baseConstructor.call(
      this,
      oConfig,
      sId,
      sDisplayName,
      sOrigin,
      sVersion
    );
  }

  // Inherit from GenericDataModelHandler
  jsx.extend(KanbanVizDataModelHandler, genericDataModelHandler.GenericDataModelHandler);
  kanbanVizDataModelHandler.KanbanVizDataModelHandler = KanbanVizDataModelHandler;

  /**
   * Tell Oracle DV how logical roles map to the physical data edges.
   *
   * DATA LAYOUT STRUCTURE:
   * - ROW edge: Task title (layer 0), Color (layer 1), Tooltip columns (layers 2+)
   * - DATA edge: Completion percentage measure
   *
   * GRAMMAR PLACEHOLDERS:
   * - Rows (Task): Primary dimension - task name
   * - Color: Category for stripe color (1 column)
   * - Tooltip: Additional attributes (first can be Y/N condition flag)
   * - Values: Completion % measure
   *
   * Logical.ROW      -> Physical.ROW (layer 0: task title)
   * Logical.COLOR    -> Physical.ROW (layer 1: color/category)
   * Logical.TOOLTIP  -> Physical.ROW (layers 2+: tooltip attributes, first can be condition)
   * Logical.MEASURES -> Physical.DATA (completion %)
   */
  KanbanVizDataModelHandler.prototype.getLogicalMapper = function () {
    var physData = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.DATA);
    var physRow  = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.ROW);

    var mapper = new vdm.Mapper();

    // Categorical mappings - all map to ROW edge at different layers:
    // ROW logical -> ROW physical layer 0 (task title, primary dimension)
    mapper.addCategoricalMapping(datamodelshapes.Logical.ROW, physRow);
    
    // COLOR logical -> ROW physical layer 1 (color/category for stripe)
    mapper.addCategoricalMapping(datamodelshapes.Logical.COLOR, physRow);

    // TOOLTIP logical -> ROW physical layers 2+ 
    // First tooltip column can be used as condition flag (Y/N)
    // Remaining columns appear in tooltip
    mapper.addCategoricalMapping(datamodelshapes.Logical.TOOLTIP, physRow);

    // NOTE: Removed Logical.DETAIL - it doesn't exist in Oracle DV API!

    // Measure mapping:
    // MEASURES logical -> DATA physical (completion percentage)
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
  KanbanVizDataModelHandler.prototype.getSelectionConfig = function() {
    var config = KanbanVizDataModelHandler.superclass.getSelectionConfig.call(this);
    
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
  KanbanVizDataModelHandler.prototype.getDataModelCapabilities = function() {
    var capabilities = KanbanVizDataModelHandler.superclass.getDataModelCapabilities.call(this);
    
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
  KanbanVizDataModelHandler.prototype.getSupportedPhysicalEdges = function () {
    return [
      datamodelshapes.Physical.ROW,
      datamodelshapes.Physical.DATA
    ];
  };

  /**
   * Provide a stable order for physical edges.
   */
  KanbanVizDataModelHandler.prototype.getPhysicalEdgeOrder = function () {
    return [
      datamodelshapes.Physical.ROW,
      datamodelshapes.Physical.DATA
    ];
  };

  /**
   * Factory required by plugin.xml configuration.method = "getHandler"
   */
  kanbanVizDataModelHandler.getHandler = function(extensionPointName, config) {
    return new KanbanVizDataModelHandler(config, extensionPointName);
  };

  return kanbanVizDataModelHandler;
});