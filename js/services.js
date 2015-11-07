"use strict";

angular.module('jenkinsDashboard')
    .service('imageChanger', ['$window', 'firebaseConfig', '$firebaseArray', '$interval', function ($window, firebaseConfig, $firebaseArray, $interval) {

        if(!firebaseConfig.url){
            return;
        }

        var that = this;
        var myDataRef = new $window.Firebase(firebaseConfig.url);
        var images = $firebaseArray(myDataRef.child('images').orderByChild('enabled').equalTo(true));
        var selectedId = null;

        var currentSelectedIndex = 0;

        this.url = "";

        function updateImage(){
            if(images.length > 0){
                currentSelectedIndex = (currentSelectedIndex >= images.length - 1) ? 0 : currentSelectedIndex + 1;
                that.url = images[currentSelectedIndex].url;
                selectedId = images[currentSelectedIndex].$id;
            }
        }

        images.$loaded(function(){
            updateImage();
            //TODO: would really like it to update on the half hour or what ever the time interval is
            $interval(updateImage, 1000 * 60 * 15); //TODO make this configurable
        });

        images.$watch(function (obj) {
            if(obj.event === 'child_removed' && obj.key === selectedId){
               updateImage();
            }
        });


    }])
    .service('cssChanger', ['$interval', 'cssChangerConfig', function ($interval, cssChangerConfig) {
        //the idea here is to automatically change css based on a give date/time
        //kind of like cron
        //can only have one custom css loaded at a time, if more than one time clash then the last one will be loaded

        var CHECK_TIME = 10000; //check every 10 seconds, this give a min resolution of 10 seconds
        var config = cssChangerConfig.rules;

        this.appendCssLink = function (cssHref) {
            //TODO set up some proper binding instead of manually creating the element
            $('head').append('<link rel="stylesheet" type="text/css" href="' + cssHref + '" id="custom_css">');
        };

        this.applyRule = function (configItem) {
            var customCss = $("#custom_css");
            if (moment().format(configItem.format) === configItem.value) {
                if (customCss.length === 0) {
                    this.appendCssLink(configItem.cssHref);
                } else if (customCss.attr('href') !== configItem.cssHref) {
                    customCss.remove();
                    this.appendCssLink(configItem.cssHref);
                }
                return true;
            }
            return false;
        };

        this.applyRules = function (configData) {
            var that = this;
            var activeRules = 0;
            configData.forEach(function (item) {
                if(that.applyRule(item)){
                    activeRules++;
                }
            });

            if(activeRules === 0) {
                $("#custom_css").remove();
            }
        };

        this.start = function (optionalConfig) {
            var that = this;
            if (optionalConfig === undefined) {
                optionalConfig = config;
            }
            this.applyRules(optionalConfig);
            $interval(function () {
                that.applyRules(optionalConfig);
            }, CHECK_TIME);
        };

    }])
    .service('autoRefresher', ['firebaseConfig', '$location', '$window', '$firebaseObject', function(firebaseConfig, $location, $window, $firebaseObject){

//        var myDataRef = new $window.Firebase(firebaseConfig.url);
//
//        var syncObject = $firebaseObject(myDataRef.child('refresh'));
//
//        syncObject.$watch(function () {
//            $location.replace();
//        });
    }]);