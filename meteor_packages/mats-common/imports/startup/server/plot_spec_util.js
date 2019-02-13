import {Meteor} from "meteor/meteor";
import {
    matsCollections,
    matsDataCurveOpsUtils,
    matsDataDiffUtils,
    matsDataProcessUtils,
    matsDataQueryUtils,
    matsDataUtils,
    matsMethods,
    matsParamUtils,
    matsTypes
} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment';

const statMvTranslation = {
    'RMS': 'RMSE',
    'Bias (Model - Obs)': 'ME',
    'N': "",
    'Model average': "FBAR",
    'Obs average': "OBAR"
};

const xmlBuilder = require('xmlbuilder');

const _title = function () {
    try {
        if (matsCollections.Settings === undefined || matsCollections.Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
            return "";
        } else {
            return matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title;
        }
    } catch (someError) {
        return "";
    }
};

const _plotText = function (plotParams) {
    var format = plotParams.plotFormat;

    if (matsCollections.PlotParams.findOne({name: 'plotFormat'}) &&
        matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap &&
        matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap[plotParams.plotFormat] !== undefined) {
        format = matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap[plotParams.plotFormat];
    }
    if (format === undefined) {
        format = "Unmatched";
    }
    const plotType = (_.invert(plotParams.plotTypes))[true];
    switch (plotType) {
        case matsTypes.PlotTypes.timeSeries:
            return "TimeSeries " + plotParams.dates + " : " + format;
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
            return "DailyModelCycle " + plotParams.dates + " : " + format;
            break;
        case matsTypes.PlotTypes.map:
            return "Map " + plotParams.dates + " ";
            break;
        case matsTypes.PlotTypes.histogram:
            return "Histogram: " + format;
            break;
        default:
            return "Scatter: " + plotParams.dates + " : " + format;
    }
}

const _componentToHex = function(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
};

const _rgbToHex = function(color) {
    const cParts = color.replace('rgb(','').replace(')','').split(',');
    const r = Number(cParts[0]);
    const g = Number(cParts[1]);
    const b = Number(cParts[2]);
    return "#" + _componentToHex(r) + _componentToHex(g) + _componentToHex(b);
};


const _getUniqDates = function(dates, database, model, dataSource, region, variable, forecastLength, fromSecs, toSecs, validTimes ) {
    var regionsClause = "";
    if (region != null && region.length > 0) {
        const regions = region.map(function (r) {
            return "'" + r + "'";
        }).join(',');
        regionsClause = "and h.vx_mask IN(" + regions + ")";
    }

    // the forecast lengths appear to have sometimes been inconsistent (by format) in the varias databases
    // so they have been sanitized for display purposes in the forecastValueMap.
    // now we have to go get the damn ole unsanitary ones for the database.
    var forecastLengthsClause = "";
    if (forecastLength != null && forecastLength.length > 0) {
        const forecastValueMap = matsCollections.CurveParams.findOne({name: 'forecast-length'}, {valuesMap: 1})['valuesMap'][database][model];
        const forecastLengths = forecastLength.map(function (fl) {
            return forecastValueMap[fl];
        }).join(',');
        forecastLengthsClause = "and ld.fcst_lead IN (" + forecastLengths + ")";
    }

    var statement = "select ld.fcst_valid_beg as avtime " +
        "from mv_gsd.stat_header h, mv_gsd.line_data_sl1l2 ld " +
        "where 1=1 and h.model = '" + dataSource + "' " +
        regionsClause +
        "and unix_timestamp(ld.fcst_valid_beg) >= '" + fromSecs + "' " +
        "and unix_timestamp(ld.fcst_valid_beg) <= '" + toSecs + "' " +
        forecastLengthsClause +
        "and h.fcst_var = '" + variable + "' " +
        "and ld.stat_header_id = h.stat_header_id " +
        "group by avtime order by avtime;";

    var rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, statement);
    if (rows === undefined || rows === null || rows.length === 0) {
        console.log(matsTypes.Messages.NO_DATA_FOUND);
    } else {

        for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const dstrMoment = moment(rows[rowIndex].avtime);
            const dstr = dstrMoment.format('YYYY-MM-DD HH:mm:ss').trim();
            // apply the valid-time filter here.....
            var valid = true;
            if (validTimes != null && validTimes.length > 0) {
                valid = false;
                const momentSdiHour = Number(dstrMoment.format("HH"));
                for (var vti = 0; vti < validTimes.length; vti++) {
                    const thisvt = Number(validTimes[vti]);
                    if (momentSdiHour === thisvt) {
                        // it is valid
                        valid = true;
                        break;
                    }
                }
            }
            if (valid === true && dates.indexOf(dstr) === -1) {
                dates.push(dstr);
            }
        }
    }
    return dates;
}


// adds date elements to an element of the current xml between a start and an end date, incremented by specific seconds
// series variables can be grouped or ungrouped.
// e.g. grouped ...    <val>2018-11-01 00:00:00,2018-11-01 06:00:00,2018-11-01 12:00:00,2018-11-01</val>
// e.g. ungrouped ...    <val>2018-11-01 00:00:00</val>
//                       <val>2018-11-01 06:00:00</val>
//                       <val>2018-11-01 12:00:00</val>
//                       <val>2018-11-01</val>

// for time series valid_beg is always ungrouped.
const _getSortedDatesForIndepRange = function(plotParams) {
    const dateRange = matsDataUtils.getDateRange(plotParams.dates);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    const curves = plotParams.curves;
    // have to get all the valid dates for each curve then union them
    // to get a complete date list
    var dates = [];
    for (var ci = 0; ci < curves.length; ci++) {
        var curve = curves[ci];
        const validTimes = curve['valid-time'];
        const region = curve['region'];
        const forecastLength = curve['forecast-length'];
        const variable = curve['variable'];
        //example 2018-11-06 00:00:00
        const database = curve['database'];
        const dataSource = curve['data-source'];
        const model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[database][dataSource][0];
        dates = _getUniqDates(dates, database, model, dataSource, region, variable, forecastLength, fromSecs, toSecs, validTimes);
    }
    // sort the dates
    const sortedDates = dates.sort(
        function (a, b) {
            return new moment(a) - new moment(b);
        }
    );
    return sortedDates;
}

const _getSortedDatesForDepRange = function(curve) {
    var dates = [];
    const dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
    const fromSecs = dateRange.fromSeconds;
    const toSecs = dateRange.toSeconds;
    const validTimes = curve['valid-time'];
    const region = curve['region'];
    const forecastLength = curve['forecast-length'];
    const variable = curve['variable'];
    //example 2018-11-06 00:00:00
    const database = curve['database'];
    const dataSource = curve['data-source'];
    const model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[database][dataSource][0];
    dates = _getUniqDates(dates, database, model, dataSource, region, variable, forecastLength, fromSecs, toSecs, validTimes);

    // sort the dates
    const sortedDates = dates.sort(
        function (a, b) {
            return new moment(a) - new moment(b);
        }
    );
    return sortedDates;
}


// for profiles valid_beg is always grouped.
const addIndepUngroupedDateElementsBetween = function (element, plotParams) {
    const sortedDates = _getSortedDatesForIndepRange(plotParams);
    //these must be ungrouped
    for (var sdi = 0; sdi < sortedDates.length; sdi++) {
        element.ele('val', {
            'label': sortedDates[sdi],
            'plot_val': ""
        }, sortedDates[sdi]);
    }
}

// parse the databases from the curves and add a database string
const addDatabaseElement = function(element, curves){
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
};

// add the required metviewer folders
const addFolders = function(element) {
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
};

// start the plotspec
const startPlotSpec = function(pool, plotParams) {
    try {
        var xml = xmlBuilder.create('plot_spec', {version: "1.0", encoding: "UTF-8", standalone: false});
        var connection = xml.ele('connection');
        connection.ele('host', sumPool.config.connectionConfig.host + ":" + sumPool.config.connectionConfig.port);
        addDatabaseElement(connection, plotParams.curves);
        connection.ele('user', sumPool.config.connectionConfig.user);
        connection.ele('password', sumPool.config.connectionConfig.password);
        const management_system = Meteor.settings.private.MV_DB_MANAGEMENT_SYSTEM != null ? Meteor.settings.private.MV_DB_MANAGEMENT_SYSTEM : "mysql";
        connection.ele('management_system', management_system);
        addFolders(xml);
        var plot = xml.ele('plot');
        return {xml:xml,plot:plot};
    } catch (e) {
    }
};

const addPlotCi = function(element,plotParams){
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
};

const addShowSignif = function(element,plotParams){
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
};

const addPlotDisp = function(element,plotParams){
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
};

const addColors = function(element,plotParams){
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
};

const addPch = function(element,plotParams){
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
};

const addType = function(element,plotParams){
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
};

const addLty = function(element,plotParams){
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
};

const addLwd = function(element,plotParams){
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
};

const addConSeries = function(element,plotParams){
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
};

const addOrderSeries = function(element,plotParams){
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
};

const addLegend = function(element,plotParams){
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
};

const addSeries = function(plot, dependentAxes, plotParams) {
// data-source(models), region(vx_mask),forecast_length (fcst_lead), and pres-level(fcst_lev)
    //  (and average()?)
    // are series variables multiple selections are MV grouped - they are associated with different curves.
    // We can differentiate series by axis or by dependent variables. For every dependent variable I have to have another series.

    // MV cannot have a different model/stat/fcst_lead/fcst_lvl pair on the same axis.

    // They can also go on the axis that is associated with the curve that the region parameter is on.
    // In other words force a new series.
    // i.e. Y1 Series variables or Y2 Series variables
    // The name-val pairs in a series must be uniq. If two curves repeat them they don't get added
    // to the plotspec twice.

    // series variables can be grouped or ungrouped.
    // e.g. grouped ...    <val>2018-11-01 00:00:00,2018-11-01 06:00:00,2018-11-01 12:00:00,2018-11-01</val>
    // e.g. ungrouped ...    <val>2018-11-01 00:00:00</val>
    //                       <val>2018-11-01 06:00:00</val>
    //                       <val>2018-11-01 12:00:00</val>
    //                       <val>2018-11-01</val>


    var models = [];
    var vx_masks = [];
    var fcst_leads = [];
    var fcst_levls = [];
    var series1 = plot.ele('series1');
    for (var daci = 0; daci < dependentAxes['y1'].length; daci++) {
        const curve = dependentAxes['y1'][daci];
        const database = curve['database'];
        const model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
        if (models.indexOf(model) === -1) {
            models.push(model);
            series1.ele('field', {'name': 'model'})
                .ele('val', model);
        }
        // only add the vx_mask tag if there are regions requested - leaving it out will get them all
        if (curve['region'] != null && curve['region'].length > 0) {
            const regions = curve['region'].join(',');
            if (vx_masks.indexOf(regions) === -1) {
                vx_masks.push(regions);
                series1.ele('field', {'name': 'vx_mask'})
                    .ele('val', regions);
            }
        }
        // only add the fcst_lead tag if there are forecast-lengths requested - leaving it out will get them all
        if (curve['forecast-length'] != null && curve['forecast-length'].length > 0) {
            // have to get the unsanitized values..
            const forecastValueMap = matsCollections.CurveParams.findOne({name: 'forecast-length'}, {valuesMap: 1})['valuesMap'][database][model];
            const forecastLengths = curve['forecast-length'].map(function (fl) {
                return forecastValueMap[fl];
            }).join(',');
            if (fcst_leads.indexOf(forecastLengths) === -1) {
                fcst_leads.push(forecastLengths);
                series1.ele('field', {'name': 'fcst_lead'})
                    .ele('val', forecastLengths);
            }
        }
        // only add the fcst_lev tag if there are pres-levels requested - leaving it out will get them all
        if (curve['pres-level'] != null && curve['pres-level'].length > 0) {
            const presLvls = curve['pres-level'].join(',');
            if (fcst_levls.indexOf(presLvls) === -1) {
                fcst_leads.push(presLvls);
                series1.ele('field', {'name': 'fcst_lev'})
                    .ele('val', presLvls);
            }
        }
        // for profiles, dieoffs, validTimes, thresholds, and histograms dates are series variables
        const type = (_.invert(plotParams.plotTypes))[true];
        if (type === matsTypes.PlotTypes.profile ||
            type === matsTypes.PlotTypes.dieoff ||
            type === matsTypes.PlotTypes.validtime ||
            type === matsTypes.PlotTypes.threshold ||
            type === matsTypes.PlotTypes.histogram ) {
            // these have series variable curve-dates.
            const sortedDates = _getSortedDatesForDepRange(curve);
            series1.ele('field', {'name': 'fcst_valid_beg'})
                .ele('val', sortedDates.join(','));
        }
    }
    models = [];
    vx_masks = [];
    fcst_leads = [];
    fcst_levls = [];
    series2 = plot.ele('series2');
    for (var daci = 0; daci < dependentAxes['y2'].length; daci++) {
        const curve = dependentAxes['y2'][daci];
        const database = curve['database'];
        const model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
        console.log ("series2 model:", model);
        if (models.indexOf(model) === -1) {
            models.push(model);
            series2.ele('field', {'name': 'model'})
                .ele('val', model);
        }
        // only add the vx_mask tag if there are regions requested - leaving it out will get them all
        if (curve['region'] != null && curve['region'].length > 0) {
            const regions = curve['region'].join(',');
            if (vx_masks.indexOf(regions) === -1) {
                vx_masks.push(regions);
                series2.ele('field', {'name': 'vx_mask'})
                    .ele('val', regions);
            }
        }
        // only add the fcst_lead tag if there are forecast-lengths requested - leaving it out will get them all
        if (curve['forecast-length'] != null && curve['forecast-length'].length > 0) {
            // have to get the unsanitized values..
            const forecastValueMap = matsCollections.CurveParams.findOne({name: 'forecast-length'}, {valuesMap: 1})['valuesMap'][database][model];
            const forecastLengths = curve['forecast-length'].map(function (fl) {
                return forecastValueMap[fl];
            }).join(',');
            if (fcst_leads.indexOf(forecastLengths) === -1) {
                fcst_leads.push(forecastLengths);
                series2.ele('field', {'name': 'fcst_lead'})
                    .ele('val', forecastLengths);
            }
        }
        // only add the fcst_lev tag if there are pres-levels requested - leaving it out will get them all
        if (curve['pres-level'] != null && curve['pres-level'].length > 0) {
            const presLvls = curve['pres-level'].join(',');
            if (fcst_levls.indexOf(presLvls) === -1) {
                fcst_leads.push(presLvls);
                series2.ele('field', {'name': 'fcst_lev'})
                    .ele('val', presLvls);
            }
        }
    }
}

const getDependentAxis = function(plotParams) {
    // there are two possible axis for metviewer. We want to collect all the variables
    // into groups. We will take the two largest groups.
    // variables and statistics go together. They are dependent variabales in MV.
    // variable/stat pairs always are associated with different curves, and will always be on different axis
    // if possible, but might be assigned an axis via dependentAxes.
    const yaxesDefault = "auto-by-variable";
    var curves = plotParams['curves'];
    var dependentAxes = {'y1': [], 'y2': []};
    dependentAxes['y1'].push(curves[0]);
    var dependentAxesVariables = {'y1': [curves[0]['variable']], 'y2': []};
    for (var ci = 1; ci < curves.length; ci++) {
        if (curves[ci].yaxes != yaxesDefault) {
            // sort it into its selectedYaxes
            dependentAxes[curves[ci].yaxes].push(curves[ci]);
        } else {
            // sort it into an axis by its variable/stat combination
            //     variables:
            //     variables that share an axis are different dependent variables. Put them in dep1.
            // unless it is a variable with multiple stats.
            // different variable with different stats that have differing axis must go in different Y axis vars (and you can only have two of those)

            const variable = curves[ci].variable;
            if (dependentAxesVariables['y1'].includes(variable)) {
                dependentAxes['y1'].push(curves[ci]);
            } else {
                dependentAxes['y2'].push(curves[ci]);
            }
        }
    }
    return dependentAxes;
}

function addDeps(plot, dependentAxes) {
    // If the same variable/statistic pair is present for two curves, we don't assign it twice,
    // once is enough...
    var dep = plot.ele('dep');
    const deps = {"dep1":"y1","dep2":"y2"};
    for (var di=0; di<Object.keys(deps).length;di++) {
        var depKey = Object.keys(deps)[di];
        var depAxis = deps[depKey];
        var subDep = dep.ele(depKey);
        var variableStatisticPairs = {};
        for (var daci = 0; daci < dependentAxes[depAxis].length; daci++) {
            // record the variable-statistic pair
            const variable = dependentAxes[depAxis][daci]['variable'];
            const stat = statMvTranslation[dependentAxes[depAxis][daci]['statistic']];
            if (variableStatisticPairs[variable] == null) {
                variableStatisticPairs[variable] = [stat];
            } else {
                variableStatisticPairs[variable].push(stat);
            }
        }
        var vars = Object.keys(variableStatisticPairs);
        for (var v = 0; v < vars.length; v++) {
            const stats = Array.from(new Set(variableStatisticPairs[vars[v]]));
            var dep1Elem = subDep.ele('fcst_var', {'name': vars[v]});
            for (var si=0;si<stats.length;si++) {
                dep1Elem.ele('stat',stats[si]);
            }
        }
    }
}

const addSeriesLabels = function(element,dependentAxes) {
    element.ele('x_label', 'Time');
    var y1vars = [];
    for (var y1i=0; y1i < dependentAxes['y1'].length; y1i++) {
        if (!y1vars.includes(dependentAxes['y1'][y1i]['variable'])) {
            y1vars.push(dependentAxes['y1'][y1i]['variable']);
        }
    }
    element.ele('y1_label', y1vars.join(','));
    var y2vars = [];
    for (var y2i=0; y2i < dependentAxes['y2'].length; y2i++) {
        if (!y2vars.includes(dependentAxes['y2'][y2i]['variable'])) {
            y2vars.push(dependentAxes['y2'][y2i]['variable']);
        }
    }
    element.ele('y2_label', y2vars.join(','));
}

const addTemplate = function(plot,templateStr)
{
    plot.ele('template', templateStr);
}

const addIndepDates = function(plot, plotParams) {
    var indep = plot.ele('indep', {'equalize': 'false', 'name': 'fcst_valid_beg'});
    addIndepUngroupedDateElementsBetween(indep, plotParams);
}

const addIndepLevels = function(plot, plotParams) {
    // for profiles we use a union of all the levels available for all the data-sources

    var indep = plot.ele('indep', {'equalize': 'false', 'name': 'fcst_valid_beg'});
    var curves = plotParams.curves;
    var lvls = new Set();
    for (var ci=0; ci<curves.length;ci++) {

    }
    // only add the fcst_lev tag if there are pres-levels requested - leaving it out will get them all
        if (curve['pres-level'] != null && curve['pres-level'].length > 0) {
            const presLvls = curve['pres-level'].join(',');
            if (fcst_levls.indexOf(presLvls) === -1) {
                fcst_leads.push(presLvls);
                series2.ele('field', {'name': 'fcst_lev'})
                    .ele('val', presLvls);
            }
        }

}

const addTmpl = function(plot, key, plotParams, dependentAxes) {
    var tmpl = plot.ele('tmpl');
    tmpl.ele('data_file', key + '.data');
    tmpl.ele('plot_file', key + '.png');
    tmpl.ele('r_file', key + '.R');
    tmpl.ele('title', _title() + " : " + _plotText(plotParams) + " " + plotParams.plotAction);
    addSeriesLabels(tmpl, dependentAxes);
    tmpl.ele('caption');
    tmpl.ele('job_title');
    tmpl.ele('keep_revisions', 'false');
    tmpl.ele('listdiffseries1', 'list()');
    tmpl.ele('listdiffseries2', 'list()');
}

const addPlotFix = function(plot) {
    plot.ele('plot_fix');
}

const addPlotCond = function(plot,plotParams)
{
    plot.ele('plot_cond');
}

const addCalcStat = function(plot,statType){
    plot.ele('calc_stat').ele(statType,true);
} // unused for time series

const addPlotStat = function(plot,stat){
    //Statistics --- We always do Summary with Mean - so there
    plot.ele('plot_stat',stat);
}


const addPlotCmd = function (plot){
    plot.ele('plot_cmd');
}
const addY1Lim = function(plot){
    plot.ele('y1_lim','c()');
}
const addY1Bufr = function(plot){
    plot.ele('y1_bufr','0.04');
}
const addY2Lim = function(plot) {
    plot.ele('y2_lim','c()');
}

const addMiscellaneous = function(plot) {
    plot.ele('event_equal', 'false');
    plot.ele('vert_plot', 'false');
    plot.ele('x_reverse', 'false');
    plot.ele('num_stats', 'false');
    plot.ele('indy1_stag', 'false');
    plot.ele('indy2_stag', 'false');
    plot.ele('grid_on', 'true');
    plot.ele('sync_axes', 'false');
    plot.ele('dump_points1', 'false');
    plot.ele('dump_points2', 'false');
    plot.ele('log_y1', 'false');
    plot.ele('log_y2', 'false');
    plot.ele('varianceinflationfactor', 'true');
    plot.ele('plot_type', 'png16m');
    plot.ele('plot_height', '8.5');
    plot.ele('plot_width', '11');
    plot.ele('plot_res', '72');
    plot.ele('plot_units', 'in');
    plot.ele('mar', 'c(8,4,5,4)');
    plot.ele('mgp', 'c(1,1,0)');
    plot.ele('cex', '1');
    plot.ele('title_weight', '2');
    plot.ele('title_size', '1.4');
    plot.ele('title_offset', '-2');
    plot.ele('title_align', '0.5');
    plot.ele('xtlab_orient', '1');
    plot.ele('xtlab_perp', '-0.75');
    plot.ele('xtlab_horiz', '0.5');
    plot.ele('xtlab_freq', '0');
    plot.ele('xtlab_size', '1');
    plot.ele('xlab_weight', '1');
    plot.ele('xlab_size', '1');
    plot.ele('xlab_offset', '2');
    plot.ele('xlab_align', '0.5');
    plot.ele('ytlab_orient', '1');
    plot.ele('ytlab_perp', '0.5');
    plot.ele('ytlab_horiz', '0.5');
    plot.ele('ytlab_size', '1');
    plot.ele('ylab_weight', '1');
    plot.ele('ylab_size', '1');
    plot.ele('ylab_offset', '-2');
    plot.ele('ylab_align', '0.5');
    plot.ele('grid_lty', '3');
    plot.ele('grid_col', '#cccccc');
    plot.ele('grid_lwd', '1');
    plot.ele('grid_x', 'listX');
    plot.ele('x2tlab_orient', '1');
    plot.ele('x2tlab_perp', '1');
    plot.ele('x2tlab_horiz', '0.5');
    plot.ele('x2tlab_size', '0.8');
    plot.ele('x2lab_size', '0.8');
    plot.ele('x2lab_offset', '-0.5');
    plot.ele('x2lab_align', '0.5');
    plot.ele('y2tlab_orient', '1');
    plot.ele('y2tlab_perp', '0.5');
    plot.ele('y2tlab_horiz', '0.5');
    plot.ele('y2tlab_size', '1');
    plot.ele('y2lab_size', '1');
    plot.ele('y2lab_offset', '1');
    plot.ele('y2lab_align', '0.5');
    plot.ele('legend_box', 'o');
    plot.ele('legend_inset', 'c(0, -.25)');
    plot.ele('legend_ncol', '3');
    plot.ele('legend_size', '0.8');
    plot.ele('caption_weight', '1');
    plot.ele('caption_col', '#333333');
    plot.ele('caption_size', '0.8');
    plot.ele('caption_offset', '3');
    plot.ele('caption_align', '0');
    plot.ele('ci_alpha', '0.05');
}

const endPlotSpec = function(xml) {
    xml.end({pretty: true});
}

export default matsPlotSpecUtils = {
    startPlotSpec:startPlotSpec,
    addDeps:addDeps,
    getDependentAxis:getDependentAxis,
    addDatabaseElement:addDatabaseElement,
    addFolders:addFolders,
    addPlotCi:addPlotCi,
    addShowSignif:addShowSignif,
    addPlotDisp:addPlotDisp,
    addColors:addColors,
    addPch:addPch,
    addType:addType,
    addLty:addLty,
    addLwd:addLwd,
    addConSeries:addConSeries,
    addOrderSeries:addOrderSeries,
    addLegend:addLegend,
    addSeries:addSeries,
    addSeriesLabels:addSeriesLabels,
    addTemplate:addTemplate,
    addIndepDates:addIndepDates,
    addTmpl:addTmpl,
    addPlotFix:addPlotFix,
    addPlotCond:addPlotCond,
    addCalcStat:addCalcStat,
    addPlotStat:addPlotStat,
    addPlotCmd:addPlotCmd,
    addY1Lim:addY1Lim,
    addY1Bufr:addY1Bufr,
    addY2Lim:addY2Lim,
    addMiscellaneous:addMiscellaneous,
    endPlotSpec:endPlotSpec,
    addIndepLevels:addIndepLevels
}