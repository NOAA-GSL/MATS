// /*
//  * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
//  */
//
// import {matsCollections} from 'meteor/randyp:mats-common';
// import {matsTypes} from 'meteor/randyp:mats-common';
// import {matsDataUtils} from 'meteor/randyp:mats-common';
// import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
// import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
// import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
// import {moment} from 'meteor/momentjs:moment';
//
// dataSimpleScatter = function (plotParams, plotFunction) {
//     // initialize variables common to all curves
//     const appParams = {
//         "plotType": matsTypes.PlotTypes.simpleScatter,
//         "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
//         "completeness": plotParams['completeness'],
//         "outliers": plotParams['outliers'],
//         "hideGaps": plotParams['noGapsCheck'],
//         "hasLevels": false
//     };
//     var dataRequests = {}; // used to store data queries
//     var dataFoundForCurve = true;
//     var dataFoundForAnyCurve = false;
//     var totalProcessingStart = moment();
//     var error = "";
//     var curves = JSON.parse(JSON.stringify(plotParams.curves));
//     var curvesLength = curves.length;
//     var dataset = [];
//     var axisXMap = Object.create(null);
//     var axisYMap = Object.create(null);
//     var xmax = -1 * Number.MAX_VALUE;
//     var ymax = -1 * Number.MAX_VALUE;
//     var xmin = Number.MAX_VALUE;
//     var ymin = Number.MAX_VALUE;
//
//     for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
//         // initialize variables specific to each curve
//         var curve = curves[curveIndex];
//         var diffFrom = curve.diffFrom;
//         var label = curve['label'];
//         var regionType = curve['region-type'];
//         var binParam = curve['bin-parameter'];
//         var binClause = matsCollections['bin-parameter'].findOne({name: 'bin-parameter'}).optionsMap[regionType][binParam];
//         var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
//         var queryTableClause = "";
//         var variableXStr = curve['x-variable'];
//         var variableYStr = curve['y-variable'];
//         var variableOptionsMap = matsCollections['variable'].findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
//         var variableX = variableOptionsMap[regionType][variableXStr];
//         var variableY = variableOptionsMap[regionType][variableYStr];
//         var validTimeClause = "";
//         var forecastLength = curve['forecast-length'];
//         var forecastLengthClause = "";
//         var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
//         var fromSecs = dateRange.fromSeconds;
//         var toSecs = dateRange.toSeconds;
//         var timeVar;
//         var dateString = "";
//         var dateClause = "";
//         var siteDateClause = "";
//         var siteMatchClause = "";
//         var sitesClause = "";
//         var NAggregate;
//         var NClauseX;
//         var NClauseY;
//         var queryPool;
//         if (regionType === 'Predefined region') {
//             timeVar = "m0.valid_day+3600*m0.hour";
//             var metarStringStr = curve['truth'];
//             var metarString = Object.keys(matsCollections['truth'].findOne({name: 'truth'}).valuesMap).find(key => matsCollections['truth'].findOne({name: 'truth'}).valuesMap[key] === metarStringStr);
//             var regionStr = curve['region'];
//             var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
//             queryTableClause = "from " + model + "_" + metarString + "_" + region + " as m0";
//             if (binParam !== 'Fcst lead time') {
//                 if (forecastLength === undefined) {
//                     throw new Error("INFO:  " + label + "'s forecast lead time is undefined. Please assign it a value.");
//                 }
//                 forecastLengthClause = "and m0.fcst_len = " + forecastLength;
//             }
//             if ((binParam === 'Init Date') && (binParam !== 'Valid Date')) {
//                 dateString = "m0.valid_day+3600*m0.hour-m0.fcst_len*3600";
//             } else {
//                 dateString = "m0.valid_day+3600*m0.hour";
//             }
//             dateClause = "and " + dateString + " >= " + fromSecs + " and " + dateString + " <= " + toSecs;
//             NAggregate = 'sum';
//             NClauseX = variableX[1];
//             NClauseY = variableY[1];
//             queryPool = sumPool;
//         } else {
//             timeVar = "m0.time";
//             var modelTable;
//             if (binParam !== 'Fcst lead time') {
//                 if (forecastLength === undefined) {
//                     throw new Error("INFO:  " + label + "'s forecast lead time is undefined. Please assign it a value.");
//                 }
//                 if (forecastLength === 1) {
//                     modelTable = model + "qp1f";
//                     forecastLengthClause = "";
//                 } else {
//                     modelTable = (model.includes('ret_') || model.includes('Ret_')) ? model + "p" : model + "qp";
//                     forecastLengthClause = "and m0.fcst_len = " + forecastLength + " "
//                 }
//             } else {
//                 modelTable = (model.includes('ret_') || model.includes('Ret_')) ? model + "p" : model + "qp";
//             }
//             var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'obs_retro' : 'obs';
//             queryTableClause = "from " + obsTable + " as o, " + modelTable + " as m0 ";
//             var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
//             var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
//             var querySites = [];
//             if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
//                 var thisSite;
//                 var thisSiteObj;
//                 for (var sidx = 0; sidx < sitesList.length; sidx++) {
//                     thisSite = sitesList[sidx];
//                     thisSiteObj = siteMap.find(obj => {
//                         return obj.origName === thisSite;
//                     });
//                     querySites.push(thisSiteObj.options.id);
//                 }
//                 sitesClause = " and m0.sta_id in('" + querySites.join("','") + "')";
//             } else {
//                 throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
//             }
//             if ((binParam === 'Init Date') && (binParam !== 'Valid Date')) {
//                 dateString = "m0.time-m0.fcst_len*3600";
//             } else {
//                 dateString = "m0.time";
//             }
//             dateClause = "and " + dateString + " >= " + fromSecs + " - 900 and " + dateString + " <= " + toSecs + " + 900";
//             siteDateClause = "and o.time >= " + fromSecs + " - 900 and o.time <= " + toSecs + " + 900";
//             siteMatchClause = "and m0.sta_id = o.sta_id and m0.time = o.time";
//             NAggregate = 'count';
//             NClauseX = '1';
//             NClauseY = '1';
//             queryPool = sitePool;
//         }
//         if (binParam !== 'Valid UTC hour') {
//             var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
//             if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
//                 validTimeClause = "and floor((" + timeVar + "+1800)%(24*3600)/3600) IN(" + validTimes + ")";   // adjust by 1800 seconds to center obs at the top of the hour
//             }
//         }
//         var statisticXSelect = curve['x-statistic'];
//         var statisticYSelect = curve['y-statistic'];
//         var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
//         var statisticClause = "sum(" + variableX[0] + ") as square_diff_sumX, " + NAggregate + "(" + variableX[1] + ") as N_sumX, sum(" + variableX[2] + ") as obs_model_diff_sumX, sum(" + variableX[3] + ") as model_sumX, sum(" + variableX[4] + ") as obs_sumX, sum(" + variableX[5] + ") as abs_sumX, " +
//             "sum(" + variableY[0] + ") as square_diff_sumY, " + NAggregate + "(" + variableY[1] + ") as N_sumY, sum(" + variableY[2] + ") as obs_model_diff_sumY, sum(" + variableY[3] + ") as model_sumY, sum(" + variableY[4] + ") as obs_sumY, sum(" + variableY[5] + ") as abs_sumY, " +
//             "group_concat(" + timeVar + ", ';', " + variableX[0] + ", ';', " + NClauseX + ", ';', " + variableX[2] + ", ';', " + variableX[3] + ", ';', " + variableX[4] + ", ';', " + variableX[5] + ", ';', " +
//             variableY[0] + ", ';', " + NClauseY + ", ';', " + variableY[2] + ", ';', " + variableY[3] + ", ';', " + variableY[4] + ", ';', " + variableY[5] + " order by " + timeVar + ") as sub_data, count(" + variableX[0] + ") as N0";
//         var statType = statisticOptionsMap[statisticXSelect];
//         var statVarUnitMap = matsCollections['variable'].findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
//         var varUnitsX = statVarUnitMap[statisticXSelect][variableXStr];
//         var varUnitsY = statVarUnitMap[statisticYSelect][variableYStr];
//
//         var d;
//         if (diffFrom === null) {
//             // this is a database driven curve, not a difference curve
//             // prepare the query from the above parameters
//             var statement = "{{binClause}} " +
//                 "count(distinct ceil(3600*floor(({{timeVar}}+1800)/3600))) as N_times, " +
//                 "min(ceil(3600*floor(({{timeVar}}+1800)/3600))) as min_secs, " +
//                 "max(ceil(3600*floor(({{timeVar}}+1800)/3600))) as max_secs, " +
//                 "{{statisticClause}} " +
//                 "{{queryTableClause}} " +
//                 "where 1=1 " +
//                 "{{siteMatchClause}} " +
//                 "{{sitesClause}} " +
//                 "{{dateClause}} " +
//                 "{{siteDateClause}} " +
//                 "{{validTimeClause}} " +
//                 "{{forecastLengthClause}} " +
//                 "group by binVal " +
//                 "order by binVal" +
//                 ";";
//
//             statement = statement.replace('{{binClause}}', binClause);
//             statement = statement.replace('{{statisticClause}}', statisticClause);
//             statement = statement.replace('{{queryTableClause}}', queryTableClause);
//             statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
//             statement = statement.replace('{{sitesClause}}', sitesClause);
//             statement = statement.replace('{{validTimeClause}}', validTimeClause);
//             statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
//             statement = statement.replace('{{dateClause}}', dateClause);
//             statement = statement.replace('{{siteDateClause}}', siteDateClause);
//             statement = statement.split('{{timeVar}}').join(timeVar);
//             dataRequests[label] = statement;
//
//             var queryResult;
//             var startMoment = moment();
//             var finishMoment;
//             try {
//                 // send the query statement to the query function
//                 queryResult = matsDataQueryUtils.queryDBSimpleScatter(queryPool, statement, appParams, statisticXSelect + "_" + variableXStr, statisticYSelect + "_" + variableYStr);
//                 finishMoment = moment();
//                 dataRequests["data retrieval (query) time - " + label] = {
//                     begin: startMoment.format(),
//                     finish: finishMoment.format(),
//                     duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
//                     recordCount: queryResult.data.x.length
//                 };
//                 // get the data back from the query
//                 d = queryResult.data;
//             } catch (e) {
//                 // this is an error produced by a bug in the query function, not an error returned by the mysql database
//                 e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
//                 throw new Error(e.message);
//             }
//             if (queryResult.error !== undefined && queryResult.error !== "") {
//                 if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
//                     // this is NOT an error just a no data condition
//                     dataFoundForCurve = false;
//                 } else {
//                     // this is an error returned by the mysql database
//                     error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
//                     if (error.includes('Unknown column')) {
//                         throw new Error("INFO:  The statistic/variable combination [" + statisticXSelect + "/" + variableXStr + " and " + statisticYSelect + "/" + variableYStr + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
//                     } else {
//                         throw new Error(error);
//                     }
//                 }
//             } else {
//                 dataFoundForAnyCurve = true;
//             }
//
//             // set axis limits based on returned data
//             var postQueryStartMoment = moment();
//             if (dataFoundForCurve) {
//                 xmin = xmin < d.xmin ? xmin : d.xmin;
//                 xmax = xmax > d.xmax ? xmax : d.xmax;
//                 ymin = ymin < d.ymin ? ymin : d.ymin;
//                 ymax = ymax > d.ymax ? ymax : d.ymax;
//             }
//         } else {
//             // this is a difference curve -- not supported for ROC plots
//             throw new Error("INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves.");
//         }
//
//         // set curve annotation to be the curve mean -- may be recalculated later
//         // also pass previously calculated axis stats to curve options
//         const mean = d.sum / d.x.length;
//         const annotation = mean === undefined ? label + "- mean = NoData" : label + "- mean = " + mean.toPrecision(4);
//         curve['annotation'] = annotation;
//         curve['xmin'] = d.xmin;
//         curve['xmax'] = d.xmax;
//         curve['ymin'] = d.ymin;
//         curve['ymax'] = d.ymax;
//         curve['axisXKey'] = varUnitsX;
//         curve['axisYKey'] = varUnitsY;
//         curve['binParam'] = binParam;
//         const cOptions = matsDataCurveOpsUtils.generateScatterCurveOptions(curve, curveIndex, axisXMap, axisYMap, d, appParams);  // generate plot with data, curve annotation, axis labels, etc.
//         dataset.push(cOptions);
//         var postQueryFinishMoment = moment();
//         dataRequests["post data retrieval (query) process time - " + label] = {
//             begin: postQueryStartMoment.format(),
//             finish: postQueryFinishMoment.format(),
//             duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
//         };
//     }  // end for curves
//
//     if (!dataFoundForAnyCurve) {
//         // we found no data for any curves so don't bother proceeding
//         throw new Error("INFO:  No valid data for any curves.");
//     }
//
//     // process the data returned by the query
//     const curveInfoParams = {
//         "curves": curves,
//         "curvesLength": curvesLength,
//         "statType": statType,
//         "axisXMap": axisXMap,
//         "axisYMap": axisYMap,
//         "xmax": xmax,
//         "xmin": xmin
//     };
//     const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
//     var result = matsDataProcessUtils.processDataSimpleScatter(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
//     plotFunction(result);
// };
