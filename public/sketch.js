/*
@file sketch.js
@author entire team
@date 2/18/2022
@brief File that controls the graphics on the canvas
*/

var socket
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

function preload() {
	bg = loadImage('Sprite_Background.png', () => { }, () => {
		console.log("failed to load background");
	});
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

		state.advance(events)
		socket.emit('tickReply', {});
	})

	socket.on("state", function (stateSerialized) {
		state = GameState.deserialize(stateSerialized)
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
	var playerEdgeSoftLimitWidth = (windowWidth / 2) + 1;
	var playerEdgeSoftLimitHeight = (windowHeight / 2) + 1;
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

function showPlayer(player) {
	push()
	fill(255, 0, 0)
	ellipse(player.pos.x - camera.x, player.pos.y - camera.y, player.size * 2, player.size * 2)
	pop()

	push()
	fill(255);
	textAlign(CENTER);
	textSize(15);
	text(42, player.pos.x - camera.x, player.pos.y - camera.y + (player.size / 3))
	pop()
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
	image(bg, -camera.x, -camera.y, mapWidth, mapHeight);

	
	for (var i = 0; i < state.players.length; i++) {
		showPlayer(state.players[i])
	}
}
