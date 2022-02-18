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

function heartbeat() {
    io.sockets.emit('heartbeat', players);
}

openspace = false;
function newConnection(socket) {
    console.log('New connection: ' + socket.id)
    socket.on('start', Start)


    function Start(data) {
        console.log(socket.id + ' ' + data.x + ' ' + data.y);
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
}

function getIndex(id) {
    for (i = 0; i < players.length; i++) {
        if (id == players[i].id) {
            return i;
        }
    }
}