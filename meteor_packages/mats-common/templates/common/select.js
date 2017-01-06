import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { matsSelectUtils } from 'meteor/randyp:mats-common';


Template.select.rendered = function () {
    const ref = this.data.name + '-' + this.data.type;
    const elem = document.getElementById(ref);
    try {
        // register refresh event for axis change to use to enforce a refresh

        elem && elem.addEventListener('axisRefresh', function () {
            // Don't know why I have to do this, I expected the parameter data to be in the context....
            const paramData = matsCollections.CurveParams.findOne({name: this.name}, {dependentNames: 1, peerName: 1});
            const peerName = paramData.peerName;
            const dependentNames = paramData.dependentNames;
            if (peerName) {
                if (matsSelectUtils.refreshPeer) {
                    matsSelectUtils.refreshPeer(peerName);
                }
            }
            if (dependentNames && dependentNames.length > 0) {
                if (matsSelectUtils.refreshDependents) {
                    matsSelectUtils.refreshDependents(dependentNames);
                }
            }
        });

        // register refresh event for any superior to use to enforce a refresh of the options list
        if (ref.search('axis') === 1) {
            // this is a "brother" (hidden) scatterplot param. There is no need to refresh it or add event listeners etc.
            return;
        }
        elem && elem.addEventListener('refresh', function (e) {
            matsSelectUtils.refresh(this.name);
        });
    } catch (e) {
        e.message = "Error in select.js rendered: " + e.message;
        setError(e)
    }
    try {
        matsSelectUtils.checkDisableOther(this.data);
        matsSelectUtils.checkHideOther(this.data);
        matsSelectUtils.refresh(this.data.name);
        elem && elem.options && elem.selectedIndex >= 0 && elem.options[elem.selectedIndex].scrollIntoView();

    } catch (e) {
        e.message = "Error in select.js rendered function checking to hide or disable other elements: " + e.message;
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
        matsSelectUtils.checkHideOther(this);
        matsSelectUtils.checkDisableOther(this);
        matsSelectUtils.refreshPeer(this.peerName);
        matsSelectUtils.refreshDependents(this.dependentNames);
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
        matsSelectUtils.checkHideOther(this);
        matsSelectUtils.checkDisableOther(this);
    }
});
