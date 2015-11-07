'use strict';

angular.module('jenkinsDashboard', ['ngRoute', 'ngResource', 'firebase', 'ngSanitize', 'angularMoment'])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/', {
            templateUrl: 'templates/hud.html',
            controller: 'HomeCtrl'
        }).when('/settings', {
            templateUrl: 'templates/settings.html',
            controller: 'SettingsCtrl'
        }).otherwise({redirectTo: '/'});
    }])
    .constant('amTimeAgoConfig', {
        withoutSuffix: true
    })
    .run(function (amMoment) {
        moment.locale('en', {
            relativeTime: {
                future: "in %s",
                past: "%s ago",
                s: function (number, withoutSuffix, key, isFuture) {
                    return number + 's';
                },
                m: "1m",
                mm: "%dm",
                h: "1h",
                hh: "%dh",
                d: "1d",
                dd: "%dd",
                M: "1M",
                MM: "%dM",
                y: "1y",
                yy: "%dy"
            }
        });
    })
    .factory('Queue', ['$http', '$resource' , function ($http, $resource) {
        return $resource('/queue/api/json', {}, {
            query: {
                method: 'GET',
                isArray: true,
                transformResponse: $http.defaults.transformResponse.concat(function (value) {
                    return value.items;
                })
            }
        });
    }])
    .factory('Computer', ['$resource', function ($resource) {
        return $resource('/computer/api/json?depth=2');
    }])
    .factory('Job', ['$resource', function ($resource) {
        return $resource('/job/:name/:buildNumber/api/json');
    }])
    .factory('View', ['$http', '$resource', function ($http, $resource) {

        var resourceURL = '/view/:view/api/json?tree=jobs[name,color,timestamp,' +
                          'lastFailedBuild[fullDisplayName,number,timestamp,result,culprits[*],actions[*]],' +
                          'lastUnstableBuild[fullDisplayName,number,timestamp,result,culprits[*],actions[*]]]';

        return $resource(resourceURL, {}, {
            query: {
                method: 'GET',
                isArray: true,
                transformResponse: $http.defaults.transformResponse.concat(function (value) {

                    //transform the response into something a bit easier to work with
                    var cleanJobs = [];

                    value.jobs.forEach(function (job) {
                        var badJob = null;
                        //need to convert the color to a status because last build updates once the job starts building
                        if (job.color.indexOf('red') !== -1) {
                            badJob = (job.lastFailedBuild) ? job.lastFailedBuild : null;
                        } else if (job.color.indexOf('yellow') !== -1) {
                            badJob = (job.lastUnstableBuild) ? job.lastUnstableBuild : null;
                        }

                        if (badJob !== null) {
                            cleanJobs.push({
                                name: job.name,
                                number: badJob.number,
                                displayName: badJob.fullDisplayName,
                                status: badJob.result,
                                culprits: badJob.culprits,
                                timestamp: badJob.timestamp
                            });
                        }
                    });

                    return cleanJobs;
                })
            }
        });
    }])
    .controller('HomeCtrl', ['$scope', '$rootScope', '$interval', 'cssChanger', 'appConfig', 'imageChanger', 'Queue', 'Computer', 'Job', 'View', 'autoRefresher', function ($scope, $rootScope, $interval, cssChanger, appConfig, imageChanger, Queue, Computer, Job, View, autoRefresher) {

        function getBranchName(actions) {
            var branch = "";
            actions.some(function (action) {
                if (action.lastBuiltRevision && action.lastBuiltRevision.branch && action.lastBuiltRevision.branch.length > 0) {
                    branch = action.lastBuiltRevision.branch[0].name;
                    return true;
                } else {
                    return false;
                }
            });

            return branch.substr(branch.lastIndexOf('/') + 1);
        }

        $scope.building = [];
        $scope.queued = [];
        $scope.failed = [];

        $scope.showBuilding = false;
        $scope.showFailed = false;

        $rootScope.isBeerBuilding = false;

        $scope.backgroundImage = imageChanger;

        //stat that system that checks to see if we need to apply a custom css
        cssChanger.start();

        //test data
        $scope.building =
            {
                busyExecutors: 1,
                displayName: "Executor 1",
                computer: [
                    {
                        executors: [
                            {
                                idle: false,
                                currentExecutable: {fullDisplayName: "Building job #24", timestamp: 1446938008288}, progress: 25
                            },
                            {
                                idle: false,
                                currentExecutable: {fullDisplayName: "Another job job #99", timestamp: 1446937500288}, progress: 75
                            }
                        ]
                    }

                ]
            };

        $scope.queued = [
            {
                task: {name: "queued job #645"},
                queuedSince: 1446937500288
            }
        ];

        updateShowBuilding();

        $scope.showFailed = true;
        $scope.failed = [
            {
                name: "failed job #23",
                number: 23,
                displayName: "failed job #23",
                status: 'FAILURE',
                culprits: [],
                timestamp:  1446935500288
            },
            {
                name: "failed job #123",
                displayName: "failed job #123",
                status: 'FAILURE',
                culprits: [],
                branchName: "test_branch",
                timestamp: 1446932500288
            },
            {
                name: "unstable job #321",
                displayName: "unstable job #321",
                status: 'UNSTABLE',
                culprits: [],
                branchName: "",
                timestamp: 1446932500288
            }
        ];

        function updateShowBuilding() {
            $scope.showBuilding = ($scope.building.busyExecutors > 0) || ($scope.queued.length > 0);
        }

        $scope.$watch('building.busyExecutors', updateShowBuilding);
        $scope.$watch('queuedBuilds.length', updateShowBuilding);

        function fetchData() {

            Queue.query(function (data) {
                $scope.queued = data;
            });

            Computer.get(function (data) {

//                $rootScope.isBeerBuilding = data.computer.some(function (comp) {
//                    return comp.executors.some(function (ex) {
//                        return ex.currentExecutable !== null && ex.currentExecutable.fullDisplayName.indexOf('Beer') !== -1;
//                    });
//                });

                $scope.building = data;
            });

            View.query({view: appConfig.jenkinsView}, function (jobs) {
                var processed = 0;
                jobs.forEach(function (job) {
                    Job.get({name: job.name, buildNumber: job.number}, function (data) {
                        jobs.forEach(function (j) {
                            if (j.name == job.name) {
                                j.branchName = getBranchName(data.actions);
                            }
                        });

                        processed++;
                        if (processed === jobs.length) {
                            $scope.failed = jobs;
                        }
                    });
                });

                $scope.showFailed = jobs.length > 0;
            });
        }

        //fetchData(); //initial fetch
        //$interval(fetchData, appConfig.refreshInterval);

        function updateClock() {
            $scope.clock = moment().format('Do MMM h:mma');
        }

        updateClock();
        $interval(updateClock, 5000);

    }])
    .controller('SettingsCtrl', ['$scope', 'firebaseConfig', '$firebaseArray', '$window', '$firebaseAuth', function($scope, firebaseConfig, $firebaseArray, $window){

        if(!firebaseConfig.url){
            return;
        }

        var myDataRef = new $window.Firebase(firebaseConfig.url);
        var syncObject = $firebaseArray(myDataRef.child('images'));

        $scope.images = syncObject;

        $scope.newImage = {
            url: "",
            description: "",
            enabled: true
        };

        $scope.addImage = function(image){
            image.user = currentUser;
            syncObject.$add(image);
        };

        $scope.toggleActive = function(image){
            image.enabled = !image.enabled;
            syncObject.$save(image);
        };

    }]);