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