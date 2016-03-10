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
        console.log("dateArray=" + dateArray);
        var month = dateArray[1];
        var day = dateArray[2];
        var yr = dateArray[0];

        var my_date = new Date(yr, month-1, day,0);
        console.log("my_date=" + my_date);
        // to UTC time, not local time
        var date_in_secs = my_date.getTime();
    }
    // to UTC time, not local time
    //return date_in_secs/1000 -3600*6;
    return date_in_secs/1000 ;

};


var queryDB = function (statement, validTimeStr, xmin, xmax, interval, averageStr) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];

    // modelPool.query(statement, function (err, rows) {
    sumPool.query(statement, function (err, rows) {
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

            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avSeconds = Number(rows[rowIndex].avtime);
                var stat = rows[rowIndex].stat;
                var N0_loop = rows[rowIndex].N0;
                var N_times_loop = rows[rowIndex].N_times;

                if (N0_loop > N0) N0_max = N0_loop;
                if (N_times_loop > N_times) N_times_max = N_times_loop;

                curveTime.push(avSeconds * 1000);
                curveStat.push(stat);
                N0.push(N0_loop);
                N_times.push(N_times_loop);
            }

            if (averageStr != "None") {
                xmin = Number(rows[0].avtime) * 1000;
            }
            var loopTime = xmin;

            while (loopTime < xmax + 1) {

                if (curveTime.indexOf(loopTime) < 0) {
                    d.push([loopTime, null]);
                } else {
                    var d_idx = curveTime.indexOf(loopTime);
                    var this_N0 = N0[d_idx];
                    var this_N_times = N_times[d_idx];
                    if (this_N0 < 0.1 * N0_max || this_N_times < 0.75 * N_times_max) {
                        d.push([loopTime, null]);

                    } else {
                        d.push([loopTime, curveStat[d_idx]]);
                    }
                }
                loopTime = loopTime + interval;
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
        ymin: ymin,
        ymax: ymax,
        N0: N0,
        N_times: N_times,
        averageStr: averageStr,
        interval: interval
    };
};


var queryWFIP2DB = function (statement, validTimeStr, xmin, xmax, interval, averageStr,top,bottom,ws_z_time) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ws_z_time = {};
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
                //var stat = rows[rowIndex].stat;
                //console.log(rowIndex+" secs="+avSeconds);

                var z = (rows[rowIndex].z);
                var avVal = z.substring(1, z.length - 1)
                var ws = rows[rowIndex].ws;
                var stat = ws.substring(1, ws.length - 1)
              //  var valid_utc = rows[rowIndex].valid_utc;

                var sub_z = avVal.split(',');
                var sub_ws = stat.split(',').map(Number);

                if (ws_time[avSeconds] === undefined) {
                    ws_time[avSeconds]=[];
                }
                var this_mean_ws=0;
                var n_z =0;
                for (var j=0;j<sub_ws.length;j++) {
                    var this_ws = sub_ws[j];
                    var this_z = sub_z[j];

                    //if (ws_z_time[avSeconds][this_z] === undefined) {
                    //    ws_z_time[avSeconds,this_z]=[];
                    //}

                    if (ws_z_time[avSeconds] === undefined) {
                        ws_z_time[avSeconds] = {};
                    }
                    if (ws_z_time[avSeconds][this_z] === undefined) {
                        ws_z_time[avSeconds][this_z] = [];
                    }
                    if (this_z >= bottom && this_z <= top) {
                        this_mean_ws = this_mean_ws + this_ws;
                        n_z = n_z +1;
                        ws_z_time[avSeconds][this_z].push(this_ws)
                       // console.log(avSeconds+" this_z=" + this_z + " ws_z_time= "+ws_z_time[avSeconds][this_z] );
                    }


                }
                //this_mean_ws = this_mean_ws/sub_ws.length;

                this_mean_ws = this_mean_ws/n_z;
               // console.log("xue nz=" + n_z +" mean_ws="+this_mean_ws);
                ws_time[avSeconds].push(this_mean_ws);
                //console.log("xue ws_time"+avSeconds+"ws="+ws_time[avSeconds] );
                //N_times_loop = sub_ws.length;

                /*if (N0_loop > N0) N0_max = N0_loop;
                if (N_times_loop > N_times) N_times_max = N_times_loop;*/

               // curveTime.push(avSeconds * 1000);
               // curveStat.push(mean_ws);
                //N0.push(N0_loop);
                //N_times.push(N_times_loop);

               // d.push([avSeconds * 1000, this_mean_ws]);
            }



            var max_sample_time =0;
            var  keys = Object.keys(ws_time);
            console.log("xue keys="+keys);
            for(var jj=0; jj<keys.length;jj++){
                var key = keys[jj];
                if (ws_time[key].length > max_sample_time){
                    max_sample_time=ws_time[key].length;
                }
            }

            for(var jj=0; jj<keys.length;jj++) {
                var key = keys[jj];
                var ws_array = ws_time[key];

                var mean_ws;
                var sum_ws = 0;

               // if (ws_array.length > 0.5 * max_sample_time) {

                    for (var jjj = 0; jjj < ws_array.length; jjj++) {
                        sum_ws = sum_ws + ws_array[jjj];
                    }
                    mean_ws = sum_ws / ws_array.length;

                    d.push([key * 1000, mean_ws]);
               // }
            }






            /*   if (averageStr != "None") {
                   xmin = Number(rows[0].avtime) * 1000;
               }
               var loopTime = xmin;

               while (loopTime < xmax + 1) {

                   if (curveTime.indexOf(loopTime) < 0) {
                       d.push([loopTime, null]);
                   } else {
                       var d_idx = curveTime.indexOf(loopTime);
                       var this_N0 = N0[d_idx];
                       var this_N_times = N_times[d_idx];
                       if (this_N0 < 0.1 * N0_max || this_N_times < 0.75 * N_times_max) {
                           d.push([loopTime, null]);

                       } else {
                           d.push([loopTime, curveStat[d_idx]]);
                       }
                   }
                   loopTime = loopTime + interval;
               }*/
            // done waiting - have results
            dFuture['return']();
        }
    });
    // wait for future to finish
    dFuture.wait();

    //console.log("var_z_time="+var_z_time );
    return {
        data: d,
        error: error,
        ws_z_time: ws_z_time,
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
        var model =  tmp[0];
        var instrument_id = tmp[1];


        var region = CurveParams.findOne({name: 'region'}).optionsMap[curve['region']][0];
        var siteid = CurveParams.findOne({name: 'sites'}).optionsMap[curve['sites']];

        var label = (curve['label']);
        var top =  Number(curve['top']);
        var bottom =  Number(curve['bottom']);
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
          /*  var statement = "select {{average}} as avtime, " +
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statistic}} " +
                " from {{model}} as m0 " +
                "  where 1=1 " +
                "{{validTime}} " +
                "and m0.fcst_len = {{forecastLength}} " +
                "and m0.mb10 >= {{top}}/10 " +
                "and m0.mb10 <= {{bottom}}/10 " +
                "and m0.date >= '{{fromDate}}' " +
                "and m0.date <= '{{toDate}}' " +
                "group by avtime " +
                "order by avtime" +
                ";";

            // build the query
            //statement = statement.replace('{{model}}', model + '_Areg' + region);
            statement = statement.replace('{{model}}', model + '_'+tableRegion + region);
            statement = statement.replace('{{top}}', top);
            statement = statement.replace('{{bottom}}', bottom);
            statement = statement.replace('{{fromDate}}', fromDate);
            statement = statement.replace('{{toDate}}', toDate);
            statement = statement.replace('{{statistic}}', statistic); // statistic replacement has to happen first
            statement = statement.replace('{{validTime}}', validTime);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            statement = statement.replace('{{average}}', average);*/




            if(model.includes("recs")) {

                statement = "select valid_utc as avtime,sites_siteid,z,ws " +
                    "from obs_recs as o , " + model +
                    " where  obs_recs_obsrecid = o.obsrecid" +
                    " and instruments_instrid="+instrument_id +
                 " and valid_utc>=" + secsConvert(fromDate) +
                 " and valid_utc<=" + secsConvert(toDate)
                   // " and valid_utc>=1454482800" + //secsConvert(fromDate) +
                   // " and valid_utc<=1454486400"// + secsConvert(toDate)


            } else {

                statement ="select valid_utcs as avtime ,z ,ws  " +
                    "from "+model +", nwp_recs  " +
                    " where nwps_nwpid=" +instrument_id+
                    " and nwp_recs_nwprecid=nwprecid" +
                       " and valid_utcs >="+ secsConvert(fromDate) +
                    " and valid_utcs<=" + secsConvert(toDate)+
                    " and fcst_end_utc="+3600*forecastLength;


            }
            if (siteid != "All") {
                statement = statement +
                    "  and sites_siteid=" + siteid;

            }


            console.log("query=" + statement);
            console.log("siteid=" + siteid);
            var ws_z_time;
            var queryResult = queryWFIP2DB(statement, validTimeStr, qxmin, qxmax, interval, averageStr,top,bottom,ws_z_time);
            d = queryResult.data;
            //console.log("d=" + d);
            if (d[0] === undefined) {
                error = "No data returned";
            } else {
            }
            xmin = d[0][0];
            xmax = d[d.length - 1][0];
            mxmax = mxmax > xmax ? xmax : mxmax;
            mxmin = mxmin < xmin ? mxmin : xmin;
            error = queryResult.error;
            ws_z_time = queryResult.ws_z_time;

           // var keys_z_time = Object.keys(ws_z_time);
            //console.log("keys_z_time=" + keys_z_time);

            //console.log("ws_z_time=" + queryResult.ws_z_time);

        } else {
            // this is a difference curve
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

        var mean =0 ;


        for (var i = 0; i < d.length; i++) {
            mean =   mean +d[i][1];
        }
        mean = mean/d.length;

        var options = {
            yaxis: variableStatSet[variableStat].index,
            label: label,
            ws_z_time: ws_z_time,
            color: color,
            mean:  label + "- mean = " + mean.toPrecision(4),
            data: d,
            points: {symbol: pointSymbol, fillColor: color, show: true},
            lines: {show: true, fill: false}
        };

        dataset.push(options);
        // now we have a dense array as opposed to a sparse one with nulls being the fill value, except that they may not
        // start at the same xaxis point and they may not end at the same xaxis point.
        // We have to make them start and end at the same point (the xmin value and fill missing data with nulls).

        var numCurves = dataset.length;
    }


    for (var ci = 0; ci < numCurves; ci++) {
        console.log("c=" +ci+" "+ dataset[ci].data);
    }
    // if matching is true we need to iterate through the entire dataset by the x axis and null all entries that do
    // not have data in each curve.
    if (matching) {
        var dataLength = dataset[0].data.length;


     //   for (var ci = 0; ci < numCurves; ci++) {
     //       console.log("c=" +ci+" "+ dataset[ci].data);
     //   }

        var matchNullIndexes = [];
        for (var di = 0; di < dataLength; di++) {
        for (var ci = 0; ci < numCurves; ci++) {
                /* it is possible to have a curve that does not have any data at the front */
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
        //for (var di = 0; di < dataLength; di++) {
        var curve_time_list =[];

        var ws_z_time0 = dataset[0].ws_z_time;

        var keys_time0 = Object.keys(ws_z_time0);

        dataset[0].data=[];
        for (var ci = 1; ci < numCurves; ci++) {
            var this_ws_z_time = dataset[ci].ws_z_time;
            var keys_time = Object.keys(this_ws_z_time);

            var secondsIntersection = _.intersection(keys_time,keys_time0);

            dataset[ci].data =[];
        }

        //console.log("secondsInte=" + secondsIntersection);

        for (var si = 0; si < secondsIntersection.length; si++) {
            this_secs = secondsIntersection[si];
            var these_z0 = Object.keys(dataset[0].ws_z_time[this_secs]);
            //console.log("these_z0=" + these_z0);

            for (var ci = 1; ci < numCurves; ci++) {
                var these_z = Object.keys(dataset[ci].ws_z_time[this_secs]);
                var zsIntersection = _.intersection(these_z,these_z0);

            }
            //console.log(this_secs +" ws_z_time=" + ws_z_time[this_secs]);

            for (var ci = 0; ci < numCurves; ci++) {
                var new_ws_list=[];
                for (var zi = 0; zi < zsIntersection.length; zi++) {
                  var this_z = zsIntersection[zi];
                  // console.log("c="+ci+" "+this_secs +" z="+this_z+ " ws_z_time=" + dataset[ci].ws_z_time[this_secs][this_z]);
                  var new_ws = dataset[ci].ws_z_time[this_secs][this_z];
                 new_ws_list.push (new_ws);

               }
                //console.log("c="+ci+" "+" new_ws_list=" + new_ws_list);
                var flattened = new_ws_list.reduce(function(a, b) {
                        return a.concat(b);
                    },[]);

                var new_mean =0;
                for (var ii=0;ii<flattened.length;ii++){
                   // console.log("new_ws_list="+ii+" "+new_ws_list[ii]);
                    new_mean = new_mean +flattened[ii];

                }
                 dataset[ci].data.push([this_secs*1000,new_mean/flattened.length]);
                 //console.log("new c=" +ci+" "+ dataset[ci].data);
            }
        }

        for (var ci = 0; ci < numCurves; ci++) {
            console.log("new c=" + ci + " " + dataset[ci].data);
        }
        //console.log("curve_time_list=" + curve_time_list);
        //var secondsIntersection = _.intersection(curve_time_list);
        //console.log("zsInte=" + secondsIntersection);


      /*  this_ws_z_time = dataset[0].ws_z_time;

        var keys_time = Object.keys(this_ws_z_time);
        console.log("11 keys_time=" + keys_time);

        var keys_z_all_curves =[];
        for (var ti = 0; ti < keys_time.length; ti++) {
            console.log("key this_time=" + keys_time[ti]);
            var these_zs = this_ws_z_time[keys_time[ti]];

            keys_z = Object.keys(these_zs);
            console.log("these_zs=" + keys_z);

            for (var ci = 0; ci < numCurves; ci++) {
                var each_ws_z_time = dataset[ci].ws_z_time;

                var secondsIntersection = _.intersection(minuendDataSubSeconds, subtrahendDataSubSeconds);
            }
           /* for (var ci = 1; ci < numCurves; ci++) {
                this_ws_z_time = dataset[ci].ws_z_time;
                var keys_time = Object.keys(this_ws_z_time);
                console.log("keys_z_time=" + keys_z_time);

            }*/
    //    }




    }

    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
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
    dataset.push(dataZero = {color: 'black', points: {show: false}, data: [[mxmin, 0, "zero"], [mxmax, 0, "zero"]]});
    var result = {
        error: error,
        data: dataset,
        options: options
    };
    plotFunction(result);
};