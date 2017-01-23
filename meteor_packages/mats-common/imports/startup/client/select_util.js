import { matsMethods } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';

const refreshPeer = function (peerName) {
    try {
        if (peerName) {
            // refresh the peer
            const targetParam = matsParamUtils.getParameterForName( peerName );
            const targetId = targetParam.name + '-' + targetParam.type;
            const targetElem = document.getElementById(targetId);
            const refreshMapEvent = new CustomEvent("refresh", {
                detail: {
                    refElement: event.target
                }
            });
            targetElem.dispatchEvent(refreshMapEvent);
        }
    } catch (e) {
        e.message = "Error in select.js refreshPeer: " + e.message;
        setError(e)
    }
};

const refreshDependents = function (dependentNames) {
    try {
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
                const refreshEvent = new CustomEvent("refresh", {
                    detail: {
                        refElement: event.target
                    }
                });
                targetElem.dispatchEvent(refreshEvent);
                const elements = targetElem.options;
                const select = true;
                if (targetElem.multiple && elements !== undefined && elements.length > 0) {
                    if (selectAllbool) {
                        for (var i1 = 0; i1 < elements.length; i1++) {
                            elements[i1].selected = select;
                        }
                        matsParamUtils.setValueTextForParamName(name, "");
                    }
                    else {
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
        e.message = "Error in select.js refreshDependents: " + e.message;
        setError(e)
    }
};

const checkDisableOther = function (param) {
// check for enable controlled - This select might have control of another selector
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
                if ((param.disableOtherFor[controlledSelectors[i]] === matsTypes.InputTypes.unused && selectedText === "") ||
                    $.inArray(selectedText, param.disableOtherFor[controlledSelectors[i]]) !== -1) {
                    matsParamUtils.getInputElementForParamName(controlledSelectors[i]).disabled = true;
                    matsParamUtils.setValueTextForParamName(controlledSelectors[i],matsTypes.InputTypes.unused);
                } else {
                    matsParamUtils.getInputElementForParamName(controlledSelectors[i]).disabled = false;
                }
            }
        }
    } catch (e) {
        e.message = "Error in select.js checkDisableOther: " + e.message;
        setError(e)
    }
};

const checkHideOther = function (param) {
// check for hide controlled - This select might have control of another selectors visibility
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

                var otherControlElem = matsParamUtils.getControlElementForParamName(controlledSelectors[i]);
                var otherInputElement = matsParamUtils.getInputElementForParamName(controlledSelectors[i]);
                var otherValueElement = matsParamUtils.getValueElementForParamName(controlledSelectors[i]);

                if ((param.hideOtherFor[controlledSelectors[i]] === matsTypes.InputTypes.unused && selectedText === "") ||
                    $.inArray(selectedText, param.hideOtherFor[controlledSelectors[i]]) !== -1) {
                    otherControlElem.style.display = 'none';
                    otherInputElement.style.display = 'none';
                    otherValueElement.style.display = 'none';
                    matsParamUtils.setValueTextForParamName(controlledSelectors[i],matsTypes.InputTypes.unused);
                } else {
                    otherControlElem.style.display = 'block';
                    otherInputElement.style.display = 'block';
                    otherValueElement.style.display = 'block';
                    otherInputElement && otherInputElement.options && otherInputElement.selectedIndex >= 0 &&
                    otherInputElement.options[otherInputElement.selectedIndex].scrollIntoView();
                }
            }
        }
    } catch (e) {
        e.message = "Error in select.js checkHideOther: " + e.message;
        setError(e)
    }
};

const refresh = function (paramName) {
    if (paramName.search('axis') === 1) {
        // this is a "brother" (hidden) scatterplot param. There is no need to refresh it or add event listeners etc.
        return;
    }
    const param = matsParamUtils.getParameterForName( paramName );
    const elem = matsParamUtils.getInputElementForParamName(paramName);
    const plotTypeDependent = param.plotTypeDependent;
    const optionsMap = param.optionsMap;
    const superiorNames = param.superiorNames;
    var superiors = [];
    if (superiorNames !== undefined) {
        for (var sn = 0; sn < superiorNames.length; sn++) {
            var superiorElement = matsParamUtils.getInputElementForParamName(superiorNames[sn]);
            var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex] === undefined ? undefined : superiorElement.options[superiorElement.selectedIndex].text;
            if (selectedSuperiorValue) {
                superiors.push({element: superiorElement, value: selectedSuperiorValue});
            }
        }
    }
    /*
     Because there may be axis "brothers" This refresh must go and
     see if there are any such elements that are essentially hidden copies
     of this one, and also refresh their options lists
     */
    /*
     plotTypeDependent means that the optionsMap has a top level plotType. i.e
     optionsMap = { matsTypes.PlotTypes.profile: {all my options for profile},
     matsTypes.PlotTypes.scatter2d : {all my options for scatter2d},
     matsTypes.PlotTypes.timeSeries: {all my options for time series}
     */

    // find all the elements that have ids like .... "x|y|z" + "axis-" + this.name
    const name = param.name;
    const elems = document.getElementsByClassName("data-input") === undefined ? [] : document.getElementsByClassName("data-input");
    Session.set('selected', $(elem).val());

    if (!elem.selectedIndex) {
        elem.selectedIndex = 0;
    }

    const selectedText = elem.selectedIndex >= 0 ? elem.options[elem.selectedIndex].text : "";
    var brothers = [];
    for (var i = 0; i < elems.length; i++) {
        if (elems[i].id.indexOf(name) >= 0 && elems[i].id !== elem.id)
            brothers.push(elems[i]);
    }
    var options = null;
    var selectedSuperiorValues = [];
    for (var superiorIndex = 0; superiorIndex < superiors.length; superiorIndex++) {
        try {
            var superior = superiors[superiorIndex];
            var selectedSuperiorValue = superior.value;
            selectedSuperiorValues.push(selectedSuperiorValue);
            var superiorOptions = [];
            if (plotTypeDependent && matsPlotUtils.getPlotType()) {
                superiorOptions = optionsMap[matsPlotUtils.getPlotType()][selectedSuperiorValue];
            } else {
                superiorOptions = optionsMap[selectedSuperiorValue];
            }
            /* tricky little bit here:
             If the controlButton for this superior element is hidden ....
             matsParamUtils.getControlElementForParamName(superior.element.name).offsetParent !== null
             ....
             it has been hidden
             because it has a visibility dependency on another param i.e. truth-data-source
             is dependent upon statistic such that if the statistic is "mean" the truth-data-source
             is hidden. See the wfip2 main.js statistic param as an example....
             "disableOtherFor:{'truth-data-source':[statisticOptionsMap.mean][0]},"
             and
             "hideOtherFor:{'truth-data-source':[statisticOptionsMap.mean][0]},"
             are the fields that cause the truth-data-source to be hidden when statistic is set to "mean".
             In that condition (controlButton is hidden) the superior should not be used as an intersection in the selected sites.
             matsParamUtils.getControlElementForParamName(superior.element.name).offsetParent will be null if the controlButton
             for this element (this superior) is hidden.

             Also the unused is tested against the superior...
             used && unused  -> use the used
             unused and used -> use the used
             used and used -> use the intersection
             unused and unused - set the options to []
             */
            var superiorOptionsUsed = (superiorOptions !== null) && (superiorOptions !== matsTypes.InputTypes.unused) && superiorOptions !== [];
            var myOptionsUsed = (options !== undefined) && (options !== null) && (options !== matsTypes.InputTypes.unused) && options !== [];
            if (matsParamUtils.getControlElementForParamName(superior.element.name).offsetParent !== null) {
                if (!superiorOptionsUsed && !myOptionsUsed) {  // none used - set to []
                    options = [];
                    matsParamUtils.setValueTextForParamName(name, matsTypes.InputTypes.unused);
                } else if (!myOptionsUsed && superiorOptionsUsed) { // superiors - use those
                    options = matsParamUtils.typeSort(superiorOptions);
                } else if (myOptionsUsed && !superiorOptionsUsed) {  // mine - use mine
                    options = matsParamUtils.typeSort(options);
                } else if (myOptionsUsed && superiorOptionsUsed) { // both - use the intersection
                    if ((options !== undefined && options.length === 0) || (superiorOptions !== undefined && superiorOptions.length === 0)) {
                        options = matsParamUtils.typeSort(_.union(options, superiorOptions));
                    } else {
                        options = matsParamUtils.typeSort(_.intersection(options, superiorOptions));
                    }
                } else {
                    options = []; // last resort - prevent an exception
                    matsParamUtils.setValueTextForParamName(name, matsTypes.InputTypes.unused);
                }
            }
        } catch (e) {
            e.message = "Error in select.js refresh: determining options from superiors: " + e.message;
            setError(e)
        }
    }
    try {
        // reset the options of the select
        var optionsAsString = "";
        if (options === undefined || options == null) {
            return;
        }
        for (var i = 0; i < options.length; i++) {
            optionsAsString += "<option value='" + options[i] + "'>" + options[i] + "</option>";
        }
        $('select[name="' + name + '"]').empty().append(optionsAsString);
        //reset the selected index if it had been set prior (the list may have changed so the index may have changed)
        var selectedOptionIndex = options.indexOf(selectedText);
        var sviText = "";
        if (selectedOptionIndex == -1 && elem.selectedIndex >= 0) {
            for (var svi = 0; svi < selectedSuperiorValues.length; svi++) {
                superior = superiors[svi];
                if (matsParamUtils.getControlElementForParamName(superior.element.name).offsetParent !== null) {
                    if (svi > 0) {
                        sviText += " and ";
                    }
                    sviText += selectedSuperiorValues[svi]
                }
            }
            setInfo( "I changed your selected " + name + ": '" + selectedText + "' to '" + options[0] + "' because '" + selectedText + "' is no longer an option for " + sviText );
        }
        selectedOptionIndex = selectedOptionIndex == -1 ? 0 : selectedOptionIndex;
        elem.selectedIndex = selectedOptionIndex;
        elem && elem.options && elem.selectedIndex >= 0 && elem.options[elem.selectedIndex].scrollIntoView();
        elem && elem.options && elem.selectedIndex >= 0 && matsParamUtils.setValueTextForParamName(name, elem.options[elem.selectedIndex].text);
        matsMethods.setSelectParamOptions.call({
            name: name,
            options: options,
            optionIndex: selectedOptionIndex
        }, function (error) {
            if (error) {
                setError(new Error("matsMethods.setSelectParamOptions: from select.js error: " + error.message));
            }
        });
        for (var i = 0; i < brothers.length; i++) {
            const belem = brothers[i];
            const belemSelectedOptions = $(belem.selectedOptions).map(function () {
                return (this.value)
            }).get();
            if (belemSelectedOptions === undefined || belemSelectedOptions.length === 0) {
                belem.options = [];
                for (var i = 0; i < options.length; i++) {
                    belem.options[belem.options.length] = new Option(options[i], options[i], i == 0, i == 0);
                }
            }
        }
    } catch (e) {
        e.message = "Error in select.js refresh: resetting selected options: " + e.message;
        setError(e)
    }
    refreshPeer(param.peerName);
    refreshDependents(param.dependentNames);
};  // refresh function

export default matsSelectUtils = {
    refresh:refresh,
    refreshPeer:refreshPeer,
    refreshDependents:refreshDependents,
    checkDisableOther:checkDisableOther,
    checkHideOther:checkHideOther
};

            