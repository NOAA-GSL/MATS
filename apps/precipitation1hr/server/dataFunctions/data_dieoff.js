/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsCollections } from "meteor/randyp:mats-common";
import { matsTypes } from "meteor/randyp:mats-common";
import { matsDataUtils } from "meteor/randyp:mats-common";
import { matsDataQueryUtils } from "meteor/randyp:mats-common";
import { matsDataDiffUtils } from "meteor/randyp:mats-common";
import { matsDataCurveOpsUtils } from "meteor/randyp:mats-common";
import { matsDataProcessUtils } from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

dataDieOff = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.dieoff,
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
    var label = curve["label"];
    var model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[curve["data-source"]][0];
    var regionStr = curve["region"];
    var region = Object.keys(
      matsCollections["region"].findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections["region"].findOne({ name: "region" }).valuesMap[key] ===
        regionStr
    );
    var scaleStr = curve["scale"];
    var grid_scale = Object.keys(
      matsCollections["scale"].findOne({ name: "scale" }).valuesMap
    ).find(
      (key) =>
        matsCollections["scale"].findOne({ name: "scale" }).valuesMap[key] === scaleStr
    );
    var source = curve["truth"];
    var sourceStr = "";
    if (source !== "All") {
      sourceStr = "_" + source;
    }
    var queryTableClause =
      "from " + model + "_" + grid_scale + sourceStr + "_" + region + " as m0";
    var thresholdStr = curve["threshold"];
    var threshold = Object.keys(
      matsCollections["threshold"].findOne({ name: "threshold" }).valuesMap
    ).find(
      (key) =>
        matsCollections["threshold"].findOne({ name: "threshold" }).valuesMap[key] ===
        thresholdStr
    );
    var thresholdClause = "and m0.trsh = " + threshold * 0.01;
    var validTimes;
    var validTimeClause = "";
    var utcCycleStart;
    var utcCycleStartClause = "";
    var forecastLengthStr = curve["dieoff-type"];
    var forecastLengthOptionsMap = matsCollections["dieoff-type"].findOne(
      { name: "dieoff-type" },
      { optionsMap: 1 }
    )["optionsMap"];
    var forecastLength = forecastLengthOptionsMap[forecastLengthStr][0];
    var forecastLengthClause = "";
    var dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var dateClause;
    if (forecastLength === matsTypes.ForecastTypes.dieoff) {
      validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = "and floor((m0.time)%(24*3600)/3600) IN(" + validTimes + ")";
      }
      dateClause = "and m0.time >= " + fromSecs + " and m0.time <= " + toSecs;
    } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
      utcCycleStart =
        curve["utc-cycle-start"] === undefined ? [] : curve["utc-cycle-start"];
      if (utcCycleStart.length !== 0 && utcCycleStart !== matsTypes.InputTypes.unused) {
        utcCycleStartClause =
          "and floor(((m0.time) - m0.fcst_len*3600)%(24*3600)/3600) IN(" +
          utcCycleStart +
          ")"; // adjust by 1800 seconds to center obs at the top of the hour
      }
      dateClause =
        "and m0.time-m0.fcst_len*3600 >= " +
        fromSecs +
        " and m0.time-m0.fcst_len*3600 <= " +
        toSecs;
    } else {
      dateClause = "and m0.time-m0.fcst_len*3600 = " + fromSecs;
    }
    var statisticSelect = curve["statistic"];
    var statisticOptionsMap = matsCollections["statistic"].findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    )["optionsMap"];
    var statisticClause =
      "sum(m0.hit) as hit, sum(m0.fa) as fa, sum(m0.miss) as miss, sum(m0.cn) as cn, group_concat(m0.time, ';', m0.hit, ';', m0.fa, ';', m0.miss, ';', m0.cn order by m0.time) as sub_data, count(m0.hit) as N0";
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    var statType = statisticOptionsMap[statisticSelect][0];
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
      var statement =
        "select m0.fcst_len as fcst_lead, " +
        "count(distinct m0.time) as N_times, " +
        "min(m0.time) as min_secs, " +
        "max(m0.time) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{dateClause}} " +
        "{{thresholdClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "{{utcCycleStartClause}} " +
        "group by fcst_lead " +
        "order by fcst_lead" +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{thresholdClause}}", thresholdClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
      statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
      statement = statement.replace("{{utcCycleStartClause}}", utcCycleStartClause);
      statement = statement.replace("{{dateClause}}", dateClause);
      dataRequests[label] = statement;

      var queryResult;
      var startMoment = moment();
      var finishMoment;
      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
          sumPool,
          statement,
          appParams,
          statisticSelect
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
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(
        dataset,
        diffFrom,
        appParams,
        statType === "ctc",
        statType === "scalar"
      );
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
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
    curve["axisKey"] = axisKey;
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
    idealValues: idealValues,
    utcCycleStarts: utcCycleStarts,
    statType: statType,
    axisMap: axisMap,
    xmax: xmax,
    xmin: xmin,
  };
  const bookkeepingParams = {
    dataRequests: dataRequests,
    totalProcessingStart: totalProcessingStart,
  };
  var result = matsDataProcessUtils.processDataXYCurve(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
