
Template.textProfileOutput.helpers({
    plotName: function() {
        return Session.get('plotName');
    },
    curves: function () {
        return Session.get('Curves');
    },
    curveText: function () {
        var text = this.label + ": " +
            this.model + ":" +
            this.region.split(' ')[0] + ", "  +
            this.bottom + "-" +
            this.top + "mb " +
            this.variable + " " +
            this.statistic + " " +
            this['forecast length'] +"h" +
            this['curve-dates-dateRange-from'] + " " +
            this['curve-dates-dateRange-to'];
        return text;
    },
    pressureLevels: function(curveLabel) {
        //var dataSet = Session.get('dataset');
        var curves = Session.get('Curves');
        if (plotResult.data === undefined) {
            return [];
        }
        var c = 0;
        for (c=0; c < curves.length - 1;c++) {  // do not include the zero curve which has been added onto the end of the dataset
            if (curveLabel == curves[c].label) {
                break;
            }
        }
        return plotResult.data[c].data
    },
    points: function(pressureLevel) {
        var stats = pressureLevel[5];
        if (stats === undefined) {
            return "";
        }
        var mb = pressureLevel[1];
        var val = pressureLevel[0];
        var stde = stats.stde_betsy;
        var mean = stats.d_mean;
        var n = stats.n_good;
        var lag1 = stats.lag1;
        return "<td>" + mb * -1 + "</td>" +
            "<td>" + val + "</td>" +
            "<td>" + stde + "</td>" +
            "<td>" + mean + "</td>" +
            "<td>" + n + "</td>" +
            "<td>" + lag1 + "</td>";
    }
});

Template.textProfileOutput.events({
    'click .export': function() {
        var settings = Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        var fillStr = settings.NullFillString;
        var data = [];
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return data;
        }
        var clabels = 'time';
        for (var c=0; c < curves.length;c++) {
            clabels += "," + curves[c].label;
        }
        data.push(clabels);
        //var dataSet = Session.get('dataset');
        var curveNums = plotResult.data.length;
        var dataRows = _.range(plotResult.data[0].data.length - 1);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex ++) {
            var line = moment(plotResult.data[0].data[rowIndex][0]).format('YYYY-MM-DD:HH');
            for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
                var pdata = plotResult.data[curveIndex].data[rowIndex][1] !== null?(plotResult.data[curveIndex].data[rowIndex][1]).toPrecision(4):fillStr;
                line += "," + pdata;
            }
            data.push(line);
        }
        var csvString = data.join("%0A");
        var a         = document.createElement('a');
        a.href        = 'data:attachment/csv,' + csvString;
        a.target      = '_blank';
        a.download    = 'data.csv';
        document.body.appendChild(a);
        a.click();
    }
});
