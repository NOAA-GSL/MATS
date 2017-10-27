graphSeries = function(result) {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw,vph);
    var dataset = result.data;
    for (var i  =0; i < dataset.length; i++){
        var o = dataset[i];
        if (min < 400) {
            o.points && (o.points.radius = 1);
        } else {
            o.points && (o.points.radius = 2);
        }
    }

    var options = result.options;
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw,vph);
    if (min < 400) {
        options.series && options.series.points && (options.series.points.radius = 1);
    } else {
        options.series && options.series.points && (options.series.points.radius = 2);
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
            placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

        });

        // add show/hide buttons
        $( "input[id$='-curve-show-hide']" ).click(function (event) {
            event.preventDefault();
            const id = event.target.id;
            const label = id.replace('-curve-show-hide','');
            for (var c = 0; c < dataset.length; c++) {
                if (dataset[c].curveId == label) {
                    if (dataset[c].lines.show == dataset[c].points.show) {
                        dataset[c].points.show = !dataset[c].points.show;
                    }
                    dataset[c].lines.show = !dataset[c].lines.show;
                    if (dataset[c].data.length === 0) {
                        Session.set(label + "hideButtonText", 'NO DATA');
                        Session.set(label + "pointsButtonText", 'NO DATA');
                    } else {
                        if (dataset[c].lines.show == true) {
                            Session.set(label + "hideButtonText", 'hide curve');
                            Session.set(label + "pointsButtonText", 'hide points');
                        } else {
                            Session.set(label + "hideButtonText", 'show curve');
                            Session.set(label + "pointsButtonText", 'show points');
                        }
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
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-points','');
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

    var drawGraph = function(ranges, options) {
        var zOptions = $.extend(true, {}, options, matsGraphUtils.normalizeYAxis(ranges,options));
        plot = $.plot(placeholder, dataset, zOptions);
        placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    };

    var zooming = false;
    // selection zooming
    placeholder.bind("plotselected", function (event, ranges) {
        zooming = true;
        event.preventDefault();
        plot.getOptions().selection.mode = 'xy';
        plot.getOptions().pan.interactive = false;
        plot.getOptions().zoom.interactive = false;
        drawGraph(ranges, plot.getOptions());
    });
    matsGraphUtils.setNoDataLabels(dataset);

    var plot = $.plot(placeholder, dataset, options);
    placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");

    // hide the spinner
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