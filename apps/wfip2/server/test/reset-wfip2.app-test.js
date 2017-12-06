import {Meteor} from 'meteor/meteor';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {assert} from 'meteor/practicalmeteor:chai';
import {expect} from 'meteor/practicalmeteor:chai';
import {moment} from 'meteor/momentjs:moment'

describe('test resetting wfip2 app', () => {
    if (Meteor.isServer) {
        var dataSources = undefined;
        var dataSourcesModified = undefined;
        var lastRefreshed;
        var newLastRefreshed;
        describe('triggger reset app', function () {
            before(function (done) {
                dataSources = matsCollections.CurveParams.findOne({name: "data-source"});
                dataSourcesModified = matsCollections.CurveParams.findOne({name: "data-source"});
                done();
            });

            it('test compare objects', function (done) {
                expect(matsDataUtils.areObjectsEqual(dataSources, dataSourcesModified)).to.equal(true);
                dataSourcesModified['addedKey'] = "something";
                expect(matsDataUtils.areObjectsEqual(dataSources, dataSourcesModified)).to.equal(false);
                done();
            });
            it('reset defaults get last refreshed', function (done) {
                this.timeout(30000);
                matsMethods.testGetMetaDataTableUpdates.call({}, function (error, result) {
                    if (error !== undefined) {
                        assert.fail("error: ", error);
                        done(error);
                    } else {
                        lastRefreshed = result[0].lastRefreshed;
                        expect(lastRefreshed).to.not.equal(newLastRefreshed); // newLastRefreshed still undefined
                        done();
                    }
                });
            });
            it('reset defaults get last refreshed still unchanged - no refresh', function (done) {
                this.timeout(30000);
                matsMethods.testGetMetaDataTableUpdates.call({}, function (error, result) {
                    if (error !== undefined) {
                        assert.fail("error: ", error);
                        done(error);
                    } else {
                        newLastRefreshed = result[0].lastRefreshed;
                        expect(newLastRefreshed).to.equal(lastRefreshed);
                        done();
                    }
                });
            });
            it('set older metadata', function (done) {
                this.timeout(30000);
                matsMethods.testSetMetaDataTableUpdatesLastRefreshedBack.call({}, function (error, result) {
                    if (error !== undefined) {
                        assert.fail("error: ", error);
                        done(error);
                    } else {
                        newLastRefreshed = result[0].lastRefreshed; // should be 0
                        expect(lastRefreshed).to.not.equal(newLastRefreshed);
                        done();
                    }
                });
            });
            it('reset (call reset) with older metadata does cause reset', function (done) {
                this.timeout(30000);
                matsMethods.refreshMetaData.call({}, function (error, result) {
                    if (error !== undefined) {
                        assert.fail("error: ", error);
                        done(error);
                    } else {
                        newLastRefreshed = result[0].lastRefreshed;
                        var lr = moment(lastRefreshed);
                        var nlr = moment(newLastRefreshed);
                        var fiveMinutesPrior = nlr.subtract(5, 'minutes');
                        var isWithinFiveMinutes = lr.isAfter(fiveMinutesPrior);
                        //console.log("3 isWithinFiveMinutes: ", isWithinFiveMinutes, "fiveMinutesPrior: ", fiveMinutesPrior.format(), "lr:", lr.format(), "nlr:", nlr.format());
                        assert(isWithinFiveMinutes == true);
                        done();
                    }
                });
            });
        });
    }
});
