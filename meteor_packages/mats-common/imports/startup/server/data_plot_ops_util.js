const generateSeriesPlotOptions = function (dataset, curves, axisMap, errorMax) {
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    var axisLabel;
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.05;
        const position = dsi === 0 ? "left" : "right";
        const yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: axisLabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            tickDecimals: 1,
            min: ymin - yPad,
            max: ymax + yPad,
            font: {size: 18}
        };
        const yaxisOptions = {   // used for zooming
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'Time',
            color: 'grey',
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
        }],
        xaxis: {
            zoomRange: [0.1, null],
            mode: 'time',
            font: {size: 18}
        },
        yaxes: yaxes,
        yaxis: yaxis,
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            // the ct value is the last element of the data series for profiles. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };
    return options;
};

const generateProfilePlotOptions = function (dataset, curves, axisMap, errorMax) {
    var xmin = Number.MAX_VALUE;
    var xmax = Number.MIN_VALUE;
    var xAxislabel = "";
    var axisVariables = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        // only need one xaxisLable (they should all be the same anyway for profiles)
        const thisVar = axisKey.split(':')[0];
        if (xAxislabel == "") {
            axisVariables.push(thisVar);
            xAxislabel = axisMap[axisKey].axisLabel;
        }
        else {
            if (axisVariables.indexOf(thisVar) === -1) {
                axisVariables.push(thisVar);
                if (xAxislabel.length > 30) {
                    xAxislabel += "\n";  // wrap long labels
                }
                xAxislabel = xAxislabel + ' | ' + axisMap[axisKey].axisLabel;
            }
        }
        xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    }

    // account for error bars on xaxis
    xmax = xmax + errorMax;
    xmin = xmin - errorMax;
    const xpad = (xmax - xmin) * 0.05;
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: xAxislabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
            alignTicksWithAxis: 1,
            color: 'grey',
            min: xmin - xpad,
            max: xmax + xpad,
            font: {
                size: 20,
                lineHeight: 23,
                style: "italic",
                weight: "bold",
                family: "sans-serif",
                variant: "small-caps",
                color: "#545454"
            }
        }],
        xaxis: {
            zoomRange: [0.1, null]
        },
        yaxes: [{
            position: "left",
            color: 'grey',
            axisLabel: ' Pressure (hPa)',
            axisLabelColour: "black",
            font: {
                size: 20,
                lineHeight: 23,
                style: "italic",
                weight: "bold",
                family: "sans-serif",
                variant: "small-caps",
                color: "#545454"
            },
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            ticks: [[-1000, 1000], [-900, 900], [-800, 800], [-700, 700], [-600, 600], [-500, 500], [-400, 400], [-300, 300], [-200, 200], [-100, 100], [0, 0]],
            min: -1100,
            max: 0
        }],
        yaxis: [{
            zoomRange: [0.1, null]
        }],
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            // the ct value is the last element of the data series for profiles. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };
    return options;
};

const generateDieoffPlotOptions = function (dataset, curves, axisMap, errorMax) {
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    var axisLabel;
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.05;
        const position = dsi === 0 ? "left" : "right";
        const yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: axisLabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            tickDecimals: 1,
            min: ymin - yPad,
            max: ymax + yPad,
            font: {size: 18}
        };
        const yaxisOptions = {   // used for zooming
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'Forecast Hour',
            color: 'grey',
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
        }],
        xaxis: {
            zoomRange: [0.1, null],
            mode: 'xy',
            font: {size: 18}
        },
        yaxes: yaxes,
        yaxis: yaxis,
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            // the ct value is the last element of the data series for profiles. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };
    return options;
};

const generateThresholdPlotOptions = function (dataset, curves, axisMap, errorMax) {
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    var axisLabel;
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.05;
        const position = dsi === 0 ? "left" : "right";
        const yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: axisLabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            tickDecimals: 1,
            min: ymin - yPad,
            max: ymax + yPad,
            font: {size: 18}
        };
        const yaxisOptions = {   // used for zooming
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'Threshold',
            color: 'grey',
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
        }],
        xaxis: {
            zoomRange: [0.01, null],
            mode: 'xy',
            //ticks: [[0, 0.01], [1, 0.10], [2, 0.25], [3, 0.50], [4, 1.00], [5, 1.50], [6, 2.00], [7, 3.00]],
            ticks: [[0.01, "0.01"], [0.1, "0.10"], [0.25, "0.25"], [0.5, "0.50"], [1.0, "1.00"], [1.5, "1.50"], [2.0, "2.00"], [3.0, "3.00"]],
            //ticks: [0.01,0.1,0.25,0.5,1.0,1.5,2.0,3.0],
            // transform: function (v) {return v === 0 ? 0 : Math.log(v);},
            // inverseTransform: function (v) {return Math.exp(v);},
            font: {size: 13}
        },
        yaxes: yaxes,
        yaxis: yaxis,
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };
    return options;
};

const generateValidTimePlotOptions = function (dataset, curves, axisMap, errorMax) {
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    var axisLabel;
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.05;
        const position = dsi === 0 ? "left" : "right";
        const yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: axisLabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            tickDecimals: 1,
            min: ymin - yPad,
            max: ymax + yPad,
            font: {size: 18}
        };
        const yaxisOptions = {   // used for zooming
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'Hour of Day',
            color: 'grey',
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
        }],
        xaxis: {
            zoomRange: [0.1, null],
            mode: 'xy',
            font: {size: 18}
        },
        yaxes: yaxes,
        yaxis: yaxis,
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            // the ct value is the last element of the data series for profiles. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };
    return options;
};

const generateMapPlotOptions = function (dataset, curves) {
    const options = {
        labels: {
            show: true
        },
        map: {
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            // the ct value is the last element of the data series for profiles. This is the tooltip content.
            content: "<span style='font-size:75%'><strong>%ct</strong></span>"
        }
    };
    return options;
};

export default matsDataPlotOpsUtils = {

    generateSeriesPlotOptions: generateSeriesPlotOptions,
    generateProfilePlotOptions: generateProfilePlotOptions,
    generateDieoffPlotOptions: generateDieoffPlotOptions,
    generateThresholdPlotOptions: generateThresholdPlotOptions,
    generateValidTimePlotOptions: generateValidTimePlotOptions,
    generateMapPlotOptions: generateMapPlotOptions

}
