import {Assert} from "./utilities.js"
import {Player} from "./entities.js"

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
			this.players[i].smoothMove()
		}
	}

	serialize() {
		var data = {
			players: []
		};
		for (var i = 0; i < this.players.length; i++) {
			data.players.push(this.players[i].serialize());
		}
		return data;
	}

	static deserialize(data) {
		var state = new GameState();
		for (var i = 0; i < data.players.length; i++) {
			state.players.push(Player.deserialize(data.players[i]));
		}
		GameState.assertValid(state);
		return state;
	}

	static assertValid(state) {
		Assert.instanceOf(state, GameState);
		for (var i = 0; i < state.players.length; i++) {
			Player.assertValid(state.players[i]);
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