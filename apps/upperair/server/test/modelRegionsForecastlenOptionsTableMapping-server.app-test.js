/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';

describe('test mapping of tables wrt models, regions, and forecast lengths - server app test', () => {
    if (Meteor.isServer) {
        require ('chai');
        var assert = chai.assert;
        var expect = chai.expect;
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
            var regionModelOptionsMap = undefined;
            var masterRegionValues = undefined;
            var forecastLen = undefined;
            var tables = undefined;

            before(function (done) {
                this.timeout(15000);
                // runs before all tests in this block
                models = matsCollections.CurveParams.findOne({name: "data-source"});
                optionsMap = models.optionsMap;
                optionsGroups = models.optionsGroups;
                disabledOptions = models.disabledOptions;
                tableMap = models.tableMap;
                dates = models.dates;
                modelNames = models.options;
                //console.log('modelNames length is ', modelNames.length);
                expect(modelNames).to.be.a('array');
                regions = matsCollections.CurveParams.findOne({name: "region"});
                regionModelOptionsMap = regions.optionsMap;
                regionOptions = regions.options;
                masterRegionValues = regions.valuesMap;
                forecastLen = matsCollections.CurveParams.findOne({name: "forecast-length"});
                matsMethods.testGetTables.call({
                    host: 'wolphin.fsl.noaa.gov',
                    port: '3306',
                    user: 'readonly',
                    password: 'ReadOnly@2016!',
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
                //console.log(regionModelOptionsMap);
                expect(regions).to.exist;
                expect(regions).to.be.a('object');
                expect(regionOptions).to.exist;
                expect(regionModelOptionsMap).to.exist;
                expect(regionModelOptionsMap).to.be.a('object');
                expect(masterRegionValues).to.exist;
                expect(masterRegionValues).to.be.a('object');
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
                    for (var ri = 0; ri < regionModelOptionsMap[model].length; ri++) {
                        //console.log("regionModelOptionsMap ", JSON.stringify(regionModelOptionsMap,null,2));
                        //console.log("model ", model, " regionModelOptionsMap for model ", model, + " and ri ", ri + " is " + regionModelOptionsMap[model][ri] )
                        const region = regionModelOptionsMap[model][ri];
                        expect (region, "region for " + ri + " of model: " + model + " does not seem to exist").to.exist;
                        const regionNumber = Object.keys(masterRegionValues).find(key => region);
                        const table = modelTablePrefix + regionNumber;
                        //console.log("modelTablePrefix:" + modelTablePrefix + " region:" + region + " table: " + table);
                        expect(tables).to.include(table);
                    }
                }
                done();
            });
        });
    }
});
