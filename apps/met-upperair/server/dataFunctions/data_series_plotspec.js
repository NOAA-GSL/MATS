import {Meteor} from 'meteor/meteor';
import {
    matsCollections,
    matsDataCurveOpsUtils,
    matsDataDiffUtils,
    matsDataProcessUtils,
    matsDataQueryUtils,
    matsDataUtils,
    matsTypes,
    matsMethods,
    matsParamUtils
} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'
var xmlBuilder = require('xmlbuilder');


const statMvTranslation = {
    'RMS': 'RMSE',
    'Bias (Model - Obs)': 'ME',
    'N': "",
    'Model average': "FBAR",
    'Obs average': "OBAR"
}

const _title = function () {
    try {
        if (matsCollections.Settings === undefined || matsCollections.Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
            return "";
        } else {
            //return matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title;
            return "Title";
        }
    } catch (someError) {
        return "";
    }
}

// const _plotText = function (p) {
//     var format = p.plotFormat;
//
//     if (matsCollections.PlotParams.findOne({name: 'plotFormat'}) &&
//         matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap &&
//         matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap[p.plotFormat] !== undefined) {
//         format = matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap[p.plotFormat];
//     }
//     if (format === undefined) {
//         format = "Unmatched";
//     }
//     const plotType = (_.invert(plotParams.plotTypes))[true];
//     switch (plotType) {
//         case matsTypes.PlotTypes.timeSeries:
//             return "TimeSeries " + p.dates + " : " + format;
//             break;
//         case matsTypes.PlotTypes.profile:
//             return "Profile: " + format;
//             break;
//         case matsTypes.PlotTypes.dieoff:
//             return "DieOff: " + format;
//             break;
//         case matsTypes.PlotTypes.threshold:
//             return "Threshold: " + format;
//             break;
//         case matsTypes.PlotTypes.validtime:
//             return "ValidTime: " + format;
//             break;
//         case matsTypes.PlotTypes.dailyModelCycle:
//             return "DailyModelCycle " + p.dates + " : " + format;
//             break;
//         case matsTypes.PlotTypes.map:
//             return "Map " + p.dates + " ";
//             break;
//         case matsTypes.PlotTypes.histogram:
//             return "Histogram: " + format;
//             break;
//         default:
//             return "Scatter: " + p.dates + " : " + format;
//     }
// }

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
const _addDateElementsBetween = function(element,plotParams) {
    const dateParts = plotParams.dates.split(" - ");
    const start = moment(dateParts[0]);
    const end = moment(dateParts[1]);
    const inc_seconds = 6*60*60;
    try {
    // this function is an example of javascript pass-by-copy-of-reference
        var currDate = start;
        element.ele('val',{'label':currDate.format('YYYY-MM-DD HH:mm:ss'),'plot_val':""},currDate.format('YYYY-MM-DD HH:mm:ss'));
        while (currDate.add(inc_seconds, 'seconds').diff(end) <= 0) {
            element.ele('val',{'label':currDate.format('YYYY-MM-DD HH:mm:ss'),'plot_val':""},currDate.format('YYYY-MM-DD HH:mm:ss'));
        }
    } catch (someError) {
        return "";
    }
}
// parse the databases from the curves and add a database string
const _addDatabaseElement = function(element, curves){
    try {
        databases = [];

        for (var ci=0; ci < curves.length; ci++) {
            if (!databases.includes(curves[ci].database)) {
                databases.push(curves[ci].database);
            }
        }
        databasesStr = databases.join("'");
        element.ele('database',databasesStr);
        return element;
    } catch (someError) {
        return "";
    }
}
// add the required metviewer folders
const _addFolders = function(element) {
    try {
        element.ele('rscript', Meteor.settings.private.MV_RSCRIPT);
        var folders = element.ele('folders');
        folders.ele('r_tmpl', matsMethods.MV_DIRS.HOME + "/r_tmpl");
        folders.ele('r_work', matsMethods.MV_DIRS.HOME + "/r_work");
        folders.ele('plots', matsMethods.MV_DIRS.PLOTSDIR);
        folders.ele('data', matsMethods.MV_DIRS.DATADIR);
        folders.ele('scripts', matsMethods.MV_DIRS.SCRIPTSDIR);
        return element;
    } catch (e) {
    }
}
// start the plotspec
const _startPlotSpec = function(pool, plotParams) {
    try {
        var xml = xmlBuilder.create('plot_spec', {version: "1.0", encoding: "UTF-8", standalone: false});
        var connection = xml.ele('connection');
        connection.ele('host', sumPool.config.connectionConfig.host + ":" + sumPool.config.connectionConfig.port);
        connection.ele('user', sumPool.config.connectionConfig.user);
        connection.ele('password', sumPool.config.connectionConfig.password);
        _addDatabaseElement(connection, plotParams.curves);
        _addFolders(xml);
        return xml;
    } catch (e) {
    }
}

const _add_plot_ci = function(element,plotParams){
    try { //example c("none","none")
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push('"none"');
        }
        cListStr += cList.join(',') + ')';
        element.ele('plot_ci', cListStr);
    } catch (e) {
    }
}

const _add_show_signif = function(element,plotParams){
    try { //example c(FALSE,FALSE)
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push('FALSE');
        }
        cListStr += cList.join(',') + ')';
        element.ele('show_signif', cListStr);
    } catch (e) {
    }
}

const _add_plot_disp = function(element,plotParams){
    try { //example c(TRUE,TRUE)
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push('TRUE');
        }
        cListStr += cList.join(',') + ')';
        element.ele('plot_disp', cListStr);
    } catch (e) {
    }
}

const _addColors = function(element,plotParams){
    try { //  example  'c("#ff0000FF","#8000ffFF")'
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            var ch = _rgbToHex(curves[ci].color) + "FF";
            cList.push('"' + ch + '"');
        }
        cListStr += cList.join(',') + ')';
        element.ele('colors', cListStr);
    } catch (e) {
    }
}

const _add_pch = function(element,plotParams){
    try { //example c(20,20)
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push('20');
        }
        cListStr += cList.join(',') + ')';
        element.ele('pch', cListStr);
    } catch (e) {
    }
}

const _add_type = function(element,plotParams){
    try { //example c("b","b")
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push('"b"');
        }
        cListStr += cList.join(',') + ')';
        element.ele('type', cListStr);
    } catch (e) {
    }
}

const _add_lty = function(element,plotParams){
    try { // example c(1,1)
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push(1);
        }
        cListStr += cList.join(',') + ')';
        element.ele('lty', cListStr);
    } catch (e) {
    }
}

const _add_lwd = function(element,plotParams){
    try { // example c(1,1)
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push(1);
        }
        cListStr += cList.join(',') + ')';
        element.ele('lwd', cListStr);
    } catch (e) {
    }
}

const _add_con_series = function(element,plotParams){
    try { // example c(1,1)
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push(1);
        }
        cListStr += cList.join(',') + ')';
        element.ele('con_series', cListStr);
    } catch (e) {
    }
}

const _add_order_series = function(element,plotParams){
    try { // example c(1,2)
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push(ci + 1);
        }
        cListStr += cList.join(',') + ')';
        element.ele('order_series', cListStr);
    } catch (e) {
    }
}

const _add_legend = function(element,plotParams){
    try { // example c("","")
        var curves = plotParams.curves;
        var cList = [];
        var cListStr = 'c(';
        for (var ci = 0; ci < curves.length; ci++) {
            cList.push('""');
        }
        cListStr += cList.join(',') + ')';
        element.ele('legend', cListStr);
    } catch (e) {
    }
}

plotSpecDataSeries = function (plotParams, key, plotSpecCallback) {
    const fs = require('fs');
    const Future = require('fibers/future');
    var dFuture = new Future();
    // there are two possible axis for metviewer. We want to collect all the mean variables
    // into groups. We will take the two largest groups.
    var axisVars = {'y1':[],'y2':[]};
    try {
        var xml = _startPlotSpec(sumPool,plotParams);
        var plot = xml.ele('plot');
        plot.ele('template','series_plot.R_tmpl');
        /*
            variables:
            variables that share an axis are different dependent variables. Put them in dep1.
            variables that have differing axis must go in different Y axis vars (and you can only have two of those)
         */
        var curves = plotParams.curves;
        var yaxesDefault = "auto-by-variable";
        var dependentAxes = {'y1':[],'y2':[]};
        dependentAxes['y1'].push(curves[0]);
        var dependentAxesVariables = {'y1':[curves[0]['variable']],'y2':[]};
        for (var ci=1; ci < curves.length; ci++) {
            if (curves[ci].yaxes != yaxesDefault) {
                // sort it into its selectedYaxes
                dependentAxes[curves[ci].yaxes].push(curves[ci]);
            } else {
                // sort it into an axis by its variable
                const variable = curves[ci].variable;
                 if (dependentAxesVariables['y1'].includes(variable)) {
                     dependentAxes['y1'].push(curves[ci]);
                 } else {
                     dependentAxes['y2'].push(curves[ci]);
                 }
            }
        }
        var dep = plot.ele('dep');
        for (var daci=0; daci < dependentAxes['y1'].length; daci++) {
            dep.ele('dep1').ele('fcst_var', {'name': dependentAxes['y1'][daci]['variable']})
            .ele('stat', statMvTranslation[dependentAxes['y1'][daci]['statistic']]);
        }

        var dep2 = dep.ele('dep2');
        for (var daci=0; daci < dependentAxes['y2'].length; daci++) {
            dep2.ele('fcst_var', {'name': dependentAxes['y2'][daci]['variable']})
            .ele('stat', statMvTranslation[dependentAxes['y2'][daci]['statistic']]);
        }
        for (var daci=0; daci < dependentAxes['y1'].length; daci++) {
            plot.ele('series1').ele('field', {'name': 'model'})
                .ele('val', dependentAxes['y1'][daci]['data-source']);
        }
        var series2 = plot.ele('series2');
        for (var daci=0; daci < dependentAxes['y2'].length; daci++) {
            series2.ele('field', {'name': 'model'})
                .ele('val', dependentAxes['y2'][daci]['data-source']);
        }

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
        _addDateElementsBetween(indep, plotParams);
        plot.ele('calc_stat').ele('calc_sl1l2',true);
        plot.ele('plot_stat','mean');
        var tmpl = plot.ele('tmpl');
        tmpl.ele('data_file',key + '.data');
        tmpl.ele('plot_file',key + '.png');
        tmpl.ele('r_file',key + '.R');
        //tmpl.ele('title',_title() + " : " + plotParams.plotAction + " " + plotParams.plotAction);
        tmpl.ele('title',"unknown");
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
        plot.ele('varianceinflationfactor','false');
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
        _add_plot_ci(plot,plotParams);
        _add_show_signif(plot,plotParams);
        _add_plot_disp(plot,plotParams);
        _addColors(plot,plotParams);
        _add_pch(plot,plotParams);
        _add_type(plot,plotParams);
        _add_lty(plot,plotParams);
        _add_lwd(plot,plotParams);
        _add_con_series(plot,plotParams);
        _add_order_series(plot,plotParams);
        plot.ele('plot_cmd');
        _add_legend(plot,plotParams);
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

