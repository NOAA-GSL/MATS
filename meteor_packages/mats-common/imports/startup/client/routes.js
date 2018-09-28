import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
FlowRouter.route('/', {
    name: 'main',
    action() {
        this.render('Home')
    }
});

FlowRouter.route('/preview/:graphFunction/:key/:matching', {
    name: 'preview',
    action(params) {
        console.log("in preview route- setting params", params);
        this.render('GraphStandAlone', params);
    }
});

FlowRouter.route('/publish/:graphFunction/:key/:matching', {
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
