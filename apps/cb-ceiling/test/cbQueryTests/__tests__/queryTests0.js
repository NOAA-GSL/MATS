const fs = require('fs');
var couchbase = require('couchbase');

const bucketName = 'mdatatest';
const clusterConnStr = 'adb-cb1.gsd.esrl.noaa.gov';
const configFile = "./config/config.json";
const settingsFile = '/Users/gopa.padmanabhan/mats-settings/configurations/dev/settings/cb-ceiling/settings.json';

var config = null;
// jest.setTimeout(20000);

describe("CouchBase Query Tests", () =>
{
    let cluster = null;
    let bucket = null;
    let collection_METAR = null;

    test("Establish CouchBase connection", async () =>
    {
        config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

        console.log(config.queries.length + " queries loaded from config.")

        cluster = await connectToCb();
        expect(cluster != undefined);

        bucket = cluster.bucket(bucketName);
        expect(bucket != undefined);

        collection_METAR = bucket.scope('_default').collection('METAR');
    });

    /*
    test("Get METAR count", async () =>
    {

        let res = await run_METAR_count(bucket);
        expect(res != undefined);
    });
    */

    test("Run all queries", async () =>
    {
        for (let i = 0; i < config.queries.length; i++)
        {
            let elapsed = await run_query_file(bucket, config.queries[i].queryFile, config.queries[i].maxExecutionTime_ms);
            // console.log("elapsed:" + elapsed + ",maxExecutionTime_ms:" + config.queries[i].maxExecutionTime_ms);
            expect(elapsed).toBeLessThan(config.queries[i].maxExecutionTime_ms);
        }
    });
});

async function run_query_file(bckt, query_file, maxExecutionTime_ms)
{
    console.log("run_query_file(" + query_file + ")");

    const clusterConnStr = 'adb-cb1.gsd.esrl.noaa.gov';
    const qstr = fs.readFileSync(query_file, 'utf-8');

    let startTime = (new Date()).valueOf();

    const queryResult = await bckt.scope('_default')
        .query(qstr, {
            parameters: [],
            timeout: maxExecutionTime_ms
        });

    /*
    queryResult.rows.forEach((row) =>
    {
        console.log(row)
    });
    */

    let endTime = (new Date()).valueOf();
    let elapsed = (endTime - startTime);
    console.log("\trun_query_file(" + query_file + ") in " + elapsed + " ms.");
    return elapsed;
}

async function connectToCb()
{
    console.log("connectToCb()");

    let startTime = (new Date()).valueOf();

    var settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));

    let cluster = await couchbase.connect(clusterConnStr, {
        username: settings.private.databases[0].user,
        password: settings.private.databases[0].password,
        timeouts: {
            kvTimeout: 10000,
            queryTimeout: 300000
        },
    });

    let endTime = (new Date()).valueOf();

    console.log("\tconnectToCb() in " + (endTime - startTime) + " ms.");

    return cluster;
}

async function run_METAR_count(bckt)
{
    console.log("run_q0(bckt)");

    let startTime = (new Date()).valueOf();

    const clusterConnStr = 'adb-cb1.gsd.esrl.noaa.gov';
    const queryFile = '/Users/gopa.padmanabhan/VxIngest/scripts/VXingest_utilities/share/cbQueryTests/test_queries/METAR_count.sql';
    const qstr = fs.readFileSync(queryFile, 'utf-8');

    const queryResult = await bckt.scope('_default')
        .query(qstr, {
            parameters: [],
        });
    queryResult.rows.forEach((row) =>
    {
        console.log(row)
    });

    let endTime = (new Date()).valueOf();
    console.log("\trun_METAR_count() in " + (endTime - startTime) + " ms.");

    return queryResult;
}



