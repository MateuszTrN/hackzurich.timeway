'use strict';
(function app() {
  var GEOLOCATION_NOT_SUPPORTED = "Geolocation is not supported by this browser.";
  var CONTAINER_ID = "container";
  var SEARCHBOX_ID = "search-box";
  var BOUNDS_CHANGED_EVENT = "bounds_changed";
  var PLACES_CHANGED_EVENT = "places_changed";
  var POINT_SPACING = 50; // pixels in between points
  var DEFAULT_LOCATION = { longitude: 8.515711, latitude: 47.390193 };

  var map = {};

  var getGrid = () => {
    var grid = [];
    var southWest = map.getBounds().getSouthWest();
    var northEast = map.getBounds().getNorthEast();

    var width = document.getElementById(CONTAINER_ID).offsetWidth;
    var height = document.getElementById(CONTAINER_ID).offsetHeight;

    var n_width = Math.round(width / POINT_SPACING);
    var n_height = Math.round(height / POINT_SPACING);

    var delta_w = (northEast.lng() - southWest.lng()) / n_width;
    var delta_h = (northEast.lat() - southWest.lat()) / n_height;

    for (var i = 0; i < n_height; i++) {
      for (var j = 0; j < n_width; j++) {
        grid.push({ latitude: southWest.lat() + i * delta_h, longitude: southWest.lng() + j * delta_w });
      }
    }

    return grid;

  };

  var initApp = () => {
    return new Promise((resolveCoords, notsupportedGeoLocationHandler) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(resolveCoords, notsupportedGeoLocationHandler);
      } else {}
    });
  };

  var geoLocationNotSupported = () => {
    console.log(GEOLOCATION_NOT_SUPPORTED);
    return initMap({});
  }

  var initMap = (data) => {
    var coords = data.coords || DEFAULT_LOCATION;
    var currentPosition = new google.maps.LatLng(coords.latitude, coords.longitude);

    map = new google.maps.Map(document.getElementById(CONTAINER_ID), {
      center: currentPosition,
      zoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

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
        position: place.geometry.location
      });

      var grid = getGrid();
      processGeoLocationPointGrid(grid);

    });
  };

  var processGeoLocationPointGrid = (gridData) => {
    for (var i = 0; i < gridData.length; i++) {
      var resultPlaceCoords = gridData[i];
      new google.maps.Marker({
        map: map,
        title: "Point" + i,
        position: new google.maps.LatLng(
          resultPlaceCoords.latitude,
          resultPlaceCoords.longitude
        ),
      });
    }
  }

  initApp()
    .then((data) => {
      initMap(data);      
    }, geoLocationNotSupported)
})();
