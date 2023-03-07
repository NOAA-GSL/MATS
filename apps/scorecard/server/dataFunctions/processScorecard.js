import { matsTypes, matsParamUtils, matsCollections } from "meteor/randyp:mats-common";

/** A function to sanitize JSON keys by replacing the "." character with "__DOT__" */
const sanitizeKeys = function (str) {
  str = str.replace(/\./g, "__DOT__");
  return str;
};

processScorecard = function (plotParams, plotFunction) {
  /*
    displayScorecard structure:
    The left column isn't displayed, it's only for reference

    "title"        | userName name  scorecard name  submit date  processed date daterange |
    "rowTitle:"    | Row label   Data source   Control data source |
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

    "rowTitle:"    | Row label   Data source   Control data source |
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
        D (data source major), d (data source minor),
        V (control source major), v (control source minor),
        n (neutral), u (unknown).

        fcstLengths are the union of all the forecast-length's for all the curves
        regions are the union of all the regions for all the curves
    ***


    results: {
        "title":userName + " " + name + " " + submitDate + " " + processedDate + " " + daterange,
        rows: {
            Rowlabel1: {
                "rowTitle":{"label":"Row label","dataSource":"dataSource","controlDataSource":"controlDataSource"},
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
                "rowTitle":{"label":"Row label","dataSource":"dataSource","controlDataSource":"controlDataSource"},
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

  const fs = require("fs");

  // create or retrieve the scorecard document
  // get the submission epoch - right now
  const { submitEpoch } = plotParams;
  const processedAt = 0; // should be filled in when processing is finished
  const { userName } = plotParams;
  const name = plotParams["scorecard-name"];
  const singleCurveParamNames = matsParamUtils.getSingleSelectCurveParamNames();
  singleCurveParamNames.push("valid-time"); // is a multi-select but never goes on scorecard
  // We are thinking that the combination of userName/scorecardName/submitEpoch/processedEpoch is uniq

  let interval = {};
  let dateRange;
  if (plotParams["scorecard-schedule-mode"] === "Recurring") {
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
    dateRange = interval;
  } else {
    dateRange = plotParams.dates;
  }

  // get the union of the fcst-length arrays of all the curves
  const fcstLengthsSet = new Set();
  plotParams.curves.forEach(function (curve) {
    if (!curve["forecast-length"]) curve["forecast-length"] = ["0"];
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
    schedule: plotParams["scorecard-schedule-mode"],
    endsOn: plotParams.scorecardEndsOn,
    processedAt,
    significanceThresholds,
    significanceColors,
    results: {},
    queryMap: {},
  };

  // insert a title (will change when processedAt is established - easy substitution for the word 'processedAt')
  scorecardDocument.results.title = title;
  scorecardDocument.results.rows = {};
  scorecardDocument.queryMap.rows = {};
  // fill in the rows - these are all initially default values
  plotParams.curves.forEach(function (curve) {
    /**
     * Here we are going to pre-load as much as possible for the queries, *before*
     * we start with the hideous 6th degree loop. This will include:
     *
     * Loading the query template for this row
     * Retrieving all relevant metadata valueMaps for this row
     * Retrieving all the parameters which are constant for the entire row
     */

    // get query template for this row
    const application = matsCollections.application.findOne({ name: "application" })
      .sourceMap[curve.application];
    let queryTemplate = fs.readFileSync(
      `${process.env.PWD}/server/dataFunctions/sqlTemplates/tmpl_${application}_timeseries.sql`,
      "utf8"
    );

    if (queryTemplate.includes("{{database}}")) {
      // pre-load the query-able database for this application
      // it is constant for the whole row so put it in the template
      const databaseValue = matsCollections.application.findOne({
        name: "application",
      }).optionsMap[curve.application];
      queryTemplate = queryTemplate.replace(/\{\{database\}\}/g, databaseValue);
    }

    let regionMap;
    if (queryTemplate.includes("{{region}}")) {
      // pre-load the regionMap metadata for this application
      regionMap = matsCollections.region.findOne({
        name: "region",
      }).valuesMap[curve.application];
      // the upperair apps have weird regionMap notation
      if (curve.application.includes("RAOB")) {
        regionMap = regionMap.ID;
      } else if (curve.application.includes("AMDAR")) {
        regionMap = regionMap.shortName;
      }
    }

    let thresholdMap;
    if (queryTemplate.includes("{{threshold}}")) {
      // pre-load the thresholdMap metadata for this application
      thresholdMap = matsCollections.threshold.findOne({
        name: "threshold",
      }).valuesMap[curve.application];
    }

    let variableMap;
    // trailing brackets intentionally omitted below -- DO NOT ALTER
    if (queryTemplate.includes("{{variable")) {
      // pre-load the variableMap metadata for this application
      variableMap = matsCollections.variable.findOne({
        name: "variable",
      }).valuesMap[curve.application];
    }

    if (queryTemplate.includes("{{grid_scale}}")) {
      // pre-load the grid scale for this application
      // it is constant for the whole row so put it in the template
      const scaleMap = matsCollections.scale.findOne({
        name: "scale",
      }).valuesMap[curve.application];
      const scaleValue = Object.keys(scaleMap).find(
        (key) => scaleMap[key] === curve.scale
      );
      queryTemplate = queryTemplate.replace(/\{\{grid_scale\}\}/g, scaleValue);
    }

    if (queryTemplate.includes("{{truth}}")) {
      // pre-load the truth for this application
      // it is constant for the whole row so put it in the template
      let truthValue;
      const truthMap = matsCollections.truth.findOne({
        name: "truth",
      }).valuesMap[curve.application];
      // not all the apps have a defined truth map
      if (truthMap) {
        truthValue = Object.keys(truthMap).find((key) => truthMap[key] === curve.truth);
      } else {
        truthValue = curve.truth !== "All" ? `_${curve.truth}` : "";
      }
      queryTemplate = queryTemplate.replace(/\{\{truth\}\}/g, truthValue);
    }

    if (queryTemplate.includes("{{validTimes}}")) {
      // pre-load the validTimes for this application
      // it is constant for the whole row so put it in the template
      const validTimes =
        curve["valid-time"] &&
        curve["valid-time"].length !== 0 &&
        curve["valid-time"] !== matsTypes.InputTypes.unused
          ? curve["valid-time"]
          : "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23";
      queryTemplate = queryTemplate.replace(/\{\{validTimes\}\}/g, validTimes);
    }

    if (queryTemplate.includes("{{forecastType}}")) {
      // pre-load the forecastType for this application
      // it is constant for the whole row so put it in the template
      const forecastTypeMap = matsCollections["forecast-type"].findOne({
        name: "forecast-type",
      }).valuesMap[curve.application];
      const forecastTypeValue = Object.keys(forecastTypeMap).find(
        (key) => forecastTypeMap[key] === curve["forecast-type"]
      );
      // The database schemas are different for the two apps with a forecast type!!
      const forecastTypeClause =
        curve.application === "24 Hour Precipitation"
          ? `m0.num_fcsts = ${forecastTypeValue}`
          : `m0.accum_len = ${forecastTypeValue}`;
      queryTemplate = queryTemplate.replace(
        /\{\{forecastType\}\}/g,
        forecastTypeClause
      );
    }

    // create the empty object for this row
    const { label } = curve;
    scorecardDocument.results.rows[label] = {};
    scorecardDocument.queryMap.rows[label] = {};
    // add the top level elements.
    // make rowTitle and rowParameters maps, the display page can sort out stringifying them.
    // map the necessary row parameters
    // remove these params from the singleCurveParamNames list, all of the row parameters are either single select
    // or they are handled individually, so we remove the ones that are handled individually from the single select list.
    const notIncludedParams = ["label", "data-source", "control-data-source"];
    const rowParameters = singleCurveParamNames.filter(function (paramName) {
      return !notIncludedParams.includes(paramName);
    });

    scorecardDocument.results.rows[curve.label].rowTitle = {
      label,
      dataSource: curve["data-source"],
      controlDataSource: curve["control-data-source"],
    };
    scorecardDocument.results.rows[curve.label].rowParameters = rowParameters;
    scorecardDocument.results.rows[curve.label].regions = regions;
    scorecardDocument.results.rows[curve.label].fcstlens = fcstLengths;
    scorecardDocument.results.rows[curve.label].data = {};
    scorecardDocument.queryMap.rows[curve.label].data = {};
    curve.threshold =
      curve.threshold === undefined ? ["threshold_NA"] : curve.threshold;
    curve.level = curve.level === undefined ? ["level_NA"] : curve.level;
    regions.forEach(function (regionText) {
      const region = sanitizeKeys(regionText);
      if (scorecardDocument.results.rows[curve.label].data[region] === undefined) {
        scorecardDocument.results.rows[curve.label].data[region] = {};
        scorecardDocument.queryMap.rows[curve.label].data[region] = {};
      }
      curve.statistic.forEach(function (statText) {
        const stat = sanitizeKeys(statText);
        if (
          scorecardDocument.results.rows[curve.label].data[region][stat] === undefined
        ) {
          scorecardDocument.results.rows[curve.label].data[region][stat] = {};
          scorecardDocument.queryMap.rows[curve.label].data[region][stat] = {};
        }
        curve.variable.forEach(function (variableText) {
          const variable = sanitizeKeys(variableText);
          if (
            scorecardDocument.results.rows[curve.label].data[region][stat][variable] ===
            undefined
          ) {
            scorecardDocument.results.rows[curve.label].data[region][stat][variable] =
              {};
            scorecardDocument.queryMap.rows[curve.label].data[region][stat][variable] =
              {};
          }
          curve.threshold.forEach(function (thresholdText) {
            const threshold = sanitizeKeys(thresholdText);
            if (
              scorecardDocument.results.rows[curve.label].data[region][stat][variable][
                threshold
              ] === undefined
            ) {
              scorecardDocument.results.rows[curve.label].data[region][stat][variable][
                threshold
              ] = {};
              scorecardDocument.queryMap.rows[curve.label].data[region][stat][variable][
                threshold
              ] = {};
            }
            curve.level.forEach(function (levelText) {
              const level = sanitizeKeys(levelText);
              if (
                scorecardDocument.results.rows[curve.label].data[region][stat][
                  variable
                ][threshold][level] === undefined
              ) {
                scorecardDocument.results.rows[curve.label].data[region][stat][
                  variable
                ][threshold][level] = {};
                scorecardDocument.queryMap.rows[curve.label].data[region][stat][
                  variable
                ][threshold][level] = {};
              }
              fcstLengths.forEach(function (fcstlenText) {
                const fcstlen = sanitizeKeys(fcstlenText);

                // make deep copy of query template
                let localQueryTemplate = JSON.parse(JSON.stringify(queryTemplate));

                // populate region in query template
                if (localQueryTemplate.includes("{{region}}")) {
                  let regionValue = Object.keys(regionMap).find(
                    (key) => regionMap[key] === regionText
                  );
                  if (curve.application.includes("RAOB")) {
                    // RAOB tables need a region prefix
                    regionValue = `_Areg${regionValue}`;
                  }
                  localQueryTemplate = localQueryTemplate.replace(
                    /\{\{region\}\}/g,
                    regionValue
                  );
                }

                // populate forecastLength in query template
                if (localQueryTemplate.includes("{{forecastLength}}")) {
                  localQueryTemplate = localQueryTemplate.replace(
                    /\{\{forecastLength\}\}/g,
                    fcstlenText
                  );
                }

                // populate threshold in query template
                if (localQueryTemplate.includes("{{threshold}}")) {
                  let thresholdValue = Object.keys(thresholdMap).find(
                    (key) => thresholdMap[key] === thresholdText
                  );
                  // radar thresholds need to be scaled
                  thresholdValue =
                    application === "radar"
                      ? (Number(thresholdValue) / 10000).toString()
                      : thresholdValue;
                  localQueryTemplate = localQueryTemplate.replace(
                    /\{\{threshold\}\}/g,
                    thresholdValue
                  );
                }

                // populate level in query template
                if (localQueryTemplate.includes("{{level}}")) {
                  localQueryTemplate = localQueryTemplate.replace(
                    /\{\{level\}\}/g,
                    levelText
                  );
                }

                // populate variable in query template -- excepting partial sums
                if (localQueryTemplate.includes("{{variable}}")) {
                  const variableValue = variableMap
                    ? variableMap[variableText]
                    : variableText;
                  localQueryTemplate = localQueryTemplate.replace(
                    /\{\{variable\}\}/g,
                    variableValue
                  );
                }

                // populate variable in query template -- partial sums
                if (localQueryTemplate.includes("{{variable0}}")) {
                  const variableArray = variableMap[variableText];
                  for (let vidx = 0; vidx < variableArray.length; vidx++) {
                    const replaceString = `{{variable${vidx.toString()}}}`;
                    const regex = new RegExp(replaceString, "g");
                    localQueryTemplate = localQueryTemplate.replace(
                      regex,
                      variableArray[vidx]
                    );
                  }
                }

                debugger;

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
                  ][threshold][level][fcstlen] = sval;
                } else {
                  // mark this undefined
                  scorecardDocument.results.rows[curve.label].data[region][stat][
                    variable
                  ][threshold][level][fcstlen] = "undefined";
                }
              });
            });
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
