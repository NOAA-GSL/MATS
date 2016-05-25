var mapWidth = function () {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) * 0.5;
    return w + "px";
};
var mapHeight = function() {
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) * 0.5;
    return h + "px";
};

Template.map.rendered = function () {
    $(window).resize(function() {
        $('#map').css('height', mapHeight());
        $('#map').css('width', mapWidth());
    });

    L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';

    var defaultPoint = this.data.defaultMapView.point;
    var defaultZoomLevel = this.data.defaultMapView.zoomLevel;
    var map = L.map('map', {
        doubleClickZoom: false
    }).setView(defaultPoint, defaultZoomLevel);

    L.tileLayer.provider('Thunderforest.Outdoors').addTo(map);

    var markers = this.data.optionsMap.default;
    for (var m=0; m < markers.length; m++) {
         L.marker(markers[m].point,{title: markers[m].title}).addTo(map);
    }
    map.on('dblclick', function(event) {

    });

    $(window).resize(); // trigger resize event
};

Template.map.helpers({
    multiple:function(){
        if(this.multiple===true)
        {return "multiple";}
    }
});