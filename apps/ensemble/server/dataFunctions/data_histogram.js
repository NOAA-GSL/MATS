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
  let statType;
  let varUnits;
  const dataset = [];
  const allReturnedSubStats = [];
  const allReturnedSubSecs = [];
  const axisMap = Object.create(null);

  // process user bin customizations
  const binParams = matsDataUtils.setHistogramParameters(plotParams);
  const { yAxisFormat } = binParams;
  const { binNum } = binParams;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    dataFoundForCurve[curveIndex] = true;
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
    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    ).optionsMap[appParams.plotType];
    const tableStatPrefix = statisticOptionsMap[statisticSelect][2];
    const queryTableClause = `from ${databaseRef}.${model}_${tableStatPrefix}_${region} as m0`;
    const { threshold } = curve;
    const thresholdClause = `and m0.trsh = ${threshold}`;
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
    let validTimeClause = "";
    const validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and floor((m0.time)%(24*3600)/3600) IN(${validTimes})`;
    }
    const forecastLength = curve["forecast-length"];
    const forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    const dateClause = `and m0.time >= ${fromSecs} and m0.time <= ${toSecs}`;
    const [statisticClause] = statisticOptionsMap[statisticSelect];
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    [, statType] = statisticOptionsMap[statisticSelect];
    [, , , varUnits] = statisticOptionsMap[statisticSelect];
    let axisKey = yAxisFormat;
    if (yAxisFormat === "Relative frequency") {
      axisKey += " (x100)";
    }
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

    let d;
    if (!diffFrom) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      let statement =
        "select m0.time as avtime, " +
        "count(distinct m0.time) as N_times, " +
        "min(m0.time) as min_secs, " +
        "max(m0.time) as max_secs, " +
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
        "group by avtime " +
        "order by avtime" +
        ";";

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
      dataRequests[label] = statement;

      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
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
