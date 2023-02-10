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
      "Fcst lead time": "select m0.fcst_len as xVal, ",
      "Valid UTC hour": "select m0.hour as xVal, ",
      "Init UTC hour":
        "select (m0.valid_day+3600*m0.hour-m0.fcst_len*3600)%(24*3600)/3600 as xVal, ",
      "Valid Date": "select m0.valid_day+3600*m0.hour as xVal, ",
      "Init Date": "select m0.valid_day+3600*m0.hour-m0.fcst_len*3600 as xVal, ",
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
      "Fcst lead time": "m0.fcst_len as yVal, ",
      "Valid UTC hour": "m0.hour as yVal, ",
      "Init UTC hour":
        "(m0.valid_day+3600*m0.hour-m0.fcst_len*3600)%(24*3600)/3600 as yVal, ",
      "Valid Date": "m0.valid_day+3600*m0.hour as yVal, ",
      "Init Date": "m0.valid_day+3600*m0.hour-m0.fcst_len*3600 as yVal, ",
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
  const forecastLengthOptionsMap = {};
  const regionModelOptionsMap = {};
  const siteOptionsMap = {};
  const sitesLocationMap = [];
  const masterRegionValuesMap = {};
  const masterMETARValuesMap = {};
  let modelDateRangeMap = {};
  const metarModelOptionsMap = {};

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      metadataPool,
      "select short_name,description from region_descriptions;"
    );
    let masterRegDescription;
    let masterShortName;
    for (var j = 0; j < rows.length; j++) {
      masterRegDescription = rows[j].description.trim();
      masterShortName = rows[j].short_name.trim();
      masterRegionValuesMap[masterShortName] = masterRegDescription;
    }
  } catch (err) {
    console.log(err.message);
  }

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      sumPool,
      "select metar_string,description from metar_string_descriptions;"
    );
    let masterMETARDescription;
    let masterMETARString;
    for (var j = 0; j < rows.length; j++) {
      masterMETARDescription = rows[j].description.trim();
      masterMETARString = rows[j].metar_string.trim();
      masterMETARValuesMap[masterMETARString] = masterMETARDescription;
    }
  } catch (err) {
    console.log(err.message);
  }

  try {
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      sumPool,
      "select model,metar_string,regions,display_text,fcst_lens,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;"
    );
    for (var i = 0; i < rows.length; i++) {
      const model_value = rows[i].model.trim();
      const model = rows[i].display_text.trim();
      modelOptionsMap[model] = [model_value];

      const rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
      const rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
      modelDateRangeMap[model] = { minDate: rowMinDate, maxDate: rowMaxDate };

      const metarStrings = rows[i].metar_string;
      const metarStringsArr = metarStrings
        .split(",")
        .map(Function.prototype.call, String.prototype.trim);
      const metarArr = [];
      var dummyMETAR;
      for (var j = 0; j < metarStringsArr.length; j++) {
        dummyMETAR = metarStringsArr[j].replace(/'|\[|\]/g, "");
        metarArr.push(masterMETARValuesMap[dummyMETAR]);
      }
      metarModelOptionsMap[model] = metarArr;

      const forecastLengths = rows[i].fcst_lens;
      const forecastLengthArr = forecastLengths
        .split(",")
        .map(Function.prototype.call, String.prototype.trim);
      for (var j = 0; j < forecastLengthArr.length; j++) {
        forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
      }
      forecastLengthOptionsMap[model] = forecastLengthArr;

      const { regions } = rows[i];
      const regionsArrRaw = regions
        .split(",")
        .map(Function.prototype.call, String.prototype.trim);
      const regionsArr = [];
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

  try {
    matsCollections.SiteMap.remove({});
    const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(
      sitePool,
      "select madis_id,name,lat,lon,elev,description from metars_mats_global where lat > -16380 and lat < 16380 and lon > -32760 and lon < 32760 order by name;"
    );
    for (var i = 0; i < rows.length; i++) {
      const site_name = rows[i].name;
      const site_description = rows[i].description;
      const site_id = rows[i].madis_id;
      const site_lat = rows[i].lat / 182;
      const site_lon = rows[i].lon / 182;
      const site_elev = rows[i].elev;
      siteOptionsMap[site_name] = [site_id];

      const point = [site_lat, site_lon];
      const obj = {
        name: site_name,
        origName: site_name,
        point,
        elevation: site_elev,
        options: {
          title: site_description,
          color: "red",
          size: 5,
          network: "METAR",
          peerOption: site_name,
          id: site_id,
          highLightColor: "blue",
        },
      };
      sitesLocationMap.push(obj);

      matsCollections.SiteMap.insert({ siteName: site_name, siteId: site_id });
    }
  } catch (err) {
    console.log(err.message);
  }

  matsCollections.StationMap.remove({});
  matsCollections.StationMap.insert({
    name: "stations",
    optionsMap: sitesLocationMap,
  });

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

  if (matsCollections["region-type"].findOne({ name: "region-type" }) == undefined) {
    matsCollections["region-type"].insert({
      name: "region-type",
      type: matsTypes.InputTypes.select,
      options: ["Predefined region", "Select stations"],
      dependentNames: ["variable", "x-variable", "y-variable"],
      default: "Predefined region",
      hideOtherFor: {
        region: ["Select stations"],
        truth: ["Select stations"],
        sites: ["Predefined region"],
        sitesMap: ["Predefined region"],
      },
      controlButtonCovered: true,
      controlButtonText: "Region mode",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 1,
    });
  }

  if (matsCollections["data-source"].findOne({ name: "data-source" }) == undefined) {
    matsCollections["data-source"].insert({
      name: "data-source",
      type: matsTypes.InputTypes.select,
      optionsMap: modelOptionsMap,
      dates: modelDateRangeMap,
      options: Object.keys(modelOptionsMap),
      dependentNames: ["region", "forecast-length", "truth", "dates", "curve-dates"],
      controlButtonCovered: true,
      default: Object.keys(modelOptionsMap)[0],
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 3,
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
      unique: false,
      default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0],
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 2,
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

    "MAE (temp and dewpoint only)": "scalar",
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
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 3,
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
      displayOrder: 4,
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
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 3,
    });
  }

  const statVarOptionsMap = {
    // THIS IS KEYED BY REGION-TYPE BECAUSE OUR MYSQL OBS TABLE DOESN'T HAVE RH
    // FOR SOME REASON OR OTHER, SO IT NEEDS TO BE EXCLUDED AS A VARIABLE
    // FROM STATION PLOTS. SIGH.
    //
    // ARRAY ITEMS BY INDEX:
    // 0: sum of squared x-x_bar difference for RMSE/STDEV
    // 1: number of values in sum
    // 2: sum of obs-model difference (-1 * bias * N)
    // 3: sum of model values
    // 4: sum of obs values
    // 5: sum of absolute obs-model difference  (|bias_0| + |bias_1| + |bias_2| + ... + |bias_n|)
    "Predefined region": {
      "2m temperature": [
        "m0.sum2_dt",
        "m0.N_dt",
        "m0.sum_dt",
        "-1 * (m0.sum_dt-m0.sum_ob_t)",
        "m0.sum_ob_t",
        "(if(m0.sum_adt is not null,m0.sum_adt,0))",
      ],
      "2m RH": [
        "m0.sum2_drh",
        "m0.N_drh",
        "m0.sum_drh",
        "-1 * (m0.sum_drh-m0.sum_ob_rh)",
        "m0.sum_ob_rh",
        "0",
      ],
      "2m dewpoint": [
        "m0.sum2_dtd",
        "m0.N_dtd",
        "m0.sum_dtd",
        "-1 * (m0.sum_dtd-m0.sum_ob_td)",
        "m0.sum_ob_td",
        "(if(m0.sum_adtd is not null,m0.sum_adtd,0))",
      ],
      "10m wind": [
        "m0.sum2_dw",
        "m0.N_dw",
        "m0.sum_ob_ws-m0.sum_model_ws",
        "m0.sum_model_ws",
        "m0.sum_ob_ws",
        "0",
      ],
    },
    "Select stations": {
      "2m temperature": [
        "pow(o.temp - m0.temp,2)/100",
        "(o.temp - m0.temp)",
        "(o.temp - m0.temp)/10",
        "(if(o.temp is not null,m0.temp,null))/10",
        "(if(m0.temp is not null,o.temp,null))/10",
        "(abs(o.temp - m0.temp))/10",
      ],
      "2m dewpoint": [
        "(pow(o.dp - m0.dp,2))/100",
        "(o.dp - m0.dp)",
        "(o.dp - m0.dp)/10",
        "(if(o.dp is not null,m0.dp,null))/10",
        "(if(m0.dp is not null,o.dp,null))/10",
        "(abs(o.dp - m0.dp))/10",
      ],
      "10m wind": [
        "(pow(o.ws,2)+pow(m0.ws,2)-2*o.ws*m0.ws*cos((o.wd-m0.wd)/57.2958))",
        "(o.ws + m0.ws)",
        "(o.ws - m0.ws)",
        "(if(o.ws is not null,m0.ws,null))",
        "(if(m0.ws is not null,o.ws,null))",
        "(abs(o.ws - m0.ws))",
      ],
    },
  };

  const statVarUnitMap = {
    RMSE: {
      "2m temperature": "°C",
      "2m RH": "RH (%)",
      "2m dewpoint": "°C",
      "10m wind": "m/s",
    },
    "Bias (Model - Obs)": {
      "2m temperature": "°C",
      "2m RH": "RH (%)",
      "2m dewpoint": "°C",
      "10m wind": "m/s",
    },
    N: {
      "2m temperature": "Number",
      "2m RH": "Number",
      "2m dewpoint": "Number",
      "10m wind": "Number",
    },
    "Model average": {
      "2m temperature": "°C",
      "2m RH": "RH (%)",
      "2m dewpoint": "°C",
      "10m wind": "m/s",
    },
    "Obs average": {
      "2m temperature": "°C",
      "2m RH": "RH (%)",
      "2m dewpoint": "°C",
      "10m wind": "m/s",
    },
    "Std deviation": {
      "2m temperature": "°C",
      "2m RH": "RH (%)",
      "2m dewpoint": "°C",
      "10m wind": "m/s",
    },
    "MAE (temp and dewpoint only)": {
      "2m temperature": "°C",
      "2m RH": "RH (%)",
      "2m dewpoint": "°C",
      "10m wind": "m/s",
    },
  };

  if (matsCollections.variable.findOne({ name: "variable" }) == undefined) {
    matsCollections.variable.insert({
      name: "variable",
      type: matsTypes.InputTypes.select,
      superiorNames: ["region-type"],
      optionsMap: statVarOptionsMap,
      statVarUnitMap,
      options: Object.keys(statVarOptionsMap["Predefined region"]),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statVarOptionsMap["Predefined region"])[0],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 3,
    });
  }

  if (matsCollections["x-variable"].findOne({ name: "x-variable" }) == undefined) {
    matsCollections["x-variable"].insert({
      name: "x-variable",
      type: matsTypes.InputTypes.select,
      superiorNames: ["region-type"],
      optionsMap: statVarOptionsMap,
      statVarUnitMap,
      options: Object.keys(statVarOptionsMap["Predefined region"]),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statVarOptionsMap["Predefined region"])[0],
      controlButtonVisibility: "block",
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (matsCollections["y-variable"].findOne({ name: "y-variable" }) == undefined) {
    matsCollections["y-variable"].insert({
      name: "y-variable",
      type: matsTypes.InputTypes.select,
      superiorNames: ["region-type"],
      optionsMap: statVarOptionsMap,
      statVarUnitMap,
      options: Object.keys(statVarOptionsMap["Predefined region"]),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statVarOptionsMap["Predefined region"])[0],
      controlButtonVisibility: "block",
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 3,
    });
  }

  if (matsCollections.truth.findOne({ name: "truth" }) == undefined) {
    matsCollections.truth.insert({
      name: "truth",
      type: matsTypes.InputTypes.select,
      optionsMap: metarModelOptionsMap,
      options: metarModelOptionsMap[Object.keys(metarModelOptionsMap)[0]],
      valuesMap: masterMETARValuesMap,
      superiorNames: ["data-source"],
      controlButtonCovered: true,
      unique: false,
      default: "QC-METAR",
      controlButtonVisibility: "block",
      displayOrder: 6,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    var currentParam = matsCollections.truth.findOne({ name: "truth" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, metarModelOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterMETARValuesMap)
    ) {
      // have to reload truth data
      matsCollections.truth.update(
        { name: "truth" },
        {
          $set: {
            optionsMap: metarModelOptionsMap,
            valuesMap: masterMETARValuesMap,
            options: metarModelOptionsMap[Object.keys(metarModelOptionsMap)[0]],
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

  if (matsCollections["dieoff-type"].findOne({ name: "dieoff-type" }) == undefined) {
    const dieoffOptionsMap = {
      Dieoff: [matsTypes.ForecastTypes.dieoff],
      "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
      "Single cycle forecast (uses first date in range)": [
        matsTypes.ForecastTypes.singleCycle,
      ],
    };
    matsCollections["dieoff-type"].insert({
      name: "dieoff-type",
      type: matsTypes.InputTypes.select,
      optionsMap: dieoffOptionsMap,
      options: Object.keys(dieoffOptionsMap),
      hideOtherFor: {
        "valid-time": [
          "Dieoff for a specified UTC cycle init hour",
          "Single cycle forecast (uses first date in range)",
        ],
        "utc-cycle-start": [
          "Dieoff",
          "Single cycle forecast (uses first date in range)",
        ],
      },
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(dieoffOptionsMap)[0],
      controlButtonVisibility: "block",
      controlButtonText: "dieoff type",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 4,
    });
  }

  if (matsCollections["valid-time"].findOne({ name: "valid-time" }) == undefined) {
    matsCollections["valid-time"].insert({
      name: "valid-time",
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
      multiple: true,
    });
  }

  if (matsCollections.average.findOne({ name: "average" }) == undefined) {
    const optionsMap = {
      None: [`ceil(${3600}*floor((({{timeVar}})+${3600}/2)/${3600}))`],
      "3hr": [`ceil(${3600 * 3}*floor((({{timeVar}})+${3600 * 3}/2)/${3600 * 3}))`],
      "6hr": [`ceil(${3600 * 6}*floor((({{timeVar}})+${3600 * 6}/2)/${3600 * 6}))`],
      "12hr": [`ceil(${3600 * 12}*floor((({{timeVar}})+${3600 * 12}/2)/${3600 * 12}))`],
      "1D": [`ceil(${3600 * 24}*floor((({{timeVar}})+${3600 * 24}/2)/${3600 * 24}))`],
      "3D": [
        `ceil(${3600 * 24 * 3}*floor((({{timeVar}})+${3600 * 24 * 3}/2)/${
          3600 * 24 * 3
        }))`,
      ],
      "7D": [
        `ceil(${3600 * 24 * 7}*floor((({{timeVar}})+${3600 * 24 * 7}/2)/${
          3600 * 24 * 7
        }))`,
      ],
      "30D": [
        `ceil(${3600 * 24 * 30}*floor((({{timeVar}})+${3600 * 24 * 30}/2)/${
          3600 * 24 * 30
        }))`,
      ],
      "60D": [
        `ceil(${3600 * 24 * 60}*floor((({{timeVar}})+${3600 * 24 * 60}/2)/${
          3600 * 24 * 60
        }))`,
      ],
      "90D": [
        `ceil(${3600 * 24 * 90}*floor((({{timeVar}})+${3600 * 24 * 90}/2)/${
          3600 * 24 * 90
        }))`,
      ],
      "180D": [
        `ceil(${3600 * 24 * 180}*floor((({{timeVar}})+${3600 * 24 * 180}/2)/${
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

  if (matsCollections.sites.findOne({ name: "sites" }) == undefined) {
    matsCollections.sites.insert({
      name: "sites",
      type: matsTypes.InputTypes.select,
      optionsMap: siteOptionsMap,
      options: Object.keys(siteOptionsMap),
      peerName: "sitesMap", // name of the select parameter that is going to be set by selecting from this map
      controlButtonCovered: true,
      unique: false,
      default: matsTypes.InputTypes.unused,
      controlButtonVisibility: "block",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 5,
      multiple: true,
    });
  }

  if (matsCollections.sitesMap.findOne({ name: "sitesMap" }) == undefined) {
    matsCollections.sitesMap.insert({
      name: "sitesMap",
      type: matsTypes.InputTypes.selectMap,
      optionsMap: sitesLocationMap,
      options: Object.keys(sitesLocationMap),
      peerName: "sites", // name of the select parameter that is going to be set by selecting from this map
      controlButtonCovered: true,
      unique: false,
      default: matsTypes.InputTypes.unused,
      controlButtonVisibility: "block",
      controlButtonText: "sites (Map display)",
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 5,
      multiple: true,
      defaultMapView: { point: [50, -92.5], zoomLevel: 1.25 },
      help: "map-help.html",
    });
  }

  if (
    matsCollections["bin-parameter"].findOne({ name: "bin-parameter" }) == undefined
  ) {
    const optionsMap = {
      "Fcst lead time": "select m0.fcst_len as binVal, ",
      "Valid UTC hour": "select m0.hour as binVal, ",
      "Init UTC hour":
        "select (m0.valid_day+3600*m0.hour-m0.fcst_len*3600)%(24*3600)/3600 as binVal, ",
      "Valid Date": "select m0.valid_day+3600*m0.hour as binVal, ",
      "Init Date": "select m0.valid_day+3600*m0.hour-m0.fcst_len*3600 as binVal, ",
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
        ["", "sites", ": "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["avg: ", "average", ", "],
        ["", "truth", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "variable",
        "average",
        "forecast-length",
        "valid-time",
        "truth",
        "sites",
        "sitesMap",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.dieoff,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "sites", ": "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["", "dieoff-type", ", "],
        ["valid-time: ", "valid-time", ", "],
        ["start utc: ", "utc-cycle-start", ", "],
        ["", "truth", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "variable",
        "dieoff-type",
        "valid-time",
        "utc-cycle-start",
        "truth",
        "sites",
        "sitesMap",
        "curve-dates",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.validtime,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "sites", ": "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["", "truth", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "variable",
        "forecast-length",
        "truth",
        "sites",
        "sitesMap",
        "curve-dates",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.dailyModelCycle,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "sites", ": "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["start utc: ", "utc-cycle-start", ", "],
        ["", "truth", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "variable",
        "utc-cycle-start",
        "truth",
        "sites",
        "sitesMap",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.map,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", ": "],
        ["", "sites", ": "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", " h "],
        [" valid-time:", "valid-time", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "statistic",
        "variable",
        "forecast-length",
        "valid-time",
        "sites",
        "sitesMap",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.histogram,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "sites", ": "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "truth", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "variable",
        "forecast-length",
        "valid-time",
        "truth",
        "sites",
        "sitesMap",
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
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "truth", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "statistic",
        "variable",
        "forecast-length",
        "valid-time",
        "truth",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.contourDiff,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "truth", ""],
      ],
      displayParams: [
        "label",
        "data-source",
        "region",
        "statistic",
        "variable",
        "forecast-length",
        "valid-time",
        "truth",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.simpleScatter,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "x-variable", " "],
        ["", "x-statistic", " vs "],
        ["", "y-variable", " "],
        ["", "y-statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "truth", ""],
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
        "forecast-length",
        "truth",
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
      plotType: matsTypes.PlotTypes.dieoff,
      graphFunction: "graphPlotly",
      dataFunction: "dataDieOff",
      checked: false,
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
      plotType: matsTypes.PlotTypes.map,
      graphFunction: "graphPlotly",
      dataFunction: "dataMap",
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
    metadataPool = mysql.createPool(metadataSettings);
    allPools.push({ pool: "metadataPool", role: matsTypes.DatabaseRoles.META_DATA });
  }

  const sumSettings = matsCollections.Databases.findOne(
    { role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active" },
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

  const siteSettings = matsCollections.Databases.findOne(
    {
      role: matsTypes.DatabaseRoles.SITE_DATA,
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
  if (siteSettings) {
    sitePool = mysql.createPool(siteSettings);
    allPools.push({ pool: "sitePool", role: matsTypes.DatabaseRoles.SITE_DATA });
  }

  // create list of tables we need to monitor for update
  const mdr = new matsTypes.MetaDataDBRecord("metadataPool", "mats_common", [
    "region_descriptions",
  ]);
  mdr.addRecord("sumPool", "surface_sums2", ["regions_per_model_mats_all_categories"]);
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
