graph2dScatter = function(result) {
    var dataset = result.data;
    var options = result.options;
    var annotation ="";
    for (var i=0;i<dataset.length;i++) {
        annotation = annotation+"<div style='color:"+dataset[i].color+"'>"+ dataset[i].annotation + " </div>";
    }
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
           // placeholder.append("<div style='position:absolute;left:100px;top:20px;color:#666;font-size:smaller'>" + annotation + "</div>");
            placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

        });

        // add show/hide buttons
        $( "input[id$='-curve-show-hide']" ).click(function (event) {
            event.preventDefault();
            var id = event.target.id;
            var label = id.replace('-curve-show-hide','');
            for (var c = 0; c < dataset.length; c++) {
                if (dataset[c].label == label) {
                    dataset[c].lines.show = !dataset[c].lines.show;
                    dataset[c].points.show = !dataset[c].points.show;
                    if (dataset[c].points.show == true) {
                        Session.set(label + "hideButtonText", 'hide curve');
                    } else {
                        Session.set(label + "hideButtonText", 'show curve');
                    }

                }
            }
            plot = $.plot(placeholder, dataset, options);
           // placeholder.append("<div style='position:absolute;left:100px;top:20px;color:#666;font-size:smaller'>" + annotation + "</div>");
            placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

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
        //placeholder.append("<div style='position:absolute;left:100px;top:20px;color:#666;font-size:smaller'>" + annotation + "</div>");
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

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
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    };

    // selection zooming
    placeholder.bind("plotselected", function (event, ranges) {
        plot.getOptions().selection.mode = 'xy';
        plot.getOptions().pan.interactive = false;
        plot.getOptions().zoom.interactive = false;
        drawGraph(ranges);
    });

    // draw initial plot - we do this a little funky,
    // we essentially create a range that is the size of the max data, then do what the zoom (plotSelected) would do
    // which causes the normalization of the axes.
    var plot = $.plot(placeholder, dataset, options);
    placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

    // hide the spinner
    document.getElementById("spinner").style.display="none";
};