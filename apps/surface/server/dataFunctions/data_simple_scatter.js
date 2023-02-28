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

dataSimpleScatter = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.simpleScatter,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  let error = "";
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const dataset = [];
  const axisXMap = Object.create(null);
  const axisYMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    const { label } = curve;
    const binParam = curve["bin-parameter"];
    const binClause = matsCollections["bin-parameter"].findOne({
      name: "bin-parameter",
    }).optionsMap[binParam];
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[curve["data-source"]][0];
    var metarStringStr = curve.truth;
    const metarString = Object.keys(
      matsCollections.truth.findOne({ name: "truth" }).valuesMap
    ).find(
      (key) =>
        matsCollections.truth.findOne({ name: "truth" }).valuesMap[key] ===
        metarStringStr
    );
    var regionStr = curve.region;
    const region = Object.keys(
      matsCollections.region.findOne({ name: "region" }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: "region" }).valuesMap[key] === regionStr
    );
    const queryTableClause = `from ${model}_${metarString}_${region} as m0`;
    // scatterplots are only for predefined regions--no station plots
    const regionType = "Predefined region";
    const variableXStr = curve["x-variable"];
    const variableYStr = curve["y-variable"];
    const variableOptionsMap = matsCollections.variable.findOne(
      { name: "variable" },
      { optionsMap: 1 }
    ).optionsMap;
    const variableX = variableOptionsMap[regionType][variableXStr];
    const variableY = variableOptionsMap[regionType][variableYStr];
    let validTimeClause = "";
    let forecastLengthClause = "";
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    let dateString = "";
    let dateClause = "";
    if (binParam !== "Valid UTC hour") {
      const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and m0.hour IN(${validTimes})`;
      }
    }
    if (binParam !== "Fcst lead time") {
      const forecastLength = curve["forecast-length"];
      if (forecastLength === undefined) {
        throw new Error(
          `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
        );
      }
      forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
    }
    if (binParam === "Init Date" && binParam !== "Valid Date") {
      dateString = "m0.valid_day+3600*m0.hour-m0.fcst_len*3600";
    } else {
      dateString = "m0.valid_day+3600*m0.hour";
    }
    dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
    const statisticXSelect = curve["x-statistic"];
    const statisticYSelect = curve["y-statistic"];
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;
    const statisticClause =
      `sum(${variableX[0]}) as square_diff_sumX, sum(${variableX[1]}) as N_sumX, sum(${variableX[2]}) as obs_model_diff_sumX, sum(${variableX[3]}) as model_sumX, sum(${variableX[4]}) as obs_sumX, sum(${variableX[5]}) as abs_sumX, ` +
      `sum(${variableY[0]}) as square_diff_sumY, sum(${variableY[1]}) as N_sumY, sum(${variableY[2]}) as obs_model_diff_sumY, sum(${variableY[3]}) as model_sumY, sum(${variableY[4]}) as obs_sumY, sum(${variableY[5]}) as abs_sumY, ` +
      `group_concat(m0.valid_day+3600*m0.hour, ';', ${variableX[0]}, ';', ${variableX[1]}, ';', ${variableX[2]}, ';', ${variableX[3]}, ';', ${variableX[4]}, ';', ${variableX[5]}, ';', ${variableY[0]}, ';', ${variableY[1]}, ';', ${variableY[2]}, ';', ${variableY[3]}, ';', ${variableY[4]}, ';', ${variableY[5]} order by m0.valid_day+3600*m0.hour) as sub_data, count(${variableX[0]}) as N0`;
    var statType = statisticOptionsMap[statisticXSelect];
    const { statVarUnitMap } = matsCollections.variable.findOne(
      { name: "variable" },
      { statVarUnitMap: 1 }
    );
    const varUnitsX = statVarUnitMap[statisticXSelect][variableXStr];
    const varUnitsY = statVarUnitMap[statisticYSelect][variableYStr];

    var d;
    if (diffFrom === null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      let statement =
        "{{binClause}} " +
        "count(distinct {{dateString}}) as N_times, " +
        "min({{dateString}}) as min_secs, " +
        "max({{dateString}}) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{dateClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "group by binVal " +
        "order by binVal" +
        ";";

      statement = statement.replace("{{binClause}}", binClause);
      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
      statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
      statement = statement.replace("{{dateClause}}", dateClause);
      statement = statement.split("{{dateString}}").join(dateString);
      dataRequests[label] = statement;

      var queryResult;
      const startMoment = moment();
      var finishMoment;
      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSimpleScatter(
          sumPool,
          statement,
          appParams,
          `${statisticXSelect}_${variableXStr}`,
          `${statisticYSelect}_${variableYStr}`
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
          if (error.includes("Unknown column")) {
            throw new Error(
              `INFO:  The statistic/variable combination [${statisticXSelect}/${variableXStr} and ${statisticYSelect}/${variableYStr}] is not supported by the database for the model/region [${model} and ${region}].`
            );
          } else {
            throw new Error(error);
          }
        }
      } else {
        dataFoundForAnyCurve = true;
      }

      // set axis limits based on returned data
      var postQueryStartMoment = moment();
      if (dataFoundForCurve) {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else {
      // this is a difference curve -- not supported for ROC plots
      throw new Error(
        "INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves."
      );
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
    curve.axisXKey = varUnitsX;
    curve.axisYKey = varUnitsY;
    curve.binParam = binParam;
    const cOptions = matsDataCurveOpsUtils.generateScatterCurveOptions(
      curve,
      curveIndex,
      axisXMap,
      axisYMap,
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
    axisXMap,
    axisYMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataSimpleScatter(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
