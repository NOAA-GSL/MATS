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
  const allStatTypes = [];
  const allStatistics = [];

  let statement = "";
  let error = "";
  let dataset = [];

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  const xAxisParam = plotParams["x-axis-parameter"];
  const yAxisParam = plotParams["y-axis-parameter"];
  const xValClause = matsCollections.PlotParams.findOneAsync({ name: "x-axis-parameter" })
    .optionsMap[xAxisParam];
  const yValClause = matsCollections.PlotParams.findOneAsync({ name: "y-axis-parameter" })
    .optionsMap[yAxisParam];

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;

    const { variable } = curve;
    const databaseRef = matsCollections.variable.findOneAsync({ name: "variable" })
      .optionsMap[variable];
    const model = matsCollections["data-source"].findOneAsync({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];

    let thresholdClause = "";
    if (xAxisParam !== "Threshold" && yAxisParam !== "Threshold") {
      const thresholdStr = curve.threshold;
      if (thresholdStr === undefined) {
        throw new Error(
          `INFO:  ${label}'s threshold is undefined. Please assign it a value.`
        );
      }
      const threshold = Object.keys(
        matsCollections.threshold.findOneAsync({ name: "threshold" }).valuesMap[variable]
      ).findAsync(
        (key) =>
          matsCollections.threshold.findOneAsync({ name: "threshold" }).valuesMap[variable][
            key
          ] === thresholdStr
      );
      thresholdClause = `and m0.trsh = ${threshold / 10000}`;
    }

    const scaleStr = curve.scale;
    const scale = Object.keys(
      matsCollections.scale.findOneAsync({ name: "scale" }).valuesMap[variable]
    ).findAsync(
      (key) =>
        matsCollections.scale.findOneAsync({ name: "scale" }).valuesMap[variable][key] ===
        scaleStr
    );

    let validTimeClause = "";
    if (xAxisParam !== "Valid UTC hour" && yAxisParam !== "Valid UTC hour") {
      const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and m0.time%(24*3600)/3600 IN(${validTimes})`;
      }
    }

    let forecastLengthClause = "";
    if (xAxisParam !== "Fcst lead time" && yAxisParam !== "Fcst lead time") {
      const forecastLength = curve["forecast-length"];
      if (forecastLength === undefined) {
        throw new Error(
          `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
        );
      }
      forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
    }

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOneAsync(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;
    const statisticClause =
      "sum(m0.yy) as hit, sum(m0.ny) as fa, sum(m0.yn) as miss, sum(m0.nn) as cn, group_concat(m0.time, ';', m0.yy, ';', m0.ny, ';', m0.yn, ';', m0.nn order by m0.time) as sub_data, count(m0.yy) as n0";

    let dateString = "";
    let dateClause = "";
    if (
      (xAxisParam === "Init Date" || yAxisParam === "Init Date") &&
      xAxisParam !== "Valid Date" &&
      yAxisParam !== "Valid Date"
    ) {
      dateString = "m0.time-m0.fcst_len*3600";
    } else {
      dateString = "m0.time";
    }
    dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;

    const regionStr = curve.region;
    const region = Object.keys(
      matsCollections.region.findOneAsync({ name: "region" }).valuesMap
    ).findAsync(
      (key) =>
        matsCollections.region.findOneAsync({ name: "region" }).valuesMap[key] === regionStr
    );
    const queryTableClause = `from ${databaseRef}.${model}_${scale}_${region} as m0`;

    // For contours, this functions as the colorbar label.
    [statType] = statisticOptionsMap[statisticSelect];
    allStatTypes.push(statType);
    [, curve.unitKey] = statisticOptionsMap[statisticSelect];
    allStatistics.push(statisticSelect);

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "{{xValClause}} " +
          "{{yValClause}} " +
          "count(distinct {{dateString}}) as nTimes, " +
          "min({{dateString}}) as min_secs, " +
          "max({{dateString}}) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{dateClause}} " +
          "{{thresholdClause}} " +
          "{{validTimeClause}} " +
          "{{forecastLengthClause}} " +
          "group by xVal,yVal " +
          "order by xVal,yVal" +
          ";";

        statement = statement.replace("{{xValClause}}", xValClause);
        statement = statement.replace("{{yValClause}}", yValClause);
        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{thresholdClause}}", thresholdClause);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        statement = statement.split("{{dateString}}").join(dateString);
        dataRequests[label] = statement;

        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBContour(
          sumPool, // eslint-disable-line no-undef
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
        d = queryResult.data;
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = `Error in queryDB: ${e.message} for statement: ${statement}`;
        throw new Error(e.message);
      }

      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error !== matsTypes.Messages.NO_DATA_FOUND) {
          // this is an error returned by the mysql database
          error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
          if (error.includes("ER_NO_SUCH_TABLE")) {
            throw new Error(
              `INFO:  The region/scale combination [${regionStr} and ${scaleStr}] is not supported by the database for the model [${model}]. ` +
                `Choose a different scale to continue using this region.`
            );
          } else {
            throw new Error(error);
          }
        }
        dataNotFoundForAnyCurve = true;
      }
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
    allStatistics,
    allStatTypes
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
