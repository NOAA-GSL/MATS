import { Meteor } from 'meteor/meteor';
import {matsParamUtils} from 'meteor/randyp:mats-common';
import { assert } from 'meteor/practicalmeteor:chai';
import {expect} from 'meteor/practicalmeteor:chai';
    describe('Reset to default', function(){
        var modelOptions = undefined;
        var middleModelOption = undefined;
        var firstModelOption = undefined;
        var regionOptionsMap = undefined;
        var firstRegionForMiddleModelOption = undefined;
        var firstRegionForFirstModelOption = undefined;
        before(function(done) {
            // set the model to like the middle of the options list
            modelOptions = matsParamUtils.getOptionsForParam('model');
            const middleOptionIndex = Math.floor(modelOptions.length / 2);
            middleModelOption = modelOptions[middleOptionIndex];  // some option in the middle
            firstModelOption = modelOptions[0];
            regionOptionsMap = matsParamUtils.getOptionsMapForParam('region');
            firstRegionForFirstModelOption = regionOptionsMap[firstModelOption][0];
            firstRegionForMiddleModelOption = regionOptionsMap[middleModelOption][0];
            matsParamUtils.setInputValueForParamAndtriggerChange('model',middleModelOption);
            const value = matsParamUtils.getValueForParamName('model');
            expect (value).to.equal(middleModelOption);
            var region = matsParamUtils.getValueForParamName('region');
            /* The region should get set to the first region for the middleModelOption by the refresh
                that happens as a result of triggering the change event - this is the point
             */
            expect (region).to.equal(firstRegionForMiddleModelOption);
            // now the defaults are set
            done();
        });

        it('Set model to middleModelOption  expect region to be firstRegionForMiddleModelOption', function(){
              matsParamUtils.setInputValueForParamAndtriggerChange('model',middleModelOption);
              var value = matsParamUtils.getValueForParamName('model');
              expect (value).to.equal(middleModelOption);
              var region = matsParamUtils.getValueForParamName('region');
              expect (region).to.equal(firstRegionForMiddleModelOption);
        });
        it('click reset to default expect model to be RAP and region to be firstRegionForFirstModelOption', function(){
              $('#reset').trigger('click'); // click the reset button
              var model = matsParamUtils.getValueForParamName('model');
              expect (model).to.equal(firstModelOption);
              var region = matsParamUtils.getValueForParamName('region');
              expect (region).to.equal(firstRegionForFirstModelOption);
              var fcl = matsParamUtils.getValueForParamName('forecast-length');
              expect (fcl).to.equal('-99');
              var statistic = matsParamUtils.getValueForParamName('statistic');
              expect (statistic).to.equal('RMS');
              var label = matsParamUtils.getValueForParamName('label');
              expect (label).to.equal('Curve0');
              //reset dates are set to the last thirty days. This is from the common/date_range initialization code
              const dateInitStr = matsCollections.dateInitStr();
              var curvedates = matsParamUtils.getValueForParamName('curve-dates');
              expect (curvedates).to.equal(dateInitStr);
              var average = matsParamUtils.getValueForParamName('average');
              expect (average).to.equal('None');
              var validtime = matsParamUtils.getValueForParamName('valid-time');
              expect (validtime).to.equal('both');
              var cloudcoverage = matsParamUtils.getValueForParamName('cloud-coverage');
              expect (cloudcoverage).to.equal('All');
      });
    });

