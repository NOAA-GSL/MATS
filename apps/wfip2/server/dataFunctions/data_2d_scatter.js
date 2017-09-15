import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsWfipUtils} from 'meteor/randyp:mats-common';
import {regression} from 'meteor/randyp:mats-common';
const Future = require('fibers/future');

data2dScatter = function (plotParams, plotFunction) {
    //console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {};
    var totalProecssingStart = moment();
    var curveDates = plotParams.dates.split(' - ');
    var fromDateStr = curveDates[0];
    var fromDate = matsDataUtils.dateConvert(fromDateStr);
    var toDateStr = curveDates[1];
    var toDate = matsDataUtils.dateConvert(toDateStr);
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var curveKeys = Object.keys(curves[0]);
    var dataset = [];
    var axisLabelList = curveKeys.filter(function (key) {
        return key.indexOf('axis-label') === 1;
    });
    // used to find the max and minimum for the axis
    // used in xaxesOptions and yaxisOptions for scaling the graph
    var xAxisMax = Number.MIN_VALUE;
    var xAxisMin = Number.MAX_VALUE;
    var yAxisMax = Number.MIN_VALUE;
    var yAxisMin = Number.MAX_VALUE;
    var maxValidInterval = Number.MIN_VALUE;    //used for differencing and matching
    var max_verificationRunInterval = Number.MIN_VALUE;
    var axisIndex;
    var curveIndex;
    var axis;
    var curve;
    var xStatistic;
    var yStatistic;
    var bf = [];   // used for bestFit data

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var dataFoundForCurve = true;
        for (axisIndex = 0; axisIndex < axisLabelList.length; axisIndex++) { // iterate the axis
            axis = axisLabelList[axisIndex].split('-')[0];
            curve = curves[curveIndex];
            const tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve[axis + '-data-source']][0].split(',');
            curve[axis + "-dataSource_is_instrument"] = parseInt(tmp[1]);
            curve[axis + "-dataSource_tablename"] = tmp[2];
            curve[axis + "-verificationRunInterval"] = tmp[4];
            curve[axis + "-dataSource_is_json"] = parseInt(tmp[5]);
            max_verificationRunInterval = Number(curve[axis + "-verificationRunInterval"]) > Number(max_verificationRunInterval) ? curve[axis + "-verificationRunInterval"] : max_verificationRunInterval;
            if (curve['statistic'] != "mean") {
                // need a truth data source for statistic
                const tmp = matsCollections.CurveParams.findOne({name: 'truth-data-source'}).optionsMap[curve[axis + '-truth-data-source']][0].split(',');
                curve[axis + "-truthDataSource_is_instrument"] = parseInt(tmp[1]);
                curve[axis + "-truthDataSource_tablename"] = tmp[2];
                curve[axis + "-truthRunInterval"] = tmp[4];
                curve[axis + "-truthDataSource_is_json"] = parseInt(tmp[5]);
                // might override the datasource assigned max_verificationRunInterval
                max_verificationRunInterval = Number(curve[axis + "-truthRunInterval"]) > Number(max_verificationRunInterval) ? curve[axis + "-truthRunInterval"] : max_verificationRunInterval;
            }
        }
    }
    var matchedValidTimes = [];
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var rawAxisData = {};
        curve = curves[curveIndex];
        for (axisIndex = 0; axisIndex < axisLabelList.length; axisIndex++) { // iterate the axis
            axis = axisLabelList[axisIndex].split('-')[0];
            var dataSource = (curve[axis + '-' + 'data-source']);
            // each axis has a data source - get the right data source and derive the model
            var dataSource_is_instrument = curve[axis + "-dataSource_is_instrument"];
            var dataSource_tablename = curve[axis + "-dataSource_tablename"];
            var verificationRunInterval = curve[axis + "-verificationRunInterval"];
            var dataSource_is_json = curve[axis + "-dataSource_is_json"];
            // maxRunInterval is used for determining maxValidInterval which is used for differencing and matching
            var maxRunInterval = verificationRunInterval;
            var halfVerificationInterval = verificationRunInterval / 2;
            maxValidInterval = maxValidInterval > maxRunInterval ? maxValidInterval : maxRunInterval;
            var statistic = curve[axis + "-" + 'statistic'];
            if (axis == "xaxis") {
                xStatistic = statistic;
            } else if (axis == "yaxis") {
                yStatistic = statistic;
            }
            var truthRequired = statistic != "mean"; // Only statistic != "mean" requires truth

            var region = matsCollections.CurveParams.findOne({name: 'region'}).optionsMap[curve[axis + '-' + 'region']][0];
            var siteNames = curve[axis + '-' + 'sites'];
            var siteIds = [];
            for (var i = 0; i < siteNames.length; i++) {
                var siteId = matsCollections.SiteMap.findOne({siteName: siteNames[i]}).siteId;
                siteIds.push(siteId);
            }
            var label = (curve['label']);    // label should be same for all the axis
            var top = Number(curve[axis + '-' + 'top']);
            var bottom = Number(curve[axis + '-' + 'bottom']);
            var color = curve['color'];  // color should be same for all axis
            var variableMap = matsCollections.CurveParams.findOne({name: 'variable'}).variableMap;
            var variableStr = curve[axis + '-' + 'variable'];
            var myVariable = variableMap[variableStr];
            if (myVariable === undefined) {
                throw new Error("variable " + variableStr + " is not in variableMap");
            }
            const windVar = myVariable.startsWith('wd');
            var discriminator = variableMap[curve[axis + '-' + 'discriminator']] === undefined ? matsTypes.InputTypes.unused : variableMap[curve[axis + '-' + 'discriminator']];
            var disc_upper = curve[axis + '-' + 'upper'];
            var disc_lower = curve[axis + '-' + 'lower'];
            var validTimeClause = " ";
            var validTimes = curve[axis + '-' + 'valid-time'] === undefined ? [] : curve[axis + '-' + 'valid-time'];
            var forecastLength = curve[axis + '-' + 'forecast-length'] === undefined ? matsTypes.InputTypes.unused : curve[axis + '-' + 'forecast-length'];
            if (forecastLength === matsTypes.InputTypes.forecastMultiCycle || forecastLength === matsTypes.InputTypes.forecastSingleCycle) {
                throw (new Error("INFO: cannot use this forecast length here: " + forecastLength));
            }
            forecastLength = forecastLength === matsTypes.InputTypes.unused ? Number(0) : Number(forecastLength);
            // verificationRunInterval is in milliseconds
            var statement = "";
            if (dataSource_is_instrument) {
                if (validTimes.length > 0) {
                    validTimeClause = " and ( (((O.valid_utc -  ((O.valid_utc - " + halfVerificationInterval / 1000 + ") % " + verificationRunInterval / 1000  + ")) + " + halfVerificationInterval / 1000 + ") % 86400 )) / 3600 in (" + validTimes + ")";
                    matchedValidTimes = matchedValidTimes.length === 0 ? validTimes : _.intersection(matchedValidTimes,validTimes);
                }
                const utcOffset = Number(forecastLength * 3600);
                if (dataSource_is_json) {
                    // verificationRunInterval is in milliseconds
                    statement = "select  O.valid_utc as valid_utc, (O.valid_utc -  ((O.valid_utc - " + halfVerificationInterval / 1000 + ") % " + verificationRunInterval / 1000 + ")) + " + halfVerificationInterval / 1000 + " as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(fromDate) + utcOffset) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(toDate) + utcOffset);
                } else {
                    var qVariable = myVariable;
                    if (windVar) {
                        qVariable = myVariable + ",ws";
                    }
                    statement = "select  O.valid_utc as valid_utc, (O.valid_utc -  ((O.valid_utc - " + halfVerificationInterval / 1000 + ") % " + verificationRunInterval / 1000 + ")) + " + halfVerificationInterval / 1000 + " as avtime, z," + qVariable + ", sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(fromDate) + utcOffset) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(toDate) + utcOffset);
                }
                // data source is a model and its JSON
            } else {
                if (validTimes.length > 0) {
                    validTimeClause = "  and ((cycle_utc + " + 3600 * forecastLength + ") % 86400) / 3600 in (" + validTimes + ")";
                    matchedValidTimes = matchedValidTimes.length === 0 ? validTimes : _.intersection(matchedValidTimes,validTimes);
                }
                statement = "select  cycle_utc as valid_utc, (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + dataSource_tablename +
                    " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                    " and fcst_utc_offset =" + 3600 * forecastLength +
                    " and cycle_utc >=" + matsDataUtils.secsConvert(fromDate) +
                    " and cycle_utc <=" + matsDataUtils.secsConvert(toDate);
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")"   + validTimeClause + " order by avtime";
            dataRequests[axis + '-' + curve.label] = statement;


            try {
                var startMoment = moment();
                rawAxisData[axis] = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, dataSource_is_json, discriminator, disc_lower, disc_upper, dataSource_is_instrument, verificationRunInterval);
                var finishMoment = moment();
                dataRequests["data retrieval (query) time - " +  axis + " - " + curve.label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: rawAxisData[axis].data.length
                }
            } catch (e) {
                e.message = "Error in queryWIFP2DB: " + e.message + " for statement: " + statement;
                throw e;
            }
            if (rawAxisData[axis].error !== undefined && rawAxisData[axis].error !== "") {
                if (rawAxisData[axis].error === matsTypes.Messages.NO_DATA_FOUND) {
                    // This is NOT an error just a no data condition
                    dataFoundForCurve = false;
                } else {
                    error += "Error from verification query: <br>" + rawAxisData[axis].error + "<br> query: <br>" + statement + "<br>";
                    throw (new Error(error));
                }
            }
            if (truthRequired == true) {
                // each axis has a truth data source that is used if statistic requires it - get the right truth data source and derive the model
                // only the truth model is different form the curves other parameters
                var truthDataSource_is_instrument = curve[axis + "-truthDataSource_is_instrument"];
                var truthDataSource_tablename = curve[axis + "-truthDataSource_tablename"];
                var truthRunInterval = curve[axis + "-truthRunInterval"];
                var truthDataSource_is_json = curve[axis + "-truthDataSource_is_json"];
                maxRunInterval = truthRunInterval > verificationRunInterval ? truthRunInterval : verificationRunInterval;
                maxValidInterval = maxValidInterval > maxRunInterval ? maxValidInterval : maxRunInterval;
                var truthStatement = '';
                if (truthDataSource_is_instrument) {
                    if (validTimes.length > 0) {
                        validTimeClause = " and ( (((O.valid_utc -  ((O.valid_utc - " + halfVerificationInterval / 1000 + ") % " + verificationRunInterval / 1000  + ")) + " + halfVerificationInterval / 1000 + ") % 86400 )) / 3600 in (" + validTimes + ")";
                        matchedValidTimes = matchedValidTimes.length === 0 ? validTimes : _.intersection(matchedValidTimes,validTimes);
                    }
                    const utcOffset = Number(forecastLength * 3600);
                    if (truthDataSource_is_json) {
                        truthStatement = "select O.valid_utc as valid_utc, (O.valid_utc -  ((O.valid_utc - " + halfVerificationInterval / 1000 + ") % " + verificationRunInterval / 1000 + ")) + " + halfVerificationInterval / 1000 + " as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + Number(matsDataUtils.secsConvert(fromDate) + utcOffset) +
                            " and valid_utc<=" + Number(matsDataUtils.secsConvert(toDate) + utcOffset);
                    } else {
                        var qVariable = myVariable;
                        if (windVar) {
                            qVariable = myVariable + ",ws";
                        }
                        truthStatement = "select O.valid_utc as valid_utc, (O.valid_utc -  ((O.valid_utc - " + halfVerificationInterval / 1000 + ") % " + verificationRunInterval / 1000 + ")) + " + halfVerificationInterval / 1000 + " as avtime, z," + qVariable + ", sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + Number(matsDataUtils.secsConvert(fromDate) + utcOffset) +
                            " and valid_utc<=" + Number(matsDataUtils.secsConvert(toDate) + utcOffset);
                    }
                } else {
                    if (validTimes.length > 0) {
                        validTimeClause = "  and ((cycle_utc + " + 3600 * forecastLength + ") % 86400) / 3600 in (" + validTimes + ")";
                        matchedValidTimes = matchedValidTimes.length === 0 ? validTimes : _.intersection(matchedValidTimes,validTimes);
                    }
                    truthStatement = "select cycle_utc as valid_utc, (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + truthDataSource_tablename +
                        " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                        " and fcst_utc_offset =" + 3600 * forecastLength +
                        " and cycle_utc >=" + matsDataUtils.secsConvert(fromDate) + utcOffset+
                        " and cycle_utc <=" + matsDataUtils.secsConvert(toDate) + utcOffset;
                }
                truthStatement = truthStatement + " and sites_siteid in (" + siteIds.toString() + ")" + validTimeClause + " order by avtime";
                dataRequests[axis + '-truth-' + curve.label] = truthStatement;
                try {
                    startMoment = moment();
                    rawAxisData[axis + '-truth'] = matsWfipUtils.queryWFIP2DB(wfip2Pool, truthStatement, top, bottom, myVariable, truthDataSource_is_json, discriminator, disc_lower, disc_upper, truthDataSource_is_instrument, truthRunInterval);
                    finishMoment = moment();
                    dataRequests["truth data retrieveal (query) time - " + axis + " - " + curve.label] = {
                        begin: startMoment.format(),
                        finish: finishMoment.format(),
                        duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + ' seconds',
                        recordCount: rawAxisData[axis + '-truth'].data.length
                    }
                } catch (e) {
                    e.message = "Error in queryWIFP2DB: " + e.message + " for statement: " + truthStatement;
                    throw e;
                }
                if (rawAxisData[axis + '-truth'].error !== undefined && rawAxisData[axis + '-truth'].error !== "") {
                    if (rawAxisData[axis + '-truth'].error === matsTypes.Messages.NO_DATA_FOUND) {
                        // This is NOT an error just a no data condition
                        dataFoundForCurve = false;
                    } else {
                        throw ( new Error(rawAxisData[axis + '-truth'].error) );
                    }
                }
            }
        }   // for axis loop

        /* What we really want to end up with for each curve is an array of arrays where each element has a time and an average of the corresponding values.
         data = [ [time, value] .... [time, value] ] // where value is an average based on criterion, such as which sites have been requested?,
         and what are the level boundaries?, and what are the time boundaries?. Levels and times have been built into the query but sites still
         need to be accounted for here. Also there can be missing times so we need to iterate through each set of times and fill in missing ones
         based on the minimum interval for the data set.

         We also have filtering... if levels or sites are filtered, each axis must have the same intersection for the filtered attribute.

         We can be requested to filter by siteids or levels, times are always effectively filtered. Filtering means that we exclude any data that is not consistent with
         the intersection of the filter values. For example if level matching is requested we need to find the intersection of all the level arrays for the given
         criteria and only include data that has levels that are in that intersection. It is the same for times and siteids.
         The data from the query is of the form
         result =  {
         error: error,
         data: resultData,
         levelsBasis: levelsBasis,    // the union of all the levels
         sitesBasis: sitesBasis,      // the union of all the sites
         allTimes: allTimes,
         minInterval: minInterval,
         mean:cumulativeMovingAverage
         }
         where ....
         resultData = {
         time0: {
         site0: {
         levels:[],
         values:[],
         sum: Number,
         mean: Number,
         numLevels: Number,
         max: Number,
         min: Number                        },
         site1: {...},
         .
         .
         siten:{...},
         timeMean: Number,   // cumulativeMovingMean for this time
         timeLevels: [],
         timeSites:[]
         },
         time1:{....},
         .
         .
         timen:{....}
         }
         where each site has been filled (nulls where missing) with all the times available for the data set, based on the minimum time interval.
         There is at least one real (non null) value for each site.
         */
        var postQueryStartMoment = moment();
        if (dataFoundForCurve) {
            // used for getDatum
            var levelCompletenessX = curve['xaxis-level-completeness'];
            var levelCompletenessY = curve['xaxis-level-completeness'];
            var siteCompletenessX = curve['xaxis-site-completeness'];
            var siteCompletenessY = curve['yaxis-site-completeness'];
            var levelBasisX = rawAxisData['xaxis'].levelsBasis;
            var levelBasisY = rawAxisData['yaxis'].levelsBasis;
            var siteBasisX = rawAxisData['xaxis'].sitesBasis;
            var siteBasisY = rawAxisData['yaxis'].sitesBasis;

            // normalize data
            // We have to include only the entries where the times match for both x and y.

            var normalizedAxisData = [];
            var xaxisIndex = 0;
            var yaxisIndex = 0;
            var xaxisTimes = rawAxisData['xaxis']['allTimes'];
            var yaxisTimes = rawAxisData['yaxis']['allTimes'];
            var xaxisLength = xaxisTimes.length;
            var yaxisLength = yaxisTimes.length;


            // synchronize datasets:
            // Only push to normalized data if there exists a time for both axis. Skip up until that happens.
            var yaxisTime;
            var xaxisTime;
            var datum = {};
            while (xaxisIndex < xaxisLength && yaxisIndex < yaxisLength) {
                xaxisTime = xaxisTimes[xaxisIndex];
                yaxisTime = yaxisTimes[yaxisIndex];
                var tooltipText;
                var rawXSites;
                var filteredXSites;
                var rawYSites;
                var filteredYSites;
                var time;
                var seconds;
                var xValue;
                var yValue;
                if (xaxisTime === yaxisTime) {
                    if (rawAxisData['xaxis']['data'][xaxisTime] !== null && rawAxisData['yaxis']['data'][yaxisTime] !== null) {
                        datum = matsWfipUtils.getDatum(rawAxisData, xaxisTime, levelCompletenessX, levelCompletenessY, siteCompletenessX, siteCompletenessY,
                            levelBasisX, levelBasisY, siteBasisX, siteBasisY, xStatistic, yStatistic);
                        xAxisMax = datum['xaxis-value'] > xAxisMax ? datum['xaxis-value'] : xAxisMax;
                        xAxisMin = datum['xaxis-value'] < xAxisMin ? datum['xaxis-value'] : xAxisMin;
                        yAxisMax = datum['yaxis-value'] > yAxisMax ? datum['yaxis-value'] : yAxisMax;
                        yAxisMin = datum['yaxis-value'] < yAxisMin ? datum['yaxis-value'] : yAxisMin;

                        rawXSites = datum['xaxis-sites'];
                        filteredXSites = datum['xaxis-filteredSites'];
                        rawYSites = datum['yaxis-sites'];
                        filteredYSites = datum['yaxis-filteredSites'];
                        time = new Date(Number(xaxisTime)).toUTCString();
                        seconds = xaxisTime / 1000;
                        xValue = datum['xaxis-value'];
                        yValue = datum['yaxis-value'];
                        if (xValue == null || yValue == null) {
                            xaxisIndex++;
                            yaxisIndex++;
                            continue;
                        }
                        tooltipText = label +
                            "<br>seconds" + seconds +
                            "<br>time:" + time +
                            "<br> xvalue:" + xValue.toPrecision(4) +
                            "<br> yvalue:" + yValue.toPrecision(4);
                        normalizedAxisData.push([xValue, yValue, {
                            'time-utc': time,
                            seconds: seconds,
                            rawXSites: rawXSites,
                            filteredXSites: filteredXSites,
                            rawYSites: rawYSites,
                            filteredYSites: filteredYSites
                        }, tooltipText]);
                    }
                } else {
                    // skip up x if necessary
                    while (xaxisTime < yaxisTime && xaxisIndex < xaxisLength) {
                        xaxisIndex++;
                        xaxisTime = xaxisTimes[xaxisIndex];
                    }
                    // skip up y if necessary
                    while (yaxisTime < xaxisTime && yaxisIndex < yaxisLength) {
                        yaxisIndex++;
                        yaxisTime = yaxisTimes[yaxisIndex];
                    }
                    // push if equal
                    if (xaxisTime === yaxisTime && xaxisTime !== null && xaxisTime != undefined) {
                        if (rawAxisData['xaxis']['data'][xaxisTime] !== null && rawAxisData['yaxis']['data'][yaxisTime] !== null) {
                            datum = matsWfipUtils.getDatum(rawAxisData, xaxisTime, levelCompletenessX, levelCompletenessY, siteCompletenessX, siteCompletenessY,
                                levelBasisX, levelBasisY, siteBasisX, siteBasisY, xStatistic, yStatistic);
                            xAxisMax = datum['xaxis-value'] > xAxisMax ? datum['xaxis-value'] : xAxisMax;
                            xAxisMin = datum['xaxis-value'] < xAxisMin ? datum['xaxis-value'] : xAxisMin;
                            yAxisMax = datum['yaxis-value'] > yAxisMax ? datum['yaxis-value'] : yAxisMax;
                            yAxisMin = datum['yaxis-value'] < yAxisMin ? datum['yaxis-value'] : yAxisMin;
                            rawXSites = datum['xaxis-sites'];
                            filteredXSites = datum['xaxis-filteredSites'];
                            rawYSites = datum['yaxis-sites'];
                            filteredYSites = datum['yaxis-filteredSites'];
                            time = new Date(Number(xaxisTime)).toUTCString();
                            seconds = xaxisTime / 1000;
                            xValue = datum['xaxis-value'];
                            yValue = datum['yaxis-value'];
                            tooltipText = label +
                                "<br>seconds" + seconds +
                                "<br>time:" + time +
                                "<br> xvalue:" + xValue +
                                "<br> yvalue:" + yValue;
                            normalizedAxisData.push([xValue, yValue, {
                                'time-utc': time,
                                seconds: seconds,
                                xValue: xValue,
                                yValue: yValue,
                                rawXSites: rawXSites,
                                filteredXSites: filteredXSites,
                                rawYSites: rawYSites,
                                filteredYSites: filteredYSites
                            }, tooltipText]);
                        }
                    }
                }
                xaxisIndex++;
                yaxisIndex++;
            }
            if (normalizedAxisData.length == 0) {
                throw new Error("INFO:No coincident data found");
            }
            normalizedAxisData.sort(matsDataUtils.sortFunction);

            var pointSymbol = matsDataUtils.getPointSymbol(curveIndex);
            var options;

            // sort these by x axis
            options = {
                yaxis: curveIndex + 1,
                label: label,
                curveId: label,
                color: color,
                data: normalizedAxisData,
                points: {symbol: pointSymbol, fillColor: color, show: true, radius: 1},
                lines: {show: false},
                annotation: label + ": statistic: " + statistic
            };
            dataset.push(options);

            if (curve['Fit-Type'] && curve['Fit-Type'] !== matsTypes.BestFits.none) {
                var regressionResult = regression(curve['Fit-Type'], normalizedAxisData);
                var regressionData = regressionResult.points;
                regressionData.sort(matsDataUtils.sortFunction);

                var regressionEquation = regressionResult.string;
                var bfOptions = {
                    yaxis: options.yaxis,
                    label: options.label + "-best fit " + curve['Fit-Type'],
                    color: options.color,
                    data: regressionData,
                    points: {symbol: options.points.symbol, fillColor: color, show: false, radius: 1},
                    lines: {
                        show: true,
                        fill: false
                    },
                    annotation: options.label + " - Best Fit: " + curve['Fit-Type'] + " fn: " + regressionEquation
                };
                bf.push(bfOptions);
            }
        } //dataFoundForCurve
        var postQueryFinishMoment = moment();
        dataRequests["post data retreival (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    } // end for curves

    // generate x-axis
    var xaxes = [];
    var xaxis = [];
    var dsi;
    var position;

    for (dsi = 0; dsi < dataset.length; dsi++) {
        curve = curves[dsi];
        position = dsi === 0 ? "bottom" : "top";
        var xaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: curve['xaxis-label'] + ":" + curve['xaxis-variable'] + ":" + curve['xaxis-statistic'] + ":" + curve['xaxis-data-source'],
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 16,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            min: xAxisMin * 0.95,
            max: xAxisMax * 1.05
        };
        var xaxisOptions = {
            zoomRange: [0.1, 10]
        };
        xaxes.push(xaxesOptions);
        xaxis.push(xaxisOptions);
    }

    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (dsi = 0; dsi < dataset.length; dsi++) {
        curve = curves[dsi];
        position = dsi === 0 ? "left" : "right";
        var yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: curve['yaxis-label'] + ":" + curve['yaxis-variable'] + ":" + curve['yaxis-statistic'] + ":" + curve['yaxis-data-source'],
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 16,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            min: yAxisMin * 0.95,
            max: yAxisMax * 1.05
        };
        var yaxisOptions = {
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }


    options = {
        axisLabels: {
            show: true
        },
        xaxes: xaxes,
        xaxis: xaxis,
        yaxes: yaxes,
        yaxis: yaxis,

        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0
        },
        series: {
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: true
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            clickable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        /* tooltips NOTE:
         There are two kinds of tooltips...
         1) content: "<span style='font-size:150%'><strong>%s<br>%x:<br>value %y</strong></span>",
         xDateFormat: "%Y-%m-%d:%H",
         onHover: function (flotItem, $tooltipEl) {
         which will cause the y value to be presented with the text "<br>%x:<br>value %y where %y is the y value"
         and ...
         content: "<span style='font-size:150%'><strong>%ct</strong></span>"
         which will present the text defined by a string in the last data position of the dataset array i.e.
         [[x1,y1,"tooltiptext1"],[x2,y3,"tooltiptext2"]....[xn,yn,"tooltiptextn"]]
         The tooltip text is expected to be an html snippet.
         */

        tooltip: true,
        tooltipOpts: {
            // the ct value is the third [2] element of the data series. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };

    dataset = dataset.concat(bf);
    var totalProecssingFinish = moment();
    dataRequests["total retrieval and processing time for curve set"] = {
        begin: totalProecssingStart.format(),
        finish: totalProecssingFinish.format(),
        duration: moment.duration(totalProecssingFinish.diff(totalProecssingStart)).asSeconds() + ' seconds'
    }
    var result = {
        error: error,
        data: dataset,
        options: options,
        basis: {
            plotParams: plotParams,
            queries: dataRequests
        }
    };
    plotFunction(result);
};