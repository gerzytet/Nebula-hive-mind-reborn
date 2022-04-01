import {SimpleVector, Color, Assert, mapHeight, mapWidth, neutralColor} from "./utilities.js"

const maxPlayerVelocity = 10
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
		return dist < maxDist
	}
}

const playerSize = 20
const playerBulletVel = 10
export const playerMaxHealth = 100
export class Player extends Entity {
	constructor(id, pos, color) {
		super(pos, playerSize, color);
		this.id = id
		this.health = playerMaxHealth
		Player.assertValid(this);
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			vel: this.vel.serialize(),
			acc: this.acc.serialize(),
			id: this.id,
			color: this.color.serialize(),
			health: this.health,
			angle: this.angle
		}
	}

	static deserialize(data) {
		var player = new Player(data.id, SimpleVector.deserialize(data.pos), Color.deserialize(data.color))
		player.acc = SimpleVector.deserialize(data.acc)
		player.vel = SimpleVector.deserialize(data.vel)
		player.size = playerSize
		player.health = data.health
		player.angle = data.angle
		Player.assertValid(player);
		return player
	}

	static assertValid(player) {
		Entity.assertValid(player)
		Assert.instanceOf(player, Player);
		Assert.string(player.id);
		Assert.number(player.health);
		Assert.true(player.health >= 0 && player.health <= playerMaxHealth);
	}

	move() {
		this.vel.limitMagnitude(maxPlayerVelocity)
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
			10,
			this.color
		))
	}

	tick() {
		this.move()
	}
}

const baseProjectileDamage = 10
const bulletLifetimeTicks = 150
export class Projectile extends Entity {
	constructor(pos, vel, size, color) {
		super(pos, size, color)
		this.vel = vel
		this.damage = baseProjectileDamage
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
			life: this.life
		}
	}

	static deserialize(data) {
		var projectile = new Projectile (
			SimpleVector.deserialize(data.pos),
			SimpleVector.deserialize(data.vel),
			data.size,
			Color.deserialize(data.color)
		)
		projectile.damage = baseProjectileDamage
		projectile.life = data.life
		return projectile
	}

	isDead() {
		return this.life == 0 || this.pos.x == this.size || this.pos.x == mapWidth - this.size || this.pos.y == this.size || this.pos.y == mapHeight - this.size
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
		return this.health <= 0
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

	static assertValid(powerup) {
		Entity.assertValid(powerup)
		Assert.instanceOf(powerup, Powerup)
		Assert.number(powerup.type)
		Assert.boolean(powerup.dead)
		Assert.true(powerup.type >= 0 && powerup.type <= Powerup.MAX_TYPE)
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			type: this.type
		}
	}

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
		return this.dead
	}

	kill() {
		this.dead = true
	}

	apply(player) {
		//TODO
	}
}
