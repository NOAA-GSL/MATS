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

dataContourDiff = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.contourDiff,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
  };
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  let dataNotFoundForAnyCurve = false;
  const showSignificance = plotParams.significance !== "none";
  const totalProcessingStart = moment();
  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;
  const xAxisParam = plotParams["x-axis-parameter"];
  const yAxisParam = plotParams["y-axis-parameter"];
  const xValClause = matsCollections.PlotParams.findOne({ name: "x-axis-parameter" })
    .optionsMap[xAxisParam];
  const yValClause = matsCollections.PlotParams.findOne({ name: "y-axis-parameter" })
    .optionsMap[yAxisParam];
  let error = "";
  let curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  if (curvesLength !== 2) {
    throw new Error("INFO:  There must be two added curves.");
  }
  let dataset = [];
  const axisMap = Object.create(null);

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[curve["data-source"]][0];
    var regionStr = curve.region;
    const region = Object.keys(
      matsCollections.region.findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
    );
    const queryTableClause = `from ${model}_anomcorr_${region} as m0`;
    const { variable } = curve;
    const variableClause = `and m0.variable = '${variable}'`;
    let validTimeClause = "";
    let forecastLengthClause = "";
    let dateString = "";
    let dateClause = "";
    let levelClause = "";
    if (xAxisParam !== "Valid UTC hour" && yAxisParam !== "Valid UTC hour") {
      const validTimeStr = curve["valid-time"] === matsTypes.InputTypes.unused
          ? "both" : curve["valid-time"];
      validTimeClause = matsCollections["valid-time"].findOne(
        { name: "valid-time" },
        { optionsMap: 1 }
      ).optionsMap[validTimeStr][0];
    }
    if (xAxisParam !== "Fcst lead time" && yAxisParam !== "Fcst lead time") {
      const forecastLength = curve["forecast-length"];
      forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
    }
    if (
      (xAxisParam === "Init Date" || yAxisParam === "Init Date") &&
      xAxisParam !== "Valid Date" &&
      yAxisParam !== "Valid Date"
    ) {
      dateString = "unix_timestamp(m0.valid_date)+3600*m0.valid_hour-m0.fcst_len*3600";
    } else {
      dateString = "unix_timestamp(m0.valid_date)+3600*m0.valid_hour";
    }
    dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
    if (xAxisParam !== "Pressure level" && yAxisParam !== "Pressure level") {
      const levels = curve.level === undefined ? [] : curve.level;
      if (levels.length > 0 && levels !== matsTypes.InputTypes.unused) {
        levelClause = `and m0.level IN(${levels})`;
      }
    }
    const statisticClause =
      "avg(m0.wacorr/100) as stat, " +
      "stddev(m0.wacorr/100) as stdev, " +
      "group_concat(unix_timestamp(m0.valid_date) + 3600 * m0.valid_hour, ';', m0.level, ';', m0.wacorr / 100 " +
      "order by unix_timestamp(m0.valid_date) + 3600 * m0.valid_hour, m0.level) as sub_data, " +
      "count(m0.wacorr) as N0";
    var statType = "ACC";
    curve.statistic = "Correlation";

    // For contours, this functions as the colorbar label.
    curves[curveIndex].unitKey = curve.statistic;

    var d;
    // this is a database driven curve, not a difference curve
    // prepare the query from the above parameters
    let statement =
      "{{xValClause}} " +
      "{{yValClause}} " +
      "count(distinct {{dateString}}) as N_times, " +
      "min({{dateString}}) as min_secs, " +
      "max({{dateString}}) as max_secs, " +
      "{{statisticClause}} " +
      "{{queryTableClause}} " +
      "where 1=1 " +
      "{{dateClause}} " +
      "{{variableClause}} " +
      "{{validTimeClause}} " +
      "{{forecastLengthClause}} " +
      "{{levelClause}} " +
      "group by xVal,yVal " +
      "order by xVal,yVal" +
      ";";

    statement = statement.replace("{{xValClause}}", xValClause);
    statement = statement.replace("{{yValClause}}", yValClause);
    statement = statement.replace("{{statisticClause}}", statisticClause);
    statement = statement.replace("{{queryTableClause}}", queryTableClause);
    statement = statement.replace("{{variableClause}}", variableClause);
    statement = statement.replace("{{validTimeClause}}", validTimeClause);
    statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
    statement = statement.replace("{{levelClause}}", levelClause);
    statement = statement.replace("{{dateClause}}", dateClause);
    statement = statement.split("{{dateString}}").join(dateString);
    dataRequests[label] = statement;

    var queryResult;
    const startMoment = moment();
    var finishMoment;
    try {
      // send the query statement to the query function
      queryResult = matsDataQueryUtils.queryDBContour(
        sumPool,
        statement,
        appParams,
        "Anomaly Correlation"
      );
      finishMoment = moment();
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
      if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
        // this is NOT an error just a no data condition
        dataFoundForCurve = false;
      } else {
        // this is an error returned by the mysql database
        error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
        throw new Error(error);
      }
      dataNotFoundForAnyCurve = true;
    }

    const postQueryStartMoment = moment();

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
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
    "Anomaly Correlation",
    statType === "ctc"
  );
  plotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
  curves = plotParams.curves;
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
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
