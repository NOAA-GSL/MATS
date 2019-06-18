
/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsMethods} from 'meteor/randyp:mats-common';


Template.import.events({
    'change .data_file_import': function (event, template) {
        event.preventDefault();
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            // Great success! All the File APIs are supported.
        } else {
            alert('The File APIs are not fully supported in this browser.');
        }
        var files = event.target.files;
        for (var i = 0, f; f = files[i]; i++) {
            var reader = new FileReader();
            reader.fileName = f.name;
            reader.onload = (function(f) {
                return function(e) {
                    var name = e.target.fileName;
                    try {
                        matsMethods.restoreFromFile({type:"graph", name:name, data:e.target.result}, function (error) {
                            if (error) {
                                setError(new Error(error.message));
                            }
                        });
                    } catch(exc) {
                        setError(new Error("Error reading file: " + name + " - "+ exc.toLocaleString()));
                    }
                };
            })(f);
            reader.readAsText(f);
        }
        document.getElementById("dataFileImport").value = "";
        $("#importModal").modal('hide');
        return false;
    },
    'change .graph_file_import': function (event, template) {
        event.preventDefault();
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            // Great success! All the File APIs are supported.
        } else {
            alert('The File APIs are not fully supported in this browser.');
        }
        var files = event.target.files;
        for (var i = 0, f; f = files[i]; i++) {
            var reader = new FileReader();
            reader.fileName = f.name;
            reader.onload = (function(f) {
                return function(e) {
                    var name = e.target.fileName;
                    try {
                        matsMethods.restoreFromFile({type:"graph", name:name, data:e.target.result}, function (error) {
                            if (error) {
                                setError(new Error(error.message));
                            }
                        });
                    } catch(exc) {
                        setError(new Error("Error reading file: " + name + " - "+ exc.toLocaleString()));
                    }
                };
            })(f);
            reader.readAsText(f);
        }
        document.getElementById("graphFileImport").value = "";
        $("#importModal").modal('hide');
        return false;
    },
    'change .parameter_file_import': function (event, template) {
        event.preventDefault();
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            // Great success! All the File APIs are supported.
        } else {
            alert('The File APIs are not fully supported in this browser.');
        }
        var files = event.target.files;
        for (var i = 0, f; f = files[i]; i++) {
            var reader = new FileReader();
            reader.fileName = f.name;
            reader.onload = (function (f) {
                return function (e) {
                    var name = e.target.fileName;
                    try {
                        var data = JSON.parse(e.target.result);
                       matsMethods.restoreFromParameterFile( {name:name, data:data}, function (error) {
                            if (error) {
                                setError(new Error(error.message));
                            }
                        });
                    } catch (exc) {
                        setError(new Error("Error reading file: " + name + " - " + exc.toLocaleString()));
                    }
                };
            })(f);
            reader.readAsText(f);
        }
        document.getElementById("parameterFileImport").value = "";
        $("#importModal").modal('hide');
        return false;
    }
});


