
    //Template.export.rendered = function() {
    //    Meteor.call('getDataFunctionFileList', function (error, result) {
    //        //    //console.log ('result is : ' + JSON.stringify(result, null, '\t'));
    //        if (error !== undefined) {
    //            setError(error.toLocaleString());
    //            return false;
    //        }
    //        Session.set('dataFunctionFileList',result);
    //    });
    //    Meteor.call('getGraphFunctionFileList', function (error, result) {
    //        //    //console.log ('result is : ' + JSON.stringify(result, null, '\t'));
    //        if (error !== undefined) {
    //            setError(error.toLocaleString());
    //            return false;
    //        }
    //        Session.set('graphFunctionFileList',result);
    //    });
    //
    //};

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
            data.CurveParams = CurveParams.find({}).fetch();
            data.PlotParams = PlotParams.find({}).fetch();
            data.PlotGraphFunctions = PlotGraphFunctions.find({}).fetch();
            data.Settings = Settings.find({}).fetch();
            data.ColorScheme = ColorScheme.find({}).fetch();
            data.Authorization = Authorization.find({}).fetch();
            data.Roles = Roles.find({}).fetch();
            data.Databases = Databases.find({}).fetch();
            data.Credentials = Credentials.find({}).fetch();
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
                Meteor.call('readFunctionFile','data',file, function (error, result) {
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
                Meteor.call('readFunctionFile','graph', file, function (error, result) {
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

