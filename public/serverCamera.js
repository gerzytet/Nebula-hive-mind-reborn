import {state, bg, socket, pship, asteroidFull, eship, asteroidMedium, asteroidLow, gameState, STATE_RUNNING, towleImage} from "./sketch.js"
import {mapWidth, mapHeight, neutralColor} from "./shared/utilities.js"
import { Boss } from "./shared/entities.js"

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

function serverCameraShowBoss(boss, serverCamScalex, serverCamScaley) {
	push()
	translate(boss.pos.x / mapWidth * width, boss.pos.y / mapHeight * height)
	angleMode(DEGREES)
	rotate(-boss.angle + 90)
	imageMode(CENTER);
	image(towleImage, 0, 0, boss.size * 2 * serverCamScalex, boss.size * 2 * serverCamScaley)
	pop()
}

function serverCameraShowEnemy(enemy, serverCamScalex, serverCamScaley) {
	if (enemy instanceof Boss) {
		serverCameraShowBoss(enemy, serverCamScalex, serverCamScaley)
		return
	}
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
		asteroidImage = asteroidFull
	} else if (healthPercent > (1 / 3)) {
		asteroidImage = asteroidMedium
	} else {
		asteroidImage = asteroidLow
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
	if (gameState !== STATE_RUNNING) {
		return
	}
	isServerCamera = true
	socket.emit("becomeServerCamera", {})
}
