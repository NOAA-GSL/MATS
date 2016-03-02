var startInit = function() {
    var today = new Date();
    var thenDate = new Date(today.getTime() - 30*24*60*60*1000);
    var yr = thenDate.getFullYear();
    var day = thenDate.getDate();
    var month = thenDate.getMonth() + 1;
    return month + '/' + day + "/" + yr;
};
var stopInit = function() {
    var today = new Date();
    var yr = today.getFullYear();
    var day = today.getDate();
    var month = today.getMonth() + 1;
    return month + '/' + day + "/" + yr;
};

Template.dateRange.onRendered(function() {
    // it seems that when the page is first rendered the checkbox might be yet defined (especially in safari).
    // in that event we test for undefined and block the curve-dates-item anyway
    if (document.getElementById('plot-type-TimeSeries') == undefined || document.getElementById('plot-type-TimeSeries').checked === true) {
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
    $('#' + this.name + "-" + InputTypes.dateRange + "-from input").datepicker({});
    $('#' + this.name + "-" + InputTypes.dateRange + "-to input").datepicker({});
});

Template.dateRange.helpers({
    value: function() {
        return startInit() + "  To:  " + stopInit();
    },
    startInitial: function() {
        return startInit();
    },
    stopInitial: function() {
        return stopInit();
    }
});

Template.dateRange.events({
    'click .from' : function (event) {
        $('#' + this.name + "-" + InputTypes.dateRange + "-from").datepicker('show');
    },
    'click .to' : function (event) {
        $('#' + this.name + "-" + InputTypes.dateRange + "-to").datepicker('show');
    }
});