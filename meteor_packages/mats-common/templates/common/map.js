var mapWidth = function () {
    var w = Math.round(Math.max(document.documentElement.clientWidth, window.innerWidth || 0) * .9);
    return w + "px";
};
var mapHeight = function () {
    var h = Math.round(Math.max(document.documentElement.clientHeight, window.innerWidth || 0) * .5);
    return h + "px";
};


Template.map.rendered = function () {

    var createIcon = function (m) {
        var options = m.options;
        var icon = L.divIcon({
            html: '<div style="border: none;width:' + options.size + 'px;height:' + options.size + 'px;background-color:' + options.color + ';border-radius:50%;"><b>' + options.title + '</b></div>',
            options: options
        });
        return icon;
    };


    var createSelectedIcon = function (m) {
        var options = m.options;
        var icon = L.divIcon({
            html: '<div style="box-shadow: 0 0 0 10px black;border: none;width:' + options.size + 'px;height:' + options.size + 'px;background-color:' + options.color + ';border-radius:50%;"><b>' + options.network + '</b></div>',
            options: options
        });
        return icon;
    };

    L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';
    var defaultPoint = this.data.defaultMapView.point;
    var defaultZoomLevel = this.data.defaultMapView.zoomLevel;
    var targetName = this.data.targetName;
    var targetElement = document.getElementsByName(targetName)[0];
    var targetId = '#' + targetElement.id;
    var toggleTargetSelection = function(targetOption) {
        var selectedValues = $(targetId).val();
        if (selectedValues) {
            var ALLIndex = selectedValues.indexOf("All");

            if (ALLIndex > -1) {
                selectedValues.splice(ALLIndex, 1);
            }
            var index = selectedValues.indexOf(targetOption);
            if (index > -1) {
                // toggle off
                selectedValues.splice(index, 1);
            } else {
                //toggle on
                selectedValues.push(targetOption);
            }
        } else {
            selectedValues = [];
            selectedValues.push(targetOption);
        }
        $(targetId).val(selectedValues);
    }

    var map = L.map(this.data.name + "-" + this.data.type, {
        doubleClickZoom: false
    }).setView(defaultPoint, defaultZoomLevel);

    L.tileLayer.provider('Thunderforest.Outdoors').addTo(map);

    var markers = this.data.optionsMap.default;
    for (var m = 0; m < markers.length; m++) {
        var marker = new L.Marker(markers[m].point, {
            icon: createIcon(markers[m]),
            //selectedIcon: createSelectedIcon(markers[m]),
            title: markers[m].options.title,
        }).on('click', function (event) {
                //event.target.setIcon(event.target.selectedIcon);
                // toggle selection of corresponding site option for this marker
                toggleTargetSelection(event.target.options.icon.options.options.targetOption);
            }
        );

        map.addLayer(marker);

        // L.marker(markers[m].point,{title: markers[m].options.title}).addTo(map)
        //     .on('click', function(event) {
        //         //console.log('you clicked on ' + event);
        //         //alert('you clicked on ' + event.target.options.title);
        //     });
    }
    var resizeMap = function (what) {
        map.invalidateSize();   // really important....
        var ref = what.data.name + '-' + what.data.type;
        var elem = document.getElementById(ref);
        elem.style.height = mapHeight();
        elem.style.width = mapWidth();
    }

    resizeMap(this);
    // register an event listener so that the item.js can ask the map div to resize after the map div becomes visible
    var ref = this.data.name + '-' + this.data.type;
    var elem = document.getElementById(ref);
    elem.addEventListener('resizeMap', function (e) {
        resizeMap(e.detail);
    });
};

Template.map.helpers({
    mapWidth: function () {
        return mapWidth();
    },
    mapHeight: function () {
        return mapHeight();
    }
});

