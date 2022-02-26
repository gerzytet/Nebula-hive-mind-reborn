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

var state = new shared.GameState()
var events = []

var playerTimeouts = {}

//id does not have to exist in playerTimeouts
function updatePing(id) {
    playerTimeouts[id] = Date.now()
}

function isTimedOut(id) {
    shared.Assert.defined(playerTimeouts[id])
    return Date.now() - playerTimeouts[id] > timeoutMillis
}

function tick() {
    for (var i = 0; i < state.players.length; i++) {
        if (isTimedOut(state.players[i].id)) {
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

    var player = new shared.Player(socket.id, new shared.SimpleVector(
        Math.floor(Math.random() * /*shared.mapWidth*/ 400),
        Math.floor(Math.random() * /*shared.mapHeight*/ 400))
    )
    events.push(
        new shared.PlayerJoin(player)
    )
    socket.emit("state", state.serialize())

    function tickReply(data) {
        updatePing(socket.id)
    }

    function changeAcceleration(data) {
        shared.Assert.number(data.acc.x)
        shared.Assert.number(data.acc.y)
        var player = state.playerById(socket.id)
        if (player === null) {
            console.log(state)
            return
        }
        events.push(new shared.PlayerChangeAcceleration(player.id, new shared.SimpleVector(data.acc.x, data.acc.y)))
    }
}