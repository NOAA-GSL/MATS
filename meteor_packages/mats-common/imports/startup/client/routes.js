import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
FlowRouter.route('/', {
    name: 'main',
    action() {
        console.log("in / route");
        this.render('Home')
    }
});

FlowRouter.route('/standAlone/:graphFunction/:key', {
    name: 'standAlone',
    action(params) {
        console.log("StandAlone Route - params: ", params);
        this.render('GraphStandAlone', params);
    }
});

FlowRouter.route('*', {
    action() {
        this.render('notFound');
    }
});
