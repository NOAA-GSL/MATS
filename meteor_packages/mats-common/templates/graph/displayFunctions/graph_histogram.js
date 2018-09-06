graphHistogram = function (result) {
    // get plot info
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw, vph);

    // get dataset info
    var dataset = result.data;
    var options = result.options;
    if (min < 400) {
        options.series && options.series.points && (options.series.points.radius = 1);
    } else {
        options.series && options.series.points && (options.series.points.radius = 2);
    }

    // build annotation to stick on plot
    var annotation = "";
    // for (var i = 0; i < dataset.length; i++) {
    //     annotation = annotation + "<div style='color:" + dataset[i].color + "'>" + dataset[i].annotation + " </div>";
    // }

    // figure out how many y axes there are
    const yAxisLength = options.yaxes.length;
    var yidx;
    var currentAxisKey;
    var axisKeys = [];
    var yAxisNumber = 0;
    for (yidx = 0; yidx < yAxisLength; yidx++) {
        currentAxisKey = options.yaxes[yidx].axisLabel;
        if (axisKeys.indexOf(currentAxisKey) === -1) {
            axisKeys.push(currentAxisKey);
            yAxisNumber++;
        }
    }
    Session.set('yAxisNumber', yAxisNumber);

    // store information about the axes, for use when redrawing the plot
    var originalXaxisLabel = "";
    var originalXaxisMin = "";
    var originalXaxisMax = "";
    var originalYaxisLabels = [];
    var originalYaxisMins = [];
    var originalYaxisMaxs = [];
    if (options.xaxes && options.xaxes[0]) {
        originalXaxisLabel = options.xaxes[0].axisLabel;
        originalXaxisMin = options.xaxes[0].min;
        originalXaxisMax = options.xaxes[0].max;
    }
    for (yidx = 0; yidx < yAxisNumber; yidx++) {
        if (options.yaxes && options.yaxes[yidx]) {
            originalYaxisLabels[yidx] = options.yaxes[yidx].axisLabel;
            originalYaxisMins[yidx] = options.yaxes[yidx].min;
            originalYaxisMaxs[yidx] = options.yaxes[yidx].max;
        }
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

        // restore original axis limits and labels to options map
        if (originalXaxisLabel !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].axisLabel = originalXaxisLabel;
        }
        if (originalXaxisMin !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].min = originalXaxisMin;
        }
        if (originalXaxisMax !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].max = originalXaxisMax;
        }
        for (yidx = 0; yidx < yAxisNumber; yidx++) {
            if (originalYaxisLabels[yidx] !== undefined && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].axisLabel = originalYaxisLabels[yidx];
            }
            if (originalYaxisMins[yidx] !== undefined && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].min = originalYaxisMins[yidx];
            }
            if (originalYaxisMaxs[yidx] !== undefined && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].max = originalYaxisMaxs[yidx];
            }
        }

        plot = $.plot(placeholder, dataset, options);
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    });

    // add axis customization modal submit button
    $("#axisSubmit").click(function (event) {
        event.preventDefault();

        // get input axis limits and labels
        var xlabel = document.getElementById("xAxisLabel").value;
        var xmin = document.getElementById("xAxisMin").value;
        var xmax = document.getElementById("xAxisMax").value;
        var ylabels = [];
        var ymins = [];
        var ymaxs = [];
        for (yidx = 0; yidx < yAxisNumber; yidx++) {
            ylabels.push(document.getElementById("y" + yidx + "AxisLabel").value);
            ymins.push(document.getElementById("y" + yidx + "AxisMin").value);
            ymaxs.push(document.getElementById("y" + yidx + "AxisMax").value);
        }

        // time axis needs limits to be in milliseconds
        if (options.xaxes[0].axisLabel === "Time") {
            xmin = xmin === "" ? "" : xmin * 1000;
            xmax = xmax === "" ? "" : xmax * 1000;
        }

        // set new limits and labels in options map
        if (xlabel !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].axisLabel = xlabel;
        }
        if (xmin !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].min = xmin;
        }
        if (xmax !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].max = xmax;
        }
        for (yidx = 0; yidx < yAxisNumber; yidx++) {
            if (ylabels[yidx] !== "" && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].axisLabel = ylabels[yidx];
            }
            if (ymins[yidx] !== "" && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].min = ymins[yidx];
            }
            if (ymaxs[yidx] !== "" && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].max = ymaxs[yidx];
            }
        }

        // redraw plot
        plot = $.plot(placeholder, dataset, options);
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

        $("#axisLimitModal").modal('hide');
    });

    // add bars show/hide buttons
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

    // selection zooming
    var zooming = false;
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

    // draw the plot for the first time
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