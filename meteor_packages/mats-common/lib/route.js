import { Router } from 'meteor/iron:router';

//Routes
Router.route('/data', function() {
    this.render('data', {
    });
});

Router.route('/wfip2', function () {
    this.render('Home', {
    });
});

Router.route('/upperair', function () {
    this.render('Home', {
    });
});

Router.route('/visibility', function () {
    this.render('Home', {
    });
});

Router.route('/surface', function () {
    this.render('Home', {
    });
});

Router.route('/ceiling', function () {
    this.render('Home', {
    });
});


Router.route('/app', function () {
    this.render('Home', {
    });
});

Router.route('/', function () {
    var pathArray = location.href.split( '/' );
    var host = pathArray[2];
    if (host.indexOf('localhost') === 0) {
        this.render('Home',{});
    } else {
        Router.go(Session.get("app").matsref);
    }
});



