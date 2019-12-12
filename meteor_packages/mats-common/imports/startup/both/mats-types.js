/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

/**
 * Created by pierce on 8/31/16.
 */
var DatabaseRoles = {
    MODEL_DATA: 'model_data',
    META_DATA: 'meta_data',
    SUMS_DATA: 'sums_data',
    SITE_DATA: 'site_data'
};

var AppTypes = {
    mats: 'mats',
    metexpress: 'metexpress',
    mats4met: 'mats4met'
};

var InputTypes = {
    textInput: 'textInput',
    select: 'select',
    selectOrderEnforced: 'selectOrderEnforced',
    numberSpinner: 'numberSpinner',
    dateRange: 'dateRange',
    radioGroup: 'radioGroup',
    checkBoxGroup: 'checkBoxGroup',
    resetButton: 'resetButton',
    controlButton: 'controlButton',
    element: 'element',
    selectMap: 'selectMap',
    custom: 'custom',
    unused: "unused",
    forecastSingleCycle: 'forecasts single cycle',
    forecastMultiCycle: 'forecasts multi cycle'
};

var PlotTypes = {
    timeSeries: "TimeSeries",
    profile: "Profile",
    dieoff: "DieOff",
    threshold: "Threshold",
    validtime: "ValidTime",
    scale: "SpatialScale",
    dailyModelCycle: "DailyModelCycle",
    reliability: "Reliability",
    roc: "ROC",
    map: "Map",
    histogram: "Histogram",
    ensembleHistogram: "EnsembleHistogram",
    contour: "Contour",
    contourDiff: "ContourDiff",
    scatter2d: "Scatter2d"
};

var ForecastTypes = {
    dieoff: "dieoff",
    utcCycle: "utc cycle",
    singleCycle: "single cycle"
};

var PlotFormats = {
    none: "none",
    matching: "matching",
    pairwise: "pairwise",
    absolute: "absolute"
};

var PlotActions = {
    matched: "matched",
    unmatched: "unmatched"
};

var BestFits = {
    none: 'none',
    linear: 'linear',
    linearThroughOrigin: 'linearThroughOrigin',
    exponential: 'exponential',
    logarithmic: 'logarithmic',
    power: 'power'
};

var MatchFormats = {
    none: "none",
    time: "time",
    level: "level",
    site: "site"
};

var PlotAxisFilters = {
    none: "none",
    level: "level",
    site: "site"
};

var PlotView = {
    graph: "graph",
    textSeries: "text",
};

var ReservedWords = {
    Zero: "Zero",
    zero: "zero",
    ideal0: "ideal0",
    ideal1: "ideal1",
    ideal2: "ideal2",
    ideal3: "ideal3",
    ideal4: "ideal4",
    ideal5: "ideal5",
    ideal6: "ideal6",
    ideal7: "ideal7",
    ideal8: "ideal8",
    ideal9: "ideal9",
    perfectReliability: "Perfect Reliability",
    perfectForecast: "Perfect Forecast",
    noSkill: "No Skill",
    blueCurveText: "Cold bias",
    blackCurveText: "Small bias",
    redCurveText: "Warm bias",
    contourSigLabel: "Curve1-Curve0 Significance"
};

var Messages = {
    NO_DATA_FOUND: "INFO:0 data records found"
};

/*
Class for holding metaData records. These are stored in an array. An app can have multiple metadata databases and each database has a pool for connections.
These pools are global (although for future reference the access might be from this collection.). They are refenced in this script via the pool name.
This class enforces the types of the poolName (in case someone accidentally tries to store the whole pool object), and the database name and a list
of table names. The internal list can be appended. The getRecords returns the internal list.
 */
class MetaDataDBRecord {
    constructor(role, poolName, dbName, tables) {
        if (!typeof role === "string") {
            throw new Error("MetaDataDBRecord.constructor : role is not a string");
        }
        if (!typeof poolName === "string") {
            throw new Error("MetaDataDBRecord.constructor : poolName is not a string");
        }
        if (!typeof dbName === "string") {
            throw new Error("MetaDataDBRecord.constructor : dbName is not a string");
        }
        if (!tables instanceof Array) {
            throw new Error("MetaDataDBRecord.constructor : tables is not an array");
        }
        this._records = [];
        var record = {'role': role, 'pool': poolName, 'name': dbName, 'tables': tables};
        this._records.push(record);
    }

    addRecord(role, poolName, dbName, tables) {
        if (!typeof role === "string") {
            throw new Error("MetaDataDBRecord.constructor : role is not a string");
        }
        if (!typeof poolName === "string") {
            throw new Error("MetaDataDBRecord.constructor : poolName is not a string");
        }
        if (!typeof dbName === "string") {
            throw new Error("MetaDataDBRecord.constructor : dbName is not a string");
        }
        if (!tables instanceof Array) {
            throw new Error("MetaDataDBRecord.constructor : tables is not an array");
        }
        var record = {'role':role, 'pool': poolName, 'name': dbName, 'tables': tables};
        this._records.push(record);
    }

    getRecords() {
        return this._records;
    }
}

export default matsTypes = {
    InputTypes: InputTypes,
    PlotTypes: PlotTypes,
    PlotFormats: PlotFormats,
    PlotActions: PlotActions,
    BestFits: BestFits,
    MatchFormats: MatchFormats,
    PlotAxisFilters: PlotAxisFilters,
    PlotView: PlotView,
    Messages: Messages,
    ForecastTypes: ForecastTypes,
    ReservedWords: ReservedWords,
    MetaDataDBRecord: MetaDataDBRecord,
    AppTypes: AppTypes,
    DatabaseRoles: DatabaseRoles
}

