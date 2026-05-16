/**
 * MuteButton — toggles background music + rain only.
 * SFX (fahh, footstep, pickup, etc.) are never touched.
 *
 * Usage:
 *   import MuteButton from './systems/MuteButton.js';
 *   // in create():
 *   this._muteBtn = new MuteButton(this);
 *
 * Global state stored on window._bgMuted so it survives scene switches.
 */
export default class MuteButton {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   * @param {number} [opts.x=928]   right edge x
   * @param {number} [opts.y=24]    top y
   * @param {number} [opts.depth=99]
   */
  constructor(scene, opts = {}) {
    this._scene = scene;
    const x     = opts.x     ?? 928;
    const y     = opts.y     ?? 24;
    const depth = opts.depth ?? 99;

    if (window._bgMuted === undefined) window._bgMuted = false;

    // Button circle BG
    this._bg = scene.add.circle(x, y, 18, 0x000000, 0.55)
      .setDepth(depth).setInteractive({ useHandCursor: true });

    // Icon text: 🔊 / 🔇
    this._icon = scene.add.text(x, y, this._label(), {
      fontFamily: 'Arial', fontSize: '16px'
    }).setOrigin(0.5).setDepth(depth + 1);

    // Border
    this._border = scene.add.circle(x, y, 18)
      .setStrokeStyle(1, 0x8866cc, 0.7).setDepth(depth);

    // Hover
    this._bg.on('pointerover', () => {
      this._bg.setFillStyle(0x330055, 0.75);
    });
    this._bg.on('pointerout', () => {
      this._bg.setFillStyle(0x000000, 0.55);
    });
    this._bg.on('pointerdown', () => this._toggle());

    // Sync to current state immediately
    this._apply();
  }

  _label() {
    return window._bgMuted ? '🔇' : '🔊';
  }

  _toggle() {
    window._bgMuted = !window._bgMuted;
    this._icon.setText(this._label());
    this._apply();
  }

  _apply() {
    const scene = this._scene;
    const muted = window._bgMuted;

    // music
    const music = scene.sound.get('menu_music');
    if (music) {
      muted ? music.setVolume(0) : music.setVolume(0.28);
    }

    // rain (may be keyed differently per scene)
    ['rain'].forEach(key => {
      const snd = scene.sound.get(key);
      if (snd) {
        muted ? snd.setVolume(0) : snd.setVolume(0.18);
      }
    });
  }

  /** Call this after adding/starting background sounds so volumes sync */
  sync() { this._apply(); }

  destroy() {
    this._bg.destroy();
    this._icon.destroy();
    this._border.destroy();
  }
}
