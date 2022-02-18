/*
@file sketch.js
@author entire team
@date 2/18/2022
@brief File that controls the graphics on the canvas
*/

var socket
var players = []
var player

/*
Player object:

pos: p5 vector  (x, y) position
id: String      the socket id
num: int        the player number
size: int       the player size (basically a test value)
lastPing: Date  the last time the player has replied to the server
*/

/*
XY object:

x: int       the x position
y: int       the y position
*/

//the players array consists of a list of Player objects, as above
//the players array has identical contents as the server-side players array

/*
types of packets:

S: server
C: client
S -> C: a packet that gets sent from the server to client size
C -> S: a packet that gets sent from the client to server size

heartbeat:
S -> C
data: the player array from the server.
effect: The client sets its player array to the recieved player array when it recieves
this packet is sent by the server every 33 milliseconds.

start:
C -> S
data: an XY object
effect: the server creates a new player at this position associated with the socket id when it recieves

move:
C -> S
data: an XY object
effect: the server moves the player to the specified position when it recieves

heartbeatReply:
C -> S
data: empty object
effect: the server will know that the client is still connected when it recieves this packet
*/

var mapWidth = 3000;
var mapHeight = 2000;

var cnv;
var camera;

function centerCanvas() {
	x = width / 2;
	y = height / 2;
	background(0, 0, 0);
}

function windowResized() {
	cnv = resizeCanvas(windowWidth - 20, windowHeight - 20);
	centerCanvas();
}

function setup() {
	cnv = createCanvas(20, 20);
	cnv.parent("sketch-container");
	windowResized()
	centerCanvas();
	x = width / 2;
	y = height / 2;
	background(51);
	socket = io.connect('http://localhost:3000');

	player = new Player(random(width), random(height));
	var data = {
		x: player.pos.x,
		y: player.pos.y
	};
	camera = {
		x: 0,
		y: 0
	}

	socket.emit('start', data);
	socket.on('heartbeat', function (data) {
		players = data;
		socket.emit('heartbeatReply', {});
	})
}

function draw() {
	background(51)
	console.log("camera: " + camera.x + " " +  camera.y);

	
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

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0);
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0);
	
	var cameraLimitX = mapWidth - windowWidth;
	var cameraLimitY = mapHeight - windowHeight;
	
	var newCameraX = min(camera.x + cameraMoveX, cameraLimitX);
	var newCameraY = min(camera.y + cameraMoveY, cameraLimitY);

	camera.x = newCameraX;
	camera.y = newCameraY;
	/*if (camera.x != oldcamera.x || camera.y != oldcamera.y) {
		console.log("camera: " + camera.x + " " +  camera.y);
	}*/

	//case when player is at the top or left of the screen
	var edgeX = camera.x
	var edgeY = camera.y

	var distFromEdgeX = player.pos.x - edgeX
	var distFromEdgeY = player.pos.y - edgeY

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0);
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0);
	
	var cameraLimitX = 0;
	var cameraLimitY = 0;

	var newCameraX = max(camera.x - cameraMoveX, cameraLimitX);
	var newCameraY = max(camera.y - cameraMoveY, cameraLimitY);
	
	camera.x = newCameraX;
	camera.y = newCameraY;
	/*if (camera.x != oldcamera.x || camera.y != oldcamera.y) {
		console.log("camera: " + camera.x + " " +  camera.y);
	}*/
	//log camera

	function code(c) {
		return c.charCodeAt()
	}

	//controls basic player movement
	if (keyIsDown(UP_ARROW) || keyIsDown(code('w')) || keyIsDown(code('W'))) {
		player.vel.y = -1;
		//player.pos.y -= 10;
		console.log("UP_ARROW PRESSED");
	}
	if (keyIsDown(DOWN_ARROW) || keyIsDown(code('s')) || keyIsDown(code('S'))) {
		player.vel.y = 1;
		//player.pos.y += 10;
		console.log("DOWN_ARROW PRESSED");
	}
	if (keyIsDown(LEFT_ARROW) || keyIsDown(code('a')) || keyIsDown(code('A'))) {
		player.vel.x = -1;
		//player.pos.x -= 10;
		console.log("LEFT_ARROW PRESSED");
	}
	if (keyIsDown(RIGHT_ARROW) || keyIsDown(code('d')) || keyIsDown(code('D'))) {
		player.vel.x = 1;
		//player.pos.x += 10;
		console.log("RIGHT_ARROW PRESSED");
	}

	player.smoothMove();
	for (var i = players.length - 1; i >= 0; i--) {
		var id = players[i].id;
		if (id.substring(2, id.length) !== socket.id) {
			if (players[i].num === 0) { fill(255, 0, 0) }
			else if (players[i].num === 1) { fill(0, 0, 255) }
			else if (players[i].num === 2) { fill(0, 255, 0) }
			else if (players[i].num === 3) { fill(255, 255, 0) }
			else { fill(255, 102, 25) }
			ellipse(players[i].x - camera.x, players[i].y - camera.y, players[i].size * 2, players[i].size * 2);

			fill(255);
			textAlign(CENTER);
			textSize(15);
			text(players[i].num + 1, players[i].x - camera.x, players[i].y - camera.y + (players[i].size / 3));
		}
	}

	var data = {
		x: player.pos.x,
		y: player.pos.y
	};

	socket.emit('move', data)
}

function keyReleased() {
	if (keyCode === UP_ARROW || key === 'w' || key === 'W') {
		player.vel.y = 0;
		//player.pos.y -= 10;
		console.log("UP_ARROW PRESSED");
	} else if (keyCode === DOWN_ARROW || key === 's' || key === 'S') {
		player.vel.y = 0;
		//player.pos.y += 10;
		console.log("DOWN_ARROW PRESSED");
	} else if (keyCode === LEFT_ARROW || key === 'a' || key === 'A') {
		player.vel.x = 0;
		//player.pos.x -= 10;
		console.log("LEFT_ARROW PRESSED");
	} else if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') {
		player.vel.x = 0;
		//player.pos.x += 10;
		console.log("RIGHT_ARROW PRESSED");
	}
	//o key code to disconnect
	else if (key === 'o') {
		socket.disconnect()
	}
}