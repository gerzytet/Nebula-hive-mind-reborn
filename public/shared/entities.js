/*
@file entities.js
@author Craig
@date 4/1/2022
@brief defines behvaior for entity objects
*/

//TODO Implement Name Change

import {SimpleVector, Color, Assert, mapHeight, mapWidth, neutralColor, isTesting} from "./utilities.js"
import {callbacks} from "./gamestate.js"

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
		return dist < maxDist
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

	getHitboxes() {
		return [this]
	}

	assertConsistent(other) {
		Assert.true(this.pos.equals(other.pos))
		console.log(this.pos)
		console.log(other.pos)
		Assert.true(this.vel.equals(other.vel))
		Assert.true(this.acc.equals(other.acc))
		Assert.true(this.size === other.size)
		Assert.true(this.color.equals(other.color))
		Assert.true(this.angle === other.angle)
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
		this.fuel = 3
		this.score = 0;
		this.number_of_minions = 0;
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
			fuel: this.fuel,
			score: this.score,
			number_of_minions: this.number_of_minions
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
		player.score = data.score
		player.number_of_minions = data.number_of_minions
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
		Assert.number(player.score)
		Assert.number(player.number_of_minions)
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

	isPermanentlyDead(state) {
		return this.isDead() && state.bossPhase
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
		if (state.bossPhase) {
			callbacks.onKillDuringBoss(this)
			return
		}
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
			//need a new bool var to tell sketch when to send death messages
			this.color = color
		}
		this.score = 0
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
				this.attack,
				Projectile.NORMAL,
				this.id
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
			this.id,
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
		if (this.ability === Player.NECROMANCER) {
			let enemy = new Enemy(this.pos.clone(), this.color, this.id)
			enemy.angle = -1 * this.angle
			if (enemy.angle < 0) {
				enemy.angle += 360
			}
			state.enemies.push(enemy)			
		}
		
		this.numberOfMinions(state)
		this.abilityCooldown = this.maxCooldown(this.ability)
		this.abilityDuration = this.maxDuration(this.ability)
	}

    maxCooldown() {
		switch(this.ability) {
			case Player.DOUBLE_SHOT:
				return 600
			case Player.NECROMANCER:
				if(this.number_of_minions > 5){
					return 200;
				}
				return 300 -(this.number_of_minions * 10)
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
				return "Summon Minion"
			case Player.LASER:
				return "Laser beam"
			default:
				throw new Error("unknown ability type!")
		}
	}

	numberOfMinions(state) {
		var count =0;	
		if(this.ability == Player.NECROMANCER){
			for(let i = 0; i<state.enemies.length; i++){
				if(state.enemies[i].color.equals(this.color) && state.enemies[i].id == this.id){
					count ++;
				}
			}
		}
		this.number_of_minions = count;
	}

	addFuel() {
		if (this.fuel < playerMaxFuel) {
			this.fuel++
		}
	}

	canDash() {
		return this.fuel > 0
	}

	dash(state) {
		const dashDistance = 150
		var radians = this.angle * (Math.PI / 180)

		var unitVector = new SimpleVector(
			Math.cos(radians),
			-Math.sin(radians)
		)

		var quarterDashVector = unitVector.clone()
		quarterDashVector.scale(dashDistance / 4)

		for (var i = 0; i < 4; i++) {
			this.pos.add(quarterDashVector)
			state.corpses.push(new Corpse(
				new PlayerAfterImage(this),
				30
			))
		}

		var oldSpeed = this.speed
		this.speed += playerBaseSpeed * 2
		this.acc.scale((this.speed / oldSpeed))
		
		this.effects.push(new ActiveEffect(Powerup.SPEED, 50))

		var newVel = unitVector.clone()
		newVel.scale(this.speed)
		this.vel = newVel

		this.fuel--
	}

	assertConsistent(other) {
		super.assertConsistent(other)
		Assert.true(this.ability === other.ability)
		Assert.true(this.abilityDuration === other.abilityDuration)
		Assert.true(this.abilityCooldown === other.abilityCooldown)
		Assert.true(this.fuel === other.fuel)
		Assert.true(this.health === other.health)
		Assert.true(this.color.equals(other.color))
	}
}

const bulletLifetimeTicks = 150
const laserLifetimeTicks = 50
//BALANCING: how long Fs last
const fLifetimeTicks = 200
//BALANCING: how long bombs last:
const bombLifetimeTicks =  30
export class Projectile extends Entity {
	static NORMAL = 0
	static LASER = 1
	static F = 2
	static BOMB = 3

	constructor(pos, vel, size, color, damage, type=Projectile.NORMAL, id = null, angle=0) {
		super(pos, size, color)
		this.vel = vel
		this.damage = damage
		this.type = type
		this.life = this.maxLifetime()
		this.angle = angle
		this.id = id
		Projectile.assertValid(this)
	}

	maxLifetime() {
		if (this.type === Projectile.NORMAL) {
			return bulletLifetimeTicks
		} else if (this.type === Projectile.LASER) {
			return laserLifetimeTicks
		} else if (this.type === Projectile.F) {
			return fLifetimeTicks
		} else if (this.type === Projectile.BOMB) {
			return bombLifetimeTicks
		}
	}

	static assertValid(projectile) {
		Entity.assertValid(projectile)
		Assert.instanceOf(projectile, Projectile)
		Assert.number(projectile.damage)
		Assert.number(projectile.life)
		Assert.number(projectile.type)
		Assert.true(projectile.type >= Projectile.NORMAL && projectile.type <= Projectile.BOMB)
	}

	serialize() {
		var data =  {
			pos: this.pos.serialize(),
			vel: this.vel.serialize(),
			size: this.size,
			color: this.color.serialize(),
			life: this.life,
			damage: this.damage,
			type: this.type,
			id: this.id
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
			data.type,
			data.id
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

	bombExplosion(state) {
		var speed = 10
		var boss = state.getBoss()
		if (boss === undefined) {
			return
		}

		var players = boss.players

		var fChance = (1/3) + ((Math.min(players, 10) - 4) / 6) * (1/3)
		//BALANCING: decrease the 45 to make more bullets spawn
		//number spawned is 360 / 45
		for (var angle = 0; angle < 360; angle += (360 / (players + 4))) {
			state.projectiles.push(
				new Projectile(
					this.pos.clone(),
					SimpleVector.unitVector(angle).scale(speed),
					playerBaseBulletSize,
					neutralColor,
					bossProjectileDamage,
					state.random() < fChance ? Projectile.F : Projectile.NORMAL
				)
			)
		}
	}

	kill(state) {
		this.life = 0
		if (this.type === Projectile.BOMB) {
			this.bombExplosion(state)
		}
	}

	killIfNotLaser(state) {
		if (this.type !== Projectile.LASER) {
			this.kill(state)
		}
	}

	pushIfNotLaser(entity, strength) {
		if (this.type !== Projectile.LASER) {
			this.push(entity, strength)
		}
	}

	tick(state) {
		if (this.type == Projectile.F) {
			var closestPlayer = state.getClosestPlayer(this.pos)
			if (closestPlayer !== null) {
				//BALANCING: .scale() on this vector can make the Fs move faster or slower.  >1 is faster, <1 is slower
				this.acc = SimpleVector.unitVector(this.pos.angleTo(closestPlayer.pos)).scale(0.75)
			}
		}

		this.move()
		this.life--
		if (this.isDead()) {
			this.kill(state)
		}
	}

	move() {
		super.move()
	}
}

const minAsteroidSize = 50
const maxAsteroidSize = 150
const minAsteroidSpeed = 2
const maxAsteroidSpeed = 5
export const asteroidImpactDamagePerTick = 2
const maxFuelSpawnOnAsteroidDeath = 3
export class Asteroid extends Entity {
	constructor (pos, vel, size) {
		super(pos, size)
		this.vel = vel
		this.health = this.maxhealth()
		this.angle = 0
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
			return 50 * 30
		} else {
			return 50 * 30
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
				var oldSpeed = player.speed
				player.speed += playerBaseSpeed * 2
				player.acc.scale((player.speed / oldSpeed))
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

const powerupEffectDurationTicks = 150

//a lasting powerup effect
export class ActiveEffect {
	constructor(type, duration=powerupEffectDurationTicks) {
		this.type = type
		this.life = duration
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
				player.speed -= playerBaseSpeed * 2
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
	constructor (pos, color=neutralColor, id = null) {
		super(pos, enemySize, color)
		this.health = enemyMaxHealth
		this.id = id
	}

	serialize() {
		var data =  {
			pos: this.pos.serialize(),
			angle: this.angle,
			vel: this.vel,
			health: this.health,
			color: this.color.serialize()
		}
		if (this.id === undefined) {
			data.id = null
		} else {
			data.id = this.id
		}
		return data
	}

	static deserialize(data) {
		var enemy = new Enemy(SimpleVector.deserialize(data.pos), Color.deserialize(data.color))
		enemy.angle = data.angle
		enemy.vel = SimpleVector.deserialize(data.vel)
		enemy.health = data.health
		enemy.id = data.id
		Enemy.assertValid(enemy)
		return enemy
	}

	static assertValid(enemy) {
		Assert.number(enemy.health)
		if (enemy.id !== null) {
			Assert.string(enemy.id)
        }
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
					enemyProjectileDamage,
					Projectile.NORMAL,
					this.id
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
		this.maxLife = life
		this.pos = entity.pos
		this.size = entity.size

		Corpse.assertValid(this)
	}

	static assertValid(corpse) {
		Assert.instanceOf(corpse, Corpse)
		Assert.number(corpse.life)
		Assert.number(corpse.maxLife)
		SimpleVector.assertValid(corpse.pos)
		Assert.number(corpse.size)
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

export class Hitbox {
	constructor(pos, size, entity) {
		this.pos = pos
		this.size = size
		this.entity = entity
	}

	static assertValid(hitbox) {
		Assert.instanceOf(hitbox, Hitbox)
		SimpleVector.assertValid(hitbox.pos)
		Entity.assertValid(hitbox.entity)
		Assert.number(hitbox.size)
	}

	isColliding(other) {
		var maxDist = other.size + this.size
		var dist = this.pos.dist(other.pos)
		return dist < maxDist
	}

	push(entity, strength) {
		if (!this.isColliding(entity)) {
			return
		}

		var dist = this.pos.dist(entity.pos)
		var pushVector = new SimpleVector(entity.pos.x - this.pos.x, entity.pos.y - this.pos.y)

		if (pushVector.magnitude() === 0) {
			pushVector = new SimpleVector(0.01, 0.01)
		}

		var scaledPushVector = new SimpleVector(
			pushVector.x / pushVector.magnitude() * strength,
			pushVector.y / pushVector.magnitude() * strength
		)
		entity.vel.x += scaledPushVector.x
		entity.vel.y += scaledPushVector.y
	}
}

export class PlayerAfterImage {
	constructor(player) {
		this.pos = player.pos.clone()
		this.color = player.color
		this.angle = player.angle
		this.size = player.size

		PlayerAfterImage.assertValid(this)
	}

	static assertValid(image) {
		Assert.instanceOf(image, PlayerAfterImage)
		SimpleVector.assertValid(image.pos)
		Color.assertValid(image.color)
		Assert.number(image.angle)
		Assert.number(image.size)
	}
}

const bossProjectileDamage = 20
const bossSize = 200
const bossSpeed = 8
const bossBaseAcceleration = 0.01
const bossSightRange = 500
const bossMinAttackDelay = 30
const bossAttackChancePerTick = 1/15
const bossAttackSize = playerBaseBulletSize
const initialFVel = 15
const bossFAttackDuration = 50
export class Boss extends Entity {
	static ATTACK_LASER_LEFT = 0
	static ATTACK_F = 1
	static ATTACK_LASER_RIGHT = 2
	static ATTACK_SWEEP = 3
	static ATTACK_BOMB = 4
	static MAX_ATTACK = 4

	constructor (pos, players) {
		super(pos, bossSize, neutralColor)
		//BALANCING: this needs to scale with number of players
		//make initial health or number of players a parameter to the function
		this.attackCooldown = 0
		this.attackPattern = undefined
		this.attackDuration = 0
		this.players = players
		this.health = this.maxHealth()
	}

	maxHealth() {
		return this.players * playerMaxHealth * 4
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			angle: this.angle,
			vel: this.vel,
			health: this.health,
			angle: this.angle,
			isBoss: true,
			attackCooldown: this.attackCooldown,
			attackPattern: this.attackPattern,
			attackDuration: this.attackDuration,
			players: this.players
		}
	}

	static deserialize(data) {
		var boss = new Boss(SimpleVector.deserialize(data.pos), data.players)
		boss.angle = data.angle
		boss.vel = SimpleVector.deserialize(data.vel)
		boss.health = data.health
		boss.angle = data.angle
		boss.attackCooldown = data.attackCooldown
		boss.attackPattern = data.attackPattern
		boss.attackDuration = data.attackDuration
		Boss.assertValid(boss)
		return boss
	}

	static assertValid(boss) {
		Entity.assertValid(boss)
		Assert.instanceOf(boss, Boss)
		Assert.number(boss.health)
		Assert.true(boss.health >= 0 && boss.health <= boss.maxHealth())
		Assert.number(boss.attackCooldown)
		Assert.true(boss.attackCooldown >= 0 && boss.attackCooldown <= bossMinAttackDelay)
		Assert.true(boss.attackPattern === undefined || boss.attackPattern >= 0 && boss.attackPattern <= Boss.MAX_ATTACK)
		Assert.number(boss.attackDuration)
		Assert.true(boss.attackDuration >= 0)
		Assert.number(boss.players)
	}

	maxAttackDuration() {
		//BALANCING: duration in ticks of each attack
		//less duration makes the attacks shoot less stuff, but the next attack comes around quicker
		//feel free to add state to the parameter list so you can see the number of players and dynamically adjust
		switch (this.attackPattern) {
			case Boss.ATTACK_LASER_LEFT:
			case Boss.ATTACK_LASER_RIGHT:
				return 50
			case Boss.ATTACK_F:
				return bossFAttackDuration
			case Boss.ATTACK_SWEEP:
				return 60
			case Boss.ATTACK_BOMB:
				return 50
		}
	}

	move() {
		super.move()

		if (this.vel.magnitude() > bossSpeed) {
			this.vel.x *= 0.99
			this.vel.y *= 0.99	
		}
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

	doLaserAttack(state) {
		var angleOffset
		var radius
		if (this.attackPattern === Boss.ATTACK_LASER_LEFT) {
			angleOffset = 240
			radius = this.size
		} else if (this.attackPattern === Boss.ATTACK_LASER_RIGHT) {
			angleOffset = 110
			radius = this.size * 0.9
		}
		var radians = (this.angle + angleOffset) * (Math.PI / 180)
		var offset = new SimpleVector(
			Math.cos(radians),
			Math.sin(radians)
		)
		offset.scale(radius)

		var handPos = this.pos.clone()
		handPos.add(offset)

		var closestPlayer = state.getClosestPlayer(handPos)
		var angle
		if (closestPlayer === null) {
			angle = this.pos.angleTo(handPos)
		} else {
			angle = handPos.angleTo(closestPlayer.pos)
		}

		//BALANCING: damage formula for laser attack is here
		var laserVel = SimpleVector.unitVector(angle).scale(playerLaserVel)
		state.projectiles.push(new Projectile(
			handPos.clone(),
			laserVel,
			bossAttackSize,
			this.color,
			bossProjectileDamage * laserAttackFactor,
			Projectile.LASER,
			null,
			(360 - angle)
		))
		//BALANCING: a double-laser stream could be done here
		//just change angle by some small offset, make sure it isn't negative, recalculate laserVel, push another projectile
		if (this.players >= 7) {
			var angle = (angle + 180) % 360
			var laserVel = SimpleVector.unitVector(angle).scale(playerLaserVel)
			state.projectiles.push(new Projectile(
				handPos.clone(),
				laserVel,
				bossAttackSize,
				this.color,
				bossProjectileDamage * laserAttackFactor,
				Projectile.LASER,
				null,
				(360 - angle)
			))
		}

		if (this.attackDuration === 1) {
			this.dash()
		}
	}

	doFAttack(state) {
		var fs = this.players * 2.5
		var chancePerTick = fs / bossFAttackDuration
		if (state.random() > chancePerTick) {
			return
		}

		var angle = state.randint(0, 359)
		var vel = SimpleVector.unitVector(angle).scale(initialFVel)

		//BALANCING: damage formula for Fs is here
		state.projectiles.push(
			new Projectile(
				this.pos.clone(),
				vel,
				bossAttackSize,
				this.color,
				bossProjectileDamage,
				Projectile.F,
				null
			)
		)
	}

	doLaserSweep(state) {
		var progress = 1 - (this.maxAttackDuration() / this.attackDuration)
		var angle = 180 * progress

		//BALANCING: adding more items to both of these lists causes more bullet sources and more bullets in sweep attack
		var angleOffsets = [240, 110]
		var radii = [this.size, this.size * 0.9]

		for (var i = 0; i < angleOffsets.length; i++) {
			var angleOffset = angleOffsets[i]
			var radius = radii[i]

			var radians = (this.angle + angleOffset) * (Math.PI / 180)
			var offset = new SimpleVector(
				Math.cos(radians),
				Math.sin(radians)
			)
			offset.scale(radius)
	
			var handPos = this.pos.clone()
			handPos.add(offset)
	
			var bulletType
			var speed
			//BALANCING: right now, this logic makes 10% F, 20% laser, 70% normal.  This can be tweaked
			//BALANCING: change initial velocities for faster bullets.  Changing F velocity won't make it better though
			var r = state.randint(1, 10)
			if (r === 1) {
				bulletType = Projectile.F
				speed = initialFVel
			} else if (r === 2 || r == 3) {
				bulletType = Projectile.LASER
				speed = playerLaserVel
			} else {
				bulletType = Projectile.NORMAL
				speed = playerBulletVel
			}

			var balancingSpeedFactor = 1 + (Math.min(this.players, 10) - 4) * (1/6)
			var vel = SimpleVector.unitVector(angle).scale(speed).scale(balancingSpeedFactor)
			state.projectiles.push(new Projectile(
				handPos.clone(),
				vel,
				bossAttackSize,
				this.color,
				bulletType === Projectile.LASER ? bossProjectileDamage * laserAttackFactor : bossProjectileDamage,
				bulletType,
				null,
				(360 - angle) % 360
			))
		}
	}

	doBombAttack(state) {
		//BALANCING: decrease the 10 to make bomb attacks spawn more bombs
		if (this.attackDuration % 10 !== 0) {
			return
		}

		var angle = state.randint(0, 259)
		var unitVector = SimpleVector.unitVector(angle)
		state.projectiles.push(
			new Projectile(
				this.pos.clone(),
				unitVector.clone().scale(playerBulletVel),
				bossAttackSize,
				this.color,
				0,
				Projectile.BOMB,
			)
		)
	}

	dash() {
		var unitVector = SimpleVector.unitVector(this.angle)
		this.vel = unitVector.clone().scale(bossSpeed * 3)
	}

	doAttacks(state) {
		if (this.attackDuration === 0) {
			this.attackPattern = undefined

			if (this.attackCooldown > 0) {
				this.attackCooldown--
				return
			}
	
			if (state.random() < bossAttackChancePerTick) {
				//BALANCING: decrease this value to decrease gap between boss attacks
				this.attackCooldown = bossMinAttackDelay
				this.attackPattern = state.randint(0, Boss.MAX_ATTACK)
				//BALANCING: see maxAttackDuration() for details
				this.attackDuration = this.maxAttackDuration()
			}
		} else {
			switch (this.attackPattern) {
				case Boss.ATTACK_LASER_LEFT:
				case Boss.ATTACK_LASER_RIGHT:
					this.doLaserAttack(state)
					break
				case Boss.ATTACK_F:
					this.doFAttack(state)
					break
				case Boss.ATTACK_SWEEP:
					this.doLaserSweep(state)
					break
				case Boss.ATTACK_BOMB:
					this.doBombAttack(state)
					break
			}
			this.attackDuration--
		}
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

		if (closestPlayer !== null) {
			var dx = closestPlayer.pos.x - this.pos.x
			var dy = closestPlayer.pos.y - this.pos.y
			var radians = Math.atan2(dy, dx) 
			var angle = radians * 180 / Math.PI
			if (angle < 0) {
				angle += 360
			}
			this.angle = angle

			//BALANCING: boss could be made faster here
			var newAcc = new SimpleVector(
				Math.cos(radians) * bossSpeed * bossBaseAcceleration,
				Math.sin(radians) * bossSpeed * bossBaseAcceleration
			)
			this.acc = newAcc
		} else {
			this.acc = new SimpleVector(0, 0)
		}

		this.move()
		this.doAttacks(state)
	}

	//return the hitbox at radius distance from the center, at angle degrees offset
	makeHitbox(angle, radius, size) {
		var totalAngle = angle + this.angle
		totalAngle %= 360
		var radians = totalAngle * (Math.PI / 180)
		var unitVector = new SimpleVector(
			Math.cos(radians),
			Math.sin(radians)
		)

		var pos = this.pos.clone()
		var scaledVector = unitVector
		scaledVector.scale(radius)
		pos.add(scaledVector)

		return new Hitbox(pos, size, this)
	}

	getHitboxes() {
		return [
			this.makeHitbox(240, 70, 20),
			this.makeHitbox(60, 60, 50),
			this.makeHitbox(320, 80, 30),
			this.makeHitbox(90, 100, 20),
			this.makeHitbox(100, 120, 20),
			this.makeHitbox(105, 140, 20),
			this.makeHitbox(105, 160, 20),
			this.makeHitbox(108, 190, 20),
			this.makeHitbox(260, 120, 20),
			this.makeHitbox(255, 150, 25),
			this.makeHitbox(245, 170, 20),
			this.makeHitbox(241, 195, 20),
			this.makeHitbox(190, 110, 50),
			this.makeHitbox(190, 50, 50),
			this.makeHitbox(-10, 100, 60),
			this.makeHitbox(-5, 150, 50),
			this.makeHitbox(0, 0, 50),
			this.makeHitbox(280, 100, 50),
			this.makeHitbox(175, 160, 30)
		]
	}
}
