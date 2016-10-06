import { Router } from 'meteor/iron:router';
Router.route('/wfip2', function () {
    this.render('Home', {});
});

Router.route('/wfip2-dev', function () {
    this.render('Home', {});
});

Router.route('/upperair', function () {
    this.render('Home', {});
});

Router.route('/visibility', function () {
    this.render('Home', {});
});

Router.route('/surface', function () {
    this.render('Home', {});
});

Router.route('/anomalycor', function () {
    this.render('Home', {});
});


Router.route('/ceiling', function () {
    this.render('Home', {});
});


Router.route('/app', function () {
    this.render('Home',{});
});

// Router.route('/_oauth/google', function () {
//     var query = this.params.query;
//     Router.go('http://localhost:3000/wfip2/_oauth/google' + query);
// });


Router.route('/', function () {
    var pathArray = location.href.split( '/' );
    var host = pathArray[2];
    if (host.indexOf('localhost') === 0) {
        this.render('Home', {});
    } else {
        Router.go(Session.get("app").matsref + "/");
    }
});
