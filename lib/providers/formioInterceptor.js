"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
require("core-js/modules/es.array.slice.js");
var app = angular.module('formio');
var _default = app.factory('formioInterceptor', ['$q', '$rootScope', 'Formio', function ($q, $rootScope, Formio) {
  var Interceptor = {
    /**
     * Update JWT token received from response.
     */
    response: function response(_response) {
      window.FORMIO_SETTINGS && window.FORMIO_SETTINGS.url && Formio.setBaseUrl(window.FORMIO_SETTINGS.url.slice(0, -1)) && Formio.setProjectUrl(window.FORMIO_SETTINGS.url.slice(0, -1)) && Formio.setApiUrl(window.FORMIO_SETTINGS.url.slice(0, -1));
      var token = _response.headers('x-jwt-token');
      if (_response.status >= 200 && _response.status < 300 && token && token !== '') {
        Formio.setToken(token);
      }
      return _response;
    },
    /**
     * Intercept a response error.
     */
    responseError: function responseError(response) {
      if (parseInt(response.status, 10) === 440) {
        response.loggedOut = true;
        Formio.setToken(null);
        $rootScope.$broadcast('formio.sessionExpired', response.body);
      } else if (parseInt(response.status, 10) === 401) {
        $rootScope.$broadcast('formio.unauthorized', response.body);
      }
      return $q.reject(response);
    },
    /**
     * Set the token in the request headers.
     */
    request: function request(config) {
      if (config.disableJWT) return config;
      var token = Formio.getToken();
      if (token) config.headers['x-jwt-token'] = token;
      return config;
    }
  };
  return Interceptor;
}]);
exports.default = _default;