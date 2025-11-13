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
import moment from "moment";

/* eslint-disable no-await-in-loop */

global.dataValidTime = async function (plotParams) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.validtime,
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

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex += 1) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { label } = curve;
    const { diffFrom } = curve;

    const { variable } = curve;
    const databaseRef = (
      await matsCollections.variable.findOneAsync({ name: "variable" })
    ).optionsMap[variable];
    const model = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).optionsMap[variable][curve["data-source"]][0];
    let queryTableClause = "";

    let thresholdClause = "";
    const thresholdStr = curve.threshold;
    const thresholdValues = (
      await matsCollections.threshold.findOneAsync({ name: "threshold" })
    ).valuesMap[variable];
    const threshold = Object.keys(thresholdValues).find(
      (key) => thresholdValues[key] === thresholdStr
    );

    const scaleStr = curve.scale;
    const scaleValues = (await matsCollections.scale.findOneAsync({ name: "scale" }))
      .valuesMap[variable];
    const scale = Object.keys(scaleValues).find((key) => scaleValues[key] === scaleStr);
    const scaleClause = `and m0.scale = ${scale}`;

    const forecastLength = curve["forecast-length"];
    const forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;

    let statisticClause;
    const statisticSelect = curve.statistic;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap;

    const dateRange = matsDataUtils.getDateRange(curve["curve-dates"]);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;

    let dateClause;
    let siteDateClause = "";
    let siteMatchClause = "";
    let sitesClause = "";

    const regionType = curve["region-type"];
    if (regionType === "Predefined region") {
      const regionStr = curve.region;
      const regionValues = (
        await matsCollections.region.findOneAsync({ name: "region" })
      ).valuesMap;
      const region = Object.keys(regionValues).find(
        (key) => regionValues[key] === regionStr
      );
      queryTableClause = `from ${databaseRef.sumsDB}.${model}_${region} as m0`;
      thresholdClause = `and m0.thresh_10 = ${threshold}`;
      statisticClause =
        "sum(m0.yy) as hit, sum(m0.yn) as fa, sum(m0.ny) as miss, sum(m0.nn) as cn, group_concat(m0.valid_time, ';', m0.yy, ';', m0.yn, ';', m0.ny, ';', m0.nn order by m0.valid_time) as sub_data, count(m0.yy) as n0";
      dateClause = `and m0.valid_time >= ${fromSecs} and m0.valid_time <= ${toSecs}`;
    } else {
      const obsTable =
        model.includes("ret_") || model.includes("Ret_") ? "retro_obs2p5" : "obs2p5";
      queryTableClause = `from ${databaseRef.modelDB}.${obsTable} as o, ${databaseRef.modelDB}.${model} as m0 `;
      statisticClause =
        "sum(if((m0.pm2p5_10 > {{threshold}}) and (o.pm2p5_10 > {{threshold}}),1,0)) as hit, sum(if((m0.pm2p5_10 > {{threshold}}) and NOT (o.pm2p5_10 > {{threshold}}),1,0)) as fa, " +
        "sum(if(NOT (m0.pm2p5_10 > {{threshold}}) and (o.pm2p5_10 > {{threshold}}),1,0)) as miss, sum(if(NOT (m0.pm2p5_10 > {{threshold}}) and NOT (o.pm2p5_10 > {{threshold}}),1,0)) as cn, " +
        "group_concat(ceil(3600*floor((m0.time+1800)/3600)), ';', if((m0.pm2p5_10 > {{threshold}}) and (o.pm2p5_10 > {{threshold}}),1,0), ';', " +
        "if((m0.pm2p5_10 > {{threshold}}) and NOT (o.pm2p5_10 > {{threshold}}),1,0), ';', if(NOT (m0.pm2p5_10 > {{threshold}}) and (o.pm2p5_10 > {{threshold}}),1,0), ';', " +
        "if(NOT (m0.pm2p5_10 > {{threshold}}) and NOT (o.pm2p5_10 > {{threshold}}),1,0) order by ceil(3600*floor((m0.time+1800)/3600))) as sub_data, count(m0.pm2p5_10) as n0";
      statisticClause = statisticClause.replace(/\{\{threshold\}\}/g, threshold);

      const siteMap = (
        await matsCollections.StationMap.findOneAsync({
          name: "stations",
        })
      ).optionsMap;
      const sitesList = curve.sites === undefined ? [] : curve.sites;
      let querySites = [];
      if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        querySites = sitesList.map(function (site) {
          const thisSite = site.includes(" | ") ? site.split(" | ")[0] : site;
          return siteMap.find((obj) => obj.origName === thisSite).options.id;
        });
        sitesClause = ` and m0.id in('${querySites.join("','")}')`;
      } else {
        throw new Error(
          "INFO:  Please add sites in order to get a single/multi station plot."
        );
      }
      dateClause = `and m0.time >= ${fromSecs} - 900 and m0.time <= ${toSecs} + 900`;
      siteDateClause = `and o.time >= ${fromSecs} - 900 and o.time <= ${toSecs} + 900`;
      siteMatchClause = "and m0.id = o.id and m0.time = o.time ";
    }

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    [statType] = statisticOptionsMap[statisticSelect];
    allStatTypes.push(statType);
    const axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    const idealVal = statisticOptionsMap[statisticSelect][2];
    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "select floor((m0.valid_time+1800)%(24*3600)/3600) as hr_of_day, " +
          "count(distinct ceil(3600*floor((m0.valid_time+1800)/3600))) as nTimes, " +
          "min(ceil(3600*floor((m0.valid_time+1800)/3600))) as min_secs, " +
          "max(ceil(3600*floor((m0.valid_time+1800)/3600))) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{siteMatchClause}} " +
          "{{sitesClause}} " +
          "{{dateClause}} " +
          "{{siteDateClause}} " +
          "{{thresholdClause}} " +
          "{{scaleClause}} " +
          "{{forecastLengthClause}} " +
          "group by hr_of_day " +
          "order by hr_of_day" +
          ";";

        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{siteMatchClause}}", siteMatchClause);
        statement = statement.replace("{{sitesClause}}", sitesClause);
        statement = statement.replace("{{thresholdClause}}", thresholdClause);
        statement = statement.replace("{{scaleClause}}", scaleClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        statement = statement.replace("{{siteDateClause}}", siteDateClause);
        if (regionType === "Select stations")
          statement = statement.replace(/m0\.valid_time/g, "m0.time");
        dataRequests[label] = statement;

        // send the query statement to the query function
        queryResult = await matsDataQueryUtils.queryDBSpecialtyCurve(
          global.sumPool,
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
    const cOptions = await matsDataCurveOpsUtils.generateSeriesCurveOptions(
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
  const result = await matsDataProcessUtils.processDataXYCurve(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  return result;
};
