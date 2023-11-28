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

// eslint-disable-next-line no-undef
dataDailyModelCycle = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.dailyModelCycle,
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
  let error = "";
  const dataset = [];

  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[curve["data-source"]][0];

    const variableStr = curve.variable;
    const variableOptionsMap = matsCollections.variable.findOne(
      { name: "variable" },
      { optionsMap: 1 }
    ).optionsMap;
    const variable = variableOptionsMap[variableStr];

    if (curve["utc-cycle-start"].length !== 1) {
      throw new Error(
        "INFO:  Please select exactly one UTC Cycle Init Hour for this plot type."
      );
    }
    const utcCycleStart = Number(curve["utc-cycle-start"][0]);
    utcCycleStarts[curveIndex] = utcCycleStart;
    const utcCycleStartClause = `and floor((m0.valid_day+3600*m0.hour - m0.fcst_len*3600)%(24*3600)/3600) IN(${utcCycleStart})`;

    const forecastLengthClause = "and m0.fcst_len < 24";

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap;
    const statisticClause =
      `sum(${variable[0]}) as square_diff_sum, sum(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
      `group_concat(m0.valid_day+3600*m0.hour, ';', ${variable[0]}, ';', ${variable[1]}, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by m0.valid_day+3600*m0.hour) as sub_data, count(${variable[0]}) as N0`;

    const dateClause = `and m0.valid_day+3600*m0.hour >= ${fromSecs} and m0.valid_day+3600*m0.hour <= ${toSecs}`;

    const vgtypStr = curve.vgtyp;
    const vgtyp = Object.keys(
      matsCollections.vgtyp.findOne({ name: "vgtyp" }).valuesMap
    ).find(
      (key) =>
        matsCollections.vgtyp.findOne({ name: "vgtyp" }).valuesMap[key] === vgtypStr
    );
    const vgtypClause = `and m0.vgtyp IN(${vgtyp})`;

    const queryTableClause = `from ${model} as m0`;

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    const { statVarUnitMap } = matsCollections.variable.findOne(
      { name: "variable" },
      { statVarUnitMap: 1 }
    );
    statType = statisticOptionsMap[statisticSelect];
    allStatTypes.push(statType);
    const axisKey = statVarUnitMap[statisticSelect][variableStr];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "select m0.valid_day+3600*m0.hour as avtime, " +
          "count(distinct m0.valid_day+3600*m0.hour) as N_times, " +
          "min(m0.valid_day+3600*m0.hour) as min_secs, " +
          "max(m0.valid_day+3600*m0.hour) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{dateClause}} " +
          "{{utcCycleStartClause}} " +
          "{{forecastLengthClause}} " +
          "{{vgtypClause}} " +
          "group by avtime " +
          "order by avtime" +
          ";";

        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{utcCycleStartClause}}", utcCycleStartClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{vgtypClause}}", vgtypClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        dataRequests[label] = statement;

        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
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
              `INFO:  The statistic/variable combination [${statisticSelect} and ${variableStr}] is not supported by the database for the model/vgtyp [${model} and ${vgtypStr}].`
            );
          } else {
            throw new Error(error);
          }
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
