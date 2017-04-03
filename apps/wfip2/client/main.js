import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';


// this must be global
//plotParamHandler will be sent any click event from the plotParamGroup template click handler

let setMatchName = function (matchName) {
    var matchName = "";
    const matchParam = matsParamUtils.getParameterForName('matchFormat');
    const options = matchParam.options;
    for (var i = 0; i < options.length; i++) {
        var id = matchParam.name + "-" + matchParam.type + "-" + options[i];
        if ($("#" + id).is(':checked') === true) {
            if (matchName === "") {
                matchName = "match by " + options[i];
            } else {
                matchName += ", " + options[i];
            }
        }
    }
    console.log("in client appEventHandler matchName: ", matchName);
    Session.set('matchName', matchName);
};

plotParamHandler = function (event) {
    // only dealing with matchFormat checkboxes
    if (event.target.form && event.target.form.name === "plotForm") {
        // only handle plotForm events - ignore the rest
        if (event.target.id.startsWith("matchFormat")) {
            setMatchName();
        }
    }
};

