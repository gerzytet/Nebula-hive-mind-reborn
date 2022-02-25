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
var shared = require('./public/shared.js')
console.log(shared)

var players = []
io.sockets.on('connection', newConnection)

setInterval(tick, 33);

const timeoutMillis = 10000;
class ServerPlayer extends shared.Player {
    constructor(id, pos) {
        super(id, pos)
        this.lastPing = Date.now()
    }

    updatePing() {
        this.lastPing = Date.now()
    }

    isTimedOut() {
        return Date.now() - this.lastPing > timeoutMillis
    }
}

var state = new shared.GameState()
var events = []

function tick() {
    for (var i = 0; i < state.players.length; i++) {
        if (state.players[i].isTimedOut()) {
            events.push(
                new shared.PlayerLeave(state.players[i].id)
            )
        }
    }
    state.advance(events)

    eventsSerialized = []
    for (var i = 0; i < events.length; i++) {
        eventsSerialized.push(events[i].serialize())
    }
    events = []

    io.sockets.emit("tick", eventsSerialized)
}

function newConnection(socket) {
    console.log('New connection: ' + socket.id)
    socket.on('changeAcceleration', changeAcceleration)
    socket.on('tickReply', tickReply)

    var player = new ServerPlayer(socket.id, new shared.SimpleVector(
        Math.floor(Math.random() * /*shared.mapWidth*/ 400),
        Math.floor(Math.random() * /*shared.mapHeight*/ 400))
    )
    events.push(
        new shared.PlayerJoin(player)
    )
    socket.emit("state", state.serialize())

    function tickReply(data) {
        var player = state.playerById(socket.id)
        if (player === null) {
            return
        }
        player.updatePing()
    }

    function changeAcceleration(data) {
        var player = state.playerById(socket.id)
        if (player === null) {
            console.log(state)
            return
        }
        console.log("change acceleration " + data.acc.x + " " + data.acc.y)
        events.push(new shared.PlayerChangeAcceleration(player.id, data.acc))
    }
}