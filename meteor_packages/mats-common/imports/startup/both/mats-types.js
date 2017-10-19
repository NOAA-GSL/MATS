/**
 * Created by pierce on 8/31/16.
 */

var  InputTypes = {
    textInput : 'textInput',
    select : 'select',
    numberSpinner : 'numberSpinner',
    dateRange: 'dateRange',
    radioGroup: 'radioGroup',
    checkBoxGroup: 'checkBoxGroup',
    resetButton: 'resetButton',
    controlButton: 'controlButton',
    element: 'element',
    selectMap: 'selectMap',
    custom: 'custom',
    unused:"unused",
    forecastSingleCycle: 'forecasts single cycle',
    forecastMultiCycle: 'forecasts multi cycle'
    };

var  PlotTypes = {
    timeSeries : "TimeSeries",
    profile : "Profile",
    scatter2d : "Scatter2d",
    dieoff : "DieOff"
};

var ForecastTypes = {
    dieoff: "dieoff",
    singleCycle: "single cycle"
};

var  PlotFormats = {
    none: "none",
    matching: "matching",
    pairwise: "pairwise",
    absolute:"absolute"
};

var  PlotActions = {
    matched: "matched",
    unmatched: "unmatched"
};

var  BestFits = {
    none:'none',
    linear:'linear',
    linearThroughOrigin:'linearThroughOrigin',
    exponential:'exponential',
    logarithmic:'logarithmic',
    power:'power'
};

var  MatchFormats = {
    none: "none",
    time: "time",
    level: "level",
    site: "site"
};

var  PlotAxisFilters = {
    none: "none",
    level: "level",
    site: "site"
};

var PlotView = {
    graph: "graph",
    textSeries: "textSeries",
    textProfile: "textProfile",
    textScatter: "textScatter",
    textDieoff: "textDieoff"
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
    constructor(poolName, dbName, tables) {
        if (!typeof poolName === "string") {
            throw new Error ("MetaDataDBRecord.constructor : poolName is not a string");
        }
        if (!typeof dbName === "string") {
            throw new Error ("MetaDataDBRecord.constructor : dbName is not a string");
        }
        if (! tables instanceof Array) {
            throw new Error ("MetaDataDBRecord.constructor : tables is not an array");
        }
        this._records = [{pool:poolName, name:dbName, tables:tables}];
    }

    addRecord(poolName, dbName, tables) {
        if (!typeof poolName === "string") {
            throw new Error ("MetaDataDBRecord.constructor : poolName is not a string");
        }
        if (!typeof dbName === "string") {
            throw new Error ("MetaDataDBRecord.constructor : dbName is not a string");
        }
        if (! tables instanceof Array) {
            throw new Error ("MetaDataDBRecord.constructor : tables is not an array");
        }
        this._records = this._records.push({pool:poolName, name:dbName, tables:tables});
    }

    getRecords() {
        return this._records;
    }
}

export default matsTypes = {
    InputTypes:InputTypes,
    PlotTypes:PlotTypes,
    PlotFormats:PlotFormats,
    PlotActions:PlotActions,
    BestFits:BestFits,
    MatchFormats:MatchFormats,
    PlotAxisFilters:PlotAxisFilters,
    PlotView:PlotView,
    Messages:Messages,
    ForecastTypes:ForecastTypes,
    MetaDataDBRecord:MetaDataDBRecord
}

