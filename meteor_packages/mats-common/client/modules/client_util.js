Modules.client.util = {};

var resetScatterApply = function() {
    if (getPlotType() == PlotTypes.scatter2d) {
        Session.set('axisCurveIcon', 'fa-asterisk');
        Session.set('xaxisCurveText', 'XAXIS NOT YET APPLIED');
        Session.set('yaxisCurveText', 'YAXIS NOT YET APPLIED');
        Session.set('xaxisCurveColor', 'red');
        Session.set('yaxisCurveColor', 'red');
        document.getElementById('scatter2d-best-fit-radioGroup-none').checked = true;
        document.getElementById('axis-selector-radioGroup-xaxis').checked = true
    }
};
Modules.client.util.resetScatterApply = resetScatterApply;
            