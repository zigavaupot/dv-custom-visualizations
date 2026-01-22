define(['obitech-framework/jsx',
        'obitech-reportservices/datamodelshapes',
        'obitech-viz/genericDataModelHandler',
        'obitech-report/vizdatamodelsmanager'],
        function(jsx, 
                 datamodelshapes,
                 genericDataModelHandler,
                 vdm) {
   "use strict";
   var circlePackDataModelHandler = {};

   /**
    * @class The data model handler.
    * @constructor
    * @param {object=} oConfig
    * @param {string=} sId
    * @param {string=} sDisplayName
    * @param {string=} sOrigin
    * @param {string=} sVersion
    * @memberof module:obitech-circlepack/CirclePackDataModelHandler#
    * @extends module:obitech-viz/vizDataModelHandlerBase#VisualizationHandlerBase
    */
   function CirclePackDataModelHandler(oConfig, sId, sDisplayName, sOrigin, sVersion)
   {
      CirclePackDataModelHandler.baseConstructor.call(this, oConfig, sId, sDisplayName, sOrigin, sVersion);
   }
   jsx.extend(CirclePackDataModelHandler, genericDataModelHandler.GenericDataModelHandler);
   circlePackDataModelHandler.CirclePackDataModelHandler = CirclePackDataModelHandler;

   /**
    * @returns module:obitech-report/vizdatamodelsmanager#Mapper
    */
   CirclePackDataModelHandler.prototype.getLogicalMapper = function () {
      var oData = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.DATA);
      var oRow = new datamodelshapes.PhysicalPlacement(datamodelshapes.Physical.ROW);

      var oMapper = new vdm.Mapper();

      oMapper.addCategoricalMapping(datamodelshapes.Logical.SIZE,   null); // don't place
      oMapper.addCategoricalMapping(datamodelshapes.Logical.COLOR,  oRow); // color -> row
      oMapper.addCategoricalMapping(datamodelshapes.Logical.ROW, oRow); // row -> row

      oMapper.addMeasureMapping(datamodelshapes.Logical.SIZE,   null); // Don't place
      oMapper.addMeasureMapping(datamodelshapes.Logical.COLOR,  null); // Don't place
      oMapper.addMeasureMapping(datamodelshapes.Logical.MEASURES, oData);

      oMapper.addAdvancedAnalyticsMapping(datamodelshapes.Logical.GLYPH, null, null);
      oMapper.addAdvancedAnalyticsMapping(datamodelshapes.Logical.COLOR, null, null);

      // where to place physical measure label in case no measure layer is present in logical
      oMapper.setDefaultPhysicalMeasureLabel(datamodelshapes.Physical.COLUMN, this.getMeasureLabelConfig().visibility);

      return oMapper;
   };

   /**
    * Returns the handler
    *@param {String} extensionPointName
    *@param {Object} config
    */
   circlePackDataModelHandler.getHandler = function(extensionPointName, config) {
      return new CirclePackDataModelHandler(config, extensionPointName);
   };

   return circlePackDataModelHandler;
});
