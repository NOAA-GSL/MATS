/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataProcessUtils,
} from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

dataHistogram = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.histogram,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
  };
  const alreadyMatched = false;
  const dataRequests = {}; // used to store data queries
  const dataFoundForCurve = [];
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  let error = "";
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const dataset = [];
  const allReturnedSubStats = [];
  const allReturnedSubSecs = [];
  const axisMap = Object.create(null);

  // process user bin customizations
  const binParams = matsDataUtils.setHistogramParameters(plotParams);
  const { yAxisFormat } = binParams;
  const { binNum } = binParams;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    dataFoundForCurve[curveIndex] = true;
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
    const variableStr = curve.variable;
    const variableOptionsMap = matsCollections.variable.findOne(
      { name: "variable" },
      { optionsMap: 1 }
    ).optionsMap;
    const variable = variableOptionsMap[variableStr];
    let validTimeClause = "";
    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and (m0.secs)%(24*3600)/3600 IN(${validTimes})`;
    }
    const forecastLength = Number(curve["forecast-length"]) * 60;
    const forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    let dateClause = `and o.secs >= ${fromSecs} and o.secs <= ${toSecs}`;
    dateClause = `${dateClause} and m0.secs >= ${fromSecs} and m0.secs <= ${toSecs}`;
    const matchClause = "and m0.id = o.id and m0.secs = o.secs";
    const statisticSelect = curve.statistic;
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
    var varUnits = statVarUnitMap[statisticSelect][variableStr];
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    let axisKey = yAxisFormat;
    if (yAxisFormat === "Relative frequency") {
      axisKey += " (x100)";
    }
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

    var d;
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      let statement =
        "select m0.secs as avtime, " +
        "count(distinct m0.secs) as N_times, " +
        "min(m0.secs) as min_secs, " +
        "max(m0.secs) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{matchClause}} " +
        "{{dateClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "{{scaleClause}} " +
        "{{regionClause}} " +
        "group by avtime " +
        "order by avtime" +
        ";";

      statement = statement.replace("{{statisticClause}}", statisticClause);
      statement = statement.replace("{{queryTableClause}}", queryTableClause);
      statement = statement.replace("{{validTimeClause}}", validTimeClause);
      statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
      statement = statement.replace("{{scaleClause}}", scaleClause);
      statement = statement.replace("{{regionClause}}", regionClause);
      statement = statement.replace("{{matchClause}}", matchClause);
      statement = statement.replace("{{dateClause}}", dateClause);
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
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
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
          recordCount: queryResult.data.x.length,
        };
        // get the data back from the query
        d = queryResult.data;
        allReturnedSubStats.push(d.subVals); // save returned data so that we can calculate histogram stats once all the queries are done
        allReturnedSubSecs.push(d.subSecs);
      } catch (e) {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = `Error in queryDB: ${e.message} for statement: ${statement}`;
        throw new Error(e.message);
      }
      if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve[curveIndex] = false;
        } else {
          // this is an error returned by the mysql database
          error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
          throw new Error(error);
        }
      } else {
        dataFoundForAnyCurve = true;
      }
    }
  }

  if (!dataFoundForAnyCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves,
    curvesLength,
    dataFoundForCurve,
    statType,
    axisMap,
    yAxisFormat,
    varUnits,
  };
  const bookkeepingParams = {
    alreadyMatched,
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataHistogram(
    allReturnedSubStats,
    allReturnedSubSecs,
    [],
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    binParams,
    bookkeepingParams
  );
  plotFunction(result);
};
