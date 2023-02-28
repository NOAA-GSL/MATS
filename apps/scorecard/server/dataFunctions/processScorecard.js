import { matsTypes, matsParamUtils, matsCollections } from "meteor/randyp:mats-common";

processScorecard = function (plotParams, plotFunction) {
  /*
    displayScorecard structure:
    The left column isn't displayed, it's only for reference

    "title"        | userName name  scorecard name  submit date  processed date daterange |
    "rowTitle:"    | Row label  datasource   validationDatasource |
    "rowParameters"| single param1 single param2  ...."|
    "regions"      |               | region 1        | region 2      |  region n |
    "fcstLens"     |               |1|3|6|9|...      |1|3|6|9...     |1|3|6|9...|
    "stat1-var1"   | stat1-var1    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
    "stat1-var2"   | stat1-var2    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
    "stat1-var3"   | stat1-var3    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
        .........
    "stat2-var3"   | stat2-var3    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
    "stat2-var3"   | stat2-var3    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
    "stat2-var3"   | stat2-var3    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
        .........
    "statn-varn"   | statn-varn    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|

    "rowTitle:"    | Row label  datasource  validationDatasource |
    "rowParameters"| single param1 single param2  ...."|
    "regions"      |               | region 1        | region 2      |  region n |
    "fcstLens"     |               |1|3|6|9|...      |1|3|6|9...     |1|3|6|9...|
    "stat1-var1"   | stat1-var1    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
    "stat1-var2"   | stat1-var2    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
    "stat1-var3"   | stat1-var3    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
        .........
    "stat2-var3"   | stat2-var3    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
    "stat2-var3"   | stat2-var3    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
    "stat2-var3"   | stat2-var3    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|
        .........
    "statn-varn"   | statn-varn    |-|^|-|^ ...      |-|^|-|^...     |^|-|^|^...|

    data structure:
    *** NOTES statn-varn data fields are an array [res, value]
        values are initially null but will get filled in later
        and res are initially 'u' and will get set to one of
        D (datasource major), d (datasource minor),
        V (validationSource major), v (validationSource minor),
        n (neutral), u (unknown).

        fcstLengths are the union of all the forecast-length's for all the curves
        regions are the union of all the regions for all the curves
    ***


    results: {
        "title":userName + " " + name + " " + submitDate + " " + processedDate + " " + daterange,
        rows: {
            Rowlabel1: {
                "rowTitle":{"label":"Row label","datasource":"datasource","validationDatasource":"validationDatasource"},
                "rowParameters":{"param1:"param1 value", "param2":"param2 value",.....},
                "regions":["region1":"region2"....],
                "fcstlens":[1,3,6,9,...],
                'data': {
                    "stat1-var1":[[null,'u'],[null,'u'],[null,'u']....],
                    "stat1-var2":[[null,'u'],[null,'u'],[null,'u']....],
                    "stat1-var3":[[null,'u'],[null,'u'],[null,'u']....],
                    ....
                }
            },
            Rowlabel1: {
                "rowTitle":{"label":"Row label","datasource":"datasource","validationDatasource":"validationDatasource"},
                "rowParameters":{"param1:"param1 value", "param2":"param2 value",.....},
                "regions":["region1":"region2"....],
                "fcstlens":[1,3,6,9,...],
                'data': {
                    "stat1-var1":[[null,'u'],undefined,[null,'u']....],
                    "stat1-var2":[[null,'u'],undefined,[null,'u']....],
                    "stat1-var3":[[null,'u'],undefined,[null,'u']....],
                    ....
                }
            }
            ......
        }
    }
    */
  // create or retrieve the scorecard document
  // get the submission epoch - right now
  const { submitEpoch } = plotParams;
  const processedAt = 0; // should be filled in when processing is finished
  const { userName } = plotParams;
  const name = plotParams["scorecard-name"];
  const singleCurveParamNames = matsParamUtils.getSingleSelectCurveParamNames();
  // We are thinking that the combination of userName/scorecardName/submitEpoch/processedEpoch is uniq

  let interval = {};
  if ((plotParams["scorecard-schedule-mode"] === "Once") === "Recurring") {
    switch (plotParams["scorecard-recurrence-interval"]) {
      case "Daily":
        interval = {
          type: "daily",
          hours: plotParams["these-hours-of-the-day"],
        };
        break;
      case "Weekly":
        interval = {
          type: "weekly",
          hours: plotParams["these-hours-of-the-day"],
          daysOfWeek: plotParams["these-days-of-the-week"],
        };
        break;
      case "Monthly":
        interval = {
          type: "monthly",
          hours: plotParams["these-hours-of-the-day"],
          daysOfMonth: plotParams["these-days-of-the-month"],
        };
        break;
      case "Yearly":
        interval = {
          type: "yearly",
          hours: plotParams["these-hours-of-the-day"],
          daysOfMonth: plotParams["these-days-of-the-month"],
          months: plotParams["these-months"],
        };
        break;
    }
  }
  const dateRange =
    plotParams["scorecard-schedule-mode"] === "Once" ? plotParams.dates : interval;

  // get the union of the fcst-length arrays of all the curves
  const fcstLengthsSet = new Set();
  plotParams.curves.forEach(function (curve) {
    curve["forecast-length"].forEach(function (fcl) {
      fcstLengthsSet.add(fcl);
    });
  });
  const fcstLengths = Array.from(fcstLengthsSet);

  // get the union of all the regions of all the curves
  const regionsSet = new Set();
  plotParams.curves.forEach(function (curve) {
    curve.region.forEach(function (r) {
      regionsSet.add(r);
    });
  });
  const regions = Array.from(regionsSet);

  // create an id for the document
  let idDateRange = dateRange.replace(/ /g, "_");
  idDateRange = idDateRange.replace(/:/g, "_");

  const id = `SC:${name}:${processedAt}:${idDateRange}`;
  const title = `${userName}:${name}:${submitEpoch}:${processedAt}:${dateRange}`;
  // process the scorecardDocument
  const significanceThresholds =
    plotParams["scorecard-percent-stdv"] === "Percent"
      ? {
          "minor-threshold-by-percent": plotParams["minor-threshold-by-percent"],
          "major-threshold-by-percent": plotParams["major-threshold-by-percent"],
        }
      : {
          "minor-threshold-by-stdv": plotParams["minor-threshold-by-stdv"],
          "major-threshold-by-stdv": plotParams["major-threshold-by-stdv"],
        };
  const significanceColors = {
    "major-source-color": plotParams["major-source-color"],
    "major-truth-color": plotParams["major-truth-color"],
    "minor-source-color": plotParams["minor-source-color"],
    "minor-truth-color": plotParams["minor-truth-color"],
  };
  const scorecardDocument = {
    id,
    plotParams,
    type: "SC",
    userName,
    name,
    status: matsTypes.ScorecardStatus.pending,
    submitted: submitEpoch,
    dateRange,
    schedule: (schedule = plotParams["scorecard-schedule-mode"]),
    endsOn: plotParams.scorecardEndsOn,
    processedAt,
    significanceThresholds,
    significanceColors,
    results: {},
  };
  // insert a title (will change when processedAt is established - easy substitution for the word 'processedAt')
  (scorecardDocument.results.title = title),
    (scorecardDocument.results.rows = {}),
    // fill in the rows - these are all initially default values
    plotParams.curves.forEach(function (curve) {
      // create the empty object for this row
      const { label } = curve;
      scorecardDocument.results.rows[label] = {};
      // add the top level elements.
      // make rowTitle and rowParameters maps, the display page can sort out stringifying them.
      // map the necessary row parameters
      // remove these params from the singleCurveParamNames list, all of the row parameters are either single select
      // or they are handled individually, so we remove the ones that are handled individually from the single select list.
      const notIncludedParams = ["label", "data-source", "validation-data-source"];
      const rowParameters = singleCurveParamNames.filter(function (paramName) {
        return !notIncludedParams.includes(paramName);
      });

      scorecardDocument.results.rows[curve.label].rowTitle = {
        label,
        datasource: curve["data-source"],
        validationDatasource: curve["validation-data-source"],
      };
      scorecardDocument.results.rows[curve.label].rowParameters = rowParameters;
      scorecardDocument.results.rows[curve.label].regions = regions;
      scorecardDocument.results.rows[curve.label].fcstlens = fcstLengths;
      scorecardDocument.results.rows[curve.label].data = {};
      regions.forEach(function (region) {
        if (scorecardDocument.results.rows[curve.label].data[region] === undefined) {
          scorecardDocument.results.rows[curve.label].data[region] = {};
        }
        curve.statistic.forEach(function (stat) {
          if (
            scorecardDocument.results.rows[curve.label].data[region][stat] === undefined
          ) {
            scorecardDocument.results.rows[curve.label].data[region][stat] = {};
          }
          curve.variable.forEach(function (variable) {
            // iterate the union of fcstLengths and if a curve doesn'thave one mark it undefined
            if (
              scorecardDocument.results.rows[curve.label].data[region][stat][
                variable
              ] === undefined
            ) {
              scorecardDocument.results.rows[curve.label].data[region][stat][variable] =
                {};
            }
            fcstLengths.forEach(function (fcstlen, index) {
              // this is where we will calculate the significances.
              // get a random number between 0 and 100
              let sval = 0;
              const val = Math.floor(Math.random() * 100);
              // use the random number to generate a weighted number between -2 and 2
              if (val >= 0 && val < 10) {
                sval = -2;
              } else if (val >= 10 && val < 30) {
                sval = -1;
              } else if (val >= 30 && val < 70) {
                sval = 0;
              } else if (val >= 70 && val < 90) {
                sval = 1;
              } else if (val >= 90 && val <= 100) {
                sval = 2;
              }

              if (
                scorecardDocument.results.rows[curve.label].fcstlens.includes(fcstlen)
              ) {
                scorecardDocument.results.rows[curve.label].data[region][stat][
                  variable
                ][fcstlen] = sval;
              } else {
                // mark this undefined
                scorecardDocument.results.rows[curve.label].data[region][stat][
                  variable
                ][fcstlen] = "undefined";
              }
            });
          });
        });
      });
    });
  // store the document
  try {
    const scDoc = JSON.stringify(scorecardDocument);
    const { id } = scorecardDocument;
    (async function (id, doc) {
      cbScorecardPool.upsertCB(id, doc);
    })(id, scDoc).then(() => {
      console.log("upserted doc with id", id);
    });
  } catch (err) {
    console.log(`error writing scorecard to database: ${err.message}`);
  }

  const result = {
    error: "",
    data: scorecardDocument.id,
    options: {},
    basis: {
      plotParams,
      queries: {},
    },
  };
  // save scorecard in the Scorecard collection
  // matsCollections.Scorecard.insert();
  plotFunction(result);
};
