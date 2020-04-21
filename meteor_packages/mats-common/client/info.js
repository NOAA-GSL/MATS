/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

setInfo = function(info){
    Session.set('infoMessage', info );
    $("#info").modal('show');
};

clearInfo = function(info){
    Session.set('infoMessage', '');
    $("#info").modal('hide');
};

getInfo = function() {
    return Session.get('infoMessage');
};