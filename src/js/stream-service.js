(function() {
    var app = angular.module('mcbStream', [])
        .factory('stream', ['$q', Stream]);

    function Stream($q) {
        var stream;
        var audio_stream;
        var video_stream;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        return {
            getVideoOnly: function() {
                if (video_stream) {
                    return $q.when(video_stream);
                } else {
                    var d = $q.defer();
                    navigator.getUserMedia({
                        video: true,
                        audio: true
                    }, function(s) {
                        video_stream = s;
                        d.resolve(video_stream);
                    }, function(e) {
                        d.reject(e);
                    });
                    return d.promise;
                }
            },
            getAudio: function() {
                if (audio_stream) {
                    return $q.when(audio_stream);
                } else {
                    var d = $q.defer();
                    navigator.getUserMedia({
                        video: false,
                        audio: true
                    }, function(s) {
                        audio_stream = s;
                        d.resolve(audio_stream);
                    }, function(e) {
                        d.reject(e);
                    });
                    return d.promise;
                }
            },
            get: function() {
                if (stream) {
                    return $q.when(stream);
                } else {
                    var d = $q.defer();
                    navigator.getUserMedia({
                        video: true,
                        audio: true
                    }, function(s) {
                        stream = s;
                        d.resolve(stream);
                    }, function(e) {
                        d.reject(e);
                    });
                    return d.promise;
                }
            }
        };
    }
})();
