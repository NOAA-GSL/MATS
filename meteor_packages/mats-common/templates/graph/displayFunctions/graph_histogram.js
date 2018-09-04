graphHistogram = function (result) {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw, vph);
    var dataset = result.data;

    var options = result.options;
    if (min < 400) {
        options.series && options.series.points && (options.series.points.radius = 1);
    } else {
        options.series && options.series.points && (options.series.points.radius = 2);
    }

    var annotation = "";
    // for (var i = 0; i < dataset.length; i++) {
    //     annotation = annotation + "<div style='color:" + dataset[i].color + "'>" + dataset[i].annotation + " </div>";
    // }

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
    // add horizontal zoom out button
    $("#zoom-out-left-right").click(function (event) {
        event.preventDefault();
        plot.zoomOutHorizontal();
    });
    // add horizontal zoom in button
    $("#zoom-in-left-right").click(function (event) {
        event.preventDefault();
        plot.zoomHorizontal();
    });
    // add vertical zoom out button
    $("#zoom-out-up-down").click(function (event) {
        event.preventDefault();
        plot.zoomOutVertical();
    });
    // add vertical zoom in button
    $("#zoom-in-up-down").click(function (event) {
        event.preventDefault();
        plot.zoomVertical();
    });
    // pan-left
    $("#pan-left").click(function (event) {
        event.preventDefault();
        plot.pan({left: -100});
    });
    // pan-right
    $("#pan-right").click(function (event) {
        event.preventDefault();
        plot.pan({left: 100});
    });
    // pan-up
    $("#pan-up").click(function (event) {
        event.preventDefault();
        plot.pan({top: 100});
    });
    // pan-down
    $("#pan-down").click(function (event) {
        event.preventDefault();
        plot.pan({top: -100});
    });

    // add replot button
    $("#refresh-plot").click(function (event) {
        event.preventDefault();
        plot = $.plot(placeholder, dataset, options);
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    });

    // add event for axis customization modal submit button
    $("#axisSubmit").click(function (event) {
        event.preventDefault();
        // get input axis limits
        var xmin = document.getElementById("xAxisMin").value;
        var xmax = document.getElementById("xAxisMax").value;
        const ymin = document.getElementById("yAxisMin").value;
        const ymax = document.getElementById("yAxisMax").value;

        // time axis needs limits to be in milliseconds
        if (options.xaxes[0].axisLabel === "Time") {
            xmin = xmin === "" ? "" : xmin * 1000;
            xmax = xmax === "" ? "" : xmax * 1000;
        }

        // store original axis limits in case the user wants to reset the plot later
        var oldXmin;
        var oldXmax;
        var oldYmin;
        var oldYmax;

        // set new limits in options map
        if (xmin !== "" && options.xaxes && options.xaxes[0]) {
            oldXmin = options.xaxes[0].min;
            options.xaxes[0].min = xmin;
        }
        if (xmax !== "" && options.xaxes && options.xaxes[0]) {
            oldXmax = options.xaxes[0].max;
            options.xaxes[0].max = xmax;
        }
        if (ymin !== "" && options.yaxes && options.yaxes[0]) {
            oldYmin = options.yaxes[0].min;
            options.yaxes[0].min = ymin;
        }
        if (ymax !== "" && options.yaxes && options.yaxes[0]) {
            oldYmax = options.yaxes[0].max;
            options.yaxes[0].max = ymax;
        }

        // get new axis labels
        const xlabel = document.getElementById("xAxisLabel").value;
        const ylabel = document.getElementById("yAxisLabel").value;

        // store original axis labels in case the user wants to reset the plot later
        var oldXlabel;
        var oldYlabel;

        // set new labels in options map
        if (xlabel !== "" && options.xaxes && options.xaxes[0]) {
            oldXlabel = options.xaxes[0].axisLabel;
            options.xaxes[0].axisLabel = xlabel;
        }
        if (ylabel !== "" && options.yaxes && options.yaxes[0]) {
            oldYlabel = options.yaxes[0].axisLabel;
            options.yaxes[0].axisLabel = ylabel;
        }

        // redraw plot
        plot = $.plot(placeholder, dataset, options);
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

        // restore original axis limits to options map
        if (oldXmin !== undefined && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].min = oldXmin;
        }
        if (oldXmax !== undefined && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].max = oldXmax;
        }
        if (oldYmin !== undefined && options.yaxes && options.yaxes[0]) {
            options.yaxes[0].min = oldYmin;
        }
        if (oldYmax !== undefined && options.yaxes && options.yaxes[0]) {
            options.yaxes[0].max = oldYmax;
        }

        // restore original axis labels to options map
        if (oldXlabel !== undefined && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].axisLabel = oldXlabel;
        }
        if (oldYlabel !== undefined && options.yaxes && options.yaxes[0]) {
            options.yaxes[0].axisLabel = oldYlabel;
        }

        $("#axisLimitModal").modal('hide');
    });

    // add show/hide buttons
    $("input[id$='-curve-show-hide-bar']").click(function (event) {
        event.preventDefault();
        var id = event.target.id;
        var label = id.replace('-curve-show-hide-bar', '');
        for (var c = 0; c < dataset.length; c++) {
            if (dataset[c].curveId == label) {
                if (dataset[c].data.length === 0) {
                    Session.set(label + "barChartButtonText", 'NO DATA');
                } else {
                    dataset[c].bars.show = !dataset[c].bars.show;
                    if (dataset[c].bars.show == true) {
                        Session.set(label + "barChartButtonText", 'hide bars');
                    } else {
                        Session.set(label + "barChartButtonText", 'show bars');
                    }
                }
            }
        }
        plot = $.plot(placeholder, dataset, options);
        // placeholder.append("<div style='position:absolute;left:100px;top:20px;color:#666;font-size:smaller'>" + annotation + "</div>");
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    });

    var zooming = false;
    // selection zooming
    placeholder.bind("plotselected", function (event, ranges) {
        zooming = true;
        event.preventDefault();
        plot.getOptions().selection.mode = 'xy';
        plot.getOptions().pan.interactive = false;
        plot.getOptions().zoom.interactive = false;
        plot = matsGraphUtils.drawGraph(ranges, dataset, options, placeholder);
        zooming = false;
    });
    matsGraphUtils.setNoDataLabels(dataset);

    var plot = $.plot(placeholder, dataset, options);
    placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

    // hide the spinner
    document.getElementById("spinner").style.display = "none";

    $("#placeholder").bind('plotclick', function (event, pos, item) {
        if (zooming) {
            zooming = false;
            return;
        }
        if (item && item.series.data[item.dataIndex][3]) {
            Session.set("data", item.series.data[item.dataIndex][3]);
            $("#dataModal").modal('show');
        }
    });
};