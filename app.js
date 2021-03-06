'use strict';
(function app() {
  var GEOLOCATION_NOT_SUPPORTED = "Geolocation is not supported by this browser.";
  var CONTAINER_ID = "container";
  var SEARCHBOX_ID = "search-box";
  var BOUNDS_CHANGED_EVENT = "bounds_changed";
  var PLACES_CHANGED_EVENT = "places_changed";
  var POINT_SPACING = 60; // pixels in between points
  var DEFAULT_LOCATION = { longitude: 8.515711, latitude: 47.390193 }; // Zurich Technopark
  var GOOGLE_API_DELAY = 1500; // delay between API calls
  var GOOGLE_API_BLOCK_SIZE = 25;
  var HEATMAP_RADIUS = 100;
  var GOOGLE_ZOOM_LEVEL = 14;
  var CENTER_CHANGED = "center_changed"

  var map;
  var centerMarker; //for removing after dragging. 
  var directionsService = new google.maps.DistanceMatrixService();
  var currentPosition;
  var heatmapInstance;
  var apiClient = homeGateClient();
  var flatsMarkers = [];
  var draggingTimeout;

  var generateHeatMap = (gridData) => {
    if (heatmapInstance) {
      heatmapInstance.setMap(null)
    }
    var travelTimes = gridData.map(function (a) {
      return a.weight
    });
    var gradientStops = ['rgba(0, 0, 0, 1)', 'rgba(0, 255, 0, 0.5)', 'rgba(255,255,0,0.5)', 'rgba(255,0,0,0.5)'];
    heatmapInstance = new google.maps.visualization.HeatmapLayer({
      data: gridData,
      dissipating: true,
      radius: HEATMAP_RADIUS,
      gradient: gradientStops
    });
    $("#infobox").hide();
    $("#legend").removeClass("hidden");
    $("#colorbar").css("background", "linear-gradient(to right," + gradientStops.slice(1).join() + ")");
    $("#legend-min").html("Travel time: 0");
    $("#legend-max").html(Math.ceil(Math.max.apply(Math, travelTimes.filter(isFinite)) / 60) + " min");
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

    for (var i = 0; i <= n_height; i++) {
      for (var j = 0; j <= n_width; j++) {
        var coords = new google.maps.LatLng(southWest.lat() + i * delta_h, southWest.lng() + j *
          delta_w);
        grid.push({ location: coords });
      }
    }

    return grid;
  }

  var getGrid = () => {
    return new Promise((resolveGrid) => {
      var locationMatrix = createLocationMatrix();
      NProgress.start();

      var pending = locationMatrix.length;

      var delayedBlockRequest = (index) => {
        setTimeout(() => {
          directionsService.getDistanceMatrix({
            origins: locationMatrix.slice(index, index + GOOGLE_API_BLOCK_SIZE),
            destinations: [map.getCenter()],
            travelMode: 'TRANSIT',
            transitOptions: {
              departureTime: new Date(2016, 9, 17, 8, 0, 0)
            },
          }, (data, status) => {
            if (status === 'OK') {
              data.rows.map((item, idx) => {
                try {
                  var time = item.elements[0].duration.value;
                  var itemIdx = index + idx;
                  locationMatrix[itemIdx].weight = time;
                } catch (err) {} finally {
                  pending--;
                  NProgress.set(1 - pending / locationMatrix.length);
                  if (pending <= 0) {
                    NProgress.done();
                    resolveGrid(locationMatrix);
                  }
                }

              });
            } else {
              console.log('Directions request failed due to ' + status);
              pending -= GOOGLE_API_BLOCK_SIZE;
              NProgress.inc();
            }
          });
        }, index / GOOGLE_API_BLOCK_SIZE * GOOGLE_API_DELAY);
      };

      for (var i = 0; i < locationMatrix.length; i += 25) {
        delayedBlockRequest(i);
      }

    });
  }

  var drawMarkers = (coords) => {
    var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var labelIndex = 0;
    var infowindow = new google.maps.InfoWindow();
    for (var i = 0; i < flatsMarkers.length; i++) flatsMarkers[i].setMap(null);

    apiClient.search(coords.lng(), coords.lat()).then(flatsList => {
      flatsList.map(place => {
        var marker = new google.maps.Marker({
          map: map,
          title: place.title,
          position: place.coords,
         // animation: google.maps.Animation.DROP, //NOTE: Perfomance with the large amount of flats.
          // label: labels[labelIndex++ % labels.length],
          data: place
        });
        flatsMarkers.push(marker);
        google.maps.event.addListener(marker, "click", function () {
          var contentString = '<div class="popup"><h5>' + marker.data.title;
          if (marker.data.picture != undefined) {
            contentString += '</h5><img src="' + marker.data.picture + '"/><p>';
          } else {
            contentString += '</h5><p>';
          }
          contentString += marker.data.description + '<a href="' + marker.data.url +
            '" target="_blank"> more on Homegate</a></p></div>';
          infowindow.setContent(contentString);
          infowindow.open(map, marker);
        });
      });
    });
  }

  var initApp = () => {
    $(".navbar-brand").click((e) => {
      e.preventDefault();
      location.reload();
    });

    $(".close-link").click((e) => {
      e.preventDefault();
      $("#infobox").hide();
    });

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

  var mapCenterChanged = () => {
    if (draggingTimeout) clearTimeout(draggingTimeout);

    draggingTimeout = setTimeout(() => {
      directionsService = directionsService || new google.maps.DistanceMatrixService();
      if(centerMarker) centerMarker.setMap(null);

      centerMarker = new google.maps.Marker({
        map: map,
        title: "",
        position: map.getCenter(),
        animation: google.maps.Animation.DROP,
        label: 'O'
      });

      getGrid()
        .then((grid) => {
          generateHeatMap(grid);
          drawMarkers(map.getCenter());
        });
    }, 300)
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
    map.addListener(CENTER_CHANGED, mapCenterChanged);
    var transitLayer = new google.maps.TransitLayer();
    transitLayer.setMap(map);

    initSearch();
  }

  var initSearch = () => {
    var input = document.getElementById(SEARCHBOX_ID);
    var searchBox = new google.maps.places.SearchBox(input);
    var marker = { setMap: function () {} };
    var setBoundsTimeout;
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
    });
  };

  initApp()
    .then((data) => {
      initMap(data);
    }, geoLocationNotSupported)
})();
