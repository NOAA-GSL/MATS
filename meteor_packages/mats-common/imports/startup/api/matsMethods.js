import {Meteor} from "meteor/meteor";
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {matsCollections, matsDataQueryUtils, matsDataUtils, matsTypes, matsCache} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {url} from 'url';
import {Mongo} from 'meteor/mongo';

// local collection used to keep the table update times for refresh - won't ever be synchronized or persisted.
const metaDataTableUpdates = new Mongo.Collection(null);

// define a middleware for getCSV route
var getCSV = function (params, req, res, next) {
    if (Meteor.isServer) {
        var stringify = require('csv-stringify');
        var csv = "";
        try {
            var result = getFlattenedResultData(params.key, 0, -1000);
            var statArray = Object.values(result.stats);
            var dataArray = Object.values(result.data);
            var statResultArray = [];
            var dataResultArray = [];
            for (var si = 0; si < statArray.length; si++) {
                statResultArray.push(Object.keys(statArray[si])); // push the stat header for this curve(keys)
                statResultArray.push(statArray[si]['n'] === 0 ? [statArray[si].label] : Object.values(statArray[si])); // push the stats for this curve
            }

            for (var di = 0; di < dataArray.length; di++) {
                var dataSubArray = Object.values(dataArray[di]);
                var dataHeader = dataSubArray[0] === undefined ? statArray[di].label : Object.keys(dataSubArray[0]);
                //dataHeader[0] = 'label';
                dataHeader[0] = dataSubArray[0] === undefined ? "NO DATA" : Object.keys(dataSubArray[0]).filter(key => key.indexOf('Curve') != -1)[0];
                dataResultArray.push(dataHeader); // push this curve data header (keys)
                if (dataSubArray[0] === undefined) {
                    continue;
                }
                for (var dsi = 0; dsi < dataSubArray.length; dsi++) {  // push this curves data
                    dataResultArray.push(Object.values(dataSubArray[dsi]));
                }
            }
            var fileName = "matsplot-" + moment.utc().format('YYYYMMDD-HH.mm.ss') + ".csv";
            res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
            res.setHeader('Content-Type', 'attachment.ContentType');
            stringify(statResultArray, {header: true}, function (err, output) {
                if (err) {
                    console.log("error in getCSV:", err);
                    res.write("error," + err.toLocaleString());
                    res.end();
                    return;
                }
                res.write(output);
                stringify(dataResultArray, {header: true}, function (err, output) {
                    if (err) {
                        console.log("error in getCSV:", err);
                        res.write("error," + err.toLocaleString());
                        res.end();
                        return;
                    }
                    res.write(output);
                    res.end();
                });
                delete result;
                delete statResultArray;
                delete dataResultArray;
            });
        } catch (e) {
            console.log('error retrieving data: ', e);
            csv = "error," + e.toLocaleString();
            res.setHeader('Content-disposition', 'attachment; filename=matsplot.csv');
            res.setHeader('Content-Type', 'attachment.ContentType');
            res.end(csv);
        }
    }
};

// define a middleware for getJSON route
var getJSON = function (params, req, res, next) {
    if (Meteor.isServer) {
        var flatJSON = "";
        try {
            var result = getPagenatedData(params.key, 0, -1000);
            flatJSON = JSON.stringify(result);
        } catch (e) {
            console.log('error retrieving data: ', e);
            flatJSON = JSON.stringify({error: e});
            delete flatJSON.dsiRealPageIndex;
            delete flatJSON.dsiTextDirection;
        }
        res.setHeader('Content-Type', 'application/json');
        res.write(flatJSON);
        res.end();
        delete flatJSON;
        delete result;
    }
};

// initialize collections used for pop-out window functionality
const LayoutStoreCollection = new Mongo.Collection("LayoutStoreCollection");
const DownSampleResults = new Mongo.Collection("DownSampleResults");
if (Meteor.isServer) {
    // add indexes to result and axes collections
    DownSampleResults.rawCollection().createIndex({"createdAt": 1}, {expireAfterSeconds: 3600 * 8}); // 8 hour expiration
    LayoutStoreCollection.rawCollection().createIndex({"createdAt": 1}, {expireAfterSeconds: 900}); // 15 min expiration

    // define some server side routes
    Picker.route('/getCSV/:key', function (params, req, res, next) {
        Picker.middleware(getCSV(params, req, res, next));
    });

    Picker.route('/getJSON/:key', function (params, req, res, next) {
        Picker.middleware(getJSON(params, req, res, next));
    });

    Picker.route('/gsd/mats/:app/CSV/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(getCSV(params, req, res, next));
    });

    Picker.route('/:app/CSV/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(getCSV(params, req, res, next));
    });

    Picker.route('/CSV/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(getCSV(params, req, res, next));
    });

    Picker.route('/gsd/mats/:app/JSON/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(getJSON(params, req, res, next));
    });

    Picker.route('/:app/JSON/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(getJSON(params, req, res, next));
    });

    Picker.route('/JSON/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(getJSON(params, req, res, next));
    });
}

// private method for getting pagenated data
// a newPageIndex of -1000 means get all the data (used for export)
// a newPageIndex of -2000 means get just the last page
const getPagenatedData = function (rky, p, np) {
    if (Meteor.isServer) {
        var key = rky;
        var myPageIndex = p;
        var newPageIndex = np;
        var ret;
        var rawReturn;

        try {
            var result = matsCache.getResult(key);
            rawReturn = result === undefined ? undefined : result.result; // getResult structure is {key:something,createdAt:date, result:resultObject}
         } catch (e) {
            console.log("getPagenatedData: Error - ", e);
            return undefined;
        }
        ret = rawReturn === undefined ? undefined : JSON.parse(JSON.stringify(rawReturn));
        var start;
        var end;
        var direction = 1;
        if (newPageIndex === -1000) {
            // all the data
            start = 0;
            end = Number.MAX_VALUE;
        } else if (newPageIndex === -2000) {
            // just the last page
            start = -2000;
            direction = -1;
        } else if (myPageIndex <= newPageIndex) {
            // proceed forward
            start = (newPageIndex - 1) * 100;
            end = newPageIndex * 100;
        } else {
            // move back
            direction = -1;
            start = newPageIndex * 100;
            end = (newPageIndex + 1) * 100;
        }

        var dsiStart;
        var dsiEnd;
        for (var csi = 0; csi < ret.data.length; csi++) {
            if (ret.data[csi].x === undefined || ret.data[csi].x === null || ret.data[csi].x.length <= 100) {
                continue; // don't bother pagenating datasets less than or equal to a page - ret is rawReturn
            }
            dsiStart = start;
            dsiEnd = end;
            if (dsiStart > ret.data[csi].x.length || dsiStart === -2000) {
                // show the last page if we either requested it specifically or are trying to navigate past it
                dsiStart = Math.floor(rawReturn.data[csi].x.length / 100) * 100;
                dsiEnd = rawReturn.data[csi].x.length;
                if (dsiEnd === dsiStart) {
                    // make sure the last page isn't empty--if rawReturn.data[csi].data.length/100 produces a whole number,
                    // dsiStart and dsiEnd would be the same. This makes sure that the last full page is indeed the last page, without a phantom empty page afterwards
                    dsiStart = dsiEnd - 100;
                }
            }
            if (dsiStart < 0) {
                // show the first page if we are trying to navigate before it
                dsiStart = 0;
                dsiEnd = 100;
            }
            if (dsiEnd < dsiStart) {
                // make sure that the end is after the start
                dsiEnd = dsiStart + 100;
            }
            if (dsiEnd > ret.data[csi].x.length) {
                // make sure we don't request past the end -- if results are one page, this should convert the
                // start and end from 0 and 100 to 0 and whatever the end is.
                dsiEnd = ret.data[csi].x.length;
            }
            ret.data[csi].x = rawReturn.data[csi].x.slice(dsiStart, dsiEnd);
            ret.data[csi].y = rawReturn.data[csi].y.slice(dsiStart, dsiEnd);
            ret.data[csi].stats = rawReturn.data[csi].stats.slice(dsiStart, dsiEnd);
            ret.data[csi].glob_stats = rawReturn.data[csi].glob_stats;
        }

        delete rawReturn;
        if (direction === 1) {
            ret.dsiRealPageIndex = Math.floor(dsiEnd / 100);
        } else {
            ret.dsiRealPageIndex = Math.floor(dsiStart / 100);
        }
        ret.dsiTextDirection = direction;
        return ret;
    }
};

// private method for getting pagenated results and flattening them in order to be appropriate for text display.
const getFlattenedResultData = function (rk, p, np) {
    if (Meteor.isServer) {
        var resp;
        try {
            var r = rk;
            var p = p;
            var np = np;
            // get the pagenated data
            var result = getPagenatedData(r, p, np);
            // find the type
            var plotTypes = result.basis.plotParams.plotTypes;
            var plotType = (_.invert(plotTypes))[true];
            // extract data
            var data = result.data;
            var dsiRealPageIndex = result.dsiRealPageIndex;
            var dsiTextDirection = result.dsiTextDirection;
            switch (plotType) {
                case matsTypes.PlotTypes.timeSeries:
                case matsTypes.PlotTypes.dailyModelCycle:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of maps
                    /*
                    returnData is
                    {
                        stats: {
                                    curve0: {label:someLabel, mean:someMean,sd:someSd....}
                                    curve1: {label:someLabel, mean:someMean,sd:someSd....}
                                    ...
                                }
                        data: {
                                    curve0: [
                                                {time:someTime, stat: someStat, sd: someSd,....},
                                                {time:someTime, stat: someStat, sd: someSd,....},
                                                ....
                                            ],
                                    curve1: [
                                                {time:someTime, stat: someStat, sd: someSd,....},
                                                {time:someTime, stat: someStat, sd: someSd,....},
                                                ....
                                            ],
                                            ...
                              }
                    }
                     */
                    for (var ci = 0; ci < data.length; ci++) { // for each curve
                        // if the curve label is a reserved word do not process the curve (its a zero or max curve)
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['mean'] = data[ci].glob_stats.d_mean;
                        stats['standard deviation'] = data[ci].glob_stats.sd;
                        stats['n'] = data[ci].glob_stats.n_good;
                        stats['standard error'] = data[ci].glob_stats.stde_betsy;
                        stats['lag1'] = data[ci].glob_stats.lag1;
                        stats['minimum'] = data[ci].glob_stats.minVal;
                        stats['maximum'] = data[ci].glob_stats.maxVal;
                        returnData.stats[data[ci].label] = stats;

                        var curveData = [];  // map of maps
                        for (var cdi = 0; cdi < data[ci].x.length; cdi++) { //for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + ' time'] = data[ci].x[cdi];
                            curveDataElement['raw stat from query'] = data[ci].stats[cdi].raw_stat;
                            curveDataElement['plotted stat'] = data[ci].y[cdi];
                            curveDataElement['std dev'] = data[ci].stats[cdi].sd;
                            curveDataElement['std error'] = data[ci].stats[cdi].stde_betsy;
                            curveDataElement['lag1'] = data[ci].stats[cdi].lag1;
                            curveDataElement['n'] = data[ci].stats[cdi].n_good;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.profile:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of map
                    for (var ci = 0; ci < data[ci].x.length; ci++) {  // for each curve
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['mean'] = data[ci].glob_stats.d_mean;
                        stats['standard deviation'] = data[ci].glob_stats.sd;
                        stats['n'] = data[ci].glob_stats.n_good;
                        stats['standard error'] = data[ci].glob_stats.stde_betsy;
                        stats['lag1'] = data[ci].glob_stats.lag1;
                        stats['minimum'] = data[ci].glob_stats.minVal;
                        stats['maximum'] = data[ci].glob_stats.maxVal;
                        returnData.stats[data[ci].label] = stats;

                        var cdata = data[ci].data;
                        var curveData = [];  // array of maps
                        for (var cdi = 0; cdi < data[ci].x.length; cdi++) {  // for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + ' level'] = data[ci].y[cdi];
                            curveDataElement['raw stat from query'] = data[ci].stats[cdi].raw_stat;
                            curveDataElement['plotted stat'] = data[ci].x[cdi];
                            curveDataElement['std dev'] = data[ci].stats[cdi].sd;
                            curveDataElement['std error'] = data[ci].stats[cdi].stde_betsy;
                            curveDataElement['lag1'] = data[ci].stats[cdi].lag1;
                            curveDataElement['n'] = data[ci].stats[cdi].n_good;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.dieoff:
                case matsTypes.PlotTypes.validtime:
                case matsTypes.PlotTypes.threshold:
                    var labelSuffix;
                    switch (plotType) {
                        case matsTypes.PlotTypes.dieoff:
                            labelSuffix = " forecast lead time";
                            break;
                        case matsTypes.PlotTypes.validtime:
                            labelSuffix = " hour of day";
                            break;
                        case matsTypes.PlotTypes.threshold:
                            labelSuffix = " threshold (in)";
                            break;
                    }
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of maps

                    for (var ci = 0; ci < data.length; ci++) {  // for each curve
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['mean'] = data[ci].glob_stats.d_mean;
                        stats['standard deviation'] = data[ci].glob_stats.sd;
                        stats['n'] = data[ci].glob_stats.n_good;
                        stats['minimum'] = data[ci].glob_stats.minVal;
                        stats['maximum'] = data[ci].glob_stats.maxVal;
                        returnData.stats[data[ci].label] = stats;

                        var curveData = [];  // map of maps
                        for (var cdi = 0; cdi < data[ci].x.length; cdi++) {  // for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + labelSuffix] = data[ci].x[cdi];
                            curveDataElement['raw stat from query'] = data[ci].stats[cdi].raw_stat;
                            curveDataElement['plotted stat'] = data[ci].y[cdi];
                            curveDataElement['std dev'] = data[ci].stats[cdi].sd;
                            curveDataElement['n'] = data[ci].stats[cdi].n_good;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.map:
                    var returnData = [];  // array of maps
                    /*
                        returnData = [
                                         {siteName:aSiteName, number of times:number, start date: date, end date:date, average difference: number},
                                         {siteName:aDifferentSiteName, number of times:number, start date: date, end date:date, average difference: number},
                                          ...
                                     ]
                     */
                    // maps only have one curve - an array of sites
                    var mData = data[0].data;
                    for (var si = 0; si < mData.length; si++) {
                        var elem = {};
                        elem['Site Name'] = mData[si][0][0];
                        elem['Number of Times'] = mData[si][0][1];
                        elem['Start Date'] = moment.utc(Number(mData[si][0][2]) * 1000).format('YYYY-MM-DD HH:mm');
                        elem['End Date'] = moment.utc(Number(mData[si][0][3]) * 1000).format('YYYY-MM-DD HH:mm');
                        elem['Average Difference'] = mData[si][0][4];
                        returnData.push(elem);
                    }
                    break;
                case matsTypes.PlotTypes.histogram:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of maps

                    for (var ci = 0; ci < data.length; ci++) { // for each curve
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['mean'] = data[ci].glob_stats.glob_mean;
                        stats['standard deviation'] = data[ci].glob_stats.glob_sd;
                        stats['n'] = data[ci].glob_stats.glob_n;
                        stats['minimum'] = data[ci].glob_stats.glob_min;
                        stats['maximum'] = data[ci].glob_stats.glob_max;
                        returnData.stats[data[ci].label] = stats;

                        var curveData = [];  // map of maps
                        for (var cdi = 0; cdi < data[ci].x.length; cdi++) {   // for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + ' bin range'] = data[ci].bin_stats[cdi]['binLabel'];
                            curveDataElement['n'] = data[ci].bin_stats[cdi].bin_n;
                            curveDataElement['bin rel freq'] = data[ci].bin_stats[cdi].bin_rf;
                            curveDataElement['bin lower bound'] = data[ci].bin_stats[cdi].binLowBound;
                            curveDataElement['bin upper bound'] = data[ci].bin_stats[cdi].binUpBound;
                            curveDataElement['bin mean'] = data[ci].bin_stats[cdi].bin_mean;
                            curveDataElement['bin std dev'] = data[ci].bin_stats[cdi].bin_sd;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.scatter2d:
                    var returnData = {}; // returns a map of arrays of maps
                    /*
                    returnData = {
                                    curve0: [
                                                {
                                                xval: number,
                                                yval: number,
                                                bestfit: number || none
                                                },
                                                {
                                                xval: number,
                                                yval: number,
                                                bestfit: number || none
                                                },
                                               .....
                                            ],
                                     curve1: [
                                                {
                                                xval: number,
                                                yval: number,
                                                bestfit: number || none
                                                },
                                                {
                                                xval: number,
                                                yval: number,
                                                bestfit: number || none
                                                },
                                               .....
                                            ],
                                            ....
                                }
                     */
                    var firstBestFitIndex = -1;
                    var bestFitIndexes = {};
                    for (var ci = 0; ci < data.length; ci++) {
                        if (ci == firstBestFitIndex) {
                            break; // best fit curves are at the end so do not do further processing
                        }
                        var curveData = data[ci];
                        // look for a best fit curve - only have to look at curves with higher index than this one
                        var bestFitIndex = -1;
                        for (var cbi = ci + 1; cbi < data.length; cbi++) {
                            if (((data[cbi].label).indexOf(curveData.label) !== -1) && ((data[cbi].label).indexOf("-best fit") != -1)) {
                                bestFitIndexes[ci] = cbi;
                                if (firstBestFitIndex == -1) {
                                    firstBestFitIndex = cbi;
                                }
                                break;
                            }
                        }
                        var curveTextData = [];
                        for (var cdi = 0; cdi < curveData.data.length; cdi++) {
                            var element = {};
                            element['xAxis'] = curveData.data[cdi][0];
                            element['yAxis'] = curveData.data[cdi][1];
                            if (bestFitIndexes[ci] === undefined) {
                                element['best fit'] = "none;"
                            } else {
                                element['best fit'] = data[bestFitIndexes[ci]].data[cdi][1];
                            }
                            curveTextData.push(element);
                        }
                        returnData[curveData.label] = curveTextData;
                    }
                    break;
                default:
                    return undefined;
            }
            returnData.dsiRealPageIndex = dsiRealPageIndex;
            returnData.dsiTextDirection = dsiTextDirection;
            return returnData;
        } catch (error) {
            throw new Meteor.Error("Error in getFlattenedResultData function: " + error.message);
        }
    }
};

// save the result from the query into mongo and downsample if that result's size is greater than 1Mb
const saveResultData = function (result) {
    if (Meteor.isServer) {
        var sizeof = require('object-sizeof');
        var hash = require('object-hash');
        var key = hash(result.basis.plotParams);
        var threshold = 1000000;
        var ret = {};
        try {
            var dSize = sizeof(result.data);
            console.log("result.basis.data size is ", dSize);
            // TimeSeries and DailyModelCycle are the only plot types that require downSampling
            if (dSize > threshold && (result.basis.plotParams.plotTypes.TimeSeries || result.basis.plotParams.plotTypes.DailyModelCycle)) {
                // greater than threshold need to downsample
                // downsample and save it in DownSampleResult
                console.log("DownSampling");
                var downsampler = require("downsample-lttb");
                var totalPoints = 0;
                for (var di = 0; di < result.data.length; di++) {
                    totalPoints += result.data[di].x_epoch.length;
                }
                var allowedNumberOfPoints = (threshold / dSize) * totalPoints;
                var downSampleResult = result === undefined ? undefined : JSON.parse(JSON.stringify(result));
                for (var ci = 0; ci < result.data.length; ci++) {
                    var dsData = {};
                    var xyDataset = result.data[ci].x_epoch.map(function (d,index) {
                        return [result.data[ci].x_epoch[index],result.data[ci].y[index]];
                    });
                    var ratioTotalPoints = xyDataset.length / totalPoints;
                    var myAllowedPoints = Math.round(ratioTotalPoints * allowedNumberOfPoints);
                    // downsample the array
                    var downsampledSeries;
                    if (myAllowedPoints < xyDataset.length && xyDataset.length > 2) {
                        downsampledSeries = downsampler.processData(xyDataset, myAllowedPoints);
                        // replace the y attributes (tooltips etc.) with the y attributes from the nearest x
                        var originalIndex = 0;
                        // skip through the original dataset capturing each downSampled data point
                        var arrayKeys = [];
                        var nonArrayKeys = [];
                        var keys = Object.keys(result.data[ci]);
                        for (var ki = 0; ki < keys.length; ki++) {
                            if (keys[ki] !== 'x_epoch') {
                                if (Array.isArray(result.data[ci][keys[ki]])) {
                                    arrayKeys.push(keys[ki]);
                                    dsData[keys[ki]] = [];
                                } else {
                                    nonArrayKeys.push(keys[ki]);
                                }
                            }
                        }
                        // We only ever downsample series plots - never profiles and series plots only ever have error_y arrays.
                        // This is a little hacky but what is happening is we putting error_y.array on the arrayKeys list so that it gets its
                        // downsampled equivalent values.
                        for (ki=0; ki < nonArrayKeys.length; ki++) {
                            dsData[nonArrayKeys[ki]] = result.data[ci][nonArrayKeys[ki]];
                        }
                        // remove the original error_y array data.
                        dsData['error_y'].array = [];
                        for (var dsi = 0; dsi < downsampledSeries.length; dsi++) {
                            while (originalIndex < result.data[ci].x_epoch.length && (result.data[ci].x_epoch[originalIndex] < downsampledSeries[dsi][0])) {
                                originalIndex++;
                            }
                            // capture the stuff related to this downSampled data point (downSampled data points are always a subset of original data points)
                            for (ki=0; ki < arrayKeys.length; ki++) {
                                dsData[arrayKeys[ki]][dsi] = result.data[ci][arrayKeys[ki]][originalIndex];
                            }
                            dsData['error_y']['array'][dsi] = result.data[ci]['error_y']['array'][originalIndex];
                        }
                        // add downsampled annotation to curve options
                        downSampleResult[ci] = dsData;
                        downSampleResult[ci].annotation += "   **DOWNSAMPLED**";
                    } else {
                        downSampleResult[ci] = result.data[ci];
                    }
                    downSampleResult.data[ci] = downSampleResult[ci];
                }
                DownSampleResults.rawCollection().insert({"createdAt": new Date(), key: key, result: downSampleResult});// createdAt ensures expiration set in mats-collections
                ret = {key: key, result: downSampleResult};
            } else {
                ret = {key: key, result: result};
            }
            // save original dataset
            if (result.basis.plotParams.plotTypes.TimeSeries || result.basis.plotParams.plotTypes.DailyModelCycle) {
                for (var ci = 0; ci < result.data.length; ci++) {
                    delete(result.data[ci]['x_epoch']);     // we only needed this as an index for downsampling
                }
            }
            matsCache.storeResult(key,{"createdAt": new Date(), key: key, result: result});
        } catch (error) {
            if (error.toLocaleString().indexOf("larger than the maximum size") != -1) {
                throw new Meteor.Error(+": Requesting too much data... try averaging");
            }
        }
        return ret;
    }
};

// administration tool
const getDataFunctionFileList = new ValidatedMethod({
    name: 'matsMethods.getDataFunctionFileList',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
        }
    }
});

// administration tool
const getGraphFunctionFileList = new ValidatedMethod({
    name: 'matsMethods.getGraphFunctionFileList',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
        }
    }
});

// administration tool
const readFunctionFile = new ValidatedMethod({
    name: 'matsMethods.readFunctionFile',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
            var future = require('fibers/future');
            var fs = require('fs');
            var path = "";
            var fData;
            if (type == "data") {
                path = "/web/static/dataFunctions/" + file;
                console.log('exporting data file: ' + path);
            } else if (type == "graph") {
                path = "/web/static/displayFunctions/" + file;
                console.log('exporting graph file: ' + path);
            } else {
                return ("error - wrong type");
            }
            fs.readFile(path, function (err, data) {
                if (err) throw err;
                fData = data.toString();
                future["return"](fData);
            });
            return future.wait();
        }
    }
});

/*
getPlotResult is used by the graph/text_*_output templates which are used to display textual results.
Because the data isn't being rendered graphically this data is always full size, i.e. NOT downsampled.
That is why it only finds it in the Result file cache, never the DownSampleResult collection.

Because the dataset can be so large ... e.g. megabytes the data retrieval is pagenated. The index is
applied to the underlying datasets.The data gets stripped down and flattened to only contain the data neccesary for text presentation.
A new page index of -1000 means get all the data i.e. no pagenation.
 */
const getPlotResult = new ValidatedMethod({
    name: 'matsMethods.getPlotResult',
    validate: new SimpleSchema({
        resultKey: {type: String},
        pageIndex: {type: Number},
        newPageIndex: {type: Number}
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var rKey = params.resultKey;
            var pi = params.pageIndex;
            var npi = params.newPageIndex;
            var ret = {};
            try {
                ret = getFlattenedResultData(rKey, pi, npi);
            } catch (e) {
                console.log(e);
            }
            return ret;
        }
    }
});


// administration tool
const restoreFromFile = new ValidatedMethod({
    name: 'matsMethods.restoreFromFile',
    validate: new SimpleSchema({
        type: {type: String},
        name: {type: String},
        data: {type: Object, blackbox: true}
    }).validator(),

    run(params) {
        if (Meteor.isServer) {
            console.log("restoring " + params.type + " file " + params.name);
            var path = "";
            if (params.type == "data") {
                path = "/web/static/dataFunctions/" + params.name;
            } else if (params.ype == "graph") {
                path = "/web/static/displayFunctions/" + params.name;
            } else {
                return ("error - wrong tyoe");
            }
            console.log('importing ' + params.type + ' file: ' + path);
            var fs = Npm.require('fs');
            fs.writeFile(path, params.data.toString(), function (err) {
                if (err) {
                    return (err.toLocaleString());
                }
                console.log('imported ' + params.type + ' file: ' + path);
            });
        }
    }
});

// administration tool
const restoreFromParameterFile = new ValidatedMethod({
    name: 'matsMethods.restoreFromParameterFile',
    validate: new SimpleSchema({
        name: {type: String},
        data: {type: Object, blackbox: true}
    }).validator(),
    run(params) {
        var data = params.data;
        if (Meteor.isServer) {
            var d = [];
            if (data.CurveParams) {
                matsCollections.CurveParams.remove({});
                d = _.map(data.CurveParams, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.CurveParams.insert(o);
                });
            }
            if (data.PlotParams) {
                matsCollections.PlotParams.remove({});
                d = _.map(data.PlotParams, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.PlotParams.insert(o);
                });
            }
            if (data.PlotGraphFunctions) {
                matsCollections.PlotGraphFunctions.remove({});
                d = _.map(data.PlotGraphFunctions, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.PlotGraphFunctions.insert(o);
                });
            }
            if (data.Settings) {
                matsCollections.Settings.remove({});
                d = _.map(data.Settings, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Settings.insert(o);
                });
            }
            if (data.ColorScheme) {
                matsCollections.ColorScheme.remove({});
                d = _.map(data.ColorScheme, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.ColorScheme.insert(o);
                });
            }
            if (data.Authorization) {
                matsCollections.Authorization.remove({});
                d = _.map(data.Authorization, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Authorization.insert(o);
                });
            }
            if (data.Roles) {
                matsCollections.Roles.remove({});
                d = _.map(data.Roles, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Roles.insert(o);
                });
            }
            if (data.Databases) {
                matsCollections.Databases.remove({});
                d = _.map(data.Databases, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Databases.insert(o);
                });
            }
            if (data.Credentials) {
                matsCollections.Credentials.remove({});
                d = _.map(data.Credentials, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Credentials.insert(o);
                });
            }
        }
    }
});

// administration tool
const getUserAddress = new ValidatedMethod({
    name: 'matsMethods.getUserAddress',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
            return Meteor.user().services.google.email.toLowerCase();
        }
    }
});

// used to see if the main page needs to update its selectors
const checkMetaDataRefresh = function () {
    // This routine compares the current last modified time of the tables used for curveParameter metadata
    // with the last update time to determine if an update is necessary. We really only do this for Curveparams
    /*
        metaDataTableUpdates:
        {
            name: dataBaseName,
            tables: [tableName1, tableName2 ..],
            lastRefreshed : timestamp
        }
     */
    var refresh = false;
    const tableUpdates = metaDataTableUpdates.find({}).fetch();
    for (var tui = 0; tui < tableUpdates.length; tui++) {
        var id = tableUpdates[tui]._id;
        var poolName = tableUpdates[tui].pool;
        var dbName = tableUpdates[tui].name;
        var tableNames = tableUpdates[tui].tables;
        var lastRefreshed = tableUpdates[tui]['lastRefreshed'];
        var updatedEpoch = Number.MAX_VALUE;
        for (var ti = 0; ti < tableNames.length; ti++) {
            var tName = tableNames[ti];
            var rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(global[poolName], "SELECT UNIX_TIMESTAMP(UPDATE_TIME)" +
                "    FROM   information_schema.tables" +
                "    WHERE  TABLE_SCHEMA = '" + dbName + "'" +
                "    AND TABLE_NAME = '" + tName + "'");
            for (var i = 0; i < rows.length; i++) {
                try {
                    updatedEpoch = rows[i]['UNIX_TIMESTAMP(UPDATE_TIME)'];
                    break;
                } catch (e) {
                    throw new Error("checkMetaDataRefresh - cannot find last update time for database: " + dbName + " and table: " + tName + " ERROR:" + e.message);
                }
                if (updatedEpoch === Number.MAX_VALUE) {
                    throw new Error("checkMetaDataRefresh - cannot find last update time for database: " + dbName + " and table: " + tName);
                }
            }
            const lastRefreshedEpoch = moment(lastRefreshed).valueOf() / 1000;
            if (lastRefreshedEpoch < updatedEpoch) {
                refresh = true;
                break;
            }
        }
        if (refresh === true) {
            // refresh the app metadata
            // app specific routines
            const asrKeys = Object.keys(appSpecificResetRoutines);
            for (var ai = 0; ai < asrKeys.length; ai++) {
                global.appSpecificResetRoutines[asrKeys[ai]]();
            }
            // remember that we updated ALL the metadata tables just now
            metaDataTableUpdates.update({_id: id}, {$set: {lastRefreshed: moment().format()}});
        }
    }
    return true;
};

// makes sure all of the parameters display appropriate selections in relation to one another
const resetApp = function (metaDataTableRecords) {
    var deployment;
    var deploymentText = Assets.getText('public/deployment/deployment.json');
    if (deploymentText === undefined || deploymentText == null) {
    }
    deployment = JSON.parse(deploymentText);
    const myUrlStr = Meteor.absoluteUrl();
    var url = require('url');
    var path = require('path');
    //console.log("delimiter is "+path.sep);
    var myUrl = url.parse(myUrlStr);
    const hostName = myUrl.hostname.trim();
    //console.log("url path is "+myUrl.pathname);
    //console.log("PWD is "+process.env.PWD);
    //console.log("CWD is "+process.cwd());
    const urlPath = myUrl.pathname == "/" ? process.cwd() : myUrl.pathname.replace(/\/$/g, '');
    const urlPathParts = urlPath.split(path.sep);
    //console.log("path parts are "+urlPathParts);
    const appReference = myUrl.pathname == "/" ? urlPathParts[urlPathParts.length - 6].trim() : urlPathParts[urlPathParts.length - 1];
    var developmentApp = {};
    var app = {};
    for (var ai = 0; ai < deployment.length; ai++) {
        var dep = deployment[ai];
        if (dep.deployment_environment == "development") {
            developmentApp = dep.apps.filter(function (app) {
                return app.app === appReference
            })[0];
        }
        if (dep.servers.indexOf(hostName) > -1) {
            app = dep.apps.filter(function (app) {
                return app.app === appReference
            })[0];
            break;
        }
    }
    if (app && Object.keys(app) && Object.keys(app).length === 0 && app.constructor === Object) {
        app = developmentApp;
    }
    const appVersion = app ? app.version : "unknown";
    const appTitle = app ? app.title : "unknown";
    const buildDate = app ? app.buildDate : "unknown";

    // remember that we updated the metadata tables just now - create metaDataTableUpdates
    /*
        metaDataTableUpdates:
        {
            name: dataBaseName,
            tables: [tableName1, tableName2 ..],
            lastRefreshed : timestamp
        }
     */
    // only create metadata tables if the resetApp was called with a real metaDataTables object
    if (metaDataTableRecords instanceof matsTypes.MetaDataDBRecord) {
        var metaDataTables = metaDataTableRecords.getRecords();
        for (var mdti = 0; mdti < metaDataTables.length; mdti++) {
            const metaDataRef = metaDataTables[mdti];
            metaDataRef.lastRefreshed = moment().format();
            if (metaDataTableUpdates.find({name: metaDataRef.name}).count() == 0) {
                metaDataTableUpdates.update({name: metaDataRef.name}, metaDataRef, {upsert: true});
            }
        }
    } else {
        throw new Meteor.Error("Server error: ", "resetApp: bad pool-database entry");
    }

    matsCollections.Roles.remove({});
    matsDataUtils.doRoles();
    matsCollections.Authorization.remove({});
    matsDataUtils.doAuthorization();
    matsCollections.Credentials.remove({});
    matsDataUtils.doCredentials();
    matsCollections.PlotGraphFunctions.remove({});
    matsCollections.ColorScheme.remove({});
    matsDataUtils.doColorScheme();
    matsCollections.Settings.remove({});
    matsDataUtils.doSettings(appTitle, appVersion, buildDate);
    matsCollections.CurveParams.remove({});
    matsCollections.PlotParams.remove({});
    matsCollections.CurveTextPatterns.remove({});
// app specific routines
    const asrKeys = Object.keys(appSpecificResetRoutines);
    for (var ai = 0; ai < asrKeys.length; ai++) {
        global.appSpecificResetRoutines[asrKeys[ai]]();
    }
    if (process.env.NODE_ENV === "development") {
        matsCache.clear();  // DISABLE FOR PRODUCTION *********
    }
};

// refreshes the metadata for the app that's running
const refreshMetaData = new ValidatedMethod({
    name: 'matsMethods.refreshMetaData',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
            try {
                checkMetaDataRefresh();
            } catch (e) {
                console.log(e);
                throw new Meteor.Error("Server error: ", e.message);
            }
        }
        return metaDataTableUpdates.find({}).fetch();
    }
});

// database controls
const applyDatabaseSettings = new ValidatedMethod({
    name: 'matsMethods.applyDatabaseSettings',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),

    run(settings) {
        if (Meteor.isServer) {
            if (settings.name) {
                matsCollections.Databases.upsert({name: settings.name}, {
                    $set: {
                        name: settings.name,
                        role: settings.role,
                        status: settings.status,
                        host: settings.host,
                        database: settings.database,
                        user: settings.user,
                        password: settings.password
                    }
                });
            }
            return false;
        }
    }
});

// database controls
const removeDatabase = new ValidatedMethod({
    name: 'matsMethods.removeDatabase',
    validate: new SimpleSchema({
        dbName: {type: String}
    }).validator(),
    run(dbName) {
        if (Meteor.isServer) {
            matsCollections.Databases.remove({name: dbName});
        }
    }
});

// app utility
const insertColor = new ValidatedMethod({
    name: 'matsMethods.insertColor',
    validate: new SimpleSchema({
        newColor: {type: String},
        insertAfterIndex: {type: Number}
    }).validator(),
    run(params) {
        if (params.newColor == "rgb(255,255,255)") {
            return false;
        }
        var colorScheme = matsCollections.ColorScheme.findOne({});
        colorScheme.colors.splice(params.insertAfterIndex, 0, newColor);
        matsCollections.update({}, colorScheme);
        return false;
    }
});

// app utility
const removeColor = new ValidatedMethod({
    name: 'matsMethods.removeColor',
    validate: new SimpleSchema({
        removeColor: {type: String}
    }).validator(),
    run(removeColor) {
        var colorScheme = matsCollections.ColorScheme.findOne({});
        var removeIndex = colorScheme.colors.indexOf(removeColor);
        colorScheme.colors.splice(removeIndex, 1);
        matsCollections.ColorScheme.update({}, colorScheme);
        return false;
    }
});

// administation tool
const setSettings = new ValidatedMethod({
    name: 'matsMethods.setSettings',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var settings = params.settings;
            var labelPrefix = settings.labelPrefix;
            var title = settings.title;
            var lineWidth = settings.lineWidth;
            var nullFillString = settings.nullFillString;
            var resetFromCode = settings.resetFromCode;
            matsCollections.Settings.update({}, {
                $set: {
                    LabelPrefix: labelPrefix,
                    Title: title,
                    LineWidth: lineWidth,
                    NullFillString: nullFillString,
                    resetFromCode: resetFromCode
                }
            });
        }
        return false;
    }
});

// administation tool
const setCredentials = new ValidatedMethod({
    name: 'matsMethods.setCredentials',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),
    run(settings) {
        if (Meteor.isServer) {
            var name = settings.name;
            var clientId = settings.clientId;
            var clientSecret = settings.clientSecret;
            var clientRefreshToken = settings.clientRefreshToken;
            matsCollections.Credentials.update({}, {
                $set: {
                    name: name,
                    clientId: clientId,
                    clientSecret: clientSecret,
                    refresh_token: clientRefreshToken
                }
            });
            return false;
        }
    }
});

// administation tool
const removeAuthorization = new ValidatedMethod({
    name: 'matsMethods.removeAuthorization',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),
    run(settings) {
        if (Meteor.isServer) {
            var email;
            var roleName;
            var userRoleName = settings.userRoleName;
            var authorizationRole = settings.authorizationRole;
            var newUserEmail = settings.newUserEmail;
            var existingUserEmail = settings.existingUserEmail;
            if (authorizationRole) {
                // existing role - the role roleName - no need to verify as the selection list came from the database
                roleName = authorizationRole;
            } else if (userRoleName) {
                roleName = userRoleName;
            }
            if (existingUserEmail) {
                email = existingUserEmail;
            } else {
                email = newUserEmail;
            }

            // if user and role remove the role from the user
            if (email && roleName) {
                matsCollections.Authorization.update({email: email}, {$pull: {roles: roleName}});
            }
            // if user and no role remove the user
            if (email && !roleName) {
                matsCollections.Authorization.remove({email: email});
            }
            // if role and no user remove role and remove role from all users
            if (roleName && !email) {
                // remove the role
                matsCollections.Roles.remove({name: roleName});
                // remove the roleName role from all the authorizations
                matsCollections.Authorization.update({roles: roleName}, {$pull: {roles: roleName}}, {multi: true});
            }
            return false;
        }
    }
});


// administation tool
const applyAuthorization = new ValidatedMethod({
    name: 'matsMethods.applyAuthorization',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),
    run(settings) {
        if (Meteor.isServer) {
            var roles;
            var roleName;
            var authorization;

            var userRoleName = settings.userRoleName;
            var userRoleDescription = settings.userRoleDescription;
            var authorizationRole = settings.authorizationRole;
            var newUserEmail = settings.newUserEmail;
            var existingUserEmail = settings.existingUserEmail;

            if (authorizationRole) {
                // existing role - the role roleName - no need to verify as the selection list came from the database
                roleName = authorizationRole;
            } else if (userRoleName && userRoleDescription) {
                // possible new role - see if it happens to already exist
                var role = matsCollections.Roles.findOne({name: userRoleName});
                if (role === undefined) {
                    // need to add new role using description
                    matsCollections.Roles.upsert({name: userRoleName}, {$set: {description: userRoleDescription}});
                    roleName = userRoleName;
                } else {
                    // see if the description matches...
                    roleName = role.name;
                    var description = role.description;
                    if (description != userRoleDescription) {
                        // have to update the description
                        matsCollections.Roles.upsert({name: userRoleName}, {$set: {description: userRoleDescription}});
                    }
                }
            }
            // now we have a role roleName - now we need an email
            if (existingUserEmail) {
                // existing user -  no need to verify as the selection list came from the database
                // see if it already has the role
                authorization = matsCollections.Authorization.findOne({email: existingUserEmail});
                roles = authorization.roles;
                if (roles.indexOf(roleName) == -1) {
                    // have to add the role
                    if (roleName) {
                        roles.push(roleName);
                    }
                    matsCollections.Authorization.upsert({email: existingUserEmail}, {$set: {roles: roles}});
                }
            } else if (newUserEmail) {
                // possible new authorization - see if it happens to exist
                authorization = matsCollections.Authorization.findOne({email: newUserEmail});
                if (authorization !== undefined) {
                    // authorization exists - add role to roles if necessary
                    roles = authorization.roles;
                    if (roles.indexOf(roleName) == -1) {
                        // have to add the role
                        if (roleName) {
                            roles.push(roleName);
                        }
                        matsCollections.Authorization.upsert({email: existingUserEmail}, {$set: {roles: roles}});
                    }
                } else {
                    // need a new authorization
                    roles = [];
                    if (roleName) {
                        roles.push(roleName);
                    }
                    if (newUserEmail) {
                        matsCollections.Authorization.upsert({email: newUserEmail}, {$set: {roles: roles}});
                    }
                }
            }
            return false;
        }
    }
});

// administation tool
const getAuthorizations = new ValidatedMethod({
    name: 'matsMethods.getAuthorizations',
    validate: new SimpleSchema({}).validator(),
    run() {
        var roles = [];
        if (Meteor.isServer) {
            var userEmail = Meteor.user().services.google.email.toLowerCase();
            roles = matsCollections.Authorization.findOne({email: userEmail}).roles;
        }
        return roles;
    }
});

// retrieves the saved query results (or downsampled results)
const getGraphData = new ValidatedMethod({
    name: 'matsMethods.getGraphData',
    validate: new SimpleSchema({
        plotParams: {
            type: Object,
            blackbox: true
        },
        plotType: {
            type: String
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var plotGraphFunction = matsCollections.PlotGraphFunctions.findOne({plotType: params.plotType});
            var dataFunction = plotGraphFunction.dataFunction;
            var ret;
            try {
                if (process.env.NODE_ENV === "development") {
                    matsCache.clear();  // DISABLE FOR PRODUCTION *********
                }
                var hash = require('object-hash');
                var key = hash(params.plotParams);
                var results = matsCache.getResult(key);
                if (results === undefined) {
                    // results aren't in the cache - need to process data routine
                    const Future = require('fibers/future');
                    var future = new Future();
                    global[dataFunction](params.plotParams, function (results) {
                        ret = saveResultData(results);
                        future["return"](ret);
                    });
                    return future.wait();
                } else { // results were already in the Results collection (same params and not yet expired)
                    // are results in the downsampled collection?
                    var dsResults = DownSampleResults.findOne({key: key}, {}, {disableOplog: true});
                    if (dsResults !== undefined) {
                        ret = dsResults;
                        DownSampleResults.rawCollection().update({key: key}, {$set: {"createdAt": new Date()}});
                    } else {
                        ret = results;  // {key:someKey, createdAt:date, result:resultObject}
                        // refresh expire time? I only know how to re - set the item
                        matsCache.storeResult(results.key,results);
                    }
                    var sizeof = require('object-sizeof');
                    console.log("result.data size is ", sizeof(results));
                    return;
                }
            } catch (dataFunctionError) {
                if (dataFunctionError.toLocaleString().indexOf("INFO:") !== -1) {
                    throw new Meteor.Error(dataFunctionError.message);
                } else {
                    throw new Meteor.Error("Error in getGraphData function:" + dataFunction + " : " + dataFunctionError.message);
                }
            }
            return undefined; // probably won't get here
        }
    }
});

// retrieves the saved query results (or downsampled results) for a specific key
const getGraphDataByKey = new ValidatedMethod({
    name: 'matsMethods.getGraphDataByKey',
    validate: new SimpleSchema({
        resultKey: {
            type: String
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var ret;
            var key = params.resultKey;
            try {
                var dsResults = DownSampleResults.findOne({key: key}, {}, {disableOplog: true});
                if (dsResults !== undefined) {
                    ret = dsResults;
                } else {
                    ret = matsCache.getResult(key); // {key:someKey, createdAt:date, result:resultObject}
                }
                var sizeof = require('object-sizeof');
                console.log("getGraphDataByKey results size is ", sizeof(dsResults));
                return ret;
            } catch (error) {
                throw new Meteor.Error("Error in getGraphDataByKey function:" + key + " : " + error.message);
            }
            return undefined;
        }
    }
});

//administration tools
const saveSettings = new ValidatedMethod({
    name: 'matsMethods.saveSettings',
    validate: new SimpleSchema({
        saveAs: {
            type: String
        },
        p: {
            type: Object,
            blackbox: true
        },
        permission: {
            type: String
        }
    }).validator(),
    run(params) {
        var user = "anonymous";
        matsCollections.CurveSettings.upsert({name: params.saveAs}, {
            created:moment().format("MM/DD/YYYY HH:mm:ss"),
            name: params.saveAs,
            data: params.p,
            owner: Meteor.userId() == null ? "anonymous" : Meteor.userId(),
            permission: params.permission,
            savedAt: new Date(),
            savedBy: Meteor.user() == null ? "anonymous" : user
        });
    }
});

//administration tools
const deleteSettings = new ValidatedMethod({
    name: 'matsMethods.deleteSettings',
    validate: new SimpleSchema({
        name: {
            type: String
        }
    }).validator(),
    run(params) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-logged-in");
        }
        if (Meteor.isServer) {
            matsCollections.CurveSettings.remove({name: params.name});
        }
    }
});

//administration tools
const addSentAddress = new ValidatedMethod({
    name: 'matsMethods.addSentAddress',
    validate: new SimpleSchema({
        toAddress: {type: String}
    }).validator(),
    run(toAddress) {
        if (!Meteor.userId()) {
            throw new Meteor.Error(401, "not-logged-in");
        }
        matsCollections.SentAddresses.upsert({address: toAddress}, {address: toAddress, userId: Meteor.userId()});
        return false;
    }
});

//administration tools
const emailImage = new ValidatedMethod({
    name: 'matsMethods.emailImage',
    validate: new SimpleSchema({
        imageStr: {type: String},
        toAddress: {type: String},
        subject: {type: String}
    }).validator(),
    run(params) {
        var imageStr = params.imageStr;
        var toAddress = params.toAddress;
        var subject = params.subject;
        if (!Meteor.userId()) {
            throw new Meteor.Error(401, "not-logged-in");
        }
        var fromAddress = Meteor.user().services.google.email;
        // these come from google - see
        // http://masashi-k.blogspot.fr/2013/06/sending-mail-with-gmail-using-xoauth2.html
        //http://stackoverflow.com/questions/24098461/nodemailer-gmail-what-exactly-is-a-refresh-token-and-how-do-i-get-one/24123550

        // the gmail account for the credentials is mats.mail.daemon@gmail.com - pwd mats2015!
        //var clientId = "339389735380-382sf11aicmgdgn7e72p4end5gnm9sad.apps.googleusercontent.com";
        //var clientSecret = "7CfNN-tRl5QAL595JTW2TkRl";
        //var refresh_token = "1/PDql7FR01N2gmq5NiTfnrT-OlCYC3U67KJYYDNPeGnA";
        var credentials = matsCollections.Credentials.findOne({name: "oauth_google"}, {
            clientId: 1,
            clientSecret: 1,
            refresh_token: 1
        });
        var clientId = credentials.clientId;
        var clientSecret = credentials.clientSecret;
        var refresh_token = credentials.refresh_token;

        var smtpTransporter;
        try {
            smtpTransporter = Nodemailer.createTransport("SMTP", {
                service: "Gmail",
                auth: {
                    XOAuth2: {
                        user: "mats.gsd@noaa.gov",
                        clientId: clientId,
                        clientSecret: clientSecret,
                        refreshToken: refresh_token
                    }
                }
            });

        } catch (e) {
            throw new Meteor.Error(401, "Transport error " + e.message());
        }
        try {
            var mailOptions = {
                sender: fromAddress,
                replyTo: fromAddress,
                from: fromAddress,
                to: toAddress,
                subject: subject,
                attachments: [
                    {
                        filename: "graph.png",
                        contents: new Buffer(imageStr.split("base64,")[1], "base64")
                    }
                ]
            };

            smtpTransporter.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log("smtpTransporter error " + error + " from:" + fromAddress + " to:" + toAddress);
                } else {
                    console.log(response + " from:" + fromAddress + " to:" + toAddress);
                }
                smtpTransporter.close();
            });
        } catch (e) {
            throw new Meteor.Error(401, "Send error " + e.message());
        }
        return false;
    }
});

const getReleaseNotes = new ValidatedMethod({
    name: 'matsMethods.getReleaseNotes',
    validate: new SimpleSchema({}).validator(),
    run() {
        //     return Assets.getText('public/MATSReleaseNotes.html');
        // }
        if (Meteor.isServer) {
            var future = require('fibers/future');
            var fs = require('fs');
            var dFuture = new future();
            var fData;
            console.log(process.env.PWD);
            var file;
            if (process.env.NODE_ENV === "development") {
                file = process.env.PWD + "/../../meteor_packages/mats-common/public/MATSReleaseNotes.html";
            } else {
                file = process.env.PWD + "/programs/server/assets/packages/randyp_mats-common/public/MATSReleaseNotes.html";
            }
            try {
                fs.readFile(file, 'utf8', function (err, data) {
                    if (err) {
                        fData = err.message;
                        dFuture["return"]();
                    } else {
                        fData = data;
                        dFuture["return"]();
                    }
                });
            } catch (e) {
                fData = e.message;
                dFuture["return"]();
            }
            dFuture.wait();
            return fData;
        }
    }
});

const saveLayout= new ValidatedMethod({
    name: 'matsMethods.saveLayout',
    validate: new SimpleSchema({
        resultKey: {
            type: String
        },
        layout: {
            type: Object, blackbox: true
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var key = params.resultKey;
            var layout = params.layout;
            try {
                LayoutStoreCollection.upsert({key: key}, {$set: {"createdAt": new Date(), layout: layout}});
            } catch (error) {
                throw new Meteor.Error("Error in saveLayout function:" + key + " : " + error.message);
            }
        }
    }
});

const getLayout = new ValidatedMethod({
    name: 'matsMethods.getLayout',
    validate: new SimpleSchema({
        resultKey: {
            type: String
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var ret;
            var key = params.resultKey;
            try {
                ret = LayoutStoreCollection.rawCollection().findOne({key: key});
                return ret;
            } catch (error) {
                throw new Meteor.Error("Error in getLayout function:" + key + " : " + error.message);
            }
            return undefined;
        }
    }
});

/* test methods */

const testGetTables = new ValidatedMethod({
    name: 'matsMethods.testGetTables',
    validate: new SimpleSchema(
        {
            host: {type: String},
            user: {type: String},
            password: {type: String},
            database: {type: String}
        }).validator(),
    run(params) {
        if (Meteor.isServer) {
            const Future = require('fibers/future');
            const queryWrap = Future.wrap(function (callback) {
                const connection = mysql.createConnection({
                    host: params.host,
                    user: params.user,
                    password: params.password,
                    database: params.database
                });
                connection.query("show tables;", function (err, result) {
                    const tables = result.map(function (a) {
                        return a.Tables_in_ruc_ua_sums2;
                    });
                    return callback(err, tables);
                });
                connection.end(function (err) {
                    if (err) {
                        console.log("testGetTables cannot end connection");
                    }
                });
            });
            return queryWrap().wait();
        }
    }
});

const testSetMetaDataTableUpdatesLastRefreshedBack = new ValidatedMethod({
    name: 'matsMethods.testSetMetaDataTableUpdatesLastRefreshedBack',
    validate: new SimpleSchema({}).validator(),
    run() {
        var mtu = metaDataTableUpdates.find({}).fetch();
        var id = mtu[0]._id;
        metaDataTableUpdates.update({_id: id}, {$set: {lastRefreshed: 0}});
        return metaDataTableUpdates.find({}).fetch();
    }
});


const testGetMetaDataTableUpdates = new ValidatedMethod({
    name: 'matsMethods.testGetMetaDataTableUpdates',
    validate: new SimpleSchema({}).validator(),
    run() {
        return metaDataTableUpdates.find({}).fetch();
    }
});

export default matsMethods = {
    getDataFunctionFileList: getDataFunctionFileList,
    getGraphFunctionFileList: getGraphFunctionFileList,
    readFunctionFile: readFunctionFile,
    restoreFromFile: restoreFromFile,
    restoreFromParameterFile: restoreFromParameterFile,
    getUserAddress: getUserAddress,
    refreshMetaData: refreshMetaData,
    applyDatabaseSettings: applyDatabaseSettings,
    removeDatabase: removeDatabase,
    insertColor: insertColor,
    removeColor: removeColor,
    setSettings: setSettings,
    setCredentials: setCredentials,
    removeAuthorization: removeAuthorization,
    getAuthorizations: getAuthorizations,
    applyAuthorization: applyAuthorization,
    getGraphData: getGraphData,
    getGraphDataByKey: getGraphDataByKey,
    saveSettings: saveSettings,
    deleteSettings: deleteSettings,
    addSentAddress: addSentAddress,
    emailImage: emailImage,
    resetApp: resetApp,
    testGetTables: testGetTables,
    getPlotResult: getPlotResult,
    testGetMetaDataTableUpdates: testGetMetaDataTableUpdates,
    testSetMetaDataTableUpdatesLastRefreshedBack: testSetMetaDataTableUpdatesLastRefreshedBack,
    getReleaseNotes: getReleaseNotes,
    getLayout: getLayout,
    saveLayout: saveLayout
};
