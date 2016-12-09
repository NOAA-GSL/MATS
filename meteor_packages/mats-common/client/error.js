setError = function(error){
    var myError = "";
    var myStackTrace = "";
    if (typeof(error) === "string" || error instanceof String) {
        myError = new Error(error);
    } else {
        myError = error;
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