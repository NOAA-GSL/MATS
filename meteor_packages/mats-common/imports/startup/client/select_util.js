/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections, matsMethods, matsParamUtils, matsPlotUtils, matsTypes} from 'meteor/randyp:mats-common';

// method to refresh the peers of the current selector
const refreshPeer = function (event, param) {
    try {
        const peerName = param.peerName;
        if (peerName !== undefined) {
            // refresh the peer
            const targetParam = matsParamUtils.getParameterForName(peerName);
            const targetId = targetParam.name + '-' + targetParam.type;
            const targetElem = document.getElementById(targetId);
            const refreshMapEvent = new CustomEvent("refresh", {
                detail: {
                    refElement: null
                }
            });
            targetElem.dispatchEvent(refreshMapEvent);
        }
        refreshDependents(event, param);
    } catch (e) {
        e.message = "INFO: Error in select.js refreshPeer: " + e.message;
        setInfo(e.message);
    }
};

// method to refresh the dependents of the current selector
const refreshDependents = function (event, param) {
    try {
        const dependentNames = param.dependentNames;
        if (dependentNames && Object.prototype.toString.call(dependentNames) === '[object Array]' && dependentNames.length > 0) {
            // refresh the dependents
            var selectAllbool = false;
            for (var i = 0; i < dependentNames.length; i++) {
                const name = dependentNames[i];
                const targetParam = matsParamUtils.getParameterForName(name);
                var targetId;
                if (targetParam.type === matsTypes.InputTypes.dateRange) {
                    targetId = "element-" + targetParam.name;
                } else {
                    targetId = targetParam.name + '-' + targetParam.type;
                }
                const targetElem = document.getElementById(targetId);

                if (document.getElementById('selectAll')) {
                    selectAllbool = document.getElementById('selectAll').checked;
                }
                try {
                    targetElem.dispatchEvent(new CustomEvent("refresh"))
                } catch (re) {
                    re.message = "INFO: refreshDependents of: " + param.name + " dependent: " + targetParam.name + " - error: " + re.message;
                    setInfo(re.message);
                }
                const elements = targetElem.options;
                const select = true;
                if (targetElem.multiple && elements !== undefined && elements.length > 0) {
                    if (selectAllbool) {
                        for (var i1 = 0; i1 < elements.length; i1++) {
                            elements[i1].selected = select;
                        }
                        matsParamUtils.setValueTextForParamName(name, "");
                    } else {
                        const previously_selected = Session.get('selected');
                        for (var i2 = 0; i2 < elements.length; i2++) {
                            if (_.indexOf(previously_selected, elements[i2].text) != -1) {
                                elements[i2].selected = select;
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        e.message = "INFO: Error in select.js refreshDependents: " + e.message;
        setInfo(e.message);
    }
};

// check for enable controlled - This select might have control of another selector
const checkDisableOther = function (param, firstRender) {
    try {
        if (param.disableOtherFor !== undefined) {
            // this param controls the enable/disable properties of at least one other param.
            // Use the options to enable disable that param.
            const controlledSelectors = Object.keys(param.disableOtherFor);
            for (var i = 0; i < controlledSelectors.length; i++) {
                const elem = matsParamUtils.getInputElementForParamName(param.name);
                if (!elem) {
                    return;
                }
                const selectedOptions = elem.selectedOptions;
                const selectedText = selectedOptions && selectedOptions.length > 0 ? selectedOptions[0].text : "";
                if ((firstRender == true && param.default == param.hideOtherFor[controlledSelectors[i]]) ||
                    (param.disableOtherFor[controlledSelectors[i]] === matsTypes.InputTypes.unused && selectedText === "") ||
                    $.inArray(selectedText, param.disableOtherFor[controlledSelectors[i]]) !== -1) {
                    matsParamUtils.getInputElementForParamName(controlledSelectors[i]).disabled = true;
                } else {
                    matsParamUtils.getInputElementForParamName(controlledSelectors[i]).disabled = false;
                }
            }
        }
    } catch (e) {
        e.message = "INFO: Error in select.js checkDisableOther: " + e.message;
        setInfo(e.message);
    }
};

// check for hide controlled - This select might have control of another selector's visibility
const checkHideOther = function (param, firstRender) {
    try {
        if (param.hideOtherFor !== undefined) {
            // this param controls the visibility of at least one other param.
            const controlledSelectors = Object.keys(param.hideOtherFor);
            for (var i = 0; i < controlledSelectors.length; i++) {
                const elem = matsParamUtils.getInputElementForParamName(param.name);
                if (!elem) {
                    return;
                }
                const selectedOptions = elem.selectedOptions;
                const selectedText = selectedOptions && selectedOptions.length > 0 ? selectedOptions[0].text : "";

                var otherInputElement = matsParamUtils.getInputElementForParamName(controlledSelectors[i]);

                var selectorControlElem;
                if ((firstRender == true && param.default == param.hideOtherFor[controlledSelectors[i]]) ||
                    (param.hideOtherFor[controlledSelectors[i]] === matsTypes.InputTypes.unused && selectedText === "") ||
                    $.inArray(selectedText, param.hideOtherFor[controlledSelectors[i]]) !== -1) {
                    selectorControlElem = document.getElementById(controlledSelectors[i] + '-item');
                    if (selectorControlElem && selectorControlElem.style) {
                        selectorControlElem.style.display = "none";
                        selectorControlElem.purposelyHidden = true;
                    }
                } else {
                    selectorControlElem = document.getElementById(controlledSelectors[i] + '-item');
                    if (selectorControlElem && selectorControlElem.style) {
                        selectorControlElem.style.display = "block";
                        selectorControlElem.purposelyHidden = false;
                    }
                    otherInputElement && otherInputElement.options && otherInputElement.selectedIndex >= 0 &&
                    otherInputElement.options[otherInputElement.selectedIndex].scrollIntoView();
                }
            }
            checkDisableOther(param, firstRender);
        }
    } catch (e) {
        e.message = "INFO: Error in select.js checkHideOther: " + e.message;
        setInfo(e.message);
    }
};

// refresh the selector in question to the appropriate options indicated by the values of any superior selectors
const refresh = function (event, paramName) {
    if (paramName.search('axis') === 1) {
        // this is a "brother" (hidden) scatterplot param. There is no need to refresh it or add event listeners etc.
        return;
    }
    const param = matsParamUtils.getParameterForName(paramName);
    const elem = matsParamUtils.getInputElementForParamName(paramName);

    /*
    OptionsGroups are a mechanism for displaying the select options in groups.
    A disabled option is used for the group header. Disabled options simply show up
    in the selector list in bold font and act as group titles. They are disabled so that
    they cannot be clicked. DisabledOptions are the headers that the options are to be grouped under.
    disabledOptions are optional so if there are disabledOptions they are the keys in the optionsGroups
    and they are the sort order of those keys.
    */
    const disabledOptions = matsParamUtils.getDisabledOptionsForParamName(paramName);
    const optionsGroups = param.optionsGroups;
    const optionsMap = param.optionsMap;

    const superiorNames = param.superiorNames;
    const superiorDimensionality = superiorNames !== undefined && superiorNames !== null && superiorNames.length > 0 && Array.isArray(superiorNames[0]) ? superiorNames.length : 1;
    var superiors = [];
    // get a list of the current superior selected values - in order of superiority i.e. [databaseValue,dataSourceValue]
    var sNames;
    if (superiorNames !== undefined) {
        if (superiorDimensionality === 1) {
            sNames = superiorNames;
        } else {
            sNames = superiorNames[0];
        }
        for (var sn = 0; sn < sNames.length; sn++) {
            var superiorElement = matsParamUtils.getInputElementForParamName(sNames[sn]);
            var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex] === undefined ? matsParamUtils.getParameterForName(sNames[sn]).default : superiorElement.options[superiorElement.selectedIndex].text;
            superiors[0] = superiors[0] === undefined ? [] : superiors[0];
            superiors[0].push({element: superiorElement, value: selectedSuperiorValue});
        }
        for (var sNameIndex = 1; sNameIndex < superiorDimensionality; sNameIndex++) {
            sNames = superiorNames[sNameIndex];
            for (var sn = 0; sn < sNames.length; sn++) {
                var superiorElement = matsParamUtils.getInputElementForParamName(sNames[sn]);
                var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex] === undefined ? matsParamUtils.getParameterForName(sNames[sn]).default : superiorElement.options[superiorElement.selectedIndex].text;
                superiors[sNameIndex] = superiors[sNameIndex] === undefined ? [] : superiors[sNameIndex];
                superiors[sNameIndex].push({element: superiorElement, value: selectedSuperiorValue});
            }
        }
    }
    /*
    So what are superiors now.....
    superiors = [[{element:anElement,value:aValue},{element:anElement,value:aValue}...]]
    or they might be [[{element:anElement,value:aValue},{element:anElement,value:aValue}...],[{element:anElement,value:aValue},{element:anElement,value:aValue}...],...]


     Axis-brothers:
     Axis-brothers are for scatter plots. They are a second hidden set of parameters that apply to a different axis.
     Because there may be axis "brothers" This refresh must go and
     see if there are any brother elements that are essentially hidden copies
     of this one, and also refresh their options lists

     Superior Heirarchy:
     There can be a heirarchy of superiors and dependents. The superiorNames are a list of paramNames. The most superior has the 0th index and
     the least superior has the highest index.
     The Refresh uses the superiors to get the appropriate options for a given options map.
     The way it works is that superiors are always refreshed first. The superior heirarchy selections are then used by a
     dependent to retrieve its appropriate optionsMap from the superiorOptionsMap.
     superiorsOptionsMap = {
        mostSuperiorValue0: {  // optionsMap for the most superior first value
            nextSuperiorValue0: [value0,value1,value2,value3,...],
            nextSuperiorValue1: [value0,value1,value2,value3,...],
            nextSuperiorValue2: [value0,value1,value2,value3,...],
            ...
        },
        mostSuperiorValue1:{  // optionsMap for the most superior second value
            nextSuperiorValue0: [value0,value1,value2,value3,...],
            nextSuperiorValue1: [value0,value1,value2,value3,...],
            nextSuperiorValue2: [value0,value1,value2,value3,...],
            ...
        },
        ...,
        mostSuperiorValue2:{  // optionsMap for the most superior third value
            nextSuperiorValue0: [value0,value1,value2,value3,...],
            nextSuperiorValue1: [value0,value1,value2,value3,...],
            nextSuperiorValue2: [value0,value1,value2,value3,...],
            ...
        },
     }
     */

    // find all the elements that have ids like .... "x|y|z" + "axis-" + this.name
    const name = param.name;
    const elems = document.getElementsByClassName("data-input") === undefined ? [] : document.getElementsByClassName("data-input");
    Session.set('selected', $(elem).val());

    if (elem && elem.options) {
        if (elem.selectedIndex === undefined || elem.selectedIndex === -1) {
            if (param.default !== matsTypes.InputTypes.unused) {
                elem.selectedIndex = 0;
            }
        }
        const selectedText = elem.selectedIndex >= 0 ? elem.options[elem.selectedIndex].text : matsTypes.InputTypes.unused;
        var brothers = [];
        for (var i = 0; i < elems.length; i++) {
            if (elems[i].id.indexOf(name) >= 0 && elems[i].id !== elem.id)
                brothers.push(elems[i]);
        }

        var myOptions = [];
        var selectedSuperiorValues = [];

        try {
            // index down through the options for the list of superiors
            // starting with the most superior down through the least superior
            // and get the options list for the first set of superiors.
            // These are the ancestral options.
            if (param.optionsMap) {
                var firstSuperiorOptions = optionsMap;
                var theseSuperiors = superiors === undefined || superiors.length === 0 ? [] : superiors[0];
                for (var theseSuperiorsIndex = 0; theseSuperiorsIndex < theseSuperiors.length; theseSuperiorsIndex++) {
                    var superior = theseSuperiors[theseSuperiorsIndex];
                    var selectedSuperiorValue = superior.value;
                    firstSuperiorOptions = firstSuperiorOptions[selectedSuperiorValue];
                }
                myOptions = Array.isArray(firstSuperiorOptions) ? firstSuperiorOptions : Object.keys(firstSuperiorOptions);
            } else {
                myOptions = param.options;
            }

            // need to get the ancestral truth options because we may need to intersect the options


            /* tricky little bit here:
            SuperiorDimensionality:
             It is possible to have two superior options maps.. i.e. datasource and truth.
             In that case the superiorNames won't look like ["something","somethingelse"],
             instead it will look like [["something","somethingelse"],["someotherthing","someotherthingelse"]]
             i.e. it will be a multidimensional array.

             If the controlButton for one of these multi-dimensional superior elements is hidden ....
             matsParamUtils.getControlElementForParamName(superior.element.name).offsetParent !== null
             it has been hidden because it has a visibility dependency on another param
             i.e. truth-data-source and truth-variable (for mean there would be no truth, but for bias
             there must always be truth...).
             In this case these are dependent upon statistic such that if the statistic is "mean" the truth-data-source and truth-variable
             are hidden. See the wfip2 main.js statistic param as an example....
             "disableOtherFor:{'truth-data-source':[statisticOptionsMap.mean][0]},"
             and
             "hideOtherFor:{'truth-data-source':[statisticOptionsMap.mean][0]},"
             are the fields that cause the truth-data-source to be hidden when statistic is set to "mean".
             In that condition (the controlButton is hidden) the superior should not be used as an intersection in the selected sites.
             matsParamUtils.getControlElementForParamName(superior.element.name).offsetParent will be null if the controlButton
             for this element (this superior) is hidden. That is the tricky part ... it will be null.

             Also the unused superior is tested against the superior according to the truth table...
             used && unused  -> use the used
             unused and used -> use the used
             used and used -> use the intersection
             unused and unused - set the options to []

             A select may have a list of disabledOptions. These are used as optionGroup markers.
             */

            // need to get the actual options here
            for (var sNameIndex = 1; sNameIndex < superiorDimensionality; sNameIndex++) {
                // index down through the options for the list of superiors
                // starting with the most superior down through the least superior
                // and get the options list for the first set of superiors.
                // These are the ancestral options.
                var nextSuperiorOptions = optionsMap;
                var theseSuperiors = superiors === undefined || superiors.length === 0 ? [] : superiors[sNameIndex];
                for (var theseSuperiorsIndex = 0; theseSuperiorsIndex < theseSuperiors.length; theseSuperiorsIndex++) {
                    var superior = theseSuperiors[theseSuperiorsIndex];
                    var selectedSuperiorValue = superior.value;
                    nextSuperiorOptions = nextSuperiorOptions[selectedSuperiorValue];
                }
                // since we now have multiple options we have to intersect them
                myOptions = _.intersection(myOptions, nextSuperiorOptions);
            }
            if (myOptions === []) {  // none used - set to []
                matsParamUtils.setValueTextForParamName(name, matsTypes.InputTypes.unused);
            }
        } catch (e) {
            e.message = "INFO: Error in select.js refresh: determining options from superiors: " + e.message;
            setInfo(e.message);
        }

        try {
            // reset the options of the select
            // if the options are null it might be that this is the initial setup.
            // so use the optionsmap and the default options for the map
            // it might also mean that there are no superiors for this param
            if (myOptions == null) {
                // get the default options
                if (optionsGroups) {
                    // optionGroups are an ordered map. It probably has options that are in the disabledOption list
                    // which are used as markers in the select options pulldown. This is typical for models
                    const optionsGroupsKeys = Object.keys(optionsGroups);
                    for (var k = 0; k < optionsGroupsKeys.length; k++) {
                        if (myOptions === null) {
                            myOptions = [];
                            myOptions.push(optionsGroupsKeys[k]);
                            myOptions = myOptions.concat(optionsGroups[optionsGroupsKeys[k]]); // the primary group does not get sorted
                        } else {
                            myOptions.push(optionsGroupsKeys[k]);
                            myOptions = myOptions.concat(optionsGroups[optionsGroupsKeys[k]].sort()); // non primary  groups get sorted
                        }
                    }
                } else {
                    myOptions = param.options;
                }
            }
            var optionsAsString = "";
            if (myOptions === undefined || myOptions == null) {
                return;
            }
            var firstGroup = true;
            for (var i = 0; i < myOptions.length; i++) {
                var dIndex = disabledOptions === undefined ? -1 : disabledOptions.indexOf(myOptions[i]);
                if (dIndex >= 0) {   // the option was found in the disabled options so it needs to be an optgroup label
                    // disabled option
                    if (firstGroup === true) {
                        // first in group
                        optionsAsString += "<optgroup label=" + myOptions[i] + ">";
                        firstGroup = false;
                    } else {
                        optionsAsString += "</optgroup>";
                        optionsAsString += "<optgroup label=" + myOptions[i] + ">";
                    }
                } else {
                    //regular option - the option was not found in the disabled options
                    optionsAsString += "<option value='" + myOptions[i] + "'>" + myOptions[i] + "</option>";
                }
            }
            if (disabledOptions !== undefined) {
                optionsAsString += "</optgroup>";
            }
            $('select[name="' + name + '"]').empty().append(optionsAsString);
            //reset the selected index if it had been set prior (the list may have changed so the index may have changed)
            var selectedOptionIndex;
            if (selectedText === 'initial') {
                selectedOptionIndex = myOptions.indexOf(param.default);
            } else if (name === 'plot-type') {
                // the met apps have a hidden plot-type selector that needs to match the current selected plot type
                selectedOptionIndex = myOptions.indexOf(matsPlotUtils.getPlotType());
            } else {
                selectedOptionIndex = myOptions.indexOf(selectedText);
            }
            var sviText = "";
            if (selectedOptionIndex === -1) {
                if (name === 'plot-type') {
                    setInfo(('INFO:  Plot type ' + matsPlotUtils.getPlotType() + ' is not available for this database/model combination.'));
                }
                if (elem.selectedIndex >= 0) {
                    for (var svi = 0; svi < selectedSuperiorValues.length; svi++) {
                        superior = superiors[svi];
                        if (matsParamUtils.getControlElementForParamName(superior.element.name).offsetParent !== null) {
                            if (svi > 0) {
                                sviText += " and ";
                            }
                            sviText += selectedSuperiorValues[svi]
                        }
                    }
                    setInfo("I changed your selected " + name + ": '" + selectedText + "' to '" + myOptions[0] + "' because '" + selectedText + "' is no longer an option for " + sviText);
                }
            }
            // if the selectedText existed in the new options list then the selectedOptionIndex won't be -1 and we have to choose the default option
            if (selectedOptionIndex === -1) {
                // if the param default is unused set it to unused
                // else just choose the 0th element in the element options. default?
                if (param.default === matsTypes.InputTypes.unused) {
                    matsParamUtils.setValueTextForParamName(name, matsTypes.InputTypes.unused);
                } else {
                    elem.selectedIndex = 0;
                    elem && elem.options && elem.selectedIndex >= 0 && elem.options[elem.selectedIndex].scrollIntoView();
                    elem && elem.options && elem.selectedIndex >= 0 && matsParamUtils.setValueTextForParamName(name, elem.options[elem.selectedIndex].text);
                }
            } else {
                elem.selectedIndex = selectedOptionIndex;
                elem && elem.options && elem.selectedIndex >= 0 && elem.options[elem.selectedIndex].scrollIntoView();
                elem && elem.options && elem.selectedIndex >= 0 && matsParamUtils.setValueTextForParamName(name, elem.options[elem.selectedIndex].text);
            }
            for (var i = 0; i < brothers.length; i++) {
                const belem = brothers[i];
                const belemSelectedOptions = $(belem.selectedOptions).map(function () {
                    return (this.value)
                }).get();
                if (belemSelectedOptions === undefined || belemSelectedOptions.length === 0) {
                    belem.options = [];
                    for (var i1 = 0; i1 < myOptions.length; i1++) {
                        belem.options[belem.options.length] = new Option(myOptions[i1], myOptions[i1], i1 == 0, i1 == 0);
                    }
                }
            }
        } catch (e) {
            e.message = "INFO: Error in select.js refresh: resetting selected options: " + e.message;
            setInfo(e.message);
        }
    }
    refreshPeer(event, param);
};  // refresh function

export default matsSelectUtils = {
    refresh: refresh,
    refreshPeer: refreshPeer,
    refreshDependents: refreshDependents,
    checkDisableOther: checkDisableOther,
    checkHideOther: checkHideOther
};

            