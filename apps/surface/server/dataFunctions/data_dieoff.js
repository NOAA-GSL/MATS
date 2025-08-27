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

global.dataDieoff = async function (plotParams) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.dieoff,
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

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;
    const model = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).optionsMap[curve["data-source"]][0];

    let queryTableClause = "";
    const regionType = curve["region-type"];
    const retroVal = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).retroMap[curve["data-source"]][0];

    const variableStr = curve.variable;
    const variableOptionsMap = (
      await matsCollections.variable.findOneAsync({ name: "variable" })
    ).optionsMap;
    const variable = variableOptionsMap[regionType][variableStr];

    let validTimes;
    let validTimeClause = "";

    let utcCycleStart;
    let utcCycleStartClause = "";

    const forecastLengthStr = curve["dieoff-type"];
    const forecastLengthOptionsMap = (
      await matsCollections["dieoff-type"].findOneAsync({ name: "dieoff-type" })
    ).optionsMap;
    const forecastLength = forecastLengthOptionsMap[forecastLengthStr][0];

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap;

    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;

    let timeVar;
    let dateClause;
    let siteDateClause = "";
    let siteMatchClause = "";
    let sitesClause = "";
    let NAggregate;
    let NClause;
    let queryPool;

    if (regionType === "Predefined region") {
      timeVar = "m0.valid_day+3600*m0.hour";
      dateClause = `and m0.valid_day+3600*m0.hour >= ${fromSecs} and m0.valid_day+3600*m0.hour <= ${toSecs}`;
      NAggregate = "sum";
      [, NClause] = variable;

      const metarStringStr = curve.truth;
      const metarValues = (await matsCollections.truth.findOneAsync({ name: "truth" }))
        .valuesMap;
      const metarString = Object.keys(metarValues).find(
        (key) => metarValues[key] === metarStringStr
      );

      const regionStr = curve.region;
      const regionValues = (
        await matsCollections.region.findOneAsync({ name: "region" })
      ).valuesMap;
      const region = Object.keys(regionValues).find(
        (key) => regionValues[key] === regionStr
      );
      queryTableClause = `from ${model}_${metarString}_${region} as m0`;
      queryPool = global.sumPool;
    } else {
      timeVar = "m0.time";
      dateClause = `and m0.time >= ${fromSecs} - 900 and m0.time <= ${toSecs} + 900`;
      siteDateClause = `and o.time >= ${fromSecs} - 900 and o.time <= ${toSecs} + 900`;
      siteMatchClause = "and m0.sta_id = o.sta_id and m0.time = o.time";
      NAggregate = "count";
      NClause = "1";

      const modelTable = retroVal === "retro" ? `${model}p` : `${model}qp`;
      const obsTable = retroVal === "retro" ? "obs_retro" : "obs";
      queryTableClause = `from ${obsTable} as o, ${modelTable} as m0 `;

      const siteMap = (
        await matsCollections.StationMap.findOneAsync({
          name: "stations",
        })
      ).optionsMap;
      const sitesList = curve.sites === undefined ? [] : curve.sites;
      let querySites = [];
      if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        querySites = sitesList.map(function (site) {
          return siteMap.find((obj) => obj.origName === site).options.id;
        });
        sitesClause = ` and m0.sta_id in('${querySites.join("','")}')`;
      } else {
        throw new Error(
          "INFO:  Please add sites in order to get a single/multi station plot."
        );
      }
      queryPool = global.sitePool;
    }

    if (forecastLength === matsTypes.ForecastTypes.dieoff) {
      validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and floor((${timeVar}+1800)%(24*3600)/3600) IN(${validTimes})`; // adjust by 1800 seconds to center obs at the top of the hour
      }
    } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
      utcCycleStart =
        curve["utc-cycle-start"] === undefined ? [] : curve["utc-cycle-start"];
      if (utcCycleStart.length !== 0 && utcCycleStart !== matsTypes.InputTypes.unused) {
        utcCycleStartClause = `and floor(((${timeVar}+1800) - m0.fcst_len*3600)%(24*3600)/3600) IN(${utcCycleStart})`; // adjust by 1800 seconds to center obs at the top of the hour
      }
      if (regionType === "Predefined region") {
        dateClause = `and ${timeVar}-m0.fcst_len*3600 >= ${fromSecs} and ${timeVar}-m0.fcst_len*3600 <= ${toSecs}`;
      } else {
        dateClause = `and ${timeVar}-m0.fcst_len*3600 >= ${fromSecs} - 900 and ${timeVar}-m0.fcst_len*3600 <= ${toSecs} + 900`;
      }
    } else {
      dateClause = `and ${timeVar}-m0.fcst_len*3600 = ${fromSecs}`;
    }

    const statisticClause =
      `sum(${variable[0]}) as square_diff_sum, ${NAggregate}(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
      `group_concat(${timeVar}, ';', ${variable[0]}, ';', ${NClause}, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by ${timeVar}) as sub_data, count(${variable[0]}) as n0`;

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    const { statVarUnitMap } = await matsCollections.variable.findOneAsync({
      name: "variable",
    });
    statType = statisticOptionsMap[statisticSelect];
    allStatTypes.push(statType);
    const varUnits = statVarUnitMap[statisticSelect][variableStr];
    const axisKey = varUnits;
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "select m0.fcst_len as fcst_lead, " +
          "count(distinct ceil(3600*floor(({{timeVar}}+1800)/3600))) as nTimes, " +
          "min(ceil(3600*floor(({{timeVar}}+1800)/3600))) as min_secs, " +
          "max(ceil(3600*floor(({{timeVar}}+1800)/3600))) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{siteMatchClause}} " +
          "{{sitesClause}} " +
          "{{dateClause}} " +
          "{{siteDateClause}} " +
          "{{validTimeClause}} " +
          "{{utcCycleStartClause}} " +
          "group by fcst_lead " +
          "order by fcst_lead" +
          ";";

        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{siteMatchClause}}", siteMatchClause);
        statement = statement.replace("{{sitesClause}}", sitesClause);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{utcCycleStartClause}}", utcCycleStartClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        statement = statement.replace("{{siteDateClause}}", siteDateClause);
        statement = statement.split("{{timeVar}}").join(timeVar);
        dataRequests[label] = statement;

        // send the query statement to the query function
        queryResult = await matsDataQueryUtils.queryDBSpecialtyCurve(
          queryPool,
          statement,
          appParams,
          `${statisticSelect}_${variableStr}`
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
          if (error.includes("Unknown column")) {
            throw new Error(
              `INFO:  The statistic/variable combination [${statisticSelect} and ${variableStr}] is not supported by the database for this model and region].`
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
  return result;
};
