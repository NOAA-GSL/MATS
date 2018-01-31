var mapWidth = function () {
    var w = Math.round(Math.max(document.documentElement.clientWidth, window.innerWidth || 0) * .9);
    return w + "px";
};
var mapHeight = function () {
    var h = Math.round(Math.max(document.documentElement.clientHeight, window.innerWidth || 0) * .5);
    return h + "px";
};

Template.map.onRendered(function () {
    var defaultPoint = this.data.defaultMapView.point;
    var defaultZoomLevel = this.data.defaultMapView.zoomLevel;
    var minZoomLevel = this.data.defaultMapView.minZoomLevel;
    var maxZoomLevel = this.data.defaultMapView.maxZoomLevel;
    var peerName = this.data.peerName;

    var targetElement = document.getElementsByName(peerName)[0];
    if (!targetElement) {
        return;
    }
    var targetId = '#' + targetElement.id;
    var markers = this.data.optionsMap;   // from app startup
    var markerFeatures = {};
    var map = L.map(this.data.name + "-" + this.data.type, {
        doubleClickZoom: false,
        scrollWheelZoom: false,
        trackResize:true,
        zoomControl:true,
        minZoom: minZoomLevel,
        maxZoom: maxZoomLevel,
        wheelPxPerZoomLevel: 3
    }).setView(defaultPoint, defaultZoomLevel);
    // visit https://leaflet-extras.github.io/leaflet-providers/preview/ if you want to choose something different
//    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
//        attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
//        maxZoom: 16}).addTo(map);
//    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.{ext}', {
//        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
//        subdomains: 'abcd',
//        minZoom: 0,
//        maxZoom: 20,
//        ext: 'png'
//    }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(map);
    L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';
    if (!markerFeatures) {
        markerFeatures = {};
    }
    
    var createUnSelectedIcon = function (m) {
        var options = m.options;
        var icon = L.divIcon({
            iconSize: new L.point(0, 0),  // get rid of default white box icon
            html: '<div style="border: none;' +
            'width:' + options.size + 'px;' +
            'height:' + options.size + 'px;' +
            'background-color:' + options.color + ';' +
            'border-radius:50%;">' +
            //'<b style="font-size: large">&nbsp;&nbsp;&nbsp;&nbsp;' + options.network + '</b>' +
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
            //'<b style="font-size: large"> &nbsp;&nbsp;&nbsp;&nbsp;' + options.network + '</b>' +
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
        // set the selected value(s) of the peer
        $(targetId).val(selectedValues);
        // trigger the change event on the peer
        $(targetId).trigger("change");
        marker.setIcon(icon);
    };



    var refreshMarkersForPeer = function(peerElement) {
        // find out what peer options are available
        var peerOptions = [];
         if (peerElement.options) {
             for (var i = 0; i < peerElement.options.length; i++) {
                 peerOptions.push(peerElement.options[i].text);
             }

             // clear the markers
             map.eachLayer(function (l) {
                 if (l._icon) {
                     map.removeLayer(l);
                 }
             });
         }
            for (var m = 0; m < markers.length; m++) {
                var markerPeerOption = markers[m].options.peerOption;
                if (_.contains(peerOptions, markerPeerOption)) {
                    var unSelectedIcon = createUnSelectedIcon(markers[m]);
                    var selectedIcon = createSelectedIcon(markers[m]);
                    var markerOptions = markers[m].options;
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
                        title: markers[m].options.peerOption + ' - ' + markers[m].options.title,
                    }).on('click', function (event) {
                            // toggle selection of corresponding site option for this marker
                            toggleTargetSelection(event);
                        }
                    );
                    markerFeatures[markerId] = features;
                    map.addLayer(marker);
                }
            }
    };

    var refresh = function (peerElement) {
        if (!peerElement) {
            return;
        }
        var peerId = peerElement.id;
        refreshMarkersForPeer(peerElement);
        var selectedValues = $('#' + peerId).val() ? $('#' + peerId).val() : [];
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
        //$('#mapModal').on('show.bs.modal', function(){
        //    setTimeout(function() {
        //        map.invalidateSize();
        //    }, 10);
        //});
        var ref = what.data.name + '-' + what.data.type;
        var elem = document.getElementById(ref);
        //elem.style.height = mapHeight();
        //elem.style.width = mapWidth();
        elem.style.height = '500px';
        elem.style.width = '875px';
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
    refresh(targetElement);

});
