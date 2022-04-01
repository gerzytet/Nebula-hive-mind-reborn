import {Assert, SimpleVector} from "./utilities.js"
import {Player, Projectile, playerMaxHealth, Asteroid} from "./entities.js"

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return (t ^ t >>> 14) >>> 0;
    }
}

//holds everything in the game
export class GameState {
	constructor() {
		this.players = []
		this.projectiles = []
		this.asteroids = []
		this.rng = mulberry32(0)
		GameState.assertValid(this);
	}

	//returns player object having the id, or null if not found
	playerById(id) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].id == id) {
				return this.players[i]
			}
		}
		return null
	}

	killPlayer(player, damageColor) {
		player.color = damageColor
		player.health = playerMaxHealth
	}

	doCollision() {
		for (var i = 0; i < this.players.length; i++) {
			for (var j = 0; j < this.projectiles.length; j++) {
				if (!this.players[i].color.equals(this.projectiles[j].color) && this.players[i].isColliding(this.projectiles[j])) {
					this.players[i].damage(this.projectiles[j].damage)
					if (this.players[i].isDead()) {
						this.killPlayer(this.players[i], this.projectiles[j].color)
					}
					this.projectiles.splice(j, 1)
					j--
				}
			}
		}
	}

	doNewAsteroids() {
		const newAsteroidChancePerTick = 0.1
		const asteroidLimit = 10

		if (this.asteroids.length < asteroidLimit && this.random() < newAsteroidChancePerTick) {
			Asteroid.addRandomAsteroid(this);
			console.log("new asteroid: " + this.asteroids[this.asteroids.length - 1])	
		}
	}

	moveEntities() {
		for (var i = 0; i < this.players.length; i++) {
			this.players[i].move()
		}
		for (var i = 0; i < this.projectiles.length; i++) {
			this.projectiles[i].tick()
			if (this.projectiles[i].isExpired()) {
				this.projectiles.splice(i, 1)
				i--
			}
		}
		for (var i = 0; i < this.asteroids.length; i++) {
			this.asteroids[i].tick()
		}
	}

	//events is a list of GameEvent
	//applies each game event to this state
	advance(events) {
		for (var i = 0; i < events.length; i++) {
			events[i].apply(this)
		}

		this.doNewAsteroids()
		this.moveEntities()
		this.doCollision()
	}

	serialize() {
		var data = {
			players: [],
			projectiles: [],
			asteroids: []
		};
		for (var i = 0; i < this.players.length; i++) {
			data.players.push(this.players[i].serialize());
		}
		for (var i = 0; i < this.projectiles.length; i++) {
			data.projectiles.push(this.projectiles[i].serialize());
		}
		for (var i = 0; i < this.asteroids.length; i++) {
			data.asteroids.push(this.asteroids[i].serialize());
		}
		return data;
	}

	static deserialize(data) {
		var state = new GameState();
		for (var i = 0; i < data.players.length; i++) {
			state.players.push(Player.deserialize(data.players[i]));
		}
		for (var i = 0; i < data.projectiles.length; i++) {
			state.projectiles.push(Projectile.deserialize(data.projectiles[i]));
		}
		for (var i = 0; i < data.asteroids.length; i++) {
			state.asteroids.push(Asteroid.deserialize(data.asteroids[i]));
		}
		GameState.assertValid(state);
		return state;
	}

	static assertValid(state) {
		Assert.instanceOf(state, GameState);
		for (var i = 0; i < state.players.length; i++) {
			Player.assertValid(state.players[i]);
		}
		for (var i = 0; i < state.projectiles.length; i++) {
			Projectile.assertValid(state.projectiles[i]);
		}
		for (var i = 0; i < state.asteroids.length; i++) {
			Asteroid.assertValid(state.asteroids[i]);
		}
		Assert.function(state.rng)
	}

	//returns a random number between min and max
	randint(min, max) {
		Assert.true(min <= max);
		var range = max - min + 1;
		var r = this.rng() % range;
		return r + min;
	}

	random() {
		return this.rng() / 4294967296
	}
	
	//seed the rng with a number
	seed(seed) {
		this.rng = mulberry32(seed);
	}
}