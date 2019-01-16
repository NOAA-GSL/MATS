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

// adds date elements to an element of the current xml between a start and an end date, incremented by specific seconds
const _addDateElementsBetween = function(element,start, end, inc_seconds) {
    // this function is an example of javascript pass-by-copy-of-reference
    var currDate = start;
    element.ele('val',{'label':currDate.format('YYYY-MM-DD HH:mm:ss'),'plot_val':""},currDate.format('YYYY-MM-DD HH:mm:ss'));
    while (currDate.add(inc_seconds, 'seconds').diff(end) <= 0) {
        element.ele('val',{'label':currDate.format('YYYY-MM-DD HH:mm:ss'),'plot_val':""},currDate.format('YYYY-MM-DD HH:mm:ss'));
    }
}

plotSpecDataSeries = function (plotParams, key, plotSpecCallback) {
    var host = sumPool.config.connectionConfig.host;
    //var database = sumPool.config.connectionConfig.database;
    var database = "mv_gsd";
    var port = sumPool.config.connectionConfig.port;
    var user = sumPool.config.connectionConfig.user;
    var password = sumPool.config.connectionConfig.password;
    var MV_RSCRIPT = Meteor.settings.private.MV_RSCRIPT;
    var builder = require('xmlbuilder');
    const fs = require('fs');
    const Future = require('fibers/future');
    var dFuture = new Future();
    var xml;
    try {
        xml = builder.create('plot_spec',
            {version: '1.0', encoding: 'UTF-8', standalone: 'no'});
        var connection = xml.ele('connection');
        connection.ele('host', host + ":" + port);
        connection.ele('database', database);
        connection.ele('user', user);
        connection.ele('password', password);
        xml.ele('rscript', MV_RSCRIPT);
        var folders = xml.ele('folders');
        folders.ele('r_tmpl', matsMethods.MV_DIRS.HOME + "/r_tmpl");
        folders.ele('r_work', matsMethods.MV_DIRS.HOME + "/r_work");
        folders.ele('plots', matsMethods.MV_DIRS.PLOTSDIR);
        folders.ele('data', matsMethods.MV_DIRS.DATADIR);
        folders.ele('scripts', matsMethods.MV_DIRS.SCRIPTSDIR);
        var plot = xml.ele('plot');
        plot.ele('template','series_plot.R_tmpl');
        var dep = plot.ele('dep');
        var dep1 = dep.ele('dep1');
        var fcst_var = dep1.ele('fcst_var',{'name':'HGT'});
        fcst_var.ele('stat','RMSE');
        var dep2 = dep.ele('dep2');
        var series1 = plot.ele('series1')
            .ele('field',{'name':'model'})
            .ele('val','GFS');

        var series2 = plot.ele('series2');
        var plot_fix = plot.ele('plot_fix');
        plot_fix.ele('field',{'equalize':'false','name':'fcst_lead'})
            .ele('set',{'name':'fcst_lead_0'})
            .ele('val','0');
        plot_fix.ele('field',{'equalize':'false','name':'vx_mask'})
            .ele('set',{'name':'vx_mask_1'})
            .ele('val','G2');
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
        tmpl.ele('title','test title');
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
        dFuture['return']();

    } catch (error) {
        return (error);
    }
    dFuture.wait();
    return xml.toString();
};

/*
<?xml version="1.0" encoding="UTF-8" standalone="no"?>

*/
