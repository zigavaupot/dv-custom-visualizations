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

  var pivotVizDataModelHandler = {};

  function PivotVizDataModelHandler(oConfig, sId, sDisplayName, sOrigin, sVersion) {
    PivotVizDataModelHandler.baseConstructor.call(
      this,
      oConfig,
      sId,
      sDisplayName,
      sOrigin,
      sVersion
    );
  }

  jsx.extend(PivotVizDataModelHandler, genericDataModelHandler.GenericDataModelHandler);
  pivotVizDataModelHandler.PivotVizDataModelHandler = PivotVizDataModelHandler;

  /**
   * Map logical grammar slots to physical data edges.
   *
   * PHYSICAL DATA LAYOUT (all mapped to Physical.ROW):
   *   Layer 0..N-1:           Row dimensions      (from Logical.ROW / "Rows")
   *   Layer N..N+M-1:         Column dimensions   (from Logical.SIZE / "Columns")
   *   Layer N+M..N+M+K-1:     Cell values         (from Logical.GLYPH / "Values")
   *   Layer ...               Optional cell color (from Logical.COLOR)
   *   Layer ...               Optional tooltip    (from Logical.TOOLTIP)
   *
   * Physical.DATA is unused (no measures needed for categorical pivot).
   *
   * The visualization reads all layers from Physical.ROW, then dynamically
   * determines slot boundaries by inspecting logical edge column ID lists.
   */
  PivotVizDataModelHandler.prototype.getLogicalMapper = function () {
    var physData = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.DATA);
    var physRow  = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.ROW);
    var logicalDetailEdge = (datamodelshapes.Logical && datamodelshapes.Logical.DETAIL) ? datamodelshapes.Logical.DETAIL : "detail";

    var mapper = new vdm.Mapper();

    // Row dimensions (grammar slot "Rows") -> Physical.ROW
    mapper.addCategoricalMapping(datamodelshapes.Logical.ROW, physRow);

    // Column dimensions (grammar slot "Columns", shown as "size" in OAC) -> Physical.ROW
    mapper.addCategoricalMapping(datamodelshapes.Logical.SIZE, physRow);

    // Cell values (grammar slot "Values", shown as "glyph" in OAC) -> Physical.ROW
    mapper.addCategoricalMapping(datamodelshapes.Logical.GLYPH, physRow);

    // Optional cell color and additional tooltip attributes
    mapper.addCategoricalMapping(datamodelshapes.Logical.COLOR, physRow);
    mapper.addMeasureMapping(logicalDetailEdge, physData);
    mapper.addCategoricalMapping(datamodelshapes.Logical.TOOLTIP, physRow);

    // Measure columns (grammar slot "Measure") -> Physical.DATA
    // NOTE: do NOT call setDefaultPhysicalMeasureLabel(Physical.ROW) — that
    // collapses Physical.DATA to a single aggregate row, breaking per-row reads.
    // Following the Oracle circlepack sample pattern: just register the mapping.
    mapper.addMeasureMapping(datamodelshapes.Logical.MEASURES, physData);

    return mapper;
  };

  PivotVizDataModelHandler.prototype.getSelectionConfig = function() {
    var config = PivotVizDataModelHandler.superclass.getSelectionConfig.call(this);
    if (!config) {
      config = { includeAllDimensions: true, includeAllMeasures: false };
    }
    return config;
  };

  PivotVizDataModelHandler.prototype.getDataModelCapabilities = function() {
    var capabilities = PivotVizDataModelHandler.superclass.getDataModelCapabilities.call(this);
    if (!capabilities) {
      capabilities = {};
    }
    capabilities.supportsSelection = true;
    capabilities.supportsMarking = true;
    capabilities.exposeAllColumns = true;
    return capabilities;
  };

  PivotVizDataModelHandler.prototype.getSupportedPhysicalEdges = function () {
    return [
      datamodelshapes.Physical.ROW,
      datamodelshapes.Physical.DATA
    ];
  };

  PivotVizDataModelHandler.prototype.getPhysicalEdgeOrder = function () {
    return [
      datamodelshapes.Physical.ROW,
      datamodelshapes.Physical.DATA
    ];
  };

  pivotVizDataModelHandler.getHandler = function(extensionPointName, config) {
    return new PivotVizDataModelHandler(config, extensionPointName);
  };

  return pivotVizDataModelHandler;
});
