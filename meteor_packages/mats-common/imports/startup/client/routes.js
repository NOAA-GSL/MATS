import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
FlowRouter.route('/', {
    name: 'main',
    action() {
        this.render('Home')
    }
});

FlowRouter.route('/standAlone/:graphFunction/:key', {
    name: 'standAlone',
    action(params) {
        console.log("in standAlone route- setting params", params);
        this.render('GraphStandAlone', params);
    }
});

FlowRouter.route('/publish/:graphFunction/:key', {
    name: 'publish',
    action(params) {
        console.log("in publish route- setting params", params);
        this.render('GraphStandAlone', params);
    }
});

FlowRouter.route('*', {
    action() {
        this.render('notFound');
    }
});
