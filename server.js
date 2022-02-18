/*
@file server.js
@author entire team
@date 2/18/2022
@brief File that sets up server
*/

var express = require('express')

var app = express()
var server = app.listen(3000)

app.use(express.static('public'))

console.log('My server is running')

var socket = require('socket.io')
var io = socket(server)
var players = []
io.sockets.on('connection', newConnection)

function Player(id, x, y) {
    this.id = id
    this.x = x
    this.y = y
    this.size = 20
    this.num = null
}


setInterval(heartbeat, 33);
const timeoutMillis = 10000;

function heartbeat() {
    io.sockets.emit('heartbeat', players);
    var toRemove = [];
    for (var i = 0; i < players.length; i++) {
        //if now - players.lastPing > timeoutMillis
        //remove player
        if (Date.now() - players[i].lastPing > timeoutMillis) {
            toRemove.push(players[i]);
        }
    }
    if (toRemove.length > 0) {
        console.log("removing " + toRemove.length);
    }
    var newPlayers = [];
    for (var i = 0; i < players.length; i++) {
        if (!toRemove.includes(players[i])) {
            newPlayers.push(players[i]);
        }
    }
    players = newPlayers;
}

openspace = false;
function newConnection(socket) {
    console.log('New connection: ' + socket.id)
    socket.on('start', Start)
    socket.on('move', Move)
    socket.on('heartbeatReply', heartbeatReply)

    function Start(data) {
        //console.log(socket.id + ' ' + data.x + ' ' + data.y);
        var player = new Player(socket.id, data.x, data.y);
        if (openspace) {
            for (i = 0; i < players.length; i++) {
                if (players[i] == 0) {
                    player.num = i;
                    players[i] = player;
                }
            }
        }
        else {
            player.num = players.length;
            players.push(player);
            
        }
    }

    function Move(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in Move function");
            return;
        }
        //console.log(players)
        //console.log(d + ' ' + data.x + ' ' + data.y);
        players[d].x = data.x;
        players[d].y = data.y;
    }

    function heartbeatReply(data) {
        var d = getIndex(socket.id);
        if (d === undefined) {
            console.log("Warning: player not found in heartbeat function");
            return;
        }

        if (d === undefined) {
            console.log("error " + socket.id + ' ' + players);
        }
        players[d].lastPing = Date.now();
    }
}

function getIndex(id) {
    for (var i = 0; i < players.length; i++) {
        //console.log(i + ' ' + (id === players[i].id))
        if (id === players[i].id) {
            return i;
        }
    }
}