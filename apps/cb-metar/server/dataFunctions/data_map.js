/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

/* global cbPool */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataCurveOpsUtils,
  matsDataPlotOpsUtils,
  matsMiddleMap,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

// eslint-disable-next-line no-undef
dataMap = function (plotParams, plotFunction) {
  // initialize variables common to all curves
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
  let rows = "";
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
  const variableValuesMap = matsCollections.variable.findOne({
    name: "variable",
  }).valuesMap;
  const queryVariable = Object.keys(variableValuesMap).filter(
    (qv) =>
      variableValuesMap[qv][0]
        .map(function (v) {
          return Object.keys(v)[0];
        })
        .indexOf(variable) === 0
  )[0];
  const model = matsCollections["data-source"].findOne({ name: "data-source" })
    .optionsMap[variable][curve["data-source"]][0];

  const thresholdStr = curve.threshold;
  let threshold = Object.keys(
    matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
  ).find(
    (key) =>
      matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable][
        key
      ] === thresholdStr
  );
  threshold = threshold.replace(/_/g, ".");

  const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
  const forecastLength = curve["forecast-length"];

  const statisticSelect = curve.statistic;

  const sitesList = curve.sites === undefined ? [] : curve.sites;
  if (sitesList.length === 0 && sitesList === matsTypes.InputTypes.unused) {
    throw new Error(
      "INFO:  Please add sites in order to get a single/multi station plot."
    );
  }
  const siteMap = matsCollections.StationMap.findOne(
    { name: "stations" },
    { optionsMap: 1 }
  ).optionsMap;

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
      // send to matsMiddle
      statement = "Station plot -- no one query.";
      const tss = new matsMiddleMap.MatsMiddleMap(cbPool);
      rows = tss.processStationQuery(
        queryVariable,
        sitesList,
        model,
        forecastLength,
        threshold,
        fromSecs,
        toSecs,
        validTimes
      );

      // send the query statement to the query function
      queryResult = matsDataQueryUtils.queryDBMapCTC(
        cbPool,
        rows,
        model,
        statisticSelect,
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