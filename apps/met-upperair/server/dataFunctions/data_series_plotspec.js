import {Meteor} from 'meteor/meteor';
import {
    matsCollections,
    matsDataCurveOpsUtils,
    matsDataDiffUtils,
    matsDataProcessUtils,
    matsDataQueryUtils,
    matsDataUtils,
    matsTypes,
    matsMethods
} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'
var xmlBuilder = require('xmlbuilder');


const _title = function () {
    if (matsCollections.Settings === undefined || matsCollections.Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
        return "";
    } else {
        return matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title;
    }
}

const _plotText = function () {
    var format = p.plotFormat;
    if (matsCollections.PlotParams.findOne({name: 'plotFormat'}) &&
        matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap &&
        matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap[p.plotFormat] !== undefined) {
        format = matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap[p.plotFormat];
    }
    if (format === undefined) {
        format = "Unmatched";
    }
    const plotType = (_.invert(plotParams.plotTypes))[true];
    switch (plotType) {
        case matsTypes.PlotTypes.timeSeries:
            return "TimeSeries " + p.dates + " : " + format;
            break;
        case matsTypes.PlotTypes.profile:
            return "Profile: " + format;
            break;
        case matsTypes.PlotTypes.dieoff:
            return "DieOff: " + format;
            break;
        case matsTypes.PlotTypes.threshold:
            return "Threshold: " + format;
            break;
        case matsTypes.PlotTypes.validtime:
            return "ValidTime: " + format;
            break;
        case matsTypes.PlotTypes.dailyModelCycle:
            return "DailyModelCycle " + p.dates + " : " + format;
            break;
        case matsTypes.PlotTypes.map:
            return "Map " + p.dates + " ";
            break;
        case matsTypes.PlotTypes.histogram:
            return "Histogram: " + format;
            break;
        default:
            return "Scatter: " + p.dates + " : " + format;
    }
}

const _componentToHex = function(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

const _rgbToHex = function(color) {
    const cParts = color.replace('rgb(','').replace(')','').split(',');
    const r = Number(cParts[0]);
    const g = Number(cParts[1]);
    const b = Number(cParts[2]);
    return "#" + _componentToHex(r) + _componentToHex(g) + _componentToHex(b);
}



// adds date elements to an element of the current xml between a start and an end date, incremented by specific seconds
const _addDateElementsBetween = function(element,start, end, inc_seconds) {
    // this function is an example of javascript pass-by-copy-of-reference
    var currDate = start;
    element.ele('val',{'label':currDate.format('YYYY-MM-DD HH:mm:ss'),'plot_val':""},currDate.format('YYYY-MM-DD HH:mm:ss'));
    while (currDate.add(inc_seconds, 'seconds').diff(end) <= 0) {
        element.ele('val',{'label':currDate.format('YYYY-MM-DD HH:mm:ss'),'plot_val':""},currDate.format('YYYY-MM-DD HH:mm:ss'));
    }
}
// parse the databases from the curves and add a database string
const _addDatabaseElement = function(element, curves){
    databases = [];
    for (var ci=0; ci < curves.length; ci++) {
        databases.push(curves[ci].database);
    }
    databasesStr = databases.join("'");
    element.ele('database',databasesStr);
    return element;
}
// add the required metviewer folders
const _addFolders = function(element) {
    element.ele('rscript', Meteor.settings.private.MV_RSCRIPT);
    var folders = element.ele('folders');
    folders.ele('r_tmpl', matsMethods.MV_DIRS.HOME + "/r_tmpl");
    folders.ele('r_work', matsMethods.MV_DIRS.HOME + "/r_work");
    folders.ele('plots', matsMethods.MV_DIRS.PLOTSDIR);
    folders.ele('data', matsMethods.MV_DIRS.DATADIR);
    folders.ele('scripts', matsMethods.MV_DIRS.SCRIPTSDIR);
    return element;
}
// start the plotspec
const _startPlotSpec = function(pool, plotParams) {
    var xml = xmlBuilder.create('plot_spec',{version: '1.0', encoding: 'UTF-8', standalone: 'no'});
    var connection = xml.ele('connection');
    connection.ele('host', sumPool.config.connectionConfig.host + ":" + sumPool.config.connectionConfig.port);
    connection.ele('user', sumPool.config.connectionConfig.user);
    connection.ele('password', sumPool.config.connectionConfig.password);
    _addDatabaseElement(connection, plotParams.curves);
    _addFolders(xml);
    return xml;
}

const _addColors = function(element,curves) {
    var cListHex = [];
    var cList = [];
    for (var ci=0; ci < curves.length; ci++) {
        cList.push(curves[ci].color);
    }
    for (var ci=0; ci < cList.length; ci++) {
        var ch = _rgbToHex(cList[ci]) + "FF";
        cListHex.push('"' + ch + '"');
    }
    const cListStr = cListHex.join(',');
    element.ele('colors',cListStr);
}

plotSpecDataSeries = function (plotParams, key, plotSpecCallback) {
    const fs = require('fs');
    const Future = require('fibers/future');
    var dFuture = new Future();
    // there are two possible axis for metviewer. We want to collect all the mean variables
    // into groups. We will take the two largest groups.
    var axisVars = {y1:[],y2:[]};
    try {
        var xml = _startPlotSpec(sumPool,plotParams);
        var plot = xml.ele('plot');
        plot.ele('template','series_plot.R_tmpl');
        /*
            variables:
            variables that share an axis are different dependent variables. Put them in dep1.
            variables that have differing axis must go in different Y axis vars (and you can only have two of those)
         */
        var variables = plotParams.curves.map( curve => curve.variable);
        // sort these variables by units

        var dep = plot.ele('dep');
        var dep1 = dep.ele('dep1');
        var fcst_var = dep1.ele('fcst_var',{'name':plotParams.curves[0].variable});
        fcst_var.ele('stat','RMSE');
        var dep2 = dep.ele('dep2');
        var series1 = plot.ele('series1')
            .ele('field',{'name':'model'})
            .ele('val',plotParams.curves[0]['data-source']);

        var series2 = plot.ele('series2');
        var plot_fix = plot.ele('plot_fix');
        plot_fix.ele('field',{'equalize':'false','name':'fcst_lead'})
            .ele('set',{'name':'fcst_lead_0'})
            .ele('val',plotParams.curves[0]['forecast-length']);
        plot_fix.ele('field',{'equalize':'false','name':'vx_mask'})
            .ele('set',{'name':'vx_mask_1'})
            .ele('val',plotParams.curves[0].region);
        xml.end({pretty: true});
        plot.ele('plot_cond');
        var indep = plot.ele('indep', {'equalize':'false','name':'fcst_init_beg'});
        _addDateElementsBetween(indep, moment("2018-11-01 00:00:00"), moment("2018-11-04 00:00:00"), 6*60*60);
        plot.ele('calc_stat').ele('calc_sl1l2',true);
        plot.ele('plot_stat','mean');
        var tmpl = plot.ele('tmpl');
        tmpl.ele('data_file',key + '.data');
        tmpl.ele('plot_file',key + '.png');
        tmpl.ele('r_file',key + '.R');
        tmpl.ele('title',_title + " : " + _plotText + " " + plotParams.plotAction);
        tmpl.ele('x_label','test x_label');
        tmpl.ele('y1_label','test y_label');
        tmpl.ele('y2_label');
        tmpl.ele('caption');
        tmpl.ele('job_title');
        tmpl.ele('keep_revisions','false');
        tmpl.ele('listdiffseries1','list()');
        tmpl.ele('listdiffseries2','list()');
        plot.ele('event_equal','false');
        plot.ele('vert_plot','false');
        plot.ele('x_reverse','false');
        plot.ele('num_stats','false');
        plot.ele('indy1_stag','false');
        plot.ele('indy2_stag','false');
        plot.ele('grid_on','true');
        plot.ele('sync_axes','false');
        plot.ele('dump_points1','false');
        plot.ele('dump_points2','false');
        plot.ele('log_y1','false');
        plot.ele('log_y2','false');
        plot.ele('varianceinflationfactor','true');
        plot.ele('plot_type','png16m');
        plot.ele('plot_height','8.5');
        plot.ele('plot_width','11');
        plot.ele('plot_res','72');
        plot.ele('plot_units','in');
        plot.ele('mar','c(8,4,5,4)');
        plot.ele('mgp','c(1,1,0)');
        plot.ele('cex','1');
        plot.ele('title_weight','2');
        plot.ele('title_size','1.4');
        plot.ele('title_offset','-2');
        plot.ele('title_align','0.5');
        plot.ele('xtlab_orient','1');
        plot.ele('xtlab_perp','-0.75');
        plot.ele('xtlab_horiz','0.5');
        plot.ele('xtlab_freq','0');
        plot.ele('xtlab_size','1');
        plot.ele('xlab_weight','1');
        plot.ele('xlab_size','1');
        plot.ele('xlab_offset','2');
        plot.ele('xlab_align','0.5');
        plot.ele('ytlab_orient','1');
        plot.ele('ytlab_perp','0.5');
        plot.ele('ytlab_horiz','0.5');
        plot.ele('ytlab_size','1');
        plot.ele('ylab_weight','1');
        plot.ele('ylab_size','1');
        plot.ele('ylab_offset','-2');
        plot.ele('ylab_align','0.5');
        plot.ele('grid_lty','3');
        plot.ele('grid_col','#cccccc');
        plot.ele('grid_lwd','1');
        plot.ele('grid_x','listX');
        plot.ele('x2tlab_orient','1');
        plot.ele('x2tlab_perp','1');
        plot.ele('x2tlab_horiz','0.5');
        plot.ele('x2tlab_size','0.8');
        plot.ele('x2lab_size','0.8');
        plot.ele('x2lab_offset','-0.5');
        plot.ele('x2lab_align','0.5');
        plot.ele('y2tlab_orient','1');
        plot.ele('y2tlab_perp','0.5');
        plot.ele('y2tlab_horiz','0.5');
        plot.ele('y2tlab_size','1');
        plot.ele('y2lab_size','1');
        plot.ele('y2lab_offset','1');
        plot.ele('y2lab_align','0.5');
        plot.ele('legend_box','o');
        plot.ele('legend_inset','c(0, -.25)');
        plot.ele('legend_ncol','3');
        plot.ele('legend_size','0.8');
        plot.ele('caption_weight','1');
        plot.ele('caption_col','#333333');
        plot.ele('caption_size','0.8');
        plot.ele('caption_offset','3');
        plot.ele('caption_align','0');
        plot.ele('ci_alpha','0.05');
        plot.ele('plot_ci','c("none")');
        plot.ele('show_signif','c(FALSE)');
        plot.ele('plot_disp','c(TRUE)');
        //_addColors(plot,plotParams.curves);
        plot.ele('colors','c("#ff0000FF")');
        plot.ele('pch','c(20)');
        plot.ele('type','c("b")');
        plot.ele('lty','c(1)');
        plot.ele('lwd','c(1)');
        plot.ele('con_series','c(1)');
        plot.ele('order_series','c(1)');
        plot.ele('plot_cmd');
        plot.ele('legend','c("")');
        plot.ele('y1_lim','c()');
        plot.ele('y1_bufr','0.04');
        plot.ele('y2_lim','c()');
        xml.end({ pretty: true});
        dFuture['return']();

    } catch (error) {
        console.log(error);
        dFuture['return'](error);
    }
    dFuture.wait();
    return xml.doc().toString();
};

