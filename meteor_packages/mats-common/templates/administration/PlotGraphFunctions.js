import {matsCollections} from 'meteor/randyp:mats-common';

Template.plotGraphFunctions.helpers({
    plotGraphFunction : function() {
        if (Session.get("PlotGraphFunctions") === undefined || Session.get("PlotGraphFunctions").length == 0){
            Session.set("PlotGraphFunctions",matsCollections.PlotGraphFunctions.find({}).fetch());
        }
        return Session.get("PlotGraphFunctions");
    },
    errorMessage: function() {
        return Session.get("errorMessage");
    },
    errorTypeIs: function(type) {
        return Session.get("errorType") === type;
    }


});

var resetError = function() {
    errorMessage = "";
    Session.set("errorMessage","");
    Session.set("errorType","");
    if (document.getElementById("errorMessage")) {
        document.getElementById("errorMessage").style.display = "none";
    }
};
var setError = function(type,message) {
    Session.set("errorMessage", message);
    Session.set("errorType", type);

    document.getElementById("errorMessage").style.display = "block";
};

Template.plotGraphFunctions.events({
    'click .plotGraphFunction': function(event) {
        event.preventDefault();
        resetError();
        var plotTypeStr = document.getElementById('plotGraphFunction-selection').value;
        var plotGraphFunctions = Session.get("PlotGraphFunctions");
        var plotGraphFunction = plotGraphFunctions.filter(function ( obj ) {
            return obj.plotType === plotTypeStr;
        })[0];

        document.getElementById("plotType").value=plotGraphFunction.plotType;
        document.getElementById("dataFunction").value=plotGraphFunction.dataFunction;
        document.getElementById("graphFunction").value=plotGraphFunction.graphFunction;
        return false;
    },
    'click .plotGraphFunction-selection-add': function(event) {
        event.preventDefault();
        resetError();
        var d = (Date.now() / 1000 | 0).toString();
        var plotGraphFunctions = Session.get("PlotGraphFunctions");
        plotGraphFunctions.push({plotType:  d,
                                graphFunction: "graph...",
                                dataFunction: "data..."
                               });
        Session.set("PlotGraphFunctions",plotGraphFunctions);
        return false;
    },
    'click .plotGraphFunction-selection-remove': function(event) {
        event.preventDefault();
        resetError();
        var plotTypeStr = document.getElementById('plotGraphFunction-selection').value;
        var plotGraphFunctions = Session.get("PlotGraphFunctions");
        for( i=plotGraphFunctions.length-1; i>=0; i--) {
            if( plotGraphFunctions[i].plotType == plotTypeStr) plotGraphFunctions.splice(i,1);
        }
        Session.set("PlotGraphFunctions",plotGraphFunctions);
        return false;
    },
    'click .apply-plotGraphFunction': function() {
        event.preventDefault();
        //
        var sPlotGraphFunctions = Session.get("PlotGraphFunctions");
        var plotGraphFunctions = matsCollections.PlotGraphFunctions.find({}).fetch();
        var sPlotTypes = _.pluck(sPlotGraphFunctions,'plotType');
        var plotTypes =  _.pluck(plotGraphFunctions,'plotType');

        // find any superfluous ones in plotTypes (this is a remove) and remove them from collection
        var toRemoveFromCollection =  plotTypes.filter( function( el ) {
            return sPlotTypes.indexOf( el ) < 0;
        });
        for (var ip=0; ip < toRemoveFromCollection.length; ip++) {
            var p = toRemoveFromCollection[ip];
            var plotType = matsCollections.PlotGraphFunctions.findOne({plotType:p});
            var id = plotType._id;
            matsCollections.PlotGraphFunctions.remove({_id:id});
        }
        // iterate all the ones in the session and overwrite/add them
        for (var i=0; i < sPlotTypes.length; i++) {
            var s = sPlotTypes[i];
            var spgf = sPlotGraphFunctions.filter(function ( obj ) {
                return obj.plotType === s;
            })[0];

            var pt = matsCollections.PlotGraphFunctions.findOne({plotType:s});
            if (pt) {
                // update
                var ptid = pt._id;
                delete spgf._id;
                matsCollections.PlotGraphFunctions.update({_id:ptid},{$set:spgf});
            } else {
                //insert
                matsCollections.PlotGraphFunctions.insert(spgf);
            }
        }
        Session.set("PlotGraphFunctions",matsCollections.PlotGraphFunctions.find({}).fetch());
        $("#plotGraphFunctionsModal").modal('hide');
        return false;
    },
    'click .cancel-plotGraphFunction': function() {
        event.preventDefault();

        $("#plotGraphFunctionsModal").modal('hide');
        return false;
    },
    'change .plotType, change .dataFunction, change .graphFunction' :function() {
        var plotTypeStr = document.getElementById('plotGraphFunction-selection').value;
        var sPlotGraphFunctions = Session.get("PlotGraphFunctions");
        var spgf = sPlotGraphFunctions.filter(function ( obj ) {
            return obj.plotType === plotTypeStr;
        })[0];
        var plotType = document.getElementById('plotType').value;
        var dataFunction = document.getElementById('dataFunction').value;
        var graphFunction = document.getElementById('graphFunction').value;
        spgf.plotType = plotType;
        spgf.dataFunction = dataFunction;
        spgf.graphFunction = graphFunction;
        Session.set("PlotGraphFunctions",sPlotGraphFunctions);
    }
});


