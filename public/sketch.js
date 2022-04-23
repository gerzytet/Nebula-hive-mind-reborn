/*
@file sketch.js
@author entire team
@date 2/18/2022
@brief File that controls the graphics on the canvas
*/

//howler crap

var sounds = ['library/blaster.mp3', 'library/blaster_high_pitch.mp3', 'library/blaster_low_pitch.mp3', 'library/boost.mp3', 
'library/laser_sword.mp3', 'library/powerup.mp3', 'library/explosion.mp3'];
//'library/sword-hit.mp3'

//done
var blasterSound = new Howl({
	src:[sounds[0]],
	loop: false,
	volume: 0.25
});
//done
var blasterSoundHigh = new Howl({
	src:[sounds[1]],
	loop: false,
	volume: 0.25
});
//done
var blasterSoundLow = new Howl({
	src:[sounds[2]],
	loop: false,
	volume: 0.25
});
//same thing as dashing
var boostSound = new Howl({
	src:[sounds[3]],
	loop: false,
	volume: 5.0
});
//!Pointless, no more sword in game!
var laserSwordSound = new Howl({
	src:[sounds[4]],
	loop: false
});
var powerupSound = new Howl({
	src:[sounds[5]],
	loop: false
}); 
//!Change this sound completely!!!!!
var explosionSound = new Howl({
	src:[sounds[6]],
	loop: false,
	volume: 0.025
});
//!Pointless, no more sword in game!
var swordHitSound = new Howl({
	src:[sounds[6]],
	loop: false,
	volume: 0.5
});

import {Callbacks, GameState, setCallbacks} from './shared/gamestate.js'
import {GameEvent} from './shared/events.js'
import {mapWidth, mapHeight, SimpleVector, connectionRadius, neutralColor, setTesting, isTesting} from './shared/utilities.js'
import {Powerup, enemyMaxHealth, playerMaxHealth, Projectile, playerBaseBulletSize, playerMaxFuel, Player, Enemy, PlayerAfterImage, Boss} from './shared/entities.js'
import { serverCameraDraw, isServerCamera, becomeServerCamera } from "./serverCamera.js"
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
	asteroidFull = loadImage('Asteroid_Full.png', () => { }, () => {
		console.log("failed to load asteroid full");
	});
	asteroidMedium = loadImage('Asteroid_Medium.png', () => { }, () => {
		console.log("failed to load asteroid medium");
	});
	asteroidLow = loadImage('Asteroid_Low.png', () => { }, () => {
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

	menuBackground = loadImage('menubackgroundbad.png', () => { }, () => {
		console.log('failed to load menu background')
	})
	explosionGif = loadImage('explosion_.gif', () => {}, () => {
		console.log("Failed to load Explosion Gif")
	})
	rockexplosionGif = loadImage('Rock_explosion_.gif', () => { }, () => {
		console.log("Failed to load Rock Explosion Gif")
	})
	dog = loadFont('dogicapixel.otf', () => { }, () => {
		console.log("Failed to load Dogica Pixel Font")
	})
	towleImage = loadImage('Towle.png', () => {}, () => {
		console.log('Failed to load Towle')
	})

	FImage = loadImage('f.png', () => { }, () => {
		console.log('Failed to load F')
	})
}
export var bg
export var pship, eship, asteroidFull, asteroidMedium, asteroidLow
var powerupFuel, powerupHealth, powerupSpeed, powerupAttack, powerupMachineGun, menuBackground, explosionGif, rockexplosionGif, dog, towleImage, FImage
export var socket
var cnv
var camera
export var state
var resizeCache = {}
var initialName
var input, button
var menuInput, startButton, chatInput, chatButton, startButtonImgElem, chatButtonImgElem, doubleShotButton, laserButton, summonerButton, doubleButtonImgElem, laserButtonImgElem, summonerButtonImgElem, backToMenuButton, menuDiv
var maxAmmo = 50;
var ammo = maxAmmo
var lastax
var lastay
var lastAngle


//game still running
export const STATE_RUNNING = 0
//boss battle win
export const STATE_WIN = 1
//boss battle lose
export const STATE_LOSE = 2
//died.  boss battle result inconclusive
export const STATE_DIED = 3
//menu
export const STATE_MENU = 4

class ClientCallbacks extends Callbacks {
	onKillDuringBoss(player) {
		if (player.id !== socket.id) {
			return
		}
		transitionToState(STATE_DIED)
	}

	onGameOver(win) {
		if (gameState === STATE_MENU) {
			return
		}
		if (win) {
			transitionToState(STATE_WIN)
		} else {
			transitionToState(STATE_LOSE)
		}
	}

	onPickupPowerup(player) {
		if (player.id !== socket.id) {
			return
		}

		powerupSound.play()
	}
}

export var gameState
function transitionToState(newGameState, ...args) {
	switch (gameState) {
		case STATE_MENU:
			deleteMenu()
			break
		case STATE_RUNNING:
			deleteGame()
			break
		case STATE_DIED:
		case STATE_LOSE:
		case STATE_WIN:
			deleteGameoverScreen()
			break
		default:
			throw new Error("Unknown state")
	}

	gameState =  newGameState
	switch (newGameState) {
		case STATE_MENU:
			createMenu()
			break
		case STATE_RUNNING:
			createGame(...args)
			break
		case STATE_DIED:
		case STATE_LOSE:
		case STATE_WIN:
			createGameoverScreen()
			break
		default:
			throw new Error("Unknown state")
	}
}


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

function createGame(PlayerAbilityVal) {
	chatInput = createInput()
	chatInput.value('')
	chatInput.attribute("placeholder", "Enter some text...")
	chatInput.size(290, 20)

	chatButton = createButton("")
	chatButton.size(chatInput.height, chatInput.height)
	chatButton.style("padding", "0px")
	chatButton.style("margin", "0px")
	chatButton.style("border", "0px")
	chatButton.mouseClicked(sendChat)
	chatButtonImgElem = createImg("chatbutton.png", "Chat")
	chatButtonImgElem.size(chatInput.height, chatInput.height)
	chatButtonImgElem.parent(chatButton)

	camera = {
		x: 0,
		y: 0
	}

	socket.emit("join", {
		ability: PlayerAbilityVal
	})

	lastax = 0
	lastay = 0
}

function deleteGame() {
	chatInput.remove()
	chatButton.remove()
}

function gameDraw() {
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

	
	if (millis() - lastAmmoRefil > refilDelayMillis && ammo < maxAmmo ) {
		ammo += 1
		lastAmmoRefil = millis()
	}

	ui(player, state);
}

function deleteMenu() {
	const name = menuInput.value();
	menuInput.remove()
	startButtonImgElem.remove()
	startButton.remove()
	doubleShotButton.remove()
	laserButton.remove()
	summonerButton.remove()
	menuDiv.remove()

	if (name) {
		initialName = name
		storeItem("namePreference", name)
	} else {
		initialName = undefined
	}
}

function menuDraw() {
	background(0)
	image(menuBackground, 0, 0, width, height);

	//menuInput.center()
	//startButton.center()

	//doubleShot.center()
	//Lazer.center()
	//Summonor.center()
	
	//menuInput.position(menuInput.x, menuInput.y + (height / 4))
	//doubleShot.position(doubleShot.x, doubleShot.y + (height / 4) + (doubleShot.height / 2) + (menuInput.height / 2))
	//Lazer.position(Lazer.x, Lazer.y + (height / 4) + doubleShot.height + (Lazer.height / 2) + (menuInput.height / 2))
	//Summonor.position(Summonor.x, Summonor.y + (height / 4) + Lazer.height + doubleShot.height + (Summonor.height / 2) + (menuInput.height / 2))

	//startButton.position(startButton.x, startButton.y + (height / 4) + (startButton.height / 2) + (menuInput.height / 2))
	if (state) {
		if (state.bossPhase && menuButtonEnabled) {
			disableMenuButton()
		}
		if (!state.bossPhase && !menuButtonEnabled) {
			enableMenuButton()
		}
	}
}

var abilitySelection
function createMenu() {
	textAlign(CENTER);
	textSize(50);
	textFont(dog);

	menuDiv = createDiv()
	menuDiv.class("menu-button-container")
	menuDiv.position(width/2 - 200, (height*3)/4 - 70)

	var namePreference = getItem("namePreference")
	menuInput=createInput()
	if (namePreference !== null) {
		menuInput.value(namePreference)
	}

	menuInput.attribute("placeholder", "Enter a name...")
	menuInput.class("name-input")
	menuInput.parent(menuDiv)

	doubleShotButton = createButton("")
	doubleShotButton.class("no-margin")
	doubleShotButton.class("ability-button")
	doubleShotButton.parent(menuDiv)

	laserButton = createButton("")
	laserButton.class("no-margin")
	laserButton.class("ability-button")
	laserButton.parent(menuDiv)

	summonerButton = createButton("")
	summonerButton.class("no-margin")
	summonerButton.class("ability-button")
	summonerButton.parent(menuDiv)

	startButton = createButton("")
	startButton.class("no-margin")
	startButton.class("start-button")
	startButton.parent(menuDiv)
	disableMenuButton()

	socket = io.connect()

	socket.on("state", function (data) {
		state = GameState.deserialize(data.state)
		setTesting(data.testing)
	})

	socket.on('tick', function (data) {
		var eventsSerialized = data.events
		if (data.events) {
		}
		var seed = data.seed

		var events = []
		for (var i = 0; i < eventsSerialized.length; i++) {
			events.push(GameEvent.deserialize(eventsSerialized[i]))
		}

		state.seed(seed)
		state.advance(events)
		socket.emit('tickReply', {});
	})

	summonerButton.mouseClicked(() => {deselectAbility(); selectAbility(Player.NECROMANCER)})

	doubleShotButton.mouseClicked(() => {deselectAbility(); selectAbility(Player.DOUBLE_SHOT)})

	laserButton.mouseClicked(() => {deselectAbility(); selectAbility(Player.LASER) })

	laserButtonImgElem = createImg("laserbutton.png", "Lazer")
	laserButtonImgElem.class("button-image")
	laserButtonImgElem.parent(laserButton)

	doubleButtonImgElem = createImg("doubleshotbutton.png", "Double_Shot")
	doubleButtonImgElem.class("button-image")
	doubleButtonImgElem.parent(doubleShotButton)

	summonerButtonImgElem = createImg("summonerbutton.png", "Summoner")
	summonerButtonImgElem.class("button-image")
	summonerButtonImgElem.parent(summonerButton)

	selectAbility(Math.floor(Math.random() * (Player.MAX_ABILITY + 1)))
}

function abilityButtonImageName(ability) {
	switch (ability) {
		case Player.DOUBLE_SHOT:
			return "doubleshotbutton.png"
		case Player.LASER:
			return "laserbutton.png"
		case Player.NECROMANCER:
			return "summonerbutton.png"
	}
}

function selectedAbilityButtonImageName(ability) {
	return "selected" + abilityButtonImageName(ability)
}

function abilityButtonElement(ability) {
	switch (ability) {
		case Player.DOUBLE_SHOT:
			return doubleShotButton
		case Player.LASER:
			return laserButton
		case Player.NECROMANCER:
			return summonerButton
	}
}

function abilityButtonImageElement(ability) {
	switch (ability) {
		case Player.DOUBLE_SHOT:
			return doubleButtonImgElem
		case Player.LASER:
			return laserButtonImgElem
		case Player.NECROMANCER:
			return summonerButtonImgElem
	}
}

function abilityAltText(ability) {
	switch (ability) {
		case Player.DOUBLE_SHOT:
			return "double shot"
		case Player.LASER:
			return "laser"
		case Player.NECROMANCER:
			return "summoner"
	}
}

function setImageElementVar(ability, element) {
	switch (ability) {
		case Player.DOUBLE_SHOT:
			doubleButtonImgElem = element
			break
		case Player.LASER:
			laserButtonImgElem = element
			break
		case Player.NECROMANCER:
			summonerButtonImgElem = element
			break
	}
}

function deselectAbility() {
	abilityButtonImageElement(abilitySelection).remove()
	var deselectedButton = abilityButtonElement(abilitySelection)
	var deselectedImageElement = createImg(abilityButtonImageName(abilitySelection), abilityAltText(abilitySelection))
	deselectedImageElement.class("button-image")
	deselectedImageElement.parent(deselectedButton)
	setImageElementVar(abilitySelection, deselectedImageElement)
}

function selectAbility(ability) {
	abilityButtonImageElement(ability).remove()
	var selectedButton = abilityButtonElement(ability)
	var selectedImageElement = createImg(selectedAbilityButtonImageName(ability), abilityAltText(ability))
	selectedImageElement.class("button-image")
	selectedImageElement.parent(selectedButton)
	setImageElementVar(ability, selectedImageElement)

	abilitySelection = ability
}


var menuButtonEnabled = false
function enableMenuButton() {

	startButton.mouseClicked(() => { transitionToState(STATE_RUNNING, abilitySelection) })

	if (startButtonImgElem) {
		startButtonImgElem.remove()
	}
	startButtonImgElem = createImg("startbutton.png", "Start")
	startButtonImgElem.class("button-image")
	startButtonImgElem.parent(startButton)

	menuButtonEnabled = true
}

function disableMenuButton() {
	startButton.mouseClicked(() => {})

	if (startButtonImgElem) {
		startButtonImgElem.remove()
	}
	startButtonImgElem = createImg("waitingbutton.png", "waiting")
	startButtonImgElem.class("button-image")
	startButtonImgElem.parent(startButton)
	menuButtonEnabled = false
}


function setup() {
	cnv = createCanvas(0, 0);
	cnv.parent("sketch-container")
	windowResized()
	background(0)

	setCallbacks(new ClientCallbacks())
	gameState = STATE_MENU
	createMenu()
}

function createGameoverScreen() {
	var buttonText, buttonAction
	if (gameState === STATE_DIED) {
		buttonText = "Waiting for Boss Fight"
		buttonAction = () => {}
	} else {
		buttonText = "Back to Main Menu"
		buttonAction = () => {transitionToState(STATE_MENU)}
		socket.disconnect()
	}

	backToMenuButton = createButton(buttonText)
	backToMenuButton.size(400, 100);
	backToMenuButton.style('font-size', '40px');
	backToMenuButton.class("no-margin")
	backToMenuButton.mouseClicked(buttonAction)
}

function drawGameoverScreen() {
	push()
	textAlign(CENTER);
	textSize(40);
	
	var message
	switch (gameState) {
		case STATE_DIED:
			background(40)
			message = "You Died!"
			fill(255, 0, 0)
			break
		case STATE_LOSE:
			background(40)
			message = "Dr.Towle Failed you all!!!"
			fill(255, 0, 0)
			break
		case STATE_WIN:
			background(40)
			message = "You Beat Dr.Towle!"
			fill(0, 255, 255)
			break
	}

	text(message, windowWidth / 2, windowHeight / 4);
	pop()
	backToMenuButton.position((windowWidth / 2) - (backToMenuButton.width / 2), windowHeight / 2);
}

function deleteGameoverScreen() {
	backToMenuButton.remove()
}

function isCanvasFocused() {
	return document.activeElement.tagName === "BODY"
}

//handles user input
function doInput(player) {
	if (keyIsDown(13)) {
		sendChat()
	}

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

	if (keyIsDown(code('e')) || keyIsDown(code('E')) || mouseIsPressed) {
		tryShoot()
	}

	if (isTesting() && (keyIsDown(code('b')) || keyIsDown(code('B')))) {
		becomeServerCamera()
	}

	if (keyIsDown(code('r')) || keyIsDown(code('R'))) {
		tryActivateAbility(player)
	}

	if (keyIsDown(code('q')) || keyIsDown(code('Q'))) {
		tryDash(player)
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
		rotate(-player.angle)
		tint(player.color.r, player.color.g, player.color.b)
		imageMode(CENTER)
		image(pship, 0, 0, player.size * 2, player.size * 2);
		pop()

		//draw name tag below player above health bar
		textAlign(CENTER);
		textSize(12);
		textFont(dog);
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

function showF(f) {
	push()
	translate(f.pos.x - camera.x, f.pos.y - camera.y)
	imageMode(CENTER)
	image(FImage, 0, 0, f.size * 2, f.size * 2)
	pop()
}

function showBomb(bomb) {
	push()
	translate(bomb.pos.x - camera.x, bomb.pos.y - camera.y)
	rectMode(CENTER)
	fill(255, 0, 0)
	rect(0, -bomb.size, 5, 10)
	fill(100, 100, 100)
	ellipseMode(CENTER)
	ellipse(0, 0, bomb.size * 2)
	
	pop()
}

function showProjecile(projectile) {
	if (isOnscreen(projectile)) {
		if (projectile.type === Projectile.LASER) {
			showLaser(projectile)
			return
		}
		if (projectile.type === Projectile.F) {
			showF(projectile)
			return
		}
		if (projectile.type === Projectile.BOMB) {
			showBomb(projectile)
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
			asteroidImage = asteroidFull
			name += "full"
		} else if (healthPercent > (1 / 3)) {
			asteroidImage = asteroidMedium
			name += "medium"
		} else {
			asteroidImage = asteroidLow
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
		var size = powerup.size * 2
		if (powerup.type === Powerup.FUEL) {
			size *= 1.3
		}
		image(imageFromPowerupType(powerup.type), 0, 0, size, size)
		pop()
	}
}

function showBoss(boss) {
	push()
	angleMode(DEGREES)
	translate(boss.pos.x - camera.x, boss.pos.y - camera.y)
	rotate(boss.angle)
	imageMode(CENTER)
	imageWithResize(towleImage, "towle", 0, 0, boss.size * 2, boss.size * 2)
	pop()
	
	/*var hitboxes = boss.getHitboxes()
	for (var i = 0; i < hitboxes.length; i++) {
		push()
		var h = hitboxes[i]
		fill(255, 0, 0)
		ellipseMode(CENTER)
		translate(h.pos.x - camera.x, h.pos.y - camera.y)
		ellipse(0, 0, h.size*2, h.size*2)
		pop()
	}*/
}

function showEnemy(enemy) {
	if (isOnscreen(enemy)) {
		if (enemy instanceof Boss) {
			showBoss(enemy)
			return
		}

		push()
		angleMode(DEGREES)
		translate(enemy.pos.x - camera.x, enemy.pos.y - camera.y)
		
		imageMode(CENTER)
		if (!enemy.color.equals(neutralColor)) {
			rotate(enemy.angle)
			tint(enemy.color.r, enemy.color.g, enemy.color.b)
			image(pship, 0, 0, enemy.size * 2, enemy.size * 2)
		} else {
			rotate(enemy.angle + 90)
			image(eship, 0, 0, enemy.size * 2, enemy.size * 2)
		}
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

	var shouldPlaySound = corpse.life === corpse.maxLife

	var explosionImage
	var name
	if (entity instanceof Enemy) {
		name = "enemyExplosion"
		explosionImage = explosionGif

		if (shouldPlaySound) {
			powerupSound.play()
		}
	} else if (entity instanceof PlayerAfterImage) {
		var color = entity.color
		tint(color.r, color.g, color.b, 128 * (corpse.life / 30))
		image(pship, 0, 0, entity.size*2, entity.size*2)
		pop()
		return
	} else {
		name = "rockExplosion"
		explosionImage = rockexplosionGif

		if (shouldPlaySound) {
			powerupSound.play()
		}
	}
	//hack to get GIF to still animate
	tint(255, 0)
	image(explosionImage, 0, 0, 0, 0)
	noTint()

	imageWithResize(explosionImage, name + explosionImage.getCurrentFrame(), 0, 0, entity.size*2, entity.size*2)
	pop()
}

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

function ui(player, state) {
	push()
	//top

	if (state.bossPhase) {
		let boss = state.enemies.find(e => e instanceof Boss)
		//background
		push()
		fill(0, 255, 255, 100);
		stroke(0, 255, 255);
		strokeWeight(5);
		beginShape();
		vertex((windowWidth / 2) - 440, -10);
		vertex((windowWidth / 2) + 440, -10);
		vertex((windowWidth / 2) + 420, 50);
		vertex((windowWidth / 2) - 420, 50);
		endShape(CLOSE);
		pop()

		if (boss !== undefined) {
			//boss health bar
			textSize(25);
			textFont(dog);
			fill(255);
			text("Dr.Towle HP:", (windowWidth / 2) - 305, 38);
			//max health bar (dark-grey)
			fill(40);
			rect((windowWidth / 2) - (100 * 3) + 110, 5, (100 * 6), 40);

			//current health bar (red)
			fill(255, 0, 0);
			rect((windowWidth / 2) - (100 * 3) + 110, 5, ((boss.health) / boss.maxHealth()) * (100 * 6), 40);
        }
    }

	//Bottom

	//background
	push();
	fill(0, 255, 255, 100);
	stroke(0, 255, 255);
	strokeWeight(5);
	beginShape();
	vertex((100 * 2) + 100, windowHeight + 10);
	vertex((100 * 4) + 300, windowHeight + 10);
	vertex((100 * 4) + 200, windowHeight - 100);
	vertex((100 * 2) + 85, windowHeight - 95);
	endShape(CLOSE);
	pop()
	
	//Ability info
	textSize(15);
	textFont(dog);
	fill(255);

	text(`Ability: ${player.abilityName()}`, (100 * 2) + 240, windowHeight - 75)

	//Ability bar
	text("Charge:", (100 * 2) + 138, windowHeight - 53)
	//max Ability bar (dark-grey)
	fill(40);
	rect((100 * 2) + 180, windowHeight - 67, 100 * 2, 20);

	//current Ability bar (yellow if in use, blue if charging)
	if (player.isAbilityActive()) {
		fill(255, 255, 0);
		rect((100 * 2) + 180, windowHeight - 67, 100 * 2 * (player.abilityDuration / player.maxDuration()), 20);
    }
	if (player.abilityDuration == 0) {
		/*
		if (player.abilityCooldown == 0) {
			fill(255, 255, 0);
		} else {
			fill(0, 0, 255);
        }*/
		fill(((player.maxCooldown() - player.abilityCooldown) / player.maxCooldown()) * 255, ((player.maxCooldown() - player.abilityCooldown) / player.maxCooldown()) * 255, (player.abilityCooldown / player.maxCooldown()) * 255);
		rect((100 * 2) + 180, windowHeight - 67, 100 * 2 * ((player.maxCooldown()-player.abilityCooldown) / player.maxCooldown()), 20);
	}
	//Bottom left

	//background
	push();
	fill(0, 255, 255, 100);
	stroke(0, 255, 255);
	strokeWeight(5);
	beginShape();
	vertex(-10, windowHeight + 10);
	vertex(-10, windowHeight - 110);
	vertex((100 * 2) + 80, windowHeight - 115);
	vertex((100 * 2) + 100, windowHeight + 10);
	endShape(CLOSE);
	pop()


	//Health Bar
		//"HP:" text
		textAlign(LEFT, TOP);
		textSize(15);
		textFont(dog);
		fill(255);
		text("HP:", 5, windowHeight - 97);

		//max health bar (dark-grey)
		fill(40);
		rect(70, windowHeight - 100, 100*2, 20);

		//current health bar (same as player color)
		fill(player.color.r, player.color.g, player.color.b);
		rect(70, windowHeight - 100, player.health*2, 20);

	//Dash indicator
		//"Dashes:" text
		textAlign(LEFT, TOP);
		textSize(15);
		textFont(dog);
		fill(255);
		text("Dash:", 5, windowHeight - 77);
		
		//max Dash bar (dark-grey)
		fill(40);
		rect(70, windowHeight - 80, 100 * 2, 20);

		//current Dash bar (Light-blue/cyan)
		fill(0, 255, 255);
		rect(70, windowHeight - 80, (100 * 2) * (player.fuel / playerMaxFuel), 20);

		//Dash seperator
		fill(40);
		rect(70 + ((100*2) / 3), windowHeight - 80, 1, 20);
		rect(70 + (2*((100*2) / 3)), windowHeight - 80, 1, 20);
	//Ammo indicator
		//"Ammo:" text
		textAlign(LEFT, TOP);
		textSize(15);
		textFont(dog);
		fill(255);
		text("Ammo:", 4, windowHeight - 57);

		//max Ammo bar (dark-grey)
		fill(40);
		rect(70, windowHeight - 60, 100 * 2, 20);

		//current Ammo bar (Player colored sticks)
		fill(player.color.r, player.color.g, player.color.b);
		rect(70, windowHeight - 60, ammo/maxAmmo * (100 * 2), 20);

		//Ammo seperator
		fill(40);
		for (var i = 1; i < 50; i++) {
			rect(70 + (i * ((100 * 2) / 50)), windowHeight - 60, 1, 20);
		}


	//Top right

	//background
	push();
	fill(0, 255, 255, 100);
	stroke(0, 255, 255);
	strokeWeight(5);
	beginShape();
	vertex(windowWidth + 10, -10);
	vertex(windowWidth + 10, 225);
	vertex(windowWidth - 300, 225);
	vertex(windowWidth - 300, -10);
	endShape(CLOSE);
	pop()

	//getting scores
	let scores = []
	for (var i = 0; i < state.players.length; i++) {
		let score = {
			name: state.players[i].name,
			color: state.players[i].color,
			score: state.players[i].score
		}
		scores.push(score)
	}
	scores.sort((a, b) => b.score - a.score);
	
	//Player scoreboard
	
	push()
	stroke(255);
	strokeWeight(2);
	textSize(16);
	textFont(dog);
	fill(255);
	text("Player", windowWidth - 265, 5)
	text("Score", windowWidth - 90, 5)
	let score_ammount = 10
	if (scores.length < 10){
		score_ammount = scores.length
	}
	for (var i = 0; i < score_ammount; i++) {
		var yplus = 25 + (i * 20)
		var color = scores[i].color
		fill(color.r, color.g, color.b)
		text(i+1, windowWidth - 295, yplus)
		text(scores[i].name, windowWidth - 265, yplus)
		text(scores[i].score, windowWidth - 90, yplus)
	}
	pop()
	
	/*
	let scores = [{ color: { r: 255, g: 0, b: 0 }, name: "David", score: 1000 },
		{ color: { r: 255, g: 200, b: 0 }, name: "Hi", score: 1800 },
		{ color: { r: 0, g: 0, b: 255 }, name: "Craig", score: 800 },
		{ color: { r: 0, g: 255, b: 0 }, name: "Pat", score: 700 },
		{ color: { r: 32, g: 200, b: 4 }, name: "Chrisdingle12", score: 5 },
		{ color: { r: 100, g: 104, b: 90 }, name: "Chris", score: 4 },
		{ color: { r: 250, g: 3, b: 255 }, name: "Chris", score: 3 },
		{ color: { r: 200, g: 30, b: 255 }, name: "Chris", score: 2 },
		{ color: { r: 70, g: 100, b: 43 }, name: "Chris", score: 1 },
		{ color: { r: 56, g: 123, b: 0 }, name: "Chris", score: 0 }
	]
	push()
	stroke(255);
	strokeWeight(2);
	textSize(16);
	textFont(dog);
	fill(255);
	text("Player", windowWidth - 265, 5)
	text("Score", windowWidth - 90, 5)
	for (var i = 0; i < scores.length; i++) {
		var yplus = 25 + (i * 20)
		var color = scores[i].color
		fill(color.r, color.g, color.b)
		text(i+1, windowWidth - 295, yplus)
		text(scores[i].name, windowWidth - 265, yplus)
		text(scores[i].score, windowWidth - 90, yplus)
	}
	pop()
	*/
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
	push()
	stroke(255);
	strokeWeight(2);
	textSize(16);
	textFont(dog);
	fill(255);
	text("Chat", windowWidth - 77, windowHeight - 163);

	for (var i = 0; i < state.messages.length; i++) {
		var ysub = 140 - (i * 20)
		var color = state.messages[i].color
		fill(color.r, color.g, color.b)
		text(state.messages[i].message, windowWidth - 340, windowHeight - ysub)
	}
	pop()	
	
	/*
	fill(255, 0, 0)
	text("Craig: I code fast", windowWidth - 340, windowHeight - 140)
	fill(255, 140, 0)
	text("Chris: Hi", windowWidth - 340, windowHeight - 120)
	fill(0, 0, 255)
	text("David: Im cool", windowWidth - 340, windowHeight - 100)
	fill(0, 255, 0)
	text("Pat: sounds", windowWidth - 340, windowHeight - 80)
	*/
	
	//Chat input
	if(ToggleChat == true){
		chatInput.position(windowWidth - (chatInput.width + chatButton.width + 14), windowHeight - 38)
		chatButton.position(windowWidth - (chatButton.width + 14), windowHeight - 39)
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
	push()
	stroke(255);
	strokeWeight(2);
	pieChart(100, state.players, 55, 55);
	pop()
	

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
	if (gameState === STATE_MENU) {
		menuDraw()
		return
	}
	if (gameState === STATE_RUNNING) {
		gameDraw()
		return
	}
	drawGameoverScreen()
}

var lastAmmoRefil = 0;
const refilDelayMillis = 500
var lastShootTime = 0;
const shootDelayMillis = 200

function tryShoot() {
	if (millis() - lastShootTime > shootDelayMillis && ammo > 0) {
		ammo -= 1
		socket.emit("shoot", {})
		lastShootTime = millis()
		
		//60% chance normal, 20% high, 20% low
		var r = Math.random()
		if (r < 0.20) {
			blasterSoundLow.play();
		} else if (r < 0.40) {
			blasterSoundHigh.play();
		} else {
			blasterSound.play();
		}
	}
}

function tryActivateAbility(player) {
	if (player.canActivateAbility()) {
		socket.emit("activateAbility", {})
	}
}

var lastDashMillis = 0
const dashCooldownMillis = 1000
function tryDash(player) {
	if (player.canDash() && (millis() - lastDashMillis) > dashCooldownMillis) {
		console.log("sending dash")
		socket.emit('dash', {})
		lastDashMillis = millis()
		boostSound.play()
	}
}

function sendChat() {
	var message = chatInput.value()
	var player = state.playerById(socket.id)
	if (player === null) {
		return
	}
	if (message === "") {
		return
	}

	chatInput.value("")
	socket.emit("chat", {
		message: player.name + ": " + message
	})
}



//this is necessary because p5.js needs to see these functions in the global scope, which doesn't happen with a module
window.draw = draw
window.preload = preload
window.setup = setup
window.windowResized = windowResized
window.becomeServerCamera = becomeServerCamera
window.enableMenuButton = enableMenuButton
window.disableMenuButton = disableMenuButton