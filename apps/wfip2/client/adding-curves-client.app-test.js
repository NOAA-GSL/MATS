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
            expect (curve["data-source"]).to.equal("Sodar");
            expect (curve["region"]).to.equal("WFIP2 whole domain");
            expect (curve["sites"]).to.be.a("array");
            expect (curve["sites"][0]).to.equal("Boardman Airport -- SODAR");
            expect (curve["site-completeness"]).to.equal("0");
            expect (curve["statistic"]).to.equal("mean");
            expect (curve["variable"]).to.equal("Wind Direction");
            expect (curve["forecast-length"]).to.equal("0");
            expect (curve["top"]).to.equal("200");
            expect (curve["bottom"]).to.equal("40");
            expect (curve["level-completeness"]).to.equal("0");
            expect (curve["color"]).to.equal("rgb(255,0,0)");
    });
        it('Add a second curve and check curve label and buttons"', function(){
            $("#add").trigger('click');  // add a curve
            var curves = Session.get("Curves");
            var curvesLength = curves.length;
            expect (curvesLength).to.equal(2);
            var curve = curves[1];
            expect (curve["label"]).to.equal("Curve1");
            expect (curve["data-source"]).to.equal("Sodar");
            expect (curve["region"]).to.equal("WFIP2 whole domain");
            expect (curve["sites"]).to.be.a("array");
            expect (curve["sites"][0]).to.equal("Boardman Airport -- SODAR");
            expect (curve["site-completeness"]).to.equal("0");
            expect (curve["statistic"]).to.equal("mean");
            expect (curve["variable"]).to.equal("Wind Direction");
            expect (curve["forecast-length"]).to.equal("0");
            expect (curve["top"]).to.equal("200");
            expect (curve["bottom"]).to.equal("40");
            expect (curve["level-completeness"]).to.equal("0");
            expect (curve["color"]).to.equal("rgb(0,0,255)");
        });
        it('click remove all curve and check curve label and buttons"', function(){
            $("#remove-all").trigger('click');  // remove all
            $('#confirm-remove-all').trigger('click')  // confirm
            var curves = Session.get("Curves");
            var curvesLength = curves.length;
            expect (curvesLength).to.equal(0);
        });
    });

