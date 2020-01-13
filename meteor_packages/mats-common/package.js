/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

Package.describe({
    name: 'randyp:mats-common',
    version: '2.1.0',
    // Brief, one-line summary of the package.
    summary: 'MATS common files provides common functionality for mats apps',
    // URL to the Git repository containing the source code for this package.
    git: '',
    // By default, Meteor will default to using README.md for documentation.
    // To avoid submitting documentation, set this field to null.
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.4.1.1');
    Npm.depends({
        'fibers': '2.0.0',
        'fs-extra': '7.0.0',
        "@babel/runtime": "7.3.1",
        "meteor-node-stubs": "0.4.1",
        "url": "0.11.0",
        "jquery-ui": "1.12.1",
        "csv-stringify": "4.3.1",
        "node-file-cache" : "1.0.2",
        "python-shell": "1.0.8"
    });
    api.mainModule("server/main.js", "server");
    api.mainModule("client/main.js", "client");
    api.use('natestrauser:select2', 'client');
    api.use('aldeed:simple-schema');
    api.imply('aldeed:simple-schema');
    api.use('mdg:validated-method');
    api.use('ecmascript');
    api.use('modules');
    api.imply('ecmascript');
    api.use(['templating'], 'client');
    api.use("accounts-google", 'client');
    api.use("accounts-ui", 'client');
    api.use("service-configuration", 'server');
    api.use("yasinuslu:json-view", "client");
    api.use("dangrossman:bootstrap-daterangepicker");
    api.use("mdg:validated-method");
    api.use('session');
    api.imply('session');
    api.use("twbs:bootstrap");
    api.use("fortawesome:fontawesome");
    api.use("msavin:mongol");
    api.use("differential:event-hooks");
    api.use("risul:bootstrap-colorpicker");
    api.use("logging");
    api.use("reload");
    api.use("random");
    api.use("ejson");
    api.use("spacebars");
    api.use("check");
    api.use("ostrio:flow-router-extra");
    api.use("meteorhacks:picker");

    // modules
    api.export("matsCollections", ['client', 'server']);
    api.export("matsTypes", ['client', 'server']);
    api.export("matsMethods", ['client', 'server']);
    api.export("matsCurveUtils", ['client']);
    api.export("matsSelectUtils", ['client']);
    api.export("matsGraphUtils", ['client']);
    api.export("matsParamUtils", ['client', 'server']);
    api.export("matsMathUtils", ['client', 'server']);
    api.export("matsPlotUtils", ['client', 'server']);
    api.export("matsDataUtils", ['server']);
    api.export("matsDataQueryUtils", ['server']);
    api.export("matsDataDiffUtils", ['server']);
    api.export("matsDataMatchUtils", ['server']);
    api.export("matsDataCurveOpsUtils", ['server']);
    api.export("matsDataPlotOpsUtils", ['server']);
    api.export("matsDataProcessUtils", ['server']);
    api.export("regression", ['client', 'server']);
    api.export("matsCache", ['server']);

    // add imports
    //both
    api.addFiles('imports/startup/both/index.js');
    api.addFiles('imports/startup/both/mats-types.js');
    api.addFiles('imports/startup/both/mats-collections.js');

    //api
    api.addFiles('imports/startup/api/matsMethods.js');

    //layouts
    api.addFiles("imports/startup/ui/layouts/notFound.html", "client");
    api.addFiles("imports/startup/ui/layouts/appBody.html", "client");
    api.addFiles("imports/startup/ui/layouts/appBody.js", "client");

    //client
    api.addFiles('imports/startup/client/curve_util.js');
    api.addFiles('imports/startup/client/graph_util.js');
    api.addFiles('imports/startup/client/select_util.js');
    api.addFiles('imports/startup/client/index.js');
    api.addFiles('imports/startup/client/init.js');
    api.addFiles('imports/startup/client/routes.js');
    //api.addFiles('imports/startup/client/jspdf.js');

    api.addFiles('imports/stylesheets/app.css', "client");
    //server
    api.addFiles('imports/startup/server/data_util.js');
    api.addFiles('imports/startup/server/data_query_util.js');
    api.addFiles('imports/startup/server/data_diff_util.js');
    api.addFiles('imports/startup/server/data_match_util.js');
    api.addFiles('imports/startup/server/data_curve_ops_util.js');
    api.addFiles('imports/startup/server/data_plot_ops_util.js');
    api.addFiles('imports/startup/server/data_process_util.js');
    api.addFiles('imports/startup/server/index.js');
    api.addFiles('imports/startup/server/publications.js');
    api.addFiles('imports/startup/server/cache.js');

    // top level
    // api.addFiles('footer.html', "client");
    // api.addFiles('footer.js', "client");

    //client
    api.addFiles('client/main.html', "client");
    //api.addFiles('client/main.js', "client");
    api.addFiles('client/error.js', "client");
    api.addFiles('client/info.js', "client");

    //server
    //api.addFiles('server/main.js', "server");

    //lib
    api.addFiles("lib/regression.js", ['client', 'server']);
    api.addFiles('lib/param_util.js', ['client', 'server']);
    api.addFiles('lib/plot_util.js', ['client', 'server']);
    api.addFiles('lib/math_util.js', ['client', 'server']);

    // templates
    api.addFiles("templates/topnav/top_nav.html", "client");
    api.addFiles("templates/topnav/top_nav.js", "client");

    api.addFiles("templates/spinner/spinner.html", "client");
    api.addFiles("templates/spinner/spinner.js", "client");

    api.addFiles('templates/footer.html', "client");
    api.addFiles('templates/footer.js', "client");
    api.addFiles('templates/Home.html', "client");
    api.addFiles('templates/Home.js', "client");
    api.addFiles('templates/Configure.html', "client");
    api.addFiles('templates/Configure.js', "client");
    api.addFiles('templates/CustomHome.html', "client");
    api.addFiles('templates/CustomHome.js', "client");
    api.addFiles('templates/underConstruction/underConstruction.html', "client");
    api.addFiles('templates/underConstruction/underConstruction.js', "client");
    api.addFiles('templates/about.html', "client");
    api.addFiles('templates/about.js', "client");
    api.addFiles('templates/version/version.html', "client");
    api.addFiles('templates/version/version.js', "client");

    api.addFiles("templates/plot/plot_list.html", "client");
    api.addFiles("templates/plot/plot_list.js", "client");

    api.addFiles('templates/help/help.html', "client");

    api.addFiles("templates/plot/plot_param_group.html", "client");
    api.addFiles("templates/plot/plot_param_group.js", "client");

    api.addFiles("templates/plot/QC_param_group.html", "client");
    api.addFiles("templates/plot/QC_param_group.js", "client");

    api.addFiles("templates/error/error.html", "client");
    api.addFiles("templates/error/error.js", "client");

    api.addFiles("templates/info/info.html", "client");
    api.addFiles("templates/info/info.js", "client");

    api.addFiles("templates/changePlotType/changePlotType.html", "client");
    api.addFiles("templates/changePlotType/changePlotType.js", "client");

    api.addFiles("templates/graph/graph.html", "client");
    api.addFiles("templates/graph/graph.js", "client");

    api.addFiles("templates/graphStandAlone/graphStandAlone.html", "client");
    api.addFiles("templates/graphStandAlone/graphStandAlone.js", "client");

    api.addFiles("templates/graph/displayFunctions/graph_plotly.js", "client");

    api.addFiles("templates/common/text_input.html", "client");
    api.addFiles("templates/common/text_input.js", "client");

    api.addFiles("templates/graph/text_output.html", "client");
    api.addFiles("templates/graph/text_output.js", "client");

    api.addFiles("templates/common/select.html", "client");
    api.addFiles("templates/common/select.js", "client");

    api.addFiles("templates/common/map.html", "client");
    api.addFiles("templates/common/map.js", "client");

    api.addFiles("templates/common/date_range.html", "client");
    api.addFiles("templates/common/date_range.js", "client");

    api.addFiles("templates/common/checkbox_group.html", "client");
    api.addFiles("templates/common/checkbox_group.js", "client");

    api.addFiles("templates/common/number_spinner.html", "client");
    api.addFiles("templates/common/number_spinner.js", "client");

    api.addFiles("templates/common/radio_group_option.html", "client");
    api.addFiles("templates/common/radio_group_option.js", "client");

    api.addFiles("templates/common/item.html", "client");
    api.addFiles("templates/common/item.js", "client");

    api.addFiles("templates/curves/curve_item.html", "client");
    api.addFiles("templates/curves/curve_item.js", "client");

    api.addFiles("templates/curves/curve_param_item_group.html", "client");
    api.addFiles("templates/curves/curve_param_item_group.js", "client");

    api.addFiles("templates/curves/curve_list.html", "client");
    api.addFiles("templates/curves/curve_list.js", "client");

    api.addFiles("templates/params/param_list.html", "client");
    api.addFiles("templates/params/param_list.js", "client");

    api.addFiles("templates/params/curve_param_group.html", "client");
    api.addFiles("templates/params/curve_param_group.js", "client");

    api.addFiles("templates/params/scatter_axis.html", "client");
    api.addFiles("templates/params/scatter_axis.js", "client");

    api.addFiles("templates/plotType/plot_type.html", "client");
    api.addFiles("templates/plotType/plot_type.js", "client");

    // static assets
    api.addAssets('public/img/bootstrap-colorpicker/alpha-horizontal.png', "client");
    api.addAssets('public/img/bootstrap-colorpicker/alpha.png', "client");
    api.addAssets('public/img/bootstrap-colorpicker/hue-horizontal.png', "client");
    api.addAssets('public/img/bootstrap-colorpicker/hue.png', "client");
    api.addAssets('public/img/bootstrap-colorpicker/saturation.png', "client");
    api.addAssets('public/img/arrow-down.gif', "client");
    api.addAssets('public/img/arrow-left.gif', "client");
    api.addAssets('public/img/arrow-right.gif', "client");
    api.addAssets('public/img/arrow-up.gif', "client");
    api.addAssets('public/img/bg.png', "client");
    api.addAssets('public/img/noaa_transparent.gif', "client");
    api.addAssets('public/img/spinner.gif', "client");
    api.addAssets('public/img/building_spinner.gif', "client");
    api.addAssets('public/img/drawing_spinner.gif', "client");
    api.addAssets('public/img/texturetastic_gray.png', "client");
    api.addAssets('public/img/subtle_grunge_@2X.png', "client");
    api.addAssets('public/img/underConstruction.jpg', "client");
    api.addAssets('public/deployment/deployment.json', "server");
    api.addAssets('public/MATSReleaseNotes.html', "server");
    api.addAssets('public/python/python_query_util.py', "server");
});

Package.onTest(function (api) {
    api.use('ecmascript');
    api.use('tinytest');
    api.use('randyp:mats-common');
    api.addFiles('mats-common-tests.js');
});
