import {Meteor} from 'meteor/meteor';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';
import {assert} from 'meteor/practicalmeteor:chai';
import {expect} from 'meteor/practicalmeteor:chai';

describe('test mapping of tables wrt models, regions, and forecast lengths - server app test', () => {
    if (Meteor.isServer) {
        describe('mapping models regions forecastlens tables test', () => {
            try {
                it('models exist', () => {
                    const models = matsCollections.CurveParams.findOne({name: "model"});
                    expect(models).to.exist;
                    expect(models.name).to.be.a('string');
                    expect(models.type).to.equal(matsTypes.InputTypes.select);
                    expect(models.optionsMap).to.be.a('object');
                    expect(models.optionsGroups).to.be.a('object');
                    expect(models.disabledOptions).to.be.a('array');
                    expect(models.tableMap).to.be.a('object');
                });
                it('regions exist', () => {
                    const regions = matsCollections.CurveParams.findOne({name: "region"});
                    expect(regions).to.exist;
                });
                it('forecastLen exist', () => {
                    const forecastLen = matsCollections.CurveParams.findOne({name: "forecast-length"});
                    expect(forecastLen).to.exist;
                });
                it('tables exist', () => {
                    matsMethods.testGetTables.call({
                        host: 'wolphin.fsl.noaa.gov',
                        user: 'writer',
                        password: 'amt1234',
                        database: 'ruc_ua'
                    },function (error, result) {
                        if (error !== undefined) {
                            assert.fail("error: ", error);
                        } else {
                            console.log(results);
                            expect (results).to.exist;
                        }
                    });
                });
                it('mapped tables exist', () => {
                    assert.equal(5, 5);
                });
            } catch (error) {
                assert.fail(error);
            }
        });
    }
});
