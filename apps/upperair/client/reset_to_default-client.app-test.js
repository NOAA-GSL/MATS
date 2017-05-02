import { Meteor } from 'meteor/meteor';
import { assert } from 'meteor/practicalmeteor:chai';

if (Meteor.isClient) {
    describe('Reset to default', function(){
        before(function(done) {
            // set the model to like the tenth option
            //const selected = matsParamUtils.getInputElementForParamName('model').selectedIndex;

            done();
        });

      it('click reset to default', function(){
          try {

              assert.equal(5, 5);
          } catch (error) {
            console.log("error", error);
            assert.fail(error);
          }
      });
    });
}
