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
    var regionClause;
    if (region === "all_stat") {
      regionClause = "";
    } else if (region === "all_surf") {
      regionClause = "and m0.id in(1,2,3,4,5,6,7) ";
    } else if (region === "all_sol") {
      regionClause = "and m0.id in(8,9,10,11,12,13,14) ";
    } else {
      regionClause = `and m0.id in(${region}) `;
    }
    var scaleStr = curve.scale;
    const grid_scale = Object.keys(
      matsCollections.scale.findOne({ name: "scale" }).valuesMap
    ).find(
      (key) =>
        matsCollections.scale.findOne({ name: "scale" }).valuesMap[key] === scaleStr
    );
    const scaleClause = `and m0.scale = ${grid_scale}`;
    const queryTableClause = `from surfrad as o, ${model} as m0`;
    var variableStr = curve.variable;
    const variableOptionsMap = matsCollections.variable.findOne(
      { name: "variable" },
      { optionsMap: 1 }
    ).optionsMap;
    const variable = variableOptionsMap[variableStr];
    let validTimeClause = "";
    let forecastLengthClause = "";
    let dateString = "";
    let dateClause = "";
    let matchClause = "";
    if (xAxisParam !== "Valid UTC hour" && yAxisParam !== "Valid UTC hour") {
      const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and (m0.secs)%(24*3600)/3600 IN(${validTimes})`;
      }
    }
    if (xAxisParam !== "Fcst lead time" && yAxisParam !== "Fcst lead time") {
      const forecastLength = Number(curve["forecast-length"]) * 60;
      forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
    }
    if (
      (xAxisParam === "Init Date" || yAxisParam === "Init Date") &&
      xAxisParam !== "Valid Date" &&
      yAxisParam !== "Valid Date"
    ) {
      dateString = "m0.secs-m0.fcst_len*60";
    } else {
      dateString = "m0.secs";
    }
    dateClause = `and o.secs >= ${fromSecs} and o.secs <= ${toSecs}`;
    dateClause = `${dateClause} and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
    matchClause = "and m0.id = o.id and m0.secs = o.secs";
    var statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;
    const statisticClause =
      `sum(${variable[0]}) as square_diff_sum, count(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
      `group_concat(m0.secs, ';', ${variable[0]}, ';', 1, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by m0.secs) as sub_data, count(${variable[0]}) as N0`;
    var statType = statisticOptionsMap[statisticSelect];
    const { statVarUnitMap } = matsCollections.variable.findOne(
      { name: "variable" },
      { statVarUnitMap: 1 }
    );
    const varUnits = statVarUnitMap[statisticSelect][variableStr];

    // For contours, this functions as the colorbar label.
    curve.unitKey = varUnits;

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
      "{{matchClause}} " +
      "{{dateClause}} " +
      "{{validTimeClause}} " +
      "{{forecastLengthClause}} " +
      "{{scaleClause}} " +
      "{{regionClause}} " +
      "group by xVal,yVal " +
      "order by xVal,yVal" +
      ";";

    statement = statement.replace("{{xValClause}}", xValClause);
    statement = statement.replace("{{yValClause}}", yValClause);
    statement = statement.replace("{{statisticClause}}", statisticClause);
    statement = statement.replace("{{queryTableClause}}", queryTableClause);
    statement = statement.replace("{{validTimeClause}}", validTimeClause);
    statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
    statement = statement.replace("{{scaleClause}}", scaleClause);
    statement = statement.replace("{{regionClause}}", regionClause);
    statement = statement.replace("{{matchClause}}", matchClause);
    statement = statement.replace("{{dateClause}}", dateClause);
    statement = statement.split("{{dateString}}").join(dateString);
    dataRequests[label] = statement;

    if (
      model !== "HRRR" &&
      variableStr !== "dswrf" &&
      statisticSelect !== "Obs average"
    ) {
      throw new Error(
        `INFO:  The statistic/variable combination [${statisticSelect} and ${variableStr}] is only available for the HRRR data-source.`
      );
    }

    var queryResult;
    const startMoment = moment();
    var finishMoment;
    try {
      // send the query statement to the query function
      queryResult = matsDataQueryUtils.queryDBContour(
        sumPool,
        statement,
        appParams,
        `${statisticSelect}_${variableStr}`
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
    `${statisticSelect}_${variableStr}`,
    statType === "ctc",
    statType === "scalar"
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
