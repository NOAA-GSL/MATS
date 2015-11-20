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
            var regionDescription  = RegionDescriptions.findOne({regionNumber:Number(0)});
            var description = regionDescription.description;
            this.default = description;
            this.value = description;
        } else if (p.name === 'forecast length') {
            var lengths = FcstLensPerModel.findOne({model: modelName}).forecastLengths;
            def = lengths[0];
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
            var regionIds = RegionsPerModel.findOne({model: modelName},{regions:1}).regions.sort(function(a, b){return Number(a)-Number(b)});
            for (var ri=0; ri< regionIds.length; ri++){
                var rid= regionIds[ri];
                var regionDescription  = RegionDescriptions.findOne({regionNumber:Number(rid)});
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
            //var models = Models.find({},{sort: ["name","asc"]}, {name: 1}).fetch();
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
        if(this.multiple && this.multiple===true)
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
        var regionIds = RegionsPerModel.findOne({model: modelName}, {regions: 1}).regions.sort(function (a, b) {
            return (Number(a) - Number(b));
        });
        for (var ri=0; ri< regionIds.length; ri++){
            var rid= regionIds[ri];
            var regionDescription = RegionDescriptions.findOne({regionNumber: Number(rid)}, {
                shortName: 1,
                description: 1
            });
            var description = regionDescription != null?regionDescription.description:"";


            opts.push(description);
        }
        var optionsAsString = "";
        for (var i = 0; i < opts.length; i++) {
            if (i === 0) {
                optionsAsString += "<option selected value='" + opts[i] + "'>" + opts[i] + "</option>";
            } else {
                optionsAsString += "<option value='" + opts[i] + "'>" + opts[i] + "</option>";
            }
        }

        var selector = $('select[name="region"]');
        selector.html("");
        selector.append(optionsAsString);
        // set the default for the value button
        var regionValueElem = document.getElementById('controlButton-region-value');
        regionValueElem.textContent = opts[0].split(' (')[0];


        // do the forecastLength selector
        opts = FcstLensPerModel.findOne({model: modelName}, {forecastLengths: 1}).forecastLengths.sort(function (a, b) {
            return (Number(a) - Number(b));
        });
        optionsAsString = "";
        for (var i = 0; i < opts.length; i++) {
            if (i === 0) {
                optionsAsString += "<option selected value='" + opts[i] + "'>" + opts[i] + "</option>";
            } else {
                optionsAsString += "<option value='" + opts[i] + "'>" + opts[i] + "</option>";
            }
        }
        selector = $('select[name="forecast length"]');
        selector.html("");
        selector.append(optionsAsString);
        // set the default for the value button
        var fclValueElem = document.getElementById('controlButton-forecast length-value');
        fclValueElem.textContent = opts[0];
    }
});