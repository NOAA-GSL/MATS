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
        if (document.getElementById('plot-type-Profile').checked === true) {
            document.getElementById('curve-dates-item').style.display="block";
            document.getElementById('dates-item').style.display="none";
            document.getElementById('average-item').style.display="none";
            document.getElementById('top-numberSpinner').value=0;
            document.getElementById('controlButton-top-value').textContent="0";
            Session.set('plotType','Profile');
        }
    },
    'click .plot-type-TimeSeries': function() {
        // move dates selector to plot parameters - one date range for all curves
        if (document.getElementById('plot-type-TimeSeries').checked === true) {
            document.getElementById('curve-dates-item').style.display="none";
            document.getElementById('dates-item').style.display="block";
            document.getElementById('average-item').style.display="block";
            document.getElementById('top-numberSpinner').value=100;
            document.getElementById('controlButton-top-value').textContent="100";
            Session.set('plotType','TimeSeries');
        }
    }
});
