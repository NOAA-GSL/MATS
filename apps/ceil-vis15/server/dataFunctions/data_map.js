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
    hasLevels: false,
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
  const { variable } = curve;
  const databaseRef = matsCollections.variable.findOne({ name: "variable" }).optionsMap[
    variable
  ];
  const modelTable = matsCollections["data-source"].findOne({ name: "data-source" })
    .optionsMap[variable][curve["data-source"]][0];
  const obsTable =
    modelTable.includes("ret_") || modelTable.includes("Ret_") ? "obs_retro" : "obs";
  const queryTableClause = `from ${databaseRef.modelDB}.${obsTable} as o, ${databaseRef.modelDB}.${modelTable} as m0 `;
  let sitesClause = "";
  const siteMap = matsCollections.StationMap.findOne(
    { name: "stations" },
    { optionsMap: 1 }
  ).optionsMap;
  let truthClause = "";
  if (variable === "15 Minute Visibility") {
    const truthStr = curve.truth;
    var truth = Object.keys(
      matsCollections.truth.findOne({ name: "truth" }).valuesMap[variable]
    ).find(
      (key) =>
        matsCollections.truth.findOne({ name: "truth" }).valuesMap[variable][key] ===
        truthStr
    );
  }
  const thresholdStr = curve.threshold;
  const threshold = Object.keys(
    matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
  ).find(
    (key) =>
      matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable][
        key
      ] === thresholdStr
  );
  let validTimeClause = "";
  const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
  if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
    validTimeClause = `and floor((m0.time+450)%(24*3600)/900)/4 IN(${validTimes})`;
  }
  const forecastLength = Number(curve["forecast-length"]);
  const forecastHour = Math.floor(forecastLength);
  const forecastMinute = (forecastLength - forecastHour) * 60;
  const forecastLengthClause = `and m0.fcst_len = ${forecastLength} and m0.fcst_min = ${forecastMinute}`;
  const { statistic } = curve;
  let statisticClause =
    "sum(if((m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0)) as hit, sum(if((m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0)) as fa, " +
    "sum(if(NOT (m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0)) as miss, sum(if(NOT (m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0)) as cn, " +
    "group_concat(ceil(3600*floor((m0.time+1800)/3600)), ';', if((m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0), ';', " +
    "if((m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0), ';', if(NOT (m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0), ';', " +
    "if(NOT (m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0) order by ceil(3600*floor((m0.time+1800)/3600))) as sub_data, count(m0.ceil) as N0";
  statisticClause = statisticClause.replace(/\{\{threshold\}\}/g, threshold);
  if (variable.includes("Visibility")) {
    statisticClause = statisticClause.replace(/m0\.ceil/g, "m0.vis100");
    if (truth !== "qc") {
      statisticClause = statisticClause.replace(/o\.ceil/g, `o.vis_${truth}`);
    } else {
      statisticClause = statisticClause.replace(/o\.ceil/g, "o.vis_closest");
      truthClause = "and o.vis_std < 2.4";
    }
  }
  const sitesList = curve.sites === undefined ? [] : curve.sites;
  const querySites = [];
  if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
    let thisSite;
    let thisSiteObj;
    for (let sidx = 0; sidx < sitesList.length; sidx++) {
      thisSite = sitesList[sidx];
      thisSiteObj = siteMap.find((obj) => obj.origName === thisSite);
      querySites.push(thisSiteObj.options.id);
    }
    sitesClause = ` and m0.madis_id in('${querySites.join("','")}')`;
  } else {
    throw new Error(
      "INFO:  Please add sites in order to get a single/multi station plot."
    );
  }
  const dateClause = `and m0.time >= ${fromSecs} - 300 and m0.time <= ${toSecs} + 300`;
  const siteDateClause = `and o.time >= ${fromSecs} - 300 and o.time <= ${toSecs} + 300`;
  const siteMatchClause = "and m0.madis_id = o.madis_id and m0.time = o.time";

  let statement =
    "select m0.madis_id as sta_id, " +
    "count(distinct ceil(900*floor((m0.time+450)/900))) as N_times, " +
    "min(ceil(900*floor((m0.time+450)/900))) as min_secs, " +
    "max(ceil(900*floor((m0.time+450)/900))) as max_secs, " +
    "{{statisticClause}} " +
    "{{queryTableClause}} " +
    "where 1=1 " +
    "{{siteMatchClause}} " +
    "{{sitesClause}} " +
    "{{dateClause}} " +
    "{{siteDateClause}} " +
    "{{validTimeClause}} " +
    "{{forecastLengthClause}} " +
    "{{truthClause}} " +
    "group by sta_id " +
    "order by N0" +
    ";";

  statement = statement.replace("{{statisticClause}}", statisticClause);
  statement = statement.replace("{{queryTableClause}}", queryTableClause);
  statement = statement.replace("{{siteMatchClause}}", siteMatchClause);
  statement = statement.replace("{{sitesClause}}", sitesClause);
  statement = statement.replace("{{validTimeClause}}", validTimeClause);
  statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
  statement = statement.replace("{{truthClause}}", truthClause);
  statement = statement.replace("{{dateClause}}", dateClause);
  statement = statement.replace("{{siteDateClause}}", siteDateClause);
  if (variable.includes("Visibility")) {
    statement = statement.replace(/o\.time/g, "o.valid_time");
  }
  dataRequests[label] = statement;

  let queryResult;
  const startMoment = moment();
  let finishMoment;
  try {
    // send the query statement to the query function
    queryResult = matsDataQueryUtils.queryDBMapCTC(
      sumPool,
      statement,
      modelTable,
      statistic,
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
    var dPurple = queryResult.dataPurple;
    var dPurpleBlue = queryResult.dataPurpleBlue;
    var dBlue = queryResult.dataBlue;
    var dBlueGreen = queryResult.dataBlueGreen;
    var dGreen = queryResult.dataGreen;
    var dGreenYellow = queryResult.dataGreenYellow;
    var dYellow = queryResult.dataYellow;
    var dOrange = queryResult.dataOrange;
    var dOrangeRed = queryResult.dataOrangeRed;
    var dRed = queryResult.dataRed;
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
      throw new Error(error);
    }
  }

  let cOptions = matsDataCurveOpsUtils.generateCTCMapCurveOptions(curve, d, appParams); // generate map with site data
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCPurpleCurveText,
    `Values <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.1
    ).toFixed(0)}`,
    dPurple
  ); // generate purple text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCPurpleBlueCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.1
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.2
    ).toFixed(0)}`,
    dPurpleBlue
  ); // generate purple-blue text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCBlueCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.2
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.3
    ).toFixed(0)}`,
    dBlue
  ); // generate blue text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCBlueGreenCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.3
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.4
    ).toFixed(0)}`,
    dBlueGreen
  ); // generate blue-green text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCGreenCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.4
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.5
    ).toFixed(0)}`,
    dGreen
  ); // generate green text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCGreenYellowCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.5
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.6
    ).toFixed(0)}`,
    dGreenYellow
  ); // generate green-yellow text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCYellowCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.6
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.7
    ).toFixed(0)}`,
    dYellow
  ); // generate yellow text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCOrangeCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.7
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.8
    ).toFixed(0)}`,
    dOrange
  ); // generate orange text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCOrangeRedCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.8
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.9
    ).toFixed(0)}`,
    dOrangeRed
  ); // generate orange-red text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCRedCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.9
    ).toFixed(0)}`,
    dRed
  ); // generate red text layer
  dataset.push(cOptions);

  const resultOptions = matsDataPlotOpsUtils.generateMapPlotOptions(true);
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
