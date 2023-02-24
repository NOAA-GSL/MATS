/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from "meteor/meteor";
import { mysql } from "meteor/pcel:mysql";
import {
  matsTypes,
  matsCollections,
  matsDataUtils,
  matsDataQueryUtils,
  matsParamUtils,
  matsCouchbaseUtils
} from "meteor/randyp:mats-common";

// determined in doCurveParanms
let minDate;
let maxDate;
let dstr;

const doPlotParams = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode == true
  ) {
    matsCollections.PlotParams.remove({});
  }
  if (matsCollections.PlotParams.find().count() == 0) {
    matsCollections.PlotParams.insert({
      name: "dates",
      type: matsTypes.InputTypes.dateRange,
      options: [""],
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ["data-source"],
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
      "Fcst lead time": "select m0.fcst_len/60 as xVal, ",
      "Valid UTC hour": "select m0.secs%(24*3600)/3600 as xVal, ",
      "Init UTC hour": "select (m0.secs-m0.fcst_len*60)%(24*3600)/3600 as xVal, ",
      "Valid Date": "select m0.secs as xVal, ",
      "Init Date": "select m0.secs-m0.fcst_len*60 as xVal, ",
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
      "Fcst lead time": "m0.fcst_len/60 as yVal, ",
      "Valid UTC hour": "m0.secs%(24*3600)/3600 as yVal, ",
      "Init UTC hour": "(m0.secs-m0.fcst_len*60)%(24*3600)/3600 as yVal, ",
      "Valid Date": "m0.secs as yVal, ",
      "Init Date": "m0.secs-m0.fcst_len*60 as yVal, ",
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
      options: ["none", "standard", "assume infinite degrees of freedom"],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: "none",
      controlButtonVisibility: "block",
      controlButtonText: "overlay student's t-test",
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
    matsCollections.Settings.findOne({}).resetFromCode == true
  ) {
    const params = matsCollections.CurveParamsInfo.find({
      curve_params: { $exists: true },
    }).fetch()[0].curve_params;
    for (let cp = 0; cp < params.length; cp++) {
      matsCollections[params[cp]].remove({});
    }
  }
  const modelOptionsMap = {};
  let modelDateRangeMap = {};
  const regionModelOptionsMap = {};
  const forecastLengthOptionsMap = {};
  const scaleModelOptionsMap = {};
  const masterRegionValuesMap = {};
  const masterScaleValuesMap = {};

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      sumPool,
      "select station,description from station_descriptions;"
    );
    let masterRegDescription;
    let masterShortName;
    for (var j = 0; j < rows.length; j++) {
      masterRegDescription = rows[j].description.trim();
      masterShortName = rows[j].station.trim();
      masterRegionValuesMap[masterShortName] = masterRegDescription;
    }
  } catch (err) {
    console.log(err.message);
  }

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      sumPool,
      "select scle,description from scale_descriptions;"
    );
    let masterDescription;
    let masterScale;
    for (var j = 0; j < rows.length; j++) {
      masterDescription = rows[j].description.trim();
      masterScale = rows[j].scle.trim();
      masterScaleValuesMap[masterScale] = masterDescription;
    }
  } catch (err) {
    console.log(err.message);
  }

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      sumPool,
      "select model,regions,display_text,fcst_lens,scle,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;"
    );
    for (let i = 0; i < rows.length; i++) {
      const model_value = rows[i].model.trim();
      const model = rows[i].display_text.trim();
      modelOptionsMap[model] = [model_value];

      const rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
      const rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
      modelDateRangeMap[model] = { minDate: rowMinDate, maxDate: rowMaxDate };

      const forecastLengths = rows[i].fcst_lens;
      const forecastLengthArr = forecastLengths
        .split(",")
        .map(Function.prototype.call, String.prototype.trim);
      for (var j = 0; j < forecastLengthArr.length; j++) {
        forecastLengthArr[j] = (
          Number(forecastLengthArr[j].replace(/'|\[|\]/g, "")) / 60
        ).toString();
      }
      forecastLengthOptionsMap[model] = forecastLengthArr;

      const scales = rows[i].scle;
      const scalesArrRaw = scales
        .split(",")
        .map(Function.prototype.call, String.prototype.trim);
      const scalesArr = [];
      var dummyScale;
      for (var j = 0; j < scalesArrRaw.length; j++) {
        dummyScale = scalesArrRaw[j].replace(/'|\[|\]/g, "");
        scalesArr.push(masterScaleValuesMap[dummyScale]);
      }
      scaleModelOptionsMap[model] = scalesArr;

      const { regions } = rows[i];
      const regionsArrRaw = regions
        .split(",")
        .map(Function.prototype.call, String.prototype.trim);
      const regionsArr = [];
      regionsArr.push(masterRegionValuesMap.all_stat);
      regionsArr.push(masterRegionValuesMap.all_surf);
      regionsArr.push(masterRegionValuesMap.all_sol);
      var dummyRegion;
      for (var j = 0; j < regionsArrRaw.length; j++) {
        dummyRegion = regionsArrRaw[j].replace(/'|\[|\]/g, "");
        regionsArr.push(masterRegionValuesMap[dummyRegion]);
      }
      regionModelOptionsMap[model] = regionsArr;
    }
  } catch (err) {
    console.log(err.message);
  }

  if (matsCollections.label.findOne({ name: "label" }) == undefined) {
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

  if (matsCollections["data-source"].findOne({ name: "data-source" }) == undefined) {
    matsCollections["data-source"].insert({
      name: "data-source",
      type: matsTypes.InputTypes.select,
      optionsMap: modelOptionsMap,
      dates: modelDateRangeMap,
      options: Object.keys(modelOptionsMap),
      dependentNames: ["region", "forecast-length", "scale", "dates", "curve-dates"],
      controlButtonCovered: true,
      default: Object.keys(modelOptionsMap)[0],
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 1,
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections["data-source"].findOne({ name: "data-source" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap)
    ) {
      // have to reload model data
      matsCollections["data-source"].update(
        { name: "data-source" },
        {
          $set: {
            optionsMap: modelOptionsMap,
            dates: modelDateRangeMap,
            options: Object.keys(modelOptionsMap),
            default: Object.keys(modelOptionsMap)[0],
          },
        }
      );
    }
  }

  if (matsCollections.region.findOne({ name: "region" }) == undefined) {
    matsCollections.region.insert({
      name: "region",
      type: matsTypes.InputTypes.select,
      optionsMap: regionModelOptionsMap,
      options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],
      valuesMap: masterRegionValuesMap,
      superiorNames: ["data-source"],
      controlButtonCovered: true,
      controlButtonText: "site",
      unique: false,
      default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 1,
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.region.findOne({ name: "region" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionModelOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterRegionValuesMap)
    ) {
      // have to reload region data
      matsCollections.region.update(
        { name: "region" },
        {
          $set: {
            optionsMap: regionModelOptionsMap,
            valuesMap: masterRegionValuesMap,
            options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],
            default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0],
          },
        }
      );
    }
  }

  const optionsMap = {
    RMSE: "scalar",

    "Bias (Model - Obs)": "scalar",

    N: "scalar",

    "Model average": "scalar",

    "Obs average": "scalar",

    "Std deviation": "scalar",

    MAE: "scalar",
  };

  if (matsCollections.statistic.findOne({ name: "statistic" }) == undefined) {
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

  if (matsCollections["x-statistic"].findOne({ name: "x-statistic" }) == undefined) {
    matsCollections["x-statistic"].insert({
      name: "x-statistic",
      type: matsTypes.InputTypes.select,
      optionsMap,
      options: Object.keys(optionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (matsCollections["y-statistic"].findOne({ name: "y-statistic" }) == undefined) {
    matsCollections["y-statistic"].insert({
      name: "y-statistic",
      type: matsTypes.InputTypes.select,
      optionsMap,
      options: Object.keys(optionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3,
    });
  }

  const statVarOptionsMap = {
    // ARRAY ITEMS BY INDEX:
    // 0: sum of squared x-x_bar difference for RMSE/STDEV
    // 1: number of values in sum
    // 2: sum of obs-model difference (-1 * bias * N)
    // 3: sum of model values
    // 4: sum of obs values
    // 5: sum of absolute obs-model difference  (|bias_0| + |bias_1| + |bias_2| + ... + |bias_n|)
    dswrf: [
      "pow(o.direct + o.diffuse - m0.dswrf,2)",
      "(o.direct + o.diffuse - m0.dswrf)",
      "(o.direct + o.diffuse - m0.dswrf)",
      "(if(o.direct + o.diffuse is not null,m0.dswrf,null))",
      "(if(m0.dswrf is not null,o.direct + o.diffuse,null))",
      "(abs(o.direct + o.diffuse - m0.dswrf))",
    ],
    "direct (experimental HRRR only)": [
      "pow(o.direct - m0.direct,2)",
      "(o.direct - m0.direct)",
      "(o.direct - m0.direct)",
      "(if(o.direct is not null,m0.direct,null))",
      "(if(m0.direct is not null,o.direct,null))",
      "(abs(o.direct - m0.direct))",
    ],
    "diffuse (experimental HRRR only)": [
      "pow(o.diffuse - m0.diffuse,2)",
      "(o.diffuse - m0.diffuse)",
      "(o.diffuse - m0.diffuse)",
      "(if(o.diffuse is not null,m0.diffuse,null))",
      "(if(m0.diffuse is not null,o.diffuse,null))",
      "(abs(o.diffuse - m0.diffuse))",
    ],
    "15 min avg dswrf (experimental HRRR only)": [
      "pow(o.direct + o.diffuse - m0.dswrf15,2)",
      "(o.direct + o.diffuse - m0.dswrf15)",
      "(o.direct + o.diffuse - m0.dswrf15)",
      "(if(o.direct + o.diffuse is not null,m0.dswrf15,null))",
      "(if(m0.dswrf15 is not null,o.direct + o.diffuse,null))",
      "(abs(o.direct + o.diffuse - m0.dswrf15))",
    ],
    "15 min avg direct (experimental HRRR only)": [
      "pow(o.direct - m0.direct15,2)",
      "(o.direct - m0.direct15)",
      "(o.direct - m0.direct15)",
      "(if(o.direct is not null,m0.direct15,null))",
      "(if(m0.direct15 is not null,o.direct,null))",
      "(abs(o.direct - m0.direct15))",
    ],
  };

  const statVarUnitMap = {
    RMSE: {
      dswrf: "W/m2",
      "direct (experimental HRRR only)": "W/m2",
      "diffuse (experimental HRRR only)": "W/m2",
      "15 min avg dswrf (experimental HRRR only)": "W/m2",
      "15 min avg direct (experimental HRRR only)": "W/m2",
    },
    "Bias (Model - Obs)": {
      dswrf: "W/m2",
      "direct (experimental HRRR only)": "W/m2",
      "diffuse (experimental HRRR only)": "W/m2",
      "15 min avg dswrf (experimental HRRR only)": "W/m2",
      "15 min avg direct (experimental HRRR only)": "W/m2",
    },
    N: {
      dswrf: "Number",
      "direct (experimental HRRR only)": "Number",
      "diffuse (experimental HRRR only)": "Number",
      "15 min avg dswrf (experimental HRRR only)": "Number",
      "15 min avg direct (experimental HRRR only)": "Number",
    },
    "Model average": {
      dswrf: "W/m2",
      "direct (experimental HRRR only)": "W/m2",
      "diffuse (experimental HRRR only)": "W/m2",
      "15 min avg dswrf (experimental HRRR only)": "W/m2",
      "15 min avg direct (experimental HRRR only)": "W/m2",
    },
    "Obs average": {
      dswrf: "W/m2",
      "direct (experimental HRRR only)": "W/m2",
      "diffuse (experimental HRRR only)": "W/m2",
      "15 min avg dswrf (experimental HRRR only)": "W/m2",
      "15 min avg direct (experimental HRRR only)": "W/m2",
    },
    "Std deviation": {
      dswrf: "W/m2",
      "direct (experimental HRRR only)": "W/m2",
      "diffuse (experimental HRRR only)": "W/m2",
      "15 min avg dswrf (experimental HRRR only)": "W/m2",
      "15 min avg direct (experimental HRRR only)": "W/m2",
    },
    MAE: {
      dswrf: "W/m2",
      "direct (experimental HRRR only)": "W/m2",
      "diffuse (experimental HRRR only)": "W/m2",
      "15 min avg dswrf (experimental HRRR only)": "W/m2",
      "15 min avg direct (experimental HRRR only)": "W/m2",
    },
  };

  if (matsCollections.variable.findOne({ name: "variable" }) == undefined) {
    matsCollections.variable.insert({
      name: "variable",
      type: matsTypes.InputTypes.select,
      optionsMap: statVarOptionsMap,
      statVarUnitMap,
      options: Object.keys(statVarOptionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statVarOptionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (matsCollections["x-variable"].findOne({ name: "x-variable" }) == undefined) {
    matsCollections["x-variable"].insert({
      name: "x-variable",
      type: matsTypes.InputTypes.select,
      optionsMap: statVarOptionsMap,
      statVarUnitMap,
      options: Object.keys(statVarOptionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statVarOptionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (matsCollections["y-variable"].findOne({ name: "y-variable" }) == undefined) {
    matsCollections["y-variable"].insert({
      name: "y-variable",
      type: matsTypes.InputTypes.select,
      optionsMap: statVarOptionsMap,
      statVarUnitMap,
      options: Object.keys(statVarOptionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statVarOptionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 3,
    });
  }
  if (matsCollections.scale.findOne({ name: "scale" }) == undefined) {
    matsCollections.scale.insert({
      name: "scale",
      type: matsTypes.InputTypes.select,
      optionsMap: scaleModelOptionsMap,
      options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],
      valuesMap: masterScaleValuesMap,
      superiorNames: ["data-source"],
      controlButtonCovered: true,
      unique: false,
      default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]][1],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.scale.findOne({ name: "scale" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, scaleModelOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterScaleValuesMap)
    ) {
      // have to reload scale data
      matsCollections.scale.update(
        { name: "scale" },
        {
          $set: {
            optionsMap: scaleModelOptionsMap,
            valuesMap: masterScaleValuesMap,
            options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],
            default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]][1],
          },
        }
      );
    }
  }

  if (
    matsCollections["forecast-length"].findOne({ name: "forecast-length" }) == undefined
  ) {
    matsCollections["forecast-length"].insert({
      name: "forecast-length",
      type: matsTypes.InputTypes.select,
      optionsMap: forecastLengthOptionsMap,
      options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],
      superiorNames: ["data-source"],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: 6,
      controlButtonVisibility: "block",
      controlButtonText: "forecast lead time (h)",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 4,
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections["forecast-length"].findOne({
      name: "forecast-length",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)
    ) {
      // have to reload forecast length data
      matsCollections["forecast-length"].update(
        { name: "forecast-length" },
        {
          $set: {
            optionsMap: forecastLengthOptionsMap,
            options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],
          },
        }
      );
    }
  }

  if (matsCollections["valid-time"].findOne({ name: "dieoff-type" }) == undefined) {
    const optionsArrRaw = [...Array(96).keys()].map((x) => x / 4);
    const optionsArr = optionsArrRaw.map(String);

    matsCollections["valid-time"].insert({
      name: "valid-time",
      type: matsTypes.InputTypes.select,
      options: optionsArr,
      controlButtonCovered: true,
      selected: [],
      unique: false,
      default: matsTypes.InputTypes.unused,
      controlButtonVisibility: "block",
      controlButtonText: "valid utc hour",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 4,
      multiple: true,
    });
  }

  if (
    matsCollections["utc-cycle-start"].findOne({ name: "utc-cycle-start" }) == undefined
  ) {
    matsCollections["utc-cycle-start"].insert({
      name: "utc-cycle-start",
      type: matsTypes.InputTypes.select,
      options: [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
      ],
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: ["12"],
      controlButtonVisibility: "block",
      controlButtonText: "utc cycle init hour",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 4,
    });
  }

  if (matsCollections.average.findOne({ name: "average" }) == undefined) {
    const optionsMap = {
      None: [`ceil(${900}*floor(((m0.secs)+${900}/2)/${900}))`],
      "30m": [`ceil(${1800}*floor(((m0.secs)+${1800}/2)/${1800}))`],
      "1hr": [`ceil(${3600}*floor(((m0.secs)+${3600}/2)/${3600}))`],
      "90m": [`ceil(${3600 * 1.5}*floor(((m0.secs)+${3600 * 1.5}/2)/${3600 * 1.5}))`],
      "2hr": [`ceil(${3600 * 2}*floor(((m0.secs)+${3600 * 2}/2)/${3600 * 2}))`],
      "3hr": [`ceil(${3600 * 3}*floor(((m0.secs)+${3600 * 3}/2)/${3600 * 3}))`],
      "6hr": [`ceil(${3600 * 6}*floor(((m0.secs)+${3600 * 6}/2)/${3600 * 6}))`],
      "12hr": [`ceil(${3600 * 12}*floor(((m0.secs)+${3600 * 12}/2)/${3600 * 12}))`],
      "1D": [`ceil(${3600 * 24}*floor(((m0.secs)+${3600 * 24}/2)/${3600 * 24}))`],
      "3D": [
        `ceil(${3600 * 24 * 3}*floor(((m0.secs)+${3600 * 24 * 3}/2)/${3600 * 24 * 3}))`,
      ],
      "7D": [
        `ceil(${3600 * 24 * 7}*floor(((m0.secs)+${3600 * 24 * 7}/2)/${3600 * 24 * 7}))`,
      ],
      "30D": [
        `ceil(${3600 * 24 * 30}*floor(((m0.secs)+${3600 * 24 * 30}/2)/${
          3600 * 24 * 30
        }))`,
      ],
      "60D": [
        `ceil(${3600 * 24 * 60}*floor(((m0.secs)+${3600 * 24 * 60}/2)/${
          3600 * 24 * 60
        }))`,
      ],
      "90D": [
        `ceil(${3600 * 24 * 90}*floor(((m0.secs)+${3600 * 24 * 90}/2)/${
          3600 * 24 * 90
        }))`,
      ],
      "180D": [
        `ceil(${3600 * 24 * 180}*floor(((m0.secs)+${3600 * 24 * 180}/2)/${
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
    matsCollections["bin-parameter"].findOne({ name: "bin-parameter" }) == undefined
  ) {
    const optionsMap = {
      "Fcst lead time": "select m0.fcst_len/60 as binVal, ",
      "Valid UTC hour": "select m0.secs%(24*3600)/3600 as binVal, ",
      "Init UTC hour": "select (m0.secs-m0.fcst_len*60)%(24*3600)/3600 as binVal, ",
      "Valid Date": "select m0.secs as binVal, ",
      "Init Date": "select m0.secs-m0.fcst_len*60 as binVal, ",
    };

    matsCollections["bin-parameter"].insert({
      name: "bin-parameter",
      type: matsTypes.InputTypes.select,
      options: Object.keys(optionsMap),
      optionsMap,
      hideOtherFor: {
        "forecast-length": ["Fcst lead time"],
        "valid-time": ["Valid UTC hour"],
      },
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[3],
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
  modelDateRangeMap = matsCollections["data-source"].findOne(
    { name: "data-source" },
    { dates: 1 }
  ).dates;
  minDate = modelDateRangeMap[defaultDataSource].minDate;
  maxDate = modelDateRangeMap[defaultDataSource].maxDate;

  // need to turn the raw max and min from the metadata into the last valid month of data
  const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
  const minusMonthMinDate = newDateRange.minDate;
  maxDate = newDateRange.maxDate;
  dstr = `${moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm")} - ${moment
    .utc(maxDate)
    .format("MM/DD/YYYY HH:mm")}`;

  if (matsCollections["curve-dates"].findOne({ name: "curve-dates" }) == undefined) {
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
      superiorNames: ["data-source"],
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
    var currentParam = matsCollections["curve-dates"].findOne({ name: "curve-dates" });
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
    matsCollections.Settings.findOne({}).resetFromCode == true
  ) {
    matsCollections.CurveTextPatterns.remove({});
  }
  if (matsCollections.CurveTextPatterns.find().count() == 0) {
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.timeSeries,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["avg: ", "average", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "statistic",
        "variable",
        "scale",
        "average",
        "forecast-length",
        "valid-time",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.validtime,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "statistic",
        "variable",
        "scale",
        "forecast-length",
        "curve-dates",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.dailyModelCycle,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["start utc: ", "utc-cycle-start", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "statistic",
        "variable",
        "scale",
        "utc-cycle-start",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.histogram,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "statistic",
        "variable",
        "scale",
        "forecast-length",
        "valid-time",
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
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "statistic",
        "variable",
        "scale",
        "forecast-length",
        "valid-time",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.contourDiff,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "statistic",
        "variable",
        "scale",
        "forecast-length",
        "valid-time",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.simpleScatter,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "scale", ", "],
        ["", "x-variable", " "],
        ["", "x-statistic", " vs "],
        ["", "y-variable", " "],
        ["", "y-statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "x-statistic",
        "x-variable",
        "y-statistic",
        "y-variable",
        "valid-time",
        "scale",
        "forecast-length",
        "bin-parameter",
        "curve-dates",
      ],
      groupSize: 6,
    });
  }
};

const doSavedCurveParams = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode == true
  ) {
    matsCollections.SavedCurveParams.remove({});
  }
  if (matsCollections.SavedCurveParams.find().count() == 0) {
    matsCollections.SavedCurveParams.insert({ clName: "changeList", changeList: [] });
  }
};

const doPlotGraph = function () {
  if (
    matsCollections.Settings.findOne({}) === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode === undefined ||
    matsCollections.Settings.findOne({}).resetFromCode == true
  ) {
    matsCollections.PlotGraphFunctions.remove({});
  }
  if (matsCollections.PlotGraphFunctions.find().count() == 0) {
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.timeSeries,
      graphFunction: "graphPlotly",
      dataFunction: "dataSeries",
      checked: true,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.validtime,
      graphFunction: "graphPlotly",
      dataFunction: "dataValidTime",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.dailyModelCycle,
      graphFunction: "graphPlotly",
      dataFunction: "dataDailyModelCycle",
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
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.simpleScatter,
      graphFunction: "graphPlotly",
      dataFunction: "dataSimpleScatter",
      checked: false,
    });
  }
};

Meteor.startup(function () {
  matsCollections.Databases.remove({});
  if (matsCollections.Databases.find({}).count() < 0) {
    console.log(
      "main startup: corrupted Databases collection: dropping Databases collection"
    );
    matsCollections.Databases.drop();
  }
  if (matsCollections.Databases.find({}).count() === 0) {
    let databases;
    if (
      Meteor.settings == undefined ||
      Meteor.settings.private == undefined ||
      Meteor.settings.private.databases == undefined
    ) {
      databases = undefined;
    } else {
      databases = Meteor.settings.private.databases;
    }
    if (databases !== null && databases !== undefined && Array.isArray(databases)) {
      for (let di = 0; di < databases.length; di++) {
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
    cbScorecardSettingsPool = new matsCouchbaseUtils.CBUtilities(
      cbConnection.host,
      cbConnection.bucket,
      cbConnection.scope,
      cbConnection.collection,
      cbConnection.user,
      cbConnection.password
    );
  }

  const sumSettings = matsCollections.Databases.findOne(
    {
      role: matsTypes.DatabaseRoles.SUMS_DATA,
      status: "active"
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
    sumPool = mysql.createPool(sumSettings);
    allPools.push({ pool: "sumPool", role: matsTypes.DatabaseRoles.SUMS_DATA });
  }

  // create list of tables we need to monitor for update
  const mdr = new matsTypes.MetaDataDBRecord("sumPool", "surfrad3", [
    "scale_descriptions",
    "station_descriptions",
    "regions_per_model_mats_all_categories",
  ]);
  try {
    matsMethods.resetApp({
      appPools: allPools,
      appMdr: mdr,
      appType: matsTypes.AppTypes.mats,
    });
  } catch (error) {
    console.log(error.message);
  }
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.
appSpecificResetRoutines = [
  doPlotGraph,
  doCurveParams,
  doSavedCurveParams,
  doPlotParams,
  doCurveTextPatterns,
];
