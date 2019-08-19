/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
    matsPlotUtils,
    matsTypes
} from 'meteor/randyp:mats-common';

// adds a horizontal black line along a specific y value
const getHorizontalValueLine = function (xmax, xmin, yValue, cLabel) {

    const valueLine = {
        "label": cLabel,
        "curveId": cLabel,
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
        },
        "showlegend": false
    };

    return valueLine
};

// adds a vertical black line along a specific x value
const getVerticalValueLine = function (ymax, ymin, xValue, cLabel) {

    const valueLine = {
        "label": cLabel,
        "curveId": cLabel,
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
        },
        "showlegend": false
    };

    return valueLine
};

// adds a linear line
const getLinearValueLine = function (xmax, xmin, ymax, ymin, cLabel) {

    const valueLine = {
        "label": cLabel,
        "curveId": cLabel,
        "annotation": "",
        "name": cLabel,
        "mode": "lines",
        "x": [xmin, xmax],
        "x_epoch": [xmin, xmax],
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
        "tooltip": "",
        "xmin": xmin,
        "xmax": xmax,
        "ymin": ymin,
        "ymax": ymax,
        "line": {
            "color": "rgb(0,0,0)",
        },
        "showlegend": false
    };

    return valueLine
};

// provides curve options for all plot types with an independent x axis and a dependent y axis
const generateSeriesCurveOptions = function (curve, curveIndex, axisMap, dataSeries, appParams) {

    const label = curve['label'];
    const longLabel = matsPlotUtils.getCurveText(appParams.plotType, curve);
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
            name: longLabel,
            xaxis: "x1",
            yaxis: "y" + (axisNumber + 1),
            annotation: annotation,
            annotateColor: curve['color'],
            mode: "lines+markers",
            marker: {
                symbol: "circle",
                color: curve['color'],
                size: 8
            },
            line: {
                dash: 'solid',
                color: curve['color'],
                width: 2
            },
            visible: true,
            showlegend: true
        }, ...dataSeries
    };

    delete curveOptions.error_y;

    curveOptions['error_y'] = error_y_temp.error_y;

    return curveOptions;
};

// provides curve options for all plot types with an independent y axis and a dependent x axis
const generateProfileCurveOptions = function (curve, curveIndex, axisMap, dataProfile, appParams) {

    const label = curve['label'];
    const longLabel = matsPlotUtils.getCurveTextWrapping(appParams.plotType, curve);
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
            name: longLabel,
            xaxis: "x" + (axisNumber + 1),
            yaxis: "y1",
            annotation: annotation,
            annotateColor: curve['color'],
            mode: "lines+markers",
            marker: {
                symbol: "circle",
                color: curve['color'],
                size: 8
            },
            line: {
                dash: 'solid',
                color: curve['color'],
                width: 2
            },
            visible: true,
            showlegend: true
        }, ...dataProfile
    };

    delete curveOptions.error_x;

    curveOptions['error_x'] = error_x_temp.error_x;

    return curveOptions;
};

// provides curve options for all plot types with an independent x axis and a dependent y axis
const generateBarChartCurveOptions = function (curve, curveIndex, axisMap, dataBars, appParams) {

    const label = curve['label'];
    const longLabel = matsPlotUtils.getCurveText(appParams.plotType, curve);
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
            name: longLabel,
            annotation: annotation,
            annotateColor: curve['color'],
            marker: {
                color: curve['color'],
                line: {
                    color: "rgb(0,0,0)"
                }
            },
            type: 'bar',
            visible: true,
            showlegend: true
        }, ...dataBars
    };

    return curveOptions;
};

const generateMapCurveOptions = function (curve, dataSeries, appParams) {

    const markerSizes = dataSeries.queryVal.map(function (val) {
        var size = Math.ceil(Math.abs(val * 4)) + 2;
        size = size > 50 ? 50 : size; // prevent really massive bad data from obscuring map
        return size;
    });

    const label = curve['label'];
    const longLabel = matsPlotUtils.getCurveText(appParams.plotType, curve);

    const curveOptions = {
        ...{
            label: label,
            curveId: label,
            name: longLabel,
            type: 'scattermapbox',
            mode: 'markers',
            marker: {
                color: dataSeries.color,
                size: markerSizes,
                opacity: 0
            },
            showlegend: true
        }, ...dataSeries
    };

    delete curveOptions.color;

    return curveOptions;
};

const generateMapColorTextOptions = function (label, dataSeries) {

    const curveOptions = {
        ...{
            label: label,
            curveId: label,
            name: label,
            type: 'scattermapbox',
            mode: 'markers+text',
            marker: {
                opacity: 0
            },
            textfont: {
                family: 'sans serif',
                // size: 18,
                color: dataSeries.color
            },
            hoverinfo: 'skip',
            visible: true,
            showlegend: true
        }, ...dataSeries
    };

    delete curveOptions.color;

    return curveOptions;
};

const generateContourCurveOptions = function (curve, axisMap, dataset, appParams) {

    const label = curve['label'];
    const longLabel = matsPlotUtils.getCurveText(appParams.plotType, curve);
    const annotation = curve['annotation'];
    const unitKey = curve['unitKey'];

    const curveOptions = {
        ...{
            label: label,
            curveId: label,
            name: longLabel,
            annotation: annotation,
            annotateColor: curve['color'],
            xAxisKey: curve['xAxisKey'],
            yAxisKey: curve['yAxisKey'],
            marker: {
                color: curve['color'],
            },
            type: 'contour',
            autocontour: false,
            ncontours: 15,   // apparently plotly regards this as a "less than or equal to" field
            contours: {
                // these are only used if autocontour is set to false and ncontour is disregarded
                start: dataset.zmin + (dataset.zmax - dataset.zmin) / 16,
                end: dataset.zmax - (dataset.zmax - dataset.zmin) / 16,
                size:  (dataset.zmax - dataset.zmin) / 16,
                showlabels: false
            },
            colorscale: 'RdBu',
            reversescale: false,
            colorbar:{
                title: unitKey,
                titleside: 'right',
                titlefont: {
                    size: 20,
                    family: 'Arial, sans-serif'
                }
            },
            connectgaps: appParams.hideGaps,   // this option will interpolate to fill in nulls
            visible: true,
            showlegend: true
        }, ...dataset
    };

    return curveOptions;
};

export default matsDataCurveOpsUtils = {

    getHorizontalValueLine: getHorizontalValueLine,
    getVerticalValueLine: getVerticalValueLine,
    getLinearValueLine: getLinearValueLine,

    generateSeriesCurveOptions: generateSeriesCurveOptions,
    generateProfileCurveOptions: generateProfileCurveOptions,
    generateBarChartCurveOptions: generateBarChartCurveOptions,
    generateMapCurveOptions: generateMapCurveOptions,
    generateMapColorTextOptions: generateMapColorTextOptions,
    generateContourCurveOptions: generateContourCurveOptions

}