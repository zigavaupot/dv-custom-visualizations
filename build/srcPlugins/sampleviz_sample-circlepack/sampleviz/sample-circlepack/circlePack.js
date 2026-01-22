define(['jquery',
        'obitech-framework/jsx',
        'obitech-application/gadgets',
        'obitech-report/datavisualization',
        'obitech-legend/legendandvizcontainer',
        'obitech-reportservices/datamodelshapes',
        'obitech-reportservices/data',
        'd3js',
        'obitech-reportservices/events',
        'obitech-reportservices/interactionservice',
        'obitech-reportservices/markingservice',
        'obitech-application/extendable-ui-definitions',
        'obitech-framework/messageformat',
        'skin!css!obitech-circlepack/circlePackStyles'],
        function($,
                 jsx,
                 gadgets,
                 dataviz,
                 legendandvizcontainer,
                 datamodelshapes,
                 data,
                 d3,
                 events,
                 interactions,
                 marking,
                 euidef) {
   "use strict";

   //Param validation to detect cyclical dependencies (ignore modules not used in resource arguments)
   jsx.assertAllNotNullExceptLastN(arguments, "circlePack.js arguments", 2);

   /**
   * Return object for module
   */
   var circlePack = {};

  /**
    * DataContextProperty stores the enums for the various properties
    * that can be retrieved via the RenderingContext that is passed
    * to the rendering, sizing, and eventing functions.
    */
   circlePack.DataContextProperty = {
      DATA: "circlePackData"
   }; 

   // The version of our Plugin
   CirclePack.VERSION = "1.0.0";

   /**
    * The implementation of the circlePack visualization.
    * 
    * @constructor
    * @param {string} sID
    * @param {string} sDisplayName
    * @param {string} sOrigin
    * @param {string} sVersion
    * @extends {module:obitech-report/visualization.Visualization}
    * @memberof module:obitech-circlepack/circlePack#
    */
   function CirclePack(sID, sDisplayName, sOrigin, sVersion) {
      // Argument validation done by base class
      CirclePack.baseConstructor.call(this, sID, sDisplayName, sOrigin, sVersion);
      
      /**
       * The array of selected items
       * @type {Array.<String>}
       */
      var aSelectedItems = [];
      
      /**
       * @return  {Array.<String>} - The array of selected items
       */
      this.getSelectedItems = function(){
         return aSelectedItems;
      };
      
      /**
       * Clears the current list of selected items
       */
      this.clearSelectedItems = function(){
         aSelectedItems = [];
      };
      
      // Create legend options
      var oLegendOptions = {
         sAutoPositionOverride: gadgets.LegendControlsGadgetValueProperties.Positions.BOTTOM, 
         bVerticalAlignOnVizBody: false
      };
      // Add legend capabilities
      legendandvizcontainer.addLegendAndVizContainerFunctions(this, oLegendOptions);
   }
   jsx.extend(CirclePack, dataviz.DataVisualization);

   /**
    * Called whenever new data is ready and this visualization needs to update.
    * @param {module:obitech-renderingcontext/renderingcontext.RenderingContext} oTransientRenderingContext
    */
   CirclePack.prototype.render = function(oTransientRenderingContext) {
      // Note: all events will be received after initialize and start complete.  We may get other events
      // such as 'resize' before the onDataReady, i.e. this might not be the first event.
      
      // generate the data before we render the legend, since we generate the legend items when we generate the series map / series legend items
      this._generateData(oTransientRenderingContext);
      this.renderLegend(oTransientRenderingContext);
      this._render(oTransientRenderingContext);
      
      // Generate (asynchronously) the list of selected items for this visual
      this._buildSelectedItems(oTransientRenderingContext);
   };
      
   /**
    * Called whenever new data is ready and this visualization needs to update.
    * @param {module:obitech-renderingcontext/renderingcontext.RenderingContext} oTransientRenderingContext
    */
   CirclePack.prototype._render = function(oTransientRenderingContext) {
      // Note: all events will be received after initialize and start complete.  We may get other events
      // such as 'resize' before the onDataReady, i.e. this might not be the first event.
      
      // Retrieve the root container for our visualization using the legend functions.
      // The legend should have already been processed by the time we get here, and thus
      // the container size should already be set appropriately.
      var elContainer = this.getVizBodyContainer();
      
      // Let's track our viz for function calls where the 'this' context changes
      var oViz = this;
      
      // Let's reset our container on render
      $(elContainer).empty();
      
      $(elContainer).addClass("circle_packRootContainer");
      var sVizContainerId = this.getSubElementIdFromParent(this.getVizBodyContainer(), "hvc");
      $(elContainer).html("<div id=\"" + sVizContainerId + "\" class=\"circle_packVizContainer\" />");
      var elVizContainer = document.getElementById(sVizContainerId);
      
      // Get the weidth and height of our container
      var nWidth = $(elContainer).width();
      var nHeight = $(elContainer).height();
      
      // Calculate our margin and diameter
      var nMargin = 15,
         nDiameter = Math.min(nWidth, nHeight);
      
      var fFormat = d3.format(",f");

      var fColor = d3.scale.linear()
         .domain([-1, 5])
         .range(["hsl(198, 84%, 61%)", "hsl(230,31%,42%)"])
         .interpolate(d3.interpolateHcl);

      var oPack = d3.layout.pack()
         .padding(2)
         .size([nDiameter - nMargin, nDiameter - nMargin])
         .value(function(d) { return d.size; });

      var oSVG = d3.select(elVizContainer).append("svg");
      
      var oG = oSVG.attr("width", nDiameter)
         .attr("height", nDiameter)
         .append("g")
         .attr("transform", "translate(" + nDiameter / 2 + "," + nDiameter / 2 + ")");
      
      var oDataLayout = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_LAYOUT);
      var oData = this._generateData(oTransientRenderingContext);
      if(!oData) {
         return;
      }
      
      var fRenderData = function(oData) {
         var oFocus = oData,
         aDataNodes = oPack.nodes(oData),
         oView;

         var aSelectedItems = oViz.getSelectedItems();
         
         var aCircles = oG.selectAll("circle")
            .data(aDataNodes)
            .enter()
            .append("circle")
            .attr("class", function(d) { 
               var sClass = d.parent ? d.children ? "circle_pack_node" : "circle_pack_node circle_pack_node--leaf" : "circle_pack_node circle_pack_node--root";
               if(d.selectionID) {
                  var sSelectionKey = d.selectionID.row + ":" + d.selectionID.col;
                  if(aSelectedItems.indexOf(sSelectionKey) >= 0)
                     sClass += " circle_pack_selected";
               }
               return sClass; 
            })
            .attr("selectionID", function(d) { return d.selectionID; })
            .style("fill", function(d) { 
               return d.children ? fColor(d.depth) : (d.color ? d.color : null); 
             })
            .on("click", function(d) { if (oFocus !== d) fZoom(d), d3.event.stopPropagation(); });
         
         var aTextNodes = oG.selectAll("text")
            .data(aDataNodes)
            .enter()
            .append("text")
            .attr("class", "circle_pack_label")
            .style("fill-opacity", function(d) { return d.parent === oData ? 1 : 0; })
            .style("display", function(d) { return d.parent === oData ? "inline" : "none"; })
            .text(function(d) { return d.name ? d.name.substring(0, d.r / 3)  : ""; });

         var aNodes = oSVG.selectAll("circle,text");
   
         d3.select("body")
            .style("background", fColor(-1))
            .on("click", function() { fZoom(oData); });
         
         aCircles.append("title")
           .text(function(d) { 
              return d.name + (d.size ? ": " + fFormat(d.size) : "" ); });
         
         var oBrush;
         
         var fOnBrushEnd = function(){
            oSVG.selectAll(".circle_pack_brush").call(oBrush.clear());
            
            var oMarkingService = oViz.getMarkingService();
            oMarkingService.clearMarksForDataLayout(oDataLayout);
            
            oG.selectAll(".circle_pack_selected")
               .each(function(d/*, i*/){
                  var oSelection = d.selectionID;
                  if(oSelection){
                     var nRow = oSelection.row;
                     var nCol = oSelection.col;
                     oMarkingService.setMark(oDataLayout, datamodelshapes.Physical.DATA, nRow, nCol);
                  }
               });
            
            oViz._publishMarkEvent(oDataLayout);
         };
         
         oBrush = d3.svg.brush()
            .x(d3.scale.identity().domain([0, nDiameter]))
            .y(d3.scale.identity().domain([0, nDiameter]))
            .on("brushend", fOnBrushEnd)
            .on("brush", function() {                  
                var aExtent = d3.event.target.extent();
                aCircles.classed("circle_pack_selected", function(d) {
                   var bSelected = aExtent[0][0] <= d.x && d.x < aExtent[1][0] &&
                      aExtent[0][1] <= d.y && d.y < aExtent[1][1];
                   return bSelected;
                });
             });
         
         var aBrushNode = oSVG.append("g")
            .attr("class", "circle_pack_brush")
            .call(oBrush);
         
         var fD3MouseDown = aBrushNode.on('mousedown.brush');
         
         aBrushNode.on("mousedown.brush", function(){
            var oEvent = d3.event;
            
            // If the right mouse button was clicked, don't respond
            if(oEvent.button === 2){
               d3.event.stopPropagation();
            } else {
               fD3MouseDown.apply(this, arguments);
            }
         });
         
         fZoomTo([oData.x, oData.y, oData.r * 2 + nMargin]);
   
         function fZoom(d) {
            var oFocus = d;
   
            var aTransition = oSVG.transition()
               .duration(d3.event.altKey ? 7500 : 750)
               .tween("zoom", function(/*d*/) {
                  var i = d3.interpolateZoom(oView, [oFocus.x, oFocus.y, oFocus.r * 2 + nMargin]);
                  return function(t) { fZoomTo(i(t)); };
               });
   
            aTransition.selectAll("text")
              .filter(function(d) { return d.parent === oFocus || !d.children || this.style.display === "inline"; })
                .style("fill-opacity", function(d) { return (d.parent === oFocus || !oFocus.children) ? 1 : 0; })
                .each("start", function(d) { if (d.parent === oFocus || !oFocus.children) this.style.display = "inline"; })
                .each("end", function(d) { if (d.parent !== oFocus) if(!!d.children) this.style.display = "none"; });
         }
   
         function fZoomTo(v) {
            var k = nDiameter / v[2]; oView = v;
            aNodes.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
            aCircles.attr("r", function(d) { return d.r * k; });
            aTextNodes.text(function(d) { return d.name ? d.name.substring(0, (d.r * k) / 3)  : ""; });
         }
      };
      
      fRenderData(oData);
    };
    
    CirclePack.prototype._publishMarkEvent = function (oDataLayout, eMarkContext) {
       try {
          // Create the marking event
          var markingEvent = new interactions.MarkingEvent(this.getID(), this.getViewName(), oDataLayout, null, eMarkContext);
          var eventRouter = this.getEventRouter();
          if (eventRouter) {
             // Publish the event to listeners
             eventRouter.publish(markingEvent);
          }
       }
       catch (e) {
          console.log("Error during mark", e);
       }
    };
    
    /**
     * Resize the visualization
     * @param {Object} oVizDimensions - contains two properties, width and height
     * @param {module:obitech-report/vizcontext#VizContext} oTransientVizContext the viz context
     */
    CirclePack.prototype.resizeVisualization = function(oVizDimensions, oTransientVizContext){
       var oTransientRenderingContext = this.createRenderingContext(oTransientVizContext);
       this.configureAndResizeLegend(this.getLegendOptions(oTransientRenderingContext));
       this._render(oTransientRenderingContext);
    };
    
    /**
     * Re-render the visualization when color changes
     */
    CirclePack.prototype._onDefaultColorsSettingsChanged = function(){
       var oTransientVizContext = this.assertOrCreateVizContext();
       var oTransientRenderingContext = this.createRenderingContext(oTransientVizContext);
       this.render(oTransientRenderingContext);
       this._setIsRendered(true);
    };

    /**
     * Generates data in the form or parent-child nodes, each node has a name and a children property.
     * @param {module:obitech-renderingcontext/renderingcontext.RenderingContext} oTransientRenderingContext - The rendering context
     * @returns {Object}
     */
    CirclePack.prototype._generateData = function(oTransientRenderingContext){
       var oData = oTransientRenderingContext.get(circlePack.DataContextProperty.DATA);
       if(oData){
          return oData;
       }
       oData = {
         "name":     "root", 
         "children": []
       };
       
       // Retrieve the data object for this visualization
       var oDataLayout = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_LAYOUT);
       var oDataLayoutHelper = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_LAYOUT_HELPER);
       
       var oDataModel = this.getRootDataModel();
       if(!oDataModel || !oDataLayout){
          return;
       }
       
       var aAllMeasures = oDataModel.getColumnIDsIn(datamodelshapes.Physical.DATA);
       var nMeasures = aAllMeasures.length;
       
       var nRows = oDataLayout.getEdgeExtent(datamodelshapes.Physical.ROW);
       var nRowLayerCount = oDataLayout.getLayerCount(datamodelshapes.Physical.ROW);
       var nCols = oDataLayout.getEdgeExtent(datamodelshapes.Physical.COLUMN);
       var nColLayerCount = oDataLayout.getLayerCount(datamodelshapes.Physical.COLUMN);
       
       // Color
       var oColorContext = this.getColorContext(oTransientRenderingContext);
       var oColorInterpolator = this.getCachedColorInterpolator(oTransientRenderingContext, datamodelshapes.Logical.COLOR);
       var hasCategoryOrColor = function () {
          return nLastLayer >= 0;
       };
       
       // Measure labels layer
       var isMeasureLabelsLayer = function (eEdgeType, nLayer) {
          return oDataLayout.getLayerMetadata(eEdgeType, nLayer, data.LayerMetadata.LAYER_ISMEASURE_LABELS);
       };
       
       // Last layer: we get the data values and colors from this layer
       var getLastNonMeasureLayer = function (eEdge) {
          var nLayerCount = oDataLayout.getLayerCount(eEdge);
          for (var i = nLayerCount - 1; i >= 0; i--) {
             if (!isMeasureLabelsLayer(eEdge, i))
                return i;
          }
          return -1;
       };
       
       var nLastEdge = datamodelshapes.Physical.COLUMN; // check column edge first
       
       var nLastLayer = getLastNonMeasureLayer(datamodelshapes.Physical.COLUMN);
       if (nLastLayer < 0) { // if not on column edge look on row edge
          nLastEdge = datamodelshapes.Physical.ROW;
          nLastLayer = getLastNonMeasureLayer(datamodelshapes.Physical.ROW);
       }

       var _this = this;
       var fColorNode = function(bIsLastLayer, oNodeToColor, oColorContext, nRowIndex, nColIndex){
          var oInfo = _this.getDataItemColorInfo(oDataLayoutHelper, oColorContext, oColorInterpolator, nRowIndex, nColIndex);
          if(bIsLastLayer){
             oNodeToColor.color = oInfo.sColor;
          } else {
             // if we are not coloring, use white
             oNodeToColor.color = 'white';
          }
       };
       
       function buildTree(oParentNode, eEdgeType, nLayerCount, nLayer, nRowSlice, nColSlice, nParentEndSlice, nTreeLevel) {
          if (nLayer === nLayerCount) {
             // This is a leaf node on row (category), build column (color) next 
             if (eEdgeType === datamodelshapes.Physical.ROW) {
                 buildTree(oParentNode, datamodelshapes.Physical.COLUMN, nColLayerCount, 0, nRowSlice, 0, nCols, nTreeLevel);
             }
             return;
          }

          // Skip measure labels
          if (isMeasureLabelsLayer(eEdgeType, nLayer) && hasCategoryOrColor()) {
             buildTree(oParentNode, eEdgeType, nLayerCount, nLayer + 1, nRowSlice, nColSlice, nParentEndSlice, nTreeLevel);
             return;
          }

          var isLastLayer = function () {
             return (nLastLayer === -1) || (nLastEdge === eEdgeType && nLastLayer === nLayer);
          };

          var isDuplicateLayer = function () {
             return nLastLayer > -1 &&
                    eEdgeType === datamodelshapes.Physical.COLUMN;
          };
          
          var nEndSlice;
          for (var nSlice = (eEdgeType === datamodelshapes.Physical.COLUMN) ? nColSlice : nRowSlice;
                   nSlice < nParentEndSlice;
                   nSlice = nEndSlice) {

             nEndSlice = oDataLayout.getItemEndSlice(eEdgeType, nLayer, nSlice) + 1;

             var nRowIndex = (eEdgeType === datamodelshapes.Physical.COLUMN) ? nRowSlice : nSlice;
             var nColIndex = (eEdgeType === datamodelshapes.Physical.ROW) ? nColSlice : nSlice;
             
             var nValue = null;

             if (isLastLayer()) {
                var val = 1; // default to rendering equally sized boxes when there are no measures

                if (nMeasures > 0) {
                   val = oDataLayout.getValue(datamodelshapes.Physical.DATA, nRowIndex, nColIndex, false);

                   // Skip no data
                   if (typeof val !== 'string' || val.length === 0){
                      
                      // Pass in a fake node that we throw away, since we want to allocate legend colors, even for null values 
                      // TODO - is this needed in the circle pack example - since we do not support trellis?
                      fColorNode(true,{},oColorContext, nRowIndex, nColIndex);
                      
                      continue;
                   }
                }

                nValue = parseFloat(val);

                // Skip negative and zero values for now. We need a design on how to show these.
                if (nValue <= 0)
                   continue;
             }

             var oNode;

             // Ensure that we don't render the same layer twice in case we have it in both row (Detail) and column (Color) edge
             if (!isDuplicateLayer()) {
                // Create new node
                oNode = {};

                oNode.size = 0;

                var sId = oDataLayout.getValue(eEdgeType, nLayer, nSlice, true);
                oNode.id = (oParentNode.id || '') + '.' + sId;

                oNode.name = oDataLayout.getValue(eEdgeType, nLayer, nSlice, false);

                if (isLastLayer()) {
                   oNode.size = nValue;
                   oNode.selectionID = { row: nRowIndex, col: nColIndex };
                }

                // Append new node to parent node
                oParentNode.children = oParentNode.children || [];
                oParentNode.children.push(oNode);

                buildTree(oNode, eEdgeType, nLayerCount, nLayer + 1, nRowIndex, nColIndex, nEndSlice, nTreeLevel + 1);
                fColorNode(isLastLayer(), oNode, oColorContext, nRowIndex, nColIndex);
                
                // Aggregate values into parent node
                oParentNode.size = oParentNode.size || 0;
                if (oNode.size)
                   oParentNode.size += oNode.size;
             }
             else {
                oNode = oParentNode;

                if (isLastLayer()) {
                   oNode.size = nValue;
                   oNode.selectionID = { row: nRowIndex, col: nColIndex };
                }

                buildTree(oNode, eEdgeType, nLayerCount, nLayer + 1, nRowIndex, nColIndex, nEndSlice, nTreeLevel + 1);
                fColorNode(isLastLayer(), oNode, oColorContext, nRowIndex, nColIndex);
             }
          }
       }
       
       // Build a treemap starting with DETAIL logical edge (see getLogicalMapper)
       buildTree(oData, datamodelshapes.Physical.ROW, nRowLayerCount, 0, 0, 0, nRows, 0);
       
       // We didn't have anything on Category, try COLOR logical edge (see getLogicalMapper)
       if (oData.children.length === 0){
          buildTree(oData, datamodelshapes.Physical.COLUMN, nColLayerCount, 0, 0, 0, nCols, 0);   
       }

       oTransientRenderingContext.set(circlePack.DataContextProperty.DATA,oData);
       return oData;
    };

    /**
     * Builds the list of selected items
     * @param {module:obitech-renderingcontext/renderingcontext.RenderingContext} oTransientRenderingContext - The rendering context
     */
    CirclePack.prototype._buildSelectedItems = function(oTransientRenderingContext){
       var oViz = this;
       var oDataLayout = oTransientRenderingContext.get(dataviz.DataContextProperty.DATA_LAYOUT);
       var oMarkingService = this.getMarkingService();
       
       function fMarksReadyCallback() {
          oViz.clearSelectedItems();
          var aSelectedItems = oViz.getSelectedItems();
          
          if(!oViz.isStarted()) {
             return;
          }

          oMarkingService.traverseDataEdgeMarks(oDataLayout, function (nRow, nCol) {
             aSelectedItems.push(nRow + ':' + nCol);
          });
          
          oViz._render(oTransientRenderingContext);          
       }
       
       oMarkingService.getUpdatedMarkingSet(oDataLayout, marking.EMarkOperation.MARK_RELATED, fMarksReadyCallback);
    };
    
    /**
     * React to marking service highlight events
     */
    CirclePack.prototype.onHighlight = function(){
       var oTransientVizContext = this.assertOrCreateVizContext();
       var oTransientRenderingContext = this.createRenderingContext(oTransientVizContext);
       this._buildSelectedItems(oTransientRenderingContext);
    };
    
    /**
     * TODO: Legend should take care of this
     * @param oTabbedPanelsGadgetInfo
     */
    CirclePack.prototype._addVizSpecificPropsDialog = function(oTabbedPanelsGadgetInfo)
    {
       var options = this.getViewConfig() || {};
       this._fillDefaultOptions(options, null);
       this._addLegendToVizSpecificPropsDialog(options, oTabbedPanelsGadgetInfo);

       CirclePack.superClass._addVizSpecificPropsDialog.call(this, oTabbedPanelsGadgetInfo);
    };
    
    /**
     * TODO: Legend should take care of this
     * @param sGadgetID
     * @param oPropChange
     * @param oViewSettings
     * @param oActionContext
     */
    CirclePack.prototype._handlePropChange = function (sGadgetID, oPropChange, oViewSettings, oActionContext)
    {
       var conf = oViewSettings.getViewConfigJSON(dataviz.SettingsNS.CHART) || {};
       //Allow the super class an attempt to handle the changes
       var bUpdateSettings = CirclePack.superClass._handlePropChange.call(this, sGadgetID, oPropChange, oViewSettings, oActionContext);
       if(this._handleLegendPropChange(conf, sGadgetID, oPropChange, oViewSettings, oActionContext)){
          bUpdateSettings = true;
       }
       return bUpdateSettings;
    };
    
    /**
     * TODO: Legend should take care of this
     * Given an options / config object, configure it with default options for the visualization.
     * 
     * @param {object} oOptions the options
     * @param {module:obitech-framework/actioncontext#ActionContext} oActionContext The ActionContext instance associated with this action
     * @protected
     */
    CirclePack.prototype._fillDefaultOptions = function (oOptions/*, oActionContext*/) {
       if (!jsx.isNull(oOptions) && !jsx.isNull(oOptions.legend))
          return;

       // Legend
       oOptions.legend = jsx.defaultParam(oOptions.legend, {});
       oOptions.legend.rendered = jsx.defaultParam(oOptions.legend.rendered, "on");
       oOptions.legend.position = jsx.defaultParam(oOptions.legend.position, "auto");

       this.getSettings().setViewConfigJSON(dataviz.SettingsNS.CHART, oOptions);
    };
    
    /**
     * Override _doInitializeComponent in order to subscribe to events
     */
    CirclePack.prototype._doInitializeComponent = function() {
       CirclePack.superClass._doInitializeComponent.call(this);
       
       this.subscribeToEvent(events.types.DEFAULT_COLOR_SETTINGS_CHANGED, this._onDefaultColorsSettingsChanged, "**");
       this.subscribeToEvent(events.types.INTERACTION_HIGHLIGHT, this.onHighlight, this.getViewName() + "." + events.types.INTERACTION_HIGHLIGHT);
       
       this.initializeLegendAndVizContainer();
    };
    
    /**
     * Override the base visualization and allow marks on the
     * data edge to be processed for color.
     * @returns {Boolean}
     */
    CirclePack.prototype._isOnlyPhysicalRowEdge = function(){
       return false;
    };
    
    /** 
     * Override to add in options to the context menu
     * 
     * @param {module:obitech-report/vizcontext#VizContext} oTransientVizContext the viz context
     * @param {string} sMenuType The menu type associated with the context menu being populated
     * @param {Array} The array of resulting menu options
     * @param {module:obitech-appservices/contextmenu} contextmenu The contextmenu namespace object (used to reduce dependencies)
     * @param {object} evtParams The entire 'params' object that is extracted from client evt
     * @param {object} oTransientRenderingContext the current transient rendering context
     */
    CirclePack.prototype._addVizSpecificMenuOptions = function(oTransientVizContext, sMenuType, aResults, contextmenu, evtParams, oTransientRenderingContext){
       if(!oTransientRenderingContext){
          oTransientRenderingContext = this.createRenderingContext(oTransientVizContext);
       }
       
       CirclePack.superClass._addVizSpecificMenuOptions.call(this, oTransientVizContext, sMenuType, aResults, contextmenu, evtParams, oTransientRenderingContext);
       
       if (sMenuType === euidef.CM_TYPE_VIZ_PROPS) {
          // Set up the column context for the last column in the ROWS bucket
          var oColumnContext = this.getDrillPathColumnContext(oTransientVizContext, datamodelshapes.Logical.ROW);
          
          // Set up events
          if(!this.isViewOnlyLimit()){
             this._addFilterMenuOption(oTransientVizContext, aResults, null, null, oTransientRenderingContext);
             this._addRemoveSelectedMenuOption(oTransientVizContext, aResults, null, null);
             this._addDrillMenuOption(oTransientVizContext, aResults, null, null, oColumnContext);
             this._addLateralDrillMenuOption(oTransientVizContext, aResults);
             
             this._addColorMenuOption(oTransientVizContext, aResults, oTransientRenderingContext);
          }
       }
    };
    
   /**
    * Factory method declared in the plugin configuration
    * @param {string} sID Component ID for the visualization
    * @param {string=} sDisplayName Component display name
    * @param {string=} sOrigin Component host identifier
    * @param {string=} sVersion 
    * @returns {module:obitech-circlepack/circlePack.CirclePack}
    * @memberof module:obitech-circlepack/circlePack
    */
   circlePack.createClientComponent = function(sID, sDisplayName, sOrigin) {
     // Argument validation done by base class
      return new CirclePack(sID, sDisplayName, sOrigin, CirclePack.VERSION);
   };

   return circlePack;
});