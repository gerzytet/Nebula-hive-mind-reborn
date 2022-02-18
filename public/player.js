/*
@file player.js
@author entire team
@date 2/18/2022
@brief File that controls basic player functions
*/

function Player(x, y) {
	this.pos = createVector(x, y)
	this.size = 20
	this.vel = createVector(0, 0)


	this.show = function () {
		fill(255);
		ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
	}

	this.smoothMove = function () {
		//console.log(this.pos)
		this.pos.x += this.vel.x;
		this.pos.y += this.vel.y;
		//console.log(this.pos)
		this.pos.x = max(this.pos.x, 0)
	    this.pos.y = max(this.pos.y, 0)
    }
}