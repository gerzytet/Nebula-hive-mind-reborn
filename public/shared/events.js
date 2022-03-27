import {Assert, SimpleVector} from "./utilities.js"
import {Player} from "./entities.js"

//base class for all primary game events
export class GameEvent {
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
			case "PlayerChangeAngle":
				return PlayerChangeAngle.deserialize(data)
			case "PlayerShoot":
				return PlayerShoot.deserialize(data)
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
export class PlayerChangeAcceleration extends GameEvent {
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
export class PlayerJoin extends GameEvent {
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
export class PlayerLeave extends GameEvent {
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

/*
for when a player changes angle
packet sent to server is:
angle: new angle
*/
export class PlayerChangeAngle extends GameEvent {
	constructor(id, angle) {
		super()
		this.id = id
		this.angle = angle
		PlayerChangeAngle.assertValid(this);
	}

	apply(state) {
		var player = state.playerById(this.id);
		if (player === null) {
			return
		}
		player.angle = this.angle
	}

	serialize() {
		return {
			id: this.id,
			angle: this.angle,
			type: "PlayerChangeAngle"
		}
	}

	static deserialize(data) {
		var event = new PlayerChangeAngle(data.id, data.angle)
		PlayerChangeAngle.assertValid(event);
		return event
	}

	static assertValid(event) {
		Assert.instanceOf(event, PlayerChangeAngle);
		Assert.string(event.id);
		Assert.number(event.angle);
		Assert.true(event.angle >= 0 && event.angle < 360);
	}
}

/*
for when a player shoots:
the client sends an empty object to the server
'shoot'
*/
export class PlayerShoot extends GameEvent {
	constructor(id) {
		super()
		this.id = id
		PlayerShoot.assertValid(this);
	}

	apply(state) {
		var player = state.playerById(this.id);
		if (player === null) {
			return
		}
		player.shoot(state)
	}

	serialize() {
		return {
			id: this.id,
			type: "PlayerShoot"
		}
	}

	static deserialize(data) {
		var event = new PlayerShoot(data.id)
		PlayerShoot.assertValid(event);
		return event
	}

	static assertValid(event) {
		Assert.instanceOf(event, PlayerShoot);
		Assert.string(event.id);
	}
}