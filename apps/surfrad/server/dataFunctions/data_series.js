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
import moment from "moment";

/* eslint-disable no-await-in-loop */

global.dataSeries = async function (plotParams) {
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

    const obsType = curve["obs-type"];
    const databaseRef = (
      await matsCollections["obs-type"].findOneAsync({ name: "obs-type" })
    ).optionsMap[obsType].sumsDB;
    const model = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).optionsMap[obsType][curve["data-source"]][0];

    const variableStr = curve.variable;
    const variableOptionsMap = (
      await matsCollections.variable.findOneAsync({ name: "variable" })
    ).optionsMap;

    const scaleStr = curve.scale;
    const scaleValues = (await matsCollections.scale.findOneAsync({ name: "scale" }))
      .valuesMap;
    const scale = Object.keys(scaleValues).find((key) => scaleValues[key] === scaleStr);
    const scaleClause = `and m0.scale = ${scale}`;

    let validTimeClause = "";
    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and (m0.secs)%(24*3600)/3600 IN(${validTimes})`;
    }

    let forecastLength = Number(curve["forecast-length"]) * 60;
    const forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap;

    const averageStr = curve.average;
    const averageOptionsMap = (
      await matsCollections.average.findOneAsync({ name: "average" })
    ).optionsMap;
    const average = averageOptionsMap[averageStr][0];

    const dateClause = `and m0.secs >= ${fromSecs} and m0.secs <= ${toSecs}`;

    const regionStr = curve.region;
    const regionValues = (await matsCollections.region.findOneAsync({ name: "region" }))
      .valuesMap;
    const region = Object.keys(regionValues).find(
      (key) => regionValues[key] === regionStr
    );

    let queryTableClause;
    let NAggregate;
    let NClause;
    let variable;
    if (region === "all_stat") {
      variable = variableOptionsMap[variableStr]["Predefined region"];
      queryTableClause = `from ${databaseRef}.${model}_all_site_sums as m0`;
      NAggregate = "sum";
      [, NClause] = variable;
    } else if (region === "all_surf") {
      variable = variableOptionsMap[variableStr]["Predefined region"];
      queryTableClause = `from ${databaseRef}.${model}_all_surfrad_sums as m0`;
      NAggregate = "sum";
      [, NClause] = variable;
    } else if (region === "all_sol") {
      variable = variableOptionsMap[variableStr]["Predefined region"];
      queryTableClause = `from ${databaseRef}.${model}_all_solrad_sums as m0`;
      NAggregate = "sum";
      [, NClause] = variable;
    } else {
      variable = variableOptionsMap[variableStr]["Select stations"];
      queryTableClause = `from ${databaseRef}.${model}_site_${region} as m0`;
      NAggregate = "count";
      NClause = "1";
    }

    const statisticClause =
      `sum(${variable[0]}) as square_diff_sum, ${NAggregate}(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
      `group_concat(m0.secs, ';', ${variable[0]}, ';', ${NClause}, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by m0.secs) as sub_data, count(${variable[0]}) as n0`;

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    const { statVarUnitMap } = await matsCollections.variable.findOneAsync({
      name: "variable",
    });
    statType = statisticOptionsMap[statisticSelect];
    allStatTypes.push(statType);
    const axisKey = statVarUnitMap[statisticSelect][variableStr];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "select {{average}} as avtime, " +
          "count(distinct m0.secs) as nTimes, " +
          "min(m0.secs) as min_secs, " +
          "max(m0.secs) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{dateClause}} " +
          "{{validTimeClause}} " +
          "{{forecastLengthClause}} " +
          "{{scaleClause}} " +
          "group by avtime " +
          "order by avtime" +
          ";";

        statement = statement.replace("{{average}}", average);
        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{scaleClause}}", scaleClause);
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
          `${statisticSelect}_${variableStr}`,
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
  return result;
};
