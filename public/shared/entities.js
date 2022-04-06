/*
@file entities.js
@author Craig
@date 4/1/2022
@brief defines behvaior for entity objects
*/

//TODO Implement Name Change

import {SimpleVector, Color, Assert, mapHeight, mapWidth, neutralColor} from "./utilities.js"

export class Entity {
	constructor(pos, size, color=neutralColor) {
		this.pos = pos
		this.size = size
		this.vel = new SimpleVector(0, 0)
		this.acc = new SimpleVector(0, 0)
		this.color = color
		this.angle = 0
		Entity.assertValid(this)
	}

	//throws error if entity object data members aren't correct
	static assertValid(entity) {
		Assert.instanceOf(entity, Entity)
		Assert.instanceOf(entity.pos, SimpleVector)
		Assert.instanceOf(entity.vel, SimpleVector)
		Assert.instanceOf(entity.acc, SimpleVector)
		Assert.number(entity.size)
		Assert.true(entity.size > 0)
		Color.assertValid(entity.color)
		Assert.number(entity.angle)
		Assert.true(entity.angle >= 0 && entity.angle < 360)
		Assert.true(entity.pos.x <= mapWidth && entity.pos.x >= 0 && entity.pos.y <= mapHeight && entity.pos.y >= 0)
	}

	move() {
		this.vel.x += this.acc.x
		this.vel.y += this.acc.y
		this.pos.x += this.vel.x
		this.pos.y += this.vel.y

		this.pos.x = Math.max(this.pos.x, this.size)
		this.pos.y = Math.max(this.pos.y, this.size)
		this.pos.x = Math.min((mapWidth-this.size), this.pos.x)
		this.pos.y = Math.min((mapHeight-this.size), this.pos.y)
	}

	isColliding(other) {
		var maxDist = other.size + this.size
		var dist = this.pos.dist(other.pos)
		return (dist < maxDist)
	}

	push(other, strength) {
		if (!this.isColliding(other)) {
			return
		}

		var dist = this.pos.dist(other.pos)
		var pushVector = new SimpleVector(other.pos.x - this.pos.x, other.pos.y - this.pos.y)
		
		//strength scales linearly based on how close you are
		var scaledStrength = strength * ((this.size + other.size - dist) / dist)
		var scaledPushVector = new SimpleVector(
			pushVector.x / pushVector.magnitude() * scaledStrength,
			pushVector.y / pushVector.magnitude() * scaledStrength
		)
		other.vel.x += scaledPushVector.x
		other.vel.y += scaledPushVector.y
	}
}

const playerSize = 20
const playerBulletVel = 10
const playerBaseBulletSize = 10
const playerBaseProjectileDamage = 10
const playerBaseSpeed = 10
//multiply this by speed to get acceleration:
export const playerBaseAcceleration = 0.01
export const playerMaxHealth = 100
export class Player extends Entity {
	constructor(id, pos, color) {
		super(pos, playerSize, color);
		this.id = id
		this.health = playerMaxHealth
		this.attack = playerBaseProjectileDamage
		this.speed = playerBaseSpeed
		this.effects = []
		this.name = ""
		Player.assertValid(this);
	}

	serialize() {
		var serializedEffects = []
		for (var i = 0; i < this.effects.length; i++) {
			serializedEffects.push(this.effects[i].serialize())
		}
		return {
			pos: this.pos.serialize(),
			vel: this.vel.serialize(),
			acc: this.acc.serialize(),
			id: this.id,
			color: this.color.serialize(),
			health: this.health,
			angle: this.angle,
			speed: this.speed,
			effects: serializedEffects
		}
	}

	static deserialize(data) {
		var player = new Player(data.id, SimpleVector.deserialize(data.pos), Color.deserialize(data.color))
		player.acc = SimpleVector.deserialize(data.acc)
		player.vel = SimpleVector.deserialize(data.vel)
		player.size = playerSize
		player.health = data.health
		player.angle = data.angle
		player.speed = data.speed
		player.effects = []
		for (var i = 0; i < data.effects.length; i++) {
			player.effects.push(ActiveEffect.deserialize(data.effects[i]))
		}
		Player.assertValid(player)
		return player
	}

	static assertValid(player) {
		Entity.assertValid(player)
		Assert.instanceOf(player, Player)
		Assert.string(player.id)
		Assert.number(player.health)
		Assert.number(player.speed)
		Assert.true(player.health >= 0 && player.health <= playerMaxHealth)
		for (var i = 0; i < player.effects.length; i++) {
			ActiveEffect.assertValid(player.effects[i])
		}
	}

	move() {
		this.vel.limitMagnitude(this.speed)
		this.vel.x = this.vel.x * 0.99
		this.vel.y = this.vel.y * 0.99
		super.move()
	}

	isDead() {
		return this.health <= 0
	}

	damage(amount, color) {
		this.health -= amount
		if (this.isDead()) {
			this.kill(color)
		}
	}
	
	kill(color) {
		this.color = color
		this.health = playerMaxHealth
	}

	heal(amount) {
		this.health += amount
		if (this.health > playerMaxHealth) {
			this.health = playerMaxHealth
		}
	}

	shoot(state) {
		var radians = this.angle * Math.PI / 180
		state.projectiles.push(new Projectile(
			new SimpleVector(this.pos.x, this.pos.y),
			new SimpleVector(Math.cos(radians) * playerBulletVel, -Math.sin(radians) * playerBulletVel),
			playerBaseBulletSize,
			this.color,
			this.attack
		))
	}

	tick() {
		this.move()
		for (var i = 0; i < this.effects.length; i++) {
			this.effects[i].tick()
			if (this.effects[i].isDead()) {
				this.effects[i].expire(this)
				this.effects.splice(i, 1)
				i--
			}
		}
	}
}

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
		this.health = size
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
		super.move()
		//if we collide with a wall, reverse direction
		if (this.pos.x === this.size || this.pos.x === mapWidth - this.size) {
			this.vel.x = -this.vel.x
		}
		if (this.pos.y === this.size || this.pos.y === mapHeight - this.size) {
			this.vel.y = -this.vel.y
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
class ActiveEffect {
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
const enemyMaxHealth = 50
const enemySize = 20
const enemySpeed = 5
const enemyBaseAcceleration = 0.01
const enemyShootChancePerTick = 0.02
const enemyBulletVel = playerBulletVel / 1.5
const enemyBulletSize = playerBaseBulletSize
export class Enemy extends Entity {
	constructor (pos) {
		super(pos, enemySize, neutralColor)
		this.health = enemyMaxHealth
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			angle: this.angle,
			vel: this.vel,
			health: this.health,
			angle: this.angle
		}
	}

	static deserialize(data) {
		var enemy = new Enemy(SimpleVector.deserialize(data.pos))
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
			state.projectiles.push(
				new Projectile(
					new SimpleVector(this.pos.x, this.pos.y),
					new SimpleVector(
						enemyBulletVel * Math.cos(this.angle * Math.PI / 180),
						enemyBulletVel * Math.sin(this.angle * Math.PI / 180)
					),
					enemyBulletSize,
					neutralColor,
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
			var dist = this.pos.dist(player.pos)
			if (dist < closestPlayerDist) {
				closestPlayer = player
				closestPlayerDist = dist
			}
		}

		if (closestPlayer !== null) {
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
