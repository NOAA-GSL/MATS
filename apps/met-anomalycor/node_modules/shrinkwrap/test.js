'use strict';

var Registry = require('npm-registry')
  , Shrinkwrap = require('./')
  , npm = new Registry();

//
// registry.release('lru-cache', '*', function (err, data) {
//  console.log(data);
// });
//

var wrap = new Shrinkwrap();

wrap.get('primus', function (err, data, tree) {
  console.log(tree);
});
