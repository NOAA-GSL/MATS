Package.describe({
  name: 'randyp:mats-common',
  version: '1.4.1',
  // Brief, one-line summary of the package.
  summary: 'MATS common files provides common functionality for mats apps',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1.1');
  Npm.depends({
    'fibers':'1.0.14',
    'fs':'0.0.2',
    "meteor-node-stubs":"0.2.3"
  });
  api.mainModule("server/main.js", "server");
  api.mainModule("client/main.js", "client");
  api.use('aldeed:simple-schema@1.5.3');
  api.imply('aldeed:simple-schema@1.5.3');
  api.use('mdg:validated-method');
  api.use('ecmascript');
  api.use('modules');
  api.imply('ecmascript');
  api.use(['templating'], 'client');
  api.use("accounts-google", 'client');
  api.use("accounts-ui", 'client');
  api.use("service-configuration",'server');
  api.use("yasinuslu:json-view","client");
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
  api.use("bevanhunt:leaflet");
  api.use("randyp:flot");

  // modules
  api.export("matsCollections",['client','server']);
  api.export("matsTypes",['client','server']);
  api.export("matsMethods",['client','server']);
  api.export("matsCurveUtils",['client']);
  api.export("matsSelectUtils",['client']);
  api.export("matsParamUtils",['client','server']);
  api.export("matsMathUtils",['client','server']);
  api.export("matsPlotUtils",['client','server']);
  api.export("matsDataUtils",['server']);
  api.export("regression",['client','server']);
  api.export("matsWfipUtils",['server']);
  
  // add imports
  //both
  api.addFiles('imports/startup/both/index.js');
  api.addFiles('imports/startup/both/mats-types.js');
  api.addFiles('imports/startup/both/mats-collections.js');

  //api
  api.addFiles('imports/startup/api/matsMethods.js');

  //client
  api.addFiles('imports/startup/client/curve_util.js');
  api.addFiles('imports/startup/client/select_util.js');
  api.addFiles('imports/startup/client/index.js');
  api.addFiles('imports/startup/client/init.js');
  api.addFiles('imports/startup/client/jquery.json-viewer.css');
  api.addFiles('imports/startup/client/jquery.json-viewer.js');

  //server
  api.addFiles('imports/startup/server/data_util.js');
  api.addFiles('imports/startup/server/index.js');
  api.addFiles('imports/startup/server/publications.js');
  api.addFiles('imports/startup/server/wfiputil.js');
    api.addFiles('imports/startup/server/wfiputil.js');


  // top level
  api.addFiles('footer.html', "client");

  //client
  api.addFiles('client/main.html', "client");
  api.addFiles('client/main.js', "client");
  api.addFiles('client/error.js', "client");
  api.addFiles('client/info.js', "client");

  //server
  api.addFiles('server/main.js', "server");

  //lib
  api.addFiles("lib/regression.js", ['client','server']);
  api.addFiles('lib/param_util.js', ['client','server']);
  api.addFiles('lib/plot_util.js', ['client','server']);
  api.addFiles('lib/math_util.js', ['client','server']);

  // templates
  api.addFiles("templates/topnav/top_nav.html", "client");
  api.addFiles("templates/topnav/top_nav.js", "client");
  
  api.addFiles("templates/spinner/spinner.html", "client");
  api.addFiles("templates/spinner/spinner.js", "client");
  
  api.addFiles('templates/Home.html', "client");
  api.addFiles('templates/Home.js', "client");
  api.addFiles('templates/version/version.html', "client");
  api.addFiles('templates/version/version.js', "client");

  api.addFiles("templates/plot/plot_list.html", "client");
  api.addFiles("templates/plot/plot_list.js", "client");
  
  api.addFiles('templates/help/help.html', "client");
  
  api.addFiles('templates/showData/data.html', "client");
  api.addFiles('templates/showData/data.js', "client");
  
  api.addFiles("templates/plot/plot_param_group.html", "client");
  api.addFiles("templates/plot/plot_param_group.js", "client");
  
  api.addFiles("templates/error/error.html", "client");
  api.addFiles("templates/error/error.js", "client");

  api.addFiles("templates/info/info.html", "client");
  api.addFiles("templates/info/info.js", "client");

  api.addFiles("templates/graph/graph.html", "client");
  api.addFiles("templates/graph/graph.js", "client");
  
  api.addFiles("templates/graph/displayFunctions/graph_series.js", "client");
  api.addFiles("templates/graph/displayFunctions/graph_profile.js", "client");
  api.addFiles("templates/graph/displayFunctions/graph_2d_scatter.js", "client");
  
  api.addFiles("templates/graph/text_profile_output.html", "client");
  api.addFiles("templates/graph/text_profile_output.js", "client");

  api.addFiles("templates/common/text_input.html", "client");
  api.addFiles("templates/common/text_input.js", "client");

  api.addFiles("templates/graph/text_series_output.html", "client");
  api.addFiles("templates/graph/text_series_output.js", "client");

  api.addFiles("templates/graph/text_scatter2d_output.html", "client");
  api.addFiles("templates/graph/text_scatter2d_output.js", "client");

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

  api.addFiles("templates/administration/reset.html", "client");
  api.addFiles("templates/administration/reset.js", "client");

  api.addFiles("templates/administration/export.html", "client");
  api.addFiles("templates/administration/export.js", "client");

  api.addFiles("templates/administration/import.html", "client");
  api.addFiles("templates/administration/import.js", "client");

  api.addFiles("templates/administration/settings.html", "client");
  api.addFiles("templates/administration/settings.js", "client");

  api.addFiles("templates/administration/databases.html", "client");
  api.addFiles("templates/administration/databases.js", "client");

  api.addFiles("templates/administration/plotParams.html", "client");
  api.addFiles("templates/administration/plotParams.js", "client");

  api.addFiles("templates/administration/colorsScheme.html", "client");
  api.addFiles("templates/administration/colorScheme.js", "client");

  api.addFiles("templates/administration/curveParams.html", "client");
  api.addFiles("templates/administration/curveParams.js", "client");

  api.addFiles("templates/administration/authorization.html", "client");
  api.addFiles("templates/administration/authorization.js", "client");

  api.addFiles("templates/administration/mail_credentials.html", "client");
  api.addFiles("templates/administration/mail_credentials.js", "client");

  api.addFiles("templates/administration/PlotGraphFunctions.html", "client");
  api.addFiles("templates/administration/PlotGraphFunctions.js", "client");

  api.addFiles("templates/administration/administration.html", "client");
  api.addFiles("templates/administration/administration.js", "client");

  // static assets
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
  api.addAssets('public/subtle_grunge_@2X.png', "client");
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('randyp:mats-common');
  api.addFiles('mats-common-tests.js');
});
