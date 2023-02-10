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
} from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';

dataPerformanceDiagram = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.performanceDiagram,
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
  let error = '';
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const dataset = [];
  const axisMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    const { label } = curve;
    const binParam = curve['bin-parameter'];
    const binClause = matsCollections['bin-parameter'].findOne({
      name: 'bin-parameter',
    }).optionsMap[binParam];
    const model = matsCollections['data-source'].findOne({ name: 'data-source' })
      .optionsMap[curve['data-source']][0];
    var regionStr = curve.region;
    const region = Object.keys(
      matsCollections.region.findOne({ name: 'region' }).valuesMap
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: 'region' }).valuesMap[key] === regionStr
    );
    const source = curve.truth;
    let sourceStr = '';
    if (source !== 'All') {
      sourceStr = `_${source}`;
    }
    const queryTableClause = `from ${model}_${region}${sourceStr} as m0`;
    let thresholdClause = '';
    let validTimeClause = '';
    let forecastLengthClause = '';
    const dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    let dateString = '';
    let dateClause = '';
    if (binParam !== 'Threshold') {
      var thresholdStr = curve.threshold;
      if (thresholdStr === undefined) {
        throw new Error(
          `INFO:  ${label}'s threshold is undefined. Please assign it a value.`
        );
      }
      const threshold = Object.keys(
        matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap
      ).find(
        (key) =>
          matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[key] ===
          thresholdStr
      );
      thresholdClause = `and m0.thresh = ${threshold}`;
    }
    if (binParam !== 'Valid UTC hour') {
      const validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and m0.valid_time%(24*3600)/3600 IN(${validTimes})`;
      }
    }
    if (binParam !== 'Fcst lead time') {
      const forecastLength = curve['forecast-length'];
      if (forecastLength === undefined) {
        throw new Error(
          `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
        );
      }
      forecastLengthClause = `and m0.fcst_len = ${forecastLength}`;
    }
    if (binParam === 'Init Date') {
      dateString = 'm0.valid_time-m0.fcst_len*3600';
    } else {
      dateString = 'm0.valid_time';
    }
    dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
    const statisticSelect = 'PerformanceDiagram';
    var statType = 'ctc';
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable + statistic (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    curves[curveIndex].axisKey = statisticSelect; // stash the axisKey to use it later for axis options

    var d;
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      let statement =
        '{{binClause}} ' +
        'count(distinct {{dateString}}) as N_times, ' +
        'min({{dateString}}) as min_secs, ' +
        'max({{dateString}}) as max_secs, ' +
        '((sum(m0.yy)+0.00)/sum(m0.yy+m0.ny)) as pod, ((sum(m0.yn)+0.00)/sum(m0.yn+m0.yy)) as far, ' +
        "sum(m0.yy+m0.ny) as oy_all, sum(m0.yn+m0.nn) as on_all, group_concat(m0.valid_time, ';', m0.yy, ';', " +
        "m0.yn, ';', m0.ny, ';', m0.nn order by m0.valid_time) as sub_data, count(m0.yy) as N0 " +
        '{{queryTableClause}} ' +
        'where 1=1 ' +
        '{{dateClause}} ' +
        '{{thresholdClause}} ' +
        '{{validTimeClause}} ' +
        '{{forecastLengthClause}} ' +
        'group by binVal ' +
        'order by binVal' +
        ';';

      statement = statement.replace('{{binClause}}', binClause);
      statement = statement.replace('{{queryTableClause}}', queryTableClause);
      statement = statement.replace('{{thresholdClause}}', thresholdClause);
      statement = statement.replace('{{validTimeClause}}', validTimeClause);
      statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
      statement = statement.replace('{{dateClause}}', dateClause);
      statement = statement.split('{{dateString}}').join(dateString);
      dataRequests[label] = statement;

      var queryResult;
      const startMoment = moment();
      var finishMoment;
      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBPerformanceDiagram(
          sumPool,
          statement,
          appParams
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
      if (queryResult.error !== undefined && queryResult.error !== '') {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
          // this is NOT an error just a no data condition
          dataFoundForCurve = false;
        } else {
          // this is an error returned by the mysql database
          error += `Error from verification query: <br>${queryResult.error}<br> query: <br>${statement}<br>`;
          if (error.includes('ER_NO_SUCH_TABLE')) {
            throw new Error(
              `INFO:  The region/scale combination [${regionStr} and ${scaleStr}] is not supported by the database for the model [${model}]. ` +
                `Choose a different scale to continue using this region.`
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
        'INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves.'
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
    curve.axisKey = statisticSelect;
    curve.binParam = binParam;
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
    throw new Error('INFO:  No valid data for any curves.');
  }

  // process the data returned by the query
  const curveInfoParams = {
    curves,
    curvesLength,
    statType,
    axisMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataPerformanceDiagram(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
