import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/graphStandAlone/:_id', {
    name: 'article',
    action(params) {
        // All passed parameters is available as Object:
        console.log(params);
        // { _id: 'results_id' }

        // Pass params to Template's context
        this.render('graphStandAlone', params);
    },
    waitOn(params) {
        return Meteor.subscribe('graphStandAlone', params._id);
    }
});