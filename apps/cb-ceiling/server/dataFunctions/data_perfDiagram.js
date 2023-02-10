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
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.performanceDiagram,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  let error = "";
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const dataset = [];
  const axisMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;

  let allThresholds;
  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    const { label } = curve;
    const binParam = curve["bin-parameter"];
    const binClause = matsCollections["bin-parameter"].findOne({
      name: "bin-parameter",
    }).optionsMap[binParam];
    var { variable } = curve;
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];
    const modelClause = `AND m0.model='${model}' `;
    const queryTableClause = "from vxDBTARGET  m0";
    let validTimeClause = "";
    let forecastLengthClause = "";
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    let dateString = "";
    if (binParam !== "Threshold") {
      var thresholdStr = curve.threshold;
      if (thresholdStr === undefined) {
        throw new Error(
          `INFO:  ${label}'s threshold is undefined. Please assign it a value.`
        );
      }
      var threshold = Object.keys(
        matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
      ).find(
        (key) =>
          matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable][
            key
          ] === thresholdStr
      );
      allThresholds = [threshold.replace(/_/g, ".")];
    } else {
      // catalogue the thresholds now, we'll need to do a separate query for each
      allThresholds = Object.keys(
        matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
      ).sort(function (a, b) {
        return Number(a) - Number(b);
      });
      for (let tidx = 0; tidx < allThresholds.length; tidx++) {
        allThresholds[tidx] = allThresholds[tidx].replace(/_/g, ".");
      }
    }
    if (binParam !== "Valid UTC hour") {
      const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and m0.fcstValidEpoch%(24*3600)/3600 IN[${validTimes}]`;
      }
    }
    if (binParam !== "Fcst lead time") {
      const forecastLength = curve["forecast-length"];
      if (forecastLength === undefined) {
        throw new Error(
          `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
        );
      }
      forecastLengthClause = `and m0.fcstLen = ${forecastLength}`;
    }
    if (binParam === "Init Date") {
      dateString = "m0.fcstValidEpoch-m0.fcstLen*3600";
    } else {
      dateString = "m0.fcstValidEpoch";
    }
    const regionType = curve["region-type"];
    if (regionType === "Select stations") {
      throw new Error(
        "INFO:  Single/multi station plotting is not available for performance diagrams."
      );
    }
    var regionStr = curve.region;
    const region = Object.keys(
      matsCollections.region.findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
    );
    const regionClause = `AND m0.region='${region}' `;
    const statisticSelect = "PerformanceDiagram";
    const statisticClause =
      "((sum(m0.data.['{{threshold}}'].hits))/sum(m0.data.['{{threshold}}'].hits+m0.data.['{{threshold}}'].misses)) as pod, " +
      "((sum(m0.data.['{{threshold}}'].false_alarms))/sum(m0.data.['{{threshold}}'].false_alarms+m0.data.['{{threshold}}'].hits)) as far, " +
      "sum(m0.data.['{{threshold}}'].hits+m0.data.['{{threshold}}'].misses) as oy_all, " +
      "sum(m0.data.['{{threshold}}'].false_alarms+m0.data.['{{threshold}}'].correct_negatives) as on_all, " +
      "ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['{{threshold}}'].hits) || ';' || " +
      "TO_STRING(m0.data.['{{threshold}}'].false_alarms) || ';' || TO_STRING(m0.data.['{{threshold}}'].misses) || ';' || " +
      "TO_STRING(m0.data.['{{threshold}}'].correct_negatives))) sub_data, count(m0.data.['{{threshold}}'].hits) N0 ";
    const dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
    const whereClause =
      "WHERE " +
      "m0.type='DD' " +
      "AND m0.docType='CTC' " +
      "AND m0.subset='METAR' " +
      "AND m0.version='V01' ";
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable + statistic (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    var statType = "ctc";
    curves[curveIndex].axisKey = statisticSelect; // stash the axisKey to use it later for axis options

    let d = {};
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      for (
        let thresholdIndex = 0;
        thresholdIndex < allThresholds.length;
        thresholdIndex++
      ) {
        threshold = allThresholds[thresholdIndex];
        // prepare the query from the above parameters
        let statement =
          "SELECT {{binClause}} AS binVal, " +
          "COUNT(DISTINCT m0.fcstValidEpoch) N_times, " +
          "MIN(m0.fcstValidEpoch) min_secs, " +
          "MAX(m0.fcstValidEpoch) max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "{{whereClause}} " +
          "{{modelClause}} " +
          "{{regionClause}} " +
          "{{dateClause}} " +
          "{{validTimeClause}} " +
          "{{forecastLengthClause}} " +
          "GROUP BY {{binClause}} " +
          "ORDER BY binVal" +
          ";";

        statement = statement.split("{{binClause}}").join(binClause);
        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{whereClause}}", whereClause);
        statement = statement.replace("{{modelClause}}", modelClause);
        statement = statement.replace("{{regionClause}}", regionClause);
        statement = statement.split("{{threshold}}").join(threshold);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{dateClause}}", dateClause);

        statement = cbPool.trfmSQLForDbTarget(statement);
        dataRequests[label] = statement;

        var queryResult;
        const startMoment = moment();
        var finishMoment;
        try {
          // send the query statement to the query function
          queryResult = matsDataQueryUtils.queryDBPerformanceDiagram(
            cbPool,
            statement,
            appParams
          );
          finishMoment = moment();
          dataRequests[`data retrieval (query) time - ${label}`] = {
            begin: startMoment.format(),
            finish: finishMoment.format(),
            duration: `${moment
              .duration(finishMoment.diff(startMoment))
              .asSeconds()} seconds`,
            recordCount: queryResult.data.x.length,
          };
          // get the data back from the query
          var dTemp = queryResult.data;
        } catch (e) {
          // this is an error produced by a bug in the query function, not an error returned by the mysql database
          e.message = `Error in queryDB: ${e.message} for statement: ${statement}`;
          throw new Error(e.message);
        }
        if (queryResult.error !== undefined && queryResult.error !== "") {
          if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
            // this is NOT an error just a no data condition
            dataFoundForCurve = false;
          } else {
            // this is an error returned by the mysql database
            error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
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
        ? `${label}- mean = NoData`
        : `${label}- mean = ${mean.toPrecision(4)}`;
    curve.annotation = annotation;
    curve.xmin = d.xmin;
    curve.xmax = d.xmax;
    curve.ymin = d.ymin;
    curve.ymax = d.ymax;
    curve.axisKey = statisticSelect;
    curve.binParam = binParam;
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(
      curve,
      curveIndex,
      axisMap,
      d,
      appParams
    ); // generate plot with data, curve annotation, axis labels, etc.
    dataset.push(cOptions);
    const postQueryFinishMoment = moment();
    dataRequests[`post data retrieval (query) process time - ${label}`] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration: `${moment
        .duration(postQueryFinishMoment.diff(postQueryStartMoment))
        .asSeconds()} seconds`,
    };
  } // end for curves

  if (!dataFoundForAnyCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves,
    curvesLength,
    statType,
    axisMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataPerformanceDiagram(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
