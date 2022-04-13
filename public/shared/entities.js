/*
@file entities.js
@author Craig
@date 4/1/2022
@brief defines behvaior for entity objects
*/

//TODO Implement Name Change

import {SimpleVector, Color, Assert, mapHeight, mapWidth, neutralColor, isTesting} from "./utilities.js"
import {Entity} from "./entity.js"
import {playerBulletVel, playerBaseBulletSize} from "./player.js"

const bulletLifetimeTicks = 150
export class Projectile extends Entity {
	constructor(pos, vel, size, color, damage) {
		super(pos, size, color)
		this.vel = vel
		this.damage = damage
		this.life = bulletLifetimeTicks
		Projectile.assertValid(this)
	}

	static assertValid(projectile) {
		Entity.assertValid(projectile)
		Assert.instanceOf(projectile, Projectile)
		Assert.number(projectile.damage)
		Assert.number(projectile.life)
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			vel: this.vel.serialize(),
			size: this.size,
			color: this.color.serialize(),
			life: this.life,
			damage: this.damage
		}
	}

	static deserialize(data) {
		var projectile = new Projectile (
			SimpleVector.deserialize(data.pos),
			SimpleVector.deserialize(data.vel),
			data.size,
			Color.deserialize(data.color),
			data.damage
		)
		projectile.damage = data.damage
		projectile.life = data.life
		return projectile
	}

	isDead() {
		if (this.life == 0 ||
			this.pos.x == this.size || 
			this.pos.x == mapWidth - this.size || 
			this.pos.y == this.size || 
			this.pos.y == mapHeight - this.size){
				return true;
			} else {
				return false;
			}
	}

	kill() {
		this.life = 0
	}

	tick() {
		this.move()
		this.life--
	}

	move() {
		super.move()
	}
}

const minAsteroidSize = 50
const maxAsteroidSize = 150
const minAsteroidSpeed = 2
const maxAsteroidSpeed = 5
export const asteroidImpactDamagePerTick = 1

export class Asteroid extends Entity {
	constructor (pos, vel, size) {
		super(pos, size)
		this.vel = vel
		this.health = this.maxhealth()
		this.angle = Math.floor(Math.random() * 360)
		Asteroid.assertValid(this)
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			size: this.size,
			vel: this.vel.serialize(),
			health: this.health
		}
	}

	static deserialize(data) {
		var asteroid = new Asteroid(SimpleVector.deserialize(data.pos), SimpleVector.deserialize(data.vel), data.size)
		asteroid.health = data.health
		Asteroid.assertValid(asteroid)
		return asteroid
	}

	static assertValid(asteroid) {
		Entity.assertValid(asteroid)
		Assert.instanceOf(asteroid, Asteroid)
		Assert.number(asteroid.health)
	}

	move() {
		var oldvelx = this.vel.x
		var oldvely = this.vel.y

		super.move()
		//if we collide with a wall, reverse direction
		if (this.pos.x === this.size || this.pos.x === mapWidth - this.size) {
			this.vel.x = -oldvelx
		}
		if (this.pos.y === this.size || this.pos.y === mapHeight - this.size) {
			this.vel.y = -oldvely
		}
		if (this.vel.magnitude() > maxAsteroidSpeed) {
			this.vel.scale(0.99)
		}
	}

	tick() {
		this.move()
	}

	static addRandomAsteroid(state) {
		var size = state.randint(minAsteroidSize, maxAsteroidSize)
		var speed = state.randint(minAsteroidSpeed, maxAsteroidSpeed)
		var angle = state.randint(0, 360)
		var radians = angle * Math.PI / 180
		var pos = new SimpleVector(
			state.randint(size, mapWidth - size),
			state.randint(size, mapHeight - size)
		)
		var vel = new SimpleVector(
			Math.cos(radians) * speed,
			Math.sin(radians) * speed
		)
		state.asteroids.push(new Asteroid(pos, vel, size))
	}

	damage(amount) {
		this.health -= amount
		if (this.health <= 0) {
			this.health = 0
		}
	}

	isDead() {
		return (this.health <= 0)
	}

	maxhealth() {
		return this.size
	}
}

const powerupSize = 12

export class Powerup extends Entity {
	static SPEED = 0
	static HEAL = 1
	static ATTACK = 2
	//ADD 1 TO THIS IF YOU ADD A NEW POWERUP TYPE:
	static MAX_TYPE = 2

	constructor(pos, size, type) {
		super(pos, size)
		this.type = type
		this.dead = false

		Powerup.assertValid(this)
	}

	//double checks the properties of powerup (check if they are valid)
	static assertValid(powerup) {
		Entity.assertValid(powerup)
		Assert.instanceOf(powerup, Powerup)
		Assert.number(powerup.type)
		Assert.boolean(powerup.dead)
		Assert.true(powerup.type >= 0 && powerup.type <= Powerup.MAX_TYPE)
	}

	//turns the powerup into a data packet
	serialize() {
		return {
			pos: this.pos.serialize(),
			type: this.type
		}
	}

	//turn the data packet into a powerup
	static deserialize(data) {
		var powerup = new Powerup(SimpleVector.deserialize(data.pos), powerupSize, data.type)
		Powerup.assertValid(powerup)
		return powerup
	}

	tick() {}

	static addRandomPowerup(state) {
		var type = state.randint(0, Powerup.MAX_TYPE)
		var pos = new SimpleVector(
			state.randint(powerupSize, mapWidth - powerupSize),
			state.randint(powerupSize, mapHeight - powerupSize)
		)
		state.powerups.push(new Powerup(pos, powerupSize, type))
	}

	isDead() {
		return (this.dead)
	}

	kill() {
		this.dead = true
	}

	getActiveEffect() {
		var hasActiveEffect = this.type === Powerup.SPEED || this.type === Powerup.ATTACK
		if (!hasActiveEffect) {
			return null
		}
		return new ActiveEffect(this.type)
	}

	apply(player) {
		switch (this.type) {
			case Powerup.SPEED:
				player.speed *= 4
				player.acc.x *= 4
				player.acc.y *= 4
				break
			case Powerup.ATTACK:
				player.attack *= 2
				break
			case Powerup.HEAL:
				player.heal(playerMaxHealth / 2)
				break
		}
		var effect = this.getActiveEffect()
		if (effect !== null) {
			player.effects.push(effect)	
		}
	}
}

//this can be changed to be different for each powerup later
const powerupEffectDurationTicks = 150

//a lasting powerup effect
export class ActiveEffect {
	constructor(type) {
		this.type = type
		this.life = powerupEffectDurationTicks
	}

	serialize() {
		return {
			type: this.type,
			life: this.life
		}
	}

	static deserialize(data) {
		var effect = new ActiveEffect(data.type)
		effect.life = data.life
		return effect
	}

	static assertValid(effect) {
		Assert.instanceOf(effect, ActiveEffect)
		Assert.number(effect.type)
		Assert.number(effect.life)
	}

	tick() {
		this.life--
	}

	isDead() {
		return this.life <= 0
	}

	expire(player) {
		switch (this.type) {
			case Powerup.SPEED:
				player.speed /= 4
				break
			case Powerup.ATTACK:
				player.attack /= 2
				break
		}
	}
}

const enemyProjectileDamage = 10
export const enemyMaxHealth = 50
const enemySize = 20
const enemySpeed = 5
const enemyBaseAcceleration = 0.01
const enemyShootChancePerTick = 0.02
const enemySightRange = 500
export class Enemy extends Entity {
	constructor (pos, color=neutralColor) {
		super(pos, enemySize, color)
		this.health = enemyMaxHealth
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			angle: this.angle,
			vel: this.vel,
			health: this.health,
			angle: this.angle,
			color: this.color.serialize()
		}
	}

	static deserialize(data) {
		var enemy = new Enemy(SimpleVector.deserialize(data.pos), Color.deserialize(data.color))
		enemy.angle = data.angle
		enemy.vel = SimpleVector.deserialize(data.vel)
		enemy.health = data.health
		enemy.angle = data.angle
		Enemy.assertValid(enemy)
		return enemy
	}

	static assertValid(enemy) {
		Entity.assertValid(enemy)
		Assert.number(enemy.health)
		Assert.true(enemy.health >= 0 && enemy.health <= enemyMaxHealth)
	}

	move() {
		super.move()

		this.vel.limitMagnitude(enemySpeed)
		this.vel.x *= 0.99
		this.vel.y *= 0.99
	}

	damage(amount) {
		this.health -= amount
		if (this.health <= 0) {
			this.health = 0
		}
	}

	isDead() {
		return this.health <= 0
	}

	maybeShoot(state) {
		if (state.random() < enemyShootChancePerTick) {
			//pos vel size color damage
			const enemyBulletVel = playerBulletVel / 1.5
			const enemyBulletSize = playerBaseBulletSize
			state.projectiles.push(
				new Projectile(
					new SimpleVector(this.pos.x, this.pos.y),
					new SimpleVector(
						enemyBulletVel * Math.cos(this.angle * Math.PI / 180),
						enemyBulletVel * Math.sin(this.angle * Math.PI / 180)
					),
					enemyBulletSize,
					this.color,
					enemyProjectileDamage
				)
			)
		}
	}

	static addRandomEnemy(state) {
		var pos = new SimpleVector(
			state.randint(enemySize, mapWidth - enemySize),
			state.randint(enemySize, mapHeight - enemySize)
		)
		state.enemies.push(new Enemy(pos))
	}

	tick(state) {
		var closestPlayer = null
		var closestPlayerDist = Infinity
		for (var i = 0; i < state.players.length; i++) {
			var player = state.players[i]
			if (player.color.equals(this.color)) {
				continue
			}

			var dist = this.pos.dist(player.pos)
			if (dist < closestPlayerDist) {
				closestPlayer = player
				closestPlayerDist = dist
			}
		}

		//if there is at least one player, and that player is in the sight range if we are is testing mode
		if (closestPlayer !== null && (isTesting() || closestPlayerDist < enemySightRange)) {
			var dx = closestPlayer.pos.x - this.pos.x
			var dy = closestPlayer.pos.y - this.pos.y
			var radians = Math.atan2(dy, dx) 
			var angle = radians * 180 / Math.PI
			if (angle < 0) {
				angle += 360
			}
			this.angle = angle

			var newAcc = new SimpleVector(
				Math.cos(radians) * enemySpeed * enemyBaseAcceleration,
				Math.sin(radians) * enemySpeed * enemyBaseAcceleration
			)
			this.acc = newAcc
		} else {
			this.acc = new SimpleVector(0, 0)
		}

		this.move()
		this.maybeShoot(state)
	}
}
