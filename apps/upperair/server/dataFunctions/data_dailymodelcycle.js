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

/* eslint-disable no-await-in-loop */

global.dataDailyModelCycle = async function (plotParams) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.dailyModelCycle,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
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

    const { database } = curve;
    const databaseRef = (
      await matsCollections.database.findOneAsync({ name: "database" })
    ).optionsMap[database];
    let model = (
      await matsCollections["data-source"].findOneAsync({ name: "data-source" })
    ).optionsMap[database][curve["data-source"]][0];

    let queryTableClause = "";
    const regionType = curve["region-type"];

    const variableStr = curve.variable;
    const variableOptionsMap = (
      await matsCollections.variable.findOneAsync({ name: "variable" })
    ).optionsMap;
    const variable = variableOptionsMap[regionType][variableStr];

    if (curve["utc-cycle-start"].length !== 1) {
      throw new Error(
        "INFO:  Please select exactly one UTC Cycle Init Hour for this plot type."
      );
    }
    const utcCycleStart = Number(curve["utc-cycle-start"][0]);
    utcCycleStarts[curveIndex] = utcCycleStart;
    const utcCycleStartClause = `and floor(((unix_timestamp(m0.date)+3600*m0.hour) - m0.fcst_len*3600)%(24*3600)/3600) IN(${utcCycleStart})`;

    let forecastLengthClause = "and m0.fcst_len < 24";
    if (database.includes("RAOBs") && regionType === "Predefined region") {
      // we're just getting the obs from table m1, so only need fcst_len = 0
      forecastLengthClause += " and m1.fcst_len = 0";
    }

    const statisticSelect = curve.statistic;
    const statisticOptionsMap = (
      await matsCollections.statistic.findOneAsync({ name: "statistic" })
    ).optionsMap;

    let levelVar;
    let levelClause = "";
    const { top } = curve;
    const { bottom } = curve;

    let siteDateClause = "";
    let siteLevelClause = "";
    let siteMatchClause = "";
    let sitesClause = "";
    let NAggregate;
    let NClause;

    if (regionType === "Predefined region") {
      levelClause = `and m0.mb10 >= ${top}/10 and m0.mb10 <= ${bottom}/10`;
      if (database.includes("RAOBs")) {
        siteMatchClause =
          "and m0.date = m1.date and m0.hour = m1.hour and m0.mb10 = m1.mb10";
      }
      NAggregate = "sum";
      [, NClause] = variable;
      levelVar = "m0.mb10 * 10";

      const regionStr = curve.region;
      const regionDB = database.includes("RAOBs") ? "ID" : "shortName";
      const regionValues = (
        await matsCollections.region.findOneAsync({ name: "region" })
      ).valuesMap[regionDB];
      const region = Object.keys(regionValues).find(
        (key) => regionValues[key] === regionStr
      );
      queryTableClause = `from ${databaseRef.sumsDB}.${model}${region} as m0`;
      if (database.includes("RAOBs")) {
        // Most of the RAOBs tables don't store a model sum or an obs sum for some reason.
        // So, we get the obs sum from HRRR_OPS, HRRR_HI, or GFS, because the obs are the same across all models.
        // Then we get the model sum by adding the obs sum to the bias sum (bias = model-obs).
        // We exclude GSL's main models, which do have all the sums.
        const modelsToExclude = [
          "ncep_oper_Areg",
          "RAP_130_Areg",
          "RAP_Areg",
          "HRRR_Areg",
        ];
        if (modelsToExclude.includes(model)) {
          queryTableClause = `${queryTableClause}, ${databaseRef.sumsDB}.${model}${region} as m1`;
        } else if (["5", "14", "15", "16", "17", "18"].includes(region.toString())) {
          queryTableClause = `${queryTableClause}, ${databaseRef.sumsDB}.HRRR_OPS_Areg${region} as m1`;
        } else if (region.toString() === "19") {
          queryTableClause = `${queryTableClause}, ${databaseRef.sumsDB}.HRRR_HI_Areg${region} as m1`;
        } else {
          queryTableClause = `${queryTableClause}, ${databaseRef.sumsDB}.GFS_Areg${region} as m1`;
        }
      } else if (database.includes("Vapor")) {
        queryTableClause = queryTableClause.replace("_sums", "_vapor_sums");
      }
    } else {
      if (database.includes("AMDAR")) {
        throw new Error(
          "Single/multi-station plotting is not supported by the AMDAR databse."
        );
      }
      siteDateClause = `and unix_timestamp(o.date)+3600*o.hour >= ${fromSecs} - 1800 and unix_timestamp(o.date)+3600*o.hour <= ${toSecs} + 1800`;
      levelClause = `and ceil((m0.press-25)/50)*50 >= ${top} and ceil((m0.press-25)/50)*50 <= ${bottom}`;
      siteLevelClause = `and ceil((o.press-25)/50)*50 >= ${top} and ceil((o.press-25)/50)*50 <= ${bottom}`;
      siteMatchClause =
        "and m0.wmoid = o.wmoid and m0.date = o.date and m0.hour = o.hour and m0.press = o.press";
      NAggregate = "count";
      NClause = "1";
      levelVar = "ceil((m0.press-25)/50)*50";

      // remove table prefixes
      const modelComponents = model.split("_");
      [model] = modelComponents;
      if (modelComponents.length > 1) {
        for (let midx = 1; midx < modelComponents.length - 1; midx += 1) {
          model = `${model}_${modelComponents[midx]}`;
        }
      }
      const obsTable = "RAOB";
      queryTableClause = `from ${databaseRef.modelDB}.${obsTable} as o, ${databaseRef.modelDB}.${model} as m0 `;

      const siteMap = (
        await matsCollections.StationMap.findOneAsync({
          name: "stations",
        })
      ).optionsMap;
      const sitesList = curve.sites === undefined ? [] : curve.sites;
      let querySites = [];
      if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        querySites = sitesList.map(function (site) {
          const possibleSiteNames = site.match(/\(([^)]*)\)[^(]*$/);
          const thisSite =
            possibleSiteNames === null
              ? site
              : possibleSiteNames[possibleSiteNames.length - 1];
          return siteMap.find((obj) => obj.origName === thisSite).options.id;
        });
        sitesClause = ` and m0.wmoid in('${querySites.join("','")}')`;
      } else {
        throw new Error(
          "INFO:  Please add sites in order to get a single/multi station plot."
        );
      }
    }

    const dateClause = `and unix_timestamp(m0.date)+3600*m0.hour >= ${fromSecs} - 1800 and unix_timestamp(m0.date)+3600*m0.hour <= ${toSecs} + 1800`;

    const statisticClause =
      `sum(${variable[0]}) as square_diff_sum, ${NAggregate}(${variable[1]}) as N_sum, sum(${variable[2]}) as obs_model_diff_sum, sum(${variable[3]}) as model_sum, sum(${variable[4]}) as obs_sum, sum(${variable[5]}) as abs_sum, ` +
      `group_concat(unix_timestamp(m0.date)+3600*m0.hour, ';', ${levelVar}, ';', ${variable[0]}, ';', ${NClause}, ';', ${variable[2]}, ';', ${variable[3]}, ';', ${variable[4]}, ';', ${variable[5]} order by unix_timestamp(m0.date)+3600*m0.hour, ${levelVar}) as sub_data, count(${variable[0]}) as n0`;

    let phaseClause = "";
    if (database.includes("AMDAR")) {
      const phaseStr = curve.phase;
      const phaseOptionsMap = (
        await matsCollections.phase.findOneAsync({ name: "phase" })
      ).optionsMap;
      phaseClause = phaseOptionsMap[phaseStr];
    }

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    const { statVarUnitMap } = await matsCollections.variable.findOneAsync({
      name: "variable",
    });
    statType = statisticOptionsMap[statisticSelect];
    allStatTypes.push(statType);
    const varUnits = statVarUnitMap[statisticSelect][variableStr];
    const axisKey = varUnits;
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

    let d;
    if (!diffFrom) {
      let queryResult;
      const startMoment = moment();
      let finishMoment;
      try {
        statement =
          "select unix_timestamp(m0.date)+3600*m0.hour as avtime, " +
          "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as nTimes, " +
          "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
          "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
          "{{statisticClause}} " +
          "{{queryTableClause}} " +
          "where 1=1 " +
          "{{siteMatchClause}} " +
          "{{sitesClause}} " +
          "{{dateClause}} " +
          "{{siteDateClause}} " +
          "{{utcCycleStartClause}} " +
          "{{forecastLengthClause}} " +
          "{{levelClause}} " +
          "{{siteLevelClause}} " +
          "{{phaseClause}} " +
          "group by avtime " +
          "order by avtime" +
          ";";

        statement = statement.replace("{{statisticClause}}", statisticClause);
        statement = statement.replace("{{queryTableClause}}", queryTableClause);
        statement = statement.replace("{{siteMatchClause}}", siteMatchClause);
        statement = statement.replace("{{sitesClause}}", sitesClause);
        statement = statement.replace("{{utcCycleStartClause}}", utcCycleStartClause);
        statement = statement.replace("{{forecastLengthClause}}", forecastLengthClause);
        statement = statement.replace("{{levelClause}}", levelClause);
        statement = statement.replace("{{siteLevelClause}}", siteLevelClause);
        statement = statement.replace("{{phaseClause}}", phaseClause);
        statement = statement.replace("{{dateClause}}", dateClause);
        statement = statement.replace("{{siteDateClause}}", siteDateClause);
        if (database.includes("AMDAR")) {
          // AMDAR tables have all partial sums so we can get them all from the main table
          statement = statement.split("m1").join("m0");
        }
        dataRequests[label] = statement;

        // send the query statement to the query function
        queryResult = await matsDataQueryUtils.queryDBSpecialtyCurve(
          global.sumPool,
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
              `INFO:  The statistic/variable combination [${statisticSelect} and ${variableStr}] is not supported by the database for this model and region].`
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
