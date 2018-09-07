graph2dScatter = function (result) {
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
    var annotateShowHide = {};
    for (var i = 0; i < dataset.length; i++) {
        annotateShowHide[i] = "show";
        annotation = annotation + "<div style='color:" + dataset[i].color + "'>" + dataset[i].annotation + " </div>";
    }

    // figure out how many y axes there are
    const yAxisLength = options.yaxes.length;
    var yidx;
    var currentAxisKey;
    var axisKeys = [];
    var axisTranslate = {};
    var yAxisNumber = 0;
    for (yidx = 0; yidx < yAxisLength; yidx++) {
        currentAxisKey = options.yaxes[yidx].axisLabel;
        if (axisKeys.indexOf(currentAxisKey) === -1) {
            axisKeys.push(currentAxisKey);
            yAxisNumber++;
        }
        axisTranslate[yidx] = axisKeys.indexOf(currentAxisKey);
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
    for (yidx = 0; yidx < yAxisLength; yidx++) {
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
        for (yidx = 0; yidx < yAxisLength; yidx++) {
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
        var yidxTranslated;
        for (yidx = 0; yidx < yAxisLength; yidx++) {
            yidxTranslated = axisTranslate[yidx];
            ylabels.push(document.getElementById("y" + yidxTranslated + "AxisLabel").value);
            ymins.push(document.getElementById("y" + yidxTranslated + "AxisMin").value);
            ymaxs.push(document.getElementById("y" + yidxTranslated + "AxisMax").value);
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
        for (yidx = 0; yidx < yAxisLength; yidx++) {
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

    // add curves show/hide buttons -- when curve is shown/hidden, points and errorbars are likewise shown/hidden, so we need those handlers in here too.
    $("input[id$='-curve-show-hide']").click(function (event) {
        event.preventDefault();
        var id = event.target.id;
        var curveLabel = id.replace('-curve-show-hide', '');
        var label = curveLabel + '-best fit';
        for (var c = 0; c < dataset.length; c++) {
            // find the bestfit line - if it exists
            if (dataset[c].label && (dataset[c].label).search(label) > -1) {
                if (dataset[c].data.length === 0) {
                    Session.set(label + "hideButtonText", 'NO DATA');
                } else {
                    dataset[c].lines.show = !dataset[c].lines.show;
                    if (dataset[c].lines.show == true) {
                        Session.set(curveLabel + "hideButtonText", 'hide curve');
                    } else {
                        Session.set(curveLabel + "hideButtonText", 'show curve');
                    }
                }
            }
        }
        plot = $.plot(placeholder, dataset, options);
        // placeholder.append("<div style='position:absolute;left:100px;top:20px;color:#666;font-size:smaller'>" + annotation + "</div>");
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    });

    // add points show/hide buttons
    $("input[id$='-curve-show-hide-points']").click(function (event) {
        event.preventDefault();
        var id = event.target.id;
        var label = id.replace('-curve-show-hide-points', '');
        for (var c = 0; c < dataset.length; c++) {
            if (dataset[c].curveId == label) {
                dataset[c].points.show = !dataset[c].points.show;
                if (dataset[c].data.length === 0) {
                    Session.set(label + "pointsButtonText", 'NO DATA');
                } else {
                    if (dataset[c].points.show == true) {
                        Session.set(label + "pointsButtonText", 'hide points');
                    } else {
                        Session.set(label + "pointsButtonText", 'show points');
                    }
                }
            }
        }
        plot = $.plot(placeholder, dataset, options);
        //placeholder.append("<div style='position:absolute;left:100px;top:20px;color:#666;font-size:smaller'>" + annotation + "</div>");
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    });

    // add annotation show/hide buttons
    $("input[id$='-curve-show-hide-annotate']").click(function (event) {
        event.preventDefault();
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-annotate', '');
        var annotation = "";
        for (var c = 0; c < dataset.length; c++) {
            if (dataset[c].curveId == label) {
                if (dataset[c].data.length === 0) {
                    Session.set(label + "annotateButtonText", 'NO DATA');
                } else {
                    if (annotateShowHide[c] === "hide") {
                        annotateShowHide[c] = "show";
                        Session.set(label + "annotateButtonText", 'hide annotation');
                    } else {
                        annotateShowHide[c] = "hide";
                        Session.set(label + "annotateButtonText", 'show annotation');
                    }
                }
            }
            if (annotateShowHide[c] === "show") {
                annotation = annotation + "<div style='color:" + dataset[c].color + "'>" + dataset[c].annotation + " </div>";
            }
        }
        plot = $.plot(placeholder, dataset, options);
        //placeholder.append("<div style='position:absolute;left:100px;top:20px;color:#666;font-size:smaller'>" + annotation + "</div>");
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

    // draw initial plot - we do this a little funky,
    // we essentially create a range that is the size of the max data, then do what the zoom (plotSelected) would do
    // which causes the normalization of the axes.
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
        if (item && item.series.data[item.dataIndex][2]) {
            Session.set("data", item.series.data[item.dataIndex][2]);
            $("#dataModal").modal('show');
        }
    });
};