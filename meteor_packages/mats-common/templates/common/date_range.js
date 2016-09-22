import { matsTypes } from 'meteor/randyp:mats-common';

var startInit = function() {
    var today = new Date();
    var thenDate = new Date(today.getTime() - 30*24*60*60*1000);
    var yr = thenDate.getFullYear();
    var day = thenDate.getDate();
    var month = thenDate.getMonth() + 1;
    var hour = thenDate.getHours();
    var minute = thenDate.getMinutes();
    return month + '/' + day + "/" + yr+ " " + hour + ":" + minute;
};
var stopInit = function() {
    var today = new Date();
    var yr = today.getFullYear();
    var day = today.getDate();
    var month = today.getMonth() + 1;
    var hour = today.getHours();
    var minute = today.getMinutes();
    return month + '/' + day + "/" + yr+ " " + hour + ":" + minute;
};

Template.dateRange.onRendered(function() {
    //NOTE: Date fields are special in that they are qualified by plotType.
    //TimeSeries and Scatter plots have a common date range
    // but profile plots have a date range for each curve.
    // The decision to hide or show a dataRange is made here in the dateRange template

    // it seems that when the page is first rendered the checkbox might be yet defined (especially in safari).
    // in that event we test for undefined and block the curve-dates-item anyway
    if ((document.getElementById('plot-type-' + matsTypes.PlotTypes.timeSeries) == undefined || document.getElementById('plot-type-' + matsTypes.PlotTypes.timeSeries).checked === true) ||
        (document.getElementById('plot-type-' + matsTypes.PlotTypes.scatter2d) == undefined || document.getElementById('plot-type-' + matsTypes.PlotTypes.scatter2d).checked === true)) {
        if (document.getElementById('curve-dates-item')) {
            document.getElementById('curve-dates-item').style.display = "none";
        }
        if (document.getElementById('dates-item')) {
                document.getElementById('dates-item').style.display = "block";
        }
    } else {
        if (document.getElementById('curve-dates-item')) {
            document.getElementById('curve-dates-item').style.display = "block";
        }
        if (document.getElementById('dates-item')) {
            document.getElementById('dates-item').style.display = "none";
        }
    }
    var name = this.data.name;
    //var name = matsTypes.InputTypes.controlButton + "-" + this.data.name + "-value";
    $(function() {
            $('input[name=' + name + ']').daterangepicker({
            "timePicker": true,
            "timePicker24Hour": true,
            "autoApply": true,
            format: 'MM/DD/YYYY HH:mm'
        });
    });
});

Template.dateRange.helpers({
    value: function() {
        return startInit() + " - " + stopInit();
    },
    startInitial: function() {
        return startInit();
    },
    stopInitial: function() {
        return stopInit();
    }
});

