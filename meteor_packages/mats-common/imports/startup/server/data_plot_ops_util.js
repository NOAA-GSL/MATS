/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

// sets plot options for timeseries plots
const generateSeriesPlotOptions = function (axisMap, errorMax) {
    var xmin = axisMap[Object.keys(axisMap)[0]].xmin;
    var xmax = axisMap[Object.keys(axisMap)[0]].xmax;
    const yAxisNumber = Object.keys(axisMap).length;

    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h", 
            x: 0, 
            y: 1, 
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: 'Time',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 16,
            color: '#000000'
        },
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)"
    };

    // allow support for multiple y-axes (currently 8)
    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    // loop over all y-axes
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        // get max and min values and label for curves on this y-axis
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.025) !== 0 ? (ymax - ymin) * 0.025 : 0.025;
        xmin = axisMap[axisKey].xmin < xmin ? axisMap[axisKey].xmin : xmin;
        xmax = axisMap[axisKey].xmax > xmax ? axisMap[axisKey].xmax : xmax;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        var axisObjectBegin = {
            title: axisLabel,
            titlefont: {
                size: 24,
                color: '#000000'
            },
            tickfont: {
                size: 18,
                color: '#000000'
            },
            linecolor: 'black',
            linewidth: 2,
            mirror: true,
            showgrid: true,
            gridwidth: 1,
            gridcolor: "rgb(238,238,238)",
            range: [ymin - yPad, ymax + 8 * yPad],  // need to allow room at the top for the legend
            zeroline: false
        };
        if (axisIdx === 0) {
            // the first (and main) y-axis
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = axisObjectBegin;
        } else if (axisIdx < Object.keys(axisPosition).length) {
            // subsequent y-axes, up to the 8 we support
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[axisIdx];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[axisIdx];
            layout[axisObjectKey].position = axisPosition[axisIdx];
        } else {
            // if the user by some miracle wants more than 8 y-axes, just shove them all into the position of the 8th
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].position = axisPosition[Object.keys(axisPosition).length - 1];
        }
    }
    const xPad = ((xmax - xmin) * 0.025) !== 0 ? (xmax - xmin) * 0.025 : 0.025;
    xmax = moment.utc(xmax + xPad * Math.ceil(yAxisNumber / 2)).format("YYYY-MM-DD HH:mm");
    xmin = moment.utc(xmin - xPad * Math.ceil(yAxisNumber / 2)).format("YYYY-MM-DD HH:mm");
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for profile plots
const generateProfilePlotOptions = function (axisMap, errorMax) {
    var ymin = axisMap[Object.keys(axisMap)[0]].ymin;
    var ymax = axisMap[Object.keys(axisMap)[0]].ymax;
    const xAxisNumber = Object.keys(axisMap).length;

    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "v",
            x: 1.05,
            y: 1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // y-axis options
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
        title: 'Pressure Level (hPa)',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        tickvals: tickVals,
        ticktext: tickText,
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        type: 'linear',
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)"
    };

    // allow support for multiple x-axes (currently 8)
    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'bottom', 1: 'top', 2: 'bottom', 3: 'top', 4: 'bottom', 5: 'top', 6: 'bottom', 7: 'top'};
    const axisPosition = {0: 0, 1: 1, 2: 0.15, 3: 0.85, 4: 0.3, 5: 0.7, 6: 0.45, 7: 0.55};

    // loop over all x-axes
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < xAxisNumber; axisIdx++) {
        // get max and min values and label for curves on this x-axis
        axisKey = Object.keys(axisMap)[axisIdx];
        var xmin = axisMap[axisKey].xmin;
        var xmax = axisMap[axisKey].xmax;
        xmax = xmax + errorMax;
        xmin = xmin - errorMax;
        const xPad = ((xmax - xmin) * 0.025) !== 0 ? (xmax - xmin) * 0.025 : 0.025;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        var axisObjectBegin = {
            title: axisLabel,
            titlefont: {
                size: 24,
                color: '#000000'
            },
            tickfont: {
                size: 18,
                color: '#000000'
            },
            linecolor: 'black',
            linewidth: 2,
            mirror: true,
            showgrid: true,
            gridwidth: 1,
            gridcolor: "rgb(238,238,238)",
            range: [xmin - xPad, xmax + xPad],
            zeroline: false
        };
        if (axisIdx === 0) {
            // the first (and main) x-axis
            axisObjectKey = 'xaxis';
            layout[axisObjectKey] = axisObjectBegin;
        } else if (axisIdx < Object.keys(axisPosition).length) {
            // subsequent x-axes, up to the 8 we support
            axisObjectKey = 'xaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[axisIdx];
            layout[axisObjectKey].overlaying = 'x';
            layout[axisObjectKey].side = axisSide[axisIdx];
            layout[axisObjectKey].position = axisPosition[axisIdx];
        } else {
            // if the user by some miracle wants more than 8 x-axes, just shove them all into the position of the 8th
            axisObjectKey = 'xaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].overlaying = 'x';
            layout[axisObjectKey].side = axisSide[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].position = axisPosition[Object.keys(axisPosition).length - 1];
        }
    }
    const yPad = ((ymax - ymin) * 0.025) !== 0 ? (ymax - ymin) * 0.025 : 0.025;
    ymax = ymax + (yPad * Math.ceil(xAxisNumber / 2));
    ymin = ymin - (yPad * Math.ceil(xAxisNumber / 2) * 0.05);
    layout['yaxis']['range'] = [ymax, ymin];
    return layout;
};

// sets plot options for dieoff plots
const generateDieoffPlotOptions = function (axisMap, errorMax) {
    var xmin = axisMap[Object.keys(axisMap)[0]].xmin;
    var xmax = axisMap[Object.keys(axisMap)[0]].xmax;
    const yAxisNumber = Object.keys(axisMap).length;

    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: 'Forecast Hour',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)"
    };

    // allow support for multiple y-axes (currently 8)
    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    // loop over all y-axes
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        // get max and min values and label for curves on this y-axis
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.025) !== 0 ? (ymax - ymin) * 0.025 : 0.025;
        xmin = axisMap[axisKey].xmin < xmin ? axisMap[axisKey].xmin : xmin;
        xmax = axisMap[axisKey].xmax > xmax ? axisMap[axisKey].xmax : xmax;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        var axisObjectBegin = {
            title: axisLabel,
            titlefont: {
                size: 24,
                color: '#000000'
            },
            tickfont: {
                size: 18,
                color: '#000000'
            },
            linecolor: 'black',
            linewidth: 2,
            mirror: true,
            showgrid: true,
            gridwidth: 1,
            gridcolor: "rgb(238,238,238)",
            range: [ymin - yPad, ymax + 8 * yPad],  // need to allow room at the top for the legend
            zeroline: false
        };
        if (axisIdx === 0) {
            // the first (and main) y-axis
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = axisObjectBegin;
        } else if (axisIdx < Object.keys(axisPosition).length) {
            // subsequent y-axes, up to the 8 we support
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[axisIdx];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[axisIdx];
            layout[axisObjectKey].position = axisPosition[axisIdx];
        } else {
            // if the user by some miracle wants more than 8 y-axes, just shove them all into the position of the 8th
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].position = axisPosition[Object.keys(axisPosition).length - 1];
        }
    }
    const xPad = ((xmax - xmin) * 0.025) !== 0 ? (xmax - xmin) * 0.025 : 0.025;
    xmax = xmax + (xPad * Math.ceil(yAxisNumber / 2));
    xmin = xmin - (xPad * Math.ceil(yAxisNumber / 2));
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for threshold plots
const generateThresholdPlotOptions = function (dataset, axisMap, errorMax) {
    var xmin = axisMap[Object.keys(axisMap)[0]].xmin;
    var xmax = axisMap[Object.keys(axisMap)[0]].xmax;
    const yAxisNumber = Object.keys(axisMap).length;
    const appName = matsCollections.appName.findOne({}).app;
    var xLabel;
    if (appName.includes("Precip") || appName.includes("precip")) {
        xLabel = "Threshold (in)";
    } else if (appName.includes("Reflectivity") || appName.includes("reflectivity")) {
        xLabel = "Threshold (dBZ)";
    } else if (appName === "echotop" || appName.includes("ceiling")) {
        xLabel = "Threshold (kft)";
    } else if (appName === "vil") {
        xLabel = "Threshold (kg/m2)";
    } else if (appName.includes("visibility")) {
        xLabel = "Threshold (mi)";
    } else {
        xLabel = "Threshold";
    }

    // get actual thresholds from the query to place on the x-axis
    var tickvals = [];
    for (var didx = 0; didx < dataset.length; didx++) {
        tickvals = _.union(tickvals, dataset[didx].x);
    }
    tickvals = tickvals.sort(function (a, b) {
        return a - b
    });

    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: xLabel,
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        tickvals: tickvals,
        ticktext: tickvals.map(String),
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)"
    };

    // allow support for multiple y-axes (currently 8)
    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    // loop over all y-axes
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        // get max and min values and label for curves on this y-axis
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.025) !== 0 ? (ymax - ymin) * 0.025 : 0.025;
        xmin = axisMap[axisKey].xmin < xmin ? axisMap[axisKey].xmin : xmin;
        xmax = axisMap[axisKey].xmax > xmax ? axisMap[axisKey].xmax : xmax;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        var axisObjectBegin = {
            title: axisLabel,
            titlefont: {
                size: 24,
                color: '#000000'
            },
            tickfont: {
                size: 18,
                color: '#000000'
            },
            linecolor: 'black',
            linewidth: 2,
            mirror: true,
            showgrid: true,
            gridwidth: 1,
            gridcolor: "rgb(238,238,238)",
            range: [ymin - yPad, ymax + 8 * yPad],  // need to allow room at the top for the legend
            zeroline: false
        };
        if (axisIdx === 0) {
            // the first (and main) y-axis
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = axisObjectBegin;
        } else if (axisIdx < Object.keys(axisPosition).length) {
            // subsequent y-axes, up to the 8 we support
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[axisIdx];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[axisIdx];
            layout[axisObjectKey].position = axisPosition[axisIdx];
        } else {
            // if the user by some miracle wants more than 8 y-axes, just shove them all into the position of the 8th
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].position = axisPosition[Object.keys(axisPosition).length - 1];
        }
    }
    const xPad = ((xmax - xmin) * 0.025) !== 0 ? (xmax - xmin) * 0.025 : 0.025;
    xmax = xmax + (xPad * Math.ceil(yAxisNumber / 2));
    xmin = xmin - (xPad * Math.ceil(yAxisNumber / 2));
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for valid time plots
const generateValidTimePlotOptions = function (axisMap, errorMax) {
    var xmin = 0;
    var xmax = 23;
    const yAxisNumber = Object.keys(axisMap).length;

    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: 'Hour of Day',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 16,
            color: '#000000'
        },
        tickvals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        ticktext: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"],
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)"
    };

    // allow support for multiple y-axes (currently 8)
    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    // loop over all y-axes
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        // get max and min values and label for curves on this y-axis
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.025) !== 0 ? (ymax - ymin) * 0.025 : 0.025;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        var axisObjectBegin = {
            title: axisLabel,
            titlefont: {
                size: 24,
                color: '#000000'
            },
            tickfont: {
                size: 18,
                color: '#000000'
            },
            linecolor: 'black',
            linewidth: 2,
            mirror: true,
            showgrid: true,
            gridwidth: 1,
            gridcolor: "rgb(238,238,238)",
            range: [ymin - yPad, ymax + 8 * yPad],  // need to allow room at the top for the legend
            zeroline: false
        };
        if (axisIdx === 0) {
            // the first (and main) y-axis
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = axisObjectBegin;
        } else if (axisIdx < Object.keys(axisPosition).length) {
            // subsequent y-axes, up to the 8 we support
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[axisIdx];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[axisIdx];
            layout[axisObjectKey].position = axisPosition[axisIdx];
        } else {
            // if the user by some miracle wants more than 8 y-axes, just shove them all into the position of the 8th
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].position = axisPosition[Object.keys(axisPosition).length - 1];
        }
    }
    const xPad = ((xmax - xmin) * 0.025) !== 0 ? (xmax - xmin) * 0.025 : 0.025;
    xmax = xmax + (xPad * Math.ceil(yAxisNumber / 2));
    xmin = xmin - (xPad * Math.ceil(yAxisNumber / 2));
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for grid scale plots
const generateGridScalePlotOptions = function (axisMap, errorMax) {
    var xmin = axisMap[Object.keys(axisMap)[0]].xmin;
    var xmax = axisMap[Object.keys(axisMap)[0]].xmax;
    const yAxisNumber = Object.keys(axisMap).length;

    const appName = matsCollections.appName.findOne({}).app;
    var xLabel;
    if (appName.includes("met-")) {
        xLabel = "Interpolation Points";
    } else {
        xLabel = "Grid Scale";
    }

    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: xLabel,
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)"
    };

    // allow support for multiple y-axes (currently 8)
    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free', 4: 'free', 5: 'free', 6: 'free', 7: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right', 4: 'left', 5: 'right', 6: 'left', 7: 'right'};
    const axisPosition = {0: 0, 1: 1, 2: 0.1, 3: 0.9, 4: 0.2, 5: 0.8, 6: 0.3, 7: 0.7};

    // loop over all y-axes
    var axisKey;
    var axisIdx;
    var axisLabel;
    for (axisIdx = 0; axisIdx < yAxisNumber; axisIdx++) {
        // get max and min values and label for curves on this y-axis
        axisKey = Object.keys(axisMap)[axisIdx];
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        ymax = ymax + errorMax;
        ymin = ymin - errorMax;
        const yPad = ((ymax - ymin) * 0.025) !== 0 ? (ymax - ymin) * 0.025 : 0.025;
        xmin = axisMap[axisKey].xmin < xmin ? axisMap[axisKey].xmin : xmin;
        xmax = axisMap[axisKey].xmax > xmax ? axisMap[axisKey].xmax : xmax;
        axisLabel = axisMap[axisKey].axisLabel;
        var axisObjectKey;
        var axisObjectBegin = {
            title: axisLabel,
            titlefont: {
                size: 24,
                color: '#000000'
            },
            tickfont: {
                size: 18,
                color: '#000000'
            },
            linecolor: 'black',
            linewidth: 2,
            mirror: true,
            showgrid: true,
            gridwidth: 1,
            gridcolor: "rgb(238,238,238)",
            range: [ymin - yPad, ymax + 8 * yPad],  // need to allow room at the top for the legend
            zeroline: false
        };
        if (axisIdx === 0) {
            // the first (and main) y-axis
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = axisObjectBegin;
        } else if (axisIdx < Object.keys(axisPosition).length) {
            // subsequent y-axes, up to the 8 we support
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[axisIdx];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[axisIdx];
            layout[axisObjectKey].position = axisPosition[axisIdx];
        } else {
            // if the user by some miracle wants more than 8 y-axes, just shove them all into the position of the 8th
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = axisObjectBegin;
            layout[axisObjectKey].anchor = axisAnchor[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].overlaying = 'y';
            layout[axisObjectKey].side = axisSide[Object.keys(axisPosition).length - 1];
            layout[axisObjectKey].position = axisPosition[Object.keys(axisPosition).length - 1];
        }
    }
    const xPad = ((xmax - xmin) * 0.025) !== 0 ? (xmax - xmin) * 0.025 : 0.025;
    xmax = xmax + (xPad * Math.ceil(yAxisNumber / 2));
    xmin = xmin - (xPad * Math.ceil(yAxisNumber / 2));
    layout['xaxis']['range'] = [xmin, xmax];
    return layout;
};

// sets plot options for reliability plots
const generateReliabilityPlotOptions = function () {
    var xmin = 0;
    var xmax = 1;
    var ymin = 0;
    var ymax = 1;

    // overall plot options
    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: true,
        perfectLine: false,
        hovermode: 'closest',
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1.1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: 'Forecast Probability',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        tickvals: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        ticktext: ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0"],
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)",
        range: [xmin, xmax + 0.05]
    };

    // y-axis options
    layout['yaxis'] = {
        title: 'Observed Relative Frequency',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        tickvals: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        ticktext: ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0"],
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)",
        range: [ymin, ymax + 0.05]
    };

    return layout;
};

// sets plot options for ROC plots
const generateROCPlotOptions = function () {
    var xmin = 0;
    var xmax = 1;
    var ymin = 0;
    var ymax = 1;

    // overall plot options
    var layout = {
        margin: {
            l: 80,
            r: 80,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: true,
        perfectLine: false,
        hovermode: 'closest',
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1.1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: 'False Alarm Rate',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        tickvals: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        ticktext: ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0"],
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)",
        range: [xmin, xmax + 0.05]
    };

    // y-axis options
    layout['yaxis'] = {
        title: 'Probability of Detection',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        tickvals: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        ticktext: ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0"],
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)",
        range: [ymin, ymax + 0.05]
    };

    return layout;
};

// sets plot options for map plots
const generateMapPlotOptions = function (extraLegendSpace) {
    const layout = {
        autosize: true,
        hovermode: 'closest',
        mapbox: {
            bearing: 0,
            center: {
                lat: 50,
                lon: -92.5
            },
            pitch: 0,
            zoom: 2,
            accesstoken: Meteor.settings.private.MAPBOX_KEY,
            style: 'light'
        },
        margin: {
            l: 30,
            r: 30,
            b: 40,
            t: 10,
            pad: 4
        },
        legend: {
            orientation: "h",
            x: 0,
            y: extraLegendSpace ? 1.2 : 1.1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };
    // make sure this instance of MATS actually has a key for mapbox
    if (!layout.mapbox.accesstoken || layout.mapbox.accesstoken === "undefined") {
        throw new Error("The mapbox access token is currently undefined, so MATS cannot produce a map " +
            "plot at this time. To fix this, create an account at mapbox.com, " +
            "generate a free access token, and add it to your settings.json file as private.MAPBOX_KEY.");
    }
    return layout;
};

// sets plot options for histograms
const generateHistogramPlotOptions = function (curves, axisMap, plotBins) {
    const axisKey = curves[0].axisKey;
    const axisLabel = axisMap[axisKey].axisLabel;
    var xmin = axisMap[axisKey].xmin;
    var xmax = axisMap[axisKey].xmax;
    const xPad = ((xmax - xmin) / plotBins.binMeans.length) * 1.2;
    var ymin = axisMap[axisKey].ymin;
    var ymax = axisMap[axisKey].ymax;
    const yPad = ((ymax - ymin) * 0.025) !== 0 ? (ymax - ymin) * 0.025 : 0.025;

    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: 'Bin',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 14,
            color: '#000000'
        },
        tickvals: plotBins.binMeans,
        ticktext: plotBins.binLabels,
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)",
        range: [xmin - xPad, xmax + xPad]
    };

    // y-axis options
    layout['yaxis'] = {
        title: axisLabel,
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)",
        range: [ymin - yPad, ymax + 8 * yPad]  // need to allow room at the top for the legend
    };

    return layout;
};

// sets plot options for histograms
const generateEnsembleHistogramPlotOptions = function (dataset, curves, axisMap) {
    const axisKey = curves[0].axisKey;
    const axisLabel = axisMap[axisKey].axisLabel;
    var xmin = dataset[0].x[0];
    var xmax = dataset[0].x[dataset[0].x.length - 1];
    const xPad = ((xmax - xmin) / dataset[0].x.length) * 0.6;
    var ymin = axisMap[axisKey].ymin;
    var ymax = axisMap[axisKey].ymax;
    const yPad = ((ymax - ymin) * 0.025) !== 0 ? (ymax - ymin) * 0.025 : 0.025;

    // get actual bins from the query to place on the x-axis
    var tickvals = [];
    for (var didx = 0; didx < dataset.length; didx++) {
        tickvals = _.union(tickvals, dataset[didx].x);
    }
    tickvals = tickvals.sort(function (a, b) {
        return a - b
    });


    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: 'Bin',
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 14,
            color: '#000000'
        },
        tickvals: tickvals,
        ticktext: tickvals.map(String),
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)",
        range: [xmin - xPad, xmax + xPad]
    };

    // y-axis options
    layout['yaxis'] = {
        title: axisLabel,
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        linecolor: 'black',
        linewidth: 2,
        mirror: true,
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)",
        range: [ymin - yPad, ymax + 8 * yPad]  // need to allow room at the top for the legend
    };

    return layout;
};

// sets plot options for contour plots
const generateContourPlotOptions = function (dataset) {
    const xAxisKey = dataset[0]['xAxisKey'];
    const yAxisKey = dataset[0]['yAxisKey'];
    var xmin = dataset[0].xmin;
    var xmax = dataset[0].xmax;
    var ymin = dataset[0].ymin;
    var ymax = dataset[0].ymax;

    // overall plot options
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
        hoverlabel: {
            font: {
                size: 16,
                color: '#FFFFFF'
            }
        },
        legend: {
            orientation: "h",
            x: 0,
            y: 1.07,
            font: {
                size: 12,
                color: '#000000'
            }
        }
    };

    // x-axis options
    layout['xaxis'] = {
        title: xAxisKey,
        titlefont: {
            size: 24,
            color: '#000000'
        },
        tickfont: {
            size: 18,
            color: '#000000'
        },
        showgrid: true,
        gridwidth: 1,
        gridcolor: "rgb(238,238,238)"
    };

    if (xAxisKey.indexOf("Date") > -1) {
        layout['xaxis']['range'] = [moment.utc(xmin * 1000).format("YYYY-MM-DD HH:mm"), moment.utc(xmax * 1000).format("YYYY-MM-DD HH:mm")];
    } else {
        layout['xaxis']['range'] = [xmin, xmax];
    }

    // y-axis options
    if (yAxisKey === "Pressure level") {
        layout['yaxis'] = {
            title: yAxisKey,
            titlefont: {
                size: 24,
                color: '#000000'
            },
            tickfont: {
                size: 18,
                color: '#000000'
            },
            tickvals: [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100],
            ticktext: ['1000', '900', '800', '700', '600', '500', '400', '300', '200', '100'],
            type: 'linear',
            autorange: 'reversed',
            showgrid: true,
            gridwidth: 1,
            gridcolor: "rgb(238,238,238)"
        };
    } else {
        layout['yaxis'] = {
            title: yAxisKey,
            titlefont: {
                size: 24,
                color: '#000000'
            },
            tickfont: {
                size: 18,
                color: '#000000'
            },
            showgrid: true,
            gridwidth: 1,
            gridcolor: "rgb(238,238,238)"
        };
    }

    if (yAxisKey.indexOf("Date") > -1) {
        layout['yaxis']['range'] = [moment.utc(ymin * 1000).format("YYYY-MM-DD HH:mm"), moment.utc(ymax * 1000).format("YYYY-MM-DD HH:mm")];
    } else {
        layout['yaxis']['range'] = [ymin, ymax];
    }

    return layout;
};

export default matsDataPlotOpsUtils = {

    generateSeriesPlotOptions: generateSeriesPlotOptions,
    generateProfilePlotOptions: generateProfilePlotOptions,
    generateDieoffPlotOptions: generateDieoffPlotOptions,
    generateThresholdPlotOptions: generateThresholdPlotOptions,
    generateValidTimePlotOptions: generateValidTimePlotOptions,
    generateGridScalePlotOptions: generateGridScalePlotOptions,
    generateReliabilityPlotOptions: generateReliabilityPlotOptions,
    generateROCPlotOptions: generateROCPlotOptions,
    generateMapPlotOptions: generateMapPlotOptions,
    generateHistogramPlotOptions: generateHistogramPlotOptions,
    generateEnsembleHistogramPlotOptions: generateEnsembleHistogramPlotOptions,
    generateContourPlotOptions: generateContourPlotOptions

}
