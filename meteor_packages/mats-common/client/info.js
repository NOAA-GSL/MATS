setInfo = function(message){
    Session.set('infoMessage', message);
    $("#info").modal('show');
};

clearInfo = function(message){
    Session.set('infoMessage', '');
    $("#info").modal('hide');
};

getInfo = function() {
    return Session.get('infoMessage');
};