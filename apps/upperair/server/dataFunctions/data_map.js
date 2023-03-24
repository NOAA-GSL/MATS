/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataCurveOpsUtils,
  matsDataPlotOpsUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

dataMap = function (plotParams, plotFunction) {
  const appParams = {
    plotType: matsTypes.PlotTypes.map,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
  };
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  const totalProcessingStart = moment();
  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;
  let error = "";
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  if (curves.length > 1) {
    throw new Error("INFO:  There must only be one added curve.");
  }
  const dataset = [];
  const curve = curves[0];
  const { label } = curve;
  const { database } = curve;
  const databaseRef = matsCollections.database.findOne({ name: "database" }).optionsMap[
    database
  ];
  let model = matsCollections["data-source"].findOne({ name: "data-source" })
    .optionsMap[database][curve["data-source"]][0];
  // map plots are only for stations--no predefined regions
  const regionType = "Select stations";
  const variableStr = curve.variable;
  const variableOptionsMap = matsCollections.variable.findOne(
    { name: "variable" },
    { optionsMap: 1 }
  ).optionsMap;
  const variable = variableOptionsMap[regionType][variableStr];
  let validTimeClause = "";
  const forecastLength = curve["forecast-length"];
  const forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
  const { top } = curve;
  const { bottom } = curve;
  let sitesClause = "";
  if (database === "AMDAR") {
    throw new Error(
      "Single/multi-station plotting is not supported by the AMDAR databse."
    );
  }
  // remove table prefixes
  const model_components = model.split("_");
  model = model_components[0];
  if (model_components.length > 1) {
    for (let midx = 1; midx < model_components.length - 1; midx++) {
      model = `${model}_${model_components[midx]}`;
    }
  }
  const obsTable = "RAOB";
  const queryTableClause = `from ${databaseRef.modelDB}.${obsTable} as o, ${databaseRef.modelDB}.${model} as m0 `;
  const siteMap = matsCollections.StationMap.findOne(
    { name: "stations" },
    { optionsMap: 1 }
  ).optionsMap;
  const sitesList = curve.sites === undefined ? [] : curve.sites;
  const querySites = [];
  if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
    let thisSite;
    let thisSiteObj;
    for (let sidx = 0; sidx < sitesList.length; sidx++) {
      const possibleSiteNames = sitesList[sidx].match(/\(([^)]*)\)[^(]*$/);
      thisSite =
        possibleSiteNames === null
          ? sitesList[sidx]
          : possibleSiteNames[possibleSiteNames.length - 1];
      thisSiteObj = siteMap.find((obj) => obj.origName === thisSite);
      querySites.push(thisSiteObj.options.id);
    }
    sitesClause = ` and m0.wmoid in('${querySites.join("','")}')`;
  } else {
    throw new Error(
      "INFO:  Please add sites in order to get a single/multi station plot."
    );
  }
  const siteDateClause = `and unix_timestamp(o.date)+3600*o.hour >= ${fromSecs} - 1800 and unix_timestamp(o.date)+3600*o.hour <= ${toSecs} + 1800`;
  const levelClause = `and ceil((m0.press-20)/50)*50 >= ${top} and ceil((m0.press-20)/50)*50 <= ${bottom}`;
  const siteLevelClause = `and ceil((o.press-20)/50)*50 >= ${top} and ceil((o.press-20)/50)*50 <= ${bottom}`;
  const siteMatchClause =
    "and m0.wmoid = o.wmoid and m0.date = o.date and m0.hour = o.hour and m0.press = o.press";
  const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
  if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
    validTimeClause = `and m0.hour IN(${validTimes})`;
  }
  const statisticSelect = curve.statistic;
  const statisticOptionsMap = matsCollections.statistic.findOne(
    { name: "statistic" },
    { optionsMap: 1 }
  ).optionsMap;
  const statisticClause =
    `sum(${variable[0]}) as square_diff_sum, count(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
    `group_concat(unix_timestamp(m0.date)+3600*m0.hour, ';', ceil((m0.press-20)/50)*50, ';', ${variable[0]}, ';', 1, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by unix_timestamp(m0.date)+3600*m0.hour, ceil((m0.press-20)/50)*50) as sub_data, count(${variable[0]}) as N0`;
  const statType = statisticOptionsMap[statisticSelect];
  const { statVarUnitMap } = matsCollections.variable.findOne(
    { name: "variable" },
    { statVarUnitMap: 1 }
  );
  const varUnits = statVarUnitMap[statisticSelect][variableStr];
  const dateClause = `and unix_timestamp(m0.date)+3600*m0.hour >= ${fromSecs} - 1800 and unix_timestamp(m0.date)+3600*m0.hour <= ${toSecs} + 1800`;

  let statement =
    "select m0.wmoid as sta_id, " +
    "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
    "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
    "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
    "{{statisticClause}} " +
    "{{queryTableClause}} " +
    "where 1=1 " +
    "{{siteMatchClause}} " +
    "{{sitesClause}} " +
    "{{dateClause}} " +
    "{{siteDateClause}} " +
    "{{validTimeClause}} " +
    "{{forecastLengthClause}} " +
    "{{levelClause}} " +
    "{{siteLevelClause}} " +
    "group by sta_id " +
    "order by sta_id" +
    ";";

  statement = statement.replace("{{statisticClause}}", statisticClause);
  statement = statement.replace("{{queryTableClause}}", queryTableClause);
  statement = statement.replace("{{siteMatchClause}}", siteMatchClause);
  statement = statement.replace("{{sitesClause}}", sitesClause);
  statement = statement.replace("{{validTimeClause}}", validTimeClause);
  statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
  statement = statement.replace("{{levelClause}}", levelClause);
  statement = statement.replace("{{siteLevelClause}}", siteLevelClause);
  statement = statement.replace("{{dateClause}}", dateClause);
  statement = statement.replace("{{siteDateClause}}", siteDateClause);
  dataRequests[label] = statement;

  let queryResult;
  const startMoment = moment();
  let finishMoment;
  try {
    // send the query statement to the query function
    queryResult = matsDataQueryUtils.queryDBMapScalar(
      sumPool,
      statement,
      model,
      statisticSelect,
      variableStr,
      varUnits,
      siteMap,
      appParams
    );
    finishMoment = moment();
    dataRequests[`data retrieval (query) time - ${label}`] = {
      begin: startMoment.format(),
      finish: finishMoment.format(),
      duration: `${moment
        .duration(finishMoment.diff(startMoment))
        .asSeconds()} seconds`,
      recordCount: queryResult.data.length,
    };
    // get the data back from the query
    var d = queryResult.data;
    var dLowest = queryResult.dataLowest;
    var dLow = queryResult.dataLow;
    var dModerate = queryResult.dataModerate;
    var dHigh = queryResult.dataHigh;
    var dHighest = queryResult.dataHighest;
    var { valueLimits } = queryResult;
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
          `INFO:  The variable [${variableStr}] is not supported by the database for the model/sites [${model} and ${sitesList}].`
        );
      } else {
        throw new Error(error);
      }
    }
  }

  let cOptions = matsDataCurveOpsUtils.generateMapCurveOptions(
    curve,
    d,
    appParams,
    valueLimits.maxValue
  ); // generate map with site data
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.ScalarLowestCurveText,
    `Values <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.2
    ).toFixed(1)}${varUnits}`,
    dLowest
  ); // generate lowest text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.ScalarLowCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.2
    ).toFixed(1)}${varUnits} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.4
    ).toFixed(1)}${varUnits}`,
    dLow
  ); // generate low text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.ScalarModerateCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.4
    ).toFixed(1)}${varUnits} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.6
    ).toFixed(1)}${varUnits}`,
    dModerate
  ); // generate moderate text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.ScalarHighCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.6
    ).toFixed(1)}${varUnits} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.8
    ).toFixed(1)}${varUnits}`,
    dHigh
  ); // generate high text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.ScalarHighestCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.8
    ).toFixed(1)}${varUnits}`,
    dHighest
  ); // generate highest text layer
  dataset.push(cOptions);

  const resultOptions = matsDataPlotOpsUtils.generateMapPlotOptions(false);
  const totalProcessingFinish = moment();
  dataRequests["total retrieval and processing time for curve set"] = {
    begin: totalProcessingStart.format(),
    finish: totalProcessingFinish.format(),
    duration: `${moment
      .duration(totalProcessingFinish.diff(totalProcessingStart))
      .asSeconds()} seconds`,
  };
  const result = {
    error,
    data: dataset,
    options: resultOptions,
    basis: {
      plotParams,
      queries: dataRequests,
    },
  };
  plotFunction(result);
};
