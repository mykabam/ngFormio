import { Formio } from 'formiojs';
const app = angular.module('formio');
export default app.directive('formio', function() {
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
    link: function (scope, element) {
      scope.element = element[0];
      scope.formioReady = false;
      scope.initialized = false;
      scope.options = scope.options || {};
      scope.i18n = scope.i18n || {};
      scope.noSubmit = !!scope.noSubmit;
    },
    controller: [
      '$scope',
      '$q',
      function ($scope, $q) {
        $scope.onLoad = $q.defer();
        $scope.onFormio = $scope.onLoad.promise;
        $scope.initializeForm = async function() {
          if (!$scope.element) {
            return;
          }

          // Set read only if using legacy option.
          if (!$scope.options.hasOwnProperty('readOnly') && $scope.readOnly !== undefined) {
            $scope.options.readOnly = $scope.readOnly;
          }

          // Allow legacy hideComponents support.
          if (!$scope.options.hasOwnProperty('hide') && $scope.hideComponents) {
            $scope.options.hide = $scope.hideComponents.reduce((option, key) => {
              option[key] = true;
              return option;
            }, {});
          }

          // Add the live form parameter to the url.
          if ($scope.src && ($scope.src.indexOf('live=') === -1)) {
            $scope.src += ($scope.src.indexOf('?') === -1) ? '?' : '&';
            $scope.src += 'live=1';
          }

          $scope.getResoruceTranslations = async (lang, templateName = null) => {
            const src = (new URL($scope.src));
            let url = `${src.origin}/language/submission?data.language=${lang}`;

            if(null == templateName) {
              url += `&data.formApiName=${src.pathname.replace('/', '')}`;
            } else {
              url += `&data.formTemplateName=${templateName}`;
            }

            let result = await Formio.fetch(url).then(function(resp) {
              return resp.json();
            });

            return result[0]?.data?.translations || {};
          }

          if ($scope.src || $scope.form) {
            $scope.initialized = true;

            Formio.createForm($scope.element, $scope.src || $scope.form, _.cloneDeep($scope.options)).then(async (formio) => {
              window.languages = {en: true};

              window.setFormioLanguage = async function(lang, generics) {
                if (languages[lang]) {
                  return formio.language = lang;
                }

                let resourceTranslations = await $scope.getResoruceTranslations($scope.language, formio.options.properties.template || null);
                let translations = $scope.i18n[$scope.language] = Object.assign({}, generics, resourceTranslations);

                if(Object.entries(translations).length === 0) {
                  formio.language = 'en';
                } else {
                  formio.addLanguage(lang, translations);
                  formio.language = lang;
                  languages[lang] = true;
                }
              }

              if($scope.language && $scope.language != 'en') {
                window.setFormioLanguage($scope.language, $scope.i18n[$scope.language]);
              }

              formio.nosubmit = $scope.noSubmit;
              $scope.$emit('formLoad', formio.wizard ? formio.wizard : formio.form);
              $scope.formio = formio;
              $scope.setupForm();
            });
          }
        };

        $scope.setupForm = function() {
          if ($scope.submission) {
            $scope.formio.submission = angular.copy($scope.submission);
          }
          if ($scope.url) {
            $scope.formio.url = $scope.url;
            $scope.formio.nosubmit = $scope.noSubmit || false;
          }
          $scope.formio.events.onAny(function() {
            // Keep backwards compatibility by firing old events as well.
            const args = Array.prototype.slice.call(arguments);

            const eventParts = args[0].split('.');

            let shouldFire = true;

            // Only handle formio events.
            if (eventParts[0] !== 'formio' || eventParts.length !== 2) {
              return;
            }

            // Remove formio. from event.
            args[0] = eventParts[1];
            switch(eventParts[1]) {
              case 'error':
                args[0] = 'formError';
                break;
              case 'submit':
                args[0] = ($scope.formio.nosubmit || !$scope.formio._src) ? 'formSubmission' : 'formSubmit';
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

        $scope.$watch('src', src => {
          if (!src) {
            return;
          }
          if ($scope.formioReady) {
            $scope.formio.src = src;
          }
          else if (!$scope.initialized) {
            $scope.initializeForm();
          }
          else {
            $scope.onFormio.then(() => ($scope.formio.src = src));
          }
        });

        $scope.$watch('url', url => {
          if (!url) {
            return;
          }
          if ($scope.formioReady) {
            $scope.formio.url = url;
            $scope.formio.nosubmit = $scope.noSubmit || false;
          }
          else if (!$scope.initialized) {
            $scope.initializeForm();
          }
          else {
            $scope.onFormio.then(() => {
              $scope.formio.url = url;
              $scope.formio.nosubmit = $scope.noSubmit || false;
            });
          }
        });

        $scope.$watch('form', form => {
          if (!form || !form.components) {
            return;
          }
          if ($scope.formioReady) {
            $scope.formio.form = form;
          }
          else if (!$scope.initialized) {
            $scope.initializeForm();
          }
          else {
            $scope.onFormio.then(() => ($scope.formio.form = form));
          }
        });

        $scope.$watch('submission', submission => {
          if (!submission || $scope.nowatch) {
            $scope.nowatch = false;
            return;
          }
          $scope.onFormio.then(() => {
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
      }
    ],
    template: '<div />'
  };
});
