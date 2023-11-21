/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

/* global cbPool, Assets */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataDiffUtils,
  matsDataCurveOpsUtils,
  matsDataProcessUtils,
  matsPlotUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

// eslint-disable-next-line no-undef
dataContourDiff = function (plotParams, plotFunction) {
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
  let statisticSelect;

  let statement = "";
  let error = "";
  let dataset = [];

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  const xAxisParam = plotParams["x-axis-parameter"];
  const yAxisParam = plotParams["y-axis-parameter"];
  const xValClause = matsCollections.PlotParams.findOne({ name: "x-axis-parameter" })
    .optionsMap[xAxisParam];
  const yValClause = matsCollections.PlotParams.findOne({ name: "y-axis-parameter" })
    .optionsMap[yAxisParam];

  let allThresholds;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
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
          .indexOf(variable) !== -1
    )[0];
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];

    if (xAxisParam !== "Threshold" && yAxisParam !== "Threshold") {
      const thresholdStr = curve.threshold;
      if (thresholdStr === undefined) {
        throw new Error(
          `INFO:  ${label}'s threshold is undefined. Please assign it a value.`
        );
      }
      const threshold = Object.keys(
        matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
      ).find(
        (key) =>
          matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable][
            key
          ] === thresholdStr
      );
      allThresholds = [threshold.replace(/_/g, ".")];
    } else {
      // catalogue the thresholds now, we'll need to do a separate query for each
      allThresholds = Object.keys(
        matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
      )
        .map(function (x) {
          return x.replace(/_/g, ".");
        })
        .sort(function (a, b) {
          return Number(a) - Number(b);
        });
    }

    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    const forecastLength = curve["forecast-length"];

    statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;

    let queryTemplate;
    const regionType = curve["region-type"];
    if (regionType === "Select stations") {
      throw new Error(
        "INFO:  Single/multi station plotting is not available for contours."
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
    queryTemplate = Assets.getText("sqlTemplates/tmpl_Contour.sql");
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

    if (xAxisParam !== "Valid UTC hour" && yAxisParam !== "Valid UTC hour") {
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        queryTemplate = queryTemplate.replace(
          /{{vxVALID_TIMES}}/g,
          cbPool.trfmListToCSVString(validTimes, null, false)
        );
      } else {
        queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "{{vxVALID_TIMES}}");
      }
    } else {
      queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "{{vxVALID_TIMES}}");
    }

    if (xAxisParam !== "Fcst lead time" && yAxisParam !== "Fcst lead time") {
      if (forecastLength === undefined) {
        throw new Error(
          `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
        );
      }
      queryTemplate = queryTemplate.replace(/{{vxFCST_LEN}}/g, forecastLength);
    } else {
      queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "{{vxFCST_LEN}}");
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
    queryTemplate = queryTemplate.replace(/{{vxDATE_STRING}}/g, dateString);

    // For contours, this functions as the colorbar label.
    [statType] = statisticOptionsMap[variable][statisticSelect];
    [, curve.unitKey] = statisticOptionsMap[variable][statisticSelect];

    let d = {};
    let dTemp;
    if (!diffFrom) {
      for (
        let thresholdIndex = 0;
        thresholdIndex < allThresholds.length;
        thresholdIndex += 1
      ) {
        const threshold = allThresholds[thresholdIndex];
        const queryTemplateThreshold = queryTemplate.replace(
          /{{vxTHRESHOLD}}/g,
          threshold
        );

        let queryResult;
        const startMoment = moment();
        let finishMoment;
        try {
          statement = cbPool.trfmSQLForDbTarget(queryTemplateThreshold);

          // send the query statement to the query function
          queryResult = matsDataQueryUtils.queryDBContour(
            cbPool,
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
    const cOptions = matsDataCurveOpsUtils.generateContourCurveOptions(
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
  dataset = matsDataDiffUtils.getDataForDiffContour(
    dataset,
    appParams,
    showSignificance,
    plotParams.significance,
    statisticSelect,
    statType === "ctc",
    statType === "scalar"
  );
  const newPlotParams = plotParams;
  newPlotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
  curves = newPlotParams.curves;
  dataset[0].name = matsPlotUtils.getCurveText(
    matsTypes.PlotTypes.contourDiff,
    curves[0]
  );
  dataset[1] = matsDataCurveOpsUtils.getContourSignificanceLayer(dataset);

  // process the data returned by the query
  const curveInfoParams = { curve: curves, statType, axisMap };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataContour(
    dataset,
    curveInfoParams,
    newPlotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
