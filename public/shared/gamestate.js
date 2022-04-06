/*
@file gamestate.js
@author Craig
@date 4/1/2022
@brief Holds everything that client/server agrees on (arrays)
*/

//!DON'T USE MATH.RANDOM! USE OUR FUNCTIONS!
//reference for mulberry32: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript

import {Assert, neutralColor, SimpleVector} from "./utilities.js"
import {Player, Projectile, playerMaxHealth, Asteroid, Powerup, asteroidImpactDamagePerTick, Enemy} from "./entities.js"

//random num generator
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return (t ^ t >>> 14) >>> 0;
    }
}

//holds everything in the game
export class GameState {
	constructor() {
		this.players = []
		this.projectiles = []
		this.asteroids = []
		this.powerups = []
		this.enemies = []
		this.rng = mulberry32(0)
		GameState.assertValid(this);
	}

	//returns player object having the id, or null if not found
	playerById(id) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].id == id) {
				return this.players[i]
			}
		}
		return null
	}

	killPlayer(player, damageColor) {
		player.color = damageColor
		player.health = playerMaxHealth
	}

	//calls collision function if two enemies collide
	doCollision() {
		function collisionHelper(array1, array2, onCollision, checkColor=true) {
			for (var i = 0; i < array1.length; i++) {
				for (var j = 0; j < array2.length; j++) {
					if (array1[i] === array2[j]) {
						continue
					}
					if (array1[i].isColliding(array2[j]) && (!checkColor || !array1[i].color.equals(array2[j].color))) {
						onCollision(array1[i], array2[j])
					}
				}
			}
		}
		var state = this;
		//players and projectiles:
		//damage the player by projectile.damage, kill the projectile
		collisionHelper(this.players, this.projectiles, function(player, projectile) {
			player.damage(projectile.damage, projectile.color, state)
			projectile.kill()
		})

		//asteroids and players:
		//damage the player by asteroidImpactDamagePerTick
		collisionHelper(this.players, this.asteroids, function(player, asteroid) {
			player.damage(asteroidImpactDamagePerTick, neutralColor, state)
		})

		//projectiles and asteroids:
		//kill the projectile, damage the asteroid by projectile.damage
		collisionHelper(this.projectiles, this.asteroids, function(projectile, asteroid) {
			projectile.kill()
			asteroid.damage(projectile.damage)
		})

		//players and powerups:
		//apply the powerup to the player, kill the powerup
		collisionHelper(this.players, this.powerups, function(player, powerup) {
			powerup.apply(player)
			powerup.kill()
		})

		//projectiles and enemies:
		//kill the projectile, damage the enemy by projectile.damage
		collisionHelper(this.projectiles, this.enemies, function(projectile, enemy) {
			projectile.kill()
			enemy.damage(projectile.damage)
		})

		//enemies and enemies:
		//push back both enemies
		collisionHelper(this.enemies, this.enemies, function(enemy1, enemy2) {
			enemy1.push(enemy2, 0.1)
			enemy2.push(enemy1, 0.1)
		}, false)
	}

	//goes through entity array and gets rid of dead objects
	cleanDeadEntities() {
		for (var i = 0; i < this.projectiles.length; i++) {
			if (this.projectiles[i].isDead()) {
				this.projectiles.splice(i, 1)
				i--
			}
		}
		for (var i = 0; i < this.asteroids.length; i++) {
			if (this.asteroids[i].isDead()) {
				this.asteroids.splice(i, 1)
				i--
			}
		}
		for (var i = 0; i < this.powerups.length; i++) {
			if (this.powerups[i].isDead()) {
				this.powerups.splice(i, 1)
				i--
			}
		}
		for (var i = 0; i < this.enemies.length; i++) {
			if (this.enemies[i].isDead()) {
				this.enemies.splice(i, 1)
				i--
			}
		}
	}

	doNewAsteroids() {
		const newAsteroidChancePerTick = 0.1
		const asteroidLimit = 10

		if (this.asteroids.length < asteroidLimit && this.random() < newAsteroidChancePerTick) {
			Asteroid.addRandomAsteroid(this);
		}
	}

	doNewPowerups() {
		const newPowerupChancePerTick = 0.1
		const powerupLimit = 10

		if (this.powerups.length < powerupLimit && this.random() < newPowerupChancePerTick) {
			Powerup.addRandomPowerup(this);
		}
	}

	doNewEnemies() {
		const newEnemyChancePerTick = 0.1
		const enemyLimit = 0

		if (this.enemies.length < enemyLimit && this.random() < newEnemyChancePerTick) {
			Enemy.addRandomEnemy(this);
		}
	}

	moveEntities() {
		for (var i = 0; i < this.players.length; i++) {
			this.players[i].tick()
		}
		for (var i = 0; i < this.projectiles.length; i++) {
			this.projectiles[i].tick()
		}
		for (var i = 0; i < this.asteroids.length; i++) {
			this.asteroids[i].tick()
		}
		for (var i = 0; i < this.enemies.length; i++) {
			this.enemies[i].tick(this)
		}
	}

	//events is a list of GameEvent
	//applies each game event to this state
	advance(events) {
		for (var i = 0; i < events.length; i++) {
			events[i].apply(this)
		}

		this.doNewAsteroids()
		this.doNewPowerups()
		this.moveEntities()
		this.doNewEnemies()
		this.doCollision()
		this.cleanDeadEntities()
	}

	serialize() {
		var data = {
			players: [],
			projectiles: [],
			asteroids: [],
			powerups: [],
			enemies: []
		};
		function serializeHelper(dataArray, stateArray) {
			for (var i = 0; i < stateArray.length; i++) {
				dataArray.push(stateArray[i].serialize());
			}
		}
		serializeHelper(data.players, this.players)
		serializeHelper(data.projectiles, this.projectiles)
		serializeHelper(data.asteroids, this.asteroids)
		serializeHelper(data.powerups, this.powerups)
		serializeHelper(data.enemies, this.enemies)
		return data;
	}

	static deserialize(data) {
		var state = new GameState();
		function deserializeHelper(dataArray, stateArray, clazz) {
			for (var i = 0; i < dataArray.length; i++) {
				stateArray.push(clazz.deserialize(dataArray[i]));
			}
		}
		deserializeHelper(data.players, state.players, Player)
		deserializeHelper(data.projectiles, state.projectiles, Projectile)
		deserializeHelper(data.asteroids, state.asteroids, Asteroid)
		deserializeHelper(data.powerups, state.powerups, Powerup)
		deserializeHelper(data.enemies, state.enemies, Enemy)

		GameState.assertValid(state);
		return state;
	}

	static assertValid(state) {
		Assert.instanceOf(state, GameState);
		function assertHelper(array, clazz) {
			Assert.definedAndNotNull(array)
			for (var i = 0; i < array.length; i++) {
				clazz.assertValid(array[i]);
			}
		}
		assertHelper(state.players, Player)
		assertHelper(state.projectiles, Projectile)
		assertHelper(state.asteroids, Asteroid)
		assertHelper(state.powerups, Powerup)
		assertHelper(state.enemies, Enemy)

		Assert.function(state.rng)
	}

	//returns a random number between min and max
	randint(min, max) {
		Assert.true(min <= max);
		var range = max - min + 1;
		var r = this.rng() % range;
		return r + min;
	}

	random() {
		return this.rng() / 4294967296
	}
	
	//seed the rng with a number
	seed(seed) {
		this.rng = mulberry32(seed);
	}
}