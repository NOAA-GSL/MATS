var mapWidth = function () {
    var w = Math.round(Math.max(document.documentElement.clientWidth, window.innerWidth || 0) * .9);
    return w + "px";
};
var mapHeight = function () {
    var h = Math.round(Math.max(document.documentElement.clientHeight, window.innerWidth || 0) * .5);
    return h + "px";
};

Template.map.rendered = function () {
    var defaultPoint = this.data.defaultMapView.point;
    var defaultZoomLevel = this.data.defaultMapView.zoomLevel;
    var minZoomLevel = this.data.defaultMapView.minZoomLevel;
    var maxZoomLevel = this.data.defaultMapView.maxZoomLevel;
    var peerName = this.data.peerName;
    var targetElement = document.getElementsByName(peerName)[0];
    var targetId = '#' + targetElement.id;
    var markers = this.data.optionsMap.model;   // from app startup
    var markerFeatures = {};
    var map = L.map(this.data.name + "-" + this.data.type, {
        doubleClickZoom: true,
        minZoom: minZoomLevel,
        maxZoom: maxZoomLevel
    }).setView(defaultPoint, defaultZoomLevel);
    // visit https://leaflet-extras.github.io/leaflet-providers/preview/ if you want to choose something different
    L.tileLayer.provider('Thunderforest.Outdoors').addTo(map);

    var createUnSelectedIcon = function (m) {
        var options = m.options;
        var icon = L.divIcon({
            iconSize: new L.point(0, 0),  // get rid of default white box icon
            html: '<div style="border: none;' +
            'width:' + options.size + 'px;' +
            'height:' + options.size + 'px;' +
            'background-color:' + options.color + ';' +
            'border-radius:50%;">' +
            '<b style="font-size: large">&nbsp;&nbsp;&nbsp;&nbsp;' + options.network + '</b>' +
            '</div>',
            options: options
        });
        return icon;
    };

    var createSelectedIcon = function (m) {
        var options = m.options;
        var icon = L.divIcon({
            iconSize: new L.point(0, 0),  // get rid of default white box icon
            html: '<div style="box-shadow: 0 0 0 ' + options.size / 2 + 'px ' + options.highLightColor + ';' +
            'border: none;' +
            'width:' + options.size + 'px;' +
            'height:' + options.size + 'px;' +
            'background-color:' + options.color + ';' +
            'border-radius:50%;">' +
            '<b style="font-size: large"> &nbsp;&nbsp;&nbsp;&nbsp;' + options.network + '</b>' +
            '</div>',
            options: options
        });
        return icon;
    };

    var toggleTargetSelection = function (event) {
        var marker = event.target;
        var markerId = event.latlng.lat + ',' + event.latlng.lng + ':' + event.target.options.title;
        var mFeatures = markerFeatures[markerId];
        var icon = mFeatures.unSelectedIcon;
        var peerOption = mFeatures.markerPeerOption;
        var selectedValues = $(targetId).val() ? $(targetId).val() : [];
        var ALLIndex = selectedValues.indexOf("All");
        if (ALLIndex > -1) {
            selectedValues.splice(ALLIndex, 1);
        }
        var index = selectedValues.indexOf(peerOption);
        if (index > -1) {
            // toggle off
            icon = mFeatures.unSelectedIcon;
            selectedValues.splice(index, 1);
        } else {
            //toggle on
            icon = mFeatures.selectedIcon;
            selectedValues.push(peerOption);
        }
        $(targetId).val(selectedValues);
        marker.setIcon(icon);
    };

    L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';

    if (!markerFeatures) {
        markerFeatures = {};
    }
    for (var m = 0; m < markers.length; m++) {
        var unSelectedIcon = createUnSelectedIcon(markers[m]);
        var selectedIcon = createSelectedIcon(markers[m]);
        var markerOptions = markers[m].options;
        var markerPeerOption = markerOptions.peerOption;
        var title = markerOptions.title;
        var point = markers[m].point;
        var markerId = point[0] + ',' + point[1] + ':' + title;
        var features = {
            unSelectedIcon: unSelectedIcon,
            selectedIcon: selectedIcon,
            markerOptions: markerOptions,
            markerPeerOption: markerPeerOption
        };

        var marker = new L.Marker(markers[m].point, {
            icon: unSelectedIcon,
            title: markers[m].options.title,
        }).on('click', function (event) {
                // toggle selection of corresponding site option for this marker
                toggleTargetSelection(event);
            }
        );
        markerFeatures[markerId] = features;
        map.addLayer(marker);
    }

    var refresh = function (peerElement) {
        var peerId = peerElement.id;
        var selectedValues = $('#' + peerId).val() ? $('#' + peerId).val() : [];
        var ALLIndex = selectedValues.indexOf("All");
        if (ALLIndex > -1) {
            //everything needs to be selected;
            var peerIdOption = peerId + " option";
            selectedValues = $('#' + peerIdOption).map(function () {
                return $(this).val();
            });
            
            ALLIndex = selectedValues.indexOf("All");
            selectedValues.splice(ALLIndex, 1);
        }
        // iterate through all the makers,
        // set the selectedIcon if they are selected in the peer
        // set the unSelectedIcon if they are not selected in the peer
        $.each(map._layers, function (ml) {
            if (map._layers[ml]._latlng) {
                var lat = map._layers[ml]._latlng.lat;
                var lng = map._layers[ml]._latlng.lng;
                var point = [lat, lng];
                var marker = markers.filter(function (obj) {
                    return obj.point[0] === point[0] && obj.point[1] === point[1];
                })[0];
                if (marker !== undefined) {
                    var peerOption = marker.options.peerOption;
                    var markerId = marker.point[0] + ',' + marker.point[1] + ':' + marker.options.title;
                    var mFeatures = markerFeatures[markerId];
                    if (_.contains(selectedValues, peerOption)) {
                        map._layers[ml].setIcon(mFeatures.selectedIcon);
                    } else {
                        map._layers[ml].setIcon(mFeatures.unSelectedIcon);
                    }
                }
            }
        });
    };

    var resizeMap = function (what) {
        map.invalidateSize();   // really important....
        var ref = what.data.name + '-' + what.data.type;
        var elem = document.getElementById(ref);
        elem.style.height = mapHeight();
        elem.style.width = mapWidth();
    };
    // initial resize seems to be necessary
    resizeMap(this);
    // register an event listener so that the item.js can ask the map div to resize after the map div becomes visible
    var ref = this.data.name + '-' + this.data.type;
    var elem = document.getElementById(ref);
    elem.addEventListener('resizeMap', function (e) {
        resizeMap(e.detail);
    });

    // register an event listener so that the select.js can ask the map div to refresh after a selection
    var ref = this.data.name + '-' + this.data.type;
    var elem = document.getElementById(ref);
    elem.addEventListener('refresh', function (e) {
        refresh(e.detail.refElement);
    });
};
