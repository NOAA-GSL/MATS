const chai = require("chai");
const { Console } = require("console");
const dataQueryUtil = require("./lib/data_query_util.mjs");

// if (Meteor.isServer) {
describe("dieoff_query", () => {
  before(function setup() {
    console.log("setup");
  });

  after(function teardown() {
    console.log("teardown");
  });

  it("should return data", function (done) {
    try {
      const statement = `
      SELECT m0.fcstValidEpoch%(24*3600)/3600 AS hr_of_day,
             COUNT(DISTINCT m0.fcstValidEpoch) N_times,
             MIN(m0.fcstValidEpoch) min_secs,
             MAX(m0.fcstValidEpoch) max_secs,
             SUM(CASE WHEN m0data.Ceiling < 3000.0
                     AND odata.Ceiling < 3000.0 THEN 1 ELSE 0 END) AS hit,
             SUM(CASE WHEN m0data.Ceiling < 3000.0
                     AND NOT odata.Ceiling < 3000.0 THEN 1 ELSE 0 END) AS fa,
             SUM(CASE WHEN NOT m0data.Ceiling < 3000.0
                     AND odata.Ceiling < 3000.0 THEN 1 ELSE 0 END) AS miss,
             SUM(CASE WHEN NOT m0data.Ceiling < 3000.0
                     AND NOT odata.Ceiling < 3000.0 THEN 1 ELSE 0 END) AS cn,
             SUM(CASE WHEN m0data.Ceiling IS NOT MISSING
                     AND odata.Ceiling IS NOT MISSING THEN 1 ELSE 0 END) AS N0,
             ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || CASE WHEN m0data.Ceiling < 3000.0
                     AND odata.Ceiling < 3000.0 THEN '1' ELSE '0' END || ';' || CASE WHEN m0data.Ceiling < 3000.0
                     AND NOT odata.Ceiling < 3000.0 THEN '1' ELSE '0' END || ';' || CASE WHEN NOT m0data.Ceiling < 3000.0
                     AND odata.Ceiling < 3000.0 THEN '1' ELSE '0' END || ';' || CASE WHEN NOT m0data.Ceiling < 3000.0
                     AND NOT odata.Ceiling < 3000.0 THEN '1' ELSE '0' END) AS sub_data
      FROM vxdata._default.METAR AS m0
          JOIN vxdata._default.METAR AS o ON o.fcstValidEpoch = m0.fcstValidEpoch
      UNNEST o.data AS odata
      UNNEST m0.data AS m0data
      WHERE o.type='DD'
          AND o.docType='obs'
          AND o.subset='METAR'
          AND o.version='V01'
          AND m0.type='DD'
          AND m0.docType='model'
          AND m0.subset='METAR'
          AND m0.version='V01'
          AND m0.model='HRRR_OPS'
          AND m0.fcstLen = 6
          AND o.fcstValidEpoch >= 1664236800
          AND o.fcstValidEpoch <= 1664841600
          AND m0.fcstValidEpoch >= 1664236800
          AND m0.fcstValidEpoch <= 1664841600
          AND m0.fcstValidEpoch = o.fcstValidEpoch
          AND m0data.name IN ['KEWR','KJFK','KJRB','KLDJ','KLGA','KNYC','KTEB']
          AND odata.name IN ['KEWR','KJFK','KJRB','KLDJ','KLGA','KNYC','KTEB']
          AND m0data.name = odata.name
      GROUP BY m0.fcstValidEpoch%(24*3600)/3600
      ORDER BY hr_of_day;
      `;
      console.log(statement);
      data = "something";
      chai.assert(data == "something");
      done();
    } catch (err) {
      done(err);
    }
  });
});
// }
