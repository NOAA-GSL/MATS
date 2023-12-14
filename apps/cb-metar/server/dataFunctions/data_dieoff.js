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
  matsMiddleDieoff,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

// eslint-disable-next-line no-undef
dataDieoff = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.dieoff,
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
      (qv) => Object.keys(variableValuesMap[qv][0]).indexOf(variable) !== -1
    )[0];
    const variableDetails = variableValuesMap[queryVariable][0][variable];
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];

    const thresholdStr = curve.threshold;
    let threshold = "";
    if (variableValuesMap[queryVariable][2]) {
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

    let validTimes;
    let utcCycleStart;
    const forecastLengthStr = curve["dieoff-type"];
    const forecastLengthOptionsMap = matsCollections["dieoff-type"].findOne({
      name: "dieoff-type",
    }).optionsMap;
    const forecastLength = forecastLengthOptionsMap[forecastLengthStr][0];
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;
    [statType] = statisticOptionsMap[variable][statisticSelect];
    allStatTypes.push(statType);

    let queryTemplate;
    let sitesList;
    let singleCycle;
    const regionType = curve["region-type"];
    if (regionType === "Predefined region") {
      const regionStr = curve.region;
      const region = Object.keys(
        matsCollections.region.findOne({ name: "region" }).valuesMap
      ).find(
        (key) =>
          matsCollections.region.findOne({ name: "region" }).valuesMap[key] ===
          regionStr
      );

      // SQL template replacements
      let statTemplate;
      if (forecastLength === matsTypes.ForecastTypes.dieoff) {
        queryTemplate = Assets.getText("sqlTemplates/tmpl_DieOff.sql");
      } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
        queryTemplate = Assets.getText("sqlTemplates/tmpl_DieOff_UTC.sql");
      } else {
        queryTemplate = Assets.getText("sqlTemplates/tmpl_DieOff_SingleCycle.sql");
        singleCycle = fromSecs;
      }
      queryTemplate = queryTemplate.replace(/{{vxMODEL}}/g, model);
      queryTemplate = queryTemplate.replace(/{{vxREGION}}/g, region);
      queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, fromSecs);
      queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, toSecs);
      queryTemplate = queryTemplate.replace(
        /{{vxVARIABLE}}/g,
        queryVariable.toUpperCase()
      );
      if (statType === "ctc") {
        statTemplate = Assets.getText("sqlTemplates/tmpl_CTC.sql");
        queryTemplate = queryTemplate.replace(/{{vxSTATISTIC}}/g, statTemplate);
        queryTemplate = queryTemplate.replace(/{{vxTHRESHOLD}}/g, threshold);
        queryTemplate = queryTemplate.replace(/{{vxTYPE}}/g, "CTC");
      } else {
        statTemplate = Assets.getText("sqlTemplates/tmpl_PartialSums.sql");
        queryTemplate = queryTemplate.replace(/{{vxSTATISTIC}}/g, statTemplate);
        queryTemplate = queryTemplate.replace(/{{vxSUBVARIABLE}}/g, variableDetails[0]);
        queryTemplate = queryTemplate.replace(/{{vxTYPE}}/g, "SUMS");
      }

      if (forecastLength === matsTypes.ForecastTypes.dieoff) {
        validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
        if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
          queryTemplate = queryTemplate.replace(
            /{{vxVALID_TIMES}}/g,
            cbPool.trfmListToCSVString(validTimes, null, false)
          );
        } else {
          queryTemplate = cbPool.trfmSQLRemoveClause(
            queryTemplate,
            "{{vxVALID_TIMES}}"
          );
        }
      } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
        utcCycleStart =
          curve["utc-cycle-start"] === undefined ? [] : curve["utc-cycle-start"];
        if (
          utcCycleStart.length !== 0 &&
          utcCycleStart !== matsTypes.InputTypes.unused
        ) {
          queryTemplate = queryTemplate.replace(
            /{{vxUTC_CYCLE_START}}/g,
            cbPool.trfmListToCSVString(utcCycleStart, null, false)
          );
        } else {
          queryTemplate = cbPool.trfmSQLRemoveClause(
            queryTemplate,
            "{{vxUTC_CYCLE_START}}"
          );
        }
      }
    } else {
      sitesList = curve.sites === undefined ? [] : curve.sites;
      if (sitesList.length === 0 && sitesList === matsTypes.InputTypes.unused) {
        throw new Error(
          "INFO:  Please add sites in order to get a single/multi station plot."
        );
      }
      singleCycle = fromSecs;
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
        if (regionType === "Predefined region") {
          statement = cbPool.trfmSQLForDbTarget(queryTemplate);
        } else {
          // send to matsMiddle
          statement = "Station plot -- no one query.";
          const tss = new matsMiddleDieoff.MatsMiddleDieoff(cbPool);
          rows = tss.processStationQuery(
            statType,
            variableDetails[1],
            sitesList,
            model,
            null,
            threshold,
            fromSecs,
            toSecs,
            validTimes,
            utcCycleStart,
            singleCycle
          );
        }

        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
          cbPool,
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
    statType: allStatTypes,
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
