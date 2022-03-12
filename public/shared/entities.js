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
}

const playerSize = 20
export class Player extends Entity {
	constructor(id, pos, color) {
		super(pos, playerSize, color);
		this.id = id
		Player.assertValid(this);
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			vel: this.vel.serialize(),
			acc: this.acc.serialize(),
			id: this.id,
			color: this.color.serialize()
		}
	}

	static deserialize(data) {
		var player = new Player(data.id, SimpleVector.deserialize(data.pos), Color.deserialize(data.color))
		player.acc = SimpleVector.deserialize(data.acc)
		player.vel = SimpleVector.deserialize(data.vel)
		player.size = playerSize
		Player.assertValid(player);
		return player
	}

	static assertValid(player) {
		Entity.assertValid(player)
		Assert.instanceOf(player, Player);
		Assert.string(player.id);
	}

	move() {
		this.vel.limitMagnitude(maxPlayerVelocity)
		this.vel.x = this.vel.x * 0.99
		this.vel.y = this.vel.y * 0.99
		super.move()
	}
}

export class Projectile extends Entity {
	constructor(pos, vel, size, color) {
		super(pos, size, color)
		this.vel = vel
	}

	static assertValid(projectile) {
		Entity.assertValid(projectile)
		Assert.instanceOf(projectile, Projectile)
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			vel: this.vel.serialize(),
			size: this.size,
			color: this.color.serialize()
		}
	}

	static deserialize(data) {
		return new Projectile (
			SimpleVector.deserialize(data.pos),
			SimpleVector.deserialize(data.vel),
			data.size,
			Color.deserialize(data.color)
		)
	}

	move() {
		super.move()
		if (this.pos.x < 0.01 || mapWidth - this.pos.x < 0.01) {
		    this.vel.x = -this.vel.x
		}
		if (this.pos.y < 0.01 || mapHeight - this.pos.y < 0.01) {
		    this.vel.y = -this.vel.y
		}
	}
}