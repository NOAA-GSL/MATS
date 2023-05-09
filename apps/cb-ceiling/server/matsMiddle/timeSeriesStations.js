
class TimeSeriesStations
{
    fcstValidEpoch_Array = [];
    cbPool = null;
    conn = null;
    fveObs = {};
    fveModels = {};
    stats = [];
    varName = null;
    stationNames = [];
    stationNames = null;
    model = null;
    fcstLen = null;
    threshold = null;
    fromSecs = null;
    toSecs = null;
    writeOutput = false;

    constructor(cbPool)
    {
        this.cbPool = cbPool;
    }

    processStationQuery = (varName, stationNames, model, fcstLen, threshold, fromSecs, toSecs, writeOutput) =>
    {
        const Future = require('fibers/future');

        let rv = [];
        let dFuture = new Future();
        (async () =>
        {
            rv = await this.processStationQuery_int(varName, stationNames, model, fcstLen, threshold, fromSecs, toSecs, writeOutput);
            dFuture.return();
        })();
        dFuture.wait();
        return rv;
    }

    processStationQuery_int = async (varName, stationNames, model, fcstLen, threshold, fromSecs, toSecs, writeOutput) =>
    {
        let fs = require("fs");

        console.log("processStationQuery()");

        this.varName = varName;
        this.stationNames = stationNames;
        this.model = model;
        this.fcstLen = fcstLen;
        this.threshold = threshold;
        this.fromSecs = fromSecs;
        this.toSecs = toSecs;
        this.writeOutput = writeOutput;

        this.conn = await cbPool.getConnection();


        let startTime = (new Date()).valueOf();

        let queryTemplate = fs.readFileSync("assets/app/matsMiddle/sqlTemplates/tmpl_distinct_fcstValidEpoch_obs.sql", 'utf-8');
        queryTemplate = queryTemplate.replace(/{{vxFROM_SECS}}/g, this.fromSecs);
        queryTemplate = queryTemplate.replace(/{{vxTO_SECS}}/g, this.toSecs);
        console.log("fromSecs:" + this.fromSecs + ",toSecs:" + this.toSecs);
        console.log("queryTemplate:\n" + queryTemplate);

        const qr_fcstValidEpoch = await this.conn.cluster.query(queryTemplate);

        for (let imfve = 0; imfve < qr_fcstValidEpoch.rows.length; imfve++)
        {
            this.fcstValidEpoch_Array.push(qr_fcstValidEpoch.rows[imfve].fcstValidEpoch);
        }
        let endTime = (new Date()).valueOf();
        console.log("\tfcstValidEpoch_Array:" + this.fcstValidEpoch_Array.length + " in " + (endTime - startTime) + " ms.");
        // console.log( "\tfcstValidEpoch_Array:" + JSON.stringify(this.fcstValidEpoch_Array, null, 2) + " in " + (endTime - startTime) + " ms.");

        let prObs = this.createObsData();
        let prModel = this.createModelData();
        await Promise.all([prObs, prModel]);
        this.generateStats(threshold);

        if (true === writeOutput)
        {
            fs.writeFileSync('/Users/gopa.padmanabhan/scratch/matsMiddle/output/stats.json', JSON.stringify(this.stats, null, 2));
            fs.writeFileSync('/Users/gopa.padmanabhan/scratch/matsMiddle/output/fveObs.json', JSON.stringify(this.fveObs, null, 2));
            fs.writeFileSync('/Users/gopa.padmanabhan/scratch/matsMiddle/output/fveModels.json', JSON.stringify(this.fveModels, null, 2));
            console.log("Output written to files: stats.json, fveObs.json, fveModels.json");
        }

        endTime = (new Date()).valueOf();
        console.log("\tprocessStationQuery in " + (endTime - startTime) + " ms.");

        return this.stats;
    }

    createObsData = async () =>
    {
        console.log("createObsData()");
        let fs = require("fs");

        let startTime = (new Date()).valueOf();

        // ==============================  OBS =====================================================
        let tmpl_get_N_stations_mfve_obs = fs.readFileSync("assets/app/matsMiddle/sqlTemplates/tmpl_get_N_stations_mfve_IN_obs.sql", 'utf-8');

        let stationNames_obs = "";
        for (let i = 0; i < this.stationNames.length; i++)
        {
            if (i === 0)
            {
                stationNames_obs = "obs.data." + this.stationNames[i] + "." + this.varName + " " + this.stationNames[i];
            }
            else
            {
                stationNames_obs += ",obs.data." + this.stationNames[i] + "." + this.varName + " " + this.stationNames[i];
            }
        }
        let endTime = (new Date()).valueOf();
        console.log("\tstationNames_obs:" + stationNames_obs.length + " in " + (endTime - startTime) + " ms.");
        // console.log("\tstationNames_obs:\n" + stationNames_obs);

        let tmplWithStationNames_obs = tmpl_get_N_stations_mfve_obs.replace(/{{stationNamesList}}/g, stationNames_obs);

        const promises = [];
        for (let iofve = 0; iofve < this.fcstValidEpoch_Array.length; iofve = iofve + 100)
        {
            let fveArraySlice = this.fcstValidEpoch_Array.slice(iofve, iofve + 100);
            let sql = tmplWithStationNames_obs.replace(/{{fcstValidEpoch}}/g, JSON.stringify(fveArraySlice));
            if (iofve === 0)
            {
                // console.log("sql:\n" + sql);
            }
            let prSlice = this.conn.cluster.query(sql);
            promises.push(prSlice);
            prSlice.then((qr) =>
            {
                console.log("qr:\n" + qr.rows.length);
                for (let jmfve = 0; jmfve < qr.rows.length; jmfve++)
                {
                    let fveDataSingleEpoch = qr.rows[jmfve];
                    // console.log("mfveData:\n" + JSON.stringify(mfveData, null, 2));
                    let stationsSingleEpoch = {};
                    for (let i = 0; i < this.stationNames.length; i++)
                    {
                        let varValStation = fveDataSingleEpoch[this.stationNames[i]];
                        if (i === 0)
                        {
                            // console.log("station:\n" + JSON.stringify(station, null, 2));
                        }
                        stationsSingleEpoch[this.stationNames[i]] = varValStation;
                    }
                    this.fveObs[fveDataSingleEpoch.fcstValidEpoch] = stationsSingleEpoch;
                    if (fveDataSingleEpoch.fcstValidEpoch === 1662508800)
                    {
                        // console.log("fveDataSingleEpoch:\n" + JSON.stringify(fveDataSingleEpoch, null, 2) + "\n" +
                        //    JSON.stringify(this.fveObs[fveDataSingleEpoch.fcstValidEpoch]));
                        // console.log("fveObs:\n" + JSON.stringify(this.fveObs, null, 2) );
                    }
                }
                if ((iofve % 100) == 0)
                {
                    endTime = (new Date()).valueOf();
                    console.log("iofve:" + iofve + "/" + this.fcstValidEpoch_Array.length + " in " + (endTime - startTime) + " ms.");
                }
            });
        }

        await Promise.all(promises);
        endTime = (new Date()).valueOf();
        console.log("fveObs:" + " in " + (endTime - startTime) + " ms.");
    }

    createModelData = async () =>
    {
        console.log("createModelData()");
        let fs = require("fs");

        let startTime = (new Date()).valueOf();

        let tmpl_get_N_stations_mfve_model = fs.readFileSync("assets/app/matsMiddle/sqlTemplates/tmpl_get_N_stations_mfve_IN_model.sql", 'utf-8');
        tmpl_get_N_stations_mfve_model = tmpl_get_N_stations_mfve_model.replace(/{{vxMODEL}}/g, "\"" + this.model + "\"");
        tmpl_get_N_stations_mfve_model = tmpl_get_N_stations_mfve_model.replace(/{{vxFCST_LEN}}/g, this.fcstLen);

        var stationNames_models = "";
        for (let i = 0; i < this.stationNames.length; i++)
        {
            if (i === 0)
            {
                stationNames_models = "models.data." + this.stationNames[i] + "." + this.varName + " " + this.stationNames[i];
            }
            else
            {
                stationNames_models += ",models.data." + this.stationNames[i] + "." + this.varName + " " + this.stationNames[i];
            }
        }

        let endTime = (new Date()).valueOf();
        console.log("\tstationNames_models:" + stationNames_models.length + " in " + (endTime - startTime) + " ms.");
        // console.log("\tstationNames_models:\n" + stationNames_models);

        let tmplWithStationNames_models = tmpl_get_N_stations_mfve_model.replace(/{{stationNamesList}}/g, stationNames_models);

        const promises = [];
        for (let imfve = 0; imfve < this.fcstValidEpoch_Array.length; imfve = imfve + 100)
        {
            let fveArraySlice = this.fcstValidEpoch_Array.slice(imfve, imfve + 100);
            let sql = tmplWithStationNames_models.replace(/{{fcstValidEpoch}}/g, JSON.stringify(fveArraySlice));
            if (imfve === 0)
            {
                //console.log("sql:\n" + sql);
            }
            let prSlice = this.conn.cluster.query(sql);

            promises.push(prSlice);
            prSlice.then((qr) =>
            {
                for (let jmfve = 0; jmfve < qr.rows.length; jmfve++)
                {
                    let fveDataSingleEpoch = qr.rows[jmfve];
                    // console.log("mfveData:\n" + JSON.stringify(mfveData, null, 2));
                    let stationsSingleEpoch = {};
                    for (let i = 0; i < this.stationNames.length; i++)
                    {
                        let varValStation = fveDataSingleEpoch[this.stationNames[i]];
                        if (i === 0)
                        {
                            // console.log("station:\n" + JSON.stringify(station, null, 2));
                        }
                        stationsSingleEpoch[this.stationNames[i]] = varValStation;
                    }
                    this.fveModels[fveDataSingleEpoch.fcstValidEpoch] = stationsSingleEpoch;
                    if (fveDataSingleEpoch.fcstValidEpoch === 1662508800)
                    {
                        // console.log("fveDataSingleEpoch:\n" + JSON.stringify(fveDataSingleEpoch, null, 2) + "\n" +
                        //    JSON.stringify(this.fveModels[fveDataSingleEpoch.fcstValidEpoch]));
                        // console.log("fveObs:\n" + JSON.stringify(this.fveObs, null, 2) );
                    }
                }
                if ((imfve % 100) == 0)
                {
                    endTime = (new Date()).valueOf();
                    console.log("imfve:" + imfve + "/" + this.fcstValidEpoch_Array.length + " in " + (endTime - startTime) + " ms.");
                }
            });
        }
        await Promise.all(promises);
        endTime = (new Date()).valueOf();
        console.log("fveModel:" + " in " + (endTime - startTime) + " ms.");
    }

    generateStats = async (threshold) =>
    {
        console.log("generateStats(" + threshold + ")");

        let startTime = (new Date()).valueOf();

        for (let imfve = 0; imfve < this.fcstValidEpoch_Array.length; imfve++)
        {
            let fve = this.fcstValidEpoch_Array[imfve];
            let obsSingleFve = this.fveObs[fve];
            let modelSingleFve = this.fveModels[fve];

            if (!obsSingleFve || !modelSingleFve)
            {
                // console.log("no data for fve:" + fve + ",obsSingleFve:"+ obsSingleFve + ",modelSingleFve:" + modelSingleFve);
                continue;
            }

            let stats_fve = {};
            stats_fve["avtime"] = fve;
            stats_fve["total"] = 0;
            stats_fve["hits"] = 0;
            stats_fve["misses"] = 0;
            stats_fve["fa"] = 0;
            stats_fve["cn"] = 0;
            stats_fve["N0"] = 0;
            stats_fve["N_times"] = 0;
            stats_fve["sub_data"] = [];

            for (let i = 0; i < this.stationNames.length; i++)
            {
                let station = this.stationNames[i];
                let varVal_o = obsSingleFve[station];
                let varVal_m = modelSingleFve[station];

                if (fve === 1662508800)
                {
                    // console.log("obsSingleFve:" + JSON.stringify(obsSingleFve, null, 2));
                    // console.log("modelSingleFve:" + JSON.stringify(modelSingleFve, null, 2));
                }
                // console.log("obs_mfve[mfveVal]:" + JSON.stringify(obs_mfve[mfveVal]) + ":stationNames[i]:" + stationNames[i] + ":" + obs_mfve[mfveVal][stationNames[i]]);

                if (varVal_o && varVal_m)
                {
                    // console.log("varVal_o:" + varVal_o + ",varVal_m:" + varVal_m);

                    stats_fve["total"] = stats_fve["total"] + 1;
                    let sub = fve + ';';
                    if (varVal_o < threshold && varVal_m < threshold)
                    {
                        stats_fve["hits"] = stats_fve["hits"] + 1;
                        sub += "1;";
                    }
                    else
                    {
                        sub += "0;";
                    }

                    if (fve === 1662508800)
                    {
                        // console.log("station:" + station + ",varVal_o:" + varVal_o + ",varVal_m:" + varVal_m);
                    }
                    if (varVal_o >= threshold && varVal_m < threshold)
                    {
                        stats_fve["fa"] = stats_fve["fa"] + 1;
                        sub += "1;";
                    }
                    else
                    {
                        sub += "0;";
                    }

                    if (varVal_o < threshold && varVal_m >= threshold)
                    {
                        stats_fve["misses"] = stats_fve["misses"] + 1;
                        sub += "1;";
                    }
                    else
                    {
                        sub += "0;";
                    }

                    if (varVal_o >= threshold && varVal_m >= threshold)
                    {
                        stats_fve["cn"] = stats_fve["cn"] + 1;
                        sub += "1";
                    }
                    else
                    {
                        sub += "0";
                    }
                    stats_fve["sub_data"].push(sub);
                }
            }
            this.stats.push(stats_fve);
        }

        let endTime = (new Date()).valueOf();
        console.log("generateStats:" + " in " + (endTime - startTime) + " ms.");
    }
}

module.exports = TimeSeriesStations;

