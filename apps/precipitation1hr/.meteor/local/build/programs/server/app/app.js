var require = meteorInstall({"server":{"dataFunctions":{"data_contour.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/dataFunctions/data_contour.js                                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 0);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 1);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 2);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 3);
let matsDataCurveOpsUtils;
module.link("meteor/randyp:mats-common", {
  matsDataCurveOpsUtils(v) {
    matsDataCurveOpsUtils = v;
  }

}, 4);
let matsDataProcessUtils;
module.link("meteor/randyp:mats-common", {
  matsDataProcessUtils(v) {
    matsDataProcessUtils = v;
  }

}, 5);
let moment;
module.link("meteor/momentjs:moment", {
  moment(v) {
    moment = v;
  }

}, 6);

dataContour = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const plotType = matsTypes.PlotTypes.contour;
  var dataRequests = {}; // used to store data queries

  var dataFoundForCurve = true;
  var totalProcessingStart = moment();
  var dateRange = matsDataUtils.getDateRange(plotParams.dates);
  var fromSecs = dateRange.fromSeconds;
  var toSecs = dateRange.toSeconds;
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));

  if (curves.length > 1) {
    throw new Error("INFO:  There must only be one added curve.");
  }

  var dataset = [];
  var axisMap = Object.create(null); // initialize variables specific to the curve

  var curve = curves[0];
  var label = curve['label'];
  var xAxisParam = curve['x-axis-parameter'];
  var yAxisParam = curve['y-axis-parameter'];
  var xValClause = matsCollections.CurveParams.findOne({
    name: 'x-axis-parameter'
  }).optionsMap[xAxisParam];
  var yValClause = matsCollections.CurveParams.findOne({
    name: 'y-axis-parameter'
  }).optionsMap[yAxisParam];
  var dataSourceStr = curve['data-source'];
  var data_source = matsCollections.CurveParams.findOne({
    name: 'data-source'
  }).optionsMap[curve['data-source']][0];
  var regionStr = curve['region'];
  var region = Object.keys(matsCollections.CurveParams.findOne({
    name: 'region'
  }).valuesMap).find(key => matsCollections.CurveParams.findOne({
    name: 'region'
  }).valuesMap[key] === regionStr);
  var source = curve['truth'];
  var sourceStr = "";

  if (source !== "All") {
    sourceStr = "_" + source;
  }

  var scaleStr = curve['scale'];
  var scale = Object.keys(matsCollections.CurveParams.findOne({
    name: 'scale'
  }).valuesMap).find(key => matsCollections.CurveParams.findOne({
    name: 'scale'
  }).valuesMap[key] === scaleStr);
  var statisticSelect = curve['statistic'];
  var statisticOptionsMap = matsCollections.CurveParams.findOne({
    name: 'statistic'
  }, {
    optionsMap: 1
  })['optionsMap'];
  var statistic = statisticOptionsMap[statisticSelect][0];
  var validTimeClause = "";
  var thresholdClause = "";
  var forecastLengthClause = "";
  var dateClause = "";

  if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
    var forecastLength = curve['forecast-length'];
    forecastLengthClause = "and m0.fcst_len = " + forecastLength + " ";
  }

  if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold') {
    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap[key] === thresholdStr);
    threshold = threshold * 0.01;
    thresholdClause = "and m0.trsh = " + threshold + " ";
  }

  if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];

    if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = " and  m0.time%(24*3600)/3600 IN(" + validTimes + ")";
    }
  }

  if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date') {
    dateClause = "m0.time-m0.fcst_len*3600";
  } else {
    dateClause = "m0.time";
  } // For contours, this functions as the colorbar label.


  curve['unitKey'] = statisticOptionsMap[statisticSelect][1];
  var d; // this is a database driven curve, not a difference curve
  // prepare the query from the above parameters

  var statement = "{{xValClause}} " + "{{yValClause}} " + "count(distinct {{dateClause}}) as N_times, " + "min({{dateClause}}) as min_secs, " + "max({{dateClause}}) as max_secs, " + "{{statistic}} " + "from {{data_source}} as m0 " + "where 1=1 " + "and {{dateClause}} >= '{{fromSecs}}' " + "and {{dateClause}} <= '{{toSecs}}' " + "and m0.hit+m0.fa+m0.miss+m0.cn > 0 " + "{{thresholdClause}} " + "{{validTimeClause}} " + "{{forecastLengthClause}} " + "group by xVal,yVal " + "order by xVal,yVal" + ";";
  statement = statement.replace('{{xValClause}}', xValClause);
  statement = statement.replace('{{yValClause}}', yValClause);
  statement = statement.replace('{{data_source}}', data_source + '_' + scale + sourceStr + '_' + region);
  statement = statement.replace('{{statistic}}', statistic);
  statement = statement.replace('{{threshold}}', threshold);
  statement = statement.replace('{{fromSecs}}', fromSecs);
  statement = statement.replace('{{toSecs}}', toSecs);
  statement = statement.replace('{{thresholdClause}}', thresholdClause);
  statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
  statement = statement.replace('{{validTimeClause}}', validTimeClause);
  statement = statement.split('{{dateClause}}').join(dateClause);
  dataRequests[curve.label] = statement; // math is done on forecastLength later on -- set all analyses to 0

  if (forecastLength === "-99") {
    forecastLength = "0";
  }

  var queryResult;
  var startMoment = moment();
  var finishMoment;

  try {
    // send the query statement to the query function
    queryResult = matsDataQueryUtils.queryDBContour(sumPool, statement);
    finishMoment = moment();
    dataRequests["data retrieval (query) time - " + curve.label] = {
      begin: startMoment.format(),
      finish: finishMoment.format(),
      duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
      recordCount: queryResult.data.xTextOutput.length
    }; // get the data back from the query

    d = queryResult.data;
  } catch (e) {
    // this is an error produced by a bug in the query function, not an error returned by the mysql database
    e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
    throw new Error(e.message);
  }

  if (queryResult.error !== undefined && queryResult.error !== "") {
    if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
      // this is NOT an error just a no data condition
      dataFoundForCurve = false;
    } else {
      // this is an error returned by the mysql database
      error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
      throw new Error(error);
    }
  }

  var postQueryStartMoment = moment(); // set curve annotation to be the curve mean -- may be recalculated later
  // also pass previously calculated axis stats to curve options

  const mean = d.glob_stats.mean;
  const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
  curve['annotation'] = annotation;
  curve['xmin'] = d.xmin;
  curve['xmax'] = d.xmax;
  curve['ymin'] = d.ymin;
  curve['ymax'] = d.ymax;
  curve['zmin'] = d.zmin;
  curve['zmax'] = d.zmax;
  curve['xAxisKey'] = xAxisParam;
  curve['yAxisKey'] = yAxisParam;
  const cOptions = matsDataCurveOpsUtils.generateContourCurveOptions(curve, axisMap, d); // generate plot with data, curve annotation, axis labels, etc.

  dataset.push(cOptions);
  var postQueryFinishMoment = moment();
  dataRequests["post data retrieval (query) process time - " + curve.label] = {
    begin: postQueryStartMoment.format(),
    finish: postQueryFinishMoment.format(),
    duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
  }; // process the data returned by the query

  const curveInfoParams = {
    "curve": curves,
    "axisMap": axisMap
  };
  const bookkeepingParams = {
    "dataRequests": dataRequests,
    "totalProcessingStart": totalProcessingStart
  };
  var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
  plotFunction(result);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data_contour_diff.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/dataFunctions/data_contour_diff.js                                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 0);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 1);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 2);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 3);
let matsDataDiffUtils;
module.link("meteor/randyp:mats-common", {
  matsDataDiffUtils(v) {
    matsDataDiffUtils = v;
  }

}, 4);
let matsDataCurveOpsUtils;
module.link("meteor/randyp:mats-common", {
  matsDataCurveOpsUtils(v) {
    matsDataCurveOpsUtils = v;
  }

}, 5);
let matsDataProcessUtils;
module.link("meteor/randyp:mats-common", {
  matsDataProcessUtils(v) {
    matsDataProcessUtils = v;
  }

}, 6);
let moment;
module.link("meteor/momentjs:moment", {
  moment(v) {
    moment = v;
  }

}, 7);

dataContourDiff = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
  const plotType = matsTypes.PlotTypes.contourDiff;
  var dataRequests = {}; // used to store data queries

  var dataFoundForCurve = true;
  var totalProcessingStart = moment();
  var dateRange = matsDataUtils.getDateRange(plotParams.dates);
  var fromSecs = dateRange.fromSeconds;
  var toSecs = dateRange.toSeconds;
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;

  if (curvesLength !== 2) {
    throw new Error("INFO:  There must be two added curves.");
  }

  if (curves[0]['x-axis-parameter'] !== curves[1]['x-axis-parameter'] || curves[0]['y-axis-parameter'] !== curves[1]['y-axis-parameter']) {
    throw new Error("INFO:  The x-axis-parameter and y-axis-parameter must be consistent across both curves.");
  }

  var dataset = [];
  var axisMap = Object.create(null);

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];
    var label = curve['label'];
    var xAxisParam = curve['x-axis-parameter'];
    var yAxisParam = curve['y-axis-parameter'];
    var xValClause = matsCollections.CurveParams.findOne({
      name: 'x-axis-parameter'
    }).optionsMap[xAxisParam];
    var yValClause = matsCollections.CurveParams.findOne({
      name: 'y-axis-parameter'
    }).optionsMap[yAxisParam];
    var dataSourceStr = curve['data-source'];
    var data_source = matsCollections.CurveParams.findOne({
      name: 'data-source'
    }).optionsMap[curve['data-source']][0];
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap[key] === regionStr);
    var source = curve['truth'];
    var sourceStr = "";

    if (source !== "All") {
      sourceStr = "_" + source;
    }

    var scaleStr = curve['scale'];
    var scale = Object.keys(matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap[key] === scaleStr);
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({
      name: 'statistic'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var statistic = statisticOptionsMap[statisticSelect][0];
    var validTimeClause = "";
    var thresholdClause = "";
    var forecastLengthClause = "";
    var dateClause = "";

    if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
      var forecastLength = curve['forecast-length'];
      forecastLengthClause = "and m0.fcst_len = " + forecastLength;
    }

    if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold') {
      var thresholdStr = curve['threshold'];
      var threshold = Object.keys(matsCollections.CurveParams.findOne({
        name: 'threshold'
      }).valuesMap).find(key => matsCollections.CurveParams.findOne({
        name: 'threshold'
      }).valuesMap[key] === thresholdStr);
      threshold = threshold * 0.01;
      thresholdClause = "and m0.trsh = " + threshold;
    }

    if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
      var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];

      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = " and  m0.time%(24*3600)/3600 IN(" + validTimes + ")";
      }
    }

    if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date') {
      dateClause = "m0.time-m0.fcst_len*3600";
    } else {
      dateClause = "m0.time";
    } // for two contours it's faster to just take care of matching in the query


    var matchModel = "";
    var matchDates = "";
    var matchThresholdClause = "";
    var matchValidTimeClause = "";
    var matchForecastLengthClause = "";
    var matchClause = "";

    if (matching) {
      const otherCurveIndex = curveIndex === 0 ? 1 : 0;
      const otherModel = matsCollections.CurveParams.findOne({
        name: 'data-source'
      }).optionsMap[curves[otherCurveIndex]['data-source']][0];
      const otherRegion = Object.keys(matsCollections.CurveParams.findOne({
        name: 'region'
      }).valuesMap).find(key => matsCollections.CurveParams.findOne({
        name: 'region'
      }).valuesMap[key] === curves[otherCurveIndex]['region']);
      matchModel = ", " + otherModel + "_" + otherRegion + " as a0";
      const matchDateClause = dateClause.split('m0').join('a0');
      matchDates = "and " + matchDateClause + " >= '" + fromSecs + "' and " + matchDateClause + " <= '" + toSecs + "'";
      matchClause = "and m0.time = a0.time";

      if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
        var matchForecastLength = curves[otherCurveIndex]['forecast-length'];
        matchForecastLengthClause = "and a0.fcst_len = " + matchForecastLength;
      } else {
        matchForecastLengthClause = "and m0.fcst_len = a0.fcst_len";
      }

      if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold') {
        var matchThreshold = Object.keys(matsCollections.CurveParams.findOne({
          name: 'threshold'
        }).valuesMap).find(key => matsCollections.CurveParams.findOne({
          name: 'threshold'
        }).valuesMap[key] === curves[otherCurveIndex]['threshold']);
        matchThresholdClause = "and a0.thresh = " + matchThreshold;
      } else {
        matchThresholdClause = "and m0.thresh = a0.thresh";
      }

      if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
        var matchValidTimes = curves[otherCurveIndex]['valid-time'] === undefined ? [] : curves[otherCurveIndex]['valid-time'];

        if (matchValidTimes.length > 0 && matchValidTimes !== matsTypes.InputTypes.unused) {
          matchValidTimeClause = " and a0.time%(24*3600)/3600 IN(" + matchValidTimes + ")";
        }
      }
    } // For contours, this functions as the colorbar label.


    curves[curveIndex]['unitKey'] = statisticOptionsMap[statisticSelect][1];
    var d; // this is a database driven curve, not a difference curve
    // prepare the query from the above parameters

    var statement = "{{xValClause}} " + "{{yValClause}} " + "count(distinct {{dateClause}}) as N_times, " + "min({{dateClause}}) as min_secs, " + "max({{dateClause}}) as max_secs, " + "{{statistic}} " + "from {{data_source}} as m0{{matchModel}} " + "where 1=1 " + "{{matchClause}} " + "and {{dateClause}} >= '{{fromSecs}}' " + "and {{dateClause}} <= '{{toSecs}}' " + "{{matchDates}} " + "and m0.hit+m0.fa+m0.miss+m0.cn > 0 " + "{{thresholdClause}} " + "{{matchThresholdClause}} " + "{{validTimeClause}} " + "{{matchValidTimeClause}} " + "{{forecastLengthClause}} " + "{{matchForecastLengthClause}} " + "group by xVal,yVal " + "order by xVal,yVal" + ";";
    statement = statement.replace('{{xValClause}}', xValClause);
    statement = statement.replace('{{yValClause}}', yValClause);
    statement = statement.replace('{{data_source}}', data_source + '_' + scale + sourceStr + '_' + region);
    statement = statement.replace('{{matchModel}}', matchModel);
    statement = statement.replace('{{statistic}}', statistic);
    statement = statement.replace('{{threshold}}', threshold);
    statement = statement.replace('{{fromSecs}}', fromSecs);
    statement = statement.replace('{{toSecs}}', toSecs);
    statement = statement.replace('{{matchDates}}', matchDates);
    statement = statement.replace('{{matchClause}}', matchClause);
    statement = statement.replace('{{thresholdClause}}', thresholdClause);
    statement = statement.replace('{{matchThresholdClause}}', matchThresholdClause);
    statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
    statement = statement.replace('{{matchForecastLengthClause}}', matchForecastLengthClause);
    statement = statement.replace('{{validTimeClause}}', validTimeClause);
    statement = statement.replace('{{matchValidTimeClause}}', matchValidTimeClause);
    statement = statement.split('{{dateClause}}').join(dateClause);
    dataRequests[curve.label] = statement; // math is done on forecastLength later on -- set all analyses to 0

    if (forecastLength === "-99") {
      forecastLength = "0";
    }

    var queryResult;
    var startMoment = moment();
    var finishMoment;

    try {
      // send the query statement to the query function
      queryResult = matsDataQueryUtils.queryDBContour(sumPool, statement);
      finishMoment = moment();
      dataRequests["data retrieval (query) time - " + curve.label] = {
        begin: startMoment.format(),
        finish: finishMoment.format(),
        duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
        recordCount: queryResult.data.xTextOutput.length
      }; // get the data back from the query

      d = queryResult.data;
    } catch (e) {
      // this is an error produced by a bug in the query function, not an error returned by the mysql database
      e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
      throw new Error(e.message);
    }

    if (queryResult.error !== undefined && queryResult.error !== "") {
      if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
        // this is NOT an error just a no data condition
        dataFoundForCurve = false;
      } else {
        // this is an error returned by the mysql database
        error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
        throw new Error(error);
      }
    }

    var postQueryStartMoment = moment(); // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options

    const mean = d.glob_stats.mean;
    const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
    curve['annotation'] = annotation;
    curve['xmin'] = d.xmin;
    curve['xmax'] = d.xmax;
    curve['ymin'] = d.ymin;
    curve['ymax'] = d.ymax;
    curve['zmin'] = d.zmin;
    curve['zmax'] = d.zmax;
    curve['xAxisKey'] = xAxisParam;
    curve['yAxisKey'] = yAxisParam;
    const cOptions = matsDataCurveOpsUtils.generateContourCurveOptions(curve, axisMap, d); // generate plot with data, curve annotation, axis labels, etc.

    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + curve.label] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };
  } // turn the two contours into one difference contour


  dataset = matsDataDiffUtils.getDataForDiffContour(dataset);
  plotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
  curves = plotParams.curves; // process the data returned by the query

  const curveInfoParams = {
    "curve": curves,
    "axisMap": axisMap
  };
  const bookkeepingParams = {
    "dataRequests": dataRequests,
    "totalProcessingStart": totalProcessingStart
  };
  var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
  plotFunction(result);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data_dailymodelcycle.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/dataFunctions/data_dailymodelcycle.js                                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 0);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 1);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 2);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 3);
let matsDataDiffUtils;
module.link("meteor/randyp:mats-common", {
  matsDataDiffUtils(v) {
    matsDataDiffUtils = v;
  }

}, 4);
let matsDataCurveOpsUtils;
module.link("meteor/randyp:mats-common", {
  matsDataCurveOpsUtils(v) {
    matsDataCurveOpsUtils = v;
  }

}, 5);
let matsDataProcessUtils;
module.link("meteor/randyp:mats-common", {
  matsDataProcessUtils(v) {
    matsDataProcessUtils = v;
  }

}, 6);
let moment;
module.link("meteor/momentjs:moment", {
  moment(v) {
    moment = v;
  }

}, 7);

dataDailyModelCycle = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
  const plotType = matsTypes.PlotTypes.dailyModelCycle;
  const hasLevels = false;
  var dataRequests = {}; // used to store data queries

  var dataFoundForCurve = true;
  var totalProcessingStart = moment();
  var dateRange = matsDataUtils.getDateRange(plotParams.dates);
  var fromSecs = dateRange.fromSeconds;
  var toSecs = dateRange.toSeconds;
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;
  var dataset = [];
  var utcCycleStarts = [];
  var axisMap = Object.create(null);
  var xmax = -1 * Number.MAX_VALUE;
  var ymax = -1 * Number.MAX_VALUE;
  var xmin = Number.MAX_VALUE;
  var ymin = Number.MAX_VALUE;
  var idealValues = [];

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];
    var diffFrom = curve.diffFrom;
    var label = curve['label'];
    var dataSourceStr = curve['data-source'];
    var data_source = matsCollections.CurveParams.findOne({
      name: 'data-source'
    }).optionsMap[curve['data-source']][0];
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap[key] === regionStr);
    var source = curve['truth'];
    var sourceStr = "";

    if (source !== "All") {
      sourceStr = "_" + source;
    }

    var scaleStr = curve['scale'];
    var scale = Object.keys(matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap[key] === scaleStr);
    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap[key] === thresholdStr);
    threshold = threshold * 0.01;
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({
      name: 'statistic'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var statistic = statisticOptionsMap[statisticSelect][0];
    var utcCycleStart = Number(curve['utc-cycle-start']);
    utcCycleStarts[curveIndex] = utcCycleStart; // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.

    var axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    var idealVal = statisticOptionsMap[statisticSelect][2];

    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    var d;

    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      var statement = "select m0.time as avtime, " + "count(distinct m0.time) as N_times, " + "min(m0.time) as min_secs, " + "max(m0.time) as max_secs, " + "{{statistic}} " + "from {{data_source}} as m0 " + "where 1=1 " + "and m0.time >= {{fromSecs}} " + "and m0.time <= {{toSecs}} " + "and m0.hit+m0.fa+m0.miss+m0.cn > 0 " + "and m0.trsh = {{threshold}} " + "and m0.fcst_len < 24 " + "and (m0.time - m0.fcst_len*3600)%(24*3600)/3600 IN({{utcCycleStart}}) " + "group by avtime " + "order by avtime" + ";";
      statement = statement.replace('{{threshold}}', threshold);
      statement = statement.replace('{{fromSecs}}', fromSecs);
      statement = statement.replace('{{toSecs}}', toSecs);
      statement = statement.replace('{{data_source}}', data_source + '_' + scale + sourceStr + '_' + region);
      statement = statement.replace('{{statistic}}', statistic);
      statement = statement.replace('{{utcCycleStart}}', utcCycleStart);
      dataRequests[curve.label] = statement;
      var queryResult;
      var startMoment = moment();
      var finishMoment;

      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, plotType, hasLevels);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + curve.label] = {
          begin: startMoment.format(),
          finish: finishMoment.format(),
          duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
          recordCount: queryResult.data.x.length
        }; // get the data back from the query

        d = queryResult.data;
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
      }

      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve = false;
        } else {
          // this is an error returned by the mysql database
          error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
          throw new Error(error);
        }
      } // set axis limits based on returned data


      var postQueryStartMoment = moment();

      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, plotType, hasLevels);
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
    } // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options


    const mean = d.sum / d.x.length;
    const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
    curve['annotation'] = annotation;
    curve['xmin'] = d.xmin;
    curve['xmax'] = d.xmax;
    curve['ymin'] = d.ymin;
    curve['ymax'] = d.ymax;
    curve['axisKey'] = axisKey;
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d); // generate plot with data, curve annotation, axis labels, etc.

    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + curve.label] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };
  } // end for curves
  // process the data returned by the query


  const appParams = {
    "plotType": plotType,
    "hasLevels": hasLevels,
    "matching": matching
  };
  const curveInfoParams = {
    "curves": curves,
    "curvesLength": curvesLength,
    "idealValues": idealValues,
    "utcCycleStarts": utcCycleStarts,
    "axisMap": axisMap,
    "xmax": xmax,
    "xmin": xmin
  };
  const bookkeepingParams = {
    "dataRequests": dataRequests,
    "totalProcessingStart": totalProcessingStart
  };
  var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
  plotFunction(result);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data_dieoff.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/dataFunctions/data_dieoff.js                                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 0);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 1);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 2);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 3);
let matsDataDiffUtils;
module.link("meteor/randyp:mats-common", {
  matsDataDiffUtils(v) {
    matsDataDiffUtils = v;
  }

}, 4);
let matsDataCurveOpsUtils;
module.link("meteor/randyp:mats-common", {
  matsDataCurveOpsUtils(v) {
    matsDataCurveOpsUtils = v;
  }

}, 5);
let matsDataProcessUtils;
module.link("meteor/randyp:mats-common", {
  matsDataProcessUtils(v) {
    matsDataProcessUtils = v;
  }

}, 6);
let moment;
module.link("meteor/momentjs:moment", {
  moment(v) {
    moment = v;
  }

}, 7);

dataDieOff = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
  const plotType = matsTypes.PlotTypes.dieoff;
  const hasLevels = false;
  var dataRequests = {}; // used to store data queries

  var dataFoundForCurve = true;
  var totalProcessingStart = moment();
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;
  var dataset = [];
  var utcCycleStarts = [];
  var axisMap = Object.create(null);
  var xmax = -1 * Number.MAX_VALUE;
  var ymax = -1 * Number.MAX_VALUE;
  var xmin = Number.MAX_VALUE;
  var ymin = Number.MAX_VALUE;
  var idealValues = [];

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];
    var diffFrom = curve.diffFrom;
    var label = curve['label'];
    var data_source = matsCollections.CurveParams.findOne({
      name: 'data-source'
    }).optionsMap[curve['data-source']][0];
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap[key] === regionStr);
    var source = curve['truth'];
    var sourceStr = "";

    if (source !== "All") {
      sourceStr = "_" + source;
    }

    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap[key] === thresholdStr);
    threshold = threshold * 0.01;
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({
      name: 'statistic'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var statistic = statisticOptionsMap[statisticSelect][0];
    var scaleStr = curve['scale'];
    var scale = Object.keys(matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap[key] === scaleStr);
    var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var forecastLengthStr = curve['dieoff-type'];
    var forecastLengthOptionsMap = matsCollections.CurveParams.findOne({
      name: 'dieoff-type'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var forecastLength = forecastLengthOptionsMap[forecastLengthStr][0];
    var validTimes;
    var validTimeClause = "";
    var utcCycleStart;
    var utcCycleStartClause = "";
    var dateRangeClause = "and m0.time >= " + fromSecs + " and m0.time <= " + toSecs;

    if (forecastLength === matsTypes.ForecastTypes.dieoff) {
      validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];

      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = "and floor((m0.time)%(24*3600)/3600) IN(" + validTimes + ")";
      }
    } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
      utcCycleStart = Number(curve['utc-cycle-start']);
      utcCycleStartClause = "and (m0.time - m0.fcst_len*3600)%(24*3600)/3600 IN(" + utcCycleStart + ")";
    } else {
      dateRangeClause = "and (m0.time - m0.fcst_len*3600) = " + fromSecs;
    } // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.


    var axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    var idealVal = statisticOptionsMap[statisticSelect][2];

    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    var d;

    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      var statement = "SELECT m0.fcst_len AS avtime, " + "count(distinct m0.time) as N_times, " + "min(m0.time) as min_secs, " + "max(m0.time) as max_secs, " + "{{statistic}} " + "from {{data_source}} as m0 " + "where 1=1 " + "{{dateRangeClause}} " + "and m0.hit+m0.fa+m0.miss+m0.cn > 0 " + "and m0.trsh = {{threshold}} " + "{{validTimeClause}} " + "{{utcCycleStartClause}} " + "group by avtime " + "order by avtime;";
      statement = statement.replace('{{fromSecs}}', fromSecs);
      statement = statement.replace('{{toSecs}}', toSecs);
      statement = statement.replace('{{data_source}}', data_source + '_' + scale + sourceStr + '_' + region);
      statement = statement.replace('{{statistic}}', statistic);
      statement = statement.replace('{{threshold}}', threshold);
      statement = statement.replace('{{dateRangeClause}}', dateRangeClause);
      statement = statement.replace('{{validTimeClause}}', validTimeClause);
      statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
      dataRequests[curve.label] = statement;
      var queryResult;
      var startMoment = moment();
      var finishMoment;

      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, plotType, hasLevels);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + curve.label] = {
          begin: startMoment.format(),
          finish: finishMoment.format(),
          duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
          recordCount: queryResult.data.x.length
        }; // get the data back from the query

        d = queryResult.data;
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
      }

      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve = false;
        } else {
          // this is an error returned by the mysql database
          error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
          throw new Error(error);
        }
      } // set axis limits based on returned data


      var postQueryStartMoment = moment();

      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, plotType, hasLevels);
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
    } // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options


    const mean = d.sum / d.x.length;
    const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
    curve['annotation'] = annotation;
    curve['xmin'] = d.xmin;
    curve['xmax'] = d.xmax;
    curve['ymin'] = d.ymin;
    curve['ymax'] = d.ymax;
    curve['axisKey'] = axisKey;
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d); // generate plot with data, curve annotation, axis labels, etc.

    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + curve.label] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };
  } // end for curves
  // process the data returned by the query


  const appParams = {
    "plotType": plotType,
    "hasLevels": hasLevels,
    "matching": matching
  };
  const curveInfoParams = {
    "curves": curves,
    "curvesLength": curvesLength,
    "idealValues": idealValues,
    "utcCycleStarts": utcCycleStarts,
    "axisMap": axisMap,
    "xmax": xmax,
    "xmin": xmin
  };
  const bookkeepingParams = {
    "dataRequests": dataRequests,
    "totalProcessingStart": totalProcessingStart
  };
  var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
  plotFunction(result);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data_histogram.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/dataFunctions/data_histogram.js                                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 0);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 1);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 2);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 3);
let matsDataProcessUtils;
module.link("meteor/randyp:mats-common", {
  matsDataProcessUtils(v) {
    matsDataProcessUtils = v;
  }

}, 4);
let moment;
module.link("meteor/momentjs:moment", {
  moment(v) {
    moment = v;
  }

}, 5);

dataHistogram = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const plotType = matsTypes.PlotTypes.histogram;
  const hasLevels = false;
  const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
  var alreadyMatched = false;
  var dataRequests = {}; // used to store data queries

  var dataFoundForCurve = [];
  var totalProcessingStart = moment();
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;
  var dataset = [];
  var allReturnedSubStats = [];
  var allReturnedSubSecs = [];
  var axisMap = Object.create(null); // process user bin customizations

  const binParams = matsDataUtils.setHistogramParameters(plotParams);
  const yAxisFormat = binParams.yAxisFormat;
  const binNum = binParams.binNum;

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];
    var diffFrom = curve.diffFrom;
    dataFoundForCurve[curveIndex] = true;
    var label = curve['label'];
    var dataSourceStr = curve['data-source'];
    var data_source = matsCollections.CurveParams.findOne({
      name: 'data-source'
    }).optionsMap[curve['data-source']][0];
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap[key] === regionStr);
    var source = curve['truth'];
    var sourceStr = "";

    if (source !== "All") {
      sourceStr = "_" + source;
    }

    var scaleStr = curve['scale'];
    var scale = Object.keys(matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap[key] === scaleStr);
    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap[key] === thresholdStr);
    threshold = threshold * 0.01;
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({
      name: 'statistic'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var statistic = statisticOptionsMap[statisticSelect][0];
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var forecastLength = curve['forecast-length']; // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.

    var axisKey = yAxisFormat;

    if (yAxisFormat === 'Relative frequency') {
      axisKey = axisKey + " (x100)";
    }

    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

    var d;

    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      var statement = "select m0.time as avtime, " + "count(distinct m0.time) as N_times, " + "min(m0.time) as min_secs, " + "max(m0.time) as max_secs, " + "{{statistic}} " + "from {{data_source}} as m0 " + "where 1=1 " + "{{validTimeClause}} " + "and m0.time >= '{{fromSecs}}' " + "and m0.time <= '{{toSecs}}' " + "and m0.hit+m0.fa+m0.miss+m0.cn > 0 " + "and m0.trsh = '{{threshold}}' " + "and m0.fcst_len = '{{forecastLength}}' " + "group by avtime " + "order by avtime" + ";";
      statement = statement.replace('{{fromSecs}}', fromSecs);
      statement = statement.replace('{{toSecs}}', toSecs);
      statement = statement.replace('{{data_source}}', data_source + '_' + scale + sourceStr + '_' + region);
      statement = statement.replace('{{statistic}}', statistic);
      statement = statement.replace('{{threshold}}', threshold);
      statement = statement.replace('{{forecastLength}}', forecastLength);
      var validTimeClause = " ";

      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = " and floor((m0.time)%(24*3600)/3600) IN(" + validTimes + ")";
      }

      statement = statement.replace('{{validTimeClause}}', validTimeClause);
      dataRequests[curve.label] = statement;
      var queryResult;
      var startMoment = moment();
      var finishMoment;

      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, plotType, hasLevels);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + curve.label] = {
          begin: startMoment.format(),
          finish: finishMoment.format(),
          duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
          recordCount: queryResult.data.x.length
        }; // get the data back from the query

        d = queryResult.data;
        allReturnedSubStats.push(d.subVals); // save returned data so that we can calculate histogram stats once all the queries are done

        allReturnedSubSecs.push(d.subSecs);
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
      }

      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve[curveIndex] = false;
        } else {
          // this is an error returned by the mysql database
          error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
          throw new Error(error);
        }
      }
    }
  }

  const appParams = {
    "plotType": plotType,
    "hasLevels": hasLevels,
    "matching": matching
  };
  const curveInfoParams = {
    "curves": curves,
    "curvesLength": curvesLength,
    "dataFoundForCurve": dataFoundForCurve,
    "axisMap": axisMap,
    "yAxisFormat": yAxisFormat
  };
  const bookkeepingParams = {
    "alreadyMatched": alreadyMatched,
    "dataRequests": dataRequests,
    "totalProcessingStart": totalProcessingStart
  };
  var result = matsDataProcessUtils.processDataHistogram(allReturnedSubStats, allReturnedSubSecs, [], dataset, appParams, curveInfoParams, plotParams, binParams, bookkeepingParams);
  plotFunction(result);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data_series.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/dataFunctions/data_series.js                                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 0);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 1);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 2);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 3);
let matsDataDiffUtils;
module.link("meteor/randyp:mats-common", {
  matsDataDiffUtils(v) {
    matsDataDiffUtils = v;
  }

}, 4);
let matsDataCurveOpsUtils;
module.link("meteor/randyp:mats-common", {
  matsDataCurveOpsUtils(v) {
    matsDataCurveOpsUtils = v;
  }

}, 5);
let matsDataProcessUtils;
module.link("meteor/randyp:mats-common", {
  matsDataProcessUtils(v) {
    matsDataProcessUtils = v;
  }

}, 6);
let moment;
module.link("meteor/momentjs:moment", {
  moment(v) {
    moment = v;
  }

}, 7);

dataSeries = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
  const plotType = matsTypes.PlotTypes.timeSeries;
  const hasLevels = false;
  var dataRequests = {}; // used to store data queries

  var dataFoundForCurve = true;
  var totalProcessingStart = moment();
  var dateRange = matsDataUtils.getDateRange(plotParams.dates);
  var fromSecs = dateRange.fromSeconds;
  var toSecs = dateRange.toSeconds;
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;
  var dataset = [];
  var utcCycleStarts = [];
  var axisMap = Object.create(null);
  var xmax = -1 * Number.MAX_VALUE;
  var ymax = -1 * Number.MAX_VALUE;
  var xmin = Number.MAX_VALUE;
  var ymin = Number.MAX_VALUE;
  var idealValues = [];

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];
    var diffFrom = curve.diffFrom;
    var label = curve['label'];
    var dataSourceStr = curve['data-source'];
    var data_source = matsCollections.CurveParams.findOne({
      name: 'data-source'
    }).optionsMap[curve['data-source']][0];
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap[key] === regionStr);
    var source = curve['truth'];
    var sourceStr = "";

    if (source !== "All") {
      sourceStr = "_" + source;
    }

    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap[key] === thresholdStr);
    threshold = threshold * 0.01;
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({
      name: 'statistic'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var statistic = statisticOptionsMap[statisticSelect][0];
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    var averageStr = curve['average'];
    var averageOptionsMap = matsCollections.CurveParams.findOne({
      name: 'average'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var average = averageOptionsMap[averageStr][0];
    var scaleStr = curve['scale'];
    var scale = Object.keys(matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap[key] === scaleStr);
    var forecastLength = curve['forecast-length']; // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.

    var axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    var idealVal = statisticOptionsMap[statisticSelect][2];

    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    var d;

    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      var statement = "select {{average}} as avtime, " + "count(distinct m0.time) as N_times, " + "min(m0.time) as min_secs, " + "max(m0.time) as max_secs, " + "{{statistic}} " + "from {{data_source}} as m0 " + "where 1=1 " + "and m0.time >= '{{fromSecs}}' " + "and m0.time <= '{{toSecs}}' " + "{{validTimeClause}} " + "and m0.hit+m0.fa+m0.miss+m0.cn > 0 " + "and m0.trsh = '{{threshold}}' " + "and m0.fcst_len = '{{forecastLength}}' " + "group by avtime " + "order by avtime" + ";";
      statement = statement.replace('{{average}}', average);
      statement = statement.replace('{{fromSecs}}', fromSecs);
      statement = statement.replace('{{toSecs}}', toSecs);
      statement = statement.replace('{{data_source}}', data_source + '_' + scale + sourceStr + '_' + region);
      statement = statement.replace('{{statistic}}', statistic);
      statement = statement.replace('{{threshold}}', threshold);
      statement = statement.replace('{{forecastLength}}', forecastLength);
      var validTimeClause = " ";

      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = " and floor((m0.time)%(24*3600)/3600) IN(" + validTimes + ")";
      }

      statement = statement.replace('{{validTimeClause}}', validTimeClause);
      dataRequests[curve.label] = statement; // math is done on forecastLength later on -- set all analyses to 0

      if (forecastLength === "-99") {
        forecastLength = "0";
      }

      var queryResult;
      var startMoment = moment();
      var finishMoment;

      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBTimeSeries(sumPool, statement, data_source, forecastLength, fromSecs, toSecs, averageStr, validTimes, hasLevels, false);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + curve.label] = {
          begin: startMoment.format(),
          finish: finishMoment.format(),
          duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
          recordCount: queryResult.data.x.length
        }; // get the data back from the query

        d = queryResult.data;
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
      }

      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve = false;
        } else {
          // this is an error returned by the mysql database
          error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
          throw new Error(error);
        }
      } // set axis limits based on returned data


      var postQueryStartMoment = moment();

      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, plotType, hasLevels);
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
    } // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options


    const mean = d.sum / d.x.length;
    const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
    curve['annotation'] = annotation;
    curve['xmin'] = d.xmin;
    curve['xmax'] = d.xmax;
    curve['ymin'] = d.ymin;
    curve['ymax'] = d.ymax;
    curve['axisKey'] = axisKey;
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d); // generate plot with data, curve annotation, axis labels, etc.

    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + curve.label] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };
  } // end for curves
  // process the data returned by the query


  const appParams = {
    "plotType": plotType,
    "hasLevels": hasLevels,
    "matching": matching
  };
  const curveInfoParams = {
    "curves": curves,
    "curvesLength": curvesLength,
    "idealValues": idealValues,
    "utcCycleStarts": utcCycleStarts,
    "axisMap": axisMap,
    "xmax": xmax,
    "xmin": xmin
  };
  const bookkeepingParams = {
    "dataRequests": dataRequests,
    "totalProcessingStart": totalProcessingStart
  };
  var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
  plotFunction(result);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data_threshold.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/dataFunctions/data_threshold.js                                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 0);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 1);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 2);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 3);
let matsDataDiffUtils;
module.link("meteor/randyp:mats-common", {
  matsDataDiffUtils(v) {
    matsDataDiffUtils = v;
  }

}, 4);
let matsDataCurveOpsUtils;
module.link("meteor/randyp:mats-common", {
  matsDataCurveOpsUtils(v) {
    matsDataCurveOpsUtils = v;
  }

}, 5);
let matsDataProcessUtils;
module.link("meteor/randyp:mats-common", {
  matsDataProcessUtils(v) {
    matsDataProcessUtils = v;
  }

}, 6);
let moment;
module.link("meteor/momentjs:moment", {
  moment(v) {
    moment = v;
  }

}, 7);

dataThreshold = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
  const plotType = matsTypes.PlotTypes.threshold;
  const hasLevels = false;
  var dataRequests = {}; // used to store data queries

  var dataFoundForCurve = true;
  var totalProcessingStart = moment();
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;
  var dataset = [];
  var utcCycleStarts = [];
  var axisMap = Object.create(null);
  var xmax = -1 * Number.MAX_VALUE;
  var ymax = -1 * Number.MAX_VALUE;
  var xmin = Number.MAX_VALUE;
  var ymin = Number.MAX_VALUE;
  var idealValues = [];

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];
    var diffFrom = curve.diffFrom;
    var label = curve['label'];
    var dataSourceStr = curve['data-source'];
    var data_source = matsCollections.CurveParams.findOne({
      name: 'data-source'
    }).optionsMap[curve['data-source']][0];
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap[key] === regionStr);
    var source = curve['truth'];
    var sourceStr = "";

    if (source !== "All") {
      sourceStr = "_" + source;
    }

    var scaleStr = curve['scale'];
    var scale = Object.keys(matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap[key] === scaleStr);
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({
      name: 'statistic'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var statistic = statisticOptionsMap[statisticSelect][0];
    var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    var forecastLength = curve['forecast-length']; // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.

    var axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    var idealVal = statisticOptionsMap[statisticSelect][2];

    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    var d;

    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      var statement = "SELECT m0.trsh as avtime, " + "count(distinct m0.time) as N_times, " + "min(m0.time) as min_secs, " + "max(m0.time) as max_secs, " + "{{statistic}} " + "from {{data_source}} as m0 " + "where 1=1 " + "and m0.time >= '{{fromSecs}}' " + "and m0.time <= '{{toSecs}}' " + "{{validTimeClause}} " + "and m0.hit+m0.fa+m0.miss+m0.cn > 0 " + "and m0.fcst_len = '{{forecastLength}}' " + "group by avtime " + "order by avtime" + ";";
      statement = statement.replace('{{fromSecs}}', fromSecs);
      statement = statement.replace('{{toSecs}}', toSecs);
      statement = statement.replace('{{data_source}}', data_source + '_' + scale + sourceStr + '_' + region);
      statement = statement.replace('{{statistic}}', statistic);
      statement = statement.replace('{{forecastLength}}', forecastLength);
      var validTimeClause = " ";

      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = " and floor((m0.time)%(24*3600)/3600) IN(" + validTimes + ")";
      }

      statement = statement.replace('{{validTimeClause}}', validTimeClause);
      dataRequests[curve.label] = statement;
      var queryResult;
      var startMoment = moment();
      var finishMoment;

      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, plotType, hasLevels);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + curve.label] = {
          begin: startMoment.format(),
          finish: finishMoment.format(),
          duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
          recordCount: queryResult.data.x.length
        }; // get the data back from the query

        d = queryResult.data;
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
      }

      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve = false;
        } else {
          // this is an error returned by the mysql database
          error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
          throw new Error(error);
        }
      } // set axis limits based on returned data


      var postQueryStartMoment = moment();

      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, plotType, hasLevels);
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
    } // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options


    const mean = d.sum / d.x.length;
    const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
    curve['annotation'] = annotation;
    curve['xmin'] = d.xmin;
    curve['xmax'] = d.xmax;
    curve['ymin'] = d.ymin;
    curve['ymax'] = d.ymax;
    curve['axisKey'] = axisKey;
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d); // generate plot with data, curve annotation, axis labels, etc.

    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + curve.label] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };
  } // end for curves
  // process the data returned by the query


  const appParams = {
    "plotType": plotType,
    "hasLevels": hasLevels,
    "matching": matching
  };
  const curveInfoParams = {
    "curves": curves,
    "curvesLength": curvesLength,
    "idealValues": idealValues,
    "utcCycleStarts": utcCycleStarts,
    "axisMap": axisMap,
    "xmax": xmax,
    "xmin": xmin
  };
  const bookkeepingParams = {
    "dataRequests": dataRequests,
    "totalProcessingStart": totalProcessingStart
  };
  var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
  plotFunction(result);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data_validtime.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/dataFunctions/data_validtime.js                                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 0);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 1);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 2);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 3);
let matsDataDiffUtils;
module.link("meteor/randyp:mats-common", {
  matsDataDiffUtils(v) {
    matsDataDiffUtils = v;
  }

}, 4);
let matsDataCurveOpsUtils;
module.link("meteor/randyp:mats-common", {
  matsDataCurveOpsUtils(v) {
    matsDataCurveOpsUtils = v;
  }

}, 5);
let matsDataProcessUtils;
module.link("meteor/randyp:mats-common", {
  matsDataProcessUtils(v) {
    matsDataProcessUtils = v;
  }

}, 6);
let moment;
module.link("meteor/momentjs:moment", {
  moment(v) {
    moment = v;
  }

}, 7);

dataValidTime = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
  const plotType = matsTypes.PlotTypes.validtime;
  const hasLevels = false;
  var dataRequests = {}; // used to store data queries

  var dataFoundForCurve = true;
  var totalProcessingStart = moment();
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;
  var dataset = [];
  var utcCycleStarts = [];
  var axisMap = Object.create(null);
  var xmax = -1 * Number.MAX_VALUE;
  var ymax = -1 * Number.MAX_VALUE;
  var xmin = Number.MAX_VALUE;
  var ymin = Number.MAX_VALUE;
  var idealValues = [];

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];
    var diffFrom = curve.diffFrom;
    var label = curve['label'];
    var dataSourceStr = curve['data-source'];
    var data_source = matsCollections.CurveParams.findOne({
      name: 'data-source'
    }).optionsMap[curve['data-source']][0];
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'region'
    }).valuesMap[key] === regionStr);
    var source = curve['truth'];
    var sourceStr = "";

    if (source !== "All") {
      sourceStr = "_" + source;
    }

    var scaleStr = curve['scale'];
    var scale = Object.keys(matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'scale'
    }).valuesMap[key] === scaleStr);
    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap).find(key => matsCollections.CurveParams.findOne({
      name: 'threshold'
    }).valuesMap[key] === thresholdStr);
    threshold = threshold * 0.01;
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({
      name: 'statistic'
    }, {
      optionsMap: 1
    })['optionsMap'];
    var statistic = statisticOptionsMap[statisticSelect][0];
    var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var forecastLength = curve['forecast-length']; // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.

    var axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    var idealVal = statisticOptionsMap[statisticSelect][2];

    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    var d;

    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      var statement = "select floor(m0.time%(24*3600)/3600) as hr_of_day, " + "count(distinct m0.time) as N_times, " + "min(m0.time) as min_secs, " + "max(m0.time) as max_secs, " + "{{statistic}} " + "from {{data_source}} as m0 " + "where 1=1 " + "and m0.time >= '{{fromSecs}}' " + "and m0.time <= '{{toSecs}}' " + "and m0.hit+m0.fa+m0.miss+m0.cn > 0 " + "and m0.trsh = '{{threshold}}' " + "and m0.fcst_len = '{{forecastLength}}' " + "group by hr_of_day " + "order by hr_of_day" + ";";
      statement = statement.replace('{{fromSecs}}', fromSecs);
      statement = statement.replace('{{toSecs}}', toSecs);
      statement = statement.replace('{{data_source}}', data_source + '_' + scale + sourceStr + '_' + region);
      statement = statement.replace('{{statistic}}', statistic);
      statement = statement.replace('{{threshold}}', threshold);
      statement = statement.replace('{{forecastLength}}', forecastLength);
      dataRequests[curve.label] = statement;
      var queryResult;
      var startMoment = moment();
      var finishMoment;

      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, plotType, hasLevels);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + curve.label] = {
          begin: startMoment.format(),
          finish: finishMoment.format(),
          duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
          recordCount: queryResult.data.x.length
        }; // get the data back from the query

        d = queryResult.data;
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
      }

      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve = false;
        } else {
          // this is an error returned by the mysql database
          error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
          throw new Error(error);
        }
      } // set axis limits based on returned data


      var postQueryStartMoment = moment();

      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, plotType, hasLevels);
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
    } // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options


    const mean = d.sum / d.x.length;
    const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
    curve['annotation'] = annotation;
    curve['xmin'] = d.xmin;
    curve['xmax'] = d.xmax;
    curve['ymin'] = d.ymin;
    curve['ymax'] = d.ymax;
    curve['axisKey'] = axisKey;
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d); // generate plot with data, curve annotation, axis labels, etc.

    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + curve.label] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
    };
  } // end for curves
  // process the data returned by the query


  const appParams = {
    "plotType": plotType,
    "hasLevels": hasLevels,
    "matching": matching
  };
  const curveInfoParams = {
    "curves": curves,
    "curvesLength": curvesLength,
    "idealValues": idealValues,
    "utcCycleStarts": utcCycleStarts,
    "axisMap": axisMap,
    "xmax": xmax,
    "xmin": xmin
  };
  const bookkeepingParams = {
    "dataRequests": dataRequests,
    "totalProcessingStart": totalProcessingStart
  };
  var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
  plotFunction(result);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"main.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/main.js                                                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let mysql;
module.link("meteor/pcel:mysql", {
  mysql(v) {
    mysql = v;
  }

}, 1);
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 2);
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 3);
let matsDataUtils;
module.link("meteor/randyp:mats-common", {
  matsDataUtils(v) {
    matsDataUtils = v;
  }

}, 4);
let matsDataQueryUtils;
module.link("meteor/randyp:mats-common", {
  matsDataQueryUtils(v) {
    matsDataQueryUtils = v;
  }

}, 5);
let matsParamUtils;
module.link("meteor/randyp:mats-common", {
  matsParamUtils(v) {
    matsParamUtils = v;
  }

}, 6);
// determined in doCurveParanms
var minDate;
var maxDate;
var dstr;

const doPlotParams = function () {
  if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
    matsCollections.PlotParams.remove({});
  }

  if (matsCollections.PlotParams.find().count() == 0) {
    matsCollections.PlotParams.insert({
      name: 'dates',
      type: matsTypes.InputTypes.dateRange,
      options: [''],
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ['data-source'],
      controlButtonCovered: true,
      default: dstr,
      controlButtonVisibility: 'block',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 1,
      help: "dateHelp.html"
    });
    var plotFormats = {};
    plotFormats[matsTypes.PlotFormats.matching] = 'show matching diffs';
    plotFormats[matsTypes.PlotFormats.pairwise] = 'pairwise diffs';
    plotFormats[matsTypes.PlotFormats.none] = 'no diffs';
    matsCollections.PlotParams.insert({
      name: 'plotFormat',
      type: matsTypes.InputTypes.radioGroup,
      optionsMap: plotFormats,
      options: [matsTypes.PlotFormats.matching, matsTypes.PlotFormats.pairwise, matsTypes.PlotFormats.none],
      default: matsTypes.PlotFormats.none,
      controlButtonCovered: false,
      controlButtonVisibility: 'block',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3
    });
    var yAxisOptionsMap = {
      "Number": ["number"],
      "Relative frequency": ["relFreq"]
    };
    matsCollections.PlotParams.insert({
      name: 'histogram-yaxis-controls',
      type: matsTypes.InputTypes.select,
      optionsMap: yAxisOptionsMap,
      options: Object.keys(yAxisOptionsMap),
      default: Object.keys(yAxisOptionsMap)[0],
      controlButtonCovered: true,
      controlButtonText: 'Y-axis mode',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 2
    });
    var binOptionsMap = {
      "Default bins": ["default"],
      "Set number of bins": ["binNumber"],
      "Make zero a bin bound": ["zeroBound"],
      "Choose a bin bound": ["chooseBound"],
      "Set number of bins and make zero a bin bound": ["binNumberWithZero"],
      "Set number of bins and choose a bin bound": ["binNumberWithChosen"],
      "Manual bins": ["manual"],
      "Manual bin start, number, and stride": ["manualStride"]
    };
    matsCollections.PlotParams.insert({
      name: 'histogram-bin-controls',
      type: matsTypes.InputTypes.select,
      optionsMap: binOptionsMap,
      options: Object.keys(binOptionsMap),
      hideOtherFor: {
        'bin-number': ["Default bins", "Make zero a bin bound", "Manual bins", "Choose a bin bound"],
        'bin-pivot': ["Default bins", "Set number of bins", "Make zero a bin bound", "Set number of bins and make zero a bin bound", "Manual bins", "Manual bin start, number, and stride"],
        'bin-start': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bins"],
        'bin-stride': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bins"],
        'bin-bounds': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bin start, number, and stride"]
      },
      default: Object.keys(binOptionsMap)[0],
      controlButtonCovered: true,
      controlButtonText: 'customize bins',
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 2
    });
    matsCollections.PlotParams.insert({
      name: 'bin-number',
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      // convenience
      min: '2',
      max: '100',
      step: 'any',
      default: '12',
      controlButtonCovered: true,
      controlButtonText: "number of bins",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 2
    });
    matsCollections.PlotParams.insert({
      name: 'bin-pivot',
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      // convenience
      min: '-10000',
      max: '10000',
      step: 'any',
      default: '0',
      controlButtonCovered: true,
      controlButtonText: "bin pivot value",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 2
    });
    matsCollections.PlotParams.insert({
      name: 'bin-start',
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      // convenience
      min: '-10000',
      max: '10000',
      step: 'any',
      default: '0',
      controlButtonCovered: true,
      controlButtonText: "bin start",
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 2
    });
    matsCollections.PlotParams.insert({
      name: 'bin-stride',
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      // convenience
      min: '-10000',
      max: '10000',
      step: 'any',
      default: '0',
      controlButtonCovered: true,
      controlButtonText: "bin stride",
      displayOrder: 6,
      displayPriority: 1,
      displayGroup: 2
    });
    matsCollections.PlotParams.insert({
      name: 'bin-bounds',
      type: matsTypes.InputTypes.textInput,
      optionsMap: {},
      options: [],
      // convenience
      default: ' ',
      controlButtonCovered: true,
      controlButtonText: "bin bounds (enter numbers separated by commas)",
      displayOrder: 7,
      displayPriority: 1,
      displayGroup: 2
    });
  } else {
    // need to update the dates selector if the metadata has changed
    var currentParam = matsCollections.PlotParams.findOne({
      name: 'dates'
    });

    if (!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) || !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) || !matsDataUtils.areObjectsEqual(currentParam.default, dstr)) {
      // have to reload model data
      matsCollections.PlotParams.update({
        name: 'dates'
      }, {
        $set: {
          startDate: minDate,
          stopDate: maxDate,
          default: dstr
        }
      });
    }
  }
};

const doCurveParams = function () {
  if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
    matsCollections.CurveParams.remove({});
  }

  var modelOptionsMap = {};
  var modelDateRangeMap = {};
  var regionModelOptionsMap = {};
  var forecastLengthOptionsMap = {};
  var thresholdsModelOptionsMap = {};
  var scaleModelOptionsMap = {};
  var sourceOptionsMap = {};
  var masterRegionValuesMap = {};
  var masterThresholdValuesMap = {};
  var masterScaleValuesMap = {};

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "SELECT short_name,description FROM region_descriptions;");
    var masterRegDescription;
    var masterShortName;

    for (var j = 0; j < rows.length; j++) {
      masterRegDescription = rows[j].description.trim();
      masterShortName = rows[j].short_name.trim();
      masterRegionValuesMap[masterShortName] = masterRegDescription;
    }
  } catch (err) {
    console.log(err.message);
  }

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT trsh,description FROM threshold_descriptions;");
    var masterDescription;
    var masterTrsh;

    for (var j = 0; j < rows.length; j++) {
      masterDescription = rows[j].description.trim();
      masterTrsh = rows[j].trsh.trim();
      masterThresholdValuesMap[masterTrsh] = masterDescription;
    }
  } catch (err) {
    console.log(err.message);
  }

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT scle,description FROM scale_descriptions;");
    var masterScaleDescription;
    var masterScale;

    for (var j = 0; j < rows.length; j++) {
      masterScaleDescription = rows[j].description.trim();
      masterScale = rows[j].scle.trim();
      masterScaleValuesMap[masterScale] = masterScaleDescription;
    }
  } catch (err) {
    console.log(err.message);
  }

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,regions,sources,display_text,fcst_lens,thresh,scale,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");

    for (var i = 0; i < rows.length; i++) {
      var model_value = rows[i].model.trim();
      var model = rows[i].display_text.trim();
      modelOptionsMap[model] = [model_value];
      var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
      var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
      modelDateRangeMap[model] = {
        minDate: rowMinDate,
        maxDate: rowMaxDate
      };
      var sources = rows[i].sources;
      var sourceArr = sources.split(',').map(Function.prototype.call, String.prototype.trim);

      for (var j = 0; j < sourceArr.length; j++) {
        sourceArr[j] = sourceArr[j].replace(/'|\[|\]/g, "");
      }

      sourceOptionsMap[model] = sourceArr;
      var forecastLengths = rows[i].fcst_lens;
      var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);

      for (var j = 0; j < forecastLengthArr.length; j++) {
        forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
      }

      forecastLengthOptionsMap[model] = forecastLengthArr;
      var thresholds = rows[i].thresh;
      var thresholdsArrRaw = thresholds.split(',').map(Function.prototype.call, String.prototype.trim);
      var thresholdsArr = [];
      var dummyThresh;

      for (var j = 0; j < thresholdsArrRaw.length; j++) {
        dummyThresh = thresholdsArrRaw[j].replace(/'|\[|\]/g, "");
        thresholdsArr.push(masterThresholdValuesMap[dummyThresh]);
      }

      thresholdsModelOptionsMap[model] = thresholdsArr;
      var regions = rows[i].regions;
      var regionsArrRaw = regions.split(',').map(Function.prototype.call, String.prototype.trim);
      var regionsArr = [];
      var dummyRegion;

      for (var j = 0; j < regionsArrRaw.length; j++) {
        dummyRegion = regionsArrRaw[j].replace(/'|\[|\]/g, "");
        regionsArr.push(masterRegionValuesMap[dummyRegion]);
      }

      regionModelOptionsMap[model] = regionsArr;
      var scales = rows[i].scale;
      var scalesArrRaw = scales.split(',').map(Function.prototype.call, String.prototype.trim);
      var scalesArr = [];
      var dummyScale;

      for (var j = 0; j < scalesArrRaw.length; j++) {
        dummyScale = scalesArrRaw[j].replace(/'|\[|\]/g, "");
        scalesArr.push(masterScaleValuesMap[dummyScale]);
      }

      scaleModelOptionsMap[model] = scalesArr;
    }
  } catch (err) {
    console.log(err.message);
  }

  if (matsCollections.CurveParams.find({
    name: 'label'
  }).count() == 0) {
    matsCollections.CurveParams.insert({
      name: 'label',
      type: matsTypes.InputTypes.textInput,
      optionsMap: {},
      options: [],
      // convenience
      controlButtonCovered: true,
      default: '',
      unique: true,
      controlButtonVisibility: 'block',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 1,
      help: 'label.html'
    });
  }

  if (matsCollections.CurveParams.find({
    name: 'data-source'
  }).count() == 0) {
    matsCollections.CurveParams.insert({
      name: 'data-source',
      type: matsTypes.InputTypes.select,
      optionsMap: modelOptionsMap,
      dates: modelDateRangeMap,
      options: Object.keys(modelOptionsMap),
      // convenience
      dependentNames: ["region", "forecast-length", "threshold", "scale", "truth", "dates", "curve-dates"],
      controlButtonCovered: true,
      default: Object.keys(modelOptionsMap)[0],
      unique: false,
      controlButtonVisibility: 'block',
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 1
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.CurveParams.findOne({
      name: 'data-source'
    });

    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap) || !matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap)) {
      // have to reload model data
      matsCollections.CurveParams.update({
        name: 'data-source'
      }, {
        $set: {
          optionsMap: modelOptionsMap,
          dates: modelDateRangeMap,
          options: Object.keys(modelOptionsMap),
          default: Object.keys(modelOptionsMap)[0]
        }
      });
    }
  }

  if (matsCollections.CurveParams.find({
    name: 'region'
  }).count() == 0) {
    matsCollections.CurveParams.insert({
      name: 'region',
      type: matsTypes.InputTypes.select,
      optionsMap: regionModelOptionsMap,
      options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],
      // convenience
      valuesMap: masterRegionValuesMap,
      superiorNames: ['data-source'],
      controlButtonCovered: true,
      unique: false,
      default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0],
      controlButtonVisibility: 'block',
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 1
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.CurveParams.findOne({
      name: 'region'
    });

    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionModelOptionsMap) || !matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterRegionValuesMap)) {
      // have to reload model data
      matsCollections.CurveParams.update({
        name: 'region'
      }, {
        $set: {
          optionsMap: regionModelOptionsMap,
          valuesMap: masterRegionValuesMap,
          options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],
          default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0]
        }
      });
    }
  }

  if (matsCollections.CurveParams.find({
    name: 'statistic'
  }).count() == 0) {
    var optionsMap = {
      'TSS (True Skill Score)': ['((sum(m0.hit)*sum(m0.cn) - sum(m0.fa)*sum(m0.miss))/((sum(m0.hit)+sum(m0.miss))*(sum(m0.fa)+sum(m0.cn)))) * 100 as stat, group_concat(((m0.hit*m0.cn - m0.fa*m0.miss)/((m0.hit+m0.miss)*(m0.fa+m0.cn))) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'x100', 100],
      'PODy (POD of precip > threshold)': ['((sum(m0.hit)+0.00)/sum(m0.hit+m0.miss)) * 100 as stat, group_concat(((m0.hit)/(m0.hit+m0.miss)) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'x100', 100],
      'PODn (POD of precip < threshold)': ['((sum(m0.cn)+0.00)/sum(m0.cn+m0.fa)) * 100 as stat, group_concat(((m0.cn)/(m0.cn+m0.fa)) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'x100', 100],
      'FAR (False Alarm Ratio)': ['((sum(m0.fa)+0.00)/sum(m0.fa+m0.hit)) * 100 as stat, group_concat(((m0.fa)/(m0.fa+m0.hit)) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'x100', 0],
      'Bias (forecast/actual)': ['((sum(m0.hit+m0.fa)+0.00)/sum(m0.hit+m0.miss)) as stat, group_concat(((m0.hit+m0.fa)/(m0.hit+m0.miss)), ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'Ratio', 1],
      'CSI (Critical Success Index)': ['((sum(m0.hit)+0.00)/sum(m0.hit+m0.miss+m0.fa)) * 100 as stat, group_concat(((m0.hit)/(m0.hit+m0.miss+m0.fa)) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'x100', 100],
      'HSS (Heidke Skill Score)': ['(2*(sum(m0.cn+0.00)*sum(m0.hit)-sum(m0.miss)*sum(m0.fa))/((sum(m0.cn+0.00)+sum(m0.fa))*(sum(m0.fa)+sum(m0.hit))+(sum(m0.cn+0.00)+sum(m0.miss))*(sum(m0.miss)+sum(m0.hit)))) * 100 as stat, group_concat((2*(m0.cn*m0.hit - m0.miss*m0.fa) / ((m0.cn+m0.fa)*(m0.fa+m0.hit) + (m0.cn+m0.miss)*(m0.miss+m0.hit))) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'x100', 100],
      'ETS (Equitable Threat Score)': ['(sum(m0.hit)-(sum(m0.hit+m0.fa)*sum(m0.hit+m0.miss)/sum(m0.hit+m0.fa+m0.miss+m0.cn)))/(sum(m0.hit+m0.fa+m0.miss)-(sum(m0.hit+m0.fa)*sum(m0.hit+m0.miss)/sum(m0.hit+m0.fa+m0.miss+m0.cn))) * 100 as stat, group_concat((m0.hit-((m0.hit+m0.fa)*(m0.hit+m0.miss)/(m0.hit+m0.fa+m0.miss+m0.cn)))/((m0.hit+m0.fa+m0.miss)-((m0.hit+m0.fa)*(m0.hit+m0.miss)/(m0.hit+m0.fa+m0.miss+m0.cn))) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'x100', 100],
      'Nlow (obs < threshold, avg per hr)': ['avg(m0.cn+m0.fa+0.000) as stat, group_concat((m0.cn+m0.fa), ";", m0.time order by m0.time) as sub_data, count(m0.cn) as N0', 'Number', null],
      'Nhigh (obs > threshold, avg per hr)': ['avg(m0.hit+m0.miss+0.000) as stat, group_concat((m0.hit+m0.miss), ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'Number', null],
      'Ntot (total obs, avg per hr)': ['avg(m0.hit+m0.fa+m0.miss+m0.cn+0.000) as stat, group_concat((m0.hit+m0.fa+m0.miss+m0.cn), ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'Number', null],
      'Ratio (Nlow / Ntot)': ['(sum(m0.cn+m0.fa+0.000)/sum(m0.hit+m0.fa+m0.miss+m0.cn+0.000)) as stat, group_concat(((m0.cn+m0.fa)/(m0.hit+m0.fa+m0.miss+m0.cn)), ";", m0.time order by m0.time) as sub_data, count(m0.cn) as N0', 'Ratio', null],
      'Ratio (Nhigh / Ntot)': ['(sum(m0.hit+m0.miss+0.000)/sum(m0.hit+m0.fa+m0.miss+m0.cn+0.000)) as stat, group_concat(((m0.hit+m0.miss)/(m0.hit+m0.fa+m0.miss+m0.cn)), ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'Ratio', null],
      'N in average (to nearest 100)': ['sum(m0.hit+m0.miss+m0.fa+m0.cn+0.000) as stat, group_concat((m0.hit+m0.miss+m0.fa+m0.cn), ";", m0.time order by m0.time) as sub_data, count(m0.hit) as N0', 'Number', null]
    };
    matsCollections.CurveParams.insert({
      name: 'statistic',
      type: matsTypes.InputTypes.select,
      optionsMap: optionsMap,
      options: Object.keys(optionsMap),
      // convenience
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[0],
      controlButtonVisibility: 'block',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 2
    });
  }

  if (matsCollections.CurveParams.find({
    name: 'threshold'
  }).count() == 0) {
    matsCollections.CurveParams.insert({
      name: 'threshold',
      type: matsTypes.InputTypes.select,
      optionsMap: thresholdsModelOptionsMap,
      options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]],
      // convenience
      valuesMap: masterThresholdValuesMap,
      superiorNames: ['data-source'],
      controlButtonCovered: true,
      unique: false,
      default: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]][0],
      controlButtonVisibility: 'block',
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 2
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.CurveParams.findOne({
      name: 'threshold'
    });

    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, thresholdsModelOptionsMap) || !matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterThresholdValuesMap)) {
      // have to reload model data
      matsCollections.CurveParams.update({
        name: 'threshold'
      }, {
        $set: {
          optionsMap: thresholdsModelOptionsMap,
          valuesMap: masterThresholdValuesMap,
          options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]],
          default: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]][0]
        }
      });
    }
  }

  if (matsCollections.CurveParams.find({
    name: 'average'
  }).count() == 0) {
    optionsMap = {
      'None': ['m0.time'],
      '3hr': ['ceil(10800*floor(m0.time/10800)+10800/2)'],
      '6hr': ['ceil(21600*floor(m0.time/21600)+21600/2)'],
      '12hr': ['ceil(43200*floor(m0.time/43200)+43200/2)'],
      '1D': ['ceil(86400*floor(m0.time/86400)+86400/2)'],
      '3D': ['ceil(259200*floor(m0.time/259200)+259200/2)'],
      '7D': ['ceil(604800*floor(m0.time/604800)+604800/2)'],
      '30D': ['ceil(2592000*floor(m0.time/2592000)+2592000/2)'],
      '60D': ['ceil(5184000*floor(m0.time/5184000)+5184000/2)']
    };
    matsCollections.CurveParams.insert({
      name: 'average',
      type: matsTypes.InputTypes.select,
      optionsMap: optionsMap,
      options: Object.keys(optionsMap),
      // convenience
      controlButtonCovered: true,
      unique: false,
      selected: 'None',
      default: 'None',
      controlButtonVisibility: 'block',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3
    });
  }

  if (matsCollections.CurveParams.find({
    name: 'forecast-length'
  }).count() == 0) {
    matsCollections.CurveParams.insert({
      name: 'forecast-length',
      type: matsTypes.InputTypes.select,
      optionsMap: forecastLengthOptionsMap,
      options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],
      // convenience
      superiorNames: ['data-source'],
      selected: '',
      controlButtonCovered: true,
      unique: false,
      default: 6,
      controlButtonVisibility: 'block',
      controlButtonText: "forecast lead time",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 3
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.CurveParams.findOne({
      name: 'forecast-length'
    });

    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
      // have to reload model data
      matsCollections.CurveParams.update({
        name: 'forecast-length'
      }, {
        $set: {
          optionsMap: forecastLengthOptionsMap,
          options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]]
        }
      });
    }
  }

  if (matsCollections.CurveParams.find({
    name: 'dieoff-type'
  }).count() == 0) {
    var dieoffOptionsMap = {
      "Dieoff": [matsTypes.ForecastTypes.dieoff],
      "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
      "Single cycle forecast (uses first date in range)": [matsTypes.ForecastTypes.singleCycle]
    };
    matsCollections.CurveParams.insert({
      name: 'dieoff-type',
      type: matsTypes.InputTypes.select,
      optionsMap: dieoffOptionsMap,
      options: Object.keys(dieoffOptionsMap),
      hideOtherFor: {
        'valid-time': ["Dieoff for a specified UTC cycle init hour", "Single cycle forecast (uses first date in range)"],
        'utc-cycle-start': ["Dieoff", "Single cycle forecast (uses first date in range)"]
      },
      selected: '',
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(dieoffOptionsMap)[0],
      controlButtonVisibility: 'block',
      controlButtonText: 'dieoff type',
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 3
    });
  }

  if (matsCollections.CurveParams.find({
    name: 'valid-time'
  }).count() == 0) {
    matsCollections.CurveParams.insert({
      name: 'valid-time',
      type: matsTypes.InputTypes.select,
      options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
      selected: [],
      controlButtonCovered: true,
      unique: false,
      default: matsTypes.InputTypes.unused,
      controlButtonVisibility: 'block',
      controlButtonText: "valid utc hour",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 3,
      multiple: true
    });
  }

  if (matsCollections.CurveParams.find({
    name: 'utc-cycle-start'
  }).count() == 0) {
    const optionsArr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
    matsCollections.CurveParams.insert({
      name: 'utc-cycle-start',
      type: matsTypes.InputTypes.select,
      options: optionsArr,
      selected: '',
      controlButtonCovered: true,
      unique: false,
      default: optionsArr[12],
      controlButtonVisibility: 'block',
      controlButtonText: "utc cycle init hour",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 3
    });
  }

  if (matsCollections.CurveParams.find({
    name: 'truth'
  }).count() == 0) {
    matsCollections.CurveParams.insert({
      name: 'truth',
      type: matsTypes.InputTypes.select,
      optionsMap: sourceOptionsMap,
      options: sourceOptionsMap[Object.keys(sourceOptionsMap)[0]],
      superiorNames: ['data-source'],
      controlButtonCovered: true,
      unique: false,
      default: sourceOptionsMap[Object.keys(sourceOptionsMap)[0]][0],
      controlButtonVisibility: 'block',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 4
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.CurveParams.findOne({
      name: 'truth'
    });

    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, sourceOptionsMap)) {
      // have to reload model data
      matsCollections.CurveParams.update({
        name: 'truth'
      }, {
        $set: {
          optionsMap: sourceOptionsMap,
          options: sourceOptionsMap[Object.keys(sourceOptionsMap)[0]],
          default: sourceOptionsMap[Object.keys(sourceOptionsMap)[0]][0]
        }
      });
    }
  }

  if (matsCollections.CurveParams.find({
    name: 'scale'
  }).count() == 0) {
    matsCollections.CurveParams.insert({
      // bias and model average are a different formula for wind (element 0 differs from element 1)
      // but stays the same (element 0 and element 1 are the same) otherwise.
      // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
      // time series we never append element 2. Element 3 is used to give us error values for error bars.
      name: 'scale',
      type: matsTypes.InputTypes.select,
      optionsMap: scaleModelOptionsMap,
      options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],
      // convenience
      valuesMap: masterScaleValuesMap,
      superiorNames: ['data-source'],
      controlButtonCovered: true,
      unique: false,
      default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]][0],
      controlButtonVisibility: 'block',
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 3
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.CurveParams.findOne({
      name: 'scale'
    });

    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, scaleModelOptionsMap) || !matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterScaleValuesMap)) {
      // have to reload model data
      matsCollections.CurveParams.update({
        name: 'scale'
      }, {
        $set: {
          optionsMap: scaleModelOptionsMap,
          valuesMap: masterScaleValuesMap,
          options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],
          default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]][0]
        }
      });
    }
  }

  if (matsCollections.CurveParams.find({
    name: 'x-axis-parameter'
  }).count() == 0) {
    const optionsMap = {
      'Fcst lead time': "select m0.fcst_len as xVal, ",
      'Threshold': "select m0.thresh/100 as xVal, ",
      'Valid UTC hour': "select m0.time%(24*3600)/3600 as xVal, ",
      'Init UTC hour': "select (m0.time-m0.fcst_len*3600)%(24*3600)/3600 as xVal, ",
      'Valid Date': "select m0.time as xVal, ",
      'Init Date': "select m0.time-m0.fcst_len*3600 as xVal, "
    };
    matsCollections.CurveParams.insert({
      name: 'x-axis-parameter',
      type: matsTypes.InputTypes.select,
      options: Object.keys(optionsMap),
      optionsMap: optionsMap,
      // hideOtherFor: {
      //     'forecast-length': ["Fcst lead time"],
      //     'valid-time': ["Valid UTC hour"],
      //     'pres-level': ["Pressure level"],
      // },
      selected: '',
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[2],
      controlButtonVisibility: 'block',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 5
    });
  }

  if (matsCollections.CurveParams.find({
    name: 'y-axis-parameter'
  }).count() == 0) {
    const optionsMap = {
      'Fcst lead time': "m0.fcst_len as yVal, ",
      'Threshold': "m0.thresh/100 as yVal, ",
      'Valid UTC hour': "m0.time%(24*3600)/3600 as yVal, ",
      'Init UTC hour': "(m0.time-m0.fcst_len*3600)%(24*3600)/3600 as yVal, ",
      'Valid Date': "m0.time as yVal, ",
      'Init Date': "m0.time-m0.fcst_len*3600 as yVal, "
    };
    matsCollections.CurveParams.insert({
      name: 'y-axis-parameter',
      type: matsTypes.InputTypes.select,
      options: Object.keys(optionsMap),
      optionsMap: optionsMap,
      // hideOtherFor: {
      //     'forecast-length': ["Fcst lead time"],
      //     'valid-time': ["Valid UTC hour"],
      //     'pres-level': ["Pressure level"],
      // },
      selected: '',
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[0],
      controlButtonVisibility: 'block',
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 5
    });
  } // determine date defaults for dates and curveDates


  var defaultDataSource = matsCollections.CurveParams.findOne({
    name: "data-source"
  }, {
    default: 1
  }).default;
  modelDateRangeMap = matsCollections.CurveParams.findOne({
    name: "data-source"
  }, {
    dates: 1
  }).dates;
  minDate = modelDateRangeMap[defaultDataSource].minDate;
  maxDate = modelDateRangeMap[defaultDataSource].maxDate;
  var minusMonthMinDate = matsParamUtils.getMinMaxDates(minDate, maxDate).minDate;
  dstr = minusMonthMinDate + ' - ' + maxDate;

  if (matsCollections.CurveParams.find({
    name: 'curve-dates'
  }).count() == 0) {
    optionsMap = {
      '1 day': ['1 day'],
      '3 days': ['3 days'],
      '7 days': ['7 days'],
      '31 days': ['31 days'],
      '90 days': ['90 days'],
      '180 days': ['180 days'],
      '365 days': ['365 days']
    };
    matsCollections.CurveParams.insert({
      name: 'curve-dates',
      type: matsTypes.InputTypes.dateRange,
      optionsMap: optionsMap,
      options: Object.keys(optionsMap).sort(),
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ['data-source'],
      controlButtonCovered: true,
      unique: false,
      default: dstr,
      controlButtonVisibility: 'block',
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 6,
      help: "dateHelp.html"
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.CurveParams.findOne({
      name: 'curve-dates'
    });

    if (!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) || !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) || !matsDataUtils.areObjectsEqual(currentParam.default, dstr)) {
      // have to reload model data
      matsCollections.CurveParams.update({
        name: 'curve-dates'
      }, {
        $set: {
          startDate: minDate,
          stopDate: maxDate,
          default: dstr
        }
      });
    }
  }
};
/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding PlotGraphFunctions.PlotType value.
 See curve_item.js and standAlone.js.
 */


const doCurveTextPatterns = function () {
  if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
    matsCollections.CurveTextPatterns.remove({});
  }

  if (matsCollections.CurveTextPatterns.find().count() == 0) {
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.timeSeries,
      textPattern: [['', 'label', ': '], ['', 'data-source', ' in '], ['', 'region', ', '], ['', 'threshold', ' '], ['', 'scale', ', '], ['', 'statistic', ', '], ['fcst_len: ', 'forecast-length', 'h, '], ['valid-time: ', 'valid-time', ', '], ['avg: ', 'average', ', '], ['', 'truth', ' ']],
      displayParams: ["label", "data-source", "region", "statistic", "threshold", "scale", "average", "forecast-length", "valid-time", "truth"],
      groupSize: 6
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.dieoff,
      textPattern: [['', 'label', ': '], ['', 'data-source', ' in '], ['', 'region', ', '], ['', 'threshold', ' '], ['', 'scale', ', '], ['', 'statistic', ', '], ['', 'dieoff-type', ', '], ['valid-time: ', 'valid-time', ', '], ['start utc: ', 'utc-cycle-start', ', '], ['', 'truth', ', '], ['', 'curve-dates', '']],
      displayParams: ["label", "data-source", "region", "statistic", "threshold", "scale", "dieoff-type", "valid-time", "utc-cycle-start", "truth", "curve-dates"],
      groupSize: 6
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.threshold,
      textPattern: [['', 'label', ': '], ['', 'data-source', ' in '], ['', 'region', ', '], ['', 'scale', ', '], ['', 'statistic', ', '], ['fcst_len: ', 'forecast-length', 'h, '], ['valid-time: ', 'valid-time', ', '], ['', 'truth', ', '], ['', 'curve-dates', '']],
      displayParams: ["label", "data-source", "region", "statistic", "scale", "forecast-length", "valid-time", "truth", "curve-dates"],
      groupSize: 6
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.validtime,
      textPattern: [['', 'label', ': '], ['', 'data-source', ' in '], ['', 'region', ', '], ['', 'threshold', ' '], ['', 'scale', ', '], ['', 'statistic', ', '], ['fcst_len: ', 'forecast-length', 'h, '], ['', 'truth', ', '], ['', 'curve-dates', '']],
      displayParams: ["label", "data-source", "region", "statistic", "threshold", "scale", "forecast-length", "truth", "curve-dates"],
      groupSize: 6
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.dailyModelCycle,
      textPattern: [['', 'label', ': '], ['', 'data-source', ' in '], ['', 'region', ', '], ['', 'threshold', ' '], ['', 'scale', ', '], ['', 'statistic', ', '], ['start utc: ', 'utc-cycle-start', ', '], ['', 'truth', ' ']],
      displayParams: ["label", "data-source", "region", "statistic", "threshold", "scale", "utc-cycle-start", "truth"],
      groupSize: 6
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.histogram,
      textPattern: [['', 'label', ': '], ['', 'data-source', ' in '], ['', 'region', ', '], ['', 'threshold', ' '], ['', 'scale', ', '], ['', 'statistic', ', '], ['fcst_len: ', 'forecast-length', 'h, '], ['valid-time: ', 'valid-time', ', '], ['', 'truth', ', '], ['', 'curve-dates', '']],
      displayParams: ["label", "data-source", "region", "statistic", "threshold", "scale", "forecast-length", "valid-time", "truth", "curve-dates"],
      groupSize: 6
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.contour,
      textPattern: [['', 'label', ': '], ['', 'data-source', ' in '], ['', 'region', ', '], ['', 'threshold', ' '], ['', 'scale', ', '], ['', 'statistic', ', '], ['fcst_len: ', 'forecast-length', 'h, '], ['valid-time: ', 'valid-time', ', '], ['', 'truth', ', '], ['x-axis: ', 'x-axis-parameter', ', '], ['y-axis: ', 'y-axis-parameter', '']],
      displayParams: ["label", "data-source", "region", "statistic", "threshold", "scale", "forecast-length", "valid-time", "truth", "x-axis-parameter", "y-axis-parameter"],
      groupSize: 6
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.contourDiff,
      textPattern: [['', 'label', ': '], ['', 'data-source', ' in '], ['', 'region', ', '], ['', 'threshold', ' '], ['', 'scale', ', '], ['', 'statistic', ', '], ['fcst_len: ', 'forecast-length', 'h, '], ['valid-time: ', 'valid-time', ', '], ['', 'truth', ', '], ['x-axis: ', 'x-axis-parameter', ', '], ['y-axis: ', 'y-axis-parameter', '']],
      displayParams: ["label", "data-source", "region", "statistic", "threshold", "scale", "forecast-length", "valid-time", "truth", "x-axis-parameter", "y-axis-parameter"],
      groupSize: 6
    });
  }
};

const doSavedCurveParams = function () {
  if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
    matsCollections.SavedCurveParams.remove({});
  }

  if (matsCollections.SavedCurveParams.find().count() == 0) {
    matsCollections.SavedCurveParams.insert({
      clName: 'changeList',
      changeList: []
    });
  }
};

const doPlotGraph = function () {
  if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
    matsCollections.PlotGraphFunctions.remove({});
  }

  if (matsCollections.PlotGraphFunctions.find().count() == 0) {
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.timeSeries,
      graphFunction: "graphPlotly",
      dataFunction: "dataSeries",
      checked: true
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.dieoff,
      graphFunction: "graphPlotly",
      dataFunction: "dataDieOff",
      checked: false
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.threshold,
      graphFunction: "graphPlotly",
      dataFunction: "dataThreshold",
      checked: false
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.validtime,
      graphFunction: "graphPlotly",
      dataFunction: "dataValidTime",
      checked: false
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.dailyModelCycle,
      graphFunction: "graphPlotly",
      dataFunction: "dataDailyModelCycle",
      checked: false
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.histogram,
      graphFunction: "graphPlotly",
      dataFunction: "dataHistogram",
      checked: false
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.contour,
      graphFunction: "graphPlotly",
      dataFunction: "dataContour",
      checked: false
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.contourDiff,
      graphFunction: "graphPlotly",
      dataFunction: "dataContourDiff",
      checked: false
    });
  }
};

Meteor.startup(function () {
  matsCollections.Databases.remove({});

  if (matsCollections.Databases.find().count() == 0) {
    matsCollections.Databases.insert({
      role: matsTypes.DatabaseRoles.SUMS_DATA,
      status: "active",
      host: 'wolphin.fsl.noaa.gov',
      user: 'readonly',
      password: 'ReadOnly@2016!',
      database: 'precip_new',
      connectionLimit: 10
    });
    matsCollections.Databases.insert({
      role: matsTypes.DatabaseRoles.META_DATA,
      status: "active",
      host: 'wolphin.fsl.noaa.gov',
      user: 'readonly',
      password: 'ReadOnly@2016!',
      database: 'mats_common',
      connectionLimit: 10
    });
  }

  const sumSettings = matsCollections.Databases.findOne({
    role: matsTypes.DatabaseRoles.SUMS_DATA,
    status: "active"
  }, {
    host: 1,
    user: 1,
    password: 1,
    database: 1,
    connectionLimit: 1
  }); // the pool is intended to be global

  sumPool = mysql.createPool(sumSettings);
  sumPool.on('connection', function (connection) {
    connection.query('set group_concat_max_len = 4294967295');
  });
  const metadataSettings = matsCollections.Databases.findOne({
    role: matsTypes.DatabaseRoles.META_DATA,
    status: "active"
  }, {
    host: 1,
    user: 1,
    password: 1,
    database: 1,
    connectionLimit: 1
  }); // the pool is intended to be global

  metadataPool = mysql.createPool(metadataSettings);
  const mdr = new matsTypes.MetaDataDBRecord("sumPool", "precip_new", ['regions_per_model_mats_all_categories', 'threshold_descriptions', 'scale_descriptions']);
  mdr.addRecord("metadataPool", "mats_common", ['region_descriptions']);
  matsMethods.resetApp({
    appMdr: mdr,
    appType: matsTypes.AppTypes.mats,
    app: 'precipitation1hr'
  });
}); // this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.

appSpecificResetRoutines = [doPlotGraph, doCurveParams, doSavedCurveParams, doPlotParams, doCurveTextPatterns];
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/server/dataFunctions/data_contour.js");
require("/server/dataFunctions/data_contour_diff.js");
require("/server/dataFunctions/data_dailymodelcycle.js");
require("/server/dataFunctions/data_dieoff.js");
require("/server/dataFunctions/data_histogram.js");
require("/server/dataFunctions/data_series.js");
require("/server/dataFunctions/data_threshold.js");
require("/server/dataFunctions/data_validtime.js");
require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2RhdGFGdW5jdGlvbnMvZGF0YV9jb250b3VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvZGF0YUZ1bmN0aW9ucy9kYXRhX2NvbnRvdXJfZGlmZi5qcyIsIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2RhdGFGdW5jdGlvbnMvZGF0YV9kYWlseW1vZGVsY3ljbGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3NlcnZlci9kYXRhRnVuY3Rpb25zL2RhdGFfZGllb2ZmLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvZGF0YUZ1bmN0aW9ucy9kYXRhX2hpc3RvZ3JhbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL2RhdGFGdW5jdGlvbnMvZGF0YV9zZXJpZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3NlcnZlci9kYXRhRnVuY3Rpb25zL2RhdGFfdGhyZXNob2xkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvZGF0YUZ1bmN0aW9ucy9kYXRhX3ZhbGlkdGltZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21haW4uanMiXSwibmFtZXMiOlsibWF0c0NvbGxlY3Rpb25zIiwibW9kdWxlIiwibGluayIsInYiLCJtYXRzVHlwZXMiLCJtYXRzRGF0YVV0aWxzIiwibWF0c0RhdGFRdWVyeVV0aWxzIiwibWF0c0RhdGFDdXJ2ZU9wc1V0aWxzIiwibWF0c0RhdGFQcm9jZXNzVXRpbHMiLCJtb21lbnQiLCJkYXRhQ29udG91ciIsInBsb3RQYXJhbXMiLCJwbG90RnVuY3Rpb24iLCJwbG90VHlwZSIsIlBsb3RUeXBlcyIsImNvbnRvdXIiLCJkYXRhUmVxdWVzdHMiLCJkYXRhRm91bmRGb3JDdXJ2ZSIsInRvdGFsUHJvY2Vzc2luZ1N0YXJ0IiwiZGF0ZVJhbmdlIiwiZ2V0RGF0ZVJhbmdlIiwiZGF0ZXMiLCJmcm9tU2VjcyIsImZyb21TZWNvbmRzIiwidG9TZWNzIiwidG9TZWNvbmRzIiwiZXJyb3IiLCJjdXJ2ZXMiLCJKU09OIiwicGFyc2UiLCJzdHJpbmdpZnkiLCJsZW5ndGgiLCJFcnJvciIsImRhdGFzZXQiLCJheGlzTWFwIiwiT2JqZWN0IiwiY3JlYXRlIiwiY3VydmUiLCJsYWJlbCIsInhBeGlzUGFyYW0iLCJ5QXhpc1BhcmFtIiwieFZhbENsYXVzZSIsIkN1cnZlUGFyYW1zIiwiZmluZE9uZSIsIm5hbWUiLCJvcHRpb25zTWFwIiwieVZhbENsYXVzZSIsImRhdGFTb3VyY2VTdHIiLCJkYXRhX3NvdXJjZSIsInJlZ2lvblN0ciIsInJlZ2lvbiIsImtleXMiLCJ2YWx1ZXNNYXAiLCJmaW5kIiwia2V5Iiwic291cmNlIiwic291cmNlU3RyIiwic2NhbGVTdHIiLCJzY2FsZSIsInN0YXRpc3RpY1NlbGVjdCIsInN0YXRpc3RpY09wdGlvbnNNYXAiLCJzdGF0aXN0aWMiLCJ2YWxpZFRpbWVDbGF1c2UiLCJ0aHJlc2hvbGRDbGF1c2UiLCJmb3JlY2FzdExlbmd0aENsYXVzZSIsImRhdGVDbGF1c2UiLCJmb3JlY2FzdExlbmd0aCIsInRocmVzaG9sZFN0ciIsInRocmVzaG9sZCIsInZhbGlkVGltZXMiLCJ1bmRlZmluZWQiLCJJbnB1dFR5cGVzIiwidW51c2VkIiwiZCIsInN0YXRlbWVudCIsInJlcGxhY2UiLCJzcGxpdCIsImpvaW4iLCJxdWVyeVJlc3VsdCIsInN0YXJ0TW9tZW50IiwiZmluaXNoTW9tZW50IiwicXVlcnlEQkNvbnRvdXIiLCJzdW1Qb29sIiwiYmVnaW4iLCJmb3JtYXQiLCJmaW5pc2giLCJkdXJhdGlvbiIsImRpZmYiLCJhc1NlY29uZHMiLCJyZWNvcmRDb3VudCIsImRhdGEiLCJ4VGV4dE91dHB1dCIsImUiLCJtZXNzYWdlIiwiTWVzc2FnZXMiLCJOT19EQVRBX0ZPVU5EIiwicG9zdFF1ZXJ5U3RhcnRNb21lbnQiLCJtZWFuIiwiZ2xvYl9zdGF0cyIsImFubm90YXRpb24iLCJ0b1ByZWNpc2lvbiIsInhtaW4iLCJ4bWF4IiwieW1pbiIsInltYXgiLCJ6bWluIiwiem1heCIsImNPcHRpb25zIiwiZ2VuZXJhdGVDb250b3VyQ3VydmVPcHRpb25zIiwicHVzaCIsInBvc3RRdWVyeUZpbmlzaE1vbWVudCIsImN1cnZlSW5mb1BhcmFtcyIsImJvb2trZWVwaW5nUGFyYW1zIiwicmVzdWx0IiwicHJvY2Vzc0RhdGFDb250b3VyIiwibWF0c0RhdGFEaWZmVXRpbHMiLCJkYXRhQ29udG91ckRpZmYiLCJtYXRjaGluZyIsIlBsb3RBY3Rpb25zIiwibWF0Y2hlZCIsImNvbnRvdXJEaWZmIiwiY3VydmVzTGVuZ3RoIiwiY3VydmVJbmRleCIsIm1hdGNoTW9kZWwiLCJtYXRjaERhdGVzIiwibWF0Y2hUaHJlc2hvbGRDbGF1c2UiLCJtYXRjaFZhbGlkVGltZUNsYXVzZSIsIm1hdGNoRm9yZWNhc3RMZW5ndGhDbGF1c2UiLCJtYXRjaENsYXVzZSIsIm90aGVyQ3VydmVJbmRleCIsIm90aGVyTW9kZWwiLCJvdGhlclJlZ2lvbiIsIm1hdGNoRGF0ZUNsYXVzZSIsIm1hdGNoRm9yZWNhc3RMZW5ndGgiLCJtYXRjaFRocmVzaG9sZCIsIm1hdGNoVmFsaWRUaW1lcyIsImdldERhdGFGb3JEaWZmQ29udG91ciIsImdldERpZmZDb250b3VyQ3VydmVQYXJhbXMiLCJkYXRhRGFpbHlNb2RlbEN5Y2xlIiwiZGFpbHlNb2RlbEN5Y2xlIiwiaGFzTGV2ZWxzIiwidXRjQ3ljbGVTdGFydHMiLCJOdW1iZXIiLCJNQVhfVkFMVUUiLCJpZGVhbFZhbHVlcyIsImRpZmZGcm9tIiwidXRjQ3ljbGVTdGFydCIsImF4aXNLZXkiLCJpZGVhbFZhbCIsImluZGV4T2YiLCJxdWVyeURCU3BlY2lhbHR5Q3VydmUiLCJ4IiwiZGlmZlJlc3VsdCIsImdldERhdGFGb3JEaWZmQ3VydmUiLCJzdW0iLCJnZW5lcmF0ZVNlcmllc0N1cnZlT3B0aW9ucyIsImFwcFBhcmFtcyIsInByb2Nlc3NEYXRhWFlDdXJ2ZSIsImRhdGFEaWVPZmYiLCJkaWVvZmYiLCJmb3JlY2FzdExlbmd0aFN0ciIsImZvcmVjYXN0TGVuZ3RoT3B0aW9uc01hcCIsInV0Y0N5Y2xlU3RhcnRDbGF1c2UiLCJkYXRlUmFuZ2VDbGF1c2UiLCJGb3JlY2FzdFR5cGVzIiwidXRjQ3ljbGUiLCJkYXRhSGlzdG9ncmFtIiwiaGlzdG9ncmFtIiwiYWxyZWFkeU1hdGNoZWQiLCJhbGxSZXR1cm5lZFN1YlN0YXRzIiwiYWxsUmV0dXJuZWRTdWJTZWNzIiwiYmluUGFyYW1zIiwic2V0SGlzdG9ncmFtUGFyYW1ldGVycyIsInlBeGlzRm9ybWF0IiwiYmluTnVtIiwic3ViVmFscyIsInN1YlNlY3MiLCJwcm9jZXNzRGF0YUhpc3RvZ3JhbSIsImRhdGFTZXJpZXMiLCJ0aW1lU2VyaWVzIiwiYXZlcmFnZVN0ciIsImF2ZXJhZ2VPcHRpb25zTWFwIiwiYXZlcmFnZSIsInF1ZXJ5REJUaW1lU2VyaWVzIiwiZGF0YVRocmVzaG9sZCIsImRhdGFWYWxpZFRpbWUiLCJ2YWxpZHRpbWUiLCJNZXRlb3IiLCJteXNxbCIsIm1hdHNQYXJhbVV0aWxzIiwibWluRGF0ZSIsIm1heERhdGUiLCJkc3RyIiwiZG9QbG90UGFyYW1zIiwiU2V0dGluZ3MiLCJyZXNldEZyb21Db2RlIiwiUGxvdFBhcmFtcyIsInJlbW92ZSIsImNvdW50IiwiaW5zZXJ0IiwidHlwZSIsIm9wdGlvbnMiLCJzdGFydERhdGUiLCJzdG9wRGF0ZSIsInN1cGVyaW9yTmFtZXMiLCJjb250cm9sQnV0dG9uQ292ZXJlZCIsImRlZmF1bHQiLCJjb250cm9sQnV0dG9uVmlzaWJpbGl0eSIsImRpc3BsYXlPcmRlciIsImRpc3BsYXlQcmlvcml0eSIsImRpc3BsYXlHcm91cCIsImhlbHAiLCJwbG90Rm9ybWF0cyIsIlBsb3RGb3JtYXRzIiwicGFpcndpc2UiLCJub25lIiwicmFkaW9Hcm91cCIsInlBeGlzT3B0aW9uc01hcCIsInNlbGVjdCIsImNvbnRyb2xCdXR0b25UZXh0IiwiYmluT3B0aW9uc01hcCIsImhpZGVPdGhlckZvciIsIm51bWJlclNwaW5uZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwidGV4dElucHV0IiwiY3VycmVudFBhcmFtIiwiYXJlT2JqZWN0c0VxdWFsIiwidXBkYXRlIiwiJHNldCIsImRvQ3VydmVQYXJhbXMiLCJtb2RlbE9wdGlvbnNNYXAiLCJtb2RlbERhdGVSYW5nZU1hcCIsInJlZ2lvbk1vZGVsT3B0aW9uc01hcCIsInRocmVzaG9sZHNNb2RlbE9wdGlvbnNNYXAiLCJzY2FsZU1vZGVsT3B0aW9uc01hcCIsInNvdXJjZU9wdGlvbnNNYXAiLCJtYXN0ZXJSZWdpb25WYWx1ZXNNYXAiLCJtYXN0ZXJUaHJlc2hvbGRWYWx1ZXNNYXAiLCJtYXN0ZXJTY2FsZVZhbHVlc01hcCIsInJvd3MiLCJzaW1wbGVQb29sUXVlcnlXcmFwU3luY2hyb25vdXMiLCJtZXRhZGF0YVBvb2wiLCJtYXN0ZXJSZWdEZXNjcmlwdGlvbiIsIm1hc3RlclNob3J0TmFtZSIsImoiLCJkZXNjcmlwdGlvbiIsInRyaW0iLCJzaG9ydF9uYW1lIiwiZXJyIiwiY29uc29sZSIsImxvZyIsIm1hc3RlckRlc2NyaXB0aW9uIiwibWFzdGVyVHJzaCIsInRyc2giLCJtYXN0ZXJTY2FsZURlc2NyaXB0aW9uIiwibWFzdGVyU2NhbGUiLCJzY2xlIiwiaSIsIm1vZGVsX3ZhbHVlIiwibW9kZWwiLCJkaXNwbGF5X3RleHQiLCJyb3dNaW5EYXRlIiwidXRjIiwibWluZGF0ZSIsInJvd01heERhdGUiLCJtYXhkYXRlIiwic291cmNlcyIsInNvdXJjZUFyciIsIm1hcCIsIkZ1bmN0aW9uIiwicHJvdG90eXBlIiwiY2FsbCIsIlN0cmluZyIsImZvcmVjYXN0TGVuZ3RocyIsImZjc3RfbGVucyIsImZvcmVjYXN0TGVuZ3RoQXJyIiwidGhyZXNob2xkcyIsInRocmVzaCIsInRocmVzaG9sZHNBcnJSYXciLCJ0aHJlc2hvbGRzQXJyIiwiZHVtbXlUaHJlc2giLCJyZWdpb25zIiwicmVnaW9uc0FyclJhdyIsInJlZ2lvbnNBcnIiLCJkdW1teVJlZ2lvbiIsInNjYWxlcyIsInNjYWxlc0FyclJhdyIsInNjYWxlc0FyciIsImR1bW15U2NhbGUiLCJ1bmlxdWUiLCJkZXBlbmRlbnROYW1lcyIsInNlbGVjdGVkIiwiZGllb2ZmT3B0aW9uc01hcCIsInNpbmdsZUN5Y2xlIiwibXVsdGlwbGUiLCJvcHRpb25zQXJyIiwiZGVmYXVsdERhdGFTb3VyY2UiLCJtaW51c01vbnRoTWluRGF0ZSIsImdldE1pbk1heERhdGVzIiwic29ydCIsImRvQ3VydmVUZXh0UGF0dGVybnMiLCJDdXJ2ZVRleHRQYXR0ZXJucyIsInRleHRQYXR0ZXJuIiwiZGlzcGxheVBhcmFtcyIsImdyb3VwU2l6ZSIsImRvU2F2ZWRDdXJ2ZVBhcmFtcyIsIlNhdmVkQ3VydmVQYXJhbXMiLCJjbE5hbWUiLCJjaGFuZ2VMaXN0IiwiZG9QbG90R3JhcGgiLCJQbG90R3JhcGhGdW5jdGlvbnMiLCJncmFwaEZ1bmN0aW9uIiwiZGF0YUZ1bmN0aW9uIiwiY2hlY2tlZCIsInN0YXJ0dXAiLCJEYXRhYmFzZXMiLCJyb2xlIiwiRGF0YWJhc2VSb2xlcyIsIlNVTVNfREFUQSIsInN0YXR1cyIsImhvc3QiLCJ1c2VyIiwicGFzc3dvcmQiLCJkYXRhYmFzZSIsImNvbm5lY3Rpb25MaW1pdCIsIk1FVEFfREFUQSIsInN1bVNldHRpbmdzIiwiY3JlYXRlUG9vbCIsIm9uIiwiY29ubmVjdGlvbiIsInF1ZXJ5IiwibWV0YWRhdGFTZXR0aW5ncyIsIm1kciIsIk1ldGFEYXRhREJSZWNvcmQiLCJhZGRSZWNvcmQiLCJtYXRzTWV0aG9kcyIsInJlc2V0QXBwIiwiYXBwTWRyIiwiYXBwVHlwZSIsIkFwcFR5cGVzIiwibWF0cyIsImFwcCIsImFwcFNwZWNpZmljUmVzZXRSb3V0aW5lcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQSxJQUFJQSxlQUFKO0FBQW9CQyxNQUFNLENBQUNDLElBQVAsQ0FBWSwyQkFBWixFQUF3QztBQUFDRixpQkFBZSxDQUFDRyxDQUFELEVBQUc7QUFBQ0gsbUJBQWUsR0FBQ0csQ0FBaEI7QUFBa0I7O0FBQXRDLENBQXhDLEVBQWdGLENBQWhGO0FBQW1GLElBQUlDLFNBQUo7QUFBY0gsTUFBTSxDQUFDQyxJQUFQLENBQVks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QUcsRUFBQztBQUFsRCxHQUFyQjtBQUNILENBbkRELEUsQ0FxREE7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FDLHdCQUF3QixHQUFHLENBQ3ZCakMsV0FEdUIsRUFFdkJoRixhQUZ1QixFQUd2QjRFLGtCQUh1QixFQUl2QmxILFlBSnVCLEVBS3ZCNkcsbUJBTHVCLENBQTNCLEMiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkgQ29sb3JhZG8gU3RhdGUgVW5pdmVyc2l0eSBhbmQgUmVnZW50cyBvZiB0aGUgVW5pdmVyc2l0eSBvZiBDb2xvcmFkby4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqL1xuXG5pbXBvcnQge21hdHNDb2xsZWN0aW9uc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNUeXBlc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVF1ZXJ5VXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YUN1cnZlT3BzVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVByb2Nlc3NVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21vbWVudH0gZnJvbSAnbWV0ZW9yL21vbWVudGpzOm1vbWVudCdcblxuZGF0YUNvbnRvdXIgPSBmdW5jdGlvbiAocGxvdFBhcmFtcywgcGxvdEZ1bmN0aW9uKSB7XG4gICAgLy8gaW5pdGlhbGl6ZSB2YXJpYWJsZXMgY29tbW9uIHRvIGFsbCBjdXJ2ZXNcbiAgICBjb25zdCBwbG90VHlwZSA9IG1hdHNUeXBlcy5QbG90VHlwZXMuY29udG91cjtcbiAgICB2YXIgZGF0YVJlcXVlc3RzID0ge307IC8vIHVzZWQgdG8gc3RvcmUgZGF0YSBxdWVyaWVzXG4gICAgdmFyIGRhdGFGb3VuZEZvckN1cnZlID0gdHJ1ZTtcbiAgICB2YXIgdG90YWxQcm9jZXNzaW5nU3RhcnQgPSBtb21lbnQoKTtcbiAgICB2YXIgZGF0ZVJhbmdlID0gbWF0c0RhdGFVdGlscy5nZXREYXRlUmFuZ2UocGxvdFBhcmFtcy5kYXRlcyk7XG4gICAgdmFyIGZyb21TZWNzID0gZGF0ZVJhbmdlLmZyb21TZWNvbmRzO1xuICAgIHZhciB0b1NlY3MgPSBkYXRlUmFuZ2UudG9TZWNvbmRzO1xuICAgIHZhciBlcnJvciA9IFwiXCI7XG4gICAgdmFyIGN1cnZlcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGxvdFBhcmFtcy5jdXJ2ZXMpKTtcbiAgICBpZiAoY3VydmVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSU5GTzogIFRoZXJlIG11c3Qgb25seSBiZSBvbmUgYWRkZWQgY3VydmUuXCIpO1xuICAgIH1cbiAgICB2YXIgZGF0YXNldCA9IFtdO1xuICAgIHZhciBheGlzTWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdmFyaWFibGVzIHNwZWNpZmljIHRvIHRoZSBjdXJ2ZVxuICAgIHZhciBjdXJ2ZSA9IGN1cnZlc1swXTtcbiAgICB2YXIgbGFiZWwgPSBjdXJ2ZVsnbGFiZWwnXTtcbiAgICB2YXIgeEF4aXNQYXJhbSA9IGN1cnZlWyd4LWF4aXMtcGFyYW1ldGVyJ107XG4gICAgdmFyIHlBeGlzUGFyYW0gPSBjdXJ2ZVsneS1heGlzLXBhcmFtZXRlciddO1xuICAgIHZhciB4VmFsQ2xhdXNlID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd4LWF4aXMtcGFyYW1ldGVyJ30pLm9wdGlvbnNNYXBbeEF4aXNQYXJhbV07XG4gICAgdmFyIHlWYWxDbGF1c2UgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3ktYXhpcy1wYXJhbWV0ZXInfSkub3B0aW9uc01hcFt5QXhpc1BhcmFtXTtcbiAgICB2YXIgZGF0YVNvdXJjZVN0ciA9IGN1cnZlWydkYXRhLXNvdXJjZSddO1xuICAgIHZhciBkYXRhX3NvdXJjZSA9IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnZGF0YS1zb3VyY2UnfSkub3B0aW9uc01hcFtjdXJ2ZVsnZGF0YS1zb3VyY2UnXV1bMF07XG4gICAgdmFyIHJlZ2lvblN0ciA9IGN1cnZlWydyZWdpb24nXTtcbiAgICB2YXIgcmVnaW9uID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdyZWdpb24nfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KS52YWx1ZXNNYXBba2V5XSA9PT0gcmVnaW9uU3RyKTtcbiAgICB2YXIgc291cmNlID0gY3VydmVbJ3RydXRoJ107XG4gICAgdmFyIHNvdXJjZVN0ciA9IFwiXCI7XG4gICAgaWYgKHNvdXJjZSAhPT0gXCJBbGxcIikge1xuICAgICAgICBzb3VyY2VTdHIgPSBcIl9cIiArIHNvdXJjZTtcbiAgICB9XG4gICAgdmFyIHNjYWxlU3RyID0gY3VydmVbJ3NjYWxlJ107XG4gICAgdmFyIHNjYWxlID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzY2FsZSd9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnc2NhbGUnfSkudmFsdWVzTWFwW2tleV0gPT09IHNjYWxlU3RyKTtcbiAgICB2YXIgc3RhdGlzdGljU2VsZWN0ID0gY3VydmVbJ3N0YXRpc3RpYyddO1xuICAgIHZhciBzdGF0aXN0aWNPcHRpb25zTWFwID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzdGF0aXN0aWMnfSwge29wdGlvbnNNYXA6IDF9KVsnb3B0aW9uc01hcCddO1xuICAgIHZhciBzdGF0aXN0aWMgPSBzdGF0aXN0aWNPcHRpb25zTWFwW3N0YXRpc3RpY1NlbGVjdF1bMF07XG4gICAgdmFyIHZhbGlkVGltZUNsYXVzZSA9IFwiXCI7XG4gICAgdmFyIHRocmVzaG9sZENsYXVzZSA9IFwiXCI7XG4gICAgdmFyIGZvcmVjYXN0TGVuZ3RoQ2xhdXNlID0gXCJcIjtcbiAgICB2YXIgZGF0ZUNsYXVzZSA9IFwiXCI7XG4gICAgaWYgKHhBeGlzUGFyYW0gIT09ICdGY3N0IGxlYWQgdGltZScgJiYgeUF4aXNQYXJhbSAhPT0gJ0Zjc3QgbGVhZCB0aW1lJykge1xuICAgICAgICB2YXIgZm9yZWNhc3RMZW5ndGggPSBjdXJ2ZVsnZm9yZWNhc3QtbGVuZ3RoJ107XG4gICAgICAgIGZvcmVjYXN0TGVuZ3RoQ2xhdXNlID0gXCJhbmQgbTAuZmNzdF9sZW4gPSBcIiArIGZvcmVjYXN0TGVuZ3RoICsgXCIgXCI7XG4gICAgfVxuICAgIGlmICh4QXhpc1BhcmFtICE9PSAnVGhyZXNob2xkJyAmJiB5QXhpc1BhcmFtICE9PSAnVGhyZXNob2xkJykge1xuICAgICAgICB2YXIgdGhyZXNob2xkU3RyID0gY3VydmVbJ3RocmVzaG9sZCddO1xuICAgICAgICB2YXIgdGhyZXNob2xkID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0aHJlc2hvbGQnfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3RocmVzaG9sZCd9KS52YWx1ZXNNYXBba2V5XSA9PT0gdGhyZXNob2xkU3RyKTtcbiAgICAgICAgdGhyZXNob2xkID0gdGhyZXNob2xkICogMC4wMTtcbiAgICAgICAgdGhyZXNob2xkQ2xhdXNlID0gXCJhbmQgbTAudHJzaCA9IFwiICsgdGhyZXNob2xkICsgXCIgXCI7XG4gICAgfVxuICAgIGlmICh4QXhpc1BhcmFtICE9PSAnVmFsaWQgVVRDIGhvdXInICYmIHlBeGlzUGFyYW0gIT09ICdWYWxpZCBVVEMgaG91cicpIHtcbiAgICAgICAgdmFyIHZhbGlkVGltZXMgPSBjdXJ2ZVsndmFsaWQtdGltZSddID09PSB1bmRlZmluZWQgPyBbXSA6IGN1cnZlWyd2YWxpZC10aW1lJ107XG4gICAgICAgIGlmICh2YWxpZFRpbWVzLmxlbmd0aCA+IDAgJiYgdmFsaWRUaW1lcyAhPT0gbWF0c1R5cGVzLklucHV0VHlwZXMudW51c2VkKSB7XG4gICAgICAgICAgICB2YWxpZFRpbWVDbGF1c2UgPSBcIiBhbmQgIG0wLnRpbWUlKDI0KjM2MDApLzM2MDAgSU4oXCIgKyB2YWxpZFRpbWVzICsgXCIpXCI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCh4QXhpc1BhcmFtID09PSAnSW5pdCBEYXRlJyB8fCB5QXhpc1BhcmFtID09PSAnSW5pdCBEYXRlJykgJiYgKHhBeGlzUGFyYW0gIT09ICdWYWxpZCBEYXRlJyAmJiB5QXhpc1BhcmFtICE9PSAnVmFsaWQgRGF0ZScpKSB7XG4gICAgICAgIGRhdGVDbGF1c2UgPSBcIm0wLnRpbWUtbTAuZmNzdF9sZW4qMzYwMFwiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRhdGVDbGF1c2UgPSBcIm0wLnRpbWVcIjtcbiAgICB9XG5cbiAgICAvLyBGb3IgY29udG91cnMsIHRoaXMgZnVuY3Rpb25zIGFzIHRoZSBjb2xvcmJhciBsYWJlbC5cbiAgICBjdXJ2ZVsndW5pdEtleSddID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzFdO1xuXG4gICAgdmFyIGQ7XG4gICAgLy8gdGhpcyBpcyBhIGRhdGFiYXNlIGRyaXZlbiBjdXJ2ZSwgbm90IGEgZGlmZmVyZW5jZSBjdXJ2ZVxuICAgIC8vIHByZXBhcmUgdGhlIHF1ZXJ5IGZyb20gdGhlIGFib3ZlIHBhcmFtZXRlcnNcbiAgICB2YXIgc3RhdGVtZW50ID0gXCJ7e3hWYWxDbGF1c2V9fSBcIiArXG4gICAgICAgIFwie3t5VmFsQ2xhdXNlfX0gXCIgK1xuICAgICAgICBcImNvdW50KGRpc3RpbmN0IHt7ZGF0ZUNsYXVzZX19KSBhcyBOX3RpbWVzLCBcIiArXG4gICAgICAgIFwibWluKHt7ZGF0ZUNsYXVzZX19KSBhcyBtaW5fc2VjcywgXCIgK1xuICAgICAgICBcIm1heCh7e2RhdGVDbGF1c2V9fSkgYXMgbWF4X3NlY3MsIFwiICtcbiAgICAgICAgXCJ7e3N0YXRpc3RpY319IFwiICtcbiAgICAgICAgXCJmcm9tIHt7ZGF0YV9zb3VyY2V9fSBhcyBtMCBcIiArXG4gICAgICAgIFwid2hlcmUgMT0xIFwiICtcbiAgICAgICAgXCJhbmQge3tkYXRlQ2xhdXNlfX0gPj0gJ3t7ZnJvbVNlY3N9fScgXCIgK1xuICAgICAgICBcImFuZCB7e2RhdGVDbGF1c2V9fSA8PSAne3t0b1NlY3N9fScgXCIgK1xuICAgICAgICBcImFuZCBtMC5oaXQrbTAuZmErbTAubWlzcyttMC5jbiA+IDAgXCIgK1xuICAgICAgICBcInt7dGhyZXNob2xkQ2xhdXNlfX0gXCIgK1xuICAgICAgICBcInt7dmFsaWRUaW1lQ2xhdXNlfX0gXCIgK1xuICAgICAgICBcInt7Zm9yZWNhc3RMZW5ndGhDbGF1c2V9fSBcIiArXG4gICAgICAgIFwiZ3JvdXAgYnkgeFZhbCx5VmFsIFwiICtcbiAgICAgICAgXCJvcmRlciBieSB4VmFsLHlWYWxcIiArXG4gICAgICAgIFwiO1wiO1xuXG4gICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7eFZhbENsYXVzZX19JywgeFZhbENsYXVzZSk7XG4gICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7eVZhbENsYXVzZX19JywgeVZhbENsYXVzZSk7XG4gICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZGF0YV9zb3VyY2V9fScsIGRhdGFfc291cmNlICsgJ18nICsgc2NhbGUgKyBzb3VyY2VTdHIgKyAnXycgKyByZWdpb24pO1xuICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3N0YXRpc3RpY319Jywgc3RhdGlzdGljKTtcbiAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t0aHJlc2hvbGR9fScsIHRocmVzaG9sZCk7XG4gICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZnJvbVNlY3N9fScsIGZyb21TZWNzKTtcbiAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t0b1NlY3N9fScsIHRvU2Vjcyk7XG4gICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dGhyZXNob2xkQ2xhdXNlfX0nLCB0aHJlc2hvbGRDbGF1c2UpO1xuICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2ZvcmVjYXN0TGVuZ3RoQ2xhdXNlfX0nLCBmb3JlY2FzdExlbmd0aENsYXVzZSk7XG4gICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dmFsaWRUaW1lQ2xhdXNlfX0nLCB2YWxpZFRpbWVDbGF1c2UpO1xuICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5zcGxpdCgne3tkYXRlQ2xhdXNlfX0nKS5qb2luKGRhdGVDbGF1c2UpO1xuICAgIGRhdGFSZXF1ZXN0c1tjdXJ2ZS5sYWJlbF0gPSBzdGF0ZW1lbnQ7XG5cbiAgICAvLyBtYXRoIGlzIGRvbmUgb24gZm9yZWNhc3RMZW5ndGggbGF0ZXIgb24gLS0gc2V0IGFsbCBhbmFseXNlcyB0byAwXG4gICAgaWYgKGZvcmVjYXN0TGVuZ3RoID09PSBcIi05OVwiKSB7XG4gICAgICAgIGZvcmVjYXN0TGVuZ3RoID0gXCIwXCI7XG4gICAgfVxuXG4gICAgdmFyIHF1ZXJ5UmVzdWx0O1xuICAgIHZhciBzdGFydE1vbWVudCA9IG1vbWVudCgpO1xuICAgIHZhciBmaW5pc2hNb21lbnQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gc2VuZCB0aGUgcXVlcnkgc3RhdGVtZW50IHRvIHRoZSBxdWVyeSBmdW5jdGlvblxuICAgICAgICBxdWVyeVJlc3VsdCA9IG1hdHNEYXRhUXVlcnlVdGlscy5xdWVyeURCQ29udG91cihzdW1Qb29sLCBzdGF0ZW1lbnQpO1xuICAgICAgICBmaW5pc2hNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgZGF0YVJlcXVlc3RzW1wiZGF0YSByZXRyaWV2YWwgKHF1ZXJ5KSB0aW1lIC0gXCIgKyBjdXJ2ZS5sYWJlbF0gPSB7XG4gICAgICAgICAgICBiZWdpbjogc3RhcnRNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICBmaW5pc2g6IGZpbmlzaE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBtb21lbnQuZHVyYXRpb24oZmluaXNoTW9tZW50LmRpZmYoc3RhcnRNb21lbnQpKS5hc1NlY29uZHMoKSArIFwiIHNlY29uZHNcIixcbiAgICAgICAgICAgIHJlY29yZENvdW50OiBxdWVyeVJlc3VsdC5kYXRhLnhUZXh0T3V0cHV0Lmxlbmd0aFxuICAgICAgICB9O1xuICAgICAgICAvLyBnZXQgdGhlIGRhdGEgYmFjayBmcm9tIHRoZSBxdWVyeVxuICAgICAgICBkID0gcXVlcnlSZXN1bHQuZGF0YTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIHRoaXMgaXMgYW4gZXJyb3IgcHJvZHVjZWQgYnkgYSBidWcgaW4gdGhlIHF1ZXJ5IGZ1bmN0aW9uLCBub3QgYW4gZXJyb3IgcmV0dXJuZWQgYnkgdGhlIG15c3FsIGRhdGFiYXNlXG4gICAgICAgIGUubWVzc2FnZSA9IFwiRXJyb3IgaW4gcXVlcnlEQjogXCIgKyBlLm1lc3NhZ2UgKyBcIiBmb3Igc3RhdGVtZW50OiBcIiArIHN0YXRlbWVudDtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUubWVzc2FnZSk7XG4gICAgfVxuICAgIGlmIChxdWVyeVJlc3VsdC5lcnJvciAhPT0gdW5kZWZpbmVkICYmIHF1ZXJ5UmVzdWx0LmVycm9yICE9PSBcIlwiKSB7XG4gICAgICAgIGlmIChxdWVyeVJlc3VsdC5lcnJvciA9PT0gbWF0c1R5cGVzLk1lc3NhZ2VzLk5PX0RBVEFfRk9VTkQpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgTk9UIGFuIGVycm9yIGp1c3QgYSBubyBkYXRhIGNvbmRpdGlvblxuICAgICAgICAgICAgZGF0YUZvdW5kRm9yQ3VydmUgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYW4gZXJyb3IgcmV0dXJuZWQgYnkgdGhlIG15c3FsIGRhdGFiYXNlXG4gICAgICAgICAgICBlcnJvciArPSBcIkVycm9yIGZyb20gdmVyaWZpY2F0aW9uIHF1ZXJ5OiA8YnI+XCIgKyBxdWVyeVJlc3VsdC5lcnJvciArIFwiPGJyPiBxdWVyeTogPGJyPlwiICsgc3RhdGVtZW50ICsgXCI8YnI+XCI7XG4gICAgICAgICAgICB0aHJvdyAobmV3IEVycm9yKGVycm9yKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcG9zdFF1ZXJ5U3RhcnRNb21lbnQgPSBtb21lbnQoKTtcblxuICAgIC8vIHNldCBjdXJ2ZSBhbm5vdGF0aW9uIHRvIGJlIHRoZSBjdXJ2ZSBtZWFuIC0tIG1heSBiZSByZWNhbGN1bGF0ZWQgbGF0ZXJcbiAgICAvLyBhbHNvIHBhc3MgcHJldmlvdXNseSBjYWxjdWxhdGVkIGF4aXMgc3RhdHMgdG8gY3VydmUgb3B0aW9uc1xuICAgIGNvbnN0IG1lYW4gPSBkLmdsb2Jfc3RhdHMubWVhbjtcbiAgICBjb25zdCBhbm5vdGF0aW9uID0gbWVhbiA9PT0gdW5kZWZpbmVkID8gbGFiZWwgKyBcIi0gbWVhbiA9IE5hTlwiIDogbGFiZWwgKyBcIi0gbWVhbiA9IFwiICsgbWVhbi50b1ByZWNpc2lvbig0KTtcbiAgICBjdXJ2ZVsnYW5ub3RhdGlvbiddID0gYW5ub3RhdGlvbjtcbiAgICBjdXJ2ZVsneG1pbiddID0gZC54bWluO1xuICAgIGN1cnZlWyd4bWF4J10gPSBkLnhtYXg7XG4gICAgY3VydmVbJ3ltaW4nXSA9IGQueW1pbjtcbiAgICBjdXJ2ZVsneW1heCddID0gZC55bWF4O1xuICAgIGN1cnZlWyd6bWluJ10gPSBkLnptaW47XG4gICAgY3VydmVbJ3ptYXgnXSA9IGQuem1heDtcbiAgICBjdXJ2ZVsneEF4aXNLZXknXSA9IHhBeGlzUGFyYW07XG4gICAgY3VydmVbJ3lBeGlzS2V5J10gPSB5QXhpc1BhcmFtO1xuICAgIGNvbnN0IGNPcHRpb25zID0gbWF0c0RhdGFDdXJ2ZU9wc1V0aWxzLmdlbmVyYXRlQ29udG91ckN1cnZlT3B0aW9ucyhjdXJ2ZSwgYXhpc01hcCwgZCk7ICAvLyBnZW5lcmF0ZSBwbG90IHdpdGggZGF0YSwgY3VydmUgYW5ub3RhdGlvbiwgYXhpcyBsYWJlbHMsIGV0Yy5cbiAgICBkYXRhc2V0LnB1c2goY09wdGlvbnMpO1xuICAgIHZhciBwb3N0UXVlcnlGaW5pc2hNb21lbnQgPSBtb21lbnQoKTtcbiAgICBkYXRhUmVxdWVzdHNbXCJwb3N0IGRhdGEgcmV0cmlldmFsIChxdWVyeSkgcHJvY2VzcyB0aW1lIC0gXCIgKyBjdXJ2ZS5sYWJlbF0gPSB7XG4gICAgICAgIGJlZ2luOiBwb3N0UXVlcnlTdGFydE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgZmluaXNoOiBwb3N0UXVlcnlGaW5pc2hNb21lbnQuZm9ybWF0KCksXG4gICAgICAgIGR1cmF0aW9uOiBtb21lbnQuZHVyYXRpb24ocG9zdFF1ZXJ5RmluaXNoTW9tZW50LmRpZmYocG9zdFF1ZXJ5U3RhcnRNb21lbnQpKS5hc1NlY29uZHMoKSArICcgc2Vjb25kcydcbiAgICB9O1xuXG4gICAgLy8gcHJvY2VzcyB0aGUgZGF0YSByZXR1cm5lZCBieSB0aGUgcXVlcnlcbiAgICBjb25zdCBjdXJ2ZUluZm9QYXJhbXMgPSB7XCJjdXJ2ZVwiOiBjdXJ2ZXMsIFwiYXhpc01hcFwiOiBheGlzTWFwfTtcbiAgICBjb25zdCBib29ra2VlcGluZ1BhcmFtcyA9IHtcImRhdGFSZXF1ZXN0c1wiOiBkYXRhUmVxdWVzdHMsIFwidG90YWxQcm9jZXNzaW5nU3RhcnRcIjogdG90YWxQcm9jZXNzaW5nU3RhcnR9O1xuICAgIHZhciByZXN1bHQgPSBtYXRzRGF0YVByb2Nlc3NVdGlscy5wcm9jZXNzRGF0YUNvbnRvdXIoZGF0YXNldCwgY3VydmVJbmZvUGFyYW1zLCBwbG90UGFyYW1zLCBib29ra2VlcGluZ1BhcmFtcyk7XG4gICAgcGxvdEZ1bmN0aW9uKHJlc3VsdCk7XG59OyIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkgQ29sb3JhZG8gU3RhdGUgVW5pdmVyc2l0eSBhbmQgUmVnZW50cyBvZiB0aGUgVW5pdmVyc2l0eSBvZiBDb2xvcmFkby4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqL1xuXG5pbXBvcnQge21hdHNDb2xsZWN0aW9uc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNUeXBlc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVF1ZXJ5VXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YURpZmZVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhQ3VydmVPcHNVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhUHJvY2Vzc1V0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bW9tZW50fSBmcm9tICdtZXRlb3IvbW9tZW50anM6bW9tZW50J1xuXG5kYXRhQ29udG91ckRpZmYgPSBmdW5jdGlvbiAocGxvdFBhcmFtcywgcGxvdEZ1bmN0aW9uKSB7XG4gICAgLy8gaW5pdGlhbGl6ZSB2YXJpYWJsZXMgY29tbW9uIHRvIGFsbCBjdXJ2ZXNcbiAgICBjb25zdCBtYXRjaGluZyA9IHBsb3RQYXJhbXNbJ3Bsb3RBY3Rpb24nXSA9PT0gbWF0c1R5cGVzLlBsb3RBY3Rpb25zLm1hdGNoZWQ7XG4gICAgY29uc3QgcGxvdFR5cGUgPSBtYXRzVHlwZXMuUGxvdFR5cGVzLmNvbnRvdXJEaWZmO1xuICAgIHZhciBkYXRhUmVxdWVzdHMgPSB7fTsgLy8gdXNlZCB0byBzdG9yZSBkYXRhIHF1ZXJpZXNcbiAgICB2YXIgZGF0YUZvdW5kRm9yQ3VydmUgPSB0cnVlO1xuICAgIHZhciB0b3RhbFByb2Nlc3NpbmdTdGFydCA9IG1vbWVudCgpO1xuICAgIHZhciBkYXRlUmFuZ2UgPSBtYXRzRGF0YVV0aWxzLmdldERhdGVSYW5nZShwbG90UGFyYW1zLmRhdGVzKTtcbiAgICB2YXIgZnJvbVNlY3MgPSBkYXRlUmFuZ2UuZnJvbVNlY29uZHM7XG4gICAgdmFyIHRvU2VjcyA9IGRhdGVSYW5nZS50b1NlY29uZHM7XG4gICAgdmFyIGVycm9yID0gXCJcIjtcbiAgICB2YXIgY3VydmVzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShwbG90UGFyYW1zLmN1cnZlcykpO1xuICAgIHZhciBjdXJ2ZXNMZW5ndGggPSBjdXJ2ZXMubGVuZ3RoO1xuICAgIGlmIChjdXJ2ZXNMZW5ndGggIT09IDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSU5GTzogIFRoZXJlIG11c3QgYmUgdHdvIGFkZGVkIGN1cnZlcy5cIik7XG4gICAgfVxuICAgIGlmIChjdXJ2ZXNbMF1bJ3gtYXhpcy1wYXJhbWV0ZXInXSAhPT0gY3VydmVzWzFdWyd4LWF4aXMtcGFyYW1ldGVyJ10gfHwgY3VydmVzWzBdWyd5LWF4aXMtcGFyYW1ldGVyJ10gIT09IGN1cnZlc1sxXVsneS1heGlzLXBhcmFtZXRlciddKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIklORk86ICBUaGUgeC1heGlzLXBhcmFtZXRlciBhbmQgeS1heGlzLXBhcmFtZXRlciBtdXN0IGJlIGNvbnNpc3RlbnQgYWNyb3NzIGJvdGggY3VydmVzLlwiKTtcbiAgICB9XG4gICAgdmFyIGRhdGFzZXQgPSBbXTtcbiAgICB2YXIgYXhpc01hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKHZhciBjdXJ2ZUluZGV4ID0gMDsgY3VydmVJbmRleCA8IGN1cnZlc0xlbmd0aDsgY3VydmVJbmRleCsrKSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgdmFyaWFibGVzIHNwZWNpZmljIHRvIGVhY2ggY3VydmVcbiAgICAgICAgdmFyIGN1cnZlID0gY3VydmVzW2N1cnZlSW5kZXhdO1xuICAgICAgICB2YXIgbGFiZWwgPSBjdXJ2ZVsnbGFiZWwnXTtcbiAgICAgICAgdmFyIHhBeGlzUGFyYW0gPSBjdXJ2ZVsneC1heGlzLXBhcmFtZXRlciddO1xuICAgICAgICB2YXIgeUF4aXNQYXJhbSA9IGN1cnZlWyd5LWF4aXMtcGFyYW1ldGVyJ107XG4gICAgICAgIHZhciB4VmFsQ2xhdXNlID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd4LWF4aXMtcGFyYW1ldGVyJ30pLm9wdGlvbnNNYXBbeEF4aXNQYXJhbV07XG4gICAgICAgIHZhciB5VmFsQ2xhdXNlID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd5LWF4aXMtcGFyYW1ldGVyJ30pLm9wdGlvbnNNYXBbeUF4aXNQYXJhbV07XG4gICAgICAgIHZhciBkYXRhU291cmNlU3RyID0gY3VydmVbJ2RhdGEtc291cmNlJ107XG4gICAgICAgIHZhciBkYXRhX3NvdXJjZSA9IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnZGF0YS1zb3VyY2UnfSkub3B0aW9uc01hcFtjdXJ2ZVsnZGF0YS1zb3VyY2UnXV1bMF07XG4gICAgICAgIHZhciByZWdpb25TdHIgPSBjdXJ2ZVsncmVnaW9uJ107XG4gICAgICAgIHZhciByZWdpb24gPSBPYmplY3Qua2V5cyhtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAncmVnaW9uJ30pLnZhbHVlc01hcFtrZXldID09PSByZWdpb25TdHIpO1xuICAgICAgICB2YXIgc291cmNlID0gY3VydmVbJ3RydXRoJ107XG4gICAgICAgIHZhciBzb3VyY2VTdHIgPSBcIlwiO1xuICAgICAgICBpZiAoc291cmNlICE9PSBcIkFsbFwiKSB7XG4gICAgICAgICAgICBzb3VyY2VTdHIgPSBcIl9cIiArIHNvdXJjZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2NhbGVTdHIgPSBjdXJ2ZVsnc2NhbGUnXTtcbiAgICAgICAgdmFyIHNjYWxlID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzY2FsZSd9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnc2NhbGUnfSkudmFsdWVzTWFwW2tleV0gPT09IHNjYWxlU3RyKTtcbiAgICAgICAgdmFyIHN0YXRpc3RpY1NlbGVjdCA9IGN1cnZlWydzdGF0aXN0aWMnXTtcbiAgICAgICAgdmFyIHN0YXRpc3RpY09wdGlvbnNNYXAgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3N0YXRpc3RpYyd9LCB7b3B0aW9uc01hcDogMX0pWydvcHRpb25zTWFwJ107XG4gICAgICAgIHZhciBzdGF0aXN0aWMgPSBzdGF0aXN0aWNPcHRpb25zTWFwW3N0YXRpc3RpY1NlbGVjdF1bMF07XG4gICAgICAgIHZhciB2YWxpZFRpbWVDbGF1c2UgPSBcIlwiO1xuICAgICAgICB2YXIgdGhyZXNob2xkQ2xhdXNlID0gXCJcIjtcbiAgICAgICAgdmFyIGZvcmVjYXN0TGVuZ3RoQ2xhdXNlID0gXCJcIjtcbiAgICAgICAgdmFyIGRhdGVDbGF1c2UgPSBcIlwiO1xuICAgICAgICBpZiAoeEF4aXNQYXJhbSAhPT0gJ0Zjc3QgbGVhZCB0aW1lJyAmJiB5QXhpc1BhcmFtICE9PSAnRmNzdCBsZWFkIHRpbWUnKSB7XG4gICAgICAgICAgICB2YXIgZm9yZWNhc3RMZW5ndGggPSBjdXJ2ZVsnZm9yZWNhc3QtbGVuZ3RoJ107XG4gICAgICAgICAgICBmb3JlY2FzdExlbmd0aENsYXVzZSA9IFwiYW5kIG0wLmZjc3RfbGVuID0gXCIgKyBmb3JlY2FzdExlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeEF4aXNQYXJhbSAhPT0gJ1RocmVzaG9sZCcgJiYgeUF4aXNQYXJhbSAhPT0gJ1RocmVzaG9sZCcpIHtcbiAgICAgICAgICAgIHZhciB0aHJlc2hvbGRTdHIgPSBjdXJ2ZVsndGhyZXNob2xkJ107XG4gICAgICAgICAgICB2YXIgdGhyZXNob2xkID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0aHJlc2hvbGQnfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3RocmVzaG9sZCd9KS52YWx1ZXNNYXBba2V5XSA9PT0gdGhyZXNob2xkU3RyKTtcbiAgICAgICAgICAgIHRocmVzaG9sZCA9IHRocmVzaG9sZCAqIDAuMDE7XG4gICAgICAgICAgICB0aHJlc2hvbGRDbGF1c2UgPSBcImFuZCBtMC50cnNoID0gXCIgKyB0aHJlc2hvbGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHhBeGlzUGFyYW0gIT09ICdWYWxpZCBVVEMgaG91cicgJiYgeUF4aXNQYXJhbSAhPT0gJ1ZhbGlkIFVUQyBob3VyJykge1xuICAgICAgICAgICAgdmFyIHZhbGlkVGltZXMgPSBjdXJ2ZVsndmFsaWQtdGltZSddID09PSB1bmRlZmluZWQgPyBbXSA6IGN1cnZlWyd2YWxpZC10aW1lJ107XG4gICAgICAgICAgICBpZiAodmFsaWRUaW1lcy5sZW5ndGggPiAwICYmIHZhbGlkVGltZXMgIT09IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnVudXNlZCkge1xuICAgICAgICAgICAgICAgIHZhbGlkVGltZUNsYXVzZSA9IFwiIGFuZCAgbTAudGltZSUoMjQqMzYwMCkvMzYwMCBJTihcIiArIHZhbGlkVGltZXMgKyBcIilcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoKHhBeGlzUGFyYW0gPT09ICdJbml0IERhdGUnIHx8IHlBeGlzUGFyYW0gPT09ICdJbml0IERhdGUnKSAmJiAoeEF4aXNQYXJhbSAhPT0gJ1ZhbGlkIERhdGUnICYmIHlBeGlzUGFyYW0gIT09ICdWYWxpZCBEYXRlJykpIHtcbiAgICAgICAgICAgIGRhdGVDbGF1c2UgPSBcIm0wLnRpbWUtbTAuZmNzdF9sZW4qMzYwMFwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0ZUNsYXVzZSA9IFwibTAudGltZVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZm9yIHR3byBjb250b3VycyBpdCdzIGZhc3RlciB0byBqdXN0IHRha2UgY2FyZSBvZiBtYXRjaGluZyBpbiB0aGUgcXVlcnlcbiAgICAgICAgdmFyIG1hdGNoTW9kZWwgPSBcIlwiO1xuICAgICAgICB2YXIgbWF0Y2hEYXRlcyA9IFwiXCI7XG4gICAgICAgIHZhciBtYXRjaFRocmVzaG9sZENsYXVzZSA9IFwiXCI7XG4gICAgICAgIHZhciBtYXRjaFZhbGlkVGltZUNsYXVzZSA9IFwiXCI7XG4gICAgICAgIHZhciBtYXRjaEZvcmVjYXN0TGVuZ3RoQ2xhdXNlID0gXCJcIjtcbiAgICAgICAgdmFyIG1hdGNoQ2xhdXNlID0gXCJcIjtcbiAgICAgICAgaWYgKG1hdGNoaW5nKSB7XG4gICAgICAgICAgICBjb25zdCBvdGhlckN1cnZlSW5kZXggPSBjdXJ2ZUluZGV4ID09PSAwID8gMSA6IDA7XG4gICAgICAgICAgICBjb25zdCBvdGhlck1vZGVsID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdkYXRhLXNvdXJjZSd9KS5vcHRpb25zTWFwW2N1cnZlc1tvdGhlckN1cnZlSW5kZXhdWydkYXRhLXNvdXJjZSddXVswXTtcbiAgICAgICAgICAgIGNvbnN0IG90aGVyUmVnaW9uID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdyZWdpb24nfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KS52YWx1ZXNNYXBba2V5XSA9PT0gY3VydmVzW290aGVyQ3VydmVJbmRleF1bJ3JlZ2lvbiddKTtcblxuICAgICAgICAgICAgbWF0Y2hNb2RlbCA9IFwiLCBcIiArIG90aGVyTW9kZWwgKyBcIl9cIiArIG90aGVyUmVnaW9uICsgXCIgYXMgYTBcIjtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoRGF0ZUNsYXVzZSA9IGRhdGVDbGF1c2Uuc3BsaXQoJ20wJykuam9pbignYTAnKTtcbiAgICAgICAgICAgIG1hdGNoRGF0ZXMgPSBcImFuZCBcIiArIG1hdGNoRGF0ZUNsYXVzZSArIFwiID49ICdcIiArIGZyb21TZWNzICsgXCInIGFuZCBcIiArIG1hdGNoRGF0ZUNsYXVzZSArIFwiIDw9ICdcIiArIHRvU2VjcyArIFwiJ1wiO1xuICAgICAgICAgICAgbWF0Y2hDbGF1c2UgPSBcImFuZCBtMC50aW1lID0gYTAudGltZVwiO1xuXG4gICAgICAgICAgICBpZiAoeEF4aXNQYXJhbSAhPT0gJ0Zjc3QgbGVhZCB0aW1lJyAmJiB5QXhpc1BhcmFtICE9PSAnRmNzdCBsZWFkIHRpbWUnKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoRm9yZWNhc3RMZW5ndGggPSBjdXJ2ZXNbb3RoZXJDdXJ2ZUluZGV4XVsnZm9yZWNhc3QtbGVuZ3RoJ107XG4gICAgICAgICAgICAgICAgbWF0Y2hGb3JlY2FzdExlbmd0aENsYXVzZSA9IFwiYW5kIGEwLmZjc3RfbGVuID0gXCIgKyBtYXRjaEZvcmVjYXN0TGVuZ3RoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXRjaEZvcmVjYXN0TGVuZ3RoQ2xhdXNlID0gXCJhbmQgbTAuZmNzdF9sZW4gPSBhMC5mY3N0X2xlblwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHhBeGlzUGFyYW0gIT09ICdUaHJlc2hvbGQnICYmIHlBeGlzUGFyYW0gIT09ICdUaHJlc2hvbGQnKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoVGhyZXNob2xkID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0aHJlc2hvbGQnfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3RocmVzaG9sZCd9KS52YWx1ZXNNYXBba2V5XSA9PT0gY3VydmVzW290aGVyQ3VydmVJbmRleF1bJ3RocmVzaG9sZCddKTtcbiAgICAgICAgICAgICAgICBtYXRjaFRocmVzaG9sZENsYXVzZSA9IFwiYW5kIGEwLnRocmVzaCA9IFwiICsgbWF0Y2hUaHJlc2hvbGQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1hdGNoVGhyZXNob2xkQ2xhdXNlID0gXCJhbmQgbTAudGhyZXNoID0gYTAudGhyZXNoXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoeEF4aXNQYXJhbSAhPT0gJ1ZhbGlkIFVUQyBob3VyJyAmJiB5QXhpc1BhcmFtICE9PSAnVmFsaWQgVVRDIGhvdXInKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoVmFsaWRUaW1lcyA9IGN1cnZlc1tvdGhlckN1cnZlSW5kZXhdWyd2YWxpZC10aW1lJ10gPT09IHVuZGVmaW5lZCA/IFtdIDogY3VydmVzW290aGVyQ3VydmVJbmRleF1bJ3ZhbGlkLXRpbWUnXTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hWYWxpZFRpbWVzLmxlbmd0aCA+IDAgJiYgbWF0Y2hWYWxpZFRpbWVzICE9PSBtYXRzVHlwZXMuSW5wdXRUeXBlcy51bnVzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hWYWxpZFRpbWVDbGF1c2UgPSBcIiBhbmQgYTAudGltZSUoMjQqMzYwMCkvMzYwMCBJTihcIiArIG1hdGNoVmFsaWRUaW1lcyArIFwiKVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZvciBjb250b3VycywgdGhpcyBmdW5jdGlvbnMgYXMgdGhlIGNvbG9yYmFyIGxhYmVsLlxuICAgICAgICBjdXJ2ZXNbY3VydmVJbmRleF1bJ3VuaXRLZXknXSA9IHN0YXRpc3RpY09wdGlvbnNNYXBbc3RhdGlzdGljU2VsZWN0XVsxXTtcblxuICAgICAgICB2YXIgZDtcbiAgICAgICAgLy8gdGhpcyBpcyBhIGRhdGFiYXNlIGRyaXZlbiBjdXJ2ZSwgbm90IGEgZGlmZmVyZW5jZSBjdXJ2ZVxuICAgICAgICAvLyBwcmVwYXJlIHRoZSBxdWVyeSBmcm9tIHRoZSBhYm92ZSBwYXJhbWV0ZXJzXG4gICAgICAgIHZhciBzdGF0ZW1lbnQgPSBcInt7eFZhbENsYXVzZX19IFwiICtcbiAgICAgICAgICAgIFwie3t5VmFsQ2xhdXNlfX0gXCIgK1xuICAgICAgICAgICAgXCJjb3VudChkaXN0aW5jdCB7e2RhdGVDbGF1c2V9fSkgYXMgTl90aW1lcywgXCIgK1xuICAgICAgICAgICAgXCJtaW4oe3tkYXRlQ2xhdXNlfX0pIGFzIG1pbl9zZWNzLCBcIiArXG4gICAgICAgICAgICBcIm1heCh7e2RhdGVDbGF1c2V9fSkgYXMgbWF4X3NlY3MsIFwiICtcbiAgICAgICAgICAgIFwie3tzdGF0aXN0aWN9fSBcIiArXG4gICAgICAgICAgICBcImZyb20ge3tkYXRhX3NvdXJjZX19IGFzIG0we3ttYXRjaE1vZGVsfX0gXCIgK1xuICAgICAgICAgICAgXCJ3aGVyZSAxPTEgXCIgK1xuICAgICAgICAgICAgXCJ7e21hdGNoQ2xhdXNlfX0gXCIgK1xuICAgICAgICAgICAgXCJhbmQge3tkYXRlQ2xhdXNlfX0gPj0gJ3t7ZnJvbVNlY3N9fScgXCIgK1xuICAgICAgICAgICAgXCJhbmQge3tkYXRlQ2xhdXNlfX0gPD0gJ3t7dG9TZWNzfX0nIFwiICtcbiAgICAgICAgICAgIFwie3ttYXRjaERhdGVzfX0gXCIgK1xuICAgICAgICAgICAgXCJhbmQgbTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24gPiAwIFwiICtcbiAgICAgICAgICAgIFwie3t0aHJlc2hvbGRDbGF1c2V9fSBcIiArXG4gICAgICAgICAgICBcInt7bWF0Y2hUaHJlc2hvbGRDbGF1c2V9fSBcIiArXG4gICAgICAgICAgICBcInt7dmFsaWRUaW1lQ2xhdXNlfX0gXCIgK1xuICAgICAgICAgICAgXCJ7e21hdGNoVmFsaWRUaW1lQ2xhdXNlfX0gXCIgK1xuICAgICAgICAgICAgXCJ7e2ZvcmVjYXN0TGVuZ3RoQ2xhdXNlfX0gXCIgK1xuICAgICAgICAgICAgXCJ7e21hdGNoRm9yZWNhc3RMZW5ndGhDbGF1c2V9fSBcIiArXG4gICAgICAgICAgICBcImdyb3VwIGJ5IHhWYWwseVZhbCBcIiArXG4gICAgICAgICAgICBcIm9yZGVyIGJ5IHhWYWwseVZhbFwiICtcbiAgICAgICAgICAgIFwiO1wiO1xuXG4gICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3hWYWxDbGF1c2V9fScsIHhWYWxDbGF1c2UpO1xuICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t5VmFsQ2xhdXNlfX0nLCB5VmFsQ2xhdXNlKTtcbiAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZGF0YV9zb3VyY2V9fScsIGRhdGFfc291cmNlICsgJ18nICsgc2NhbGUgKyBzb3VyY2VTdHIgKyAnXycgKyByZWdpb24pO1xuICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3ttYXRjaE1vZGVsfX0nLCBtYXRjaE1vZGVsKTtcbiAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7c3RhdGlzdGljfX0nLCBzdGF0aXN0aWMpO1xuICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t0aHJlc2hvbGR9fScsIHRocmVzaG9sZCk7XG4gICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2Zyb21TZWNzfX0nLCBmcm9tU2Vjcyk7XG4gICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3RvU2Vjc319JywgdG9TZWNzKTtcbiAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7bWF0Y2hEYXRlc319JywgbWF0Y2hEYXRlcyk7XG4gICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e21hdGNoQ2xhdXNlfX0nLCBtYXRjaENsYXVzZSk7XG4gICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3RocmVzaG9sZENsYXVzZX19JywgdGhyZXNob2xkQ2xhdXNlKTtcbiAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7bWF0Y2hUaHJlc2hvbGRDbGF1c2V9fScsIG1hdGNoVGhyZXNob2xkQ2xhdXNlKTtcbiAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7Zm9yZWNhc3RMZW5ndGhDbGF1c2V9fScsIGZvcmVjYXN0TGVuZ3RoQ2xhdXNlKTtcbiAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7bWF0Y2hGb3JlY2FzdExlbmd0aENsYXVzZX19JywgbWF0Y2hGb3JlY2FzdExlbmd0aENsYXVzZSk7XG4gICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3ZhbGlkVGltZUNsYXVzZX19JywgdmFsaWRUaW1lQ2xhdXNlKTtcbiAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7bWF0Y2hWYWxpZFRpbWVDbGF1c2V9fScsIG1hdGNoVmFsaWRUaW1lQ2xhdXNlKTtcbiAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnNwbGl0KCd7e2RhdGVDbGF1c2V9fScpLmpvaW4oZGF0ZUNsYXVzZSk7XG4gICAgICAgIGRhdGFSZXF1ZXN0c1tjdXJ2ZS5sYWJlbF0gPSBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgLy8gbWF0aCBpcyBkb25lIG9uIGZvcmVjYXN0TGVuZ3RoIGxhdGVyIG9uIC0tIHNldCBhbGwgYW5hbHlzZXMgdG8gMFxuICAgICAgICBpZiAoZm9yZWNhc3RMZW5ndGggPT09IFwiLTk5XCIpIHtcbiAgICAgICAgICAgIGZvcmVjYXN0TGVuZ3RoID0gXCIwXCI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcXVlcnlSZXN1bHQ7XG4gICAgICAgIHZhciBzdGFydE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICB2YXIgZmluaXNoTW9tZW50O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gc2VuZCB0aGUgcXVlcnkgc3RhdGVtZW50IHRvIHRoZSBxdWVyeSBmdW5jdGlvblxuICAgICAgICAgICAgcXVlcnlSZXN1bHQgPSBtYXRzRGF0YVF1ZXJ5VXRpbHMucXVlcnlEQkNvbnRvdXIoc3VtUG9vbCwgc3RhdGVtZW50KTtcbiAgICAgICAgICAgIGZpbmlzaE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgZGF0YVJlcXVlc3RzW1wiZGF0YSByZXRyaWV2YWwgKHF1ZXJ5KSB0aW1lIC0gXCIgKyBjdXJ2ZS5sYWJlbF0gPSB7XG4gICAgICAgICAgICAgICAgYmVnaW46IHN0YXJ0TW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgIGZpbmlzaDogZmluaXNoTW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBtb21lbnQuZHVyYXRpb24oZmluaXNoTW9tZW50LmRpZmYoc3RhcnRNb21lbnQpKS5hc1NlY29uZHMoKSArIFwiIHNlY29uZHNcIixcbiAgICAgICAgICAgICAgICByZWNvcmRDb3VudDogcXVlcnlSZXN1bHQuZGF0YS54VGV4dE91dHB1dC5sZW5ndGhcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBnZXQgdGhlIGRhdGEgYmFjayBmcm9tIHRoZSBxdWVyeVxuICAgICAgICAgICAgZCA9IHF1ZXJ5UmVzdWx0LmRhdGE7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYW4gZXJyb3IgcHJvZHVjZWQgYnkgYSBidWcgaW4gdGhlIHF1ZXJ5IGZ1bmN0aW9uLCBub3QgYW4gZXJyb3IgcmV0dXJuZWQgYnkgdGhlIG15c3FsIGRhdGFiYXNlXG4gICAgICAgICAgICBlLm1lc3NhZ2UgPSBcIkVycm9yIGluIHF1ZXJ5REI6IFwiICsgZS5tZXNzYWdlICsgXCIgZm9yIHN0YXRlbWVudDogXCIgKyBzdGF0ZW1lbnQ7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocXVlcnlSZXN1bHQuZXJyb3IgIT09IHVuZGVmaW5lZCAmJiBxdWVyeVJlc3VsdC5lcnJvciAhPT0gXCJcIikge1xuICAgICAgICAgICAgaWYgKHF1ZXJ5UmVzdWx0LmVycm9yID09PSBtYXRzVHlwZXMuTWVzc2FnZXMuTk9fREFUQV9GT1VORCkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgTk9UIGFuIGVycm9yIGp1c3QgYSBubyBkYXRhIGNvbmRpdGlvblxuICAgICAgICAgICAgICAgIGRhdGFGb3VuZEZvckN1cnZlID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgYW4gZXJyb3IgcmV0dXJuZWQgYnkgdGhlIG15c3FsIGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgZXJyb3IgKz0gXCJFcnJvciBmcm9tIHZlcmlmaWNhdGlvbiBxdWVyeTogPGJyPlwiICsgcXVlcnlSZXN1bHQuZXJyb3IgKyBcIjxicj4gcXVlcnk6IDxicj5cIiArIHN0YXRlbWVudCArIFwiPGJyPlwiO1xuICAgICAgICAgICAgICAgIHRocm93IChuZXcgRXJyb3IoZXJyb3IpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwb3N0UXVlcnlTdGFydE1vbWVudCA9IG1vbWVudCgpO1xuXG4gICAgICAgIC8vIHNldCBjdXJ2ZSBhbm5vdGF0aW9uIHRvIGJlIHRoZSBjdXJ2ZSBtZWFuIC0tIG1heSBiZSByZWNhbGN1bGF0ZWQgbGF0ZXJcbiAgICAgICAgLy8gYWxzbyBwYXNzIHByZXZpb3VzbHkgY2FsY3VsYXRlZCBheGlzIHN0YXRzIHRvIGN1cnZlIG9wdGlvbnNcbiAgICAgICAgY29uc3QgbWVhbiA9IGQuZ2xvYl9zdGF0cy5tZWFuO1xuICAgICAgICBjb25zdCBhbm5vdGF0aW9uID0gbWVhbiA9PT0gdW5kZWZpbmVkID8gbGFiZWwgKyBcIi0gbWVhbiA9IE5hTlwiIDogbGFiZWwgKyBcIi0gbWVhbiA9IFwiICsgbWVhbi50b1ByZWNpc2lvbig0KTtcbiAgICAgICAgY3VydmVbJ2Fubm90YXRpb24nXSA9IGFubm90YXRpb247XG4gICAgICAgIGN1cnZlWyd4bWluJ10gPSBkLnhtaW47XG4gICAgICAgIGN1cnZlWyd4bWF4J10gPSBkLnhtYXg7XG4gICAgICAgIGN1cnZlWyd5bWluJ10gPSBkLnltaW47XG4gICAgICAgIGN1cnZlWyd5bWF4J10gPSBkLnltYXg7XG4gICAgICAgIGN1cnZlWyd6bWluJ10gPSBkLnptaW47XG4gICAgICAgIGN1cnZlWyd6bWF4J10gPSBkLnptYXg7XG4gICAgICAgIGN1cnZlWyd4QXhpc0tleSddID0geEF4aXNQYXJhbTtcbiAgICAgICAgY3VydmVbJ3lBeGlzS2V5J10gPSB5QXhpc1BhcmFtO1xuICAgICAgICBjb25zdCBjT3B0aW9ucyA9IG1hdHNEYXRhQ3VydmVPcHNVdGlscy5nZW5lcmF0ZUNvbnRvdXJDdXJ2ZU9wdGlvbnMoY3VydmUsIGF4aXNNYXAsIGQpOyAgLy8gZ2VuZXJhdGUgcGxvdCB3aXRoIGRhdGEsIGN1cnZlIGFubm90YXRpb24sIGF4aXMgbGFiZWxzLCBldGMuXG4gICAgICAgIGRhdGFzZXQucHVzaChjT3B0aW9ucyk7XG4gICAgICAgIHZhciBwb3N0UXVlcnlGaW5pc2hNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgZGF0YVJlcXVlc3RzW1wicG9zdCBkYXRhIHJldHJpZXZhbCAocXVlcnkpIHByb2Nlc3MgdGltZSAtIFwiICsgY3VydmUubGFiZWxdID0ge1xuICAgICAgICAgICAgYmVnaW46IHBvc3RRdWVyeVN0YXJ0TW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgZmluaXNoOiBwb3N0UXVlcnlGaW5pc2hNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICBkdXJhdGlvbjogbW9tZW50LmR1cmF0aW9uKHBvc3RRdWVyeUZpbmlzaE1vbWVudC5kaWZmKHBvc3RRdWVyeVN0YXJ0TW9tZW50KSkuYXNTZWNvbmRzKCkgKyAnIHNlY29uZHMnXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gdHVybiB0aGUgdHdvIGNvbnRvdXJzIGludG8gb25lIGRpZmZlcmVuY2UgY29udG91clxuICAgIGRhdGFzZXQgPSBtYXRzRGF0YURpZmZVdGlscy5nZXREYXRhRm9yRGlmZkNvbnRvdXIoZGF0YXNldCk7XG4gICAgcGxvdFBhcmFtcy5jdXJ2ZXMgPSBtYXRzRGF0YVV0aWxzLmdldERpZmZDb250b3VyQ3VydmVQYXJhbXMocGxvdFBhcmFtcy5jdXJ2ZXMpO1xuICAgIGN1cnZlcyA9IHBsb3RQYXJhbXMuY3VydmVzO1xuXG4gICAgLy8gcHJvY2VzcyB0aGUgZGF0YSByZXR1cm5lZCBieSB0aGUgcXVlcnlcbiAgICBjb25zdCBjdXJ2ZUluZm9QYXJhbXMgPSB7XCJjdXJ2ZVwiOiBjdXJ2ZXMsIFwiYXhpc01hcFwiOiBheGlzTWFwfTtcbiAgICBjb25zdCBib29ra2VlcGluZ1BhcmFtcyA9IHtcImRhdGFSZXF1ZXN0c1wiOiBkYXRhUmVxdWVzdHMsIFwidG90YWxQcm9jZXNzaW5nU3RhcnRcIjogdG90YWxQcm9jZXNzaW5nU3RhcnR9O1xuICAgIHZhciByZXN1bHQgPSBtYXRzRGF0YVByb2Nlc3NVdGlscy5wcm9jZXNzRGF0YUNvbnRvdXIoZGF0YXNldCwgY3VydmVJbmZvUGFyYW1zLCBwbG90UGFyYW1zLCBib29ra2VlcGluZ1BhcmFtcyk7XG4gICAgcGxvdEZ1bmN0aW9uKHJlc3VsdCk7XG59OyIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkgQ29sb3JhZG8gU3RhdGUgVW5pdmVyc2l0eSBhbmQgUmVnZW50cyBvZiB0aGUgVW5pdmVyc2l0eSBvZiBDb2xvcmFkby4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqL1xuXG5pbXBvcnQge21hdHNDb2xsZWN0aW9uc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNUeXBlc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVF1ZXJ5VXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YURpZmZVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhQ3VydmVPcHNVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhUHJvY2Vzc1V0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bW9tZW50fSBmcm9tICdtZXRlb3IvbW9tZW50anM6bW9tZW50J1xuXG5kYXRhRGFpbHlNb2RlbEN5Y2xlID0gZnVuY3Rpb24gKHBsb3RQYXJhbXMsIHBsb3RGdW5jdGlvbikge1xuICAgIC8vIGluaXRpYWxpemUgdmFyaWFibGVzIGNvbW1vbiB0byBhbGwgY3VydmVzXG4gICAgY29uc3QgbWF0Y2hpbmcgPSBwbG90UGFyYW1zWydwbG90QWN0aW9uJ10gPT09IG1hdHNUeXBlcy5QbG90QWN0aW9ucy5tYXRjaGVkO1xuICAgIGNvbnN0IHBsb3RUeXBlID0gbWF0c1R5cGVzLlBsb3RUeXBlcy5kYWlseU1vZGVsQ3ljbGU7XG4gICAgY29uc3QgaGFzTGV2ZWxzID0gZmFsc2U7XG4gICAgdmFyIGRhdGFSZXF1ZXN0cyA9IHt9OyAvLyB1c2VkIHRvIHN0b3JlIGRhdGEgcXVlcmllc1xuICAgIHZhciBkYXRhRm91bmRGb3JDdXJ2ZSA9IHRydWU7XG4gICAgdmFyIHRvdGFsUHJvY2Vzc2luZ1N0YXJ0ID0gbW9tZW50KCk7XG4gICAgdmFyIGRhdGVSYW5nZSA9IG1hdHNEYXRhVXRpbHMuZ2V0RGF0ZVJhbmdlKHBsb3RQYXJhbXMuZGF0ZXMpO1xuICAgIHZhciBmcm9tU2VjcyA9IGRhdGVSYW5nZS5mcm9tU2Vjb25kcztcbiAgICB2YXIgdG9TZWNzID0gZGF0ZVJhbmdlLnRvU2Vjb25kcztcbiAgICB2YXIgZXJyb3IgPSBcIlwiO1xuICAgIHZhciBjdXJ2ZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHBsb3RQYXJhbXMuY3VydmVzKSk7XG4gICAgdmFyIGN1cnZlc0xlbmd0aCA9IGN1cnZlcy5sZW5ndGg7XG4gICAgdmFyIGRhdGFzZXQgPSBbXTtcbiAgICB2YXIgdXRjQ3ljbGVTdGFydHMgPSBbXTtcbiAgICB2YXIgYXhpc01hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdmFyIHhtYXggPSAtMSAqIE51bWJlci5NQVhfVkFMVUU7XG4gICAgdmFyIHltYXggPSAtMSAqIE51bWJlci5NQVhfVkFMVUU7XG4gICAgdmFyIHhtaW4gPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIHZhciB5bWluID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgaWRlYWxWYWx1ZXMgPSBbXTtcblxuICAgIGZvciAodmFyIGN1cnZlSW5kZXggPSAwOyBjdXJ2ZUluZGV4IDwgY3VydmVzTGVuZ3RoOyBjdXJ2ZUluZGV4KyspIHtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB2YXJpYWJsZXMgc3BlY2lmaWMgdG8gZWFjaCBjdXJ2ZVxuICAgICAgICB2YXIgY3VydmUgPSBjdXJ2ZXNbY3VydmVJbmRleF07XG4gICAgICAgIHZhciBkaWZmRnJvbSA9IGN1cnZlLmRpZmZGcm9tO1xuICAgICAgICB2YXIgbGFiZWwgPSBjdXJ2ZVsnbGFiZWwnXTtcbiAgICAgICAgdmFyIGRhdGFTb3VyY2VTdHIgPSBjdXJ2ZVsnZGF0YS1zb3VyY2UnXTtcbiAgICAgICAgdmFyIGRhdGFfc291cmNlID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdkYXRhLXNvdXJjZSd9KS5vcHRpb25zTWFwW2N1cnZlWydkYXRhLXNvdXJjZSddXVswXTtcbiAgICAgICAgdmFyIHJlZ2lvblN0ciA9IGN1cnZlWydyZWdpb24nXTtcbiAgICAgICAgdmFyIHJlZ2lvbiA9IE9iamVjdC5rZXlzKG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAncmVnaW9uJ30pLnZhbHVlc01hcCkuZmluZChrZXkgPT4gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdyZWdpb24nfSkudmFsdWVzTWFwW2tleV0gPT09IHJlZ2lvblN0cik7XG4gICAgICAgIHZhciBzb3VyY2UgPSBjdXJ2ZVsndHJ1dGgnXTtcbiAgICAgICAgdmFyIHNvdXJjZVN0ciA9IFwiXCI7XG4gICAgICAgIGlmIChzb3VyY2UgIT09IFwiQWxsXCIpIHtcbiAgICAgICAgICAgIHNvdXJjZVN0ciA9IFwiX1wiICsgc291cmNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY2FsZVN0ciA9IGN1cnZlWydzY2FsZSddO1xuICAgICAgICB2YXIgc2NhbGUgPSBPYmplY3Qua2V5cyhtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3NjYWxlJ30pLnZhbHVlc01hcCkuZmluZChrZXkgPT4gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzY2FsZSd9KS52YWx1ZXNNYXBba2V5XSA9PT0gc2NhbGVTdHIpO1xuICAgICAgICB2YXIgdGhyZXNob2xkU3RyID0gY3VydmVbJ3RocmVzaG9sZCddO1xuICAgICAgICB2YXIgdGhyZXNob2xkID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0aHJlc2hvbGQnfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3RocmVzaG9sZCd9KS52YWx1ZXNNYXBba2V5XSA9PT0gdGhyZXNob2xkU3RyKTtcbiAgICAgICAgdGhyZXNob2xkID0gdGhyZXNob2xkICogMC4wMTtcbiAgICAgICAgdmFyIHN0YXRpc3RpY1NlbGVjdCA9IGN1cnZlWydzdGF0aXN0aWMnXTtcbiAgICAgICAgdmFyIHN0YXRpc3RpY09wdGlvbnNNYXAgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3N0YXRpc3RpYyd9LCB7b3B0aW9uc01hcDogMX0pWydvcHRpb25zTWFwJ107XG4gICAgICAgIHZhciBzdGF0aXN0aWMgPSBzdGF0aXN0aWNPcHRpb25zTWFwW3N0YXRpc3RpY1NlbGVjdF1bMF07XG4gICAgICAgIHZhciB1dGNDeWNsZVN0YXJ0ID0gTnVtYmVyKGN1cnZlWyd1dGMtY3ljbGUtc3RhcnQnXSk7XG4gICAgICAgIHV0Y0N5Y2xlU3RhcnRzW2N1cnZlSW5kZXhdID0gdXRjQ3ljbGVTdGFydDtcbiAgICAgICAgLy8gYXhpc0tleSBpcyB1c2VkIHRvIGRldGVybWluZSB3aGljaCBheGlzIGEgY3VydmUgc2hvdWxkIHVzZS5cbiAgICAgICAgLy8gVGhpcyBheGlzS2V5U2V0IG9iamVjdCBpcyB1c2VkIGxpa2UgYSBzZXQgYW5kIGlmIGEgY3VydmUgaGFzIHRoZSBzYW1lXG4gICAgICAgIC8vIHVuaXRzIChheGlzS2V5KSBpdCB3aWxsIHVzZSB0aGUgc2FtZSBheGlzLlxuICAgICAgICAvLyBUaGUgYXhpcyBudW1iZXIgaXMgYXNzaWduZWQgdG8gdGhlIGF4aXNLZXlTZXQgdmFsdWUsIHdoaWNoIGlzIHRoZSBheGlzS2V5LlxuICAgICAgICB2YXIgYXhpc0tleSA9IHN0YXRpc3RpY09wdGlvbnNNYXBbc3RhdGlzdGljU2VsZWN0XVsxXTtcbiAgICAgICAgY3VydmVzW2N1cnZlSW5kZXhdLmF4aXNLZXkgPSBheGlzS2V5OyAvLyBzdGFzaCB0aGUgYXhpc0tleSB0byB1c2UgaXQgbGF0ZXIgZm9yIGF4aXMgb3B0aW9uc1xuICAgICAgICB2YXIgaWRlYWxWYWwgPSBzdGF0aXN0aWNPcHRpb25zTWFwW3N0YXRpc3RpY1NlbGVjdF1bMl07XG4gICAgICAgIGlmIChpZGVhbFZhbCAhPT0gbnVsbCAmJiBpZGVhbFZhbHVlcy5pbmRleE9mKGlkZWFsVmFsKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGlkZWFsVmFsdWVzLnB1c2goaWRlYWxWYWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGQ7XG4gICAgICAgIGlmIChkaWZmRnJvbSA9PSBudWxsKSB7XG4gICAgICAgICAgICAvLyB0aGlzIGlzIGEgZGF0YWJhc2UgZHJpdmVuIGN1cnZlLCBub3QgYSBkaWZmZXJlbmNlIGN1cnZlXG4gICAgICAgICAgICAvLyBwcmVwYXJlIHRoZSBxdWVyeSBmcm9tIHRoZSBhYm92ZSBwYXJhbWV0ZXJzXG4gICAgICAgICAgICB2YXIgc3RhdGVtZW50ID0gXCJzZWxlY3QgbTAudGltZSBhcyBhdnRpbWUsIFwiICtcbiAgICAgICAgICAgICAgICBcImNvdW50KGRpc3RpbmN0IG0wLnRpbWUpIGFzIE5fdGltZXMsIFwiICtcbiAgICAgICAgICAgICAgICBcIm1pbihtMC50aW1lKSBhcyBtaW5fc2VjcywgXCIgK1xuICAgICAgICAgICAgICAgIFwibWF4KG0wLnRpbWUpIGFzIG1heF9zZWNzLCBcIiArXG4gICAgICAgICAgICAgICAgXCJ7e3N0YXRpc3RpY319IFwiICtcbiAgICAgICAgICAgICAgICBcImZyb20ge3tkYXRhX3NvdXJjZX19IGFzIG0wIFwiICtcbiAgICAgICAgICAgICAgICBcIndoZXJlIDE9MSBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAudGltZSA+PSB7e2Zyb21TZWNzfX0gXCIgK1xuICAgICAgICAgICAgICAgIFwiYW5kIG0wLnRpbWUgPD0ge3t0b1NlY3N9fSBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24gPiAwIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC50cnNoID0ge3t0aHJlc2hvbGR9fSBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAuZmNzdF9sZW4gPCAyNCBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgKG0wLnRpbWUgLSBtMC5mY3N0X2xlbiozNjAwKSUoMjQqMzYwMCkvMzYwMCBJTih7e3V0Y0N5Y2xlU3RhcnR9fSkgXCIgK1xuICAgICAgICAgICAgICAgIFwiZ3JvdXAgYnkgYXZ0aW1lIFwiICtcbiAgICAgICAgICAgICAgICBcIm9yZGVyIGJ5IGF2dGltZVwiICtcbiAgICAgICAgICAgICAgICBcIjtcIjtcblxuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dGhyZXNob2xkfX0nLCB0aHJlc2hvbGQpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZnJvbVNlY3N9fScsIGZyb21TZWNzKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3RvU2Vjc319JywgdG9TZWNzKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2RhdGFfc291cmNlfX0nLCBkYXRhX3NvdXJjZSArICdfJyArIHNjYWxlICsgc291cmNlU3RyICsgJ18nICsgcmVnaW9uKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3N0YXRpc3RpY319Jywgc3RhdGlzdGljKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3V0Y0N5Y2xlU3RhcnR9fScsIHV0Y0N5Y2xlU3RhcnQpO1xuXG4gICAgICAgICAgICBkYXRhUmVxdWVzdHNbY3VydmUubGFiZWxdID0gc3RhdGVtZW50O1xuXG4gICAgICAgICAgICB2YXIgcXVlcnlSZXN1bHQ7XG4gICAgICAgICAgICB2YXIgc3RhcnRNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIHZhciBmaW5pc2hNb21lbnQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIHNlbmQgdGhlIHF1ZXJ5IHN0YXRlbWVudCB0byB0aGUgcXVlcnkgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICBxdWVyeVJlc3VsdCA9IG1hdHNEYXRhUXVlcnlVdGlscy5xdWVyeURCU3BlY2lhbHR5Q3VydmUoc3VtUG9vbCwgc3RhdGVtZW50LCBwbG90VHlwZSwgaGFzTGV2ZWxzKTtcbiAgICAgICAgICAgICAgICBmaW5pc2hNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgICAgICBkYXRhUmVxdWVzdHNbXCJkYXRhIHJldHJpZXZhbCAocXVlcnkpIHRpbWUgLSBcIiArIGN1cnZlLmxhYmVsXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgYmVnaW46IHN0YXJ0TW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgICAgICBmaW5pc2g6IGZpbmlzaE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IG1vbWVudC5kdXJhdGlvbihmaW5pc2hNb21lbnQuZGlmZihzdGFydE1vbWVudCkpLmFzU2Vjb25kcygpICsgXCIgc2Vjb25kc1wiLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRDb3VudDogcXVlcnlSZXN1bHQuZGF0YS54Lmxlbmd0aFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBkYXRhIGJhY2sgZnJvbSB0aGUgcXVlcnlcbiAgICAgICAgICAgICAgICBkID0gcXVlcnlSZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGFuIGVycm9yIHByb2R1Y2VkIGJ5IGEgYnVnIGluIHRoZSBxdWVyeSBmdW5jdGlvbiwgbm90IGFuIGVycm9yIHJldHVybmVkIGJ5IHRoZSBteXNxbCBkYXRhYmFzZVxuICAgICAgICAgICAgICAgIGUubWVzc2FnZSA9IFwiRXJyb3IgaW4gcXVlcnlEQjogXCIgKyBlLm1lc3NhZ2UgKyBcIiBmb3Igc3RhdGVtZW50OiBcIiArIHN0YXRlbWVudDtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC5lcnJvciAhPT0gdW5kZWZpbmVkICYmIHF1ZXJ5UmVzdWx0LmVycm9yICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5UmVzdWx0LmVycm9yID09PSBtYXRzVHlwZXMuTWVzc2FnZXMuTk9fREFUQV9GT1VORCkge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIE5PVCBhbiBlcnJvciBqdXN0IGEgbm8gZGF0YSBjb25kaXRpb25cbiAgICAgICAgICAgICAgICAgICAgZGF0YUZvdW5kRm9yQ3VydmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGFuIGVycm9yIHJldHVybmVkIGJ5IHRoZSBteXNxbCBkYXRhYmFzZVxuICAgICAgICAgICAgICAgICAgICBlcnJvciArPSBcIkVycm9yIGZyb20gdmVyaWZpY2F0aW9uIHF1ZXJ5OiA8YnI+XCIgKyBxdWVyeVJlc3VsdC5lcnJvciArIFwiPGJyPiBxdWVyeTogPGJyPlwiICsgc3RhdGVtZW50ICsgXCI8YnI+XCI7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IChuZXcgRXJyb3IoZXJyb3IpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNldCBheGlzIGxpbWl0cyBiYXNlZCBvbiByZXR1cm5lZCBkYXRhXG4gICAgICAgICAgICB2YXIgcG9zdFF1ZXJ5U3RhcnRNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChkYXRhRm91bmRGb3JDdXJ2ZSkge1xuICAgICAgICAgICAgICAgIHhtaW4gPSB4bWluIDwgZC54bWluID8geG1pbiA6IGQueG1pbjtcbiAgICAgICAgICAgICAgICB4bWF4ID0geG1heCA+IGQueG1heCA/IHhtYXggOiBkLnhtYXg7XG4gICAgICAgICAgICAgICAgeW1pbiA9IHltaW4gPCBkLnltaW4gPyB5bWluIDogZC55bWluO1xuICAgICAgICAgICAgICAgIHltYXggPSB5bWF4ID4gZC55bWF4ID8geW1heCA6IGQueW1heDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYSBkaWZmZXJlbmNlIGN1cnZlXG4gICAgICAgICAgICBjb25zdCBkaWZmUmVzdWx0ID0gbWF0c0RhdGFEaWZmVXRpbHMuZ2V0RGF0YUZvckRpZmZDdXJ2ZShkYXRhc2V0LCBkaWZmRnJvbSwgcGxvdFR5cGUsIGhhc0xldmVscyk7XG4gICAgICAgICAgICBkID0gZGlmZlJlc3VsdC5kYXRhc2V0O1xuICAgICAgICAgICAgeG1pbiA9IHhtaW4gPCBkLnhtaW4gPyB4bWluIDogZC54bWluO1xuICAgICAgICAgICAgeG1heCA9IHhtYXggPiBkLnhtYXggPyB4bWF4IDogZC54bWF4O1xuICAgICAgICAgICAgeW1pbiA9IHltaW4gPCBkLnltaW4gPyB5bWluIDogZC55bWluO1xuICAgICAgICAgICAgeW1heCA9IHltYXggPiBkLnltYXggPyB5bWF4IDogZC55bWF4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2V0IGN1cnZlIGFubm90YXRpb24gdG8gYmUgdGhlIGN1cnZlIG1lYW4gLS0gbWF5IGJlIHJlY2FsY3VsYXRlZCBsYXRlclxuICAgICAgICAvLyBhbHNvIHBhc3MgcHJldmlvdXNseSBjYWxjdWxhdGVkIGF4aXMgc3RhdHMgdG8gY3VydmUgb3B0aW9uc1xuICAgICAgICBjb25zdCBtZWFuID0gZC5zdW0gLyBkLngubGVuZ3RoO1xuICAgICAgICBjb25zdCBhbm5vdGF0aW9uID0gbWVhbiA9PT0gdW5kZWZpbmVkID8gbGFiZWwgKyBcIi0gbWVhbiA9IE5hTlwiIDogbGFiZWwgKyBcIi0gbWVhbiA9IFwiICsgbWVhbi50b1ByZWNpc2lvbig0KTtcbiAgICAgICAgY3VydmVbJ2Fubm90YXRpb24nXSA9IGFubm90YXRpb247XG4gICAgICAgIGN1cnZlWyd4bWluJ10gPSBkLnhtaW47XG4gICAgICAgIGN1cnZlWyd4bWF4J10gPSBkLnhtYXg7XG4gICAgICAgIGN1cnZlWyd5bWluJ10gPSBkLnltaW47XG4gICAgICAgIGN1cnZlWyd5bWF4J10gPSBkLnltYXg7XG4gICAgICAgIGN1cnZlWydheGlzS2V5J10gPSBheGlzS2V5O1xuICAgICAgICBjb25zdCBjT3B0aW9ucyA9IG1hdHNEYXRhQ3VydmVPcHNVdGlscy5nZW5lcmF0ZVNlcmllc0N1cnZlT3B0aW9ucyhjdXJ2ZSwgY3VydmVJbmRleCwgYXhpc01hcCwgZCk7ICAvLyBnZW5lcmF0ZSBwbG90IHdpdGggZGF0YSwgY3VydmUgYW5ub3RhdGlvbiwgYXhpcyBsYWJlbHMsIGV0Yy5cbiAgICAgICAgZGF0YXNldC5wdXNoKGNPcHRpb25zKTtcbiAgICAgICAgdmFyIHBvc3RRdWVyeUZpbmlzaE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICBkYXRhUmVxdWVzdHNbXCJwb3N0IGRhdGEgcmV0cmlldmFsIChxdWVyeSkgcHJvY2VzcyB0aW1lIC0gXCIgKyBjdXJ2ZS5sYWJlbF0gPSB7XG4gICAgICAgICAgICBiZWdpbjogcG9zdFF1ZXJ5U3RhcnRNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICBmaW5pc2g6IHBvc3RRdWVyeUZpbmlzaE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBtb21lbnQuZHVyYXRpb24ocG9zdFF1ZXJ5RmluaXNoTW9tZW50LmRpZmYocG9zdFF1ZXJ5U3RhcnRNb21lbnQpKS5hc1NlY29uZHMoKSArICcgc2Vjb25kcydcbiAgICAgICAgfVxuICAgIH0gIC8vIGVuZCBmb3IgY3VydmVzXG5cbiAgICAvLyBwcm9jZXNzIHRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBxdWVyeVxuICAgIGNvbnN0IGFwcFBhcmFtcyA9IHtcInBsb3RUeXBlXCI6IHBsb3RUeXBlLCBcImhhc0xldmVsc1wiOiBoYXNMZXZlbHMsIFwibWF0Y2hpbmdcIjogbWF0Y2hpbmd9O1xuICAgIGNvbnN0IGN1cnZlSW5mb1BhcmFtcyA9IHtcbiAgICAgICAgXCJjdXJ2ZXNcIjogY3VydmVzLFxuICAgICAgICBcImN1cnZlc0xlbmd0aFwiOiBjdXJ2ZXNMZW5ndGgsXG4gICAgICAgIFwiaWRlYWxWYWx1ZXNcIjogaWRlYWxWYWx1ZXMsXG4gICAgICAgIFwidXRjQ3ljbGVTdGFydHNcIjogdXRjQ3ljbGVTdGFydHMsXG4gICAgICAgIFwiYXhpc01hcFwiOiBheGlzTWFwLFxuICAgICAgICBcInhtYXhcIjogeG1heCxcbiAgICAgICAgXCJ4bWluXCI6IHhtaW5cbiAgICB9O1xuICAgIGNvbnN0IGJvb2trZWVwaW5nUGFyYW1zID0ge1wiZGF0YVJlcXVlc3RzXCI6IGRhdGFSZXF1ZXN0cywgXCJ0b3RhbFByb2Nlc3NpbmdTdGFydFwiOiB0b3RhbFByb2Nlc3NpbmdTdGFydH07XG4gICAgdmFyIHJlc3VsdCA9IG1hdHNEYXRhUHJvY2Vzc1V0aWxzLnByb2Nlc3NEYXRhWFlDdXJ2ZShkYXRhc2V0LCBhcHBQYXJhbXMsIGN1cnZlSW5mb1BhcmFtcywgcGxvdFBhcmFtcywgYm9va2tlZXBpbmdQYXJhbXMpO1xuICAgIHBsb3RGdW5jdGlvbihyZXN1bHQpO1xufTsiLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE5IENvbG9yYWRvIFN0YXRlIFVuaXZlcnNpdHkgYW5kIFJlZ2VudHMgb2YgdGhlIFVuaXZlcnNpdHkgb2YgQ29sb3JhZG8uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKi9cblxuaW1wb3J0IHttYXRzQ29sbGVjdGlvbnN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzVHlwZXN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFRdWVyeVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFEaWZmVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YUN1cnZlT3BzVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVByb2Nlc3NVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21vbWVudH0gZnJvbSAnbWV0ZW9yL21vbWVudGpzOm1vbWVudCdcblxuZGF0YURpZU9mZiA9IGZ1bmN0aW9uIChwbG90UGFyYW1zLCBwbG90RnVuY3Rpb24pIHtcbiAgICAvLyBpbml0aWFsaXplIHZhcmlhYmxlcyBjb21tb24gdG8gYWxsIGN1cnZlc1xuICAgIGNvbnN0IG1hdGNoaW5nID0gcGxvdFBhcmFtc1sncGxvdEFjdGlvbiddID09PSBtYXRzVHlwZXMuUGxvdEFjdGlvbnMubWF0Y2hlZDtcbiAgICBjb25zdCBwbG90VHlwZSA9IG1hdHNUeXBlcy5QbG90VHlwZXMuZGllb2ZmO1xuICAgIGNvbnN0IGhhc0xldmVscyA9IGZhbHNlO1xuICAgIHZhciBkYXRhUmVxdWVzdHMgPSB7fTsgLy8gdXNlZCB0byBzdG9yZSBkYXRhIHF1ZXJpZXNcbiAgICB2YXIgZGF0YUZvdW5kRm9yQ3VydmUgPSB0cnVlO1xuICAgIHZhciB0b3RhbFByb2Nlc3NpbmdTdGFydCA9IG1vbWVudCgpO1xuICAgIHZhciBlcnJvciA9IFwiXCI7XG4gICAgdmFyIGN1cnZlcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGxvdFBhcmFtcy5jdXJ2ZXMpKTtcbiAgICB2YXIgY3VydmVzTGVuZ3RoID0gY3VydmVzLmxlbmd0aDtcbiAgICB2YXIgZGF0YXNldCA9IFtdO1xuICAgIHZhciB1dGNDeWNsZVN0YXJ0cyA9IFtdO1xuICAgIHZhciBheGlzTWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB2YXIgeG1heCA9IC0xICogTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgeW1heCA9IC0xICogTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgeG1pbiA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgdmFyIHltaW4gPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIHZhciBpZGVhbFZhbHVlcyA9IFtdO1xuXG4gICAgZm9yICh2YXIgY3VydmVJbmRleCA9IDA7IGN1cnZlSW5kZXggPCBjdXJ2ZXNMZW5ndGg7IGN1cnZlSW5kZXgrKykge1xuICAgICAgICAvLyBpbml0aWFsaXplIHZhcmlhYmxlcyBzcGVjaWZpYyB0byBlYWNoIGN1cnZlXG4gICAgICAgIHZhciBjdXJ2ZSA9IGN1cnZlc1tjdXJ2ZUluZGV4XTtcbiAgICAgICAgdmFyIGRpZmZGcm9tID0gY3VydmUuZGlmZkZyb207XG4gICAgICAgIHZhciBsYWJlbCA9IGN1cnZlWydsYWJlbCddO1xuICAgICAgICB2YXIgZGF0YV9zb3VyY2UgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ2RhdGEtc291cmNlJ30pLm9wdGlvbnNNYXBbY3VydmVbJ2RhdGEtc291cmNlJ11dWzBdO1xuICAgICAgICB2YXIgcmVnaW9uU3RyID0gY3VydmVbJ3JlZ2lvbiddO1xuICAgICAgICB2YXIgcmVnaW9uID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdyZWdpb24nfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KS52YWx1ZXNNYXBba2V5XSA9PT0gcmVnaW9uU3RyKTtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGN1cnZlWyd0cnV0aCddO1xuICAgICAgICB2YXIgc291cmNlU3RyID0gXCJcIjtcbiAgICAgICAgaWYgKHNvdXJjZSAhPT0gXCJBbGxcIikge1xuICAgICAgICAgICAgc291cmNlU3RyID0gXCJfXCIgKyBzb3VyY2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRocmVzaG9sZFN0ciA9IGN1cnZlWyd0aHJlc2hvbGQnXTtcbiAgICAgICAgdmFyIHRocmVzaG9sZCA9IE9iamVjdC5rZXlzKG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAndGhyZXNob2xkJ30pLnZhbHVlc01hcCkuZmluZChrZXkgPT4gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0aHJlc2hvbGQnfSkudmFsdWVzTWFwW2tleV0gPT09IHRocmVzaG9sZFN0cik7XG4gICAgICAgIHRocmVzaG9sZCA9IHRocmVzaG9sZCAqIDAuMDE7XG4gICAgICAgIHZhciBzdGF0aXN0aWNTZWxlY3QgPSBjdXJ2ZVsnc3RhdGlzdGljJ107XG4gICAgICAgIHZhciBzdGF0aXN0aWNPcHRpb25zTWFwID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzdGF0aXN0aWMnfSwge29wdGlvbnNNYXA6IDF9KVsnb3B0aW9uc01hcCddO1xuICAgICAgICB2YXIgc3RhdGlzdGljID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzBdO1xuICAgICAgICB2YXIgc2NhbGVTdHIgPSBjdXJ2ZVsnc2NhbGUnXTtcbiAgICAgICAgdmFyIHNjYWxlID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzY2FsZSd9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnc2NhbGUnfSkudmFsdWVzTWFwW2tleV0gPT09IHNjYWxlU3RyKTtcbiAgICAgICAgdmFyIGRhdGVSYW5nZSA9IG1hdHNEYXRhVXRpbHMuZ2V0RGF0ZVJhbmdlKGN1cnZlWydjdXJ2ZS1kYXRlcyddKTtcbiAgICAgICAgdmFyIGZyb21TZWNzID0gZGF0ZVJhbmdlLmZyb21TZWNvbmRzO1xuICAgICAgICB2YXIgdG9TZWNzID0gZGF0ZVJhbmdlLnRvU2Vjb25kcztcbiAgICAgICAgdmFyIGZvcmVjYXN0TGVuZ3RoU3RyID0gY3VydmVbJ2RpZW9mZi10eXBlJ107XG4gICAgICAgIHZhciBmb3JlY2FzdExlbmd0aE9wdGlvbnNNYXAgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ2RpZW9mZi10eXBlJ30sIHtvcHRpb25zTWFwOiAxfSlbJ29wdGlvbnNNYXAnXTtcbiAgICAgICAgdmFyIGZvcmVjYXN0TGVuZ3RoID0gZm9yZWNhc3RMZW5ndGhPcHRpb25zTWFwW2ZvcmVjYXN0TGVuZ3RoU3RyXVswXTtcbiAgICAgICAgdmFyIHZhbGlkVGltZXM7XG4gICAgICAgIHZhciB2YWxpZFRpbWVDbGF1c2UgPSBcIlwiO1xuICAgICAgICB2YXIgdXRjQ3ljbGVTdGFydDtcbiAgICAgICAgdmFyIHV0Y0N5Y2xlU3RhcnRDbGF1c2UgPSBcIlwiO1xuICAgICAgICB2YXIgZGF0ZVJhbmdlQ2xhdXNlID0gXCJhbmQgbTAudGltZSA+PSBcIiArIGZyb21TZWNzICsgXCIgYW5kIG0wLnRpbWUgPD0gXCIgKyB0b1NlY3M7XG4gICAgICAgIGlmIChmb3JlY2FzdExlbmd0aCA9PT0gbWF0c1R5cGVzLkZvcmVjYXN0VHlwZXMuZGllb2ZmKSB7XG4gICAgICAgICAgICB2YWxpZFRpbWVzID0gY3VydmVbJ3ZhbGlkLXRpbWUnXSA9PT0gdW5kZWZpbmVkID8gW10gOiBjdXJ2ZVsndmFsaWQtdGltZSddO1xuICAgICAgICAgICAgaWYgKHZhbGlkVGltZXMubGVuZ3RoICE9PSAwICYmIHZhbGlkVGltZXMgIT09IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnVudXNlZCkge1xuICAgICAgICAgICAgICAgIHZhbGlkVGltZUNsYXVzZSA9IFwiYW5kIGZsb29yKChtMC50aW1lKSUoMjQqMzYwMCkvMzYwMCkgSU4oXCIgKyB2YWxpZFRpbWVzICsgXCIpXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZm9yZWNhc3RMZW5ndGggPT09IG1hdHNUeXBlcy5Gb3JlY2FzdFR5cGVzLnV0Y0N5Y2xlKSB7XG4gICAgICAgICAgICB1dGNDeWNsZVN0YXJ0ID0gTnVtYmVyKGN1cnZlWyd1dGMtY3ljbGUtc3RhcnQnXSk7XG4gICAgICAgICAgICB1dGNDeWNsZVN0YXJ0Q2xhdXNlID0gXCJhbmQgKG0wLnRpbWUgLSBtMC5mY3N0X2xlbiozNjAwKSUoMjQqMzYwMCkvMzYwMCBJTihcIiArIHV0Y0N5Y2xlU3RhcnQgKyBcIilcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGVSYW5nZUNsYXVzZSA9IFwiYW5kIChtMC50aW1lIC0gbTAuZmNzdF9sZW4qMzYwMCkgPSBcIiArIGZyb21TZWNzO1xuICAgICAgICB9XG4gICAgICAgIC8vIGF4aXNLZXkgaXMgdXNlZCB0byBkZXRlcm1pbmUgd2hpY2ggYXhpcyBhIGN1cnZlIHNob3VsZCB1c2UuXG4gICAgICAgIC8vIFRoaXMgYXhpc0tleVNldCBvYmplY3QgaXMgdXNlZCBsaWtlIGEgc2V0IGFuZCBpZiBhIGN1cnZlIGhhcyB0aGUgc2FtZVxuICAgICAgICAvLyB1bml0cyAoYXhpc0tleSkgaXQgd2lsbCB1c2UgdGhlIHNhbWUgYXhpcy5cbiAgICAgICAgLy8gVGhlIGF4aXMgbnVtYmVyIGlzIGFzc2lnbmVkIHRvIHRoZSBheGlzS2V5U2V0IHZhbHVlLCB3aGljaCBpcyB0aGUgYXhpc0tleS5cbiAgICAgICAgdmFyIGF4aXNLZXkgPSBzdGF0aXN0aWNPcHRpb25zTWFwW3N0YXRpc3RpY1NlbGVjdF1bMV07XG4gICAgICAgIGN1cnZlc1tjdXJ2ZUluZGV4XS5heGlzS2V5ID0gYXhpc0tleTsgLy8gc3Rhc2ggdGhlIGF4aXNLZXkgdG8gdXNlIGl0IGxhdGVyIGZvciBheGlzIG9wdGlvbnNcbiAgICAgICAgdmFyIGlkZWFsVmFsID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzJdO1xuICAgICAgICBpZiAoaWRlYWxWYWwgIT09IG51bGwgJiYgaWRlYWxWYWx1ZXMuaW5kZXhPZihpZGVhbFZhbCkgPT09IC0xKSB7XG4gICAgICAgICAgICBpZGVhbFZhbHVlcy5wdXNoKGlkZWFsVmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkO1xuICAgICAgICBpZiAoZGlmZkZyb20gPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBhIGRhdGFiYXNlIGRyaXZlbiBjdXJ2ZSwgbm90IGEgZGlmZmVyZW5jZSBjdXJ2ZVxuICAgICAgICAgICAgLy8gcHJlcGFyZSB0aGUgcXVlcnkgZnJvbSB0aGUgYWJvdmUgcGFyYW1ldGVyc1xuICAgICAgICAgICAgdmFyIHN0YXRlbWVudCA9IFwiU0VMRUNUIG0wLmZjc3RfbGVuIEFTIGF2dGltZSwgXCIgK1xuICAgICAgICAgICAgICAgIFwiY291bnQoZGlzdGluY3QgbTAudGltZSkgYXMgTl90aW1lcywgXCIgK1xuICAgICAgICAgICAgICAgIFwibWluKG0wLnRpbWUpIGFzIG1pbl9zZWNzLCBcIiArXG4gICAgICAgICAgICAgICAgXCJtYXgobTAudGltZSkgYXMgbWF4X3NlY3MsIFwiICtcbiAgICAgICAgICAgICAgICBcInt7c3RhdGlzdGljfX0gXCIgK1xuICAgICAgICAgICAgICAgIFwiZnJvbSB7e2RhdGFfc291cmNlfX0gYXMgbTAgXCIgK1xuICAgICAgICAgICAgICAgIFwid2hlcmUgMT0xIFwiICtcbiAgICAgICAgICAgICAgICBcInt7ZGF0ZVJhbmdlQ2xhdXNlfX0gXCIgK1xuICAgICAgICAgICAgICAgIFwiYW5kIG0wLmhpdCttMC5mYSttMC5taXNzK20wLmNuID4gMCBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAudHJzaCA9IHt7dGhyZXNob2xkfX0gXCIgK1xuICAgICAgICAgICAgICAgIFwie3t2YWxpZFRpbWVDbGF1c2V9fSBcIiArXG4gICAgICAgICAgICAgICAgXCJ7e3V0Y0N5Y2xlU3RhcnRDbGF1c2V9fSBcIiArXG4gICAgICAgICAgICAgICAgXCJncm91cCBieSBhdnRpbWUgXCIgK1xuICAgICAgICAgICAgICAgIFwib3JkZXIgYnkgYXZ0aW1lO1wiO1xuXG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3tmcm9tU2Vjc319JywgZnJvbVNlY3MpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dG9TZWNzfX0nLCB0b1NlY3MpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZGF0YV9zb3VyY2V9fScsIGRhdGFfc291cmNlICsgJ18nICsgc2NhbGUgKyBzb3VyY2VTdHIgKyAnXycgKyByZWdpb24pO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7c3RhdGlzdGljfX0nLCBzdGF0aXN0aWMpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dGhyZXNob2xkfX0nLCB0aHJlc2hvbGQpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZGF0ZVJhbmdlQ2xhdXNlfX0nLCBkYXRlUmFuZ2VDbGF1c2UpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dmFsaWRUaW1lQ2xhdXNlfX0nLCB2YWxpZFRpbWVDbGF1c2UpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dXRjQ3ljbGVTdGFydENsYXVzZX19JywgdXRjQ3ljbGVTdGFydENsYXVzZSk7XG4gICAgICAgICAgICBkYXRhUmVxdWVzdHNbY3VydmUubGFiZWxdID0gc3RhdGVtZW50O1xuXG4gICAgICAgICAgICB2YXIgcXVlcnlSZXN1bHQ7XG4gICAgICAgICAgICB2YXIgc3RhcnRNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIHZhciBmaW5pc2hNb21lbnQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIHNlbmQgdGhlIHF1ZXJ5IHN0YXRlbWVudCB0byB0aGUgcXVlcnkgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICBxdWVyeVJlc3VsdCA9IG1hdHNEYXRhUXVlcnlVdGlscy5xdWVyeURCU3BlY2lhbHR5Q3VydmUoc3VtUG9vbCwgc3RhdGVtZW50LCBwbG90VHlwZSwgaGFzTGV2ZWxzKTtcbiAgICAgICAgICAgICAgICBmaW5pc2hNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgICAgICBkYXRhUmVxdWVzdHNbXCJkYXRhIHJldHJpZXZhbCAocXVlcnkpIHRpbWUgLSBcIiArIGN1cnZlLmxhYmVsXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgYmVnaW46IHN0YXJ0TW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgICAgICBmaW5pc2g6IGZpbmlzaE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IG1vbWVudC5kdXJhdGlvbihmaW5pc2hNb21lbnQuZGlmZihzdGFydE1vbWVudCkpLmFzU2Vjb25kcygpICsgXCIgc2Vjb25kc1wiLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRDb3VudDogcXVlcnlSZXN1bHQuZGF0YS54Lmxlbmd0aFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBkYXRhIGJhY2sgZnJvbSB0aGUgcXVlcnlcbiAgICAgICAgICAgICAgICBkID0gcXVlcnlSZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGFuIGVycm9yIHByb2R1Y2VkIGJ5IGEgYnVnIGluIHRoZSBxdWVyeSBmdW5jdGlvbiwgbm90IGFuIGVycm9yIHJldHVybmVkIGJ5IHRoZSBteXNxbCBkYXRhYmFzZVxuICAgICAgICAgICAgICAgIGUubWVzc2FnZSA9IFwiRXJyb3IgaW4gcXVlcnlEQjogXCIgKyBlLm1lc3NhZ2UgKyBcIiBmb3Igc3RhdGVtZW50OiBcIiArIHN0YXRlbWVudDtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC5lcnJvciAhPT0gdW5kZWZpbmVkICYmIHF1ZXJ5UmVzdWx0LmVycm9yICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5UmVzdWx0LmVycm9yID09PSBtYXRzVHlwZXMuTWVzc2FnZXMuTk9fREFUQV9GT1VORCkge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIE5PVCBhbiBlcnJvciBqdXN0IGEgbm8gZGF0YSBjb25kaXRpb25cbiAgICAgICAgICAgICAgICAgICAgZGF0YUZvdW5kRm9yQ3VydmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGFuIGVycm9yIHJldHVybmVkIGJ5IHRoZSBteXNxbCBkYXRhYmFzZVxuICAgICAgICAgICAgICAgICAgICBlcnJvciArPSBcIkVycm9yIGZyb20gdmVyaWZpY2F0aW9uIHF1ZXJ5OiA8YnI+XCIgKyBxdWVyeVJlc3VsdC5lcnJvciArIFwiPGJyPiBxdWVyeTogPGJyPlwiICsgc3RhdGVtZW50ICsgXCI8YnI+XCI7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IChuZXcgRXJyb3IoZXJyb3IpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNldCBheGlzIGxpbWl0cyBiYXNlZCBvbiByZXR1cm5lZCBkYXRhXG4gICAgICAgICAgICB2YXIgcG9zdFF1ZXJ5U3RhcnRNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChkYXRhRm91bmRGb3JDdXJ2ZSkge1xuICAgICAgICAgICAgICAgIHhtaW4gPSB4bWluIDwgZC54bWluID8geG1pbiA6IGQueG1pbjtcbiAgICAgICAgICAgICAgICB4bWF4ID0geG1heCA+IGQueG1heCA/IHhtYXggOiBkLnhtYXg7XG4gICAgICAgICAgICAgICAgeW1pbiA9IHltaW4gPCBkLnltaW4gPyB5bWluIDogZC55bWluO1xuICAgICAgICAgICAgICAgIHltYXggPSB5bWF4ID4gZC55bWF4ID8geW1heCA6IGQueW1heDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYSBkaWZmZXJlbmNlIGN1cnZlXG4gICAgICAgICAgICBjb25zdCBkaWZmUmVzdWx0ID0gbWF0c0RhdGFEaWZmVXRpbHMuZ2V0RGF0YUZvckRpZmZDdXJ2ZShkYXRhc2V0LCBkaWZmRnJvbSwgcGxvdFR5cGUsIGhhc0xldmVscyk7XG4gICAgICAgICAgICBkID0gZGlmZlJlc3VsdC5kYXRhc2V0O1xuICAgICAgICAgICAgeG1pbiA9IHhtaW4gPCBkLnhtaW4gPyB4bWluIDogZC54bWluO1xuICAgICAgICAgICAgeG1heCA9IHhtYXggPiBkLnhtYXggPyB4bWF4IDogZC54bWF4O1xuICAgICAgICAgICAgeW1pbiA9IHltaW4gPCBkLnltaW4gPyB5bWluIDogZC55bWluO1xuICAgICAgICAgICAgeW1heCA9IHltYXggPiBkLnltYXggPyB5bWF4IDogZC55bWF4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2V0IGN1cnZlIGFubm90YXRpb24gdG8gYmUgdGhlIGN1cnZlIG1lYW4gLS0gbWF5IGJlIHJlY2FsY3VsYXRlZCBsYXRlclxuICAgICAgICAvLyBhbHNvIHBhc3MgcHJldmlvdXNseSBjYWxjdWxhdGVkIGF4aXMgc3RhdHMgdG8gY3VydmUgb3B0aW9uc1xuICAgICAgICBjb25zdCBtZWFuID0gZC5zdW0gLyBkLngubGVuZ3RoO1xuICAgICAgICBjb25zdCBhbm5vdGF0aW9uID0gbWVhbiA9PT0gdW5kZWZpbmVkID8gbGFiZWwgKyBcIi0gbWVhbiA9IE5hTlwiIDogbGFiZWwgKyBcIi0gbWVhbiA9IFwiICsgbWVhbi50b1ByZWNpc2lvbig0KTtcbiAgICAgICAgY3VydmVbJ2Fubm90YXRpb24nXSA9IGFubm90YXRpb247XG4gICAgICAgIGN1cnZlWyd4bWluJ10gPSBkLnhtaW47XG4gICAgICAgIGN1cnZlWyd4bWF4J10gPSBkLnhtYXg7XG4gICAgICAgIGN1cnZlWyd5bWluJ10gPSBkLnltaW47XG4gICAgICAgIGN1cnZlWyd5bWF4J10gPSBkLnltYXg7XG4gICAgICAgIGN1cnZlWydheGlzS2V5J10gPSBheGlzS2V5O1xuICAgICAgICBjb25zdCBjT3B0aW9ucyA9IG1hdHNEYXRhQ3VydmVPcHNVdGlscy5nZW5lcmF0ZVNlcmllc0N1cnZlT3B0aW9ucyhjdXJ2ZSwgY3VydmVJbmRleCwgYXhpc01hcCwgZCk7ICAvLyBnZW5lcmF0ZSBwbG90IHdpdGggZGF0YSwgY3VydmUgYW5ub3RhdGlvbiwgYXhpcyBsYWJlbHMsIGV0Yy5cbiAgICAgICAgZGF0YXNldC5wdXNoKGNPcHRpb25zKTtcbiAgICAgICAgdmFyIHBvc3RRdWVyeUZpbmlzaE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICBkYXRhUmVxdWVzdHNbXCJwb3N0IGRhdGEgcmV0cmlldmFsIChxdWVyeSkgcHJvY2VzcyB0aW1lIC0gXCIgKyBjdXJ2ZS5sYWJlbF0gPSB7XG4gICAgICAgICAgICBiZWdpbjogcG9zdFF1ZXJ5U3RhcnRNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICBmaW5pc2g6IHBvc3RRdWVyeUZpbmlzaE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBtb21lbnQuZHVyYXRpb24ocG9zdFF1ZXJ5RmluaXNoTW9tZW50LmRpZmYocG9zdFF1ZXJ5U3RhcnRNb21lbnQpKS5hc1NlY29uZHMoKSArICcgc2Vjb25kcydcbiAgICAgICAgfVxuICAgIH0gIC8vIGVuZCBmb3IgY3VydmVzXG5cbiAgICAvLyBwcm9jZXNzIHRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBxdWVyeVxuICAgIGNvbnN0IGFwcFBhcmFtcyA9IHtcInBsb3RUeXBlXCI6IHBsb3RUeXBlLCBcImhhc0xldmVsc1wiOiBoYXNMZXZlbHMsIFwibWF0Y2hpbmdcIjogbWF0Y2hpbmd9O1xuICAgIGNvbnN0IGN1cnZlSW5mb1BhcmFtcyA9IHtcbiAgICAgICAgXCJjdXJ2ZXNcIjogY3VydmVzLFxuICAgICAgICBcImN1cnZlc0xlbmd0aFwiOiBjdXJ2ZXNMZW5ndGgsXG4gICAgICAgIFwiaWRlYWxWYWx1ZXNcIjogaWRlYWxWYWx1ZXMsXG4gICAgICAgIFwidXRjQ3ljbGVTdGFydHNcIjogdXRjQ3ljbGVTdGFydHMsXG4gICAgICAgIFwiYXhpc01hcFwiOiBheGlzTWFwLFxuICAgICAgICBcInhtYXhcIjogeG1heCxcbiAgICAgICAgXCJ4bWluXCI6IHhtaW5cbiAgICB9O1xuICAgIGNvbnN0IGJvb2trZWVwaW5nUGFyYW1zID0ge1wiZGF0YVJlcXVlc3RzXCI6IGRhdGFSZXF1ZXN0cywgXCJ0b3RhbFByb2Nlc3NpbmdTdGFydFwiOiB0b3RhbFByb2Nlc3NpbmdTdGFydH07XG4gICAgdmFyIHJlc3VsdCA9IG1hdHNEYXRhUHJvY2Vzc1V0aWxzLnByb2Nlc3NEYXRhWFlDdXJ2ZShkYXRhc2V0LCBhcHBQYXJhbXMsIGN1cnZlSW5mb1BhcmFtcywgcGxvdFBhcmFtcywgYm9va2tlZXBpbmdQYXJhbXMpO1xuICAgIHBsb3RGdW5jdGlvbihyZXN1bHQpO1xufTsiLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE5IENvbG9yYWRvIFN0YXRlIFVuaXZlcnNpdHkgYW5kIFJlZ2VudHMgb2YgdGhlIFVuaXZlcnNpdHkgb2YgQ29sb3JhZG8uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKi9cblxuaW1wb3J0IHttYXRzQ29sbGVjdGlvbnN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzVHlwZXN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFRdWVyeVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFQcm9jZXNzVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttb21lbnR9IGZyb20gJ21ldGVvci9tb21lbnRqczptb21lbnQnXG5cbmRhdGFIaXN0b2dyYW0gPSBmdW5jdGlvbiAocGxvdFBhcmFtcywgcGxvdEZ1bmN0aW9uKSB7XG4gICAgLy8gaW5pdGlhbGl6ZSB2YXJpYWJsZXMgY29tbW9uIHRvIGFsbCBjdXJ2ZXNcbiAgICBjb25zdCBwbG90VHlwZSA9IG1hdHNUeXBlcy5QbG90VHlwZXMuaGlzdG9ncmFtO1xuICAgIGNvbnN0IGhhc0xldmVscyA9IGZhbHNlO1xuICAgIGNvbnN0IG1hdGNoaW5nID0gcGxvdFBhcmFtc1sncGxvdEFjdGlvbiddID09PSBtYXRzVHlwZXMuUGxvdEFjdGlvbnMubWF0Y2hlZDtcbiAgICB2YXIgYWxyZWFkeU1hdGNoZWQgPSBmYWxzZTtcbiAgICB2YXIgZGF0YVJlcXVlc3RzID0ge307IC8vIHVzZWQgdG8gc3RvcmUgZGF0YSBxdWVyaWVzXG4gICAgdmFyIGRhdGFGb3VuZEZvckN1cnZlID0gW107XG4gICAgdmFyIHRvdGFsUHJvY2Vzc2luZ1N0YXJ0ID0gbW9tZW50KCk7XG4gICAgdmFyIGVycm9yID0gXCJcIjtcbiAgICB2YXIgY3VydmVzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShwbG90UGFyYW1zLmN1cnZlcykpO1xuICAgIHZhciBjdXJ2ZXNMZW5ndGggPSBjdXJ2ZXMubGVuZ3RoO1xuICAgIHZhciBkYXRhc2V0ID0gW107XG4gICAgdmFyIGFsbFJldHVybmVkU3ViU3RhdHMgPSBbXTtcbiAgICB2YXIgYWxsUmV0dXJuZWRTdWJTZWNzID0gW107XG4gICAgdmFyIGF4aXNNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgLy8gcHJvY2VzcyB1c2VyIGJpbiBjdXN0b21pemF0aW9uc1xuICAgIGNvbnN0IGJpblBhcmFtcyA9IG1hdHNEYXRhVXRpbHMuc2V0SGlzdG9ncmFtUGFyYW1ldGVycyhwbG90UGFyYW1zKTtcbiAgICBjb25zdCB5QXhpc0Zvcm1hdCA9IGJpblBhcmFtcy55QXhpc0Zvcm1hdDtcbiAgICBjb25zdCBiaW5OdW0gPSBiaW5QYXJhbXMuYmluTnVtO1xuXG4gICAgZm9yICh2YXIgY3VydmVJbmRleCA9IDA7IGN1cnZlSW5kZXggPCBjdXJ2ZXNMZW5ndGg7IGN1cnZlSW5kZXgrKykge1xuICAgICAgICAvLyBpbml0aWFsaXplIHZhcmlhYmxlcyBzcGVjaWZpYyB0byBlYWNoIGN1cnZlXG4gICAgICAgIHZhciBjdXJ2ZSA9IGN1cnZlc1tjdXJ2ZUluZGV4XTtcbiAgICAgICAgdmFyIGRpZmZGcm9tID0gY3VydmUuZGlmZkZyb207XG4gICAgICAgIGRhdGFGb3VuZEZvckN1cnZlW2N1cnZlSW5kZXhdID0gdHJ1ZTtcbiAgICAgICAgdmFyIGxhYmVsID0gY3VydmVbJ2xhYmVsJ107XG4gICAgICAgIHZhciBkYXRhU291cmNlU3RyID0gY3VydmVbJ2RhdGEtc291cmNlJ107XG4gICAgICAgIHZhciBkYXRhX3NvdXJjZSA9IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnZGF0YS1zb3VyY2UnfSkub3B0aW9uc01hcFtjdXJ2ZVsnZGF0YS1zb3VyY2UnXV1bMF07XG4gICAgICAgIHZhciByZWdpb25TdHIgPSBjdXJ2ZVsncmVnaW9uJ107XG4gICAgICAgIHZhciByZWdpb24gPSBPYmplY3Qua2V5cyhtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAncmVnaW9uJ30pLnZhbHVlc01hcFtrZXldID09PSByZWdpb25TdHIpO1xuICAgICAgICB2YXIgc291cmNlID0gY3VydmVbJ3RydXRoJ107XG4gICAgICAgIHZhciBzb3VyY2VTdHIgPSBcIlwiO1xuICAgICAgICBpZiAoc291cmNlICE9PSBcIkFsbFwiKSB7XG4gICAgICAgICAgICBzb3VyY2VTdHIgPSBcIl9cIiArIHNvdXJjZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2NhbGVTdHIgPSBjdXJ2ZVsnc2NhbGUnXTtcbiAgICAgICAgdmFyIHNjYWxlID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzY2FsZSd9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnc2NhbGUnfSkudmFsdWVzTWFwW2tleV0gPT09IHNjYWxlU3RyKTtcbiAgICAgICAgdmFyIHRocmVzaG9sZFN0ciA9IGN1cnZlWyd0aHJlc2hvbGQnXTtcbiAgICAgICAgdmFyIHRocmVzaG9sZCA9IE9iamVjdC5rZXlzKG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAndGhyZXNob2xkJ30pLnZhbHVlc01hcCkuZmluZChrZXkgPT4gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0aHJlc2hvbGQnfSkudmFsdWVzTWFwW2tleV0gPT09IHRocmVzaG9sZFN0cik7XG4gICAgICAgIHRocmVzaG9sZCA9IHRocmVzaG9sZCAqIDAuMDE7XG4gICAgICAgIHZhciBzdGF0aXN0aWNTZWxlY3QgPSBjdXJ2ZVsnc3RhdGlzdGljJ107XG4gICAgICAgIHZhciBzdGF0aXN0aWNPcHRpb25zTWFwID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzdGF0aXN0aWMnfSwge29wdGlvbnNNYXA6IDF9KVsnb3B0aW9uc01hcCddO1xuICAgICAgICB2YXIgc3RhdGlzdGljID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzBdO1xuICAgICAgICB2YXIgdmFsaWRUaW1lcyA9IGN1cnZlWyd2YWxpZC10aW1lJ10gPT09IHVuZGVmaW5lZCA/IFtdIDogY3VydmVbJ3ZhbGlkLXRpbWUnXTtcbiAgICAgICAgdmFyIGRhdGVSYW5nZSA9IG1hdHNEYXRhVXRpbHMuZ2V0RGF0ZVJhbmdlKGN1cnZlWydjdXJ2ZS1kYXRlcyddKTtcbiAgICAgICAgdmFyIGZyb21TZWNzID0gZGF0ZVJhbmdlLmZyb21TZWNvbmRzO1xuICAgICAgICB2YXIgdG9TZWNzID0gZGF0ZVJhbmdlLnRvU2Vjb25kcztcbiAgICAgICAgdmFyIGZvcmVjYXN0TGVuZ3RoID0gY3VydmVbJ2ZvcmVjYXN0LWxlbmd0aCddO1xuICAgICAgICAvLyBheGlzS2V5IGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHdoaWNoIGF4aXMgYSBjdXJ2ZSBzaG91bGQgdXNlLlxuICAgICAgICAvLyBUaGlzIGF4aXNLZXlTZXQgb2JqZWN0IGlzIHVzZWQgbGlrZSBhIHNldCBhbmQgaWYgYSBjdXJ2ZSBoYXMgdGhlIHNhbWVcbiAgICAgICAgLy8gdW5pdHMgKGF4aXNLZXkpIGl0IHdpbGwgdXNlIHRoZSBzYW1lIGF4aXMuXG4gICAgICAgIC8vIFRoZSBheGlzIG51bWJlciBpcyBhc3NpZ25lZCB0byB0aGUgYXhpc0tleVNldCB2YWx1ZSwgd2hpY2ggaXMgdGhlIGF4aXNLZXkuXG4gICAgICAgIHZhciBheGlzS2V5ID0geUF4aXNGb3JtYXQ7XG4gICAgICAgIGlmICh5QXhpc0Zvcm1hdCA9PT0gJ1JlbGF0aXZlIGZyZXF1ZW5jeScpIHtcbiAgICAgICAgICAgIGF4aXNLZXkgPSBheGlzS2V5ICsgXCIgKHgxMDApXCJcbiAgICAgICAgfVxuICAgICAgICBjdXJ2ZXNbY3VydmVJbmRleF0uYXhpc0tleSA9IGF4aXNLZXk7IC8vIHN0YXNoIHRoZSBheGlzS2V5IHRvIHVzZSBpdCBsYXRlciBmb3IgYXhpcyBvcHRpb25zXG4gICAgICAgIGN1cnZlc1tjdXJ2ZUluZGV4XS5iaW5OdW0gPSBiaW5OdW07IC8vIHN0YXNoIHRoZSBiaW5OdW0gdG8gdXNlIGl0IGxhdGVyIGZvciBiYXIgY2hhcnQgb3B0aW9uc1xuXG4gICAgICAgIHZhciBkO1xuICAgICAgICBpZiAoZGlmZkZyb20gPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBhIGRhdGFiYXNlIGRyaXZlbiBjdXJ2ZSwgbm90IGEgZGlmZmVyZW5jZSBjdXJ2ZVxuICAgICAgICAgICAgLy8gcHJlcGFyZSB0aGUgcXVlcnkgZnJvbSB0aGUgYWJvdmUgcGFyYW1ldGVyc1xuICAgICAgICAgICAgdmFyIHN0YXRlbWVudCA9IFwic2VsZWN0IG0wLnRpbWUgYXMgYXZ0aW1lLCBcIiArXG4gICAgICAgICAgICAgICAgXCJjb3VudChkaXN0aW5jdCBtMC50aW1lKSBhcyBOX3RpbWVzLCBcIiArXG4gICAgICAgICAgICAgICAgXCJtaW4obTAudGltZSkgYXMgbWluX3NlY3MsIFwiICtcbiAgICAgICAgICAgICAgICBcIm1heChtMC50aW1lKSBhcyBtYXhfc2VjcywgXCIgK1xuICAgICAgICAgICAgICAgIFwie3tzdGF0aXN0aWN9fSBcIiArXG4gICAgICAgICAgICAgICAgXCJmcm9tIHt7ZGF0YV9zb3VyY2V9fSBhcyBtMCBcIiArXG4gICAgICAgICAgICAgICAgXCJ3aGVyZSAxPTEgXCIgK1xuICAgICAgICAgICAgICAgIFwie3t2YWxpZFRpbWVDbGF1c2V9fSBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAudGltZSA+PSAne3tmcm9tU2Vjc319JyBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAudGltZSA8PSAne3t0b1NlY3N9fScgXCIgK1xuICAgICAgICAgICAgICAgIFwiYW5kIG0wLmhpdCttMC5mYSttMC5taXNzK20wLmNuID4gMCBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAudHJzaCA9ICd7e3RocmVzaG9sZH19JyBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAuZmNzdF9sZW4gPSAne3tmb3JlY2FzdExlbmd0aH19JyBcIiArXG4gICAgICAgICAgICAgICAgXCJncm91cCBieSBhdnRpbWUgXCIgK1xuICAgICAgICAgICAgICAgIFwib3JkZXIgYnkgYXZ0aW1lXCIgK1xuICAgICAgICAgICAgICAgIFwiO1wiO1xuXG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3tmcm9tU2Vjc319JywgZnJvbVNlY3MpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dG9TZWNzfX0nLCB0b1NlY3MpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZGF0YV9zb3VyY2V9fScsIGRhdGFfc291cmNlICsgJ18nICsgc2NhbGUgKyBzb3VyY2VTdHIgKyAnXycgKyByZWdpb24pO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7c3RhdGlzdGljfX0nLCBzdGF0aXN0aWMpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7dGhyZXNob2xkfX0nLCB0aHJlc2hvbGQpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7Zm9yZWNhc3RMZW5ndGh9fScsIGZvcmVjYXN0TGVuZ3RoKTtcbiAgICAgICAgICAgIHZhciB2YWxpZFRpbWVDbGF1c2UgPSBcIiBcIjtcbiAgICAgICAgICAgIGlmICh2YWxpZFRpbWVzLmxlbmd0aCA+IDAgJiYgdmFsaWRUaW1lcyAhPT0gbWF0c1R5cGVzLklucHV0VHlwZXMudW51c2VkKSB7XG4gICAgICAgICAgICAgICAgdmFsaWRUaW1lQ2xhdXNlID0gXCIgYW5kIGZsb29yKChtMC50aW1lKSUoMjQqMzYwMCkvMzYwMCkgSU4oXCIgKyB2YWxpZFRpbWVzICsgXCIpXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t2YWxpZFRpbWVDbGF1c2V9fScsIHZhbGlkVGltZUNsYXVzZSk7XG5cbiAgICAgICAgICAgIGRhdGFSZXF1ZXN0c1tjdXJ2ZS5sYWJlbF0gPSBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgICAgIHZhciBxdWVyeVJlc3VsdDtcbiAgICAgICAgICAgIHZhciBzdGFydE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgdmFyIGZpbmlzaE1vbWVudDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gc2VuZCB0aGUgcXVlcnkgc3RhdGVtZW50IHRvIHRoZSBxdWVyeSBmdW5jdGlvblxuICAgICAgICAgICAgICAgIHF1ZXJ5UmVzdWx0ID0gbWF0c0RhdGFRdWVyeVV0aWxzLnF1ZXJ5REJTcGVjaWFsdHlDdXJ2ZShzdW1Qb29sLCBzdGF0ZW1lbnQsIHBsb3RUeXBlLCBoYXNMZXZlbHMpO1xuICAgICAgICAgICAgICAgIGZpbmlzaE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgICAgIGRhdGFSZXF1ZXN0c1tcImRhdGEgcmV0cmlldmFsIChxdWVyeSkgdGltZSAtIFwiICsgY3VydmUubGFiZWxdID0ge1xuICAgICAgICAgICAgICAgICAgICBiZWdpbjogc3RhcnRNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaDogZmluaXNoTW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogbW9tZW50LmR1cmF0aW9uKGZpbmlzaE1vbWVudC5kaWZmKHN0YXJ0TW9tZW50KSkuYXNTZWNvbmRzKCkgKyBcIiBzZWNvbmRzXCIsXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZENvdW50OiBxdWVyeVJlc3VsdC5kYXRhLngubGVuZ3RoXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIGRhdGEgYmFjayBmcm9tIHRoZSBxdWVyeVxuICAgICAgICAgICAgICAgIGQgPSBxdWVyeVJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgIGFsbFJldHVybmVkU3ViU3RhdHMucHVzaChkLnN1YlZhbHMpOyAvLyBzYXZlIHJldHVybmVkIGRhdGEgc28gdGhhdCB3ZSBjYW4gY2FsY3VsYXRlIGhpc3RvZ3JhbSBzdGF0cyBvbmNlIGFsbCB0aGUgcXVlcmllcyBhcmUgZG9uZVxuICAgICAgICAgICAgICAgIGFsbFJldHVybmVkU3ViU2Vjcy5wdXNoKGQuc3ViU2Vjcyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhbiBlcnJvciBwcm9kdWNlZCBieSBhIGJ1ZyBpbiB0aGUgcXVlcnkgZnVuY3Rpb24sIG5vdCBhbiBlcnJvciByZXR1cm5lZCBieSB0aGUgbXlzcWwgZGF0YWJhc2VcbiAgICAgICAgICAgICAgICBlLm1lc3NhZ2UgPSBcIkVycm9yIGluIHF1ZXJ5REI6IFwiICsgZS5tZXNzYWdlICsgXCIgZm9yIHN0YXRlbWVudDogXCIgKyBzdGF0ZW1lbnQ7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocXVlcnlSZXN1bHQuZXJyb3IgIT09IHVuZGVmaW5lZCAmJiBxdWVyeVJlc3VsdC5lcnJvciAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC5lcnJvciA9PT0gbWF0c1R5cGVzLk1lc3NhZ2VzLk5PX0RBVEFfRk9VTkQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBOT1QgYW4gZXJyb3IganVzdCBhIG5vIGRhdGEgY29uZGl0aW9uXG4gICAgICAgICAgICAgICAgICAgIGRhdGFGb3VuZEZvckN1cnZlW2N1cnZlSW5kZXhdID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhbiBlcnJvciByZXR1cm5lZCBieSB0aGUgbXlzcWwgZGF0YWJhc2VcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IgKz0gXCJFcnJvciBmcm9tIHZlcmlmaWNhdGlvbiBxdWVyeTogPGJyPlwiICsgcXVlcnlSZXN1bHQuZXJyb3IgKyBcIjxicj4gcXVlcnk6IDxicj5cIiArIHN0YXRlbWVudCArIFwiPGJyPlwiO1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAobmV3IEVycm9yKGVycm9yKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGFwcFBhcmFtcyA9IHtcInBsb3RUeXBlXCI6IHBsb3RUeXBlLCBcImhhc0xldmVsc1wiOiBoYXNMZXZlbHMsIFwibWF0Y2hpbmdcIjogbWF0Y2hpbmd9O1xuICAgIGNvbnN0IGN1cnZlSW5mb1BhcmFtcyA9IHtcbiAgICAgICAgXCJjdXJ2ZXNcIjogY3VydmVzLFxuICAgICAgICBcImN1cnZlc0xlbmd0aFwiOiBjdXJ2ZXNMZW5ndGgsXG4gICAgICAgIFwiZGF0YUZvdW5kRm9yQ3VydmVcIjogZGF0YUZvdW5kRm9yQ3VydmUsXG4gICAgICAgIFwiYXhpc01hcFwiOiBheGlzTWFwLFxuICAgICAgICBcInlBeGlzRm9ybWF0XCI6IHlBeGlzRm9ybWF0XG4gICAgfTtcbiAgICBjb25zdCBib29ra2VlcGluZ1BhcmFtcyA9IHtcbiAgICAgICAgXCJhbHJlYWR5TWF0Y2hlZFwiOiBhbHJlYWR5TWF0Y2hlZCxcbiAgICAgICAgXCJkYXRhUmVxdWVzdHNcIjogZGF0YVJlcXVlc3RzLFxuICAgICAgICBcInRvdGFsUHJvY2Vzc2luZ1N0YXJ0XCI6IHRvdGFsUHJvY2Vzc2luZ1N0YXJ0XG4gICAgfTtcbiAgICB2YXIgcmVzdWx0ID0gbWF0c0RhdGFQcm9jZXNzVXRpbHMucHJvY2Vzc0RhdGFIaXN0b2dyYW0oYWxsUmV0dXJuZWRTdWJTdGF0cywgYWxsUmV0dXJuZWRTdWJTZWNzLCBbXSwgZGF0YXNldCwgYXBwUGFyYW1zLCBjdXJ2ZUluZm9QYXJhbXMsIHBsb3RQYXJhbXMsIGJpblBhcmFtcywgYm9va2tlZXBpbmdQYXJhbXMpO1xuICAgIHBsb3RGdW5jdGlvbihyZXN1bHQpO1xufTsiLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE5IENvbG9yYWRvIFN0YXRlIFVuaXZlcnNpdHkgYW5kIFJlZ2VudHMgb2YgdGhlIFVuaXZlcnNpdHkgb2YgQ29sb3JhZG8uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKi9cblxuaW1wb3J0IHttYXRzQ29sbGVjdGlvbnN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzVHlwZXN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFRdWVyeVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFEaWZmVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YUN1cnZlT3BzVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVByb2Nlc3NVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21vbWVudH0gZnJvbSAnbWV0ZW9yL21vbWVudGpzOm1vbWVudCdcblxuZGF0YVNlcmllcyA9IGZ1bmN0aW9uIChwbG90UGFyYW1zLCBwbG90RnVuY3Rpb24pIHtcbiAgICAvLyBpbml0aWFsaXplIHZhcmlhYmxlcyBjb21tb24gdG8gYWxsIGN1cnZlc1xuICAgIGNvbnN0IG1hdGNoaW5nID0gcGxvdFBhcmFtc1sncGxvdEFjdGlvbiddID09PSBtYXRzVHlwZXMuUGxvdEFjdGlvbnMubWF0Y2hlZDtcbiAgICBjb25zdCBwbG90VHlwZSA9IG1hdHNUeXBlcy5QbG90VHlwZXMudGltZVNlcmllcztcbiAgICBjb25zdCBoYXNMZXZlbHMgPSBmYWxzZTtcbiAgICB2YXIgZGF0YVJlcXVlc3RzID0ge307IC8vIHVzZWQgdG8gc3RvcmUgZGF0YSBxdWVyaWVzXG4gICAgdmFyIGRhdGFGb3VuZEZvckN1cnZlID0gdHJ1ZTtcbiAgICB2YXIgdG90YWxQcm9jZXNzaW5nU3RhcnQgPSBtb21lbnQoKTtcbiAgICB2YXIgZGF0ZVJhbmdlID0gbWF0c0RhdGFVdGlscy5nZXREYXRlUmFuZ2UocGxvdFBhcmFtcy5kYXRlcyk7XG4gICAgdmFyIGZyb21TZWNzID0gZGF0ZVJhbmdlLmZyb21TZWNvbmRzO1xuICAgIHZhciB0b1NlY3MgPSBkYXRlUmFuZ2UudG9TZWNvbmRzO1xuICAgIHZhciBlcnJvciA9IFwiXCI7XG4gICAgdmFyIGN1cnZlcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGxvdFBhcmFtcy5jdXJ2ZXMpKTtcbiAgICB2YXIgY3VydmVzTGVuZ3RoID0gY3VydmVzLmxlbmd0aDtcbiAgICB2YXIgZGF0YXNldCA9IFtdO1xuICAgIHZhciB1dGNDeWNsZVN0YXJ0cyA9IFtdO1xuICAgIHZhciBheGlzTWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB2YXIgeG1heCA9IC0xICogTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgeW1heCA9IC0xICogTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgeG1pbiA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgdmFyIHltaW4gPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIHZhciBpZGVhbFZhbHVlcyA9IFtdO1xuXG4gICAgZm9yICh2YXIgY3VydmVJbmRleCA9IDA7IGN1cnZlSW5kZXggPCBjdXJ2ZXNMZW5ndGg7IGN1cnZlSW5kZXgrKykge1xuICAgICAgICAvLyBpbml0aWFsaXplIHZhcmlhYmxlcyBzcGVjaWZpYyB0byBlYWNoIGN1cnZlXG4gICAgICAgIHZhciBjdXJ2ZSA9IGN1cnZlc1tjdXJ2ZUluZGV4XTtcbiAgICAgICAgdmFyIGRpZmZGcm9tID0gY3VydmUuZGlmZkZyb207XG4gICAgICAgIHZhciBsYWJlbCA9IGN1cnZlWydsYWJlbCddO1xuICAgICAgICB2YXIgZGF0YVNvdXJjZVN0ciA9IGN1cnZlWydkYXRhLXNvdXJjZSddO1xuICAgICAgICB2YXIgZGF0YV9zb3VyY2UgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ2RhdGEtc291cmNlJ30pLm9wdGlvbnNNYXBbY3VydmVbJ2RhdGEtc291cmNlJ11dWzBdO1xuICAgICAgICB2YXIgcmVnaW9uU3RyID0gY3VydmVbJ3JlZ2lvbiddO1xuICAgICAgICB2YXIgcmVnaW9uID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdyZWdpb24nfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KS52YWx1ZXNNYXBba2V5XSA9PT0gcmVnaW9uU3RyKTtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGN1cnZlWyd0cnV0aCddO1xuICAgICAgICB2YXIgc291cmNlU3RyID0gXCJcIjtcbiAgICAgICAgaWYgKHNvdXJjZSAhPT0gXCJBbGxcIikge1xuICAgICAgICAgICAgc291cmNlU3RyID0gXCJfXCIgKyBzb3VyY2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRocmVzaG9sZFN0ciA9IGN1cnZlWyd0aHJlc2hvbGQnXTtcbiAgICAgICAgdmFyIHRocmVzaG9sZCA9IE9iamVjdC5rZXlzKG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAndGhyZXNob2xkJ30pLnZhbHVlc01hcCkuZmluZChrZXkgPT4gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0aHJlc2hvbGQnfSkudmFsdWVzTWFwW2tleV0gPT09IHRocmVzaG9sZFN0cik7XG4gICAgICAgIHRocmVzaG9sZCA9IHRocmVzaG9sZCAqIDAuMDE7XG4gICAgICAgIHZhciBzdGF0aXN0aWNTZWxlY3QgPSBjdXJ2ZVsnc3RhdGlzdGljJ107XG4gICAgICAgIHZhciBzdGF0aXN0aWNPcHRpb25zTWFwID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzdGF0aXN0aWMnfSwge29wdGlvbnNNYXA6IDF9KVsnb3B0aW9uc01hcCddO1xuICAgICAgICB2YXIgc3RhdGlzdGljID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzBdO1xuICAgICAgICB2YXIgdmFsaWRUaW1lcyA9IGN1cnZlWyd2YWxpZC10aW1lJ10gPT09IHVuZGVmaW5lZCA/IFtdIDogY3VydmVbJ3ZhbGlkLXRpbWUnXTtcbiAgICAgICAgdmFyIGF2ZXJhZ2VTdHIgPSBjdXJ2ZVsnYXZlcmFnZSddO1xuICAgICAgICB2YXIgYXZlcmFnZU9wdGlvbnNNYXAgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ2F2ZXJhZ2UnfSwge29wdGlvbnNNYXA6IDF9KVsnb3B0aW9uc01hcCddO1xuICAgICAgICB2YXIgYXZlcmFnZSA9IGF2ZXJhZ2VPcHRpb25zTWFwW2F2ZXJhZ2VTdHJdWzBdO1xuICAgICAgICB2YXIgc2NhbGVTdHIgPSBjdXJ2ZVsnc2NhbGUnXTtcbiAgICAgICAgdmFyIHNjYWxlID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzY2FsZSd9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnc2NhbGUnfSkudmFsdWVzTWFwW2tleV0gPT09IHNjYWxlU3RyKTtcbiAgICAgICAgdmFyIGZvcmVjYXN0TGVuZ3RoID0gY3VydmVbJ2ZvcmVjYXN0LWxlbmd0aCddO1xuICAgICAgICAvLyBheGlzS2V5IGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHdoaWNoIGF4aXMgYSBjdXJ2ZSBzaG91bGQgdXNlLlxuICAgICAgICAvLyBUaGlzIGF4aXNLZXlTZXQgb2JqZWN0IGlzIHVzZWQgbGlrZSBhIHNldCBhbmQgaWYgYSBjdXJ2ZSBoYXMgdGhlIHNhbWVcbiAgICAgICAgLy8gdW5pdHMgKGF4aXNLZXkpIGl0IHdpbGwgdXNlIHRoZSBzYW1lIGF4aXMuXG4gICAgICAgIC8vIFRoZSBheGlzIG51bWJlciBpcyBhc3NpZ25lZCB0byB0aGUgYXhpc0tleVNldCB2YWx1ZSwgd2hpY2ggaXMgdGhlIGF4aXNLZXkuXG4gICAgICAgIHZhciBheGlzS2V5ID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzFdO1xuICAgICAgICBjdXJ2ZXNbY3VydmVJbmRleF0uYXhpc0tleSA9IGF4aXNLZXk7IC8vIHN0YXNoIHRoZSBheGlzS2V5IHRvIHVzZSBpdCBsYXRlciBmb3IgYXhpcyBvcHRpb25zXG4gICAgICAgIHZhciBpZGVhbFZhbCA9IHN0YXRpc3RpY09wdGlvbnNNYXBbc3RhdGlzdGljU2VsZWN0XVsyXTtcbiAgICAgICAgaWYgKGlkZWFsVmFsICE9PSBudWxsICYmIGlkZWFsVmFsdWVzLmluZGV4T2YoaWRlYWxWYWwpID09PSAtMSkge1xuICAgICAgICAgICAgaWRlYWxWYWx1ZXMucHVzaChpZGVhbFZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZDtcbiAgICAgICAgaWYgKGRpZmZGcm9tID09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYSBkYXRhYmFzZSBkcml2ZW4gY3VydmUsIG5vdCBhIGRpZmZlcmVuY2UgY3VydmVcbiAgICAgICAgICAgIC8vIHByZXBhcmUgdGhlIHF1ZXJ5IGZyb20gdGhlIGFib3ZlIHBhcmFtZXRlcnNcbiAgICAgICAgICAgIHZhciBzdGF0ZW1lbnQgPSBcInNlbGVjdCB7e2F2ZXJhZ2V9fSBhcyBhdnRpbWUsIFwiICtcbiAgICAgICAgICAgICAgICBcImNvdW50KGRpc3RpbmN0IG0wLnRpbWUpIGFzIE5fdGltZXMsIFwiICtcbiAgICAgICAgICAgICAgICBcIm1pbihtMC50aW1lKSBhcyBtaW5fc2VjcywgXCIgK1xuICAgICAgICAgICAgICAgIFwibWF4KG0wLnRpbWUpIGFzIG1heF9zZWNzLCBcIiArXG4gICAgICAgICAgICAgICAgXCJ7e3N0YXRpc3RpY319IFwiICtcbiAgICAgICAgICAgICAgICBcImZyb20ge3tkYXRhX3NvdXJjZX19IGFzIG0wIFwiICtcbiAgICAgICAgICAgICAgICBcIndoZXJlIDE9MSBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAudGltZSA+PSAne3tmcm9tU2Vjc319JyBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAudGltZSA8PSAne3t0b1NlY3N9fScgXCIgK1xuICAgICAgICAgICAgICAgIFwie3t2YWxpZFRpbWVDbGF1c2V9fSBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24gPiAwIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC50cnNoID0gJ3t7dGhyZXNob2xkfX0nIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC5mY3N0X2xlbiA9ICd7e2ZvcmVjYXN0TGVuZ3RofX0nIFwiICtcbiAgICAgICAgICAgICAgICBcImdyb3VwIGJ5IGF2dGltZSBcIiArXG4gICAgICAgICAgICAgICAgXCJvcmRlciBieSBhdnRpbWVcIiArXG4gICAgICAgICAgICAgICAgXCI7XCI7XG5cbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2F2ZXJhZ2V9fScsIGF2ZXJhZ2UpO1xuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZnJvbVNlY3N9fScsIGZyb21TZWNzKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3RvU2Vjc319JywgdG9TZWNzKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2RhdGFfc291cmNlfX0nLCBkYXRhX3NvdXJjZSArICdfJyArIHNjYWxlICsgc291cmNlU3RyICsgJ18nICsgcmVnaW9uKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3N0YXRpc3RpY319Jywgc3RhdGlzdGljKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3RocmVzaG9sZH19JywgdGhyZXNob2xkKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2ZvcmVjYXN0TGVuZ3RofX0nLCBmb3JlY2FzdExlbmd0aCk7XG4gICAgICAgICAgICB2YXIgdmFsaWRUaW1lQ2xhdXNlID0gXCIgXCI7XG4gICAgICAgICAgICBpZiAodmFsaWRUaW1lcy5sZW5ndGggPiAwICYmIHZhbGlkVGltZXMgIT09IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnVudXNlZCkge1xuICAgICAgICAgICAgICAgIHZhbGlkVGltZUNsYXVzZSA9IFwiIGFuZCBmbG9vcigobTAudGltZSklKDI0KjM2MDApLzM2MDApIElOKFwiICsgdmFsaWRUaW1lcyArIFwiKVwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t2YWxpZFRpbWVDbGF1c2V9fScsIHZhbGlkVGltZUNsYXVzZSk7XG5cbiAgICAgICAgICAgIGRhdGFSZXF1ZXN0c1tjdXJ2ZS5sYWJlbF0gPSBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgICAgIC8vIG1hdGggaXMgZG9uZSBvbiBmb3JlY2FzdExlbmd0aCBsYXRlciBvbiAtLSBzZXQgYWxsIGFuYWx5c2VzIHRvIDBcbiAgICAgICAgICAgIGlmIChmb3JlY2FzdExlbmd0aCA9PT0gXCItOTlcIikge1xuICAgICAgICAgICAgICAgIGZvcmVjYXN0TGVuZ3RoID0gXCIwXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBxdWVyeVJlc3VsdDtcbiAgICAgICAgICAgIHZhciBzdGFydE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgdmFyIGZpbmlzaE1vbWVudDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gc2VuZCB0aGUgcXVlcnkgc3RhdGVtZW50IHRvIHRoZSBxdWVyeSBmdW5jdGlvblxuICAgICAgICAgICAgICAgIHF1ZXJ5UmVzdWx0ID0gbWF0c0RhdGFRdWVyeVV0aWxzLnF1ZXJ5REJUaW1lU2VyaWVzKHN1bVBvb2wsIHN0YXRlbWVudCwgZGF0YV9zb3VyY2UsIGZvcmVjYXN0TGVuZ3RoLCBmcm9tU2VjcywgdG9TZWNzLCBhdmVyYWdlU3RyLCB2YWxpZFRpbWVzLCBoYXNMZXZlbHMsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBmaW5pc2hNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgICAgICBkYXRhUmVxdWVzdHNbXCJkYXRhIHJldHJpZXZhbCAocXVlcnkpIHRpbWUgLSBcIiArIGN1cnZlLmxhYmVsXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgYmVnaW46IHN0YXJ0TW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgICAgICBmaW5pc2g6IGZpbmlzaE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IG1vbWVudC5kdXJhdGlvbihmaW5pc2hNb21lbnQuZGlmZihzdGFydE1vbWVudCkpLmFzU2Vjb25kcygpICsgXCIgc2Vjb25kc1wiLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmRDb3VudDogcXVlcnlSZXN1bHQuZGF0YS54Lmxlbmd0aFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBkYXRhIGJhY2sgZnJvbSB0aGUgcXVlcnlcbiAgICAgICAgICAgICAgICBkID0gcXVlcnlSZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGFuIGVycm9yIHByb2R1Y2VkIGJ5IGEgYnVnIGluIHRoZSBxdWVyeSBmdW5jdGlvbiwgbm90IGFuIGVycm9yIHJldHVybmVkIGJ5IHRoZSBteXNxbCBkYXRhYmFzZVxuICAgICAgICAgICAgICAgIGUubWVzc2FnZSA9IFwiRXJyb3IgaW4gcXVlcnlEQjogXCIgKyBlLm1lc3NhZ2UgKyBcIiBmb3Igc3RhdGVtZW50OiBcIiArIHN0YXRlbWVudDtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC5lcnJvciAhPT0gdW5kZWZpbmVkICYmIHF1ZXJ5UmVzdWx0LmVycm9yICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5UmVzdWx0LmVycm9yID09PSBtYXRzVHlwZXMuTWVzc2FnZXMuTk9fREFUQV9GT1VORCkge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIE5PVCBhbiBlcnJvciBqdXN0IGEgbm8gZGF0YSBjb25kaXRpb25cbiAgICAgICAgICAgICAgICAgICAgZGF0YUZvdW5kRm9yQ3VydmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGFuIGVycm9yIHJldHVybmVkIGJ5IHRoZSBteXNxbCBkYXRhYmFzZVxuICAgICAgICAgICAgICAgICAgICBlcnJvciArPSBcIkVycm9yIGZyb20gdmVyaWZpY2F0aW9uIHF1ZXJ5OiA8YnI+XCIgKyBxdWVyeVJlc3VsdC5lcnJvciArIFwiPGJyPiBxdWVyeTogPGJyPlwiICsgc3RhdGVtZW50ICsgXCI8YnI+XCI7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IChuZXcgRXJyb3IoZXJyb3IpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNldCBheGlzIGxpbWl0cyBiYXNlZCBvbiByZXR1cm5lZCBkYXRhXG4gICAgICAgICAgICB2YXIgcG9zdFF1ZXJ5U3RhcnRNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChkYXRhRm91bmRGb3JDdXJ2ZSkge1xuICAgICAgICAgICAgICAgIHhtaW4gPSB4bWluIDwgZC54bWluID8geG1pbiA6IGQueG1pbjtcbiAgICAgICAgICAgICAgICB4bWF4ID0geG1heCA+IGQueG1heCA/IHhtYXggOiBkLnhtYXg7XG4gICAgICAgICAgICAgICAgeW1pbiA9IHltaW4gPCBkLnltaW4gPyB5bWluIDogZC55bWluO1xuICAgICAgICAgICAgICAgIHltYXggPSB5bWF4ID4gZC55bWF4ID8geW1heCA6IGQueW1heDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYSBkaWZmZXJlbmNlIGN1cnZlXG4gICAgICAgICAgICBjb25zdCBkaWZmUmVzdWx0ID0gbWF0c0RhdGFEaWZmVXRpbHMuZ2V0RGF0YUZvckRpZmZDdXJ2ZShkYXRhc2V0LCBkaWZmRnJvbSwgcGxvdFR5cGUsIGhhc0xldmVscyk7XG4gICAgICAgICAgICBkID0gZGlmZlJlc3VsdC5kYXRhc2V0O1xuICAgICAgICAgICAgeG1pbiA9IHhtaW4gPCBkLnhtaW4gPyB4bWluIDogZC54bWluO1xuICAgICAgICAgICAgeG1heCA9IHhtYXggPiBkLnhtYXggPyB4bWF4IDogZC54bWF4O1xuICAgICAgICAgICAgeW1pbiA9IHltaW4gPCBkLnltaW4gPyB5bWluIDogZC55bWluO1xuICAgICAgICAgICAgeW1heCA9IHltYXggPiBkLnltYXggPyB5bWF4IDogZC55bWF4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2V0IGN1cnZlIGFubm90YXRpb24gdG8gYmUgdGhlIGN1cnZlIG1lYW4gLS0gbWF5IGJlIHJlY2FsY3VsYXRlZCBsYXRlclxuICAgICAgICAvLyBhbHNvIHBhc3MgcHJldmlvdXNseSBjYWxjdWxhdGVkIGF4aXMgc3RhdHMgdG8gY3VydmUgb3B0aW9uc1xuICAgICAgICBjb25zdCBtZWFuID0gZC5zdW0gLyBkLngubGVuZ3RoO1xuICAgICAgICBjb25zdCBhbm5vdGF0aW9uID0gbWVhbiA9PT0gdW5kZWZpbmVkID8gbGFiZWwgKyBcIi0gbWVhbiA9IE5hTlwiIDogbGFiZWwgKyBcIi0gbWVhbiA9IFwiICsgbWVhbi50b1ByZWNpc2lvbig0KTtcbiAgICAgICAgY3VydmVbJ2Fubm90YXRpb24nXSA9IGFubm90YXRpb247XG4gICAgICAgIGN1cnZlWyd4bWluJ10gPSBkLnhtaW47XG4gICAgICAgIGN1cnZlWyd4bWF4J10gPSBkLnhtYXg7XG4gICAgICAgIGN1cnZlWyd5bWluJ10gPSBkLnltaW47XG4gICAgICAgIGN1cnZlWyd5bWF4J10gPSBkLnltYXg7XG4gICAgICAgIGN1cnZlWydheGlzS2V5J10gPSBheGlzS2V5O1xuICAgICAgICBjb25zdCBjT3B0aW9ucyA9IG1hdHNEYXRhQ3VydmVPcHNVdGlscy5nZW5lcmF0ZVNlcmllc0N1cnZlT3B0aW9ucyhjdXJ2ZSwgY3VydmVJbmRleCwgYXhpc01hcCwgZCk7ICAvLyBnZW5lcmF0ZSBwbG90IHdpdGggZGF0YSwgY3VydmUgYW5ub3RhdGlvbiwgYXhpcyBsYWJlbHMsIGV0Yy5cbiAgICAgICAgZGF0YXNldC5wdXNoKGNPcHRpb25zKTtcbiAgICAgICAgdmFyIHBvc3RRdWVyeUZpbmlzaE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICBkYXRhUmVxdWVzdHNbXCJwb3N0IGRhdGEgcmV0cmlldmFsIChxdWVyeSkgcHJvY2VzcyB0aW1lIC0gXCIgKyBjdXJ2ZS5sYWJlbF0gPSB7XG4gICAgICAgICAgICBiZWdpbjogcG9zdFF1ZXJ5U3RhcnRNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICBmaW5pc2g6IHBvc3RRdWVyeUZpbmlzaE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiBtb21lbnQuZHVyYXRpb24ocG9zdFF1ZXJ5RmluaXNoTW9tZW50LmRpZmYocG9zdFF1ZXJ5U3RhcnRNb21lbnQpKS5hc1NlY29uZHMoKSArICcgc2Vjb25kcydcbiAgICAgICAgfVxuICAgIH0gIC8vIGVuZCBmb3IgY3VydmVzXG5cbiAgICAvLyBwcm9jZXNzIHRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBxdWVyeVxuICAgIGNvbnN0IGFwcFBhcmFtcyA9IHtcInBsb3RUeXBlXCI6IHBsb3RUeXBlLCBcImhhc0xldmVsc1wiOiBoYXNMZXZlbHMsIFwibWF0Y2hpbmdcIjogbWF0Y2hpbmd9O1xuICAgIGNvbnN0IGN1cnZlSW5mb1BhcmFtcyA9IHtcbiAgICAgICAgXCJjdXJ2ZXNcIjogY3VydmVzLFxuICAgICAgICBcImN1cnZlc0xlbmd0aFwiOiBjdXJ2ZXNMZW5ndGgsXG4gICAgICAgIFwiaWRlYWxWYWx1ZXNcIjogaWRlYWxWYWx1ZXMsXG4gICAgICAgIFwidXRjQ3ljbGVTdGFydHNcIjogdXRjQ3ljbGVTdGFydHMsXG4gICAgICAgIFwiYXhpc01hcFwiOiBheGlzTWFwLFxuICAgICAgICBcInhtYXhcIjogeG1heCxcbiAgICAgICAgXCJ4bWluXCI6IHhtaW5cbiAgICB9O1xuICAgIGNvbnN0IGJvb2trZWVwaW5nUGFyYW1zID0ge1wiZGF0YVJlcXVlc3RzXCI6IGRhdGFSZXF1ZXN0cywgXCJ0b3RhbFByb2Nlc3NpbmdTdGFydFwiOiB0b3RhbFByb2Nlc3NpbmdTdGFydH07XG4gICAgdmFyIHJlc3VsdCA9IG1hdHNEYXRhUHJvY2Vzc1V0aWxzLnByb2Nlc3NEYXRhWFlDdXJ2ZShkYXRhc2V0LCBhcHBQYXJhbXMsIGN1cnZlSW5mb1BhcmFtcywgcGxvdFBhcmFtcywgYm9va2tlZXBpbmdQYXJhbXMpO1xuICAgIHBsb3RGdW5jdGlvbihyZXN1bHQpO1xufTsiLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE5IENvbG9yYWRvIFN0YXRlIFVuaXZlcnNpdHkgYW5kIFJlZ2VudHMgb2YgdGhlIFVuaXZlcnNpdHkgb2YgQ29sb3JhZG8uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKi9cblxuaW1wb3J0IHttYXRzQ29sbGVjdGlvbnN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzVHlwZXN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFRdWVyeVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFEaWZmVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YUN1cnZlT3BzVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVByb2Nlc3NVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21vbWVudH0gZnJvbSAnbWV0ZW9yL21vbWVudGpzOm1vbWVudCdcblxuZGF0YVRocmVzaG9sZCA9IGZ1bmN0aW9uIChwbG90UGFyYW1zLCBwbG90RnVuY3Rpb24pIHtcbiAgICAvLyBpbml0aWFsaXplIHZhcmlhYmxlcyBjb21tb24gdG8gYWxsIGN1cnZlc1xuICAgIGNvbnN0IG1hdGNoaW5nID0gcGxvdFBhcmFtc1sncGxvdEFjdGlvbiddID09PSBtYXRzVHlwZXMuUGxvdEFjdGlvbnMubWF0Y2hlZDtcbiAgICBjb25zdCBwbG90VHlwZSA9IG1hdHNUeXBlcy5QbG90VHlwZXMudGhyZXNob2xkO1xuICAgIGNvbnN0IGhhc0xldmVscyA9IGZhbHNlO1xuICAgIHZhciBkYXRhUmVxdWVzdHMgPSB7fTsgLy8gdXNlZCB0byBzdG9yZSBkYXRhIHF1ZXJpZXNcbiAgICB2YXIgZGF0YUZvdW5kRm9yQ3VydmUgPSB0cnVlO1xuICAgIHZhciB0b3RhbFByb2Nlc3NpbmdTdGFydCA9IG1vbWVudCgpO1xuICAgIHZhciBlcnJvciA9IFwiXCI7XG4gICAgdmFyIGN1cnZlcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGxvdFBhcmFtcy5jdXJ2ZXMpKTtcbiAgICB2YXIgY3VydmVzTGVuZ3RoID0gY3VydmVzLmxlbmd0aDtcbiAgICB2YXIgZGF0YXNldCA9IFtdO1xuICAgIHZhciB1dGNDeWNsZVN0YXJ0cyA9IFtdO1xuICAgIHZhciBheGlzTWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB2YXIgeG1heCA9IC0xICogTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgeW1heCA9IC0xICogTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgeG1pbiA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgdmFyIHltaW4gPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIHZhciBpZGVhbFZhbHVlcyA9IFtdO1xuXG4gICAgZm9yICh2YXIgY3VydmVJbmRleCA9IDA7IGN1cnZlSW5kZXggPCBjdXJ2ZXNMZW5ndGg7IGN1cnZlSW5kZXgrKykge1xuICAgICAgICAvLyBpbml0aWFsaXplIHZhcmlhYmxlcyBzcGVjaWZpYyB0byBlYWNoIGN1cnZlXG4gICAgICAgIHZhciBjdXJ2ZSA9IGN1cnZlc1tjdXJ2ZUluZGV4XTtcbiAgICAgICAgdmFyIGRpZmZGcm9tID0gY3VydmUuZGlmZkZyb207XG4gICAgICAgIHZhciBsYWJlbCA9IGN1cnZlWydsYWJlbCddO1xuICAgICAgICB2YXIgZGF0YVNvdXJjZVN0ciA9IGN1cnZlWydkYXRhLXNvdXJjZSddO1xuICAgICAgICB2YXIgZGF0YV9zb3VyY2UgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ2RhdGEtc291cmNlJ30pLm9wdGlvbnNNYXBbY3VydmVbJ2RhdGEtc291cmNlJ11dWzBdO1xuICAgICAgICB2YXIgcmVnaW9uU3RyID0gY3VydmVbJ3JlZ2lvbiddO1xuICAgICAgICB2YXIgcmVnaW9uID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdyZWdpb24nfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KS52YWx1ZXNNYXBba2V5XSA9PT0gcmVnaW9uU3RyKTtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGN1cnZlWyd0cnV0aCddO1xuICAgICAgICB2YXIgc291cmNlU3RyID0gXCJcIjtcbiAgICAgICAgaWYgKHNvdXJjZSAhPT0gXCJBbGxcIikge1xuICAgICAgICAgICAgc291cmNlU3RyID0gXCJfXCIgKyBzb3VyY2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNjYWxlU3RyID0gY3VydmVbJ3NjYWxlJ107XG4gICAgICAgIHZhciBzY2FsZSA9IE9iamVjdC5rZXlzKG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnc2NhbGUnfSkudmFsdWVzTWFwKS5maW5kKGtleSA9PiBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3NjYWxlJ30pLnZhbHVlc01hcFtrZXldID09PSBzY2FsZVN0cik7XG4gICAgICAgIHZhciBzdGF0aXN0aWNTZWxlY3QgPSBjdXJ2ZVsnc3RhdGlzdGljJ107XG4gICAgICAgIHZhciBzdGF0aXN0aWNPcHRpb25zTWFwID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzdGF0aXN0aWMnfSwge29wdGlvbnNNYXA6IDF9KVsnb3B0aW9uc01hcCddO1xuICAgICAgICB2YXIgc3RhdGlzdGljID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzBdO1xuICAgICAgICB2YXIgZGF0ZVJhbmdlID0gbWF0c0RhdGFVdGlscy5nZXREYXRlUmFuZ2UoY3VydmVbJ2N1cnZlLWRhdGVzJ10pO1xuICAgICAgICB2YXIgZnJvbVNlY3MgPSBkYXRlUmFuZ2UuZnJvbVNlY29uZHM7XG4gICAgICAgIHZhciB0b1NlY3MgPSBkYXRlUmFuZ2UudG9TZWNvbmRzO1xuICAgICAgICB2YXIgdmFsaWRUaW1lcyA9IGN1cnZlWyd2YWxpZC10aW1lJ10gPT09IHVuZGVmaW5lZCA/IFtdIDogY3VydmVbJ3ZhbGlkLXRpbWUnXTtcbiAgICAgICAgdmFyIGZvcmVjYXN0TGVuZ3RoID0gY3VydmVbJ2ZvcmVjYXN0LWxlbmd0aCddO1xuICAgICAgICAvLyBheGlzS2V5IGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHdoaWNoIGF4aXMgYSBjdXJ2ZSBzaG91bGQgdXNlLlxuICAgICAgICAvLyBUaGlzIGF4aXNLZXlTZXQgb2JqZWN0IGlzIHVzZWQgbGlrZSBhIHNldCBhbmQgaWYgYSBjdXJ2ZSBoYXMgdGhlIHNhbWVcbiAgICAgICAgLy8gdW5pdHMgKGF4aXNLZXkpIGl0IHdpbGwgdXNlIHRoZSBzYW1lIGF4aXMuXG4gICAgICAgIC8vIFRoZSBheGlzIG51bWJlciBpcyBhc3NpZ25lZCB0byB0aGUgYXhpc0tleVNldCB2YWx1ZSwgd2hpY2ggaXMgdGhlIGF4aXNLZXkuXG4gICAgICAgIHZhciBheGlzS2V5ID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzFdO1xuICAgICAgICBjdXJ2ZXNbY3VydmVJbmRleF0uYXhpc0tleSA9IGF4aXNLZXk7IC8vIHN0YXNoIHRoZSBheGlzS2V5IHRvIHVzZSBpdCBsYXRlciBmb3IgYXhpcyBvcHRpb25zXG4gICAgICAgIHZhciBpZGVhbFZhbCA9IHN0YXRpc3RpY09wdGlvbnNNYXBbc3RhdGlzdGljU2VsZWN0XVsyXTtcbiAgICAgICAgaWYgKGlkZWFsVmFsICE9PSBudWxsICYmIGlkZWFsVmFsdWVzLmluZGV4T2YoaWRlYWxWYWwpID09PSAtMSkge1xuICAgICAgICAgICAgaWRlYWxWYWx1ZXMucHVzaChpZGVhbFZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZDtcbiAgICAgICAgaWYgKGRpZmZGcm9tID09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgYSBkYXRhYmFzZSBkcml2ZW4gY3VydmUsIG5vdCBhIGRpZmZlcmVuY2UgY3VydmVcbiAgICAgICAgICAgIC8vIHByZXBhcmUgdGhlIHF1ZXJ5IGZyb20gdGhlIGFib3ZlIHBhcmFtZXRlcnNcbiAgICAgICAgICAgIHZhciBzdGF0ZW1lbnQgPSBcIlNFTEVDVCBtMC50cnNoIGFzIGF2dGltZSwgXCIgK1xuICAgICAgICAgICAgICAgIFwiY291bnQoZGlzdGluY3QgbTAudGltZSkgYXMgTl90aW1lcywgXCIgK1xuICAgICAgICAgICAgICAgIFwibWluKG0wLnRpbWUpIGFzIG1pbl9zZWNzLCBcIiArXG4gICAgICAgICAgICAgICAgXCJtYXgobTAudGltZSkgYXMgbWF4X3NlY3MsIFwiICtcbiAgICAgICAgICAgICAgICBcInt7c3RhdGlzdGljfX0gXCIgK1xuICAgICAgICAgICAgICAgIFwiZnJvbSB7e2RhdGFfc291cmNlfX0gYXMgbTAgXCIgK1xuICAgICAgICAgICAgICAgIFwid2hlcmUgMT0xIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC50aW1lID49ICd7e2Zyb21TZWNzfX0nIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC50aW1lIDw9ICd7e3RvU2Vjc319JyBcIiArXG4gICAgICAgICAgICAgICAgXCJ7e3ZhbGlkVGltZUNsYXVzZX19IFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC5oaXQrbTAuZmErbTAubWlzcyttMC5jbiA+IDAgXCIgK1xuICAgICAgICAgICAgICAgIFwiYW5kIG0wLmZjc3RfbGVuID0gJ3t7Zm9yZWNhc3RMZW5ndGh9fScgXCIgK1xuICAgICAgICAgICAgICAgIFwiZ3JvdXAgYnkgYXZ0aW1lIFwiICtcbiAgICAgICAgICAgICAgICBcIm9yZGVyIGJ5IGF2dGltZVwiICtcbiAgICAgICAgICAgICAgICBcIjtcIjtcblxuICAgICAgICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50LnJlcGxhY2UoJ3t7ZnJvbVNlY3N9fScsIGZyb21TZWNzKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3RvU2Vjc319JywgdG9TZWNzKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2RhdGFfc291cmNlfX0nLCBkYXRhX3NvdXJjZSArICdfJyArIHNjYWxlICsgc291cmNlU3RyICsgJ18nICsgcmVnaW9uKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e3N0YXRpc3RpY319Jywgc3RhdGlzdGljKTtcbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2ZvcmVjYXN0TGVuZ3RofX0nLCBmb3JlY2FzdExlbmd0aCk7XG4gICAgICAgICAgICB2YXIgdmFsaWRUaW1lQ2xhdXNlID0gXCIgXCI7XG4gICAgICAgICAgICBpZiAodmFsaWRUaW1lcy5sZW5ndGggPiAwICYmIHZhbGlkVGltZXMgIT09IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnVudXNlZCkge1xuICAgICAgICAgICAgICAgIHZhbGlkVGltZUNsYXVzZSA9IFwiIGFuZCBmbG9vcigobTAudGltZSklKDI0KjM2MDApLzM2MDApIElOKFwiICsgdmFsaWRUaW1lcyArIFwiKVwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t2YWxpZFRpbWVDbGF1c2V9fScsIHZhbGlkVGltZUNsYXVzZSk7XG5cbiAgICAgICAgICAgIGRhdGFSZXF1ZXN0c1tjdXJ2ZS5sYWJlbF0gPSBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgICAgIHZhciBxdWVyeVJlc3VsdDtcbiAgICAgICAgICAgIHZhciBzdGFydE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgdmFyIGZpbmlzaE1vbWVudDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gc2VuZCB0aGUgcXVlcnkgc3RhdGVtZW50IHRvIHRoZSBxdWVyeSBmdW5jdGlvblxuICAgICAgICAgICAgICAgIHF1ZXJ5UmVzdWx0ID0gbWF0c0RhdGFRdWVyeVV0aWxzLnF1ZXJ5REJTcGVjaWFsdHlDdXJ2ZShzdW1Qb29sLCBzdGF0ZW1lbnQsIHBsb3RUeXBlLCBoYXNMZXZlbHMpO1xuICAgICAgICAgICAgICAgIGZpbmlzaE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgICAgIGRhdGFSZXF1ZXN0c1tcImRhdGEgcmV0cmlldmFsIChxdWVyeSkgdGltZSAtIFwiICsgY3VydmUubGFiZWxdID0ge1xuICAgICAgICAgICAgICAgICAgICBiZWdpbjogc3RhcnRNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaDogZmluaXNoTW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogbW9tZW50LmR1cmF0aW9uKGZpbmlzaE1vbWVudC5kaWZmKHN0YXJ0TW9tZW50KSkuYXNTZWNvbmRzKCkgKyBcIiBzZWNvbmRzXCIsXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZENvdW50OiBxdWVyeVJlc3VsdC5kYXRhLngubGVuZ3RoXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIGRhdGEgYmFjayBmcm9tIHRoZSBxdWVyeVxuICAgICAgICAgICAgICAgIGQgPSBxdWVyeVJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgYW4gZXJyb3IgcHJvZHVjZWQgYnkgYSBidWcgaW4gdGhlIHF1ZXJ5IGZ1bmN0aW9uLCBub3QgYW4gZXJyb3IgcmV0dXJuZWQgYnkgdGhlIG15c3FsIGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgZS5tZXNzYWdlID0gXCJFcnJvciBpbiBxdWVyeURCOiBcIiArIGUubWVzc2FnZSArIFwiIGZvciBzdGF0ZW1lbnQ6IFwiICsgc3RhdGVtZW50O1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHF1ZXJ5UmVzdWx0LmVycm9yICE9PSB1bmRlZmluZWQgJiYgcXVlcnlSZXN1bHQuZXJyb3IgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAocXVlcnlSZXN1bHQuZXJyb3IgPT09IG1hdHNUeXBlcy5NZXNzYWdlcy5OT19EQVRBX0ZPVU5EKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgTk9UIGFuIGVycm9yIGp1c3QgYSBubyBkYXRhIGNvbmRpdGlvblxuICAgICAgICAgICAgICAgICAgICBkYXRhRm91bmRGb3JDdXJ2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgYW4gZXJyb3IgcmV0dXJuZWQgYnkgdGhlIG15c3FsIGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgICAgIGVycm9yICs9IFwiRXJyb3IgZnJvbSB2ZXJpZmljYXRpb24gcXVlcnk6IDxicj5cIiArIHF1ZXJ5UmVzdWx0LmVycm9yICsgXCI8YnI+IHF1ZXJ5OiA8YnI+XCIgKyBzdGF0ZW1lbnQgKyBcIjxicj5cIjtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgKG5ldyBFcnJvcihlcnJvcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc2V0IGF4aXMgbGltaXRzIGJhc2VkIG9uIHJldHVybmVkIGRhdGFcbiAgICAgICAgICAgIHZhciBwb3N0UXVlcnlTdGFydE1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgaWYgKGRhdGFGb3VuZEZvckN1cnZlKSB7XG4gICAgICAgICAgICAgICAgeG1pbiA9IHhtaW4gPCBkLnhtaW4gPyB4bWluIDogZC54bWluO1xuICAgICAgICAgICAgICAgIHhtYXggPSB4bWF4ID4gZC54bWF4ID8geG1heCA6IGQueG1heDtcbiAgICAgICAgICAgICAgICB5bWluID0geW1pbiA8IGQueW1pbiA/IHltaW4gOiBkLnltaW47XG4gICAgICAgICAgICAgICAgeW1heCA9IHltYXggPiBkLnltYXggPyB5bWF4IDogZC55bWF4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBhIGRpZmZlcmVuY2UgY3VydmVcbiAgICAgICAgICAgIGNvbnN0IGRpZmZSZXN1bHQgPSBtYXRzRGF0YURpZmZVdGlscy5nZXREYXRhRm9yRGlmZkN1cnZlKGRhdGFzZXQsIGRpZmZGcm9tLCBwbG90VHlwZSwgaGFzTGV2ZWxzKTtcbiAgICAgICAgICAgIGQgPSBkaWZmUmVzdWx0LmRhdGFzZXQ7XG4gICAgICAgICAgICB4bWluID0geG1pbiA8IGQueG1pbiA/IHhtaW4gOiBkLnhtaW47XG4gICAgICAgICAgICB4bWF4ID0geG1heCA+IGQueG1heCA/IHhtYXggOiBkLnhtYXg7XG4gICAgICAgICAgICB5bWluID0geW1pbiA8IGQueW1pbiA/IHltaW4gOiBkLnltaW47XG4gICAgICAgICAgICB5bWF4ID0geW1heCA+IGQueW1heCA/IHltYXggOiBkLnltYXg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzZXQgY3VydmUgYW5ub3RhdGlvbiB0byBiZSB0aGUgY3VydmUgbWVhbiAtLSBtYXkgYmUgcmVjYWxjdWxhdGVkIGxhdGVyXG4gICAgICAgIC8vIGFsc28gcGFzcyBwcmV2aW91c2x5IGNhbGN1bGF0ZWQgYXhpcyBzdGF0cyB0byBjdXJ2ZSBvcHRpb25zXG4gICAgICAgIGNvbnN0IG1lYW4gPSBkLnN1bSAvIGQueC5sZW5ndGg7XG4gICAgICAgIGNvbnN0IGFubm90YXRpb24gPSBtZWFuID09PSB1bmRlZmluZWQgPyBsYWJlbCArIFwiLSBtZWFuID0gTmFOXCIgOiBsYWJlbCArIFwiLSBtZWFuID0gXCIgKyBtZWFuLnRvUHJlY2lzaW9uKDQpO1xuICAgICAgICBjdXJ2ZVsnYW5ub3RhdGlvbiddID0gYW5ub3RhdGlvbjtcbiAgICAgICAgY3VydmVbJ3htaW4nXSA9IGQueG1pbjtcbiAgICAgICAgY3VydmVbJ3htYXgnXSA9IGQueG1heDtcbiAgICAgICAgY3VydmVbJ3ltaW4nXSA9IGQueW1pbjtcbiAgICAgICAgY3VydmVbJ3ltYXgnXSA9IGQueW1heDtcbiAgICAgICAgY3VydmVbJ2F4aXNLZXknXSA9IGF4aXNLZXk7XG4gICAgICAgIGNvbnN0IGNPcHRpb25zID0gbWF0c0RhdGFDdXJ2ZU9wc1V0aWxzLmdlbmVyYXRlU2VyaWVzQ3VydmVPcHRpb25zKGN1cnZlLCBjdXJ2ZUluZGV4LCBheGlzTWFwLCBkKTsgIC8vIGdlbmVyYXRlIHBsb3Qgd2l0aCBkYXRhLCBjdXJ2ZSBhbm5vdGF0aW9uLCBheGlzIGxhYmVscywgZXRjLlxuICAgICAgICBkYXRhc2V0LnB1c2goY09wdGlvbnMpO1xuICAgICAgICB2YXIgcG9zdFF1ZXJ5RmluaXNoTW9tZW50ID0gbW9tZW50KCk7XG4gICAgICAgIGRhdGFSZXF1ZXN0c1tcInBvc3QgZGF0YSByZXRyaWV2YWwgKHF1ZXJ5KSBwcm9jZXNzIHRpbWUgLSBcIiArIGN1cnZlLmxhYmVsXSA9IHtcbiAgICAgICAgICAgIGJlZ2luOiBwb3N0UXVlcnlTdGFydE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgIGZpbmlzaDogcG9zdFF1ZXJ5RmluaXNoTW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgZHVyYXRpb246IG1vbWVudC5kdXJhdGlvbihwb3N0UXVlcnlGaW5pc2hNb21lbnQuZGlmZihwb3N0UXVlcnlTdGFydE1vbWVudCkpLmFzU2Vjb25kcygpICsgJyBzZWNvbmRzJ1xuICAgICAgICB9XG4gICAgfSAgLy8gZW5kIGZvciBjdXJ2ZXNcblxuICAgIC8vIHByb2Nlc3MgdGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHF1ZXJ5XG4gICAgY29uc3QgYXBwUGFyYW1zID0ge1wicGxvdFR5cGVcIjogcGxvdFR5cGUsIFwiaGFzTGV2ZWxzXCI6IGhhc0xldmVscywgXCJtYXRjaGluZ1wiOiBtYXRjaGluZ307XG4gICAgY29uc3QgY3VydmVJbmZvUGFyYW1zID0ge1xuICAgICAgICBcImN1cnZlc1wiOiBjdXJ2ZXMsXG4gICAgICAgIFwiY3VydmVzTGVuZ3RoXCI6IGN1cnZlc0xlbmd0aCxcbiAgICAgICAgXCJpZGVhbFZhbHVlc1wiOiBpZGVhbFZhbHVlcyxcbiAgICAgICAgXCJ1dGNDeWNsZVN0YXJ0c1wiOiB1dGNDeWNsZVN0YXJ0cyxcbiAgICAgICAgXCJheGlzTWFwXCI6IGF4aXNNYXAsXG4gICAgICAgIFwieG1heFwiOiB4bWF4LFxuICAgICAgICBcInhtaW5cIjogeG1pblxuICAgIH07XG4gICAgY29uc3QgYm9va2tlZXBpbmdQYXJhbXMgPSB7XCJkYXRhUmVxdWVzdHNcIjogZGF0YVJlcXVlc3RzLCBcInRvdGFsUHJvY2Vzc2luZ1N0YXJ0XCI6IHRvdGFsUHJvY2Vzc2luZ1N0YXJ0fTtcbiAgICB2YXIgcmVzdWx0ID0gbWF0c0RhdGFQcm9jZXNzVXRpbHMucHJvY2Vzc0RhdGFYWUN1cnZlKGRhdGFzZXQsIGFwcFBhcmFtcywgY3VydmVJbmZvUGFyYW1zLCBwbG90UGFyYW1zLCBib29ra2VlcGluZ1BhcmFtcyk7XG4gICAgcGxvdEZ1bmN0aW9uKHJlc3VsdCk7XG59OyIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkgQ29sb3JhZG8gU3RhdGUgVW5pdmVyc2l0eSBhbmQgUmVnZW50cyBvZiB0aGUgVW5pdmVyc2l0eSBvZiBDb2xvcmFkby4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqL1xuXG5pbXBvcnQge21hdHNDb2xsZWN0aW9uc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNUeXBlc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhVXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YVF1ZXJ5VXRpbHN9IGZyb20gJ21ldGVvci9yYW5keXA6bWF0cy1jb21tb24nO1xuaW1wb3J0IHttYXRzRGF0YURpZmZVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhQ3VydmVPcHNVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhUHJvY2Vzc1V0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bW9tZW50fSBmcm9tICdtZXRlb3IvbW9tZW50anM6bW9tZW50J1xuXG5kYXRhVmFsaWRUaW1lID0gZnVuY3Rpb24gKHBsb3RQYXJhbXMsIHBsb3RGdW5jdGlvbikge1xuICAgIC8vIGluaXRpYWxpemUgdmFyaWFibGVzIGNvbW1vbiB0byBhbGwgY3VydmVzXG4gICAgY29uc3QgbWF0Y2hpbmcgPSBwbG90UGFyYW1zWydwbG90QWN0aW9uJ10gPT09IG1hdHNUeXBlcy5QbG90QWN0aW9ucy5tYXRjaGVkO1xuICAgIGNvbnN0IHBsb3RUeXBlID0gbWF0c1R5cGVzLlBsb3RUeXBlcy52YWxpZHRpbWU7XG4gICAgY29uc3QgaGFzTGV2ZWxzID0gZmFsc2U7XG4gICAgdmFyIGRhdGFSZXF1ZXN0cyA9IHt9OyAvLyB1c2VkIHRvIHN0b3JlIGRhdGEgcXVlcmllc1xuICAgIHZhciBkYXRhRm91bmRGb3JDdXJ2ZSA9IHRydWU7XG4gICAgdmFyIHRvdGFsUHJvY2Vzc2luZ1N0YXJ0ID0gbW9tZW50KCk7XG4gICAgdmFyIGVycm9yID0gXCJcIjtcbiAgICB2YXIgY3VydmVzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShwbG90UGFyYW1zLmN1cnZlcykpO1xuICAgIHZhciBjdXJ2ZXNMZW5ndGggPSBjdXJ2ZXMubGVuZ3RoO1xuICAgIHZhciBkYXRhc2V0ID0gW107XG4gICAgdmFyIHV0Y0N5Y2xlU3RhcnRzID0gW107XG4gICAgdmFyIGF4aXNNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHZhciB4bWF4ID0gLTEgKiBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIHZhciB5bWF4ID0gLTEgKiBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIHZhciB4bWluID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgeW1pbiA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgdmFyIGlkZWFsVmFsdWVzID0gW107XG5cbiAgICBmb3IgKHZhciBjdXJ2ZUluZGV4ID0gMDsgY3VydmVJbmRleCA8IGN1cnZlc0xlbmd0aDsgY3VydmVJbmRleCsrKSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgdmFyaWFibGVzIHNwZWNpZmljIHRvIGVhY2ggY3VydmVcbiAgICAgICAgdmFyIGN1cnZlID0gY3VydmVzW2N1cnZlSW5kZXhdO1xuICAgICAgICB2YXIgZGlmZkZyb20gPSBjdXJ2ZS5kaWZmRnJvbTtcbiAgICAgICAgdmFyIGxhYmVsID0gY3VydmVbJ2xhYmVsJ107XG4gICAgICAgIHZhciBkYXRhU291cmNlU3RyID0gY3VydmVbJ2RhdGEtc291cmNlJ107XG4gICAgICAgIHZhciBkYXRhX3NvdXJjZSA9IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnZGF0YS1zb3VyY2UnfSkub3B0aW9uc01hcFtjdXJ2ZVsnZGF0YS1zb3VyY2UnXV1bMF07XG4gICAgICAgIHZhciByZWdpb25TdHIgPSBjdXJ2ZVsncmVnaW9uJ107XG4gICAgICAgIHZhciByZWdpb24gPSBPYmplY3Qua2V5cyhtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAncmVnaW9uJ30pLnZhbHVlc01hcFtrZXldID09PSByZWdpb25TdHIpO1xuICAgICAgICB2YXIgc291cmNlID0gY3VydmVbJ3RydXRoJ107XG4gICAgICAgIHZhciBzb3VyY2VTdHIgPSBcIlwiO1xuICAgICAgICBpZiAoc291cmNlICE9PSBcIkFsbFwiKSB7XG4gICAgICAgICAgICBzb3VyY2VTdHIgPSBcIl9cIiArIHNvdXJjZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2NhbGVTdHIgPSBjdXJ2ZVsnc2NhbGUnXTtcbiAgICAgICAgdmFyIHNjYWxlID0gT2JqZWN0LmtleXMobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzY2FsZSd9KS52YWx1ZXNNYXApLmZpbmQoa2V5ID0+IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnc2NhbGUnfSkudmFsdWVzTWFwW2tleV0gPT09IHNjYWxlU3RyKTtcbiAgICAgICAgdmFyIHRocmVzaG9sZFN0ciA9IGN1cnZlWyd0aHJlc2hvbGQnXTtcbiAgICAgICAgdmFyIHRocmVzaG9sZCA9IE9iamVjdC5rZXlzKG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAndGhyZXNob2xkJ30pLnZhbHVlc01hcCkuZmluZChrZXkgPT4gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0aHJlc2hvbGQnfSkudmFsdWVzTWFwW2tleV0gPT09IHRocmVzaG9sZFN0cik7XG4gICAgICAgIHRocmVzaG9sZCA9IHRocmVzaG9sZCAqIDAuMDE7XG4gICAgICAgIHZhciBzdGF0aXN0aWNTZWxlY3QgPSBjdXJ2ZVsnc3RhdGlzdGljJ107XG4gICAgICAgIHZhciBzdGF0aXN0aWNPcHRpb25zTWFwID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdzdGF0aXN0aWMnfSwge29wdGlvbnNNYXA6IDF9KVsnb3B0aW9uc01hcCddO1xuICAgICAgICB2YXIgc3RhdGlzdGljID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzBdO1xuICAgICAgICB2YXIgZGF0ZVJhbmdlID0gbWF0c0RhdGFVdGlscy5nZXREYXRlUmFuZ2UoY3VydmVbJ2N1cnZlLWRhdGVzJ10pO1xuICAgICAgICB2YXIgZnJvbVNlY3MgPSBkYXRlUmFuZ2UuZnJvbVNlY29uZHM7XG4gICAgICAgIHZhciB0b1NlY3MgPSBkYXRlUmFuZ2UudG9TZWNvbmRzO1xuICAgICAgICB2YXIgZm9yZWNhc3RMZW5ndGggPSBjdXJ2ZVsnZm9yZWNhc3QtbGVuZ3RoJ107XG4gICAgICAgIC8vIGF4aXNLZXkgaXMgdXNlZCB0byBkZXRlcm1pbmUgd2hpY2ggYXhpcyBhIGN1cnZlIHNob3VsZCB1c2UuXG4gICAgICAgIC8vIFRoaXMgYXhpc0tleVNldCBvYmplY3QgaXMgdXNlZCBsaWtlIGEgc2V0IGFuZCBpZiBhIGN1cnZlIGhhcyB0aGUgc2FtZVxuICAgICAgICAvLyB1bml0cyAoYXhpc0tleSkgaXQgd2lsbCB1c2UgdGhlIHNhbWUgYXhpcy5cbiAgICAgICAgLy8gVGhlIGF4aXMgbnVtYmVyIGlzIGFzc2lnbmVkIHRvIHRoZSBheGlzS2V5U2V0IHZhbHVlLCB3aGljaCBpcyB0aGUgYXhpc0tleS5cbiAgICAgICAgdmFyIGF4aXNLZXkgPSBzdGF0aXN0aWNPcHRpb25zTWFwW3N0YXRpc3RpY1NlbGVjdF1bMV07XG4gICAgICAgIGN1cnZlc1tjdXJ2ZUluZGV4XS5heGlzS2V5ID0gYXhpc0tleTsgLy8gc3Rhc2ggdGhlIGF4aXNLZXkgdG8gdXNlIGl0IGxhdGVyIGZvciBheGlzIG9wdGlvbnNcbiAgICAgICAgdmFyIGlkZWFsVmFsID0gc3RhdGlzdGljT3B0aW9uc01hcFtzdGF0aXN0aWNTZWxlY3RdWzJdO1xuICAgICAgICBpZiAoaWRlYWxWYWwgIT09IG51bGwgJiYgaWRlYWxWYWx1ZXMuaW5kZXhPZihpZGVhbFZhbCkgPT09IC0xKSB7XG4gICAgICAgICAgICBpZGVhbFZhbHVlcy5wdXNoKGlkZWFsVmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkO1xuICAgICAgICBpZiAoZGlmZkZyb20gPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBhIGRhdGFiYXNlIGRyaXZlbiBjdXJ2ZSwgbm90IGEgZGlmZmVyZW5jZSBjdXJ2ZVxuICAgICAgICAgICAgLy8gcHJlcGFyZSB0aGUgcXVlcnkgZnJvbSB0aGUgYWJvdmUgcGFyYW1ldGVyc1xuICAgICAgICAgICAgdmFyIHN0YXRlbWVudCA9IFwic2VsZWN0IGZsb29yKG0wLnRpbWUlKDI0KjM2MDApLzM2MDApIGFzIGhyX29mX2RheSwgXCIgK1xuICAgICAgICAgICAgICAgIFwiY291bnQoZGlzdGluY3QgbTAudGltZSkgYXMgTl90aW1lcywgXCIgK1xuICAgICAgICAgICAgICAgIFwibWluKG0wLnRpbWUpIGFzIG1pbl9zZWNzLCBcIiArXG4gICAgICAgICAgICAgICAgXCJtYXgobTAudGltZSkgYXMgbWF4X3NlY3MsIFwiICtcbiAgICAgICAgICAgICAgICBcInt7c3RhdGlzdGljfX0gXCIgK1xuICAgICAgICAgICAgICAgIFwiZnJvbSB7e2RhdGFfc291cmNlfX0gYXMgbTAgXCIgK1xuICAgICAgICAgICAgICAgIFwid2hlcmUgMT0xIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC50aW1lID49ICd7e2Zyb21TZWNzfX0nIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC50aW1lIDw9ICd7e3RvU2Vjc319JyBcIiArXG4gICAgICAgICAgICAgICAgXCJhbmQgbTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24gPiAwIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC50cnNoID0gJ3t7dGhyZXNob2xkfX0nIFwiICtcbiAgICAgICAgICAgICAgICBcImFuZCBtMC5mY3N0X2xlbiA9ICd7e2ZvcmVjYXN0TGVuZ3RofX0nIFwiICtcbiAgICAgICAgICAgICAgICBcImdyb3VwIGJ5IGhyX29mX2RheSBcIiArXG4gICAgICAgICAgICAgICAgXCJvcmRlciBieSBocl9vZl9kYXlcIiArXG4gICAgICAgICAgICAgICAgXCI7XCI7XG5cbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudC5yZXBsYWNlKCd7e2Zyb21TZWNzfX0nLCBmcm9tU2Vjcyk7XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t0b1NlY3N9fScsIHRvU2Vjcyk7XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3tkYXRhX3NvdXJjZX19JywgZGF0YV9zb3VyY2UgKyAnXycgKyBzY2FsZSArIHNvdXJjZVN0ciArICdfJyArIHJlZ2lvbik7XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3tzdGF0aXN0aWN9fScsIHN0YXRpc3RpYyk7XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3t0aHJlc2hvbGR9fScsIHRocmVzaG9sZCk7XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQucmVwbGFjZSgne3tmb3JlY2FzdExlbmd0aH19JywgZm9yZWNhc3RMZW5ndGgpO1xuICAgICAgICAgICAgZGF0YVJlcXVlc3RzW2N1cnZlLmxhYmVsXSA9IHN0YXRlbWVudDtcblxuICAgICAgICAgICAgdmFyIHF1ZXJ5UmVzdWx0O1xuICAgICAgICAgICAgdmFyIHN0YXJ0TW9tZW50ID0gbW9tZW50KCk7XG4gICAgICAgICAgICB2YXIgZmluaXNoTW9tZW50O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBzZW5kIHRoZSBxdWVyeSBzdGF0ZW1lbnQgdG8gdGhlIHF1ZXJ5IGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgcXVlcnlSZXN1bHQgPSBtYXRzRGF0YVF1ZXJ5VXRpbHMucXVlcnlEQlNwZWNpYWx0eUN1cnZlKHN1bVBvb2wsIHN0YXRlbWVudCwgcGxvdFR5cGUsIGhhc0xldmVscyk7XG4gICAgICAgICAgICAgICAgZmluaXNoTW9tZW50ID0gbW9tZW50KCk7XG4gICAgICAgICAgICAgICAgZGF0YVJlcXVlc3RzW1wiZGF0YSByZXRyaWV2YWwgKHF1ZXJ5KSB0aW1lIC0gXCIgKyBjdXJ2ZS5sYWJlbF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luOiBzdGFydE1vbWVudC5mb3JtYXQoKSxcbiAgICAgICAgICAgICAgICAgICAgZmluaXNoOiBmaW5pc2hNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBtb21lbnQuZHVyYXRpb24oZmluaXNoTW9tZW50LmRpZmYoc3RhcnRNb21lbnQpKS5hc1NlY29uZHMoKSArIFwiIHNlY29uZHNcIixcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkQ291bnQ6IHF1ZXJ5UmVzdWx0LmRhdGEueC5sZW5ndGhcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIGdldCB0aGUgZGF0YSBiYWNrIGZyb20gdGhlIHF1ZXJ5XG4gICAgICAgICAgICAgICAgZCA9IHF1ZXJ5UmVzdWx0LmRhdGE7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhbiBlcnJvciBwcm9kdWNlZCBieSBhIGJ1ZyBpbiB0aGUgcXVlcnkgZnVuY3Rpb24sIG5vdCBhbiBlcnJvciByZXR1cm5lZCBieSB0aGUgbXlzcWwgZGF0YWJhc2VcbiAgICAgICAgICAgICAgICBlLm1lc3NhZ2UgPSBcIkVycm9yIGluIHF1ZXJ5REI6IFwiICsgZS5tZXNzYWdlICsgXCIgZm9yIHN0YXRlbWVudDogXCIgKyBzdGF0ZW1lbnQ7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocXVlcnlSZXN1bHQuZXJyb3IgIT09IHVuZGVmaW5lZCAmJiBxdWVyeVJlc3VsdC5lcnJvciAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC5lcnJvciA9PT0gbWF0c1R5cGVzLk1lc3NhZ2VzLk5PX0RBVEFfRk9VTkQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBOT1QgYW4gZXJyb3IganVzdCBhIG5vIGRhdGEgY29uZGl0aW9uXG4gICAgICAgICAgICAgICAgICAgIGRhdGFGb3VuZEZvckN1cnZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhbiBlcnJvciByZXR1cm5lZCBieSB0aGUgbXlzcWwgZGF0YWJhc2VcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IgKz0gXCJFcnJvciBmcm9tIHZlcmlmaWNhdGlvbiBxdWVyeTogPGJyPlwiICsgcXVlcnlSZXN1bHQuZXJyb3IgKyBcIjxicj4gcXVlcnk6IDxicj5cIiArIHN0YXRlbWVudCArIFwiPGJyPlwiO1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAobmV3IEVycm9yKGVycm9yKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzZXQgYXhpcyBsaW1pdHMgYmFzZWQgb24gcmV0dXJuZWQgZGF0YVxuICAgICAgICAgICAgdmFyIHBvc3RRdWVyeVN0YXJ0TW9tZW50ID0gbW9tZW50KCk7XG4gICAgICAgICAgICBpZiAoZGF0YUZvdW5kRm9yQ3VydmUpIHtcbiAgICAgICAgICAgICAgICB4bWluID0geG1pbiA8IGQueG1pbiA/IHhtaW4gOiBkLnhtaW47XG4gICAgICAgICAgICAgICAgeG1heCA9IHhtYXggPiBkLnhtYXggPyB4bWF4IDogZC54bWF4O1xuICAgICAgICAgICAgICAgIHltaW4gPSB5bWluIDwgZC55bWluID8geW1pbiA6IGQueW1pbjtcbiAgICAgICAgICAgICAgICB5bWF4ID0geW1heCA+IGQueW1heCA/IHltYXggOiBkLnltYXg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGlzIGlzIGEgZGlmZmVyZW5jZSBjdXJ2ZVxuICAgICAgICAgICAgY29uc3QgZGlmZlJlc3VsdCA9IG1hdHNEYXRhRGlmZlV0aWxzLmdldERhdGFGb3JEaWZmQ3VydmUoZGF0YXNldCwgZGlmZkZyb20sIHBsb3RUeXBlLCBoYXNMZXZlbHMpO1xuICAgICAgICAgICAgZCA9IGRpZmZSZXN1bHQuZGF0YXNldDtcbiAgICAgICAgICAgIHhtaW4gPSB4bWluIDwgZC54bWluID8geG1pbiA6IGQueG1pbjtcbiAgICAgICAgICAgIHhtYXggPSB4bWF4ID4gZC54bWF4ID8geG1heCA6IGQueG1heDtcbiAgICAgICAgICAgIHltaW4gPSB5bWluIDwgZC55bWluID8geW1pbiA6IGQueW1pbjtcbiAgICAgICAgICAgIHltYXggPSB5bWF4ID4gZC55bWF4ID8geW1heCA6IGQueW1heDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNldCBjdXJ2ZSBhbm5vdGF0aW9uIHRvIGJlIHRoZSBjdXJ2ZSBtZWFuIC0tIG1heSBiZSByZWNhbGN1bGF0ZWQgbGF0ZXJcbiAgICAgICAgLy8gYWxzbyBwYXNzIHByZXZpb3VzbHkgY2FsY3VsYXRlZCBheGlzIHN0YXRzIHRvIGN1cnZlIG9wdGlvbnNcbiAgICAgICAgY29uc3QgbWVhbiA9IGQuc3VtIC8gZC54Lmxlbmd0aDtcbiAgICAgICAgY29uc3QgYW5ub3RhdGlvbiA9IG1lYW4gPT09IHVuZGVmaW5lZCA/IGxhYmVsICsgXCItIG1lYW4gPSBOYU5cIiA6IGxhYmVsICsgXCItIG1lYW4gPSBcIiArIG1lYW4udG9QcmVjaXNpb24oNCk7XG4gICAgICAgIGN1cnZlWydhbm5vdGF0aW9uJ10gPSBhbm5vdGF0aW9uO1xuICAgICAgICBjdXJ2ZVsneG1pbiddID0gZC54bWluO1xuICAgICAgICBjdXJ2ZVsneG1heCddID0gZC54bWF4O1xuICAgICAgICBjdXJ2ZVsneW1pbiddID0gZC55bWluO1xuICAgICAgICBjdXJ2ZVsneW1heCddID0gZC55bWF4O1xuICAgICAgICBjdXJ2ZVsnYXhpc0tleSddID0gYXhpc0tleTtcbiAgICAgICAgY29uc3QgY09wdGlvbnMgPSBtYXRzRGF0YUN1cnZlT3BzVXRpbHMuZ2VuZXJhdGVTZXJpZXNDdXJ2ZU9wdGlvbnMoY3VydmUsIGN1cnZlSW5kZXgsIGF4aXNNYXAsIGQpOyAgLy8gZ2VuZXJhdGUgcGxvdCB3aXRoIGRhdGEsIGN1cnZlIGFubm90YXRpb24sIGF4aXMgbGFiZWxzLCBldGMuXG4gICAgICAgIGRhdGFzZXQucHVzaChjT3B0aW9ucyk7XG4gICAgICAgIHZhciBwb3N0UXVlcnlGaW5pc2hNb21lbnQgPSBtb21lbnQoKTtcbiAgICAgICAgZGF0YVJlcXVlc3RzW1wicG9zdCBkYXRhIHJldHJpZXZhbCAocXVlcnkpIHByb2Nlc3MgdGltZSAtIFwiICsgY3VydmUubGFiZWxdID0ge1xuICAgICAgICAgICAgYmVnaW46IHBvc3RRdWVyeVN0YXJ0TW9tZW50LmZvcm1hdCgpLFxuICAgICAgICAgICAgZmluaXNoOiBwb3N0UXVlcnlGaW5pc2hNb21lbnQuZm9ybWF0KCksXG4gICAgICAgICAgICBkdXJhdGlvbjogbW9tZW50LmR1cmF0aW9uKHBvc3RRdWVyeUZpbmlzaE1vbWVudC5kaWZmKHBvc3RRdWVyeVN0YXJ0TW9tZW50KSkuYXNTZWNvbmRzKCkgKyAnIHNlY29uZHMnXG4gICAgICAgIH1cbiAgICB9ICAvLyBlbmQgZm9yIGN1cnZlc1xuXG4gICAgLy8gcHJvY2VzcyB0aGUgZGF0YSByZXR1cm5lZCBieSB0aGUgcXVlcnlcbiAgICBjb25zdCBhcHBQYXJhbXMgPSB7XCJwbG90VHlwZVwiOiBwbG90VHlwZSwgXCJoYXNMZXZlbHNcIjogaGFzTGV2ZWxzLCBcIm1hdGNoaW5nXCI6IG1hdGNoaW5nfTtcbiAgICBjb25zdCBjdXJ2ZUluZm9QYXJhbXMgPSB7XG4gICAgICAgIFwiY3VydmVzXCI6IGN1cnZlcyxcbiAgICAgICAgXCJjdXJ2ZXNMZW5ndGhcIjogY3VydmVzTGVuZ3RoLFxuICAgICAgICBcImlkZWFsVmFsdWVzXCI6IGlkZWFsVmFsdWVzLFxuICAgICAgICBcInV0Y0N5Y2xlU3RhcnRzXCI6IHV0Y0N5Y2xlU3RhcnRzLFxuICAgICAgICBcImF4aXNNYXBcIjogYXhpc01hcCxcbiAgICAgICAgXCJ4bWF4XCI6IHhtYXgsXG4gICAgICAgIFwieG1pblwiOiB4bWluXG4gICAgfTtcbiAgICBjb25zdCBib29ra2VlcGluZ1BhcmFtcyA9IHtcImRhdGFSZXF1ZXN0c1wiOiBkYXRhUmVxdWVzdHMsIFwidG90YWxQcm9jZXNzaW5nU3RhcnRcIjogdG90YWxQcm9jZXNzaW5nU3RhcnR9O1xuICAgIHZhciByZXN1bHQgPSBtYXRzRGF0YVByb2Nlc3NVdGlscy5wcm9jZXNzRGF0YVhZQ3VydmUoZGF0YXNldCwgYXBwUGFyYW1zLCBjdXJ2ZUluZm9QYXJhbXMsIHBsb3RQYXJhbXMsIGJvb2trZWVwaW5nUGFyYW1zKTtcbiAgICBwbG90RnVuY3Rpb24ocmVzdWx0KTtcbn07IiwiLypcbiAqIENvcHlyaWdodCAoYykgMjAxOSBDb2xvcmFkbyBTdGF0ZSBVbml2ZXJzaXR5IGFuZCBSZWdlbnRzIG9mIHRoZSBVbml2ZXJzaXR5IG9mIENvbG9yYWRvLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICovXG5cbmltcG9ydCB7TWV0ZW9yfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7bXlzcWx9IGZyb20gJ21ldGVvci9wY2VsOm15c3FsJztcbmltcG9ydCB7bWF0c1R5cGVzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0NvbGxlY3Rpb25zfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcbmltcG9ydCB7bWF0c0RhdGFVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNEYXRhUXVlcnlVdGlsc30gZnJvbSAnbWV0ZW9yL3JhbmR5cDptYXRzLWNvbW1vbic7XG5pbXBvcnQge21hdHNQYXJhbVV0aWxzfSBmcm9tICdtZXRlb3IvcmFuZHlwOm1hdHMtY29tbW9uJztcblxuLy8gZGV0ZXJtaW5lZCBpbiBkb0N1cnZlUGFyYW5tc1xudmFyIG1pbkRhdGU7XG52YXIgbWF4RGF0ZTtcbnZhciBkc3RyO1xuXG5jb25zdCBkb1Bsb3RQYXJhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKG1hdHNDb2xsZWN0aW9ucy5TZXR0aW5ncy5maW5kT25lKHt9KSA9PT0gdW5kZWZpbmVkIHx8IG1hdHNDb2xsZWN0aW9ucy5TZXR0aW5ncy5maW5kT25lKHt9KS5yZXNldEZyb21Db2RlID09PSB1bmRlZmluZWQgfHwgbWF0c0NvbGxlY3Rpb25zLlNldHRpbmdzLmZpbmRPbmUoe30pLnJlc2V0RnJvbUNvZGUgPT0gdHJ1ZSkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdFBhcmFtcy5yZW1vdmUoe30pO1xuICAgIH1cbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLlBsb3RQYXJhbXMuZmluZCgpLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdFBhcmFtcy5pbnNlcnQoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2RhdGVzJyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5kYXRlUmFuZ2UsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogWycnXSxcbiAgICAgICAgICAgICAgICBzdGFydERhdGU6IG1pbkRhdGUsXG4gICAgICAgICAgICAgICAgc3RvcERhdGU6IG1heERhdGUsXG4gICAgICAgICAgICAgICAgc3VwZXJpb3JOYW1lczogWydkYXRhLXNvdXJjZSddLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGRzdHIsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblZpc2liaWxpdHk6ICdibG9jaycsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiAxLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDEsXG4gICAgICAgICAgICAgICAgaGVscDogXCJkYXRlSGVscC5odG1sXCJcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBwbG90Rm9ybWF0cyA9IHt9O1xuICAgICAgICBwbG90Rm9ybWF0c1ttYXRzVHlwZXMuUGxvdEZvcm1hdHMubWF0Y2hpbmddID0gJ3Nob3cgbWF0Y2hpbmcgZGlmZnMnO1xuICAgICAgICBwbG90Rm9ybWF0c1ttYXRzVHlwZXMuUGxvdEZvcm1hdHMucGFpcndpc2VdID0gJ3BhaXJ3aXNlIGRpZmZzJztcbiAgICAgICAgcGxvdEZvcm1hdHNbbWF0c1R5cGVzLlBsb3RGb3JtYXRzLm5vbmVdID0gJ25vIGRpZmZzJztcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLlBsb3RQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwbG90Rm9ybWF0JyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5yYWRpb0dyb3VwLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNNYXA6IHBsb3RGb3JtYXRzLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IFttYXRzVHlwZXMuUGxvdEZvcm1hdHMubWF0Y2hpbmcsIG1hdHNUeXBlcy5QbG90Rm9ybWF0cy5wYWlyd2lzZSwgbWF0c1R5cGVzLlBsb3RGb3JtYXRzLm5vbmVdLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IG1hdHNUeXBlcy5QbG90Rm9ybWF0cy5ub25lLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uVmlzaWJpbGl0eTogJ2Jsb2NrJyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5T3JkZXI6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheVByaW9yaXR5OiAxLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlHcm91cDogM1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHlBeGlzT3B0aW9uc01hcCA9IHtcbiAgICAgICAgICAgIFwiTnVtYmVyXCI6IFtcIm51bWJlclwiXSxcbiAgICAgICAgICAgIFwiUmVsYXRpdmUgZnJlcXVlbmN5XCI6IFtcInJlbEZyZXFcIl1cbiAgICAgICAgfTtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLlBsb3RQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdoaXN0b2dyYW0teWF4aXMtY29udHJvbHMnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnNlbGVjdCxcbiAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiB5QXhpc09wdGlvbnNNYXAsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogT2JqZWN0LmtleXMoeUF4aXNPcHRpb25zTWFwKSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBPYmplY3Qua2V5cyh5QXhpc09wdGlvbnNNYXApWzBdLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25UZXh0OiAnWS1heGlzIG1vZGUnLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiAyXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB2YXIgYmluT3B0aW9uc01hcCA9IHtcbiAgICAgICAgICAgIFwiRGVmYXVsdCBiaW5zXCI6IFtcImRlZmF1bHRcIl0sXG4gICAgICAgICAgICBcIlNldCBudW1iZXIgb2YgYmluc1wiOiBbXCJiaW5OdW1iZXJcIl0sXG4gICAgICAgICAgICBcIk1ha2UgemVybyBhIGJpbiBib3VuZFwiOiBbXCJ6ZXJvQm91bmRcIl0sXG4gICAgICAgICAgICBcIkNob29zZSBhIGJpbiBib3VuZFwiOiBbXCJjaG9vc2VCb3VuZFwiXSxcbiAgICAgICAgICAgIFwiU2V0IG51bWJlciBvZiBiaW5zIGFuZCBtYWtlIHplcm8gYSBiaW4gYm91bmRcIjogW1wiYmluTnVtYmVyV2l0aFplcm9cIl0sXG4gICAgICAgICAgICBcIlNldCBudW1iZXIgb2YgYmlucyBhbmQgY2hvb3NlIGEgYmluIGJvdW5kXCI6IFtcImJpbk51bWJlcldpdGhDaG9zZW5cIl0sXG4gICAgICAgICAgICBcIk1hbnVhbCBiaW5zXCI6IFtcIm1hbnVhbFwiXSxcbiAgICAgICAgICAgIFwiTWFudWFsIGJpbiBzdGFydCwgbnVtYmVyLCBhbmQgc3RyaWRlXCI6IFtcIm1hbnVhbFN0cmlkZVwiXVxuICAgICAgICB9O1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdFBhcmFtcy5pbnNlcnQoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2hpc3RvZ3JhbS1iaW4tY29udHJvbHMnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnNlbGVjdCxcbiAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiBiaW5PcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IE9iamVjdC5rZXlzKGJpbk9wdGlvbnNNYXApLFxuICAgICAgICAgICAgICAgIGhpZGVPdGhlckZvcjoge1xuICAgICAgICAgICAgICAgICAgICAnYmluLW51bWJlcic6IFtcIkRlZmF1bHQgYmluc1wiLCBcIk1ha2UgemVybyBhIGJpbiBib3VuZFwiLCBcIk1hbnVhbCBiaW5zXCIsIFwiQ2hvb3NlIGEgYmluIGJvdW5kXCJdLFxuICAgICAgICAgICAgICAgICAgICAnYmluLXBpdm90JzogW1wiRGVmYXVsdCBiaW5zXCIsIFwiU2V0IG51bWJlciBvZiBiaW5zXCIsIFwiTWFrZSB6ZXJvIGEgYmluIGJvdW5kXCIsIFwiU2V0IG51bWJlciBvZiBiaW5zIGFuZCBtYWtlIHplcm8gYSBiaW4gYm91bmRcIiwgXCJNYW51YWwgYmluc1wiLCBcIk1hbnVhbCBiaW4gc3RhcnQsIG51bWJlciwgYW5kIHN0cmlkZVwiXSxcbiAgICAgICAgICAgICAgICAgICAgJ2Jpbi1zdGFydCc6IFtcIkRlZmF1bHQgYmluc1wiLCBcIlNldCBudW1iZXIgb2YgYmluc1wiLCBcIk1ha2UgemVybyBhIGJpbiBib3VuZFwiLCBcIkNob29zZSBhIGJpbiBib3VuZFwiLCBcIlNldCBudW1iZXIgb2YgYmlucyBhbmQgbWFrZSB6ZXJvIGEgYmluIGJvdW5kXCIsIFwiU2V0IG51bWJlciBvZiBiaW5zIGFuZCBjaG9vc2UgYSBiaW4gYm91bmRcIiwgXCJNYW51YWwgYmluc1wiXSxcbiAgICAgICAgICAgICAgICAgICAgJ2Jpbi1zdHJpZGUnOiBbXCJEZWZhdWx0IGJpbnNcIiwgXCJTZXQgbnVtYmVyIG9mIGJpbnNcIiwgXCJNYWtlIHplcm8gYSBiaW4gYm91bmRcIiwgXCJDaG9vc2UgYSBiaW4gYm91bmRcIiwgXCJTZXQgbnVtYmVyIG9mIGJpbnMgYW5kIG1ha2UgemVybyBhIGJpbiBib3VuZFwiLCBcIlNldCBudW1iZXIgb2YgYmlucyBhbmQgY2hvb3NlIGEgYmluIGJvdW5kXCIsIFwiTWFudWFsIGJpbnNcIl0sXG4gICAgICAgICAgICAgICAgICAgICdiaW4tYm91bmRzJzogW1wiRGVmYXVsdCBiaW5zXCIsIFwiU2V0IG51bWJlciBvZiBiaW5zXCIsIFwiTWFrZSB6ZXJvIGEgYmluIGJvdW5kXCIsIFwiQ2hvb3NlIGEgYmluIGJvdW5kXCIsIFwiU2V0IG51bWJlciBvZiBiaW5zIGFuZCBtYWtlIHplcm8gYSBiaW4gYm91bmRcIiwgXCJTZXQgbnVtYmVyIG9mIGJpbnMgYW5kIGNob29zZSBhIGJpbiBib3VuZFwiLCBcIk1hbnVhbCBiaW4gc3RhcnQsIG51bWJlciwgYW5kIHN0cmlkZVwiXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IE9iamVjdC5rZXlzKGJpbk9wdGlvbnNNYXApWzBdLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25UZXh0OiAnY3VzdG9taXplIGJpbnMnLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogMixcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiAyXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdFBhcmFtcy5pbnNlcnQoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Jpbi1udW1iZXInLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLm51bWJlclNwaW5uZXIsXG4gICAgICAgICAgICAgICAgb3B0aW9uc01hcDoge30sXG4gICAgICAgICAgICAgICAgb3B0aW9uczogW10sICAgLy8gY29udmVuaWVuY2VcbiAgICAgICAgICAgICAgICBtaW46ICcyJyxcbiAgICAgICAgICAgICAgICBtYXg6ICcxMDAnLFxuICAgICAgICAgICAgICAgIHN0ZXA6ICdhbnknLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICcxMicsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblRleHQ6IFwibnVtYmVyIG9mIGJpbnNcIixcbiAgICAgICAgICAgICAgICBkaXNwbGF5T3JkZXI6IDMsXG4gICAgICAgICAgICAgICAgZGlzcGxheVByaW9yaXR5OiAxLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlHcm91cDogMlxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLlBsb3RQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdiaW4tcGl2b3QnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLm51bWJlclNwaW5uZXIsXG4gICAgICAgICAgICAgICAgb3B0aW9uc01hcDoge30sXG4gICAgICAgICAgICAgICAgb3B0aW9uczogW10sICAgLy8gY29udmVuaWVuY2VcbiAgICAgICAgICAgICAgICBtaW46ICctMTAwMDAnLFxuICAgICAgICAgICAgICAgIG1heDogJzEwMDAwJyxcbiAgICAgICAgICAgICAgICBzdGVwOiAnYW55JyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAnMCcsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblRleHQ6IFwiYmluIHBpdm90IHZhbHVlXCIsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiA0LFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDJcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5QbG90UGFyYW1zLmluc2VydChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYmluLXN0YXJ0JyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5udW1iZXJTcGlubmVyLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNNYXA6IHt9LFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IFtdLCAgIC8vIGNvbnZlbmllbmNlXG4gICAgICAgICAgICAgICAgbWluOiAnLTEwMDAwJyxcbiAgICAgICAgICAgICAgICBtYXg6ICcxMDAwMCcsXG4gICAgICAgICAgICAgICAgc3RlcDogJ2FueScsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogJzAnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25UZXh0OiBcImJpbiBzdGFydFwiLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogNSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiAyXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdFBhcmFtcy5pbnNlcnQoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Jpbi1zdHJpZGUnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLm51bWJlclNwaW5uZXIsXG4gICAgICAgICAgICAgICAgb3B0aW9uc01hcDoge30sXG4gICAgICAgICAgICAgICAgb3B0aW9uczogW10sICAgLy8gY29udmVuaWVuY2VcbiAgICAgICAgICAgICAgICBtaW46ICctMTAwMDAnLFxuICAgICAgICAgICAgICAgIG1heDogJzEwMDAwJyxcbiAgICAgICAgICAgICAgICBzdGVwOiAnYW55JyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAnMCcsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblRleHQ6IFwiYmluIHN0cmlkZVwiLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogNixcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiAyXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdFBhcmFtcy5pbnNlcnQoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Jpbi1ib3VuZHMnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnRleHRJbnB1dCxcbiAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiB7fSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBbXSwgICAvLyBjb252ZW5pZW5jZVxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICcgJyxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uQ292ZXJlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uVGV4dDogXCJiaW4gYm91bmRzIChlbnRlciBudW1iZXJzIHNlcGFyYXRlZCBieSBjb21tYXMpXCIsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiA3LFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDJcbiAgICAgICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG5lZWQgdG8gdXBkYXRlIHRoZSBkYXRlcyBzZWxlY3RvciBpZiB0aGUgbWV0YWRhdGEgaGFzIGNoYW5nZWRcbiAgICAgICAgdmFyIGN1cnJlbnRQYXJhbSA9IG1hdHNDb2xsZWN0aW9ucy5QbG90UGFyYW1zLmZpbmRPbmUoe25hbWU6ICdkYXRlcyd9KTtcbiAgICAgICAgaWYgKCghbWF0c0RhdGFVdGlscy5hcmVPYmplY3RzRXF1YWwoY3VycmVudFBhcmFtLnN0YXJ0RGF0ZSwgbWluRGF0ZSkpIHx8XG4gICAgICAgICAgICAoIW1hdHNEYXRhVXRpbHMuYXJlT2JqZWN0c0VxdWFsKGN1cnJlbnRQYXJhbS5zdG9wRGF0ZSwgbWF4RGF0ZSkpIHx8XG4gICAgICAgICAgICAoIW1hdHNEYXRhVXRpbHMuYXJlT2JqZWN0c0VxdWFsKGN1cnJlbnRQYXJhbS5kZWZhdWx0LCBkc3RyKSkpIHtcbiAgICAgICAgICAgIC8vIGhhdmUgdG8gcmVsb2FkIG1vZGVsIGRhdGFcbiAgICAgICAgICAgIG1hdHNDb2xsZWN0aW9ucy5QbG90UGFyYW1zLnVwZGF0ZSh7bmFtZTogJ2RhdGVzJ30sIHtcbiAgICAgICAgICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZTogbWluRGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgc3RvcERhdGU6IG1heERhdGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGRzdHJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNvbnN0IGRvQ3VydmVQYXJhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKG1hdHNDb2xsZWN0aW9ucy5TZXR0aW5ncy5maW5kT25lKHt9KSA9PT0gdW5kZWZpbmVkIHx8IG1hdHNDb2xsZWN0aW9ucy5TZXR0aW5ncy5maW5kT25lKHt9KS5yZXNldEZyb21Db2RlID09PSB1bmRlZmluZWQgfHwgbWF0c0NvbGxlY3Rpb25zLlNldHRpbmdzLmZpbmRPbmUoe30pLnJlc2V0RnJvbUNvZGUgPT0gdHJ1ZSkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMucmVtb3ZlKHt9KTtcbiAgICB9XG4gICAgdmFyIG1vZGVsT3B0aW9uc01hcCA9IHt9O1xuICAgIHZhciBtb2RlbERhdGVSYW5nZU1hcCA9IHt9O1xuICAgIHZhciByZWdpb25Nb2RlbE9wdGlvbnNNYXAgPSB7fTtcbiAgICB2YXIgZm9yZWNhc3RMZW5ndGhPcHRpb25zTWFwID0ge307XG4gICAgdmFyIHRocmVzaG9sZHNNb2RlbE9wdGlvbnNNYXAgPSB7fTtcbiAgICB2YXIgc2NhbGVNb2RlbE9wdGlvbnNNYXAgPSB7fTtcbiAgICB2YXIgc291cmNlT3B0aW9uc01hcCA9IHt9O1xuICAgIHZhciBtYXN0ZXJSZWdpb25WYWx1ZXNNYXAgPSB7fTtcbiAgICB2YXIgbWFzdGVyVGhyZXNob2xkVmFsdWVzTWFwID0ge307XG4gICAgdmFyIG1hc3RlclNjYWxlVmFsdWVzTWFwID0ge307XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCByb3dzID0gbWF0c0RhdGFRdWVyeVV0aWxzLnNpbXBsZVBvb2xRdWVyeVdyYXBTeW5jaHJvbm91cyhtZXRhZGF0YVBvb2wsIFwiU0VMRUNUIHNob3J0X25hbWUsZGVzY3JpcHRpb24gRlJPTSByZWdpb25fZGVzY3JpcHRpb25zO1wiKTtcbiAgICAgICAgdmFyIG1hc3RlclJlZ0Rlc2NyaXB0aW9uO1xuICAgICAgICB2YXIgbWFzdGVyU2hvcnROYW1lO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJvd3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIG1hc3RlclJlZ0Rlc2NyaXB0aW9uID0gcm93c1tqXS5kZXNjcmlwdGlvbi50cmltKCk7XG4gICAgICAgICAgICBtYXN0ZXJTaG9ydE5hbWUgPSByb3dzW2pdLnNob3J0X25hbWUudHJpbSgpO1xuICAgICAgICAgICAgbWFzdGVyUmVnaW9uVmFsdWVzTWFwW21hc3RlclNob3J0TmFtZV0gPSBtYXN0ZXJSZWdEZXNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIubWVzc2FnZSk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgcm93cyA9IG1hdHNEYXRhUXVlcnlVdGlscy5zaW1wbGVQb29sUXVlcnlXcmFwU3luY2hyb25vdXMoc3VtUG9vbCwgXCJTRUxFQ1QgdHJzaCxkZXNjcmlwdGlvbiBGUk9NIHRocmVzaG9sZF9kZXNjcmlwdGlvbnM7XCIpO1xuICAgICAgICB2YXIgbWFzdGVyRGVzY3JpcHRpb247XG4gICAgICAgIHZhciBtYXN0ZXJUcnNoO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJvd3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIG1hc3RlckRlc2NyaXB0aW9uID0gcm93c1tqXS5kZXNjcmlwdGlvbi50cmltKCk7XG4gICAgICAgICAgICBtYXN0ZXJUcnNoID0gcm93c1tqXS50cnNoLnRyaW0oKTtcbiAgICAgICAgICAgIG1hc3RlclRocmVzaG9sZFZhbHVlc01hcFttYXN0ZXJUcnNoXSA9IG1hc3RlckRlc2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCByb3dzID0gbWF0c0RhdGFRdWVyeVV0aWxzLnNpbXBsZVBvb2xRdWVyeVdyYXBTeW5jaHJvbm91cyhzdW1Qb29sLCBcIlNFTEVDVCBzY2xlLGRlc2NyaXB0aW9uIEZST00gc2NhbGVfZGVzY3JpcHRpb25zO1wiKTtcbiAgICAgICAgdmFyIG1hc3RlclNjYWxlRGVzY3JpcHRpb247XG4gICAgICAgIHZhciBtYXN0ZXJTY2FsZTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByb3dzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBtYXN0ZXJTY2FsZURlc2NyaXB0aW9uID0gcm93c1tqXS5kZXNjcmlwdGlvbi50cmltKCk7XG4gICAgICAgICAgICBtYXN0ZXJTY2FsZSA9IHJvd3Nbal0uc2NsZS50cmltKCk7XG4gICAgICAgICAgICBtYXN0ZXJTY2FsZVZhbHVlc01hcFttYXN0ZXJTY2FsZV0gPSBtYXN0ZXJTY2FsZURlc2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGVyci5tZXNzYWdlKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCByb3dzID0gbWF0c0RhdGFRdWVyeVV0aWxzLnNpbXBsZVBvb2xRdWVyeVdyYXBTeW5jaHJvbm91cyhzdW1Qb29sLCBcInNlbGVjdCBtb2RlbCxyZWdpb25zLHNvdXJjZXMsZGlzcGxheV90ZXh0LGZjc3RfbGVucyx0aHJlc2gsc2NhbGUsbWluZGF0ZSxtYXhkYXRlIGZyb20gcmVnaW9uc19wZXJfbW9kZWxfbWF0c19hbGxfY2F0ZWdvcmllcyBvcmRlciBieSBkaXNwbGF5X2NhdGVnb3J5LCBkaXNwbGF5X29yZGVyO1wiKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICAgIHZhciBtb2RlbF92YWx1ZSA9IHJvd3NbaV0ubW9kZWwudHJpbSgpO1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gcm93c1tpXS5kaXNwbGF5X3RleHQudHJpbSgpO1xuICAgICAgICAgICAgbW9kZWxPcHRpb25zTWFwW21vZGVsXSA9IFttb2RlbF92YWx1ZV07XG5cbiAgICAgICAgICAgIHZhciByb3dNaW5EYXRlID0gbW9tZW50LnV0Yyhyb3dzW2ldLm1pbmRhdGUgKiAxMDAwKS5mb3JtYXQoXCJNTS9ERC9ZWVlZIEhIOm1tXCIpO1xuICAgICAgICAgICAgdmFyIHJvd01heERhdGUgPSBtb21lbnQudXRjKHJvd3NbaV0ubWF4ZGF0ZSAqIDEwMDApLmZvcm1hdChcIk1NL0REL1lZWVkgSEg6bW1cIik7XG4gICAgICAgICAgICBtb2RlbERhdGVSYW5nZU1hcFttb2RlbF0gPSB7bWluRGF0ZTogcm93TWluRGF0ZSwgbWF4RGF0ZTogcm93TWF4RGF0ZX07XG5cbiAgICAgICAgICAgIHZhciBzb3VyY2VzID0gcm93c1tpXS5zb3VyY2VzO1xuICAgICAgICAgICAgdmFyIHNvdXJjZUFyciA9IHNvdXJjZXMuc3BsaXQoJywnKS5tYXAoRnVuY3Rpb24ucHJvdG90eXBlLmNhbGwsIFN0cmluZy5wcm90b3R5cGUudHJpbSk7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNvdXJjZUFyci5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHNvdXJjZUFycltqXSA9IHNvdXJjZUFycltqXS5yZXBsYWNlKC8nfFxcW3xcXF0vZywgXCJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zTWFwW21vZGVsXSA9IHNvdXJjZUFycjtcblxuICAgICAgICAgICAgdmFyIGZvcmVjYXN0TGVuZ3RocyA9IHJvd3NbaV0uZmNzdF9sZW5zO1xuICAgICAgICAgICAgdmFyIGZvcmVjYXN0TGVuZ3RoQXJyID0gZm9yZWNhc3RMZW5ndGhzLnNwbGl0KCcsJykubWFwKEZ1bmN0aW9uLnByb3RvdHlwZS5jYWxsLCBTdHJpbmcucHJvdG90eXBlLnRyaW0pO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBmb3JlY2FzdExlbmd0aEFyci5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGZvcmVjYXN0TGVuZ3RoQXJyW2pdID0gZm9yZWNhc3RMZW5ndGhBcnJbal0ucmVwbGFjZSgvJ3xcXFt8XFxdL2csIFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yZWNhc3RMZW5ndGhPcHRpb25zTWFwW21vZGVsXSA9IGZvcmVjYXN0TGVuZ3RoQXJyO1xuXG4gICAgICAgICAgICB2YXIgdGhyZXNob2xkcyA9IHJvd3NbaV0udGhyZXNoO1xuICAgICAgICAgICAgdmFyIHRocmVzaG9sZHNBcnJSYXcgPSB0aHJlc2hvbGRzLnNwbGl0KCcsJykubWFwKEZ1bmN0aW9uLnByb3RvdHlwZS5jYWxsLCBTdHJpbmcucHJvdG90eXBlLnRyaW0pO1xuICAgICAgICAgICAgdmFyIHRocmVzaG9sZHNBcnIgPSBbXTtcbiAgICAgICAgICAgIHZhciBkdW1teVRocmVzaDtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhyZXNob2xkc0FyclJhdy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGR1bW15VGhyZXNoID0gdGhyZXNob2xkc0FyclJhd1tqXS5yZXBsYWNlKC8nfFxcW3xcXF0vZywgXCJcIik7XG4gICAgICAgICAgICAgICAgdGhyZXNob2xkc0Fyci5wdXNoKG1hc3RlclRocmVzaG9sZFZhbHVlc01hcFtkdW1teVRocmVzaF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyZXNob2xkc01vZGVsT3B0aW9uc01hcFttb2RlbF0gPSB0aHJlc2hvbGRzQXJyO1xuXG4gICAgICAgICAgICB2YXIgcmVnaW9ucyA9IHJvd3NbaV0ucmVnaW9ucztcbiAgICAgICAgICAgIHZhciByZWdpb25zQXJyUmF3ID0gcmVnaW9ucy5zcGxpdCgnLCcpLm1hcChGdW5jdGlvbi5wcm90b3R5cGUuY2FsbCwgU3RyaW5nLnByb3RvdHlwZS50cmltKTtcbiAgICAgICAgICAgIHZhciByZWdpb25zQXJyID0gW107XG4gICAgICAgICAgICB2YXIgZHVtbXlSZWdpb247XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJlZ2lvbnNBcnJSYXcubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBkdW1teVJlZ2lvbiA9IHJlZ2lvbnNBcnJSYXdbal0ucmVwbGFjZSgvJ3xcXFt8XFxdL2csIFwiXCIpO1xuICAgICAgICAgICAgICAgIHJlZ2lvbnNBcnIucHVzaChtYXN0ZXJSZWdpb25WYWx1ZXNNYXBbZHVtbXlSZWdpb25dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZ2lvbk1vZGVsT3B0aW9uc01hcFttb2RlbF0gPSByZWdpb25zQXJyO1xuXG4gICAgICAgICAgICB2YXIgc2NhbGVzID0gcm93c1tpXS5zY2FsZTtcbiAgICAgICAgICAgIHZhciBzY2FsZXNBcnJSYXcgPSBzY2FsZXMuc3BsaXQoJywnKS5tYXAoRnVuY3Rpb24ucHJvdG90eXBlLmNhbGwsIFN0cmluZy5wcm90b3R5cGUudHJpbSk7XG4gICAgICAgICAgICB2YXIgc2NhbGVzQXJyID0gW107XG4gICAgICAgICAgICB2YXIgZHVtbXlTY2FsZTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc2NhbGVzQXJyUmF3Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgZHVtbXlTY2FsZSA9IHNjYWxlc0FyclJhd1tqXS5yZXBsYWNlKC8nfFxcW3xcXF0vZywgXCJcIik7XG4gICAgICAgICAgICAgICAgc2NhbGVzQXJyLnB1c2gobWFzdGVyU2NhbGVWYWx1ZXNNYXBbZHVtbXlTY2FsZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2NhbGVNb2RlbE9wdGlvbnNNYXBbbW9kZWxdID0gc2NhbGVzQXJyO1xuICAgICAgICB9XG5cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5sb2coZXJyLm1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZCh7bmFtZTogJ2xhYmVsJ30pLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdsYWJlbCcsXG4gICAgICAgICAgICAgICAgdHlwZTogbWF0c1R5cGVzLklucHV0VHlwZXMudGV4dElucHV0LFxuICAgICAgICAgICAgICAgIG9wdGlvbnNNYXA6IHt9LFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IFtdLCAgIC8vIGNvbnZlbmllbmNlXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogJycsXG4gICAgICAgICAgICAgICAgdW5pcXVlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25WaXNpYmlsaXR5OiAnYmxvY2snLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiAxLFxuICAgICAgICAgICAgICAgIGhlbHA6ICdsYWJlbC5odG1sJ1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZCh7bmFtZTogJ2RhdGEtc291cmNlJ30pLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdkYXRhLXNvdXJjZScsXG4gICAgICAgICAgICAgICAgdHlwZTogbWF0c1R5cGVzLklucHV0VHlwZXMuc2VsZWN0LFxuICAgICAgICAgICAgICAgIG9wdGlvbnNNYXA6IG1vZGVsT3B0aW9uc01hcCxcbiAgICAgICAgICAgICAgICBkYXRlczogbW9kZWxEYXRlUmFuZ2VNYXAsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogT2JqZWN0LmtleXMobW9kZWxPcHRpb25zTWFwKSwgICAvLyBjb252ZW5pZW5jZVxuICAgICAgICAgICAgICAgIGRlcGVuZGVudE5hbWVzOiBbXCJyZWdpb25cIiwgXCJmb3JlY2FzdC1sZW5ndGhcIiwgXCJ0aHJlc2hvbGRcIiwgXCJzY2FsZVwiLCBcInRydXRoXCIsIFwiZGF0ZXNcIiwgXCJjdXJ2ZS1kYXRlc1wiXSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uQ292ZXJlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBPYmplY3Qua2V5cyhtb2RlbE9wdGlvbnNNYXApWzBdLFxuICAgICAgICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblZpc2liaWxpdHk6ICdibG9jaycsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiAyLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDFcbiAgICAgICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGl0IGlzIGRlZmluZWQgYnV0IGNoZWNrIGZvciBuZWNlc3NhcnkgdXBkYXRlXG4gICAgICAgIHZhciBjdXJyZW50UGFyYW0gPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ2RhdGEtc291cmNlJ30pO1xuICAgICAgICBpZiAoIW1hdHNEYXRhVXRpbHMuYXJlT2JqZWN0c0VxdWFsKGN1cnJlbnRQYXJhbS5vcHRpb25zTWFwLCBtb2RlbE9wdGlvbnNNYXApIHx8XG4gICAgICAgICAgICAoIW1hdHNEYXRhVXRpbHMuYXJlT2JqZWN0c0VxdWFsKGN1cnJlbnRQYXJhbS5kYXRlcywgbW9kZWxEYXRlUmFuZ2VNYXApKSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byByZWxvYWQgbW9kZWwgZGF0YVxuICAgICAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLnVwZGF0ZSh7bmFtZTogJ2RhdGEtc291cmNlJ30sIHtcbiAgICAgICAgICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnNNYXA6IG1vZGVsT3B0aW9uc01hcCxcbiAgICAgICAgICAgICAgICAgICAgZGF0ZXM6IG1vZGVsRGF0ZVJhbmdlTWFwLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBPYmplY3Qua2V5cyhtb2RlbE9wdGlvbnNNYXApLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBPYmplY3Qua2V5cyhtb2RlbE9wdGlvbnNNYXApWzBdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmQoe25hbWU6ICdyZWdpb24nfSkuY291bnQoKSA9PSAwKSB7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5pbnNlcnQoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlZ2lvbicsXG4gICAgICAgICAgICAgICAgdHlwZTogbWF0c1R5cGVzLklucHV0VHlwZXMuc2VsZWN0LFxuICAgICAgICAgICAgICAgIG9wdGlvbnNNYXA6IHJlZ2lvbk1vZGVsT3B0aW9uc01hcCxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiByZWdpb25Nb2RlbE9wdGlvbnNNYXBbT2JqZWN0LmtleXMocmVnaW9uTW9kZWxPcHRpb25zTWFwKVswXV0sICAgLy8gY29udmVuaWVuY2VcbiAgICAgICAgICAgICAgICB2YWx1ZXNNYXA6IG1hc3RlclJlZ2lvblZhbHVlc01hcCxcbiAgICAgICAgICAgICAgICBzdXBlcmlvck5hbWVzOiBbJ2RhdGEtc291cmNlJ10sXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiByZWdpb25Nb2RlbE9wdGlvbnNNYXBbT2JqZWN0LmtleXMocmVnaW9uTW9kZWxPcHRpb25zTWFwKVswXV1bMF0sXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblZpc2liaWxpdHk6ICdibG9jaycsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiAzLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDFcbiAgICAgICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGl0IGlzIGRlZmluZWQgYnV0IGNoZWNrIGZvciBuZWNlc3NhcnkgdXBkYXRlXG4gICAgICAgIHZhciBjdXJyZW50UGFyYW0gPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3JlZ2lvbid9KTtcbiAgICAgICAgaWYgKCghbWF0c0RhdGFVdGlscy5hcmVPYmplY3RzRXF1YWwoY3VycmVudFBhcmFtLm9wdGlvbnNNYXAsIHJlZ2lvbk1vZGVsT3B0aW9uc01hcCkpIHx8XG4gICAgICAgICAgICAoIW1hdHNEYXRhVXRpbHMuYXJlT2JqZWN0c0VxdWFsKGN1cnJlbnRQYXJhbS52YWx1ZXNNYXAsIG1hc3RlclJlZ2lvblZhbHVlc01hcCkpKSB7XG4gICAgICAgICAgICAvLyBoYXZlIHRvIHJlbG9hZCBtb2RlbCBkYXRhXG4gICAgICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMudXBkYXRlKHtuYW1lOiAncmVnaW9uJ30sIHtcbiAgICAgICAgICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnNNYXA6IHJlZ2lvbk1vZGVsT3B0aW9uc01hcCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzTWFwOiBtYXN0ZXJSZWdpb25WYWx1ZXNNYXAsXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IHJlZ2lvbk1vZGVsT3B0aW9uc01hcFtPYmplY3Qua2V5cyhyZWdpb25Nb2RlbE9wdGlvbnNNYXApWzBdXSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogcmVnaW9uTW9kZWxPcHRpb25zTWFwW09iamVjdC5rZXlzKHJlZ2lvbk1vZGVsT3B0aW9uc01hcClbMF1dWzBdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmQoe25hbWU6ICdzdGF0aXN0aWMnfSkuY291bnQoKSA9PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zTWFwID0ge1xuICAgICAgICAgICAgJ1RTUyAoVHJ1ZSBTa2lsbCBTY29yZSknOiBbJygoc3VtKG0wLmhpdCkqc3VtKG0wLmNuKSAtIHN1bShtMC5mYSkqc3VtKG0wLm1pc3MpKS8oKHN1bShtMC5oaXQpK3N1bShtMC5taXNzKSkqKHN1bShtMC5mYSkrc3VtKG0wLmNuKSkpKSAqIDEwMCBhcyBzdGF0LCBncm91cF9jb25jYXQoKChtMC5oaXQqbTAuY24gLSBtMC5mYSptMC5taXNzKS8oKG0wLmhpdCttMC5taXNzKSoobTAuZmErbTAuY24pKSkgKiAxMDAsIFwiO1wiLCBtMC50aW1lIG9yZGVyIGJ5IG0wLnRpbWUpIGFzIHN1Yl9kYXRhLCBjb3VudChtMC5oaXQpIGFzIE4wJywgJ3gxMDAnLCAxMDBdLFxuXG4gICAgICAgICAgICAnUE9EeSAoUE9EIG9mIHByZWNpcCA+IHRocmVzaG9sZCknOiBbJygoc3VtKG0wLmhpdCkrMC4wMCkvc3VtKG0wLmhpdCttMC5taXNzKSkgKiAxMDAgYXMgc3RhdCwgZ3JvdXBfY29uY2F0KCgobTAuaGl0KS8obTAuaGl0K20wLm1pc3MpKSAqIDEwMCwgXCI7XCIsIG0wLnRpbWUgb3JkZXIgYnkgbTAudGltZSkgYXMgc3ViX2RhdGEsIGNvdW50KG0wLmhpdCkgYXMgTjAnLCAneDEwMCcsIDEwMF0sXG5cbiAgICAgICAgICAgICdQT0RuIChQT0Qgb2YgcHJlY2lwIDwgdGhyZXNob2xkKSc6IFsnKChzdW0obTAuY24pKzAuMDApL3N1bShtMC5jbittMC5mYSkpICogMTAwIGFzIHN0YXQsIGdyb3VwX2NvbmNhdCgoKG0wLmNuKS8obTAuY24rbTAuZmEpKSAqIDEwMCwgXCI7XCIsIG0wLnRpbWUgb3JkZXIgYnkgbTAudGltZSkgYXMgc3ViX2RhdGEsIGNvdW50KG0wLmhpdCkgYXMgTjAnLCAneDEwMCcsIDEwMF0sXG5cbiAgICAgICAgICAgICdGQVIgKEZhbHNlIEFsYXJtIFJhdGlvKSc6IFsnKChzdW0obTAuZmEpKzAuMDApL3N1bShtMC5mYSttMC5oaXQpKSAqIDEwMCBhcyBzdGF0LCBncm91cF9jb25jYXQoKChtMC5mYSkvKG0wLmZhK20wLmhpdCkpICogMTAwLCBcIjtcIiwgbTAudGltZSBvcmRlciBieSBtMC50aW1lKSBhcyBzdWJfZGF0YSwgY291bnQobTAuaGl0KSBhcyBOMCcsICd4MTAwJywgMF0sXG5cbiAgICAgICAgICAgICdCaWFzIChmb3JlY2FzdC9hY3R1YWwpJzogWycoKHN1bShtMC5oaXQrbTAuZmEpKzAuMDApL3N1bShtMC5oaXQrbTAubWlzcykpIGFzIHN0YXQsIGdyb3VwX2NvbmNhdCgoKG0wLmhpdCttMC5mYSkvKG0wLmhpdCttMC5taXNzKSksIFwiO1wiLCBtMC50aW1lIG9yZGVyIGJ5IG0wLnRpbWUpIGFzIHN1Yl9kYXRhLCBjb3VudChtMC5oaXQpIGFzIE4wJywgJ1JhdGlvJywgMV0sXG5cbiAgICAgICAgICAgICdDU0kgKENyaXRpY2FsIFN1Y2Nlc3MgSW5kZXgpJzogWycoKHN1bShtMC5oaXQpKzAuMDApL3N1bShtMC5oaXQrbTAubWlzcyttMC5mYSkpICogMTAwIGFzIHN0YXQsIGdyb3VwX2NvbmNhdCgoKG0wLmhpdCkvKG0wLmhpdCttMC5taXNzK20wLmZhKSkgKiAxMDAsIFwiO1wiLCBtMC50aW1lIG9yZGVyIGJ5IG0wLnRpbWUpIGFzIHN1Yl9kYXRhLCBjb3VudChtMC5oaXQpIGFzIE4wJywgJ3gxMDAnLCAxMDBdLFxuXG4gICAgICAgICAgICAnSFNTIChIZWlka2UgU2tpbGwgU2NvcmUpJzogWycoMiooc3VtKG0wLmNuKzAuMDApKnN1bShtMC5oaXQpLXN1bShtMC5taXNzKSpzdW0obTAuZmEpKS8oKHN1bShtMC5jbiswLjAwKStzdW0obTAuZmEpKSooc3VtKG0wLmZhKStzdW0obTAuaGl0KSkrKHN1bShtMC5jbiswLjAwKStzdW0obTAubWlzcykpKihzdW0obTAubWlzcykrc3VtKG0wLmhpdCkpKSkgKiAxMDAgYXMgc3RhdCwgZ3JvdXBfY29uY2F0KCgyKihtMC5jbiptMC5oaXQgLSBtMC5taXNzKm0wLmZhKSAvICgobTAuY24rbTAuZmEpKihtMC5mYSttMC5oaXQpICsgKG0wLmNuK20wLm1pc3MpKihtMC5taXNzK20wLmhpdCkpKSAqIDEwMCwgXCI7XCIsIG0wLnRpbWUgb3JkZXIgYnkgbTAudGltZSkgYXMgc3ViX2RhdGEsIGNvdW50KG0wLmhpdCkgYXMgTjAnLCAneDEwMCcsIDEwMF0sXG5cbiAgICAgICAgICAgICdFVFMgKEVxdWl0YWJsZSBUaHJlYXQgU2NvcmUpJzogWycoc3VtKG0wLmhpdCktKHN1bShtMC5oaXQrbTAuZmEpKnN1bShtMC5oaXQrbTAubWlzcykvc3VtKG0wLmhpdCttMC5mYSttMC5taXNzK20wLmNuKSkpLyhzdW0obTAuaGl0K20wLmZhK20wLm1pc3MpLShzdW0obTAuaGl0K20wLmZhKSpzdW0obTAuaGl0K20wLm1pc3MpL3N1bShtMC5oaXQrbTAuZmErbTAubWlzcyttMC5jbikpKSAqIDEwMCBhcyBzdGF0LCBncm91cF9jb25jYXQoKG0wLmhpdC0oKG0wLmhpdCttMC5mYSkqKG0wLmhpdCttMC5taXNzKS8obTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24pKSkvKChtMC5oaXQrbTAuZmErbTAubWlzcyktKChtMC5oaXQrbTAuZmEpKihtMC5oaXQrbTAubWlzcykvKG0wLmhpdCttMC5mYSttMC5taXNzK20wLmNuKSkpICogMTAwLCBcIjtcIiwgbTAudGltZSBvcmRlciBieSBtMC50aW1lKSBhcyBzdWJfZGF0YSwgY291bnQobTAuaGl0KSBhcyBOMCcsICd4MTAwJywgMTAwXSxcblxuICAgICAgICAgICAgJ05sb3cgKG9icyA8IHRocmVzaG9sZCwgYXZnIHBlciBociknOiBbJ2F2ZyhtMC5jbittMC5mYSswLjAwMCkgYXMgc3RhdCwgZ3JvdXBfY29uY2F0KChtMC5jbittMC5mYSksIFwiO1wiLCBtMC50aW1lIG9yZGVyIGJ5IG0wLnRpbWUpIGFzIHN1Yl9kYXRhLCBjb3VudChtMC5jbikgYXMgTjAnLCAnTnVtYmVyJywgbnVsbF0sXG5cbiAgICAgICAgICAgICdOaGlnaCAob2JzID4gdGhyZXNob2xkLCBhdmcgcGVyIGhyKSc6IFsnYXZnKG0wLmhpdCttMC5taXNzKzAuMDAwKSBhcyBzdGF0LCBncm91cF9jb25jYXQoKG0wLmhpdCttMC5taXNzKSwgXCI7XCIsIG0wLnRpbWUgb3JkZXIgYnkgbTAudGltZSkgYXMgc3ViX2RhdGEsIGNvdW50KG0wLmhpdCkgYXMgTjAnLCAnTnVtYmVyJywgbnVsbF0sXG5cbiAgICAgICAgICAgICdOdG90ICh0b3RhbCBvYnMsIGF2ZyBwZXIgaHIpJzogWydhdmcobTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24rMC4wMDApIGFzIHN0YXQsIGdyb3VwX2NvbmNhdCgobTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24pLCBcIjtcIiwgbTAudGltZSBvcmRlciBieSBtMC50aW1lKSBhcyBzdWJfZGF0YSwgY291bnQobTAuaGl0KSBhcyBOMCcsICdOdW1iZXInLCBudWxsXSxcblxuICAgICAgICAgICAgJ1JhdGlvIChObG93IC8gTnRvdCknOiBbJyhzdW0obTAuY24rbTAuZmErMC4wMDApL3N1bShtMC5oaXQrbTAuZmErbTAubWlzcyttMC5jbiswLjAwMCkpIGFzIHN0YXQsIGdyb3VwX2NvbmNhdCgoKG0wLmNuK20wLmZhKS8obTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24pKSwgXCI7XCIsIG0wLnRpbWUgb3JkZXIgYnkgbTAudGltZSkgYXMgc3ViX2RhdGEsIGNvdW50KG0wLmNuKSBhcyBOMCcsICdSYXRpbycsIG51bGxdLFxuXG4gICAgICAgICAgICAnUmF0aW8gKE5oaWdoIC8gTnRvdCknOiBbJyhzdW0obTAuaGl0K20wLm1pc3MrMC4wMDApL3N1bShtMC5oaXQrbTAuZmErbTAubWlzcyttMC5jbiswLjAwMCkpIGFzIHN0YXQsIGdyb3VwX2NvbmNhdCgoKG0wLmhpdCttMC5taXNzKS8obTAuaGl0K20wLmZhK20wLm1pc3MrbTAuY24pKSwgXCI7XCIsIG0wLnRpbWUgb3JkZXIgYnkgbTAudGltZSkgYXMgc3ViX2RhdGEsIGNvdW50KG0wLmhpdCkgYXMgTjAnLCAnUmF0aW8nLCBudWxsXSxcblxuICAgICAgICAgICAgJ04gaW4gYXZlcmFnZSAodG8gbmVhcmVzdCAxMDApJzogWydzdW0obTAuaGl0K20wLm1pc3MrbTAuZmErbTAuY24rMC4wMDApIGFzIHN0YXQsIGdyb3VwX2NvbmNhdCgobTAuaGl0K20wLm1pc3MrbTAuZmErbTAuY24pLCBcIjtcIiwgbTAudGltZSBvcmRlciBieSBtMC50aW1lKSBhcyBzdWJfZGF0YSwgY291bnQobTAuaGl0KSBhcyBOMCcsICdOdW1iZXInLCBudWxsXVxuICAgICAgICB9O1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzdGF0aXN0aWMnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnNlbGVjdCxcbiAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiBvcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IE9iamVjdC5rZXlzKG9wdGlvbnNNYXApLCAgIC8vIGNvbnZlbmllbmNlXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBPYmplY3Qua2V5cyhvcHRpb25zTWFwKVswXSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uVmlzaWJpbGl0eTogJ2Jsb2NrJyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5T3JkZXI6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheVByaW9yaXR5OiAxLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlHcm91cDogMlxuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kKHtuYW1lOiAndGhyZXNob2xkJ30pLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd0aHJlc2hvbGQnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnNlbGVjdCxcbiAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiB0aHJlc2hvbGRzTW9kZWxPcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IHRocmVzaG9sZHNNb2RlbE9wdGlvbnNNYXBbT2JqZWN0LmtleXModGhyZXNob2xkc01vZGVsT3B0aW9uc01hcClbMF1dLCAgIC8vIGNvbnZlbmllbmNlXG4gICAgICAgICAgICAgICAgdmFsdWVzTWFwOiBtYXN0ZXJUaHJlc2hvbGRWYWx1ZXNNYXAsXG4gICAgICAgICAgICAgICAgc3VwZXJpb3JOYW1lczogWydkYXRhLXNvdXJjZSddLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogdGhyZXNob2xkc01vZGVsT3B0aW9uc01hcFtPYmplY3Qua2V5cyh0aHJlc2hvbGRzTW9kZWxPcHRpb25zTWFwKVswXV1bMF0sXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblZpc2liaWxpdHk6ICdibG9jaycsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiAyLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDJcbiAgICAgICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGl0IGlzIGRlZmluZWQgYnV0IGNoZWNrIGZvciBuZWNlc3NhcnkgdXBkYXRlXG4gICAgICAgIHZhciBjdXJyZW50UGFyYW0gPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ3RocmVzaG9sZCd9KTtcbiAgICAgICAgaWYgKCghbWF0c0RhdGFVdGlscy5hcmVPYmplY3RzRXF1YWwoY3VycmVudFBhcmFtLm9wdGlvbnNNYXAsIHRocmVzaG9sZHNNb2RlbE9wdGlvbnNNYXApKSB8fFxuICAgICAgICAgICAgKCFtYXRzRGF0YVV0aWxzLmFyZU9iamVjdHNFcXVhbChjdXJyZW50UGFyYW0udmFsdWVzTWFwLCBtYXN0ZXJUaHJlc2hvbGRWYWx1ZXNNYXApKSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byByZWxvYWQgbW9kZWwgZGF0YVxuICAgICAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLnVwZGF0ZSh7bmFtZTogJ3RocmVzaG9sZCd9LCB7XG4gICAgICAgICAgICAgICAgJHNldDoge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiB0aHJlc2hvbGRzTW9kZWxPcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZXNNYXA6IG1hc3RlclRocmVzaG9sZFZhbHVlc01hcCxcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogdGhyZXNob2xkc01vZGVsT3B0aW9uc01hcFtPYmplY3Qua2V5cyh0aHJlc2hvbGRzTW9kZWxPcHRpb25zTWFwKVswXV0sXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRocmVzaG9sZHNNb2RlbE9wdGlvbnNNYXBbT2JqZWN0LmtleXModGhyZXNob2xkc01vZGVsT3B0aW9uc01hcClbMF1dWzBdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmQoe25hbWU6ICdhdmVyYWdlJ30pLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBvcHRpb25zTWFwID0ge1xuICAgICAgICAgICAgJ05vbmUnOiBbJ20wLnRpbWUnXSxcbiAgICAgICAgICAgICczaHInOiBbJ2NlaWwoMTA4MDAqZmxvb3IobTAudGltZS8xMDgwMCkrMTA4MDAvMiknXSxcbiAgICAgICAgICAgICc2aHInOiBbJ2NlaWwoMjE2MDAqZmxvb3IobTAudGltZS8yMTYwMCkrMjE2MDAvMiknXSxcbiAgICAgICAgICAgICcxMmhyJzogWydjZWlsKDQzMjAwKmZsb29yKG0wLnRpbWUvNDMyMDApKzQzMjAwLzIpJ10sXG4gICAgICAgICAgICAnMUQnOiBbJ2NlaWwoODY0MDAqZmxvb3IobTAudGltZS84NjQwMCkrODY0MDAvMiknXSxcbiAgICAgICAgICAgICczRCc6IFsnY2VpbCgyNTkyMDAqZmxvb3IobTAudGltZS8yNTkyMDApKzI1OTIwMC8yKSddLFxuICAgICAgICAgICAgJzdEJzogWydjZWlsKDYwNDgwMCpmbG9vcihtMC50aW1lLzYwNDgwMCkrNjA0ODAwLzIpJ10sXG4gICAgICAgICAgICAnMzBEJzogWydjZWlsKDI1OTIwMDAqZmxvb3IobTAudGltZS8yNTkyMDAwKSsyNTkyMDAwLzIpJ10sXG4gICAgICAgICAgICAnNjBEJzogWydjZWlsKDUxODQwMDAqZmxvb3IobTAudGltZS81MTg0MDAwKSs1MTg0MDAwLzIpJ11cbiAgICAgICAgfTtcblxuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdhdmVyYWdlJyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5zZWxlY3QsXG4gICAgICAgICAgICAgICAgb3B0aW9uc01hcDogb3B0aW9uc01hcCxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBPYmplY3Qua2V5cyhvcHRpb25zTWFwKSwgICAvLyBjb252ZW5pZW5jZVxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQ6ICdOb25lJyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAnTm9uZScsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblZpc2liaWxpdHk6ICdibG9jaycsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiAxLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDNcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZCh7bmFtZTogJ2ZvcmVjYXN0LWxlbmd0aCd9KS5jb3VudCgpID09IDApIHtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmluc2VydChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZm9yZWNhc3QtbGVuZ3RoJyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5zZWxlY3QsXG4gICAgICAgICAgICAgICAgb3B0aW9uc01hcDogZm9yZWNhc3RMZW5ndGhPcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IGZvcmVjYXN0TGVuZ3RoT3B0aW9uc01hcFtPYmplY3Qua2V5cyhmb3JlY2FzdExlbmd0aE9wdGlvbnNNYXApWzBdXSwgICAvLyBjb252ZW5pZW5jZVxuICAgICAgICAgICAgICAgIHN1cGVyaW9yTmFtZXM6IFsnZGF0YS1zb3VyY2UnXSxcbiAgICAgICAgICAgICAgICBzZWxlY3RlZDogJycsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiA2LFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25WaXNpYmlsaXR5OiAnYmxvY2snLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25UZXh0OiBcImZvcmVjYXN0IGxlYWQgdGltZVwiLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogMixcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiAzXG4gICAgICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpdCBpcyBkZWZpbmVkIGJ1dCBjaGVjayBmb3IgbmVjZXNzYXJ5IHVwZGF0ZVxuICAgICAgICB2YXIgY3VycmVudFBhcmFtID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICdmb3JlY2FzdC1sZW5ndGgnfSk7XG4gICAgICAgIGlmICghbWF0c0RhdGFVdGlscy5hcmVPYmplY3RzRXF1YWwoY3VycmVudFBhcmFtLm9wdGlvbnNNYXAsIGZvcmVjYXN0TGVuZ3RoT3B0aW9uc01hcCkpIHtcbiAgICAgICAgICAgIC8vIGhhdmUgdG8gcmVsb2FkIG1vZGVsIGRhdGFcbiAgICAgICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy51cGRhdGUoe25hbWU6ICdmb3JlY2FzdC1sZW5ndGgnfSwge1xuICAgICAgICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uc01hcDogZm9yZWNhc3RMZW5ndGhPcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBmb3JlY2FzdExlbmd0aE9wdGlvbnNNYXBbT2JqZWN0LmtleXMoZm9yZWNhc3RMZW5ndGhPcHRpb25zTWFwKVswXV1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZCh7bmFtZTogJ2RpZW9mZi10eXBlJ30pLmNvdW50KCkgPT0gMCkge1xuICAgICAgICB2YXIgZGllb2ZmT3B0aW9uc01hcCA9IHtcbiAgICAgICAgICAgIFwiRGllb2ZmXCI6IFttYXRzVHlwZXMuRm9yZWNhc3RUeXBlcy5kaWVvZmZdLFxuICAgICAgICAgICAgXCJEaWVvZmYgZm9yIGEgc3BlY2lmaWVkIFVUQyBjeWNsZSBpbml0IGhvdXJcIjogW21hdHNUeXBlcy5Gb3JlY2FzdFR5cGVzLnV0Y0N5Y2xlXSxcbiAgICAgICAgICAgIFwiU2luZ2xlIGN5Y2xlIGZvcmVjYXN0ICh1c2VzIGZpcnN0IGRhdGUgaW4gcmFuZ2UpXCI6IFttYXRzVHlwZXMuRm9yZWNhc3RUeXBlcy5zaW5nbGVDeWNsZV1cbiAgICAgICAgfTtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmluc2VydChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZGllb2ZmLXR5cGUnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnNlbGVjdCxcbiAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiBkaWVvZmZPcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IE9iamVjdC5rZXlzKGRpZW9mZk9wdGlvbnNNYXApLFxuICAgICAgICAgICAgICAgIGhpZGVPdGhlckZvcjoge1xuICAgICAgICAgICAgICAgICAgICAndmFsaWQtdGltZSc6IFtcIkRpZW9mZiBmb3IgYSBzcGVjaWZpZWQgVVRDIGN5Y2xlIGluaXQgaG91clwiLCBcIlNpbmdsZSBjeWNsZSBmb3JlY2FzdCAodXNlcyBmaXJzdCBkYXRlIGluIHJhbmdlKVwiXSxcbiAgICAgICAgICAgICAgICAgICAgJ3V0Yy1jeWNsZS1zdGFydCc6IFtcIkRpZW9mZlwiLCBcIlNpbmdsZSBjeWNsZSBmb3JlY2FzdCAodXNlcyBmaXJzdCBkYXRlIGluIHJhbmdlKVwiXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkOiAnJyxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uQ292ZXJlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IE9iamVjdC5rZXlzKGRpZW9mZk9wdGlvbnNNYXApWzBdLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25WaXNpYmlsaXR5OiAnYmxvY2snLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25UZXh0OiAnZGllb2ZmIHR5cGUnLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogMixcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiAzXG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmQoe25hbWU6ICd2YWxpZC10aW1lJ30pLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd2YWxpZC10aW1lJyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5zZWxlY3QsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogWycwJywgJzEnLCAnMicsICczJywgJzQnLCAnNScsICc2JywgJzcnLCAnOCcsICc5JywgJzEwJywgJzExJywgJzEyJywgJzEzJywgJzE0JywgJzE1JywgJzE2JywgJzE3JywgJzE4JywgJzE5JywgJzIwJywgJzIxJywgJzIyJywgJzIzJ10sXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IFtdLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogbWF0c1R5cGVzLklucHV0VHlwZXMudW51c2VkLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25WaXNpYmlsaXR5OiAnYmxvY2snLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25UZXh0OiBcInZhbGlkIHV0YyBob3VyXCIsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiAzLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDMsXG4gICAgICAgICAgICAgICAgbXVsdGlwbGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZCh7bmFtZTogJ3V0Yy1jeWNsZS1zdGFydCd9KS5jb3VudCgpID09IDApIHtcblxuICAgICAgICBjb25zdCBvcHRpb25zQXJyID0gWycwJywgJzEnLCAnMicsICczJywgJzQnLCAnNScsICc2JywgJzcnLCAnOCcsICc5JywgJzEwJywgJzExJywgJzEyJywgJzEzJywgJzE0JywgJzE1JywgJzE2JywgJzE3JywgJzE4JywgJzE5JywgJzIwJywgJzIxJywgJzIyJywgJzIzJ107XG5cbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmluc2VydChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAndXRjLWN5Y2xlLXN0YXJ0JyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5zZWxlY3QsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogb3B0aW9uc0FycixcbiAgICAgICAgICAgICAgICBzZWxlY3RlZDogJycsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBvcHRpb25zQXJyWzEyXSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uVmlzaWJpbGl0eTogJ2Jsb2NrJyxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uVGV4dDogXCJ1dGMgY3ljbGUgaW5pdCBob3VyXCIsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiAzLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDMsXG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmQoe25hbWU6ICd0cnV0aCd9KS5jb3VudCgpID09IDApIHtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmluc2VydChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAndHJ1dGgnLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnNlbGVjdCxcbiAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiBzb3VyY2VPcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IHNvdXJjZU9wdGlvbnNNYXBbT2JqZWN0LmtleXMoc291cmNlT3B0aW9uc01hcClbMF1dLFxuICAgICAgICAgICAgICAgIHN1cGVyaW9yTmFtZXM6IFsnZGF0YS1zb3VyY2UnXSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uQ292ZXJlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHNvdXJjZU9wdGlvbnNNYXBbT2JqZWN0LmtleXMoc291cmNlT3B0aW9uc01hcClbMF1dWzBdLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25WaXNpYmlsaXR5OiAnYmxvY2snLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiA0XG4gICAgICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpdCBpcyBkZWZpbmVkIGJ1dCBjaGVjayBmb3IgbmVjZXNzYXJ5IHVwZGF0ZVxuICAgICAgICB2YXIgY3VycmVudFBhcmFtID0gbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmRPbmUoe25hbWU6ICd0cnV0aCd9KTtcbiAgICAgICAgaWYgKCFtYXRzRGF0YVV0aWxzLmFyZU9iamVjdHNFcXVhbChjdXJyZW50UGFyYW0ub3B0aW9uc01hcCwgc291cmNlT3B0aW9uc01hcCkpIHtcbiAgICAgICAgICAgIC8vIGhhdmUgdG8gcmVsb2FkIG1vZGVsIGRhdGFcbiAgICAgICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy51cGRhdGUoe25hbWU6ICd0cnV0aCd9LCB7XG4gICAgICAgICAgICAgICAgJHNldDoge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiBzb3VyY2VPcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBzb3VyY2VPcHRpb25zTWFwW09iamVjdC5rZXlzKHNvdXJjZU9wdGlvbnNNYXApWzBdXSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogc291cmNlT3B0aW9uc01hcFtPYmplY3Qua2V5cyhzb3VyY2VPcHRpb25zTWFwKVswXV1bMF1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZCh7bmFtZTogJ3NjYWxlJ30pLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuaW5zZXJ0KFxuICAgICAgICAgICAgey8vIGJpYXMgYW5kIG1vZGVsIGF2ZXJhZ2UgYXJlIGEgZGlmZmVyZW50IGZvcm11bGEgZm9yIHdpbmQgKGVsZW1lbnQgMCBkaWZmZXJzIGZyb20gZWxlbWVudCAxKVxuICAgICAgICAgICAgICAgIC8vIGJ1dCBzdGF5cyB0aGUgc2FtZSAoZWxlbWVudCAwIGFuZCBlbGVtZW50IDEgYXJlIHRoZSBzYW1lKSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgLy8gV2hlbiBwbG90dGluZyBwcm9maWxlcyB3ZSBhcHBlbmQgZWxlbWVudCAyIHRvIHdoaWNoZXZlciBlbGVtZW50IHdhcyBjaG9zZW4gKGZvciB3aW5kIHZhcmlhYmxlKS4gRm9yXG4gICAgICAgICAgICAgICAgLy8gdGltZSBzZXJpZXMgd2UgbmV2ZXIgYXBwZW5kIGVsZW1lbnQgMi4gRWxlbWVudCAzIGlzIHVzZWQgdG8gZ2l2ZSB1cyBlcnJvciB2YWx1ZXMgZm9yIGVycm9yIGJhcnMuXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjYWxlJyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5zZWxlY3QsXG4gICAgICAgICAgICAgICAgb3B0aW9uc01hcDogc2NhbGVNb2RlbE9wdGlvbnNNYXAsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogc2NhbGVNb2RlbE9wdGlvbnNNYXBbT2JqZWN0LmtleXMoc2NhbGVNb2RlbE9wdGlvbnNNYXApWzBdXSwgICAvLyBjb252ZW5pZW5jZVxuICAgICAgICAgICAgICAgIHZhbHVlc01hcDogbWFzdGVyU2NhbGVWYWx1ZXNNYXAsXG4gICAgICAgICAgICAgICAgc3VwZXJpb3JOYW1lczogWydkYXRhLXNvdXJjZSddLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25Db3ZlcmVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHVuaXF1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogc2NhbGVNb2RlbE9wdGlvbnNNYXBbT2JqZWN0LmtleXMoc2NhbGVNb2RlbE9wdGlvbnNNYXApWzBdXVswXSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uVmlzaWJpbGl0eTogJ2Jsb2NrJyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5T3JkZXI6IDMsXG4gICAgICAgICAgICAgICAgZGlzcGxheVByaW9yaXR5OiAxLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlHcm91cDogM1xuICAgICAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaXQgaXMgZGVmaW5lZCBidXQgY2hlY2sgZm9yIG5lY2Vzc2FyeSB1cGRhdGVcbiAgICAgICAgdmFyIGN1cnJlbnRQYXJhbSA9IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOiAnc2NhbGUnfSk7XG4gICAgICAgIGlmICgoIW1hdHNEYXRhVXRpbHMuYXJlT2JqZWN0c0VxdWFsKGN1cnJlbnRQYXJhbS5vcHRpb25zTWFwLCBzY2FsZU1vZGVsT3B0aW9uc01hcCkpIHx8XG4gICAgICAgICAgICAoIW1hdHNEYXRhVXRpbHMuYXJlT2JqZWN0c0VxdWFsKGN1cnJlbnRQYXJhbS52YWx1ZXNNYXAsIG1hc3RlclNjYWxlVmFsdWVzTWFwKSkpIHtcbiAgICAgICAgICAgIC8vIGhhdmUgdG8gcmVsb2FkIG1vZGVsIGRhdGFcbiAgICAgICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy51cGRhdGUoe25hbWU6ICdzY2FsZSd9LCB7XG4gICAgICAgICAgICAgICAgJHNldDoge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiBzY2FsZU1vZGVsT3B0aW9uc01hcCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzTWFwOiBtYXN0ZXJTY2FsZVZhbHVlc01hcCxcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogc2NhbGVNb2RlbE9wdGlvbnNNYXBbT2JqZWN0LmtleXMoc2NhbGVNb2RlbE9wdGlvbnNNYXApWzBdXSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogc2NhbGVNb2RlbE9wdGlvbnNNYXBbT2JqZWN0LmtleXMoc2NhbGVNb2RlbE9wdGlvbnNNYXApWzBdXVswXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmZpbmQoe25hbWU6ICd4LWF4aXMtcGFyYW1ldGVyJ30pLmNvdW50KCkgPT0gMCkge1xuXG4gICAgICAgIGNvbnN0IG9wdGlvbnNNYXAgPSB7XG4gICAgICAgICAgICAnRmNzdCBsZWFkIHRpbWUnOiBcInNlbGVjdCBtMC5mY3N0X2xlbiBhcyB4VmFsLCBcIixcbiAgICAgICAgICAgICdUaHJlc2hvbGQnOiBcInNlbGVjdCBtMC50aHJlc2gvMTAwIGFzIHhWYWwsIFwiLFxuICAgICAgICAgICAgJ1ZhbGlkIFVUQyBob3VyJzogXCJzZWxlY3QgbTAudGltZSUoMjQqMzYwMCkvMzYwMCBhcyB4VmFsLCBcIixcbiAgICAgICAgICAgICdJbml0IFVUQyBob3VyJzogXCJzZWxlY3QgKG0wLnRpbWUtbTAuZmNzdF9sZW4qMzYwMCklKDI0KjM2MDApLzM2MDAgYXMgeFZhbCwgXCIsXG4gICAgICAgICAgICAnVmFsaWQgRGF0ZSc6IFwic2VsZWN0IG0wLnRpbWUgYXMgeFZhbCwgXCIsXG4gICAgICAgICAgICAnSW5pdCBEYXRlJzogXCJzZWxlY3QgbTAudGltZS1tMC5mY3N0X2xlbiozNjAwIGFzIHhWYWwsIFwiXG4gICAgICAgIH07XG5cbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLmluc2VydChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAneC1heGlzLXBhcmFtZXRlcicsXG4gICAgICAgICAgICAgICAgdHlwZTogbWF0c1R5cGVzLklucHV0VHlwZXMuc2VsZWN0LFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IE9iamVjdC5rZXlzKG9wdGlvbnNNYXApLFxuICAgICAgICAgICAgICAgIG9wdGlvbnNNYXA6IG9wdGlvbnNNYXAsXG4gICAgICAgICAgICAgICAgLy8gaGlkZU90aGVyRm9yOiB7XG4gICAgICAgICAgICAgICAgLy8gICAgICdmb3JlY2FzdC1sZW5ndGgnOiBbXCJGY3N0IGxlYWQgdGltZVwiXSxcbiAgICAgICAgICAgICAgICAvLyAgICAgJ3ZhbGlkLXRpbWUnOiBbXCJWYWxpZCBVVEMgaG91clwiXSxcbiAgICAgICAgICAgICAgICAvLyAgICAgJ3ByZXMtbGV2ZWwnOiBbXCJQcmVzc3VyZSBsZXZlbFwiXSxcbiAgICAgICAgICAgICAgICAvLyB9LFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkOiAnJyxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uQ292ZXJlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IE9iamVjdC5rZXlzKG9wdGlvbnNNYXApWzJdLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xCdXR0b25WaXNpYmlsaXR5OiAnYmxvY2snLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlPcmRlcjogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5UHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgZGlzcGxheUdyb3VwOiA1LFxuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kKHtuYW1lOiAneS1heGlzLXBhcmFtZXRlcid9KS5jb3VudCgpID09IDApIHtcblxuICAgICAgICBjb25zdCBvcHRpb25zTWFwID0ge1xuICAgICAgICAgICAgJ0Zjc3QgbGVhZCB0aW1lJzogXCJtMC5mY3N0X2xlbiBhcyB5VmFsLCBcIixcbiAgICAgICAgICAgICdUaHJlc2hvbGQnOiBcIm0wLnRocmVzaC8xMDAgYXMgeVZhbCwgXCIsXG4gICAgICAgICAgICAnVmFsaWQgVVRDIGhvdXInOiBcIm0wLnRpbWUlKDI0KjM2MDApLzM2MDAgYXMgeVZhbCwgXCIsXG4gICAgICAgICAgICAnSW5pdCBVVEMgaG91cic6IFwiKG0wLnRpbWUtbTAuZmNzdF9sZW4qMzYwMCklKDI0KjM2MDApLzM2MDAgYXMgeVZhbCwgXCIsXG4gICAgICAgICAgICAnVmFsaWQgRGF0ZSc6IFwibTAudGltZSBhcyB5VmFsLCBcIixcbiAgICAgICAgICAgICdJbml0IERhdGUnOiBcIm0wLnRpbWUtbTAuZmNzdF9sZW4qMzYwMCBhcyB5VmFsLCBcIlxuICAgICAgICB9O1xuXG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5pbnNlcnQoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3ktYXhpcy1wYXJhbWV0ZXInLFxuICAgICAgICAgICAgICAgIHR5cGU6IG1hdHNUeXBlcy5JbnB1dFR5cGVzLnNlbGVjdCxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBPYmplY3Qua2V5cyhvcHRpb25zTWFwKSxcbiAgICAgICAgICAgICAgICBvcHRpb25zTWFwOiBvcHRpb25zTWFwLFxuICAgICAgICAgICAgICAgIC8vIGhpZGVPdGhlckZvcjoge1xuICAgICAgICAgICAgICAgIC8vICAgICAnZm9yZWNhc3QtbGVuZ3RoJzogW1wiRmNzdCBsZWFkIHRpbWVcIl0sXG4gICAgICAgICAgICAgICAgLy8gICAgICd2YWxpZC10aW1lJzogW1wiVmFsaWQgVVRDIGhvdXJcIl0sXG4gICAgICAgICAgICAgICAgLy8gICAgICdwcmVzLWxldmVsJzogW1wiUHJlc3N1cmUgbGV2ZWxcIl0sXG4gICAgICAgICAgICAgICAgLy8gfSxcbiAgICAgICAgICAgICAgICBzZWxlY3RlZDogJycsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvbkNvdmVyZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBPYmplY3Qua2V5cyhvcHRpb25zTWFwKVswXSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uVmlzaWJpbGl0eTogJ2Jsb2NrJyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5T3JkZXI6IDIsXG4gICAgICAgICAgICAgICAgZGlzcGxheVByaW9yaXR5OiAxLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlHcm91cDogNSxcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGRldGVybWluZSBkYXRlIGRlZmF1bHRzIGZvciBkYXRlcyBhbmQgY3VydmVEYXRlc1xuICAgIHZhciBkZWZhdWx0RGF0YVNvdXJjZSA9IG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5maW5kT25lKHtuYW1lOlwiZGF0YS1zb3VyY2VcIn0se2RlZmF1bHQ6MX0pLmRlZmF1bHQ7XG4gICAgbW9kZWxEYXRlUmFuZ2VNYXAgPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTpcImRhdGEtc291cmNlXCJ9LHtkYXRlczoxfSkuZGF0ZXM7XG4gICAgbWluRGF0ZSA9IG1vZGVsRGF0ZVJhbmdlTWFwW2RlZmF1bHREYXRhU291cmNlXS5taW5EYXRlO1xuICAgIG1heERhdGUgPSBtb2RlbERhdGVSYW5nZU1hcFtkZWZhdWx0RGF0YVNvdXJjZV0ubWF4RGF0ZTtcbiAgICB2YXIgbWludXNNb250aE1pbkRhdGUgPSBtYXRzUGFyYW1VdGlscy5nZXRNaW5NYXhEYXRlcyhtaW5EYXRlLCBtYXhEYXRlKS5taW5EYXRlO1xuICAgIGRzdHIgPSBtaW51c01vbnRoTWluRGF0ZSArICcgLSAnICsgbWF4RGF0ZTtcblxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZCh7bmFtZTogJ2N1cnZlLWRhdGVzJ30pLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBvcHRpb25zTWFwID0ge1xuICAgICAgICAgICAgJzEgZGF5JzogWycxIGRheSddLFxuICAgICAgICAgICAgJzMgZGF5cyc6IFsnMyBkYXlzJ10sXG4gICAgICAgICAgICAnNyBkYXlzJzogWyc3IGRheXMnXSxcbiAgICAgICAgICAgICczMSBkYXlzJzogWyczMSBkYXlzJ10sXG4gICAgICAgICAgICAnOTAgZGF5cyc6IFsnOTAgZGF5cyddLFxuICAgICAgICAgICAgJzE4MCBkYXlzJzogWycxODAgZGF5cyddLFxuICAgICAgICAgICAgJzM2NSBkYXlzJzogWyczNjUgZGF5cyddXG4gICAgICAgIH07XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVBhcmFtcy5pbnNlcnQoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2N1cnZlLWRhdGVzJyxcbiAgICAgICAgICAgICAgICB0eXBlOiBtYXRzVHlwZXMuSW5wdXRUeXBlcy5kYXRlUmFuZ2UsXG4gICAgICAgICAgICAgICAgb3B0aW9uc01hcDogb3B0aW9uc01hcCxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBPYmplY3Qua2V5cyhvcHRpb25zTWFwKS5zb3J0KCksXG4gICAgICAgICAgICAgICAgc3RhcnREYXRlOiBtaW5EYXRlLFxuICAgICAgICAgICAgICAgIHN0b3BEYXRlOiBtYXhEYXRlLFxuICAgICAgICAgICAgICAgIHN1cGVyaW9yTmFtZXM6IFsnZGF0YS1zb3VyY2UnXSxcbiAgICAgICAgICAgICAgICBjb250cm9sQnV0dG9uQ292ZXJlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB1bmlxdWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGRzdHIsXG4gICAgICAgICAgICAgICAgY29udHJvbEJ1dHRvblZpc2liaWxpdHk6ICdibG9jaycsXG4gICAgICAgICAgICAgICAgZGlzcGxheU9yZGVyOiAxLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5R3JvdXA6IDYsXG4gICAgICAgICAgICAgICAgaGVscDogXCJkYXRlSGVscC5odG1sXCJcbiAgICAgICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGl0IGlzIGRlZmluZWQgYnV0IGNoZWNrIGZvciBuZWNlc3NhcnkgdXBkYXRlXG4gICAgICAgIHZhciBjdXJyZW50UGFyYW0gPSBtYXRzQ29sbGVjdGlvbnMuQ3VydmVQYXJhbXMuZmluZE9uZSh7bmFtZTogJ2N1cnZlLWRhdGVzJ30pO1xuICAgICAgICBpZiAoKCFtYXRzRGF0YVV0aWxzLmFyZU9iamVjdHNFcXVhbChjdXJyZW50UGFyYW0uc3RhcnREYXRlLCBtaW5EYXRlKSkgfHxcbiAgICAgICAgICAgICghbWF0c0RhdGFVdGlscy5hcmVPYmplY3RzRXF1YWwoY3VycmVudFBhcmFtLnN0b3BEYXRlLCBtYXhEYXRlKSkgfHxcbiAgICAgICAgICAgICghbWF0c0RhdGFVdGlscy5hcmVPYmplY3RzRXF1YWwoY3VycmVudFBhcmFtLmRlZmF1bHQsIGRzdHIpKSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byByZWxvYWQgbW9kZWwgZGF0YVxuICAgICAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlUGFyYW1zLnVwZGF0ZSh7bmFtZTogJ2N1cnZlLWRhdGVzJ30sIHtcbiAgICAgICAgICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0ZTogbWluRGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgc3RvcERhdGU6IG1heERhdGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGRzdHJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qIFRoZSBmb3JtYXQgb2YgYSBjdXJ2ZVRleHRQYXR0ZXJuIGlzIGFuIGFycmF5IG9mIGFycmF5cywgZWFjaCBzdWIgYXJyYXkgaGFzXG4gW2xhYmVsU3RyaW5nLCBsb2NhbFZhcmlhYmxlTmFtZSwgZGVsaW1pdGVyU3RyaW5nXSAgYW55IG9mIHdoaWNoIGNhbiBiZSBudWxsLlxuIEVhY2ggc3ViIGFycmF5IHdpbGwgYmUgam9pbmVkICh0aGUgbG9jYWxWYXJpYWJsZU5hbWUgaXMgYWx3YXlzIGRlcmVmZXJlbmNlZCBmaXJzdClcbiBhbmQgdGhlbiB0aGUgc3ViIGFycmF5cyB3aWxsIGJlIGpvaW5lZCBtYWludGFpbmluZyBvcmRlci5cblxuIFRoZSBjdXJ2ZVRleHRQYXR0ZXJuIGlzIGZvdW5kIGJ5IGl0cyBuYW1lIHdoaWNoIG11c3QgbWF0Y2ggdGhlIGNvcnJlc3BvbmRpbmcgUGxvdEdyYXBoRnVuY3Rpb25zLlBsb3RUeXBlIHZhbHVlLlxuIFNlZSBjdXJ2ZV9pdGVtLmpzIGFuZCBzdGFuZEFsb25lLmpzLlxuICovXG5jb25zdCBkb0N1cnZlVGV4dFBhdHRlcm5zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuU2V0dGluZ3MuZmluZE9uZSh7fSkgPT09IHVuZGVmaW5lZCB8fCBtYXRzQ29sbGVjdGlvbnMuU2V0dGluZ3MuZmluZE9uZSh7fSkucmVzZXRGcm9tQ29kZSA9PT0gdW5kZWZpbmVkIHx8IG1hdHNDb2xsZWN0aW9ucy5TZXR0aW5ncy5maW5kT25lKHt9KS5yZXNldEZyb21Db2RlID09IHRydWUpIHtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlVGV4dFBhdHRlcm5zLnJlbW92ZSh7fSk7XG4gICAgfVxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuQ3VydmVUZXh0UGF0dGVybnMuZmluZCgpLmNvdW50KCkgPT0gMCkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVUZXh0UGF0dGVybnMuaW5zZXJ0KHtcbiAgICAgICAgICAgIHBsb3RUeXBlOiBtYXRzVHlwZXMuUGxvdFR5cGVzLnRpbWVTZXJpZXMsXG4gICAgICAgICAgICB0ZXh0UGF0dGVybjogW1xuICAgICAgICAgICAgICAgIFsnJywgJ2xhYmVsJywgJzogJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnZGF0YS1zb3VyY2UnLCAnIGluICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3JlZ2lvbicsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3RocmVzaG9sZCcsICcgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnc2NhbGUnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdzdGF0aXN0aWMnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJ2Zjc3RfbGVuOiAnLCAnZm9yZWNhc3QtbGVuZ3RoJywgJ2gsICddLFxuICAgICAgICAgICAgICAgIFsndmFsaWQtdGltZTogJywgJ3ZhbGlkLXRpbWUnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJ2F2ZzogJywgJ2F2ZXJhZ2UnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICd0cnV0aCcsICcgJ11cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkaXNwbGF5UGFyYW1zOiBbXG4gICAgICAgICAgICAgICAgXCJsYWJlbFwiLCBcImRhdGEtc291cmNlXCIsIFwicmVnaW9uXCIsIFwic3RhdGlzdGljXCIsIFwidGhyZXNob2xkXCIsIFwic2NhbGVcIiwgXCJhdmVyYWdlXCIsIFwiZm9yZWNhc3QtbGVuZ3RoXCIsIFwidmFsaWQtdGltZVwiLCBcInRydXRoXCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBncm91cFNpemU6IDZcblxuICAgICAgICB9KTtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlVGV4dFBhdHRlcm5zLmluc2VydCh7XG4gICAgICAgICAgICBwbG90VHlwZTogbWF0c1R5cGVzLlBsb3RUeXBlcy5kaWVvZmYsXG4gICAgICAgICAgICB0ZXh0UGF0dGVybjogW1xuICAgICAgICAgICAgICAgIFsnJywgJ2xhYmVsJywgJzogJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnZGF0YS1zb3VyY2UnLCAnIGluICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3JlZ2lvbicsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3RocmVzaG9sZCcsICcgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnc2NhbGUnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdzdGF0aXN0aWMnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdkaWVvZmYtdHlwZScsICcsICddLFxuICAgICAgICAgICAgICAgIFsndmFsaWQtdGltZTogJywgJ3ZhbGlkLXRpbWUnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJ3N0YXJ0IHV0YzogJywgJ3V0Yy1jeWNsZS1zdGFydCcsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3RydXRoJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnY3VydmUtZGF0ZXMnLCAnJ11cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkaXNwbGF5UGFyYW1zOiBbXG4gICAgICAgICAgICAgICAgXCJsYWJlbFwiLCBcImRhdGEtc291cmNlXCIsIFwicmVnaW9uXCIsIFwic3RhdGlzdGljXCIsIFwidGhyZXNob2xkXCIsIFwic2NhbGVcIiwgXCJkaWVvZmYtdHlwZVwiLCBcInZhbGlkLXRpbWVcIiwgXCJ1dGMtY3ljbGUtc3RhcnRcIiwgXCJ0cnV0aFwiLCBcImN1cnZlLWRhdGVzXCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBncm91cFNpemU6IDZcbiAgICAgICAgfSk7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVRleHRQYXR0ZXJucy5pbnNlcnQoe1xuICAgICAgICAgICAgcGxvdFR5cGU6IG1hdHNUeXBlcy5QbG90VHlwZXMudGhyZXNob2xkLFxuICAgICAgICAgICAgdGV4dFBhdHRlcm46IFtcbiAgICAgICAgICAgICAgICBbJycsICdsYWJlbCcsICc6ICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ2RhdGEtc291cmNlJywgJyBpbiAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdyZWdpb24nLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdzY2FsZScsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3N0YXRpc3RpYycsICcsICddLFxuICAgICAgICAgICAgICAgIFsnZmNzdF9sZW46ICcsICdmb3JlY2FzdC1sZW5ndGgnLCAnaCwgJ10sXG4gICAgICAgICAgICAgICAgWyd2YWxpZC10aW1lOiAnLCAndmFsaWQtdGltZScsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3RydXRoJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnY3VydmUtZGF0ZXMnLCAnJ11cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkaXNwbGF5UGFyYW1zOiBbXG4gICAgICAgICAgICAgICAgXCJsYWJlbFwiLCBcImRhdGEtc291cmNlXCIsIFwicmVnaW9uXCIsIFwic3RhdGlzdGljXCIsIFwic2NhbGVcIiwgXCJmb3JlY2FzdC1sZW5ndGhcIiwgXCJ2YWxpZC10aW1lXCIsIFwidHJ1dGhcIiwgXCJjdXJ2ZS1kYXRlc1wiXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZ3JvdXBTaXplOiA2XG4gICAgICAgIH0pO1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuQ3VydmVUZXh0UGF0dGVybnMuaW5zZXJ0KHtcbiAgICAgICAgICAgIHBsb3RUeXBlOiBtYXRzVHlwZXMuUGxvdFR5cGVzLnZhbGlkdGltZSxcbiAgICAgICAgICAgIHRleHRQYXR0ZXJuOiBbXG4gICAgICAgICAgICAgICAgWycnLCAnbGFiZWwnLCAnOiAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdkYXRhLXNvdXJjZScsICcgaW4gJ10sXG4gICAgICAgICAgICAgICAgWycnLCAncmVnaW9uJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAndGhyZXNob2xkJywgJyAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdzY2FsZScsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3N0YXRpc3RpYycsICcsICddLFxuICAgICAgICAgICAgICAgIFsnZmNzdF9sZW46ICcsICdmb3JlY2FzdC1sZW5ndGgnLCAnaCwgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAndHJ1dGgnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdjdXJ2ZS1kYXRlcycsICcnXVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRpc3BsYXlQYXJhbXM6IFtcbiAgICAgICAgICAgICAgICBcImxhYmVsXCIsIFwiZGF0YS1zb3VyY2VcIiwgXCJyZWdpb25cIiwgXCJzdGF0aXN0aWNcIiwgXCJ0aHJlc2hvbGRcIiwgXCJzY2FsZVwiLCBcImZvcmVjYXN0LWxlbmd0aFwiLCBcInRydXRoXCIsIFwiY3VydmUtZGF0ZXNcIlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGdyb3VwU2l6ZTogNlxuICAgICAgICB9KTtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLkN1cnZlVGV4dFBhdHRlcm5zLmluc2VydCh7XG4gICAgICAgICAgICBwbG90VHlwZTogbWF0c1R5cGVzLlBsb3RUeXBlcy5kYWlseU1vZGVsQ3ljbGUsXG4gICAgICAgICAgICB0ZXh0UGF0dGVybjogW1xuICAgICAgICAgICAgICAgIFsnJywgJ2xhYmVsJywgJzogJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnZGF0YS1zb3VyY2UnLCAnIGluICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3JlZ2lvbicsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3RocmVzaG9sZCcsICcgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnc2NhbGUnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdzdGF0aXN0aWMnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJ3N0YXJ0IHV0YzogJywgJ3V0Yy1jeWNsZS1zdGFydCcsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3RydXRoJywgJyAnXVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRpc3BsYXlQYXJhbXM6IFtcbiAgICAgICAgICAgICAgICBcImxhYmVsXCIsIFwiZGF0YS1zb3VyY2VcIiwgXCJyZWdpb25cIiwgXCJzdGF0aXN0aWNcIiwgXCJ0aHJlc2hvbGRcIiwgXCJzY2FsZVwiLCBcInV0Yy1jeWNsZS1zdGFydFwiLCBcInRydXRoXCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBncm91cFNpemU6IDZcbiAgICAgICAgfSk7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVRleHRQYXR0ZXJucy5pbnNlcnQoe1xuICAgICAgICAgICAgcGxvdFR5cGU6IG1hdHNUeXBlcy5QbG90VHlwZXMuaGlzdG9ncmFtLFxuICAgICAgICAgICAgdGV4dFBhdHRlcm46IFtcbiAgICAgICAgICAgICAgICBbJycsICdsYWJlbCcsICc6ICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ2RhdGEtc291cmNlJywgJyBpbiAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdyZWdpb24nLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICd0aHJlc2hvbGQnLCAnICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3NjYWxlJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnc3RhdGlzdGljJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWydmY3N0X2xlbjogJywgJ2ZvcmVjYXN0LWxlbmd0aCcsICdoLCAnXSxcbiAgICAgICAgICAgICAgICBbJ3ZhbGlkLXRpbWU6ICcsICd2YWxpZC10aW1lJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAndHJ1dGgnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdjdXJ2ZS1kYXRlcycsICcnXVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRpc3BsYXlQYXJhbXM6IFtcbiAgICAgICAgICAgICAgICBcImxhYmVsXCIsIFwiZGF0YS1zb3VyY2VcIiwgXCJyZWdpb25cIiwgXCJzdGF0aXN0aWNcIiwgXCJ0aHJlc2hvbGRcIiwgXCJzY2FsZVwiLCBcImZvcmVjYXN0LWxlbmd0aFwiLCBcInZhbGlkLXRpbWVcIiwgXCJ0cnV0aFwiLCBcImN1cnZlLWRhdGVzXCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBncm91cFNpemU6IDZcbiAgICAgICAgfSk7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVRleHRQYXR0ZXJucy5pbnNlcnQoe1xuICAgICAgICAgICAgcGxvdFR5cGU6IG1hdHNUeXBlcy5QbG90VHlwZXMuY29udG91cixcbiAgICAgICAgICAgIHRleHRQYXR0ZXJuOiBbXG4gICAgICAgICAgICAgICAgWycnLCAnbGFiZWwnLCAnOiAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdkYXRhLXNvdXJjZScsICcgaW4gJ10sXG4gICAgICAgICAgICAgICAgWycnLCAncmVnaW9uJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAndGhyZXNob2xkJywgJyAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdzY2FsZScsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3N0YXRpc3RpYycsICcsICddLFxuICAgICAgICAgICAgICAgIFsnZmNzdF9sZW46ICcsICdmb3JlY2FzdC1sZW5ndGgnLCAnaCwgJ10sXG4gICAgICAgICAgICAgICAgWyd2YWxpZC10aW1lOiAnLCAndmFsaWQtdGltZScsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3RydXRoJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWyd4LWF4aXM6ICcsICd4LWF4aXMtcGFyYW1ldGVyJywgJywgJ10sXG4gICAgICAgICAgICAgICAgWyd5LWF4aXM6ICcsICd5LWF4aXMtcGFyYW1ldGVyJywgJyddXG5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkaXNwbGF5UGFyYW1zOiBbXG4gICAgICAgICAgICAgICAgXCJsYWJlbFwiLCBcImRhdGEtc291cmNlXCIsIFwicmVnaW9uXCIsIFwic3RhdGlzdGljXCIsIFwidGhyZXNob2xkXCIsIFwic2NhbGVcIiwgXCJmb3JlY2FzdC1sZW5ndGhcIiwgXCJ2YWxpZC10aW1lXCIsIFwidHJ1dGhcIiwgXCJ4LWF4aXMtcGFyYW1ldGVyXCIsIFwieS1heGlzLXBhcmFtZXRlclwiXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZ3JvdXBTaXplOiA2XG5cbiAgICAgICAgfSk7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5DdXJ2ZVRleHRQYXR0ZXJucy5pbnNlcnQoe1xuICAgICAgICAgICAgcGxvdFR5cGU6IG1hdHNUeXBlcy5QbG90VHlwZXMuY29udG91ckRpZmYsXG4gICAgICAgICAgICB0ZXh0UGF0dGVybjogW1xuICAgICAgICAgICAgICAgIFsnJywgJ2xhYmVsJywgJzogJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnZGF0YS1zb3VyY2UnLCAnIGluICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3JlZ2lvbicsICcsICddLFxuICAgICAgICAgICAgICAgIFsnJywgJ3RocmVzaG9sZCcsICcgJ10sXG4gICAgICAgICAgICAgICAgWycnLCAnc2NhbGUnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICdzdGF0aXN0aWMnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJ2Zjc3RfbGVuOiAnLCAnZm9yZWNhc3QtbGVuZ3RoJywgJ2gsICddLFxuICAgICAgICAgICAgICAgIFsndmFsaWQtdGltZTogJywgJ3ZhbGlkLXRpbWUnLCAnLCAnXSxcbiAgICAgICAgICAgICAgICBbJycsICd0cnV0aCcsICcsICddLFxuICAgICAgICAgICAgICAgIFsneC1heGlzOiAnLCAneC1heGlzLXBhcmFtZXRlcicsICcsICddLFxuICAgICAgICAgICAgICAgIFsneS1heGlzOiAnLCAneS1heGlzLXBhcmFtZXRlcicsICcnXVxuXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZGlzcGxheVBhcmFtczogW1xuICAgICAgICAgICAgICAgIFwibGFiZWxcIiwgXCJkYXRhLXNvdXJjZVwiLCBcInJlZ2lvblwiLCBcInN0YXRpc3RpY1wiLCBcInRocmVzaG9sZFwiLCBcInNjYWxlXCIsIFwiZm9yZWNhc3QtbGVuZ3RoXCIsIFwidmFsaWQtdGltZVwiLCBcInRydXRoXCIsIFwieC1heGlzLXBhcmFtZXRlclwiLCBcInktYXhpcy1wYXJhbWV0ZXJcIlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGdyb3VwU2l6ZTogNlxuXG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbmNvbnN0IGRvU2F2ZWRDdXJ2ZVBhcmFtcyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLlNldHRpbmdzLmZpbmRPbmUoe30pID09PSB1bmRlZmluZWQgfHwgbWF0c0NvbGxlY3Rpb25zLlNldHRpbmdzLmZpbmRPbmUoe30pLnJlc2V0RnJvbUNvZGUgPT09IHVuZGVmaW5lZCB8fCBtYXRzQ29sbGVjdGlvbnMuU2V0dGluZ3MuZmluZE9uZSh7fSkucmVzZXRGcm9tQ29kZSA9PSB0cnVlKSB7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5TYXZlZEN1cnZlUGFyYW1zLnJlbW92ZSh7fSk7XG4gICAgfVxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuU2F2ZWRDdXJ2ZVBhcmFtcy5maW5kKCkuY291bnQoKSA9PSAwKSB7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5TYXZlZEN1cnZlUGFyYW1zLmluc2VydCh7Y2xOYW1lOiAnY2hhbmdlTGlzdCcsIGNoYW5nZUxpc3Q6IFtdfSk7XG4gICAgfVxufTtcblxuY29uc3QgZG9QbG90R3JhcGggPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKG1hdHNDb2xsZWN0aW9ucy5TZXR0aW5ncy5maW5kT25lKHt9KSA9PT0gdW5kZWZpbmVkIHx8IG1hdHNDb2xsZWN0aW9ucy5TZXR0aW5ncy5maW5kT25lKHt9KS5yZXNldEZyb21Db2RlID09PSB1bmRlZmluZWQgfHwgbWF0c0NvbGxlY3Rpb25zLlNldHRpbmdzLmZpbmRPbmUoe30pLnJlc2V0RnJvbUNvZGUgPT0gdHJ1ZSkge1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdEdyYXBoRnVuY3Rpb25zLnJlbW92ZSh7fSk7XG4gICAgfVxuICAgIGlmIChtYXRzQ29sbGVjdGlvbnMuUGxvdEdyYXBoRnVuY3Rpb25zLmZpbmQoKS5jb3VudCgpID09IDApIHtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLlBsb3RHcmFwaEZ1bmN0aW9ucy5pbnNlcnQoe1xuICAgICAgICAgICAgcGxvdFR5cGU6IG1hdHNUeXBlcy5QbG90VHlwZXMudGltZVNlcmllcyxcbiAgICAgICAgICAgIGdyYXBoRnVuY3Rpb246IFwiZ3JhcGhQbG90bHlcIixcbiAgICAgICAgICAgIGRhdGFGdW5jdGlvbjogXCJkYXRhU2VyaWVzXCIsXG4gICAgICAgICAgICBjaGVja2VkOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdEdyYXBoRnVuY3Rpb25zLmluc2VydCh7XG4gICAgICAgICAgICBwbG90VHlwZTogbWF0c1R5cGVzLlBsb3RUeXBlcy5kaWVvZmYsXG4gICAgICAgICAgICBncmFwaEZ1bmN0aW9uOiBcImdyYXBoUGxvdGx5XCIsXG4gICAgICAgICAgICBkYXRhRnVuY3Rpb246IFwiZGF0YURpZU9mZlwiLFxuICAgICAgICAgICAgY2hlY2tlZDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5QbG90R3JhcGhGdW5jdGlvbnMuaW5zZXJ0KHtcbiAgICAgICAgICAgIHBsb3RUeXBlOiBtYXRzVHlwZXMuUGxvdFR5cGVzLnRocmVzaG9sZCxcbiAgICAgICAgICAgIGdyYXBoRnVuY3Rpb246IFwiZ3JhcGhQbG90bHlcIixcbiAgICAgICAgICAgIGRhdGFGdW5jdGlvbjogXCJkYXRhVGhyZXNob2xkXCIsXG4gICAgICAgICAgICBjaGVja2VkOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLlBsb3RHcmFwaEZ1bmN0aW9ucy5pbnNlcnQoe1xuICAgICAgICAgICAgcGxvdFR5cGU6IG1hdHNUeXBlcy5QbG90VHlwZXMudmFsaWR0aW1lLFxuICAgICAgICAgICAgZ3JhcGhGdW5jdGlvbjogXCJncmFwaFBsb3RseVwiLFxuICAgICAgICAgICAgZGF0YUZ1bmN0aW9uOiBcImRhdGFWYWxpZFRpbWVcIixcbiAgICAgICAgICAgIGNoZWNrZWQ6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuUGxvdEdyYXBoRnVuY3Rpb25zLmluc2VydCh7XG4gICAgICAgICAgICBwbG90VHlwZTogbWF0c1R5cGVzLlBsb3RUeXBlcy5kYWlseU1vZGVsQ3ljbGUsXG4gICAgICAgICAgICBncmFwaEZ1bmN0aW9uOiBcImdyYXBoUGxvdGx5XCIsXG4gICAgICAgICAgICBkYXRhRnVuY3Rpb246IFwiZGF0YURhaWx5TW9kZWxDeWNsZVwiLFxuICAgICAgICAgICAgY2hlY2tlZDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5QbG90R3JhcGhGdW5jdGlvbnMuaW5zZXJ0KHtcbiAgICAgICAgICAgIHBsb3RUeXBlOiBtYXRzVHlwZXMuUGxvdFR5cGVzLmhpc3RvZ3JhbSxcbiAgICAgICAgICAgIGdyYXBoRnVuY3Rpb246IFwiZ3JhcGhQbG90bHlcIixcbiAgICAgICAgICAgIGRhdGFGdW5jdGlvbjogXCJkYXRhSGlzdG9ncmFtXCIsXG4gICAgICAgICAgICBjaGVja2VkOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgbWF0c0NvbGxlY3Rpb25zLlBsb3RHcmFwaEZ1bmN0aW9ucy5pbnNlcnQoe1xuICAgICAgICAgICAgcGxvdFR5cGU6IG1hdHNUeXBlcy5QbG90VHlwZXMuY29udG91cixcbiAgICAgICAgICAgIGdyYXBoRnVuY3Rpb246IFwiZ3JhcGhQbG90bHlcIixcbiAgICAgICAgICAgIGRhdGFGdW5jdGlvbjogXCJkYXRhQ29udG91clwiLFxuICAgICAgICAgICAgY2hlY2tlZDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5QbG90R3JhcGhGdW5jdGlvbnMuaW5zZXJ0KHtcbiAgICAgICAgICAgIHBsb3RUeXBlOiBtYXRzVHlwZXMuUGxvdFR5cGVzLmNvbnRvdXJEaWZmLFxuICAgICAgICAgICAgZ3JhcGhGdW5jdGlvbjogXCJncmFwaFBsb3RseVwiLFxuICAgICAgICAgICAgZGF0YUZ1bmN0aW9uOiBcImRhdGFDb250b3VyRGlmZlwiLFxuICAgICAgICAgICAgY2hlY2tlZDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24gKCkge1xuICAgIG1hdHNDb2xsZWN0aW9ucy5EYXRhYmFzZXMucmVtb3ZlKHt9KTtcbiAgICBpZiAobWF0c0NvbGxlY3Rpb25zLkRhdGFiYXNlcy5maW5kKCkuY291bnQoKSA9PSAwKSB7XG4gICAgICAgIG1hdHNDb2xsZWN0aW9ucy5EYXRhYmFzZXMuaW5zZXJ0KHtcbiAgICAgICAgICAgIHJvbGU6IG1hdHNUeXBlcy5EYXRhYmFzZVJvbGVzLlNVTVNfREFUQSxcbiAgICAgICAgICAgIHN0YXR1czogXCJhY3RpdmVcIixcbiAgICAgICAgICAgIGhvc3Q6ICd3b2xwaGluLmZzbC5ub2FhLmdvdicsXG4gICAgICAgICAgICB1c2VyOiAncmVhZG9ubHknLFxuICAgICAgICAgICAgcGFzc3dvcmQ6ICdSZWFkT25seUAyMDE2IScsXG4gICAgICAgICAgICBkYXRhYmFzZTogJ3ByZWNpcF9uZXcnLFxuICAgICAgICAgICAgY29ubmVjdGlvbkxpbWl0OiAxMFxuICAgICAgICB9KTtcblxuICAgICAgICBtYXRzQ29sbGVjdGlvbnMuRGF0YWJhc2VzLmluc2VydCh7XG4gICAgICAgICAgICByb2xlOiBtYXRzVHlwZXMuRGF0YWJhc2VSb2xlcy5NRVRBX0RBVEEsXG4gICAgICAgICAgICBzdGF0dXM6IFwiYWN0aXZlXCIsXG4gICAgICAgICAgICBob3N0OiAnd29scGhpbi5mc2wubm9hYS5nb3YnLFxuICAgICAgICAgICAgdXNlcjogJ3JlYWRvbmx5JyxcbiAgICAgICAgICAgIHBhc3N3b3JkOiAnUmVhZE9ubHlAMjAxNiEnLFxuICAgICAgICAgICAgZGF0YWJhc2U6ICdtYXRzX2NvbW1vbicsXG4gICAgICAgICAgICBjb25uZWN0aW9uTGltaXQ6IDEwXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHN1bVNldHRpbmdzID0gbWF0c0NvbGxlY3Rpb25zLkRhdGFiYXNlcy5maW5kT25lKHtyb2xlOiBtYXRzVHlwZXMuRGF0YWJhc2VSb2xlcy5TVU1TX0RBVEEsIHN0YXR1czogXCJhY3RpdmVcIn0sIHtcbiAgICAgICAgaG9zdDogMSxcbiAgICAgICAgdXNlcjogMSxcbiAgICAgICAgcGFzc3dvcmQ6IDEsXG4gICAgICAgIGRhdGFiYXNlOiAxLFxuICAgICAgICBjb25uZWN0aW9uTGltaXQ6IDFcbiAgICB9KTtcbiAgICAvLyB0aGUgcG9vbCBpcyBpbnRlbmRlZCB0byBiZSBnbG9iYWxcbiAgICBzdW1Qb29sID0gbXlzcWwuY3JlYXRlUG9vbChzdW1TZXR0aW5ncyk7XG4gICAgc3VtUG9vbC5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uIChjb25uZWN0aW9uKSB7XG4gICAgICAgIGNvbm5lY3Rpb24ucXVlcnkoJ3NldCBncm91cF9jb25jYXRfbWF4X2xlbiA9IDQyOTQ5NjcyOTUnKVxuICAgIH0pO1xuXG4gICAgY29uc3QgbWV0YWRhdGFTZXR0aW5ncyA9IG1hdHNDb2xsZWN0aW9ucy5EYXRhYmFzZXMuZmluZE9uZSh7cm9sZTogbWF0c1R5cGVzLkRhdGFiYXNlUm9sZXMuTUVUQV9EQVRBLCBzdGF0dXM6IFwiYWN0aXZlXCJ9LCB7XG4gICAgICAgIGhvc3Q6IDEsXG4gICAgICAgIHVzZXI6IDEsXG4gICAgICAgIHBhc3N3b3JkOiAxLFxuICAgICAgICBkYXRhYmFzZTogMSxcbiAgICAgICAgY29ubmVjdGlvbkxpbWl0OiAxXG4gICAgfSk7XG4vLyB0aGUgcG9vbCBpcyBpbnRlbmRlZCB0byBiZSBnbG9iYWxcbiAgICBtZXRhZGF0YVBvb2wgPSBteXNxbC5jcmVhdGVQb29sKG1ldGFkYXRhU2V0dGluZ3MpO1xuXG5cbiAgICBjb25zdCBtZHIgPSBuZXcgbWF0c1R5cGVzLk1ldGFEYXRhREJSZWNvcmQoXCJzdW1Qb29sXCIsIFwicHJlY2lwX25ld1wiLCBbJ3JlZ2lvbnNfcGVyX21vZGVsX21hdHNfYWxsX2NhdGVnb3JpZXMnLCAndGhyZXNob2xkX2Rlc2NyaXB0aW9ucycsICdzY2FsZV9kZXNjcmlwdGlvbnMnXSk7XG4gICAgbWRyLmFkZFJlY29yZChcIm1ldGFkYXRhUG9vbFwiLCBcIm1hdHNfY29tbW9uXCIsIFsncmVnaW9uX2Rlc2NyaXB0aW9ucyddKTtcbiAgICBtYXRzTWV0aG9kcy5yZXNldEFwcCh7YXBwTWRyOm1kciwgYXBwVHlwZTptYXRzVHlwZXMuQXBwVHlwZXMubWF0cywgYXBwOidwcmVjaXBpdGF0aW9uMWhyJ30pO1xufSk7XG5cbi8vIHRoaXMgb2JqZWN0IGlzIGdsb2JhbCBzbyB0aGF0IHRoZSByZXNldCBjb2RlIGNhbiBnZXQgdG8gaXRcbi8vIFRoZXNlIGFyZSBhcHBsaWNhdGlvbiBzcGVjaWZpYyBtb25nbyBkYXRhIC0gbGlrZSBjdXJ2ZSBwYXJhbXNcbi8vIFRoZSBhcHBTcGVjaWZpY1Jlc2V0Um91dGluZXMgb2JqZWN0IGlzIGEgc3BlY2lhbCBuYW1lLFxuLy8gYXMgaXMgZG9DdXJ2ZVBhcmFtcy4gVGhlIHJlZnJlc2hNZXRhRGF0YSBtZWNoYW5pc20gZGVwZW5kcyBvbiB0aGVtIGJlaW5nIG5hbWVkIHRoYXQgd2F5LlxuYXBwU3BlY2lmaWNSZXNldFJvdXRpbmVzID0gW1xuICAgIGRvUGxvdEdyYXBoLFxuICAgIGRvQ3VydmVQYXJhbXMsXG4gICAgZG9TYXZlZEN1cnZlUGFyYW1zLFxuICAgIGRvUGxvdFBhcmFtcyxcbiAgICBkb0N1cnZlVGV4dFBhdHRlcm5zXG5dO1xuIl19
