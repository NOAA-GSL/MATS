setError = function(message){
    Session.set('errorMessage', message);
    document.getElementById('error').style.display='block';
    window.scrollTo(0, 0);
}

clearError = function(message){
    Session.set('errorMessage', '');
    document.getElementById('error').style.display='none';
}

getError = function() {
    return Session.get('errorMessage');
}