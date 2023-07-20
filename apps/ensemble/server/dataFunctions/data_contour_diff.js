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
    hasLevels: false,
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
  let statType;
  let statisticSelect;
  let dataset = [];
  const axisMap = Object.create(null);

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { variable } = curve;
    const databaseRef = matsCollections.variable.findOne({ name: "variable" })
      .optionsMap[variable];
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];
    const regionStr = curve.region;
    let region = Object.keys(
      matsCollections.region.findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
    );
    region = region === "Full" ? "Full_domain" : region; // this db doesn't handle the full domain the way the others do
    statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;
    const tableStatPrefix = statisticOptionsMap[statisticSelect][2];
    const queryTableClause = `from ${databaseRef}.${model}_${tableStatPrefix}_${region} as m0`;
    const { members } = curve;
    const memberClause = `and m0.mem = ${members}`;
    const neighborhoodSize = curve["neighborhood-size"];
    const neighborhoodClause = `and m0.nhd_size = ${neighborhoodSize}`;
    let kernelClause = "";
    let probBinClause = "";
    let radiusClause = "";
    if (tableStatPrefix === "count") {
      const { kernel } = curve;
      kernelClause = `and m0.kernel = ${kernel}`;
      const probBins =
        curve["probability-bins"] === undefined ? [] : curve["probability-bins"];
      if (probBins.length !== 0 && probBins !== matsTypes.InputTypes.unused) {
        probBinClause = `and m0.prob IN(${probBins})`;
      } else {
        throw new Error("INFO:  You need to select at least one probability bin.");
      }
    } else {
      const { radius } = curve;
      radiusClause = `and m0.radius = ${radius}`;
    }
    let thresholdClause = "";
    let validTimeClause = "";
    let forecastLengthClause = "";
    let dateString = "";
    let dateClause = "";
    if (xAxisParam !== "Threshold" && yAxisParam !== "Threshold") {
      const { threshold } = curve;
      thresholdClause = `and m0.trsh = ${threshold}`;
    }
    if (xAxisParam !== "Valid UTC hour" && yAxisParam !== "Valid UTC hour") {
      const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and m0.time%(24*3600)/3600 IN(${validTimes})`;
      }
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
      dateString = "m0.time-m0.fcst_len*3600";
    } else {
      dateString = "m0.time";
    }
    dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
    const [statisticClause] = statisticOptionsMap[statisticSelect];
    // For contours, this functions as the colorbar label.
    [statType] = statisticOptionsMap[statisticSelect];
    [, , , curve.unitKey] = statisticOptionsMap[statisticSelect];

    let d;
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
      "{{memberClause}} " +
      "{{neighborhoodClause}} " +
      "{{thresholdClause}} " +
      "{{kernelClause}} " +
      "{{probBinClause}} " +
      "{{radiusClause}} " +
      "{{validTimeClause}} " +
      "{{forecastLengthClause}} " +
      "group by xVal,yVal " +
      "order by xVal,yVal" +
      ";";

    statement = statement.replace("{{xValClause}}", xValClause);
    statement = statement.replace("{{yValClause}}", yValClause);
    statement = statement.replace("{{statisticClause}}", statisticClause);
    statement = statement.replace("{{queryTableClause}}", queryTableClause);
    statement = statement.replace("{{memberClause}}", memberClause);
    statement = statement.replace("{{neighborhoodClause}}", neighborhoodClause);
    statement = statement.replace("{{thresholdClause}}", thresholdClause);
    statement = statement.replace("{{kernelClause}}", kernelClause);
    statement = statement.replace("{{probBinClause}}", probBinClause);
    statement = statement.replace("{{radiusClause}}", radiusClause);
    statement = statement.replace("{{validTimeClause}}", validTimeClause);
    statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
    statement = statement.replace("{{dateClause}}", dateClause);
    statement = statement.split("{{dateString}}").join(dateString);
    dataRequests[label] = statement;

    let queryResult;
    const startMoment = moment();
    let finishMoment;
    try {
      // send the query statement to the query function
      queryResult = matsDataQueryUtils.queryDBContour(
        sumPool,
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

  // make a copy of the plotParams that we can modify
  const diffPlotParams = JSON.parse(JSON.stringify(plotParams));
  diffPlotParams.curves = matsDataUtils.getDiffContourCurveParams(
    diffPlotParams.curves
  );
  curves = diffPlotParams.curves;
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
    diffPlotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
