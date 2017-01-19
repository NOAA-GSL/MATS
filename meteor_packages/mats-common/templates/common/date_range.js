import { matsTypes } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';

var startInit = function() {
    var today = new Date();
    var thenDate = new Date(today.getTime() - 30*24*60*60*1000);
    var yr = thenDate.getFullYear();
    var day = thenDate.getDate();
    var month = thenDate.getMonth() + 1;
    var hour = thenDate.getHours();
    var minute = thenDate.getMinutes();
    //var datesMap = matsCollections.CurveParams.findOne({name: 'data-source'}).dates;
    //var mindate = JSON.parse(datesMap).mindate;
    //return( mindate );
    return month + '/' + day + "/" + yr+ " " + hour + ":" + minute;
};
var stopInit = function() {
    var today = new Date();
    var yr = today.getFullYear();
    var day = today.getDate();
    var month = today.getMonth() + 1;
    var hour = today.getHours();
    var minute = today.getMinutes();
    //var datesMap = matsCollections.CurveParams.findOne({name: 'data-source'}).dates;
    //var maxdate = JSON.parse(datesMap).maxdate;
    //return( maxdate );
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

    const name = this.data.name;
    const idref = name + "-item";
    const elem = document.getElementById('element-' + name);
    const superiorNames = this.data.superiorNames;
    $(function() {
            $('#' + idref).daterangepicker({
            "autoApply": true,
            "parentEL":$('#' + idref),
            "timePicker": true,
            "timePicker24Hour": true,
            "timePickerIncrement": 15,
            "startDate": startInit(),
            "endDate": stopInit(),
            "showDropdowns":true,
            "drops": "up",
            locale: {
                format: 'MM/DD/YYYY H:mm'
            },
            ranges: {
                'Today': [moment().startOf('day'), moment().endOf('day')],
                'Yesterday': [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')],
                'Last 7 Full Days': [moment().subtract(7, 'days').startOf('day'), moment().startOf('day')],
                'Last 30 Full Days': [moment().subtract(30, 'days').startOf('day'), moment().startOf('day')],
                'Last 60 Full Days': [moment().subtract(60, 'days').startOf('day'), moment().startOf('day')],
                'Last 90 Full Days': [moment().subtract(90, 'days').startOf('day'), moment().startOf('day')],
                'Last 180 Full Days': [moment().subtract(180, 'days').startOf('day'), moment().startOf('day')],
            },
            "alwaysShowCalendars":true
        });
        matsParamUtils.setValueTextForParamName(name,startInit() + ' - ' + stopInit());
    });

    $('#' + idref).on('apply.daterangepicker', function(ev, picker) {
        if (picker.startDate.toString() == picker.endDate.toString()) {
            setError(new Error("Your start and end dates coincide, you must select a range!"));
            return false;
        }
        const valStr = picker.startDate.format('MM/DD/YYYY H:mm') + ' - ' + picker.endDate.format('MM/DD/YYYY H:mm');
        matsParamUtils.setValueTextForParamName(name,valStr);
        elem.style.display = "none";
    });
    $('#' + idref).on('cancel.daterangepicker', function() {
        elem.style.display = "none";
    });

    const refresh = function() {
        var minmoment = moment( "01/01/1970 0:0");
        var maxmoment = moment( "01/18/2038 0:0");
        for (var si = 0; si < superiorNames.length; si++) {
            var superiorName = superiorNames[si];
            datesMap = matsCollections.CurveParams.findOne({name: " + superiorName + "}).dates;
            const supmin = moment(datesMap.mindate);
            if ( supmin.isAfter(minmoment) ) {
                minmoment = supmin;
            }
            const supmax = moment(datesMap.maxdate);
            if ( supmax.isBefore(maxmoment) ) {
                maxmoment = supmax;
            }

        }
        var jqIdRef = "#" + idref;
        $(jqIdRef).data('daterangepicker').setStartDate(minmoment);
        $(jqIdRef).data('daterangepicker').setStartDate(maxmoment);

    };

// register refresh event for y superior to use to enforce a refresh of the options list
    elem.addEventListener('refresh', function (e) {
        refresh();
    });

});
