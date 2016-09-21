import {matsCollections} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';


Template.export.rendered = function() {
       matsMethods.getDataFunctionFileList.call( function (error, result) {
           //    //console.log ('result is : ' + JSON.stringify(result, null, '\t'));
           if (error !== undefined) {
               setError("matsMethods.getDataFunctionFileList from template export error: " + error.toLocaleString());
               return false;
           }
           Session.set('dataFunctionFileList',result);
       });
       matsMethods.getGraphFunctionFileList.call(function (error, result) {
           //    //console.log ('result is : ' + JSON.stringify(result, null, '\t'));
           if (error !== undefined) {
               setError("matsMethods.graphFunctionFileList from export.js error: " + error.toLocaleString());
               return false;
           }
           Session.set('graphFunctionFileList',result);
       });

    };

    Template.export.helpers({
        dataFiles: function() {
            return Session.get('dataFunctionFileList');
        },
        graphFiles: function() {
            return Session.get('graphFunctionFileList');
        }
    });

    Template.export.events({
    'click .apply_export': function (event) {
        event.preventDefault();
        var parameterOut = document.getElementById('parameterFile').checked;
        var dataFiles = [];
        var graphFiles = [];
        $("input:checkbox[name=dataFiles]:checked").each(function(){
            dataFiles.push($(this).val());
        });
        $("input:checkbox[name=graphFiles]:checked").each(function(){
            graphFiles.push($(this).val());
        });
        if(parameterOut) {
            var data = {};
            data.CurveParams = matsCollections.CurveParams.find({}).fetch();
            data.PlotParams = matsCollections.PlotParams.find({}).fetch();
            data.PlotGraphFunctions = matsCollections.PlotGraphFunctions.find({}).fetch();
            data.Settings = matsCollections.Settings.find({}).fetch();
            data.ColorScheme = matsCollections.ColorScheme.find({}).fetch();
            data.Authorization = matsCollections.Authorization.find({}).fetch();
            data.Roles = matsCollections.Roles.find({}).fetch();
            data.Databases = matsCollections.Databases.find({}).fetch();
            data.Credentials = matsCollections.Credentials.find({}).fetch();
            var json = JSON.stringify(data, null, 2);
            var blob = new Blob([json], {type: "application/json"});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.download = "export.json";
            a.href = url;
            a.target = '_blank';
            a.textContent = "export.json";
            document.body.appendChild(a);
            a.click();
        }

        if (dataFiles.length > 0) {
            dataFiles.forEach(function(file){
                methods.readFunctionFile('data',file, function (error, result) {
                    if (error !== undefined) {
                        setError(error.toLocaleString());
                        return false;
                    }
                    data = result;
                    var blob = new Blob([result], {type: "application/javascript"});
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.download = file;
                    a.href = url;
                    a.target = '_blank';
                    a.textContent = file;
                    document.body.appendChild(a);
                    a.click();
                });
            });
        }

        if (graphFiles.length > 0) {
            graphFiles.forEach(function(file){
                methods.readFunctionFile('graph', file, function (error, result) {
                    if (error !== undefined) {
                        setError(error.toLocaleString());
                        return false;
                    }
                    data = result;
                    var blob = new Blob([result], {type: "application/javascript"});
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.download = file;
                    a.href = url;
                    a.target = '_blank';
                    a.textContent = file;
                    document.body.appendChild(a);
                    a.click();
                });
            });
        }

        $("#exportModal").modal('hide');
        return false;
    }
});

