Template.numberSpinner.helpers({
    min: function() {
        //default
        return this.min;
    },
    max: function() {
        //default
        return this.max;
    },
    step: function() {
        //default
        return this.step;
    }
});

Template.numberSpinner.rendered = function () {
// register an event listener so that the select.js can ask the map div to refresh after a selection
    var optionsMap = this.data.optionsMap;
    var ref = this.data.name + '-' + this.data.type;
    var refValueDisplay = "controlButton-" + this.data.name + "-value";
    var dispElem = document.getElementById(refValueDisplay);
    var elem = document.getElementById(ref);

    var refresh = function(superiorSelection) {
        var min = optionsMap[superiorSelection].min;
        var max = optionsMap[superiorSelection].max;
        var step = optionsMap[superiorSelection].step;
        var displayDefault = optionsMap[superiorSelection].default;
        elem.setAttribute("min", min);
        elem.setAttribute("max",max);
        elem.setAttribute("step",step);
        dispElem.textContent = displayDefault;
        elem.value = displayDefault;
    };

    elem.addEventListener('refresh', function (e) {
        var superiorElement = e.detail.refElement;
        var superiorSelection = superiorElement.options[superiorElement.selectedIndex].text;
        refresh(superiorSelection);
    });
};
