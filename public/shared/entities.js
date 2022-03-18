import {SimpleVector, Color, Assert, mapHeight, mapWidth} from "./utilities.js"

const maxPlayerVelocity = 10
export class Entity {
	constructor(pos, size, color) {
		this.pos = pos
		this.size = size
		this.vel = new SimpleVector(0, 0)
		this.acc = new SimpleVector(0, 0)
		this.color = color
		Entity.assertValid(this)
	}

	static assertValid(entity) {
		Assert.instanceOf(entity, Entity)
		Assert.instanceOf(entity.pos, SimpleVector)
		Assert.instanceOf(entity.vel, SimpleVector)
		Assert.instanceOf(entity.acc, SimpleVector)
		Assert.number(entity.size)
		Color.assertValid(entity.color)
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
			health: this.health
		}
	}

	static deserialize(data) {
		var player = new Player(data.id, SimpleVector.deserialize(data.pos), Color.deserialize(data.color))
		player.acc = SimpleVector.deserialize(data.acc)
		player.vel = SimpleVector.deserialize(data.vel)
		player.size = playerSize
		player.health = data.health
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

	damage(amount) {
		this.health -= amount
		if (this.health < 0) {
			this.health = 0
		}
	}

	heal(amount) {
		this.health += amount
		if (this.health > playerMaxHealth) {
			this.health = playerMaxHealth
		}
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

	isExpired() {
		return this.life == 0 || this.pos.x == this.size || this.pos.x == mapWidth - this.size || this.pos.y == this.size || this.pos.y == mapHeight - this.size
	}

	tick() {
		this.move()
		this.life--
	}

	move() {
		super.move()
	}
}