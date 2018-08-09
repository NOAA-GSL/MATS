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
const getHorizontalValueLine = function(xmax,xmin,yValue) {

    const valueLine = {
        "yaxis": 1,
        "label": yValue.toString(),
        "annotation": "",
        "color": "rgb(0,0,0)",
        "data": [
            [xmin, yValue, yValue, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, yValue.toString()],
            [xmax, yValue, yValue, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, yValue.toString()]
        ],
        "points": {
            "show": false,
            "errorbars": "y",
            "yerr": {
                "show": false,
                "asymmetric": false,
                "upperCap": "squareCap",
                "lowerCap": "squareCap",
                "color": "rgb(0,0,255)",
                "radius": 5
            }
        },
        "lines": {
            "show": true,
            "fill": false
        },
        "stats": {
            "d_mean": 0,
            "stde_betsy": 0,
            "sd": 0,
            "n_good": 0,
            "lag1": 0,
            "min": xmax,
            "max": xmin,
            "sum": 0,
            "miny": yValue,
            "maxy": yValue
        }
    };

    return valueLine
};

// adds a vertical black line along a specific x value
const getVerticalValueLine = function(ymax,ymin,xValue) {

    const valueLine = {
        "yaxis": 1,
        "label": xValue.toString(),
        "color": "rgb(0,0,0)",
        "annotation": "",
        "data": [
            [xValue, -ymax, xValue, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, xValue.toString()],
            [xValue, -ymin, xValue, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, xValue.toString()]
        ],
        "points": {
            "show": false,
            "errorbars": "x",
            "xerr": {
                "show": false,
                "asymmetric": false,
                "upperCap": "squareCap",
                "lowerCap": "squareCap",
                "color": "rgb(0,0,255)",
                "radius": 5
            }
        },
        "lines": {
            "show": true,
            "fill": false
        },
        "stats": {
            "d_mean": 0,
            "stde_betsy": 0,
            "sd": 0,
            "n_good": 0,
            "lag1": 0,
            "min": ymin,
            "max": ymax,
            "sum": 0,
            "minx": xValue,
            "maxx": xValue
        }
    };

    return valueLine
};

// provides curve options for all plot types with an independent x axis and a dependent y axis
const generateSeriesCurveOptions = function (curve, curveIndex, axisMap, dataSeries) {
    /*
     some curves will share an axis based on the axis map key.
     for example all the curves that have the same variable and statistic might share an axis.
     The axis key might be different for different apps.
     These axis have parameters that have been stashed in the axisMap
     PARAMETERS:
     curve -  the curve object
     curveIndex : Number - the integer index of this curve
     axisMap: object - a map of axis params ....
     required curve params for generating an axisMap are:
     label : String - that is the label of an axis
     ymin : Number - the minimum value of the curves y axis that corresponds to this axisKey (in other words for this curve)
     ymax : the maximum value of the curves y axis that corresponds to this axisKey (in other words for this curve)
     axisKey : String - the axisMap key for this curve, i.e. the curves variable and statistic concatenated together.
     optional params in an axisMap:
     annotation : String - gets placed on the graph at the top left. e.g. "mean" for a time series.

     dataSeries : array - the actual flot dataSeries array for this curve.  like [[x,y],[x,y], .... [x,y]]
     */
    const label = curve['label'];
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const xmin = curve['xmin'];
    const xmax = curve['xmax'];
    const axisKey = curve['axisKey'];
    const annotation = curve['annotation'];
    const pointSymbol = getPointSymbol(curveIndex);
    if (axisKey in axisMap) {
        axisMap[axisKey].axisLabel = axisKey;
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
        axisMap[axisKey].xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        axisMap[axisKey].xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    } else {
        axisMap[axisKey] = {
            index: curveIndex + 1,
            label: label,
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            // axisLabel: axisKey + " - " + label
            axisLabel: axisKey
        };
    }
    const curveOptions = {
        yaxis: axisMap[axisKey].index,
        label: label,
        curveId: label,
        annotation: annotation,
        color: curve['color'],
        data: dataSeries,
        points: {
            symbol: pointSymbol,
            fillColor: curve['color'],
            show: true,
            errorbars: "y",
            yerr: {
                show: true,
                asymmetric: false,
                upperCap: "squareCap",
                lowerCap: "squareCap",
                color: curve['color'],
                radius: 5
            }
        },
        lines: {show: true, fill: false}
    };

    return curveOptions;
};

// provides curve options for all plot types with an independent y axis and a dependent x axis
const generateProfileCurveOptions = function (curve, curveIndex, axisMap, dataSeries) {
    /*
     some curves will share an axis based on the axis map key.
     for example all the curves that have the same variable and statistic might share an axis.
     The axis key might be different for different apps.
     These axis have parameters that have been stashed in the axisMap
     PARAMETERS:
     curve -  the curve object
     curveIndex : Number - the integer index of this curve
     axisMap: object - a map of axis params ....
     required curve params for generating an axisMap are:
     label : String - that is the label of an axis
     axisKey : String - the axisMap key for this curve, i.e. the curves variable and statistic concatenated together.
     optional params in an axisMap:
     annotation : String - gets placed on the graph at the top left. e.g. "mean" for a time series.
     dataSeries : array - the actual flot dataSeries array for this curve.  like [[x,y],[x,y], .... [x,y]]
     */
    const label = curve['label'];
    const axisKey = curve['axisKey'];
    const annotation = curve['annotation'];
    const color = curve['color'];
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const xmin = curve['xmin'];
    const xmax = curve['xmax'];
    const pointSymbol = getPointSymbol(curveIndex);
    if (axisKey in axisMap) {
        axisMap[axisKey].axisLabel = axisKey;
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
        axisMap[axisKey].xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        axisMap[axisKey].xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    } else {
        axisMap[axisKey] = {
            index: curveIndex + 1,
            label: label,
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            // axisLabel: axisKey + " - " + label
            axisLabel: axisKey
        };
    }
    const curveOptions = {
        yaxis: 1,   // for profiles there is only one xaxis and one yaxis
        label: label,
        curveId: label,
        annotation: annotation,
        color: color,
        data: dataSeries,
        points: {
            symbol: pointSymbol,
            fillColor: color,
            show: true,
            errorbars: "x",
            xerr: {
                show: true,
                asymmetric: false,
                upperCap: "squareCap",
                lowerCap: "squareCap",
                color: color,
                radius: 5
            }
        },

        lines: {
            show: true,
            fill: false
        }
    };
    return curveOptions;
};

// provides curve options for all plot types with an independent x axis and a dependent y axis
const generateBarChartCurveOptions = function (curve, curveIndex, axisMap, dataSeries) {
    /*
     some curves will share an axis based on the axis map key.
     for example all the curves that have the same variable and statistic might share an axis.
     The axis key might be different for different apps.
     These axis have parameters that have been stashed in the axisMap
     PARAMETERS:
     curve -  the curve object
     curveIndex : Number - the integer index of this curve
     axisMap: object - a map of axis params ....
     required curve params for generating an axisMap are:
     label : String - that is the label of an axis
     ymin : Number - the minimum value of the curves y axis that corresponds to this axisKey (in other words for this curve)
     ymax : the maximum value of the curves y axis that corresponds to this axisKey (in other words for this curve)
     axisKey : String - the axisMap key for this curve, i.e. the curves variable and statistic concatenated together.
     optional params in an axisMap:
     annotation : String - gets placed on the graph at the top left. e.g. "mean" for a time series.

     dataSeries : array - the actual flot dataSeries array for this curve.  like [[x,y],[x,y], .... [x,y]]
     */
    const label = curve['label'];
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const xmin = curve['xmin'];
    const xmax = curve['xmax'];
    const axisKey = curve['axisKey'];
    const annotation = curve['annotation'];
    if (axisKey in axisMap) {
        axisMap[axisKey].axisLabel = axisKey;
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
        axisMap[axisKey].xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        axisMap[axisKey].xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    } else {
        axisMap[axisKey] = {
            index: curveIndex + 1,
            label: label,
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            axisLabel: axisKey
        };
    }
    const curveOptions = {
        yaxis: axisMap[axisKey].index,
        label: label,
        curveId: label,
        annotation: annotation,
        color: curve['color'],
        data: dataSeries,
        points: {show: false,},
        lines: {show: false, fill: false},
        bars: {show: true}
    };

    return curveOptions;
};

const generateMapCurveOptions = function (curve, curveIndex, dataSeries, sitePlot) {
    /*
     PARAMETERS:
     curve -  the curve object
     curveIndex : Number - the integer index of this curve
     dataSeries : array - the actual flot dataSeries array for this curve.  like [[x,y],[x,y], .... [x,y]]
     */
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
    generateBarChartCurveOptions:generateBarChartCurveOptions,
    generateMapCurveOptions: generateMapCurveOptions

}