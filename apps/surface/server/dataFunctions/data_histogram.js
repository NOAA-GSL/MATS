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

// eslint-disable-next-line no-undef
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

  const totalProcessingStart = moment();
  const dataRequests = {}; // used to store data queries
  const dataFoundForCurve = [];
  let dataFoundForAnyCurve = false;
  const alreadyMatched = false;

  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;

  const axisMap = Object.create(null);
  let statType;
  let varUnits;

  let statement = "";
  let error = "";
  const dataset = [];
  const allReturnedSubStats = [];
  const allReturnedSubSecs = [];

  // process user bin customizations
  const binParams = matsDataUtils.setHistogramParameters(plotParams);
  const { yAxisFormat } = binParams;
  const { binNum } = binParams;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    dataFoundForCurve[curveIndex] = true;
    const { label } = curve;
    const { diffFrom } = curve;
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[curve["data-source"]][0];

    let queryTableClause = "";
    const regionType = curve["region-type"];
    const retroVal = matsCollections["data-source"].findOne({ name: "data-source" })
      .retroMap[curve["data-source"]][0];

    const variableStr = curve.variable;
    const variableOptionsMap = matsCollections.variable.findOne(
      { name: "variable" },
      { optionsMap: 1 }
    ).optionsMap;
    const variable = variableOptionsMap[regionType][variableStr];

    let validTimeClause = "";

    const forecastLength = curve["forecast-length"];
    let forecastLengthClause = "";

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
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
      forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
      dateClause = `and m0.valid_day+3600*m0.hour >= ${fromSecs} and m0.valid_day+3600*m0.hour <= ${toSecs}`;
      NAggregate = "sum";
      [, NClause] = variable;

      const metarStringStr = curve.truth;
      const metarString = Object.keys(
        matsCollections.truth.findOne({ name: "truth" }).valuesMap
      ).find(
        (key) =>
          matsCollections.truth.findOne({ name: "truth" }).valuesMap[key] ===
          metarStringStr
      );

      const regionStr = curve.region;
      const region = Object.keys(
        matsCollections.region.findOne({ name: "region" }).valuesMap
      ).find(
        (key) =>
          matsCollections.region.findOne({ name: "region" }).valuesMap[key] ===
          regionStr
      );
      queryTableClause = `from ${model}_${metarString}_${region} as m0`;
      queryPool = sumPool; // eslint-disable-line no-undef
    } else {
      timeVar = "m0.time";
      dateClause = `and m0.time >= ${fromSecs} - 900 and m0.time <= ${toSecs} + 900`;
      siteDateClause = `and o.time >= ${fromSecs} - 900 and o.time <= ${toSecs} + 900`;
      siteMatchClause = "and m0.sta_id = o.sta_id and m0.time = o.time";
      NAggregate = "count";
      NClause = "1";

      let modelTable;
      if (forecastLength === 1) {
        modelTable = `${model}qp1f`;
        forecastLengthClause = "";
      } else {
        modelTable = retroVal === "retro" ? `${model}p` : `${model}qp`;
        forecastLengthClause = `and m0.fcst_len = ${forecastLength} `;
      }
      const obsTable = retroVal === "retro" ? "obs_retro" : "obs";
      queryTableClause = `from ${obsTable} as o, ${modelTable} as m0 `;
      const siteMap = matsCollections.StationMap.findOne(
        { name: "stations" },
        { optionsMap: 1 }
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
      queryPool = sitePool; // eslint-disable-line no-undef
    }

    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and floor((${timeVar}+1800)%(24*3600)/3600) IN(${validTimes})`; // adjust by 1800 seconds to center obs at the top of the hour
    }

    const statisticClause =
      `sum(${variable[0]}) as square_diff_sum, ${NAggregate}(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
      `group_concat(${timeVar}, ';', ${variable[0]}, ';', ${NClause}, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by ${timeVar}) as sub_data, count(${variable[0]}) as N0`;
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    const { statVarUnitMap } = matsCollections.variable.findOne(
      { name: "variable" },
      { statVarUnitMap: 1 }
    );
    statType = statisticOptionsMap[statisticSelect];
    varUnits = statVarUnitMap[statisticSelect][variableStr];
    let axisKey = yAxisFormat;
    if (yAxisFormat === "Relative frequency") {
      axisKey += " (x100)";
    }
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "select ceil(3600*floor(({{timeVar}}+1800)/3600)) as avtime, " +
          "count(distinct ceil(3600*floor(({{timeVar}}+1800)/3600))) as N_times, " +
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
          "{{forecastLengthClause}} " +
          "group by avtime " +
          "order by avtime" +
          ";";

        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{siteMatchClause}}", siteMatchClause);
        statement = statement.replace("{{sitesClause}}", sitesClause);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        statement = statement.replace("{{siteDateClause}}", siteDateClause);
        statement = statement.split("{{timeVar}}").join(timeVar);
        dataRequests[label] = statement;

        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
          queryPool, // eslint-disable-line no-undef
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
