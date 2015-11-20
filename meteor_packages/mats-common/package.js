Package.describe({
  name: 'randyp:mats-common',
  version: '1.0.1',
  // Brief, one-line summary of the package.
  summary: 'MATS common files provides common functionality for mats apps',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use(['templating'], 'client');
  api.use("accounts-google", 'client');
  api.use("accounts-ui", 'client');
  api.use("differential:event-hooks", ['client','server']);
  api.imply("differential:event-hooks");
  api.use('session');
  api.imply("accounts-google");
  api.imply("accounts-ui");
  api.add_files("lib/collections/collections.js", ['client','server']);
    api.export("CurveParams");
    api.export("CurveTextPatterns");
    api.export("SavedCurveParams");
    api.export("PlotParams");
    api.export("SavedPlotParams");
    api.export("PlotGraphFunctions");
    api.export("SavedPlotGraphFunctions");
    api.export("RegionsPerModel");
    api.export("RegionDescriptions");
    api.export("RegionNameMapping");
    api.export("Models");
    api.export("FcstLensPerModel");
    api.export("CurveSettings");
    api.export("Settings");
    api.export("ColorScheme");
    api.export("SentAddresses");
    api.export("Authorization");
    api.export("Roles");
    api.export("SavedRoles");
    api.export("Databases");
    api.export("SavedDatabases");
    api.export("Credentials");
    api.export("SavedCredentials");
    api.export("InputTypes");

    api.add_files("lib/util.js", ['client','server']);
  api.add_files("lib/error/error.js", ['client','server']);
  api.add_files("templates/topnav/topNav.html", "client");
  api.add_files("templates/spinner/spinner.html", "client");
  api.addFiles('Home.html', "client");
  api.addFiles('client/lib/helpers.js', "client");
  api.addFiles('client/lib/html2canvas.js', "client");
  api.addFiles('client/lib/init.js', "client");
  api.addFiles('footer.html', "client");
  api.addFiles('version.html', "client");
  api.addFiles('server/plot_service.js', "server");
  api.addFiles('client/main.html', "client");


  api.add_files("templates/plot/plot_list.html", "client");
  api.add_files("templates/plot/plot_list.js", "client");

  api.add_files("templates/plot/plot_param_group.html", "client");
  api.add_files("templates/plot/plot_param_group.js", "client");

  api.add_files("templates/error/error.html", "client");
  api.add_files("templates/error/error.js", "client");

  api.add_files("templates/graph/graph.html", "client");
  api.add_files("templates/graph/graph.js", "client");

  api.add_files("templates/graph/graphFunctions/graph_series_zoom_pan.js", "client");

  api.add_files("templates/graph/graphFunctions/graph_profile_zoom_pan.js", "client");

  api.add_files("templates/graph/text_profile_output.html", "client");
  api.add_files("templates/graph/text_profile_output.js", "client");

  api.add_files("templates/common/text_input.html", "client");
  api.add_files("templates/common/text_input.js", "client");

  api.add_files("templates/graph/text_series_output.html", "client");
  api.add_files("templates/graph/text_series_output.js", "client");

  api.add_files("templates/common/select.html", "client");
  api.add_files("templates/common/select.js", "client");

  api.add_files("templates/common/date_range.html", "client");
  api.add_files("templates/common/date_range.js", "client");

  api.add_files("templates/common/checkbox_group.html", "client");

  api.add_files("templates/common/number_spinner.html", "client");

  api.add_files("templates/common/radio_group_option.html", "client");
  api.add_files("templates/common/radio_group_option.js", "client");

  api.add_files("templates/common/item.html", "client");
  api.add_files("templates/common/item.js", "client");

  api.add_files("templates/curves/curve_item.html", "client");
  api.add_files("templates/curves/curve_item.js", "client");

  api.add_files("templates/curves/curve_list.html", "client");
  api.add_files("templates/curves/curve_list.js", "client");

  api.add_files("templates/params/param_list.html", "client");
  api.add_files("templates/params/param_list.js", "client");

  api.add_files("templates/params/curve_param_group.html", "client");
  api.add_files("templates/params/curve_param_group.js", "client");

  api.add_files("templates/plotType/plot_type.html", "client");
  api.add_files("templates/plotType/plot_type.js", "client");

  api.add_files("templates/administration/reset.html", "client");
  api.add_files("templates/administration/reset.js", "client");

  api.add_files("templates/administration/export.html", "client");
  api.add_files("templates/administration/export.js", "client");

  api.add_files("templates/administration/import.html", "client");
  api.add_files("templates/administration/import.js", "client");

  api.add_files("templates/administration/settings.html", "client");
  api.add_files("templates/administration/settings.js", "client");

  api.add_files("templates/administration/databases.html", "client");
  api.add_files("templates/administration/databases.js", "client");

  api.add_files("templates/administration/plotParams.html", "client");
  api.add_files("templates/administration/plotParams.js", "client");

  api.add_files("templates/administration/colorsScheme.html", "client");
  api.add_files("templates/administration/colorScheme.js", "client");

  api.add_files("templates/administration/curveParams.html", "client");
  api.add_files("templates/administration/curveParams.js", "client");

  api.add_files("templates/administration/authorization.html", "client");
  api.add_files("templates/administration/authorization.js", "client");

  api.add_files("templates/administration/mail_credentials.html", "client");
  api.add_files("templates/administration/mail_credentials.js", "client");

  api.add_files("templates/administration/PlotGraphFunctions.html", "client");
  api.add_files("templates/administration/PlotGraphFunctions.js", "client");

  api.add_files("templates/administration/administration.html", "client");
  api.add_files("templates/administration/administration.js", "client");

  api.addAssets('public/img/arrow-down.gif', "client");
  api.addAssets('public/img/arrow-left.gif', "client");
  api.addAssets('public/img/arrow-right.gif', "client");
  api.addAssets('public/img/arrow-up.gif', "client");
  api.addAssets('public/img/bg.png', "client");
  api.addAssets('public/img/noaa_transparent.gif', "client");
  api.addAssets('public/img/spinner.gif', "client");
  api.addAssets('public/img/texturetastic_gray.png', "client");
  api.addAssets('public/subtle_grunge_@2X.png', "client");

});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('randyp:mats-common');
  api.addFiles('mats-common-tests.js');
});
