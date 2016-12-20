import { matsCollections } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { mysql } from 'meteor/pcel:mysql';
import { moment } from 'meteor/momentjs:moment'
import { matsDataUtils } from 'meteor/randyp:mats-common';
import { matsWfipUtils } from 'meteor/randyp:mats-common';
import { regression } from 'meteor/randyp:mats-common';
const Future = require('fibers/future');

data2dScatter = function (plotParams, plotFunction) {
    var wfip2Settings = matsCollections.Databases.findOne({role:"wfip2_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    var wfip2Pool = mysql.createPool(wfip2Settings);
    wfip2Pool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {};
    var curveDates =  plotParams.dates.split(' - ');
    var fromDateStr = curveDates[0];
    var fromDate = matsDataUtils.dateConvert(fromDateStr);
    var toDateStr = curveDates[1];
    var toDate = matsDataUtils.dateConvert(toDateStr);
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var curveKeys = Object.keys(curves[0]);
    var dataset = [];
    var curve;
    var axisLabelList = curveKeys.filter(function (key) {
        return key.indexOf('axis-label') === 1;
    });
    // used to find the max and minimum for the axis
    // used in xaxesOptions and yaxisOptions for scaling the graph
    var xAxisMax = Number.MIN_VALUE;
    var xAxisMin = Number.MAX_VALUE;
    var yAxisMax = Number.MIN_VALUE;
    var yAxisMin = Number.MAX_VALUE;
    var xStatistic;
    var yStatistic;
    var bf = [];   // used for bestFit data
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var rawAxisData = {};
        curve = curves[curveIndex];
        for (var axisIndex = 0; axisIndex < axisLabelList.length; axisIndex++) { // iterate the axis
            var axis = axisLabelList[axisIndex].split('-')[0];
            var dataSource = (curve[axis + '-' + 'data-source']);
            // each axis has a data source - get the right data source and derive the model
            var tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[dataSource][0].split(',');
            var dataSource_is_instrument = parseInt(tmp[0]);
            var dataSource_tablename = tmp[1];
            var dataSource_id = tmp[2];
            var verificationRunInterval = tmp[3];
            var dataSource_is_json = parseInt(tmp[4]);
            var dataSource_discriminator_tablename = dataSource_tablename.replace('_nwpjson', '_discriminator');
            var model = tmp[1];
            var instrument_id = tmp[2];
            var myVariable;
            // each axis has a truth data source that is used if statistic requires it - get the right truth data source and derive the model
            // only the truth model is different form the curves other parameters

            var statistic = curve[axis + "-" + 'statistic'];
            if (axis == "xaxis") {
                xStatistic = statistic;
            } else if (axis == "yaxis") {
                yStatistic = statistic;
            }
            var truthDataSource = curve[axis + "-" + 'truth-data-source'];
            tmp = matsCollections.CurveParams.findOne({name: 'truth-data-source'}).optionsMap[truthDataSource][0].split(',');
            var truthDataSource_is_instrument = tmp[0];
            var truthDataSource_tablename = tmp[1];
            var truthDataSource_id = tmp[2];

            var truthRunInterval = tmp[3];
            var truthDataSource_is_json = tmp[4];
            var truthDataSource_discriminator_tablename = truthDataSource_tablename.replace('_nwp', '_discriminator');
            var truthModel = tmp[1];
            var truthInstrument_id = tmp[2];
            var truthRequired = statistic != "mean"; // Only statistic != "mean" requires truth
            // variables can be conventional or discriminators. Conventional variables are listed in the variableMap.
            // discriminators are not.
            // we are using existence in variableMap to decide if a variable is conventional or a discriminator.
            var variableMap = matsCollections.CurveParams.findOne({name: 'variable'}).variableMap;
            var isDiscriminator = false;
            myVariable = variableMap[curve[axis + '-variable']];
            if (myVariable === undefined) {
                myVariable = curve[axis + '-variable'];
                isDiscriminator = true; // variable is mapped, discriminators are not, this is a discriminator
            }
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
            var variableStr = curve[axis + '-' + 'variable'];
            var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][matsTypes.PlotTypes.scatter2d];
            var variable = variableOptionsMap[dataSource][variableStr];
            var discriminator = curve[axis + '-' + 'discriminator'];
            var disc_upper = curve[axis + '-' + 'upper'];
            var disc_lower = curve[axis + '-' + 'lower'];
            var forecastLength = curve[axis + '-' + 'forecast-length'];

            var  statement = "select has_discriminator('" + dataSource.toString() + "') as hd";
            //console.log("statement: " + statement);
            var dFuture = new Future();
            dFuture['hd'] = 0;
            wfip2Pool.query(statement, function (err, rows) {
                if (err != undefined) {
                    throw( new Error( "dataSeries error = has_discriminator error: " + err.message ) );
                } else {
                    dFuture['hd'] = rows[0]['hd'];
                }
                dFuture['return']();
            });
            dFuture.wait();
            var dataSource_has_discriminator = dFuture['hd'];

            if ( dataSource_is_instrument ) {
                if (dataSource_is_json) {
                    statement = "select O.valid_utc as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + matsDataUtils.secsConvert(fromDate) +
                        " and valid_utc<=" + matsDataUtils.secsConvert(toDate);
                } else {
                    statement = "select O.valid_utc as avtime, z," + myVariable + ", sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + matsDataUtils.secsConvert(fromDate) +
                        " and valid_utc<=" + matsDataUtils.secsConvert(toDate);
                }
                // data source is a model and its JSON
            } else {
                statement = "select (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + dataSource_tablename +
                    " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                    " and fcst_utc_offset =" + 3600 * forecastLength +
                    " and (cycle_utc + fcst_utc_offset) >=" + matsDataUtils.secsConvert(fromDate) +
                    " and (cycle_utc + fcst_utc_offset) <=" + matsDataUtils.secsConvert(toDate);
            }


            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ") order by avtime";
            console.log("statement: " + statement);
            rawAxisData[axis] = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, dataSource_has_discriminator, dataSource_is_json, disc_lower, disc_upper );
            if (rawAxisData[axis].error !== undefined && rawAxisData[axis].error !== "") {
                error += "Error from verification query: <br>" + rawAxisData[axis].error + "<br> query: <br>" + statement + "<br>" ;
                throw (new Error(error));
            }

            statement = "select has_discriminator('" + truthDataSource.toString() + "') as hd";
            //console.log("statement: " + statement);
            dFuture = new Future();
            dFuture['hd'] = 0;
            wfip2Pool.query(statement, function (err, rows) {
                if (err != undefined) {
                    throw( new Error("data series error = has_discriminator error: " + err.message) );
                } else {
                    dFuture['hd'] = rows[0]['hd'];
                }
                dFuture['return']();
            });
            dFuture.wait();
            var truthDataSource_has_discriminator = dFuture['hd'];

            var truthStatement = '';
            if (truthDataSource_is_instrument) {
                if (truthDataSource_is_json) {
                    truthStatement = "select O.valid_utc as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + matsDataUtils.secsConvert(fromDate) +
                        " and valid_utc<=" + matsDataUtils.secsConvert(toDate);
                } else {
                    truthStatement = "select O.valid_utc as avtime, z," + myVariable + ", sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + matsDataUtils.secsConvert(fromDate) +
                        " and valid_utc<=" + matsDataUtils.secsConvert(toDate);
                }
            } else {
                truthStatement = "select (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + truthDataSource_tablename +
                    " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                    " and fcst_utc_offset =" + 3600 * forecastLength +
                    " and (cycle_utc + fcst_utc_offset) >=" + matsDataUtils.secsConvert(fromDate) +
                    " and (cycle_utc + fcst_utc_offset) <=" + matsDataUtils.secsConvert(toDate);
            }
            truthStatement = truthStatement + "  and sites_siteid in (" + siteIds.toString() + ") order by avtime";

            /*
             For a statistical calculation that requires a truth curve - need to go through again for the truth curve.
             */
            if (truthRequired == true) {
                console.log("truthStatement: " + truthStatement);
                rawAxisData[axis + '-truth'] = matsWfipUtils.queryWFIP2DB(wfip2Pool, truthStatement, top, bottom, myVariable, truthDataSource_has_discriminator, truthDataSource_is_json);
                if (truthQueryResult.error !== undefined && truthQueryResult.error !== "") {
                    //error += "Error from truth query: <br>" + truthQueryResult.error + " <br>" + " query: <br>" + truthStatement + " <br>";
                    throw ( new Error(truthQueryResult.error) );
                }
            }
            dataRequests[curve.label] = {statement:statement,truthStatement:truthStatement}
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
         allLevels: allLevels,
         allSites: allSiteIds,
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

        // used for getDatum
        var levelCompletenessX = curve['xaxis-level-completeness'];
        var levelCompletenessY = curve['xaxis-level-completeness'];
        var siteCompletenessX = curve['xaxis-site-completeness'];
        var siteCompletenessY = curve['yaxis-site-completeness'];
        var levelBasisX = _.union.apply(_,rawAxisData['xaxis'].allLevels);
        var levelBasisY = _.union.apply(_,rawAxisData['yaxis'].allLevels);
        var siteBasisX = _.union.apply(_,rawAxisData['xaxis'].allSites);
        var siteBasisY = _.union.apply(_,rawAxisData['yaxis'].allSites);

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
        while (xaxisIndex < xaxisLength  && yaxisIndex < yaxisLength) {
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
                    seconds = xaxisTime/1000;
                    xValue = datum['xaxis-value'];
                    yValue = datum['yaxis-value'];
                    if (xValue == null || yValue == null) {
                        xaxisIndex++;
                        yaxisIndex++;
                        continue;
                    }
                    tooltipText = label  +
                        "<br>seconds" + seconds +
                        "<br>time:" + time +
                        "<br> xvalue:" + xValue.toPrecision(4) +
                        "<br> yvalue:" + yValue.toPrecision(4);
                    normalizedAxisData.push([xValue, yValue, {'time-utc':time, seconds:seconds, rawXSites:rawXSites, filteredXSites: filteredXSites, rawYSites: rawYSites, filteredYSites:filteredYSites}, tooltipText]);
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
                        seconds = xaxisTime/1000;
                        xValue = datum['xaxis-value'];
                        yValue = datum['yaxis-value'];
                        tooltipText = label  +
                            "<br>seconds" + seconds +
                            "<br>time:" + time +
                            "<br> xvalue:" + xValue +
                            "<br> yvalue:" + yValue;
                        normalizedAxisData.push([xValue, yValue, {'time-utc':time, seconds:seconds, xValue:xValue, yValue:yValue, rawXSites:rawXSites, filteredXSites: filteredXSites, rawYSites: rawYSites, filteredYSites:filteredYSites}, tooltipText]);
                    }
                }
            }
            xaxisIndex++;
            yaxisIndex++;
        }
        normalizedAxisData.sort(matsDataUtils.sortFunction);

        var pointSymbol = matsWfipUtils.getPointSymbol (curveIndex);
        var options;

        // sort these by x axis
        options = {
            yaxis: curveIndex + 1,
            label: label,
            color: color,
            data: normalizedAxisData,
            points: {symbol: pointSymbol, fillColor: color, show: true, radius: 1},
            lines: {show: false},
            annotation: label + ": statistic: " + statistic
        };
        dataset.push(options);

        if (curve['Fit Type'] && curve['Fit Type'] !== matsTypes.BestFits.none) {
            var regressionResult = regression(curve['Fit Type'], normalizedAxisData);
            var regressionData = regressionResult.points;
            regressionData.sort(matsDataUtils.sortFunction);

            var regressionEquation = regressionResult.string;
            var bfOptions = {
                yaxis: options.yaxis,
                label: options.label + "-best fit " + curve['Fit Type'],
                color: options.color,
                data: regressionData,
                points: {symbol: options.points.symbol, fillColor: color, show: false, radius: 1},
                lines: {
                    show: true,
                    fill: false
                },
                annotation: options.label + " - Best Fit: " + curve['Fit Type'] + " fn: " + regressionEquation
            };
            bf.push(bfOptions);
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
            min:xAxisMin * 0.95,
            max:xAxisMax * 1.05
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
            min:yAxisMin * 0.95,
            max:yAxisMax * 1.05
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
    var result = {
        error: error,
        data: dataset,
        options: options,
        basis:{
            plotParams:plotParams,
            queries:dataRequests
        }
    };
    plotFunction(result);
};