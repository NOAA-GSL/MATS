Template.select.rendered = function(){
    //console.log (this);
    if (this.firstNode.selectedIndex == -1) {
        if (this.data.default && this.data.default != "") {
            var defaultIndex = this.data.options.indexOf(this.data.default);
            if (defaultIndex == -1) {
                defaultIndex = 0;
            }
            this.firstNode.selectedIndex = defaultIndex;
            //document.getElementById(InputTypes.controlButton + "-" + this.data.name + "-value").textContent = this.data.options[defaultIndex];
        } else {
            this.firstNode.selectedIndex = 0;
            //document.getElementById(InputTypes.controlButton + "-" + this.data.name + "-value").textContent = this.data.options[0];
        }
    }
};
Template.select.helpers({
    isSelectedByDefault: function (p) {
        var def = p.default;
        // redefine the default value to be the first one if it is a model or region select
        var models = Models.find({},{sort: ["name","asc"]}, {name: 1}).fetch();
        if (models === undefined || models.length === 0) {
            return "";
        }
        var modelName = models[0].name;
        if (p.name === 'region') {
            var regionDescription  = RegionDescriptions.find({}).fetch()[0];
            var description = regionDescription.description;
            this.default = description;
            this.value = description;
        }
        if (def == this) {
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
            var regionMapping = models[0].regionMapping;

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
            var rOpts = [];

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
    'change .model': function(event ) {
        var modelName = event.currentTarget.options[event.currentTarget.selectedIndex].value;
        // do the region selector
        var model = Models.findOne({name: modelName}, {name: 1});
        var regionMapping = model.regionMapping;
        var opts = [];


        var regionIds = RegionsPerModel.findOne({model: modelName}, {regions: 1}).regions;
        for (var ri=0; ri< regionIds.length; ri++){
            var rid= regionIds[ri];

           var regionDescription = RegionDescriptions.findOne({regionMapTable: rid}, {

                description: 1
            });
            var description = regionDescription != null?regionDescription.description:"";


            opts.push(description);
        }

        var selector = $('select[name="region"]');
        // find which region is selected currently
        var selectedRegion = document.getElementById('region-select').options[document.getElementById('region-select').selectedIndex].text;
        var optionsAsString = "";
        var selected = 0;
        for (var i = 0; i < opts.length; i++) {
            // if selected currently select this one
            if (opts[i] == selectedRegion) {
                selected = i;
            }
            optionsAsString += "<option value='" + opts[i] + "'>" + opts[i] + "</option>";
        }
        // set selected
        selector.html("");
        selector.append(optionsAsString);
        document.getElementById('region-select').getElementsByTagName('option')[selected].selected = 'selected';
        // set the default for the value button
        var regionValueElem = document.getElementById('controlButton-region-value');
        regionValueElem.textContent = opts[selected].split(' (')[0];

        // do the forecastLength selector
        opts = FcstLensPerModel.findOne({model: modelName}, {forecastLengths: 1}).forecastLengths.sort(function (a, b) {
            return (Number(a) - Number(b));
        });
        selector = $('select[name="forecast length"]');
        // find which forecastlen is selected currently
        var selectedForecastLen = document.getElementById('forecast length-select').options[document.getElementById('forecast length-select').selectedIndex].text;
        optionsAsString = "";
        selected = 0;
        for (var i = 0; i < opts.length; i++) {
            if (opts[i] == selectedForecastLen) {
                selected = i;
            }
            optionsAsString += "<option value='" + opts[i] + "'>" + opts[i] + "</option>";
        }
        selector.html("");
        selector.append(optionsAsString);
        document.getElementById('forecast length-select').getElementsByTagName('option')[selected].selected = 'selected';
        // set the default for the value button
        var fclValueElem = document.getElementById('controlButton-forecast length-value');
        fclValueElem.textContent = opts[selected];

    }
});