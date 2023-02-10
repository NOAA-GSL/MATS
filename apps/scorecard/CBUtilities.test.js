import { matsCouchbaseUtils } from 'meteor/randyp:mats-common';

test('tests read and write', () => {
  const test = async () => {
    const fs = require('fs');

    homedir = process.env.HOME;
    try {
      const data = fs.readFileSync(homedir + '/adb-cb4-credentials', 'utf8');
      data.split(/\r?\n/).forEach((line) => {
        parts = line.split(':');
        credentials[parts[0]] = parts[1];
      });

      console.log(data);
    } catch (err) {
      console.error(err);
    }
    const host = credentials.cb_host;
    const password = credentials.password;
    //"adb-cb2.gsd.esrl.noaa.gov,adb-cb3.gsd.esrl.noaa.gov,adb-cb4.gsd.esrl.noaa.gov";
    const bucketName = credentials.cb_bucket;
    const collection = 'SCORECARD'; // using scorecard bucket to test read and write capability
    const scope = credentials.scope;

    cbUtilities = new matsCouchbaseUtils.CBUtilities(
      host,
      bucketName,
      scope,
      collection,
      user,
      pwd
    );

    const test_doc = {
      type: 'airline',
      id: 8091,
      callsign: 'CBS',
      iata: null,
      icao: null,
      name: 'Couchbase Airways',
    };
    const key = `${test_doc.type}_${test_doc.id}`;
    const statement = "select * from `travel-sample` where meta().id = '" + key + "';";

    try {
      const time = await cbUtilities.queryCB('select NOW_MILLIS() as time;');
      console.log('queryCB: ', time);
    } catch (err) {
      console.log(err);
    }

    try {
      const ret = await cbUtilities.upsertCB(key, test_doc);
      console.log('upsertCB: ', ret);
    } catch (err) {
      console.log(err);
    }

    try {
      const ret1 = await cbUtilities.getCB(key);
      console.log('getCB: ', ret1);
    } catch (err) {
      console.log(err);
    }

    try {
      const ret2 = await cbUtilities.queryCB(statement);
      console.log('queryCB: ', ret2);
    } catch (err) {
      console.log(err);
    }

    try {
      const ret3 = await cbUtilities.removeCB(key);
      console.log('deleteCB: ', ret3);
    } catch (err) {
      console.log(err);
    }

    await cbUtilities.closeConnection();
    //process.exit();
  };
});
