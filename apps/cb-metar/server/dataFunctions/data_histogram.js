/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

/* global Assets */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import moment from "moment";

/* eslint-disable no-await-in-loop */

global.dataHistogram = async function (plotParams) {
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
  const allStatTypes = [];
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

    const { variable } = curve;
    const variableValuesMap = (
      await matsCollections.variable.findOneAsync({
        name: "variable",
      })
    ).valuesMap;
    const queryVariable = Object.keys(variableValuesMap).filter(
      (qv) => Object.keys(variableValuesMap[qv][0]).indexOf(variable) !== -1
    )[0];
    const variableDetails = variableValuesMap[queryVariable][0][variable];
    const model = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).optionsMap[variable][curve["data-source"]][0];

    const thresholdStr = curve.threshold;
    let threshold = "";
    if (variableValuesMap[queryVariable][1]) {
      const thresholdValues = (
        await matsCollections.threshold.findOneAsync({ name: "threshold" })
      ).valuesMap[variable];
      threshold = Object.keys(thresholdValues).find(
        (key) => thresholdValues[key] === thresholdStr
      );
      threshold = threshold.replace(/_/g, ".");
    }

    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    const forecastLength = curve["forecast-length"];
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap;
    [statType] = statisticOptionsMap[variable][statisticSelect];
    allStatTypes.push(statType);

    let queryTemplate;
    const regionType = curve["region-type"];
    if (regionType === "Select stations") {
      throw new Error(
        "INFO:  Single/multi station plotting is not available for histograms."
      );
    }
    const regionStr = curve.region;
    const regionValues = (await matsCollections.region.findOneAsync({ name: "region" }))
      .valuesMap;
    const region = Object.keys(regionValues).find(
      (key) => regionValues[key] === regionStr
    );

    // SQL template replacements
    let statTemplate;
    queryTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_Histogram.sql");
    queryTemplate = queryTemplate.replace(/{{vxMODEL}}/g, model);
    queryTemplate = queryTemplate.replace(/{{vxREGION}}/g, region);
    queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, fromSecs);
    queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, toSecs);
    queryTemplate = queryTemplate.replace(
      /{{vxVARIABLE}}/g,
      queryVariable.toUpperCase()
    );
    queryTemplate = queryTemplate.replace(/{{vxFCST_LEN}}/g, forecastLength);
    if (statType === "ctc") {
      statTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_CTC.sql");
      queryTemplate = queryTemplate.replace(/{{vxSTATISTIC}}/g, statTemplate);
      queryTemplate = queryTemplate.replace(/{{vxTHRESHOLD}}/g, threshold);
      queryTemplate = queryTemplate.replace(/{{vxTYPE}}/g, "CTC");
    } else {
      statTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_PartialSums.sql");
      queryTemplate = queryTemplate.replace(/{{vxSTATISTIC}}/g, statTemplate);
      queryTemplate = queryTemplate.replace(/{{vxSUBVARIABLE}}/g, variableDetails[0]);
      queryTemplate = queryTemplate.replace(/{{vxTYPE}}/g, "SUMS");
    }

    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      queryTemplate = queryTemplate.replace(
        /{{vxVALID_TIMES}}/g,
        global.cbPool.trfmListToCSVString(validTimes, null, false)
      );
    } else {
      queryTemplate = global.cbPool.trfmSQLRemoveClause(
        queryTemplate,
        "{{vxVALID_TIMES}}"
      );
    }

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    [, varUnits] =
      statisticOptionsMap[variable][statisticSelect][1] === "Unknown"
        ? variableDetails[2]
        : statisticOptionsMap[variable][statisticSelect][1];
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
        statement = global.cbPool.trfmSQLForDbTarget(queryTemplate);

        // send the query statement to the query function
        queryResult = await matsDataQueryUtils.queryDBSpecialtyCurve(
          global.cbPool,
          statement,
          appParams,
          statType === "ctc" ? statisticSelect : `${statisticSelect}_${variable}`
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
          throw new Error(error);
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
    statType: allStatTypes,
    axisMap,
    yAxisFormat,
    varUnits,
  };
  const bookkeepingParams = {
    alreadyMatched,
    dataRequests,
    totalProcessingStart,
  };
  const result = await matsDataProcessUtils.processDataHistogram(
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
  return result;
};
