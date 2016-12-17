/**
 * Created by pierce on 8/31/16.
 */

var  InputTypes = {
    textInput : 'textInput',
    select : 'select',
    numberSpinner : 'numberSpinner',
    dateRange: 'dateRange',
    radioGroup: 'radioGroup',
    checkBoxGroup: 'checkBoxGroup',
    resetButton: 'resetButton',
    controlButton: 'controlButton',
    element: 'element',
    selectMap: 'selectMap',
    custom: 'custom',
    unused:"unused"
    };

var  PlotTypes = {
    timeSeries : "TimeSeries",
    profile : "Profile",
    scatter2d : "Scatter2d",
    dieoff : "dieOff"
};

var  PlotFormats = {
    none: "none",
    matching: "matching",
    pairwise: "pairwise",
    absolute:"absolute"
};

var  PlotActions = {
    matched: "matched",
    unmatched: "unmatched"
};

var  BestFits = {
    none:'none',
    linear:'linear',
    linearThroughOrigin:'linearThroughOrigin',
    exponential:'exponential',
    logarithmic:'logarithmic',
    power:'power'
};

var  MatchFormats = {
    none: "none",
    time: "time",
    level: "level",
    site: "site"
};

var  PlotAxisFilters = {
    none: "none",
    level: "level",
    site: "site"
};

export default matsTypes = {
    InputTypes:InputTypes,
    PlotTypes:PlotTypes,
    PlotFormats:PlotFormats,
    PlotActions:PlotActions,
    BestFits:BestFits,
    MatchFormats:MatchFormats,
    PlotAxisFilters:PlotAxisFilters
}
