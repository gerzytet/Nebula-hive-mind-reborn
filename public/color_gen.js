/*
@file color_gen.js
@author Christian R
@date 2/18/2022
@brief File that generates specific colors for users when they enter the game.
*/

const cyrb53 = function(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
};

//TODO:
//find a smarter way to do this that ensures colors are spaced properly
//returns an array of length 3 with R, G, B values
function colorFromId(id) {
    var hash = cyrb53(id.toString())
    var r = hash & 0xFF
    var g = (hash >> 8) & 0xFF
    var b = (hash >> 16) & 0xFF
    return [r, g, b]
}

function test() {
    console.log(colorFromId(1))
    console.log(colorFromId(2))
    console.log(colorFromId(3))
}

//test()