import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'
import { fs } from 'fs';
import { Random } from 'meteor/random'

dataSeries = function (plotParams, plotFunction) {
console.log ("plotParams", JSON.stringify(plotParams,null,2));
    // test example R script
    //test path working dir
    // var fs = require('fs');
    // var R = require("r-script");
    // var path = require('path').basename(__dirname);
    // console.log (path);
    // try {
    //     var out = R("/Users/pierce/WebstormProjects/MATS_DEV/apps/metproto/server/dataFunctions/example-sync.R")
    //         .data("hello world", 20)
    //         .callSync();
    // } catch (e) {
    //     console.log (e);
    // }
    // console.log(out);
    var dataRequests = [];
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromDate = dateRange.fromDate;
    var toDate = dateRange.toDate;
    // convert dates for sql
    fromDate = moment.utc(fromDate, "MM-DD-YYYY").format('YYYY-M-D');
    toDate = moment.utc(toDate, "MM-DD-YYYY").format('YYYY-M-D');
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var label = curve['label'];
        var color = curve['color'];
        var statisticOption = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic = statisticOptionsMap[statisticOption];

        var variableOption = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableOption];

        var forecastLeads = curve['forecast-lead'];

        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = variableOption + ":" + statisticOption;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var d = [];
        var data_id = Random.id();
        var statement = "SELECT h.model, " +
            "ld.fcst_init_beg, " +
            "ld.fcst_valid_beg, " +
            "ld.fcst_lead, " +
            "h.fcst_var, " +
            "'{{CLISTDEP1PLOT}}' stat_name, " +
            "IF(ld.rmse=-9999,'NA',ld.rmse ) stat_value, 'NA' stat_ncl, 'NA' stat_ncu, " +
            "IF(ld.rmse_bcl=-9999,'NA',ld.rmse_bcl) stat_bcl, " +
            "IF(ld.rmse_bcu=-9999,'NA',ld.rmse_bcu ) stat_bcu " +
            "FROM stat_header h, line_data_cnt ld " +
            "WHERE ld.fcst_lead IN ({{LISTFIXEDVALEX}}) " +
            "AND h.model IN ('{{MODELNAME}}') " +
            "AND ld.fcst_valid_beg BETWEEN {{LISTINDY}} " +
            "AND h.fcst_var = '{{LISTDEP1PLOT}}' " +
            "AND ld.stat_header_id = h.stat_header_id " +
            "AND ld.rmse != -9999;";

        statement = statement.replace('{{CLISTDEP1PLOT}}', statistic);
        statement = statement.replace('{{LISTFIXEDVALEX}}', forecastLeads);
        statement = statement.replace('{{MODELNAME}}', data_source);
        statement = statement.replace('{{LISTINDY}}', fromDate + " and " + toDate);
        statement = statement.replace('{{LISTDEP1PLOT}}', variable);
        statement = statement.replace('{{DATA_ID}}',data_id);
        dataRequests.push(statement);
        var rows;
        try {
//            rows = matsDataUtils.simplePoolQueryWrapSynchronous(connectionPool, statement);
        } catch (e) {
            e.message = "Error in database access: " + e.message + " for statement: " + statement;
            throw new Error(e.message);
        }

        // call R to process that data
        //
        var fs = require('fs');
        // read R result
        var fName = "/tmp/tmp_data";
        var fData = fs.readFileSync(fName, 'utf8');
        var fDataRows = fData.split('\n');
        for (i = 0; i < fDataRows.length; i++) {
            var row = fDataRows[i];
            var parts = row.split(' ');
            if (row === undefined || row === "") {
                continue;
            }
            var datestr = parts[0] + " " + parts[1];
            var x = moment.utc(datestr, "YYYY-M-D H:mm:ss").valueOf();
            var y = Number(parts[2]);
            xmin = xmin < x ? xmin : x;
            xmax = xmax > x ? xmax : x;
            ymin = ymin < y ? ymin : y;
            ymax = ymax > y ? ymax : y;
            d.push([x,y]);
        }
        if (d.length === 0) {
            throw new error("no data returned for curve " + curves[curveIndex].label);
        }
        curve['ymin'] = ymin;
        curve['ymax'] = ymax;
        curve['axisKey'] = axisKey;
        const cOptions = matsDataUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
    }  // end for curves

    const resultOptions = matsDataUtils.generateSeriesPlotOptions( dataset, curves, axisMap );
    var result = {
        error: error,
        data: dataset,
        options: resultOptions,
        basis:{
            plotParams:plotParams,
            queries:dataRequests
        }
    };
    plotFunction(result);
};