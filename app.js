(function app() {
  var GEOLOCATION_NOT_SUPPORTED = "Geolocation is not supported by this browser.";
  var CONTAINER_ID = "container";
  var SEARCHBOX_ID = "search-box";
  var BOUNDS_CHANGED_EVENT = "bounds_changed";
  var PLACES_CHANGED_EVENT = "places_changed";
  var POINTS_DENISITY = 0.001;
  var POINTS_RADIUS = 3;

  var initApp = () => {
    return new Promise((resolveCoords) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(resolveCoords);
      } else {
        x.innerHTML = GEOLOCATION_NOT_SUPPORTED;
      }
    });
  };

  var initMap = (data) => {
    var coords = data.coords || {}
    var currentPosition = new google.maps.LatLng(coords.latitude, coords.longitude);

    map = new google.maps.Map(document.getElementById(CONTAINER_ID), {
      center: currentPosition,
      zoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    return new Promise(resolvedMap => {
      return resolvedMap(map);
    });
  }

  var initSearch = map => {
    var input = document.getElementById(SEARCHBOX_ID);
    var searchBox = new google.maps.places.SearchBox(input);
    var marker = { setMap: function () {} };
    map.addListener(BOUNDS_CHANGED_EVENT, () => {
      searchBox.setBounds(map.getBounds());
    });

    var searchCompletePromise = new Promise(onSearchComplete => {
      searchBox.addListener(PLACES_CHANGED_EVENT, () => {
        var places = searchBox.getPlaces();
        if (places.length == 0) {
          return;
        }

        marker.setMap(null);
        var place = places[0];
        var resultPlaceCoords = {
          longitude: place.geometry.location.lng(),
          latitude: place.geometry.location.lat()
        };

        var center = new google.maps.LatLng(
          resultPlaceCoords.latitude,
          resultPlaceCoords.longitude
        );

        map.panTo(center);
        marker = new google.maps.Marker({
          map: map,
          title: place.name,
          position: place.geometry.location
        });

        onSearchComplete(resultPlaceCoords);
      });
    })

    return searchCompletePromise;
  };

  var onCenterPointCoordsRetrieved = (coords) => {
    var locationGrid = [coords];
    for (var i = -POINTS_RADIUS; i < POINTS_RADIUS; i++) {
      for (var k = -POINTS_RADIUS; k < POINTS_RADIUS; k++) {

      }
    }

    return new Promise(geoLocationGridResolver => {
      geoLocationGridResolver({ map: map, locationGrid: locationGrid })
    });
  }

  var processGeoLocationPointGrid = (gridData) => {
    for (var i = 0; i < gridData.locationGrid.length; i++) {
      var resultPlaceCoords = gridData.locationGrid[i];
      new google.maps.Marker({
        map: gridData.map,
        title: "Point" + i,
        position: new google.maps.LatLng(
          resultPlaceCoords.latitude,
          resultPlaceCoords.longitude
        ),
      });

    }
  }

  initApp()
    .then(initMap)
    .then(initSearch)
    .then(onCenterPointCoordsRetrieved)
    .then(processGeoLocationPointGrid)
})();
