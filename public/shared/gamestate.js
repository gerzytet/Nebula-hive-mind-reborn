/*
@file gamestate.js
@author Craig
@date 4/1/2022
@brief Holds everything that client/server agrees on (arrays)
*/

//!DON'T USE MATH.RANDOM! USE OUR FUNCTIONS!
//reference for mulberry32: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript

import {Assert, neutralColor, connectionRadius, Color, mapWidth, mapHeight, SimpleVector} from "./utilities.js"
import {Projectile, Asteroid, Powerup, asteroidImpactDamagePerTick, Enemy, playerMaxHealth, Player, Corpse, Boss, Hitbox} from "./entities.js"

//number of ticks it should take on average to fill the whole map with powerups, asteriods, enemies, if there is nothing there already
const serverFillTicks = 30 * 30

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
	reset() {
		this.players = []
		this.projectiles = []
		this.asteroids = []
		this.powerups = []
		this.enemies = []
		this.corpses = []
		this.messages = []
		this.rng = mulberry32(0)
		this.bossPhase = false
	}

	constructor() {
		this.reset()
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

	//calls collision function if two enemies collide
	doCollision() {
		function collisionHelper(array1, array2, onCollision, checkColor=true) {
			for (var i = 0; i < array1.length; i++) {
				for (var j = 0; j < array2.length; j++) {
					if (array1[i] === array2[j] || (checkColor && array1[i].color.equals(array2[j].color))) {
						continue
					}
					var hitboxes1 = array1[i].getHitboxes()
					var hitboxes2 = array2[j].getHitboxes()

					for (var k = 0; k < hitboxes1.length; k++) {
						for (var l = 0; l < hitboxes2.length; l++) {
							if (hitboxes1[k].isColliding(hitboxes2[l])) {
								onCollision(hitboxes1[k], hitboxes2[l])
							}
						}
					}
				}
			}
		}
		var state = this;

		//players and projectiles:
		//damage the player by projectile.damage, kill the projectile
		collisionHelper(this.players, this.projectiles, function(player, projectile) {
			player.damage(projectile.damage, projectile.color, state)
			projectile.pushIfNotLaser(player, 3)
			projectile.killIfNotLaser(state)
		})

		//asteroids and players:
		//damage the player by asteroidImpactDamagePerTick, push each other away
		collisionHelper(this.players, this.asteroids, function(player, asteroid) {
			player.damage(asteroidImpactDamagePerTick, neutralColor, state)
			player.push(asteroid, 0.5)
			asteroid.push(player, 2)
		})

		//projectiles and asteroids:
		//kill the projectile, damage the asteroid by projectile.damage
		collisionHelper(this.projectiles, this.asteroids, function(projectile, asteroid) {
			asteroid.damage(projectile.damage, state)
			projectile.pushIfNotLaser(asteroid, 2.5)
			projectile.killIfNotLaser(state)
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
			if (enemy instanceof Hitbox) {
				enemy = enemy.entity
			} else {
				projectile.pushIfNotLaser(enemy, 2)
			}
			let pointed_player = state.playerById(projectile.id)
			if (pointed_player !== null) {
				pointed_player.score += 1
			}
			projectile.killIfNotLaser()
			enemy.damage(projectile.damage)
		})

		//enemies and enemies:
		//push back both enemies
		collisionHelper(this.enemies, this.enemies, function(enemy1, enemy2) {
			if (enemy2 instanceof Hitbox) {
				enemy2 = enemy2.entity
				enemy2.push(enemy1, 0.1)
			} else if (enemy1 instanceof Hitbox) {
				enemy1 = enemy1.entity
				enemy1.push(enemy2, 0.1)
			} else {
				enemy1.push(enemy2, 0.1)
				enemy2.push(enemy1, 0.1)
			}
		}, false)

		//asteroids and asteroids:
		//push back both asteroids
		collisionHelper(this.asteroids, this.asteroids, function(asteroid1, asteroid2) {
			asteroid1.push(asteroid2, 6)
			asteroid2.push(asteroid1, 6)
		}, false)

		//projectiles and projectiles:
		//destroy both projectiles
		collisionHelper(this.projectiles, this.projectiles, function(projectile1, projectile2) {
			projectile1.killIfNotLaser(state)
			projectile2.killIfNotLaser(state)
		})

		//enemies and projectiles
		//push both
		collisionHelper(this.enemies, this.asteroids, function(enemy, asteroid) {
			if (enemy instanceof Hitbox) {
				enemy = enemy.entity
			} else {
				asteroid.push(enemy, 1)
			}
			enemy.push(asteroid, 0.25)
		}, false)
	}

	//goes through entity array and gets rid of dead objects
	cleanDeadEntities() {
		var state = this
		function cleanHelper(array) {
			for (var i = 0; i < array.length; i++) {
				if (array[i].isDead()) {
					if (array[i].hasCorpse()) {
						state.corpses.push(array[i].getCorpse())
					}
					array.splice(i, 1)
					i--
				}
			}
		}

		cleanHelper(this.projectiles)
		cleanHelper(this.enemies)
		cleanHelper(this.powerups)
		cleanHelper(this.asteroids)
		cleanHelper(this.corpses)

		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].isPermanentlyDead(this)) {
				this.players.splice(i, 1)
				i--
			}
		}
	}

	doNewAsteroids() {
		const asteroidLimit = 10
		const newAsteroidChancePerTick = asteroidLimit / serverFillTicks

		if (this.asteroids.length < asteroidLimit && this.random() < newAsteroidChancePerTick) {
			Asteroid.addRandomAsteroid(this);
		}
	}

	doNewPowerups() {
		const powerupLimit = 10 + 2 * this.players.length
		const newPowerupChancePerTick = powerupLimit / serverFillTicks

		if (this.powerups.length < powerupLimit && this.random() < newPowerupChancePerTick) {
			Powerup.addRandomPowerup(this);
		}
	}

	doNewEnemies() {
		const enemyLimit = 5
		const newEnemyChancePerTick = enemyLimit / serverFillTicks

		if (this.enemies.length < enemyLimit && this.random() < newEnemyChancePerTick) {
			Enemy.addRandomEnemy(this);
		}
	}

	tickEntities() {
		this.players.map(p => p.tick(this))
		this.projectiles.map(p => p.tick(this))
		this.asteroids.map(a => a.tick())
		this.enemies.map(e => e.tick(this))
		this.powerups.map(p => p.tick())
		this.corpses.map(c => c.tick())
	}

	applyPlayerConnections() {
		const connectionHealPerTick = 0.4
		for (var i = 0; i < this.players.length; i++) {
			this.players[i].connections = 0
			for (var j = 0; j < this.players.length; j++) {
				if (i <= j) {
					continue
				}
				if (!this.players[i].color.equals(this.players[j].color)) {
					continue
				}
	
				if (this.players[i].pos.dist(this.players[j].pos) < connectionRadius) {
					this.players[i].heal(connectionHealPerTick)
					this.players[j].heal(connectionHealPerTick)
					this.players[i].connections++
					this.players[j].connections++
				}
			}
		}
	}

	doBossChecks() {
		if (!this.bossPhase && this.players.length > 4) {
			var allSame = true
			var color = this.players[0]
			for (var i = 0; i < this.players.length; i++) {
				allSame = allSame && this.players[i].color.equals(color)
			}
			if (allSame) {
				this.transitionToBoss()
			}
		} else if (this.bossPhase) {
			if (!this.bossExists()) {
				this.bossPhase = false
				console.log("boss over")
				callbacks.onGameOver(true)
				this.reset()
			} else if (this.players.length === 0) {
				this.bossPhase = false
				console.log("boss over")
				callbacks.onGameOver(false)
				this.reset()
			}
		}
	}

	transitionToBoss() {
		this.bossPhase = true

		this.enemies.push(new Boss(
			new SimpleVector(
				mapWidth / 2,
			    mapHeight / 2
			)
		))
	}

	//events is a list of GameEvent
	//applies each game event to this state
	advance(events) {
		//this is run before the events are because it calculates the player's connections
		this.applyPlayerConnections()
		this.doBossChecks()
		for (var i = 0; i < events.length; i++) {
			events[i].apply(this)
		}

		this.doNewAsteroids()
		this.doNewPowerups()
		this.tickEntities()
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
			enemies: [],
			messages: [],
			bossPhase: this.bossPhase
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
		serializeHelper(data.messages, this.messages)
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
		deserializeHelper(data.messages, state.messages, Message)
		state.bossPhase = data.bossPhase
		for (var i = 0; i < data.enemies.length; i++) {
			var d = data.enemies[i]
			if (d.isBoss) {
				state.enemies.push(Boss.deserialize(d))
			} else {
				state.enemies.push(Enemy.deserialize(d))
			}
		}

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
		assertHelper(state.corpses, Corpse)
		assertHelper(state.messages, Message)

		Assert.boolean(state.bossPhase)
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

	addMessage(message) {
		const maxMessages = 4
		if (this.messages.length === maxMessages) {
			this.messages.splice(0, 1)
		}

		this.messages.push(message)
	}

	//true if boss or their death explosion is still around
	bossExists() {
		return this.enemies.find(e => e instanceof Boss) !== undefined
	}

	getClosestPlayer(pos) {
		var closestPlayer = null
		var closestPlayerDist = Infinity
		for (var i = 0; i < this.players.length; i++) {
			var player = this.players[i]

			var dist = pos.dist(player.pos)
			if (dist < closestPlayerDist) {
				closestPlayer = player
				closestPlayerDist = dist
			}
		}

		return closestPlayer
	}
}

//client-and-server specific stuff called by gamestate to communicate directly with client/server
export class Callbacks {
	//true if the players won
	onGameOver(win) {}
	//called whan a player dies during boss phase
	//client disconnects, sevrer send a playerLeave event
	onKillDuringBoss(player) {}
}
//the instance of callbacks
export var callbacks = undefined
export function setCallbacks(newCallbacks) {
	callbacks = newCallbacks
}

export class Message {
	constructor (message, color) {
		this.message = message
		this.color = color
	}

	serialize() {
		return {
			color: this.color.serialize(),
			message: this.message
		}
	}

	static deserialize(data) {
		return new Message(data.message, Color.deserialize(data.color))
	}

	static assertValid(message) {
		Assert.instanceOf(message, Message)
		Color.assertValid(message.color)
		Assert.string(message.message)
	}
}
