/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

setStatus = function(status){
    Session.set('statusMessage', status );
};

clearStatus = function(status){
    Session.set('statusMessage', '');
};

getStatus = function() {
    return Session.get('statusMessage');
};