import {SimpleVector, Color, neutralColor, Assert, mapWidth, mapHeight} from "./utilities.js"

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

		if (this.pos.x === this.size || this.pos.x === mapWidth-this.size) {
			this.vel.x = 0
		}
		if (this.pos.y === this.size || this.pos.y === mapHeight-this.size) {
			this.vel.y = 0
		}
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

		if (pushVector.magnitude() === 0) {
			pushVector = new SimpleVector(0.01, 0.01)
		}

		var scaledPushVector = new SimpleVector(
			pushVector.x / pushVector.magnitude() * strength,
			pushVector.y / pushVector.magnitude() * strength
		)
		other.vel.x += scaledPushVector.x
		other.vel.y += scaledPushVector.y
	}
}