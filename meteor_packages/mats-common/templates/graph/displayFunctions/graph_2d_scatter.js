graph2dScatter = function(result) {
    Session.set("spinner_img", "drawing_spinner.gif");
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
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw,vph);
    if (min < 400) {
        options.series.points.radius = 1;
    } else {
        options.series.points.radius = 2;
    }
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
            var curveLabel = id.replace('-curve-show-hide','');
            var label = curveLabel +'-best fit';
            for (var c = 0; c < dataset.length; c++) {
                // find the bestfit line - if it exists
                if (dataset[c].label.search(label) > -1) {
                    dataset[c].lines.show = !dataset[c].lines.show;
                    if (dataset[c].lines.show == true) {
                        Session.set(curveLabel + "hideButtonText", 'hide curve');
                    } else {
                        Session.set(curveLabel + "hideButtonText", 'show curve');
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
        var normalizedOptions = normalizeYAxis(ranges);
        var zOptions = $.extend(true, {}, options, normalizedOptions);
        delete zOptions.xaxes[0].max;
        delete zOptions.xaxes[0].min;
        delete zOptions.yaxes[0].max;
        delete zOptions.yaxes[0].min;
        plot = $.plot(placeholder, dataset, zOptions);
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    };

    var zooming = false;
    // selection zooming
    placeholder.bind("plotselected", function (event, ranges) {
        event.preventDefault();
        event.stopPropagation();
        zooming = true;
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
    Session.set("spinner_img", "building_spinner.gif");
    document.getElementById("spinner").style.display="none";

    $("#placeholder").bind('plotclick', function(event,pos,item) {
        if (zooming) {
            zooming= false;
            return;
        }
        if (item && item.series.data[item.dataIndex][2]) {
            Session.set("data",item.series.data[item.dataIndex][2]);
            $("#dataModal").modal('show');
        }
    });
};