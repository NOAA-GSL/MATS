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
  matsMiddleXYCurve,
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
  let rows = "";
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
      [, [filterInfo.filterModelBy]] = filterModelVariableDetails;

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
      [, [, filterInfo.filterObsBy]] = filterObsVariableDetails;

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

    let queryTemplate;
    let sitesList;
    const regionType =
      filterModelBy === "None" && // not filtering the model by anything
      filterObsBy === "None" && // not filtering the obs by anything
      !(
        // not a thresholded variable that we're forcing into a scalar stat
        (
          variableValuesMap[queryVariable][1] &&
          statisticOptionsMap[variable][statisticSelect][0] === "scalar"
        )
      )
        ? curve["region-type"]
        : "Select stations";
    if (curve["region-type"] === "Predefined region") {
      // either a true predefined region or a station plot masquerading
      // as a predefined region that we will have to do filtering on.
      // the regionType constant defined above knows which on.
      const regionStr = curve.region;
      const regionValues = (
        await matsCollections.region.findOneAsync({ name: "region" })
      ).valuesMap;
      const region = Object.keys(regionValues).find(
        (key) => regionValues[key] === regionStr
      );

      if (regionType === "Predefined region") {
        // Predefined region, no filtering.
        let statTemplate;
        queryTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_xyCurve.sql");
        queryTemplate = queryTemplate.replace(/{{vxMODEL}}/g, model);
        queryTemplate = queryTemplate.replace(/{{vxREGION}}/g, region);
        queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, fromSecs);
        queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, toSecs);
        queryTemplate = queryTemplate.replace(/{{vxTIME_VAR}}/g, "m0.fcstValidEpoch");
        queryTemplate = queryTemplate.replace(
          /{{vxVARIABLE}}/g,
          queryVariable.toUpperCase()
        );
        queryTemplate = queryTemplate.replace(/{{vxFCST_LEN}}/g, forecastLength);
        queryTemplate = queryTemplate.replace(/{{vxBIN_CLAUSE}}/g, "m0.fcstValidEpoch");
        queryTemplate = queryTemplate.replace(/{{vxBIN_PARAM}}/g, "avtime");
        if (statType === "ctc") {
          statTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_CTC.sql");
          queryTemplate = queryTemplate.replace(/{{vxSTATISTIC}}/g, statTemplate);
          queryTemplate = queryTemplate.replace(/{{vxTHRESHOLD}}/g, threshold);
          queryTemplate = queryTemplate.replace(/{{vxTYPE}}/g, "CTC");
        } else {
          statTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_PartialSums.sql");
          queryTemplate = queryTemplate.replace(/{{vxSTATISTIC}}/g, statTemplate);
          queryTemplate = queryTemplate.replace(
            /{{vxSUBVARIABLE}}/g,
            variableDetails[0]
          );
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
        // histogram plots by definition don't filter the available UTC start times
        queryTemplate = global.cbPool.trfmSQLRemoveClause(
          queryTemplate,
          "{{vxUTC_CYCLE_START}}"
        );
      } else {
        // Predefined region, with filtering. Treat like station plot.
        sitesList = await matsDataQueryUtils.getStationsInCouchbaseRegion(
          global.cbPool,
          region
        );
      }
    } else {
      // Station plot, with or without filtering
      sitesList = curve.sites === undefined ? [] : curve.sites;
      if (sitesList.length === 0 || sitesList === matsTypes.InputTypes.unused) {
        throw new Error(
          "INFO:  Please add sites in order to get a single/multi station plot."
        );
      }
    }
    const elevMap = (
      await matsCollections.StationMap.findOneAsync({
        name: "elevations",
      })
    ).optionsMap;

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
        if (regionType === "Predefined region") {
          statement = global.cbPool.trfmSQLForDbTarget(queryTemplate);
        } else {
          // send to matsMiddle
          statement = "Station plot -- no one query.";
          const mdw = new matsMiddleXYCurve.MatsMiddleXYCurve(global.cbPool);
          rows = await mdw.processStationQuery(
            "Valid Date",
            statType,
            variableDetails[1],
            sitesList,
            model,
            forecastLength,
            threshold,
            undefined,
            undefined,
            fromSecs,
            toSecs,
            validTimes,
            undefined,
            undefined,
            filterInfo,
            elevMap
          );
        }

        // send the query statement to the query function
        queryResult = await matsDataQueryUtils.queryDBSpecialtyCurve(
          global.cbPool,
          regionType === "Predefined region" ? statement : rows,
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
