app.config(function ($stateProvider) {

    $stateProvider.state('gifilizer', {
        url: '/gifilizer',
        controller: 'GifilizerController',
        templateUrl: 'js/gifilizer/gifilizer.html',
    });

});

app.controller('GifilizerController', function ($scope, DaFactory) {

    $scope.names = 'soundcloud';

    $scope.ready = false;

    $scope.images = [];

    $scope.x = "100%";
    $scope.y = "900px";

    $scope.stream = function(track, searchStr){
    		DaFactory.stream(track)
    			.then(function(response){
    				var html = response.html.replace('height="400"', 'height="100"').replace('visual=true', 'visual=false').replace('artwork=true', 'artwork=false');
    				$scope.player=html;
    				angular.element(document.querySelector('#thediv')).append(html);
    				$scope.$evalAsync();
    			})
    	};

    $scope.getImage = function(searchStr){
    	$scope.ready = true;

		var gifs = [];
		var searches = searchStr.split(" ")

		var findingFirstBatch = gifGetter(searches[0])
		var findingSecondBatch = gifGetter(searches[1])
		var findingThirdBatch = gifGetter(searches[2])

		function gifGetter(eachSearch){
			var thing = 'http://api.giphy.com/v1/gifs/search?q=' + eachSearch + '&api_key=dc6zaTOxFJmzC';
			return DaFactory.factGetter(thing)
			.then(function(image){
				for(var j=1; j<=10; j++){
	    			gifs.push(image.data.data[j].images.original.url);
	    		}
			})
		}

		Promise.all([findingFirstBatch, findingSecondBatch, findingThirdBatch])
		.then(function(){
			return DaFactory.shuffle(gifs)
		})
		.then(function(final){
			$scope.images = final;

			var slideIndex = 0;
			carousel();

			function carousel () {
			    var i;
			    var x = document.getElementsByClassName("mySlides");
			    for (i = 0; i < x.length; i++) {
			      x[i].style.display = "none"; 
			    }
			    slideIndex++;
			    if (slideIndex > x.length) {slideIndex = 1} 
			    x[slideIndex-1].style.display = "block"; 
			    setTimeout(carousel, 3000);
			}

		})

	};

	$scope.startTheGif = function(searchStr, track){
		$scope.stream(track)
		$scope.getImage(searchStr)
	}

});

app.factory('DaFactory', function($http, $state, $rootScope){
	var DaFactory = {};

	DaFactory.stream = function(trackPath){
		if(!trackPath){
			trackPath="https://soundcloud.com/odesza/hayden-james-something-about-you-odesza-remix"
		}
		return SC.oEmbed(trackPath, { auto_play: true })
	}

	DaFactory.factGetter = function (thing){
		return $http.get(thing)
	}

	DaFactory.shuffle = function(a) {
    		var j, x, i;
    		for (i = a.length; i; i--) {
		        j = Math.floor(Math.random() * i);
		        x = a[i - 1];
		        a[i - 1] = a[j];
		        a[j] = x;
    		}
    		return a;
		}

	return DaFactory;
})