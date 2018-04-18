graphMap = function(result) {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    if (vpw < 400) {
        vpw = (.9 * vpw).toString() + "px";
    } else {
        vpw = (.8 * vpw).toString() + "px";
    }
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    if (vph < 400) {
        vph = (.8 * vph).toString() + "px";
    } else {
        vph = (.6 * vph).toString() + "px";
    }


    var dataset = result.data;
    var options = result.options

    var defaultPoint = [39.834, -98.604];
    var defaultZoomLevel = 5;
    var minZoomLevel = 3;
    var maxZoomLevel = 10;
    var peerName = dataset[0].sites[0].name;

    var markers = dataset[0].sites;   // from app startup and queries
    var markerFeatures = {};

    //document.getElementById('graphView').innerHTML = "<div id='map'></div>";


    function buildMap(vpw, vph) {
        document.getElementById('graphView').innerHTML = "<div id='finalMap' style='float:left;width:0;height:0;'></div><div id='placeholder' style='float:left;width:0; height:0;display='none'></div>";
        document.getElementById('finalMap').style.width = vpw;
        document.getElementById('finalMap').style.height = vph;
        var map = new L.map('finalMap', {
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
//        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
//            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
//            maxZoom: 16
//        }).addTo(map);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri',
            maxZoom: 13
        }).addTo(map);
        L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';

        return map;
    }

    map = buildMap(vpw, vph);

    if (!markerFeatures) {
        markerFeatures = {};
    }

    var createIcon = function (m, color, label) {
        var options = m.options;
        var icon = L.divIcon({
            iconSize: new L.point(0, 0), // get rid of default white box icon
            html: label,//'<div style="border: none;' +
            //'width:' + options.size + 'px;' +
            //'height:' + options.size + 'px;' +
            //'background-color:' + color + ';' +
            //'border-radius:50%;">' +
            //'<b style="font-size: large">&nbsp;&nbsp;&nbsp;&nbsp;' + options.network + '</b>' +
            //'</div>',
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
            var markerData = dataset[0].data[m];
            var markerStat = markerData[0][4];
            var markerInt = (markerStat | 0);
            //var markerStat = markerData[0][4];
            var markerLabel = markerInt.toString();
            var markerPopUp = markerData[1];
            if (markerStat <= -1) {
                var markerColor = "rgb(0,0,255)"
                var markerLabelFinal = markerLabel.fontcolor("blue");
            } else if (markerStat >= 1) {
                var markerColor = "rgb(255,0,0)"
                var markerLabelFinal = markerLabel.fontcolor("red");
            } else {
                var markerColor = "rgb(0,0,0)"
                var markerLabelFinal = markerLabel.fontcolor("black");
            }

            var Icon = createIcon(markers[m], markerColor, markerLabelFinal.bold());
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
            })
            marker.bindPopup(markerPopUp);
            marker.on('mouseover', function(e) {
                this.openPopup();
            });
            marker.on('mouseout', function(e) {
                this.closePopup();
            });

            //.on('click', function (event) {
            //        // toggle selection of corresponding site option for this marker
            //        toggleTargetSelection(event);
            //    }
            //);
            markerFeatures[markerId] = features;
            map.addLayer(marker);

        }
    };

    var refresh = function () {
        createMarkers();
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
        var ref = 'finalMap';
        var elem = document.getElementById(ref);
        //elem.style.height = mapHeight();
        //elem.style.width = mapWidth();
        elem.style.height = vph;
        elem.style.width = vpw;
        elem.style.display = "block";
    };

    // hide the spinner
    document.getElementById("spinner").style.display="none";

    // initial resize seems to be necessary
    resizeMap(this);
    // register an event listener so that the item.js can ask the map div to resize after the map div becomes visible
    var ref = 'finalMap';
    var elem = document.getElementById(ref);
    elem.addEventListener('resizeMap', function (e) {
        resizeMap(e.detail);
    });

    // register an event listener so that the select.js can ask the map div to refresh after a selection
    var ref = 'finalMap';
    var elem = document.getElementById(ref);
    elem.addEventListener('refresh', function (e) {
        refresh(e.detail.refElement);
    });
    refresh();

};