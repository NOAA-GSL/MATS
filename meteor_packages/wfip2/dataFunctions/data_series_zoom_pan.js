// use future to wait for the query callback to complete
var secsConvert = function (dStr) {
    if (dStr === undefined || dStr === " ") {
        var now = new Date();
        var date = new Date(now.getUTCFullYear(), now.getUTCMonth()-1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        var date_in_secs = date.getTime();
        var yr = date.getFullYear();
        var day = date.getDate();
        var month = date.getMonth();
    }
    else {
        var dateArray = dStr.split('-');

        var month = dateArray[1];
        var day = dateArray[2];
        var yr = dateArray[0];

        var my_date = new Date(yr, month-1, day,0);

        // to UTC time, not local time
        var date_in_secs = my_date.getTime();
    }
    // to UTC time, not local time
    //return date_in_secs/1000 -3600*6;
    return date_in_secs/1000 ;

};


var queryWFIP2DB = function (statement, validTimeStr, xmin, xmax, interval, averageStr,top,bottom) {
        var dFuture = new Future();
        var d = [];  // d will contain the curve data
        var error = "";
        var N0 = [];
        var N_times = [];
        var ws_z_time = {};
        var site_z_time ={};
        // modelPool.query(statement, function (err, rows) {
        wfip2Pool.query(statement, function (err, rows) {
            // query callback - build the curve data from the results - or set an error
            if (err != undefined) {
                error = err.message;
                dFuture['return']();
            } else if (rows === undefined || rows.length === 0) {
                error = 'No data to plot: ' + err;
                // done waiting - error condition
                dFuture['return']();
            } else {
                ymin = Number(rows[0].stat);
                ymax = Number(rows[0].stat);
                var curveTime = [];
                var curveStat = [];
                var N0_max = 0;

                var ws_time = {};


                for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    var avSeconds = Number(rows[rowIndex].avtime);
                    var siteid = rows[rowIndex].sites_siteid;

                    var z = (rows[rowIndex].z);
                    var avVal = z.substring(1, z.length - 1)
                    var ws = rows[rowIndex].ws;
                    var stat = ws.substring(1, ws.length - 1)
                    //  var valid_utc = rows[rowIndex].valid_utc;

                    var sub_z = avVal.split(',');
                    var sub_ws = stat.split(',').map(Number);


                    if (ws_time[avSeconds] === undefined) {
                        ws_time[avSeconds] = [];
                    }
                    var this_mean_ws = 0;
                    var n_z = 0;
                    for (var j = 0; j < sub_ws.length; j++) {
                        var this_ws = sub_ws[j];
                        var this_z = Math.floor(sub_z[j]); // jeff put float number for level

                        // ws_z_time is for matching levels for each timestamp
                        if (ws_z_time[avSeconds] === undefined) {
                            ws_z_time[avSeconds] = {};
                        }
                        if (ws_z_time[avSeconds][this_z] === undefined) {
                            ws_z_time[avSeconds][this_z] = [];

                        }


                        if (site_z_time[avSeconds] === undefined) {
                            site_z_time[avSeconds] = {};
                        }
                        if (site_z_time[avSeconds][this_z] === undefined) {
                            site_z_time[avSeconds][this_z] = [];

                        }

                        if (this_z >= bottom && this_z <= top) {
                            this_mean_ws = this_mean_ws + this_ws;
                            n_z = n_z + 1;
                            ws_z_time[avSeconds][this_z].push(this_ws);
                            site_z_time[avSeconds][this_z].push(siteid);
                        }


                    }

                    if (n_z > 0) {

                        this_mean_ws = this_mean_ws / n_z;
                        ws_time[avSeconds].push(this_mean_ws);
                    }
                }



                var max_sample_time =0;
                var  keys = Object.keys(ws_time);
                // console.log("xue keys="+keys);
                for(var jj=0; jj<keys.length;jj++){
                    var key = keys[jj];
                    if (ws_time[key].length > max_sample_time){
                        max_sample_time=ws_time[key].length;
                    }
                }

                // multiple stations, get average values for one time stampe for some certain veritcal levels
                for(var jj=0; jj<keys.length;jj++) {
                    var key = keys[jj];
                    var ws_array = ws_time[key];

                    if (ws_array.length>0 ) {


                        var mean_ws;
                        var sum_ws = 0;

                        //  if (ws_array.length > 0.5 * max_sample_time) {

                        for (var jjj = 0; jjj < ws_array.length; jjj++) {
                            sum_ws = sum_ws + ws_array[jjj];
                        }
                        mean_ws = sum_ws / ws_array.length;


                        d.push([key * 1000, mean_ws]);
                        //     }
                    }
                }









                // done waiting - have results
                dFuture['return']();
            }
        });
        // wait for future to finish
        dFuture.wait();


        return {
            data: d,
            error: error,
            ws_z_time: ws_z_time,
            site_z_time: site_z_time,
     //         site: site,
            ymin: ymin,
            ymax: ymax,
            // N0: N0,
            // N_times: N_times,
            N0: 20,
            N_times: 20,
            averageStr: averageStr,
            interval: interval
        };
    };
//}

dataSeriesZoom = function (plotParams, plotFunction) {
    var dateConvert = function (dStr) {
        if (dStr === undefined || dStr === " ") {
            var now = new Date();
            var date = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
            var yr = date.getFullYear();
            var day = date.getDate();
            var month = date.getMonth();
            var dstr = yr + "-" + month + '-' + day;
            return dstr;
        }
        var dateArray = dStr.split('/');
        var month = dateArray[0];
        var day = dateArray[1];
        var yr = dateArray[2];
        var dstr = yr + "-" + month + '-' + day;
        return dstr;
    };

    //console.log(plotParams);
    var fromDateStr = plotParams.fromDate;
    var fromDate = dateConvert(fromDateStr);
    var toDateStr = plotParams.toDate;
    var toDate = dateConvert(toDateStr);

    var weitemp = fromDate.split("-");
    var qxmin = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    weitemp = toDate.split("-");
    var qxmax = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    var mxmax = qxmax;// used to draw zero line
    var mxmin = qxmin; // used to draw zero line
    var matching = plotParams.plotQualifier === 'matching';
    var pairwise = plotParams.plotQualifier === 'pairwise';
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var dataOptions = [];
    var variableStatSet = Object.create(null);
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        //var model = CurveParams.findOne({name: 'model'}).optionsMap[curve['model']][0];

        var tmp = CurveParams.findOne({name: 'model'}).optionsMap[curve['model']][0].split(',');
        var model = tmp[0];
        var instrument_id = tmp[1];


        var region = CurveParams.findOne({name: 'region'}).optionsMap[curve['region']][0];
        var siteid = CurveParams.findOne({name: 'sites'}).optionsMap[curve['sites']];

        var label = (curve['label']);
        var top = Number(curve['top']);
        var bottom = Number(curve['bottom']);
        var color = curve['color'];
        var variableStr = curve['variable'];
        var variableOptionsMap = CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic;
        if (variableStr == 'winds') {
            statistic = statisticOptionsMap[statisticSelect][1];
        } else {
            statistic = statisticOptionsMap[statisticSelect][0];
        }
        statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
        statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
        var validTimeStr = curve['valid time'];
        var validTimeOptionsMap = CurveParams.findOne({name: 'valid time'}, {optionsMap: 1})['optionsMap'];
        var validTime = validTimeOptionsMap[validTimeStr][0];
        var averageStr = curve['average'];
        var averageOptionsMap = CurveParams.findOne({name: 'average'}, {optionsMap: 1})['optionsMap'];
        var average = averageOptionsMap[averageStr][0];
        var forecastLength = curve['forecast length'];
        // variableStat is used to determine which axis a curve should use.
        // This variableStatSet object is used like a set and if a curve has the same
        // variable and statistic (variableStat) it will use the same axis,
        // The axis number is assigned to the variableStatSet value, which is the variableStat.
        var variableStat = variableStr + ":" + statisticSelect;
        curves[curveIndex].variableStat = variableStat; // stash the variableStat to use it later for axis options
        var xmax;
        var ymax;
        var xmin;
        var ymin;
        var interval;

        if (averageStr == "None") {
            if (validTimeStr === 'BOTH') {
                interval = 12 * 3600 * 1000;
            } else {

                interval = 24 * 3600 * 1000;
            }
        } else {
            var daycount = averageStr.replace("D", "");
            interval = daycount * 24 * 3600 * 1000;
        }
        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve

            if (model.includes("recs")) {

                statement = "select valid_utc as avtime,z,ws,sites_siteid " +
                    "from obs_recs as o , " + model +
                    " where  obs_recs_obsrecid = o.obsrecid" +
                    " and instruments_instrid=" + instrument_id +
                    " and valid_utc>=" + secsConvert(fromDate) +
                    " and valid_utc<=" + secsConvert(toDate)
                // " and valid_utc>=1454482800" + //secsConvert(fromDate) +
                // " and valid_utc<=1454486400"// + secsConvert(toDate)


            } else {

                statement = "select valid_utc as avtime ,z ,ws,sites_siteid  " +
                    "from " + model + ", nwp_recs  " +
                    " where nwps_nwpid=" + instrument_id +
                    " and nwp_recs_nwprecid=nwprecid" +
                    " and valid_utc >=" + secsConvert(fromDate) +
                    " and valid_utc<=" + secsConvert(toDate) +
                    " and fcst_end_utc=" + 3600 * forecastLength;


            }
            if (siteid != "All") {
                statement = statement +
                    "  and sites_siteid=" + siteid;

            }


            console.log("query=" + statement);

            var ws_z_time;
            var site_z_time;

            var queryResult = queryWFIP2DB(statement, validTimeStr, qxmin, qxmax, interval, averageStr, top, bottom);
            d = queryResult.data;

            console.log("d[0]=" + d[0]);
            if (d[0] === undefined) {
           //    no data set emply array
                d[0]=[];
            } else {

                xmin = d[0][0];
                xmax = d[d.length - 1][0];
                mxmax = mxmax > xmax ? xmax : mxmax;
                mxmin = mxmin < xmin ? mxmin : xmin;
                error = queryResult.error;
                ws_z_time = queryResult.ws_z_time;
                site_z_time = queryResult.site_z_time;
                 }


        }

                var pointSymbol = "circle";
                switch (curveIndex % 5) {
                    case 0:
                        pointSymbol = "circle";
                        break;
                    case 1:
                        pointSymbol = "square";
                        break;
                    case 2:
                        pointSymbol = "diamond";
                        break;
                    case 3:
                        pointSymbol = "triangle";
                        break;
                    case 4:
                        pointSymbol = "cross";
                        break;
                }
                var yAxisIndex = 1;

                if (variableStat in variableStatSet) {
                    yAxisIndex = variableStatSet[variableStat].index;
                    variableStatSet[variableStat].label = variableStatSet[variableStat].label + " | " + label;
                } else {
                    variableStatSet[variableStat] = {index: curveIndex + 1, label: label};
                }

                var mean = 0;

               //if (d[0] != undefined) {
                 for (var i = 0; i < d.length; i++) {
                        mean = mean + d[i][1];
                    }
                    mean = mean / d.length;
               // }


                var options = {
                    yaxis: variableStatSet[variableStat].index,
                    label: label,
                    ws_z_time: ws_z_time,
                    site_z_time: site_z_time,
                    site: siteid,
                    color: color,
                    mean: label + "- mean = " + mean.toPrecision(4),
                    data: d,
                    points: {symbol: pointSymbol, fillColor: color, show: true},
                    lines: {show: true, fill: false}
                };


                dataset.push(options);
        console.log(curveIndex +" mean=" + dataset[curveIndex].mean);
       // console.log("before match1 dataset="+dataset[curveIndex].data);
            }

    var numCurves = dataset.length;
    console.log(" numCurves=" + numCurves);


    if (matching) {


        var num_all_sites =0;
        for (var ci= 0; ci < numCurves; ci++) {
            var this_id = dataset[ci].site;

            if (this_id === "All"){
                num_all_sites = num_all_sites+1;
            }
        }



        var ws_z_time0 = dataset[0].ws_z_time;

        var keys_time0 = Object.keys(ws_z_time0);

        dataset[0].data=[];

        var secondsIntersection = keys_time0;
        for (var ci = 1; ci < numCurves; ci++) {
            var this_ws_z_time = dataset[ci].ws_z_time;
            var keys_time = Object.keys(this_ws_z_time);

           // secondsIntersection = _.intersection(keys_time,keys_time0);
            secondsIntersection = _.intersection(keys_time,secondsIntersection);
            dataset[ci].data =[];
        }

        //console.log("secondsInte=" + secondsIntersection);
        // for each timestamp, look for common levels btw curves
        for (var si = 0; si < secondsIntersection.length; si++) {
            var this_secs = secondsIntersection[si];
            var these_z0 = Object.keys(dataset[0].ws_z_time[this_secs]);
           // console.log("these_secs=" + this_secs);

            var zsIntersection = these_z0;

            // common levels for this time btw curves
            for (var ci = 1; ci < numCurves; ci++) {
                var these_z = Object.keys(dataset[ci].ws_z_time[this_secs]);
                zsIntersection = _.intersection(these_z,zsIntersection);

            }

            //console.log("zsInte=" + zsIntersection);
            // at this time, this commonn levels, looking for common stns


            if (num_all_sites ===numCurves){ // all curves with selection of all stations
                var stnsIntersection={};
                for(var zi=0; zi<zsIntersection.length; zi++) {
                    var this_z = zsIntersection[zi];
                    var these_stn0 = dataset[0].site_z_time[this_secs][this_z];
                    stnsIntersection[this_z] = these_stn0;
                    for (var ci = 1; ci < numCurves; ci++) {
                        var these_stns = dataset[ci].site_z_time[this_secs][this_z];
                       // stnsIntersection[this_z] = _.intersection(these_stns, these_stn0);
                        stnsIntersection[this_z] = _.intersection(these_stns, stnsIntersection[this_z]);
                    }

                }
            }


            for (var ci = 0; ci < numCurves; ci++) {
                    var new_ws_list = [];

                    for (var zi = 0; zi < zsIntersection.length; zi++) {
                        var this_z = zsIntersection[zi];
                        var new_ws;

                        if (num_all_sites ===numCurves) { // all curves with selection of all stations

                            for (var stni = 0; stni < stnsIntersection[this_z].length; stni++) {
                                var this_stn = stnsIntersection[this_z][stni];
                                var this_index = dataset[ci].site_z_time[this_secs][this_z].indexOf(this_stn);

                                new_ws = dataset[ci].ws_z_time[this_secs][this_z][this_index];
                                new_ws_list.push (new_ws);


                            }

                        }else{
                                new_ws = dataset[ci].ws_z_time[this_secs][this_z];
                                new_ws_list.push (new_ws);

                        }

                    }

                    var flattened = new_ws_list.reduce(function (a, b) {
                        return a.concat(b);
                    }, []);


                    if (flattened.length > 0) {
                        var new_mean = 0;
                        for (var ii = 0; ii < flattened.length; ii++) {
                            // console.log("new_ws_list="+ii+" "+new_ws_list[ii]);
                            new_mean = new_mean + flattened[ii];

                        }
                        dataset[ci].data.push([this_secs * 1000, new_mean / flattened.length]);
                    }

                var mean =0 ;
                var d = dataset[ci].data;
                for (var i = 0; i < d.length; i++) {
                    mean =   mean +d[i][1];
                }
                mean = mean/d.length;
                dataset[ci].mean = label + "- mean = " + mean.toPrecision(4);

            }


        }

        var dataLength = dataset[0].data.length;

        var matchNullIndexes = [];
        for (var di = 0; di < dataLength; di++) {
            for (var ci = 0; ci < numCurves; ci++) {

                if ((dataset[ci].data[di] === undefined) || (dataset[ci].data[di][0] === null) || (dataset[ci].data[di][1] === null)) {
                    matchNullIndexes.push(di);
                    break;
                }
            }
        }
        for (var mi = 0; mi < matchNullIndexes.length; mi++) {
            var index = matchNullIndexes[mi];
            for (var ci = 0; ci < numCurves; ci++) {
                if (dataset[ci].data[index] !== undefined) {
                    dataset[ci].data[index][1] = null;
                }
            }
        }


        for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
            var curve = curves[curveIndex];
            var diffFrom = curve.diffFrom;

        if (diffFrom != null) {


            var minuendIndex = diffFrom[0];
            var subtrahendIndex = diffFrom[1];
            var minuendData = dataset[minuendIndex].data;
            var subtrahendData = dataset[subtrahendIndex].data;
            var minuendDataOptions = dataOptions[minuendIndex];
            // add dataset copied from minuend
            var d = [];
            // do the differencing of the data
            for (var i = 0; i < minuendData.length; i++) {
                d[i] = [];
                d[i][0] = subtrahendData[i][0];
                if (minuendData[i][1] != null && subtrahendData[i][1] != null) {
                    d[i][1] = minuendData[i][1] - subtrahendData[i][1];
                } else {
                    d[i][1] = null;
                }
                // ymin and ymax will change with diff
                ymin = ymin < d[i][1] ? ymin : d[i][1];
                ymax = ymax > d[i][1] ? ymax : d[i][1];
            }



            var mean =0 ;
            for (var i = 0; i < d.length; i++) {
                mean =   mean +d[i][1];
            }
            mean = mean/d.length;

            dataset[curveIndex].data = d;
            dataset[curveIndex].mean = label + "- mean = " + mean.toPrecision(4);

            }
        }




    }// end of match


    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        console.log(" dsi=" + dsi);

        var variableStat = curves[dsi].variableStat;
        var position = dsi === 0 ? "left" : "right";
        var yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: variableStatSet[variableStat].label + " : " + variableStat,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 16,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1
        };
        var yaxisOptions = {
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }

    var options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'time',
            color: 'grey'
        }],
        xaxis: {
            zoomRange: [0.1, 3600000000],
            mode: 'time'
        },
        yaxes: yaxes,
        yaxis: yaxis,

        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0
        },
        series: {
            lines: {
                show: true,
                lineWidth: Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: true
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            content: "<span style='font-size:150%'><strong>%s<br>%x:<br>value %y</strong></span>",
            xDateFormat: "%Y-%m-%d:%H",
            onHover: function (flotItem, $tooltipEl) {
            }
        }
    };

    // add black 0 line curve
    // need to find the minimum and maximum x value for making the zero curve


    //dataset.push(dataZero = {color: 'black', points: {show: false}, data: [[mxmin, 0, "zero"], [mxmax, 0, "zero"]]});
    var result = {
        error: error,
        data: dataset,
        options: options
    };

    plotFunction(result);



};