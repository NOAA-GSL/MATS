
var width = function () {
    var vpw = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var w = .5 * Math.min(vpw,vph);
    return w + "px";
};
var height = function() {
    var vpw = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var h = .5 * Math.min(vpw,vph);
    return h + "px";
};

//$(window).on('resize orientationChange', function(event) {
Template.graph.onCreated(function() {
    $(window).resize(function() {
        //console.log($(window).height());
        document.getElementById('placeholder').style.width=width();
        document.getElementById('placeholder').style.heigth=height();
    });
});


Template.graph.helpers({
    /**
     * @return {string}
     * @return {string}
     */
    Title: function() {
        if (Settings === undefined || Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
            return "";
        } else {
            return Settings.findOne({}, {fields: {Title: 1}}).Title;
        }
    } ,
   width: function(){
        return width();
   },
   height: function() {
       return height();
   },
    curves: function () {
        return Session.get('Curves');
    },
    plotName: function() {
      return '';
    },
    curveText: function () {
        if (this.diffFrom === undefined) {
             var plotType = Session.get('plotType');
            if (plotType === undefined) {
                pfuncs = PlotGraphFunctions.find({}).fetch();
                for (var i = 0; i < pfuncs.length; i++) {
                    if (pfuncs[i].checked === true) {
                        Session.set('plotType', pfuncs[i].plotType);
                    }
                }
                plotType = Session.get('plotType');
            }
            this.regionName = this.region.split(' ')[0];
            return getCurveText(plotType, this);
        } else {
            return this.label + ":  Difference";
        }
    },
    plotText: function() {
        var p = Session.get('PlotParams');
        if (p !== undefined) {
            if ((Session.get("plotType") === undefined) || Session.get("plotType") === PlotTypes.timeSeries) {
                return p.fromDate + " - " + p.toDate + " : " + p.plotFormat;
            } else {
                return "Profile: " + p.plotFormat;
            }
        } else {
            return "no plot params";
        }
    },
    color: function() {
        return this.color;
    },
    sentAddresses: function() {
        var addresses = [];
        var a = SentAddresses.find({},{fields:{address:1}}).fetch();
        for (var i = 0; i < a.length; i++) {
            addresses.push(a[i].address);
        }
        return addresses;
    },
    displayErrorBarButton: function() {
        if ((Session.get("plotType") === undefined) || Session.get("plotType").toLowerCase() === PlotTypes.timeSeries) {
            return "none";
        } else {
            return "block";
        }
    },
    hideButtonText: function() {
        var sval = this.label + "hideButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval,'hide curve');
        }
        return Session.get(sval);
    },
    pointsButtonText: function() {
    var sval = this.label + "pointsButtonText";
    if (Session.get(sval) === undefined) {
        Session.set(sval,'hide points');
    }
    return Session.get(sval);
    },
    errorBarButtonText: function() {
        var sval = this.label + "errorBarButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval,'no error bars');
        }
        return Session.get(sval);
    }
});


Template.graph.events({
    'click .back': function() {
        document.getElementById('graph-container').style.display='none';
        document.getElementById('paramList').style.display='block';
        document.getElementById('plotList').style.display='block';
        document.getElementById('curveList').style.display='block';
        document.getElementById('plotType').style.display='block';
        document.getElementById("scatter2d").style.display = "block";

        return false;
    },
    'click .new': function() {
        window.open(location);
        return false;
    },
    'click .print' : function() {
        document.getElementById('graph-control').style.display='none';
        document.getElementById('administration').style.display='none';
        document.getElementById('navbar').style.display='none';
        document.getElementById('footnav').style.display='none';
        document.getElementById('curve-text-buttons-grp').style.display='none';
        html2canvas(document.getElementById('graph-container'), {
            onrendered: function (canvas) {
                var image = canvas.toDataURL('image/png');
                var win = window.open("","MATS Print View");
                win.document.body.innerHTML = "<html style='margin:0;padding:0;border:0;'>" +
                    '<style type="text/css">html, title, body, img { height: 100%;margin:0;padding:0;border:0 }</style>' +
                    "<head>" +
                    "</head>" +
                    "<body'>" +
                    "<img src=" + image + "></img>" +
                    "</body>" +
                    "</html>";
            }
        });
        document.getElementById('graph-control').style.display='block';
        document.getElementById('administration').style.display='block';
        document.getElementById('navbar').style.display='block';
        document.getElementById('footnav').style.display='block';
        document.getElementById('curve-text-buttons-grp').style.display='block';
    },
    'click .reload': function() {
        var dataset = Session.get('dataset');
        var options = Session.get('options');
        var graphFunction = Session.get('graphFunction');
        window[graphFunction](dataset,options);
    },
    'click .plotButton': function() {
        var plotType = getPlotType();
        document.getElementById("plotButton").style.display = "none";
        document.getElementById("textButton").style.display = "block";
        document.getElementById("plot-buttons-grp").style.display = "block";
        document.getElementById("curves").style.display = "block";
        document.getElementById("graphView").style.display = "block";
        document.getElementById("textSeriesView").style.display = "none";
        document.getElementById("textProfileView").style.display = "none";
        document.getElementById("textScatter2dView").style.display = "none";

        var graphView = document.getElementById('graphView');
        Blaze.render(Template.graph,graphView);
    },
    'click .textButton': function() {
        document.getElementById("plot-buttons-grp").style.display = "block";
        document.getElementById("plotButton").style.display = "block";
        document.getElementById("textButton").style.display = "none";
        document.getElementById("curves").style.display = "none";
        document.getElementById("graphView").style.display = "none";
        switch(getPlotType()) {
            case PlotTypes.timeSeries:
                document.getElementById("textSeriesView").style.display = "block";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "none";
                break;
            case PlotTypes.profile:
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "block";
                document.getElementById("textScatter2dView").style.display = "none";
                break;
            case PlotTypes.scatter2d:
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "block";
                break;
            default:
                console.log("Error: no plot type detected");
        } 
    },
    'click .export': function() {
        document.getElementById('text_export').click();
    },
    'click .sentAddresses': function(event) {
        var address = event.currentTarget.options[event.currentTarget.selectedIndex].value;
        document.getElementById("sendAddress").value = address;
    },
    'click .share': function() {
        // show address modal
        if (!Meteor.user()) {
            setError("You must be logged in to use the 'share' feature");
            return false;
        }
        $("#sendModal").modal('show');
    },
    'click .send': function() {
        var title = "";
        if (Settings === undefined || Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
            title = "";
        } else {
            title = Settings.findOne({}, {fields: {Title: 1}}).Title;
        }
        var plotText = "";
        var p = Session.get('PlotParams');
        if (p !== undefined) {
            plotText = p.fromDate + " - " + p.toDate + " : " + p.plotFormat;
        } else {
            plotText = "no plot params";
        }

        var subject = title + " : " + plotText;
        document.getElementById('graph-control').style.display='none';
        document.getElementById('administration').style.display='none';
        document.getElementById('navbar').style.display='none';
        document.getElementById('footnav').style.display='none';


        $("#sendModal").modal('hide');
        html2canvas(document.getElementById('graph-container'), {
            onrendered: function (canvas) {
                var toAddress = document.getElementById('sendAddress').value;
                Meteor.call('addSentAddress', toAddress, function (error) {
                    if (error) {
                        setError(error.message);
                        $("#sendModal").modal('hide');
                        return false;
                    }
                });
                var image = canvas.toDataURL('image/png');

                Meteor.call('emailImage', image, toAddress, subject, function (error) {
                    if (error) {
                        setError(error.message);
                        $("#sendModal").modal('hide');
                        return false;
                    }
                });
            }
        });
        document.getElementById('graph-control').style.display='block';
        document.getElementById('administration').style.display='block';
        document.getElementById('navbar').style.display='block';
        document.getElementById('footnav').style.display='block';
        $("#sendModal").modal('hide');
    }
   });
