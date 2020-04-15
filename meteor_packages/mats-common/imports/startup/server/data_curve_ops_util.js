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
            "dash": "solid",
            "color": "rgb(0,0,0)",
            "width": 1
        },
        "marker": {
            "symbol": "circle",
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
            "dash": "solid",
            "color": "rgb(0,0,0)",
            "width": 1
        },
        "marker": {
            "symbol": "circle",
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
            "dash": "solid",
            "color": "rgb(0,0,0)",
            "width": 1
        },
        "marker": {
            "symbol": "circle",
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
    const ymin = dataBars['ymin'];
    const ymax = dataBars['ymax'];
    const xmin = dataBars['xmin'];
    const xmax = dataBars['xmax'];
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

const generateMapCurveOptions = function (curve, dataSeries, appParams, orderOfMagnitude) {

    const markerSizes = dataSeries.queryVal.map(function (val) {
        var size = Math.ceil(Math.abs(val * 4 / Math.pow(2, orderOfMagnitude))) + 2;
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
            showlegend: false
        }, ...dataSeries
    };

    delete curveOptions.color;

    return curveOptions;
};

const generateCTCMapCurveOptions = function (curve, dataSeries, appParams) {

    const markerSizes = dataSeries.queryVal.map(function (val) {
        return 10;
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
                opacity: 1
            },
            showlegend: false
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
            visible: label.includes("percentile") ? 'legendonly' : true,
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
    const statistic = curve['statistic'];
    const variable = curve['variable'] !== undefined ? curve['variable'] : "";
    const RdWhBu = [[0, "rgb(5,10,172)"], [0.35, "rgb(106,137,247)"], [0.45, "rgb(255,255,255)"], [0.55, "rgb(255,255,255)"], [0.6, "rgb(220,170,132)"], [0.7, "rgb(230,145,90)"], [1, "rgb(178,10,28)"]];
    const MPL_BrBG = [[0, "rgb(86,49,5)"], [0.008, "rgb(91,52,6)"], [0.016, "rgb(95,54,6)"], [0.023, "rgb(99,57,6)"], [0.031, "rgb(104,60,7)"], [0.039, "rgb(108,62,7)"], [0.047, "rgb(113,65,8)"], [0.055, "rgb(117,67,8)"], [0.063, "rgb(121,70,8)"], [0.070, "rgb(124,71,9)"], [0.078, "rgb(130,75,9)"], [0.086, "rgb(132,76,9)"], [0.094, "rgb(139,80,10)"], [0.102, "rgb(141,82,11)"], [0.109, "rgb(147,88,15)"], [0.117, "rgb(149,89,16)"], [0.125, "rgb(155,95,20)"], [0.133, "rgb(159,99,23)"], [0.141, "rgb(161,101,24)"], [0.148, "rgb(167,106,29)"], [0.156, "rgb(171,110,31)"], [0.164, "rgb(175,114,34)"], [0.172, "rgb(177,116,35)"], [0.180, "rgb(183,121,40)"], [0.188, "rgb(187,125,42)"], [0.195, "rgb(191,129,45)"], [0.203, "rgb(192,132,48)"], [0.211, "rgb(196,139,58)"], [0.219, "rgb(199,144,64)"], [0.227, "rgb(201,149,70)"], [0.234, "rgb(202,152,73)"], [0.242, "rgb(206,160,83)"], [0.250, "rgb(209,165,89)"], [0.258, "rgb(211,170,95)"], [0.266, "rgb(214,175,101)"], [0.273, "rgb(216,180,108)"], [0.281, "rgb(219,185,114)"], [0.289, "rgb(220,188,117)"], [0.297, "rgb(223,195,126)"], [0.305, "rgb(225,198,132)"], [0.313, "rgb(227,201,137)"], [0.320, "rgb(229,204,143)"], [0.328, "rgb(231,207,148)"], [0.336, "rgb(232,210,154)"], [0.344, "rgb(234,213,159)"], [0.352, "rgb(235,214,162)"], [0.359, "rgb(238,219,170)"], [0.367, "rgb(240,222,176)"], [0.375, "rgb(241,225,181)"], [0.383, "rgb(243,228,187)"], [0.391, "rgb(245,231,192)"], [0.398, "rgb(246,233,197)"], [0.406, "rgb(246,234,201)"], [0.414, "rgb(246,234,203)"], [0.422, "rgb(246,236,209)"], [0.430, "rgb(246,237,213)"], [0.438, "rgb(246,238,217)"], [0.445, "rgb(245,239,220)"], [0.453, "rgb(245,240,224)"], [0.461, "rgb(245,241,228)"], [0.469, "rgb(245,242,232)"], [0.477, "rgb(245,242,234)"], [0.484, "rgb(245,244,240)"], [0.492, "rgb(245,245,244)"], [0.500, "rgb(242,244,244)"], [0.508, "rgb(239,243,243)"], [0.516, "rgb(235,243,242)"], [0.523, "rgb(231,242,240)"], [0.531, "rgb(228,241,239)"], [0.539, "rgb(224,240,238)"], [0.547, "rgb(221,239,237)"], [0.555, "rgb(217,238,235)"], [0.563, "rgb(213,237,234)"], [0.570, "rgb(210,237,233)"], [0.578, "rgb(206,236,232)"], [0.586, "rgb(204,235,231)"], [0.594, "rgb(199,234,229)"], [0.602, "rgb(193,232,226)"], [0.609, "rgb(188,229,223)"], [0.617, "rgb(182,227,221)"], [0.625, "rgb(177,225,218)"], [0.633, "rgb(171,223,215)"], [0.641, "rgb(166,220,212)"], [0.648, "rgb(160,218,209)"], [0.656, "rgb(154,216,206)"], [0.664, "rgb(149,214,204)"], [0.672, "rgb(143,211,201)"], [0.680, "rgb(138,209,198)"], [0.688, "rgb(132,207,195)"], [0.695, "rgb(127,204,192)"], [0.703, "rgb(121,200,188)"], [0.711, "rgb(118,198,186)"], [0.719, "rgb(109,191,180)"], [0.727, "rgb(103,187,176)"], [0.734, "rgb(97,183,172)"], [0.742, "rgb(91,179,168)"], [0.750, "rgb(85,174,165)"], [0.758, "rgb(79,170,161)"], [0.766, "rgb(74,166,157)"], [0.773, "rgb(68,162,153)"], [0.781, "rgb(62,157,149)"], [0.789, "rgb(56,153,145)"], [0.797, "rgb(51,149,141)"], [0.805, "rgb(47,145,137)"], [0.813, "rgb(43,141,133)"], [0.820, "rgb(39,138,130)"], [0.828, "rgb(35,134,126)"], [0.836, "rgb(33,132,124)"], [0.844, "rgb(26,126,118)"], [0.852, "rgb(22,122,114)"], [0.859, "rgb(18,118,110)"], [0.867, "rgb(14,114,106)"], [0.875, "rgb(10,111,103)"], [0.883, "rgb(6,107,99)"], [0.891, "rgb(2,103,95)"], [0.898, "rgb(1,100,91)"], [0.906, "rgb(1,96,88)"], [0.914, "rgb(1,93,84)"], [0.922, "rgb(1,90,80)"], [0.930, "rgb(1,86,77)"], [0.938, "rgb(1,83,73)"], [0.945, "rgb(0,80,70)"], [0.953, "rgb(0,76,66)"], [0.961, "rgb(0,75,64)"], [0.969, "rgb(0,70,59)"], [0.977, "rgb(0,67,55)"], [0.984, "rgb(0,63,52)"], [1, "rgb(0,60,48)"]];
    const MPL_BrBWG = [[0, "rgb(86,49,5)"], [0.008, "rgb(91,52,6)"], [0.016, "rgb(95,54,6)"], [0.023, "rgb(99,57,6)"], [0.031, "rgb(104,60,7)"], [0.039, "rgb(108,62,7)"], [0.047, "rgb(113,65,8)"], [0.055, "rgb(117,67,8)"], [0.063, "rgb(121,70,8)"], [0.070, "rgb(124,71,9)"], [0.078, "rgb(130,75,9)"], [0.086, "rgb(132,76,9)"], [0.094, "rgb(139,80,10)"], [0.102, "rgb(141,82,11)"], [0.109, "rgb(147,88,15)"], [0.117, "rgb(149,89,16)"], [0.125, "rgb(155,95,20)"], [0.133, "rgb(159,99,23)"], [0.141, "rgb(161,101,24)"], [0.148, "rgb(167,106,29)"], [0.156, "rgb(171,110,31)"], [0.164, "rgb(175,114,34)"], [0.172, "rgb(177,116,35)"], [0.180, "rgb(183,121,40)"], [0.188, "rgb(187,125,42)"], [0.195, "rgb(191,129,45)"], [0.203, "rgb(192,132,48)"], [0.211, "rgb(196,139,58)"], [0.219, "rgb(199,144,64)"], [0.227, "rgb(201,149,70)"], [0.234, "rgb(202,152,73)"], [0.242, "rgb(206,160,83)"], [0.250, "rgb(209,165,89)"], [0.258, "rgb(211,170,95)"], [0.266, "rgb(214,175,101)"], [0.273, "rgb(216,180,108)"], [0.281, "rgb(219,185,114)"], [0.289, "rgb(220,188,117)"], [0.297, "rgb(223,195,126)"], [0.305, "rgb(225,198,132)"], [0.313, "rgb(227,201,137)"], [0.320, "rgb(229,204,143)"], [0.328, "rgb(231,207,148)"], [0.336, "rgb(232,210,154)"], [0.344, "rgb(234,213,159)"], [0.352, "rgb(235,214,162)"], [0.359, "rgb(238,219,170)"], [0.367, "rgb(240,222,176)"], [0.375, "rgb(241,225,181)"], [0.383, "rgb(243,228,187)"], [0.391, "rgb(245,231,192)"], [0.398, "rgb(246,233,197)"], [0.406, "rgb(246,234,201)"], [0.414, "rgb(246,234,203)"], [0.422, "rgb(246,236,209)"], [0.430, "rgb(246,237,213)"], [0.438, "rgb(246,238,217)"], [0.445, "rgb(255,255,255)"], [0.555, "rgb(255,255,255)"], [0.563, "rgb(213,237,234)"], [0.570, "rgb(210,237,233)"], [0.578, "rgb(206,236,232)"], [0.586, "rgb(204,235,231)"], [0.594, "rgb(199,234,229)"], [0.602, "rgb(193,232,226)"], [0.609, "rgb(188,229,223)"], [0.617, "rgb(182,227,221)"], [0.625, "rgb(177,225,218)"], [0.633, "rgb(171,223,215)"], [0.641, "rgb(166,220,212)"], [0.648, "rgb(160,218,209)"], [0.656, "rgb(154,216,206)"], [0.664, "rgb(149,214,204)"], [0.672, "rgb(143,211,201)"], [0.680, "rgb(138,209,198)"], [0.688, "rgb(132,207,195)"], [0.695, "rgb(127,204,192)"], [0.703, "rgb(121,200,188)"], [0.711, "rgb(118,198,186)"], [0.719, "rgb(109,191,180)"], [0.727, "rgb(103,187,176)"], [0.734, "rgb(97,183,172)"], [0.742, "rgb(91,179,168)"], [0.750, "rgb(85,174,165)"], [0.758, "rgb(79,170,161)"], [0.766, "rgb(74,166,157)"], [0.773, "rgb(68,162,153)"], [0.781, "rgb(62,157,149)"], [0.789, "rgb(56,153,145)"], [0.797, "rgb(51,149,141)"], [0.805, "rgb(47,145,137)"], [0.813, "rgb(43,141,133)"], [0.820, "rgb(39,138,130)"], [0.828, "rgb(35,134,126)"], [0.836, "rgb(33,132,124)"], [0.844, "rgb(26,126,118)"], [0.852, "rgb(22,122,114)"], [0.859, "rgb(18,118,110)"], [0.867, "rgb(14,114,106)"], [0.875, "rgb(10,111,103)"], [0.883, "rgb(6,107,99)"], [0.891, "rgb(2,103,95)"], [0.898, "rgb(1,100,91)"], [0.906, "rgb(1,96,88)"], [0.914, "rgb(1,93,84)"], [0.922, "rgb(1,90,80)"], [0.930, "rgb(1,86,77)"], [0.938, "rgb(1,83,73)"], [0.945, "rgb(0,80,70)"], [0.953, "rgb(0,76,66)"], [0.961, "rgb(0,75,64)"], [0.969, "rgb(0,70,59)"], [0.977, "rgb(0,67,55)"], [0.984, "rgb(0,63,52)"], [1, "rgb(0,60,48)"]];
    const maxZ = Math.abs(dataset.zmax) > Math.abs(dataset.zmin) ? Math.abs(dataset.zmax) : Math.abs(dataset.zmin);
    const defaultStart = dataset.zmin + (dataset.zmax - dataset.zmin) / 16;
    const defaultEnd = dataset.zmax - (dataset.zmax - dataset.zmin) / 16;
    const defaultSize = (dataset.zmax - dataset.zmin) / 16;
    const symmetricStart = -1 * maxZ + (2 * maxZ) / 16;
    const symmetricEnd = maxZ - (2 * maxZ) / 16;
    const symmetricSize = (2 * maxZ) / 16;

    var colorscale = 'RdBu';
    if (variable.includes("RH") || variable.includes("rh") || variable.includes("Dewpoint") || variable.includes("dewpoint") || variable.includes("DPT") || variable.includes("Td") || variable.includes("TD")) {
        if (statistic === 'Bias (Model - Obs)' || appParams.plotType === matsTypes.PlotTypes.contourDiff) {
            colorscale = MPL_BrBWG;
        } else {
            colorscale = MPL_BrBG;
        }
    } else if (statistic === 'Bias (Model - Obs)' || appParams.plotType === matsTypes.PlotTypes.contourDiff) {
        colorscale = RdWhBu;
    }

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
                start: statistic !== 'Bias (Model - Obs)' ? defaultStart : symmetricStart,  // bias is symmetric about zero
                end: statistic !== 'Bias (Model - Obs)' ? defaultEnd : symmetricEnd,
                size: statistic !== 'Bias (Model - Obs)' ? defaultSize : symmetricSize,
                showlabels: false
            },
            colorscale: colorscale,       // bias uses the diff colormap
            reversescale: false,
            colorbar: {
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

const getContourSignificanceLayer = function (dataset) {

    const label = matsTypes.ReservedWords.contourSigLabel;
    var curveOptions = {
        label: label,
        curveId: label,
        annotation: "",
        name: label,
        x: [],
        y: [],
        type: "scatter",
        mode: "markers",
        marker: {
            symbol: "circle",
            color: "black",
            size: 6
        },
        hoverinfo: 'skip',
        visible: true,
        showlegend: true,
        xmin: dataset[0].xmin,
        xmax: dataset[0].xmax,
        ymin: dataset[0].ymin,
        ymax: dataset[0].ymax
    };

    const xs = dataset[0].x;
    const ys = dataset[0].y;
    const sigMask = dataset[0].stdev;

    var xidx;
    var yidx;
    var currX;
    var currY;
    for (xidx = 0; xidx < xs.length; xidx++) {
        currX = xs[xidx];
        for (yidx = 0; yidx < ys.length; yidx++) {
            currY = ys[yidx];
            if (sigMask[yidx][xidx] === 1) {
                curveOptions.x.push(currX);
                curveOptions.y.push(currY);
            }
        }
    }

    return curveOptions;
};

export default matsDataCurveOpsUtils = {

    getHorizontalValueLine: getHorizontalValueLine,
    getVerticalValueLine: getVerticalValueLine,
    getLinearValueLine: getLinearValueLine,
    getContourSignificanceLayer: getContourSignificanceLayer,

    generateSeriesCurveOptions: generateSeriesCurveOptions,
    generateProfileCurveOptions: generateProfileCurveOptions,
    generateBarChartCurveOptions: generateBarChartCurveOptions,
    generateMapCurveOptions: generateMapCurveOptions,
    generateCTCMapCurveOptions: generateCTCMapCurveOptions,
    generateMapColorTextOptions: generateMapColorTextOptions,
    generateContourCurveOptions: generateContourCurveOptions

}