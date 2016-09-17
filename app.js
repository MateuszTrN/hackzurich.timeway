'use strict';
(function app() {
  var GEOLOCATION_NOT_SUPPORTED = "Geolocation is not supported by this browser.";
  var CONTAINER_ID = "container";
  var SEARCHBOX_ID = "search-box";
  var BOUNDS_CHANGED_EVENT = "bounds_changed";
  var PLACES_CHANGED_EVENT = "places_changed";
  var POINT_SPACING = 200;    // pixels in between points
  var DEFAULT_LOCATION = { longitude: 8.515711, latitude: 47.390193 }; // Zurich Technopark
  var GOOGLE_API_DELAY = 500; // delay between API calls
  var SCALING_FACTOR = 10;
  var HEATMAP_RADIUS = 2000;
  var GOOGLE_ZOOM_LEVEL = 13;

  var map;
  var directionsService, heatMap;
  var currentPosition;

  var getGrid = () => {
    return new Promise((resolveGrid) => {
      var grid = [];
      var southWest = map.getBounds().getSouthWest();
      var northEast = map.getBounds().getNorthEast();

      var n_width = Math.round(document.getElementById(CONTAINER_ID).offsetWidth / POINT_SPACING);
      var n_height = Math.round(document.getElementById(CONTAINER_ID).offsetHeight / POINT_SPACING);

      var delta_w = (northEast.lng() - southWest.lng()) / n_width;
      var delta_h = (northEast.lat() - southWest.lat()) / n_height;

      var coords;
      for (var i = 0; i < n_height; i++) {
        for (var j = 0; j < n_width; j++) {
          coords = new google.maps.LatLng(southWest.lat() + (i + 0.5) * delta_h,southWest.lng() + (j + 0.5) * delta_w);   
          grid.push({ location: coords, weight: NaN});

        }
      }

      var pending = grid.length;

      var delayedTimeRequest = (index) => {
        setTimeout(() => {
          directionsService.route({
            origin: grid[index].location,
            destination: currentPosition,
            travelMode: 'TRANSIT'
          }, (response, status) => {
            if (status === 'OK') {
              console.log(response.routes[0].legs[0].duration.value); //TODO remove
              grid[index].weight = response.routes[0].legs[0].duration.value/SCALING_FACTOR;
            } else {
              console.log('Directions request failed due to ' + status); 
            }
            pending--;
            if (!pending) {
              resolveGrid(grid);
            }
          });
        },index*GOOGLE_API_DELAY);
      };


      for (var i = 0; i < grid.length; i++) {
        delayedTimeRequest(i);
      }  
    });
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
    currentPosition = new google.maps.LatLng(coords.latitude, coords.longitude);

    map = new google.maps.Map(document.getElementById(CONTAINER_ID), {
      center: currentPosition,
      zoom: GOOGLE_ZOOM_LEVEL,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true
    });

    directionsService = new google.maps.DirectionsService;

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
        processGeoLocationPointGrid(grid);
        generateHeatMap(grid);
      });
    });
  };

  var processGeoLocationPointGrid = (gridData) => {
    for (var i = 0; i < gridData.length; i++) {
      var gridElem = gridData[i];
      new google.maps.Marker({
        map: map,
        title: "Point" + i,
        position: gridElem.location
      });
    }
  };

  var generateHeatMap = (gridData) => {
    var heatmap = new google.maps.visualization.HeatmapLayer({
      data: gridData,
      dissipating: false
    });
    heatmap.setMap(map);
  };


  initApp()
  .then((data) => {
    initMap(data);      
  }, geoLocationNotSupported)
})();
