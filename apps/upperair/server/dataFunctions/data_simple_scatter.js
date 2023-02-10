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

dataSimpleScatter = function (plotParams, plotFunction) {
  // initialize variables common to all curves
  const appParams = {
    plotType: matsTypes.PlotTypes.simpleScatter,
    matching: plotParams.plotAction === matsTypes.PlotActions.matched,
    completeness: plotParams.completeness,
    outliers: plotParams.outliers,
    hideGaps: plotParams.noGapsCheck,
    hasLevels: true,
  };
  const dataRequests = {}; // used to store data queries
  let dataFoundForCurve = true;
  let dataFoundForAnyCurve = false;
  const totalProcessingStart = moment();
  let error = '';
  const curves = JSON.parse(JSON.stringify(plotParams.curves));
  const curvesLength = curves.length;
  const dataset = [];
  const axisXMap = Object.create(null);
  const axisYMap = Object.create(null);
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
    const { database } = curve;
    const databaseRef = matsCollections.database.findOne({ name: 'database' })
      .optionsMap[database];
    const model = matsCollections['data-source'].findOne({ name: 'data-source' })
      .optionsMap[database][curve['data-source']][0];
    var regionStr = curve.region;
    var regionDB = database.includes('RAOBs') ? 'ID' : 'shortName';
    const region = Object.keys(
      matsCollections.region.findOne({ name: 'region' }).valuesMap[regionDB]
    ).find(
      (key) =>
        matsCollections.region.findOne({ name: 'region' }).valuesMap[regionDB][key] ===
        regionStr
    );
    let queryTableClause = `from ${databaseRef.sumsDB}.${model}${region} as m0`;
    if (database.includes('RAOBs')) {
      // Most of the RAOBs tables don't store a model sum or an obs sum for some reason.
      // So, we get the obs sum from HRRR_OPS, HRRR_HI, or GFS, because the obs are the same across all models.
      // Then we get the model sum by adding the obs sum to the bias sum (bias = model-obs).
      if (['5', '14', '15', '16', '17', '18'].includes(region.toString())) {
        queryTableClause = `${queryTableClause}, ${databaseRef.sumsDB}.HRRR_OPS_Areg${region} as m1`;
      } else if (region.toString() === '19') {
        queryTableClause = `${queryTableClause}, ${databaseRef.sumsDB}.HRRR_HI_Areg${region} as m1`;
      } else {
        queryTableClause = `${queryTableClause}, ${databaseRef.sumsDB}.GFS_Areg${region} as m1`;
      }
    }
    // scatterplots are only for predefined regions--no station plots
    const regionType = 'Predefined region';
    let phaseClause = '';
    if (database === 'AMDAR') {
      const phaseStr = curve.phase;
      const phaseOptionsMap = matsCollections.phase.findOne(
        { name: 'phase' },
        { optionsMap: 1 }
      ).optionsMap;
      phaseClause = phaseOptionsMap[phaseStr];
    }
    const variableXStr = curve['x-variable'];
    const variableYStr = curve['y-variable'];
    const variableOptionsMap = matsCollections.variable.findOne(
      { name: 'variable' },
      { optionsMap: 1 }
    ).optionsMap;
    const variableX = variableOptionsMap[regionType][variableXStr];
    const variableY = variableOptionsMap[regionType][variableYStr];
    let validTimeClause = '';
    let forecastLengthClause = '';
    const dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    let dateString = '';
    let dateClause = '';
    let levelClause = '';
    let siteMatchClause = '';
    if (binParam !== 'Valid UTC hour') {
      const validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
      if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = `and m0.hour IN(${validTimes})`;
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
    if (database.includes('RAOBs')) {
      // we're just getting the obs from table m1, so only need fcst_len = 0
      forecastLengthClause += ' and m1.fcst_len = 0';
    }
    forecastLengthClause += ' and m0.fcst_len >= 0';
    if (binParam === 'Init Date' && binParam !== 'Valid Date') {
      dateString = 'unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600';
    } else {
      dateString = 'unix_timestamp(m0.date)+3600*m0.hour';
    }
    dateClause = `and ${dateString} >= ${fromSecs} and ${dateString} <= ${toSecs}`;
    if (binParam !== 'Pressure level') {
      const { top } = curve;
      const { bottom } = curve;
      if (top === undefined) {
        throw new Error(
          `INFO:  ${label}'s top level is undefined. Please assign it a value.`
        );
      } else if (bottom === undefined) {
        throw new Error(
          `INFO:  ${label}'s bottom level is undefined. Please assign it a value.`
        );
      }
      levelClause = `and m0.mb10 >= ${top}/10 and m0.mb10 <= ${bottom}/10`;
    }
    if (database.includes('RAOBs')) {
      siteMatchClause =
        'and m0.date = m1.date and m0.hour = m1.hour and m0.mb10 = m1.mb10';
    }
    const statisticXSelect = curve['x-statistic'];
    const statisticYSelect = curve['y-statistic'];
    const statisticOptionsMap = matsCollections.statistic.findOne(
      { name: 'statistic' },
      { optionsMap: 1 }
    ).optionsMap;
    const statisticClause =
      `sum(${variableX[0]}) as square_diff_sumX, sum(${variableX[1]}) as N_sumX, sum(${variableX[2]}) as obs_model_diff_sumX, sum(${variableX[3]}) as model_sumX, sum(${variableX[4]}) as obs_sumX, sum(${variableX[5]}) as abs_sumX, ` +
      `sum(${variableY[0]}) as square_diff_sumY, sum(${variableY[1]}) as N_sumY, sum(${variableY[2]}) as obs_model_diff_sumY, sum(${variableY[3]}) as model_sumY, sum(${variableY[4]}) as obs_sumY, sum(${variableY[5]}) as abs_sumY, ` +
      `group_concat(unix_timestamp(m0.date)+3600*m0.hour, ';', m0.mb10 * 10, ';', ${variableX[0]}, ';', ${variableX[1]}, ';', ${variableX[2]}, ';', ${variableX[3]}, ';', ${variableX[4]}, ';', ${variableX[5]}, ';', ${variableY[0]}, ';', ${variableY[1]}, ';', ${variableY[2]}, ';', ${variableY[3]}, ';', ${variableY[4]}, ';', ${variableY[5]} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10 * 10) as sub_data, count(${variableX[0]}) as N0`;
    var statType = statisticOptionsMap[statisticXSelect];
    const { statVarUnitMap } = matsCollections.variable.findOne(
      { name: 'variable' },
      { statVarUnitMap: 1 }
    );
    const varUnitsX = statVarUnitMap[statisticXSelect][variableXStr];
    const varUnitsY = statVarUnitMap[statisticYSelect][variableYStr];

    var d;
    if (diffFrom == null) {
      // this is a database driven curve, not a difference curve
      // prepare the query from the above parameters
      let statement =
        '{{binClause}} ' +
        'count(distinct {{dateString}}) as N_times, ' +
        'min({{dateString}}) as min_secs, ' +
        'max({{dateString}}) as max_secs, ' +
        '{{statisticClause}} ' +
        '{{queryTableClause}} ' +
        'where 1=1 ' +
        '{{siteMatchClause}} ' +
        '{{dateClause}} ' +
        '{{validTimeClause}} ' +
        '{{forecastLengthClause}} ' +
        '{{levelClause}} ' +
        '{{phaseClause}} ' +
        'group by binVal ' +
        'order by binVal' +
        ';';

      statement = statement.replace('{{binClause}}', binClause);
      statement = statement.replace('{{statisticClause}}', statisticClause);
      statement = statement.replace('{{queryTableClause}}', queryTableClause);
      statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
      statement = statement.replace('{{validTimeClause}}', validTimeClause);
      statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
      statement = statement.replace('{{levelClause}}', levelClause);
      statement = statement.replace('{{phaseClause}}', phaseClause);
      statement = statement.replace('{{dateClause}}', dateClause);
      statement = statement.split('{{dateString}}').join(dateString);
      if (database === 'AMDAR') {
        // AMDAR tables have all partial sums so we can get them all from the main table
        statement = statement.split('m1').join('m0');
      }
      dataRequests[label] = statement;

      var queryResult;
      const startMoment = moment();
      var finishMoment;
      try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBSimpleScatter(
          sumPool,
          statement,
          appParams,
          `${statisticXSelect}_${variableXStr}`,
          `${statisticYSelect}_${variableYStr}`
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
          if (error.includes('Unknown column')) {
            throw new Error(
              `INFO:  The statistic/variable combination [${statisticXSelect}/${variableXStr} and ${statisticYSelect}/${variableYStr}] is not supported by the database for the model/region [${curve['data-source']} and ${region}].`
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
    curve.axisXKey = varUnitsX;
    curve.axisYKey = varUnitsY;
    curve.binParam = binParam;
    const cOptions = matsDataCurveOpsUtils.generateScatterCurveOptions(
      curve,
      curveIndex,
      axisXMap,
      axisYMap,
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
    axisXMap,
    axisYMap,
    xmax,
    xmin,
  };
  const bookkeepingParams = {
    dataRequests,
    totalProcessingStart,
  };
  const result = matsDataProcessUtils.processDataSimpleScatter(
    dataset,
    appParams,
    curveInfoParams,
    plotParams,
    bookkeepingParams
  );
  plotFunction(result);
};
