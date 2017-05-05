import { Meteor } from 'meteor/meteor';
import {matsParamUtils} from 'meteor/randyp:mats-common';
import { assert } from 'meteor/practicalmeteor:chai';
import {expect} from 'meteor/practicalmeteor:chai';
    describe('Adding Curves', function(){
        var insertedNodes = [];
        var observer = new WebKitMutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                for(var i = 0; i < mutation.addedNodes.length; i++)
                    insertedNodes.push(mutation.addedNodes[i]);
            })
        });

        it('Add a curve and check curve label and buttons"', function(){
            $("#add").trigger('click');  // add a curve
            var curves = Session.get("Curves");
            var curvesLength = curves.length;
            expect (curvesLength).to.equal(1);
            var curve = curves[0];
            expect (curve["label"]).to.equal("Curve0");
            expect (curve["model"]).to.equal("RAP");
            expect (curve["region"]).to.equal("RUC domain");
            expect (curve["statistic"]).to.equal("RMS");
            expect (curve["variable"]).to.equal("RHobT");
            expect (curve["cloud-coverage"]).to.equal("All");
            expect (curve["valid-time"]).to.equal("both");
            expect (curve["average"]).to.equal("None");
            expect (curve["forecast-length"]).to.equal("0");
            expect (curve["top"]).to.equal("1");
            expect (curve["bottom"]).to.equal("1050");
            expect (curve["color"]).to.equal("rgb(255,0,0)");
        });
        it('Add a second curve and check curve label and buttons"', function(){
            $("#add").trigger('click');  // add a curve
            var curves = Session.get("Curves");
            var curvesLength = curves.length;
            expect (curvesLength).to.equal(2);
            var curve = curves[1];
            expect (curve["label"]).to.equal("Curve1");
            expect (curve["model"]).to.equal("RAP");
            expect (curve["region"]).to.equal("RUC domain");
            expect (curve["statistic"]).to.equal("RMS");
            expect (curve["variable"]).to.equal("RHobT");
            expect (curve["cloud-coverage"]).to.equal("All");
            expect (curve["valid-time"]).to.equal("both");
            expect (curve["average"]).to.equal("None");
            expect (curve["forecast-length"]).to.equal("0");
            expect (curve["top"]).to.equal("1");
            expect (curve["bottom"]).to.equal("1050");
            expect (curve["color"]).to.equal("rgb(0,0,255)");
        });
        it('click remove all curve and check curve label and buttons"', function(){
            $("#remove-all").trigger('click');  // remove all
            var curves = Session.get("Curves");
            var curvesLength = curves.length;
            expect (curvesLength).to.equal(0);
        });
    });

