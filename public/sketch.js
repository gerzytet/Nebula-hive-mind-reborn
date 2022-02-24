/*
@file sketch.js
@author entire team
@date 2/18/2022
@brief File that controls the graphics on the canvas
*/

var socket
class ClientPlayer extends Player {
	constructor(id, pos) {
		super(id, pos)
	}

	static fromPlayer(player) {
		return new ClientPlayer(player.id, player.pos)
		this.size = player.size
		this.vel = player.vel
	}

	show() {
		push()
		fill(255, 0, 0)
		ellipse(this.pos.x - camera.x, this.pos.y - camera.y, this.size * 2, this.size * 2)
		pop()

		push()
		fill(255);
		textAlign(CENTER);
		textSize(15);
		text(42, this.pos.x - camera.x, this.pos.y - camera.y + (this.size / 3))
		pop()
	}
}

var cnv
var camera
var state

function centerCanvas() {
	x = width / 2
	y = height / 2
	background(0, 0, 0)
}

function windowResized() {
	cnv = resizeCanvas(windowWidth - 20, windowHeight - 20)
	centerCanvas()
}

function setup() {
	cnv = createCanvas(20, 20);
	cnv.parent("sketch-container")
	windowResized()
	centerCanvas()
	x = width / 2
	y = height / 2
	background(51)
	socket = io.connect()
	camera = {
		x: 0,
		y: 0
	}

	socket.on('tick', function (eventsSerialized) {
		if (eventsSerialized.length !== 0) {
			console.log(eventsSerialized)
		}
		var events = []
		for (var i = 0; i < eventsSerialized.length; i++) {
			events.push(GameEvent.deserialize(eventsSerialized[i]))
		}

		//HACK
		for (var i = 0; i < events.length; i++) {
			if (events[i] instanceof PlayerJoin) {
				events[i].player = ClientPlayer.fromPlayer(events[i].player)
			}
		}

		state.advance(events)
		socket.emit('tickReply', {});
	})

	socket.on("state", function (stateSerialized) {
		state = GameState.deserialize(stateSerialized)

		//HACK
		for (var i = 0; i < state.players.length; i++) {
			state.players[i] = ClientPlayer.fromPlayer(state.players[i])
		}
	})

	lastvx = 0
	lastvy = 0
}

var lastvx
var lastvy
function doMovement() {
	var vy = 0;
	var vx = 0;

	function code(c) {
		return c.charCodeAt()
	}

	if (keyIsDown(UP_ARROW) || keyIsDown(code('w')) || keyIsDown(code('W'))) {
		vy = -1
	} else if (keyIsDown(DOWN_ARROW) || keyIsDown(code('s')) || keyIsDown(code('S'))) {
		vy = 1
	}
	if (keyIsDown(LEFT_ARROW) || keyIsDown(code('a')) || keyIsDown(code('A'))) {
		vx = -1
	} else if (keyIsDown(RIGHT_ARROW) || keyIsDown(code('d')) || keyIsDown(code('D'))) {
		vx = 1
	}

	if (lastvy !== vy || lastvx !== vx) {
		socket.emit("changeVelocity", {
			vel: new SimpleVector(vx, vy)
		});
	}
	lastvx = vx
	lastvy = vy
}

function moveCamera(player) {
	//the closest distance a player can get to edge of the screen without the camera attempting to move
	var playerEdgeSoftLimitWidth = windowWidth / 10;
	var playerEdgeSoftLimitHeight = windowHeight / 10;
	var oldcamera = {
		x: camera.x,
		y: camera.y
	}

	//case when player is at the bottom or right of the screen
	var edgeX = camera.x + windowWidth
	var edgeY = camera.y + windowHeight

	var distFromEdgeX = edgeX - player.pos.x
	var distFromEdgeY = edgeY - player.pos.y

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0)
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0)
	
	var cameraLimitX = mapWidth - windowWidth;
	var cameraLimitY = mapHeight - windowHeight;
	
	var newCameraX = min(camera.x + cameraMoveX, cameraLimitX)
	var newCameraY = min(camera.y + cameraMoveY, cameraLimitY)

	camera.x = newCameraX
	camera.y = newCameraY
	/*if (camera.x != oldcamera.x || camera.y != oldcamera.y) {
		console.log("camera: " + camera.x + " " +  camera.y);
	}*/

	//case when player is at the top or left of the screen
	var edgeX = camera.x
	var edgeY = camera.y

	var distFromEdgeX = player.pos.x - edgeX
	var distFromEdgeY = player.pos.y - edgeY

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0)
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0)
	
	var cameraLimitX = 0
	var cameraLimitY = 0

	var newCameraX = max(camera.x - cameraMoveX, cameraLimitX)
	var newCameraY = max(camera.y - cameraMoveY, cameraLimitY)
	
	camera.x = newCameraX
	camera.y = newCameraY
}

function draw() {
	if (state === undefined) {
		//we are still waiting for initial state packet
		return
	}
	var player = state.playerById(socket.id)
	if (player === null) {
		//we got initial state packet, but it will not have us as a player at first
		return
	}

	doMovement()
	moveCamera(player)

	background(51)
	
	for (var i = 0; i < state.players.length; i++) {
		state.players[i].show()
	}
}
