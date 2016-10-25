import { matsMethods } from 'meteor/randyp:mats-common';
import { matsTypes} from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';

 var refreshPeer = function(peerName) {
    if (peerName ) {
        // refresh the peer
        var targetParam = matsCollections.CurveParams.findOne({name:peerName});
        var targetId  = targetParam.name + '-' + targetParam.type;
        var targetElem = document.getElementById(targetId);
        var refreshMapEvent = new CustomEvent("refresh", {
            detail: {
                refElement: event.target
            }
        });
        targetElem.dispatchEvent(refreshMapEvent);
    }
};

var refreshDependents = function(dependentNames) {
    if (dependentNames) {
        // refresh the dependents
        var selectAllbool;
        for (var i = 0; i < dependentNames.length; i++) {
            var name = dependentNames[i];
            var targetParam = matsCollections.CurveParams.findOne({name: name});
            var targetId = targetParam.name + '-' + targetParam.type;
            var targetElem = document.getElementById(targetId);
            selectAllbool = document.getElementById('selectAll').checked;
            var refreshEvent = new CustomEvent("refresh", {
                detail: {
                    refElement: event.target
                }
            });
            targetElem.dispatchEvent(refreshEvent);
            if (selectAllbool && name == 'sites') {
                var elements = targetElem.options;
                var select = true;
                for(var i = 0; i < elements.length; i++){
                    elements[i].selected = select;
                }
                matsParamUtils.setValueTextForParamName(name, "");
            }
        }
    }
};

var checkDisableOther = function(item) {
// check for enable controlled - This select might have control of another selector
    if (item.disableOtherFor !== undefined) {
        // this item controls the enable/disable properties of at least one other item.
        // Use the options to enable disable that item.
        var controlledSelectors = Object.keys(item.disableOtherFor);
        for (var i = 0; i < controlledSelectors.length; i++) {
            var elem = matsParamUtils.getInputElementForParamName(item.name);
            if (!elem) {
                return;
            }
            var selectedOption = elem.selectedOptions;
            var selectedText = selectedOption[0].text;
            if ($.inArray(selectedText, item.disableOtherFor[controlledSelectors[i]]) !== -1) {
                matsParamUtils.getInputElementForParamName(controlledSelectors[i]).disabled = true;
            } else {
                matsParamUtils.getInputElementForParamName(controlledSelectors[i]).disabled = false;
            }
        }
    }
};

var checkHideOther = function(item) {
// check for hide controlled - This select might have control of another selectors visibility
    if (item.hideOtherFor !== undefined) {
        // this item controls the visibility of at least one other item.
        var controlledSelectors = Object.keys(item.hideOtherFor);
        for (var i = 0; i < controlledSelectors.length; i++) {
            var elem = matsParamUtils.getInputElementForParamName(item.name);
            if (!elem) {
                return;
            }
            var selectedOption = elem.selectedOptions;
            var selectedText = selectedOption[0].text;
            
            var otherControlElem = matsParamUtils.getControlElementForParamName(controlledSelectors[i]);
            var otherInputElement = matsParamUtils.getInputElementForParamName(controlledSelectors[i]);
            var otherValueElement =  matsParamUtils.getValueElementForParamName(controlledSelectors[i]);
                
            if ($.inArray(selectedText, item.hideOtherFor[controlledSelectors[i]]) !== -1) {
                otherControlElem.style.display  = 'none';
                otherInputElement.style.display  = 'none';
                otherValueElement.style.display  = 'none';
            } else {
                otherControlElem.style.display  = 'block';
                otherInputElement.style.display  = 'block';
                otherValueElement.style.display  = 'block';
            }
        }
    }
};

Template.select.rendered = function(){
    var ref = this.data.name + '-' + this.data.type;
    var elem = document.getElementById(ref);
    if (this.firstNode.selectedIndex == -1) {
        if (this.data.default && this.data.default != "" && this.data.options) {
            var defaultIndex = this.data.options.indexOf(this.data.default);
            if (defaultIndex == -1) {
                defaultIndex = 0;
            }
            this.firstNode.selectedIndex = defaultIndex;
        } else {
            this.firstNode.selectedIndex = 0;
        }
    }
    var plotTypeDependent = this.data.plotTypeDependent === true;
    var optionsMap = this.data.optionsMap;
    var peerName = this.data.peerName;
    var dependentNames = this.data.dependentNames;
    var dispElemName = matsTypes.InputTypes.controlButton + "-" + this.data.name + '-value';
    var dispElem = document.getElementById(dispElemName);
    var superiorName = this.data.superiorName;
    var refresh = function(selectedSuperiorValue) {
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
        var name = elem.name;
        var elems = document.getElementsByClassName("data-input");
        if (!elem.selectedIndex) {
            elem.selectedIndex = 0;
        }
        var selectedText = elem.options[elem.selectedIndex].text;
        var brothers = [];
        for (var i=0; i<elems.length; i++) {
            if (elems[i].id.indexOf(name) >= 0 && elems[i].id !== elem.id)
                brothers.push(elems[i]);
        }
        var options = {};
        if (plotTypeDependent && matsPlotUtils.getPlotType()) {
            options = optionsMap[matsPlotUtils.getPlotType()][selectedSuperiorValue];
        } else {
            options = optionsMap[selectedSuperiorValue];
        }

        var selectedOptionIndex = options.indexOf(selectedText);
        if (selectedOptionIndex == -1) {
            setInfo("I changed your selected " + name + ": '" + selectedText + "' to '" + options[0] + "' because '" + selectedText +  "' is no longer an option ");
        }
        selectedOptionIndex = selectedOptionIndex == -1 ? 0 : selectedOptionIndex;
        matsMethods.setSelectParamOptions.call({name:name, options:options, optionIndex:selectedOptionIndex}, function (error) {
            if (error) {
                setError( "matsMethods.setSelectParamOptions: from select.js error: " + error.message );
            }
        });
        for (var i = 0; i < brothers.length; i++) {
            var belem = brothers[i];
            var belemSelectedOptions =$(belem.selectedOptions).map(function(){return(this.value)}).get();
            if (belemSelectedOptions.length === 0) {
                belem.options.length = 0;
                for (var i = 0; i < options.length; i++) {
                    belem.options[belem.options.length] = new Option(options[i], options[i], i == 0, i == 0);
                    // set the display button to first value
                    if (i === 0) {
                        matsParamUtils.setValueTextForParamName(dispElemName,options[i]);
                        dispElem.textContent = options[i];
                    }
                }
            }
        }

        refreshPeer(peerName);
        refreshDependents(dependentNames);
    };

    // register refresh event for any superior to use to enforce a refresh of the options list
    elem.addEventListener('refresh', function (e) {
        if (superiorName) {
            var superiorElement = matsParamUtils.getInputElementForParamName(superiorName);
            var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex].text;
            refresh(selectedSuperiorValue);
        }
    });
    // register refresh event for axis change to use to enforce a refresh
    elem.addEventListener('axisRefresh', function () {
        // Don't know why I have to do this, I expected the parameter data to be in the context....
        var paramData = matsCollections.CurveParams.findOne({name:this.name},{dependentNames:1,peerName:1});
        var peerName = paramData.peerName;
        var dependentNames = paramData.dependentNames;
        if (peerName) {
            if (refreshPeer){
                refreshPeer(peerName);
            }
        }
        if (dependentNames && dependentNames.length > 0) {
            if (refreshDependents){
                refreshDependents(dependentNames);
            }
        }
    });
    checkDisableOther(this.data);
    checkHideOther(this.data);

    var superiorElement = matsParamUtils.getInputElementForParamName(superiorName);
    if (superiorElement) {
        var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex].text;
        refresh(selectedSuperiorValue);
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
    options: function() {
        if (this.default === undefined || this.default === "") {
            this.default = this.options[0];
            // set the default value
            this.value = this.options[0];
        }
        return this.options;
    },
    multiple:function(){
        if(this.multiple===true)
        {return "multiple";}
    },
    isMultiple: function() {
        return this.multiple===true;
    }
});

Template.select.events({
    'change .data-input': function(event) {
        refreshPeer(this.peerName);
        matsParamUtils.setValueTextForParamName(this.name, event.currentTarget.options[event.currentTarget.options.selectedIndex].text);
        refreshDependents(this.dependentNames);
        checkDisableOther(this);
        checkHideOther(this);
     },
    'change .selectAll': function(event) {
        var selectorId = (event.currentTarget).attributes['data-selectid'].value;
        var elem = document.getElementById(selectorId);
        var select = false;
        if (event.target.checked == true) {
            select = true;
        }
        var elements = elem.options;
        for(var i = 0; i < elements.length; i++){
            elements[i].selected = select;
        }
        matsParamUtils.setValueTextForParamName(event.target.dataset.name, "");  // will override text if values are selected
    }
});
