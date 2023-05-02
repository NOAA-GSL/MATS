
class TimeSeriesStations
{
    constructor(cbPool)
    {
        this.cbPool = cbPool;
    }

    processStationQuery = async (stationsFile, model, fcstLen, threshold, writeOutput) =>
    {
        var fs = require("fs");

        console.log("processStationQuery()");

        let startTime = (new Date()).valueOf();

        let sqlstrObs = fs.readFileSync("./matsMiddle/SQLs/get_distinct_fcstValidEpoch_obs.sql", 'utf-8');
        const qr_fcstValidEpoch = await this.bucket.scope('_default').query(sqlstrObs, {
            parameters: [],
        });

        for (let imfve = 0; imfve < qr_fcstValidEpoch.rows.length; imfve++)
        {
            this.fcstValidEpoch_Array.push(qr_fcstValidEpoch.rows[imfve].fcstValidEpoch);
        }
        let endTime = (new Date()).valueOf();
        console.log( "\tfcstValidEpoch_Array:" + this.fcstValidEpoch_Array.length + " in " + (endTime - startTime) + " ms.");
        // console.log( "\tfcstValidEpoch_Array:" + JSON.stringify(this.fcstValidEpoch_Array, null, 2) + " in " + (endTime - startTime) + " ms.");

        this.stationNames = JSON.parse(fs.readFileSync(stationsFile, 'utf-8'));
        // console.log( "station_names:\n" + JSON.stringify(this.stationNames, null, 2));

        // let prObs = this.createObsData();
        // let prModel = this.createModelData(model, fcstLen, threshold);
        // await Promise.all([prObs, prModel]);
        // this.generateStats(threshold);

        if (true === writeOutput)
        {
            fs.writeFileSync('./matsMiddle/output/stats.json', JSON.stringify(this.stats, null, 2));
            fs.writeFileSync('./matsMiddle/output/fveObs.json', JSON.stringify(this.fveObs, null, 2));
            fs.writeFileSync('./matsMiddle/output/fveModels.json', JSON.stringify(this.fveModels, null, 2));
            console.log("Output written to files: stats.json, fveObs.json, fveModels.json");
        }

        endTime = (new Date()).valueOf();
        console.log("\tprocessStationQuery in " + (endTime - startTime) + " ms.");
    }
}

export default matsMiddle = {
    TimeSeriesStations: TimeSeriesStations
}