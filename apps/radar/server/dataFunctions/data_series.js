/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataDiffUtils,
  matsDataCurveOpsUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

/* eslint-disable no-await-in-loop */

global.dataSeries = async function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.timeSeries,
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
  const allStatTypes = [];
  const utcCycleStarts = [];
  const idealValues = [];

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
    const databaseRef = (
      await matsCollections.variable.findOneAsync({ name: "variable" })
    ).optionsMap[variable];
    const model = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).optionsMap[variable][curve["data-source"]][0];

    const thresholdStr = curve.threshold;
    const threshold = Object.keys(
      (await matsCollections.threshold.findOneAsync({ name: "threshold" })).valuesMap[
        variable
      ]
    ).find(
      async (key) =>
        (await matsCollections.threshold.findOneAsync({ name: "threshold" })).valuesMap[
          variable
        ][key] === thresholdStr
    );
    const thresholdClause = `and m0.trsh = ${threshold / 10000}`;

    const scaleStr = curve.scale;
    const scale = Object.keys(
      (await matsCollections.scale.findOneAsync({ name: "scale" })).valuesMap[variable]
    ).find(
      async (key) =>
        (await matsCollections.scale.findOneAsync({ name: "scale" })).valuesMap[
          variable
        ][key] === scaleStr
    );

    let validTimeClause = "";
    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and floor((m0.time)%(24*3600)/3600) IN(${validTimes})`;
    }

    let forecastLength = curve["forecast-length"];
    const forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap;
    const statisticClause =
      "sum(m0.yy) as hit, sum(m0.ny) as fa, sum(m0.yn) as miss, sum(m0.nn) as cn, group_concat(m0.time, ';', m0.yy, ';', m0.ny, ';', m0.yn, ';', m0.nn order by m0.time) as sub_data, count(m0.yy) as n0";

    const averageStr = curve.average;
    const averageOptionsMap = (
      await matsCollections.average.findOneAsync({ name: "average" })
    ).optionsMap;
    const average = averageOptionsMap[averageStr][0];

    const dateClause = `and m0.time >= ${fromSecs} and m0.time <= ${toSecs}`;

    const regionStr = curve.region;
    const region = Object.keys(
      (await matsCollections.region.findOneAsync({ name: "region" })).valuesMap
    ).find(
      async (key) =>
        (await matsCollections.region.findOneAsync({ name: "region" })).valuesMap[
          key
        ] === regionStr
    );
    const queryTableClause = `from ${databaseRef}.${model}_${scale}_${region} as m0`;

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    [statType] = statisticOptionsMap[statisticSelect];
    allStatTypes.push(statType);
    const axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    const idealVal = statisticOptionsMap[statisticSelect][2];
    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "select {{average}} as avtime, " +
          "count(distinct m0.time) as nTimes, " +
          "min(m0.time) as min_secs, " +
          "max(m0.time) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{dateClause}} " +
          "{{thresholdClause}} " +
          "{{validTimeClause}} " +
          "{{forecastLengthClause}} " +
          "group by avtime " +
          "order by avtime" +
          ";";

        statement = statement.replace("{{average}}", average);
        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{thresholdClause}}", thresholdClause);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        dataRequests[label] = statement;

        // math is done on forecastLength later on -- set all analyses to 0
        if (forecastLength === "-99") {
          forecastLength = "0";
        }

        // send the query statement to the query function
        queryResult = await matsDataQueryUtils.queryDBTimeSeries(
          global.sumPool,
          statement,
          model,
          forecastLength,
          fromSecs,
          toSecs,
          averageStr,
          statisticSelect,
          validTimes,
          appParams,
          false
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
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(
        dataset,
        diffFrom,
        appParams,
        allStatTypes
      );
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
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
    idealValues,
    utcCycleStarts,
    statType,
    axisMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = await matsDataProcessUtils.processDataXYCurve(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
