/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */
import { Meteor } from "meteor/meteor";
import moment from "moment";
import {
  matsMethods,
  matsTypes,
  matsCollections,
  matsDataUtils,
  matsDataQueryUtils,
  matsParamUtils,
  matsCouchbaseUtils,
} from "meteor/randyp:mats-common";
// eslint-disable-next-line import/no-extraneous-dependencies
import mysql from "mysql2/promise";

/* eslint-disable no-await-in-loop */

// This app references two databases, which are listed here.
const obsDBNames = {
  Instantaneous: { sumsDB: "surfrad3_sums" },
  "Time-averaged according to scale": { sumsDB: "surfrad3_avg_sums" },
};
const obs = Object.keys(obsDBNames);

// determined in doCurveParanms
let minDate;
let maxDate;
let dstr;

const doPlotParams = async function () {
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    await matsCollections.PlotParams.removeAsync({});
  }
  if ((await matsCollections.PlotParams.find().countAsync()) === 0) {
    await matsCollections.PlotParams.insertAsync({
      name: "dates",
      type: matsTypes.InputTypes.dateRange,
      options: [""],
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ["obs-type", "data-source"],
      controlButtonCovered: true,
      default: dstr,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 1,
    });

    const plotFormats = {};
    plotFormats[matsTypes.PlotFormats.none] = "no diffs";
    plotFormats[matsTypes.PlotFormats.matching] = "show matching diffs";
    plotFormats[matsTypes.PlotFormats.pairwise] = "pairwise diffs";
    await matsCollections.PlotParams.insertAsync({
      name: "plotFormat",
      type: matsTypes.InputTypes.select,
      optionsMap: plotFormats,
      options: [
        matsTypes.PlotFormats.none,
        matsTypes.PlotFormats.matching,
        matsTypes.PlotFormats.pairwise,
      ],
      default: matsTypes.PlotFormats.none,
      controlButtonCovered: true,
      controlButtonText: "Difference Curves",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3,
    });

    const yAxisOptionsMap = {
      "Relative frequency": ["relFreq"],
      Number: ["number"],
    };
    await matsCollections.PlotParams.insertAsync({
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
    await matsCollections.PlotParams.insertAsync({
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

    await matsCollections.PlotParams.insertAsync({
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

    await matsCollections.PlotParams.insertAsync({
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

    await matsCollections.PlotParams.insertAsync({
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

    await matsCollections.PlotParams.insertAsync({
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

    await matsCollections.PlotParams.insertAsync({
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

    await matsCollections.PlotParams.insertAsync({
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

    await matsCollections.PlotParams.insertAsync({
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

    await matsCollections.PlotParams.insertAsync({
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

    const mapRangeOptionsMap = {
      "Default range": ["default"],
      "Set range": ["set"],
    };
    await matsCollections.PlotParams.insertAsync({
      name: "map-range-controls",
      type: matsTypes.InputTypes.select,
      optionsMap: mapRangeOptionsMap,
      options: Object.keys(mapRangeOptionsMap),
      hideOtherFor: {
        "map-low-limit": ["Default range"],
        "map-high-limit": ["Default range"],
      },
      default: Object.keys(mapRangeOptionsMap)[0],
      controlButtonCovered: true,
      controlButtonText: "Map colorscale",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 3,
    });

    await matsCollections.PlotParams.insertAsync({
      name: "map-low-limit",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "-100",
      max: "100",
      step: "any",
      default: "0",
      controlButtonCovered: true,
      controlButtonText: "low limit",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 3,
    });

    await matsCollections.PlotParams.insertAsync({
      name: "map-high-limit",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: "-100",
      max: "100",
      step: "any",
      default: "5",
      controlButtonCovered: true,
      controlButtonText: "high limit",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // need to update the dates selector if the metadata has changed
    const currentParam = await matsCollections.PlotParams.findOneAsync({
      name: "dates",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.default, dstr)
    ) {
      // have to reload model data
      await matsCollections.PlotParams.updateAsync(
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

const doCurveParams = async function () {
  // force a reset if requested - simply remove all the existing params to force a reload
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    const params = (
      await matsCollections.CurveParamsInfo.findOneAsync({
        curve_params: { $exists: true },
      })
    ).curve_params;
    for (let cp = 0; cp < params.length; cp += 1) {
      await matsCollections[params[cp]].removeAsync({});
    }
  }

  const modelOptionsMap = {};
  let modelDateRangeMap = {};
  const regionModelOptionsMap = {};
  const sitesLocationMap = [];
  const forecastLengthOptionsMap = {};
  const scaleModelOptionsMap = {};
  const allRegionValuesMap = {};
  const allScaleValuesMap = {};

  try {
    const rows = await matsDataQueryUtils.queryMySQL(
      global.sumPool, // eslint-disable-line no-undef
      "select station,description from station_descriptions;"
    );
    for (let j = 0; j < rows.length; j += 1) {
      allRegionValuesMap[rows[j].station.trim()] = rows[j].description.trim();
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    const rows = await matsDataQueryUtils.queryMySQL(
      global.sumPool, // eslint-disable-line no-undef
      "select scle,description from scale_descriptions;"
    );
    for (let j = 0; j < rows.length; j += 1) {
      allScaleValuesMap[rows[j].scle.trim()] = rows[j].description.trim();
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    for (let didx = 0; didx < obs.length; didx += 1) {
      const obsType = obs[didx];
      modelOptionsMap[obsType] = {};
      modelDateRangeMap[obsType] = {};
      forecastLengthOptionsMap[obsType] = {};
      scaleModelOptionsMap[obsType] = {};
      regionModelOptionsMap[obsType] = {};

      const rows = await matsDataQueryUtils.queryMySQL(
        global.sumPool,
        `select model,regions,display_text,fcst_lens,scle,mindate,maxdate from ${obsDBNames[obsType].sumsDB}.regions_per_model_mats_all_categories order by display_category, display_order;`
      );
      for (let i = 0; i < rows.length; i += 1) {
        const modelValue = rows[i].model.trim();
        const model = rows[i].display_text.trim();
        modelOptionsMap[obsType][model] = [modelValue];

        const rowMinDate = moment
          .utc(rows[i].mindate * 1000)
          .format("MM/DD/YYYY HH:mm");
        const rowMaxDate = moment
          .utc(rows[i].maxdate * 1000)
          .format("MM/DD/YYYY HH:mm");
        modelDateRangeMap[obsType][model] = {
          minDate: rowMinDate,
          maxDate: rowMaxDate,
        };

        const forecastLengths = rows[i].fcst_lens;
        forecastLengthOptionsMap[obsType][model] = forecastLengths
          .split(",")
          .map(Function.prototype.call, String.prototype.trim)
          .map(function (fhr) {
            return (Number(fhr.replace(/'|\[|\]/g, "")) / 60).toString();
          });

        const scales = rows[i].scle;
        scaleModelOptionsMap[obsType][model] = scales
          .split(",")
          .map(Function.prototype.call, String.prototype.trim)
          .map(function (scale) {
            return allScaleValuesMap[scale.replace(/'|\[|\]/g, "")];
          });

        const { regions } = rows[i];
        regionModelOptionsMap[obsType][model] = [
          allRegionValuesMap.all_stat,
          allRegionValuesMap.all_surf,
          allRegionValuesMap.all_sol,
        ];
        regionModelOptionsMap[obsType][model] = regionModelOptionsMap[obsType][
          model
        ].concat(
          regions
            .split(",")
            .map(Function.prototype.call, String.prototype.trim)
            .map(function (region) {
              return allRegionValuesMap[region.replace(/'|\[|\]/g, "")];
            })
        );
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    const rows = await matsDataQueryUtils.queryMySQL(
      global.sumPool,
      "select id,name,net,lat,lon,elev from surfrad3_sums.stations order by id;"
    );
    for (let i = 0; i < rows.length; i += 1) {
      const siteId = rows[i].id;
      const siteName = rows[i].name;
      const siteNet = rows[i].net;
      const siteLat = rows[i].lat;
      const siteLon = rows[i].lon;
      const siteElev = rows[i].elev;

      // There's one station right at the south pole that the map doesn't know how to render at all, so exclude it.
      // Also exclude stations with missing data
      const point = [siteLat, siteLon];
      const obj = {
        id: siteId,
        name: siteName,
        origName: siteName,
        net: siteNet,
        point,
        elevation: siteElev,
      };
      sitesLocationMap.push(obj);
    }
  } catch (err) {
    throw new Error(err.message);
  }

  if ((await matsCollections.label.findOneAsync({ name: "label" })) === undefined) {
    await matsCollections.label.insertAsync({
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
    });
  }

  if (
    (await matsCollections["obs-type"].findOneAsync({ name: "obs-type" })) === undefined
  ) {
    await matsCollections["obs-type"].insertAsync({
      name: "obs-type",
      type: matsTypes.InputTypes.select,
      optionsMap: obsDBNames,
      options: obs,
      dates: modelDateRangeMap,
      dependentNames: ["data-source"],
      controlButtonCovered: true,
      default: obs[0],
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 1,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections["obs-type"].findOneAsync({
      name: "obs-type",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap)) {
      // have to reload variable data
      await matsCollections["obs-type"].updateAsync(
        { name: "obs-type" },
        {
          $set: {
            dates: modelDateRangeMap,
          },
        }
      );
    }
  }

  if (
    (await matsCollections["data-source"].findOneAsync({ name: "data-source" })) ===
    undefined
  ) {
    await matsCollections["data-source"].insertAsync({
      name: "data-source",
      type: matsTypes.InputTypes.select,
      optionsMap: modelOptionsMap,
      options: Object.keys(modelOptionsMap[obs[0]]),
      superiorNames: ["obs-type"],
      dependentNames: ["region", "forecast-length", "scale", "dates", "curve-dates"],
      controlButtonCovered: true,
      default: Object.keys(modelOptionsMap[obs[0]])[0],
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 1,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections["data-source"].findOneAsync({
      name: "data-source",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
      // have to reload model data
      await matsCollections["data-source"].updateAsync(
        { name: "data-source" },
        {
          $set: {
            optionsMap: modelOptionsMap,
            options: Object.keys(modelOptionsMap[obs[0]]),
            default: Object.keys(modelOptionsMap[obs[0]])[0],
          },
        }
      );
    }
  }

  if ((await matsCollections.region.findOneAsync({ name: "region" })) === undefined) {
    await matsCollections.region.insertAsync({
      name: "region",
      type: matsTypes.InputTypes.select,
      optionsMap: regionModelOptionsMap,
      options:
        regionModelOptionsMap[obs[0]][Object.keys(regionModelOptionsMap[obs[0]])[0]],
      valuesMap: allRegionValuesMap,
      sitesMap: sitesLocationMap,
      superiorNames: ["obs-type", "data-source"],
      controlButtonCovered: true,
      controlButtonText: "site",
      unique: false,
      default:
        regionModelOptionsMap[obs[0]][Object.keys(regionModelOptionsMap[obs[0]])[0]][0],
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 2,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.region.findOneAsync({ name: "region" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionModelOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, allRegionValuesMap)
    ) {
      // have to reload region data
      await matsCollections.region.updateAsync(
        { name: "region" },
        {
          $set: {
            optionsMap: regionModelOptionsMap,
            valuesMap: allRegionValuesMap,
            options:
              regionModelOptionsMap[obs[0]][
                Object.keys(regionModelOptionsMap[obs[0]])[0]
              ],
            default:
              regionModelOptionsMap[obs[0]][
                Object.keys(regionModelOptionsMap[obs[0]])[0]
              ][0],
          },
        }
      );
    }
  }

  const statOptionsMap = {
    RMSE: "scalar",

    "Bias (Model - Obs)": "scalar",

    N: "scalar",

    "Model average": "scalar",

    "Obs average": "scalar",

    "Std deviation": "scalar",

    MAE: "scalar",
  };

  if (
    (await matsCollections.statistic.findOneAsync({ name: "statistic" })) === undefined
  ) {
    await matsCollections.statistic.insertAsync({
      name: "statistic",
      type: matsTypes.InputTypes.select,
      optionsMap: statOptionsMap,
      options: Object.keys(statOptionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statOptionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (
    (await matsCollections["x-statistic"].findOneAsync({ name: "x-statistic" })) ===
    undefined
  ) {
    await matsCollections["x-statistic"].insertAsync({
      name: "x-statistic",
      type: matsTypes.InputTypes.select,
      optionsMap: statOptionsMap,
      options: Object.keys(statOptionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statOptionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 4,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (
    (await matsCollections["y-statistic"].findOneAsync({ name: "y-statistic" })) ===
    undefined
  ) {
    await matsCollections["y-statistic"].insertAsync({
      name: "y-statistic",
      type: matsTypes.InputTypes.select,
      optionsMap: statOptionsMap,
      options: Object.keys(statOptionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statOptionsMap)[0],
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
    "Downward Shortwave Radiation Flux (W/m2)": {
      "Predefined region": [
        "m0.sum2_d_dswrf",
        "m0.N_d_dswrf",
        "m0.sum_d_dswrf",
        "-1 * (m0.sum_d_dswrf-m0.sum_ob_dswrf)",
        "m0.sum_ob_dswrf",
        "m0.sum_ad_dswrf",
      ],
      "Select stations": [
        "pow(m0.obs_direct + m0.obs_diffuse - m0.model_dswrf,2)",
        "(m0.obs_direct + m0.obs_diffuse - m0.model_dswrf)",
        "(m0.obs_direct + m0.obs_diffuse - m0.model_dswrf)",
        "(if(m0.obs_direct + m0.obs_diffuse is not null,m0.model_dswrf,null))",
        "(if(m0.model_dswrf is not null,m0.obs_direct + m0.obs_diffuse,null))",
        "(abs(m0.obs_direct + m0.obs_diffuse - m0.model_dswrf))",
      ],
    },
  };

  const statVarUnitMap = {
    RMSE: {
      "Downward Shortwave Radiation Flux (W/m2)": "W/m2",
    },
    "Bias (Model - Obs)": {
      "Downward Shortwave Radiation Flux (W/m2)": "W/m2",
    },
    N: {
      "Downward Shortwave Radiation Flux (W/m2)": "Number",
    },
    "Model average": {
      "Downward Shortwave Radiation Flux (W/m2)": "W/m2",
    },
    "Obs average": {
      "Downward Shortwave Radiation Flux (W/m2)": "W/m2",
    },
    "Std deviation": {
      "Downward Shortwave Radiation Flux (W/m2)": "W/m2",
    },
    MAE: {
      "Downward Shortwave Radiation Flux (W/m2)": "W/m2",
    },
  };

  if (
    (await matsCollections.variable.findOneAsync({ name: "variable" })) === undefined
  ) {
    await matsCollections.variable.insertAsync({
      name: "variable",
      type: matsTypes.InputTypes.select,
      optionsMap: statVarOptionsMap,
      statVarUnitMap,
      options: Object.keys(statVarOptionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statVarOptionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (
    (await matsCollections["x-variable"].findOneAsync({ name: "x-variable" })) ===
    undefined
  ) {
    await matsCollections["x-variable"].insertAsync({
      name: "x-variable",
      type: matsTypes.InputTypes.select,
      optionsMap: statVarOptionsMap,
      statVarUnitMap,
      options: Object.keys(statVarOptionsMap),
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(statVarOptionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 5,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (
    (await matsCollections["y-variable"].findOneAsync({ name: "y-variable" })) ===
    undefined
  ) {
    await matsCollections["y-variable"].insertAsync({
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

  if ((await matsCollections.scale.findOneAsync({ name: "scale" })) === undefined) {
    await matsCollections.scale.insertAsync({
      name: "scale",
      type: matsTypes.InputTypes.select,
      optionsMap: scaleModelOptionsMap,
      options:
        scaleModelOptionsMap[obs[0]][Object.keys(scaleModelOptionsMap[obs[0]])[0]],
      valuesMap: allScaleValuesMap,
      superiorNames: ["obs-type", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default:
        scaleModelOptionsMap[obs[0]][Object.keys(scaleModelOptionsMap[obs[0]])[0]][0],
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 3,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections.scale.findOneAsync({ name: "scale" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, scaleModelOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.valuesMap, allScaleValuesMap)
    ) {
      // have to reload scale data
      await matsCollections.scale.updateAsync(
        { name: "scale" },
        {
          $set: {
            optionsMap: scaleModelOptionsMap,
            options:
              scaleModelOptionsMap[obs[0]][
                Object.keys(scaleModelOptionsMap[obs[0]])[0]
              ],
            default:
              scaleModelOptionsMap[obs[0]][
                Object.keys(scaleModelOptionsMap[obs[0]])[0]
              ][0],
          },
        }
      );
    }
  }

  if (
    (await matsCollections["forecast-length"].findOneAsync({
      name: "forecast-length",
    })) === undefined
  ) {
    await matsCollections["forecast-length"].insertAsync({
      name: "forecast-length",
      type: matsTypes.InputTypes.select,
      optionsMap: forecastLengthOptionsMap,
      options:
        forecastLengthOptionsMap[obs[0]][
          Object.keys(forecastLengthOptionsMap[obs[0]])[0]
        ],
      superiorNames: ["obs-type", "data-source"],
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
    const currentParam = await matsCollections["forecast-length"].findOneAsync({
      name: "forecast-length",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)
    ) {
      // have to reload forecast length data
      await matsCollections["forecast-length"].updateAsync(
        { name: "forecast-length" },
        {
          $set: {
            optionsMap: forecastLengthOptionsMap,
            options:
              forecastLengthOptionsMap[obs[0]][
                Object.keys(forecastLengthOptionsMap[obs[0]])[0]
              ],
          },
        }
      );
    }
  }

  if (
    (await matsCollections["dieoff-type"].findOneAsync({ name: "dieoff-type" })) ===
    undefined
  ) {
    const dieoffOptionsMap = {
      Dieoff: [matsTypes.ForecastTypes.dieoff],
      "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
      "Single cycle forecast (uses first date in range)": [
        matsTypes.ForecastTypes.singleCycle,
      ],
    };
    await matsCollections["dieoff-type"].insertAsync({
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

  if (
    (await matsCollections["valid-time"].findOneAsync({ name: "valid-time" })) ===
    undefined
  ) {
    const optionsArrRaw = [...Array(96).keys()].map((x) => x / 4);
    const optionsArr = optionsArrRaw.map(String);

    await matsCollections["valid-time"].insertAsync({
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
    (await matsCollections["utc-cycle-start"].findOneAsync({
      name: "utc-cycle-start",
    })) === undefined
  ) {
    await matsCollections["utc-cycle-start"].insertAsync({
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

  if ((await matsCollections.average.findOneAsync({ name: "average" })) === undefined) {
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
    await matsCollections.average.insertAsync({
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
    (await matsCollections["bin-parameter"].findOneAsync({ name: "bin-parameter" })) ===
    undefined
  ) {
    const optionsMap = {
      "Fcst lead time": "select m0.fcst_len/60 as binVal, ",
      "Valid UTC hour": "select m0.secs%(24*3600)/3600 as binVal, ",
      "Init UTC hour": "select (m0.secs-m0.fcst_len*60)%(24*3600)/3600 as binVal, ",
      "Valid Date": "select m0.secs as binVal, ",
      "Init Date": "select m0.secs-m0.fcst_len*60 as binVal, ",
    };

    await matsCollections["bin-parameter"].insertAsync({
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
  const defaultDataSource = (
    await matsCollections["data-source"].findOneAsync({ name: "data-source" })
  ).default;
  modelDateRangeMap = (
    await matsCollections["obs-type"].findOneAsync({ name: "obs-type" })
  ).dates;

  minDate = modelDateRangeMap[obs[0]][defaultDataSource].minDate;
  maxDate = modelDateRangeMap[obs[0]][defaultDataSource].maxDate;

  // need to turn the raw max and min from the metadata into the last valid month of data
  const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
  const minusMonthMinDate = newDateRange.minDate;
  maxDate = newDateRange.maxDate;
  dstr = `${moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm")} - ${moment
    .utc(maxDate)
    .format("MM/DD/YYYY HH:mm")}`;

  if (
    (await matsCollections["curve-dates"].findOneAsync({ name: "curve-dates" })) ===
    undefined
  ) {
    const optionsMap = {
      "1 day": ["1 day"],
      "3 days": ["3 days"],
      "7 days": ["7 days"],
      "31 days": ["31 days"],
      "90 days": ["90 days"],
      "180 days": ["180 days"],
      "365 days": ["365 days"],
    };
    await matsCollections["curve-dates"].insertAsync({
      name: "curve-dates",
      type: matsTypes.InputTypes.dateRange,
      optionsMap,
      options: Object.keys(optionsMap).sort(),
      startDate: minDate,
      stopDate: maxDate,
      superiorNames: ["obs-type", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default: dstr,
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 7,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = await matsCollections["curve-dates"].findOneAsync({
      name: "curve-dates",
    });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.startDate, minDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate) ||
      !matsDataUtils.areObjectsEqual(currentParam.default, dstr)
    ) {
      // have to reload dates data
      await matsCollections["curve-dates"].updateAsync(
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
const doCurveTextPatterns = async function () {
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    await matsCollections.CurveTextPatterns.removeAsync({});
  }
  if ((await matsCollections.CurveTextPatterns.find().countAsync()) === 0) {
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.timeSeries,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "obs-type", " "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["avg: ", "average", ""],
      ],
      displayParams: [
        "label",
        "obs-type",
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
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.dieoff,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "obs-type", " "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["", "dieoff-type", ", "],
        ["valid-time: ", "valid-time", ", "],
        ["start utc: ", "utc-cycle-start", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "obs-type",
        "data-source",
        "region",
        "statistic",
        "variable",
        "dieoff-type",
        "scale",
        "valid-time",
        "utc-cycle-start",
        "curve-dates",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.validtime,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "obs-type", " "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "obs-type",
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
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.dailyModelCycle,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "obs-type", " "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["start utc: ", "utc-cycle-start", ""],
      ],
      displayParams: [
        "label",
        "obs-type",
        "data-source",
        "region",
        "statistic",
        "variable",
        "scale",
        "utc-cycle-start",
      ],
      groupSize: 6,
    });
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.map,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", ": "],
        ["", "region", ", "],
        ["", "obs-type", " "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", " h "],
        [" valid-time:", "valid-time", ""],
      ],
      displayParams: [
        "label",
        "obs-type",
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
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.histogram,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "obs-type", " "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "curve-dates", ""],
      ],
      displayParams: [
        "label",
        "obs-type",
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
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.contour,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "obs-type", " "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ""],
      ],
      displayParams: [
        "label",
        "obs-type",
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
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.contourDiff,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "obs-type", " "],
        ["", "scale", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ""],
      ],
      displayParams: [
        "label",
        "obs-type",
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
    await matsCollections.CurveTextPatterns.insertAsync({
      plotType: matsTypes.PlotTypes.simpleScatter,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "obs-type", " "],
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
        "obs-type",
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

const doSavedCurveParams = async function () {
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    await matsCollections.SavedCurveParams.removeAsync({});
  }
  if ((await matsCollections.SavedCurveParams.find().countAsync()) === 0) {
    await matsCollections.SavedCurveParams.insertAsync({
      clName: "changeList",
      changeList: [],
    });
  }
};

const doPlotGraph = async function () {
  const settings = await matsCollections.Settings.findOneAsync({});
  if (
    settings === undefined ||
    settings.resetFromCode === undefined ||
    settings.resetFromCode === true
  ) {
    await matsCollections.PlotGraphFunctions.removeAsync({});
  }
  if ((await matsCollections.PlotGraphFunctions.find().countAsync()) === 0) {
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.timeSeries,
      graphFunction: "graphPlotly",
      dataFunction: "dataSeries",
      checked: true,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.dieoff,
      graphFunction: "graphPlotly",
      dataFunction: "dataDieoff",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.validtime,
      graphFunction: "graphPlotly",
      dataFunction: "dataValidTime",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.dailyModelCycle,
      graphFunction: "graphPlotly",
      dataFunction: "dataDailyModelCycle",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.map,
      graphFunction: "graphPlotly",
      dataFunction: "dataMap",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.histogram,
      graphFunction: "graphPlotly",
      dataFunction: "dataHistogram",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.contour,
      graphFunction: "graphPlotly",
      dataFunction: "dataContour",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.contourDiff,
      graphFunction: "graphPlotly",
      dataFunction: "dataContourDiff",
      checked: false,
    });
    await matsCollections.PlotGraphFunctions.insertAsync({
      plotType: matsTypes.PlotTypes.simpleScatter,
      graphFunction: "graphPlotly",
      dataFunction: "dataSimpleScatter",
      checked: false,
    });
  }
};

Meteor.startup(async function () {
  await matsCollections.Databases.removeAsync({});
  if ((await matsCollections.Databases.find({}).countAsync()) < 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "main startup: corrupted Databases collection: dropping Databases collection"
    );
    await matsCollections.Databases.dropAsync();
  }
  if ((await matsCollections.Databases.find({}).countAsync()) === 0) {
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
        await matsCollections.Databases.insertAsync(databases[di]);
      }
    }
  }

  // create list of all pools
  const allPools = [];

  // connect to the couchbase cluster
  const cbConnection = await matsCollections.Databases.findOneAsync(
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
    try {
      global.cbScorecardSettingsPool = new matsCouchbaseUtils.CBUtilities(
        cbConnection.host,
        cbConnection.bucket,
        cbConnection.scope,
        cbConnection.collection,
        cbConnection.user,
        cbConnection.password
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Error when initializing couchbase conenction: ${e.message}`);
    }
  }

  const sumSettings = await matsCollections.Databases.findOneAsync(
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
      maxIdle: 1,
    }
  );
  // the pool is intended to be global
  if (sumSettings) {
    global.sumPool = mysql.createPool({
      host: sumSettings.host,
      port: sumSettings.port,
      user: sumSettings.user,
      password: sumSettings.password,
      database: sumSettings.database,
      connectionLimit: sumSettings.connectionLimit,
      maxIdle: sumSettings.maxIdle,
    });
    allPools.push({ pool: "sumPool", role: matsTypes.DatabaseRoles.SUMS_DATA });
  }

  // create list of tables we need to monitor for update
  const mdr = new matsTypes.MetaDataDBRecord("sumPool", "surfrad3_sums", [
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
    throw new Error(error.message);
  }
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.
global.appSpecificResetRoutines = [
  doPlotGraph,
  doCurveParams,
  doSavedCurveParams,
  doPlotParams,
  doCurveTextPatterns,
];
