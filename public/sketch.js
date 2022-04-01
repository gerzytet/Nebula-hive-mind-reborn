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

import {GameState} from './shared/gamestate.js'
import {GameEvent} from './shared/events.js'
import {mapWidth, mapHeight, SimpleVector} from './shared/utilities.js'
import { Powerup } from './shared/entities.js'

function windowResized() {
	cnv = resizeCanvas(windowWidth - 20, windowHeight - 20)
}

function preload() {
	bg = loadImage('Sprite_Background.png', () => { }, () => {
		console.log("failed to load background");
	});
	pship = loadImage('Player_Ship_2.png', () => { }, () => {
		console.log("failed to load player ship");
	});
	eship = loadImage('Ship_1.png', () => { }, () => {
		console.log("failed to load enemy ship");
	});
	asteroid_full = loadImage('Asteroid_Full.png', () => { }, () => {
		console.log("failed to load asteroid full");
	});
	asteroid_medium = loadImage('Asteroid_Medium.png', () => { }, () => {
		console.log("failed to load asteroid medium");
	});
	asteroid_low = loadImage('Asteroid_Low.png', () => { }, () => {
		console.log("failed to load asteroid low");
	});

	powerupFuel = loadImage('PowerUp_Fuel_2.png', () => { }, () => {
		console.log("failed to load powerup fuel");
	})
	powerupHealth = loadImage('PowerUp-Health.png', () => { }, () => {
		console.log("failed to load powerup health");
	})
	powerupSpeed = loadImage('PowerUp-Speed.png', () => { }, () => {
		console.log("failed to load powerup speed");
	})
	powerupAttack = loadImage('PowerUp-Attack.png', () => { }, () => {
		console.log("failed to load powerup attack");
	})
	powerupMachineGun = loadImage('Gun.png', () => { }, () => {
		console.log("failed to load powerup machine gun");
	})

	swordImg = loadImage('Sword.png', () => { }, () => {
		console.log("failed to load sword");
	});
}
var bg
var pship, eship, asteroid_full, asteroid_medium, asteroid_low
var powerupFuel, powerupHealth, powerupSpeed, powerupAttack, powerupMachineGun, swordImg

//change name to input value
function changeName() {
	const name = input.value();
	input.value('');
}

var input, button
function setup() {
	cnv = createCanvas(20, 20);
	cnv.parent("sketch-container")
	windowResized()
	background(51)

	input = createInput();
	input.position(0, 0);

	button = createButton('Change Name');
	button.position(input.x + input.width, 0);
	button.mousePressed(changeName);

	textAlign(CENTER);
	textSize(50);

	socket = io.connect()
	camera = {
		x: 0,
		y: 0
	}

	socket.on('tick', function (data) {
		var eventsSerialized = data.events
		var seed = data.seed
		if (eventsSerialized.length !== 0) {
			console.log(eventsSerialized)
		}

		var events = []
		for (var i = 0; i < eventsSerialized.length; i++) {
			events.push(GameEvent.deserialize(eventsSerialized[i]))
		}

		state.seed(seed)
		state.advance(events)
		socket.emit('tickReply', {});
	})

	socket.on("state", function (stateSerialized) {
		state = GameState.deserialize(stateSerialized)
	})

	lastax = 0
	lastay = 0
}

var lastax
var lastay
function doMovement() {
	var ay = 0;
	var ax = 0;

	function code(c) {
		return c.charCodeAt()
	}

	if (keyIsDown(UP_ARROW) || keyIsDown(code('w')) || keyIsDown(code('W'))) {
		ay = -0.1
	} else if (keyIsDown(DOWN_ARROW) || keyIsDown(code('s')) || keyIsDown(code('S'))) {
		ay = 0.1
	}
	if (keyIsDown(LEFT_ARROW) || keyIsDown(code('a')) || keyIsDown(code('A'))) {
		ax = -0.1
	} else if (keyIsDown(RIGHT_ARROW) || keyIsDown(code('d')) || keyIsDown(code('D'))) {
		ax = 0.1
	}

	if (lastay !== ay || lastax !== ax) {
		socket.emit("changeAcceleration", {
			acc: new SimpleVector(ax, ay)
		});
	}
	lastax = ax
	lastay = ay
}

function moveCamera(player) {
	//the closest distance a player can get to edge of the screen without the camera attempting to move
	var playerEdgeSoftLimitWidth = (windowWidth / 2) + 1;
	var playerEdgeSoftLimitHeight = (windowHeight / 2) + 1;

	//case when player is at the bottom or right of the screen
	var edgeX = camera.x + windowWidth
	var edgeY = camera.y + windowHeight

	var distFromEdgeX = edgeX - player.pos.x
	var distFromEdgeY = edgeY - player.pos.y

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0)
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0)
	
	var cameraLimitX = mapWidth - width;
	var cameraLimitY = mapHeight - height;
	
	var newCameraX = min(camera.x + cameraMoveX, cameraLimitX)
	var newCameraY = min(camera.y + cameraMoveY, cameraLimitY)

	camera.x = newCameraX
	camera.y = newCameraY

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
	angleMode(DEGREES)
	translate(player.pos.x - camera.x, player.pos.y - camera.y);
	rotate(-player.angle + 90);
	tint(player.color.r, player.color.g, player.color.b);
	imageMode(CENTER);
	image(pship, 0, 0, player.size * 2, player.size * 2);
	pop()

	push()
	fill(255);
	textAlign(CENTER);
	textSize(15);
	text(player.health, player.pos.x - camera.x, player.pos.y - camera.y + (player.size / 3))
	pop()
}

function showProjecile(projectile) {
	push()
	var c = projectile.color
	fill(c.r, c.g, c.b)
	ellipse(projectile.pos.x - camera.x, projectile.pos.y - camera.y, projectile.size*2)
	pop()
}

function showAsteroid(asteroid) {
	push()
	translate(asteroid.pos.x - camera.x, asteroid.pos.y - camera.y);
	imageMode(CENTER);
	image(asteroid_full, 0, 0, asteroid.size * 2, asteroid.size * 2);
	pop()
}

function imageFromPowerupType(type) {
	switch(type) {
		case Powerup.HEAL:
			return powerupHealth
		case Powerup.SPEED:
			return powerupSpeed
		case Powerup.ATTACK:
			return powerupAttack
		default:
			throw new Error("Unknown powerup type: " + type)
	}
}

function showPowerup(powerup) {
	push()
	translate(powerup.pos.x - camera.x, powerup.pos.y - camera.y);
	imageMode(CENTER);
	image(imageFromPowerupType(powerup.type), 0, 0, powerup.size * 2, powerup.size * 2);
	pop()
}

var lastAngle;
function doRotation(player) {
	//the angle determined by mouse position
	var newAngle = Math.atan2(mouseY - (player.pos.y - camera.y), mouseX - (player.pos.x - camera.x));
	newAngle *= (180 / Math.PI);
	newAngle = -newAngle;
	if (newAngle < 0) {
		newAngle += 360;
	}
	if (isNaN(newAngle) || lastAngle === newAngle) {
		return
	}

	socket.emit("changeAngle", {
		angle: newAngle
	})
	lastAngle = newAngle
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
	doRotation(player)

	background(51)
	image(bg, -camera.x, -camera.y, mapWidth, mapHeight);

	
	for (var i = 0; i < state.players.length; i++) {
		showPlayer(state.players[i])
	}

	for (var i = 0; i < state.projectiles.length; i++) {
		showProjecile(state.projectiles[i])
	}

	for (var i = 0; i < state.asteroids.length; i++) {
		showAsteroid(state.asteroids[i])
	}

	for (var i = 0; i < state.powerups.length; i++) {
		showPowerup(state.powerups[i])
	}
}

function mouseClicked(){
	socket.emit('shoot', {})
}

//this is necessary because p5.js needs to see these functions in the global scope, which doesn't happen with a module
window.draw = draw
window.preload = preload
window.setup = setup
window.windowResized = windowResized
window.mouseClicked = mouseClicked