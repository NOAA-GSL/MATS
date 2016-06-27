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
    var optionsMap = this.data.optionsMap;
    var peerName = this.data.peerName;
    var dependentNames = this.data.dependentNames;
    var dispElem = document.getElementById(InputTypes.controlButton + "-" + this.data.name + '-value');
    var refresh = function(selectedSuperiorValue) {
        var options = optionsMap[selectedSuperiorValue];
        elem.options.length =0;
        for(var i = 0; i < options.length; i++) {
            elem.options[elem.options.length] = new Option(options[i], options[i], i==0, i==0);
            // set the display button
            if (i === 0) {
                if (peername) {
                    dispElem.textContent = "";
                } else {
                    dispElem.textContent = options[i];
                }
            }
        }
        refreshPeer(peerName);
        refreshDependents(dependentNames)
    };

    // register refresh event for any superior to use to enforce a refresh
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
    }
});

Template.select.events({
    'change': function() {
        refreshPeer(this.peerName);
        refreshDependents(this.dependentNames);
     }
});