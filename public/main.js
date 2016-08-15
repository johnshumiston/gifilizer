'use strict';

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // runConfig.$inject = ['giphyConfigProvider'];
    // function runConfig(giphyConfigProvider) {
    //   // set your private key here
    //   giphyConfigProvider.setKey('dc6zaTOxFJmzC');
    // }

    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
    // Trigger page refresh when accessing an OAuth route
    $urlRouterProvider.when('/auth/:provider', function () {
        window.location.reload();
    });
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        // AuthService.getLoggedInUser().then(function (user) {
        //     // If a user is retrieved, then renavigate to the destination
        //     // (the second time, AuthService.isAuthenticated() will work)
        //     // otherwise, if no user is logged in, go to "login" state.
        //     if (user) {
        //         $state.go(toState.name, toParams);
        //     } else {
        //         $state.go('login');
        //     }
        // });
    });
});

(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.

    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function () {
        if (!window.io) throw new Error('socket.io not found!');
        return window.io(window.location.origin);
    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function responseError(response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function ($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        function onSuccessfulLogin(response) {
            var data = response.data;
            Session.create(data.id, data.user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return data.user;
        }

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function (fromServer) {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.

            // Optionally, if true is given as the fromServer parameter,
            // then this cached value will not be used.

            if (this.isAuthenticated() && fromServer !== true) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin).catch(function () {
                return null;
            });
        };

        this.login = function (credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin).catch(function () {
                return $q.reject({ message: 'Invalid login credentials.' });
            });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.id = null;
        this.user = null;

        this.create = function (sessionId, user) {
            this.id = sessionId;
            this.user = user;
        };

        this.destroy = function () {
            this.id = null;
            this.user = null;
        };
    });
})();

app.config(function ($stateProvider) {

    $stateProvider.state('gifilizer', {
        url: '/gifilizer',
        controller: 'GifilizerController',
        templateUrl: 'js/gifilizer/gifilizer.html'
    });
});

app.controller('GifilizerController', function ($scope, DaFactory) {

    $scope.ready = false;

    $scope.images = [];

    $scope.stream = function (track, searchStr) {
        DaFactory.stream(track).then(function (response) {
            var html = response.html.replace('height="400"', 'height="100"').replace('visual=true', 'visual=false').replace('artwork=true', 'artwork=false');
            $scope.player = html;
            angular.element(document.querySelector('#thediv')).append(html);
            $scope.$evalAsync();
        });
    };

    $scope.getImage = function (searchStr) {
        $scope.ready = true;

        var gifs = [];
        var searches = searchStr.split(" ");

        var findingFirstBatch = gifGetter(searches[0]);
        var findingSecondBatch = gifGetter(searches[1]);
        var findingThirdBatch = gifGetter(searches[2]);

        function gifGetter(eachSearch) {
            var thing = 'http://api.giphy.com/v1/gifs/search?q=' + eachSearch + '&api_key=dc6zaTOxFJmzC';
            return DaFactory.factGetter(thing).then(function (image) {
                for (var j = 1; j <= 10; j++) {
                    gifs.push(image.data.data[j].images.original.url);
                }
            });
        }

        Promise.all([findingFirstBatch, findingSecondBatch, findingThirdBatch]).then(function () {
            return DaFactory.shuffle(gifs);
        }).then(function (final) {
            $scope.images = final;

            var slideIndex = 0;
            carousel();

            function carousel() {
                var i;
                var x = document.getElementsByClassName("slides");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                slideIndex++;
                if (slideIndex > x.length) {
                    slideIndex = 1;
                }
                x[slideIndex - 1].style.display = "block";
                setTimeout(carousel, 3000);
            }
        });
    };

    $scope.startTheGif = function (searchStr, track) {
        $scope.stream(track);
        $scope.getImage(searchStr);
    };
});

app.factory('DaFactory', function ($http, $state, $rootScope) {
    var DaFactory = {};

    DaFactory.stream = function (trackPath) {
        if (!trackPath) {
            trackPath = "https://soundcloud.com/odesza/hayden-james-something-about-you-odesza-remix";
        }
        return SC.oEmbed(trackPath, { auto_play: true });
    };

    DaFactory.factGetter = function (thing) {
        return $http.get(thing);
    };

    DaFactory.shuffle = function (a) {
        var j, x, i;
        for (i = a.length; i; i--) {
            j = Math.floor(Math.random() * i);
            x = a[i - 1];
            a[i - 1] = a[j];
            a[j] = x;
        }
        return a;
    };

    return DaFactory;
});
app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
    });
});
app.directive('navbar', function ($rootScope, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [{ label: 'Home', state: 'home' }, { label: 'The Gifilizer', state: 'gifilizer' }];
        }

    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2lmaWxpemVyL2dpZmlsaXplci5qcyIsImhvbWUvaG9tZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBOzs7Ozs7OztBQVFBLHNCQUFBLFNBQUEsQ0FBQSxJQUFBOztBQUVBLHVCQUFBLFNBQUEsQ0FBQSxHQUFBOztBQUVBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0EsS0FGQTtBQUdBLENBZkE7OztBQWtCQSxJQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxRQUFBLCtCQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxJQUFBLE1BQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxLQUZBOzs7O0FBTUEsZUFBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSw2QkFBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0E7QUFDQTs7QUFFQSxZQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBO0FBQ0E7OztBQUdBLGNBQUEsY0FBQTs7Ozs7Ozs7Ozs7O0FBYUEsS0E1QkE7QUE4QkEsQ0F2Q0E7O0FDckJBLENBQUEsWUFBQTs7QUFFQTs7OztBQUdBLFFBQUEsQ0FBQSxPQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFB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LEtBQUEsS0FBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxjQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQ0EsY0FBQSxDQUFBLElBQUEsQ0FBQTtBQUNBO0FBQ0EsZUFBQSxDQUFBO0FBQ0EsS0FUQTs7QUFXQSxXQUFBLFNBQUE7QUFDQSxDQTFCQTtBQy9FQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxhQUFBLEdBREE7QUFFQSxxQkFBQTtBQUZBLEtBQUE7QUFJQSxDQUxBO0FDQUEsSUFBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLGVBQUEsRUFGQTtBQUdBLHFCQUFBLHlDQUhBO0FBSUEsY0FBQSxjQUFBLEtBQUEsRUFBQTs7QUFFQSxrQkFBQSxLQUFBLEdBQUEsQ0FDQSxFQUFBLE9BQUEsTUFBQSxFQUFBLE9BQUEsTUFBQSxFQURBLEVBRUEsRUFBQSxPQUFBLGVBQUEsRUFBQSxPQUFBLFdBQUEsRUFGQSxDQUFBO0FBS0E7O0FBWEEsS0FBQTtBQWVBLENBakJBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBydW5Db25maWcuJGluamVjdCA9IFsnZ2lwaHlDb25maWdQcm92aWRlciddO1xuICAgIC8vIGZ1bmN0aW9uIHJ1bkNvbmZpZyhnaXBoeUNvbmZpZ1Byb3ZpZGVyKSB7XG4gICAgLy8gICAvLyBzZXQgeW91ciBwcml2YXRlIGtleSBoZXJlIFxuICAgIC8vICAgZ2lwaHlDb25maWdQcm92aWRlci5zZXRLZXkoJ2RjNnphVE94RkptekMnKTtcbiAgICAvLyB9XG5cbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIC8vICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgIC8vICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgIC8vICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgIC8vICAgICBpZiAodXNlcikge1xuICAgICAgICAvLyAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgLy8gICAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdnaWZpbGl6ZXInLCB7XG4gICAgICAgIHVybDogJy9naWZpbGl6ZXInLFxuICAgICAgICBjb250cm9sbGVyOiAnR2lmaWxpemVyQ29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZ2lmaWxpemVyL2dpZmlsaXplci5odG1sJyxcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdHaWZpbGl6ZXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRGFGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUucmVhZHkgPSBmYWxzZTtcblxuICAgICRzY29wZS5pbWFnZXMgPSBbXTtcblxuICAgICRzY29wZS5zdHJlYW0gPSBmdW5jdGlvbih0cmFjaywgc2VhcmNoU3RyKXtcbiAgICBcdFx0RGFGYWN0b3J5LnN0cmVhbSh0cmFjaylcbiAgICBcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgXHRcdFx0XHR2YXIgaHRtbCA9IHJlc3BvbnNlLmh0bWwucmVwbGFjZSgnaGVpZ2h0PVwiNDAwXCInLCAnaGVpZ2h0PVwiMTAwXCInKS5yZXBsYWNlKCd2aXN1YWw9dHJ1ZScsICd2aXN1YWw9ZmFsc2UnKS5yZXBsYWNlKCdhcnR3b3JrPXRydWUnLCAnYXJ0d29yaz1mYWxzZScpO1xuICAgIFx0XHRcdFx0JHNjb3BlLnBsYXllcj1odG1sO1xuICAgIFx0XHRcdFx0YW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN0aGVkaXYnKSkuYXBwZW5kKGh0bWwpO1xuICAgIFx0XHRcdFx0JHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICBcdFx0XHR9KVxuICAgIFx0fTtcblxuICAgICRzY29wZS5nZXRJbWFnZSA9IGZ1bmN0aW9uKHNlYXJjaFN0cil7XG4gICAgXHQkc2NvcGUucmVhZHkgPSB0cnVlO1xuXG5cdFx0dmFyIGdpZnMgPSBbXTtcblx0XHR2YXIgc2VhcmNoZXMgPSBzZWFyY2hTdHIuc3BsaXQoXCIgXCIpXG5cblx0XHR2YXIgZmluZGluZ0ZpcnN0QmF0Y2ggPSBnaWZHZXR0ZXIoc2VhcmNoZXNbMF0pXG5cdFx0dmFyIGZpbmRpbmdTZWNvbmRCYXRjaCA9IGdpZkdldHRlcihzZWFyY2hlc1sxXSlcblx0XHR2YXIgZmluZGluZ1RoaXJkQmF0Y2ggPSBnaWZHZXR0ZXIoc2VhcmNoZXNbMl0pXG5cblx0XHRmdW5jdGlvbiBnaWZHZXR0ZXIoZWFjaFNlYXJjaCl7XG5cdFx0XHR2YXIgdGhpbmcgPSAnaHR0cDovL2FwaS5naXBoeS5jb20vdjEvZ2lmcy9zZWFyY2g/cT0nICsgZWFjaFNlYXJjaCArICcmYXBpX2tleT1kYzZ6YVRPeEZKbXpDJztcblx0XHRcdHJldHVybiBEYUZhY3RvcnkuZmFjdEdldHRlcih0aGluZylcblx0XHRcdC50aGVuKGZ1bmN0aW9uKGltYWdlKXtcblx0XHRcdFx0Zm9yKHZhciBqPTE7IGo8PTEwOyBqKyspe1xuXHQgICAgXHRcdFx0Z2lmcy5wdXNoKGltYWdlLmRhdGEuZGF0YVtqXS5pbWFnZXMub3JpZ2luYWwudXJsKTtcblx0ICAgIFx0XHR9XG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdFByb21pc2UuYWxsKFtmaW5kaW5nRmlyc3RCYXRjaCwgZmluZGluZ1NlY29uZEJhdGNoLCBmaW5kaW5nVGhpcmRCYXRjaF0pXG5cdFx0LnRoZW4oZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiBEYUZhY3Rvcnkuc2h1ZmZsZShnaWZzKVxuXHRcdH0pXG5cdFx0LnRoZW4oZnVuY3Rpb24oZmluYWwpe1xuXHRcdFx0JHNjb3BlLmltYWdlcyA9IGZpbmFsO1xuXG5cdFx0XHR2YXIgc2xpZGVJbmRleCA9IDA7XG5cdFx0XHRjYXJvdXNlbCgpO1xuXG5cdFx0XHRmdW5jdGlvbiBjYXJvdXNlbCAoKSB7XG5cdFx0XHQgICAgdmFyIGk7XG5cdFx0XHQgICAgdmFyIHggPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwic2xpZGVzXCIpO1xuXHRcdFx0ICAgIGZvciAoaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHQgICAgICB4W2ldLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjsgXG5cdFx0XHQgICAgfVxuXHRcdFx0ICAgIHNsaWRlSW5kZXgrKztcblx0XHRcdCAgICBpZiAoc2xpZGVJbmRleCA+IHgubGVuZ3RoKSB7c2xpZGVJbmRleCA9IDF9IFxuXHRcdFx0ICAgIHhbc2xpZGVJbmRleC0xXS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiOyBcblx0XHRcdCAgICBzZXRUaW1lb3V0KGNhcm91c2VsLCAzMDAwKTtcblx0XHRcdH1cblxuXHRcdH0pXG5cblx0fTtcblxuXHQkc2NvcGUuc3RhcnRUaGVHaWYgPSBmdW5jdGlvbihzZWFyY2hTdHIsIHRyYWNrKXtcblx0XHQkc2NvcGUuc3RyZWFtKHRyYWNrKVxuXHRcdCRzY29wZS5nZXRJbWFnZShzZWFyY2hTdHIpXG5cdH1cblxufSk7XG5cbmFwcC5mYWN0b3J5KCdEYUZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgJHN0YXRlLCAkcm9vdFNjb3BlKXtcblx0dmFyIERhRmFjdG9yeSA9IHt9O1xuXG5cdERhRmFjdG9yeS5zdHJlYW0gPSBmdW5jdGlvbih0cmFja1BhdGgpe1xuXHRcdGlmKCF0cmFja1BhdGgpe1xuXHRcdFx0dHJhY2tQYXRoPVwiaHR0cHM6Ly9zb3VuZGNsb3VkLmNvbS9vZGVzemEvaGF5ZGVuLWphbWVzLXNvbWV0aGluZy1hYm91dC15b3Utb2Rlc3phLXJlbWl4XCJcblx0XHR9XG5cdFx0cmV0dXJuIFNDLm9FbWJlZCh0cmFja1BhdGgsIHsgYXV0b19wbGF5OiB0cnVlIH0pXG5cdH1cblxuXHREYUZhY3RvcnkuZmFjdEdldHRlciA9IGZ1bmN0aW9uICh0aGluZyl7XG5cdFx0cmV0dXJuICRodHRwLmdldCh0aGluZylcblx0fVxuXG5cdERhRmFjdG9yeS5zaHVmZmxlID0gZnVuY3Rpb24oYSkge1xuICAgIFx0XHR2YXIgaiwgeCwgaTtcbiAgICBcdFx0Zm9yIChpID0gYS5sZW5ndGg7IGk7IGktLSkge1xuXHRcdCAgICAgICAgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xuXHRcdCAgICAgICAgeCA9IGFbaSAtIDFdO1xuXHRcdCAgICAgICAgYVtpIC0gMV0gPSBhW2pdO1xuXHRcdCAgICAgICAgYVtqXSA9IHg7XG4gICAgXHRcdH1cbiAgICBcdFx0cmV0dXJuIGE7XG5cdFx0fVxuXG5cdHJldHVybiBEYUZhY3Rvcnk7XG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnVGhlIEdpZmlsaXplcicsIHN0YXRlOiAnZ2lmaWxpemVyJyB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
