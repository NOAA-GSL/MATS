/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
  matsCollections,
  matsTypes,
  matsDataUtils,
  matsDataQueryUtils,
  matsDataCurveOpsUtils,
  matsDataPlotOpsUtils,
} from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';

dataMap = function (plotParams, plotFunction) {
  const appParams = {
    plotType: matsTypes.PlotTypes.map,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: false,
    isCouchbase: true,
  };
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  const totalProcessingStart = moment();
  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;
  let error = '';
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  if (curves.length > 1) {
    throw new Error('INFO:  There must only be one added curve.');
  }
  const dataset = [];
  const curve = curves[0];
  const { label } = curve;
  const { variable } = curve;
  const model = matsCollections['data-source'].findOne({ name: 'data-source' })
    .optionsMap[variable][curve['data-source']][0];
  const modelClause = `AND m0.model='${model}' `;
  const queryTableClause =
    'from vxDBTARGET  AS m0 ' +
    'JOIN mdata AS o ' +
    'ON o.fcstValidEpoch = m0.fcstValidEpoch ' +
    'UNNEST o.data AS odata ' +
    'UNNEST m0.data AS m0data ';
  const siteMap = matsCollections.StationMap.findOne(
    { name: 'stations' },
    { optionsMap: 1 }
  ).optionsMap;
  const thresholdStr = curve.threshold;
  let threshold = Object.keys(
    matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[variable]
  ).find(
    (key) =>
      matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[variable][
        key
      ] === thresholdStr
  );
  threshold = threshold.replace(/_/g, '.');
  let validTimeClause = '';
  const validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
  if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
    validTimeClause = `and m0.fcstValidEpoch%(24*3600)/3600 IN[${validTimes}]`;
  }
  const forecastLength = curve['forecast-length'];
  const forecastLengthClause = `AND m0.fcstLen = ${forecastLength}`;
  const { statistic } = curve;
  const sitesList = curve.sites === undefined ? [] : curve.sites;
  if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
    var sitesClause = ` and m0data.name in ['${sitesList.join("','")}']`;
    sitesClause = `${sitesClause} and odata.name in ['${sitesList.join("','")}']`;
    var siteMatchClause = 'and m0data.name = odata.name ';
  } else {
    throw new Error(
      'INFO:  Please add sites in order to get a single/multi station plot.'
    );
  }
  const statisticClause =
    `SUM(CASE WHEN m0data.Ceiling < ${threshold} ` +
    `AND odata.Ceiling < ${threshold} THEN 1 ELSE 0 END) AS hit, ` +
    `SUM(CASE WHEN m0data.Ceiling < ${threshold} ` +
    `AND NOT odata.Ceiling < ${threshold} THEN 1 ELSE 0 END) AS fa, ` +
    `SUM(CASE WHEN NOT m0data.Ceiling < ${threshold} ` +
    `AND odata.Ceiling < ${threshold} THEN 1 ELSE 0 END) AS miss, ` +
    `SUM(CASE WHEN NOT m0data.Ceiling < ${threshold} ` +
    `AND NOT odata.Ceiling < ${threshold} THEN 1 ELSE 0 END) AS cn, ` +
    `SUM(CASE WHEN m0data.Ceiling IS NOT MISSING ` +
    `AND odata.Ceiling IS NOT MISSING THEN 1 ELSE 0 END) AS N0, ` +
    `ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || CASE WHEN m0data.Ceiling < ${threshold} ` +
    `AND odata.Ceiling < ${threshold} THEN '1' ELSE '0' END || ';' || CASE WHEN m0data.Ceiling < ${threshold} ` +
    `AND NOT odata.Ceiling < ${threshold} THEN '1' ELSE '0' END || ';' || CASE WHEN NOT m0data.Ceiling < ${threshold} ` +
    `AND odata.Ceiling < ${threshold} THEN '1' ELSE '0' END || ';' || CASE WHEN NOT m0data.Ceiling < ${threshold} ` +
    `AND NOT odata.Ceiling < ${threshold} THEN '1' ELSE '0' END) AS sub_data `;
  const dateClause = `and m0.fcstValidEpoch >= ${fromSecs} and m0.fcstValidEpoch <= ${toSecs} and m0.fcstValidEpoch = o.fcstValidEpoch`;
  const whereClause =
    "AND m0.type='DD' " +
    "AND m0.docType='model' " +
    "AND m0.subset='METAR' " +
    "AND m0.version='V01' ";
  const siteDateClause = `and o.fcstValidEpoch >= ${fromSecs} and o.fcstValidEpoch <= ${toSecs}`;
  const siteWhereClause =
    "WHERE o.type='DD' " +
    "AND o.docType='obs' " +
    "AND o.subset='METAR' " +
    "AND o.version='V01' ";

  let statement =
    'SELECT m0data.name as sta_id, ' +
    'COUNT(DISTINCT m0.fcstValidEpoch) N_times, ' +
    'MIN(m0.fcstValidEpoch) min_secs, ' +
    'MAX(m0.fcstValidEpoch) max_secs, ' +
    '{{statisticClause}} ' +
    '{{queryTableClause}} ' +
    '{{siteWhereClause}} ' +
    '{{whereClause}} ' +
    '{{modelClause}} ' +
    '{{forecastLengthClause}} ' +
    '{{validTimeClause}} ' +
    '{{siteDateClause}} ' +
    '{{dateClause}} ' +
    '{{sitesClause}} ' +
    '{{siteMatchClause}} ' +
    'GROUP BY m0data.name ' +
    'ORDER BY sta_id' +
    ';';

  statement = statement.replace('{{statisticClause}}', statisticClause);
  statement = statement.replace('{{queryTableClause}}', queryTableClause);
  statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
  statement = statement.replace('{{sitesClause}}', sitesClause);
  statement = statement.replace('{{whereClause}}', whereClause);
  statement = statement.replace('{{siteWhereClause}}', siteWhereClause);
  statement = statement.replace('{{modelClause}}', modelClause);
  statement = statement.replace('{{validTimeClause}}', validTimeClause);
  statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
  statement = statement.replace('{{dateClause}}', dateClause);
  statement = statement.replace('{{siteDateClause}}', siteDateClause);

  statement = cbPool.trfmSQLForDbTarget(statement);
  dataRequests[label] = statement;

  let queryResult;
  const startMoment = moment();
  let finishMoment;
  try {
    // send the query statement to the query function
    queryResult = matsDataQueryUtils.queryDBMapCTC(
      cbPool,
      statement,
      model,
      statistic,
      siteMap,
      appParams
    );
    finishMoment = moment();
    dataRequests[`data retrieval (query) time - ${label}`] = {
      begin: startMoment.format(),
      finish: finishMoment.format(),
      duration: `${moment
        .duration(finishMoment.diff(startMoment))
        .asSeconds()} seconds`,
      recordCount: queryResult.data.length,
    };
    // get the data back from the query
    var d = queryResult.data;
    var dPurple = queryResult.dataPurple;
    var dPurpleBlue = queryResult.dataPurpleBlue;
    var dBlue = queryResult.dataBlue;
    var dBlueGreen = queryResult.dataBlueGreen;
    var dGreen = queryResult.dataGreen;
    var dGreenYellow = queryResult.dataGreenYellow;
    var dYellow = queryResult.dataYellow;
    var dOrange = queryResult.dataOrange;
    var dOrangeRed = queryResult.dataOrangeRed;
    var dRed = queryResult.dataRed;
    var { valueLimits } = queryResult;
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

  let cOptions = matsDataCurveOpsUtils.generateCTCMapCurveOptions(curve, d, appParams); // generate map with site data
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCPurpleCurveText,
    `Values <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.1
    ).toFixed(0)}`,
    dPurple
  ); // generate purple text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCPurpleBlueCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.1
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.2
    ).toFixed(0)}`,
    dPurpleBlue
  ); // generate purple-blue text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCBlueCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.2
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.3
    ).toFixed(0)}`,
    dBlue
  ); // generate blue text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCBlueGreenCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.3
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.4
    ).toFixed(0)}`,
    dBlueGreen
  ); // generate blue-green text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCGreenCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.4
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.5
    ).toFixed(0)}`,
    dGreen
  ); // generate green text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCGreenYellowCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.5
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.6
    ).toFixed(0)}`,
    dGreenYellow
  ); // generate green-yellow text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCYellowCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.6
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.7
    ).toFixed(0)}`,
    dYellow
  ); // generate yellow text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCOrangeCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.7
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.8
    ).toFixed(0)}`,
    dOrange
  ); // generate orange text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCOrangeRedCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.8
    ).toFixed(0)} and <= ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.9
    ).toFixed(0)}`,
    dOrangeRed
  ); // generate orange-red text layer
  dataset.push(cOptions);

  cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(
    matsTypes.ReservedWords.CTCRedCurveText,
    `Values > ${(
      valueLimits.lowLimit +
      (valueLimits.highLimit - valueLimits.lowLimit) * 0.9
    ).toFixed(0)}`,
    dRed
  ); // generate red text layer
  dataset.push(cOptions);

  const resultOptions = matsDataPlotOpsUtils.generateMapPlotOptions(true);
  const totalProcessingFinish = moment();
  dataRequests['total retrieval and processing time for curve set'] = {
    begin: totalProcessingStart.format(),
    finish: totalProcessingFinish.format(),
    duration: `${moment
      .duration(totalProcessingFinish.diff(totalProcessingStart))
      .asSeconds()} seconds`,
  };
  const result = {
    error,
    data: dataset,
    options: resultOptions,
    basis: {
      plotParams,
      queries: dataRequests,
    },
  };
  plotFunction(result);
};
