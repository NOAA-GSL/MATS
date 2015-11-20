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

Template.dateRange.rendered = function () {
    try {
        if (document.getElementById('plot-type-TimeSeries').checked === true) {
            document.getElementById('curve-dates-item').style.display = "none";
            document.getElementById('dates-item').style.display = "block";
        } else {
            document.getElementById('curve-dates-item').style.display = "block";
            document.getElementById('dates-item').style.display = "none";
        }
    } catch (Exception) {}
};

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

