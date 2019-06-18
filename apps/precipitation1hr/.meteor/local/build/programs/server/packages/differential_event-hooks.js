(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;

/* Package-scope variables */
var Hooks, EventHooksMonitoringCollection;

(function(){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// packages/differential_event-hooks/packages/differential_event-hooks.js                       //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
(function () {

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// packages/differential:event-hooks/server.js                                            //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
//////////////////////////////////                                                        // 1
//= SETUP HOOKS OBJECT                                                                    // 2
//////////////////////////////////                                                        // 3
                                                                                          // 4
Hooks = {                                                                                 // 5
    onLoseFocus:    function(){},                                                         // 6
    onGainFocus:    function(){},                                                         // 7
    onCloseSession: function(){},                                                         // 8
    onLoggedIn:     function(){},                                                         // 9
    onLoggedOut:    function(){},                                                         // 10
    onCreateUser:   function(){},                                                         // 11
    onDeleteUser:   function(){}                                                          // 12
};                                                                                        // 13
                                                                                          // 14
                                                                                          // 15
//////////////////////////////////                                                        // 16
//= SETUP METEOR METHODS                                                                  // 17
//////////////////////////////////                                                        // 18
                                                                                          // 19
Meteor.methods({                                                                          // 20
    eventsOnLoseFocus: function () {                                                      // 21
        // Fire the loseFocus event                                                       // 22
        Hooks.onLoseFocus(this.userId);                                                   // 23
    },                                                                                    // 24
    eventsOnGainFocus: function () {                                                      // 25
        // Fire the gainFocus event                                                       // 26
        Hooks.onGainFocus(this.userId);                                                   // 27
    },                                                                                    // 28
    eventsOnCloseSession: function () {                                                   // 29
        // Fire the closeSession event                                                    // 30
        Hooks.onCloseSession(this.userId);                                                // 31
    },                                                                                    // 32
    eventsOnLoggedIn: function () {                                                       // 33
        // Fire the loggedIn event                                                        // 34
        Hooks.onLoggedIn(this.userId);                                                    // 35
    },                                                                                    // 36
    eventsOnLoggedOut: function (userId) {                                                // 37
        // Fire the loggedOut event                                                       // 38
        Hooks.onLoggedOut(userId);                                                        // 39
    }                                                                                     // 40
});                                                                                       // 41
                                                                                          // 42
                                                                                          // 43
//////////////////////////////////                                                        // 44
//= SETUP USER MONITORING                                                                 // 45
//////////////////////////////////                                                        // 46
                                                                                          // 47
var currentUsers = Meteor.users.find().count();                                           // 48
var userCount;                                                                            // 49
                                                                                          // 50
// Begin monitoring users                                                                 // 51
Meteor.users.find({}, { limit: 1, sort: { createdAt: -1 } }).observeChanges({             // 52
    added: function (id, fields) {                                                        // 53
        userCount = Meteor.users.find().count();                                          // 54
                                                                                          // 55
        if (userCount > currentUsers) {                                                   // 56
            currentUsers = userCount;                                                     // 57
            Hooks.onCreateUser(id); // Fire the event on the server                       // 58
        }                                                                                 // 59
    }                                                                                     // 60
});                                                                                       // 61
                                                                                          // 62
Meteor.users.find().observeChanges({                                                      // 63
    removed: function (id) {                                                              // 64
        currentUsers = Meteor.users.find().count();                                       // 65
        Hooks.onDeleteUser(id); // Fire the event on the server                           // 66
    }                                                                                     // 67
});                                                                                       // 68
                                                                                          // 69
////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// packages/differential:event-hooks/common.js                                            //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
// We define this collection as a hack-ish way of                                         // 1
// triggering updates on the client from the server                                       // 2
EventHooksMonitoringCollection = new Meteor.Collection('eventHooksMonitoringCollection'); // 3
////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);

//////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
Package._define("differential:event-hooks", {
  Hooks: Hooks,
  EventHooksMonitoringCollection: EventHooksMonitoringCollection
});

})();
