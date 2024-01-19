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
    (qv) => Object.keys(variableValuesMap[qv][0]).indexOf(variable) !== -1
  )[0];
  const variableDetails = variableValuesMap[queryVariable][0][variable];
  const model = matsCollections["data-source"].findOne({ name: "data-source" })
    .optionsMap[variable][curve["data-source"]][0];

  const thresholdStr = curve.threshold;
  let threshold = "";
  if (variableValuesMap[queryVariable][1]) {
    threshold = Object.keys(
      matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
    ).find(
      (key) =>
        matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable][
          key
        ] === thresholdStr
    );
    threshold = threshold.replace(/_/g, ".");
  }

  const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
  const forecastLength = curve["forecast-length"];

  const statisticSelect = curve.statistic;
  const statisticOptionsMap = matsCollections.statistic.findOne(
    { name: "statistic" },
    { optionsMap: 1 }
  ).optionsMap;
  const statType = statisticOptionsMap[variable][statisticSelect][0];
  const varUnits =
    statisticOptionsMap[variable][statisticSelect][1] === "Unknown"
      ? variableDetails[2]
      : statisticOptionsMap[variable][statisticSelect][1];

  const filterModelBy = curve["filter-model-by"];
  const filterObsBy = curve["filter-obs-by"];
  const filterInfo = {};

  if (filterModelBy !== "None") {
    // get the variable text that we'll query off of
    const filterModelVariable = Object.keys(variableValuesMap).filter(
      (fv) => Object.keys(variableValuesMap[fv][0]).indexOf(filterModelBy) !== -1
    )[0];
    const filterModelVariableDetails =
      variableValuesMap[filterModelVariable][0][filterModelBy];
    [, filterInfo.filterModelBy] = filterModelVariableDetails;

    // get the bounds and make sure they're in the right units
    let filterModelMin = Number(curve["filter-model-min"]);
    let filterModelMax = Number(curve["filter-model-max"]);
    if (
      filterModelBy.toLowerCase().includes("temperature") ||
      filterModelBy.toLowerCase().includes("dewpoint")
    ) {
      // convert temperature and dewpoint bounds from Celsius
      // to Fahrenheit, which is in the database
      filterModelMin = filterModelMin * 1.8 + 32;
      filterModelMax = filterModelMax * 1.8 + 32;
    } else if (
      filterModelBy.toLowerCase().includes("wind") &&
      filterModelBy.toLowerCase().includes("speed")
    ) {
      // convert wind speed bounds from m/s
      // to mph, which is in the database.
      // Note that the u- and v- components are stored in m/s
      filterModelMin *= 2.23693629;
      filterModelMax *= 2.23693629;
    }
    filterInfo.filterModelMin = filterModelMin;
    filterInfo.filterModelMax = filterModelMax;
  }

  if (filterObsBy !== "None") {
    // get the variable text that we'll query off of
    const filterObsVariable = Object.keys(variableValuesMap).filter(
      (fv) => Object.keys(variableValuesMap[fv][0]).indexOf(filterObsBy) !== -1
    )[0];
    const filterObsVariableDetails =
      variableValuesMap[filterObsVariable][0][filterObsBy];
    [, filterInfo.filterObsBy] = filterObsVariableDetails;

    // get the bounds and make sure they're in the right units
    let filterObsMin = Number(curve["filter-obs-min"]);
    let filterObsMax = Number(curve["filter-obs-max"]);
    if (
      filterObsBy.toLowerCase().includes("temperature") ||
      filterObsBy.toLowerCase().includes("dewpoint")
    ) {
      // convert temperature and dewpoint bounds from Celsius
      // to Fahrenheit, which is in the database
      filterObsMin = filterObsMin * 1.8 + 32;
      filterObsMax = filterObsMax * 1.8 + 32;
    } else if (
      filterObsBy.toLowerCase().includes("wind") &&
      filterObsBy.toLowerCase().includes("speed")
    ) {
      // convert wind speed bounds from m/s
      // to mph, which is in the database.
      // Note that the u- and v- components are stored in m/s
      filterObsMin *= 2.23693629;
      filterObsMax *= 2.23693629;
    }
    filterInfo.filterObsMin = filterObsMin;
    filterInfo.filterObsMax = filterObsMax;
  }

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
      // send to matsMiddle
      statement = "Station plot -- no one query.";
      const tss = new matsMiddleMap.MatsMiddleMap(cbPool);
      rows = tss.processStationQuery(
        statType,
        variableDetails[1],
        sitesList,
        model,
        forecastLength,
        threshold,
        fromSecs,
        toSecs,
        validTimes,
        filterInfo
      );

      // send the query statement to the query function
      if (statType === "ctc") {
        queryResult = matsDataQueryUtils.queryDBMapCTC(
          cbPool,
          rows,
          model,
          statisticSelect,
          siteMap,
          appParams
        );
      } else {
        queryResult = matsDataQueryUtils.queryDBMapScalar(
          cbPool,
          rows,
          model,
          statisticSelect,
          variable,
          varUnits,
          siteMap,
          appParams
        );
      }

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
      if (statType === "ctc") {
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
      } else {
        dLowest = queryResult.dataLowest;
        dLow = queryResult.dataLow;
        dModerate = queryResult.dataModerate;
        dHigh = queryResult.dataHigh;
        dHighest = queryResult.dataHighest;
      }
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
  if (statType === "ctc") {
    let cOptions = matsDataCurveOpsUtils.generateCTCMapCurveOptions(
      curve,
      d,
      appParams
    ); // generate map with site data
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCPurpleCurveText,
      `Values <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.1
      ).toPrecision(3)}`,
      dPurple
    ); // generate purple text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCPurpleBlueCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.1
      ).toPrecision(3)} and <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.2
      ).toPrecision(3)}`,
      dPurpleBlue
    ); // generate purple-blue text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCBlueCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.2
      ).toPrecision(3)} and <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.3
      ).toPrecision(3)}`,
      dBlue
    ); // generate blue text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCBlueGreenCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.3
      ).toPrecision(3)} and <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.4
      ).toPrecision(3)}`,
      dBlueGreen
    ); // generate blue-green text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCGreenCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.4
      ).toPrecision(3)} and <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.5
      ).toPrecision(3)}`,
      dGreen
    ); // generate green text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCGreenYellowCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.5
      ).toPrecision(3)} and <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.6
      ).toPrecision(3)}`,
      dGreenYellow
    ); // generate green-yellow text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCYellowCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.6
      ).toPrecision(3)} and <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.7
      ).toPrecision(3)}`,
      dYellow
    ); // generate yellow text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCOrangeCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.7
      ).toPrecision(3)} and <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.8
      ).toPrecision(3)}`,
      dOrange
    ); // generate orange text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCOrangeRedCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.8
      ).toPrecision(3)} and <= ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.9
      ).toPrecision(3)}`,
      dOrangeRed
    ); // generate orange-red text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
      matsTypes.ReservedWords.CTCRedCurveText,
      `Values > ${(
        valueLimits.lowLimit +
        (valueLimits.highLimit - valueLimits.lowLimit) * 0.9
      ).toPrecision(3)}`,
      dRed
    ); // generate red text layer
    dataset.push(cOptions);
  } else {
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
  }

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
