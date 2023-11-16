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
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;

    let queryTemplate;
    const regionType = curve["region-type"];
    if (regionType === "Select stations") {
      throw new Error(
        "INFO:  Single/multi station plotting is not available for histograms."
      );
    }
    const regionStr = curve.region;
    const region = Object.keys(
      matsCollections.region.findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
    );

    // SQL template replacements
    // eslint-disable-next-line no-undef
    queryTemplate = Assets.getText("sqlTemplates/tmpl_Histogram.sql");
    queryTemplate = queryTemplate.replace(/{{vxMODEL}}/g, model);
    queryTemplate = queryTemplate.replace(/{{vxREGION}}/g, region);
    queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, fromSecs);
    queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, toSecs);
    queryTemplate = queryTemplate.replace(
      /{{vxVARIABLE}}/g,
      queryVariable.toUpperCase()
    );
    queryTemplate = queryTemplate.replace(/{{vxTHRESHOLD}}/g, threshold);
    queryTemplate = queryTemplate.replace(/{{vxFCST_LEN}}/g, forecastLength);

    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      queryTemplate = queryTemplate.replace(
        /{{vxVALID_TIMES}}/g,
        cbPool.trfmListToCSVString(validTimes, null, false) // eslint-disable-line no-undef
      );
    } else {
      queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "{{vxVALID_TIMES}}"); // eslint-disable-line no-undef
    }

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    [statType] = statisticOptionsMap[variable][statisticSelect];
    [, varUnits] = statisticOptionsMap[variable][statisticSelect];
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
        // eslint-disable-next-line no-undef
        statement = cbPool.trfmSQLForDbTarget(queryTemplate);

        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
          cbPool, // eslint-disable-line no-undef
          statement,
          appParams,
          statisticSelect
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
