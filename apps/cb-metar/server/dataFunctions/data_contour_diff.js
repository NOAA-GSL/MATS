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
  matsMiddleContour,
  matsPlotUtils,
} from "meteor/randyp:mats-common";
import moment from "moment";

/* eslint-disable no-await-in-loop */

global.dataContourDiff = async function (plotParams) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.contourDiff,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };

  const totalProcessingStart = moment();
  const dataRequests = {}; // used to store data queries
  let dataNotFoundForAnyCurve = false;

  let curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  if (curvesLength !== 2) {
    throw new Error("INFO:  There must be two added curves.");
  }

  const axisMap = Object.create(null);
  const showSignificance = plotParams.significance !== "none";

  let statType;
  const allStatTypes = [];
  const allStatistics = [];

  let statement = "";
  let rows = "";
  let error = "";
  let dataset = [];

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  const xAxisParam = plotParams["x-axis-parameter"];
  const yAxisParam = plotParams["y-axis-parameter"];
  const xValClause = (
    await matsCollections.PlotParams.findOneAsync({
      name: "x-axis-parameter",
    })
  ).optionsMap[xAxisParam];
  const yValClause = (
    await matsCollections.PlotParams.findOneAsync({
      name: "y-axis-parameter",
    })
  ).optionsMap[yAxisParam];

  let allThresholds;

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

    let threshold = "";
    if (
      xAxisParam !== "Threshold" &&
      yAxisParam !== "Threshold" &&
      variableValuesMap[queryVariable][1]
    ) {
      // threshold is not an axis param and this is a CTC app
      // so find which threshold was selected
      const thresholdStr = curve.threshold;
      if (thresholdStr === undefined) {
        throw new Error(
          `INFO:  ${label}'s threshold is undefined. Please assign it a value.`
        );
      }
      const thresholdValues = (
        await matsCollections.threshold.findOneAsync({ name: "threshold" })
      ).valuesMap[variable];
      threshold = Object.keys(thresholdValues).find(
        (key) => thresholdValues[key] === thresholdStr
      );
      threshold = threshold.replace(/_/g, ".");
      allThresholds = [threshold];
    } else if (variableValuesMap[queryVariable][1]) {
      // threshold is an axis param and this is a CTC app
      // so catalogue the thresholds now, we'll need to do a separate query for each
      allThresholds = Object.keys(
        (await matsCollections.threshold.findOneAsync({ name: "threshold" })).valuesMap[
          variable
        ]
      )
        .map(function (x) {
          return x.replace(/_/g, ".");
        })
        .sort(function (a, b) {
          return Number(a) - Number(b);
        });
    } else if (xAxisParam === "Threshold" || yAxisParam === "Threshold") {
      // threshold is an axis param and this is a scalar app
      // so throw an error, that's not doable
      throw new Error(
        "INFO: Using threshold as an axis parameter doesn't work with this variable. Try ceiling or visibility?"
      );
    } else {
      // threshold is not an axis param and this is a scalar app
      // so create a dummy threshold for the loop later
      allThresholds = ["All Data"];
    }

    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    const forecastLength = curve["forecast-length"];

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
        queryTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_Contour.sql");
        queryTemplate = queryTemplate.replace(/{{vxMODEL}}/g, model);
        queryTemplate = queryTemplate.replace(/{{vxREGION}}/g, region);
        queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, fromSecs);
        queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, toSecs);
        queryTemplate = queryTemplate.replace(
          /{{vxVARIABLE}}/g,
          queryVariable.toUpperCase()
        );
        queryTemplate = queryTemplate.replace(/{{vxXVAL_CLAUSE}}/g, xValClause);
        queryTemplate = queryTemplate.replace(/{{vxYVAL_CLAUSE}}/g, yValClause);
        if (statType === "ctc") {
          statTemplate = await Assets.getTextAsync("sqlTemplates/tmpl_CTC.sql");
          queryTemplate = queryTemplate.replace(/{{vxSTATISTIC}}/g, statTemplate);
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
        if (xAxisParam !== "Fcst lead time" && yAxisParam !== "Fcst lead time") {
          if (forecastLength === undefined) {
            throw new Error(
              `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
            );
          }
          queryTemplate = queryTemplate.replace(/{{vxFCST_LEN}}/g, forecastLength);
        } else {
          queryTemplate = global.cbPool.trfmSQLRemoveClause(
            queryTemplate,
            "{{vxFCST_LEN}}"
          );
        }

        let dateString = "";
        if (
          (xAxisParam === "Init Date" || yAxisParam === "Init Date") &&
          xAxisParam !== "Valid Date" &&
          yAxisParam !== "Valid Date"
        ) {
          dateString = "m0.fcstValidEpoch-m0.fcstLen*3600";
        } else {
          dateString = "m0.fcstValidEpoch";
        }
        queryTemplate = queryTemplate.replace(/{{vxTIME_VAR}}/g, dateString);
        if (
          xAxisParam !== "Valid UTC hour" &&
          yAxisParam !== "Valid UTC hour" &&
          validTimes.length !== 0 &&
          validTimes !== matsTypes.InputTypes.unused
        ) {
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
        // contour plots by definition don't filter the available UTC start times
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

    // For contours, this functions as the colorbar label.
    curve.unitKey =
      statisticOptionsMap[variable][statisticSelect][1] === "Unknown"
        ? variableDetails[2]
        : statisticOptionsMap[variable][statisticSelect][1];
    if (statType === "ctc") {
      allStatistics.push(statisticSelect);
    } else {
      allStatistics.push(`${statisticSelect}_${variable}`);
    }

    let d = {};
    let dTemp;
    if (!diffFrom) {
      for (
        let thresholdIndex = 0;
        thresholdIndex < allThresholds.length;
        thresholdIndex += 1
      ) {
        threshold = allThresholds[thresholdIndex];
        let queryTemplateThreshold;
        if (regionType === "Predefined region") {
          queryTemplateThreshold = queryTemplate.replace(/{{vxTHRESHOLD}}/g, threshold);
        }

        let queryResult;
        const startMoment = moment();
        let finishMoment;
        try {
          if (regionType === "Predefined region") {
            statement = global.cbPool.trfmSQLForDbTarget(queryTemplateThreshold);
          } else {
            // send to matsMiddle
            statement = "Station plot -- no one query.";
            const mdw = new matsMiddleContour.MatsMiddleContour(global.cbPool);
            rows = await mdw.processStationQuery(
              xAxisParam,
              yAxisParam,
              statType,
              variableDetails[1],
              sitesList,
              model,
              forecastLength,
              threshold,
              undefined,
              fromSecs,
              toSecs,
              validTimes,
              undefined,
              filterInfo,
              elevMap
            );
          }

          // send the query statement to the query function
          queryResult = await matsDataQueryUtils.queryDBContour(
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
            recordCount: queryResult.data.xTextOutput.length,
          };
          // get the data back from the query
          dTemp = queryResult.data;
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
          dataNotFoundForAnyCurve = true;
        }

        // consolidate data
        d = matsDataUtils.consolidateContour(
          d,
          dTemp,
          statType,
          xAxisParam,
          yAxisParam
        );
      }
      d.glob_stats.mean = matsDataUtils.average(
        [].concat(...d.z).filter(function (n) {
          return n !== null;
        })
      );
    } else {
      // this is a difference curve -- not supported for contours
      throw new Error(
        "INFO:  Difference curves are not supported for contours, as there is only one curve."
      );
    }

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
    const postQueryStartMoment = moment();
    const { mean } = d.glob_stats;
    const annotation =
      mean === undefined
        ? `${label}- mean = NoData`
        : `${label}- mean = ${mean.toPrecision(4)}`;
    curve.annotation = annotation;
    curve.xmin = d.xmin;
    curve.xmax = d.xmax;
    curve.ymin = d.ymin;
    curve.ymax = d.ymax;
    curve.zmin = d.zmin;
    curve.zmax = d.zmax;
    curve.xAxisKey = xAxisParam;
    curve.yAxisKey = yAxisParam;
    const cOptions = await matsDataCurveOpsUtils.generateContourCurveOptions(
      curve,
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

  if (dataNotFoundForAnyCurve) {
    // we found no data for at least one curve so don't bother proceeding
    throw new Error(
      "INFO:  No valid data for at least one curve. Try making individual contour plots to determine which one."
    );
  }

  // turn the two contours into one difference contour
  dataset = await matsDataDiffUtils.getDataForDiffContour(
    dataset,
    appParams,
    showSignificance,
    plotParams.significance,
    allStatistics,
    allStatTypes
  );
  const newPlotParams = plotParams;
  newPlotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
  curves = newPlotParams.curves;
  dataset[0].name = await matsPlotUtils.getCurveText(
    matsTypes.PlotTypes.contourDiff,
    curves[0]
  );
  dataset[1] = matsDataCurveOpsUtils.getContourSignificanceLayer(dataset);

  // process the data returned by the query
  const curveInfoParams = { curve: curves, statType: allStatTypes, axisMap };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = await matsDataProcessUtils.processDataContour(
    dataset,
    curveInfoParams,
    newPlotParams,
    bookkeepingParams
  );
  return result;
};
