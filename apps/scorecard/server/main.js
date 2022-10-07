/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsCouchbaseUtils} from 'meteor/randyp:mats-common';


// determined in doCurveParanms
var minDate;
var maxDate;
var dstr;

const doPlotParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotParams.remove({});
    }
    /*
    NOTE: hideOtherFor - radio button groups
    the hideOtherFor plotParam option for radio groups is similar to hideOtherFor for select params.
    hideOtherFor: {
        'param-name-to-be-hidden':['checked-option-that-hides','other-checked-option-that-hides', ...]
    }
    */

    if (matsCollections.PlotParams.findOne({name: "scorecard-schedule-mode"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
            name: 'scorecard-schedule-mode',
            type: matsTypes.InputTypes.radioGroup,
            options: ["Once", "Recurring"],
            dependentRadioGroups: ['scorecard-recurrence-interval'], // need an event triggered after this element changes to ensure hide/show settings are correct
            controlButtonCovered: false,
            default: "Once",
            hideOtherFor: {
                'scorecard-recurrence-interval': ['Once'],
                'relative-date-range-type': ['Once'],
                'relative-date-range-value': ['Once'],
                'scorecard-ends-on': ['Once'],
                'these-hours-of-the-day': ['Once'],
                'these-days-of-the-week': ['Once'],
                'these-days-of-the-month': ['Once'],
                'these-months': ['Once'],
                'scorecard-ends-on': ['Once'],
                'dates': ['Recurring'],

            },
            controlButtonVisibility: 'block',
            displayOrder: 1,
            displayPriority: 1,
            displayGroup: 1,
            tooltip: `The schedule mode, 'Once' means that this scorecard will be
             processed only one time. Recurring means that this scorecard will be
             processed repeatedly on a schedule. If you choose 'Recurring' you will
             need to choose the schedule recurrence parameters as well as the
             date after which processing will cease.`,
            tooltipPlacement: "right"
        });
    }

    if (matsCollections.PlotParams.findOne({name: "dates"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'dates',
                type: matsTypes.InputTypes.dateRange,
                optionsMap: {},
                options: [],
                startDate: minDate,
                stopDate: maxDate,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                default: dstr,
                controlButtonVisibility: 'block',
                controlButtonText: 'one time date range',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2,
                help: "dateHelp.html",
                tooltip: `The date range over which this 'Once' (one time) scorecard will be processed.
                This scorecard will process only that date range, and process it only one time`,
                tooltipPlacement: "right"
            });
    } else {
        // need to update the dates selector if the metadata has changed
        var currentParam = matsCollections.PlotParams.findOne({name: 'dates'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload model data
            matsCollections.PlotParams.update({name: 'dates'}, {
                $set: {
                    startDate: minDate,
                    stopDate: maxDate,
                    default: dstr
                }
            });
        }
    }

    if (matsCollections.PlotParams.findOne({name: "relative-date-range-type"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'relative-date-range-type',
                type: matsTypes.InputTypes.select,
                options: ["Hours", "Days", "Weeks"],
                controlButtonCovered: true,
                default: "Hours",
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2,
                tooltip: `The relative time range type. All recurring scorecards will process a time range that is relative to
                the recurring scorecard processing schedule. For example, if you choose 'Hours' then you will need
                to also choose the number of hours prior to the scheduled run time that will be included in the
                calculations. The same for 'Days' or 'Weeks'`,
                tooltipPlacement: "right"
            });
    }

    if (matsCollections.PlotParams.findOne({name: "relative-date-range-value"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'relative-date-range-value',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '1',
                max: '100',
                step: 'any',
                controlButtonCovered: true,
                default: 1,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2,
                tooltip: `The number of 'Hours', 'Days', or 'Weeks' for which this Recurring scorecard will be
                calculated relative to its processing time. The time interval will be dynamically set for
                the period immediately prior to the processing time, which will be determined by the recurrence schedule.`,
                tooltipPlacement: "right"
            });
    }

    if (matsCollections.PlotParams.findOne({name: "scorecard-recurrence-interval"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'scorecard-recurrence-interval',
                type: matsTypes.InputTypes.radioGroup,
                options: ["Daily", "Weekly", "Monthly", "Yearly"],
                superiorRadioGroups: ['scorecard-schedule-mode'],
                controlButtonCovered: false,
                default: "Weekly",
                hideOtherFor: {
                    'these-days-of-the-week': ['Daily', 'Monthly', 'Yearly'], // only exposed on weekly
                    'these-days-of-the-month': ['Daily', 'Weekly'], // only exposed for monthly and yearly
                    'these-months': ['Daily', 'Weekly', 'Monthly'] // only exposed on yearly
                },
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3,
                tooltip: `The type of recurrance interval on which this recurring scorecard will be processed.
                Each new cycle will create a new viewable scorecard identified by the 'user',
                'Scorecard Name', and processing date and time.`,
                tooltipPlacement: "right"
            });
    }


    if (matsCollections.PlotParams.findOne({name: "these-hours-of-the-day"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'these-hours-of-the-day',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                controlButtonCovered: true,
                default: "unused",
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4,
                tooltip: "The hours of the day for which this 'Daily', 'Weekly' or 'Monthly' scorecard will be reprocessed.",
                tooltipPlacement: "right"
            });
    }
    if (matsCollections.PlotParams.findOne({name: "these-days-of-the-week"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'these-days-of-the-week',
                type: matsTypes.InputTypes.select,
                options: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                controlButtonCovered: true,
                default: "unused",
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4,
                tooltip: "The days of the week for which this 'Weekly' scorecard will be reprocessed.",
                tooltipPlacement: "right"
            });
    }
    if (matsCollections.PlotParams.findOne({name: "these-days-of-the-month"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'these-days-of-the-month',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'],
                controlButtonCovered: true,
                default: "unused",
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4,
                tooltip: "The days of the month for which this 'Monthly' or 'Yearly' scorecard will be reprocessed.",
                tooltipPlacement: "right"
            });
    }
    if (matsCollections.PlotParams.findOne({name: "these-months"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'these-months',
                type: matsTypes.InputTypes.select,
                options: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                controlButtonCovered: true,
                default: "unused",
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 4,
                tooltip: "The months for which this 'Yearly' scorecard will be reprocessed.",
                tooltipPlacement: "right"
            });
    }
    if (matsCollections.PlotParams.findOne({name: "scorecard-ends-on"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'scorecard-ends-on',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],
                controlButtonCovered: true,
                default: new Date().toLocaleDateString(),
                controlButtonVisibility: 'none',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5,
                tooltip: `The date after which processing for this scorecard will end,
                any runs on the end date will be completed. Completed scorecards will be accessed based on
                'user', 'Scorecard Name', and processed date.`,
                tooltipPlacement: "right"
            });
    }

    if (matsCollections.PlotParams.findOne({
            name: "scorecard-percent-stdv"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'scorecard-percent-stdv',
            type: matsTypes.InputTypes.radioGroup,
            options: ["Percent", "StandardDeviation"],
            controlButtonCovered: false,
            default: "Percent",
            hideOtherFor: {
                'minor-threshold-by-percent': ["StandardDeviation"],
                'major-threshold-by-percent': ["StandardDeviation"],
                'minor-threshold-by-stdv': ["Percent"],
                'major-threshold-by-stdv': ["Percent"],
            },
            controlButtonVisibility: 'block',
            displayOrder: 1,
            displayPriority: 1,
            displayGroup: 6,
            tooltip: "The method for setting the significance thresholds, percentage or standard deviation.",
            tooltipPlacement: "right"
        });
    }


    if (matsCollections.PlotParams.findOne({
            name: "minor-threshold-by-percent"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'minor-threshold-by-percent',
            type: matsTypes.InputTypes.numberSpinner,
            optionsMap: {},
            options: [],
            min: '90',
            max: '100',
            step: '1',
            default: 95,
            controlButtonCovered: true,
            controlButtonText: "minor - %",
            controlButtonFA: "fa-1x fa fa-caret-down",
            controlButtonVisibility: 'none',
            displayOrder: 1,
            displayPriority: 1,
            displayGroup: 7,
            tooltip: "The threshold for the minor significance defined in percentage.",
            tooltipPlacement: "right"
        });
    }
    if (matsCollections.PlotParams.findOne({
            name: "major-threshold-by-percent"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'major-threshold-by-percent',
            type: matsTypes.InputTypes.numberSpinner,
            optionsMap: {},
            options: [],
            min: '90',
            max: '100',
            step: '1',
            default: 99,
            controlButtonCovered: true,
            controlButtonText: "major - %",
            controlButtonFA: "fa-2x fa fa-caret-down",
            controlButtonVisibility: 'none',
            displayOrder: 2,
            displayPriority: 1,
            displayGroup: 7,
            tooltip: "The threshold for the major significance defined in percentage.",
            tooltipPlacement: "right"
        });
    }


    if (matsCollections.PlotParams.findOne({
            name: "minor-threshold-by-stdv"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'minor-threshold-by-stdv',
            type: matsTypes.InputTypes.numberSpinner,
            optionsMap: {},
            options: [],
            min: '1',
            max: '3',
            step: '1',
            default: 1,
            controlButtonCovered: true,
            controlButtonText: "minor - std",
            controlButtonFA: "fa-1x fa fa-caret-down",
            controlButtonVisibility: 'none',
            displayOrder: 1,
            displayPriority: 1,
            displayGroup: 7,
            tooltip: "The threshold for the minor significance defined in standard deviations.",
            tooltipPlacement: "right"
        });
    }
    if (matsCollections.PlotParams.findOne({
            name: "major-threshold-by-stdv"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'major-threshold-by-stdv',
            type: matsTypes.InputTypes.numberSpinner,
            optionsMap: {},
            options: [],
            min: '1',
            max: '3',
            step: '1',
            default: 1,
            controlButtonCovered: true,
            controlButtonText: "major - std",
            controlButtonFA: "fa-2x fa fa-caret-down",
            controlButtonVisibility: 'none',
            displayOrder: 2,
            displayPriority: 1,
            displayGroup: 7,
            tooltip: "The threshold for the major significance defined in standard deviations",
            tooltipPlacement: "right"
        });
    }

    if (matsCollections.PlotParams.findOne({
            name: "scorecard-color-theme"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'scorecard-color-theme',
            type: matsTypes.InputTypes.radioGroup,
            options: ["RedGreen", "RedBlue"],
            controlButtonCovered: false,
            default: "RedGreen",
            controlButtonVisibility: 'block',
            displayOrder: 1,
            displayPriority: 1,
            displayGroup: 8,
            tooltip: `The color scheme for the major and minor symbols,
            you can use the eyedropper tool in the color editor to customize colors.`,
            tooltipPlacement: "right"
        });
    }


    if (matsCollections.PlotParams.findOne({
            name: "minor-truth-color"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'minor-truth-color',
            type: matsTypes.InputTypes.color,
            optionsMap: {},
            options: [],
            controlButtonCovered: true,
            controlButtonText: " ",
            controlButtonFA: "fa-solid fa-caret-down",
            default: "#ff0000",
            controlButtonVisibility: 'block',
            displayOrder: 2,
            displayPriority: 1,
            displayGroup: 8,
            tooltip: `The color for the minor validation datasource symbol,
            you can use the eyedropper tool in the color editor to match colors to the major symbol`,
            tooltipPlacement: "right"
        });
    }

    if (matsCollections.PlotParams.findOne({
            name: "major-truth-color"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'major-truth-color',
            type: matsTypes.InputTypes.color,
            optionsMap: {},
            options: [],
            controlButtonCovered: true,
            controlButtonText: " ",
            controlButtonFA: "fa-solid fa-caret-down",
            default: "#ff0000",
            controlButtonVisibility: 'block',
            displayOrder: 3,
            displayPriority: 1,
            displayGroup: 8,
            tooltip: "The color for the major validation datasource symbol, you can use the eyedropper tool in the color editor to match colors to the minor symbol",
            tooltipPlacement: "right"
        });
    }

    if (matsCollections.PlotParams.findOne({
            name: "minor-source-color"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'minor-source-color',
            type: matsTypes.InputTypes.color,
            optionsMap: {},
            options: [],
            controlButtonCovered: true,
            controlButtonText: " ",
            controlButtonFA: "fa-solid fa-caret-up",
            default: "#00ff00",
            controlButtonVisibility: 'block',
            displayOrder: 4,
            displayPriority: 1,
            displayGroup: 8,
            tooltip: "The color for the minor datasource symbol, you can use the eyedropper tool in the color editor to match colors to the major symbol",
            tooltipPlacement: "right"
        });
    }

    if (matsCollections.PlotParams.findOne({
            name: "major-source-color"
        }) == undefined) {
        matsCollections.PlotParams.insert({
            name: 'major-source-color',
            type: matsTypes.InputTypes.color,
            optionsMap: {},
            options: [],
            controlButtonCovered: true,
            controlButtonText: " ",
            controlButtonFA: "fa-solid fa-caret-up",
            default: "#00ff00",
            controlButtonVisibility: 'block',
            displayOrder: 5,
            displayPriority: 1,
            displayGroup: 8,
            tooltip: "The color for the major datasource symbol, you can use the eyedropper tool in the color editor to match colors to the minor symbol",
            tooltipPlacement: "right"
        });
    }


    if (matsCollections.PlotParams.findOne({name: 'user'}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'user',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],
                controlButtonCovered: true,
                default: 'anon',
                unique: true,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 9
            });
    }
    if (matsCollections.PlotParams.findOne({name: 'scorecard-name'}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'scorecard-name',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],
                controlButtonCovered: true,
                default: 'unnamed',
                unique: true,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 9,
                tooltip: `The name for this scorecard. This name will be used to identify the scorecard.
                Each scorecard will be identified by a combination of 'user', 'scorecard name' and process timestamp. Recurring scorecards
                may have many instances with the same 'user' and 'scorecard name'.`,
                tooltipPlacement: "right"
            });
    }

};

const doCurveParams = function () {
    // force a reset if requested - simply remove all the existing params to force a reload
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        const params = matsCollections.CurveParamsInfo.find({"curve_params": {"$exists": true}}).fetch()[0]["curve_params"];
        for (var cp = 0; cp < params.length; cp++) {
            matsCollections[params[cp]].remove({});
        }
    }

    // get a map of the apps included in this scorecard, and which URLs we're pulling their metadata from
    const appsToScore = matsCollections.AppsToScore.find({"apps_to_score": {"$exists": true}}).fetch()[0]["apps_to_score"];

    let hideOtherFor = {}
    let applicationOptions = [];
    let applicationOptionsMap = {};
    let modelOptionsMap = {};
    let regionOptionsMap = {};
    let regionValuesMap = {};
    let statisticOptionsMap = {};
    let statisticValuesMap = {};
    let variableOptionsMap = {};
    let variableValuesMap = {};
    let thresholdOptionsMap = {};
    let thresholdValuesMap = {};
    let scaleOptionsMap = {};
    let scaleValuesMap = {};
    let truthOptionsMap = {};
    let truthValuesMap = {};
    let forecastLengthOptionsMap = {};
    let forecastTypeOptionsMap = {};
    let forecastTypeValuesMap = {};
    let validTimeOptionsMap = {};
    let levelOptionsMap = {};
    let dateOptionsMap = {};
    try {
        let currentApp;
        let currentURL;
        let queryURL;
        let expectedApps = [];
        for (let aidx = 0; aidx < appsToScore.length; aidx++) {
            currentApp = Object.keys(appsToScore[aidx])[0];
            currentURL = appsToScore[aidx][currentApp];

            // clean up URL if users left a trailing slash or didn't include https://
            if (currentURL[currentURL.length - 1] === "/") currentURL.slice(0, -1);
            if (!currentURL.includes("https://")) currentURL = "https://" + currentURL;

            // get database-defined apps in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getApps";
            [applicationOptions, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('application', queryURL, applicationOptions, expectedApps, [], hideOtherFor);

            // get databases that correspond with apps
            queryURL = currentURL + "/" + currentApp + "/getAppSumsDBs";
            [applicationOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('application-values', queryURL, applicationOptionsMap, expectedApps, {}, hideOtherFor);

            // get models in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getModels";
            [modelOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('data-source', queryURL, modelOptionsMap, expectedApps, {}, hideOtherFor);

            // get regions in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getRegions";
            [regionOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('region', queryURL, regionOptionsMap, expectedApps, {"NULL": ["NULL"]}, hideOtherFor);

            // get region values in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getRegionsValuesMap";
            [regionValuesMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('region-values', queryURL, regionValuesMap, expectedApps, ["NULL"], hideOtherFor);

            // get statistics in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getStatistics";
            [statisticOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('statistic', queryURL, statisticOptionsMap, expectedApps, ["NULL"], hideOtherFor);

            // get statistic values in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getStatisticsValuesMap";
            [statisticValuesMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('statistic-values', queryURL, statisticValuesMap, expectedApps, ["NULL"], hideOtherFor);

            // get variables in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getVariables";
            [variableOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('variable', queryURL, variableOptionsMap, expectedApps, ["NULL"], hideOtherFor);

            // get variable values in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getVariablesValuesMap";
            [variableValuesMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('variable-values', queryURL, variableValuesMap, expectedApps, ["NULL"], hideOtherFor);

            // get thresholds in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getThresholds";
            [thresholdOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('threshold', queryURL, thresholdOptionsMap, expectedApps, {"NULL": ["NULL"]}, hideOtherFor);

            // get threshold values in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getThresholdsValuesMap";
            [thresholdValuesMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('threshold-values', queryURL, thresholdValuesMap, expectedApps, ["NULL"], hideOtherFor);

            // get scales in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getScales";
            [scaleOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('scale', queryURL, scaleOptionsMap, expectedApps, {"NULL": ["NULL"]}, hideOtherFor);

            // get scale values in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getScalesValuesMap";
            [scaleValuesMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('scale-values', queryURL, scaleValuesMap, expectedApps, ["NULL"], hideOtherFor);

            // get truths in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getTruths";
            [truthOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('truth', queryURL, truthOptionsMap, expectedApps, {"NULL": ["NULL"]}, hideOtherFor);

            // get truth values in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getTruthsValuesMap";
            [truthValuesMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('truth-values', queryURL, truthValuesMap, expectedApps, ["NULL"], hideOtherFor);

            // get forecast lengths in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getFcstLengths";
            [forecastLengthOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('forecast-length', queryURL, forecastLengthOptionsMap, expectedApps, {"NULL": ["NULL"]}, hideOtherFor);

            // get forecast types in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getFcstTypes";
            [forecastTypeOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('forecast-type', queryURL, forecastTypeOptionsMap, expectedApps, {"NULL": ["NULL"]}, hideOtherFor);

            // get forecast type values in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getFcstTypesValuesMap";
            [forecastTypeValuesMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('forecast-type-values', queryURL, forecastTypeValuesMap, expectedApps, ["NULL"], hideOtherFor);

            // get valid times in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getValidTimes";
            [validTimeOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('valid-time', queryURL, validTimeOptionsMap, expectedApps, ["NULL"], hideOtherFor);

            // get levels in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getLevels";
            [levelOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('level', queryURL, levelOptionsMap, expectedApps, ["NULL"], hideOtherFor);

            // get dates in this MATS app
            queryURL = currentURL + "/" + currentApp + "/getDates";
            [dateOptionsMap, expectedApps, hideOtherFor] = matsDataUtils.callMetadataAPI('dates', queryURL, dateOptionsMap, expectedApps, {}, hideOtherFor);
        }
    } catch (err) {
        console.log(err.message);
    }


    if (matsCollections["label"].findOne({name: 'label'}) == undefined) {
        matsCollections["label"].insert(
            {
                name: 'label',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],
                controlButtonCovered: true,
                default: '',
                unique: true,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: 'label.html',
                tooltip: "The label for this scorecard row, this will be used to identify this row within the scorecard.",
                tooltipPlacement: "right"
            }
        );
    }

    if (matsCollections["application"].findOne({name: 'application'}) == undefined) {
        matsCollections["application"].insert(
            {
                name: 'application',
                type: matsTypes.InputTypes.select,
                optionsMap: applicationOptionsMap,
                options: applicationOptions,
                hideOtherFor: hideOtherFor,
                dates: dateOptionsMap,
                dependentNames: ["data-source", "validation-data-source", "statistic", "variable", "threshold", "scale", "truth", "valid-time", "level"],
                controlButtonCovered: true,
                default: applicationOptions[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1,
                tooltip: "The application for this scorecard row. Parameters will adjust to accomodate the application that you choose.",
                tooltipPlacement: "right"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["application"].findOne({name: 'application'});
        if (!matsDataUtils.areObjectsEqual(currentParam.dates, dateOptionsMap)) {
            // have to reload application data
            matsCollections["application"].update({name: 'application'}, {
                $set: {
                    dates: dateOptionsMap
                }
            });
        }
    }

    if (matsCollections["data-source"].findOne({name: 'data-source'}) == undefined) {
        matsCollections["data-source"].insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap[applicationOptions[0]]),
                superiorNames: ['application'],
                dependentNames: ["region", "threshold", "scale", "truth", "forecast-length", "forecast-type", "dates"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap[applicationOptions[0]])[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2,
                tooltip: "Datasource is the 'experiment' input for this scorecard row. calculations will be compared against the validation datasource.",
                tooltipPlacement: "right"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["data-source"].findOne({name: 'data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections["data-source"].update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap[applicationOptions[0]]),
                    default: Object.keys(modelOptionsMap[applicationOptions[0]])[0]
                }
            });
        }
    }

    if (matsCollections["validation-data-source"].findOne({name: 'validation-data-source'}) == undefined) {
        matsCollections["validation-data-source"].insert(
            {
                name: 'validation-data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap[applicationOptions[0]]),
                superiorNames: ['application'],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap[applicationOptions[0]])[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2,
                tooltip: "Validation Datasource is the data source for values that will be compared against the 'experiment' datasource.",
                tooltipPlacement: "right"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["validation-data-source"].findOne({name: 'validation-data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections["validation-data-source"].update({name: 'validation-data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap[applicationOptions[0]]),
                    default: Object.keys(modelOptionsMap[applicationOptions[0]])[0]
                }
            });
        }
    }

    if (matsCollections["region"].findOne({name: 'region'}) == undefined) {
        matsCollections["region"].insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionOptionsMap,
                options: regionOptionsMap[applicationOptions[0]][Object.keys(regionOptionsMap[applicationOptions[0]])[0]],
                valuesMap: regionValuesMap,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionOptionsMap[applicationOptions[0]][Object.keys(regionOptionsMap[applicationOptions[0]])[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3,
                tooltip: "This defines the meteorological predefined domain over which datasource and validation datasource statistical values will be calculated.",
                tooltipPlacement: "right"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["region"].findOne({name: 'region'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionOptionsMap)) {
            // have to reload region data
            matsCollections["region"].update({name: 'region'}, {
                $set: {
                    optionsMap: regionOptionsMap,
                    valuesMap: regionValuesMap,
                    options: regionOptionsMap[applicationOptions[0]][Object.keys(regionOptionsMap[applicationOptions[0]])[0]],
                    default: regionOptionsMap[applicationOptions[0]][Object.keys(regionOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["statistic"].findOne({name: 'statistic'}) == undefined) {
        matsCollections["statistic"].insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: statisticOptionsMap,
                options: statisticOptionsMap[Object.keys(statisticOptionsMap)[0]],
                valuesMap: statisticValuesMap,
                superiorNames: ['application'],
                controlButtonCovered: true,
                unique: false,
                default: statisticOptionsMap[Object.keys(statisticOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3,
                tooltip: `The statistical method used for calculations in a given subrow
                of the scorecard row. Each subrow will be calculated for a combination of
                statistic and variable over a predefined region.`,
                tooltipPlacement: "right"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["statistic"].findOne({name: 'statistic'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, statisticOptionsMap)) {
            // have to reload statistic data
            matsCollections["statistic"].update({name: 'statistic'}, {
                $set: {
                    optionsMap: statisticOptionsMap,
                    options: statisticOptionsMap[Object.keys(statisticOptionsMap)[0]],
                    default: statisticOptionsMap[Object.keys(statisticOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections["variable"].findOne({name: 'variable'}) == undefined) {
        matsCollections["variable"].insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: variableOptionsMap,
                options: variableOptionsMap[Object.keys(variableOptionsMap)[0]],
                valuesMap: variableValuesMap,
                superiorNames: ['application'],
                controlButtonCovered: true,
                unique: false,
                default: variableOptionsMap[Object.keys(variableOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3,
                tooltip: `The variable used for calculations in a given subrow
                of the scorecard row. Each subrow will be calculated for a combination of
                statistic and variable over a predefined region.`,
                tooltipPlacement: "right"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["variable"].findOne({name: 'variable'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, variableOptionsMap)) {
            // have to reload variable data
            matsCollections["variable"].update({name: 'variable'}, {
                $set: {
                    optionsMap: variableOptionsMap,
                    // valuesMap: variableValuesMap,
                    options: variableOptionsMap[Object.keys(variableOptionsMap)[0]],
                    default: variableOptionsMap[Object.keys(variableOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections["threshold"].findOne({
            name: 'threshold'
        }) == undefined) {
        matsCollections["threshold"].insert({
            name: 'threshold',
            type: matsTypes.InputTypes.select,
            optionsMap: thresholdOptionsMap,
            options: thresholdOptionsMap[applicationOptions[0]][Object.keys(thresholdOptionsMap[applicationOptions[0]])[0]],
            valuesMap: thresholdValuesMap,
            superiorNames: ['application', 'data-source'],
            controlButtonCovered: true,
            unique: false,
            default: thresholdOptionsMap[applicationOptions[0]][Object.keys(thresholdOptionsMap[applicationOptions[0]])[0]][0],
            controlButtonVisibility: 'block',
            displayOrder: 1,
            displayPriority: 1,
            displayGroup: 4,
            tooltip: `The threshold for which contingency variables have been bin'd.`,
            tooltipPlacement: "right"
        });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["threshold"].findOne({name: 'threshold'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, thresholdOptionsMap)) {
            // have to reload threshold data
            matsCollections["threshold"].update({name: 'threshold'}, {
                $set: {
                    optionsMap: thresholdOptionsMap,
                    // valuesMap: thresholdValuesMap,
                    options: thresholdOptionsMap[applicationOptions[0]][Object.keys(thresholdOptionsMap[applicationOptions[0]])[0]],
                    default: thresholdOptionsMap[applicationOptions[0]][Object.keys(thresholdOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["scale"].findOne({
            name: 'scale'
        }) == undefined) {
        matsCollections["scale"].insert({
            name: 'scale',
            type: matsTypes.InputTypes.select,
            optionsMap: scaleOptionsMap,
            options: scaleOptionsMap[applicationOptions[0]][Object.keys(scaleOptionsMap[applicationOptions[0]])[0]],
            valuesMap: scaleValuesMap,
            superiorNames: ['application', 'data-source'],
            controlButtonCovered: true,
            unique: false,
            default: scaleOptionsMap[applicationOptions[0]][Object.keys(scaleOptionsMap[applicationOptions[0]])[0]][0],
            controlButtonVisibility: 'block',
            displayOrder: 2,
            displayPriority: 1,
            displayGroup: 4,
            tooltip: `The grid resolution used for calculations.`,
            tooltipPlacement: "right"

        });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["scale"].findOne({name: 'scale'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, scaleOptionsMap)) {
            // have to reload scale data
            matsCollections["scale"].update({name: 'scale'}, {
                $set: {
                    optionsMap: scaleOptionsMap,
                    // valuesMap: scaleValuesMap,
                    options: scaleOptionsMap[applicationOptions[0]][Object.keys(scaleOptionsMap[applicationOptions[0]])[0]],
                    default: scaleOptionsMap[applicationOptions[0]][Object.keys(scaleOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["truth"].findOne({
            name: 'truth'
        }) == undefined) {
        matsCollections["truth"].insert({
            name: 'truth',
            type: matsTypes.InputTypes.select,
            optionsMap: truthOptionsMap,
            options: truthOptionsMap[applicationOptions[0]][Object.keys(truthOptionsMap[applicationOptions[0]])[0]],
            valuesMap: truthValuesMap,
            superiorNames: ['application', 'data-source'],
            controlButtonCovered: true,
            unique: false,
            default: truthOptionsMap[applicationOptions[0]][Object.keys(truthOptionsMap[applicationOptions[0]])[0]][0],
            controlButtonVisibility: 'block',
            displayOrder: 3,
            displayPriority: 1,
            displayGroup: 4,
            tooltip: `The source that was used to compare datasource values.`,
            tooltipPlacement: "right"

        });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["truth"].findOne({name: 'truth'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, truthOptionsMap)) {
            // have to reload truth data
            matsCollections["truth"].update({name: 'truth'}, {
                $set: {
                    optionsMap: truthOptionsMap,
                    // valuesMap: truthValuesMap,
                    options: truthOptionsMap[applicationOptions[0]][Object.keys(truthOptionsMap[applicationOptions[0]])[0]],
                    default: truthOptionsMap[applicationOptions[0]][Object.keys(truthOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["forecast-length"].findOne({name: 'forecast-length'}) == undefined) {
        matsCollections["forecast-length"].insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap[applicationOptions[0]][Object.keys(forecastLengthOptionsMap[applicationOptions[0]])[0]],
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: forecastLengthOptionsMap[applicationOptions[0]][Object.keys(forecastLengthOptionsMap[applicationOptions[0]])[0]][0],
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time (h)",
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5,
                tooltip: `The set of forecast lead times that are included in the scorecard.
                Each scorecard row will include the union of the forecast lengths for all the rows. If a given row
                does not have data for a specific forecast length, that forecast length will be represented with a nuetral
                color that indicates 'unavailable' data.`,
                tooltipPlacement: "right"

            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["forecast-length"].findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload forecast length data
            matsCollections["forecast-length"].update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: forecastLengthOptionsMap[applicationOptions[0]][Object.keys(forecastLengthOptionsMap[applicationOptions[0]])[0]],
                    default: forecastLengthOptionsMap[applicationOptions[0]][Object.keys(forecastLengthOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["forecast-type"].findOne({
            name: 'forecast-type'
        }) == undefined) {
        matsCollections["forecast-type"].insert({
            name: 'forecast-type',
            type: matsTypes.InputTypes.select,
            optionsMap: forecastTypeOptionsMap,
            options: forecastTypeOptionsMap[applicationOptions[0]][Object.keys(forecastTypeOptionsMap[applicationOptions[0]])[0]],
            valuesMap: forecastTypeValuesMap,
            superiorNames: ['application', 'data-source'],
            controlButtonCovered: true,
            unique: false,
            default: forecastTypeOptionsMap[applicationOptions[0]][Object.keys(forecastTypeOptionsMap[applicationOptions[0]])[0]][0],
            controlButtonVisibility: 'block',
            displayOrder: 2,
            displayPriority: 1,
            displayGroup: 5,
            tooltip: ``,
            tooltipPlacement: "right"
        });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["forecast-type"].findOne({name: 'forecast-type'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastTypeOptionsMap)) {
            // have to reload forecast type data
            matsCollections["forecast-type"].update({name: 'forecast-type'}, {
                $set: {
                    optionsMap: forecastTypeOptionsMap,
                    // valuesMap: forecastTypeValuesMap,
                    options: forecastTypeOptionsMap[applicationOptions[0]][Object.keys(forecastTypeOptionsMap[applicationOptions[0]])[0]],
                    default: forecastTypeOptionsMap[applicationOptions[0]][Object.keys(forecastTypeOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["valid-time"].findOne({
            name: 'valid-time'
        }) == undefined) {
        matsCollections["valid-time"].insert({
            name: 'valid-time',
            type: matsTypes.InputTypes.select,
            optionsMap: validTimeOptionsMap,
            options: validTimeOptionsMap[Object.keys(validTimeOptionsMap)[0]],
            superiorNames: ['application'],
            controlButtonCovered: true,
            unique: false,
            default: matsTypes.InputTypes.unused,
            controlButtonVisibility: 'block',
            controlButtonText: "valid utc hour",
            displayOrder: 3,
            displayPriority: 1,
            displayGroup: 5,
            tooltip: `Filters the calculated results by the valid forecast lead time.`,
            tooltipPlacement: "right"
        });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["valid-time"].findOne({name: 'valid-time'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, validTimeOptionsMap)) {
            // have to reload valid time data
            matsCollections["valid-time"].update({name: 'valid-time'}, {
                $set: {
                    optionsMap: validTimeOptionsMap,
                    options: validTimeOptionsMap[Object.keys(validTimeOptionsMap)[0]],
                    default: validTimeOptionsMap[Object.keys(validTimeOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections["level"].findOne({
            name: 'level'
        }) == undefined) {
        matsCollections["level"].insert({
            name: 'level',
            type: matsTypes.InputTypes.select,
            optionsMap: levelOptionsMap,
            options: levelOptionsMap[Object.keys(levelOptionsMap)[0]],
            superiorNames: ['application'],
            controlButtonCovered: true,
            unique: false,
            default: matsTypes.InputTypes.unused,
            controlButtonVisibility: 'block',
            controlButtonText: "pressure level (hPa)",
            displayOrder: 4,
            displayPriority: 1,
            displayGroup: 5,
            tooltip: `Filters the calculated row by pressure level.`,
            tooltipPlacement: "right"

        });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["level"].findOne({name: 'level'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, levelOptionsMap)) {
            // have to reload level data
            matsCollections["level"].update({name: 'level'}, {
                $set: {
                    optionsMap: levelOptionsMap,
                    options: levelOptionsMap[Object.keys(levelOptionsMap)[0]],
                    default: levelOptionsMap[Object.keys(levelOptionsMap)[0]][0]
                }
            });
        }
    }

    // determine date defaults for dates
    const defaultApp = matsCollections["application"].findOne({name: "application"}, {default: 1}).default;
    dateOptionsMap = matsCollections["application"].findOne({name: "application"}, {dates: 1}).dates;
    const defaultDataSource = matsCollections["data-source"].findOne({name: "data-source"}, {default: 1}).default;
    minDate = dateOptionsMap[defaultApp][defaultDataSource].minDate;
    maxDate = dateOptionsMap[defaultApp][defaultDataSource].maxDate;

    // need to turn the raw max and min from the metadata into the last valid month of data
    const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
    const minusMonthMinDate = newDateRange.minDate;
    maxDate = newDateRange.maxDate;
    dstr = moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm") + ' - ' + moment.utc(maxDate).format("MM/DD/YYYY HH:mm");
};

/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding matsCollections.PlotGraphFunctions.PlotType value.
 See curve_item.js and standAlone.js.
 */
const doCurveTextPatterns = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.scorecard,
            textPattern: [
                ['', 'label', ': '],
                ['', 'user', ': '],
                ['', 'scorecard-name', ': '],
                ['', 'application', ' in '],
                ['', 'data-source', ' in '],
                ['', 'validation-data-source', ' in '],
                ['', 'region', ', '],
                ['', 'statistic', ' at '],
                ['', 'variable', ' '],
                ['', 'threshold', ' '],
                ['', 'scale', ' '],
                ['', 'truth', ' '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['fcst_type: ', 'forecast-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'level', ' ']
            ],
            displayParams: [
                "label", "user", "scorecard-name", "application", "data-source", "validation-data-source", "region", "statistic", "variable", "threshold", "scale", "truth", "forecast-length", "forecast-type", "valid-time", "level"
            ],
            groupSize: 6
        });
    }
};

const doPlotGraph = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotGraphFunctions.remove({});
    }
    if (matsCollections.PlotGraphFunctions.find().count() == 0) {
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.scorecard,
            graphFunction: "scorecardStatusPage",
            dataFunction: "processScorecard",
            checked: true
        });
    }
};

Meteor.startup(function () {
    matsCollections.Databases.remove({});
    if (matsCollections.Databases.find({}).count() < 0) {
        console.log('main startup: corrupted Databases collection: dropping Databases collection');
        matsCollections.Databases.drop();
    }
    if (matsCollections.Databases.find({}).count() === 0) {
        var databases = undefined;
        if (Meteor.settings == undefined || Meteor.settings.private == undefined || Meteor.settings.private.databases == undefined) {
            databases = undefined;
        } else {
            databases = Meteor.settings.private.databases;
        }
        if (databases !== null && databases !== undefined && Array.isArray(databases)) {
            for (var di = 0; di < databases.length; di++) {
                matsCollections.Databases.insert(databases[di]);
            }
        }
    }

    // create list of all pools
    var allPools = [];
    // connect to the couchbase cluster
    const cbConnection = matsCollections.Databases.findOne({
        role: matsTypes.DatabaseRoles.COUCHBASE,
        status: "active"
    }, {
        host: 1,
        port: 1,
        bucket: 1,
        user: 1,
        password: 1
    });

    // the cluster and bucket are intended to be global
    if (cbConnection) {
        cbPool = new matsCouchbaseUtils.CBUtilities(cbConnection.host, cbConnection.bucket, cbConnection.user, cbConnection.password);
    }
    allPools.push({pool: "cbPool", role: matsTypes.DatabaseRoles.COUCHBASE});
    // create list of tables we need to monitor for update
    const mdr = new matsTypes.MetaDataDBRecord("cbPool", "mdata", [
        "MD:matsGui:cb-ceiling:HRRR_OPS:COMMON:V01",
    ]);
    try {
        matsMethods.resetApp({
            appPools: allPools,
            appMdr: mdr,
            appType: matsTypes.AppTypes.mats,
            dbType: matsTypes.DbTypes.couchbase
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
    doCurveParams,
    doPlotGraph,
    doPlotParams,
    doCurveTextPatterns
];