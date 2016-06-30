
Template.textSeriesOutput.helpers({
    plotName: function() {
        return Session.get('plotName');
    },
    curves: function () {
        return Session.get('Curves');
    },
    curveLabel: function (curve) {
      return curve.label;
    },
    curveText: function () {
        var text = this.label + ": " +
            this['data source'] + ":" +
            this.region.split(' ')[0] + ", "  +
            this.bottom + "-" +
            this.top + "mb " +
            this.variable + " " +
            this['forecast length'] +"h";
        //console.log("curveText: " + text);
        return text;
    },
    dataRows: function() {
        if (plotResult.data === undefined) {
            return [];
        }
        var dataRows = _.range(plotResult.data[0].data.length - 1);
        return dataRows;
    },
    points: function() {
        // if (plotResult.data === undefined) {
        //     return "";
        // }
        // var line = "<td>" + moment.utc(plotResult.data[0].data[rowIndex][0]).format('YYYY-MM-DD:HH') + "</td>";
        // var settings = Settings.findOne({},{fields:{NullFillString:1}});
        // if (settings === undefined) {
        //     return false;
        // }
        // var fillStr = settings.NullFillString;
        // var curves = Session.get('Curves');
        // var curveNums = curves.length;
        // for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
        //     var pdata = plotResult.data[curveIndex].data[rowIndex][1] !== null?(plotResult.data[curveIndex].data[rowIndex][1]).toPrecision(4):fillStr;
        //     line += "<td>" + pdata + "</td>";
        // }
        //console.log("points: " + line);
        var line =  "<td>2016-06-29:00</td><td>4.584</td>";
        return line;
    },
    stats: function() {
        // var curves = Session.get('Curves');
        // if (curves === undefined || curves.length == 0) {
        //     return;
        // }
        // if (plotResult.data === undefined) {
        //     return;
        // }
        // var cindex;
        // for (cindex = 0; cindex < curves.length; cindex++) {
        //     if (curves[cindex].label == curve.label) {
        //         break;
        //     }
        // }
        //var data = [];
        //var cindex = 0;
        //for (var di = 0; di < plotResult.data[cindex].data.length; di++){
        //    if (plotResult.data[cindex].data[di][1] !== null) data.push(plotResult.data[cindex].data[di][1]);
        //}
        // var resultData =plotResult.data[0].data;
        // var data = resultData.map(function(value,index){return value[1];});
        // var weimean = mean(data).toPrecision(4);
        // var min =  Math.min.apply(Math, data).toPrecision(4);
        // var max =  Math.max.apply(Math, data).toPrecision(4);
        // var sd = Math.sqrt(variance(data)).toPrecision(4);
        // var se = Math.sqrt(variance(data)/(data.length-1)).toPrecision(4);
        // //var line = "<td>" + curve.label + "</td>" +
        // var line = "<td>" + "my curve" + "</td>" +
        //     "<td>" + weimean + "</td>" +
        //     "<td>" + min + "</td>" +
        //     "<td>" + max + "</td>" +
        //     "<td>" + sd + "</td>" +
        //     "<td>" + se + "</td>";
        // console.log("stats: " + line);
        var line = "<td>C-8</td><td>8.060</td><td>1.340</td><td>18.19</td><td>3.739</td><td>0.1587</td>";
        return line;
    }
});

Template.textSeriesOutput.events({
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
        var curveNums = plotResult.data.length - 1;
        var dataRows = _.range(plotResult.data[0].data.length - 1);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex ++) {
            var line = moment.utc(plotResult.data[0].data[rowIndex][0]).format('YYYY-MM-DD:HH');
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
