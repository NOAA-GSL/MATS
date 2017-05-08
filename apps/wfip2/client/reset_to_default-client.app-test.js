import { Meteor } from 'meteor/meteor';
import {matsParamUtils} from 'meteor/randyp:mats-common';
import { assert } from 'meteor/practicalmeteor:chai';
import {expect} from 'meteor/practicalmeteor:chai';
describe('Reset to default', function(){
    var dataSourceOptions = undefined;
    var middleDataSourceOption = undefined;
    var firstDataSourceOption = undefined;
    var secondRegion = undefined;
    var regionOptionsMap = undefined;
    before(function(done) {
        // set the dataSource to like the middle of the options list
        dataSourceOptions = matsParamUtils.getOptionsForParam('data-source');
        const middleOptionIndex = Math.floor(dataSourceOptions.length / 2);
        middleDataSourceOption = dataSourceOptions[middleOptionIndex];  // some option in the middle
        firstDataSourceOption = dataSourceOptions[0];
        regionOptionsMap = matsParamUtils.getOptionsMapForParam('region');
        secondRegion = regionOptionsMap["WFIP2 whole domain"][0];
        matsParamUtils.setInputValueForParamAndtriggerChange('data-source',middleDataSourceOption);
        const value = matsParamUtils.getValueForParamName('data-source');
        expect (value).to.equal(middleDataSourceOption);
        var region = matsParamUtils.getValueForParamName('region');
        /* The region should get set to the first region for the middleDataSourceOption by the refresh
         that happens as a result of triggering the change event - this is the point
         */
        expect (region).to.equal(secondRegion);
        // now the defaults are set
        done();
    });

    it('Set dataSource to middle option, expect region to be "secondRegionForMiddleDataSourceOption"', function(){
        matsParamUtils.setInputValueForParamAndtriggerChange('data-source',middleDataSourceOption);
        var value = matsParamUtils.getValueForParamName('data-source');
        expect (value).to.equal(middleDataSourceOption);
        var region = matsParamUtils.getValueForParamName('region');
        expect (region).to.equal(secondRegion);
    });
    it('click reset to default expect dataSource to be RAP and region to be secondRegionForFirstDataSource', function(){
        $('#reset').trigger('click'); // click the reset button
        var dataSource = matsParamUtils.getValueForParamName('data-source');
        expect (dataSource).to.equal(firstDataSourceOption);
        var region = matsParamUtils.getValueForParamName('region');
        expect (region).to.equal(secondRegion);
        var fcl = matsParamUtils.getValueForParamName('forecast-length');
        expect (fcl).to.equal('0');
        var statistic = matsParamUtils.getValueForParamName('statistic');
        expect (statistic).to.equal('mean');
        var label = matsParamUtils.getValueForParamName('label');
        expect (label).to.equal('Curve0');
    });
});

