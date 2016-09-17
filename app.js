'use strict';
(function app() {
  var GEOLOCATION_NOT_SUPPORTED = "Geolocation is not supported by this browser.";
  var CONTAINER_ID = "container";
  var SEARCHBOX_ID = "search-box";
  var BOUNDS_CHANGED_EVENT = "bounds_changed";
  var PLACES_CHANGED_EVENT = "places_changed";
  var POINT_SPACING = 45; // pixels in between points
  var DEFAULT_LOCATION = { longitude: 8.515711, latitude: 47.390193 }; // Zurich Technopark
  var GOOGLE_API_DELAY = 400; // delay between API calls
  var SCALING_FACTOR = 1;
  var HEATMAP_RADIUS = 45;
  var GOOGLE_ZOOM_LEVEL = 12;

  var map;
  var directionsService = new google.maps.DistanceMatrixService();
  var heatMap;
  var currentPosition;
  var heatmapInstance;

  var generateHeatMap = (gridData) => {
    if (heatmapInstance) {
      heatmapInstance.setMap(null)
    }

    heatmapInstance = new google.maps.visualization.HeatmapLayer({
      data: gridData,
      dissipating: true,
      radius: HEATMAP_RADIUS,
    });
    heatmapInstance.setMap(map);
  };

  var createLocationMatrix = () => {
    var grid = [];
    var southWest = map.getBounds().getSouthWest();
    var northEast = map.getBounds().getNorthEast();

    var n_width = Math.round(document.getElementById(CONTAINER_ID).offsetWidth / POINT_SPACING);
    var n_height = Math.round(document.getElementById(CONTAINER_ID).offsetHeight / POINT_SPACING);

    var delta_w = (northEast.lng() - southWest.lng()) / n_width;
    var delta_h = (northEast.lat() - southWest.lat()) / n_height;

    for (var i = 0; i < n_height; i++) {
      for (var j = 0; j < n_width; j++) {
        var coords = new google.maps.LatLng(southWest.lat() + (i + 0.5) * delta_h, southWest.lng() + (j + 0.5) *
          delta_w);
        grid.push({ location: coords });
      }
    }

    return grid;
  }

  var getGrid = () => {
    return new Promise((resolveGrid) => {

      var locationMatrix = createLocationMatrix();
      var pages = Math.ceil(locationMatrix.length / 25);
      var pendingOperations = pages;

      for (var i = 0; i < pages; i++) {
        setTimeout(function () {
          directionsService.getDistanceMatrix({
            origins: [map.getCenter()],
            destinations: locationMatrix.map(x => x.location).slice(i * 25, i * 25 + 25),
            travelMode: 'TRANSIT',
            transitOptions: {
              departureTime: new Date(2016, 9, 17, 8, 0, 0)
            },
          }, (data) => {
            try {
              data.rows[0].elements.map((element, idx) => {
                var elementIdx = i * 25 + idx;
                var duration = element.duration;
                locationMatrix[elementIdx].weight = duration.value;
                return locationMatrix[elementIdx];
              });
            } catch (err) {

            } finally {
              pendingOperations--;
            }
          }, () => pendingOperations--);
        }, i * GOOGLE_API_DELAY);
      }

      var interval = setInterval(() => {
        if (pendingOperations < 1) {
          clearInterval(interval);
          resolveGrid(locationMatrix);
        }
      })

    });
  }

  var initApp = () => {
    return new Promise((resolveCoords, notsupportedGeoLocationHandler) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(resolveCoords, notsupportedGeoLocationHandler);
      }
    });
  };

  var geoLocationNotSupported = () => {
    console.log(GEOLOCATION_NOT_SUPPORTED);
    return initMap({});
  }

  var initMap = (data) => {
    var coords = data.coords || DEFAULT_LOCATION;
    currentPosition = new google.maps.LatLng(coords.latitude, coords.longitude);

    map = new google.maps.Map(document.getElementById(CONTAINER_ID), {
      center: currentPosition,
      zoom: GOOGLE_ZOOM_LEVEL,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true
    });

    directionsService = new google.maps.DistanceMatrixService();

    initSearch();
  }

  var initSearch = () => {
    var input = document.getElementById(SEARCHBOX_ID);
    var searchBox = new google.maps.places.SearchBox(input);
    var marker = { setMap: function () {} };
    map.addListener(BOUNDS_CHANGED_EVENT, () => {
      searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener(PLACES_CHANGED_EVENT, () => {
      var places = searchBox.getPlaces();
      if (places.length == 0) {
        return;
      }

      marker.setMap(null);
      var place = places[0];

      var center = new google.maps.LatLng(
        place.geometry.location.lat(),
        place.geometry.location.lng()
      );

      map.panTo(center);
      marker = new google.maps.Marker({
        map: map,
        title: place.name,
        position: place.geometry.location,
        animation: google.maps.Animation.DROP
      });

      getGrid()
        .then((grid) => {
          generateHeatMap(grid);
        });
    });
  };

  initApp()
    .then((data) => {
      initMap(data);
    }, geoLocationNotSupported)
})();
