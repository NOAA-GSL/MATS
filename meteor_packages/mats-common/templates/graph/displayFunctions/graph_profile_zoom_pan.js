graphProfileZoom = function(result) {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw,vph);
    var dataset = result.data;
    for (var i  =0; i < dataset.length; i++){
        var o = dataset[i];
        if (min < 400) {
            o.points.radius = 1;
        } else {
            o.points.radius = 2;
        }
    }
    
    var options = result.options;
    var placeholder = $("#placeholder");

        // bind to the pan, zoom, and redraw buttons
        // add zoom out button
        $("#zoom-out").click(function (event) {
                event.preventDefault();
                plot.zoomOut();
            });
        // add zoom in button
        $("#zoom-in").click(function (event) {
                event.preventDefault();
                plot.zoom();
            });
        // pan-left
        $("#pan-left").click(function (event) {
            event.preventDefault();
            plot.pan({left:-100});
        });
        // pan-right
        $("#pan-right").click(function (event) {
            event.preventDefault();
            plot.pan({left:100});
        });
        // pan-up
        $("#pan-up").click(function (event) {
            event.preventDefault();
            plot.pan({top:100});
        });
        // pan-down
        $("#pan-down").click(function (event) {
            event.preventDefault();
            plot.pan({top:-100});
        });

        // add replot button
        $("#refresh-plot").click(function (event) {
            event.preventDefault();
            plot = $.plot(placeholder, dataset, options);
        });

        var errorbars = Session.get('errorbars');
        // add errorbar buttons
        $( "input[id$='-curve-errorbars']" ).click(function (event) {
            event.preventDefault();
            var id = event.target.id;
            var label = id.replace('-curve-errorbars','');
            for (var c = 0; c < dataset.length; c++) {
                if (dataset[c].label == label) {
                    // save the errorbars
                    if (errorbars === undefined) {
                        errorbars = [];
                    }
                    if (errorbars[c] === undefined) {
                        errorbars[c] = dataset[c].points.errorbars;
                        Session.set('errorbars', errorbars);
                    }
                    if (dataset[c].points.errorbars == undefined) {
                        dataset[c].points.errorbars = errorbars[c];
                    } else {
                        dataset[c].points.errorbars = undefined;
                    }
                    if (dataset[c].points.errorbars !== undefined) {
                        Session.set(label + "errorBarButtonText", 'no error bars');
                    } else {
                        Session.set(label + "errorBarButtonText", 'error bars');
                    }
                }
            }
             plot = $.plot(placeholder, dataset, options);
        });

        // add show/hide buttons
        $( "input[id$='-curve-show-hide']" ).click(function (event) {
            event.preventDefault();
            var id = event.target.id;
            var label = id.replace('-curve-show-hide','');
            for (var c = 0; c < dataset.length; c++) {
                // save the errorbars
                // if (errorbars === undefined) {
                //     errorbars = [];
                // }
                // if (errorbars[c] === undefined) {
                //     errorbars[c] = dataset[c].points.errorbars;
                //     Session.set('errorbars', errorbars);
                // }
                if (dataset[c].label == label) {
                    if (dataset[c].lines.show == dataset[c].points.show) {
                        dataset[c].points.show = !dataset[c].points.show;
                    }
                    dataset[c].lines.show = !dataset[c].lines.show;
                    // if (dataset[c].points.show) {
                    //     dataset[c].points.errorbars = errorbars[c];
                    // } else {
                    //     dataset[c].points.errorbars = undefined;
                    // }
                    if (dataset[c].points.show == true) {
                        Session.set(label + "hideButtonText", 'hide curve');
                        Session.set(label + "pointsButtonText", 'hide points');
                    } else {
                        Session.set(label + "hideButtonText", 'show curve');
                        Session.set(label + "pointsButtonText", 'show points');
                    }
                }
            }
            plot = $.plot(placeholder, dataset, options);
        });

    // add show/hide points buttons
    $( "input[id$='-curve-show-hide-points']" ).click(function (event) {
        event.preventDefault();
        var id = event.target.id;
        var label = id.replace('-curve-show-hide-points','');
        for (var c = 0; c < dataset.length; c++) {
            if (dataset[c].label == label) {
                dataset[c].points.show = !dataset[c].points.show;
                if (dataset[c].points.show == true) {
                    Session.set(label + "pointsButtonText", 'hide points');
                } else {
                    Session.set(label + "pointsButtonText", 'show points');
                }
            }
        }
        plot = $.plot(placeholder, dataset, options);
    });

    var normalizeYAxis = function (ranges) {
        /*
         The way the axis work, if there is only one yaxis the yaxis must be an object
         but if there are multiple yaxis the yaxis must be an array.
         */
        var axis = {};
        var axisKeys = _.keys(ranges);
        for (var i = 0; i < axisKeys.length; i++) {
            var axisKey = axisKeys[i];
            axis[axisKey] = {};
            axis[axisKey].min = ranges[axisKey].from;
            axis[axisKey].max = ranges[axisKey].to;
        }
        return axis;
    };

    var drawGraph = function(ranges) {
        var zOptions = $.extend(true, {}, options, normalizeYAxis(ranges));
        plot = $.plot(placeholder, dataset, zOptions);
    };

    // selection zooming
    placeholder.bind("plotselected", function (event, ranges) {
        plot.getOptions().selection.mode = 'xy';
        plot.getOptions().pan.interactive = false;
        plot.getOptions().zoom.interactive = false;
        drawGraph(ranges);
    });

    var plot = $.plot(placeholder, dataset, options);
    // hide the spinner
    document.getElementById("spinner").style.display="none";

    $("#placeholder").bind('plotclick', function(event,pos,item) {
        if (zooming) {
            zooming= false;
            return;
        }
        if (item && item.series.data[item.dataIndex][3]) {
            Session.set("data",item.series.data[item.dataIndex][3]);
            $("#dataModal").modal('show');
        }
    });
};