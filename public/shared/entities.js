/*
@file entities.js
@author Craig
@date 4/1/2022
@brief defines behvaior for entity objects
*/

//TODO Implement Name Change

import {SimpleVector, Color, Assert, mapHeight, mapWidth, neutralColor, isTesting} from "./utilities.js"

export const defaultLifespan = 25
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

	getCorpse() {
		return new Corpse(this, defaultLifespan)
	}

	hasCorpse() {
		return false
	}
}

const playerSize = 20
export const playerBulletVel = 10
export const playerLaserVel = 30
export const playerBaseBulletSize = 10
const playerBaseProjectileDamage = 10
const playerBaseSpeed = 10
const playerBulletSizeBonusPerConnection = 10
//multiply this by speed to get acceleration:
export const playerBaseAcceleration = 0.01
export const playerMaxHealth = 100
const laserAttackFactor = 0.2
export const playerMaxFuel = 3;
export class Player extends Entity {
	static DOUBLE_SHOT = 0
	static NECROMANCER = 1
	static LASER = 2
	static MAX_ABILITY = 2

	constructor(id, pos, color, name, ability) {
		super(pos, playerSize, color)
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
		this.fuel = 0
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
			abilityDuration: this.abilityDuration,
			fuel: this.fuel
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
		player.fuel = data.fuel
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
		Assert.number(player.fuel)
		Assert.true(player.fuel >= 0 && player.fuel <= playerMaxFuel)

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
			//Boom_Splat
			this.kill(color, state)
		}
	}
	
	kill(color, state) {
		var colors = [];
		if (color.r === 255 && color.g === 255 && color.b === 255) {
			for (var i = 0; i < state.players.length; i++) {
				colors.push(state.players[i].color)
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

		if (this.isAbilityActive() && this.ability === Player.LASER) {
			return
		}

		//if double shot is ative
		if (this.isAbilityActive() && this.ability === Player.DOUBLE_SHOT) {

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

	shootLaser(state) {
		var radians = this.angle * Math.PI / 180
		state.projectiles.push(new Projectile(
			this.pos.clone(),
			new SimpleVector(Math.cos(radians) * playerLaserVel, -Math.sin(radians) * playerLaserVel),
			this.attackSize(),
			this.color,
			this.attack * laserAttackFactor,
			Projectile.LASER,
			this.angle
		))
	}

	tick(state) {
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

		if (!this.isAbilityActive()) {
			if (isTesting()) {
				this.abilityCooldown -= 5
			} else {
				this.abilityCooldown--
			}
		}
		if (this.abilityCooldown < 0) {
			this.abilityCooldown = 0
		}

		if (this.isAbilityActive() && this.ability === Player.LASER) {
			this.shootLaser(state)
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
			case Player.LASER:
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
			case Player.LASER:
				return 50
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
			case Player.LASER:
				return "Laser beam"
			default:
				throw new Error("unknown ability type!")
		}
	}

	addFuel() {
		if (this.fuel < playerMaxFuel) {
			this.fuel++
		}
	}

	canDash() {
		return this.fuel > 0
	}

	dash() {
		const dashDistance = 150
		var radians = this.angle * (180 / Math.PI)

		var unitVector = new SimpleVector(
			Math.cos(radians),
			Math.sin(radians) * -1
		)

		var dashVector = unitVector.clone()
		dashVector.scale(dashDistance)
		this.pos.add(dashVector)

		var newVel = unitVector.clone()
		newVel.scale(this.speed)
		this.vel = newVel

		this.fuel--
	}
}

const bulletLifetimeTicks = 150
const laserLifetimeTicks = 50
export class Projectile extends Entity {
	static NORMAL = 0
	static LASER = 1

	constructor(pos, vel, size, color, damage, type=Projectile.NORMAL, angle=0) {
		super(pos, size, color)
		this.vel = vel
		this.damage = damage
		this.life = bulletLifetimeTicks
		this.type = type
		this.angle = angle
		Projectile.assertValid(this)
	}

	maxLifetime() {
		if (this.type === Projectile.NORMAL) {
			return bulletLifetimeTicks
		} else if (this.type === Projectile.LASER) {
			return laserLifetimeTicks
		}
	}

	static assertValid(projectile) {
		Entity.assertValid(projectile)
		Assert.instanceOf(projectile, Projectile)
		Assert.number(projectile.damage)
		Assert.number(projectile.life)
		Assert.number(projectile.type)
		Assert.true(projectile.type === Projectile.NORMAL || projectile.type === Projectile.LASER)
	}

	serialize() {
		var data =  {
			pos: this.pos.serialize(),
			vel: this.vel.serialize(),
			size: this.size,
			color: this.color.serialize(),
			life: this.life,
			damage: this.damage,
			type: this.type
		}
		if (this.type === Projectile.LASER) {
			data.angle = this.angle
		}
		return data
	}

	static deserialize(data) {
		var projectile = new Projectile (
			SimpleVector.deserialize(data.pos),
			SimpleVector.deserialize(data.vel),
			data.size,
			Color.deserialize(data.color),
			data.damage,
			data.type
		)
		if (data.type === Projectile.LASER) {
			projectile.angle = data.angle
		}
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

	killIfNotLaser() {
		if (this.type !== Projectile.LASER) {
			this.kill()
		}
	}

	pushIfNotLaser(entity, strength) {
		if (this.type !== Projectile.LASER) {
			this.push(entity, strength)
		}
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
const maxFuelSpawnOnAsteroidDeath = 3
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

	spawnPowerups(state) {
		var amountToSpawn = Math.round(((this.size - minAsteroidSize) / (maxAsteroidSize - minAsteroidSize)) * maxFuelSpawnOnAsteroidDeath)
		for (var i = 0; i < amountToSpawn; i++) {
			var pos = this.pos.clone()
			pos.add(new SimpleVector(state.randint(-this.size/2, this.size/2), state.randint(-this.size/2, this.size/2)))
			state.powerups.push(new Powerup(
				pos, powerupSize, Powerup.FUEL
			))
		}
	}

	damage(amount, state) {
		if (this.health === 0) {
			return
		}
		this.health -= amount
		if (this.health <= 0) {
			this.health = 0
			this.spawnPowerups(state)
		}
	}

	isDead() {
		return (this.health <= 0)
	}

	maxhealth() {
		return this.size
	}

	hasCorpse() {
		return true
	}

	getCorpse() {
		return new Corpse(this, 12)
	}
}

const powerupSize = 12

export class Powerup extends Entity {
	static SPEED = 0
	static HEAL = 1
	static ATTACK = 2
	static FUEL = 3
	//ADD 1 TO THIS IF YOU ADD A NEW POWERUP TYPE:
	static MAX_TYPE = 3

	constructor(pos, size, type) {
		super(pos, size)
		this.type = type
		this.life = this.maxLife()

		Powerup.assertValid(this)
	}

	maxLife() {
		if (this.type == Powerup.FUEL) {
			return 30 * 10
		} else {
			return 30 * 30
		}
	}

	//double checks the properties of powerup (check if they are valid)
	static assertValid(powerup) {
		Entity.assertValid(powerup)
		Assert.instanceOf(powerup, Powerup)
		Assert.number(powerup.type)
		Assert.number(powerup.life)
		Assert.true(powerup.type >= 0 && powerup.type <= Powerup.MAX_TYPE)
	}

	//turns the powerup into a data packet
	serialize() {
		return {
			pos: this.pos.serialize(),
			type: this.type,
			life: this.life
		}
	}

	//turn the data packet into a powerup
	static deserialize(data) {
		var powerup = new Powerup(SimpleVector.deserialize(data.pos), powerupSize, data.type)
		powerup.life = data.life
		Powerup.assertValid(powerup)
		return powerup
	}

	tick() {
		this.life--
	}

	static addRandomPowerup(state) {
		var type = state.randint(0, Powerup.ATTACK)
		var pos = new SimpleVector(
			state.randint(powerupSize, mapWidth - powerupSize),
			state.randint(powerupSize, mapHeight - powerupSize)
		)
		state.powerups.push(new Powerup(pos, powerupSize, type))
	}

	isDead() {
		return this.life <= 0
	}

	kill() {
		this.life = 0
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
				player.acc.scale(4)
				break
			case Powerup.ATTACK:
				player.attack *= 2
				break
			case Powerup.HEAL:
				player.heal(playerMaxHealth / 2)
				break
			case Powerup.FUEL:
				player.addFuel(1)
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
const enemyShotSpreadAngle = 20
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
			const enemyBulletVel = playerBulletVel / 1.5
			const enemyBulletSize = playerBaseBulletSize
			var shotAngle = this.angle + state.randint(-enemyShotSpreadAngle, enemyShotSpreadAngle)
			var shotRadians = shotAngle * Math.PI / 180
			state.projectiles.push(
				new Projectile(
					new SimpleVector(this.pos.x, this.pos.y),
					new SimpleVector(
						enemyBulletVel * Math.cos(shotRadians),
						enemyBulletVel * Math.sin(shotRadians)
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

		//if there is at least one player, and that player is in the sight range
		if (closestPlayer !== null && closestPlayerDist < enemySightRange) {
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

	hasCorpse() {
		return true
	}
}

//a corpse represents and entity that just died
//these are not serialized and sent to clients
export class Corpse {
	constructor(entity, life) {
		this.entity = entity
		this.life = life

		Corpse.assertValid(this)
	}

	static assertValid(corpse) {
		Assert.instanceOf(corpse, Corpse)
		Entity.assertValid(corpse.entity)
	}

	tick() {
		this.life--
	}

	isDead() {
		return this.life <= 0
	}

	hasCorpse() {
		return false
	}
}

const bossProjectileDamage = 10
export const bossMaxHealth = 50
const bossSize = 20
const bossSpeed = 5
const bossBaseAcceleration = 0.01
const bossShootChancePerTick = 0.02
const bossSightRange = 500
const bossShotSpreadAngle = 20
export class Boss extends Entity {
	constructor (pos, color=neutralColor) {
		super(pos, bossSize, color)
		this.health = bossMaxHealth
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
		var boss = new Boss(SimpleVector.deserialize(data.pos), Color.deserialize(data.color))
		boss.angle = data.angle
		boss.vel = SimpleVector.deserialize(data.vel)
		boss.health = data.health
		boss.angle = data.angle
		Boss.assertValid(boss)
		return boss
	}

	static assertValid(boss) {
		Entity.assertValid(boss)
		Assert.number(boss.health)
		Assert.true(boss.health >= 0 && boss.health <= bossMaxHealth)
	}

	move() {
		super.move()

		this.vel.limitMagnitude(bossSpeed)
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
		if (state.random() < bossShootChancePerTick) {
			const bossBulletVel = playerBulletVel / 1.5
			const bossBulletSize = playerBaseBulletSize
			var shotAngle = this.angle + state.randint(-bossShotSpreadAngle, bossShotSpreadAngle)
			var shotRadians = shotAngle * Math.PI / 180
			state.projectiles.push(
				new Projectile(
					new SimpleVector(this.pos.x, this.pos.y),
					new SimpleVector(
						bossBulletVel * Math.cos(shotRadians),
						bossBulletVel * Math.sin(shotRadians)
					),
					bossBulletSize,
					this.color,
					bossProjectileDamage
				)
			)
		}
	}

	static addRandomBoss(state) {
		var pos = new SimpleVector(
			state.randint(bossSize, mapWidth - bossSize),
			state.randint(bossSize, mapHeight - bossSize)
		)
		state.enemies.push(new Boss(pos))
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
		if (closestPlayer !== null && (isTesting() || closestPlayerDist < bossSightRange)) {
			var dx = closestPlayer.pos.x - this.pos.x
			var dy = closestPlayer.pos.y - this.pos.y
			var radians = Math.atan2(dy, dx) 
			var angle = radians * 180 / Math.PI
			if (angle < 0) {
				angle += 360
			}
			this.angle = angle

			var newAcc = new SimpleVector(
				Math.cos(radians) * bossSpeed * bossBaseAcceleration,
				Math.sin(radians) * bossSpeed * bossBaseAcceleration
			)
			this.acc = newAcc
		} else {
			this.acc = new SimpleVector(0, 0)
		}

		this.move()
		this.maybeShoot(state)
	}
}
