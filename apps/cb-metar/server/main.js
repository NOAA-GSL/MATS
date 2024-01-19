/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from "meteor/meteor";
import { moment } from "meteor/momentjs:moment";
import {
  matsMethods,
  matsTypes,
  matsCollections,
  matsDataUtils,
  matsParamUtils,
  matsCouchbaseUtils,
} from "meteor/randyp:mats-common";

// first field of each value array is sub-variables, second field is metadata document key,
// third is boolean for whether or not there are thresholds
const variableMetadataDocs = {
  Ceiling: [{ "Ceiling (ft)": ["Ceiling", "Ceiling", "ft"] }, true],
  Visibility: [{ "Visibility (mi)": ["Visibility", "Visibility", "mi"] }, true],
  Surface: [
    {
      "Temperature at 2m (°C)": ["Temperature", "Temperature", "°C"],
      "Dewpoint at 2m (°C)": ["DewPoint", "DewPoint", "°C"],
      "Relative Humidity at 2m (%)": ["RelativeHumidity", "RH", "RH (%)"],
      "Surface Pressure (hPa)": ["SurfacePressure", "Surface Pressure", "hPa"],
      "Wind Speed at 10m (m/s)": ["WindSpeed", "WS", "m/s"],
      "U-Wind at 10m (m/s)": ["WindU", "WindU", "m/s"],
      "V-Wind at 10m (m/s)": ["WindV", "WindV", "m/s"],
    },
    false,
  ],
};
const variables = Object.keys(variableMetadataDocs);
let allVariables = [];
let allVariablesNoThreshold = [];
let allVariablesYesThreshold = [];
let allVariablesNoneOption = [];

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
      "Fcst lead time": "m0.fcstLen",
      Threshold: "'{{vxTHRESHOLD}}'",
      "Valid UTC hour": "m0.fcstValidEpoch%(24*3600)/3600",
      "Init UTC hour": "(m0.fcstValidEpoch-m0.fcstLen*3600)%(24*3600)/3600",
      "Valid Date": "m0.fcstValidEpoch",
      "Init Date": "m0.fcstValidEpoch-m0.fcstLen*3600",
    };

    matsCollections.PlotParams.insert({
      name: "x-axis-parameter",
      type: matsTypes.InputTypes.select,
      options: Object.keys(xOptionsMap),
      optionsMap: xOptionsMap,
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(xOptionsMap)[2],
      controlButtonVisibility: "block",
      displayOrder: 9,
      displayPriority: 1,
      displayGroup: 2,
    });

    const yOptionsMap = {
      "Fcst lead time": "m0.fcstLen",
      Threshold: "'{{vxTHRESHOLD}}'",
      "Valid UTC hour": "m0.fcstValidEpoch%(24*3600)/3600",
      "Init UTC hour": "(m0.fcstValidEpoch-m0.fcstLen*3600)%(24*3600)/3600",
      "Valid Date": "m0.fcstValidEpoch",
      "Init Date": "m0.fcstValidEpoch-m0.fcstLen*3600",
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
      options: [
        "none",
        "95th percentile -- bootstrapping (SKILL SCORES ONLY)",
        "95th percentile -- standard t-test (CONTINUOUS VARIABLES ONLY)",
        "95th percentile -- t-test with infinite degrees of freedom (CONTINUOUS VARIABLES ONLY)",
      ],
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

const doCurveParams = async function () {
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
  const siteOptionsMap = {};
  const sitesLocationMap = [];
  const forecastLengthOptionsMap = {};
  const thresholdsModelOptionsMap = {};
  const allRegionValuesMap = {};
  const allThresholdValuesMap = {};

  try {
    // eslint-disable-next-line no-undef
    const queryStr = cbPool.trfmSQLForDbTarget(
      'select name, description from {{vxDBTARGET}} where type="MD" and docType="region" and version = "V01"  and subset="COMMON"'
    );
    // eslint-disable-next-line no-undef
    const rows = await cbPool.queryCB(queryStr);
    if (rows.includes("queryCB ERROR: ")) {
      // have this local try catch fail properly if the metadata isn't there
      throw new Error(rows);
    }

    for (let j = 0; j < rows.length; j += 1) {
      allRegionValuesMap[rows[j].name.trim()] = rows[j].description.trim();
    }
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    for (let didx = 0; didx < variables.length; didx += 1) {
      const variable = variables[didx];
      const subVariables = Object.keys(variableMetadataDocs[variable][0]);
      const hasThresholds = variableMetadataDocs[variable][1];
      let rows;
      if (hasThresholds) {
        // eslint-disable-next-line no-undef
        const queryStr = cbPool.trfmSQLForDbTarget(
          `select raw thresholdDescriptions.${variable.toLowerCase()} from {{vxDBTARGET}} use keys "MD:matsAux:COMMON:V01"`
        );
        // eslint-disable-next-line no-undef
        rows = await cbPool.queryCB(queryStr);
        if (rows.includes("queryCB ERROR: ")) {
          // have this local try catch fail properly if the metadata isn't there
          throw new Error(rows);
        }
        allVariablesYesThreshold = allVariablesYesThreshold.concat(subVariables);
      } else {
        rows = [{ NA: "NA" }];
        allVariablesNoThreshold = allVariablesNoThreshold.concat(subVariables);
      }
      for (let sidx = 0; sidx < subVariables.length; sidx += 1) {
        const subVariable = subVariables[sidx];
        allThresholdValuesMap[subVariable] = {};
        const allThresholds = Object.keys(rows[0]);
        for (let j = 0; j < allThresholds.length; j += 1) {
          // The replace here is because JSON doesn't like dots in the middle of keys
          allThresholdValuesMap[subVariable][
            allThresholds[j].trim().replace(/\./g, "_")
          ] = rows[0][allThresholds[j]].trim();
        }
      }
    }
    allVariablesYesThreshold = [...new Set(allVariablesYesThreshold)].sort(); // make sure all variables are unique, then sort
    allVariablesNoThreshold = [...new Set(allVariablesNoThreshold)].sort(); // make sure all variables are unique, then sort
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    for (let didx = 0; didx < variables.length; didx += 1) {
      const variable = variables[didx];
      const subVariables = Object.keys(variableMetadataDocs[variable][0]);
      allVariables = allVariables.concat(subVariables);

      // eslint-disable-next-line no-undef
      const queryStr = cbPool.trfmSQLForDbTarget(
        "select raw models from {{vxDBTARGET}} " +
          `USE KEYS "MD:matsGui:${variable.toLowerCase()}:COMMON:V01"`
      );
      // eslint-disable-next-line no-undef
      const [rows] = await cbPool.queryCB(queryStr);
      if (rows.includes("queryCB ERROR: ")) {
        // have this local try catch fail properly if the metadata isn't there
        throw new Error(rows);
      }

      rows.sort(
        (a, b) =>
          Number(a.displayCategory) - Number(b.displayCategory) ||
          Number(a.displayOrder) - Number(b.displayOrder)
      );
      for (let sidx = 0; sidx < subVariables.length; sidx += 1) {
        const subVariable = subVariables[sidx];
        modelOptionsMap[subVariable] = {};
        modelDateRangeMap[subVariable] = {};
        forecastLengthOptionsMap[subVariable] = {};
        thresholdsModelOptionsMap[subVariable] = {};
        regionModelOptionsMap[subVariable] = {};

        for (let i = 0; i < rows.length; i += 1) {
          const modelValue = rows[i].model.trim();
          const model = rows[i].displayText.trim();
          modelOptionsMap[subVariable][model] = [modelValue];

          const rowMinDate = moment
            .utc(rows[i].mindate * 1000)
            .format("MM/DD/YYYY HH:mm");
          const rowMaxDate = moment
            .utc(rows[i].maxdate * 1000)
            .format("MM/DD/YYYY HH:mm");
          modelDateRangeMap[subVariable][model] = {
            minDate: rowMinDate,
            maxDate: rowMaxDate,
          };

          forecastLengthOptionsMap[subVariable][model] = rows[i].fcstLens.map(String);

          // we want the full threshold descriptions in thresholdsModelOptionsMap, not just the thresholds
          const thresholds = rows[i].thresholds ? rows[i].thresholds : ["NA"];
          thresholdsModelOptionsMap[subVariable][model] = thresholds
            .sort(function (a, b) {
              return Number(a) - Number(b);
            })
            .map(function (threshold) {
              return allThresholdValuesMap[subVariable][threshold.replace(/\./g, "_")];
            });

          // we want the full region descriptions in thresholdsModelOptionsMap, not just the regions
          const { regions } = rows[i];
          regionModelOptionsMap[subVariable][model] = regions.map(function (region) {
            return allRegionValuesMap[region];
          });
        }
      }
    }
    allVariables = [...new Set(allVariables)].sort(); // make sure all variables are unique, then sort
    allVariablesNoneOption = [...new Set(["None"].concat(allVariables))];
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    matsCollections.SiteMap.remove({});
    // eslint-disable-next-line no-undef
    let rows = await cbPool.queryCB(
      // eslint-disable-next-line no-undef
      cbPool.trfmSQLForDbTarget(
        'select {{vxCOLLECTION}}.* from {{vxDBTARGET}} where type="MD" and docType="station" and version = "V01" and subset="{{vxCOLLECTION}}";'
      )
    );
    if (rows.includes("queryCB ERROR: ")) {
      // have this local try catch fail properly if the metadata isn't there
      throw new Error(rows);
    }
    rows = rows.sort((a, b) => (a.name > b.name ? 1 : -1));
    for (let i = 0; i < rows.length; i += 1) {
      const siteName = rows[i].name === undefined ? "unknown" : rows[i].name;
      const siteDescription =
        rows[i].description === undefined ? "unknown" : rows[i].description;
      const siteId = rows[i].id;
      const siteLat = rows[i].geo === undefined ? -90 : Number(rows[i].geo[0].lat);
      const siteLon = rows[i].geo === undefined ? 0 : Number(rows[i].geo[0].lon);
      const siteElev = rows[i].geo === undefined ? 0 : rows[i].geo[0].elev;

      // There's one station right at the south pole that the map doesn't know how to render at all, so exclude it.
      // Also exclude stations with missing data
      if (siteLat < 90 && siteLat > -90) {
        siteOptionsMap[siteName] = [siteId];

        const point = [siteLat, siteLon];
        const obj = {
          name: siteName,
          origName: siteName,
          point,
          elevation: siteElev,
          options: {
            title: siteDescription,
            color: "red",
            size: 5,
            network: "METAR",
            peerOption: siteName,
            id: siteId,
            highLightColor: "blue",
          },
        };
        sitesLocationMap.push(obj);
        matsCollections.SiteMap.insert({ siteName, siteId });
      }
    }
  } catch (err) {
    throw new Error(err.message);
  }

  matsCollections.StationMap.remove({});
  matsCollections.StationMap.insert({
    name: "stations",
    optionsMap: sitesLocationMap,
  });

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

  const defaultPlotType = matsTypes.PlotTypes.timeSeries;
  if (matsCollections["plot-type"].findOne({ name: "plot-type" }) === undefined) {
    matsCollections["plot-type"].insert({
      name: "plot-type",
      type: matsTypes.InputTypes.select,
      options: [
        matsTypes.PlotTypes.timeSeries,
        matsTypes.PlotTypes.dieoff,
        matsTypes.PlotTypes.threshold,
        matsTypes.PlotTypes.validtime,
        matsTypes.PlotTypes.dailyModelCycle,
        matsTypes.PlotTypes.performanceDiagram,
        matsTypes.PlotTypes.map,
        matsTypes.PlotTypes.histogram,
        matsTypes.PlotTypes.contour,
        matsTypes.PlotTypes.contourDiff,
      ],
      dependentNames: ["variable"],
      controlButtonCovered: false,
      default: defaultPlotType,
      unique: false,
      controlButtonVisibility: "none",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 1,
    });
  }

  const varOptionsMap = {};
  varOptionsMap[matsTypes.PlotTypes.timeSeries] = allVariables;
  varOptionsMap[matsTypes.PlotTypes.dieoff] = allVariables;
  varOptionsMap[matsTypes.PlotTypes.threshold] = allVariablesYesThreshold;
  varOptionsMap[matsTypes.PlotTypes.validtime] = allVariables;
  varOptionsMap[matsTypes.PlotTypes.dailyModelCycle] = allVariables;
  varOptionsMap[matsTypes.PlotTypes.performanceDiagram] = allVariablesYesThreshold;
  varOptionsMap[matsTypes.PlotTypes.map] = allVariables;
  varOptionsMap[matsTypes.PlotTypes.histogram] = allVariables;
  varOptionsMap[matsTypes.PlotTypes.contour] = allVariables;
  varOptionsMap[matsTypes.PlotTypes.contourDiff] = allVariables;

  if (matsCollections.variable.findOne({ name: "variable" }) === undefined) {
    matsCollections.variable.insert({
      name: "variable",
      type: matsTypes.InputTypes.select,
      options: varOptionsMap[defaultPlotType],
      optionsMap: varOptionsMap,
      valuesMap: variableMetadataDocs,
      dates: modelDateRangeMap,
      superiorNames: ["plot-type"],
      dependentNames: ["data-source", "statistic"],
      controlButtonCovered: true,
      default: varOptionsMap[defaultPlotType][0],
      hideOtherFor: {
        threshold: allVariablesNoThreshold,
      },
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 1,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections.variable.findOne({ name: "variable" });
    if (
      !matsDataUtils.areObjectsEqual(currentParam.optionsMap, varOptionsMap) ||
      !matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap)
    ) {
      // have to reload variable data
      matsCollections.variable.update(
        { name: "variable" },
        {
          $set: {
            options: varOptionsMap[defaultPlotType],
            optionsMap: varOptionsMap,
            valuesMap: variableMetadataDocs,
            dates: modelDateRangeMap,
            default: varOptionsMap[defaultPlotType][0],
          },
        }
      );
    }
  }

  if (matsCollections["region-type"].findOne({ name: "region-type" }) === undefined) {
    matsCollections["region-type"].insert({
      name: "region-type",
      type: matsTypes.InputTypes.select,
      options: ["Predefined region", "Select stations"],
      default: "Predefined region",
      hideOtherFor: {
        region: ["Select stations"],
        sites: ["Predefined region"],
        sitesMap: ["Predefined region"],
      },
      controlButtonCovered: true,
      controlButtonText: "Region mode",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 2,
    });
  }

  if (matsCollections["data-source"].findOne({ name: "data-source" }) === undefined) {
    matsCollections["data-source"].insert({
      name: "data-source",
      type: matsTypes.InputTypes.select,
      optionsMap: modelOptionsMap,
      options: Object.keys(modelOptionsMap[allVariables[0]]),
      superiorNames: ["variable"],
      dependentNames: [
        "region",
        "forecast-length",
        "threshold",
        "dates",
        "curve-dates",
      ],
      controlButtonCovered: true,
      default: Object.keys(modelOptionsMap[allVariables[0]])[0],
      unique: false,
      controlButtonVisibility: "block",
      displayOrder: 4,
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
            options: Object.keys(modelOptionsMap[allVariables[0]]),
            default: Object.keys(modelOptionsMap[allVariables[0]])[0],
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
        regionModelOptionsMap[allVariables[0]][
          Object.keys(regionModelOptionsMap[allVariables[0]])[0]
        ],
      valuesMap: allRegionValuesMap,
      superiorNames: ["variable", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default:
        regionModelOptionsMap[allVariables[0]][
          Object.keys(regionModelOptionsMap[allVariables[0]])[0]
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
              regionModelOptionsMap[allVariables[0]][
                Object.keys(regionModelOptionsMap[allVariables[0]])[0]
              ],
            default:
              regionModelOptionsMap[allVariables[0]][
                Object.keys(regionModelOptionsMap[allVariables[0]])[0]
              ][0],
          },
        }
      );
    }
  }

  if (matsCollections.statistic.findOne({ name: "statistic" }) === undefined) {
    const ctcOptionsMap = {
      "CSI (Critical Success Index)": ["ctc", "x100", 100],

      "TSS (True Skill Score)": ["ctc", "x100", 100],

      "PODy (POD of value < threshold)": ["ctc", "x100", 100],

      "PODn (POD of value > threshold)": ["ctc", "x100", 100],

      "FAR (False Alarm Ratio)": ["ctc", "x100", 0],

      "Bias (forecast/actual)": ["ctc", "Ratio", 1],

      "HSS (Heidke Skill Score)": ["ctc", "x100", 100],

      "ETS (Equitable Threat Score)": ["ctc", "x100", 100],

      "Nlow (Number of obs < threshold (hits + misses))": ["ctc", "Number", null],

      "Nhigh (Number of obs > threshold (false alarms + correct nulls))": [
        "ctc",
        "Number",
        null,
      ],

      "Ntot (Total number of obs, (Nlow + Nhigh))": ["ctc", "Number", null],

      "Ratio Nlow / Ntot ((hit + miss)/(hit + miss + fa + cn))": ["ctc", "Ratio", null],

      "Ratio Nhigh / Ntot ((fa + cn)/(hit + miss + fa + cn))": ["ctc", "Ratio", null],

      "N times*levels(*stations if station plot) per graph point": [
        "ctc",
        "Number",
        null,
      ],
    };
    const scalarOptionsMap = {
      RMSE: ["scalar", "Unknown", null],

      "Bias (Model - Obs)": ["scalar", "Unknown", null],

      N: ["scalar", "Number", null],

      "Model average": ["scalar", "Unknown", null],

      "Obs average": ["scalar", "Unknown", null],

      "Std deviation": ["scalar", "Unknown", null],

      "MAE (temp and dewpoint only)": ["scalar", "Unknown", null],
    };
    const optionsMap = {};
    for (let vidx = 0; vidx < allVariables.length; vidx += 1) {
      const variable = allVariables[vidx];
      optionsMap[variable] =
        allVariablesYesThreshold.indexOf(variable) !== -1
          ? ctcOptionsMap
          : scalarOptionsMap;
    }
    matsCollections.statistic.insert({
      name: "statistic",
      type: matsTypes.InputTypes.select,
      optionsMap,
      options: Object.keys(optionsMap),
      superiorNames: ["variable"],
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 3,
    });
  }

  if (matsCollections.threshold.findOne({ name: "threshold" }) === undefined) {
    matsCollections.threshold.insert({
      name: "threshold",
      type: matsTypes.InputTypes.select,
      optionsMap: thresholdsModelOptionsMap,
      options:
        thresholdsModelOptionsMap[allVariables[0]][
          Object.keys(thresholdsModelOptionsMap[allVariables[0]])[0]
        ],
      valuesMap: allThresholdValuesMap,
      superiorNames: ["variable", "data-source"],
      controlButtonCovered: true,
      unique: false,
      default:
        thresholdsModelOptionsMap[allVariables[0]][
          Object.keys(thresholdsModelOptionsMap[allVariables[0]])[0]
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
              thresholdsModelOptionsMap[allVariables[0]][
                Object.keys(thresholdsModelOptionsMap[allVariables[0]])[0]
              ],
            default:
              thresholdsModelOptionsMap[allVariables[0]][
                Object.keys(thresholdsModelOptionsMap[allVariables[0]])[0]
              ][0],
          },
        }
      );
    }
  }

  if (
    matsCollections["forecast-length"].findOne({ name: "forecast-length" }) ===
    undefined
  ) {
    matsCollections["forecast-length"].insert({
      name: "forecast-length",
      type: matsTypes.InputTypes.select,
      optionsMap: forecastLengthOptionsMap,
      options:
        forecastLengthOptionsMap[allVariables[0]][
          Object.keys(forecastLengthOptionsMap[allVariables[0]])[0]
        ],
      superiorNames: ["variable", "data-source"],
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
    const currentParam = matsCollections["forecast-length"].findOne({
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
            options:
              forecastLengthOptionsMap[allVariables[0]][
                Object.keys(forecastLengthOptionsMap[allVariables[0]])[0]
              ],
          },
        }
      );
    }
  }

  if (matsCollections["dieoff-type"].findOne({ name: "dieoff-type" }) === undefined) {
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

  if (matsCollections["valid-time"].findOne({ name: "valid-time" }) === undefined) {
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
    matsCollections["utc-cycle-start"].findOne({ name: "utc-cycle-start" }) ===
    undefined
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

  if (matsCollections.average.findOne({ name: "average" }) === undefined) {
    const optionsMap = {
      None: ["m0.fcstValidEpoch"],
      "3hr": [
        `ceil(${3600 * 3}*floor(((m0.fcstValidEpoch)+${3600 * 3}/2)/${3600 * 3}))`,
      ],
      "6hr": [
        `ceil(${3600 * 6}*floor(((m0.fcstValidEpoch)+${3600 * 6}/2)/${3600 * 6}))`,
      ],
      "12hr": [
        `ceil(${3600 * 12}*floor(((m0.fcstValidEpoch)+${3600 * 12}/2)/${3600 * 12}))`,
      ],
      "1D": [
        `ceil(${3600 * 24}*floor(((m0.fcstValidEpoch)+${3600 * 24}/2)/${3600 * 24}))`,
      ],
      "3D": [
        `ceil(${3600 * 24 * 3}*floor(((m0.fcstValidEpoch)+${3600 * 24 * 3}/2)/${
          3600 * 24 * 3
        }))`,
      ],
      "7D": [
        `ceil(${3600 * 24 * 7}*floor(((m0.fcstValidEpoch)+${3600 * 24 * 7}/2)/${
          3600 * 24 * 7
        }))`,
      ],
      "30D": [
        `ceil(${3600 * 24 * 30}*floor(((m0.fcstValidEpoch)+${3600 * 24 * 30}/2)/${
          3600 * 24 * 30
        }))`,
      ],
      "60D": [
        `ceil(${3600 * 24 * 60}*floor(((m0.fcstValidEpoch)+${3600 * 24 * 60}/2)/${
          3600 * 24 * 60
        }))`,
      ],
      "90D": [
        `ceil(${3600 * 24 * 90}*floor(((m0.fcstValidEpoch)+${3600 * 24 * 90}/2)/${
          3600 * 24 * 90
        }))`,
      ],
      "180D": [
        `ceil(${3600 * 24 * 180}*floor(((m0.fcstValidEpoch)+${3600 * 24 * 180}/2)/${
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

  if (matsCollections.sites.findOne({ name: "sites" }) === undefined) {
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

  if (matsCollections.sitesMap.findOne({ name: "sitesMap" }) === undefined) {
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
    matsCollections["bin-parameter"].findOne({ name: "bin-parameter" }) === undefined
  ) {
    const optionsMap = {
      "Fcst lead time": "m0.fcstLen",
      Threshold: "'{{vxTHRESHOLD}}'",
      "Valid UTC hour": "m0.fcstValidEpoch%(24*3600)/3600",
      "Init UTC hour": "(m0.fcstValidEpoch-m0.fcstLen*3600)%(24*3600)/3600",
      "Valid Date": "m0.fcstValidEpoch",
      "Init Date": "m0.fcstValidEpoch-m0.fcstLen*3600",
    };

    matsCollections["bin-parameter"].insert({
      name: "bin-parameter",
      type: matsTypes.InputTypes.select,
      options: Object.keys(optionsMap),
      optionsMap,
      hideOtherFor: {
        "forecast-length": ["Fcst lead time"],
        threshold: ["Threshold"],
        "valid-time": ["Valid UTC hour"],
      },
      selected: "",
      controlButtonCovered: true,
      unique: false,
      default: Object.keys(optionsMap)[0],
      controlButtonVisibility: "block",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 6,
    });
  }

  if (
    matsCollections["filter-model-by"].findOne({ name: "filter-model-by" }) ===
    undefined
  ) {
    matsCollections["filter-model-by"].insert({
      name: "filter-model-by",
      type: matsTypes.InputTypes.select,
      options: allVariablesNoneOption,
      controlButtonCovered: true,
      default: "None",
      hideOtherFor: {
        "filter-model-max": ["None"],
        "filter-model-min": ["None"],
      },
      unique: false,
      controlButtonVisibility: "block",
      controlButtonText: "Filter model by",
      gapAbove: true,
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 8,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections["filter-model-by"].findOne({
      name: "filter-model-by",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.options, allVariablesNoneOption)) {
      // have to reload variable data
      matsCollections["filter-model-by"].update(
        { name: "filter-model-by" },
        {
          $set: {
            options: allVariablesNoneOption,
          },
        }
      );
    }
  }

  if (
    matsCollections["filter-model-min"].findOne({ name: "filter-model-min" }) ===
    undefined
  ) {
    matsCollections["filter-model-min"].insert({
      name: "filter-model-min",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: 0,
      max: 60000,
      step: "any",
      controlButtonCovered: true,
      unique: false,
      default: 0,
      controlButtonVisibility: "block",
      controlButtonText: "minimum",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 8,
    });
  }

  if (
    matsCollections["filter-model-max"].findOne({ name: "filter-model-max" }) ===
    undefined
  ) {
    matsCollections["filter-model-max"].insert({
      name: "filter-model-max",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: 0,
      max: 60000,
      step: "any",
      controlButtonCovered: true,
      unique: false,
      default: 60000,
      controlButtonVisibility: "block",
      controlButtonText: "maximum",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 8,
    });
  }

  if (
    matsCollections["filter-obs-by"].findOne({ name: "filter-obs-by" }) === undefined
  ) {
    matsCollections["filter-obs-by"].insert({
      name: "filter-obs-by",
      type: matsTypes.InputTypes.select,
      options: allVariablesNoneOption,
      controlButtonCovered: true,
      default: "None",
      hideOtherFor: {
        "filter-obs-max": ["None"],
        "filter-obs-min": ["None"],
      },
      unique: false,
      controlButtonVisibility: "block",
      controlButtonText: "Filter obs by",
      displayOrder: 1,
      displayPriority: 1,
      displayGroup: 9,
    });
  } else {
    // it is defined but check for necessary update
    const currentParam = matsCollections["filter-obs-by"].findOne({
      name: "filter-obs-by",
    });
    if (!matsDataUtils.areObjectsEqual(currentParam.options, allVariablesNoneOption)) {
      // have to reload variable data
      matsCollections["filter-obs-by"].update(
        { name: "filter-obs-by" },
        {
          $set: {
            options: allVariablesNoneOption,
          },
        }
      );
    }
  }

  if (
    matsCollections["filter-obs-min"].findOne({ name: "filter-obs-min" }) === undefined
  ) {
    matsCollections["filter-obs-min"].insert({
      name: "filter-obs-min",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: 0,
      max: 60000,
      step: "any",
      controlButtonCovered: true,
      unique: false,
      default: 0,
      controlButtonVisibility: "block",
      controlButtonText: "minimum",
      displayOrder: 2,
      displayPriority: 1,
      displayGroup: 9,
    });
  }

  if (
    matsCollections["filter-obs-max"].findOne({ name: "filter-obs-max" }) === undefined
  ) {
    matsCollections["filter-obs-max"].insert({
      name: "filter-obs-max",
      type: matsTypes.InputTypes.numberSpinner,
      optionsMap: {},
      options: [],
      min: 0,
      max: 60000,
      step: "any",
      controlButtonCovered: true,
      unique: false,
      default: 60000,
      controlButtonVisibility: "block",
      controlButtonText: "maximum",
      displayOrder: 3,
      displayPriority: 1,
      displayGroup: 9,
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
  minDate = modelDateRangeMap[allVariables[0]][defaultDataSource].minDate;
  maxDate = modelDateRangeMap[allVariables[0]][defaultDataSource].maxDate;

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
        ["", "sites", ": "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["avg: ", "average", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "threshold",
        "average",
        "forecast-length",
        "valid-time",
        "sites",
        "sitesMap",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
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
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["", "dieoff-type", ", "],
        ["valid-time: ", "valid-time", ", "],
        ["start utc: ", "utc-cycle-start", ", "],
        ["", "curve-dates", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "threshold",
        "dieoff-type",
        "valid-time",
        "utc-cycle-start",
        "sites",
        "sitesMap",
        "curve-dates",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.threshold,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "sites", ": "],
        ["", "region", ", "],
        ["", "variable", " "],
        ["", "statistic", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "curve-dates", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "forecast-length",
        "valid-time",
        "curve-dates",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
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
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["", "curve-dates", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "threshold",
        "forecast-length",
        "sites",
        "sitesMap",
        "curve-dates",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
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
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["start utc: ", "utc-cycle-start", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region-type",
        "region",
        "statistic",
        "threshold",
        "utc-cycle-start",
        "sites",
        "sitesMap",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.performanceDiagram,
      textPattern: [
        ["", "label", ": "],
        ["", "data-source", " in "],
        ["", "region", ", "],
        ["", "variable", " at "],
        ["", "threshold", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "curve-dates", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "threshold",
        "forecast-length",
        "valid-time",
        "bin-parameter",
        "curve-dates",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
      ],
      groupSize: 6,
    });
    matsCollections.CurveTextPatterns.insert({
      plotType: matsTypes.PlotTypes.map,
      textPattern: [
        ["", "data-source", ": "],
        ["", "sites", ": "],
        ["", "variable", " "],
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_len: ", "forecast-length", " h "],
        [" valid-time:", "valid-time", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "variable",
        "data-source",
        "statistic",
        "threshold",
        "forecast-length",
        "valid-time",
        "sites",
        "sitesMap",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
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
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ", "],
        ["", "curve-dates", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "threshold",
        "forecast-length",
        "valid-time",
        "curve-dates",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
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
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "threshold",
        "forecast-length",
        "valid-time",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
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
        ["", "statistic", " at "],
        ["", "threshold", ", "],
        ["fcst_len: ", "forecast-length", "h, "],
        ["valid-time: ", "valid-time", ". "],
        ["Model filtered by: ", "filter-model-by", " "],
        ["range: ", "filter-model-min", " "],
        ["to ", "filter-model-max", ". "],
        ["Obs filtered by: ", "filter-obs-by", " "],
        ["range: ", "filter-obs-min", " "],
        ["to ", "filter-obs-max", ". "],
      ],
      displayParams: [
        "label",
        "variable",
        "data-source",
        "region",
        "statistic",
        "threshold",
        "forecast-length",
        "valid-time",
        "filter-model-by",
        "filter-model-min",
        "filter-model-max",
        "filter-obs-by",
        "filter-obs-min",
        "filter-obs-max",
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
      plotType: matsTypes.PlotTypes.dieoff,
      graphFunction: "graphPlotly",
      dataFunction: "dataDieoff",
      checked: false,
    });
    matsCollections.PlotGraphFunctions.insert({
      plotType: matsTypes.PlotTypes.threshold,
      graphFunction: "graphPlotly",
      dataFunction: "dataThreshold",
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
      plotType: matsTypes.PlotTypes.performanceDiagram,
      graphFunction: "graphPlotly",
      dataFunction: "dataPerformanceDiagram",
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

  // the cluster and bucket are intended to be global
  if (cbConnection) {
    // eslint-disable-next-line no-undef
    cbPool = new matsCouchbaseUtils.CBUtilities(
      cbConnection.host,
      cbConnection.bucket,
      cbConnection.scope,
      cbConnection.collection,
      cbConnection.user,
      cbConnection.password
    );
  }
  allPools.push({ pool: "cbPool", role: matsTypes.DatabaseRoles.COUCHBASE });
  // create list of tables we need to monitor for update
  const mdr = new matsTypes.MetaDataDBRecord(
    "cbPool",
    `${cbConnection.bucket}:${cbConnection.scope}:${cbConnection.collection}`,
    [
      "MD:matsAux:COMMON:V01",
      "MD:matsGui:ceiling:COMMON:V01",
      "MD:matsGui:visibility:COMMON:V01",
      "MD:matsGui:surface:COMMON:V01",
    ]
  );
  try {
    matsMethods.resetApp({
      appPools: allPools,
      appMdr: mdr,
      appType: matsTypes.AppTypes.mats,
      dbType: matsTypes.DbTypes.couchbase,
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
