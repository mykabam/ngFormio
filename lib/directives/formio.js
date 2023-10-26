"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
require("core-js/modules/es.object.to-string.js");
require("core-js/modules/es.array.iterator.js");
require("core-js/modules/es.string.iterator.js");
require("core-js/modules/web.dom-collections.iterator.js");
require("core-js/modules/web.url.js");
require("core-js/modules/web.url-search-params.js");
require("core-js/modules/es.array.concat.js");
require("core-js/modules/es.regexp.exec.js");
require("core-js/modules/es.string.replace.js");
require("core-js/modules/es.promise.js");
require("core-js/modules/es.object.assign.js");
require("core-js/modules/es.object.entries.js");
require("core-js/modules/web.dom-collections.for-each.js");
require("core-js/modules/es.array.slice.js");
var _formiojs = require("formiojs");
var app = angular.module('formio');
var _default = app.directive('formio', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=?',
      url: '=?',
      form: '=?',
      submission: '=?',
      readOnly: '=?',
      hideComponents: '=?',
      noSubmit: '=?',
      options: '<?',
      language: '=?',
      i18n: '=?'
    },
    link: function link(scope, element) {
      scope.element = element[0];
      scope.formioReady = false;
      scope.initialized = false;
      scope.options = scope.options || {};
      scope.i18n = scope.i18n || {};
      scope.noSubmit = !!scope.noSubmit;
    },
    controller: ['$scope', '$q', function ($scope, $q) {
      $scope.onLoad = $q.defer();
      $scope.onFormio = $scope.onLoad.promise;
      $scope.initializeForm = function () {
        if (!$scope.element) {
          return;
        }

        // Set read only if using legacy option.
        if (!$scope.options.hasOwnProperty('readOnly') && $scope.readOnly !== undefined) {
          $scope.options.readOnly = $scope.readOnly;
        }

        // Allow legacy hideComponents support.
        if (!$scope.options.hasOwnProperty('hide') && $scope.hideComponents) {
          $scope.options.hide = $scope.hideComponents.reduce(function (option, key) {
            option[key] = true;
            return option;
          }, {});
        }

        // Add the live form parameter to the url.
        if ($scope.src && $scope.src.indexOf('live=') === -1) {
          $scope.src += $scope.src.indexOf('?') === -1 ? '?' : '&';
          $scope.src += 'live=1';
        }
        $scope.getResoruceTranslations = function (lang) {
          var templateName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
          var src = new URL($scope.src);
          var url = "".concat(src.origin, "/language/submission?data.language=").concat(lang);
          if (null == templateName) {
            url += "&data.formApiName=".concat(src.pathname.replace('/', ''));
          } else {
            url += "&data.formTemplateName=".concat(templateName);
          }
          return _formiojs.Formio.fetch(url).then(function (resp) {
            return resp.json();
          }).then(function (result) {
            return result[0] && result[0].data && result[0].data.translations || {};
          });
        };
        $scope.isImgUrl = function (url) {
          var img = new Image();
          img.src = url;
          return new Promise(function (resolve) {
            img.onerror = function () {
              return resolve(false);
            };
            img.onload = function () {
              return resolve(true);
            };
          });
        };
        if ($scope.src || $scope.form) {
          $scope.initialized = true;
          window.Formio.createForm($scope.element, $scope.src || $scope.form, _.cloneDeep($scope.options)).then(function (formio) {
            window.languages = {
              en: true
            };
            window.setFormioLanguage = function (lang, generics) {
              // $scope.$parent.$parent.vm.submission.data.currentLanguage = $scope.language;
              if ($scope.submission == undefined) {
                $scope.submission = {
                  data: {}
                };
              }
              ;
              if (!$scope.submission.data == undefined) {
                $scope.submission.data = {};
              }
              ;
              $scope.submission.data.currentLanguage = $scope.language;
              if (window.languages[lang]) {
                return formio.language = lang;
              }
              $scope.getResoruceTranslations($scope.language, formio.options.properties.template || null).then(function (resourceTranslations) {
                var translations = $scope.i18n[$scope.language] = Object.assign({}, generics, resourceTranslations);
                if (Object.entries(translations).length === 0) {
                  formio.language = 'en';
                } else {
                  formio.addLanguage(lang, translations);
                  formio.language = lang;
                  window.languages[lang] = true;
                }
              });
            };
            window.setFormioLanguage($scope.language, $scope.i18n[$scope.language]);
            formio.nosubmit = $scope.noSubmit;
            formio.on('redraw', function () {
              setTimeout(function () {
                var imgs = document.querySelectorAll('.formio-component.formio-component-file img');
                if (imgs.length) {
                  imgs.forEach(function (img, i) {
                    $scope.isImgUrl(img.src).then(function (status) {
                      if (!status) img.src = '/images/file.png';
                    });
                  });
                }
              }, 1000);
            });
            $scope.$emit('formLoad', formio.wizard ? formio.wizard : formio.form);
            $scope.formio = formio;
            $scope.setupForm();
          });
        }
      };
      $scope.setupForm = function () {
        if ($scope.submission) {
          $scope.formio.submission = angular.copy($scope.submission);
        }
        if ($scope.url) {
          $scope.formio.url = $scope.url;
          $scope.formio.nosubmit = $scope.noSubmit || false;
        }
        $scope.formio.events.onAny(function () {
          // Keep backwards compatibility by firing old events as well.
          var args = Array.prototype.slice.call(arguments);
          var eventParts = args[0].split('.');
          var shouldFire = true;

          // Only handle formio events.
          if (eventParts[0] !== 'formio' || eventParts.length !== 2) {
            return;
          }

          // Remove formio. from event.
          args[0] = eventParts[1];
          switch (eventParts[1]) {
            case 'error':
              args[0] = 'formError';
              break;
            case 'submit':
              args[0] = $scope.formio.nosubmit || !$scope.formio._src ? 'formSubmission' : 'formSubmit';
              break;
            case 'submitDone':
              args[0] = 'formSubmission';
              break;
            case 'prevPage':
              args[0] = 'wizardPrev';
              break;
            case 'nextPage':
              args[0] = 'wizardNext';
              break;
            case 'customEvent':
              args[0] = args[1].type;
              //prevent customEvent from firing when it's emitted by button with event action (as it is emitted twice)
              if (args[1].component && args[1].component.type === 'button' && args[1].component.action === 'event') {
                shouldFire = false;
              }
              break;
          }
          if (shouldFire) {
            $scope.$emit.apply($scope, args);
          }
        });
        $scope.formioReady = true;
        $scope.onLoad.resolve($scope.formio);
        return $scope.formio;
      };
      $scope.$watch('src', function (src) {
        if (!src) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.src = src;
        } else if (!$scope.initialized) {
          $scope.initializeForm();
        } else {
          $scope.onFormio.then(function () {
            return $scope.formio.src = src;
          });
        }
      });
      $scope.$watch('url', function (url) {
        if (!url) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.url = url;
          $scope.formio.nosubmit = $scope.noSubmit || false;
        } else if (!$scope.initialized) {
          $scope.initializeForm();
        } else {
          $scope.onFormio.then(function () {
            $scope.formio.url = url;
            $scope.formio.nosubmit = $scope.noSubmit || false;
          });
        }
      });
      $scope.$watch('form', function (form) {
        if (!form || !form.components) {
          return;
        }
        if ($scope.formioReady) {
          $scope.formio.form = form;
        } else if (!$scope.initialized) {
          $scope.initializeForm();
        } else {
          $scope.onFormio.then(function () {
            return $scope.formio.form = form;
          });
        }
      });
      $scope.$watch('submission', function (submission) {
        if (!submission || $scope.nowatch) {
          $scope.nowatch = false;
          return;
        }
        $scope.onFormio.then(function () {
          angular.copy(submission, $scope.formio.submission);
        });
      }, true);
      $scope.$on('change', function () {
        $scope.nowatch = true;
        angular.merge($scope.submission, $scope.formio.submission);
        $scope.$apply();
      });

      // Clean up the Form from DOM.
      $scope.$on('$destroy', function () {
        if ($scope.formio) {
          $scope.formio.destroy(true);
        }
      });

      // Initialize the form.
      $scope.initializeForm();
    }],
    template: '<div />'
  };
});
exports.default = _default;