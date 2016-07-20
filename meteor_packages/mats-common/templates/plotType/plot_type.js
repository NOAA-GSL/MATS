Template.plotType.helpers({
    plotTypes:function() {
       return PlotGraphFunctions.find({}).fetch();
   },
   title:function() {
       if (Settings === undefined || Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
           return "";
       } else {
           return Settings.findOne({}, {fields: {Title: 1}}).Title;
       }
   }
});

Template.plotType.events({
    'click .plot-type-Profile': function() {
        // move dates selector to curve parameters - one date range for each curve
        if (document.getElementById('plot-type-' + PlotTypes.profile).checked === true) {
            var elem = document.getElementById(PlotTypes.scatter2d);
            if (elem && elem.style) {
                elem.style.display="none";
            }
            elem = document.getElementById('curve-dates-item');
            if (elem && elem.style) {
                elem.style.display="block";
            }
            elem = document.getElementById('dates-item');
            if (elem && elem.style) {
                elem.style.display = "none";
            }
            elem = document.getElementById('average-item');
            if (elem && elem.style) {
                elem.style.display = "none";
            }
           /* elem = document.getElementById('top-numberSpinner');
            if (elem && elem.style) {
                elem.value = 0;
            }
            elem = document.getElementById('controlButton-top-value');
            if (elem && elem.style) {
                elem.textContent = "0";
            } */
            Session.set('plotType', PlotTypes.profile);
            Session.set('lastUpdate', Date.now());
        }
    },
    'click .plot-type-TimeSeries': function() {
        // move dates selector to plot parameters - one date range for all curves
        if (document.getElementById('plot-type-' + PlotTypes.timeSeries).checked === true) {
            var elem = document.getElementById(PlotTypes.scatter2d);
            if (elem && elem.style) {
                elem.style.display = "none";
            }
            elem = document.getElementById('curve-dates-item');
            if (elem && elem.style) {
                elem.style.display = "none";
            }
            elem = document.getElementById('dates-item');
            if (elem && elem.style) {
                elem.style.display = "block";
            }
            elem = document.getElementById('average-item');
            if (elem && elem.style) {
                elem.style.display = "block";
            }
            /*
            elem = document.getElementById('top-numberSpinner');
            if (elem && elem.style) {
                elem.value = 100;
            }
            elem = document.getElementById('controlButton-top-value');
            if (elem && elem.style) {
                elem.textContent = "100";
            }
            */
            Session.set('plotType', PlotTypes.timeSeries);
            Session.set('lastUpdate', Date.now());
        }
    },
    'click .plot-type-Scatter2d': function() {
        if (document.getElementById('plot-type-' + PlotTypes.scatter2d).checked === true) {
            var elem = document.getElementById(PlotTypes.scatter2d);
            if (elem && elem.style) {
                elem.style.display = "block";
            }
            Session.set('plotType', PlotTypes.scatter2d);
            Session.set('lastUpdate', Date.now());
        }
    }
});
