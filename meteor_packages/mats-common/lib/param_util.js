import { matsTypes } from 'meteor/randyp:mats-common';
 import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import {matsPlotUtils } from 'meteor/randyp:mats-common';

// get the document id for the control button element that corresponds to the param name
const getControlButtonIdForParamName = function(paramName) {
    const param = matsCollections.CurveParams.findOne({name: paramName});
    if (param !== undefined) {
        const id = "controlButton-" + param.name;
        return id;
    }
};

// get the control Button Element fthat corresponds to the param name
const getControlElementForParamName = function(paramName) {
    return document.getElementById(getControlButtonIdForParamName(paramName));
};

// get the document element that corresponds to the param name
const getValueElementForParamName = function(paramName) {
    return document.getElementById(getValueIdForParamName(paramName));
};

// get the current selected value in the document element that corresponds to the param name
// Note that the value should be reflected in the adjoining control button value textContent.
const getValueForParamName = function(paramName){
    try {
        return getValueElementForParamName(paramName).textContent.trim();
    } catch (error) {
        return undefined;
    }
};


// get the VALUE BOX id for the element that corresponds to the param name
const getValueIdForParamName = function(paramName) {
    return "controlButton-" + paramName + "-value";
};

// set the VALUE BOX text for the element that corresponds to the param name
const setValueTextForParamName = function(paramName, text) {
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
    } catch(error){
        console.log ("Error: could not find param: " + paramName);
    }
};

// get the document id for the element that corresponds to the param name
const getInputIdForParamName = function(paramName) {
    var param = matsCollections.CurveParams.findOne({name: paramName});
    if (param === undefined) {
        param = matsCollections.PlotParams.findOne({name: paramName});
    }
    if (param === undefined) {
        param = matsCollections.Scatter2dParams.findOne({name: paramName});
        if (param === undefined) {
            return undefined;
        }
    }
    return (param.name + "-" + param.type).replace(/ /g,'-');
};


// get the parameter for the element that corresponds to the param name
const getParameterForName = function(paramName) {
    var param = matsCollections.CurveParams.findOne({name: paramName});
    if (param === undefined) {
        param = matsCollections.PlotParams.findOne({name: paramName});
    }
    if (param === undefined) {
        param = matsCollections.Scatter2dParams.findOne({name: paramName});
        if (param === undefined) {
            return undefined;
        }
    }
    return (param);
};

// get the document element that corresponds to the param name
const getInputElementForParamName = function(paramName) {
    const id = getInputIdForParamName(paramName);
    if (id === undefined) {
        return undefined;
    }
    return document.getElementById(id);
};

// set the input for the element that corresponds to the param name
// also sets a data-mats-currentValue attribute
const setInputForParamName = function(paramName,value) {
    const id = getInputIdForParamName(paramName);
    const idSelectorStr = "#" + id;
    const idSelector = $(idSelectorStr);
    idSelector.val(value);
    setValueTextForParamName(paramName,value);
};

const getElementValues = function() {
    const data = {
        curveParams:{},
        plotParams:{},
        scatterParams:{}
    };
    const axis = ['xaxis-', 'yaxis-'];
    var params = matsCollections.CurveParams.find({}).fetch();
    params.forEach(function(param){
        var val = "";
        if (param.type === matsTypes.InputTypes.radioGroup) {
            var selector = "input:radio[name='" + param.name + "']:checked";
            val =$(selector).val()
        } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
            var selector = "input[name='" + param.name + "']:checked";
            val =$(selector).map(function(_, el) {
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
            for (var a = 0; a < axis.length; a++ ) {
                const axisStr = axis[a];
                const name = axisStr + param.name;
                var val = "";
                if (param.type === matsTypes.InputTypes.radioGroup) {
                    var selector = "input:radio[name='" + name + "']:checked";
                    val =$(selector).val()
                } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
                    var selector = "input[name='" + name + "']:checked";
                    val =$(selector).map(function(_, el) {
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
    params.forEach(function(param){
        var val = "";
        if (param.type === matsTypes.InputTypes.radioGroup) {
            var selector = "input:radio[name='" + param.name + "']:checked";
            val =$(selector).val()
        } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
            var selector = "input[name='" + param.name + "']:checked";
            val =$(selector).map(function(_, el) {
                return $(el).val();
            }).get();
        } else {
            var idSelect = '#' + getInputIdForParamName(param.name);
            val = $(idSelect).val();
        }
        data.plotParams[param.name] = val;
    });

    params = matsCollections.Scatter2dParams.find({}).fetch();
    params.forEach(function(param){
        var val = "";
        if (param.type === matsTypes.InputTypes.radioGroup) {
            var selector = "input:radio[name='" + param.name + "']:checked";
            val =$(selector).val()
        } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
            var selector = "input[name='" + param.name + "']:checked";
            val =$(selector).map(function(_, el) {
                return $(el).val();
            }).get();
        } else {
            var idSelect = '#' + getInputIdForParamName(param.name);
            val = $(idSelect).val();
        }
        data.scatterParams[param.name] = val;
        if (matsPlotUtils.getPlotType() == matsTypes.PlotTypes.scatter2d) {
            for (var a = 0; a < axis.length; a++ ) {
                var axisStr = axis[a];
                var name = axisStr + param.name;
                var val = "";
                if (param.type === matsTypes.InputTypes.radioGroup) {
                    var selector = "input:radio[name='" + name + "']:checked";
                    val =$(selector).val()
                } else if (param.type === matsTypes.InputTypes.checkBoxGroup) {
                    var selector = "input[name='" + name + "']:checked";
                    val =$(selector).map(function(_, el) {
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


const expandParams = function() {
    const params = matsCollections.CurveParams.find({}).fetch();
    params.forEach(function(param) {
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

const collapseParams = function() {
    const params = matsCollections.CurveParams.find({}).fetch();
    params.forEach(function(param) {
        if (param.type !== matsTypes.InputTypes.selectMap) {
            const selector = "element" + "-" + param.name;
            if (document.getElementById(selector)) {
                document.getElementById(selector).style.display = "none";
            }
        }
    });
};

const collapseParam = function(paramName) {
    const param = matsCollections.CurveParams.findOne({name:paramName});
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
    return arr.sort(function(a,b) {
        if (isNaN(Number(a) && isNaN(Number(b)))) { // string compare
            const A = a.toLowerCase();
            const B = b.toLowerCase();
            if (A < B){
                return -1;
            }else if (A > B){
                return  1;
            }else{
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
            }
            else {
                setInputForParamName(paramName, defaultValue);
            }
        }
    }
};

const setAllParamsToDefault = function() {
    // default the superiors and refresh them so that they cause the dependent options to refresh
    var params = matsCollections.CurveParams.find({}).fetch();

    const superiors = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : true }}).fetch();
    superiors.forEach(function(param) {
        setDefaultForParamName(param);
        // actually call the refresh directly - don't use an event, because we want this all to be synchronous
        matsSelectUtils.refresh(null,param.name);
        // remove from params list - actually rewrite params list NOT with this param
        params = params.filter(function( obj ) {
            return obj.name !== param.name;
        });
    });
    // refresh all the non superiors to their default values
    const nonDependents = matsCollections.CurveParams.find({"superiorNames" : { "$exists" : true }}).fetch();
    nonDependents.forEach(function(param) {
        setDefaultForParamName(param);
        matsSelectUtils.refresh(null,param.name);
        // remove from params list - actually rewrite params list NOT with this param
        params = params.filter(function( obj ) {
            return obj.name !== param.name;
        });
    });
    // reset everything else
    params.forEach(function(param) {
        setDefaultForParamName(param);
    });
};

export default matsParamUtils = {
    getControlButtonIdForParamName:getControlButtonIdForParamName,
    getControlElementForParamName:getControlElementForParamName,
    getValueElementForParamName:getValueElementForParamName,
    getValueForParamName:getValueForParamName,
    setValueTextForParamName:setValueTextForParamName,
    getValueIdForParamName:getValueIdForParamName,
    getInputIdForParamName:getInputIdForParamName,
    getInputElementForParamName:getInputElementForParamName,
    getElementValues:getElementValues,
    setInputForParamName:setInputForParamName,
    expandParams:expandParams,
    collapseParams:collapseParams,
    collapseParam:collapseParam,
    getParameterForName:getParameterForName,
    setDefaultForParamName:setDefaultForParamName,
    setAllParamsToDefault:setAllParamsToDefault,
    typeSort:typeSort};