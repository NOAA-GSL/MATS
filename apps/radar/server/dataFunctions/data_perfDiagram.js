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
dataPerformanceDiagram = async function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.performanceDiagram,
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

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;

    const binParam = curve["bin-parameter"];
    // eslint-disable-next-line no-await-in-loop
    const binClause = await matsCollections["bin-parameter"].findOneAsync({
      name: "bin-parameter",
    }).optionsMap[binParam];

    const { variable } = curve;
    // eslint-disable-next-line no-await-in-loop
    const databaseRef = await matsCollections.variable.findOneAsync({
      name: "variable",
    }).optionsMap[variable];
    // eslint-disable-next-line no-await-in-loop
    const model = await matsCollections["data-source"].findOneAsync({
      name: "data-source",
    }).optionsMap[variable][curve["data-source"]][0];

    let thresholdClause = "";
    if (binParam !== "Threshold") {
      const thresholdStr = curve.threshold;
      if (thresholdStr === undefined) {
        throw new Error(
          `INFO:  ${label}'s threshold is undefined. Please assign it a value.`
        );
      }
      const threshold = Object.keys(
        // eslint-disable-next-line no-await-in-loop
        await matsCollections.threshold.findOneAsync({ name: "threshold" }).valuesMap[
          variable
        ]
      ).find(
        async (key) =>
          (await matsCollections.threshold.findOneAsync({ name: "threshold" })
            .valuesMap[variable][key]) === thresholdStr
      );
      thresholdClause = `and m0.trsh = ${threshold / 10000}`;
    }

    const scaleStr = curve.scale;
    const scale = Object.keys(
      // eslint-disable-next-line no-await-in-loop
      await matsCollections.scale.findOneAsync({ name: "scale" }).valuesMap[variable]
    ).find(
      async (key) =>
        (await matsCollections.scale.findOneAsync({ name: "scale" }).valuesMap[
          variable
        ][key]) === scaleStr
    );

    let validTimeClause = "";
    if (binParam !== "Valid UTC hour") {
      const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and m0.time%(24*3600)/3600 IN(${validTimes})`;
      }
    }

    let forecastLengthClause = "";
    if (binParam !== "Fcst lead time") {
      const forecastLength = curve["forecast-length"];
      if (forecastLength === undefined) {
        throw new Error(
          `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
        );
      }
      forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
    }

    const statisticSelect = "PerformanceDiagram";

    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    let dateString = "";
    let dateClause = "";
    if (binParam === "Init Date") {
      dateString = "m0.time-m0.fcst_len*3600";
    } else {
      dateString = "m0.time";
    }
    dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;

    const regionStr = curve.region;
    const region = Object.keys(
      // eslint-disable-next-line no-await-in-loop
      await matsCollections.region.findOneAsync({ name: "region" }).valuesMap
    ).find(
      async (key) =>
        (await matsCollections.region.findOneAsync({ name: "region" }).valuesMap[
          key
        ]) === regionStr
    );
    const queryTableClause = `from ${databaseRef}.${model}_${scale}_${region} as m0`;

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable + statistic (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    statType = "ctc";
    curves[curveIndex].axisKey = statisticSelect; // stash the axisKey to use it later for axis options

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "{{binClause}} " +
          "count(distinct {{dateString}}) as nTimes, " +
          "min({{dateString}}) as min_secs, " +
          "max({{dateString}}) as max_secs, " +
          "((sum(m0.yy)+0.00)/sum(m0.yy+m0.yn)) as pod, ((sum(m0.ny)+0.00)/sum(m0.ny+m0.yy)) as far, " +
          "sum(m0.yy+m0.yn) as oy_all, sum(m0.ny+m0.nn) as on_all, group_concat(m0.time, ';', m0.yy, ';', " +
          "m0.ny, ';', m0.yn, ';', m0.nn order by m0.time) as sub_data, count(m0.yy) as n0 " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{dateClause}} " +
          "{{thresholdClause}} " +
          "{{validTimeClause}} " +
          "{{forecastLengthClause}} " +
          "group by binVal " +
          "order by binVal" +
          ";";

        statement = statement.replace("{{binClause}}", binClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{thresholdClause}}", thresholdClause);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        statement = statement.split("{{dateString}}").join(dateString);
        dataRequests[label] = statement;

        // send the query statement to the query function
        // eslint-disable-next-line no-await-in-loop
        queryResult = await matsDataQueryUtils.queryDBPerformanceDiagram(
          sumPool, // eslint-disable-line no-undef
          statement,
          appParams
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
          if (error.includes("ER_NO_SUCH_TABLE")) {
            throw new Error(
              `INFO:  The region/scale combination [${regionStr} and ${scaleStr}] is not supported by the database for the model [${model}]. ` +
                `Choose a different scale to continue using this region.`
            );
          } else {
            throw new Error(error);
          }
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
      // this is a difference curve -- not supported for performance diagrams
      throw new Error(
        "INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves."
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
    curve.axisKey = statisticSelect;
    curve.binParam = binParam;
    // eslint-disable-next-line no-await-in-loop
    const cOptions = await matsDataCurveOpsUtils.generateSeriesCurveOptions(
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
  const result = await matsDataProcessUtils.processDataPerformanceDiagram(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
