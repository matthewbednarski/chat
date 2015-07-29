(function() {
    var module = angular.module('mcbPeer', ['mcbPersist', 'mcbStream']);

    module.service('$call', ['$q', '$sce', 'stream', CallService])
    module.service('$peer', ['$q', '$rootScope', '$sce', 'persist', 'stream', '$call', PeerService])

    function CallService($q, $sce, streamSvc) {
        var service = this;
        service.previous = [];

        this.hangUp = function() {
            if (service.current !== undefined) {
                if (service.current.call !== undefined) {
                    service.current.call.close();
                }
                service.previous.push(service.current);
                service.current = undefined;
            }
        };
        this.call = function(peer_obj, streamType, peer, metadata) {
            var defer = $q.defer();
            var s = undefined;
            if (streamType === 'video_only') {
                s = streamSvc.getVideoOnly();
            } else if (streamType === 'audio') {
                s = streamSvc.getAudio();
            } else if (streamType === 'audio_video') {
                s = streamSvc.get();
            }

            s.then(function(stream) {
                var call = peer.call(peer_obj.peer_id, stream, {
                    metadata: {
                        stream_type: streamType
                    }
                });
                var c = call;
                c.peer = peer_obj.peer_id;
                if (service.current === undefined) {
                    service.current = {};
                }
                if (c.metadata !== undefined) {
                    if (service.current.info === undefined) {
                        service.current.info = {};
                    }
                    _.assign(service.current.info, c.metadata);
                }
                service.current.call = c;
                service.current.local_stream = $sce.trustAsResourceUrl(URL.createObjectURL(stream));
                call.on('stream', function(remoteStream) {
                    // Show stream in some video/canvas element.
                    service.current.remote_stream = $sce.trustAsResourceUrl(URL.createObjectURL(remoteStream));
                    defer.resolve(service.current);
                });
                call.on('close', function() {
                    service.current.local_stream = undefined;
                    service.current.remote_stream = undefined;
                    service.previous.push(service.current);
                    service.current = undefined;
                });
                call.on('error', function(err) {
                    console.error(err);
                    service.current.local_stream = undefined;
                    service.current.remote_stream = undefined;
                    service.previous.push(service.current);
                    service.current = undefined;
                });
            }, function(err) {
                console.log('Failed to get local stream', err);
                defer.reject(new Error(err));
            });
            return defer.promise;
        };
        this.registerHandlers = function(peer) {
            console.log('PeerService: Registering Handlers');
            peer.on('call', function(call) {
                var c = call;
                if (service.current === undefined) {
                    service.current = {};
                }
                if (c.metadata !== undefined) {
                    if (service.current.info === undefined) {
                        service.current.info = {};
                    }
                    _.assign(service.current.info, c.metadata);
                }
                service.current.call = c;
                var streamType = 'audio_video';
                if (c.metadata !== undefined && c.metadata.stream_type !== undefined) {
                    streamType = c.metadata.stream_type;
                }
                if (streamType === 'video_only') {
                    s = streamSvc.getVideoOnly();
                } else if (streamType === 'audio') {
                    s = streamSvc.getAudio();
                } else if (streamType === 'audio_video') {
                    s = streamSvc.get();
                }
                s.then(function(stream) {
                    service.current.local_stream = $sce.trustAsResourceUrl(URL.createObjectURL(stream));
                    call.answer(stream); // Answer the call with an A/V stream.
                    call.on('stream', function(remoteStream) {
                        // Show stream in some video/canvas element.
                        service.current.remote_stream = $sce.trustAsResourceUrl(URL.createObjectURL(remoteStream));
                    });
                    call.on('close', function() {
                        service.current.local_stream = undefined;
                        service.current.remote_stream = undefined;
                        service.previous.push(service.current);
                        service.current = undefined;
                    });
                    call.on('error', function(err) {
                        console.error(err);
                        service.current.local_stream = undefined;
                        service.current.remote_stream = undefined;
                        service.previous.push(service.current);
                        service.current = undefined;
                    });
                }, function(err) {
                    console.log('Failed to get local stream', err);
                });
            });
        };

    }

    function PeerService($q, $rootScope, $sce, persist, stream, $call) {
        var service = this;
        this.peers = {
            list: [],
            messages: [],
            connection: {}
        };
        this.connections = [];

        this.startup = function() {
            var defer = $q.defer();
            if (service.peer_id !== undefined && service.peer_id !== '') {
                service.peer = new Peer(service.peer_id,{
                    key: 'lwjd5qra8257b9',
                    // key: 'x7fwx2kavpy6tj4i',
                    // Set highest debug level (log everything!).
                    debug: 3,

                    // Set a logging function:
                    logFunction: function() {
                        var copy = Array.prototype.slice.call(arguments).join(' ');
                        $('.log').append(copy + '<br>');
                    },

                    // Use a TURN server for more network support
                    config: {
                        'iceServers': [{
                            url: 'stun:stun.l.google.com:19302'
                        }]
                    }
                });
            }else{
                service.peer = new Peer({
                    key: 'lwjd5qra8257b9',
                    // key: 'x7fwx2kavpy6tj4i',
                    // Set highest debug level (log everything!).
                    debug: 3,

                    // Set a logging function:
                    logFunction: function() {
                        var copy = Array.prototype.slice.call(arguments).join(' ');
                        $('.log').append(copy + '<br>');
                    },

                    // Use a TURN server for more network support
                    config: {
                        'iceServers': [{
                            url: 'stun:stun.l.google.com:19302'
                        }]
                    }
                });
			}
            service.peer.on('error', function(err) {
            	console.error(err);
            	if(err.type === 'disconnected'){
            		service.peer.reconnect();
				}
            });
            service.peer.on('open', function(id) {
                console.log('My peer ID is: ' + id);
                service.peer_id = id;
                defer.resolve(id);
                var reg = $call.registerHandlers(service.peer);
                defer.promise.then(reg);
                console.log(service);
                pollPeers(service);
            });
            service.peer.on('connection', function(conn) {
                console.log("handling incoming connection.");
                connect(conn, service);
            });
            return defer.promise;
        };
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
            service.peers.connection[peer_id] = undefined;
            delete service.peers.connection[peer_id];
            var removed = _.chain(service.connections)
                .remove(function(item) {
                    return item.peer_id === peer_id;
                })
                .value();

            console.log("Removed peers : ");
            console.log(removed);
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

        function connect(c, service) {
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
                        url = $sce.trustAsResourceUrl(url);
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


        function pollPeers(service) {
            console.log("polling Peers...");
            var pollPromise = service.listAllPeers();
            pollPromise.then(
                function(obj) {
                    _.delay(pollPeers, 10000, service);
                });
            return pollPromise;
        }

        this.listAllPeers = _.throttle(function() {
            var defer = $q.defer();
            var cb = function(defer, list) {
                var list = _.chain(list)
                    .sortBy(function(item) {
                        return item;
                    })
                    .map(function(peer_id) {
                        var ret = {
                            peer_id: peer_id,
                            data: service.peers.connection[peer_id]
                        };
                        return ret;
                    })
                    .value();
                angular.copy(list, this.peers.list);
                // console.log(this.peers);
                defer.resolve(this.peers);
            };
            cb = _.bind(cb, service, defer);
            service.peer.listAllPeers(cb);
            return defer.promise;
        }, 5000, {
            leading: true,
            trailing: false
        });

        this.connectToPeer = function(rem_id, metadata) {
            var defer = $q.defer();
            service.peer.disconnected = false;
            var conn = service.peer.connect(rem_id, {
                label: 'chat',
                serialization: 'none',
                metadata: metadata
            });
            conn.on('open', function() {
                console.log("handling connection");
                connect(conn, service);
            });
            conn.on('error', function(err) {
                alert(err);
            });
            var f = service.peer.connect(rem_id, {
                label: 'file',
                reliable: true
            });

            f.on('open', function() {
                console.log("handling file connection");
                connect(f, service);
            });
            f.on('error', function(err) {
                alert(err);
            });
            return defer.promise;
        };

        return service;
    }
})();
