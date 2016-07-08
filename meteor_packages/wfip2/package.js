Package.describe({
  name: 'xwei:wfip2',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use('randyp:mats-common');
  api.use(['templating'], 'client');
  api.addFiles('dataFunctions/data_profile_zoom_pan.js','server');
  api.addFiles('dataFunctions/data_series_zoom_pan.js','server');
  api.addFiles('dataFunctions/data_2d_scatter.js','server');
  api.addFiles('app-startup.js','server');
  api.addFiles('app.css',['client', 'server']);
  api.addFiles('version.html', "client");
  api.export("dataSeriesZoom", ['client', 'server']);
  api.export("data2dScatter", ['client', 'server']);
  api.export("dataProfileZoom", ['client', 'server']);
  api.export("roles", "server");
  api.export("authorization", "server");
  api.export("credentials", "server");
  api.export("plotGraph", "server");
  api.export("colorScheme", "server");
  api.export("settings", "server");
  api.export("curveParams", "server");
  api.export("savedCurveParams", "server");
  api.export("plotParams", "server");
  api.export("curveTextPatterns", "server");
  api.export("ScatterAxisTextPattern", "server");
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('xwei:wfip2');
  api.addFiles('app-tests.js');
});
