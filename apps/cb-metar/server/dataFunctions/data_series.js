/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

/* global Assets */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataDiffUtils,
  matsDataCurveOpsUtils,
  matsDataProcessUtils,
  matsMiddleTimeSeries,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

/* eslint-disable no-await-in-loop */

global.dataSeries = async function (plotParams) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.timeSeries,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };

  const totalProcessingStart = moment();
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;

  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;

  const axisMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;

  let statType;
  const allStatTypes = [];
  const utcCycleStarts = [];
  const idealValues = [];

  let statement = "";
  let rows = "";
  let error = "";
  const dataset = [];

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
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
    let forecastLength = curve["forecast-length"];

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap;
    [statType] = statisticOptionsMap[variable][statisticSelect];
    allStatTypes.push(statType);

    const averageStr = curve.average;
    const averageOptionsMap = (
      await matsCollections.average.findOneAsync({ name: "average" })
    ).optionsMap;
    const average = averageOptionsMap[averageStr][0];

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

    let queryTemplate;
    let sitesList;
    const regionType =
      filterModelBy === "None" && filterObsBy === "None"
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
        queryTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_TimeSeries.sql");
        queryTemplate = queryTemplate.replace(/{{vxMODEL}}/g, model);
        queryTemplate = queryTemplate.replace(/{{vxREGION}}/g, region);
        queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, fromSecs);
        queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, toSecs);
        queryTemplate = queryTemplate.replace(
          /{{vxVARIABLE}}/g,
          queryVariable.toUpperCase()
        );
        queryTemplate = queryTemplate.replace(/{{vxFCST_LEN}}/g, forecastLength);
        queryTemplate = queryTemplate.replace(/{{vxAVERAGE}}/g, average);
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

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    const axisKey =
      statisticOptionsMap[variable][statisticSelect][1] === "Unknown"
        ? variableDetails[2]
        : statisticOptionsMap[variable][statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    const idealVal = statisticOptionsMap[variable][statisticSelect][2];
    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        // math is done on forecastLength later on -- set all analyses to 0
        if (forecastLength === "-99") {
          forecastLength = "0";
        }

        if (regionType === "Predefined region") {
          statement = global.cbPool.trfmSQLForDbTarget(queryTemplate);
        } else {
          // send to matsMiddle
          statement = "Station plot -- no one query.";
          const tss = new matsMiddleTimeSeries.MatsMiddleTimeSeries(global.cbPool);
          rows = await tss.processStationQuery(
            statType,
            variableDetails[1],
            sitesList,
            model,
            forecastLength,
            threshold,
            average,
            fromSecs,
            toSecs,
            validTimes,
            filterInfo
          );
        }

        // send the query statement to the query function
        queryResult = await matsDataQueryUtils.queryDBTimeSeries(
          global.cbPool,
          regionType === "Predefined region" ? statement : rows,
          model,
          forecastLength,
          fromSecs,
          toSecs,
          averageStr,
          statType === "ctc" ? statisticSelect : `${statisticSelect}_${variable}`,
          validTimes,
          appParams,
          false
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
      } else {
        dataFoundForAnyCurve = true;
      }

      // set axis limits based on returned data
      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(
        dataset,
        diffFrom,
        appParams,
        allStatTypes
      );
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
    }

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
    const postQueryStartMoment = moment();
    const mean = d.sum / d.x.length;
    const annotation =
      mean === undefined
        ? `${label}- mean = NoData`
        : `${label}- mean = ${mean.toPrecision(4)}`;
    curve.annotation = annotation;
    curve.xmin = d.xmin;
    curve.xmax = d.xmax;
    curve.ymin = d.ymin;
    curve.ymax = d.ymax;
    curve.axisKey = axisKey;
    const cOptions = await matsDataCurveOpsUtils.generateSeriesCurveOptions(
      curve,
      curveIndex,
      axisMap,
      d,
      appParams
    ); // generate plot with data, curve annotation, axis labels, etc.
    dataset.push(cOptions);
    const postQueryFinishMoment = moment();
    dataRequests[`post data retrieval (query) process time - ${label}`] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration: `${moment
        .duration(postQueryFinishMoment.diff(postQueryStartMoment))
        .asSeconds()} seconds`,
    };
  } // end for curves

  if (!dataFoundForAnyCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves,
    curvesLength,
    idealValues,
    utcCycleStarts,
    statType: allStatTypes,
    axisMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = await matsDataProcessUtils.processDataXYCurve(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  return result;
};
