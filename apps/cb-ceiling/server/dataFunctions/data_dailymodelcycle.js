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
} from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';

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
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  const dateRange = matsDataUtils.getDateRange(plotParams.dates);
  const fromSecs = dateRange.fromSeconds;
  const toSecs = dateRange.toSeconds;
  let error = '';
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const dataset = [];
  const utcCycleStarts = [];
  const axisMap = Object.create(null);
  let xmax = -1 * Number.MAX_VALUE;
  let ymax = -1 * Number.MAX_VALUE;
  let xmin = Number.MAX_VALUE;
  let ymin = Number.MAX_VALUE;
  const idealValues = [];

  for (let curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
    // initialize variables specific to each curve
    const curve = curves[curveIndex];
    const { diffFrom } = curve;
    const { label } = curve;
    var { variable } = curve;
    const model = matsCollections['data-source'].findOne({ name: 'data-source' })
      .optionsMap[variable][curve['data-source']][0];
    const modelClause = `AND m0.model='${model}' `;
    var queryTableClause;
    var thresholdStr = curve.threshold;
    let threshold = Object.keys(
      matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[variable]
    ).find(
      (key) =>
        matsCollections.threshold.findOne({ name: 'threshold' }).valuesMap[variable][
          key
        ] === thresholdStr
    );
    threshold = threshold.replace(/_/g, '.');
    if (curve['utc-cycle-start'].length !== 1) {
      throw new Error(
        'INFO:  Please select exactly one UTC Cycle Init Hour for this plot type.'
      );
    }
    const utcCycleStart = Number(curve['utc-cycle-start'][0]);
    utcCycleStarts[curveIndex] = utcCycleStart;
    const utcCycleStartClause = `and (m0.fcstValidEpoch - m0.fcstLen*3600)%(24*3600)/3600 IN[${utcCycleStart}]`;
    const forecastLengthClause = 'and m0.fcstLen < 24';
    var dateClause;
    let siteDateClause = '';
    let siteMatchClause = '';
    let sitesClause = '';
    const statisticSelect = curve.statistic;
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: 'statistic' },
      { optionsMap: 1 }
    ).optionsMap;
    var statisticClause;
    const regionType = curve['region-type'];
    let regionClause = '';
    var whereClause;
    let siteWhereClause = '';
    if (regionType === 'Predefined region') {
      queryTableClause = 'from vxDBTARGET  m0';
      var regionStr = curve.region;
      const region = Object.keys(
        matsCollections.region.findOne({ name: 'region' }).valuesMap
      ).find(
        (key) =>
          matsCollections.region.findOne({ name: 'region' }).valuesMap[key] ===
          regionStr
      );
      regionClause = `AND m0.region='${region}' `;
      statisticClause =
        `sum(m0.data.['${threshold}'].hits) hit, sum(m0.data.['${threshold}'].false_alarms) fa, ` +
        `sum(m0.data.['${threshold}'].misses) miss, sum(m0.data.['${threshold}'].correct_negatives) cn, ` +
        `ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['${threshold}'].hits) || ';' || ` +
        `TO_STRING(m0.data.['${threshold}'].false_alarms) || ';' || TO_STRING(m0.data.['${threshold}'].misses) || ';' || ` +
        `TO_STRING(m0.data.['${threshold}'].correct_negatives))) sub_data, count(m0.data.['${threshold}'].hits) N0 `;
      dateClause = `and m0.fcstValidEpoch >= ${fromSecs} and m0.fcstValidEpoch <= ${toSecs}`;
      whereClause =
        'WHERE ' +
        "m0.type='DD' " +
        "AND m0.docType='CTC' " +
        "AND m0.subset='METAR' " +
        "AND m0.version='V01' ";
    } else {
      queryTableClause =
        'from vxDBTARGET  AS m0 ' +
        'JOIN mdata AS o ' +
        'ON o.fcstValidEpoch = m0.fcstValidEpoch ' +
        'UNNEST o.data AS odata ' +
        'UNNEST m0.data AS m0data ';
      const sitesList = curve.sites === undefined ? [] : curve.sites;
      if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        sitesClause = ` and m0data.name in ['${sitesList.join("','")}']`;
        sitesClause = `${sitesClause} and odata.name in ['${sitesList.join("','")}']`;
        siteMatchClause = 'and m0data.name = odata.name ';
      } else {
        throw new Error(
          'INFO:  Please add sites in order to get a single/multi station plot.'
        );
      }
      statisticClause =
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
      dateClause = `and m0.fcstValidEpoch >= ${fromSecs} and m0.fcstValidEpoch <= ${toSecs} and m0.fcstValidEpoch = o.fcstValidEpoch`;
      whereClause =
        "AND m0.type='DD' " +
        "AND m0.docType='model' " +
        "AND m0.subset='METAR' " +
        "AND m0.version='V01' ";
      siteDateClause = `and o.fcstValidEpoch >= ${fromSecs} and o.fcstValidEpoch <= ${toSecs}`;
      siteWhereClause =
        "WHERE o.type='DD' " +
        "AND o.docType='obs' " +
        "AND o.subset='METAR' " +
        "AND o.version='V01' ";
    }
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // units (axisKey) it will use the same axis.
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    var statType = statisticOptionsMap[statisticSelect][0];
    const axisKey = statisticOptionsMap[statisticSelect][1];
    curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
    const idealVal = statisticOptionsMap[statisticSelect][2];
    if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
      idealValues.push(idealVal);
    }

    var d;
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      let statement =
        'SELECT m0.fcstValidEpoch AS avtime, ' +
        'COUNT(DISTINCT m0.fcstValidEpoch) N_times, ' +
        'MIN(m0.fcstValidEpoch) min_secs, ' +
        'MAX(m0.fcstValidEpoch) max_secs, ' +
        '{{statisticClause}} ' +
        '{{queryTableClause}} ' +
        '{{siteWhereClause}} ' +
        '{{whereClause}} ' +
        '{{modelClause}} ' +
        '{{regionClause}} ' +
        '{{forecastLengthClause}} ' +
        '{{utcCycleStartClause}} ' +
        '{{siteDateClause}} ' +
        '{{dateClause}} ' +
        '{{sitesClause}} ' +
        '{{siteMatchClause}} ' +
        'GROUP BY m0.fcstValidEpoch ' +
        'ORDER BY avtime' +
        ';';

      statement = statement.replace('{{statisticClause}}', statisticClause);
      statement = statement.replace('{{queryTableClause}}', queryTableClause);
      statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
      statement = statement.replace('{{sitesClause}}', sitesClause);
      statement = statement.replace('{{whereClause}}', whereClause);
      statement = statement.replace('{{siteWhereClause}}', siteWhereClause);
      statement = statement.replace('{{modelClause}}', modelClause);
      statement = statement.replace('{{regionClause}}', regionClause);
      statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
      statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
      statement = statement.replace('{{dateClause}}', dateClause);
      statement = statement.replace('{{siteDateClause}}', siteDateClause);

      statement = cbPool.trfmSQLForDbTarget(statement);
      dataRequests[label] = statement;

      var queryResult;
      const startMoment = moment();
      var finishMoment;
      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(
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
          throw new Error(error);
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
      // this is a difference curve
      const diffResult = matsDataDiffUtils.getDataForDiffCurve(
        dataset,
        diffFrom,
        appParams,
        statType === 'ctc',
        statType === 'scalar'
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
    throw new Error('INFO:  No valid data for any curves.');
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
