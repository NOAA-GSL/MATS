/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataDiffUtils,
  matsDataCurveOpsUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

dataThreshold = function (plotParams, plotFunction) {
  const fs = require("fs");
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.threshold,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };

  let queryTemplate = fs.readFileSync(
    "assets/app/sqlTemplates/tmpl_Threshold.sql",
    "utf8"
  );

  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  let error = "";
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const dataset = [];
  const utcCycleStarts = [];
  const axisMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;
  const idealValues = [];

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    const { label } = curve;
    const { variable } = curve;
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];
    queryTemplate = queryTemplate.replace(/vxMODEL/g, model);
    // catalogue the thresholds now, we'll need to do a separate query for each
    const allThresholdsStr = Object.keys(
      matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
    );
    for (let tidx = 0; tidx < allThresholdsStr.length; tidx++) {
      allThresholdsStr[tidx] = allThresholdsStr[tidx].replace(/_/g, ".");
    }
    const allThresholds = allThresholdsStr.sort(function (a, b) {
      return Number(a) - Number(b);
    });

    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      queryTemplate = queryTemplate.replace(
        /vxVALID_TIMES/g,
        cbPool.trfmListToCSVString(validTimes, null, false)
      );
    } else {
      queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "vxVALID_TIMES");
    }
    const forecastLength = curve["forecast-length"];
    queryTemplate = queryTemplate.replace(/vxFCST_LEN/g, forecastLength);
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    queryTemplate = queryTemplate.replace(/vxFROM_SECS/g, fromSecs);
    queryTemplate = queryTemplate.replace(/vxTO_SECS/g, toSecs);
    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;
    const regionType = curve["region-type"];
    if (regionType === "Select stations") {
      throw new Error(
        "INFO:  Single/multi station plotting is not available for thresholds."
      );
    }
    var regionStr = curve.region;
    const region = Object.keys(
      matsCollections.region.findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
    );
    queryTemplate = queryTemplate.replace(/vxREGION/g, region);
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    var statType = statisticOptionsMap[statisticSelect][0];
    const axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    const idealVal = statisticOptionsMap[statisticSelect][2];
    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    let d = {};
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      for (
        let thresholdIndex = 0;
        thresholdIndex < allThresholds.length;
        thresholdIndex++
      ) {
        const threshold = allThresholds[thresholdIndex];
        const queryTemplate_threshold = queryTemplate.replace(
          /vxTHRESHOLD/g,
          threshold
        );
        statement = cbPool.trfmSQLForDbTarget(queryTemplate_threshold);

        dataRequests[label] = statement;

        var queryResult;
        const startMoment = moment();
        var finishMoment;
        try {
          // send the query statement to the query function
          queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
            cbPool,
            statement,
            appParams,
            statisticSelect
          );
          finishMoment = moment();
          dataRequests[`data retrieval (query) time - ${label}`] = {
            begin: startMoment.format(),
            finish: finishMoment.format(),
            duration: `${moment
              .duration(finishMoment.diff(startMoment))
              .asSeconds()} seconds`,
            recordCount: queryResult.data.x.length,
          };
          // get the data back from the query
          var dTemp = queryResult.data;
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
        var postQueryStartMoment = moment();
        if (dataFoundForCurve) {
          xmin = xmin < dTemp.xmin ? xmin : dTemp.xmin;
          xmax = xmax > dTemp.xmax ? xmax : dTemp.xmax;
          ymin = ymin < dTemp.ymin ? ymin : dTemp.ymin;
          ymax = ymax > dTemp.ymax ? ymax : dTemp.ymax;
        }
        // consolidate data
        if (Object.keys(d).length === 0) {
          d = dTemp;
        } else {
          d.x.push(dTemp.x[0]);
          d.y.push(dTemp.y[0]);
          d.error_y.push(dTemp.error_y[0]);
          d.subHit.push(dTemp.subHit[0]);
          d.subFa.push(dTemp.subFa[0]);
          d.subMiss.push(dTemp.subMiss[0]);
          d.subCn.push(dTemp.subCn[0]);
          d.subVals.push(dTemp.subVals[0]);
          d.subSecs.push(dTemp.subSecs[0]);
          d.xmin = d.xmin < dTemp.xmin ? d.xmin : dTemp.xmin;
          d.xmax = d.xmax > dTemp.xmax ? d.xmax : dTemp.xmax;
          d.ymin = d.ymin < dTemp.ymin ? d.ymin : dTemp.ymin;
          d.ymax = d.ymax > dTemp.ymax ? d.ymax : dTemp.ymax;
          d.sum += dTemp.sum;
        }
      }
    } else {
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(
        dataset,
        diffFrom,
        appParams,
        statType === "ctc",
        statType === "scalar"
      );
      d = diffResult.dataset;
      xmin = xmin < d.xmin ? xmin : d.xmin;
      xmax = xmax > d.xmax ? xmax : d.xmax;
      ymin = ymin < d.ymin ? ymin : d.ymin;
      ymax = ymax > d.ymax ? ymax : d.ymax;
    }

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
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
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(
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
    statType,
    axisMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataXYCurve(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
