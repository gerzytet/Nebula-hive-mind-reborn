var socket
var players = []
var player

/*
Player object:

pos: p5 vector  (x, y) position
id: String      the socket id
num: int        the player number
size: int       the player size (basically a test value)
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
*/

var canvasWidth = 1500;
var canvasHeight = 700;
//the closesnt distance a player can get to edge of the screen without the camera attempting to move
var playerEdgeSoftLimitWidth = canvasWidth / 10;
var playerEdgeSoftLimitHeight = canvasHeight / 10;

var mapWidth = 3000;
var mapHeight = 2000;

function setup() {
	createCanvas(canvasWidth, canvasHeight);
	background(51);
	socket = io.connect('http://localhost:3000');

	player = new Player(random(width), random(height));
	var data = {
		x: player.pos.x,
		y: player.pos.y
	};
	socket.emit('start', data);
	socket.on('heartbeat', function (data) {
		players = data;
	})
}

function draw() {
	background(51)

	var camera = {
		x: 0,
		y: 0
	}
	
	//case when player is at the bottom or right of the screen
	var edgeX = camera.x + canvasWidth
	var edgeY = camera.y + canvasHeight

	var distFromEdgeX = edgeX - player.pos.x
	var distFromEdgeY = edgeY - player.pos.y

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0);
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0);
	
	var cameraLimitX = mapWidth - canvasWidth;
	var cameraLimitY = mapHeight - canvasHeight;
	
	var newCameraX = min(camera.x + cameraMoveX, cameraLimitX);
	var newCameraY = min(camera.y + cameraMoveY, cameraLimitY);

	camera.x = newCameraX;
	camera.y = newCameraY;

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
	console.log("camera: " + camera.x + " " +  camera.y);

	//player.smoothMove();
	for (var i = players.length - 1; i >= 0; i--) {
		if (players[i].num === 0) { fill(255, 0, 0) }
		else if (players[i].num === 1) { fill(0, 0, 255) }
		else if (players[i].num === 2) { fill(0, 255, 0) }
		else if (players[i].num === 3) { fill(255, 255, 0) }
		else {fill(255, 102, 25)}
		ellipse(players[i].x, players[i].y, players[i].size * 2, players[i].size * 2);

		fill(255);
		textAlign(CENTER);
		textSize(15);
		text(players[i].num+1, players[i].x, players[i].y + (players[i].size/3));
	}
}

function keyTyped() {
	if (keyCode === UP_ARROW || key === 'w' || key === 'W') {
		//player.vel.y = -1;
		player.pos.y += 10;
		console.log("UP_ARROW PRESSED");
	} else if (keyCode === DOWN_ARROW || key === 's' || key === 'S') {
		//player.vel.x = 1;
		player.pos.y -= 10;
		console.log("DOWN_ARROW PRESSED");
	} else if (keyCode === LEFT_ARROW || key === 'a' || key === 'A') {
		//player.vel.x = -1;
		player.pos.x += 10;
		console.log("LEFT_ARROW PRESSED");
	} else if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') {
		//player.vel.x = 1;
		player.pos.x -= 10;
		console.log("RIGHT_ARROW PRESSED");
	}
	player.pos.x = max(player.pos.x, 0)
	player.pos.y = max(player.pos.y, 0)

	var data = {
		x: player.pos.x,
		y: player.pos.y,
		velx: player.vel.x,
		vely: player.vel.y
	};
	
	socket.emit('move', data)
}