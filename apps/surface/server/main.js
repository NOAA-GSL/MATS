import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

var modelOptionsMap = {};
var forecastLengthOptionsMap = {};
var regionModelOptionsMap = {};
var siteOptionsMap = {};
var sitesLocationMap = [];
var siteObjMap = {};
var masterRegionValuesMap = {};
var modelDateRangeMap = {};
var modelMetarsMap = {};
const dateInitStr = matsCollections.dateInitStr();
const dateInitStrParts = dateInitStr.split(' - ');
const startInit = dateInitStrParts[0];
const stopInit = dateInitStrParts[1];
const dstr = startInit + ' - ' + stopInit;

const doPlotParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotParams.remove({});
    }
    if (matsCollections.PlotParams.find().count() == 0) {
        matsCollections.PlotParams.insert(
            {
                name: 'dates',
                type: matsTypes.InputTypes.dateRange,
                options: [''],
                startDate: startInit,
                stopDate: stopInit,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: "dateHelp.html"
            });

        var plotFormats = {};
        plotFormats[matsTypes.PlotFormats.matching] = 'show matching diffs';
        plotFormats[matsTypes.PlotFormats.pairwise] = 'pairwise diffs';
        plotFormats[matsTypes.PlotFormats.none] = 'no diffs';
        matsCollections.PlotParams.insert(
            {
                name: 'plotFormat',
                type: matsTypes.InputTypes.radioGroup,
                optionsMap: plotFormats,
                options: [matsTypes.PlotFormats.matching, matsTypes.PlotFormats.pairwise, matsTypes.PlotFormats.none],
                default: matsTypes.PlotFormats.none,
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    }
};

const doCurveParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }

    matsCollections.CurveParams.remove({});

    var rows;
    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(metadataPool, "SELECT short_name,description FROM region_descriptions;");
        var masterRegDescription;
        var masterShortName;
        for (var j = 0; j < rows.length; j++) {
            masterRegDescription = rows[j].description.trim();
            masterShortName = rows[j].short_name.trim();
            masterRegionValuesMap[masterShortName] = masterRegDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,metar_string,regions,display_text,fcst_lens,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var minDate = moment.unix(rows[i].mindate).format("MM/DD/YYYY HH:mm");
            var maxDate = moment.unix(rows[i].maxdate).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: minDate, maxDate: maxDate};

            var metarStrings = rows[i].metar_string;
            var metarStringsArr = metarStrings.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < metarStringsArr.length; j++) {
                metarStringsArr[j] = metarStringsArr[j].replace(/'|\[|\]/g, "");
            }
            modelMetarsMap[model] = metarStringsArr;

            var forecastLengths = rows[i].fcst_lens;
            var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < forecastLengthArr.length; j++) {
                forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
            }
            forecastLengthOptionsMap[model] = forecastLengthArr;

            var regions = rows[i].regions;
            var regionsArrRaw = regions.split(',').map(Function.prototype.call, String.prototype.trim);
            var regionsArr = [];
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
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(sitePool, "select madis_id,name,lat,lon,elev,metar_mats_test.desc from metar_mats_test order by name;");
        for (var i = 0; i < rows.length; i++) {

            var site_name = rows[i].name;
            var site_description = rows[i].desc;
            var site_id = rows[i].madis_id;
            var site_lat = rows[i].lat/100;
            var site_lon = rows[i].lon/100;
            var site_elev = rows[i].elev;
            siteOptionsMap[site_name] = [site_id];
            //masterSitesMap[site_name] = [site_description];
            //sitesLocationMap[site_name] = {lat: site_lat, lon: site_lon, elev: site_elev};

            matsCollections.SiteMap.insert({siteName: site_name, siteId: site_id});

            var point = [site_lat, site_lon];
            var obj = {
                name: site_name,
                point: point,
                elevation: site_elev,
                options: {
                    title: site_description,
                    color: 'blue',
                    size: 5,
                    network: 'METAR',
                    peerOption: site_name,
                    id: site_id,
                    highLightColor: 'cyan'
                }
            };
            sitesLocationMap.push(obj);
        }

    } catch (err) {
        console.log(err.message);
    }
    matsCollections.StationMap.remove({});

    if (matsCollections.StationMap.find({name: 'stations'}).count() == 0) {
        matsCollections.StationMap.insert(
            {
                name: 'stations',
                optionsMap: sitesLocationMap,
            }
        );
    }



    if (matsCollections.CurveParams.find({name: 'label'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'label',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],   // convenience
                controlButtonCovered: true,
                default: '',
                unique: true,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: 'label.html'
            }
        );
    }

    if (matsCollections.CurveParams.find({name: 'data-source'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                dates: modelDateRangeMap,
                metars: modelMetarsMap,
                options: Object.keys(modelOptionsMap),   // convenience
                dependentNames: ["region", "forecast-length", "dates"],
                controlButtonCovered: true,
                default: 'RAP',
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap)
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'region'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionModelOptionsMap,
                options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[3]],   // convenience
                valuesMap: masterRegionValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[3]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'region'});
       if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionModelOptionsMap)) ||
           (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterRegionValuesMap))) {
            // have to reload model data
          matsCollections.CurveParams.update({name: 'region'}, {
               $set: {
                    optionsMap: regionModelOptionsMap,
                    valuesMap: masterRegionValuesMap,
                    options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[3]]
                }
          });
       }
   }

    if (matsCollections.CurveParams.find({name: 'statistic'}).count() == 0) {
        optionsMap = {
            //The original RMS query for temp in rucstats ends with 'avg(m0.N_{{variable0}})/1000', not 'sum(m0.N_{{variable0}})/1000'
            //as is used in MATS. For the added queries, I am using the rucstats syntax.

            'RMS': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}}))/1.8 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}}) order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}}))/2.23693629 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'Bias (Model - Obs)': ['-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}})/1.8 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}}/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                '-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_model_{{variable1}}-m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}}/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            //Added
            'Bias (Obs - Model)': ['sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}})/1.8 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_{{variable0}}/m0.N_{{variable0}}/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_{{variable0}}/m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_ob_{{variable1}}-m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat((-m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}}/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'N': ['sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'Model average': [
                '(sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(m0.N_{{variable0}})-32)/1.8 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}-32.)/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                '(sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(m0.N_{{variable0}})) as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_model_{{variable1}}/m0.N_{{variable0}}/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'Obs average': ['(sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})-32)/1.8 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_ob_{{variable1}}/m0.N_{{variable0}}-32.)/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                '(sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}}))/ as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            //Added
            'Std deviation': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2))/1.8 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2)) as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2)) order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2))/2.23693629 as stat, avg(m0.N_{{variable0}})/1000 as N0'
            ],
            //Added
            'MAE': ['sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/1.8 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_a{{variable0}})/(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}})) as stat, avg(m0.N_{{variable0}})/1000 as N0',
                'sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/2.23693629 as stat, avg(m0.N_{{variable0}})/1000 as N0']

        };

        matsCollections.CurveParams.insert({
            // bias and model average are a different formula for wind (element 0 differs from element 1)
            // but stays the same (element 0 and element 1 are the same) otherwise.
            // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
            // time series we never append element 2. Element 3 is used to give us error values for error bars.
            name: 'statistic',
            type: matsTypes.InputTypes.select,
            optionsMap: optionsMap,
            options: Object.keys(optionsMap),   // convenience
            controlButtonCovered: true,
            unique: false,
            default: 'RMS',
            controlButtonVisibility: 'block',
            displayOrder: 4,
            displayPriority: 1,
            displayGroup: 2
        });
    }

    if (matsCollections.CurveParams.find({name: 'variable'}).count() == 0) {
        optionsMap = {
            'temperature': ['dt', 't', 'temp'],
            'RH': ['drh', 'rh', 'rh'],
            'dewpoint': ['dTd', 'td', 'dp'],
            'wind': ['dw', 'ws', 'ws'],
        };

        const statVarUnitMap = {
            'RMS': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'Bias (Model - Obs)': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'Bias (Obs - Model)': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'N': {
                'temperature': 'Number',
                'RH': 'Number',
                'dewpoint': 'Number',
                'wind': 'Number'
            },
            'Model average': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'Obs average': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'Std deviation': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'MAE': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            }
        };

        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                statVarUnitMap: statVarUnitMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'temperature',
                controlButtonVisibility: 'block',
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.find({name: 'average'}).count() == 0) {
        optionsMap = {
            'None': ['(m0.valid_day)+3600*m0.hour'],
            '1D': ['ceil(' + 60 * 60 * 24 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 + ')+' + 60 * 60 * 24 + '/2)'],
            '3D': ['ceil(' + 60 * 60 * 24 * 3 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 3 + ')+' + 60 * 60 * 24 * 3 + '/2)'],
            '7D': ['ceil(' + 60 * 60 * 24 * 7 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 7 + ')+' + 60 * 60 * 24 * 7 + '/2)'],
            '30D': ['ceil(' + 60 * 60 * 24 * 30 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 30 + ')+' + 60 * 60 * 24 * 30 + '/2)'],
            '60D': ['ceil(' + 60 * 60 * 24 * 60 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 60 + ')+' + 60 * 60 * 24 * 60 + '/2)'],
            '90D': ['ceil(' + 60 * 60 * 24 * 90 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 90 + ')+' + 60 * 60 * 24 * 90 + '/2)'],
            '180D': ['ceil(' + 60 * 60 * 24 * 180 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 180 + ')+' + 60 * 60 * 24 * 180 + '/2)']
        };
        matsCollections.CurveParams.insert(
            {
                name: 'average',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                selected: 'None',
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.find({name: 'dieoff-forecast-length'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'dieoff-forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: {},
                options: [matsTypes.ForecastTypes.dieoff, matsTypes.ForecastTypes.singleCycle],
                superiorNames: [],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.ForecastTypes.dieoff,
                controlButtonVisibility: 'block',
                controlButtonText: 'forecast-length',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.find({name: 'forecast-length'}).count() == 0) {
        optionsMap = {};
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],   // convenience
                superiorNames: ['data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time",
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'valid-time'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                selected: [],
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "valid utc hour",
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true
            });
    }

    if (matsCollections.CurveParams.find({name: 'sites'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'sites',
                type: matsTypes.InputTypes.select,
                optionsMap: siteOptionsMap,
                options: Object.keys(siteOptionsMap),
                peerName: 'sitesMap',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true
            });
    }

    if (matsCollections.CurveParams.find({name: 'Map'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'sitesMap',
                type: matsTypes.InputTypes.selectMap,
                optionsMap: sitesLocationMap,
                options: Object.keys(sitesLocationMap),   // convenience
                peerName: 'sites',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                //default: siteOptionsMap[Object.keys(siteOptionsMap)[0]],
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true,
                defaultMapView: {point: [39.834, -98.604], zoomLevel: 4, minZoomLevel: 3, maxZoomLevel: 10},
                help: 'map-help.html'
            });
    }
};

/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding PlotGraphFunctions.PlotType value.
 See curve_item.js and graph.js.
 */
var doCurveTextPatterns = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'regionName', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ' '],
                ['fcst_len:', 'forecast-length', 'h '],
                [' valid-time:', 'valid-time', ' '],
                ['avg:', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "average", "forecast-length", "valid-time"
            ],
            groupSize: 4
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'regionName', ', '],
                ['', 'variable', ': '],
                ['', 'statistic', ', '],
                ['fcst_len:', 'dieoff-forecast-length', 'h '],
                [' valid-time:', 'valid-time', ' '],
                ['avg:', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "dieoff-forecast-length", "valid-time"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'region', ', '],
                ['', 'statistic', ', '],
                ['', 'variable', ', '],
                ['fcst_len:', 'forecast-length', 'h ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "forecast-length"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.map,
            textPattern: [
                ['', 'data-source', ': '],
                ['', 'sites', ': '],
                ['', 'variable', ', '],
                ['fcst_len: ', 'forecast-length', ' h ']
            ],
            displayParams: [
                "data-source", "sites", "variable", "forecast-length"
            ],
            groupSize: 4
        });
    }
};

var doSavedCurveParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.SavedCurveParams.remove({});
    }
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList: []});
    }
};

var doPlotGraph = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotGraphFunctions.remove({});
    }
    if (matsCollections.PlotGraphFunctions.find().count() == 0) {
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            graphFunction: "graphSeries",
            dataFunction: "dataSeries",
            checked: true
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            graphFunction: "graphDieOff",
            dataFunction: "dataDieOff",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.validtime,
            graphFunction: "graphValidTime",
            dataFunction: "dataValidTime",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.map,
            graphFunction: "graphMap",
            dataFunction: "dataMap",
            checked: false
        });
    }
};

Meteor.startup(function () {
    matsCollections.Databases.remove({});
    if (matsCollections.Databases.find().count() == 0) {
        matsCollections.Databases.insert({
            name: "sumSetting",
            role: "sum_data",
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'surface_sums2',
            connectionLimit: 10
        });
    }

    matsCollections.Databases.insert({
        name: "metadataSetting",
        role: "metadata",
        status: "active",
        host: 'wolphin.fsl.noaa.gov',
        user: 'readonly',
        password: 'ReadOnly@2016!',
        database: 'mats_common',
        connectionLimit: 10
    });

    matsCollections.Databases.insert({
        name: "siteSetting",
        role: "site_data",
        status: "active",
        host: 'wolphin.fsl.noaa.gov',
        user: 'readonly',
        password: 'ReadOnly@2016!',
        database: 'madis3',
        connectionLimit: 10
    });

    const metadataSettings = matsCollections.Databases.findOne({role: "metadata", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    metadataPool = mysql.createPool(metadataSettings);

    const sumSettings = matsCollections.Databases.findOne({role: "sum_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    sumPool = mysql.createPool(sumSettings);
    sumPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    const siteSettings = matsCollections.Databases.findOne({role: "site_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    sitePool = mysql.createPool(siteSettings);
    sitePool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    const mdr = new matsTypes.MetaDataDBRecord("metadataPool", "mats_common", ['region_descriptions']);
    mdr.addRecord("sumPool", "surface_sums2", ['regions_per_model_mats_all_categories']);
    mdr.addRecord("sitePool", "madis3", ['metar_mats_test']);
    matsMethods.resetApp(mdr);

    matsCollections.appName.insert({name: "appName", app: "surface"});

});

// this object is global so that the reset code can get to it --
// These are application specific mongo data - like curve params
appSpecificResetRoutines = {
    doPlotGraph: doPlotGraph,
    doCurveParams: doCurveParams,
    doSavedCurveParams: doSavedCurveParams,
    doPlotParams: doPlotParams,
    doCurveTextPatterns: doCurveTextPatterns
};
