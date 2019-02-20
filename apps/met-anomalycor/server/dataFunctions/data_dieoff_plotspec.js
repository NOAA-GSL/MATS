import {Meteor} from 'meteor/meteor';
import {matsPlotSpecUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

plotSpecDieOff = function (plotParams, key, plotSpecCallback) {
    try {
        var spec = matsPlotSpecUtils.startPlotSpec(sumPool,plotParams);
        var xml = spec.xml;
        var plot = spec.plot;
        const dependentAxes = matsPlotSpecUtils.getDependentAxis(plotParams);
        matsPlotSpecUtils.addTemplate(plot,'series_plot.R_tmpl');
        matsPlotSpecUtils.addAnomalycorrDeps(plot, dependentAxes);
        matsPlotSpecUtils.addSeries(plot, dependentAxes, plotParams);
        matsPlotSpecUtils.addPlotFix(plot); // unused for time series
        matsPlotSpecUtils.addPlotCond(plot); // unused for time series
        matsPlotSpecUtils.addIndepForecastHours(plot, plotParams);
        matsPlotSpecUtils.addCalcStat(plot,'calc_sal1l2'); // unused for time series
        matsPlotSpecUtils.addPlotStat(plot,'mean'); //We always do Summary with Mean
        matsPlotSpecUtils.addTmpl(plot, key, plotParams, dependentAxes);
        matsPlotSpecUtils.addMiscellaneous(plot, plotParams);
        matsPlotSpecUtils.addPlotCi(plot,plotParams);
        matsPlotSpecUtils.addShowSignif(plot,plotParams);
        matsPlotSpecUtils.addPlotDisp(plot,plotParams);
        matsPlotSpecUtils.addColors(plot,plotParams);
        matsPlotSpecUtils.addPch(plot,plotParams);
        matsPlotSpecUtils.addType(plot,plotParams);
        matsPlotSpecUtils.addLty(plot,plotParams);
        matsPlotSpecUtils.addLwd(plot,plotParams);
        matsPlotSpecUtils.addConSeries(plot,plotParams);
        matsPlotSpecUtils.addOrderSeries(plot,plotParams);
        matsPlotSpecUtils.addPlotCmd(plot);
        matsPlotSpecUtils.addLegend(plot,plotParams);
        matsPlotSpecUtils.addY1Lim(plot);
        matsPlotSpecUtils.addY1Bufr(plot);
        matsPlotSpecUtils.addY2Lim(plot);
        matsPlotSpecUtils.endPlotSpec(xml);
    } catch (error) {
        //console.log(error);
        plotSpecCallback (error.toString(), null);
    }
    plotSpecCallback (null, xml.doc().toString());
};

