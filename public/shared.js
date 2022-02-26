const mapWidth = 3000
const mapHeight = 2000

class Assert {
	static defined(value) {
		if (value === undefined) {
			throw new Error("Assertion failed: expected not undefined");
		}
	}

	static definedAndNotNull(value) {
		Assert.defined(value);
		if (value === null) {
			throw new Error("Assertion failed: expected defined and not null");
		}
	}

	static boolean(bool) {
		if (typeof bool !== 'boolean') {
			throw new Error(`Assertion failed: expected boolean, got ${bool}`)
		}
	}

	static true(bool) {
		Assert.boolean(bool);
		if (!bool) {
			throw new Error("Assertion failed: expected true")
		}
	}

	static false(bool) {
		Assert.boolean(bool)
		if (bool) {
			throw new Error("Assertion failed: expected false")
		}
	}

	static instanceOf(obj, type) {
		Assert.definedAndNotNull(obj);
		Assert.definedAndNotNull(type);
		if (!(obj instanceof type)) {
			throw new Error(`Assertion failed: expected instance of ${type.name}`)
		}
	}

	static number(num) {
		if (typeof num !== 'number' || isNaN(num)) {
			throw new Error(`Assertion failed: expected number, got ${num}`)
		}
	}

	static string(str) {
		if (typeof str !== 'string') {
			throw new Error(`Assertion failed: expected string, got ${str}`)
		}
	}
  
}

class SimpleVector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		SimpleVector.assertValid(this);
	}

	serialize() {
		return {
			x: this.x,
			y: this.y
		}
	}

	static deserialize(data) {
		var vec = new SimpleVector(data.x, data.y)
		SimpleVector.assertValid(vec);
		return vec;
	}

	static assertValid(vec) {
		Assert.instanceOf(vec, SimpleVector);
		Assert.number(vec.x);
		Assert.number(vec.y);
	}
}

//holds everything in the game
class GameState {
	constructor() {
		this.players = []
		GameState.assertValid(this);
	}

	//returns player object having the id, or null if not found
	playerById(id) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].id == id) {
				return this.players[i];
			}
		}
		return null;
	}

	//events is a list of GameEvent
	//applies each game event to this state
	advance(events) {
		for (var i = 0; i < events.length; i++) {
			events[i].apply(this)
		}

		for (var i = 0; i < this.players.length; i++) {
			this.players[i].smoothMove();
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
	}
}

const playerSize = 20
class Player {
	constructor(id, pos) {
		this.pos = pos
		this.size = playerSize
		this.vel = new SimpleVector(0, 0)
		this.acc = new SimpleVector(0, 0)
		this.id = id
		Player.assertValid(this);
	}

	limitMagnitude(vec, max) {
		var magSquared = vec.x * vec.x + vec.y * vec.y
		if (magSquared > max * max) {
			var mag = Math.sqrt(magSquared)
			vec.x /= mag
			vec.y /= mag
			vec.x *= max
			vec.y *= max
		}
	}

	smoothMove() {
		this.vel.x += this.acc.x
		this.vel.y += this.acc.y
		this.limitMagnitude(this.vel, 10)
		this.pos.x += this.vel.x
		this.pos.y += this.vel.y
		this.vel.x = this.vel.x * 0.99
		this.vel.y = this.vel.y * 0.99

		this.pos.x = Math.max(this.pos.x, this.size)
		this.pos.y = Math.max(this.pos.y, this.size)
		this.pos.x = Math.min((mapWidth-this.size), this.pos.x)
		this.pos.y = Math.min((mapHeight-this.size), this.pos.y)
	}

	serialize() {
		return {
			pos: this.pos.serialize(),
			vel: this.vel.serialize(),
			acc: this.acc.serialize(),
			id: this.id	
		}
	}

	static deserialize(data) {
		var player = new Player(data.id, data.pos)
		player.acc = SimpleVector.deserialize(data.acc)
		player.vel = SimpleVector.deserialize(data.vel)
		player.size = playerSize
		Player.assertValid(player);
		return player
	}

	static assertValid(player) {
		Assert.instanceOf(player, Player);
		Assert.number(player.pos.x);
		Assert.number(player.pos.y);
		Assert.number(player.vel.x);
		Assert.number(player.vel.y);
		Assert.number(player.acc.x);
		Assert.number(player.acc.y);
		Assert.number(player.size);
		Assert.string(player.id);
	}

}

//base class for all primary game events
class GameEvent {
	//apply this event to the given game state
	apply(state) {
		throw new Error("Apply function not implemented")
	}

	//serialize this event
	//should always be overridden by children
	serialize() {
		throw new Error("Serialize function not implemented")
	}

	//deserialize this event
	//delegates to children based on data.type
	static deserialize(data) {
		switch (data.type) {
			case "PlayerChangeAcceleration":
				return PlayerChangeAcceleration.deserialize(data)
			case "PlayerJoin":
				return PlayerJoin.deserialize(data)
			case "PlayerLeave":
				return PlayerLeave.deserialize(data)
			default:
				throw new Error("Unknown event type: " + data.type)
		}
	}
}

//event for when a player changes acceleration
/*
client sends 'changeAcceleration' packet with data: {
   vel: new acceleration as a simple vector
}
server creates this event in response
*/
class PlayerChangeAcceleration extends GameEvent {
	constructor(id, acc) {
		super()
		this.id = id
		this.acc = acc
		PlayerChangeAcceleration.assertValid(this);
	}

	apply(state) {
		var player = state.playerById(this.id);
		if (player === null) {
			return
		}
		player.acc = this.acc
	}

	serialize() {
		return {
			id: this.id,
			acc: this.acc.serialize(),
			type: "PlayerChangeAcceleration"
		}
	}

	static deserialize(data) {
		var event = new PlayerChangeAcceleration(data.id, SimpleVector.deserialize(data.acc))
		PlayerChangeAcceleration.assertValid(event);
		return event
	}

	static assertValid(event) {
		Assert.instanceOf(event, PlayerChangeAcceleration);
		Assert.string(event.id);
		SimpleVector.assertValid(event.acc);
	}
}

/*
for when a player joins a game
client does not need to send a packet, the server will infer this from a new connection
*/
class PlayerJoin extends GameEvent {
	constructor(player) {
		super()
		this.player = player
		PlayerJoin.assertValid(this);
	}

	apply(state) {
		state.players.push(this.player)
	}

	serialize() {
		return {
			player: this.player.serialize(),
			type: "PlayerJoin"
		}
	}

	static deserialize(data) {
		var event = new PlayerJoin(Player.deserialize(data.player))
		PlayerJoin.assertValid(event);
		return event
	}

	static assertValid(event) {
		Assert.instanceOf(event, PlayerJoin);
		Player.assertValid(event.player);
	}
}

/*
for when a player leaves the game
client does not need to send a packet, the server will infer this from the client failing to send tickReply
*/
class PlayerLeave extends GameEvent {
	constructor(id) {
		super()
		this.id = id
		PlayerLeave.assertValid(this);
	}

	apply(state) {
		var playerIndex
		for (var i = 0; i < state.players.length; i++) {
			if (state.players[i].id == this.id) {
				playerIndex = i
				break
			}
		}
		if (playerIndex === undefined) {
			console.log("Warning: player not found in PlayerLeave function")
			return
		}
		state.players.splice(playerIndex, 1)
	}

	serialize() {
		return {
			id: this.id,
			type: "PlayerLeave"
		}
	}

	static deserialize(data) {
		var event = new PlayerLeave(data.id)
		PlayerLeave.assertValid(event);
		return event
	}

	static assertValid(event) {
		Assert.instanceOf(event, PlayerLeave);
		Assert.string(event.id);
	}
}

//this code only runs on the server
//"exports" is nodejs-specific
if (typeof exports !== "undefined") {
	//if a variable is not in here, the server won't see it
	exports.Player = Player
	exports.mapHeight = mapHeight
	exports.mapWidth = mapWidth
	exports.GameEvent = GameEvent
	exports.GameState = GameState
	exports.PlayerChangeAcceleration = PlayerChangeAcceleration
	exports.PlayerJoin = PlayerJoin
	exports.PlayerLeave = PlayerLeave
	exports.SimpleVector = SimpleVector
	exports.Assert = Assert
}
