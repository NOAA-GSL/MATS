var selectedDescriptor = null;
Template.numberSpinner.helpers({
    min: function() {
        return this.optionsMap[selectedDescriptor].min;
    },
    max: function() {
        return this.optionsMap[selectedDescriptor].max;
    },
    step: function() {
        return this.optionsMap[selectedDescriptor].step;
    }
});

Template.numberSpinner.rendered = function () {
// register an event listener so that the select.js can ask the map div to refresh after a selection
    var optionsMap = this.data.optionsMap;
    var ref = this.data.name + '-' + this.data.type;
    var refValueDisplay = "controlButton-" + this.data.name + "-value"
    var elem = document.getElementById(ref);
    var superiorName = this.data.superiorName;
    var refresh = function(descriptor) {
        var min = optionsMap[descriptor].min;
        var max = optionsMap[descriptor].max;
        var step = optionsMap[descriptor].step;
        var displayDefault = optionsMap[descriptor].default;
        console.log("descriptor is " + descriptor + " min " + min + " max " + max + " step " + step);
        elem.setAttribute("min", min);
        elem.setAttribute("max",max);
        elem.setAttribute("step",step);
        document.getElementById(refValueDisplay).textContent = displayDefault;
    }

    elem.addEventListener('refresh', function (e) {
        var superiorElement = e.detail.refElement;
        selectedDescriptor = superiorElement.options[superiorElement.selectedIndex].text;
        refresh(selectedDescriptor);
    });
};
