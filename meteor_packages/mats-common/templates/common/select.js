import {matsMethods} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';


const refreshPeer = function (peerName) {
    try {
        if (peerName) {
            // refresh the peer
            const targetParam = matsCollections.CurveParams.findOne({name: peerName});
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
                const targetParam = matsCollections.CurveParams.findOne({name: name});
                const targetId = targetParam.name + '-' + targetParam.type;
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

const checkDisableOther = function (item) {
// check for enable controlled - This select might have control of another selector
    try {
        if (item.disableOtherFor !== undefined) {
            // this item controls the enable/disable properties of at least one other item.
            // Use the options to enable disable that item.
            const controlledSelectors = Object.keys(item.disableOtherFor);
            for (var i = 0; i < controlledSelectors.length; i++) {
                const elem = matsParamUtils.getInputElementForParamName(item.name);
                if (!elem) {
                    return;
                }
                const selectedOptions = elem.selectedOptions;
                const selectedText = selectedOptions && selectedOptions.length > 0 ? selectedOptions[0].text : "";
                if ((item.disableOtherFor[controlledSelectors[i]] === matsTypes.InputTypes.unused && selectedText === "") ||
                    $.inArray(selectedText, item.disableOtherFor[controlledSelectors[i]]) !== -1) {
                    matsParamUtils.getInputElementForParamName(controlledSelectors[i]).disabled = true;
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

const checkHideOther = function (item) {
// check for hide controlled - This select might have control of another selectors visibility
    try {
        if (item.hideOtherFor !== undefined) {
            // this item controls the visibility of at least one other item.
            const controlledSelectors = Object.keys(item.hideOtherFor);
            for (var i = 0; i < controlledSelectors.length; i++) {
                const elem = matsParamUtils.getInputElementForParamName(item.name);
                if (!elem) {
                    return;
                }
                const selectedOptions = elem.selectedOptions;
                const selectedText = selectedOptions && selectedOptions.length > 0 ? selectedOptions[0].text : "";

                var otherControlElem = matsParamUtils.getControlElementForParamName(controlledSelectors[i]);
                var otherInputElement = matsParamUtils.getInputElementForParamName(controlledSelectors[i]);
                var otherValueElement = matsParamUtils.getValueElementForParamName(controlledSelectors[i]);

                if ((item.hideOtherFor[controlledSelectors[i]] === matsTypes.InputTypes.unused && selectedText === "") ||
                    $.inArray(selectedText, item.hideOtherFor[controlledSelectors[i]]) !== -1) {
                    otherControlElem.style.display = 'none';
                    otherInputElement.style.display = 'none';
                    otherValueElement.style.display = 'none';
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

Template.select.rendered = function () {
    const ref = this.data.name + '-' + this.data.type;
    const elem = document.getElementById(ref);
    const plotTypeDependent = this.data.plotTypeDependent === true;
    const optionsMap = this.data.optionsMap;
    const peerName = this.data.peerName;
    const dependentNames = this.data.dependentNames;
    const dispElemName = matsTypes.InputTypes.controlButton + "-" + this.data.name + '-value';
    const dispElem = document.getElementById(dispElemName);
    const superiorNames = this.data.superiorNames;

    try {
        // register refresh event for axis change to use to enforce a refresh
        elem && elem.addEventListener('axisRefresh', function () {
            // Don't know why I have to do this, I expected the parameter data to be in the context....
            const paramData = matsCollections.CurveParams.findOne({name: this.name}, {dependentNames: 1, peerName: 1});
            const peerName = paramData.peerName;
            const dependentNames = paramData.dependentNames;
            if (peerName) {
                if (refreshPeer) {
                    refreshPeer(peerName);
                }
            }
            if (dependentNames && dependentNames.length > 0) {
                if (refreshDependents) {
                    refreshDependents(dependentNames);
                }
            }
        });
        // register refresh event for any superior to use to enforce a refresh of the options list
        elem && elem.addEventListener('refresh', function (e) {
            if (superiorNames !== undefined) {
                var superiors = [];
                for (var sn = 0; sn < superiorNames.length; sn++) {
                    var superiorElement = matsParamUtils.getInputElementForParamName(superiorNames[sn]);
                    var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex].text;
                    superiors.push({element: superiorElement, value: selectedSuperiorValue});
                }
                refresh(superiors);
            }
        });
    } catch (e) {
        e.message = "Error in select.js rendered: " + e.message;
        setError(e)
    }

    const refresh = function (superiors) {
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
        const name = elem.name;
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
        superiors = superiors === undefined ? [] : superiors;
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
                        if ((options !== undefined  && options.length === 0) || (superiorOptions !== undefined && superiorOptions.length === 0)) {
                            options = matsParamUtils.typeSort(_.union(options, superiorOptions));
                        } else {
                            options = matsParamUtils.typeSort(_.intersection(options, superiorOptions));
                        }
                    } else {
                        options = []; // last resort - prevent an exception
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
                setInfo("I changed your selected " + name + ": '" + selectedText + "' to '" + options[0] + "' because '" + selectedText + "' is no longer an option for " + sviText);
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
                        // set the display button to first value
                        if (i === 0) {
                            matsParamUtils.setValueTextForParamName(dispElemName, options[i]);
                            dispElem.textContent = options[i];
                        }
                    }
                }
            }
        } catch (e) {
            e.message = "Error in select.js refresh: resetting selected options: " + e.message;
            setError(e)
        }

        refreshPeer(peerName);
        refreshDependents(dependentNames);

    };  // refresh function

    try {
        checkDisableOther(this.data);
        checkHideOther(this.data);
        if (superiorNames) {
            var superiors = [];
            for (var ssi = 0; ssi < superiorNames.length; ssi++) {
                var superiorName = superiorNames[ssi];
                const superiorElement = matsParamUtils.getInputElementForParamName(superiorName);
                if (superiorElement) {
                    var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex].text;
                    superiors.push({element: superiorElement, value: selectedSuperiorValue});
                }
            }
            refresh(superiors);
        }
        elem && elem.options && elem.selectedIndex >= 0 && elem.options[elem.selectedIndex].scrollIntoView();

    } catch (e) {
        e.message = "Error in select.js render function checking to hide or disable other elements: " + e.message;
        setError(e)
    }
};

Template.select.helpers({
    isSelectedByDefault: function (p) {
        if (p.default == this) {
            return "selected";   // the selected option
        } else {
            return ""; // not the selected option
        }
    },
    options: function () {
        var sOptions = [];
        if (this.options !== matsTypes.InputTypes.unused) {
            sOptions = matsParamUtils.typeSort(this.options);
        }
        return sOptions;
    },
    multiple: function () {
        if (this.multiple === true) {
            return "multiple";
        }
    },
    isMultiple: function () {
        return this.multiple === true;
    },
    selectionIsOptional: function () {
        if (this.default === -1) {
            return true;
        } else {
            return false;
        }
    }
});

Template.select.events({
    'change .data-input': function (event) {
        if (event.currentTarget.options == []) {
            matsParamUtils.setValueTextForParamName(this.name, matsTypes.InputTypes.unused);
        } else {
            event.currentTarget.options &&
            event.currentTarget.options.selectedIndex &&
            event.currentTarget.options[event.currentTarget.options.selectedIndex] &&
            matsParamUtils.setValueTextForParamName(this.name, event.currentTarget.options[event.currentTarget.options.selectedIndex].text);
        }
        // These need to be done in the right order!
        // always check to see if an "other" needs to be hidden or disabled before refreshing
        checkHideOther(this);
        checkDisableOther(this);
        refreshPeer(this.peerName);
        refreshDependents(this.dependentNames);
    },
    'change .selectAll': function (event) {
        const selectorId = (event.currentTarget).attributes['data-selectid'].value;
        const elem = document.getElementById(selectorId);
        var select = false;
        if (event.target.checked == true) {
            select = true;
        }
        const elements = elem.options;
        if (elements && elements.length !== undefined) {
            for (var i = 0; i < elements.length; i++) {
                elements[i].selected = select;
            }
        }
        matsParamUtils.setValueTextForParamName(event.target.dataset.name, "");  // will override text if values are selected
    },
    'click .selectClear': function (event) {
        const selectorId = "#" + (event.currentTarget).attributes['data-selectid'].value;
        $(selectorId).val([]);
        matsParamUtils.setValueTextForParamName(this.name, "unused");
        $('#' + matsTypes.InputTypes.controlButton + '-' + this.name).click();  // click the control button to clean up the display (hide the selector)
        checkHideOther(this);
        checkDisableOther(this);
    }
});
