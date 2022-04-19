/*
@file sketch.js
@author entire team
@date 2/18/2022
@brief File that controls the graphics on the canvas
*/

export var socket
var cnv
var camera
export var state

import {GameState} from './shared/gamestate.js'
import {GameEvent} from './shared/events.js'
import {mapWidth, mapHeight, SimpleVector, connectionRadius, neutralColor, setTesting, isTesting} from './shared/utilities.js'
import {Powerup, enemyMaxHealth, playerMaxHealth, Projectile, playerBaseBulletSize, playerMaxFuel} from './shared/entities.js'
import {serverCameraDraw, isServerCamera, becomeServerCamera} from "./serverCamera.js"
//import {cuss} from 'cuss'

 
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

	startButtonImage = loadImage('startbuttonbad.png', () => { }, () => {
		console.log('failed to load start button')
	})
	menuBackground = loadImage('menubackgroundbad.png', () => { }, () => {
		console.log('failed to load menu background')
	})
	bangEffect = loadImage('bang_effect.png', () => {}, () => {
		console.log("Failed to load bang effect")
	})
}
export var bg
export var pship, eship, asteroid_full, asteroid_medium, asteroid_low
var powerupFuel, powerupHealth, powerupSpeed, powerupAttack, powerupMachineGun, swordImg, startButtonImage, menuBackground, bangEffect

p5.Image.prototype.resizeNN = function (w, h) {
  "use strict";

  // Locally cache current image's canvas' dimension properties:
  const {width, height} = this.canvas;

  // Sanitize dimension parameters:
  w = ~~Math.abs(w), h = ~~Math.abs(h);

  // Quit prematurely if both dimensions are equal or parameters are both 0:
  if (w === width && h === height || !(w | h))  return this;

  // Scale dimension parameters:
  w || (w = h*width  / height | 0); // when only parameter w is 0
  h || (h = w*height / width  | 0); // when only parameter h is 0

  const img = new p5.Image(w, h), // creates temporary image
        sx = w / width, sy = h / height; // scaled coords. for current image

  this.loadPixels(), img.loadPixels(); // initializes both 8-bit RGBa pixels[]

  // Create 32-bit viewers for current & temporary 8-bit RGBa pixels[]:
  const pixInt = new Int32Array(this.pixels.buffer),
        imgInt = new Int32Array(img.pixels.buffer);

  // Transfer current to temporary pixels[] by 4 bytes (32-bit) at once:
  for (let y = 0; y < h; ) {
    const curRow = width * ~~(y/sy), tgtRow = w * y++;

    for (let x = 0; x < w; ) {
      const curIdx = curRow + ~~(x/sx), tgtIdx = tgtRow + x++;
      imgInt[tgtIdx] = pixInt[curIdx];
    }
  }

  img.updatePixels(); // updates temporary 8-bit RGBa pixels[] w/ its current state

  // Resize current image to temporary image's dimensions:
  this.canvas.width = this.width = w, this.canvas.height = this.height = h;
  this.drawingContext.drawImage(img.canvas, 0, 0, w, h, 0, 0, w, h);

  return this;
};

function cloneImage(img) {
	var w = img.width
	var h = img.height
	var newImg = new p5.Image(w, h)
	newImg.copy(img, 0, 0, w, h, 0, 0, w, h)
	return newImg
}

var resizeCache = {}

//name: name of the image.  Should be the same between calls if the image is the same
function resize(img, name, w, h) {
	var key = name + w + "," + h
	if (resizeCache[key] !== undefined) {
		return resizeCache[key]
	}

	var resized = cloneImage(img)
	resized.resizeNN(w, h)
	resizeCache[key] = resized
	return resized
}

function imageWithResize(img, name, x, y, w, h) {
	var resized = resize(img, name, w, h)
	image(resized, x, y, w, h)
}

export var gameStarted = false
function transitionToGame() {

	const name = menuInput.value();
	menuInput.remove()
	startButtonImgElem.remove()
	startButton.remove()

	/*
	chatInput = createInput()
	chatInput.value('')
	chatInput.attribute("placeholder", "Enter some text...")
	chatInput.size(300, 20)

	chatButton = createButton("")
	chatButton.size(20, 20)
	chatButton.style("padding", "0px")
	chatButton.style("margin", "0px")
	chatButton.style("border", "0px")
	chatButton.mouseClicked(transitionToGame)
	chatButtonImgElem = createImg("startbuttonbad.png", "Start")
	chatButtonImgElem.size(startButton.width, startButton.height)
	chatButtonImgElem.parent(startButton)
	*/

	socket = io.connect()
	camera = {
		x: 0,
		y: 0
	}

	socket.on('tick', function (data) {
		var eventsSerialized = data.events
		var seed = data.seed
		//if (eventsSerialized.length !== 0) {
		//	console.log(eventsSerialized)
		//}

		var events = []
		for (var i = 0; i < eventsSerialized.length; i++) {
			events.push(GameEvent.deserialize(eventsSerialized[i]))
		}

		state.seed(seed)
		state.advance(events)
		socket.emit('tickReply', {});
	})

	socket.on("state", function (data) {
		state = GameState.deserialize(data.state)
		setTesting(data.testing)
	})

	if (name) {
		initialName = name
		storeItem("namePreference", name)
	} else {
		initialName = undefined
	}

	lastax = 0
	lastay = 0

	gameStarted = true
}

var initialName
var input, button
var menuInput, startButton, chatInput, chatButton, startButtonImgElem, chatButtonImgE
function setup() {
	//console.log(cuss.fuck);
	//THIS IS MENU SETUP
	//for game setup, put code in transitionToGame

	cnv = createCanvas(0, 0);
	cnv.parent("sketch-container")
	windowResized()
	background(0)

	textAlign(CENTER);
	textSize(50);

	menuInput = createInput()
	var namePreference = getItem("namePreference")
	if (namePreference !== null) {
		menuInput.value(namePreference)
	}
	menuInput.attribute("placeholder", "Enter a name...")
	menuInput.size(400, 20)
	
	startButton = createButton("")
	startButton.size(menuInput.width, 70)
	startButton.style("padding", "0px")
	startButton.style("margin", "0px")
	startButton.style("border", "0px")
	startButton.mouseClicked(transitionToGame)
	startButtonImgElem = createImg("startbuttonbad.png", "Start")
	startButtonImgElem.size(startButton.width, startButton.height)
	startButtonImgElem.parent(startButton)
}

var Max_Ammo = 50;
var Ammo = Max_Ammo;

function menuDraw() {
	background(0)
	image(menuBackground, 0, 0, width, height);

	menuInput.center()
	startButton.center()
	
	menuInput.position(menuInput.x, menuInput.y + (height / 4))
	startButton.position(startButton.x, startButton.y + (height / 4) + (startButton.height / 2) + (menuInput.height / 2))
}

var lastax
var lastay

function isCanvasFocused() {
	return document.activeElement.tagName === "BODY"
}

//handles user input
function doInput(player) {
	//if we are not focused on the canvas, like if we are entering a name
	if (!isCanvasFocused()) {
		return
	}

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

	if (isTesting() && (keyIsDown(code('b')) || keyIsDown(code('B')))) {
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

function isOnscreen(entity) {
	var screenx = ((windowWidth / 2));
	var screeny = ((windowHeight / 2));
	var sightradius = Math.sqrt(((windowWidth / 2) * (windowWidth / 2)) + ((windowHeight / 2) * (windowHeight / 2)));
	let dx = (entity.pos.x - camera.x) - screenx;
	let dy = (entity.pos.y - camera.y) - screeny;
	let dist = Math.sqrt((dx * dx) + (dy * dy));
	return dist < sightradius + entity.size
}

function showPlayer(player) {
	if (isOnscreen(player)) {
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

function showLaser(laser) {
	push()
	var c = laser.color
	fill(c.r, c.g, c.b)
	translate(laser.pos.x - camera.x, laser.pos.y - camera.y)
	angleMode(DEGREES)
	rotate(-laser.angle)
	rectMode(CENTER)
	rect(0, 0, playerBaseBulletSize * 3, laser.size * 2)
	//ellipse(0, 0, laser.size * 2)
	pop()
}

function showProjecile(projectile) {
	if (isOnscreen(projectile)) {
		if (projectile.type === Projectile.LASER) {
			showLaser(projectile)
			return
		}
		push()
		var c = projectile.color
		fill(c.r, c.g, c.b)
		ellipse(projectile.pos.x - camera.x, projectile.pos.y - camera.y, projectile.size * 2)
		pop()
	}
}

function showAsteroid(asteroid) {
	if (isOnscreen(asteroid)) {
		push()
		translate(asteroid.pos.x - camera.x, asteroid.pos.y - camera.y);
		angleMode(DEGREES)
		rotate(asteroid.angle)
		imageMode(CENTER);
		var asteroidImage
		var healthPercent = asteroid.health / asteroid.maxhealth()

		var name = "asteroid_"
		if (healthPercent > (2 / 3)) {
			asteroidImage = asteroid_full
			name += "full"
		} else if (healthPercent > (1 / 3)) {
			asteroidImage = asteroid_medium
			name += "medium"
		} else {
			asteroidImage = asteroid_low
			name += "low"
		}
		imageWithResize(asteroidImage, name, 0, 0, asteroid.size * 2, asteroid.size * 2);
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
		case Powerup.FUEL:
			return powerupFuel
		default:
			throw new Error("Unknown powerup type: " + type)
	}
}

function showPowerup(powerup) {
	if (isOnscreen(powerup)) {
		push()
		translate(powerup.pos.x - camera.x, powerup.pos.y - camera.y)
		imageMode(CENTER)
		if (powerup.life < (30 * 5)) {
			tint(255, Math.sin(powerup.life / 2) * 255)
		}
		image(imageFromPowerupType(powerup.type), 0, 0, powerup.size * 2, powerup.size * 2)
		pop()
	}
}

function showEnemy(enemy) {
	if (isOnscreen(enemy)) {
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

function showCorpse(corpse) {
	push()
	var entity = corpse.entity
	translate(entity.pos.x - camera.x, entity.pos.y - camera.y)
	angleMode(DEGREES)
	rotate(entity.angle)
	imageMode(CENTER)
	image(bangEffect, 0, 0, entity.size*2, entity.size*2)
	pop()
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

function pieChart(diameter, players, x, y) {
	let lastAngle = 0;
	let team_colors = [];
	let team_counts = [0, 0, 0];
	for (let i = 0; i < players.length; i++) {
		if (!(players[i].color.inArray(team_colors))) {
			team_colors.push(players[i].color);
		}
	}
	for (let i = 0; i < team_colors.length; i++) {
		team_counts[i] = 0;
		for (let j = 0; j < players.length; j++) {
			if (players[j].color.equals(team_colors[i])) {
				team_counts[i] += 1;
			}
		}
	}
	let angles = [];
	for (let i = 0; i < team_counts.length; i++) {
		angles[i] = (team_counts[i] / players.length) * 360;
	}
	for (let i = 0; i < team_colors.length; i++) {
		fill(color(team_colors[i].r, team_colors[i].g, team_colors[i].b));
		arc(
			x,
			y,
			diameter,
			diameter,
			lastAngle,
			lastAngle + angles[i]
		);
		lastAngle += angles[i];
	}
}

var ToggleChat = true;
var ToggleScore = true;

function ui(player, state) {
	push()
	//Bottom left

	//background
	push();
	fill(0, 255, 255, 100);
	stroke(0, 255, 255);
	strokeWeight(5);
	beginShape();
	vertex(-10, windowHeight + 10);
	vertex(-10, windowHeight - 110);
	vertex((playerMaxHealth * 2) + 80, windowHeight - 115);
	vertex((playerMaxHealth * 2) + 100, windowHeight + 10);
	endShape(CLOSE);
	pop()


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
		rect(70, windowHeight - 80, (playerMaxHealth * 2) * (player.fuel / playerMaxFuel), 20);

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
		rect(70, windowHeight - 60, Ammo/Max_Ammo * (playerMaxHealth * 2), 20);

		//Ammo seperator
		fill(40);
		for (var i = 1; i < 50; i++) {
			rect(70 + (i * ((playerMaxHealth * 2) / 50)), windowHeight - 60, 1, 20);
		}


	//Top right

	//background
	push();
	fill(0, 255, 255, 100);
	stroke(0, 255, 255);
	strokeWeight(5);
	beginShape();
	vertex(windowWidth + 10, -10);
	vertex(windowWidth + 10, 200);
	vertex(windowWidth - 150, 200);
	vertex(windowWidth - 150, -10);
	endShape(CLOSE);
	pop()

	//Player scoreboard


	//Bottom right

	//background
	push();
	fill(0, 255, 255, 100);
	stroke(0, 255, 255);
	strokeWeight(5);
	beginShape();
	vertex(windowWidth + 10, windowHeight + 10);
	vertex(windowWidth - 350, windowHeight + 10);
	vertex(windowWidth - 350, windowHeight - 150);
	vertex(windowWidth - 85, windowHeight - 150);
	vertex(windowWidth - 80, windowHeight - 170);
	vertex(windowWidth + 10, windowHeight - 170);
	endShape(CLOSE);
	pop()

	//Chat output
	textSize(16);
	fill(255);
	text("Chat", windowWidth - 68, windowHeight - 163);

	//Chat input
	if(ToggleChat == true){
		//chatInput.center()
		//chatButton.center()

		//chatInput.position(chatInput.x, chatInput.y + (height / 4))
		//chatButton.position(chatButton.x, chatButton.y + (height / 4) + (chatButton.height / 2) + (chatInput.height / 2))
	}else{
		// make smaller and background 
	}
	//Top left

	//background
	push()
	fill(0, 255, 255, 100);
	stroke(0, 255, 255);
	strokeWeight(5);
	beginShape();
	vertex(-10, -10);
	vertex(-10, 115);
	vertex(110, 110);
	vertex(125, -10);
	endShape(CLOSE);
	pop()

	//Player Team Chart
	pieChart(100, state.players, 55, 55);

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
			var player1 = state.players[i]
			var player2 = state.players[j]

			if (!isOnscreen(player1) && !isOnscreen(player2)) {
				continue
			}
			if (!player1.color.equals(player2.color)) {
				continue
			}

			if (player1.pos.dist(player2.pos) < connectionRadius) {
				stroke(player1.color.r, player1.color.g, player1.color.b)
				var dist = player1.pos.dist(player2.pos)
				strokeWeight(20 * (1 - (dist / connectionRadius)))
				line(player1.pos.x - camera.x, player1.pos.y - camera.y, player2.pos.x - camera.x, player2.pos.y - camera.y)
			}
		}
	}
	pop()
}

function handleInitialName() {
	if (initialName !== undefined) {
		socket.emit("changeName", {
			name: initialName
		})
		initialName = undefined
	}
}

function draw() {
	if (isServerCamera) {
		serverCameraDraw()
		return
	}
	if (!gameStarted) {
		menuDraw()
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
	handleInitialName()

	doInput(player)
	moveCamera(player)
	doRotation(player)

	background(51)
	image(bg, -camera.x, -camera.y, mapWidth, mapHeight);

	showPlayerConnections()
	state.corpses.map(c => showCorpse(c))
	state.powerups.map(p => showPowerup(p))
	state.players.map(p => showPlayer(p))
	state.projectiles.map(p => showProjecile(p))
	state.enemies.map(e => showEnemy(e))
	state.asteroids.map(a => showAsteroid(a))

	
	if (millis() - lastAmmoRefil > refilDelayMillis && Ammo < Max_Ammo ) {
		Ammo += 1
		lastAmmoRefil = millis()
	}

	ui(player, state);
}

var lastAmmoRefil = 0;
const refilDelayMillis = 500
var lastShootTime = 0;
const shootDelayMillis = 200

function tryShoot() {
	if (millis() - lastShootTime > shootDelayMillis && Ammo > 0) {
		Ammo -= 1
		socket.emit("shoot", {})
		lastShootTime = millis()
	}
}

function mouseClicked(){
	if (gameStarted && isCanvasFocused()) {
		tryShoot()
	}
}

function tryActivateAbility(player) {
	if (player.canActivateAbility()) {
		socket.emit("activateAbility", {})
	}
}

//this is necessary because p5.js needs to see these functions in the global scope, which doesn't happen with a module
window.draw = draw
window.preload = preload
window.setup = setup
window.windowResized = windowResized
window.mouseClicked = mouseClicked
window.becomeServerCamera = becomeServerCamera