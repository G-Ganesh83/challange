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
    // TEMP DEV START: put Room2 first so refresh loads Room 2 directly.
    // Move Room2Scene back below GameScene to restore the normal intro flow.
    Room2Scene,
    BootScene,
    IntroScene,
    MainMenuScene,
    MissionScene,
    GameScene,
    TransitionScene,
  ]
};

const game = new Phaser.Game(config);

// ── Global audio unlock ──────────────────────────────────────
// Browsers block audio until a user gesture. This catches ANY
// interaction (tap, click, key, scroll) and resumes the audio
// context immediately — so music starts as soon as the user
// touches anything on the page.
(function setupAudioUnlock() {
  const events = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'];
  function unlock() {
    // Resume Phaser's WebAudio context
    try {
      const ctx = game.sound && game.sound.context;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          window._audioUnlocked = true;
          // Tell AudioManager to start ambient if it hasn't yet
          if (window._AM && !window._AM._started) {
            const scene = game.scene.getScenes(true)[0];
            if (scene) {
              window._AM._started = true;
              window._AM._persist && window._AM._persist();
              window._AM._startTrack(scene, 'menu_music', 0.26, 1800);
              window._AM._startTrack(scene, 'rain',       0.16, 1400);
            }
          }
        });
      } else if (ctx && ctx.state === 'running') {
        window._audioUnlocked = true;
        if (window._AM && !window._AM._started) {
          const scene = game.scene.getScenes(true)[0];
          if (scene) {
            window._AM._started = true;
            window._AM._persist && window._AM._persist();
            window._AM._startTrack(scene, 'menu_music', 0.26, 1800);
            window._AM._startTrack(scene, 'rain',       0.16, 1400);
          }
        }
      }
    } catch(e) {}
    // Remove all listeners once unlocked
    events.forEach(e => document.removeEventListener(e, unlock, true));
  }
  events.forEach(e => document.addEventListener(e, unlock, true));
})();
