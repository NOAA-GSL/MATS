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
        });
    });

