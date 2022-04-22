/*
@file utilities.js
@author Craig
@date 4/1/2022
@brief 
*/

export const mapWidth = 3000
export const mapHeight = 2000
export const connectionRadius = 300

export class Assert {
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

	static function(value) {
		if (typeof value !== 'function') {
			throw new Error(`Assertion failed: expected function, got ${value}`)
		}
	}
}

export class Color {
	constructor(r, g, b) {
		this.r = r
		this.g = g
		this.b = b
		Color.assertValid(this);
	}

	static assertValid(color) {
		Assert.instanceOf(color, Color);
		Assert.number(color.r);
		Assert.number(color.g);
		Assert.number(color.b);
	}

	static deserialize(data) {
		return new Color(data.r, data.g, data.b)
	}

	serialize() {
		return {
			r: this.r,
			g: this.g,
			b: this.b
		}
	}

	equals(other) {
		return this.r === other.r && this.g === other.g && this.b === other.b
	}

	inArray(array) {
		let found = false;
		for (let i = 0; i < array.length; i++) {
			if (this.equals(array[i])) {
				found = true;
			}
		}
		return found;
	}
}

export const neutralColor = new Color(255, 255, 255)

export class SimpleVector {
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

	//limit the magnitude of a vector to max
	limitMagnitude(max) {
		var magSquared = this.x * this.x + this.y * this.y
		if (magSquared > max * max) {
			var mag = Math.sqrt(magSquared)
			this.x /= mag
			this.y /= mag
			this.x *= max
			this.y *= max
		}
	}

	dist(other) {
		var dx = this.x - other.x
		var dy = this.y - other.y
		return Math.sqrt(dx * dx + dy * dy)
	}

	magnitude() {
		return Math.sqrt(this.x * this.x + this.y * this.y)
	}

	clone() {
		return new SimpleVector(
			this.x,
			this.y
		)
	}

	add(other) {
		this.x += other.x
		this.y += other.y

		return this
	}

	scale(scalar) {
		this.x *= scalar
		this.y *= scalar

		return this
	}

	angleTo(other) {
		var dx = other.x - this.x
		var dy = other.y - this.y
		var radians = Math.atan2(dy, dx) 
		var angle = radians * 180 / Math.PI
		if (angle < 0) {
			angle += 360
		}
		return angle
	}

	static unitVector(angle) {
		var radians = angle * (Math.PI / 180)
		var vec = new SimpleVector(
			Math.cos(radians),
			Math.sin(radians)
		)
		return vec
	}

	static unitVectorNegativeY(angle) {
		var vec = SimpleVector.unitVector(angle)
		vec.y *= -1
		return vec
	}
}

var testing = false
export function isTesting() {
	return testing	
}

export function setTesting(value) {
	testing = value
}
