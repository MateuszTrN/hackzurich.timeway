var homeGateClient = (config) => {

  return {
    searchWithinArea: (longitude, latitude) => {
      return new Promise((success, fail) => {
        $.ajax({
          method: "GET",
          url: "https://api.tamedia.cloud/homegate/v1c/rs/real-estates?lan=de&cht=rentflat&nrs=300&wrg=2000&nby=" +
            encodeURIComponent(longitude + "," + latitude),
          crossDomain: true,
          beforeSend: function (xhr) {
            xhr.setRequestHeader('apiKey', "1a59a7422e2d4936b02e9730d9f579b8");
            xhr.setRequestHeader('Accept', 'application/json')
            xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
          },
          success: data => {
            success(data.items.map(x => {
                return {
                    title: x.title,
                    description: x.description,                  
                    url: 'https://homegate.ch/rent/' + x.advId,
                    picture: x.picFilename1
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
