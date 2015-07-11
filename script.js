(function(app_name) {
  var app = angular.module('app', [])
    .factory('stream', ['$q', Stream])
    .service('persist', ['$q', Persistence])
    .service('peer', ['$q', '$rootScope', 'persist', 'stream', PeerService])
    .controller('controller', ['$q', '$scope', 'peer', Controller])
    .directive('chat', [Chat]);

  function Controller($q, $scope, peer) {
    this.title = "Welcome ";
    var ctl = this;
    this.items = [];
    this.use = {
      video: false,
      audio: true
    };

    this.peer = peer;

    $scope.$on('msgReceived', function(event, msg) {
      $scope.$apply(function() {
        ctl.items.push(msg);
      });
    });
    this.send = function(item) {
      console.log(ctl.chat_next);
      var msg = {
        peer: ctl.peer.peer_id,
        data: ctl.chat_next
      };
      this.peer.peers.connection[item.peer_id].chat.messages.push(msg);
      this.peer.peers.connection[item.peer_id].chat.send(msg.data);

      ctl.chat_next = "";
    };
    this.connect = function(id) {
      this.peer_id = id;
      this.peer.connectToPeer(this.peer_id, metadata);
    };
    this.video = function(item) {
      this.peer_id = item;
      this.peer.call(item, 'video').then(function() {
        $scope.$apply();
      });
    };
    this.call = function(item) {
      this.peer_id = item;
      this.peer.call(item, 'audio').then(function() {
        $scope.$apply();
      });
    };
    this.bootstrapPeer = function() {
      var reg = _.bind(ctl.peer.registerHandlers, ctl.peer, ctl.use.video, ctl.use.audio);
      ctl.peer.startup($scope, ctl.peer.peer_prefix + ctl.user)
        .then(reg);
    };

    this.closeConnection = function(item) {
      ctl.peer.closeConnections(c.peer);
    };
    this.closePeer = function() {
      ctl.user = undefined;
      ctl.peer.peer_id = undefined;
      ctl.peer.peer.destroy();
      ctl.peer.peers.connection[c.peer] = undefined;
    };
  }


  function PeerService($q, $rootScope, persist, stream) {
    var service = this;
    this.peers = {
      list: [],
      messages: [],
      connection: {}
    };
    this.connections = [];
    this.listConnections = function() {
      var defer = $q.defer();

      var conns = _.chain(_.keys(service.peers.connection))
        .map(function(key) {
          return {
            peer_id: key,
            data: service.peers.connection[key]
          };
        })
        .value();
      _.assign(service.connections, conns);
      defer.resolve(service.connections);
      return defer.promise;
    };

    this.peer_id = undefined;
    this.closeConnections = function(peer_id) {
      eachActiveConnection(peer_id, function(c) {
        c.close();
      });
    };
    // Goes through each active peer and calls FN on its connections
    function eachActiveConnection(id, fn) {

      var checkedIds = {};
      var peerId = id;

      if (!checkedIds[peerId]) {
        var conns = service.peer.connections[peerId];
        for (var i = 0, ii = conns.length; i < ii; i += 1) {
          var conn = conns[i];
          fn(conn, $(this));
        }
      }
      checkedIds[peerId] = 1;
    }
    // Handle a connection object.
    function connect(c) {
      var peers = service.peers;
      if (peers.connection[c.peer] === undefined) {
        peers.connection[c.peer] = {};
        peers.connection[c.peer].connected = {};
      }
      if (c.metadata !== undefined) {
        if (peers.connection[c.peer].info === undefined) {
          peers.connection[c.peer].info = {};
        }
        _.assign(peers.connection[c.peer].info, c.metadata);
      }
      // Handle a chat connection.
      if (c.label === 'chat') {
        peers.connection[c.peer].chat = c;
        peers.connection[c.peer].chat.messages = [];

        peers.connection[c.peer].connected.chat = true;
        c.on('data', function(data) {;
          var msg = {
            peer: c.peer,
            data: data,
            is_object_url: false
          };
          peers.connection[c.peer].chat.messages.push(msg);
          $rootScope.$broadcast('msgReceived', msg);
        });
        c.on('close', function() {
          peers.connection[c.peer].connected.chat = false;

        });
      } else if (c.label === 'file') {
        peers.connection[c.peer].file = c;
        peers.connection[c.peer].file.messages = [];
        c.on('data', function(data) {
          // If we're getting a file, create a URL for it.
          if (data.constructor === ArrayBuffer) {
            var dataView = new Uint8Array(data);
            var dataBlob = new Blob([dataView]);
            var url = window.URL.createObjectURL(dataBlob);
            peers.connection[c.peer].file.messages.push(url);
            peers.messages.push({
              peer: c.peer,
              data: url,
              is_object_url: true
            });
          }
        });
      }
      service.listConnections();
    }

    this.startup = function() {
      var defer = $q.defer();
      service.peer = new Peer({
        key: 'lwjd5qra8257b9'
      });
      service.peer.on('open', function(id) {
        console.log('My peer ID is: ' + id);
        service.peer_id = id;
        console.log(service);
        service.listAllPeers().then(
          function(obj) {
            defer.resolve(obj);
          });
      });
      return defer.promise;
    };

    this.listAllPeers = function() {
      var defer = $q.defer();
      var cb = function(defer, list) {
        angular.copy(list, this.peers.list);
        console.log(this.peers);
        defer.resolve(this.peers);
      };
      cb = _.bind(cb, service, defer);
      service.peer.listAllPeers(cb);
      return defer.promise;
    };
    this.registerHandlers = function(streamType) {
      var peer = service.peer;
      peer.on('call', function(call) {
        var c = call;
        var peers = service.peers;
        if (service.peers.connection[c.peer] === undefined) {
          service.peers.connection[c.peer] = {};
          service.peers.connection[c.peer].connected = {};
        }
        if (c.metadata !== undefined) {
          if (peers.connection[c.peer].info === undefined) {
            peers.connection[c.peer].info = {};
          }
          _.assign(peers.connection[c.peer].info, c.metadata);
        }
        service.peers.connection[c.peer].call = c;
        var s = undefined;
        if (streamType === 'video_only') {
          s = stream.getVideoOnly();
        } else if (streamType === 'audio') {
          s = stream.getAudio();
        } else if (streamType === 'audio_video') {
          s = stream.get();
        }
        s.then(function(stream) {
          call.answer(stream); // Answer the call with an A/V stream.
          call.on('stream', function(remoteStream) {
            // Show stream in some video/canvas element.
            service.peers.connection[c.peer].remote_stream = URL.createObjectURL(remoteStream);
          });
        }, function(err) {
          console.log('Failed to get local stream', err);
        });
      });
      peer.on('connection', _.bind(connect, service));
    };

    this.call = function(rem_id, streamType, metadata) {
      var defer = $q.defer();
      var s = undefined;
      if (streamType === 'video_only') {
        s = stream.getVideoOnly();
      } else if (streamType === 'audio') {
        s = stream.getAudio();
      } else if (streamType === 'audio_video') {
        s = stream.get();
      }
      s.then(function(stream) {
        var call = service.peer.call(rem_id, stream);
        var c = call;
        c.peer = rem_id;
        var peers = service.peers;
        if (service.peers.connection[c.peer] === undefined) {
          service.peers.connection[c.peer] = {};
          service.peers.connection[c.peer].connected = {};
        }
        if (c.metadata !== undefined) {
          if (peers.connection[c.peer].info === undefined) {
            peers.connection[c.peer].info = {};
          }
          _.assign(peers.connection[c.peer].info, c.metadata);
        }
        service.peers.connection[c.peer].call = c;
        call.on('stream', function(remoteStream) {
          // Show stream in some video/canvas element.
          service.peers.connection[c.peer].remote_stream = URL.createObjectURL(remoteStream);
          defer.resolve(service.peers.connection[c.peer].remote_stream);
        });
      }, function(err) {
        console.log('Failed to get local stream', err);
        defer.reject(new Error(err));
      });
      return defer.promise;
    };

    this.connectToPeer = function(rem_id, metadata) {
      var defer = $q.defer();
      service.peer.disconnected = false;
      var c = service.peer.connect(rem_id, {
        label: 'chat',
        serialization: 'none',
        reliable: false,
        metadata: metadata
      });
      c.on('open', _.bind(connect, service));
      c.on('error', function(err) {
        alert(err);
      });
      var f = service.peer.connect(rem_id, {
        label: 'file',
        metadata: {
          name: 'tester.123'
        }
      });

      f.on('open', _.bind(connect, service));
      f.on('error', function(err) {
        alert(err);
      });
      return defer.promise;
    };

    return service;
  }

})('app');;