import {SimpleVector, Color, Assert, mapHeight, mapWidth} from "./utilities.js"

export class Entity {
	constructor(pos, size) {
		this.pos = pos
		this.size = size
		this.vel = new SimpleVector(0, 0)
		this.acc = new SimpleVector(0, 0)
		Entity.assertValid(this)
	}

	static assertValid(entity) {
		Assert.instanceOf(entity, Entity)
		Assert.instanceOf(entity.pos, SimpleVector)
		Assert.instanceOf(entity.vel, SimpleVector)
		Assert.instanceOf(entity.acc, SimpleVector)
		Assert.number(entity.size)
	}

	smoothMove() {
		this.vel.x += this.acc.x
		this.vel.y += this.acc.y
		this.vel.limitMagnitude(10)
		this.pos.x += this.vel.x
		this.pos.y += this.vel.y
		this.vel.x = this.vel.x * 0.99
		this.vel.y = this.vel.y * 0.99

		this.pos.x = Math.max(this.pos.x, this.size)
		this.pos.y = Math.max(this.pos.y, this.size)
		this.pos.x = Math.min((mapWidth-this.size), this.pos.x)
		this.pos.y = Math.min((mapHeight-this.size), this.pos.y)
	}
}

const playerSize = 20
export class Player extends Entity {
	constructor(id, pos, color) {
		super(pos, playerSize);
		this.id = id
		this.color = color
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
		Color.assertValid(player.color);
	}

}