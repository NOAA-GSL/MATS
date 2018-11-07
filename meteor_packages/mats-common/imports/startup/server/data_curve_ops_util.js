// utility for supplying alternating data markers for plots
const getPointSymbol = function (curveIndex) {
    var pointSymbol = "circle";
    switch (curveIndex % 5) {
        case 0:
            pointSymbol = "circle";
            break;
        case 1:
            pointSymbol = "square";
            break;
        case 2:
            pointSymbol = "diamond";
            break;
        case 3:
            pointSymbol = "triangle";
            break;
        case 4:
            pointSymbol = "cross";
            break;
    }
    return pointSymbol;
};

// adds a horizontal black line along a specific y value
const getHorizontalValueLine = function (xmax, xmin, yValue, cLabel) {

    const valueLine = {
        "label": cLabel,
        "annotation": "",
        "name": "y = " + yValue.toString(),
        "mode": "lines",
        "x": [xmin, xmax],
        "x_epoch": [xmin, xmax],
        "y": [yValue, yValue],
        "error_x": [null, null],
        "error_y": [null, null],
        "subVals": [],
        "subSecs": [],
        "subLevs": [],
        "stats": [{"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, {
            "d_mean": 0,
            "sd": 0,
            "n_good": 0,
            "lag1": 0,
            "stde": 0
        }],
        "tooltip": ["y = " + yValue.toString(), "y = " + yValue.toString()],
        "xmin": xmin,
        "xmax": xmax,
        "ymin": yValue,
        "ymax": yValue,
        "line": {
            "color": "rgb(0,0,0)",
        }
    };

    return valueLine
};

// adds a vertical black line along a specific x value
const getVerticalValueLine = function (ymax, ymin, xValue, cLabel) {

    const valueLine = {
        "label": cLabel,
        "annotation": "",
        "name": "x = " + xValue.toString(),
        "mode": "lines",
        "x": [xValue, xValue],
        "y": [ymin, ymax],
        "error_x": [null, null],
        "error_y": [null, null],
        "subVals": [],
        "subSecs": [],
        "subLevs": [],
        "stats": [{"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, {
            "d_mean": 0,
            "sd": 0,
            "n_good": 0,
            "lag1": 0,
            "stde": 0
        }],
        "tooltip": ["x = " + xValue.toString(), "x = " + xValue.toString()],
        "xmin": xValue,
        "xmax": xValue,
        "ymin": ymin,
        "ymax": ymax,
        "line": {
            "color": "rgb(0,0,0)",
        }
    };

    return valueLine
};

// provides curve options for all plot types with an independent x axis and a dependent y axis
const generateSeriesCurveOptions = function (curve, curveIndex, axisMap, dataSeries) {

    const label = curve['label'];
    const annotation = curve['annotation'];

    // adjust axes for later setting of the plot options
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const xmin = curve['xmin'];
    const xmax = curve['xmax'];
    const axisKey = curve['axisKey'];
    if (axisKey in axisMap) {
        axisMap[axisKey].axisLabel = axisKey;
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
        axisMap[axisKey].xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        axisMap[axisKey].xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    } else {
        axisMap[axisKey] = {
            index: Object.keys(axisMap).length + 1,
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            axisLabel: axisKey
        };
    }

    const axisNumber = Object.keys(axisMap).indexOf(axisKey);

    var error_y_temp = {
        error_y: {
            array: dataSeries.error_y,
            thickness: 1,     // set the thickness of the error bars
            color: curve['color'],
            visible: false, // changed later if matching
            // width: 0
        }
    };
    var curveOptions = {
        ...{
            label: label,
            curveId: label,
            name: label,
            yaxis: "y" + (axisNumber + 1),
            annotation: annotation,
            annotateColor: curve['color'],
            mode: "lines+markers",
            marker: {
                color: curve['color'],
                size: 8
            },
            line: {
                color: curve['color'],
            },
            visible: true
        }, ...dataSeries
    };

    delete curveOptions.error_y;

    curveOptions['error_y'] = error_y_temp.error_y;

    return curveOptions;
};

// provides curve options for all plot types with an independent y axis and a dependent x axis
const generateProfileCurveOptions = function (curve, curveIndex, axisMap, dataProfile) {

    const label = curve['label'];
    const annotation = curve['annotation'];

    // adjust axes for later setting of the plot options
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const xmin = curve['xmin'];
    const xmax = curve['xmax'];
    const axisKey = curve['axisKey'];
    if (axisKey in axisMap) {
        axisMap[axisKey].axisLabel = axisKey;
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
        axisMap[axisKey].xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        axisMap[axisKey].xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    } else {
        axisMap[axisKey] = {
            index: Object.keys(axisMap).length + 1,
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            axisLabel: axisKey
        };
    }

    var error_x_temp = {
        error_x: {
            array: dataProfile.error_x,
            thickness: 1,     // set the thickness of the error bars
            color: curve['color'],
            visible: false, // changed later if matching
            // width: 0
        }
    };
    var curveOptions = {
        ...{
            label: label,
            curveId: label,
            name: label,
            yaxis: "y1",
            annotation: annotation,
            annotateColor: curve['color'],
            mode: "lines+markers",
            marker: {
                color: curve['color'],
                size: 8
            },
            line: {
                color: curve['color'],
            },
            visible: true
        }, ...dataProfile
    };

    delete curveOptions.error_x;

    curveOptions['error_x'] = error_x_temp.error_x;

    return curveOptions;
};

// provides curve options for all plot types with an independent x axis and a dependent y axis
const generateBarChartCurveOptions = function (curve, curveIndex, axisMap, dataBars) {

    const label = curve['label'];
    const annotation = curve['annotation'];

    // adjust axes for later setting of the plot options
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const xmin = curve['xmin'];
    const xmax = curve['xmax'];
    const axisKey = curve['axisKey'];
    if (axisKey in axisMap) {
        axisMap[axisKey].axisLabel = axisKey;
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
        axisMap[axisKey].xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        axisMap[axisKey].xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    } else {
        axisMap[axisKey] = {
            index: Object.keys(axisMap).length + 1,
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            axisLabel: axisKey
        };
    }

    const curveOptions = {
        ...{
            label: label,
            curveId: label,
            name: label,
            annotation: annotation,
            annotateColor: curve['color'],
            marker: {
                color: curve['color'],
                line: {
                    color: "rgb(0,0,0)"
                }
            },
            type: 'bar',
            visible: true
        }, ...dataBars
    };

    return curveOptions;
};

const generateMapCurveOptions = function (curve, curveIndex, dataSeries, sitePlot) {

    const label = curve['label'];
    const annotation = curve['annotation'];
    const pointSymbol = getPointSymbol(curveIndex);

    const curveOptions = {
        label: label,
        curveId: label,
        annotation: annotation,
        color: curve['color'],
        data: dataSeries,
        sites: sitePlot,
        points: {
            symbol: pointSymbol,
            fillColor: curve['color'],
            show: true,
            errorbars: "y",
        },
        lines: {show: true, fill: false}
    };

    return curveOptions;
};

export default matsDataCurveOpsUtils = {

    getPointSymbol: getPointSymbol,
    getHorizontalValueLine: getHorizontalValueLine,
    getVerticalValueLine: getVerticalValueLine,

    generateSeriesCurveOptions: generateSeriesCurveOptions,
    generateProfileCurveOptions: generateProfileCurveOptions,
    generateBarChartCurveOptions: generateBarChartCurveOptions,
    generateMapCurveOptions: generateMapCurveOptions

}