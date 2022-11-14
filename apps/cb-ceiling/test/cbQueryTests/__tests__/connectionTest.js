const fs = require('fs');
var couchbase = require('couchbase');

describe("Connection function", () =>
{
    test("Tests connnection to CouchBase server", async () =>
    {
        let cluster = await connectToCb();

        expect(cluster != undefined);
    });
});

async function connectToCb()
{
    const clusterConnStr = 'adb-cb1.gsd.esrl.noaa.gov';
    const settingsFile = '/Users/gopa.padmanabhan/mats-settings/configurations/dev/settings/cb-ceiling/settings.json';
    var settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));

    let cluster = await couchbase.connect(clusterConnStr, {
        username: settings.private.databases[0].user,
        password: settings.private.databases[0].password,
        timeouts: {
            kvTimeout: 10000, // milliseconds
        },
    })
    return cluster;
}