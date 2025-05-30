/* eslint-disable no-shadow */
/* eslint-disable no-console */
import { Meteor } from "meteor/meteor";
import { matsTypes, matsParamUtils, matsCollections } from "meteor/randyp:mats-common";
import { fetch } from "meteor/fetch";

/* global Assets */

/** A function to sanitize JSON keys by replacing the "." character with "__DOT__" */
const sanitizeKeys = function (str) {
  const newStr = str.replace(/\./g, "__DOT__");
  return newStr;
};

const dealWithUATables = function (
  curve,
  regionValue,
  databaseValue,
  localQueryTemplate
) {
  let secondaryModelOption = "";
  let updatedQueryTemplate = localQueryTemplate;
  if (curve.application.includes("RAOB")) {
    if (["5", "14", "15", "16", "17", "18"].includes(regionValue)) {
      // get obs partial sums from HRRR_OPS
      secondaryModelOption = `, ${databaseValue}.HRRR_OPS_Areg${regionValue} as m1`;
    } else if (regionValue === "19") {
      // get obs partial sums from HRRR_HI
      secondaryModelOption = `, ${databaseValue}.HRRR_HI_Areg${regionValue} as m1`;
    } else {
      // get obs partial sums from the GFS
      secondaryModelOption = `, ${databaseValue}.GFS_Areg${regionValue} as m1`;
    }
    // facilitate the table join
    updatedQueryTemplate = updatedQueryTemplate.replace(
      /\{\{joinClause\}\}/g,
      "AND m0.date = m1.date AND m0.hour = m1.hour AND m0.mb10 = m1.mb10"
    );
  } else {
    // AMDAR tables have all partial sums so we can get them all from the main table
    updatedQueryTemplate = updatedQueryTemplate.replace(/m1/g, "m0");
    // no need to join
    updatedQueryTemplate = updatedQueryTemplate.replace(/\{\{joinClause\}\}/g, "");
  }
  // either add the m1 clause to the template or remove the secondary model option entirely
  updatedQueryTemplate = updatedQueryTemplate.replace(
    /\{\{secondaryModelOption\}\}/g,
    secondaryModelOption
  );
  return updatedQueryTemplate;
};

global.processScorecard = async function (plotParams) {
  /*
    displayScorecard structure:
    The left column isn't displayed, it's only for reference

    "title"        | userName name  scorecard name  submit date  processed date daterange |
    "blockTitle:"    | Block label   Data source   Control data source |
    "blockParameters"| single param1 single param2  ...."|
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

    "blockTitle:"    | Block label   Data source   Control data source |
    "blockParameters"| single param1 single param2  ...."|
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
        blocks: {
            Blocklabel1: {
                "appUrl": "the app url",
                "blockTitle":{"label":"Block label","dataSource":"dataSource","controlDataSource":"controlDataSource"},
                "blockParameters":{"param1:"param1 value", "param2":"param2 value",.....},
                "regions":["region1":"region2"....],
                "fcstlens":[1,3,6,9,...],
                'data': {
                    "stat1-var1":[[null,'u'],[null,'u'],[null,'u']....],
                    "stat1-var2":[[null,'u'],[null,'u'],[null,'u']....],
                    "stat1-var3":[[null,'u'],[null,'u'],[null,'u']....],
                    ....
                }
            },
            Blocklabel1: {
                "blockTitle":{"label":"Block label","dataSource":"dataSource","controlDataSource":"controlDataSource"},
                "blockParameters":{"param1:"param1 value", "param2":"param2 value",.....},
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
  const singleCurveParamNames = await matsParamUtils.getSingleSelectCurveParamNames();
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
      default:
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

  // create an id for the document
  let idDateRange = dateRange.replace(/ /g, "_");
  idDateRange = idDateRange.replace(/:/g, "_");

  const id = `SC:${name}:${processedAt}:${idDateRange}`;
  const version = "Version:V01";
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
    version,
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
  scorecardDocument.results.blocks = {};
  scorecardDocument.queryMap.blocks = {};
  // fill in the blocks - these are all initially default values
  plotParams.curves.forEach(async function (curve) {
    /**
     * Here we are going to pre-load as much as possible for the queries, *before*
     * we start with the hideous 6th degree loop. This will include:
     *
     * Loading the query template for this block
     * Retrieving all relevant metadata valueMaps for this block
     * Retrieving all the parameters which are constant for the entire block
     */

    // get query template for this block
    const application = (
      await matsCollections.application.findOneAsync({ name: "application" })
    ).sourceMap[curve.application];
    let queryTemplate = await Assets.getTextAsync(
      `sqlTemplates/tmpl_${application}_timeseries.sql`
    );
    queryTemplate = queryTemplate.replace(/\n|\t/g, "");

    let databaseValue;
    if (queryTemplate.includes("{{database}}")) {
      // pre-load the query-able database for this application
      // it is constant for the whole block so put it in the template
      databaseValue = (
        await matsCollections.application.findOneAsync({ name: "application" })
      ).optionsMap[curve.application];
      queryTemplate = queryTemplate.replace(/\{\{database\}\}/g, databaseValue);
    }

    let modelMap;
    if (queryTemplate.includes("{{model}}")) {
      // pre-load the modelMap metadata for this application
      modelMap = (
        await matsCollections["data-source"].findOneAsync({ name: "data-source" })
      ).optionsMap[curve.application];
    }

    let regionMap;
    if (queryTemplate.includes("{{region}}")) {
      // pre-load the regionMap metadata for this application
      regionMap = (await matsCollections.region.findOneAsync({ name: "region" }))
        .valuesMap[curve.application];
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
      thresholdMap = (
        await matsCollections.threshold.findOneAsync({ name: "threshold" })
      ).valuesMap[curve.application];
    }

    let statisticMap;
    if (queryTemplate.includes("{{statisticClause}}")) {
      // pre-load the statisticMap metadata for this application
      statisticMap = (
        await matsCollections.statistic.findOneAsync({ name: "statistic" })
      ).valuesMap[curve.application];
    }

    let variableMap;
    // trailing brackets intentionally omitted below -- DO NOT ALTER
    if (queryTemplate.includes("{{variable")) {
      // pre-load the variableMap metadata for this application
      variableMap = (await matsCollections.variable.findOneAsync({ name: "variable" }))
        .valuesMap[curve.application];
    }

    if (queryTemplate.includes("{{grid_scale}}")) {
      // pre-load the grid scale for this application
      // it is constant for the whole block so put it in the template
      const scaleMap = (await matsCollections.scale.findOneAsync({ name: "scale" }))
        .valuesMap[curve.application];
      const scaleValue = Object.keys(scaleMap).find(
        (key) => scaleMap[key] === curve.scale
      );
      queryTemplate = queryTemplate.replace(/\{\{grid_scale\}\}/g, scaleValue);
    }

    if (queryTemplate.includes("{{truth}}")) {
      // pre-load the truth for this application
      // it is constant for the whole block so put it in the template
      let truthValue;
      const truthMap = (await matsCollections.truth.findOneAsync({ name: "truth" }))
        .valuesMap[curve.application];
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
      // it is constant for the whole block so put it in the template
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
      // it is constant for the whole block so put it in the template
      const forecastTypeMap = (
        await matsCollections["forecast-type"].findOneAsync({ name: "forecast-type" })
      ).valuesMap[curve.application];
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

    // create the empty object for this block
    const { label } = curve;
    const fcstLengths =
      curve["forecast-length"] === undefined ? [] : curve["forecast-length"];
    const regions = curve.region === undefined ? [] : curve.region;

    // duplicate the curve so we're not modifying a function parameter, which the linter doesn't like
    const scorecardCurve = curve;

    scorecardDocument.results.blocks[label] = {};
    scorecardDocument.queryMap.blocks[label] = {};
    // add the top level elements.
    // make blockTitle and blockParameters maps, the display page can sort out stringifying them.
    // map the necessary block parameters
    // remove these params from the singleCurveParamNames list, all of the block parameters are either single select
    // or they are handled individually, so we remove the ones that are handled individually from the single select list.
    const notIncludedParams = ["label", "data-source", "control-data-source"];
    const blockParameters = singleCurveParamNames.filter(function (paramName) {
      return !notIncludedParams.includes(paramName);
    });

    scorecardDocument.results.blocks[label].blockTitle = {
      label,
      dataSource: scorecardCurve["data-source"],
      controlDataSource: scorecardCurve["control-data-source"],
    };
    const appName = Meteor.settings.public.app;
    const appUrl = `${Meteor.settings.public.home}/${appName}`;
    scorecardDocument.results.blocks[label].blockApplication = appUrl;
    scorecardDocument.results.blocks[label].blockParameters = blockParameters;
    scorecardDocument.results.blocks[label].regions = regions;
    scorecardDocument.results.blocks[label].fcstlens = fcstLengths;
    scorecardDocument.results.blocks[label].data = {};
    scorecardDocument.queryMap.blocks[label].data = {};
    scorecardCurve.threshold =
      scorecardCurve.threshold === undefined
        ? ["threshold_NA"]
        : scorecardCurve.threshold;
    scorecardCurve.level =
      scorecardCurve.level === undefined ? ["level_NA"] : scorecardCurve.level;
    regions.forEach(function (regionText) {
      const region = sanitizeKeys(regionText);
      if (scorecardDocument.results.blocks[label].data[region] === undefined) {
        scorecardDocument.results.blocks[label].data[region] = {};
        scorecardDocument.queryMap.blocks[label].data[region] = {};
      }
      scorecardCurve.statistic.forEach(function (statText) {
        const stat = sanitizeKeys(statText);
        if (scorecardDocument.results.blocks[label].data[region][stat] === undefined) {
          scorecardDocument.results.blocks[label].data[region][stat] = {};
          scorecardDocument.queryMap.blocks[label].data[region][stat] = {};
        }
        scorecardCurve.variable.forEach(function (variableText) {
          const variable = sanitizeKeys(variableText);
          if (
            scorecardDocument.results.blocks[label].data[region][stat][variable] ===
            undefined
          ) {
            scorecardDocument.results.blocks[label].data[region][stat][variable] = {};
            scorecardDocument.queryMap.blocks[label].data[region][stat][variable] = {};
          }
          scorecardCurve.threshold.forEach(function (thresholdText) {
            const threshold = sanitizeKeys(thresholdText);
            if (
              scorecardDocument.results.blocks[label].data[region][stat][variable][
                threshold
              ] === undefined
            ) {
              scorecardDocument.results.blocks[label].data[region][stat][variable][
                threshold
              ] = {};
              scorecardDocument.queryMap.blocks[label].data[region][stat][variable][
                threshold
              ] = {};
            }
            scorecardCurve.level.forEach(function (levelText) {
              const level = sanitizeKeys(levelText);
              if (
                scorecardDocument.results.blocks[label].data[region][stat][variable][
                  threshold
                ][level] === undefined
              ) {
                scorecardDocument.results.blocks[label].data[region][stat][variable][
                  threshold
                ][level] = {};
                scorecardDocument.queryMap.blocks[label].data[region][stat][variable][
                  threshold
                ][level] = {};
              }
              fcstLengths.forEach(function (fcstlenText) {
                const fcstlen = sanitizeKeys(fcstlenText);

                // make deep copy of query template
                let localQueryTemplate = JSON.parse(JSON.stringify(queryTemplate));

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

                // populate statisticClause in query template
                if (localQueryTemplate.includes("{{statisticClause}}")) {
                  const statisticClauseValue = statisticMap[statText][0].split(",")[0];
                  localQueryTemplate = localQueryTemplate.replace(
                    /\{\{statisticClause\}\}/g,
                    statisticClauseValue
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
                  for (let vidx = 0; vidx < variableArray.length; vidx += 1) {
                    const replaceString = `{{variable${vidx.toString()}}}`;
                    const regex = new RegExp(replaceString, "g");
                    localQueryTemplate = localQueryTemplate.replace(
                      regex,
                      variableArray[vidx]
                    );
                  }
                }

                // populate region in query template
                if (localQueryTemplate.includes("{{region}}")) {
                  const regionValue = Object.keys(regionMap).find(
                    (key) => regionMap[key] === regionText
                  );
                  if (application === "upperair") {
                    // the upper air tables are unfortuately really inconsistent and need some handling
                    localQueryTemplate = dealWithUATables(
                      scorecardCurve,
                      regionValue,
                      databaseValue,
                      localQueryTemplate
                    );
                  }
                  localQueryTemplate = localQueryTemplate.replace(
                    /\{\{region\}\}/g,
                    regionValue
                  );
                }

                // populate experimental model in query template
                const experimentalModelValue = modelMap[scorecardCurve["data-source"]];
                const experimentalQueryTemplate = localQueryTemplate.replace(
                  /\{\{model\}\}/g,
                  experimentalModelValue
                );

                // populate control model in query template
                const controlModelValue =
                  modelMap[scorecardCurve["control-data-source"]];
                const controlQueryTemplate = localQueryTemplate.replace(
                  /\{\{model\}\}/g,
                  controlModelValue
                );

                scorecardDocument.queryMap.blocks[label].data[region][stat][variable][
                  threshold
                ][level][fcstlen] = {
                  experimentalQueryTemplate,
                  controlQueryTemplate,
                };

                // this is where we will calculate the significances.
                // initialize with a fill value
                const sval = -9999;

                if (
                  scorecardDocument.results.blocks[label].fcstlens.includes(fcstlen)
                ) {
                  scorecardDocument.results.blocks[label].data[region][stat][variable][
                    threshold
                  ][level][fcstlen] = sval;
                } else {
                  // mark this undefined
                  scorecardDocument.results.blocks[label].data[region][stat][variable][
                    threshold
                  ][level][fcstlen] = "undefined";
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

    // need MAJORITY_AND_PERSIST_TO_ACTIVE to be assured that the document is available for the
    // vxDataProcessor before notifying the vxDataProcessor service to process it.
    // see https://docs.couchbase.com/sdk-api/couchbase-node-client/enums/DurabilityLevel.html
    // eslint-disable-next-line no-undef
    const options = {
      durabilityLevel: global.cbScorecardPool.getDurabilityOption(
        "MAJORITY_AND_PERSIST_TO_ACTIVE"
      ),
    };
    await global.cbScorecardPool.upsertCB(id, scDoc, options);
    console.log("upserted doc with id", id);
    //   // now go to status page
    // notify the vxDataProcessor service that the document is ready to be processed
    // expects something like this ...
    // "vxdataProcessorUrl":"https://ascend-test1.gsd.esrl.noaa.gov:8080/jobs/create/"
    // ...
    // to be in the public section of the scorecard settings file
    // NOTE: For now we do not have scheduled jobs. When we do we will need to change this.
    const notifyDataProcessorURL = `${Meteor.settings.public.vxdataProcessorUrl}`;
    const sDocument = `{"docid": "${id}"}`;

    try {
      await fetch(notifyDataProcessorURL, {
        method: "POST",
        body: `${sDocument}`,
      });
    } catch (err) {
      console.log(err.message);
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
    return result;
  } catch (err) {
    console.log(`error writing scorecard to database: ${err.message}`);
  }
  return null;
};
