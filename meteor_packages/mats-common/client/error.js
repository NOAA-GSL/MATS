setError = function(message){
    var err = new Error();
    var caller_line = err.stack.split("\n")[3];
    var index = caller_line.indexOf("at ");
    var clean = caller_line.slice(index+2, caller_line.length);
    Session.set('errorMessage', message + " <br>" + clean);
    document.getElementById('error').style.display='block';
    window.scrollTo(0, 0);
};

clearError = function(message){
    Session.set('errorMessage', '');
    document.getElementById('error').style.display='none';
};

getError = function() {
    return Session.get('errorMessage');
};