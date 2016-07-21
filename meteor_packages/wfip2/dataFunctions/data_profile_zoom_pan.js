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
        //console.log("dateArray=" + dateArray);
        var month = dateArray[1];
        var day = dateArray[2];
        var yr = dateArray[0];

        var my_date = new Date(yr, month-1, day,0);
        //console.log("my_date=" + my_date);
        // to UTC time, not local time
        var date_in_secs = my_date.getTime();
    }
    // to UTC time, not local time
    //return date_in_secs/1000 -3600*6;
    return date_in_secs/1000 ;

};



//var queryWFIP2DB = function (statement, validTimeStr, statisticSelect, label) {
var queryWFIP2DB = function (statement) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var ws_z = {};
    var time_z = {};
    var site_z ={};
    var site_z_time ={};
    var ws_z_time = {};
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

                for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    //var avVal = Number(rows[rowIndex].z);
                    var z = (rows[rowIndex].z);
                    var avVal = z.substring(1, z.length - 1);
                    var ws = rows[rowIndex].ws;
                    var stat = ws.substring(1, ws.length - 1);
                    var valid_utc = Number(rows[rowIndex].valid_utc);
                    var site_id = Number(rows[rowIndex].sites_siteid);


                    var sub_values = avVal.split(',');
                    var sub_ws = stat.split(',').map(Number);


                    for (var j = 0; j < sub_ws.length; j++) {
                        var this_z = Number(sub_values[j]);
                        var this_ws = sub_ws[j];

                        if (ws_z[this_z] === undefined) {
                            ws_z[this_z] = [];
                        }

                        ws_z[this_z].push(this_ws);


                        if (site_z_time[this_z] === undefined) {
                            site_z_time[this_z] = {};
                        }
                        if (site_z_time[this_z][valid_utc] === undefined) {
                            site_z_time[this_z][valid_utc] = [];

                        }

                        site_z_time[this_z][valid_utc].push(site_id);

                        if (ws_z_time[this_z] === undefined) {
                            ws_z_time[this_z] = {};
                        }
                        if (ws_z_time[this_z][valid_utc] === undefined) {
                            ws_z_time[this_z][valid_utc] = [];

                        }

                        ws_z_time[this_z][valid_utc].push(this_ws);

                    }

                }// end of loop row


                var max_sample_level = 0;
                var keys = Object.keys(ws_z);
                for (var jj = 0; jj < keys.length; jj++) {
                    var key = keys[jj];
                    if (ws_z[key].length > max_sample_level) {
                        max_sample_level = ws_z[key].length;
                    }
                }


                for (var jj = 0; jj < keys.length; jj++) {
                    var key = keys[jj];
                    var ws_array = ws_z[key];

                    var mean_ws;
                    var sum_ws = 0;

                    if (ws_array.length > 0.5 * max_sample_level) {

                        for (var jjj = 0; jjj < ws_array.length; jjj++) {
                            sum_ws = sum_ws + ws_array[jjj];
                        }
                        mean_ws = sum_ws / ws_array.length;

                        d.push([mean_ws, key, -1]);
                        // d.push([mean_ws, key]);

                    }
                }


                // done waiting - have results
                dFuture['return']();
            }
            }
    );
    // wait for future to finish
    dFuture.wait();

    //return d;

    return {
        data: d,
        error: error,
        ws_z_time: ws_z_time,
        site_z_time: site_z_time,

        ymin: ymin,
        ymax: ymax,
        // N0: N0,
        // N_times: N_times,
        //N0: 20,
        //N_times: 20,
        //averageStr: averageStr,
        //interval: interval
    };


};

var get_err = function (sub_val_array, sub_secs_array) {
    var n = sub_val_array.length;
    var n_good =0;
    var sum_d=0;
    var sum2_d =0;
    for(var i=0; i< n; i++ ){
        n_good = n_good +1;
        sum_d = sum_d + sub_val_array[i];
        sum2_d = sum2_d + sub_val_array[i] * sub_val_array[i];
    }
    var d_mean = sum_d/n_good;
    var sd2 = sum2_d/n_good - d_mean *d_mean;
    var sd = Math.sqrt(sd2);
    // find minimum delta_time, if any value missing, set null
    var last_secs = -1e30;
    var min_delta = 1e30;
    var min_secs = 1e30;
    var max_secs = -1e30;

    for(i=0; i< sub_secs_array.length; i++){
        var secs = (sub_secs_array[i]);
        var delta = secs - last_secs;
        if(delta < min_delta) {
            min_delta = delta;
        }
        if(secs < min_secs) {
            min_secs = secs;
        }
        if(secs >max_secs) {
            max_secs = secs;
        }
        last_secs = secs;
    }

    var data_wg =[];
    var n_gaps =0;
    var loopTime =min_secs;

    while (loopTime < max_secs+1) {

        if(sub_secs_array.indexOf(loopTime)<0){
            data_wg.push(null);
            n_gaps = n_gaps+1;
        } else{
            var d_idx = sub_secs_array.indexOf(loopTime);
            data_wg.push(sub_val_array[d_idx]);
        }
        loopTime = loopTime + min_delta;
    }

    var r =[];
    for(var lag=0;lag<=1; lag++) {
        r[lag] = 0;
        var n_in_lag = 0;
        for (var t = 0; t < n - lag; t++) {
            if (data_wg[t] != null && data_wg[t + lag] != null) {
                r[lag] = r[lag] + (data_wg[t] - d_mean) * (data_wg[t + lag] - d_mean);
                n_in_lag++;
            }
        }
        if (n_in_lag > 0 && sd > 0) {
            r[lag] = r[lag] / (n_in_lag * sd * sd);
        } else {
            r[lag] = null;
        }
    }
   // console.log("===");
   // console.log ("r[1]= " +r[1]);
    // Betsy Weatherhead's correction, based on lag 1
    if(r[1] >= 1) {
        r[1] = .99999;
    }


    var betsy = Math.sqrt((n_good-1)*(1. - r[1]));
    var stde_betsy;
    if(betsy != 0) {
        stde_betsy = sd/betsy;
    } else {
        stde_betsy = null;
    }

   // console.log ("stde_besty= " +  stde_betsy +" sd="+sd+" besty="+betsy);
   // console.log ("n_good= " +  n_good +" r[1]="+r[1]);
  //  console.log("===");
    return {d_mean:d_mean,stde_betsy:stde_betsy,n_good:n_good,lag1:r[1]};
};

dataProfileZoom = function(plotParams, plotFunction) {
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

    var fromDateStr = plotParams.fromDate;
    var fromDate = dateConvert(fromDateStr);
    var toDateStr = plotParams.toDate;
    var toDate = dateConvert(toDateStr);
    var matching = plotParams.plotAction === PlotActions.matched;
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;



    console.log(" curvsLength!!!!!!!!!!!!!="+curvesLength );
    var dataset = [];
    //var variableStatSet = Object.create(null);

    var siteIds = {};
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom; // [minuend, subtrahend]
        var label = curve['label'];
        var data_source = curve['data source'];
        var tmp = CurveParams.findOne({name: 'data source'}).optionsMap[curve['data source']][0].split(',');
        var model =  tmp[0];
        var instrument_id = tmp[1];
        var region = CurveParams.findOne({name: 'region'}).optionsMap[curve['region']][0];

        var siteNames = curve['sites'];
        siteIds[curveIndex] = [];


        for (var i = 0; i < siteNames.length; i++) {
            var siteId = SiteMap.findOne({siteName:siteNames[i]}).siteId;
            siteIds[curveIndex].push(siteId);
        }

        console.log("ci="+curveIndex+" length siteIds=" + siteIds[curveIndex].length);
        //var siteid = CurveParams.findOne({name: 'sites'}).optionsMap[curve['sites']];
        var instruments_instrid= CurveParams.findOne({name: 'data source'}).optionsMap[curve['data source']][1];
        var curveDatesDateRangeFrom = dateConvert(curve['curve-dates-dateRange-from']);
        var curveDatesDateRangeTo = dateConvert(curve['curve-dates-dateRange-to']);
        var top = curve['top'];
        var bottom = curve['bottom'];
        var color = curve['color'];
        var variableStr = curve['variable'];
        var variableOptionsMap = CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][PlotTypes.profile];
        var variable = variableOptionsMap[variableStr];
        // var statisticSelect = curve['statistic'];
        // var statisticOptionsMap = CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        // var statistic;
        // if (variableStr == 'winds') {
        //     statistic = statisticOptionsMap[statisticSelect][1];
        // } else {
        //     statistic = statisticOptionsMap[statisticSelect][0];
        // }
        // statistic = statistic + "," + statisticOptionsMap[statisticSelect][2];
        // statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
        // statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
        // var validTimeStr = curve['valid time'];
        // var validTimeOptionsMap = CurveParams.findOne({name: 'valid time'}, {optionsMap: 1})['optionsMap'];
        // var validTime = validTimeOptionsMap[validTimeStr][0];
        var forecastLength = curve['forecast length'];
        // variableStat is used to determine which axis a curve should use.
        // This variableStatSet object is used like a set and if a curve has the same
        // variable and statistic (variableStat) it will use the same axis,
        // The axis number is assigned to the variableStatSet value, which is the variableStat.
        //var variableStat = variableStr + ":" + statisticSelect;
        //curves[curveIndex].variableStat = variableStat; // stash the variableStat to use it later for axis options
        var d = [];
        if (diffFrom == null) {

            if(model.includes("recs")){  //obs
               var statement = "select sites_siteid,valid_utc,z,ws " +
                    " from obs_recs as o ," + model + "   as s " +
                    //" where valid_utc=1454526000 " +
                    " where valid_utc >= "+ secsConvert(curveDatesDateRangeFrom) +
                    " and valid_utc <= " +  secsConvert(curveDatesDateRangeTo) +
                    " and obs_recs_obsrecid = o.obsrecid " +
                    " and instruments_instrid=" + instrument_id;
            }else{//model
               var statement="select sites_siteid,valid_utc,z ,ws " +
                        " from "+model+", nwp_recs  " +
                         "where valid_utc>= "+ secsConvert(fromDate)+
                         //" and analysis_utc+fcst_end_utc>="+  secsConvert(curveDatesDateRangeFrom) +
                    "  and valid_utc<= "+ secsConvert(toDate) +
                    //" and analysis_utc+fcst_end_utc <="+  secsConvert(curveDatesDateRangeTo) +
                    " and nwps_nwpid= " + instrument_id+
                    " and nwp_recs_nwprecid=nwprecid " +
                    " and fcst_end_utc="+3600*forecastLength;
            }
           // statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")";
            statement = statement + "  and sites_siteid in (" + siteIds[curveIndex].toString() + ")";
            console.log("query=" + statement);

            var ws_z_time;
            var site_z_time;
            //var queryResult = queryWFIP2DB(statement, validTimeStr, statisticSelect, label);
            var queryResult = queryWFIP2DB(statement);
            d = queryResult.data;
            console.log("d[0]=" + d[0]);

            if (d[0] === undefined) {
                    //    no data set emply array
                    d[0]=[];

                } else {

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
        // if (variableStat in variableStatSet) {
        //     yAxisIndex = variableStatSet[variableStat].index;
        //     variableStatSet[variableStat].label = variableStatSet[variableStat].label + " | " + label;
        // } else {
        //     variableStatSet[variableStat] = {index: curveIndex + 1, label: label};
        // }

//        console.log("before option" );
        var options = {
            //yaxis: variableStatSet[variableStat].index,
            label: label,
            color: color,
            data: d,
            ws_z_time: ws_z_time,
            site_z_time: site_z_time,
            points: {
                symbol: pointSymbol,
                fillColor: color,
                show: true,
                errorbars: "x",
                xerr: {
                    show: true,
                    asymmetric: false,
                    upperCap: "-",
                    lowerCap: "-",
                    color: color,
                    radius: 1
                }
            },
            lines: {
                show: true,
                fill: false
            }
        };
//        console.log("after option" );
        dataset.push(options);
//        console.log("after push" );
    }

    // match the data by subseconds
    // build an array of sub_second arrays
    // data is [stat(ws),avVal(z),sub_values,sub_secs]
    //d.push([mean_ws, z, -1]);
    if (matching) {

        console.log(" in matching" );

        if (diffFrom != null) {
            var numCurves = diffFrom.length;
        }else{
            var numCurves = curves.length;
        }


        var num_all_sites =0;
        var all_curve_z = [];

        var single_stn = true;

        for (var ci= 0; ci < numCurves; ci++) {
            var this_id = dataset[ci].site;

          //  if (this_id === "All") {
           //     num_all_sites = num_all_sites + 1;
          //  }

            var data = dataset[ci].data;
            var this_curve_z =[];
            for (var di = 0; di < data.length; di++) {

                var this_z = data[di][1];
                this_curve_z.push(this_z);
            }

            all_curve_z.push(this_curve_z);

            if (siteIds[ci].length!=1){
                single_stn = false;
            }
        }




        console.log(" after get z!!!!!!!!!!!!!" );

        for (var ci= 0; ci < numCurves; ci++) {
            dataset[ci].data=[]
        }

        console.log(" after empty data!!!!!!!!!!!!!" );


         var subZIntersection = _.intersection.apply(this,all_curve_z);

        for (var zi= 0; zi < subZIntersection.length; zi++) {

          //  console.log(" reassign value!!!!!!!!!!!!!" );
            var common_z = subZIntersection[zi];
            var all_time =[];

            for (curveIndex = 0; curveIndex < numCurves; curveIndex++){

                var this_time_z = Object.keys(dataset[curveIndex].ws_z_time[common_z]);
                all_time.push(this_time_z);

            }

            var subSecIntersection = _.intersection.apply(this,all_time);

          //  if (num_all_sites ===numCurves){ // all curves with selection of all stations
            if( single_stn == false){

                var stnsIntersection={};

               for (var si=0; si<subSecIntersection.length; si++){

                   var this_secs = subSecIntersection[si];
                   var all_site =[];


                    for (var ci = 0; ci < numCurves; ci++) {
                        var these_stns = dataset[ci].site_z_time[common_z][this_secs];
                        all_site.push(these_stns);
                    }
                    stnsIntersection[this_secs] = _.intersection.apply(this, all_site);
                 //  console.log("all_site="+ all_site );
                 //  console.log("this_secs="+ this_secs+ " stn="+stnsIntersection[this_secs] );

                }


           }


            for (curveIndex = 0; curveIndex < numCurves; curveIndex++){


                var new_ws_list =[];


                for (var si=0; si<subSecIntersection.length; si++){

                    var this_secs = subSecIntersection[si];

                    var this_ws_z_time = dataset[curveIndex].ws_z_time[common_z][this_secs];

                    var new_ws;

                   // if(num_all_sites==numCurves){
                    if( single_stn == false){
                        for (var stni = 0; stni < stnsIntersection[this_secs].length; stni++) {
                            var this_stn = stnsIntersection[this_secs][stni];
                            var this_index = dataset[curveIndex].site_z_time[common_z][this_secs].indexOf(this_stn);

                            new_ws = dataset[curveIndex].ws_z_time[common_z][this_secs][this_index];
                            new_ws_list.push (new_ws);

                        }

                    }

                    else{

                       new_ws = this_ws_z_time;
                        new_ws_list.push(new_ws);
                    }
                }


                var flattened = new_ws_list.reduce(function (a, b) {
                    return a.concat(b);
                }, []);



                if (flattened.length > 0) {
                    var new_mean = 0;
                    for (var ii = 0; ii < flattened.length; ii++) {

                        new_mean = new_mean + flattened[ii];

                    }

                    dataset[curveIndex].data.push([new_mean / flattened.length,common_z,-1]);
                }



            }

        }

        console.log("11 dataset[0] ="+ dataset[0].data);


        for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
            var curve = curves[curveIndex];
            var diffFrom = curve.diffFrom; // [minuend, subtrahend]


            if (diffFrom != null) {

                console.log("in diffFrom="+ diffFrom);
                var minuendIndex = diffFrom[0];
                var subtrahendIndex = diffFrom[1];
                var minuendData = dataset[minuendIndex].data;
                var subtrahendData = dataset[subtrahendIndex].data;

                console.log(" minuendData ="+minuendData);

                console.log("22 dataset[0] ="+ dataset[0].data);

                // do the differencing
                //[stat,avVal,sub_values,sub_secs] -- avVal is pressure level
                d =[];
                var l = minuendData.length < subtrahendData.length ? minuendData.length : subtrahendData.length;
                for (var i = 0; i < l; i++) { // each pressure level
                    d[i] = [];
                //    d[i][3] = [];
                //    d[i][4] = [];
                    // pressure level
                    d[i][1] = subtrahendData[i][1];
                    // values diff
                    d[i][0] = minuendData[i][0] - subtrahendData[i][0];
                    d[i][2] =-1;
                    // do the subValues
                 //   var minuendDataSubValues = minuendData[i][3];
                 //   var minuendDataSubSeconds = minuendData[i][4];
                  //  var subtrahendDataSubValues = subtrahendData[i][3];
                   // var subtrahendDataSubSeconds = subtrahendData[i][4];
                    // find the intersection of the subSeconds
                   // var secondsIntersection = _.intersection(minuendDataSubSeconds, subtrahendDataSubSeconds);
                   // for (var siIndex = 0; siIndex < secondsIntersection.length - 1; siIndex++) {
                   //     d[i][4].push(secondsIntersection[siIndex]);
                   //     d[i][3].push(minuendDataSubValues[siIndex] - subtrahendDataSubValues[siIndex]);
                    //}
                }
                //d = minuendData - subtrahendData;
                console.log("diffFrom  d="+d);
                dataset[curveIndex].data = d;
               // console.log("curve="+ curveIndex+"  d="+d );

            }
        }

    }



    console.log("before dsi");
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (var dsi=0; dsi<dataset.length; dsi++) {
        var position = dsi===0?"left":"right";
        var yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: 'level above ground in meters',
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 16,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            //ticks:[[-1000,1000],[-900,900],[-800,800],[-700,700],[-600,600],[-500,500],[-400,400],[-300,300],[-200,200],[-100,100],[0,0]]
        };
        var yaxisOptions = {
            zoomRange: [0.1,10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }

    console.log("before pOptions");
    var pOptions = {
        axisLabels: {
            show: true
        },
        xaxes:[{
            axisLabel: variableStr,
            color: 'grey'
        }],
        xaxis: {
            zoomRange: [0.1,10]
        },
        yaxes:yaxes,
        yaxis:yaxis,

        legend: {
            show: false,
            container:"#legendContainer",
            noColumns: 0
        },
        series: {
            lines: {
                show: true,
                lineWidth:Settings.findOne({},{fields:{lineWidth:1}}).lineWidth
            },
            points: {
                show: true,
                radius:1
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
            // the ct value is the third [2] element of the data series for profiles. This is the tooltip content.
           // content: "<span style='font-size:150%'><strong>%ct</strong></span>"
            //content: "<span style='font-size:150%'><strong>%y</strong></span>"
            content: "<span style='font-size:150%'><strong><br>value %x<br>at %y m</strong></span>"
        }
    };

    // add black 0 line curve
    //dataset.push(dataZero = {color:'black',points:{show:false},data:[[0,-1000,"zero"],[0,-100,"zero"]]});

    console.log("before result");
    var result = {
        error: error,
        data: dataset,
        options: pOptions
    };
    plotFunction(result);
};
