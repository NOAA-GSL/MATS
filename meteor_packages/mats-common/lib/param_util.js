import { matsTypes } from 'meteor/randyp:mats-common';
 import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import {matsPlotUtils } from 'meteor/randyp:mats-common';

// get the document id for the control button element that corresponds to the param name
var getControlButtonIdForParamName = function(paramName) {
    var param = matsCollections.CurveParams.findOne({name: paramName});
    if (param !== undefined) {
        var id = "controlButton-" + param.name;
        return id;
    }
};

// get the control Button Element fthat corresponds to the param name
var getControlElementForParamName = function(paramName) {
    return document.getElementById(getControlButtonIdForParamName(paramName));
};

// get the document element that corresponds to the param name
var getValueElementForParamName = function(paramName) {
    return document.getElementById(getValueIdForParamName(paramName));
};

// get the current selected value in the document element that corresponds to the param name
// Note that the value should be reflected in the adjoining control button value textContent.
var getValueForParamName = function(paramName){
    try {
        return getValueElementForParamName(paramName).textContent;
    } catch (error) {
        return "";
    }
};


// get the VALUE BOX id for the element that corresponds to the param name
var getValueIdForParamName = function(paramName) {
    return "controlButton-" + paramName + "-value";
};

// set the VALUE BOX text for the element that corresponds to the param name

var setValueTextForParamName = function(paramName, text, callback) {
    try {
        var text = text;
        var value = text;
        var param = matsCollections.CurveParams.findOne({name: paramName});
        if (param === undefined) {
            param = matsCollections.PlotParams.findOne({name: paramName});
        }
        if (param === undefined) {
            return;
        }
        if (param.multiple) {
            // .... if multi selected  get the first .. last
            var selection = getInputElementForParamName(paramName).selectedOptions;
            if (selection.length == 0) {
                text = "";
            } else if (selection.length == 1) {
                text = selection[0].textContent;
            } else {
                text = selection[0].textContent + " .. " + selection[selection.length - 1].textContent;
            }
            value = [];
            for(var i = 0; i < selection.length; i++) {
                value.push(selection[i].textContent);
            }
        }
        getValueElementForParamName(paramName).textContent = text;
        var elem = document.getElementById(matsTypes.InputTypes.controlButton + "-" + paramName + '-value');
        elem.setAttribute("data-mats-currentValue", value);
    } catch(error){
        console.log ("Error: could not find param: " + paramName);
    }
};

// get the document id for the element that corresponds to the param name
var getInputIdForParamName = function(paramName) {
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

// get the document element that corresponds to the param name
var getInputElementForParamName = function(paramName) {
    var id = getInputIdForParamName(paramName);
    if (id === undefined) {
        return undefined;
    }
    return document.getElementById(id);
};

// set the input for the element that corresponds to the param name
// also sets a data-mats-currentValue attribute
var setInputForParamName = function(paramName,value) {
    var id = getInputIdForParamName(paramName);

    var idSelectorStr = "#" + id;
    var idSelector = $(idSelectorStr);
    idSelector.val(value);
    idSelector.attr("data-mats-currentValue", value);
    idSelector.trigger("change");
};

var getElementDataForParamName = function(paramName) {
    var elem = document.getElementById(matsTypes.InputTypes.controlButton + "-" + paramName + '-value');
    return elem.getAttribute("data-mats-currentValue");
};

var getElementValues = function() {
    var data = {
        curveParams:{},
        plotParams:{},
        scatterParams:{}
    };
    var axis = ['xaxis-', 'yaxis-'];
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
        } else {
            var idSelect = '#' + getInputIdForParamName(param.name);
            val = $(idSelect).val();
        }
        data.curveParams[param.name] = val;
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

export default matsParamUtils = {
    getControlButtonIdForParamName:getControlButtonIdForParamName,
    getControlElementForParamName:getControlElementForParamName,
    getValueElementForParamName:getValueElementForParamName,
    getValueForParamName:getValueForParamName,
    setValueTextForParamName:setValueTextForParamName,
    getInputIdForParamName:getInputIdForParamName,
    getInputElementForParamName:getInputElementForParamName,
    getElementDataForParamName:getElementDataForParamName,
    getElementValues:getElementValues,
    setInputForParamName:setInputForParamName
};