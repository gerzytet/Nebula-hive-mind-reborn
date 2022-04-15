/*
@file sound.js
@author Patrick M.
@date 2/19/2022
@brief File that handles sound class
*/

class SoundEntity {
    constructor(src){
        this.sound = document.createElement("audio");
        this.sound.src = src;
        this.sound.setAttribute("preload", "auto");
        this.sound.setAttribute("controls", "none");
        this.sound.style.display = "none";
        this.source = src;
        document.body.appendChild(this.sound);
    }
    play(){
        this.sound.play();
    }
    stop(){
        this.sound.pause();
    }
}