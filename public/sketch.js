var socket
var players = []
var player

function setup() {
	createCanvas(1500, 700);
	background(51);
	socket = io.connect('http://localhost:3000');

	player = new Player(random(width), random(height));
	var data = {
		x: player.pos.x,
		y: player.pos.y
	};
	socket.emit('start', data);
	socket.on('heartbeat', function (data) {
		players = data;
	})
}

function draw() {
	fill(51)
	
	for (var i = players.length - 1; i >= 0; i--) {
		var id = players[i].id;
		if (id.substring(2, id.length) !== socket.id) {
			if (players[i].num == 0) { fill(255, 0, 0) }
			else if (players[i].num == 1) { fill(0, 0, 255) }
			else if (players[i].num == 2) { fill(0, 255, 0) }
			else if (players[i].num == 3) { fill(255, 255, 0) }
			else {fill(255, 102, 25)}
			ellipse(players[i].x, players[i].y, players[i].size * 2, players[i].size * 2);

			fill(255);
			textAlign(CENTER);
			textSize(15);
			text(players[i].num+1, players[i].x, players[i].y + (players[i].size/3));
		}
	}
}

function keyPressed() {
	if (keyCode === UP_ARROW) {
		player.pos.x += 100;
		console.log("UP_ARROW PRESSED");
	}
	var data = {
		num: player.num,
		x: player.pos.x,
		y: player.pos.y
		
	};
	socket.emit('move', data)
}