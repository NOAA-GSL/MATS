import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

// sets plot options for timeseries graphs
const generateSeriesPlotOptions = function (dataset, curves, axisMap, errorMax) {
    var xmin = axisMap[Object.keys(axisMap)[0]].xmin;
    var xmax = axisMap[Object.keys(axisMap)[0]].xmax;

    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false,
        hovermode: 'closest',
        hoverlabel: {'font': {'size': 14, 'family': 'Arial', 'color': '#FFFFFF'}},
        showlegend: false
    };

    layout['xaxis'] = {
        title: 'Time',
        titlefont: {color: '#000000', size: 22},
        tickfont: {color: '#000000', size: 12}
    };

    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    const yAxisNumber = Object.keys(axisMap).length;
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.05) !== 0 ? (ymax - ymin) * 0.05 : 0.05;
        xmin = axisMap[axisKey].xmin < xmin ? axisMap[axisKey].xmin : xmin;
        xmax = axisMap[axisKey].xmax > xmax ? axisMap[axisKey].xmax : xmax;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        if (axisIdx === 0) {
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                zeroline: false
            };
        } else if (axisIdx < Object.keys(axisPosition).length) {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[axisIdx],
                overlaying: 'y',
                side: axisSide[axisIdx],
                position: axisPosition[axisIdx],
                zeroline: false
            };
        } else {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[Object.keys(axisPosition).length - 1],
                overlaying: 'y',
                side: axisSide[Object.keys(axisPosition).length - 1],
                position: axisPosition[Object.keys(axisPosition).length - 1],
                zeroline: false
            };
        }
    }
    const xPad = ((xmax - xmin) * 0.075) !== 0 ? (xmax - xmin) * 0.075 : 0.075;
    xmax = moment.utc(xmax + xPad * Math.ceil(yAxisNumber / 2)).format("YYYY-MM-DD HH:mm");
    xmin = moment.utc(xmin - xPad * Math.ceil(yAxisNumber / 2)).format("YYYY-MM-DD HH:mm");
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for profile graphs
const generateProfilePlotOptions = function (dataset, curves, axisMap, errorMax) {
    var ymin = 10;
    var ymax = 1075;
    const xAxisNumber = Object.keys(axisMap).length;

    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: xAxisNumber > 1 ? 80 : 20,
            pad: 4
        },
        zeroline: false,
        hovermode: 'closest',
        hoverlabel: {'font': {'size': 14, 'family': 'Arial', 'color': '#FFFFFF'}},
        showlegend: false
    };
    var tickVals;
    var tickText;
    if (matsCollections.Settings.findOne({}).appType === matsTypes.AppTypes.metexpress) {
        tickVals = [1000, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100, 50, 10];
        tickText = ['1000', '850', '700', '600', '500', '400', '300', '250', '200', '150', '100', '50', '10'];
    } else {
        tickVals = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100];
        tickText = ['1000', '900', '800', '700', '600', '500', '400', '300', '200', '100'];
    }
    layout['yaxis'] = {
        title: 'Pressure Level',
        titlefont: {color: '#000000', size: 22},
        tickfont: {color: '#000000', size: 14},
        tickvals: tickVals,
        ticktext: tickText,
        type: 'linear',
        autorange: 'reversed'
    };

    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'bottom', 1: 'top', 2: 'bottom', 3: 'top', 4: 'bottom', 5: 'top', 6: 'bottom', 7: 'top'};
    const axisPosition = {0: 0, 1: 1, 2: 0.15, 3: 0.85, 4: 0.3, 5: 0.7, 6: 0.45, 7: 0.55};

    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < xAxisNumber; axisIdx++) {
        axisKey = Object.keys(axisMap)[axisIdx];
        var xmin = axisMap[axisKey].xmin;
        var xmax = axisMap[axisKey].xmax;
        xmax = xmax + errorMax;
        xmin = xmin - errorMax;
        axisLabel = axisMap[axisKey].axisLabel;
        const xPad = ((xmax - xmin) * 0.05) !== 0 ? (xmax - xmin) * 0.05 : 0.05;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        if (axisIdx === 0) {
            axisObjectKey = 'xaxis';
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [xmin - xPad, xmax + xPad],
                zeroline: false
            };
        } else if (axisIdx < Object.keys(axisPosition).length) {
            axisObjectKey = 'xaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [xmin - xPad, xmax + xPad],
                anchor: axisAnchor[axisIdx],
                overlaying: 'x',
                side: axisSide[axisIdx],
                position: axisPosition[axisIdx],
                zeroline: false
            };
        } else {
            axisObjectKey = 'xaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [xmin - xPad, xmax + xPad],
                anchor: axisAnchor[Object.keys(axisPosition).length - 1],
                overlaying: 'x',
                side: axisSide[Object.keys(axisPosition).length - 1],
                position: axisPosition[Object.keys(axisPosition).length - 1],
                zeroline: false
            };
        }
    }
    const yPad = ((ymax - ymin) * 0.25) !== 0 ? (ymax - ymin) * 0.25 : 0.25;
    ymax = ymax + (yPad * Math.ceil(xAxisNumber / 2));
    ymin = ymin - (yPad * Math.ceil(xAxisNumber / 2));
    layout['yaxis']['range'] = [ymin, ymax];
    return layout;
};

// sets plot options for dieoff graphs
const generateDieoffPlotOptions = function (dataset, curves, axisMap, errorMax) {
    var xmin = axisMap[Object.keys(axisMap)[0]].xmin;
    var xmax = axisMap[Object.keys(axisMap)[0]].xmax;

    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false,
        hovermode: 'closest',
        hoverlabel: {'font': {'size': 14, 'family': 'Arial', 'color': '#FFFFFF'}},
        showlegend: false
    };

    layout['xaxis'] = {
        title: 'Forecast Hour',
        titlefont: {color: '#000000', size: 22},
        tickfont: {color: '#000000', size: 14},
    };

    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    const yAxisNumber = Object.keys(axisMap).length;
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.05) !== 0 ? (ymax - ymin) * 0.05 : 0.05;
        xmin = axisMap[axisKey].xmin < xmin ? axisMap[axisKey].xmin : xmin;
        xmax = axisMap[axisKey].xmax > xmax ? axisMap[axisKey].xmax : xmax;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        if (axisIdx === 0) {
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                zeroline: false
            };
        } else if (axisIdx < Object.keys(axisPosition).length) {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[axisIdx],
                overlaying: 'y',
                side: axisSide[axisIdx],
                position: axisPosition[axisIdx],
                zeroline: false
            };
        } else {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[Object.keys(axisPosition).length - 1],
                overlaying: 'y',
                side: axisSide[Object.keys(axisPosition).length - 1],
                position: axisPosition[Object.keys(axisPosition).length - 1],
                zeroline: false
            };
        }
    }
    const xPad = ((xmax - xmin) * 0.075) !== 0 ? (xmax - xmin) * 0.075 : 0.075;
    xmax = xmax + (xPad * Math.ceil(yAxisNumber / 2));
    xmin = xmin - (xPad * Math.ceil(yAxisNumber / 2));
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for threshold graphs
const generateThresholdPlotOptions = function (dataset, curves, axisMap, errorMax) {
    var xmin = 0;
    var xmax = 3;

    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false,
        hovermode: 'closest',
        hoverlabel: {'font': {'size': 14, 'family': 'Arial', 'color': '#FFFFFF'}},
        showlegend: false
    };

    layout['xaxis'] = {
        title: 'Threshold',
        titlefont: {color: '#000000', size: 22},
        tickfont: {color: '#000000', size: 14},
        tickvals: [0.01, 0.1, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0],
        ticktext: ["0.01", "0.10", "0.25", "0.50", "1.00", "1.50", "2.00", "3.00"]
    };

    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    const yAxisNumber = Object.keys(axisMap).length;
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.05) !== 0 ? (ymax - ymin) * 0.05 : 0.05;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        if (axisIdx === 0) {
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                zeroline: false
            };
        } else if (axisIdx < Object.keys(axisPosition).length) {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[axisIdx],
                overlaying: 'y',
                side: axisSide[axisIdx],
                position: axisPosition[axisIdx],
                zeroline: false
            };
        } else {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[Object.keys(axisPosition).length - 1],
                overlaying: 'y',
                side: axisSide[Object.keys(axisPosition).length - 1],
                position: axisPosition[Object.keys(axisPosition).length - 1],
                zeroline: false
            };
        }
    }
    const xPad = ((xmax - xmin) * 0.075) !== 0 ? (xmax - xmin) * 0.075 : 0.075;
    xmax = xmax + (xPad * Math.ceil(yAxisNumber / 2));
    xmin = xmin - (xPad * Math.ceil(yAxisNumber / 2));
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for valid time graphs
const generateValidTimePlotOptions = function (dataset, curves, axisMap, errorMax) {
    var xmin = 0;
    var xmax = 23;

    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false,
        hovermode: 'closest',
        hoverlabel: {'font': {'size': 14, 'family': 'Arial', 'color': '#FFFFFF'}},
        showlegend: false
    };

    layout['xaxis'] = {
        title: 'Hour of Day',
        titlefont: {color: '#000000', size: 22},
        tickfont: {color: '#000000', size: 14},
        tickvals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        ticktext: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"]
    };

    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    const yAxisNumber = Object.keys(axisMap).length;
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.05) !== 0 ? (ymax - ymin) * 0.05 : 0.05;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        if (axisIdx === 0) {
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                zeroline: false
            };
        } else if (axisIdx < Object.keys(axisPosition).length) {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[axisIdx],
                overlaying: 'y',
                side: axisSide[axisIdx],
                position: axisPosition[axisIdx],
                zeroline: false
            };
        } else {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000', size: 22},
                tickfont: {color: '#000000', size: 14},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[Object.keys(axisPosition).length - 1],
                overlaying: 'y',
                side: axisSide[Object.keys(axisPosition).length - 1],
                position: axisPosition[Object.keys(axisPosition).length - 1],
                zeroline: false
            };
        }
    }
    const xPad = ((xmax - xmin) * 0.075) !== 0 ? (xmax - xmin) * 0.075 : 0.075;
    xmax = xmax + (xPad * Math.ceil(yAxisNumber / 2));
    xmin = xmin - (xPad * Math.ceil(yAxisNumber / 2));
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for map graphs
const generateMapPlotOptions = function () {
    const options = {
        autosize: true,
        hovermode: 'closest',
        mapbox: {
            bearing: 0,
            center: {
                lat: 39.834,
                lon: -98.604
            },
            pitch: 0,
            zoom: 3.25,
            accesstoken: 'pk.eyJ1IjoibWF0cy1nc2QiLCJhIjoiY2pvN2l1N2MyMG9xdTN3bWR3ODV5a2E2ZiJ9.PtgcGhxaoD43N0OwJSNVMg',
            style: 'light'
        },
        margin: {
            l: 30,
            r: 30,
            b: 40,
            t: 10,
            pad: 4
        },
        showlegend: false,
    };
    return options;
};

// sets plot options for valid time graphs
const generateHistogramPlotOptions = function (dataset, curves, axisMap, plotBins) {
    const axisKey = curves[0].axisKey;
    const axisLabel = axisMap[axisKey].axisLabel;

    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false,
        bargap: 0.25,
        barmode: 'group',
        hovermode: 'closest',
        hoverlabel: {'font': {'size': 14, 'family': 'Arial', 'color': '#FFFFFF'}},
        showlegend: false
    };

    layout['xaxis'] = {
        title: 'Bin',
        titlefont: {color: '#000000', size: 22},
        tickfont: {color: '#000000', size: 12},
        tickvals: plotBins.binMeans,
        ticktext: plotBins.binLabels,
    };

    layout['yaxis'] = {
        title: axisLabel,
        titlefont: {color: '#000000', size: 22},
        tickfont: {color: '#000000', size: 14},
    };

    return layout;

};

// sets plot options for valid time graphs
const generateContourPlotOptions = function (dataset, axisMap) {
    const xAxisKey = dataset[0]['xAxisKey'];
    const yAxisKey = dataset[0]['yAxisKey'];

    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false,
        hovermode: 'closest',
        hoverlabel: {'font': {'size': 14, 'family': 'Arial', 'color': '#FFFFFF'}}
    };

    layout['xaxis'] = {
        title: xAxisKey,
        titlefont: {color: '#000000', size: 22},
        tickfont: {color: '#000000', size: 12},
    };

    if (yAxisKey === "Pressure level") {
        layout['yaxis'] = {
            title: yAxisKey,
            titlefont: {color: '#000000', size: 22},
            tickfont: {color: '#000000', size: 14},
            tickvals: [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100],
            ticktext: ['1000', '900', '800', '700', '600', '500', '400', '300', '200', '100'],
            range: [1100, 0],
            type: 'linear',
            autorange: 'reversed'
        };
    } else {
        layout['yaxis'] = {
            title: yAxisKey,
            titlefont: {color: '#000000', size: 22},
            tickfont: {color: '#000000', size: 14},
        };
    }
    return layout;

};

export default matsDataPlotOpsUtils = {

    generateSeriesPlotOptions: generateSeriesPlotOptions,
    generateProfilePlotOptions: generateProfilePlotOptions,
    generateDieoffPlotOptions: generateDieoffPlotOptions,
    generateThresholdPlotOptions: generateThresholdPlotOptions,
    generateValidTimePlotOptions: generateValidTimePlotOptions,
    generateMapPlotOptions: generateMapPlotOptions,
    generateHistogramPlotOptions: generateHistogramPlotOptions,
    generateContourPlotOptions: generateContourPlotOptions

}
