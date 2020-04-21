/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

setError = function(error){
    var myError = "";
    var myStackTrace = "";
    if (typeof(error) === "string" || error instanceof String) {
        myError = new Error(error);
    } else {
        myError = error;
    }

    if ( myError.toLocaleString().indexOf( "INFO:" ) !== -1) {
        const strinfo = myError && myError.error && myError.error.replace( "INFO:", "" );
        setInfo( strinfo );
        return;
    }

    Session.set('errorMessage', myError.message);
    if (myError.stack) {
        myStackTrace = myError.stack;
    } else {
        myStackTrace = "StackTrace unavailable";
    }
    Session.set('stackTrace',myStackTrace);
    $("#error").modal('show');
};

clearError = function(message){
    Session.set('errorMessage', '');
    Session.set('stackTrace', '');
    $("#error").modal('hide');
};

getError = function() {
    return Session.get('errorMessage');
};

getStack = function() {
    return Session.get('stackTrace');
};