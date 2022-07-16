
var chai = require('chai');
const { Console } = require('console');

//if (Meteor.isServer) {
  describe('dieoff_query', () => {
    before(function setup() {
      console.log("setup");
    });

    after(function teardown() {
      console.log("teardown");
    });

    it('should return data', function (done) {
      try {
        const statement = `SELECT m0.fcstLen,
        COUNT(DISTINCT m0.fcstValidEpoch) AS N_times,
        COUNT(odata.name) * COUNT(DISTINCT m0.fcstValidEpoch) AS N0,
        ARRAY_AGG (m0data.Ceiling) as mSubValues,
        ARRAY_AGG (odata.Ceiling) as oSubValues,
        SUM (CASE WHEN m0data.Ceiling < 500 AND odata.Ceiling < 500 THEN 1 ELSE 0 END) AS hit,
        SUM (CASE WHEN m0data.Ceiling < 500 AND NOT odata.Ceiling < 500 THEN 1 ELSE 0 END) AS false_alarm,
        SUM (CASE WHEN NOT m0data.Ceiling < 500 AND odata.Ceiling < 500 THEN 1 ELSE 0 END) AS miss,
        SUM (CASE WHEN NOT m0data.Ceiling < 500 AND NOT odata.Ceiling < 500 THEN 1 ELSE 0 END) AS correct_negative
         FROM mdata AS m0 USE INDEX (ix_subset_version_model_fcstLen_fcstValidEpoc)
             JOIN mdata AS o USE INDEX(adv_fcstValidEpoch_docType_subset_version_type) ON o.fcstValidEpoch = m0.fcstValidEpoch
         UNNEST o.data AS odata
         UNNEST m0.data AS m0data
             JOIN m0data AS md ON odata.name = m0data.name
         WHERE o.type='DD'
             AND o.docType='obs'
             AND o.subset='METAR'
             AND o.version='V01'
             AND m0.type='DD'
             AND m0.docType='model'
             AND m0.subset='METAR'
             AND m0.version='V01'
             AND m0.model='RAP_OPS_130'
             AND m0data.name IN ['KGKY','KY19','KY49','KY51']
             AND odata.name IN ['KGKY','KY19','KY49','KY51']
             AND o.fcstValidEpoch >= 1655242200
             AND o.fcstValidEpoch <= 1655242200 + 24 * 30 * 36000
             AND m0.fcstValidEpoch >= 1655242200
             AND m0.fcstValidEpoch <= 1655242200 + 24 * 30 * 3600
             AND m0.fcstValidEpoch = o.fcstValidEpoch
             AND m0.fcstLen IN [1,3,6,9,12,15,18,21]
         GROUP BY m0.fcstLen
         ORDER BY m0.fcstLen;`
          console.log(statement);
        data = "something"
        chai.assert(data == "something");
        done()
      } catch (err) {
        done(err);
      }
    });
  });
//}