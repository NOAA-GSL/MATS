/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

describe('test resetting app', () => {
    if (Meteor.isServer) {
        require ('chai');
        var assert = chai.assert;
        var expect = chai.expect;

        var models = undefined;
        var modelsModified = undefined;
        var lastRefreshed;
        var newLastRefreshed;
        var originalRefreshed;
        describe('triggger reset app', function () {
            before(function (done) {
                models = matsCollections.CurveParams.findOne({name: "data-source"});
                modelsModified = matsCollections.CurveParams.findOne({name: "data-source"});
                done();
            });

            it('test compare objects', function (done) {
                expect(matsDataUtils.areObjectsEqual(models, modelsModified)).to.equal(true);
                modelsModified['addedKey'] = "something";
                expect(matsDataUtils.areObjectsEqual(models, modelsModified)).to.equal(false);
                done();
            });
            it('reset defaults get last refreshed', function (done) {
                matsMethods.testGetMetaDataTableUpdates.call({}, function (error, result) {
                    if (error !== undefined) {
                        assert.fail("error: ", error);
                        done(error);
                    } else {
                        lastRefreshed = result[0].lastRefreshed;
                        originalRefreshed = new String(result[0].lastRefreshed);
                        expect(lastRefreshed).to.not.equal(newLastRefreshed); // newLastRefreshed still undefined
                        console.log("0 lastRefreshed:", lastRefreshed, "newLastRefreshed:", newLastRefreshed);
                        done();
                    }
                });
            });
            it('reset defaults get last refreshed still unchanged - no refresh', function (done) {
                matsMethods.testGetMetaDataTableUpdates.call({}, function (error, result) {
                    if (error !== undefined) {
                        assert.fail("error: ", error);
                        done(error);
                    } else {
                        newLastRefreshed = result[0].lastRefreshed;
                        expect(lastRefreshed).to.equal(originalRefreshed);
                        console.log("0 lastRefreshed:", lastRefreshed, "newLastRefreshed:", newLastRefreshed);
                        done();
                    }
                });
            });
            it('set older metadata', function (done) {
                matsMethods.testSetMetaDataTableUpdatesLastRefreshedBack.call({}, function (error, result) {
                    if (error !== undefined) {
                        assert.fail("error: ", error);
                        done(error);
                    } else {
                        newLastRefreshed = result[0].lastRefreshed;
                        expect(lastRefreshed).to.not.equal(newLastRefreshed);
                        console.log("3 lastRefreshed:", lastRefreshed, "newLastRefreshed:", newLastRefreshed);
                        done();
                    }
                });
                it('reset with older metadata does cause reset', function (done) {
                    matsMethods.testGetMetaDataTableUpdates.call({}, function (error, result) {
                        if (error !== undefined) {
                            assert.fail("error: ", error);
                            done(error);
                        } else {
                            newLastRefreshed = result[0].lastRefreshed;
                            expect(originalRefreshed).to.not.equal(newLastRefreshed);
                            console.log("4 originalRefreshed:", originalRefreshed, "newLastRefreshed:", newLastRefreshed);
                            done();
                        }
                    });
                });
            });
        });
    }
});
