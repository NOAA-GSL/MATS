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
    var refresh = function(selectedSuperiorValue) {
        var options = optionsMap[selectedSuperiorValue];
        elem.options.length =0;
        for(var i = 0; i < options.length; i++) {
            elem.options[elem.options.length] = new Option(options[i], options[i], i==0, i==0);
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
        var models = Models.find({},{sort: ["name","asc"]},{name: 1}).fetch();
        if (models === undefined || models.length === 0) {
            return "";
        }
        if (this.name === 'region') {
            var rOpts = [];
            var models = Models.find({},{sort: ["name","asc"]}).fetch();
            var modelName = models[0].name;
            var regionIds = RegionsPerModel.findOne({model: modelName},{regions:1}).regions;
            for (var ri=0; ri< regionIds.length; ri++){
                var rid= regionIds[ri];
                var regionDescription  = RegionDescriptions.findOne({regionMapTable:rid});
               var description = regionDescription != null? regionDescription.description:"";
                    rOpts.push(description);
            }
            if (this.default === undefined || this.default === "") {
                this.default = rOpts[0];
                this.value = rOpts[0];
            }
            return rOpts;
        } else if (this.name === 'forecast length') {
            var models = Models.find({},{sort: ["name","asc"]}).fetch();
            var modelName = models[0].name;
            var modelLength = FcstLensPerModel.findOne({model: modelName});
            if (modelLength === undefined) {
                return [];
            }
            return modelLength.forecastLengths;
        }
        if (this.default === undefined || this.default === "") {
            this.default = this.options[0];
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
    'change': function(event ) {
        if (this.multiple) {
            if (event.target.value === 'All') {
                // select them all
                $("#" + event.target.id + " option").each(function(){
                    // Add $(this).val() to your list
                    $("#" + event.target.id + " option[value='" + $(this).val() + "']").prop("selected", true);
                });
            }
        }
        refreshPeer(this.peerName);
        refreshDependents(this.dependentNames);
     }
});