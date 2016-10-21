setInfo = function(message){
    Session.set('infoMessage', message);
    document.getElementById('info').style.display='block';
    window.scrollTo(0, 0);
};

clearInfo = function(message){
    Session.set('infoMessage', '');
    document.getElementById('info').style.display='none';
};

getInfo = function() {
    return Session.get('infoMessage');
};