/**
 * AudioButtons — two neon pixel-art icon buttons, top-right corner.
 *
 * Button 1 (AMBIENT):  controls music + rain. Icon = neon speaker/wave.
 * Button 2 (SFX):      controls fahh, footstep, pickup, etc. Icon = EQ bars.
 *
 * Global state on window._bgMuted / window._sfxMuted persists across scenes.
 *
 * Usage:
 *   import MuteButton from './systems/MuteButton.js';
 *   this._muteBtn = new MuteButton(scene);
 *   // after starting sounds:
 *   this._muteBtn.sync();
 */
export default class MuteButton {
  constructor(scene, opts = {}) {
    this._scene = scene;
    const baseX = opts.x ?? 910;
    const baseY = opts.y ?? 28;
    const depth = opts.depth ?? 99;

    if (window._bgMuted  === undefined) window._bgMuted  = false;
    if (window._sfxMuted === undefined) window._sfxMuted = false;

    // Ambient button at baseX, SFX button 46px to the left
    this._ambBtn = this._makeButton(baseX - 46, baseY, depth, '🔊', '#00ffee', () => this._toggleAmbient());
    this._sfxBtn = this._makeButton(baseX,      baseY, depth, '🎚', '#aa44ff', () => this._toggleSfx());

    this._updateVisuals();
  }

  _makeButton(x, y, depth, iconChar, glowColor, onClick) {
    const scene = this._scene;

    // Outer glow ring
    const ring = scene.add.graphics().setDepth(depth - 1);
    ring._draw = (active) => {
      ring.clear();
      if (active) {
        ring.lineStyle(2, Phaser.Display.Color.HexStringToColor(glowColor).color, 0.5);
        ring.strokeCircle(x, y, 20);
      }
    };

    // BG circle
    const bg = scene.add.circle(x, y, 17, 0x0a0618, 0.85)
      .setStrokeStyle(1.5, Phaser.Display.Color.HexStringToColor(glowColor).color, 0.7)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    // Icon
    const icon = scene.add.text(x, y, iconChar, {
      fontFamily: 'Arial', fontSize: '15px'
    }).setOrigin(0.5).setDepth(depth + 1);

    // Hover
    bg.on('pointerover', () => {
      scene.tweens.add({ targets: [bg, icon], scaleX: 1.15, scaleY: 1.15, duration: 80, ease: 'Power2' });
    });
    bg.on('pointerout', () => {
      scene.tweens.add({ targets: [bg, icon], scaleX: 1, scaleY: 1, duration: 100, ease: 'Power2' });
    });
    bg.on('pointerdown', () => {
      scene.tweens.add({ targets: [bg, icon], scaleX: 0.88, scaleY: 0.88, duration: 60,
        yoyo: true, ease: 'Power2' });
      onClick();
    });

    return { bg, icon, ring, x, y, glowColor };
  }

  _updateVisuals() {
    const ambActive  = !window._bgMuted;
    const sfxActive  = !window._sfxMuted;

    // Ambient button
    const ab = this._ambBtn;
    ab.ring._draw(ambActive);
    ab.icon.setAlpha(ambActive ? 1 : 0.35);
    ab.bg.setAlpha(ambActive ? 0.9 : 0.55);
    ab.icon.setText(window._bgMuted  ? '🔇' : '🔊');

    // SFX button
    const sb = this._sfxBtn;
    sb.ring._draw(sfxActive);
    sb.icon.setAlpha(sfxActive ? 1 : 0.35);
    sb.bg.setAlpha(sfxActive ? 0.9 : 0.55);
    sb.icon.setText(window._sfxMuted ? '📵' : '🎚');
  }

  _toggleAmbient() {
    window._bgMuted = !window._bgMuted;
    this._applyAmbient();
    this._updateVisuals();
  }

  _toggleSfx() {
    window._sfxMuted = !window._sfxMuted;
    this._applySfx();
    this._updateVisuals();
  }

  _applyAmbient() {
    const scene  = this._scene;
    const muted  = window._bgMuted;
    const music  = scene.sound.get('menu_music');
    if (music) music.setVolume(muted ? 0 : 0.28);
    const rain   = scene.sound.get('rain');
    if (rain)  rain.setVolume(muted ? 0 : 0.18);
  }

  _applySfx() {
    const scene = this._scene;
    const muted = window._sfxMuted;
    const SFX_KEYS = ['fahh','footstep','pickup','enter','out','safe','success','coreTransition','neon_buzz','door_unlock'];
    SFX_KEYS.forEach(k => {
      const s = scene.sound.get(k);
      if (s) s.setVolume(muted ? 0 : (s._baseVol ?? s.volume));
    });
  }

  /** Call after starting bg sounds to apply current mute state */
  sync() {
    this._applyAmbient();
    this._applySfx();
    this._updateVisuals();
  }

  destroy() {
    [this._ambBtn, this._sfxBtn].forEach(b => {
      b.bg.destroy(); b.icon.destroy(); b.ring.destroy();
    });
  }
}
