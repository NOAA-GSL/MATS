/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataCurveOpsUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

dataPerformanceDiagram = function (plotParams, plotFunction) {
  var fs = require("fs");
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.performanceDiagram,
    matching: plotParams["plotAction"] === matsTypes.PlotActions.matched,
    completeness: plotParams["completeness"],
    outliers: plotParams["outliers"],
    hideGaps: plotParams["noGapsCheck"],
    hasLevels: false,
  };
  var dataRequests = {}; // used to store data queries
  var dataFoundForCurve = true;
  var dataFoundForAnyCurve = false;
  var totalProcessingStart = moment();
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;
  var dataset = [];
  var axisMap = Object.create(null);
  var xmax = -1 * Number.MAX_VALUE;
  var ymax = -1 * Number.MAX_VALUE;
  var xmin = Number.MAX_VALUE;
  var ymin = Number.MAX_VALUE;

  var allThresholds;
  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    var curve = curves[curveIndex];

    var queryTemplate = fs.readFileSync(
      "assets/app/sqlTemplates/tmpl_PerformanceDiagram.sql",
      "utf8"
    );

    var diffFrom = curve.diffFrom;
    var label = curve["label"];
    var binParam = curve["bin-parameter"];
    var binClause = matsCollections["bin-parameter"].findOne({ name: "bin-parameter" })
      .optionsMap[binParam];
    var variable = curve["variable"];
    var model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];
    var dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var dateString = "";
    if (binParam !== "Threshold") {
      var thresholdStr = curve["threshold"];
      if (thresholdStr === undefined) {
        throw new Error(
          "INFO:  " + label + "'s threshold is undefined. Please assign it a value."
        );
      }
      var threshold = Object.keys(
        matsCollections["threshold"].findOne({ name: "threshold" }).valuesMap[variable]
      ).find(
        (key) =>
          matsCollections["threshold"].findOne({ name: "threshold" }).valuesMap[
            variable
          ][key] === thresholdStr
      );
      allThresholds = [threshold.replace(/_/g, ".")];
      queryTemplate = queryTemplate.replace(/vxTHRESHOLD/g, allThresholds);
    } else {
      // catalogue the thresholds now, we'll need to do a separate query for each
      allThresholds = Object.keys(
        matsCollections["threshold"].findOne({ name: "threshold" }).valuesMap[variable]
      ).sort(function (a, b) {
        return Number(a) - Number(b);
      });
      for (let tidx = 0; tidx < allThresholds.length; tidx++) {
        allThresholds[tidx] = allThresholds[tidx].replace(/_/g, ".");
      }
    }

    queryTemplate = queryTemplate.replace(/vxFROM_SECS/g, fromSecs);
    queryTemplate = queryTemplate.replace(/vxTO_SECS/g, toSecs);
    queryTemplate = queryTemplate.replace(/vxMODEL/g, model);
    queryTemplate = queryTemplate.replace(/vxBIN_CLAUSE/g, binClause);

    if (binParam !== "Valid UTC hour") {
      var validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        queryTemplate = queryTemplate.replace(
          /vxVALID_TIMES/g,
          cbPool.trfmListToCSVString(validTimes, null, false)
        );
      } else {
        queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "vxVALID_TIMES");
      }
    } else {
      queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "vxVALID_TIMES");
    }

    if (binParam !== "Fcst lead time") {
      var forecastLength = curve["forecast-length"];
      if (forecastLength === undefined) {
        throw new Error(
          "INFO:  " +
            label +
            "'s forecast lead time is undefined. Please assign it a value."
        );
      }
      queryTemplate = queryTemplate.replace(/vxFCST_LEN/g, forecastLength);
    } else {
      queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "vxFCST_LEN");
    }

    if (binParam === "Init Date") {
      dateString = "m0.fcstValidEpoch-m0.fcstLen*3600";
    } else {
      dateString = "m0.fcstValidEpoch";
    }
    queryTemplate = queryTemplate.replace(/vxDATE_STRING/g, dateString);

    var regionType = curve["region-type"];
    if (regionType === "Select stations") {
      throw new Error(
        "INFO:  Single/multi station plotting is not available for performance diagrams."
      );
    }
    var regionStr = curve["region"];
    var region = Object.keys(
      matsCollections["region"].findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections["region"].findOne({ name: "region" }).valuesMap[key] ===
        regionStr
    );
    queryTemplate = queryTemplate.replace(/vxREGION/g, region);
    var statisticSelect = "PerformanceDiagram";
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable + statistic (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    var statType = "ctc";
    curves[curveIndex].axisKey = statisticSelect; // stash the axisKey to use it later for axis options

    var d = {};
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      for (
        var thresholdIndex = 0;
        thresholdIndex < allThresholds.length;
        thresholdIndex++
      ) {
        threshold = allThresholds[thresholdIndex];
        queryTemplate = queryTemplate.replace(/{{threshold}}/g, threshold);
        queryTemplate = queryTemplate.replace(/vxTHRESHOLD/g, threshold);
        // prepare the query from the above parameters
        statement = cbPool.trfmSQLForDbTarget(queryTemplate);

        dataRequests[label] = statement;

        var queryResult;
        var startMoment = moment();
        var finishMoment;
        try {
          // send the query statement to the query function
          queryResult = matsDataQueryUtils.queryDBPerformanceDiagram(
            cbPool,
            statement,
            appParams
          );
          finishMoment = moment();
          dataRequests["data retrieval (query) time - " + label] = {
            begin: startMoment.format(),
            finish: finishMoment.format(),
            duration:
              moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
            recordCount: queryResult.data.x.length,
          };
          // get the data back from the query
          var dTemp = queryResult.data;
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
            error +=
              "Error from verification query: <br>" +
              queryResult.error +
              "<br> query: <br>" +
              statement +
              "<br>";
            throw new Error(error);
          }
        } else {
          dataFoundForAnyCurve = true;
        }
        // set axis limits based on returned data
        var postQueryStartMoment = moment();
        if (dataFoundForCurve) {
          xmin = xmin < dTemp.xmin ? xmin : dTemp.xmin;
          xmax = xmax > dTemp.xmax ? xmax : dTemp.xmax;
          ymin = ymin < dTemp.ymin ? ymin : dTemp.ymin;
          ymax = ymax > dTemp.ymax ? ymax : dTemp.ymax;
        }
        // consolidate data
        if (Object.keys(d).length === 0) {
          d = dTemp;
        } else {
          d.x.push(dTemp.x[0]);
          d.y.push(dTemp.y[0]);
          d.binVals.push(dTemp.binVals[0]);
          d.oy_all.push(dTemp.oy_all[0]);
          d.on_all.push(dTemp.on_all[0]);
          d.n.push(dTemp.n[0]);
          d.subHit.push(dTemp.subHit[0]);
          d.subFa.push(dTemp.subFa[0]);
          d.subMiss.push(dTemp.subMiss[0]);
          d.subCn.push(dTemp.subCn[0]);
          d.subVals.push(dTemp.subVals[0]);
          d.subSecs.push(dTemp.subSecs[0]);
          d.xmin = d.xmin < dTemp.xmin ? d.xmin : dTemp.xmin;
          d.xmax = d.xmax > dTemp.xmax ? d.xmax : dTemp.xmax;
          d.ymin = d.ymin < dTemp.ymin ? d.ymin : dTemp.ymin;
          d.ymax = d.ymax > dTemp.ymax ? d.ymax : dTemp.ymax;
        }
      }
    } else {
      // this is a difference curve -- not supported for ROC plots
      throw new Error(
        "INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves."
      );
    }

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
    const mean = d.sum / d.x.length;
    const annotation =
      mean === undefined
        ? label + "- mean = NoData"
        : label + "- mean = " + mean.toPrecision(4);
    curve["annotation"] = annotation;
    curve["xmin"] = d.xmin;
    curve["xmax"] = d.xmax;
    curve["ymin"] = d.ymin;
    curve["ymax"] = d.ymax;
    curve["axisKey"] = statisticSelect;
    curve["binParam"] = binParam;
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(
      curve,
      curveIndex,
      axisMap,
      d,
      appParams
    ); // generate plot with data, curve annotation, axis labels, etc.
    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + label] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration:
        moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() +
        " seconds",
    };
  } // end for curves

  if (!dataFoundForAnyCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves: curves,
    curvesLength: curvesLength,
    statType: statType,
    axisMap: axisMap,
    xmax: xmax,
    xmin: xmin,
  };
  const bookkeepingParams = {
    dataRequests: dataRequests,
    totalProcessingStart: totalProcessingStart,
  };
  var result = matsDataProcessUtils.processDataPerformanceDiagram(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
