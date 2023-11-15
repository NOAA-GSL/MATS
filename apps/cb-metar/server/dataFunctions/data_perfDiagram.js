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

// eslint-disable-next-line no-undef
dataPerformanceDiagram = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.performanceDiagram,
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

  let statement = "";
  let error = "";
  const dataset = [];

  let allThresholds;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;

    const binParam = curve["bin-parameter"];
    const binClause = matsCollections["bin-parameter"].findOne({
      name: "bin-parameter",
    }).optionsMap[binParam];

    const { variable } = curve;
    const variableValuesMap = matsCollections.variable.findOne({
      name: "variable",
    }).valuesMap;
    const queryVariable = Object.keys(variableValuesMap).filter(
      (qv) => variableValuesMap[qv][0].indexOf(variable) === 0
    )[0];
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];

    if (binParam !== "Threshold") {
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
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;

    const statisticSelect = "PerformanceDiagram";

    let queryTemplate;
    const regionType = curve["region-type"];
    if (regionType === "Select stations") {
      throw new Error(
        "INFO:  Single/multi station plotting is not available for performance diagrams."
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
    queryTemplate = Assets.getText("sqlTemplates/tmpl_PerformanceDiagram.sql");
    queryTemplate = queryTemplate.replace(/{{vxMODEL}}/g, model);
    queryTemplate = queryTemplate.replace(/{{vxREGION}}/g, region);
    queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, fromSecs);
    queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, toSecs);
    queryTemplate = queryTemplate.replace(
      /{{vxVARIABLE}}/g,
      queryVariable.toUpperCase()
    );
    queryTemplate = queryTemplate.replace(/{{vxBIN_CLAUSE}}/g, binClause);

    if (binParam !== "Valid UTC hour") {
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        queryTemplate = queryTemplate.replace(
          /{{vxVALID_TIMES}}/g,
          cbPool.trfmListToCSVString(validTimes, null, false) // eslint-disable-line no-undef
        );
      } else {
        queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "{{vxVALID_TIMES}}"); // eslint-disable-line no-undef
      }
    } else {
      queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "{{vxVALID_TIMES}}"); // eslint-disable-line no-undef
    }

    if (binParam !== "Fcst lead time") {
      if (forecastLength === undefined) {
        throw new Error(
          `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
        );
      }
      queryTemplate = queryTemplate.replace(/{{vxFCST_LEN}}/g, forecastLength);
    } else {
      queryTemplate = cbPool.trfmSQLRemoveClause(queryTemplate, "{{vxFCST_LEN}}"); // eslint-disable-line no-undef
    }

    let dateString = "";
    if (binParam === "Init Date") {
      dateString = "m0.fcstValidEpoch-m0.fcstLen*3600";
    } else {
      dateString = "m0.fcstValidEpoch";
    }
    queryTemplate = queryTemplate.replace(/{{vxDATE_STRING}}/g, dateString);

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable + statistic (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    statType = "ctc";
    curves[curveIndex].axisKey = statisticSelect; // stash the axisKey to use it later for axis options

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
          // eslint-disable-next-line no-undef
          statement = cbPool.trfmSQLForDbTarget(queryTemplateThreshold);

          // send the query statement to the query function
          queryResult = matsDataQueryUtils.queryDBPerformanceDiagram(
            cbPool, // eslint-disable-line no-undef
            statement,
            appParams
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
          dTemp = queryResult.data;
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
          d.binVals.push(dTemp.binVals[0]);
          d.oy_all.push(dTemp.oy_all[0]);
          d.on_all.push(dTemp.on_all[0]);
          d.n.push(dTemp.n[0]);
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
        }
      }
    } else {
      // this is a difference curve -- not supported for performance diagrams
      throw new Error(
        "INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves."
      );
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
    curve.axisKey = statisticSelect;
    curve.binParam = binParam;
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
    statType,
    axisMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataPerformanceDiagram(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
