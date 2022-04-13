import {state, bg, socket, pship, asteroid_full, eship, gameStarted} from "./sketch.js"
import {mapWidth, mapHeight, neutralColor} from "./shared/utilities.js"

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
	image(asteroidImage, 0, 0, asteroid.size * 2 * serverCamScalex, asteroid.size * 2 * serverCamScaley)
	pop()
}

export function serverCameraDraw() {
	background(51)
	image(bg, 0, 0, width, height)

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

export var isServerCamera = false
export function becomeServerCamera() {
	if (!gameStarted) {
		return
	}
	isServerCamera = true
	socket.emit("becomeServerCamera", {})
}
