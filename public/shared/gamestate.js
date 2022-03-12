import {Assert, SimpleVector} from "./utilities.js"
import {Player, Projectile} from "./entities.js"

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

	//events is a list of GameEvent
	//applies each game event to this state
	advance(events) {
		for (var i = 0; i < events.length; i++) {
			events[i].apply(this)
		}

		for (var i = 0; i < this.players.length; i++) {
			this.players[i].move()
			if (this.randint(1, 80) == 1) {
				this.projectiles.push(new Projectile(
					new SimpleVector(this.players[i].pos.x, this.players[i].pos.y),
					new SimpleVector(this.randint(1, 50) / 10, this.randint(1, 50) / 10),
					10,
					this.players[i].color
				))
			}
		}
		for (var i = 0; i < this.projectiles.length; i++) {
			this.projectiles[i].move()
		}
	}

	serialize() {
		var data = {
			players: [],
			projectiles: []
		};
		for (var i = 0; i < this.players.length; i++) {
			data.players.push(this.players[i].serialize());
		}
		for (var i = 0; i < this.projectiles.length; i++) {
			data.projectiles.push(this.projectiles[i].serialize());
		}
		return data;
	}

	static deserialize(data) {
		var state = new GameState();
		for (var i = 0; i < data.players.length; i++) {
			state.players.push(Player.deserialize(data.players[i]));
		}
		for (var i = 0; i < data.projectiles.length; i++) {
			state.projectiles.push(Player.deserialize(data.projectiles[i]));
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
		Assert.function(state.rng)
	}

	//returns a random number between min and max
	randint(min, max) {
		Assert.true(min <= max);
		var range = max - min + 1;
		var r = this.rng() % range;
		return r + min;
	}
	
	//seed the rng with a number
	seed(seed) {
		this.rng = mulberry32(seed);
	}
}