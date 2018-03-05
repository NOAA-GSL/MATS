graphMap = function(result) {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw,vph);

    var dataset = result.data;
    var options = result.options

    var defaultPoint = [39.834, -98.604];
    var defaultZoomLevel = 4;
    var minZoomLevel = 3;
    var maxZoomLevel = 10;
    var peerName = dataset.sites.name;

    var targetElement = document.getElementsByName(peerName)[0];
    if (!targetElement) {
        return;
    }
    var targetId = '#' + targetElement.id;
    var markers = dataset.sites;   // from app startup and queries
    var markerFeatures = {};
    var map = L.map("stationMap-Map", {
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

    var createIcon = function (m, color) {
        var options = m.options;
        var icon = L.divIcon({
            iconSize: new L.point(0, 0),  // get rid of default white box icon
            html: '<div style="border: none;' +
            'width:' + options.size + 'px;' +
            'height:' + options.size + 'px;' +
            'background-color:' + color + ';' +
            'border-radius:50%;">' +
            //'<b style="font-size: large">&nbsp;&nbsp;&nbsp;&nbsp;' + options.network + '</b>' +
            '</div>',
            options: options
        });
        return icon;
    };



    var createMarkers = function() {
        // clear the markers
        map.eachLayer(function (l) {
            if (l._icon) {
                map.removeLayer(l);
            }
        });
        for (var m = 0; m < markers.length; m++) {
            var markerPeerOption = markers[m].options.peerOption;
            var markerData = dataset[m];
            var markerStat = markerData[4];
            if (markerStat < 0) {
                var markerColor = "rgb(0,0,255)"
            } else if (markerStat > 0) {
                var markerColor = "rgb(255,0,0)"
            } else {
                var markerColor = "rgb(0,0,0)"
            }
            if (_.contains(peerOptions, markerPeerOption)) {
                var Icon = createIcon(markers[m], markerColor);
                var markerOptions = markers[m].options;
                var title = markerOptions.peerOption + ' - ' + markerOptions.title;
                var point = markers[m].point;
                var markerId = point[0] + ',' + point[1] + ':' + title;
                var features = {
                    Icon: Icon,
                    markerOptions: markerOptions,
                    markerPeerOption: markerPeerOption
                };

                var marker = new L.Marker(markers[m].point, {
                    icon: Icon,
                    title: markers[m].options.peerOption + ' - ' + markers[m].options.title,
                })//.on('click', function (event) {
                //        // toggle selection of corresponding site option for this marker
                //        toggleTargetSelection(event);
                //    }
                //);
                markerFeatures[markerId] = features;
                map.addLayer(marker);
            }
        }
    };

    var refresh = function () {
        createMarkers();
        var selectedValues = $('#' + peerId).val() ? $('#' + peerId).val() : [];
        // iterate through all the makers,
        // set the Icon
        $.each(map._layers, function (ml) {
            if (map._layers[ml]._latlng) {
                var lat = map._layers[ml]._latlng.lat;
                var lng = map._layers[ml]._latlng.lng;
                var point = [lat, lng];
                var marker = markers.filter(function (obj) {
                    return obj.point[0] === point[0] && obj.point[1] === point[1];
                })[0];
                if (marker !== undefined) {
                    var markerId = marker.point[0] + ',' + marker.point[1] + ':' + marker.options.peerOption + ' - ' + marker.options.title;
                    var mFeatures = markerFeatures[markerId];
                    map._layers[ml].setIcon(mFeatures.Icon);

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
    var ref = 'stationMap-Map';
    var elem = document.getElementById(ref);
    elem.addEventListener('resizeMap', function (e) {
        resizeMap(e.detail);
    });

    // register an event listener so that the select.js can ask the map div to refresh after a selection
    var ref = 'stationMap-Map';
    var elem = document.getElementById(ref);
    elem.addEventListener('refresh', function (e) {
        refresh(e.detail.refElement);
    });
    refresh();

};