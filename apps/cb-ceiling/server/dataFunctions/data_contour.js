/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataCurveOpsUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";
import { _ } from "meteor/underscore";

// file reading is asynchonous
const fs = require("fs");

dataContour = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.contour,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };

  const totalProcessingStart = moment();
  const dataRequests = {}; // used to store data queries
  let dataFoundForAnyCurve = false;

  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  if (curves.length > 1) {
    throw new Error("INFO:  There must only be one added curve.");
  }

  const axisMap = Object.create(null);

  let statement = "";
  let error = "";
  const dataset = [];

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

  // initialize variables specific to this curve
  const curve = curves[0];
  const { label } = curve;
  const { diffFrom } = curve;

  const { variable } = curve;
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

  const statisticSelect = curve.statistic;
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
  queryTemplate = fs.readFileSync("assets/app/sqlTemplates/tmpl_Contour.sql", "utf8");
  queryTemplate = queryTemplate.replace(/{{vxMODEL}}/g, model);
  queryTemplate = queryTemplate.replace(/{{vxREGION}}/g, region);
  queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, fromSecs);
  queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, toSecs);
  queryTemplate = queryTemplate.replace(/{{vxVARIABLE}}/g, variable.toUpperCase());
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
  const statType = statisticOptionsMap[statisticSelect][0];
  [, curve.unitKey] = statisticOptionsMap[statisticSelect];

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
      } else {
        dataFoundForAnyCurve = true;
      }

      // consolidate data
      if (Object.keys(d).length === 0) {
        d = dTemp;
      } else {
        if (xAxisParam === "Threshold") {
          d.x.push(dTemp.x[0]);
          d.y = dTemp.y;
          for (let didx = 0; didx < dTemp.y.length; didx += 1) {
            d.z[didx].push(dTemp.z[didx][0]);
            d.n[didx].push(dTemp.n[didx][0]);
            if (statType === "ctc") {
              d.subHit[didx].push(dTemp.subHit[didx][0]);
              d.subFa[didx].push(dTemp.subFa[didx][0]);
              d.subMiss[didx].push(dTemp.subMiss[didx][0]);
              d.subCn[didx].push(dTemp.subCn[didx][0]);
            } else if (statType === "scalar") {
              d.subSquareDiffSum[didx].push(dTemp.subSquareDiffSum[didx][0]);
              d.subObsModelDiffSum[didx].push(dTemp.subObsModelDiffSum[didx][0]);
              d.subNSum[didx].push(dTemp.subNSum[didx][0]);
              d.subModelSum[didx].push(dTemp.subModelSum[didx][0]);
              d.subObsSum[didx].push(dTemp.subObsSum[didx][0]);
              d.subAbsSum[didx].push(dTemp.subAbsSum[didx][0]);
            }
            d.stdev[didx].push(dTemp.stdev[didx]);
            d.subSecs[didx].push(dTemp.subSecs[didx]);
          }
        } else if (yAxisParam === "Threshold") {
          d.x = dTemp.x;
          d.y.push(dTemp.y[0]);
          for (let didx = 0; didx < dTemp.y.length; didx += 1) {
            d.z.push(dTemp.z[didx]);
            d.n.push(dTemp.n[didx]);
            if (statType === "ctc") {
              d.subHit.push(dTemp.subHit[didx]);
              d.subFa.push(dTemp.subFa[didx]);
              d.subMiss.push(dTemp.subMiss[didx]);
              d.subCn.push(dTemp.subCn[didx]);
            } else if (statType === "scalar") {
              d.subSquareDiffSum.push(dTemp.subSquareDiffSum[didx]);
              d.subObsModelDiffSum.push(dTemp.subObsModelDiffSum[didx]);
              d.subNSum.push(dTemp.subNSum[didx]);
              d.subModelSum.push(dTemp.subModelSum[didx]);
              d.subObsSum.push(dTemp.subAbsSum[didx]);
            }
            d.stdev.push(dTemp.stdev[didx]);
            d.subSecs.push(dTemp.subSecs[didx]);
          }
        }
        d.xTextOutput = [...d.xTextOutput, ...dTemp.xTextOutput];
        d.yTextOutput = [...d.yTextOutput, ...dTemp.yTextOutput];
        d.zTextOutput = [...d.zTextOutput, ...dTemp.zTextOutput];
        d.nTextOutput = [...d.nTextOutput, ...dTemp.nTextOutput];
        d.hitTextOutput = [...d.hitTextOutput, ...dTemp.hitTextOutput];
        d.faTextOutput = [...d.faTextOutput, ...dTemp.faTextOutput];
        d.missTextOutput = [...d.missTextOutput, ...dTemp.missTextOutput];
        d.cnTextOutput = [...d.cnTextOutput, ...dTemp.cnTextOutput];
        d.squareDiffSumTextOutput = [
          ...d.squareDiffSumTextOutput,
          ...dTemp.squareDiffSumTextOutput,
        ];
        d.obsModelDiffSumTextOutput = [
          ...d.obsModelDiffSumTextOutput,
          ...dTemp.obsModelDiffSumTextOutput,
        ];
        d.NSumTextOutput = [...d.NSumTextOutput, ...dTemp.NSumTextOutput];
        d.modelSumTextOutput = [...d.modelSumTextOutput, ...dTemp.modelSumTextOutput];
        d.obsSumTextOutput = [...d.obsSumTextOutput, ...dTemp.obsSumTextOutput];
        d.absSumTextOutput = [...d.absSumTextOutput, ...dTemp.absSumTextOutput];
        d.glob_stats.minDate =
          d.glob_stats.minDate < dTemp.glob_stats.minDate
            ? d.glob_stats.minDate
            : dTemp.glob_stats.minDate;
        d.glob_stats.maxDate =
          d.glob_stats.maxDate > dTemp.glob_stats.maxDate
            ? d.glob_stats.maxDate
            : dTemp.glob_stats.maxDate;
        d.glob_stats.n += dTemp.glob_stats.n;
        d.xmin = d.xmin < dTemp.xmin ? d.xmin : dTemp.xmin;
        d.xmax = d.xmax > dTemp.xmax ? d.xmax : dTemp.xmax;
        d.ymin = d.ymin < dTemp.ymin ? d.ymin : dTemp.ymin;
        d.ymax = d.ymax > dTemp.ymax ? d.ymax : dTemp.ymax;
        d.zmin = d.zmin < dTemp.zmin ? d.zmin : dTemp.zmin;
        d.zmax = d.zmax > dTemp.zmax ? d.zmax : dTemp.zmax;
      }
    }
    d.glob_stats.mean = matsDataUtils.average(
      [].concat(...d.z).filter(function (n) {
        return n !== null;
      })
    );
  } else {
    // this is a difference curve -- not supported for performance diagrams
    throw new Error(
      "INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves."
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

  if (!dataFoundForAnyCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  // process the data returned by the query
  const curveInfoParams = { curve: curves, statType, axisMap };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataContour(
    dataset,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
