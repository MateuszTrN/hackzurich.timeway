var sanFrancisco = new google.maps.LatLng(37.774546, -122.433523);
  console.log(sanFrancisco);
  map = new google.maps.Map(document.getElementById('container'), {
  center: sanFrancisco,
  zoom: 13,
  mapTypeId: 'satellite'
});