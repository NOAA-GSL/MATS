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



var queryWFIP2DB = function (statement, validTimeStr, statisticSelect, label) {
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
                    var avVal = z.substring(1, z.length - 1)
                    var ws = rows[rowIndex].ws;
                    var stat = ws.substring(1, ws.length - 1)
                    var valid_utc = Number(rows[rowIndex].valid_utc);
                    var site_id = Number(rows[rowIndex].sites_siteid);


                    var sub_values = avVal.split(',');
                    var sub_ws = stat.split(',').map(Number);


                    for (var j=0;j<sub_ws.length;j++) {
                        var this_z = Number(sub_values[j]);
                        var this_ws = sub_ws[j];

                        if (ws_z[this_z] === undefined) {
                            ws_z[this_z]=[];
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


                var max_sample_level =0;
                var  keys = Object.keys(ws_z);
                for(var jj=0; jj<keys.length;jj++){
                    var key = keys[jj];
                    if (ws_z[key].length > max_sample_level){
                        max_sample_level=ws_z[key].length;
                    }
                }

               // console.log("max_sample_level=" + max_sample_level);

                for(var jj=0; jj<keys.length;jj++) {
                    var key = keys[jj];
                    var ws_array = ws_z[key];

                    var mean_ws;
                    var sum_ws = 0;

                    if (ws_array.length > 0.5 * max_sample_level) {

                        for (var jjj = 0; jjj < ws_array.length; jjj++) {
                            sum_ws = sum_ws + ws_array[jjj];
                        }
                        mean_ws = sum_ws / ws_array.length;

                        //d.push([mean_ws, key, -1, ws_z[key], time_z[key],site_z[key]]);
                        d.push([mean_ws, key,-1]);

                    }
                }


            }
            // done waiting - have results
            dFuture['return']();
        }
    );
    // wait for future to finish
    dFuture.wait();

    //return d;

    return {
        data: d,
      //  error: error,

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
    var matching = plotParams.plotQualifier === 'matching';
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var variableStatSet = Object.create(null);
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom; // [minuend, subtrahend]
        var label = curve['label'];

        var tmp = CurveParams.findOne({name: 'model'}).optionsMap[curve['model']][0].split(',');
        var model =  tmp[0];
        var instrument_id = tmp[1];
        var region = CurveParams.findOne({name: 'region'}).optionsMap[curve['region']][0];
        var siteid = CurveParams.findOne({name: 'sites'}).optionsMap[curve['sites']];


       var instruments_instrid= CurveParams.findOne({name: 'model'}).optionsMap[curve['model']][1];

        var curveDatesDateRangeFrom = dateConvert(curve['curve-dates-dateRange-from']);
        var curveDatesDateRangeTo = dateConvert(curve['curve-dates-dateRange-to']);



        var top = curve['top'];
        var bottom = curve['bottom'];
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
        statistic = statistic + "," + statisticOptionsMap[statisticSelect][2];
        statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
        statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
        var validTimeStr = curve['valid time'];
        var validTimeOptionsMap = CurveParams.findOne({name: 'valid time'}, {optionsMap: 1})['optionsMap'];
        var validTime = validTimeOptionsMap[validTimeStr][0];
        var forecastLength = curve['forecast length'];
        // variableStat is used to determine which axis a curve should use.
        // This variableStatSet object is used like a set and if a curve has the same
        // variable and statistic (variableStat) it will use the same axis,
        // The axis number is assigned to the variableStatSet value, which is the variableStat.
        var variableStat = variableStr + ":" + statisticSelect;
        curves[curveIndex].variableStat = variableStat; // stash the variableStat to use it later for axis options
        var d = [];
        if (diffFrom == null) {

            if(model.includes("recs")){  //obs
               var statement = "select sites_siteid,valid_utc,z,ws " +
                    " from obs_recs as o ," + model + "   as s " +
                    //" where valid_utc=1454526000 " +
                    " where valid_utc >= "+ secsConvert(curveDatesDateRangeFrom) +
                    " and valid_utc <= " +  secsConvert(curveDatesDateRangeTo) +
                    " and obs_recs_obsrecid = o.obsrecid " +
                    " and instruments_instrid=" + instrument_id

                    if (siteid !="All"){
                        statement = statement +
                            "  and sites_siteid="+siteid;

                    }





            }else{//model


               var statement="select sites_siteid,valid_utc,z ,ws " +
                        " from "+model+", nwp_recs  " +
                         "where valid_utc>= "+ secsConvert(curveDatesDateRangeFrom)+
                         " and analysis_utc+fcst_end_utc>="+  secsConvert(curveDatesDateRangeFrom) +
                    "  and valid_utc<= "+ secsConvert(curveDatesDateRangeTo) +
                    " and analysis_utc+fcst_end_utc <="+  secsConvert(curveDatesDateRangeTo) +
                    " and nwps_nwpid= " + instrument_id+
                    " and nwp_recs_nwprecid=nwprecid " +
                    " and fcst_end_utc="+3600*forecastLength;

                if (siteid !="All"){
                    statement = statement +
                        "  and sites_siteid="+siteid;

                }


            }

            console.log("model=" + model);
            console.log("forecastLength=" + forecastLength);
            console.log("query=" + statement);


            var queryResult = queryWFIP2DB(statement, validTimeStr, statisticSelect, label);
            d = queryResult.data;

            ws_z_time = queryResult.ws_z_time;
            site_z_time = queryResult.site_z_time;


        } else {
            // this is a difference curve
            var minuendIndex = diffFrom[0];
            var subtrahendIndex = diffFrom[1];
            var minuendData = dataset[minuendIndex].data;
            var subtrahendData = dataset[subtrahendIndex].data;

            // do the differencing
            //[stat,avVal,sub_values,sub_secs] -- avVal is pressure level
            var l = minuendData.length < subtrahendData.length?minuendData.length:subtrahendData.length;
            for (var i = 0; i < l; i++) { // each pressure level
                d[i] = [];
                d[i][3] = [];
                d[i][4] = [];
                // pressure level
                d[i][1] = subtrahendData[i][1];
                // values diff
                d[i][0] = minuendData[i][0] - subtrahendData[i][0];
                // do the subValues
                var minuendDataSubValues =   minuendData[i][3];
                var minuendDataSubSeconds =   minuendData[i][4];
                var subtrahendDataSubValues =   subtrahendData[i][3];
                var subtrahendDataSubSeconds =   subtrahendData[i][4];
                // find the intersection of the subSeconds
                var secondsIntersection = _.intersection(minuendDataSubSeconds,subtrahendDataSubSeconds);
                for (var siIndex=0; siIndex<secondsIntersection.length-1;siIndex++) {
                    d[i][4].push(secondsIntersection[siIndex]);
                    d[i][3].push(minuendDataSubValues[siIndex] - subtrahendDataSubValues[siIndex]);
                }
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

        var options = {
            yaxis: variableStatSet[variableStat].index,
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
                    radius: null
                }
            },
            lines: {
                show: true,
                fill: false
            }
        };
        dataset.push(options);
    }

    // match the data by subseconds
    // build an array of sub_second arrays
    // data is [stat(ws),avVal(z),sub_values,sub_secs]
    //d.push([mean_ws, z, -1]);
    if (matching) {

        console.log(" in matching" );
        var num_all_sites =0;
        var all_curve_z = [];
        for (var ci= 0; ci < curvesLength; ci++) {
            var this_id = dataset[ci].site;

            if (this_id === "All") {
                num_all_sites = num_all_sites + 1;
            }

            var data = dataset[ci].data;
            var this_curve_z =[];
            for (var di = 0; di < data.length; di++) {

                var this_z = data[di][1];
                this_curve_z.push(this_z);
            }

            all_curve_z.push(this_curve_z);
        }



        //only do matching for common levels ; if A has 10 levels, B has 20 levels, first 10 levels match, 2nd 10 levels keep original values

         var subZIntersection = _.intersection.apply(this,all_curve_z);

        for (var zi= 0; zi < subZIntersection.length; zi++) {

            var common_z = subZIntersection[zi];
            var all_time =[];



            for (curveIndex = 0; curveIndex < curvesLength; curveIndex++){
                //var this_time_z = dataset[curveIndex].time_z[common_z];
                var this_time_z = Object.keys(dataset[curveIndex].ws_z_time[common_z]);
                all_time.push(this_time_z);

            }


            var subSecIntersection = _.intersection.apply(this,all_time);


            if (num_all_sites ===curvesLength){ // all curves with selection of all stations
                var stnsIntersection={};

               for (var si=0; si<subSecIntersection.length; si++){

                   var this_secs = subSecIntersection[si];
                   var all_site =[];


                    for (var ci = 0; ci < curvesLength; ci++) {
                        var these_stns = dataset[ci].site_z_time[common_z][this_secs];
                        all_site.push(these_stns);
                    }
                    stnsIntersection[this_secs] = _.intersection.apply(this, all_site);


                }


            }


            for (curveIndex = 0; curveIndex < curvesLength; curveIndex++){


                var new_ws_list =[];


                for (var si=0; si<subSecIntersection.length; si++){

                    var this_secs = subSecIntersection[si];

                    var this_ws_z_time = dataset[curveIndex].ws_z_time[common_z][this_secs];

                    var new_ws;

                    if(num_all_sites==curvesLength){

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
                        // console.log("new_ws_list="+ii+" "+new_ws_list[ii]);
                        new_mean = new_mean + flattened[ii];

                    }

                    //dataset[curveIndex].data.push([new_mean / flattened.length,common_z]);
                }

                var di=0;
                while(di<data.length){
                    if(data[di][1]===common_z){break;}
                    else{di= di+1;}

                }
                dataset[curveIndex].data[di]=[new_mean / flattened.length,common_z,-1];




            }

        }

       /* for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
            var curve = curves[curveIndex];
            var diffFrom = curve.diffFrom; // [minuend, subtrahend]

            var minuendIndex = diffFrom[0];
            var subtrahendIndex = diffFrom[1];
            var minuendData = dataset[minuendIndex].data;
            var subtrahendData = dataset[subtrahendIndex].data;

            // do the differencing
            //[stat,avVal,sub_values,sub_secs] -- avVal is pressure level
            var l = minuendData.length < subtrahendData.length ? minuendData.length : subtrahendData.length;
            for (var i = 0; i < l; i++) { // each pressure level
                d[i] = [];
                d[i][3] = [];
                d[i][4] = [];
                // pressure level
                d[i][1] = subtrahendData[i][1];
                // values diff
                d[i][0] = minuendData[i][0] - subtrahendData[i][0];
                // do the subValues
                var minuendDataSubValues = minuendData[i][3];
                var minuendDataSubSeconds = minuendData[i][4];
                var subtrahendDataSubValues = subtrahendData[i][3];
                var subtrahendDataSubSeconds = subtrahendData[i][4];
                // find the intersection of the subSeconds
                var secondsIntersection = _.intersection(minuendDataSubSeconds, subtrahendDataSubSeconds);
                for (var siIndex = 0; siIndex < secondsIntersection.length - 1; siIndex++) {
                    d[i][4].push(secondsIntersection[siIndex]);
                    d[i][3].push(minuendDataSubValues[siIndex] - subtrahendDataSubValues[siIndex]);
                }
            }
        }*/

    }

    // calculate stats for each dataset matching to subsec_intersection if matching is specified
   // for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
   //     data = dataset[curveIndex].data;
   //    // console.log("this data: " + data);
   //     for (di = 0; di < data.length; di++) { // every pressure level
    //        sub_secs = data[di][4];
     //       var subValues = data[di][3];
     //       var errorResult = {};
     //       if (matching) {
     //           var newSubValues = [];
     //           for (var subSecIntersectionIndex = 0; subSecIntersectionIndex < subSecIntersection.length; subSecIntersectionIndex++) {
     //               var secsIndex = sub_secs.indexOf(subSecIntersection[subSecIntersectionIndex]);
     //               var newVal = subValues[secsIndex];
     //               if (newVal === undefined || newVal == 0) {
     //                   console.log("bad newVal: " + newVal);
     //                   console.log ("found undefined at level: " + di + " curveIndex:" + curveIndex + " and secsIndex:" + subSecIntersection[subSecIntersectionIndex] + " subSecIntersectionIndex:" + subSecIntersectionIndex );
     //               } else {
     //                   newSubValues.push(newVal);
     //               }
      //          }
      //          data[di][3] = newSubValues;
      //          data[di][4] = subSecIntersection;
      //      }



            // already have [stat,pl,subval,subsec]
            // want - [stat,pl,subval,{subsec,std_betsy,d_mean,n_good,lag1},tooltiptext

      //     /* data[di][2] = errorResult.stde_betsy;
      //      data[di][5] = {
      //          d_mean: errorResult.d_mean,
       //         stde_betsy: errorResult.stde_betsy,
       //         n_good: errorResult.n_good,
       //         lag1: errorResult.lag1
       //     };
       //     data[di][6] = label +
       //         "<br>" + data[di][1] + "m" +
       //         "<br> " + statisticSelect + ":" + data[di][0].toPrecision(4) +
       //         "<br>  stde:" + errorResult.stde_betsy.toPrecision(4) +
       //         "<br>  mean:" + errorResult.d_mean.toPrecision(4) +
       //         "<br>  n:" + errorResult.n_good +
       //         "<br>  lag1:" + errorResult.lag1.toPrecision(4);*/
       // }
   // }


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

    var pOptions = {
        axisLabels: {
            show: true
        },
        xaxes:[{
            axisLabel: variableStatSet[variableStat].label + " : " + variableStat,
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
            // the ct value is the third [2] element of the data series for profiles. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };

    // add black 0 line curve
    //dataset.push(dataZero = {color:'black',points:{show:false},data:[[0,-1000,"zero"],[0,-100,"zero"]]});
    var result = {
        error: error,
        data: dataset,
        options: pOptions
    };
    plotFunction(result);
};
