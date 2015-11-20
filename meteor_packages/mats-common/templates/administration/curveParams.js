/**
 * Created by pierce on 8/13/15.
 */
Template.curveParams.onRendered(function () {
    reset();
});

Template.curveParams.helpers({
    curveParams : function() {
        if (Session.get('params') === undefined) {
            var params = CurveParams.find({}, {sort: {displayOrder:1}}).fetch();
            Session.set('params',params);
        }
        return Session.get('params');
    },
    optionRows: function() {
        var lastUpdate = Session.get('lastUpdate');
        var rows = "";
        // find the object in the session that is associated with the currently selected name
        var params = Session.get('params');
        if (params == undefined) {
            return "";
        }
        if (!document.getElementById('curveParams-selection') || document.getElementById('curveParams-selection') == "") {
            return "";
        }
        var paramSelectedName = document.getElementById('curveParams-selection').value;
        var param = params.filter(function ( obj ) {
            return obj.name === paramSelectedName;
        })[0];
        if (param == undefined) {
            return;
        }
        var optionsMap = param.optionsMap;
        if (optionsMap == undefined) {
            return "";
        }

        // create the options table rows
        var optionKeys = Object.keys(optionsMap);
        param.options = optionKeys;
        for (var i=0; i< optionKeys.length;i++){
            var optionList = optionsMap[optionKeys[i]];
            rows += '<tr><td contentEditable width="10%" style="min-width:3em;"><input data-field="optionsMap.' + optionKeys[i] + "_" + i + '" id="curveParams-option-' + i + '" class="form-control data-input textInput" type="text" value="' + optionKeys[i] + '"/></td>';
            for (var oli=0; oli<optionList.length;oli++) {
                rows += '<td contentEditable><textarea data-field="optionsMap.' + optionKeys[i]  + '_' + i + '['+ oli +']' + '" id="curveParams-optionList-' + i + '-' + oli + '" class="form-control data-input optionsTable"' + '<span style="font-size:x-small">' + optionList[oli] + '</textarea></td>';
            }
            rows += '<td><span><button id="curveParams-option-field-add-' + optionKeys[i] + '" class="option-field-add btn btn-xs btn-success fa fa-plus"/>';
            rows += '<button id="curveParams-option-field-del-' + optionKeys[i] + '" class="option-field-del btn btn-xs btn-danger fa fa-minus"/></span></td>';
            rows += "</tr>";
        }
        Session.set('params',params);
        return rows;
    },
    default: function() {
        try {
            var cname = document.getElementById("curveParams-selection").value;

            var c = Session.get('params').filter(function (obj) {
                return obj.name == cname;
            });
            if (c) {
                return c.default;
            }
            else {
                return "";
            }
        } catch(Exception) {
            return "";
        }
    },
    displayOrder: function() {
        try {
            var cname = document.getElementById("curveParams-selection").value;
            var c = Session.get('params').filter(function (obj) {
                return obj.name == cname;
            });

            if (c) {
                return c.displayOrder;
            }
            else {
                return 1;
            }
        } catch (Exception) {
            return 1;
        }
    },
    displayPriority:function() {
        try {
            var cname = document.getElementById("curveParams-selection").value;
            var c = Session.get('params').filter(function( obj ) {
                return obj.name == cname;
            });

            if (c) { return c.displayPriority; }
            else { return 1;}
        } catch (Exception) {
            return 1;
        }

    },
    displayGroup:function() {
    try {
        var cname = document.getElementById("curveParams-selection").value;

        var c = Session.get('params').filter(function( obj ) {
            return obj.name == cname;
        });

        if (c) { return c.displayGroup; }
        else { return 1;}
    } catch (Exception) {
        return 1;
    }

    },
    types: function() {
        return Object.keys(InputTypes);
    },
    errorMessage: function() {
        return Session.get("curveParamsErrorMessage");
    },
    errorTypeIs: function(errType) {
        return Session.get("curveParamsErrorType") === errType;
    },
    restoreDates: function() {
        //var saveSeconds = SavedCurveParams.find({},{clName:{$exists:false}});
        try {
            var scp = SavedCurveParams.findOne({'clName': 'changeList'});
            var cl = scp.changeList;
            var dates = [];
            for (var i = 0; i < cl.length; i++) {
                var utcSeconds = cl[i].savedAt;
                var comment = "<textarea id='ta-" + utcSeconds + "' style='display:none'>" + cl[i].comment + "</textarea>";
                var userName = cl[i].user.split('@')[0].replace('.',' ');
                var user = "<button id='btnUser-" + utcSeconds + "' class='btnUser btn  btn-info'>"+ userName + "</button>";
                var d = new Date(0);
                d.setUTCSeconds(utcSeconds);
                var mo = d.getMonth();
                var day = d.getDate();
                var yr = d.getFullYear();
                var hr = d.getHours();
                var mn = d.getMinutes();
                var sec = d.getSeconds();
                var dStr = mo + "-" + day + "-" + yr + "-" + hr + ":" + mn + ":" + sec;
                dates.push({second:utcSeconds, date:dStr, user:user, userName:userName, commentStr:cl[i].comment, comment:comment});
            }
            return dates;
        } catch (e) {
            return [];
        }
    },
    restoreDate: function() {
        try {
            var scp = SavedCurveParams.findOne({'clName': 'changeList'});
            var cl = scp.changeList;
            var utcSeconds = cl[cl.length - 1].savedAt;
            var user = cl[cl.length - 1].user.split('@')[0].replace('.', ' ');
            var comment = cl[cl.length - 1].comment;
            var d = new Date(0);
            d.setUTCSeconds(utcSeconds);
            var mo = d.getMonth();
            var day = d.getDate();
            var yr = d.getFullYear();
            var hr = d.getHours();
            var mn = d.getMinutes();
            var sec = d.getSeconds();
            return mo + "-" + day + "-" + yr + "-" + hr + ":" + mn + ":" + sec + " " + user + " ... " + comment;
        } catch (e){
            return "";
        }
    }
});

var reset = function(){
    document.getElementById("curveParams-name").value = "";
    document.getElementById("curveParams-type").value = "";
    document.getElementById("curveParams-controlButtonCovered-true").checked=true;
    document.getElementById("curveParams-controlButtonCovered-false").checked=false;
    document.getElementById("curveParams-controlButtonVisibility-block").checked=true;
    document.getElementById("curveParams-controlButtonVisibility-none").checked=false;
    document.getElementById("curveParams-unique-true").checked=false;
    document.getElementById("curveParams-unique-false").checked=true;
    document.getElementById("curveParams-default").value = "";
    document.getElementById("curveParams-displayOrder").value = 1;
    document.getElementById("curveParams-displayPriority").value = 1;
    document.getElementById("curveParams-displayGroup").value = 1;
    resetError();
};
var resetError = function() {
    errorMessage = "";
    Session.set("curveParamsErrorMessage","");
    Session.set("curveParamsErrorType","");
    if (document.getElementById("errorMessage")) {
        document.getElementById("errorMessage").style.display = "none";
    }
};
var setError = function(type,message) {
    Session.set("curveParamsErrorMessage", message);
    Session.set("curveParamsErrorType", type);
    document.getElementById("errorMessage").style.display = "block";
};

Template.curveParams.events({
    'click .curveParams-selection': function () {
        event.preventDefault();
        try {
            resetError();
            var cname = document.getElementById("curveParams-selection").value;
            reset();
            var params = Session.get('params');
            var c = params.filter(function (obj) {
                return obj.name == cname;
            })[0];  // want the first one - like collection.findOne({name:cname})
            if (!c) {
                return false;
            }
            document.getElementById("curveParams-name").value = c.name;
            document.getElementById("curveParams-type").value = c.type;
            if (c.controlButtonCovered) {
                document.getElementById("curveParams-controlButtonCovered-true").checked = true;
                document.getElementById("curveParams-controlButtonCovered-false").checked = false;
            } else {
                document.getElementById("curveParams-controlButtonCovered-true").checked = false;
                document.getElementById("curveParams-controlButtonCovered-false").checked = true;
            }
            if (c.controlButtonVisibility == "block") {
                document.getElementById("curveParams-controlButtonVisibility-block").checked = true;
                document.getElementById("curveParams-controlButtonVisibility-none").checked = false;
            } else {
                document.getElementById("curveParams-controlButtonVisibility-block").checked = false;
                document.getElementById("curveParams-controlButtonVisibility-none").checked = true;
            }
            document.getElementById("curveParams-default").value = c.default;
            document.getElementById("curveParams-displayOrder").value = c.displayOrder;
            document.getElementById("curveParams-displayPriority").value = c.displayPriority;
            document.getElementById("curveParams-displayGroup").value = c.displayGroup;
            Session.set('lastUpdate', Date.now());// force re-render to get the optionMap
        } catch (Exception) {console.log(Exception);}
        return false;
    },
    'click .curveParams-selection-add': function () {
        event.preventDefault();
        var dispOrder = 1;
        var dispPri = 1;
        var dispGroup = 1;
        var seconds = new Date() / 1000 | 0;
        var params = Session.get('params');
        var optionsMap = {};
        params.push({
            name: 'New-' + seconds,
            type: InputTypes.textInput,
            optionsMap: optionsMap,
            options: Object.keys(optionsMap),   // convenience
            controlButtonCovered: true,
            default: '',
            unique: false,
            controlButtonVisibility: 'block',
            displayOrder: dispOrder,
            displayPriority: dispPri,
            displayGroup: dispGroup
        });
        Session.set('params', params);
        return false;
    },
    'click .curveParams-selection-remove': function () {
        event.preventDefault();
        removeName = document.getElementById("curveParams-selection").value;
        var params = Session.get('params');
        var newParams = params.filter(function (value) {
            return value.name != removeName
        });
        Session.set('params', newParams);
        reset();
        return false;
    },
    'click .curveParams-option-add': function (event) {
        event.preventDefault();
        try {
            var params = Session.get('params');
            // find the object in the session that is associated with the currently selected name
            var paramSelectedName = document.getElementById('curveParams-selection').value;
            var param = params.filter(function ( obj ) {
                return obj.name === paramSelectedName;
            })[0];
            var optionsMap = param.optionsMap;
            var seconds = new Date() / 1000 | 0;
            optionsMap['new-' + seconds] = [];
            param.optionsMap = optionsMap;
            param.options = Object.keys(optionsMap);
            params[paramSelectedName] = param;
            Session.set('params',params);
        } catch (Exception){console.log(Exception);}
        return false;
    },
    'click .curveParams-option-remove': function (event) {
        event.preventDefault();
        try {
            var params = Session.get('params');
            // find the object in the session that is associated with the currently selected name
            var paramSelectedName = document.getElementById('curveParams-selection').value;
            var param = params.filter(function ( obj ) {
                return obj.name === paramSelectedName;
            })[0];
            var optionsMap = param.optionsMap;
            var optionSelected = Session.get('optionSelected');
            var selectedKey = "";
            if (optionSelected) {
                selectedKey = optionSelected.key;
            } else {
                var keys = Object.keys(optionsMap);
                selectedKey = keys[keys.length -1];
            }
            param.optionsMap = _.omit(optionsMap, selectedKey);
            param.options = Object.keys(optionsMap);
            params[paramSelectedName] = param;
            Session.set('params',params);
            Session.set('optionSelected',"");
        } catch (Exception){console.log(Exception);}
        return false;
    },
    'click .option-field-add': function (event) {
        event.preventDefault();
        try {
            var params = Session.get('params');
            // find the object in the session that is associated with the currently selected name
            var paramSelectedName = document.getElementById('curveParams-selection').value;
            var param = params.filter(function ( obj ) {
                return obj.name === paramSelectedName;
            })[0];
            var options = param.optionsMap;
            var optionSelected = Session.get('optionSelected');
            var selectedKey = undefined;
            if (optionSelected) {
                selectedKey = Session.get('optionSelected').key;
            }

            if (selectedKey === undefined || selectedKey === "") {
                selectedKey = event.target.id.replace('curveParams-option-field-add-','');
            }
            options[selectedKey].push('');
            param.optionsMap = options;
            params[paramSelectedName] = param;
            Session.set('params',params);
        } catch (Exception){console.log(Exception);}
        return false;
    },
    'click .option-field-del': function () {
        event.preventDefault();
        var params = Session.get('params');
        // find the object in the session that is associated with the currently selected name
        var paramSelectedName = document.getElementById('curveParams-selection').value;
        var param = params.filter(function ( obj ) {
            return obj.name === paramSelectedName;
        })[0];
        var options = param.optionsMap;
        var optionSelected = Session.get('optionSelected');
        var selectedKey = "";
        var listIndex = -1;
        if (optionSelected) {
            selectedKey = optionSelected.key;
            listIndex = optionSelected.listIndex;
        } else {
            var targetId = event.target.id;
            selectedKey = targetId.replace('curveParams-option-field-del-','');
        }
        if (options[selectedKey] && options[selectedKey].length > 0) {
            if (listIndex == -1) {
                options[selectedKey] = [];
            } else {
                options[selectedKey].splice(listIndex, 1);
            }
        }
        param.optionsMap = options;
        params[paramSelectedName] = param;
        Session.set('params',params);
        Session.set('optionSelected',"");
        return false;
    },
    'click .optionsTable' : function(event) {
      event.preventDefault();
      var targetId = event.target.id;
      if (targetId.indexOf('curveParams-option-') === 0) {
          var key = document.getElementById(event.target.id).value;
          var rowIndex = targetId.replace('curveParams-option-','');
          Session.set('optionSelected',{key:key,rowIndex:rowIndex,listIndex:-1});
      } else if (targetId.indexOf('curveParams-optionList-') === 0) {
          var indexStr = targetId.replace('curveParams-optionList-','');
          var indexes = indexStr.split('-');
          var rowIndex = indexes[0];
          var listIndex = indexes[1];
          var key = document.getElementById('curveParams-option-' + rowIndex).value;
          Session.set('optionSelected',{key:key,rowIndex:rowIndex,listIndex:listIndex});
        }
        return false;
    },
    'click .applyCurveParamsWithComment': function () {
        // actually do the apply
        event.preventDefault();
        // first backup the existing parameters
        Meteor.call('getUserAddress', function (error, result) {
            if (error !== undefined) {
                setError(error.toLocaleString());
                return false;
            }

            var emailAddress = result;
            // save the current settings and mark comment as prior to
            var saveSecond = new Date() / 1000 | 0;
            var comment = document.getElementById('applyCurveParamsComment').value;
            var paramsCursor = CurveParams.find({});
            var cl = SavedCurveParams.findOne({'clName':'changeList'},{_id:1});
            if (cl === undefined) {
                SavedCurveParams.insert({clName: 'changeList', changeList:[]});
                cl = SavedCurveParams.findOne({'clName':'changeList'},{_id:1});
            }
            var id = cl._id;
            SavedCurveParams.update({_id:id},{$push:{changeList:{user: emailAddress, comment: "prior to ..." + comment, savedAt: saveSecond}} });
            paramsCursor.forEach(function(doc) {
                delete doc._id;
                doc.savedSecond = saveSecond;
                SavedCurveParams.insert(doc);
            });

            // now reconcile the session values and the CurveParams collection
            resetError();
            var params = Session.get('params');
            var curveParams = CurveParams.find({}).fetch();
            var paramNames = _.pluck(params,'name');
            var curveParamNames =  _.pluck(curveParams,'name');

            // find any superfluous params in CurveParams (this is a remove) and remove them from collection
            var namesToRemoveFromCollection =  paramNames.filter( function( el ) {
                return curveParamNames.indexOf( el ) < 0;
            });
            for (var i=0; i < namesToRemoveFromCollection.length; i++) {
                var rName = namesToRemoveFromCollection[i];
                var cParam = CurveParams.findOne({name:rName});
                var cid = cParam._id;
                CurveParams.remove({_id:cid});
            }

            // iterate all the params in the session and overwrite/insert them
            for (var pi=0; pi < paramNames.length; pi++) {
                var paramName = paramNames[pi];
                var param = params.filter(function ( obj ) {
                    return obj.name === paramName;
                })[0];

                var curveParam = CurveParams.findOne({name:paramName});
                if (curveParam) {
                    // update
                    var cid = curveParam._id;
                    delete param._id;
                    CurveParams.update({_id:cid},{$set:param});
                } else {
                    //insert
                    CurveParams.insert(param);
                }
            }

            // now save the settings after modification
            saveSecond = saveSecond + 1;
            paramsCursor = CurveParams.find({});
            cl = SavedCurveParams.findOne({'clName':'changeList'},{_id:1});
            id = cl._id;
            SavedCurveParams.update({_id:id},{$push:{changeList:{user: emailAddress, comment: "post ..." + comment, savedAt: saveSecond}} });
            paramsCursor.forEach(function(doc) {
                delete doc._id;
                doc.savedSecond = saveSecond;
                SavedCurveParams.insert(doc);
            });

            reset();
            // read the params back out from the DB and set them into the Session (resets the form)
            params = CurveParams.find({}, {sort: {displayOrder:1}}).fetch();
            Session.set('params',params);
            Session.set('lastUpdate', Date.now());// force re-render to get the optionMap
            $("#applyCurveParamsModal").modal('hide');
        });
        return false;
    },
    'click .cancel-curveParams': function() {
        event.preventDefault();
        reset();
        var params = CurveParams.find({}, {sort: {displayOrder:1}}).fetch();
        Session.set('params',params);
        document.getElementById("curveParams-selection").value = "";
        Session.set('lastUpdate', Date.now());// force re-render to get the optionMap
        return false;
    },
    'click .applyCurveParams': function() {
        // show the apply modal dialogue
        event.preventDefault();

        $("#applyCurveParamsModal").modal('show');
        return false;
    },
    'click .restoreCurveParams': function() {
        event.preventDefault();
        $("#restoreCurveParamsModal").modal('show');
        return false;
    },
    'click .btnUser': function(event) {
        event.preventDefault();
        var targetId = event.target.id;
        var taId = targetId.replace('btnUser-','ta-');
        if (document.getElementById(taId).style.display=='block'){
            document.getElementById(taId).style.display='none'
        }else{
            document.getElementById(taId).style.display='block'
        }
        return false;
    },
    'click .restoreCurveParamsDate': function(event) {
        //populate input restoreFromSeconds input box with selected value and data attributes
        event.preventDefault();
        var targetId = event.target.id;
        var elem = document.getElementById(targetId);
        var second = elem.getAttribute('data-second');
        var date = elem.getAttribute('data-date');
        var user = elem.getAttribute('data-user');
        var comment = elem.getAttribute('data-comment');

        var rfd = document.getElementById('restoreFromSeconds');
        rfd.setAttribute('data-second',second);
        rfd.setAttribute('data-date',date);
        rfd.setAttribute('data-user',user);
        rfd.setAttribute('data-comment',comment);
        rfd.value = date + " " + user + " ... " + comment;
        document.getElementById("restore-choose-date-toggle").click();
        return false;
    },
    'click .restoreCurveParamsFromDate': function(event) {
        // copy all dated elements with the selected savedSecond back to curveParams
        event.preventDefault();
        var restoreFromSeconds = document.getElementById("restoreFromSeconds");
        var savedSecond = restoreFromSeconds.getAttribute('data-second');
        var savedParams = SavedCurveParams.find({'savedSecond':Number(savedSecond)});
        savedParams.forEach(function(doc) {
            delete doc._id;
            delete doc.savedSecond;
            var name = doc.name;
            var curveParam = CurveParams.findOne({name:name});
            var id = curveParam._id;
            CurveParams.update({_id:id},{$set:doc});
        });
        Session.set('lastUpdate', Date.now());// force re-render
        $("#restoreCurveParamsModal").modal('hide');
        return false;
    },
    'click .cancel-restoreCurveParamsFromDate': function(event) {
        // copy all dated elements with the selected savedSecond back to curveParams
        event.preventDefault();
        $("#restoreCurveParamsModal").modal('hide');
        return false;
    },
    'change': function(event) {
        // should catch all the widgets whenever a change happens.
        // This is where we capture changes and move them to the session.
        // When the apply is hit a different event listener will migrate the modified
        // session settings to the collection.
        event.preventDefault();
        var params = Session.get('params');
        var targetId = event.target.id;
        if (targetId == "curveParams-selection") {
            // ignore changes to the main selector
            return false;
        }

        var elem = document.getElementById(targetId);
        var value = elem.value;

        // find the object in the session that is associated with the currently selected name
        var paramSelectedName = document.getElementById('curveParams-selection').value;
        var param = params.filter(function ( obj ) {
            return obj.name === paramSelectedName;
        })[0];

        // each curveParameter is made up of several fields...
        // the name, type, optionsMap, options (is derived from optionsMap), controlButtonCovered, unique, default, controlButtonVisibility, displayOrder, displayPriority, and displayGroup
        // Which of these is captured by an element is set in the data-field attribute.
        var dataField = elem.getAttribute('data-field');
        if (!dataField) { return false;}
        if (dataField.indexOf('optionsMap') == 0) {
            // For an optionsMap the dataField is a cell in the optionsMap table.
            // If it is the first column it is something like optionsMap.RH_n   i.e. RH is the value of the leftmost cell
            // and RH is also a key of the params.optionsMap object. n is the row that the key is in.
            // If it is the second column it is something like optionsMap.RH_n[0].
            // That is because the in memory representation (params.optionsMap object) uses the value of the first column to
            // denote a hashmap key, and the rest of the columns are contained in a list starting
            // with index 0 at the left of the table.
            // like .. key:[col2,col3,....coln], so it might be...
            // optionsMap.RH:[0,1..n] to denote the rest of a row.
            //NOTE: we trim the keys but not the other cell values - they might contain necessary white space.
            var keyParts = dataField.replace('optionsMap.','').split('_');
            var key = keyParts[0];

            var optionsMap = param.optionsMap;
            if (keyParts[1].indexOf('[') !== -1) {
                // this is a key and list index
                var index = keyParts[1].split('[')[1].replace(']','');
                optionsMap[key][index] = value;
            } else {
                //  we are essentially renaming the key to new value and deleting the old key
                value = value.trim();   // trim the whitespace from both ends
                if (key != value) { // don't do it if it is somehow the same.
                    Object.defineProperty(optionsMap, value, Object.getOwnPropertyDescriptor(optionsMap, key));
                    delete optionsMap[key];
                }
            }
            // optionsMap has been changed...
            param.optionsMap = optionsMap;
            param.options = Object.keys(optionsMap);
        } else {
            // regular field - just set the value
            param.field = value;
        }
        //console.log ("change:  value:" + value + "\n  field: " + dataField + "\n  paramSelectedName " + paramSelectedName + "  \n param: \n" + JSON.stringify(param));
        Session.set('params',params);
        Session.set('lastUpdate', Date.now());// force re-render to get the optionMap
        return false;
    }
});


