import { Meteor } from 'meteor/meteor';
import { assert } from 'meteor/practicalmeteor:chai';

if (Meteor.isClient) {
  describe('placeholder client app test', () => {
    describe('when logged out', () => {
      it('fred test', () => {
        assert.equal(5, 5);
      });
    });
  });
}
