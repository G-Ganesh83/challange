/**
 * AudioButtons — two neon pixel-art icon buttons, top-right corner.
 * Ambient (music+rain) + SFX buttons. Tooltip on hover.
 * Persists across scenes via window._bgMuted / window._sfxMuted.
 */
export default class MuteButton {
  constructor(scene, opts = {}) {
    this._scene = scene;
    const baseX = opts.x ?? 916;
    const baseY = opts.y ?? 28;
    const depth  = opts.depth ?? 99;

    if (window._bgMuted  === undefined) window._bgMuted  = false;
    if (window._sfxMuted === undefined) window._sfxMuted = false;

    // Ambient at baseX - 46, SFX at baseX
    this._ambBtn = this._makeButton(baseX - 46, baseY, depth, '♪', '#00ffee', 'MUSIC', () => this._toggleAmbient());
    this._sfxBtn = this._makeButton(baseX,      baseY, depth, '◈', '#aa44ff', 'SFX',   () => this._toggleSfx());

    this._updateVisuals();
  }

  _makeButton(x, y, depth, iconChar, glowColor, tooltipText, onClick) {
    const scene = this._scene;
    const colorInt = Phaser.Display.Color.HexStringToColor(glowColor).color;

    // Outer glow ring graphics
    const ring = scene.add.graphics().setDepth(depth - 1);
    ring._drawRing = (active) => {
      ring.clear();
      if (active) {
        ring.lineStyle(1.5, colorInt, 0.45);
        ring.strokeCircle(x, y, 21);
        // Inner dot
        ring.fillStyle(colorInt, 0.08);
        ring.fillCircle(x, y, 19);
      }
    };

    // BG circle
    const bg = scene.add.circle(x, y, 17, 0x08051a, 0.9)
      .setStrokeStyle(1.5, colorInt, 0.6)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    // Icon text
    const icon = scene.add.text(x, y, iconChar, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px', color: glowColor
    }).setOrigin(0.5).setDepth(depth + 1);

    // ── Tooltip ──────────────────────────────────────────────
    const ttPad = 8;
    const ttBg = scene.add.graphics().setDepth(depth + 5).setAlpha(0);
    const ttText = scene.add.text(x, y - 36, tooltipText, {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px', color: glowColor, letterSpacing: 1
    }).setOrigin(0.5).setDepth(depth + 6).setAlpha(0);

    const showTip = () => {
      ttBg.clear();
      const tw = ttText.width + ttPad * 2;
      const th = ttText.height + ttPad;
      ttBg.fillStyle(0x08051a, 0.92);
      ttBg.fillRoundedRect(x - tw / 2, y - 44 - th / 2, tw, th, 4);
      ttBg.lineStyle(1, colorInt, 0.6);
      ttBg.strokeRoundedRect(x - tw / 2, y - 44 - th / 2, tw, th, 4);
      scene.tweens.add({ targets: [ttBg, ttText], alpha: 1, duration: 120 });
    };
    const hideTip = () => {
      scene.tweens.add({ targets: [ttBg, ttText], alpha: 0, duration: 120 });
    };

    // Hover
    bg.on('pointerover', () => {
      scene.tweens.add({ targets: [bg, icon], scaleX: 1.15, scaleY: 1.15, duration: 80, ease: 'Power2' });
      showTip();
    });
    bg.on('pointerout', () => {
      scene.tweens.add({ targets: [bg, icon], scaleX: 1, scaleY: 1, duration: 100, ease: 'Power2' });
      hideTip();
    });
    bg.on('pointerdown', () => {
      scene.tweens.add({ targets: [bg, icon], scaleX: 0.85, scaleY: 0.85, duration: 60,
        yoyo: true, ease: 'Power2' });
      hideTip();
      onClick();
    });

    return { bg, icon, ring, ttBg, ttText, x, y, glowColor, iconChar };
  }

  _updateVisuals() {
    const ambActive = !window._bgMuted;
    const sfxActive = !window._sfxMuted;

    // Ambient
    const ab = this._ambBtn;
    ab.ring._drawRing(ambActive);
    ab.icon.setAlpha(ambActive ? 1 : 0.3);
    ab.bg.setAlpha(ambActive ? 0.92 : 0.5);
    ab.icon.setText(window._bgMuted ? '♪̶' : '♪');
    ab.icon.setColor(window._bgMuted ? '#443355' : ab.glowColor);

    // SFX
    const sb = this._sfxBtn;
    sb.ring._drawRing(sfxActive);
    sb.icon.setAlpha(sfxActive ? 1 : 0.3);
    sb.bg.setAlpha(sfxActive ? 0.92 : 0.5);
    sb.icon.setText(window._sfxMuted ? '◇' : '◈');
    sb.icon.setColor(window._sfxMuted ? '#443355' : sb.glowColor);
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
    const scene = this._scene;
    const muted = window._bgMuted;
    const music = scene.sound.get('menu_music');
    if (music) music.setVolume(muted ? 0 : 0.26);
    const rain  = scene.sound.get('rain');
    if (rain)  rain.setVolume(muted ? 0 : 0.16);
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

  /** Call after starting bg sounds to sync current mute state */
  sync() {
    this._applyAmbient();
    this._applySfx();
    this._updateVisuals();
  }

  destroy() {
    [this._ambBtn, this._sfxBtn].forEach(b => {
      b.bg.destroy();
      b.icon.destroy();
      b.ring.destroy();
      b.ttBg.destroy();
      b.ttText.destroy();
    });
  }
}
