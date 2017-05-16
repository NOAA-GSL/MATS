import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { matsSelectUtils } from 'meteor/randyp:mats-common';

/*
    Much of the work for select widgets happens in mats-common->imports->client->select_util.js. Especially the refresh
    routine which sets all the options. Don't forget to look there for much of the handling.
 */
Template.select.onRendered( function () {
    const ref = this.data.name + '-' + this.data.type;
    $("#" + ref).select2({minimumResultsForSearch: 20,closeOnSelect: false});

    const elem = document.getElementById(ref);
    try {
        // register refresh event for axis change to use to enforce a refresh

        elem && elem.addEventListener('axisRefresh', function (event) {
            // Don't know why I have to do this, I expected the parameter data to be in the context....
            const paramData = matsCollections.CurveParams.findOne({name: this.name}, {dependentNames: 1, peerName: 1});
            matsSelectUtils.refreshPeer(event,paramData);
        });

        // register refresh event for any superior to use to enforce a refresh of the options list
        if (ref.search('axis') === 1) {
            // this is a "brother" (hidden) scatterplot param. There is no need to refresh it or add event listeners etc.
            return;
        }
        elem && elem.addEventListener('refresh', function (event) {
            matsSelectUtils.refresh(event,this.name);
        });
    } catch (e) {
        e.message = "Error in select.js rendered: " + e.message;
        setError(e);
    }
    try {
        matsSelectUtils.checkDisableOther(this.data);
        matsSelectUtils.checkHideOther(this.data);
        matsSelectUtils.refresh(null,this.data.name);
    } catch (e) {
        e.message = "Error in select.js rendered function checking to hide or disable other elements: " + e.message;
        setError(e);
    }
});

Template.select.helpers({
    optionMaxLength: function() {
        var sOptions = [];
        if (!this.options) {
            return 10;
        }
        const longest = (this.options).reduce(function (a, b) { return a.length > b.length ? a : b; });
        const ret = longest.length < 8 ? 8 : Math.round(longest.length * 0.6);
        return ret;
    },

    isSelectedByDefault: function (p) {
        if (p.default == this) {
            return "selected";   // the selected option
        } else {
            return ""; // not the selected option
        }
    },
    options: function () {
        var sOptions = [];
        //process options as an option list
        if (this.options === matsTypes.InputTypes.unused) {
            return [];
        } else if (this.optionsGroups) {
            // options have optionGroups
            this.optionsGroups.foreach(function(value) {
                Soptions.concat(value);
            });
        } else {
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

const setValue = function(pName) {
    const elem = matsParamUtils.getInputElementForParamName(pName);
    const selectedOptions = elem.selectedOptions;
    const options = elem.options;

    if (selectedOptions === undefined || selectedOptions.length === 0 || elem.selectedIndex === -1) {
        // set to the default - the 0th one
        matsParamUtils.setValueTextForParamName(pName, matsTypes.InputTypes.unused);
    } else {
        if (selectedOptions.length === 1) {
            matsParamUtils.setValueTextForParamName(pName, selectedOptions[0].text);
        } else {
            // selected options is greater than 1 - must be a multiple
            const firstOption = selectedOptions[0];
            const lastOption = selectedOptions[selectedOptions.length -1];
            const text = firstOption.text + " .. " + lastOption.text;
            matsParamUtils.setValueTextForParamName(pName, text);
        }
    }
}


Template.select.events({
    'change .data-input': function (event) {
        Session.set("elementChanged", Date.now());
        const paramName =  event.target.name;
        if (paramName === undefined) {
            return false;
        }
        // These need to be done in the right order!
        // always check to see if an "other" needs to be hidden or disabled before refreshing
        matsSelectUtils.checkHideOther(this);
        matsSelectUtils.checkDisableOther(this);
        matsSelectUtils.refreshPeer(event, this);
        document.getElementById("element-" + this.name).style.display = "none"; // be sure to hide the element div
        const curveItem = document.getElementById("curveItem-" + Session.get("editMode"));
        curveItem && curveItem.scrollIntoView(false);
        setValue(paramName);
        if (this.multiple) {
            return true; // prevents the select 2 from closing on multiple selectors
        }
        $('#' + this.name + "-" + this.type).select2('close');
        Session.set('lastUpdate', Date.now());
        return false;
    },
    'click .doneSelecting': function (event) {
        Session.set("elementChanged", Date.now());
        const controlElem = matsParamUtils.getControlElementForParamName(this.name);
        $('#' + this.name + "-" + this.type).select2("close").trigger('change'); // apply the selection choices to the select2
        $(controlElem).trigger('click');  // clicking the control element hides the selector
        return false;
    },
    'click .selectAll': function (event) {
        const elem = matsParamUtils.getInputElementForParamName(this.name);
        var values = [];
        for (var i=0; i<elem.options.length; i++) {
             values.push(elem.options[i].text);
         }
        $('#' + this.name + "-" + this.type).select2().val(values).trigger('change');
        return false;
    },
    'click .clearSelections': function (event) {
        const elem = matsParamUtils.getInputElementForParamName(this.name);
        $('#' + this.name + "-" + this.type).select2().val(null).trigger('change');
        return false;
    },
    'click .doNotUse': function (event) {
        const elem = matsParamUtils.getInputElementForParamName(this.name);
        $('#' + this.name + "-" + this.type).select2().val(null).trigger('change');
        return false;
    },
    'change, blur .item' : function (event) {
        try {
            var text = "";
            if (event.target.multiple) {
                const values = $(event.target).val();
                if (values === null) { // happens if unused or empty
                    text = matsTypes.InputTypes.unused;
                } else {
                    const firstOption = values[0];
                    const lastOption = values[values.length - 1];
                    text = firstOption + " .. " + lastOption;
                }
            } else {
                text = $(event.target).val();
            }
            if (this.type === matsTypes.InputTypes.select && (text === "" || text === undefined || text === null) &&
                (this.default === -1 || this.default === undefined || this.default === null || event.currentTarget.selectedIndex == -1)) {
                text = matsTypes.InputTypes.unused;
                //$('#' + this.name + "-" + this.type).select2().val(null).trigger('change');
            }
            matsParamUtils.setValueTextForParamName(event.target.name, text);
        } catch (error){
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
        const curveItem = (Session.get("editMode") === undefined && Session.get("editMode") === "") ? undefined : document.getElementById("curveItem-" + Session.get("editMode"));
        if (curveItem) {
            $('#save').trigger('click');
        }
    }
});
