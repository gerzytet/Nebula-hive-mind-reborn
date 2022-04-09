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
import {mapWidth, mapHeight, SimpleVector, connectionRadius, neutralColor} from './shared/utilities.js'
import {Powerup, playerMaxHealth, enemyMaxHealth} from './shared/entities.js'

function windowResized() {
	cnv = resizeCanvas(windowWidth - 20, windowHeight - 40)
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

//Emitt this name
//change name to input value
function changeName() {
	const name = input.value();
	console.log(name)
	socket.emit("changeName", {
		name: name
	})
	input.value('');
}

var input, button
function setup() {
	cnv = createCanvas(0, 0);
	cnv.parent("sketch-container")
	windowResized()
	background(0)

	input = createInput();
	input.position(5, 5);

	button = createButton('Change Name');
	button.position(input.x + input.width, 5);
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

//handles user input
function doInput(player) {
	var ay = 0;
	var ax = 0;

	function code(c) {
		return c.charCodeAt()
	}

	if (keyIsDown(UP_ARROW) || keyIsDown(code('w')) || keyIsDown(code('W'))) {
		ay = -1
	} else if (keyIsDown(DOWN_ARROW) || keyIsDown(code('s')) || keyIsDown(code('S'))) {
		ay = 1
	}
	if (keyIsDown(LEFT_ARROW) || keyIsDown(code('a')) || keyIsDown(code('A'))) {
		ax = -1
	} else if (keyIsDown(RIGHT_ARROW) || keyIsDown(code('d')) || keyIsDown(code('D'))) {
		ax = 1
	}

	if (keyIsDown(code('e')) || keyIsDown(code('E'))) {
		tryShoot()
	}

	//TODO: TESTING PURPOSES ONLY:
	if (keyIsDown(code('b')) || keyIsDown(code('B'))) {
		becomeServerCamera()
	}

	if (keyIsDown(code('p')) || keyIsDown(code('P'))) {
		tryActivateAbility(player)
	}

	//if press space teleport at the rotation and add to the posision 
	

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
	var playerEdgeSoftLimitWidth = (windowWidth / 2) + 1
	var playerEdgeSoftLimitHeight = (windowHeight / 2) + 1

	//case when player is at the bottom or right of the screen
	var edgeX = camera.x + windowWidth
	var edgeY = camera.y + windowHeight

	var distFromEdgeX = edgeX - player.pos.x
	var distFromEdgeY = edgeY - player.pos.y

	var cameraMoveX = max(playerEdgeSoftLimitWidth - distFromEdgeX, 0)
	var cameraMoveY = max(playerEdgeSoftLimitHeight - distFromEdgeY, 0)
	
	var cameraLimitX = mapWidth - width
	var cameraLimitY = mapHeight - height
	
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
	var screenx = ((windowWidth / 2));
	var screeny = ((windowHeight / 2));
	var sightradius = Math.sqrt(((windowWidth / 2) * (windowWidth / 2)) + ((windowHeight / 2) * (windowHeight / 2)));
	let dx = (player.pos.x - camera.x) - screenx;
	let dy = (player.pos.y - camera.y) - screeny;
	let dist = Math.sqrt((dx * dx) + (dy * dy));
	//print(dist);
	if (dist < sightradius + player.size) {
		push()
		angleMode(DEGREES)
		translate(player.pos.x - camera.x, player.pos.y - camera.y)
		rotate(-player.angle + 90)
		tint(player.color.r, player.color.g, player.color.b)
		imageMode(CENTER)
		image(pship, 0, 0, player.size * 2, player.size * 2);
		pop()

		//draw name tag below player above health bar
		textAlign(CENTER);
		textSize(12);
		fill(255);
		text(player.name, player.pos.x - camera.x, player.pos.y - camera.y + 25);

		//max health bar (dark-grey)
		fill(40);
		rect(player.pos.x - camera.x - 23, player.pos.y - camera.y + 30, playerMaxHealth / 2, 10);

		//current health bar (same as player color)
		fill(player.color.r, player.color.g, player.color.b);
		rect(player.pos.x - camera.x - 23, player.pos.y - camera.y + 30, player.health / 2, 10);
	}
}

function showProjecile(projectile) {
	var screenx = ((windowWidth / 2));
	var screeny = ((windowHeight / 2));
	var sightradius = Math.sqrt(((windowWidth / 2) * (windowWidth / 2)) + ((windowHeight / 2) * (windowHeight / 2)));
	let dx = (projectile.pos.x - camera.x) - screenx;
	let dy = (projectile.pos.y - camera.y) - screeny;
	let dist = Math.sqrt((dx * dx) + (dy * dy));
	//print(dist);
	if (dist < sightradius + projectile.size) {
		push()
		var c = projectile.color
		fill(c.r, c.g, c.b)
		ellipse(projectile.pos.x - camera.x, projectile.pos.y - camera.y, projectile.size * 2)
		pop()
	}
}

function showAsteroid(asteroid) {
	var screenx = ((windowWidth / 2));
	var screeny = ((windowHeight / 2));
	var sightradius = Math.sqrt(((windowWidth / 2) * (windowWidth / 2)) + ((windowHeight / 2) * (windowHeight / 2)));
	let dx = (asteroid.pos.x - camera.x) - screenx;
	let dy = (asteroid.pos.y - camera.y) - screeny;
	let dist = Math.sqrt((dx * dx) + (dy * dy));
	//print(dist);
	if (dist < sightradius + asteroid.size) {
		push()
		translate(asteroid.pos.x - camera.x, asteroid.pos.y - camera.y);
		imageMode(CENTER);
		var asteroidImage
		var healthPercent = asteroid.health / asteroid.maxhealth()
		if (healthPercent > (2 / 3)) {
			asteroidImage = asteroid_full
		} else if (healthPercent > (1 / 3)) {
			asteroidImage = asteroid_medium
		} else {
			asteroidImage = asteroid_low
		}
		image(asteroidImage, 0, 0, asteroid.size * 2, asteroid.size * 2);
		pop()
	}
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
	var screenx = ((windowWidth / 2));
	var screeny = ((windowHeight / 2));
	var sightradius = Math.sqrt(((windowWidth / 2) * (windowWidth / 2)) + ((windowHeight / 2) * (windowHeight / 2)));
	let dx = (powerup.pos.x - camera.x) - screenx;
	let dy = (powerup.pos.y - camera.y) - screeny;
	let dist = Math.sqrt((dx * dx) + (dy * dy));
	//print(dist);
	if (dist < sightradius + powerup.size) {
		push()
		translate(powerup.pos.x - camera.x, powerup.pos.y - camera.y)
		imageMode(CENTER)
		image(imageFromPowerupType(powerup.type), 0, 0, powerup.size * 2, powerup.size * 2)
		pop()
	}
}

function showEnemy(enemy) {
	var screenx = ((windowWidth / 2));
	var screeny = ((windowHeight / 2));
	var sightradius = Math.sqrt(((windowWidth / 2) * (windowWidth / 2)) + ((windowHeight / 2) * (windowHeight / 2)));
	let dx = (enemy.pos.x - camera.x) - screenx;
	let dy = (enemy.pos.y - camera.y) - screeny;
	let dist = Math.sqrt((dx * dx) + (dy * dy));
	//print(dist);
	if (dist < sightradius + enemy.size) {
		push()
		angleMode(DEGREES)
		translate(enemy.pos.x - camera.x, enemy.pos.y - camera.y)
		rotate(enemy.angle + 90)
		imageMode(CENTER)
		if (!enemy.color.equals(neutralColor)) {
			tint(enemy.color.r, enemy.color.g, enemy.color.b)
		}
		image(eship, 0, 0, enemy.size * 2, enemy.size * 2)
		pop()

		//max health bar (dark-grey)
		fill(40);
		rect((enemy.pos.x - camera.x) - 13, enemy.pos.y - camera.y + enemy.size + 5, enemyMaxHealth/2, 10);

		//current health bar (same as player color)
		fill(enemy.color.r, enemy.color.g, enemy.color.b);
		rect((enemy.pos.x - camera.x) - 13, enemy.pos.y - camera.y + enemy.size + 5, enemy.health/2, 10);
	}
}

var lastAngle;
function doRotation(player) {
	//the angle determined by mouse position
	var newAngle = Math.atan2(mouseY - (player.pos.y - camera.y), mouseX - (player.pos.x - camera.x))
	newAngle *= (180 / Math.PI)
	newAngle = -newAngle
	if (newAngle < 0) {
		newAngle += 360
	}
	if (isNaN(newAngle) || lastAngle === newAngle) {
		return
	}

	socket.emit("changeAngle", {
		angle: newAngle
	})
	lastAngle = newAngle
}

function ui(player, state) {
	push()
	//Bottom left

	//Health Bar
		//"HP:" text
		textAlign(LEFT, TOP);
		textSize(15);
		fill(255);
		text("HP:", 5, windowHeight - 97);

		//max health bar (dark-grey)
		fill(40);
		rect(70, windowHeight - 100, playerMaxHealth*2, 20);

		//current health bar (same as player color)
		fill(player.color.r, player.color.g, player.color.b);
		rect(70, windowHeight - 100, player.health*2, 20);

	//Dash indicator
		//"Dashes:" text
		textAlign(LEFT, TOP);
		textSize(15);
		fill(255);
		text("Dashes:", 5, windowHeight - 77);
		
		//max Dash bar (dark-grey)
		fill(40);
		rect(70, windowHeight - 80, playerMaxHealth * 2, 20);

		//current Dash bar (Light-blue/cyan)
		fill(0, 255, 255);
		rect(70, windowHeight - 80, playerMaxHealth * 2, 20);

		//Dash seperator
		fill(40);
		rect(70 + ((playerMaxHealth*2) / 3), windowHeight - 80, 1, 20);
		rect(70 + (2*((playerMaxHealth*2) / 3)), windowHeight - 80, 1, 20);
	//Ammo indicator
		//"Ammo:" text
		textAlign(LEFT, TOP);
		textSize(15);
		fill(255);
		text("Ammo:", 5, windowHeight - 57);

		//max Ammo bar (dark-grey)
		fill(40);
		rect(70, windowHeight - 60, playerMaxHealth * 2, 20);

		//current Ammo bar (Player colored sticks)
		fill(player.color.r, player.color.g, player.color.b);
		rect(70, windowHeight - 60, playerMaxHealth * 2, 20);

		//Ammo seperator
		fill(40);
		for (var i = 1; i < 50; i++) {
			rect(70 + (i * ((playerMaxHealth * 2) / 50)), windowHeight - 60, 1, 20);
		}


	//Top right

	//Player scoreboard


	//Bottom right

	//Chat output


	//Top left

	//Player Team Chart

	//Ability info
	//TODO: replace this with something prettier
	textAlign(CENTER, CENTER);
	textSize(15);
	fill(255);

	text(`Ability ${player.abilityName()}, Duration: ${player.abilityDuration}, Cooldown: ${player.abilityCooldown}`, width / 2, height - 20)

	pop()
}

function showPlayerConnections() {
	push()
	for (var i = 0; i < state.players.length; i++) {
		for (var j = 0; j < state.players.length; j++) {
			if (i <= j) {
				continue
			}
			if (!state.players[i].color.equals(state.players[j].color)) {
				continue
			}

			if (state.players[i].pos.dist(state.players[j].pos) < connectionRadius) {
				stroke(state.players[i].color.r, state.players[i].color.g, state.players[i].color.b)
				var dist = state.players[i].pos.dist(state.players[j].pos)
				strokeWeight(20 * (1 - (dist / connectionRadius)))
				line(state.players[i].pos.x - camera.x, state.players[i].pos.y - camera.y, state.players[j].pos.x - camera.x, state.players[j].pos.y - camera.y)
			}
		}
	}
	pop()
}

function draw() {
	if (isServerCamera) {
		serverCameraDraw()
		return
	}
	if (state === undefined) {
		//we are still waiting for initial state packet
		return
	}
	var player = state.playerById(socket.id)
	if (player === null) {
		//we got initial state packet, but it will not have us as a player at first
		return
	}

	doInput(player)
	moveCamera(player)
	doRotation(player)

	background(51)
	image(bg, -camera.x, -camera.y, mapWidth, mapHeight);
	
	for (var i = 0; i < state.projectiles.length; i++) {
		showProjecile(state.projectiles[i]);
	}

	showPlayerConnections()
	for (var i = 0; i < state.players.length; i++) {
		showPlayer(state.players[i]);
	}

	for (var i = 0; i < state.enemies.length; i++) {
		showEnemy(state.enemies[i]);
	}

	for (var i = 0; i < state.powerups.length; i++) {
		showPowerup(state.powerups[i])
	}

	for (var i = 0; i < state.asteroids.length; i++) {
		showAsteroid(state.asteroids[i])
	}

	ui(player, state);
}

var lastShootTime = 0
const shootDelayMillis = 200

function tryShoot() {
	if (millis() - lastShootTime > shootDelayMillis) {
		socket.emit("shoot", {})
		lastShootTime = millis()
	}
}

function mouseClicked(){
	tryShoot()
}

function tryActivateAbility(player) {
	if (player.canActivateAbility()) {
		socket.emit("activateAbility", {})
	}
}

function serverCameraShowPlayer(player, serverCamScalex, serverCamScaley) {
	push()
	translate(player.pos.x / mapWidth * width, player.pos.y / mapHeight * height)
	angleMode(DEGREES)
	rotate(-player.angle + 90)
	tint(player.color.r, player.color.g, player.color.b)
	imageMode(CENTER)
	image(pship, 0, 0, player.size * 2 * serverCamScalex, player.size * 2 * serverCamScaley)
	pop()
}

function serverCameraShowEnemy(enemy, serverCamScalex, serverCamScaley) {
	push()
	translate(enemy.pos.x / mapWidth * width, enemy.pos.y / mapHeight * height)
	angleMode(DEGREES)
	rotate(-enemy.angle + 90)
	imageMode(CENTER)
	if (!enemy.color.equals(neutralColor)) {
		tint(enemy.color.r, enemy.color.g, enemy.color.b)
	}
	image(eship, 0, 0, enemy.size * 2 * serverCamScalex, enemy.size * 2 * serverCamScaley)
	pop()
}

function serverCameraShowAsteroid(asteroid, serverCamScalex, serverCamScaley) {
	push()
	translate(asteroid.pos.x / mapWidth * width, asteroid.pos.y / mapHeight * height)
	imageMode(CENTER);
	var asteroidImage
	var healthPercent = asteroid.health / asteroid.maxhealth()
	if (healthPercent > (2 / 3)) {
		asteroidImage = asteroid_full
	} else if (healthPercent > (1 / 3)) {
		asteroidImage = asteroid_medium
	} else {
		asteroidImage = asteroid_low
	}
	image(asteroidImage, 0, 0, asteroid.size * 2 * serverCamScalex, asteroid.size * 2 * serverCamScaley);
	pop()
}

function serverCameraDraw() {
	background(51)
	image(bg, 0, 0, width, height);

	var serverCamScalex = (windowWidth / mapWidth)
	var serverCamScaley = (windowHeight / mapHeight)
	print(serverCamScalex)
	print(serverCamScaley)
	for (var i = 0; i < state.players.length; i++) {
		serverCameraShowPlayer(state.players[i], serverCamScalex, serverCamScaley)
	}

	for (var i = 0; i < state.enemies.length; i++) {
		serverCameraShowEnemy(state.enemies[i], serverCamScalex, serverCamScaley);
	}

	for (var i = 0; i < state.asteroids.length; i++) {
		serverCameraShowAsteroid(state.asteroids[i], serverCamScalex, serverCamScaley)
	}
}

var isServerCamera = false
function becomeServerCamera() {
	isServerCamera = true
	socket.emit("becomeServerCamera", {})
}

//this is necessary because p5.js needs to see these functions in the global scope, which doesn't happen with a module
window.draw = draw
window.preload = preload
window.setup = setup
window.windowResized = windowResized
window.mouseClicked = mouseClicked
window.becomeServerCamera = becomeServerCamera