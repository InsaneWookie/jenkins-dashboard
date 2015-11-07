
angular.module('jenkinsDashboard')
    .constant('firebaseConfig', {
        url: null //firebase url for images eg 'https://<my-firebase-url>/background-image'
    })
    .constant('appConfig', {
        refreshInterval: 30000, //how often to fetch data from jenkins (in milliseconds)
        jenkinsView: 'Dashboard' //only jobs in this view will be looked at for failures
    })
    .constant('cssChangerConfig', {
        rules: [
            {format: 'DDMM', value: '3010', cssHref: 'css/halloween.css'}
        ]
    });