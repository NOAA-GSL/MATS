const fs = require("fs");
var couchbase = require("couchbase");

const configFile = "./config/config.json";
const settingsFile = "../../settings/settings.json";

// jest.setTimeout(20000);

describe("CouchBase Query Tests", () => {
  let host = null;
  let bucketName = null;

  let config = null;
  let settings = null;
  let cluster = null;
  let bucket = null;
  let collection_METAR = null;

  beforeAll(async () => {
    config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    console.log(config.queries.length + " queries loaded from config.");
    settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));

    if (config.host) {
      host = config.host;
    } else {
      host = settings.private.databases[0].host;
    }
    if (config.bucket) {
      bucketName = config.bucket;
    } else {
      bucketName = settings.private.databases[0].bucket;
    }
    console.log("host:" + host + ",bucket:" + bucketName);

    cluster = await init(config, settings);
    bucket = cluster.bucket(bucketName);
    expect(bucket != undefined);
    collection_METAR = bucket.scope("_default").collection("METAR");
    expect(collection_METAR != undefined);
  });

  test("Establish CouchBase connection", async () => {
    // console.log(process.cwd());
    // console.log(process.argv);

    expect(cluster != undefined);
    expect(bucket != undefined);
    expect(collection_METAR != undefined);
  });

  test("Get METAR count", async () => {
    let res = await run_METAR_count(bucket);
    expect(res != undefined);
  });

  test("Run all queries", async () => {
    if (!cluster) {
      cluster = await init();
      expect(cluster != undefined);

      bucket = cluster.bucket(bucketName);
      expect(bucket != undefined);

      collection_METAR = bucket.scope("_default").collection("METAR");
      expect(collection_METAR != undefined);
    }

    for (let i = 0; i < config.queries.length; i++) {
      let elapsed = await run_query_file(
        bucket,
        config.queries[i].queryFile,
        config.queries[i].maxExecutionTime_ms
      );
      // console.log("elapsed:" + elapsed + ",maxExecutionTime_ms:" + config.queries[i].maxExecutionTime_ms);
      expect(elapsed).toBeLessThan(config.queries[i].maxExecutionTime_ms);
    }
  });
});

async function init(config, settings) {
  console.log("init()");

  let startTime = new Date().valueOf();

  let cluster = await couchbase.connect(config.host, {
    username: settings.private.databases[0].user,
    password: settings.private.databases[0].password,
    timeouts: {
      kvTimeout: 10000,
      queryTimeout: 300000,
    },
  });

  let endTime = new Date().valueOf();

  console.log("\tconnectToCb() in " + (endTime - startTime) + " ms.");

  return cluster;
}

async function run_query_file(bckt, query_file, maxExecutionTime_ms) {
  console.log("run_query_file(" + query_file + ")");

  const qstr = fs.readFileSync(query_file, "utf-8");

  let startTime = new Date().valueOf();

  const queryResult = await bckt.scope("_default").query(qstr, {
    parameters: [],
    timeout: maxExecutionTime_ms,
  });

  /*
    queryResult.rows.forEach((row) =>
    {
        console.log(row)
    });
    */

  let endTime = new Date().valueOf();
  let elapsed = endTime - startTime;
  console.log("\trun_query_file(" + query_file + ") in " + elapsed + " ms.");
  return elapsed;
}

async function run_METAR_count(bckt) {
  console.log("run_METAR_count()");

  let startTime = new Date().valueOf();

  const queryFile = "./test_queries/METAR_count.sql";
  const qstr = fs.readFileSync(queryFile, "utf-8");

  const queryResult = await bckt.scope("_default").query(qstr, {
    parameters: [],
  });
  queryResult.rows.forEach((row) => {
    console.log(row);
  });

  let endTime = new Date().valueOf();
  console.log("\trun_METAR_count() in " + (endTime - startTime) + " ms.");

  return queryResult;
}
