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
dataDieoff = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.dieoff,
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
    const databaseRef = matsCollections.variable.findOne({ name: "variable" })
      .optionsMap[variable];
    const model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];
    let queryTableClause = "";

    let thresholdClause = "";
    const thresholdStr = curve.threshold;
    const threshold = Object.keys(
      matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable]
    ).find(
      (key) =>
        matsCollections.threshold.findOne({ name: "threshold" }).valuesMap[variable][
          key
        ] === thresholdStr
    );

    let validTimeClause = "";
    let validTimes;

    let utcCycleStartClause = "";
    let utcCycleStart;

    const forecastLengthStr = curve["dieoff-type"];
    const forecastLengthOptionsMap = matsCollections["dieoff-type"].findOne(
      { name: "dieoff-type" },
      { optionsMap: 1 }
    ).optionsMap;
    const forecastLength = forecastLengthOptionsMap[forecastLengthStr][0];

    let truthClause = "";
    let truth;
    if (variable === "15 Minute Visibility") {
      const truthStr = curve.truth;
      truth = Object.keys(
        matsCollections.truth.findOne({ name: "truth" }).valuesMap[variable]
      ).find(
        (key) =>
          matsCollections.truth.findOne({ name: "truth" }).valuesMap[variable][key] ===
          truthStr
      );
    }

    let statisticClause;
    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: "statistic" },
      { optionsMap: 1 }
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
      const region = Object.keys(
        matsCollections.region.findOne({ name: "region" }).valuesMap
      ).find(
        (key) =>
          matsCollections.region.findOne({ name: "region" }).valuesMap[key] ===
          regionStr
      );
      queryTableClause = `from ${databaseRef.sumsDB}.${model}_${region} as m0`;
      if (variable === "15 Minute Visibility") {
        truthClause = `and m0.truth = '${truth}'`;
      }
      thresholdClause = `and m0.trsh = ${threshold}`;
      statisticClause =
        "sum(m0.yy) as hit, sum(m0.yn) as fa, sum(m0.ny) as miss, sum(m0.nn) as cn, group_concat(m0.time, ';', m0.yy, ';', m0.yn, ';', m0.ny, ';', m0.nn order by m0.time) as sub_data, count(m0.yy) as N0";
      dateClause = `and m0.time >= ${fromSecs} and m0.time <= ${toSecs}`;
    } else {
      const obsTable =
        model.includes("ret_") || model.includes("Ret_") ? "obs_retro" : "obs";
      queryTableClause = `from ${databaseRef.modelDB}.${obsTable} as o, ${databaseRef.modelDB}.${model} as m0 `;
      statisticClause =
        "sum(if((m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0)) as hit, sum(if((m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0)) as fa, " +
        "sum(if(NOT (m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0)) as miss, sum(if(NOT (m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0)) as cn, " +
        "group_concat(ceil(3600*floor((m0.time+1800)/3600)), ';', if((m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0), ';', " +
        "if((m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0), ';', if(NOT (m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0), ';', " +
        "if(NOT (m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0) order by ceil(3600*floor((m0.time+1800)/3600))) as sub_data, count(m0.ceil) as N0";
      statisticClause = statisticClause.replace(/\{\{threshold\}\}/g, threshold);
      if (variable.includes("Visibility")) {
        statisticClause = statisticClause.replace(/m0\.ceil/g, "m0.vis100");
        if (truth !== "qc") {
          statisticClause = statisticClause.replace(/o\.ceil/g, `o.vis_${truth}`);
        } else {
          statisticClause = statisticClause.replace(/o\.ceil/g, "o.vis_closest");
          truthClause = "and o.vis_std < 2.4";
        }
      }

      const siteMap = matsCollections.StationMap.findOne(
        { name: "stations" },
        { optionsMap: 1 }
      ).optionsMap;
      const sitesList = curve.sites === undefined ? [] : curve.sites;
      let querySites = [];
      if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        querySites = sitesList.map(function (site) {
          return siteMap.find((obj) => obj.origName === site).options.id;
        });
        sitesClause = ` and m0.madis_id in('${querySites.join("','")}')`;
      } else {
        throw new Error(
          "INFO:  Please add sites in order to get a single/multi station plot."
        );
      }
      dateClause = `and m0.time >= ${fromSecs} - 300 and m0.time <= ${toSecs} + 300`;
      siteDateClause = `and o.time >= ${fromSecs} - 300 and o.time <= ${toSecs} + 300`;
      siteMatchClause = "and m0.madis_id = o.madis_id and m0.time = o.time ";
    }

    if (forecastLength === matsTypes.ForecastTypes.dieoff) {
      validTimes = curve["valid-time"] === undefined ? [] : curve["valid-time"];
      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and floor((m0.time+450)%(24*3600)/900)/4 IN(${validTimes})`;
      }
    } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
      utcCycleStart =
        curve["utc-cycle-start"] === undefined ? [] : curve["utc-cycle-start"];
      if (utcCycleStart.length !== 0 && utcCycleStart !== matsTypes.InputTypes.unused) {
        utcCycleStartClause = `and floor(((m0.time+450) - (m0.fcst_len*60+m0.fcst_min)*60)%(24*3600)/900)/4 IN(${utcCycleStart})`;
      }
      if (regionType === "Predefined region") {
        dateClause = `and m0.time-(m0.fcst_len*60+m0.fcst_min)*60 >= ${fromSecs} and m0.time-(m0.fcst_len*60+m0.fcst_min)*60 <= ${toSecs}`;
      } else {
        dateClause = `and m0.time-(m0.fcst_len*60+m0.fcst_min)*60 >= ${fromSecs} - 300 and m0.time-(m0.fcst_len*60+m0.fcst_min)*60 <= ${toSecs} + 300`;
      }
    } else {
      dateClause = `and m0.time-(m0.fcst_len*60+m0.fcst_min)*60 = ${fromSecs}`;
    }

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    [statType] = statisticOptionsMap[statisticSelect];
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
          "select m0.fcst_len + (m0.fcst_min/60) as fcst_lead, " +
          "count(distinct ceil(900*floor((m0.time+450)/900))) as N_times, " +
          "min(ceil(900*floor((m0.time+450)/900))) as min_secs, " +
          "max(ceil(900*floor((m0.time+450)/900))) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{siteMatchClause}} " +
          "{{sitesClause}} " +
          "{{dateClause}} " +
          "{{siteDateClause}} " +
          "{{thresholdClause}} " +
          "{{validTimeClause}} " +
          "{{utcCycleStartClause}} " +
          "{{truthClause}} " +
          "group by fcst_lead " +
          "order by fcst_lead" +
          ";";

        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{siteMatchClause}}", siteMatchClause);
        statement = statement.replace("{{sitesClause}}", sitesClause);
        statement = statement.replace("{{thresholdClause}}", thresholdClause);
        statement = statement.replace("{{validTimeClause}}", validTimeClause);
        statement = statement.replace("{{truthClause}}", truthClause);
        statement = statement.replace("{{utcCycleStartClause}}", utcCycleStartClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        statement = statement.replace("{{siteDateClause}}", siteDateClause);
        if (variable.includes("Visibility")) {
          statement = statement.replace(/o\.time/g, "o.valid_time");
        }
        dataRequests[label] = statement;

        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
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
        statType === "ctc",
        statType === "scalar"
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
