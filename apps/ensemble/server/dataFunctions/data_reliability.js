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

// eslint-disable-next-line no-undef
dataReliability = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.reliability,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };

  const totalProcessingStart = moment();
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;

  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;

  const axisMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;

  let statType;

  let statement = "";
  let error = "";
  const dataset = [];

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;

    const { variable } = curve;
    const databaseRef = matsCollections.variable.findOne({ name: "variable" })
      .optionsMap[variable];
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];

    const { threshold } = curve;
    const thresholdClause = `and m0.trsh = ${threshold}`;

    const { members } = curve;
    const memberClause = `and m0.mem = ${members}`;

    const neighborhoodSize = curve["neighborhood-size"];
    const neighborhoodClause = `and m0.nhd_size = ${neighborhoodSize}`;

    let validTimeClause = "";
    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and floor((m0.time)%(24*3600)/3600) IN(${validTimes})`;
    }

    const forecastLength = curve["forecast-length"];
    const forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;

    const statisticClause =
      "sum(m0.nhdfcstcount) as fcstcount, sum(m0.fcstcount) as rawfcstcount, sum(m0.nhdhitcount) " +
      "as hitcount, group_concat(m0.time, ';', m0.nhdfcstcount, ';', " +
      "m0.fcstcount, ';', m0.nhdhitcount order by m0.time) as sub_data, count(m0.nhdfcstcount) as n0";
    const tableStatPrefix = "count";

    const dateClause = `and m0.time >= ${fromSecs} and m0.time <= ${toSecs}`;

    let kernelClause = "";
    const { kernel } = curve;
    kernelClause = `and m0.kernel in (0, ${kernel})`;

    const regionStr = curve.region;
    let region = Object.keys(
      matsCollections.region.findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
    );
    region = region === "Full" ? "Full_domain" : region; // this db doesn't handle the full domain the way the others do

    const queryTableClause = `from ${databaseRef}.${model}_${tableStatPrefix}_${region} as m0`;

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    statType = "precalculated";
    const axisKey = "Observed Frequency";
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "select m0.prob as binValue, m0.kernel, " +
          "count(distinct m0.time) as nTimes, " +
          "min(m0.time) as min_secs, " +
          "max(m0.time) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{dateClause}} " +
          "{{memberClause}} " +
          "{{neighborhoodClause}} " +
          "{{thresholdClause}} " +
          "{{kernelClause}} " +
          "{{validTimeClause}} " +
          "{{forecastLengthClause}} " +
          "group by binValue, kernel " +
          "order by binValue, kernel" +
          ";";

        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{memberClause}}", memberClause);
        statement = statement.replace("{{neighborhoodClause}}", neighborhoodClause);
        statement = statement.replace("{{thresholdClause}}", thresholdClause);
        statement = statement.replace("{{kernelClause}}", kernelClause);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        dataRequests[label] = statement;

        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBReliability(
          sumPool, // eslint-disable-line no-undef
          statement,
          appParams,
          kernel
        );

        finishMoment = moment();
        dataRequests[label] = statement;
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
      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve -- not supported for Reliability plots
      throw new Error(
        "INFO:  Difference curves are not supported for Reliability curves, as they do not feature consistent x or y values across all curves."
      );
    }

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
    const postQueryStartMoment = moment();
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
    curve.axisKey = axisKey;
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
  const result = matsDataProcessUtils.processDataReliability(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
