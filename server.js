/*
@file server.js
@author entire team
@date 2/18/2022
@brief File that sets up server
*/

import {Assert, SimpleVector, Color, neutralColor, isTesting, setTesting, mapWidth, mapHeight} from './public/shared/utilities.js'
import {PlayerLeave, PlayerJoin, PlayerChangeAcceleration, PlayerChangeAngle, PlayerShoot, PlayerChangeName, PlayerActivateAbility} from './public/shared/events.js'
import {Player} from './public/shared/entities.js'
import {GameState} from './public/shared/gamestate.js'
import express from 'express'
import {Server} from 'socket.io'

var app = express()
var server = app.listen(3000)

app.use(express.static('public'))

console.log('My server is running')

var io = new Server(server)

var players = []
var playercounter = 0
io.sockets.on('connection', newConnection)

const args = process.argv.slice(2)
setTesting(args[0] !== 'real')
if (!isTesting()) {
    console.log('Game expo mode enabled!')
}

setInterval(tick, 33);

const timeoutMillis = 10000;

var state = new GameState()
var events = []

function colorUsed(c) {
    for (var i = 0; i < state.players.length; i++) {
        if (state.players[i].color.equals(c)) {
            return true
        }
    }
    return false
}

function getUnusedColor() {
    do {
        var color = new Color(
            Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255)
        )
    } while (colorUsed(color))
    return color
}

var playerTimeouts = {}

//id does not have to exist in playerTimeouts
function updatePing(id) {
    playerTimeouts[id] = Date.now()
}

function isTimedOut(id) {
    if (playerTimeouts[id] === undefined) {
        return
    }
    return Date.now() - playerTimeouts[id] > timeoutMillis
}

function tick() {
    for (var i = 0; i < state.players.length; i++) {
        if (isTimedOut(state.players[i].id)) {
            events.push(
                new PlayerLeave(state.players[i].id)
            )
        }
    }

    var seed = Math.floor(Math.random() * (1 << 30))
    state.seed(seed)
    state.advance(events)

    var eventsSerialized = []
    for (var i = 0; i < events.length; i++) {
        eventsSerialized.push(events[i].serialize())
    }
    events = []

    io.sockets.emit("tick", {
        events: eventsSerialized,
        seed: seed
    })
}

function newConnection(socket) {
    console.log('New connection: ' + socket.id)
    socket.on('changeAcceleration', changeAcceleration)
    socket.on('tickReply', tickReply)
    socket.on('changeAngle', changeAngle)
    socket.on('shoot', shoot)
    socket.on('changeName', changeName)
    socket.on('becomeServerCamera', becomeServerCamera)
    socket.on('activateAbility', activateAbility)

    //players are created!
    var player = new Player(socket.id, new SimpleVector(
        Math.floor(Math.random() * (isTesting() ? 400 : mapWidth)),
        Math.floor(Math.random() * (isTesting() ? 400 : mapHeight))),
        getUnusedColor(), "Player: " + (playercounter + 1),
        Math.floor(Math.random() * (Player.MAX_ABILITY + 1))
    )

    playercounter += 1
    events.push(
        new PlayerJoin(player)
    )
    socket.emit("state", {
        state: state.serialize(),
        testing: isTesting()
    })

    function tickReply(data) {
        updatePing(socket.id)
    }

    function changeAcceleration(data) {
        Assert.number(data.acc.x)
        Assert.number(data.acc.y)
        var player = state.playerById(socket.id)
        if (player === null) {
            return
        }
        events.push(new PlayerChangeAcceleration(player.id, new SimpleVector(data.acc.x, data.acc.y)))
    }

    function changeAngle(data) {
        Assert.number(data.angle)
        if (player === null) {
            return
        }
        events.push(new PlayerChangeAngle(player.id, data.angle))
    }

    function shoot(data) {
        var player = state.playerById(socket.id)
        if (player === null) {
            return
        }
        events.push(new PlayerShoot(player.id))
    }

    function changeName(data) {
        Assert.string(data.name)
        var player = state.playerById(socket.id)
        if (player === null) {
            return
        }
        events.push(
            new PlayerChangeName(player.id, data.name)
        )
    }

    function becomeServerCamera(data) {
        var player = state.playerById(socket.id)
        if (player === null) {
            return
        }
        events.push(
            new PlayerLeave(player.id)
        )
    }

    function activateAbility(data) {
        var player = state.playerById(socket.id)
        if (player === null) {
            return
        }
        events.push(
            new PlayerActivateAbility(player.id)
        ) 
    }
}