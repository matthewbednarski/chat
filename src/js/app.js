(function(app_name) {
    var app = angular.module('app', ['ui.router', 'mcbPeer'])
        .config(function($stateProvider, $urlRouterProvider) {
            $urlRouterProvider.otherwise('/');
            $stateProvider
                .state('call', {
                    url: '/call',
                    views: {
                        'call': {
                            templateUrl: 'view/call.html',
                            controller: 'CallController',
                            controllerAs: 'ctl'
                        }
                    }
                })
                .state('peerlist', {
                    url: '/peerlist',
                    views: {
                        'peerlist': {
                            templateUrl: 'view/peer-list.html',
                            controller: 'PeerListController',
                            controllerAs: 'ctl'
                        }
                    }
                })
                .state('chats', {
                    url: '/chats',
                    views: {
                        'chats': {
                            templateUrl: 'view/chat.html',
                            controller: 'ChatController',
                            controllerAs: 'ctl'
                        }
                    }
                })
                .state('home', {
                    url: '/',
                    views: {
                        'start': {
                            templateUrl: 'view/start.html',
                            controller: 'StartController',
                            controllerAs: 'ctl'
                        },
                        'peerlist': {
                            templateUrl: 'view/peer-list.html',
                            controller: 'PeerListController',
                            controllerAs: 'ctl'
                        },
                        'chats': {
                            templateUrl: 'view/chat.html',
                            controller: 'ChatController',
                            controllerAs: 'ctl'
                        }
                    }
                });
        })
        .controller('NavbarController', ['$q', '$scope', NavbarController])
        .controller('StartController', ['$q', '$scope', '$peer', StartController])
        .controller('PeerListController', ['$q', '$scope', '$peer', PeerListController])
        .controller('CallController', ['$q', '$scope', '$call', CallController])
        .controller('ChatController', ['$q', '$scope', '$peer', '$call', ChatController]);

    function NavbarController($q, $scope) {
        var ctl = this;
        ctl.title = 'Peer Chat';
        ctl.peerlist = 'List of peers';
        ctl.home = 'Start';
        ctl.chats = 'Current Chats';
    }

    function StartController($q, $scope, $peer) {
        this.title = "Welcome ";
        var ctl = this;
        this.use = {
            video: false,
            audio: true
        };
        this.$peer = $peer;

        this.bootstrapPeer = function() {
            ctl.$peer.startup();
        };

        this.closeConnection = function(item) {
            ctl.$peer.closeConnections(item.peer_id);
        };
        this.closePeer = function() {
            ctl.user = undefined;
            ctl.$peer.peer_id = undefined;
            ctl.$peer.peer.destroy();
            ctl.$peer.peers.connection[c.peer] = undefined;
        };
    }

    function PeerListController($q, $scope, $peer) {
        var ctl = this;
        this.$peer = $peer;
        this.$peer.peerlist = {};
        this.$peer.peerlist.filter = undefined;
        this.$peer.peerlist.collapse = {};
        this.$peer.peerlist.collapse.class = 'collapsed';
        this.$peer.peerlist.collapse.aria_expanded = false;

        this.connect = function(peer) {
            var metadata = {};
            this.$peer.connectToPeer(peer.peer_id, metadata);
        };
    }

    function CallController($q, $scope, $call) {
        var ctl = this;
        this.$call = $call;
        this.hangUp = function(item) {
            this.$call.hangUp(item);
        };
    }

    function ChatController($q, $scope, $peer, $call) {
        var ctl = this;
        this.items = [];
        this.use = {
            video: false,
            audio: true
        };

        this.$peer = $peer;
        this.$call = $call;

        $scope.$on('msgReceived', function(event, msg) {
            $scope.$apply(function() {
                ctl.items.push(msg);
            });
        });
        this.send = function(item) {
            console.log(ctl.chat_next);
            var msg = {
                peer: ctl.$peer.peer_id,
                data: ctl.chat_next
            };
            this.$peer.peers.connection[item.peer_id].chat.messages.push(msg);
            this.$peer.peers.connection[item.peer_id].chat.send(msg.data);

            ctl.chat_next = "";
        };
        this.video = function(item) {
            // this.peer_id = item;
            $call.call(item, 'video', this.$peer.peer).then(function() {
                console.log(ctl.$peer.peers.connection);
            });
        };
        this.call = function(item) {
            $call.call(item, 'audio_video', this.$peer.peer).then(function() {
                console.log(ctl.$peer.peers.connection);
            });
        };
        this.bootstrapPeer = function() {
            ctl.$peer.startup($scope, ctl.$peer.peer_prefix + ctl.user);
        };

        this.closeConnection = function(item) {
            ctl.$peer.closeConnections(item.peer_id);
        };
        this.closePeer = function() {
            ctl.user = undefined;
            ctl.$peer.peer_id = undefined;
            ctl.$peer.peer.destroy();
            ctl.$peer.peers.connection[c.peer] = undefined;
        };
    }



})('app');;
