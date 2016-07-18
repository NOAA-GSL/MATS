var refreshPeer = function(peerName) {
    if (peerName ) {
        // refresh the peer
        var targetParam = CurveParams.findOne({name:peerName});
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
        for (var i = 0; i < dependentNames.length; i++) {
            var name = dependentNames[i];
            var targetParam = CurveParams.findOne({name: name});
            var targetId = targetParam.name + '-' + targetParam.type;
            var targetElem = document.getElementById(targetId);
            var refreshEvent = new CustomEvent("refresh", {
                detail: {
                    refElement: event.target
                }
            });
            targetElem.dispatchEvent(refreshEvent);
        }
    }
};

Template.select.rendered = function(){
    var ref = this.data.name + '-' + this.data.type;
    var elem = document.getElementById(ref);
    if (this.firstNode.selectedIndex == -1) {
        if (this.data.default && this.data.default != "") {
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
    var dispElem = document.getElementById(InputTypes.controlButton + "-" + this.data.name + '-value');
    var refresh = function(selectedSuperiorValue) {
        /*
        Because there may be axis "brothers" This refresh must go and
        see if there are any such elements that are essentially hidden copies
        of this one, and also refresh their options lists
         */
        /*
        plotTypeDependent means that the optionsMap has a top level plotType. i.e
         optionsMap = { PlotTypes.profile: {all my options for profile},
         PlotTypes.scatter2d : {all my options for scatter2d},
         PlotTypes.timeSeries: {all my options for time series}
         */

        // find all the elements that have ids like .... "x|y|z" + "axis-" + this.name
        var name = elem.name;
        var elems = document.getElementsByClassName("data-input");
        var brothers = [];
        for (var i=0; i<elems.length; i++) {
            if (elems[i].id.indexOf(name) >= 0 && elems[i].id !== elem.id)
                brothers.push(elems[i]);
        }
        var options = {};
        if (plotTypeDependent) {
            options = optionsMap[getPlotType()][selectedSuperiorValue];
        } else {
            options = optionsMap[selectedSuperiorValue];
        }
        Meteor.call('setSelectParamOptions', name, options, function (error) {
            if (error) {
                setError(error.message);
            }
        });
        for (var i = 0; i < brothers.length; i++) {
            var belem = brothers[i];
            belem.options.length = 0;
            for (var i = 0; i < options.length; i++) {
                belem.options[belem.options.length] = new Option(options[i], options[i], i == 0, i == 0);
                // set the display button to first value
                if (i === 0) {
                    dispElem.textContent = options[i];
                }
            }
        }

        refreshPeer(peerName);
        refreshDependents(dependentNames)
    };

    // register refresh event for any superior to use to enforce a refresh of the options list
    elem.addEventListener('refresh', function (e) {
        var superiorElement = e.detail.refElement;
        var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex].text;
        refresh(selectedSuperiorValue);
    });
    // register refresh event for axis change to use to enforce a refresh
    elem.addEventListener('axisRefresh', function () {
        // Don't know why I have to do this, I expected the parameter data to be in the context....
        var paramData = CurveParams.findOne({name:this.name},{dependentNames:1,peerName:1});
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
    'change': function() {
        refreshPeer(this.peerName);
        refreshDependents(this.dependentNames);
        setValueTextForParamName(this.name);
     },
    'change .selectAll': function(event) {
        var selectorId = event.target.dataset.selectid;
        var elem = document.getElementById(selectorId);
        var select = false;
        if (event.target.checked == true) {
            select = true;
        }
        var elements = elem.options;
        for(var i = 0; i < elements.length; i++){
            elements[i].selected = select;
        }
        setValueTextForParamName(event.target.dataset.name, "");  // will override text if values are selected
    }
});