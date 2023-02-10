/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

dataHistogram = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.histogram,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };
  const alreadyMatched = false;
  const dataRequests = {}; // used to store data queries
  const dataFoundForCurve = [];
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  let error = "";
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const dataset = [];
  const allReturnedSubStats = [];
  const allReturnedSubSecs = [];
  const axisMap = Object.create(null);

  // process user bin customizations
  const binParams = matsDataUtils.setHistogramParameters(plotParams);
  const { yAxisFormat } = binParams;
  const { binNum } = binParams;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    dataFoundForCurve[curveIndex] = true;
    const { label } = curve;
    var { variable } = curve;
    const databaseRef = matsCollections.variable.findOne({ name: "variable" })
      .optionsMap[variable];
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];
    var regionStr = curve.region;
    const region = Object.keys(
      matsCollections.region.findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
    );
    const queryTableClause = `from ${databaseRef.sumsDB}.${model}_${region} as m0`;
    var thresholdStr = curve.threshold;
    const threshold = Object.keys(
      matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
    ).find(
      (key) =>
        matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable][
          key
        ] === thresholdStr
    );
    const thresholdClause = `and m0.trsh = ${threshold}`;
    let truthClause = "";
    if (variable === "15 Minute Visibility") {
      var truthStr = curve.truth;
      const truth = Object.keys(
        matsCollections.truth.findOne({ name: "truth" }).valuesMap[variable]
      ).find(
        (key) =>
          matsCollections.truth.findOne({ name: "truth" }).valuesMap[variable][key] ===
          truthStr
      );
      truthClause = `and m0.truth = '${truth}'`;
    }
    let validTimeClause = "";
    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and floor((m0.time)%(24*3600)/900)/4 IN(${validTimes})`;
    }
    const forecastLength = Number(curve["forecast-length"]);
    const forecastHour = Math.floor(forecastLength);
    const forecastMinute = (forecastLength - forecastHour) * 60;
    const forecastLengthClause = `and m0.fcst_len = ${forecastLength} and m0.fcst_min = ${forecastMinute}`;
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    const dateClause = `and m0.time >= ${fromSecs} and m0.time <= ${toSecs}`;
    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;
    const statisticClause =
      "sum(m0.yy) as hit, sum(m0.yn) as fa, sum(m0.ny) as miss, sum(m0.nn) as cn, group_concat(m0.time, ';', m0.yy, ';', m0.yn, ';', m0.ny, ';', m0.nn order by m0.time) as sub_data, count(m0.yy) as N0";
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    var statType = statisticOptionsMap[statisticSelect][0];
    var varUnits = statisticOptionsMap[statisticSelect][1];
    let axisKey = yAxisFormat;
    if (yAxisFormat === "Relative frequency") {
      axisKey += " (x100)";
    }
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

    var d;
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      let statement =
        "select m0.time as avtime, " +
        "count(distinct m0.time) as N_times, " +
        "min(m0.time) as min_secs, " +
        "max(m0.time) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{dateClause}} " +
        "{{thresholdClause}} " +
        "{{truthClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "group by avtime " +
        "order by avtime" +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{thresholdClause}}", thresholdClause);
      statement = statement.replace("{{truthClause}}", truthClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
      statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
      statement = statement.replace("{{dateClause}}", dateClause);
      dataRequests[label] = statement;

      var queryResult;
      const startMoment = moment();
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
        dataRequests[`data retrieval (query) time - ${label}`] = {
          begin: startMoment.format(),
          finish: finishMoment.format(),
          duration: `${moment
            .duration(finishMoment.diff(startMoment))
            .asSeconds()} seconds`,
          recordCount: queryResult.data.x.length,
        };
        // get the data back from the query
        d = queryResult.data;
        allReturnedSubStats.push(d.subVals); // save returned data so that we can calculate histogram stats once all the queries are done
        allReturnedSubSecs.push(d.subSecs);
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = `Error in queryDB: ${e.message} for statement: ${statement}`;
        throw new Error(e.message);
      }
      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve[curveIndex] = false;
        } else {
          // this is an error returned by the mysql database
          error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
          throw new Error(error);
        }
      } else {
        dataFoundForAnyCurve = true;
      }
    }
  }

  if (!dataFoundForAnyCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves,
    curvesLength,
    dataFoundForCurve,
    statType,
    axisMap,
    yAxisFormat,
    varUnits,
  };
  const bookkeepingParams = {
    alreadyMatched,
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataHistogram(
    allReturnedSubStats,
    allReturnedSubSecs,
    [],
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    binParams,
    bookkeepingParams
  );
  plotFunction(result);
};
