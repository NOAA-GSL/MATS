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
  const model = matsCollections["data-source"].findOne({ name: "data-source" })
    .optionsMap[curve["data-source"]][0];

  const regionType = "Select stations";

  const variableStr = curve.variable;
  const variableOptionsMap = matsCollections.variable.findOne(
    { name: "variable" },
    { optionsMap: 1 }
  ).optionsMap;
  const variable = variableOptionsMap[regionType][variableStr];

  let validTimeClause = "";
  const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
  if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
    validTimeClause = `and floor((m0.time+1800)%(24*3600)/3600) IN(${validTimes})`;
  }

  const forecastLength = curve["forecast-length"];
  let forecastLengthClause = "";

  const statisticSelect = curve.statistic;
  const statisticClause =
    `sum(${variable[0]}) as square_diff_sum, count(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
    `group_concat(m0.time, ';', ${variable[0]}, ';', 1, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by m0.time) as sub_data, count(${variable[0]}) as N0`;

  let sitesClause = "";

  const dateClause = `and m0.time >= ${fromSecs} - 900 and m0.time <= ${toSecs} + 900`;
  const siteDateClause = `and o.time >= ${fromSecs} - 900 and o.time <= ${toSecs} + 900`;
  const siteMatchClause = "and m0.sta_id = o.sta_id and m0.time = o.time";

  let modelTable;
  if (forecastLength === 1) {
    modelTable = `${model}qp1f`;
    forecastLengthClause = "";
  } else {
    modelTable =
      model.includes("ret_") || model.includes("Ret_") ? `${model}p` : `${model}qp`;
    forecastLengthClause = `and m0.fcst_len = ${forecastLength} `;
  }
  const obsTable =
    model.includes("ret_") || model.includes("Ret_") ? "obs_retro" : "obs";
  const queryTableClause = `from ${obsTable} as o, ${modelTable} as m0 `;
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

  const { statVarUnitMap } = matsCollections.variable.findOne(
    { name: "variable" },
    { statVarUnitMap: 1 }
  );
  const varUnits = statVarUnitMap[statisticSelect][variableStr];

  let d;
  let dLowest;
  let dLow;
  let dModerate;
  let dHigh;
  let dHighest;
  let valueLimits;
  if (!diffFrom) {
    let queryResult;
    const startMoment = moment();
    let finishMoment;
    try {
      statement =
        "select m0.sta_id as sta_id, " +
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
        "order by sta_id" +
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
      queryResult = matsDataQueryUtils.queryDBMapScalar(
        sitePool, // eslint-disable-line no-undef
        statement,
        model,
        statisticSelect,
        variableStr,
        varUnits,
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
      dLowest = queryResult.dataLowest;
      dLow = queryResult.dataLow;
      dModerate = queryResult.dataModerate;
      dHigh = queryResult.dataHigh;
      dHighest = queryResult.dataHighest;
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
        if (error.includes("Unknown column")) {
          throw new Error(
            `INFO:  The variable [${variableStr}] is not supported by the database for the model/sites [${model} and ${sitesList}].`
          );
        } else {
          throw new Error(error);
        }
      }
    }
  } else {
    // this is a difference curve -- not supported for maps
    throw new Error(
      "INFO:  Difference curves are not supported for maps, as there is only one curve."
    );
  }

  const postQueryStartMoment = moment();
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

  const postQueryFinishMoment = moment();
  dataRequests[`post data retrieval (query) process time - ${label}`] = {
    begin: postQueryStartMoment.format(),
    finish: postQueryFinishMoment.format(),
    duration: `${moment
      .duration(postQueryFinishMoment.diff(postQueryStartMoment))
      .asSeconds()} seconds`,
  };

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
