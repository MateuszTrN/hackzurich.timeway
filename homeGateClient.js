var homeGateClient = (config) => {

  return {
    searchWithinArea: (location) => { 
      return new Promise((success, fail) => {       
         $.ajax({
          method: "GET",
          url: "https://api.tamedia.cloud/homegate/v1c/rs/real-estates?lan=de&cht=rentflat&nrs=300&wrg=2000&nby=" + encodeURIComponent(location.longitude + "," + location.latitude),          
          crossDomain: true,
          beforeSend: function (xhr) {
            debugger
            xhr.setRequestHeader('apiKey', "1a59a7422e2d4936b02e9730d9f579b8");
            xhr.setRequestHeader('Accept', 'application/json')
            xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
          },
          success: data => {
            debugger
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
