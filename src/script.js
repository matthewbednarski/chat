(function(app_name) {
    var app = angular.module('app', ['ngSwitch', 'mcbPeer'])
        .controller('controller', ['$q', '$scope', 'peer', 'call', Controller]);
    // .directive('chat', [Chat]);

    function Controller($q, $scope, peer, call) {
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
        this.connect = function(peer) {
            var metadata = {};
            this.peer.connectToPeer(peer.peer_id, metadata);
        };
        this.video = function(item) {
            // this.peer_id = item;
            call.call(item, 'video', peer).then(function() {
                $scope.$apply();
            });
        };
        this.call = function(item) {
            call.call(item, 'audio_video', peer).then(function() {
            	console.log(ctl.peer.peers.connection);
            });
        };
        this.hangUp = function(item) {
            call.hangUp(item);
		};
        this.bootstrapPeer = function() {
            ctl.peer.startup($scope, ctl.peer.peer_prefix + ctl.user);
        };

        this.closeConnection = function(item) {
            ctl.peer.closeConnections(item.peer_id);
        };
        this.closePeer = function() {
            ctl.user = undefined;
            ctl.peer.peer_id = undefined;
            ctl.peer.peer.destroy();
            ctl.peer.peers.connection[c.peer] = undefined;
        };
    }



})('app');;
