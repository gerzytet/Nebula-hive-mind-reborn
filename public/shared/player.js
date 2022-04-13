import {Entity} from "./entity.js"
import {Assert, SimpleVector, Color} from "./utilities.js"
import {ActiveEffect, Projectile} from "./entities.js"

const playerSize = 20
export const playerBulletVel = 10
export const playerBaseBulletSize = 10
const playerBaseProjectileDamage = 10
const playerBaseSpeed = 10
const playerBulletSizeBonusPerConnection = 10
//multiply this by speed to get acceleration:
export const playerBaseAcceleration = 0.01
export const playerMaxHealth = 100
export class Player extends Entity {
	static DOUBLE_SHOT = 0
	static NECROMANCER = 1
	static MAX_ABILITY = 1

	constructor(id, pos, color, name, ability) {
		super(pos, playerSize, color);
		this.id = id
		this.health = playerMaxHealth
		this.attack = playerBaseProjectileDamage
		this.speed = playerBaseSpeed
		this.effects = []
		this.connections = 0
		this.ability = ability
		this.abilityCooldown = 0
		this.abilityDuration = 0
		this.name = name;
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
			effects: serializedEffects,
			name: this.name,
			ability: this.ability,
			abilityCooldown: this.abilityCooldown,
			abilityDuration: this.abilityDuration
		}
	}

	static deserialize(data) {
		var player = new Player(data.id, SimpleVector.deserialize(data.pos), Color.deserialize(data.color), data.name, data.ability)
		player.acc = SimpleVector.deserialize(data.acc)
		player.vel = SimpleVector.deserialize(data.vel)
		player.size = playerSize
		player.health = data.health
		player.angle = data.angle
		player.speed = data.speed
		player.name = data.name
		player.abilityCooldown = data.abilityCooldown
		player.abilityDuration = data.abilityDuration
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
		Assert.string(player.name)
		Assert.number(player.connections)
		Assert.number(player.ability)
		Assert.number(player.abilityCooldown)
		Assert.number(player.abilityDuration)
		Assert.true(player.abilityCooldown >= 0)
		Assert.true(player.abilityDuration >= 0)

		Assert.true(player.ability >= 0 && player.ability <= Player.MAX_ABILITY)
		Assert.true(player.health >= 0 && player.health <= playerMaxHealth)
		for (var i = 0; i < player.effects.length; i++) {
			ActiveEffect.assertValid(player.effects[i])
		}
	}

	move() {
		this.vel.limitMagnitude(this.speed)
		this.vel.scale(0.99)
		super.move()
	}

	isDead() {
		return this.health <= 0
	}

	damage(amount, color, state) {
		this.health -= amount
		if (this.isDead()) {
			this.kill(color, state)
		}
	}
	
	kill(color, state) {
		var colors = [];
		if (color.r === 255 && color.g === 255 && color.b === 255) {
			for (var i = 0; i < state.players.length; i++) {
				colors.push(state.players[i].color);
			}
			//TODO: using a set might allow for different object references to equivalent colors that don't compare equal
			var colors1 = new Set(colors);
			colors = Array.from(colors1);
			color = colors[state.randint(0, colors.length - 1)];
			this.color = color
		} else {
			this.color = color
		}
		this.health = playerMaxHealth
	}

	heal(amount) {
		this.health += amount
		if (this.health > playerMaxHealth) {
			this.health = playerMaxHealth
		}
	}

	attackSize() {
		return playerBaseBulletSize + this.connections * playerBulletSizeBonusPerConnection
	}

	shoot(state) {
		var radians = this.angle * Math.PI / 180

		//list of starting positions to spawn bullets.
		var bulletStartPositions = []

		//if double shot is ative
		if (this.isAbilityActive() && this.ability == Player.DOUBLE_SHOT) {

			//amount to distance bullets, measured from the line shooting straight out from the player
			var sideOffset = this.attackSize() + 4

			//this position is: start at player angle, turn 90 degrees, go forward by sideOffset
			//this is the difference between the player position and the bullet spawn position
			var sideOffsetVec = new SimpleVector(
				Math.cos(radians + (Math.PI / 2)) * sideOffset,
				-Math.sin(radians + (Math.PI / 2)) * sideOffset
			)

			//calculate first bullet position
			var base_vec = this.pos.clone()
			var p1 = base_vec.clone()
			p1.add(sideOffsetVec)

			//calculate the seond one with the *negative* offset, to get a bullet on the other side
			var p2 = base_vec.clone()
			var sideOffsetNegative = sideOffsetVec.clone()
			sideOffsetNegative.scale(-1)
			p2.add(sideOffsetNegative)

			bulletStartPositions.push(p1)
			bulletStartPositions.push(p2)
		} else {
			bulletStartPositions = [this.pos.clone()]
		}

		//spawn in each bullet
		for (var i = 0; i < bulletStartPositions.length; i++) {
			state.projectiles.push(new Projectile(
				bulletStartPositions[i],
				new SimpleVector(Math.cos(radians) * playerBulletVel, -Math.sin(radians) * playerBulletVel),
				this.attackSize(),
				this.color,
				this.attack
			))
		}
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

		this.abilityDuration--
		if (this.abilityDuration < 0) {
			this.abilityDuration = 0
		}

		this.abilityCooldown--
		if (this.abilityCooldown < 0) {
			this.abilityCooldown = 0
		}
	}

	isAbilityActive() {
		return this.abilityDuration > 0
	}

	canActivateAbility() {
		return this.abilityCooldown <= 0
	}

	activateAbility(state) {
		this.abilityCooldown = this.maxCooldown(this.ability)
		this.abilityDuration = this.maxDuration(this.ability)

		if (this.ability === Player.NECROMANCER) {
			state.enemies.push(new Enemy(
				this.pos.clone(),
				this.color
			))
		}
	}

    maxCooldown() {
		switch(this.ability) {
			case Player.DOUBLE_SHOT:
				return 600
			case Player.NECROMANCER:
				return 400
			default:
				throw new Error("unknown ability type!")
		}
	}

	maxDuration() {
		switch (this.ability) {
			case Player.DOUBLE_SHOT:
				return 200
			case Player.NECROMANCER:
				return 0
			default:
				throw new Error("unknown ability type!")
		}
	}

	abilityName() {
		switch (this.ability) {
			case Player.DOUBLE_SHOT:
				return "Double shot"
			case Player.NECROMANCER:
				return "Summon enemy"
			default:
				throw new Error("unknown ability type!")
		}
	}
}