const mapWidth = 3000;
const mapHeight = 2000;

//does not need to be serialized
class SimpleVector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

//holds everything in the game
class GameState {
	constructor() {
		this.players = []
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
		return state;
	}
}

class Player {
	constructor(id, pos) {
		this.pos = pos
		this.size = 20
		this.vel = new SimpleVector(0, 0)
		this.id = id
	}

	smoothMove() {
		this.pos.x += this.vel.x
		this.pos.y += this.vel.y

		this.pos.x = Math.max(this.pos.x, 0)
		this.pos.y = Math.max(this.pos.y, 0)
	}

	serialize() {
		return {
			pos: this.pos,
			vel: this.vel,
			size: this.size,
			id: this.id	
		}
	}

	static deserialize(data) {
		var player = new Player(data.id, data.pos)
		player.vel = data.vel
		player.size = data.size
		return player
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
			case "PlayerChangeVelocity":
				return PlayerChangeVelocity.deserialize(data)
			case "PlayerJoin":
				return PlayerJoin.deserialize(data)
			case "PlayerLeave":
				return PlayerLeave.deserialize(data)
			default:
				throw new Error("Unknown event type: " + data.type)
		}
	}
}

//event for when a player changes velocity
/*
client sends 'changeVelocity' packet with data: {
   vel: new velocity as a simple vector
}
server creates this event in response
*/
class PlayerChangeVelocity extends GameEvent {
	constructor(id, vel) {
		super()
		this.id = id
		this.vel = vel
	}

	apply(state) {
		var player = state.playerById(this.id);
		if (player === null) {
			return
		}
		player.vel = this.vel
	}

	serialize() {
		return {
			id: this.id,
			vel: this.vel,
			type: "PlayerChangeVelocity"
		}
	}

	static deserialize(data) {
		return new PlayerChangeVelocity(data.id, data.vel)
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
		return new PlayerJoin(Player.deserialize(data.player))
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
		return new PlayerLeave(data.id)
	}
}

//this code only runs on the server
//"exports" is nodejs-specific
if (typeof exports !== "undefined"){
	//if a variable is not in here, the server won't see it
	exports.Player = Player
	exports.mapHeight = mapHeight
	exports.mapWidth = mapWidth
	exports.GameEvent = GameEvent
	exports.GameState = GameState
	exports.PlayerChangeVelocity = PlayerChangeVelocity
	exports.PlayerJoin = PlayerJoin
	exports.PlayerLeave = PlayerLeave
	exports.SimpleVector = SimpleVector
}
