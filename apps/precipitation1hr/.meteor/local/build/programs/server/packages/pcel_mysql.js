(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;

/* Package-scope variables */
var mysql;

(function(){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/pcel_mysql/packages/pcel_mysql.js                             //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/pcel:mysql/pcel:mysql.js                                 //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
// Write your package code here!                                     // 1
mysql = Npm.require('mysql');                                        // 2
                                                                     // 3
///////////////////////////////////////////////////////////////////////

}).call(this);

////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
Package._define("pcel:mysql", {
  mysql: mysql
});

})();
