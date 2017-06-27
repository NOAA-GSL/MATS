import {matsTypes} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';

Template.dateRange.onRendered(function () {
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
    const dateInitStr = matsCollections.dateInitStr();
    const dateInitStrParts = dateInitStr.split(' - ');
    const startInit = dateInitStrParts[0];
    const stopInit = dateInitStrParts[1];
    const dstr = startInit + ' - ' + stopInit;
    $(function () {
        $('#' + idref).daterangepicker({
            "autoApply": true,
            "parentEL": $('#' + idref),
            "timePicker": true,
            "timePicker24Hour": true,
            "timePickerIncrement": 15,
            "startDate": startInit,
            "endDate": stopInit,
            "showDropdowns": true,
            "drops": "up",

            locale: {
                format: 'MM/DD/YYYY HH:mm'
            },
            ranges: {
                'Today': [moment().startOf('day'), moment().endOf('day')],
                'Yesterday': [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')],
                'Last 7 Full Days': [moment().subtract(7, 'days').startOf('day'), moment().startOf('day')],
                'Last 30 Full Days': [moment().subtract(30, 'days').startOf('day'), moment().startOf('day')],
                'Last 60 Full Days': [moment().subtract(60, 'days').startOf('day'), moment().startOf('day')],
                'Last 90 Full Days': [moment().subtract(90, 'days').startOf('day'), moment().startOf('day')],
                'Last 180 Full Days': [moment().subtract(180, 'days').startOf('day'), moment().startOf('day')],
            },"alwaysShowCalendars": true,
        });
        matsParamUtils.setValueTextForParamName(name, dstr);
    });

    $('#' + idref).on('apply.daterangepicker', function (ev, picker) {
        if (picker.startDate.toString() == picker.endDate.toString()) {
            setError(new Error("date_range error:  Your start and end dates coincide, you must select a range!"));
            return false;
        }
        const valStr = picker.startDate.format('MM/DD/YYYY H:mm') + ' - ' + picker.endDate.format('MM/DD/YYYY H:mm');
        matsParamUtils.setValueTextForParamName(name, valStr);
        elem.style.display = "none";
        const curveItem = (Session.get("editMode") === undefined && Session.get("editMode") === "") ? undefined : document.getElementById("curveItem-" + Session.get("editMode"));
        if (curveItem) {
            $('#save').trigger('click');
        }
    });
    $('#' + idref).on('cancel.daterangepicker', function () {
        elem.style.display = "none";
    });

    const refresh = function () {
        try {
            // get the current values from the element and check for invalid
            const curVals = matsParamUtils.getValueForParamName(name).split(" - "); // it is a date object values are "someFromDate - someToDate"
            var startDsr = moment(curVals[0], "MM/DD/YYYY HH:mm");
            var endDsr = moment(curVals[1], "MM/DD/YYYY HH:mm");
            if (!startDsr.isValid()) {
                // error
                setError ("date_range refresh error: Your date range selector has an invalid start date-time: " + curVals[0]);
                return false;
            }
            if (!endDsr.isValid()) {
                // error
                setError ("date_range refresh error: Your date range selector has an invalid end date-time:" + curVals[1]);
                return false;
            }
            if (startDsr.isAfter(endDsr)) {
                // error
                setError ("date_range refresh error: Your date range selector has a start date/time that is later than the end date-time " + startDsr.toString() + " is not prior to " + endDsr.toString());
                return false;
            }
            // get superior values and check for errors
            var superiorVals = [];
            var si;
            for (si = 0; si < superiorNames.length; si++) {
                const superiorName = superiorNames[si];
                const datesMap = matsCollections.CurveParams.findOne({name: superiorName}).dates;
                const sval = matsParamUtils.getValueForParamName(superiorName);
                if (sval === matsTypes.InputTypes.unused ||
                        sval === null ||
                        matsParamUtils.getInputElementForParamName(superiorName) === undefined ||
                        isNaN(matsParamUtils.getInputElementForParamName(superiorName).selectedIndex) ||
                        matsParamUtils.getInputElementForParamName(superiorName).selectedIndex === -1) {
                    // skip this superior - it isn't being used right now
                    continue;
                }
                const superiorMinimumDateStr = datesMap[matsParamUtils.getInputElementForParamName(superiorName).options[matsParamUtils.getInputElementForParamName(superiorName).selectedIndex].text].minDate;
                const superiorMinimumMoment = moment(superiorMinimumDateStr, "MM/DD/YYYY HH:mm");
                if (superiorMinimumMoment.isValid()) {
                    superiorVals[si] = superiorVals[si] === undefined ? {} : superiorVals[si];
                    superiorVals[si].min = superiorMinimumMoment;
                } else {
                    setError ("date_range refresh error: The end date for the superiorName: " + superiorName + " is invalid: " +  superiorMinimumDateStr);
                    return false;
                }
                const superiorMaximumDateStr = datesMap[matsParamUtils.getInputElementForParamName(superiorName).options[matsParamUtils.getInputElementForParamName(superiorName).selectedIndex].text].maxDate;
                const superiorMaximumMoment = moment(superiorMaximumDateStr, "MM/DD/YYYY HH:mm");
                if (superiorMaximumMoment.isValid()) {
                    superiorVals[si] = superiorVals[si] === undefined ? {} : superiorVals[si];
                    superiorVals[si].max = superiorMaximumMoment;
                } else {
                    setError ("date_range refresh error: The end date for the superiorName: " + superiorName + " is invalid: " +  superiorMaximumDateStr);
                    return false;
                }
                if ((superiorVals[si].min).isAfter(superiorVals[si].max)) {
                    // error
                    setError ("date_range refresh error: The date range for the superiorName: " + superiorName + " is invalid. It has a start date/time that is later than the end date/time - " + superiorVals[si].min.toString() + " is after " + superiorVals[si].max.toString());
                    return false;
                }
            }
            // get data range from superiors
            if (superiorVals.length === 0) {
                // no superiors involved - just leave the DSR alone
                return false;
            }
            var dataStart = superiorVals[0].min;
            var dataEnd = superiorVals[0].max;
            if (superiorVals.length > 1) {
                for (si = 1; si < superiorVals.length; si++) {
                    const tStart = superiorVals[si].min;
                    const tEnd = superiorVals[si].max;
                    if (dataEnd.isBefore(tStart)) {
                        // NCD
                        setInfo("You do not have any coincidental data with these two selections: The valid date ranges do not overlap - " +
                            dataStart.toString() + " to " + dataEnd.toString() + " and " + tStart.toString() + " to " + tEnd.toString());
                        return  false;
                    } else if (tEnd.isBefore(dataStart)) {
                        // NCD
                        setInfo("You do not have any coincidental data with these two selections: The valid date ranges do not overlap - " +
                            dataStart.toString() + " to " + dataEnd.toString() + " and " + tStart.toString() + " to " + tEnd.toString());
                        return false;
                    } else {
                        // overlapping data
                        if (tStart.isAfter(dataStart)) {
                            dataStart = tStart;
                        }
                        if (tEnd.isBefore(dataEnd)) {
                            dataEnd = tEnd;
                        }
                    }
                }
            }
            // now we have a normalized date range for the selected superiors.
            // evaluate DRS
            if ((dataEnd.isBefore(startDsr) || (dataStart.isAfter(endDsr)))) {
                // the current user setting and the valid range do not overlap so just set the DSR to the valid range
                startDsr = dataStart;
                endDsr = dataEnd;
            } else {
                // the current user setting and the valid range overlap
                if (startDsr.isBefore(dataStart)) {
                    startDsr = dataStart;
                }
                if (endDsr.isAfter(dataEnd)) {
                    endDsr = dataEnd;
                }
            }
            // now reset the DSR with the evaluated date range
            const jqIdRef = "#" + idref;
            $(jqIdRef).data('daterangepicker').setStartDate(startDsr);
            $(jqIdRef).data('daterangepicker').setStartDate(endDsr);
            const newDateStr = startDsr.format('MM/DD/YYYY HH:mm') + ' - ' + endDsr.format('MM/DD/YYYY HH:mm');
            matsParamUtils.setValueTextForParamName(name, newDateStr);
        } catch (error) {
            console.log("Error in date_range.js.refresh : " + error.message);
        }
    };

// register refresh event for superior to use to enforce a refresh of the options list
    elem.addEventListener('refresh', function (e) {
        refresh();
    });

});
