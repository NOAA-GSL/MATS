Package.describe({
  name: 'randyp:flot',
  version: '1.0.0',
  // Brief, one-line summary of the package.
  summary: 'Adds most of the plugins and modifies the select, navigate, and tooltips plugins so that the navigate and select plugins are more compatible and so that the tooltip plugin allows custom data to be returned in the series',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');

//load before ?? don't know how to control load order
 api.addFiles('loadBefore/jquery.flot.canvas2image.js','client');
 api.addFiles('loadBefore/jquery.flot.js','client');
 api.addFiles('base64.js','client');
 api.addFiles('excanvas.js','client');
 api.addFiles('jquery.colorhelpers.js','client');
 api.addFiles('jquery.colorhelpers.min.js','client');
 api.addFiles('jquery.flot.axislabels.js','client');
 api.addFiles('jquery.flot.canvasAsImage.js','client');
 api.addFiles('jquery.flot.canvas.js','client');
 api.addFiles('jquery.flot.categories.js','client');
 api.addFiles('jquery.flot.crosshair.js','client');
 api.addFiles('jquery.flot.errorbars.js','client');
 api.addFiles('jquery.flot.fillbetween.js','client');
 api.addFiles('jquery.flot.image.js','client');
 api.addFiles('jquery.flot.navigate.js','client');
 api.addFiles('jquery.flot.pie.min.js','client');
 api.addFiles('jquery.flot.resize.min.js','client');
 api.addFiles('jquery.flot.saveAsImage.js','client');
 api.addFiles('jquery.flot.selection.js','client');
 api.addFiles('jquery.flot.stack.js','client');
 api.addFiles('jquery.flot.stack.min.js','client');
 api.addFiles('jquery.flot.symbol.min.js','client');
 api.addFiles('jquery.flot.threshold.min.js','client');
 api.addFiles('jquery.flot.time.min.js','client');
 api.addFiles('jquery.flot.tooltip.js','client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('randyp:flot');
  api.addFiles('flot-tests.js');
});
