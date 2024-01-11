const app = angular.module('formio');
export default app.factory('formioInterceptor', [
  '$q',
  '$rootScope',
  'Formio',
  function($q, $rootScope, Formio) {
    const Interceptor = {
      /**
       * Update JWT token received from response.
       */
      response: function (response) {
        
        window.FORMIO_SETTINGS &&
        window.FORMIO_SETTINGS.url &&
        Formio.setBaseUrl(window.FORMIO_SETTINGS.url.slice(0, -1)) &&
        Formio.setProjectUrl(window.FORMIO_SETTINGS.url.slice(0, -1)) &&
        Formio.setApiUrl(window.FORMIO_SETTINGS.url.slice(0, -1));

        var token = response.headers('x-jwt-token');
        if (response.status >= 200 && response.status < 300 && token && token !== '') {
          Formio.setToken(token);
        }
        return response;
      },

      /**
       * Intercept a response error.
       */
      responseError: function(response) {
        if (parseInt(response.status, 10) === 440) {
          response.loggedOut = true;
          Formio.setToken(null);
          $rootScope.$broadcast('formio.sessionExpired', response.body);
        }
        else if (parseInt(response.status, 10) === 401) {
          $rootScope.$broadcast('formio.unauthorized', response.body);
        }
        return $q.reject(response);
      },

      /**
       * Set the token in the request headers.
       */
      request: function(config) {
        if (config.disableJWT) return config;
        var token = Formio.getToken();
        if (token) config.headers['x-jwt-token'] = token;
        return config;
      }
    };

    return Interceptor;
  }
]);