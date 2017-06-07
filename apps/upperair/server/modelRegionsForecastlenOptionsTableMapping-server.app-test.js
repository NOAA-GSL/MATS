import {Meteor} from 'meteor/meteor';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';
import {assert} from 'meteor/practicalmeteor:chai';
import {expect} from 'meteor/practicalmeteor:chai';

describe('test mapping of tables wrt models, regions, and forecast lengths - server app test', () => {
    if (Meteor.isServer) {
        describe('mapping models regions forecastlens tables test', function () {
            var models = undefined;
            var optionsMap = undefined;
            var optionsGroups = undefined;
            var disabledOptions = undefined;
            var tableMap = undefined;
            var dates = undefined;
            var modelNames = undefined;
            var regions = undefined;
            var regionOptions = undefined;
            var regionOptionsMap = undefined;
            var regionDescriptions = undefined;
            var forecastLen = undefined;
            var tables = undefined;

            before(function (done) {
                this.timeout(15000);
                // runs before all tests in this block
                models = matsCollections.CurveParams.findOne({name: "model"});
                optionsMap = models.optionsMap;
                optionsGroups = models.optionsGroups;
                disabledOptions = models.disabledOptions;
                tableMap = models.tableMap;
                dates = models.dates;
                modelNames = models.options;
                //console.log('modelNames length is ', modelNames.length);
                expect(modelNames).to.be.a('array');
                regions = matsCollections.CurveParams.findOne({name: "region"});
                regionOptionsMap = regions.optionsMap;
                regionOptions = regions.options;
                regionDescriptions = matsCollections.RegionDescriptions.find({}).fetch();
                forecastLen = matsCollections.CurveParams.findOne({name: "forecast-length"});
                matsMethods.testGetTables.call({
                    host: 'wolphin.fsl.noaa.gov',
                    user: 'writer',
                    password: 'amt1234',
                    database: 'ruc_ua_sums2'
                }, function (error, result) {
                    if (error !== undefined) {
                        assert.fail("error: ", error);
                        done();
                    } else {
                        tables = result;
                        expect(tables).to.exist;
                        expect(tables).to.be.a('array');
                        done();
                    }
                });
            });

            it('models should exist', function () {
                //console.log ("models:", models);
                //expect(modelNames).to.be.a('array');
                //console.log ("options:", options);
                //console.log ("optionsMap:", optionsMap);
                //console.log ("optionsGroups:", optionsGroups);
                //console.log ("tableMap:", tableMap);
                expect(models).to.exist;
                expect(models).to.be.a('object');
                expect(models.name).to.be.a('string');
                expect(models.name).to.be.a('string');
                expect(models.type).to.equal(matsTypes.InputTypes.select);
                expect(optionsMap).to.be.a('object');
                expect(optionsGroups).to.be.a('object');
                expect(disabledOptions).to.be.a('array');
                expect(tableMap).to.be.a('object');
                expect(dates).to.be.a('object');
            });
            it('regions should exist', function () {
                //console.log(regions);
                //console.log(regionOptions);
                //console.log(regionOptionsMap);
                expect(regions).to.exist;
                expect(regions).to.be.a('object');
                expect(regionOptions).to.exist;
                expect(regionOptionsMap).to.exist;
                expect(regionOptionsMap).to.be.a('object');
                expect(regionDescriptions).to.be.a('array');
            });
            it('forecastLenghts should exist', () => {
                //console.log(forecastLen);
                expect(forecastLen).to.exist;
            });
            it('tableNames should exist in tables', function (done) {
                //console.log("tables exist", tables.slice(1,20));
                this.timeout(30000);
                for (var mi = 0; mi < modelNames.length; mi++) {
                    const model = modelNames[mi];
                    const modelTablePrefix = tableMap[model];
                    for (var ri = 0; ri < regionOptionsMap[model].length; ri++) {
                        //console.log("regionOptionsMap ", JSON.stringify(regionOptionsMap,null,2));
                        //console.log("model ", model, " regionOptionsMap for model ", model, + " and ri ", ri + " is " + regionOptionsMap[model][ri] )
                        const region = regionOptionsMap[model][ri];
                        expect (region, "region for " + ri + " of model: " + model + " does not seem to exist").to.exist;
                        const regionMap = matsCollections.RegionDescriptions.findOne({description: region});
                        expect (regionMap, "options map for region: " + region + " does not exist").to.exist;
                        //console.log ("checking " + region + " against map " + regionMap);
                        const regionNumber = regionMap.regionMapTable;
                        const table = modelTablePrefix + regionNumber;
                        //console.log("modelTablePrefix:" + modelTablePrefix + " regionNumber:" + regionNumber + " table: " + table);
                        expect(tables).to.include(table);
                    }
                }
                done();
            });
        });
    }
});
