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
  let dataFoundForCurve = true;

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

  // initialize variables specific to this curve
  const curve = curves[0];
  const { label } = curve;
  const { diffFrom } = curve;
  const model = matsCollections["data-source"].findOne({ name: "data-source" })
    .optionsMap[curve["data-source"]][0];

  const variableStr = curve.variable;
  const variableOptionsMap = matsCollections.variable.findOne(
    { name: "variable" },
    { optionsMap: 1 }
  ).optionsMap;

  let scaleClause = "";
  const scaleStr = curve.scale;
  if (xAxisParam !== "Grid scale" && yAxisParam !== "Grid scale") {
    if (scaleStr === undefined) {
      throw new Error(
        `INFO:  ${label}'s grid scale is undefined. Please assign it a value.`
      );
    }
    const scale = Object.keys(
      matsCollections.scale.findOne({ name: "scale" }).valuesMap
    ).find(
      (key) =>
        matsCollections.scale.findOne({ name: "scale" }).valuesMap[key] === scaleStr
    );
    scaleClause = `and m0.scale = ${scale} `;
  }

  let validTimeClause = "";
  if (xAxisParam !== "Valid UTC hour" && yAxisParam !== "Valid UTC hour") {
    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and (m0.secs)%(24*3600)/3600 IN(${validTimes})`;
    }
  }

  let forecastLengthClause = "";
  if (xAxisParam !== "Fcst lead time" && yAxisParam !== "Fcst lead time") {
    const forecastLength = Number(curve["forecast-length"]) * 60;
    if (forecastLength === undefined) {
      throw new Error(
        `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
      );
    }
    forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
  }

  const statisticSelect = curve.statistic;
  const statisticOptionsMap = matsCollections.statistic.findOne(
    { name: "statistic" },
    { optionsMap: 1 }
  ).optionsMap;

  let dateString = "";
  let dateClause = "";
  if (
    (xAxisParam === "Init Date" || yAxisParam === "Init Date") &&
    xAxisParam !== "Valid Date" &&
    yAxisParam !== "Valid Date"
  ) {
    dateString = "m0.secs-m0.fcst_len*60";
  } else {
    dateString = "m0.secs";
  }
  dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;

  const regionStr = curve.region;
  const region = Object.keys(
    matsCollections.region.findOne({ name: "region" }).valuesMap
  ).find(
    (key) =>
      matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
  );

  let queryTableClause;
  let NAggregate;
  let NClause;
  let variable;
  if (region === "all_stat") {
    variable = variableOptionsMap[variableStr]["Predefined region"];
    queryTableClause = `from ${model}_all_site_sums as m0`;
    NAggregate = "sum";
    [, NClause] = variable;
  } else if (region === "all_surf") {
    variable = variableOptionsMap[variableStr]["Predefined region"];
    queryTableClause = `from ${model}_all_surfrad_sums as m0`;
    NAggregate = "sum";
    [, NClause] = variable;
  } else if (region === "all_sol") {
    variable = variableOptionsMap[variableStr]["Predefined region"];
    queryTableClause = `from ${model}_all_solrad_sums as m0`;
    NAggregate = "sum";
    [, NClause] = variable;
  } else {
    variable = variableOptionsMap[variableStr]["Select stations"];
    queryTableClause = `from ${model}_site_${region} as m0`;
    NAggregate = "count";
    NClause = "1";
  }

  const statisticClause =
    `sum(${variable[0]}) as square_diff_sum, ${NAggregate}(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
    `group_concat(m0.secs, ';', ${variable[0]}, ';', ${NClause}, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by m0.secs) as sub_data, count(${variable[0]}) as N0`;

  // For contours, this functions as the colorbar label.
  const { statVarUnitMap } = matsCollections.variable.findOne(
    { name: "variable" },
    { statVarUnitMap: 1 }
  );
  const statType = statisticOptionsMap[statisticSelect];
  const varUnits = statVarUnitMap[statisticSelect][variableStr];
  curve.unitKey = varUnits;

  let d;
  if (!diffFrom) {
    let queryResult;
    const startMoment = moment();
    let finishMoment;
    try {
      statement =
        "{{xValClause}} " +
        "{{yValClause}} " +
        "count(distinct {{dateString}}) as N_times, " +
        "min({{dateString}}) as min_secs, " +
        "max({{dateString}}) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{dateClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "{{scaleClause}} " +
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
      statement = statement.replace("{{dateClause}}", dateClause);
      statement = statement.split("{{dateString}}").join(dateString);
      dataRequests[label] = statement;

      // send the query statement to the query function
      queryResult = matsDataQueryUtils.queryDBContour(
        sumPool, // eslint-disable-line no-undef
        statement,
        appParams,
        `${statisticSelect}_${variableStr}`
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
      if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
        // this is NOT an error just a no data condition
        dataFoundForCurve = false;
      } else {
        // this is an error returned by the mysql database
        error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
        throw new Error(error);
      }
    }

    if (!dataFoundForCurve) {
      // we found no data for any curves so don't bother proceeding
      throw new Error("INFO:  No valid data for any curves.");
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
