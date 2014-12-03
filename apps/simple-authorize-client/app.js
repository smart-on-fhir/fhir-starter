function urlParam(p) {
  var query = location.search.substr(1);
  var data = query.split("&");
  var result = [];

  for(var i=0; i<data.length; i++) {
    var item = data[i].split("=");
    if (item[0] === p) {
      result.push(item[1]);
    }
  }

  if (result.length === 0){
    return null;
  }
  return result[0];
}

function getRedirectURI () {
    return (window.location.protocol + "//" + window.location.host + window.location.pathname).match(/(.*\/)[^\/]*/)[1];
}

function refreshApp () {
    window.location.href = getRedirectURI();
}

function initialize (settings) {

    setSettings({
        client_id: settings.client_id,
        scope: settings.scope + " launch:" + urlParam("launch"),
        api_server_uri: urlParam("iss")
    });
    clearAuthToken();
    refreshApp();
}

function completeAuth () {
    FHIR.oauth2.ready(function(){
        refreshApp();
    });
}

function writeData (key, data) {
    sessionStorage[key] = JSON.stringify(data);
}

function readData (key) {
    var data = sessionStorage[key];
    if (data) {
        return JSON.parse(sessionStorage[key]);
    } else {
        return data;
    }
}

function getSettings () {
    return readData("app-settings");
}

function setSettings (data) {
    writeData ("app-settings", data);
}

function hasAuthToken () {
    return sessionStorage.tokenResponse !== undefined;
}

function clearAuthToken () {
    delete sessionStorage.tokenResponse;
}

function authorize () {
    var settings = getSettings ();
    
    FHIR.oauth2.authorize({
        "client": {
            "client_id": settings.client_id,
            "scope":  settings.scope
        },
        "server": settings.api_server_uri
    });
}

function getPatientName () {
    var ret = $.Deferred();
    
    FHIR.oauth2.ready(function(smart){
        var patient = smart.context.patient;

        patient.read()
          .then(function(pt) {
            var name = pt.name[0].given.join(" ") +" "+ pt.name[0].family.join(" ");
            ret.resolve(name)
          })
          .fail(function() {
            ret.reject("Could not fetch patient name");
          });

    });

    return ret.promise();
}