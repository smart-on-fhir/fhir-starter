angular.module('fhirStarter', ['ngAnimate', 'ngRoute','ngSanitize'], function($routeProvider, $locationProvider){

  $routeProvider.when('/ui/select-patient', {
    templateUrl:'fhirStarter/templates/select-patient.html',
    reloadOnSearch:false
  });

  $routeProvider.when('/resolve/:context/against/:iss/for/:clientName/then/:endpoint', {
    templateUrl:'fhirStarter/templates/resolve.html'
  });

  $routeProvider.otherwise({redirectTo:'/ui/start'});

  $routeProvider.when('/ui/patient-selected/:pid', {
    templateUrl:'fhirStarter/templates/patient-selected.html',
  });

  $routeProvider.when('/ui/authorize', {
    templateUrl:'fhirStarter/templates/auth.html',
    controller: function(){
    
    }
  });

  $routeProvider.when('/after-auth', {
    templateUrl:'fhirStarter/templates/auth.html',
    controller: function(){
    
    }
  });

  $routeProvider.when('/ui/start', {
    templateUrl:'fhirStarter/templates/start.html',
  });

  $locationProvider.html5Mode(false);

});
