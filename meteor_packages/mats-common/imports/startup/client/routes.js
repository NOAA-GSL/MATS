import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
FlowRouter.route('/', {
    name: 'main',
    action() {
        this.render('Home')
    }
});

FlowRouter.route('/preview/:graphFunction/:key/:matching/:appName', {
    name: 'preview',
    action(params) {
        console.log("in preview route- setting params", params);
        this.render('GraphStandAlone', params);
    }
});


FlowRouter.route('/gsd/mats/*/preview/:graphFunction/:key/:matching/:appName', {
    name: 'preview',
    action(params) {
        console.log("in preview route- setting params", params);
        this.render('GraphStandAlone', params);
    }
});

FlowRouter.route('/gsd/mats/*/', {
    name: 'main',
    action() {
        this.render('Home')
    }
});

FlowRouter.route('/*/CSV*', {
    name: 'CSV',
    action() {
        console.log('route for CSV');
    }
});

FlowRouter.route('/*/JSON*', {
    name: 'JSON',
    action() {
        console.log('route for JSON');
    }
});

FlowRouter.route('*', {
    action() {
        this.render('notFound');
    }
});
