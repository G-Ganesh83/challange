import Phaser from 'phaser';
import BootScene       from './scenes/BootScene.js';
import IntroScene      from './scenes/IntroScene.js';
import MainMenuScene   from './scenes/MainMenuScene.js';
import MissionScene    from './scenes/MissionScene.js';
import GameScene       from './scenes/GameScene.js';
import Room2Scene      from './scenes/Room2Scene.js';
import TransitionScene from './scenes/TransitionScene.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  render: { antialias: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: 960,
    height: 640,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    IntroScene,
    MainMenuScene,
    MissionScene,
    GameScene,
    Room2Scene,
    TransitionScene,
  ]
};

new Phaser.Game(config);
