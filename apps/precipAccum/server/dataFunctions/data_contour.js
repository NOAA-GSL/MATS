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
  const databaseRef = matsCollections.variable.findOne({ name: 'variable' }).optionsMap[
    variable
  ];
  const model = matsCollections['data-source'].findOne({ name: 'data-source' })
    .optionsMap[variable][curve['data-source']][0];
  const regionStr = curve.region;
  const region = Object.keys(
    matsCollections.region.findOne({ name: 'region' }).valuesMap
  ).find(
    (key) =>
      matsCollections.region.findOne({ name: 'region' }).valuesMap[key] === regionStr
  );
  const scaleStr = curve.scale;
  const grid_scale = Object.keys(
    matsCollections.scale.findOne({ name: 'scale' }).valuesMap[variable]
  ).find(
    (key) =>
      matsCollections.scale.findOne({ name: 'scale' }).valuesMap[variable][key] ===
      scaleStr
  );
  const queryTableClause = `from ${databaseRef}.${model}_${grid_scale}_${region} as m0`;
  let thresholdClause = '';
  const forecastLength = 0; // precip apps have no forecast length, but the query and matching algorithms still need it passed in.
  let dateClause = '';
  if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold') {
    const thresholdStr = curve.threshold;
    const threshold = Object.keys(
      matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[variable]
    ).find(
      (key) =>
        matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[variable][
          key
        ] === thresholdStr
    );
    thresholdClause = `and m0.trsh = ${threshold * 0.01}`;
  }
  const forecastTypeStr = curve['forecast-type'];
  const forecastType = Object.keys(
    matsCollections['forecast-type'].findOne({ name: 'forecast-type' }).valuesMap[
      variable
    ]
  ).find(
    (key) =>
      matsCollections['forecast-type'].findOne({ name: 'forecast-type' }).valuesMap[
        variable
      ][key] === forecastTypeStr
  );
  let forecastTypeClause;
  if (databaseRef === 'precip') {
    forecastTypeClause = `and m0.num_fcsts = ${forecastType}`;
  } else {
    forecastTypeClause = `and m0.accum_len = ${forecastType}`;
  }
  dateClause = `and m0.time >= ${fromSecs} and m0.time <= ${toSecs}`;
  const statisticSelect = curve.statistic;
  const statisticOptionsMap = matsCollections.statistic.findOne(
    { name: 'statistic' },
    { optionsMap: 1 }
  ).optionsMap;
  const statisticClause =
    "sum(m0.yy) as hit, sum(m0.ny) as fa, sum(m0.yn) as miss, sum(m0.nn) as cn, group_concat(m0.time, ';', m0.yy, ';', m0.ny, ';', m0.yn, ';', m0.nn order by m0.time) as sub_data, count(m0.yy) as N0";
  // For contours, this functions as the colorbar label.
  const statType = statisticOptionsMap[statisticSelect][0];
  curve.unitKey = statisticOptionsMap[statisticSelect][1];

  let d;
  // this is a database driven curve, not a difference curve
  // prepare the query from the above parameters
  let statement =
    '{{xValClause}} ' +
    '{{yValClause}} ' +
    'count(distinct m0.time) as N_times, ' +
    'min(m0.time) as min_secs, ' +
    'max(m0.time) as max_secs, ' +
    '{{statisticClause}} ' +
    '{{queryTableClause}} ' +
    'where 1=1 ' +
    '{{dateClause}} ' +
    '{{thresholdClause}} ' +
    '{{forecastTypeClause}} ' +
    'group by xVal,yVal ' +
    'order by xVal,yVal' +
    ';';

  statement = statement.replace('{{xValClause}}', xValClause);
  statement = statement.replace('{{yValClause}}', yValClause);
  statement = statement.replace('{{statisticClause}}', statisticClause);
  statement = statement.replace('{{queryTableClause}}', queryTableClause);
  statement = statement.replace('{{thresholdClause}}', thresholdClause);
  statement = statement.replace('{{forecastTypeClause}}', forecastTypeClause);
  statement = statement.replace('{{dateClause}}', dateClause);
  dataRequests[label] = statement;

  let queryResult;
  const startMoment = moment();
  let finishMoment;
  try {
    // send the query statement to the query function
    queryResult = matsDataQueryUtils.queryDBContour(
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
