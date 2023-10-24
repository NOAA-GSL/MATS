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

// eslint-disable-next-line no-undef
dataMap = function (plotParams, plotFunction) {
  const appParams = {
    plotType: matsTypes.PlotTypes.map,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };

  const totalProcessingStart = moment();
  const dataRequests = {}; // used to store data queries

  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  if (curves.length > 1) {
    throw new Error("INFO:  There must only be one added curve.");
  }

  let statement = "";
  let error = "";
  const dataset = [];

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  // initialize variables specific to this curve
  const curve = curves[0];
  const { label } = curve;
  const { diffFrom } = curve;

  const { variable } = curve;
  const databaseRef = matsCollections.variable.findOne({ name: "variable" }).optionsMap[
    variable
  ];
  const modelTable = matsCollections["data-source"].findOne({ name: "data-source" })
    .optionsMap[variable][curve["data-source"]][0];
  const obsTable =
    modelTable.includes("ret_") || modelTable.includes("Ret_") ? "obs_retro" : "obs";
  const queryTableClause = `from ${databaseRef.modelDB}.${obsTable} as o, ${databaseRef.modelDB}.${modelTable} as m0 `;

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
    validTimeClause = `and floor((m0.time+1800)%(24*3600)/3600) IN(${validTimes})`;
  }

  const forecastLength = curve["forecast-length"];
  const forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;

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
    statisticClause = statisticClause.replace(/o\.ceil/g, "o.vis100");
  }

  let sitesClause = "";

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
    sitesClause = ` and m0.madis_id in('${querySites.join("','")}')`;
  } else {
    throw new Error(
      "INFO:  Please add sites in order to get a single/multi station plot."
    );
  }
  const dateClause = `and m0.time >= ${fromSecs} - 900 and m0.time <= ${toSecs} + 900`;
  const siteDateClause = `and o.time >= ${fromSecs} - 900 and o.time <= ${toSecs} + 900`;
  const siteMatchClause = "and m0.madis_id = o.madis_id and m0.time = o.time";

  let d;
  let dPurple;
  let dPurpleBlue;
  let dBlue;
  let dBlueGreen;
  let dGreen;
  let dGreenYellow;
  let dYellow;
  let dOrange;
  let dOrangeRed;
  let dRed;
  let valueLimits;
  if (!diffFrom) {
    let queryResult;
    const startMoment = moment();
    let finishMoment;
    try {
      statement =
        "select m0.madis_id as sta_id, " +
        "count(distinct ceil(3600*floor((m0.time+1800)/3600))) as N_times, " +
        "min(ceil(3600*floor((m0.time+1800)/3600))) as min_secs, " +
        "max(ceil(3600*floor((m0.time+1800)/3600))) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{siteMatchClause}} " +
        "{{sitesClause}} " +
        "{{dateClause}} " +
        "{{siteDateClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "group by sta_id " +
        "order by N0" +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{siteMatchClause}}", siteMatchClause);
      statement = statement.replace("{{sitesClause}}", sitesClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
      statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
      statement = statement.replace("{{dateClause}}", dateClause);
      statement = statement.replace("{{siteDateClause}}", siteDateClause);
      dataRequests[label] = statement;

      // send the query statement to the query function
      queryResult = matsDataQueryUtils.queryDBMapCTC(
        sumPool, // eslint-disable-line no-undef
        statement,
        modelTable,
        statistic,
        siteMap,
        appParams
      );

      finishMoment = moment();
      dataRequests[label] = "Station plot -- no one query.";
      dataRequests[`data retrieval (query) time - ${label}`] = {
        begin: startMoment.format(),
        finish: finishMoment.format(),
        duration: `${moment
          .duration(finishMoment.diff(startMoment))
          .asSeconds()} seconds`,
        recordCount: queryResult.data.length,
      };
      // get the data back from the query
      d = queryResult.data;
      dPurple = queryResult.dataPurple;
      dPurpleBlue = queryResult.dataPurpleBlue;
      dBlue = queryResult.dataBlue;
      dBlueGreen = queryResult.dataBlueGreen;
      dGreen = queryResult.dataGreen;
      dGreenYellow = queryResult.dataGreenYellow;
      dYellow = queryResult.dataYellow;
      dOrange = queryResult.dataOrange;
      dOrangeRed = queryResult.dataOrangeRed;
      dRed = queryResult.dataRed;
      valueLimits = queryResult.valueLimits;
    } catch (e) {
      // this is an error produced by a bug in the query function, not an error returned by the mysql database
      e.message = `Error in queryDB: ${e.message} for statement: ${statement}`;
      throw new Error(e.message);
    }

    if (queryResult.error !== undefined && queryResult.error !== "") {
      if (queryResult.error !== matsTypes.Messages.NO_DATA_FOUND) {
        // this is an error returned by the mysql database
        error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
        throw new Error(error);
      }
    }
  } else {
    // this is a difference curve -- not supported for maps
    throw new Error(
      "INFO:  Difference curves are not supported for maps, as there is only one curve."
    );
  }

  const postQueryStartMoment = moment();
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

  const postQueryFinishMoment = moment();
  dataRequests[`post data retrieval (query) process time - ${label}`] = {
    begin: postQueryStartMoment.format(),
    finish: postQueryFinishMoment.format(),
    duration: `${moment
      .duration(postQueryFinishMoment.diff(postQueryStartMoment))
      .asSeconds()} seconds`,
  };

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
