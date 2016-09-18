var homeGateClient = (config) => {

  return {
    search: (longitude, latitude) => {    
      return new Promise((success, fail) => {
        $.ajax({
          method: "GET",
          url: "https://api.tamedia.cloud/homegate/v1c/rs/real-estates?lan=de&cht=rentflat&nrs=400&wdi=1000&nby=" +
            encodeURIComponent(longitude + "," + latitude),
          crossDomain: true,
          beforeSend: function (xhr) {
            xhr.setRequestHeader('apiKey', "1a59a7422e2d4936b02e9730d9f579b8");
            xhr.setRequestHeader('Accept', 'application/json')
            xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
          },
          success: data => {
            success(data.items.map(x => {
              var geoLoc = x.geoLocation.split(',');
              return {
                title: x.title,
                description: (x.description || "").substr(0,250) + "...",
                url: 'http://homegate.ch/rent/' + x.advId,
                picture: x.picFilename1,
                coords: new google.maps.LatLng(geoLoc[1], geoLoc[0]),
                address: {
                  street: x.propertyStreet,
                  city: x.propertyCityname,
                  zipCode: x.propertyZip
                }
              }
            }));
          },
          error: (e) => {
            console.log(e.responseJSON)
            fail(e);
          }
        });
      });
    }
  }
}
