setStatus = function(status){
    Session.set('statusMessage', status );
};

clearStatus = function(status){
    Session.set('statusMessage', '');
};

getStatus = function() {
    return Session.get('statusMessage');
};