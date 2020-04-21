/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

// get the document id for the control button element that corresponds to the param name
const getControlButtonIdForParamName = function (paramName) {
    // scatter axis don't really exist in matsCollections.CurveParams but they are elements
    const pname = paramName.replace(/^.axis-/, '');
    const param = matsCollections.CurveParams.findOne({name: pname});
    if (param !== undefined) {
        const id = "controlButton-" + param.name;
        return id;
    }
};

// get the control Button Element that corresponds to the param name
const getControlElementForParamName = function (paramName) {
    // scatter axis don't really exist in matsCollections.CurveParams but they are elements
    const pname = paramName.replace(/^.axis-/, '');
    return document.getElementById(getControlButtonIdForParamName(pname));
};

// get the document element that corresponds to the param name
const getValueElementForParamName = function (paramName) {
    // scatter axis don't really exist in matsCollections.CurveParams but they are elements
    const pname = paramName.replace(/^.axis-/, '');
    const val = getValueIdForParamName(pname);
    return document.getElementById(val);
};

// get the current selected value in the document element that corresponds to the param name
// Note that the value should be reflected in the adjoining control button value textContent.
const getValueForParamName = function (paramName) {
    try {
        const elem = getValueElementForParamName(paramName);
        return getValueElementForParamName(paramName).textContent.trim();
    } catch (error) {
        return undefined;
    }
};

// get the VALUE BOX id for the element that corresponds to the param name
const getValueIdForParamName = function (paramName) {
    // scatter axis don't really exist in matsCollections.CurveParams but they are elements
    const pname = paramName.replace(/^.axis-/, '');
    return "controlButton-" + pname + "-value";
};

// set the VALUE BOX text for the element that corresponds to the param name
const setValueTextForParamName = function (paramName, text) {
    try {
        var text = text;
        var param = matsCollections.CurveParams.findOne({name: paramName});
        if (param === undefined) {
            param = matsCollections.PlotParams.findOne({name: paramName});
        }
        if (param === undefined) {
            return;
        }
        if (text === undefined) {
            if (param.multiple) {
                // .... if multi selected  get the first .. last
                const selection = getInputElementForParamName(paramName).selectedOptions;
                if (selection.length == 0) {
                    text = "";
                } else if (selection.length == 1) {
                    text = selection[0].textContent;
                } else {
                    text = selection[0].textContent + " .. " + selection[selection.length - 1].textContent;
                }
            }
        }
        const elem = getValueElementForParamName(paramName);
        if (elem.textContent !== text) {
            elem.textContent = text;
        }
    } catch (error) {
        console.log("Error: could not find param: " + paramName);
    }
};

// get the document id for the element that corresponds to the param name
const getInputIdForParamName = function (paramName) {
    // scatter axis don't really exist in matsCollections.CurveParams but they are elements
    const pname = paramName.replace(/^.axis-/, '');
    var param = matsCollections.CurveParams.findOne({name: pname});
    if (param === undefined) {
        param = matsCollections.PlotParams.findOne({name: pname});
    }
    if (param === undefined) {
        param = matsCollections.Scatter2dParams.findOne({name: pname});
        if (param === undefined) {
            return undefined;
        }
    }
    if (param.type === matsTypes.InputTypes.dateRange) {
        return ("element-" + param.name).replace(/ /g, '-');
    } else {
        return (param.name + "-" + param.type).replace(/ /g, '-');
    }
};


// get the parameter for the element that corresponds to the param name
const getParameterForName = function (paramName) {
    // scatter axis don't really exist in matsCollections.CurveParams but they are elements
    const pname = paramName.replace(/^.axis-/, '');

    var param = matsCollections.CurveParams.findOne({name: pname});
    if (param === undefined) {
        param = matsCollections.PlotParams.findOne({name: pname});
    }
    if (param === undefined) {
        param = matsCollections.Scatter2dParams.findOne({name: pname});
        if (param === undefined) {
            return undefined;
        }
    }
    return (param);
};

// get the document element that corresponds to the param name
const getInputElementForParamName = function (paramName) {
    const name = paramName.replace(/^.axis-/, '');
    const id = getInputIdForParamName(name);
    if (id === undefined) {
        return undefined;
    }
    return document.getElementById(id);
};

// get a param disabledOptions list - if any.
const getDisabledOptionsForParamName = function (paramName) {
    const name = paramName.replace(/^.axis-/, '');
    const id = getInputIdForParamName(name);
    if (id === undefined) {
        return undefined;
    }
    const param = getParameterForName(name);
    if (!param) {
        return undefined;
    }
    return param.disabledOptions;
};

// set the input for the element that corresponds to the param name
// also sets a data-mats-currentValue attribute
const setInputForParamName = function (paramName, value) {
    const param = getParameterForName(paramName);
    const id = getInputIdForParamName(paramName);
    const idSelectorStr = "#" + id;
    const idSelector = $(idSelectorStr);

    // SHOULD DEAL WITH CHECKBOXES HERE
    if (param.type === matsTypes.InputTypes.radioGroup) {
        $("#" + id + "-" + value).prop("checked", true);
    } else {
        idSelector.val(value);
        setValueTextForParamName(paramName, value);
    }
};

const getElementValues = function () {
    const data = {
        curveParams: {},
        plotParams: {},
        scatterParams: {}
    };
    const axis = ['xaxis-', 'yaxis-'];
    var params = matsCollections.CurveParams.find({}).fetch();
    params.forEach(function (param) {
        var val = "";
        if (param.type === matsTypes.InputTypes.radioGroup) {
            var selector = "input:radio[name='" + param.name + "']:checked";
            val = $(selector).val()
        } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
            var selector = "input[name='" + param.name + "']:checked";
            val = $(selector).map(function (_, el) {
                return $(el).val();
            }).get();
        } else if (param.type === matsTypes.InputTypes.dateRange) {
            val = getValueForParamName(param.name);
        } else {
            var idSelect = '#' + getInputIdForParamName(param.name);
            val = $(idSelect).val();
        }
        data.curveParams[param.name] = val;
        if (matsPlotUtils.getPlotType() == matsTypes.PlotTypes.scatter2d) {
            for (var a = 0; a < axis.length; a++) {
                const axisStr = axis[a];
                const name = axisStr + param.name;
                var val = "";
                if (param.type === matsTypes.InputTypes.radioGroup) {
                    var selector = "input:radio[name='" + name + "']:checked";
                    val = $(selector).val()
                } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
                    var selector = "input[name='" + name + "']:checked";
                    val = $(selector).map(function (_, el) {
                        return $(el).val();
                    }).get();
                } else {
                    var idSelect = '#' + getInputIdForParamName(name);
                    val = $(idSelect).val();
                }
                data.curveParams[name] = val;
            }
        }
    });

    params = matsCollections.PlotParams.find({}).fetch();
    params.forEach(function (param) {
        var val = "";
        if (param.type === matsTypes.InputTypes.radioGroup) {
            var selector = "input:radio[name='" + param.name + "']:checked";
            val = $(selector).val()
        } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
            var selector = "input[name='" + param.name + "']:checked";
            val = $(selector).map(function (_, el) {
                return $(el).val();
            }).get();
        } else {
            var idSelect = '#' + getInputIdForParamName(param.name);
            val = $(idSelect).val();
        }
        data.plotParams[param.name] = val;
    });

    params = matsCollections.Scatter2dParams.find({}).fetch();
    params.forEach(function (param) {
        var val = "";
        if (param.type === matsTypes.InputTypes.radioGroup) {
            var selector = "input:radio[name='" + param.name + "']:checked";
            val = $(selector).val()
        } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
            var selector = "input[name='" + param.name + "']:checked";
            val = $(selector).map(function (_, el) {
                return $(el).val();
            }).get();
        } else {
            var idSelect = '#' + getInputIdForParamName(param.name);
            val = $(idSelect).val();
        }
        data.scatterParams[param.name] = val;
        if (matsPlotUtils.getPlotType() == matsTypes.PlotTypes.scatter2d) {
            for (var a = 0; a < axis.length; a++) {
                var axisStr = axis[a];
                var name = axisStr + param.name;
                var val = "";
                if (param.type === matsTypes.InputTypes.radioGroup) {
                    var selector = "input:radio[name='" + name + "']:checked";
                    val = $(selector).val()
                } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
                    var selector = "input[name='" + name + "']:checked";
                    val = $(selector).map(function (_, el) {
                        return $(el).val();
                    }).get();
                } else {
                    var idSelect = '#' + getInputIdForParamName(name);
                    val = $(idSelect).val();
                }
                data.scatterParams[name] = val;
            }
        }
    });
    return data;
};

const expandParams = function () {
    const params = matsCollections.CurveParams.find({}).fetch();
    params.forEach(function (param) {
        if (param.type !== matsTypes.InputTypes.selectMap) {
            const selector = "element" + "-" + param.name;
            const elem = document.getElementById(selector);
            if (elem) {
                elem.style.display = "block";
                const dataElem = document.getElementById(param.name + "-" + param.type);
                if (dataElem && dataElem.options && dataElem.selectedIndex >= 0) {
                    dataElem.options[dataElem.selectedIndex].scrollIntoView();
                }
            }
        }
    });
};

const collapseParams = function () {
    const params = matsCollections.CurveParams.find({}).fetch();
    params.forEach(function (param) {
        if (param.type !== matsTypes.InputTypes.selectMap) {
            const selector = "element" + "-" + param.name;
            if (document.getElementById(selector)) {
                document.getElementById(selector).style.display = "none";
            }
        }
    });
};

const collapseParam = function (paramName) {
    const param = matsCollections.CurveParams.findOne({name: paramName});
    if (param === undefined || param === null) {
        return;
    }
    if (param.type !== matsTypes.InputTypes.selectMap) {
        const selector = "element" + "-" + param.name;
        if (document.getElementById(selector)) {
            document.getElementById(selector).style.display = "none";
        }
    }
};

const typeSort = function (arr) {
    if (arr === undefined) {
        return undefined;
    }
    return arr.sort(function (a, b) {
        if (isNaN(Number(a) && isNaN(Number(b)))) { // string compare
            const A = a.toLowerCase();
            const B = b.toLowerCase();
            if (A < B) {
                return -1;
            } else if (A > B) {
                return 1;
            } else {
                return 0;
            }
        } else if (isNaN(Number(a) || isNaN(Number(b)))) {   // number always precedes
            if (isNaN(Number(a))) {
                return 1;
            } else {
                return -1
            }
        } else {
            return a - b;  // numerical compare
        }
    });
};

const setDefaultForParamName = function (param) {
    const paramName = param.name;
    const type = param.type;
    const defaultValue = param.default;
    if (paramName == 'label') {
        setInputForParamName(paramName, Session.get('NextCurveLabel'));
    } else {
        if (defaultValue != "undefined") {
            if (type === matsTypes.InputTypes.select && (defaultValue === -1 || defaultValue === undefined || defaultValue === matsTypes.InputTypes.unused)) {
                setInputForParamName(paramName, matsTypes.InputTypes.unused);
            } else {
                setInputForParamName(paramName, defaultValue);
            }
            // need to trigger a change so that hideOtherFor and disableOtherFor work properly
            if (param.hideOtherFor !== undefined || param.disableOtherFor !== undefined) {
                const elem = getInputElementForParamName(paramName);
                if (elem && elem.style && elem.style.display === "block") {
                    $(elem).trigger('change');
                }
            }
        }
    }
};

const getDefaultDateRange = function(name) {
    var dateParam = matsCollections.CurveParams.findOne({name: name});
    if (dateParam === undefined) {
        dateParam = matsCollections.PlotParams.findOne({name: name});
    }
    const startInit = dateParam.startDate;
    const stopInit = dateParam.stopDate;
    const dstr = dateParam.default;
    return {startDate:startInit,stopDate:stopInit,dstr:dstr};
};

const getMinMaxDates = function(minDate, maxDate) {
    var minMoment = moment.utc(minDate,"MM/DD/YYYY HH:mm");
    var maxMoment = moment.utc(maxDate, "MM/DD/YYYY HH:mm");
    // There's a bug in daterangepicker that causes odd behavior if the startDsr includes 00 UTC,
    // so subtract 30 minutes from the minDate and add 30 minutes to the maxDate to prevent
    // that circumstance from occurring.
    if (maxMoment.diff(minMoment, 'days') > 30) {
        maxDate = moment.utc(maxMoment).add(30, 'minutes');
        minDate = moment.utc(maxMoment).subtract(30, 'days').subtract(30, 'minutes');
    } else {
        maxDate = moment.utc(maxMoment).add(30, 'minutes');
        minDate = moment.utc(minMoment).subtract(30, 'minutes');
    }
    return {minDate:minDate, maxDate:maxDate};
};

const setAllParamsToDefault = function () {
    // default the superiors and refresh them so that they cause the dependent options to refresh
    var params = matsCollections.CurveParams.find({}).fetch();

    const superiors = matsCollections.CurveParams.find({"dependentNames": {"$exists": true}}).fetch();
    superiors.forEach(function (param) {
        setDefaultForParamName(param);
        // actually call the refresh directly - don't use an event, because we want this all to be synchronous
        matsSelectUtils.refresh(null, param.name);
        // remove from params list - actually rewrite params list NOT with this param
        params = params.filter(function (obj) {
            return obj.name !== param.name;
        });
    });
    // refresh all the dependents to their default values
    const dependents = matsCollections.CurveParams.find({"superiorNames": {"$exists": true}}).fetch();
    dependents.forEach(function (param) {
        setDefaultForParamName(param);
        if (param.type === matsTypes.InputTypes.dateRange) {
            const dstr = getDefaultDateRange(param.name).dstr;
            setValueTextForParamName(param.name, dstr);
        } else {
            matsSelectUtils.refresh(null, param.name);
            // remove from params list - actually rewrite params list NOT with this param
            params = params.filter(function (obj) {
                return obj.name !== param.name;
            });
        }
    });
    // reset everything else
    params.forEach(function (param) {
        if (param.type === matsTypes.InputTypes.dateRange) {
            const dstr = getDefaultDateRange(param.name).dstr;
            setValueTextForParamName(param.name, dstr);
        } else if (param.type === matsTypes.InputTypes.selectMap) {
            const targetId = param.name + '-' + param.type;
            const targetElem = document.getElementById(targetId);
            const resetMapEvent = new CustomEvent("reset", {
                detail: {
                    refElement: null
                }
            });
            targetElem.dispatchEvent(resetMapEvent);
        } else {
            setDefaultForParamName(param);
        }
    });
    matsCollections.PlotParams.find({}).fetch().forEach(function (param) {
        if (param.type === matsTypes.InputTypes.dateRange) {
            const dstr = getDefaultDateRange(param.name).dstr;
            setValueTextForParamName(param.name, dstr);
        } else {
            setDefaultForParamName(param);
        }
    });

};
// is the input element displaying? used by curve_param_item_group
const isInputElementVisible = function (paramName) {
    const name = paramName.replace(/^.axis-/, ''); // need to acount for scatter plots params
    const inputElement = getInputElementForParamName(name);
    return $(inputElement).is(':visible');
};

// is the input element displaying? used by curve_param_item_group
const isParamVisible = function (paramName) {
    const name = paramName.replace(/^.axis-/, ''); // need to acount for scatter plots params
    const paramRef = "#" + name + "-item";
    return $(paramRef).is(':visible');
};

// is the input element displaying? used by curve_param_item_group
const isControlButtonVisible = function (paramName) {
    const name = paramName.replace(/^.axis-/, ''); // need to acount for scatter plots params
    const paramRef = "#controlButton-" + name;
    return $(paramRef).is(':visible');
};

const setInputValueForParamAndTriggerChange = function (paramName, value) {
    const elem = getInputElementForParamName(paramName);
    elem.value = value;
    setValueTextForParamName(paramName, elem.value);
    $(elem).trigger('change');
};

const getOptionsMapForParam = function (paramName) {
    const param = matsCollections.CurveParams.findOne({name: paramName});
    return param.optionsMap;
};

const getOptionsForParam = function (paramName) {
    const param = matsCollections.CurveParams.findOne({name: paramName});
    return param.options;
};

const getAppName = function () {
    const app = matsCollections.appName.findOne({}).app;
    return app;
};

const getCurveItemValueForParamName = function (curveNumber, paramName) {
    //MODEL-curve-0-Item
//    const id = paramName.toString().toUpperCase() + "-curve-" + curveNumber + "-Item"; // the id of the text span for a curveItem
//    return text = ‌‌document.getElementById(id).innerText;
    // const elem = $("#" + id);
    // var text = undefined;
    // if (elem) {
    //     text = elem.text();
    // }
};
const visibilityControllerForParam = function (paramName) {
    /*
    Need to iterate all the params looking for one that has this paramName as a key in its
    hideOtherFor map.
    If it exists, that param is returned. Otherwise return undefined.
     */
    var params = matsCollections.CurveParams.find({}).fetch();
    var found = undefined;
    params.some(function (param) {
        if (param.hideOtherFor) {
            const pKeys = Object.keys(param.hideOtherFor);
            if (pKeys.indexOf(paramName) !== -1) {
                found = param;
                return;
            }
        }
    });
    return found;
};

export default matsParamUtils = {
    getDisabledOptionsForParamName: getDisabledOptionsForParamName,
    getControlButtonIdForParamName: getControlButtonIdForParamName,
    getControlElementForParamName: getControlElementForParamName,
    getValueElementForParamName: getValueElementForParamName,
    getValueForParamName: getValueForParamName,
    setValueTextForParamName: setValueTextForParamName,
    getValueIdForParamName: getValueIdForParamName,
    getInputIdForParamName: getInputIdForParamName,
    getInputElementForParamName: getInputElementForParamName,
    getElementValues: getElementValues,
    setInputForParamName: setInputForParamName,
    expandParams: expandParams,
    collapseParams: collapseParams,
    collapseParam: collapseParam,
    getParameterForName: getParameterForName,
    setDefaultForParamName: setDefaultForParamName,
    setAllParamsToDefault: setAllParamsToDefault,
    typeSort: typeSort,
    isInputElementVisible: isInputElementVisible,
    isParamVisible: isParamVisible,
    isControlButtonVisible: isControlButtonVisible,
    setInputValueForParamAndTriggerChange: setInputValueForParamAndTriggerChange,
    getOptionsForParam: getOptionsForParam,
    getOptionsMapForParam: getOptionsMapForParam,
    getCurveItemValueForParamName: getCurveItemValueForParamName,
    visibilityControllerForParam: visibilityControllerForParam,
    getAppName: getAppName,
    getDefaultDateRange:getDefaultDateRange,
    getMinMaxDates:getMinMaxDates
};