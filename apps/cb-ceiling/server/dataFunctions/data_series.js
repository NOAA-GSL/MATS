/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsCollections } from "meteor/randyp:mats-common";
import { matsTypes } from "meteor/randyp:mats-common";
import { matsDataUtils } from "meteor/randyp:mats-common";
import { matsDataQueryUtils } from "meteor/randyp:mats-common";
import { matsDataDiffUtils } from "meteor/randyp:mats-common";
import { matsDataCurveOpsUtils } from "meteor/randyp:mats-common";
import { matsDataProcessUtils } from "meteor/randyp:mats-common";
import { moment } from "meteor/momentjs:moment";

dataSeries = function (plotParams, plotFunction)
{
  var fs = require("fs");

  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.timeSeries,
    matching: plotParams["plotAction"] === matsTypes.PlotActions.matched,
    completeness: plotParams["completeness"],
    outliers: plotParams["outliers"],
    hideGaps: plotParams["noGapsCheck"],
    hasLevels: false,
  };
  var dataRequests = {}; // used to store data queries
  var dataFoundForCurve = true;
  var dataFoundForAnyCurve = false;
  var totalProcessingStart = moment();
  var dateRange = matsDataUtils.getDateRange(plotParams.dates);
  console.log(JSON.stringify(plotParams, null, 2));
  var fromSecs = dateRange.fromSeconds;
  var toSecs = dateRange.toSeconds;
  var error = "";
  var curves = JSON.parse(JSON.stringify(plotParams.curves));
  var curvesLength = curves.length;
  var dataset = [];
  var utcCycleStarts = [];
  var axisMap = Object.create(null);
  var xmax = -1 * Number.MAX_VALUE;
  var ymax = -1 * Number.MAX_VALUE;
  var xmin = Number.MAX_VALUE;
  var ymin = Number.MAX_VALUE;
  var idealValues = [];
  var statement = "";
  var queryTemplate = null;

  for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++)
  {
    // initialize variables specific to each curve

    var curve = curves[curveIndex];
    var regionType = curve["region-type"];
    var queryTemplate = null;
    var diffFrom = curve.diffFrom;
    var label = curve["label"];
    var variable = curve["variable"];
    var model = matsCollections["data-source"].findOne({ name: "data-source" })
      .optionsMap[variable][curve["data-source"]][0];
    var thresholdStr = curve["threshold"];
    var threshold = Object.keys(
      matsCollections["threshold"].findOne({ name: "threshold" }).valuesMap[
      variable
      ]
    ).find(
      (key) =>
        matsCollections["threshold"].findOne({ name: "threshold" }).valuesMap[
        variable
        ][key] === thresholdStr
    );
    threshold = threshold.replace(/_/g, ".");

    var validTimes =
      curve["valid-time"] === undefined ? [] : curve["valid-time"];

    var forecastLength = curve["forecast-length"];
    var statisticSelect = curve["statistic"];
    var statisticOptionsMap = matsCollections["statistic"].findOne(
      { name: "statistic" },
      { optionsMap: 1 }
    )["optionsMap"];

    var averageStr = curve["average"];
    var averageOptionsMap = matsCollections["average"].findOne(
      { name: "average" },
      { optionsMap: 1 }
    )["optionsMap"];
    var average = averageOptionsMap[averageStr][0];

    if (regionType === "Predefined region")
    {
      var regionStr = curve["region"];
      var region = Object.keys(
        matsCollections["region"].findOne({ name: "region" }).valuesMap
      ).find(
        (key) =>
          matsCollections["region"].findOne({ name: "region" }).valuesMap[
          key
          ] === regionStr
      );
      // SQL template replacements
      queryTemplate = fs.readFileSync("assets/app/sqlTemplates/tmpl_TimeSeries_region.sql", "utf8");
      queryTemplate = queryTemplate.replace(/vxMODEL/g, model);
      queryTemplate = queryTemplate.replace(/vxREGION/g, region);
      queryTemplate = queryTemplate.replace(/vxFROM_SECS/g, fromSecs);
      queryTemplate = queryTemplate.replace(/vxTO_SECS/g, toSecs);
      queryTemplate = queryTemplate.replace(/vxTHRESHOLD/g, threshold);
      queryTemplate = queryTemplate.replace(/vxFCST_LEN/g, forecastLength);
      queryTemplate = queryTemplate.replace(/vxAVERAGE/g, average);

      if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused)
      {
        queryTemplate = queryTemplate.replace(
          /vxVALID_TIMES/g,
          cbPool.trfmListToCSVString(validTimes, null, false)
        );
      } else
      {
        queryTemplate = cbPool.trfmSQLRemoveClause(
          queryTemplate,
          "vxVALID_TIMES"
        );
      }

    } else
    {
      var sitesList = curve["sites"] === undefined ? [] : curve["sites"];
      if (sitesList.length == 0 && sitesList === matsTypes.InputTypes.unused)
      {
        throw new Error(
          "INFO:  Please add sites in order to get a single/multi station plot."
        );
      }
    }

    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    var statType = statisticOptionsMap[statisticSelect][0];
    var axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    var idealVal = statisticOptionsMap[statisticSelect][2];
    if (idealVal !== null && idealValues.indexOf(idealVal) === -1)
    {
      idealValues.push(idealVal);
    }

    var d;
    if (diffFrom == null)
    {
      dataRequests[label] = statement;

      // math is done on forecastLength later on -- set all analyses to 0
      if (forecastLength === "-99")
      {
        forecastLength = "0";
      }

      var queryResult;
      var startMoment = moment();
      var finishMoment;
      try
      {
        if (regionType === "Predefined region")
        {
          statement = cbPool.trfmSQLForDbTarget(queryTemplate);

          // send the query statement to the query function
          queryResult = matsDataQueryUtils.queryDBTimeSeries(
            cbPool,
            statement,
            model,
            forecastLength,
            fromSecs,
            toSecs,
            averageStr,
            statisticSelect,
            validTimes,
            appParams,
            false
          );
        }
        else
        {
          // send to matsMiddle
          var tss = new matsMiddle.MatsMiddleTimeSeriesStations(cbPool);
          let rows = [];
          rows = tss.processStationQuery("Ceiling", sitesList, model, forecastLength, threshold, average, fromSecs, toSecs, validTimes, true);
          console.log("matsMiddle done!");

          // send the query statement to the query function
          queryResult = matsDataQueryUtils.queryDBTimeSeriesMT(
            cbPool,
            rows,
            model,
            forecastLength,
            fromSecs,
            toSecs,
            averageStr,
            statisticSelect,
            validTimes,
            appParams,
            false
          );
        }

        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + label] = {
          begin: startMoment.format(),
          finish: finishMoment.format(),
          duration:
            moment.duration(finishMoment.diff(startMoment)).asSeconds() +
            " seconds",
          recordCount: queryResult.data.x.length,
        };
        // get the data back from the query
        d = queryResult.data;
      } catch (e)
      {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message =
          "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
      }
      if (queryResult.error !== undefined && queryResult.error !== "")
      {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND)
        {
          // this is NOT an error just a no data condition
          dataFoundForCurve = false;
        } else
        {
          // this is an error returned by the mysql database
          error +=
            "Error from verification query: <br>" +
            queryResult.error +
            "<br> query: <br>" +
            statement +
            "<br>";
          throw new Error(error);
        }
      } else
      {
        dataFoundForAnyCurve = true;
      }

      // set axis limits based on returned data
      var postQueryStartMoment = moment();
      if (dataFoundForCurve)
      {
        xmin = xmin < d.xmin ? xmin : d.xmin;
        xmax = xmax > d.xmax ? xmax : d.xmax;
        ymin = ymin < d.ymin ? ymin : d.ymin;
        ymax = ymax > d.ymax ? ymax : d.ymax;
      }
    } else
    {
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
    const mean = d.sum / d.x.length;
    const annotation =
      mean === undefined
        ? label + "- mean = NoData"
        : label + "- mean = " + mean.toPrecision(4);
    curve["annotation"] = annotation;
    curve["xmin"] = d.xmin;
    curve["xmax"] = d.xmax;
    curve["ymin"] = d.ymin;
    curve["ymax"] = d.ymax;
    curve["axisKey"] = axisKey;
    const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(
      curve,
      curveIndex,
      axisMap,
      d,
      appParams
    ); // generate plot with data, curve annotation, axis labels, etc.
    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + label] = {
      begin: postQueryStartMoment.format(),
      finish: postQueryFinishMoment.format(),
      duration:
        moment
          .duration(postQueryFinishMoment.diff(postQueryStartMoment))
          .asSeconds() + " seconds",
    };
  } // end for curves

  if (!dataFoundForAnyCurve)
  {
    // we found no data for any curves so don't bother proceeding
    throw new Error("INFO:  No valid data for any curves.");
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves: curves,
    curvesLength: curvesLength,
    idealValues: idealValues,
    utcCycleStarts: utcCycleStarts,
    statType: statType,
    axisMap: axisMap,
    xmax: xmax,
    xmin: xmin,
  };
  const bookkeepingParams = {
    dataRequests: dataRequests,
    totalProcessingStart: totalProcessingStart,
  };
  var result = matsDataProcessUtils.processDataXYCurve(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
