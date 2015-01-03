angular.module('fhirStarter').controller("MainController", 
  function($scope, $route, $rootScope, $location, fhirSettings, patientSearch){
    $scope.showing = {
      settings: false,
      signin: true,
      signout: false
    };
    
    fhirSettings.get (function (settings) {
        if (settings.auth.type !== 'oauth2') {
            $scope.showing.signin = false;
            $scope.showing.signout = false;
            patientSearch.getClient();
        }
    });
    
    $scope.signin = function(){
        $rootScope.$emit('reconnect-request');
    }
    
    $scope.signout = function(){
        $scope.showing.signin = true;
        $scope.showing.signout = false;
        $rootScope.$emit('clear-client');
        $route.reload();
    }
    
    $rootScope.$on('signed-in', function(){
        $scope.showing.signin = false;
        $scope.showing.signout = true;
    });
    
    $rootScope.$on('noauth-mode', function(){
        $scope.showing.signin = false;
        $scope.showing.signout = false;
    });
  }
);

angular.module('fhirStarter').controller("StartController", 
  function($scope, $routeParams, $rootScope, $location, fhirSettings, patientSearch){
    console.log("Start", $routeParams);
    $rootScope.$emit('init-client');
    //$scope.connect = function(){
    //    $rootScope.$emit('reconnect-request');
    //    $location.path('ui/authorize');
    //}
  }
);

angular.module('fhirStarter').controller("ErrorsController", 
  function($scope, $rootScope, $route, $routeParams, $location, fhirSettings, oauth2){

    $scope.errors = [];
    $rootScope.$on('error', function(context, e){
      if (e.match(/Search failed/) && oauth2.authorizing()){
        return;
      }
      $scope.errors.push(e);
    })

    $scope.clearError = function(i){
      $scope.errors.splice(i,1);
    }
  }
);

angular.module('fhirStarter').controller("SettingsController", 
  function($scope, $rootScope, $route, $routeParams, $location, fhirSettings){

    $scope.existing = { };
    $scope.settings = { };

    $scope.servers = fhirSettings.servers.map(function(server){
      return {
        value: JSON.stringify(server, null, 2),
        title: server.name
      }
    });

    $scope.save = function(){
      var newSettings = JSON.parse($scope.settings);
      fhirSettings.set(newSettings);
      $scope.showing.settings = false;
    }
    
    fhirSettings.get( function (settings) {
        JSON.stringify(settings,null,2);
    });
  }
);

angular.module('fhirStarter').controller("PatientViewWrapper",  
  function($scope, $routeParams, patientSearch) {
  
    fhirSettings.get (function (settings) {
        if (patientSearch.smart() || settings.auth.type !== 'oauth2') {
            $scope.unauthorized = false;
            $scope.loading = true;
            $scope.apps = false;
            patientSearch.getOne($routeParams.pid).then(function(p){
              $scope.loading = false;
              $scope.apps = true;
              $scope.patient = p;
            });
        } else {
            $scope.unauthorized = true;
            $scope.loading = false;
            $scope.apps = false;
        }
    });
    
    $scope.patientId = function(){
      return $routeParams.pid;
    };
  }
);

angular.module('fhirStarter').controller("BindContextController",  
  function($scope, patient, patientSearch, $routeParams, $rootScope, $location, oauth2) {

    $scope.clientName = decodeURIComponent($routeParams.clientName)
    .replace(/\+/, " ");

    $scope.onSelected = $scope.onSelected || function(p){
      var pid = patient.id(p).id;

      patientSearch
      .registerContext({ client_id:'cardiac_risk'}, {patient: pid})
      .then(function(c){
        var to = decodeURIComponent($routeParams.endpoint);
        to = to.replace(/scope=/, "scope=launch:"+c.launch_id+"+");
        return window.location = to;
      });

    };
  }
);

angular.module('fhirStarter').controller("PatientSearchController",  
  function($scope, patient, patientSearch, $routeParams, $rootScope, $location, oauth2) {

    $scope.oauth2 = oauth2;

    $scope.onSelected = $scope.onSelected || function(p){
      var pid = patient.id(p).id;
      var loc = "/ui/patient-selected/"+pid;
      if ($routeParams.q == $scope.searchterm) {
        return $location.url(loc); 
      }
      $location.search("q", $scope.searchterm);
      var off = $rootScope.$on("$routeUpdate", function(){
        $location.url(loc);
        off();
      });
    };

    $scope.loading = true;
    $scope.mayLoadMore = true;
    $scope.patients = [];
    $scope.patientHelper = patient;
    $scope.genderglyph = {"F" : "&#9792;", "M": "&#9794;"};
    $scope.searchterm  = typeof $routeParams.q ==="string" && $routeParams.q || "";

    $rootScope.$on('new-client', function(){
      $scope.getMore();
    })
    
    $rootScope.$on('set-loading', function(){
      $scope.loading = true;
    })

    /** Checks if the patient list div is (almost) fully visible on screen and if so loads more patients. */
    $scope.loadMoreIfNeeded = function() {
      if (!$scope.mayLoadMore) {
        return;
      }

      var list = $('#patient-results');
      if (list.offset().top + list.height() - 200 - document.body.scrollTop <= window.innerHeight) {
        $scope.mayLoadMore = false;
        $scope.loadMoreIfHasMore();
      }
    };

    $scope.loadMoreIfHasMore = function() {
      if ($scope.hasNext()) {
        $scope.loadMore();
      }
    };

    $scope.loadMore = function() {
      $scope.loading = true;
      patientSearch.next().then(function(p){
        p.forEach(function(v) { $scope.patients.push(v) }, p);
        $scope.loading = false;
        $scope.mayLoadMore = true;
        $scope.loadMoreIfNeeded();
      });
    };

    $scope.select = function(i){
      $scope.onSelected($scope.patients[i]);
    };

    $scope.hasNext = function(){
      return patientSearch.hasNext();
    };

    $scope.$watch("searchterm", function(){
      var tokens = [];
      ($scope.searchterm || "").split(/\s/).forEach(function(t){
        tokens.push(t.toLowerCase());
      });
      $scope.tokens = tokens;
      $scope.getMore();
    });

    var loadCount = 0;
    var search = _.debounce(function(thisLoad){
      patientSearch.search({
        "tokens": $scope.tokens,
      })
      .then(function(p){
        if (thisLoad < loadCount) {   // not sure why this is needed (pp)
          return;
        }
        $scope.patients = p;
        $scope.loading = false;
        $scope.mayLoadMore = true;
        $scope.loadMoreIfNeeded();
      });
    }, 300);

    $scope.getMore = function(){
      $scope.loading = true;
      search(++loadCount);
    };
  }
);


/** The directive "when-scrolling" can be used to call a method when the window scrolls. */
angular.module('fhirStarter').directive('whenScrolling', function() {
  return function(scope, elm, attr) {
    //var attach = ('BODY' == elm.prop('tagName')) ? $(window) : elm;
    var attach = $(window);

    attach.bind('scroll', function() {
      scope.$apply(attr.whenScrolling);
    });
  };
});

angular.module('fhirStarter').controller("PatientViewController", function($scope, patient, app, patientSearch, $routeParams, $rootScope, $location, fhirSettings, random, customFhirApp) {
  $scope.all_apps = [];
  app.success(function(apps){
    $scope.all_apps = apps;
  });
  $scope.patientHelper = patient;

  fhirSettings.get( function(settings) {
      $scope.fhirServiceUrl = settings.serviceUrl;
      $scope.fhirAuthType = settings.auth.type;

      if ($scope.fhirAuthType === "none") {
           $scope.launch = function launch(app){

            /* Hack to get around the window popup behavior in modern web browsers
            (The window.open needs to be synchronous with the click even to
            avoid triggering  popup blockers. */

            window.open(app.launch_uri+'?fhirServiceUrl='+$scope.fhirServiceUrl+"&patientId="+$routeParams.pid, '_blank');

          };
      } else {
          $scope.launch = function launch(app){

            /* Hack to get around the window popup behavior in modern web browsers
            (The window.open needs to be synchronous with the click even to
            avoid triggering  popup blockers. */

            var key = random(32);
            window.localStorage[key] = "requested-launch";
            window.open('launch.html?'+key, '_blank');

            patientSearch
            .registerContext(app, {patient: $routeParams.pid})
            .then(function(c){
              console.log(patientSearch.smart());
              window.localStorage[key] = JSON.stringify({
                app: app,
                iss: patientSearch.smart().server.serviceUrl,
                context: c
              });
            });
          };
      }

      $scope.customapp = customFhirApp.get();
      
      $scope.launchCustom = function launchCustom(){
        customFhirApp.set($scope.customapp);
        $scope.launch({
            client_id: $scope.customapp.id,
            launch_uri: $scope.customapp.url
        });
      };

      $scope.givens = function(name) {
        return name && name.givens.join(" ");
      };
  });
});

angular.module('fhirStarter').controller("PatientSearchWrapper",  
  function($scope, $routeParams, patientSearch, fhirSettings) {
    fhirSettings.get (function (settings) {
        if (patientSearch.smart() || settings.auth.type !== 'oauth2') {
            $scope.unauthorized = false;
        } else {
            $scope.unauthorized = true;
        }
    });
  }
);

