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
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  const totalProcessingStart = moment();
  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;
  const xAxisParam = plotParams['x-axis-parameter'];
  const yAxisParam = plotParams['y-axis-parameter'];
  const xValClause = matsCollections.PlotParams.findOne({ name: 'x-axis-parameter' })
    .optionsMap[xAxisParam];
  const yValClause = matsCollections.PlotParams.findOne({ name: 'y-axis-parameter' })
    .optionsMap[yAxisParam];
  let error = '';
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  if (curves.length > 1) {
    throw new Error('INFO:  There must only be one added curve.');
  }
  const dataset = [];
  const axisMap = Object.create(null);

  // initialize variables specific to the curve
  const curve = curves[0];
  const { label } = curve;
  const { variable } = curve;
  const model = matsCollections['data-source'].findOne({ name: 'data-source' })
    .optionsMap[variable][curve['data-source']][0];
  const modelClause = `AND m0.model='${model}' `;
  const queryTableClause = 'from vxDBTARGET  m0';
  let validTimeClause = '';
  let forecastLengthClause = '';
  let dateString = '';
  if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold') {
    const thresholdStr = curve.threshold;
    if (thresholdStr === undefined) {
      throw new Error(
        `INFO:  ${label}'s threshold is undefined. Please assign it a value.`
      );
    }
    var threshold = Object.keys(
      matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[variable]
    ).find(
      (key) =>
        matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[variable][
          key
        ] === thresholdStr
    );
    threshold = threshold.replace(/_/g, '.');
  }
  if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
    const validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
      validTimeClause = `and m0.fcstValidEpoch%(24*3600)/3600 IN[${validTimes}]`;
    }
  }
  if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
    const forecastLength = curve['forecast-length'];
    if (forecastLength === undefined) {
      throw new Error(
        `INFO:  ${label}'s forecast lead time is undefined. Please assign it a value.`
      );
    }
    forecastLengthClause = `and m0.fcstLen = ${forecastLength}`;
  }
  if (
    (xAxisParam === 'Init Date' || yAxisParam === 'Init Date') &&
    xAxisParam !== 'Valid Date' &&
    yAxisParam !== 'Valid Date'
  ) {
    dateString = 'm0.fcstValidEpoch-m0.fcstLen*3600';
  } else {
    dateString = 'm0.fcstValidEpoch';
  }
  const regionType = curve['region-type'];
  if (regionType === 'Select stations') {
    throw new Error(
      'INFO:  Single/multi station plotting is not available for performance diagrams.'
    );
  }
  const regionStr = curve.region;
  const region = Object.keys(
    matsCollections.region.findOne({ name: 'region' }).valuesMap
  ).find(
    (key) =>
      matsCollections.region.findOne({ name: 'region' }).valuesMap[key] === regionStr
  );
  const regionClause = `AND m0.region='${region}' `;
  const statisticSelect = curve.statistic;
  const statisticOptionsMap = matsCollections.statistic.findOne(
    { name: 'statistic' },
    { optionsMap: 1 }
  ).optionsMap;
  const statisticClause =
    `sum(m0.data.['${threshold}'].hits) hit, sum(m0.data.['${threshold}'].false_alarms) fa, ` +
    `sum(m0.data.['${threshold}'].misses) miss, sum(m0.data.['${threshold}'].correct_negatives) cn, ` +
    `ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['${threshold}'].hits) || ';' || ` +
    `TO_STRING(m0.data.['${threshold}'].false_alarms) || ';' || TO_STRING(m0.data.['${threshold}'].misses) || ';' || ` +
    `TO_STRING(m0.data.['${threshold}'].correct_negatives))) sub_data, count(m0.data.['${threshold}'].hits) N0 `;
  const dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
  const whereClause =
    'WHERE ' +
    "m0.type='DD' " +
    "AND m0.docType='CTC' " +
    "AND m0.subset='METAR' " +
    "AND m0.version='V01' ";
  // For contours, this functions as the colorbar label.
  const statType = statisticOptionsMap[statisticSelect][0];
  curve.unitKey = statisticOptionsMap[statisticSelect][1];

  let d = {};
  // this is a database driven curve, not a difference curve
  // prepare the query from the above parameters
  let statement =
    'SELECT {{xValClause}} AS xVal, ' +
    '{{yValClause}} yVal, ' +
    'COUNT(DISTINCT m0.fcstValidEpoch) N_times, ' +
    'MIN(m0.fcstValidEpoch) min_secs, ' +
    'MAX(m0.fcstValidEpoch) max_secs, ' +
    '{{statisticClause}} ' +
    '{{queryTableClause}} ' +
    '{{whereClause}} ' +
    '{{modelClause}} ' +
    '{{regionClause}} ' +
    '{{dateClause}} ' +
    '{{validTimeClause}} ' +
    '{{forecastLengthClause}} ' +
    'GROUP BY {{xValClause}}, {{yValClause}} ' +
    'ORDER BY xVal,yVal' +
    ';';

  statement = statement.split('{{xValClause}}').join(xValClause);
  statement = statement.split('{{yValClause}}').join(yValClause);
  statement = statement.replace('{{statisticClause}}', statisticClause);
  statement = statement.replace('{{queryTableClause}}', queryTableClause);
  statement = statement.replace('{{whereClause}}', whereClause);
  statement = statement.replace('{{modelClause}}', modelClause);
  statement = statement.replace('{{regionClause}}', regionClause);
  statement = statement.replace('{{validTimeClause}}', validTimeClause);
  statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
  statement = statement.replace('{{dateClause}}', dateClause);

  statement = cbPool.trfmSQLForDbTarget(statement);
  dataRequests[label] = statement;

  let queryResult;
  const startMoment = moment();
  let finishMoment;
  try {
    // send the query statement to the query function
    queryResult = matsDataQueryUtils.queryDBContour(
      cbPool,
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
      recordCount: queryResult.data.xTextOutput.length,
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
      throw new Error(error);
    }
  }

  if (!dataFoundForCurve) {
    // we found no data for any curves so don't bother proceeding
    throw new Error('INFO:  No valid data for any curves.');
  }

  const postQueryStartMoment = moment();
  // set curve annotation to be the curve mean -- may be recalculated later
  // also pass previously calculated axis stats to curve options
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
