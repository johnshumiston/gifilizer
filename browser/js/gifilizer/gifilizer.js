app.config(function ($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('gifilizer', {
        url: '/gifilizer',
        controller: 'GifilizerController',
        templateUrl: 'js/gifilizer/gifilizer.html',
    });

});

app.controller('GifilizerController', function ($scope, DaFactory) {

	// console.log("logging", SC)
    $scope.names = 'soundcloud';

    $scope.stream = DaFactory.stream;

    $scope.console = DaFactory.console;

    $scope.ready = false;

    $scope.images = [];

    $scope.x = "100%";
    $scope.y = "900px";

    $scope.stream = function(track){
    		DaFactory.stream(track)
    			.then(function(response){
    				var html = response.html.replace('height="400"', 'height="100"').replace('visual=true', 'visual=false').replace('artwork=true', 'artwork=false');
    				$scope.player=html;
    				angular.element(document.querySelector('#thediv')).append(html);
    				$scope.$evalAsync();
    			});
    	};
    $scope.getImage = function(searchStr){
    	$scope.ready=true;
    	var images = [];
    	searchStr.split(" ").forEach(function(eachSearch){
	    	DaFactory.gifSearch(eachSearch)
	    	.then(function(image){
	    		for(var j=1; j<=10; j++){
	    			$scope.images.push(image.data.data[j].images.original.url);
	    		}
	    	});
    	});
    	var slideIndex = 0;
		carousel();

		function carousel() {
		    var i;
		    var x = document.getElementsByClassName("mySlides");
		    for (i = 0; i < x.length; i++) {
		      x[i].style.display = "none"; 
		    }
		    slideIndex++;
		    if (slideIndex > x.length) {slideIndex = 1} 
		    x[slideIndex-1].style.display = "block"; 
		    setTimeout(carousel, 3000); // Change image every 2 seconds
		}
	};

	$scope.startTheGif = function(track, searchStr){
		$scope.stream(track);
		$scope.getImage(searchStr);
	}

});

app.factory('DaFactory', function($http, $state, $rootScope){
	var DaFactory = {};

	DaFactory.stream = function(trackPath){
		return SC.oEmbed(trackPath, { auto_play: true })
	}

	DaFactory.gifSearch = function(search){
		var thing = 'http://api.giphy.com/v1/gifs/search?q=' + search + '&api_key=dc6zaTOxFJmzC'
		return $http.get(thing)
	}

	return DaFactory;
})