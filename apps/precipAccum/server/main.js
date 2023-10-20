/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from "meteor/meteor";
import { mysql } from "meteor/pcel:mysql";
import { moment } from "meteor/momentjs:moment";
import {
  matsMethods,
  matsTypes,
  matsCollections,
  matsDataUtils,
  matsDataQueryUtils,
  matsParamUtils,
  matsCouchbaseUtils,
} from "meteor/randyp:mats-common";

// This app combines two previous apps, precipitation24hr, and precipitationSub24hr.
// This is where we store the databases referenced by those apps.
const variableDBNames = {
  "24 Hour Precipitation": "precip",
  "Sub 24 Hour Precipitation": "precip2",
};
const variables = Object.keys(variableDBNames);

// determined in doCurveParanms
let minDate;
let maxDate;
let dstr;

const doPlotParams = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    matsCollections.PlotParams.remove({});
  }
  if (matsCollections.PlotParams.find().count() === 0) {
    matsCollections.PlotParams.insert({
      name: "dates",
      type: matsTypes.InputTypes.dateRange,
      options: [""],
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ["variable", "data-source"],
      controlButtonCovered: true,
      default: dstr,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 1,
      help: "dateHelp.html",
    });

    const plotFormats = {};
    plotFormats[matsTypes.PlotFormats.matching] = "show matching diffs";
    plotFormats[matsTypes.PlotFormats.pairwise] = "pairwise diffs";
    plotFormats[matsTypes.PlotFormats.none] = "no diffs";
    matsCollections.PlotParams.insert({
      name: "plotFormat",
      type: matsTypes.InputTypes.radioGroup,
      optionsMap: plotFormats,
      options: [
        matsTypes.PlotFormats.matching,
        matsTypes.PlotFormats.pairwise,
        matsTypes.PlotFormats.none,
      ],
      default: matsTypes.PlotFormats.none,
      controlButtonCovered: false,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3,
    });

    const yAxisOptionsMap = {
      "Relative frequency": ["relFreq"],
      Number: ["number"],
    };
    matsCollections.PlotParams.insert({
      name: "histogram-yaxis-controls",
      type: matsTypes.InputTypes.select,
      optionsMap: yAxisOptionsMap,
      options: Object.keys(yAxisOptionsMap),
      default: Object.keys(yAxisOptionsMap)[0],
      controlButtonCovered: true,
      controlButtonText: "Y-axis mode",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 2,
    });

    const binOptionsMap = {
      "Default bins": ["default"],
      "Set number of bins": ["binNumber"],
      "Make zero a bin bound": ["zeroBound"],
      "Choose a bin bound": ["chooseBound"],
      "Set number of bins and make zero a bin bound": ["binNumberWithZero"],
      "Set number of bins and choose a bin bound": ["binNumberWithChosen"],
      "Manual bins": ["manual"],
      "Manual bin start, number, and stride": ["manualStride"],
    };
    matsCollections.PlotParams.insert({
      name: "histogram-bin-controls",
      type: matsTypes.InputTypes.select,
      optionsMap: binOptionsMap,
      options: Object.keys(binOptionsMap),
      hideOtherFor: {
        "bin-number": [
          "Default bins",
          "Make zero a bin bound",
          "Manual bins",
          "Choose a bin bound",
        ],
        "bin-pivot": [
          "Default bins",
          "Set number of bins",
          "Make zero a bin bound",
          "Set number of bins and make zero a bin bound",
          "Manual bins",
          "Manual bin start, number, and stride",
        ],
        "bin-start": [
          "Default bins",
          "Set number of bins",
          "Make zero a bin bound",
          "Choose a bin bound",
          "Set number of bins and make zero a bin bound",
          "Set number of bins and choose a bin bound",
          "Manual bins",
        ],
        "bin-stride": [
          "Default bins",
          "Set number of bins",
          "Make zero a bin bound",
          "Choose a bin bound",
          "Set number of bins and make zero a bin bound",
          "Set number of bins and choose a bin bound",
          "Manual bins",
        ],
        "bin-bounds": [
          "Default bins",
          "Set number of bins",
          "Make zero a bin bound",
          "Choose a bin bound",
          "Set number of bins and make zero a bin bound",
          "Set number of bins and choose a bin bound",
          "Manual bin start, number, and stride",
        ],
      },
      default: Object.keys(binOptionsMap)[0],
      controlButtonCovered: true,
      controlButtonText: "customize bins",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 2,
    });

    matsCollections.PlotParams.insert({
      name: "bin-number",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "2",
      max: "100",
      step: "any",
      default: "12",
      controlButtonCovered: true,
      controlButtonText: "number of bins",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 2,
    });

    matsCollections.PlotParams.insert({
      name: "bin-pivot",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "-10000",
      max: "10000",
      step: "any",
      default: "0",
      controlButtonCovered: true,
      controlButtonText: "bin pivot value",
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 2,
    });

    matsCollections.PlotParams.insert({
      name: "bin-start",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "-10000",
      max: "10000",
      step: "any",
      default: "0",
      controlButtonCovered: true,
      controlButtonText: "bin start",
      displayOrder: 6,
      displayPriority: 1,
      displayGroup: 2,
    });

    matsCollections.PlotParams.insert({
      name: "bin-stride",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "-10000",
      max: "10000",
      step: "any",
      default: "0",
      controlButtonCovered: true,
      controlButtonText: "bin stride",
      displayOrder: 7,
      displayPriority: 1,
      displayGroup: 2,
    });

    matsCollections.PlotParams.insert({
      name: "bin-bounds",
      type: matsTypes.InputTypes.textInput,
      optionsMap: {},
      options: [],
      default: " ",
      controlButtonCovered: true,
      controlButtonText: "bin bounds (Enter numbers separated by commas)",
      displayOrder: 8,
      displayPriority: 1,
      displayGroup: 2,
    });

    const xOptionsMap = {
      Threshold: "select m0.trsh as xVal, ",
      "Valid Date": "select m0.time as xVal, ",
    };

    matsCollections.PlotParams.insert({
      name: "x-axis-parameter",
      type: matsTypes.InputTypes.select,
      options: Object.keys(xOptionsMap),
      optionsMap: xOptionsMap,
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(xOptionsMap)[1],
      controlButtonVisibility: "block",
      displayOrder: 9,
      displayPriority: 1,
      displayGroup: 2,
    });

    const yOptionsMap = {
      Threshold: "m0.trsh as yVal, ",
      "Valid Date": "m0.time as yVal, ",
    };

    matsCollections.PlotParams.insert({
      name: "y-axis-parameter",
      type: matsTypes.InputTypes.select,
      options: Object.keys(yOptionsMap),
      optionsMap: yOptionsMap,
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(yOptionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 10,
      displayPriority: 1,
      displayGroup: 2,
    });

    matsCollections.PlotParams.insert({
      name: "significance",
      type: matsTypes.InputTypes.select,
      options: ["none", "significance at 95th percentile"],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: "none",
      controlButtonVisibility: "block",
      controlButtonText: "overlay significance",
      displayOrder: 11,
      displayPriority: 1,
      displayGroup: 2,
    });
  } else {
    // need to update the dates selector if the metadata has changed
    const currentParam = matsCollections.PlotParams.findOne({ name: "dates" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.default, dstr)
    ) {
      // have to reload model data
      matsCollections.PlotParams.update(
        { name: "dates" },
        {
          $set: {
            startDate: minDate,
            stopDate: maxDate,
            default: dstr,
          },
        }
      );
    }
  }
};

const doCurveParams = function () {
  // force a reset if requested - simply remove all the existing params to force a reload
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    const params = matsCollections.CurveParamsInfo.find({
      curve_params: { $exists: true },
    }).fetch()[0].curve_params;
    for (let cp = 0; cp < params.length; cp += 1) {
      matsCollections[params[cp]].remove({});
    }
  }

  const modelOptionsMap = {};
  let modelDateRangeMap = {};
  const regionModelOptionsMap = {};
  const thresholdsModelOptionsMap = {};
  const scaleModelOptionsMap = {};
  const fcstTypeModelOptionsMap = {};
  const allRegionValuesMap = {};
  const allThresholdValuesMap = {};
  const allScaleValuesMap = {};
  const allFcstTypeValuesMap = {};

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      metadataPool, // eslint-disable-line no-undef
      "select short_name,description from region_descriptions;"
    );
    for (let j = 0; j < rows.length; j += 1) {
      allRegionValuesMap[rows[j].short_name.trim()] = rows[j].description.trim();
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    for (let didx = 0; didx < variables.length; didx += 1) {
      allThresholdValuesMap[variables[didx]] = {};
      const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
        sumPool, // eslint-disable-line no-undef
        `select trsh,description from ${
          variableDBNames[variables[didx]]
        }.threshold_descriptions;`
      );
      for (let j = 0; j < rows.length; j += 1) {
        allThresholdValuesMap[variables[didx]][rows[j].trsh.trim()] =
          rows[j].description.trim();
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    for (let didx = 0; didx < variables.length; didx += 1) {
      allScaleValuesMap[variables[didx]] = {};
      const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
        sumPool, // eslint-disable-line no-undef
        `select scle,description from ${
          variableDBNames[variables[didx]]
        }.scale_descriptions;`
      );
      for (let j = 0; j < rows.length; j += 1) {
        allScaleValuesMap[variables[didx]][rows[j].scle.trim()] =
          rows[j].description.trim();
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    for (let didx = 0; didx < variables.length; didx += 1) {
      allFcstTypeValuesMap[variables[didx]] = {};
      const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
        sumPool, // eslint-disable-line no-undef
        `select fcst_type,description from ${
          variableDBNames[variables[didx]]
        }.fcst_type_descriptions;`
      );
      for (let j = 0; j < rows.length; j += 1) {
        allFcstTypeValuesMap[variables[didx]][rows[j].fcst_type.trim()] =
          rows[j].description.trim();
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    for (let didx = 0; didx < variables.length; didx += 1) {
      const variable = variables[didx];
      modelOptionsMap[variable] = {};
      modelDateRangeMap[variable] = {};
      thresholdsModelOptionsMap[variable] = {};
      scaleModelOptionsMap[variable] = {};
      fcstTypeModelOptionsMap[variable] = {};
      regionModelOptionsMap[variable] = {};

      const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
        sumPool, // eslint-disable-line no-undef
        `select model,regions,display_text,fcst_types,trsh,scle,mindate,maxdate from ${variableDBNames[variable]}.regions_per_model_mats_all_categories order by display_category, display_order;`
      );
      for (let i = 0; i < rows.length; i += 1) {
        const modelValue = rows[i].model.trim();
        const model = rows[i].display_text.trim();
        modelOptionsMap[variable][model] = [modelValue];

        const rowMinDate = moment
          .utc(rows[i].mindate * 1000)
          .format("MM/DD/YYYY HH:mm");
        const rowMaxDate = moment
          .utc(rows[i].maxdate * 1000)
          .format("MM/DD/YYYY HH:mm");
        modelDateRangeMap[variable][model] = {
          minDate: rowMinDate,
          maxDate: rowMaxDate,
        };

        const fcstTypes = rows[i].fcst_types;
        fcstTypeModelOptionsMap[variable][model] = fcstTypes
          .split(",")
          .map(Function.prototype.call, String.prototype.trim)
          .map(function (fcstType) {
            return allFcstTypeValuesMap[variable][fcstType.replace(/'|\[|\]/g, "")];
          });

        const thresholds = rows[i].trsh;
        thresholdsModelOptionsMap[variable][model] = thresholds
          .split(",")
          .map(Function.prototype.call, String.prototype.trim)
          .map(function (threshold) {
            return allThresholdValuesMap[variable][threshold.replace(/'|\[|\]/g, "")];
          });

        const scales = rows[i].scle;
        scaleModelOptionsMap[variable][model] = scales
          .split(",")
          .map(Function.prototype.call, String.prototype.trim)
          .map(function (scale) {
            return allScaleValuesMap[variable][scale.replace(/'|\[|\]/g, "")];
          });

        const { regions } = rows[i];
        regionModelOptionsMap[variable][model] = regions
          .split(",")
          .map(Function.prototype.call, String.prototype.trim)
          .map(function (region) {
            return allRegionValuesMap[region.replace(/'|\[|\]/g, "")];
          });
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }

  if (matsCollections.label.findOne({ name: "label" }) === undefined) {
    matsCollections.label.insert({
      name: "label",
      type: matsTypes.InputTypes.textInput,
      optionsMap: {},
      options: [],
      controlButtonCovered: true,
      default: "",
      unique: true,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 1,
      help: "label.html",
    });
  }

  if (matsCollections.variable.findOne({ name: "variable" }) === undefined) {
    matsCollections.variable.insert({
      name: "variable",
      type: matsTypes.InputTypes.select,
      optionsMap: variableDBNames,
      options: variables,
      dates: modelDateRangeMap,
      dependentNames: ["data-source"],
      controlButtonCovered: true,
      default: variables[0],
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 1,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.variable.findOne({ name: "variable" });
    if (!matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap)) {
      // have to reload variable data
      matsCollections.variable.update(
        { name: "variable" },
        {
          $set: {
            dates: modelDateRangeMap,
          },
        }
      );
    }
  }

  if (matsCollections["data-source"].findOne({ name: "data-source" }) === undefined) {
    matsCollections["data-source"].insert({
      name: "data-source",
      type: matsTypes.InputTypes.select,
      optionsMap: modelOptionsMap,
      options: Object.keys(modelOptionsMap[variables[0]]),
      superiorNames: ["variable"],
      dependentNames: [
        "region",
        "threshold",
        "scale",
        "forecast-type",
        "dates",
        "curve-dates",
      ],
      controlButtonCovered: true,
      default: Object.keys(modelOptionsMap[variables[0]])[0],
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 1,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections["data-source"].findOne({
      name: "data-source",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
      // have to reload model data
      matsCollections["data-source"].update(
        { name: "data-source" },
        {
          $set: {
            optionsMap: modelOptionsMap,
            options: Object.keys(modelOptionsMap[variables[0]]),
            default: Object.keys(modelOptionsMap[variables[0]])[0],
          },
        }
      );
    }
  }

  if (matsCollections.region.findOne({ name: "region" }) === undefined) {
    matsCollections.region.insert({
      name: "region",
      type: matsTypes.InputTypes.select,
      optionsMap: regionModelOptionsMap,
      options:
        regionModelOptionsMap[variables[0]][
          Object.keys(regionModelOptionsMap[variables[0]])[0]
        ],
      valuesMap: allRegionValuesMap,
      superiorNames: ["variable", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default:
        regionModelOptionsMap[variables[0]][
          Object.keys(regionModelOptionsMap[variables[0]])[0]
        ][0],
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 2,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.region.findOne({ name: "region" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionModelOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, allRegionValuesMap)
    ) {
      // have to reload region data
      matsCollections.region.update(
        { name: "region" },
        {
          $set: {
            optionsMap: regionModelOptionsMap,
            valuesMap: allRegionValuesMap,
            options:
              regionModelOptionsMap[variables[0]][
                Object.keys(regionModelOptionsMap[variables[0]])[0]
              ],
            default:
              regionModelOptionsMap[variables[0]][
                Object.keys(regionModelOptionsMap[variables[0]])[0]
              ][0],
          },
        }
      );
    }
  }

  if (matsCollections.statistic.findOne({ name: "statistic" }) === undefined) {
    const optionsMap = {
      "CSI (Critical Success Index)": ["ctc", "x100", 100],

      "TSS (True Skill Score)": ["ctc", "x100", 100],

      "PODy (POD of value > threshold)": ["ctc", "x100", 100],

      "PODn (POD of value < threshold)": ["ctc", "x100", 100],

      "FAR (False Alarm Ratio)": ["ctc", "x100", 0],

      "Bias (forecast/actual)": ["ctc", "Ratio", 1],

      "HSS (Heidke Skill Score)": ["ctc", "x100", 100],

      "ETS (Equitable Threat Score)": ["ctc", "x100", 100],

      "Nlow (Number of obs < threshold (false alarms + correct nulls))": [
        "ctc",
        "Number",
        null,
      ],

      "Nhigh (Number of obs > threshold (hits + misses))": ["ctc", "Number", null],

      "Ntot (Total number of obs, (Nlow + Nhigh))": ["ctc", "Number", null],

      "Ratio Nlow / Ntot ((fa + cn)/(hit + miss + fa + cn))": ["ctc", "Ratio", null],

      "Ratio Nhigh / Ntot ((hit + miss)/(hit + miss + fa + cn))": [
        "ctc",
        "Ratio",
        null,
      ],

      "N times*levels(*stations if station plot) per graph point": [
        "ctc",
        "Number",
        null,
      ],
    };
    matsCollections.statistic.insert({
      name: "statistic",
      type: matsTypes.InputTypes.select,
      optionsMap,
      options: Object.keys(optionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (matsCollections.threshold.findOne({ name: "threshold" }) === undefined) {
    matsCollections.threshold.insert({
      name: "threshold",
      type: matsTypes.InputTypes.select,
      optionsMap: thresholdsModelOptionsMap,
      options:
        thresholdsModelOptionsMap[variables[0]][
          Object.keys(thresholdsModelOptionsMap[variables[0]])[0]
        ],
      valuesMap: allThresholdValuesMap,
      superiorNames: ["variable", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default:
        thresholdsModelOptionsMap[variables[0]][
          Object.keys(thresholdsModelOptionsMap[variables[0]])[0]
        ][0],
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.threshold.findOne({ name: "threshold" });
    if (
      !matsDataUtils.areObjectsEqual(
        currentParam.optionsMap,
        thresholdsModelOptionsMap
      ) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, allThresholdValuesMap)
    ) {
      // have to reload threshold data
      matsCollections.threshold.update(
        { name: "threshold" },
        {
          $set: {
            optionsMap: thresholdsModelOptionsMap,
            valuesMap: allThresholdValuesMap,
            options:
              thresholdsModelOptionsMap[variables[0]][
                Object.keys(thresholdsModelOptionsMap[variables[0]])[0]
              ],
            default:
              thresholdsModelOptionsMap[variables[0]][
                Object.keys(thresholdsModelOptionsMap[variables[0]])[0]
              ][0],
          },
        }
      );
    }
  }

  if (matsCollections.scale.findOne({ name: "scale" }) === undefined) {
    matsCollections.scale.insert({
      name: "scale",
      type: matsTypes.InputTypes.select,
      optionsMap: scaleModelOptionsMap,
      options:
        scaleModelOptionsMap[variables[0]][
          Object.keys(scaleModelOptionsMap[variables[0]])[0]
        ],
      valuesMap: allScaleValuesMap,
      superiorNames: ["variable", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default:
        scaleModelOptionsMap[variables[0]][
          Object.keys(scaleModelOptionsMap[variables[0]])[0]
        ][0],
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.scale.findOne({ name: "scale" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, scaleModelOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, allScaleValuesMap)
    ) {
      // have to reload scale data
      matsCollections.scale.update(
        { name: "scale" },
        {
          $set: {
            optionsMap: scaleModelOptionsMap,
            valuesMap: allScaleValuesMap,
            options:
              scaleModelOptionsMap[variables[0]][
                Object.keys(scaleModelOptionsMap[variables[0]])[0]
              ],
            default:
              scaleModelOptionsMap[variables[0]][
                Object.keys(scaleModelOptionsMap[variables[0]])[0]
              ][0],
          },
        }
      );
    }
  }

  if (
    matsCollections["forecast-type"].findOne({ name: "forecast-type" }) === undefined
  ) {
    matsCollections["forecast-type"].insert({
      name: "forecast-type",
      type: matsTypes.InputTypes.select,
      optionsMap: fcstTypeModelOptionsMap,
      options:
        fcstTypeModelOptionsMap[variables[0]][
          Object.keys(fcstTypeModelOptionsMap[variables[0]])[0]
        ],
      valuesMap: allFcstTypeValuesMap,
      superiorNames: ["variable", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default:
        fcstTypeModelOptionsMap[variables[0]][
          Object.keys(fcstTypeModelOptionsMap[variables[0]])[0]
        ][0],
      controlButtonVisibility: "block",
      controlButtonText: "forecast type",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections["forecast-type"].findOne({
      name: "forecast-type",
    });
    if (
      !matsDataUtils.areObjectsEqual(
        currentParam.optionsMap,
        fcstTypeModelOptionsMap
      ) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, allFcstTypeValuesMap)
    ) {
      // have to reload forecast type data
      matsCollections["forecast-type"].update(
        { name: "forecast-type" },
        {
          $set: {
            optionsMap: fcstTypeModelOptionsMap,
            valuesMap: allFcstTypeValuesMap,
            options:
              fcstTypeModelOptionsMap[variables[0]][
                Object.keys(fcstTypeModelOptionsMap[variables[0]])[0]
              ],
            default:
              fcstTypeModelOptionsMap[variables[0]][
                Object.keys(fcstTypeModelOptionsMap[variables[0]])[0]
              ][0],
          },
        }
      );
    }
  }

  if (matsCollections.average.findOne({ name: "average" }) === undefined) {
    const optionsMap = {
      None: [`ceil(${3600}*floor(((m0.time)+${3600}/2)/${3600}))`],
      "3hr": [`ceil(${3600 * 3}*floor(((m0.time)+${3600 * 3}/2)/${3600 * 3}))`],
      "6hr": [`ceil(${3600 * 6}*floor(((m0.time)+${3600 * 6}/2)/${3600 * 6}))`],
      "12hr": [`ceil(${3600 * 12}*floor(((m0.time)+${3600 * 12}/2)/${3600 * 12}))`],
      "1D": [`ceil(${3600 * 24}*floor(((m0.time)+${3600 * 24}/2)/${3600 * 24}))`],
      "3D": [
        `ceil(${3600 * 24 * 3}*floor(((m0.time)+${3600 * 24 * 3}/2)/${3600 * 24 * 3}))`,
      ],
      "7D": [
        `ceil(${3600 * 24 * 7}*floor(((m0.time)+${3600 * 24 * 7}/2)/${3600 * 24 * 7}))`,
      ],
      "30D": [
        `ceil(${3600 * 24 * 30}*floor(((m0.time)+${3600 * 24 * 30}/2)/${
          3600 * 24 * 30
        }))`,
      ],
      "60D": [
        `ceil(${3600 * 24 * 60}*floor(((m0.time)+${3600 * 24 * 60}/2)/${
          3600 * 24 * 60
        }))`,
      ],
      "90D": [
        `ceil(${3600 * 24 * 90}*floor(((m0.time)+${3600 * 24 * 90}/2)/${
          3600 * 24 * 90
        }))`,
      ],
      "180D": [
        `ceil(${3600 * 24 * 180}*floor(((m0.time)+${3600 * 24 * 180}/2)/${
          3600 * 24 * 180
        }))`,
      ],
    };
    matsCollections.average.insert({
      name: "average",
      type: matsTypes.InputTypes.select,
      optionsMap,
      options: Object.keys(optionsMap),
      controlButtonCovered: true,
      unique: false,
      selected: "None",
      default: "None",
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 5,
    });
  }

  if (
    matsCollections["bin-parameter"].findOne({ name: "bin-parameter" }) === undefined
  ) {
    const optionsMap = {
      Threshold: "select m0.trsh as binVal, ",
      "Valid Date": "select m0.time as binVal, ",
    };

    matsCollections["bin-parameter"].insert({
      name: "bin-parameter",
      type: matsTypes.InputTypes.select,
      options: Object.keys(optionsMap),
      optionsMap,
      hideOtherFor: {
        threshold: ["Threshold"],
      },
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[1],
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 6,
    });
  }

  // determine date defaults for dates and curveDates
  const defaultDataSource = matsCollections["data-source"].findOne(
    { name: "data-source" },
    { default: 1 }
  ).default;
  modelDateRangeMap = matsCollections.variable.findOne(
    { name: "variable" },
    { dates: 1 }
  ).dates;
  minDate = modelDateRangeMap[variables[0]][defaultDataSource].minDate;
  maxDate = modelDateRangeMap[variables[0]][defaultDataSource].maxDate;

  // need to turn the raw max and min from the metadata into the last valid month of data
  const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
  const minusMonthMinDate = newDateRange.minDate;
  maxDate = newDateRange.maxDate;
  dstr = `${moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm")} - ${moment
    .utc(maxDate)
    .format("MM/DD/YYYY HH:mm")}`;

  if (matsCollections["curve-dates"].findOne({ name: "curve-dates" }) === undefined) {
    const optionsMap = {
      "1 day": ["1 day"],
      "3 days": ["3 days"],
      "7 days": ["7 days"],
      "31 days": ["31 days"],
      "90 days": ["90 days"],
      "180 days": ["180 days"],
      "365 days": ["365 days"],
    };
    matsCollections["curve-dates"].insert({
      name: "curve-dates",
      type: matsTypes.InputTypes.dateRange,
      optionsMap,
      options: Object.keys(optionsMap).sort(),
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ["variable", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default: dstr,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 7,
      help: "dateHelp.html",
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections["curve-dates"].findOne({
      name: "curve-dates",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.default, dstr)
    ) {
      // have to reload dates data
      matsCollections["curve-dates"].update(
        { name: "curve-dates" },
        {
          $set: {
            startDate: minDate,
            stopDate: maxDate,
            default: dstr,
          },
        }
      );
    }
  }
};

/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding matsCollections.PlotGraphFunctions.PlotType value.
 See curve_item.js and standAlone.js.
 */
const doCurveTextPatterns = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    matsCollections.CurveTextPatterns.remove({});
  }
  if (matsCollections.CurveTextPatterns.find().count() === 0) {
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.timeSeries,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", " "],
        ["", "variable", " "],
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_type: ", "forecast-type", ""],
        ["avg: ", "average", ""],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "threshold",
        "scale",
        "average",
        "forecast-type",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.threshold,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", " "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_type: ", "forecast-type", ""],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "scale",
        "forecast-type",
        "curve-dates",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.performanceDiagram,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", " "],
        ["", "variable", " at "],
        ["", "threshold", ", "],
        ["fcst_type: ", "forecast-type", ""],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "threshold",
        "scale",
        "forecast-type",
        "bin-parameter",
        "curve-dates",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.histogram,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", " "],
        ["", "variable", " "],
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_type: ", "forecast-type", ""],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "threshold",
        "scale",
        "forecast-type",
        "curve-dates",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.contour,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", " "],
        ["", "variable", " "],
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_type: ", "forecast-type", ""],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "threshold",
        "scale",
        "forecast-type",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.contourDiff,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", " "],
        ["", "variable", " "],
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_type: ", "forecast-type", ""],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "threshold",
        "scale",
        "forecast-type",
      ],
      groupSize: 6,
    });
  }
};

const doSavedCurveParams = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    matsCollections.SavedCurveParams.remove({});
  }
  if (matsCollections.SavedCurveParams.find().count() === 0) {
    matsCollections.SavedCurveParams.insert({ clName: "changeList", changeList: [] });
  }
};

const doPlotGraph = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === true
  ) {
    matsCollections.PlotGraphFunctions.remove({});
  }
  if (matsCollections.PlotGraphFunctions.find().count() === 0) {
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.timeSeries,
      graphFunction: "graphPlotly",
      dataFunction: "dataSeries",
      checked: true,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.threshold,
      graphFunction: "graphPlotly",
      dataFunction: "dataThreshold",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.performanceDiagram,
      graphFunction: "graphPlotly",
      dataFunction: "dataPerformanceDiagram",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.histogram,
      graphFunction: "graphPlotly",
      dataFunction: "dataHistogram",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.contour,
      graphFunction: "graphPlotly",
      dataFunction: "dataContour",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.contourDiff,
      graphFunction: "graphPlotly",
      dataFunction: "dataContourDiff",
      checked: false,
    });
  }
};

Meteor.startup(function () {
  matsCollections.Databases.remove({});
  if (matsCollections.Databases.find({}).count() < 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "main startup: corrupted Databases collection: dropping Databases collection"
    );
    matsCollections.Databases.drop();
  }
  if (matsCollections.Databases.find({}).count() === 0) {
    let databases;
    if (
      Meteor.settings === undefined ||
      Meteor.settings.private === undefined ||
      Meteor.settings.private.databases === undefined
    ) {
      databases = undefined;
    } else {
      databases = Meteor.settings.private.databases;
    }
    if (databases !== null && databases !== undefined && Array.isArray(databases)) {
      for (let di = 0; di < databases.length; di += 1) {
        matsCollections.Databases.insert(databases[di]);
      }
    }
  }

  // create list of all pools
  const allPools = [];

  // connect to the couchbase cluster
  const cbConnection = matsCollections.Databases.findOne(
    {
      role: matsTypes.DatabaseRoles.COUCHBASE,
      status: "active",
    },
    {
      host: 1,
      port: 1,
      bucket: 1,
      scope: 1,
      collection: 1,
      user: 1,
      password: 1,
    }
  );
  if (cbConnection) {
    // global cbScorecardSettingsPool
    // eslint-disable-next-line no-undef
    cbScorecardSettingsPool = new matsCouchbaseUtils.CBUtilities(
      cbConnection.host,
      cbConnection.bucket,
      cbConnection.scope,
      cbConnection.collection,
      cbConnection.user,
      cbConnection.password
    );
  }

  const metadataSettings = matsCollections.Databases.findOne(
    {
      role: matsTypes.DatabaseRoles.META_DATA,
      status: "active",
    },
    {
      host: 1,
      port: 1,
      user: 1,
      password: 1,
      database: 1,
      connectionLimit: 1,
    }
  );
  // the pool is intended to be global
  if (metadataSettings) {
    // eslint-disable-next-line no-undef
    metadataPool = mysql.createPool(metadataSettings);
    allPools.push({ pool: "metadataPool", role: matsTypes.DatabaseRoles.META_DATA });
  }

  const sumSettings = matsCollections.Databases.findOne(
    {
      role: matsTypes.DatabaseRoles.SUMS_DATA,
      status: "active",
    },
    {
      host: 1,
      port: 1,
      user: 1,
      password: 1,
      database: 1,
      connectionLimit: 1,
    }
  );
  // the pool is intended to be global
  if (sumSettings) {
    // eslint-disable-next-line no-undef
    sumPool = mysql.createPool(sumSettings);
    allPools.push({ pool: "sumPool", role: matsTypes.DatabaseRoles.SUMS_DATA });
  }

  // create list of tables we need to monitor for update
  const mdr = new matsTypes.MetaDataDBRecord("metadataPool", "mats_common", [
    "region_descriptions",
  ]);
  for (let didx = 0; didx < variables.length; didx += 1) {
    mdr.addRecord("sumPool", variableDBNames[variables[didx]], [
      "threshold_descriptions",
      "scale_descriptions",
      "fcst_type_descriptions",
      "regions_per_model_mats_all_categories",
    ]);
  }
  try {
    matsMethods.resetApp({
      appPools: allPools,
      appMdr: mdr,
      appType: matsTypes.AppTypes.mats,
    });
  } catch (error) {
    throw new Error(error.message);
  }
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.
// eslint-disable-next-line no-undef
appSpecificResetRoutines = [
  doPlotGraph,
  doCurveParams,
  doSavedCurveParams,
  doPlotParams,
  doCurveTextPatterns,
];
