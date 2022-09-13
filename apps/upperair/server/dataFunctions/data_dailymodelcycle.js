/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataDailyModelCycle = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.dailyModelCycle,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": true
    };
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var dataFoundForAnyCurve = false;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
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

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var label = curve['label'];
        var database = curve['database'];
        var databaseRef = matsCollections['database'].findOne({name: 'database'}).optionsMap[database];
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
        var queryTableClause = "";
        var regionType = curve['region-type'];
        var phaseClause = "";
        if (database === 'AMDAR') {
            var phaseStr = curve['phase'];
            var phaseOptionsMap = matsCollections['phase'].findOne({name: 'phase'}, {optionsMap: 1})['optionsMap'];
            phaseClause = phaseOptionsMap[phaseStr];
        }
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections['variable'].findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[regionType][variableStr];
        if (curve['utc-cycle-start'].length !== 1) {
            throw new Error("INFO:  Please select exactly one UTC Cycle Init Hour for this plot type.");
        }
        var utcCycleStart = Number(curve['utc-cycle-start'][0]);
        utcCycleStarts[curveIndex] = utcCycleStart;
        var utcCycleStartClause = "and floor(((unix_timestamp(m0.date)+3600*m0.hour) - m0.fcst_len*3600)%(24*3600)/3600) IN(" + utcCycleStart + ")";
        var forecastLengthClause = "and m0.fcst_len < 24";
        if (database.includes("RAOBs") && regionType === 'Predefined region') {
            // we're just getting the obs from table m1, so only need fcst_len = 0
            forecastLengthClause = forecastLengthClause + " and m1.fcst_len = 0";
        }
        var levelVar;
        var top = curve['top'];
        var bottom = curve['bottom'];
        var siteDateClause = "";
        var siteLevelClause = "";
        var siteMatchClause = "";
        var sitesClause = "";
        var NAggregate;
        var NClause;
        var levelClause = "";
        if (regionType === 'Predefined region') {
            var regionStr = curve['region'];
            var regionDB = database.includes("RAOBs") ? "ID" : "shortName";
            var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap[regionDB]).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[regionDB][key] === regionStr);
            queryTableClause = "from " + databaseRef.sumsDB + "." + model + region + " as m0";
            if (database.includes("RAOBs")) {
                // Most of the RAOBs tables don't store a model sum or an obs sum for some reason.
                // So, we get the obs sum from HRRR_OPS, HRRR_HI, or GFS, because the obs are the same across all models.
                // Then we get the model sum by adding the obs sum to the bias sum (bias = model-obs).
                if (['5', '14', '15', '16', '17', '18'].includes(region.toString())) {
                    queryTableClause = queryTableClause + ", " + databaseRef.sumsDB + ".HRRR_OPS_Areg" + region + " as m1";
                } else if (region.toString() === '19') {
                    queryTableClause = queryTableClause + ", " + databaseRef.sumsDB + ".HRRR_HI_Areg" + region + " as m1";
            } else {
                    queryTableClause = queryTableClause + ", " + databaseRef.sumsDB + ".GFS_Areg" + region + " as m1";
            }
            }
            levelClause = "and m0.mb10 >= " + top + "/10 and m0.mb10 <= " + bottom + "/10";
            if (database.includes("RAOBs")) {
                siteMatchClause = "and m0.date = m1.date and m0.hour = m1.hour and m0.mb10 = m1.mb10";
            }
            NAggregate = 'sum';
            NClause = variable[1];
            levelVar = "m0.mb10 * 10";
        } else {
            if (database === 'AMDAR') {
                throw new Error("Single/multi-station plotting is not supported by the AMDAR databse.");
            }
            // remove table prefixes
            const model_components = model.split("_");
            model = model_components[0];
            if (model_components.length > 1) {
                for (var midx = 1; midx < model_components.length - 1; midx++) {
                    model = model + "_" + model_components[midx];
                }
            }
            var obsTable = 'RAOB';
            queryTableClause = "from " + databaseRef.modelDB + "." + obsTable + " as o, " + databaseRef.modelDB + "." + model + " as m0 ";
            var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
            var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
            var querySites = [];
            if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
                var thisSite;
                var thisSiteObj;
                for (var sidx = 0; sidx < sitesList.length; sidx++) {
                    const possibleSiteNames = sitesList[sidx].match(/\(([^)]*)\)[^(]*$/);
                    thisSite = possibleSiteNames === null ? sitesList[sidx] : possibleSiteNames[possibleSiteNames.length - 1];
                    thisSiteObj = siteMap.find(obj => {
                        return obj.origName === thisSite;
                    });
                    querySites.push(thisSiteObj.options.id);
                }
                sitesClause = " and m0.wmoid in('" + querySites.join("','") + "')";
            } else {
                throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
            }
            siteDateClause = "and unix_timestamp(o.date)+3600*o.hour >= " + fromSecs + " - 1800 and unix_timestamp(o.date)+3600*o.hour <= " + toSecs + " + 1800";
            levelClause = "and m0.press >= " + top + " and m0.press <= " + bottom;
            siteLevelClause = "and o.press >= " + top + " and o.press <= " + bottom;
            siteMatchClause = "and m0.wmoid = o.wmoid and m0.date = o.date and m0.hour = o.hour and m0.press = o.press";
            NAggregate = 'count';
            NClause = '1';
            levelVar = "m0.press";
        }
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause = "sum(" + variable[0] + ") as square_diff_sum, " + NAggregate + "(" + variable[1] + ") as N_sum, sum(" + variable[2] + ") as obs_model_diff_sum, sum(" + variable[3] + ") as model_sum, sum(" + variable[4] + ") as obs_sum, sum(" + variable[5] + ") as abs_sum, " +
            "group_concat(unix_timestamp(m0.date)+3600*m0.hour, ';', " + levelVar + ", ';', " + variable[0] + ", ';', " + NClause + ", ';', " + variable[2] + ", ';', " + variable[3] + ", ';', " + variable[4] + ", ';', " + variable[5] + " order by unix_timestamp(m0.date)+3600*m0.hour, " + levelVar + ") as sub_data, count(" + variable[0] + ") as N0";
        var statType = statisticOptionsMap[statisticSelect];
        var statVarUnitMap = matsCollections['variable'].findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
        var varUnits = statVarUnitMap[statisticSelect][variableStr];
        var dateClause = "and unix_timestamp(m0.date)+3600*m0.hour >= " + fromSecs + " - 1800 and unix_timestamp(m0.date)+3600*m0.hour <= " + toSecs + " + 1800";
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = varUnits;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select unix_timestamp(m0.date)+3600*m0.hour as avtime, " +
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
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

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
            statement = statement.replace('{{sitesClause}}', sitesClause);
            statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{levelClause}}', levelClause);
            statement = statement.replace('{{siteLevelClause}}', siteLevelClause);
            statement = statement.replace('{{phaseClause}}', phaseClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            statement = statement.replace('{{siteDateClause}}', siteDateClause);
            if (database === 'AMDAR') {
                // AMDAR tables have all partial sums so we can get them all from the main table
                statement = statement.split('m1').join('m0');
            }
            dataRequests[label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, appParams, statisticSelect + "_" + variableStr);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.x.length
                };
                // get the data back from the query
                d = queryResult.data;
            } catch (e) {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
                    // this is NOT an error just a no data condition
                    dataFoundForCurve = false;
                } else {
                    // this is an error returned by the mysql database
                    error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                    if (error.includes('Unknown column')) {
                        throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + curve['data-source'] + " and " + region + "].");
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
            // this is a difference curve
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, appParams, statType === "ctc", statType === "scalar");
            d = diffResult.dataset;
            xmin = xmin < d.xmin ? xmin : d.xmin;
            xmax = xmax > d.xmax ? xmax : d.xmax;
            ymin = ymin < d.ymin ? ymin : d.ymin;
            ymax = ymax > d.ymax ? ymax : d.ymax;
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = d.sum / d.x.length;
        const annotation = mean === undefined ? label + "- mean = NoData" : label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['axisKey'] = axisKey;
        const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d, appParams);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        };
    }  // end for curves

    if (!dataFoundForAnyCurve) {
        // we found no data for any curves so don't bother proceeding
        throw new Error("INFO:  No valid data for any curves.");
    }

    // process the data returned by the query
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "idealValues": idealValues,
        "utcCycleStarts": utcCycleStarts,
        "statType": statType,
        "axisMap": axisMap,
        "xmax": xmax,
        "xmin": xmin
    };
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};