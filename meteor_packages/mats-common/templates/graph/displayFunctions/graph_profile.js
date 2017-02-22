graphProfile = function(result) {
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
            const id = event.target.id;
            const label = id.replace('-curve-errorbars','');
            const color = event.target.style.backgroundColor;
            for (var c = 0; c < dataset.length; c++) {
                if ((dataset[c].color).replace(/\s/g, '')  == color.replace(/\s/g, '')) {
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
            const color = event.target.style.backgroundColor.toLowerCase();
            for (var c = 0; c < dataset.length; c++) {
                if ((dataset[c].color).replace(/\s/g, '').toLowerCase()  == color.replace(/\s/g, '')) {
                    if (dataset[c].lines.show == dataset[c].points.show) {
                        dataset[c].points.show = !dataset[c].points.show;
                    }
                    dataset[c].lines.show = !dataset[c].lines.show;
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
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-points','');
        const color = event.target.style.backgroundColor.toLowerCase();
        for (var c = 0; c < dataset.length; c++) {
            if ((dataset[c].color).replace(/\s/g, '').toLowerCase()  == color.replace(/\s/g, '')) {
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
    var normalizeYAxis = function (ranges,options) {
        /*
        The range object will have one or more yaxis values.
        For 1 curve it will have ranges.yaxis
        for n curves it will have yaxis - which is the leftmost curve - and yaxis2, yaxis3, .... yaxisn which are in order left to right.
        For some reason the yaxis will duplicate one of the others so the duplicated one must be skipped.

        The options object will have a yaxes array of n objects. The 0th yaxes[0] is the leftmost curve.
        The other axis are in order left to right.

        First we sort the ranges axis to get yaxis, yaxis2, yaxis3 .... skipping the duplicated one
        Then we assign the ranges from and to values to each of the options yaxes min and max values in order.
         */
        var yaxisRangesKeys = _.difference(Object.keys(ranges), ["xaxis"]); // get just the yaxis from the ranges... yaxis, yaxis2, yaxis3...., yaxisn
        // I want the yaxis first then the y1axis y2axis etc...
        yaxisRangesKeys = ["yaxis"].concat(_.difference(Object.keys(ranges),["xaxis","yaxis"]).sort());
        var yaxisFrom = ranges['yaxis'].from;
        var yaxisTo = ranges['yaxis'].to;
        for (var i =0; i < yaxisRangesKeys.length; i++) {
            // [yaxis,y2axis,y3axis ....]
            if (i !== 0) {
                // might have to skip a duplicated axis... but never yaxis
                if (yaxisFrom == ranges[yaxisRangesKeys[i]].from && yaxisTo == ranges[yaxisRangesKeys[i]].to) {
                    continue; // this is duplicated with yaxis
        }
            }
            if (ranges[yaxisRangesKeys[i]] && options.yaxes[i]) {
                options.yaxes[i].min = ranges[yaxisRangesKeys[i]].from;
                options.yaxes[i].max = ranges[yaxisRangesKeys[i]].to;
            }
        }
        options.xaxes[0].min = ranges.xaxis.from;
        options.xaxes[0].max = ranges.xaxis.to;

        return options;
    };

    var drawGraph = function(ranges, options) {
        var zOptions = $.extend(true, {}, options, normalizeYAxis(ranges,options));
        plot = $.plot(placeholder, dataset, zOptions);
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