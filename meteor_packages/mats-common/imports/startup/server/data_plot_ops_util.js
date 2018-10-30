// sets plot options for timeseries graphs
const generateSeriesPlotOptions = function (dataset, curves, axisMap, errorMax) {
    var layout = {
        margin: {
            l: 60,
            r: 60,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false
    };

    layout['xaxis'] = {
        title: 'Time',
        titlefont: {color: '#000000'},
        tickfont: {color: '#000000'},
    };

    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right'};
    const axisPosition = {0: 0, 1: 0, 2: 1.5, 3: 0.85};

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
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.05;
        var axisObjectKey;
        if (axisIdx === 0) {
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000'},
                tickfont: {color: '#000000'},
                range: [ymin - yPad, ymax + yPad],
                zeroline: false
            };
        } else {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000'},
                tickfont: {color: '#000000'},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[axisIdx],
                overlaying: 'y',
                side: axisSide[axisIdx],
                position: axisPosition[axisIdx],
                zeroline: false
            };
        }
    }
    return layout;
};

// sets plot options for profile graphs
const generateProfilePlotOptions = function (dataset, curves, axisMap, errorMax) {
    var layout = {
        margin: {
            l: 60,
            r: 60,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false
    };
    layout['yaxis'] = {
        title: 'Pressure Level',
        titlefont: {color: '#000000'},
        tickfont: {color: '#000000'},
        tickvals: [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100],
        ticktext: ['1000', '900', '800', '700', '600', '500', '400', '300', '200', '100'],
        type: 'log',
        range: [1050, 1]
    };

    const xAxisNumber = Object.keys(axisMap).length;
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
        const xPad = (xmax - xmin) * 0.05;
        const axisObjectKey = axisIdx === 0 ? 'xaxis' : 'xaxis' + (axisIdx + 1);
        layout[axisObjectKey] = {
            title: axisLabel,
            titlefont: {color: '#000000'},
            tickfont: {color: '#000000'},
            range: [xmin - xPad, xmax + xPad],
            zeroline: false
        };
    }
    return layout;
};

// sets plot options for dieoff graphs
const generateDieoffPlotOptions = function (dataset, curves, axisMap, errorMax) {
        var layout = {
            margin: {
                l: 60,
                r: 60,
                b: 80,
                t: 20,
                pad: 4
            },
            zeroline: false
        };

        layout['xaxis'] = {
            title: 'Forecast Hour',
            titlefont: {color: '#000000'},
            tickfont: {color: '#000000'}
        };

        const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free'};
        const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right'};
        const axisPosition = {0: 0, 1: 0, 2: 1.5, 3: 0.85};

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
            axisLabel = axisMap[axisKey].axisLabel;
            const yPad = (ymax - ymin) * 0.05;
            var axisObjectKey;
            if (axisIdx === 0) {
                axisObjectKey = 'yaxis';
                layout[axisObjectKey] = {
                    title: axisLabel,
                    titlefont: {color: '#000000'},
                    tickfont: {color: '#000000'},
                    range: [ymin - yPad, ymax + yPad],
                    zeroline: false
                };
            } else {
                axisObjectKey = 'yaxis' + (axisIdx + 1);
                layout[axisObjectKey] = {
                    title: axisLabel,
                    titlefont: {color: '#000000'},
                    tickfont: {color: '#000000'},
                    range: [ymin - yPad, ymax + yPad],
                    anchor: axisAnchor[axisIdx],
                    overlaying: 'y',
                    side: axisSide[axisIdx],
                    position: axisPosition[axisIdx],
                    zeroline: false
                };
            }
        }
        return layout;
};

// sets plot options for threshold graphs
const generateThresholdPlotOptions = function (dataset, curves, axisMap, errorMax) {
    var layout = {
        margin: {
            l: 60,
            r: 60,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false
    };

    layout['xaxis'] = {
        title: 'Forecast Hour',
        titlefont: {color: '#000000'},
        tickfont: {color: '#000000'},
        tickvals: [0.01, 0.1, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0],
        ticktext: ["0.01", "0.10", "0.25", "0.50", "1.00", "1.50", "2.00","3.00"],
        type: 'log',
        range: [0, 3]
    };

    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right'};
    const axisPosition = {0: 0, 1: 0, 2: 1.5, 3: 0.85};

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
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.05;
        var axisObjectKey;
        if (axisIdx === 0) {
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000'},
                tickfont: {color: '#000000'},
                range: [ymin - yPad, ymax + yPad],
                zeroline: false
            };
        } else {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000'},
                tickfont: {color: '#000000'},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[axisIdx],
                overlaying: 'y',
                side: axisSide[axisIdx],
                position: axisPosition[axisIdx],
                zeroline: false
            };
        }
    }
    return layout;
};

// sets plot options for valid time graphs
const generateValidTimePlotOptions = function (dataset, curves, axisMap, errorMax) {
    var layout = {
        margin: {
            l: 60,
            r: 60,
            b: 80,
            t: 20,
            pad: 4
        },
        zeroline: false
    };

    layout['xaxis'] = {
        title: 'Forecast Hour',
        titlefont: {color: '#000000'},
        tickfont: {color: '#000000'},
        tick0: 0,
        dtick: 1,
        range: [0, 23]
    };

    const axisAnchor = {0: 'x', 1: 'x', 2: 'free', 3: 'free'};
    const axisSide = {0: 'left', 1: 'right', 2: 'left', 3: 'right'};
    const axisPosition = {0: 0, 1: 0, 2: 1.5, 3: 0.85};

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
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.05;
        var axisObjectKey;
        if (axisIdx === 0) {
            axisObjectKey = 'yaxis';
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000'},
                tickfont: {color: '#000000'},
                range: [ymin - yPad, ymax + yPad],
                zeroline: false
            };
        } else {
            axisObjectKey = 'yaxis' + (axisIdx + 1);
            layout[axisObjectKey] = {
                title: axisLabel,
                titlefont: {color: '#000000'},
                tickfont: {color: '#000000'},
                range: [ymin - yPad, ymax + yPad],
                anchor: axisAnchor[axisIdx],
                overlaying: 'y',
                side: axisSide[axisIdx],
                position: axisPosition[axisIdx],
                zeroline: false
            };
        }
    }
    return layout;
};

// sets plot options for map graphs
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

// sets plot options for valid time graphs
const generateHistogramPlotOptions = function (dataset, curves, axisMap, plotBins) {
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    var axisLabel;
    var binWidth = 0;
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        const binNum = curves[dsi].binNum;
        var ymin = axisMap[axisKey].ymin;
        var ymax = axisMap[axisKey].ymax;
        var xmin = curves[dsi].xmin;
        var xmax = curves[dsi].xmax;
        axisLabel = axisMap[axisKey].axisLabel;
        binWidth = ((xmax - xmin) / binNum) > binWidth ? ((xmax - xmin) / binNum) : binWidth;
        const yPad = (ymax - ymin) * 0.05;
        const position = dsi === 0 ? "left" : "right";
        const yaxesOptions = {
            position: position,
            color: 'black',
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
    var xPad = binWidth * 0.55;
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'Bin',
            color: 'black',
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 22,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
            min: xmin - xPad,
            max: xmax + xPad,
        }],
        xaxis: {
            zoomRange: [0.1, null],
            ticks: plotBins,
            mode: 'xy',
            font: {size: 12}
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
            bars: {
                show: true,
            },
            shadowSize: 0
        },
        bars: {
            align: "center",
            barWidth: binWidth
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

export default matsDataPlotOpsUtils = {

    generateSeriesPlotOptions: generateSeriesPlotOptions,
    generateProfilePlotOptions: generateProfilePlotOptions,
    generateDieoffPlotOptions: generateDieoffPlotOptions,
    generateThresholdPlotOptions: generateThresholdPlotOptions,
    generateValidTimePlotOptions: generateValidTimePlotOptions,
    generateMapPlotOptions: generateMapPlotOptions,
    generateHistogramPlotOptions: generateHistogramPlotOptions

}
