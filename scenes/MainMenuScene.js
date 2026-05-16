// MainMenuScene — rainy neon alley, thief silhouette, PLAY/SETTINGS/QUIT
import MuteButton from './systems/MuteButton.js';
export default class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor('#0a0812');

    // ── Background ───────────────────────────────────────────
    const bg = this.add.image(cx, H / 2, 'menu_bg')
      .setDisplaySize(W, H).setDepth(0).setAlpha(0.92);

    // Dark overlay for contrast
    this.add.rectangle(cx, H / 2, W, H, 0x000000, 0.42).setDepth(1);

    // ── Rain particles ───────────────────────────────────────
    const rainGfx = this.add.graphics().setDepth(2).setAlpha(0.35);
    const rainDrops = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 3 + Math.random() * 4,
      len: 6 + Math.random() * 10,
    }));

    // ── Neon flicker overlay ─────────────────────────────────
    const neonOverlay = this.add.rectangle(cx, H / 2, W, H, 0x4400aa, 0).setDepth(3);

    // ── Thief silhouette ─────────────────────────────────────
    // Use existing thief_idle_src, tint dark for silhouette
    const thief = this.add.image(200, 420, 'thief_idle_src')
      .setScale(1.8).setTint(0x110022).setDepth(4).setAlpha(0.85);

    // Breathing bob
    this.tweens.add({
      targets: thief, y: 424, duration: 1800,
      ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Title text ───────────────────────────────────────────
    const titleShadow = this.add.text(cx + 3, 148, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '72px',
      color: '#000000',
      stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(5).setAlpha(0.6);

    const title = this.add.text(cx, 145, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '72px',
      color: '#ffffff',
      stroke: '#8800ff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#aa44ff', blur: 28, fill: true }
    }).setOrigin(0.5).setDepth(6);

    const tagline = this.add.text(cx, 210, 'sneak · steal · survive', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#8866cc',
      letterSpacing: 4
    }).setOrigin(0.5).setDepth(6);

    // Title pulse
    this.tweens.add({
      targets: [title, titleShadow],
      alpha: { from: 1, to: 0.82 },
      duration: 2200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Menu buttons ─────────────────────────────────────────
    const menuItems = [
      { label: 'PLAY',     y: 340, key: 'play' },
      { label: 'SETTINGS', y: 405, key: 'settings' },
      { label: 'QUIT',     y: 470, key: 'quit' },
    ];

    const buttonStyle = {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      color: '#aabbcc',
      stroke: '#334455',
      strokeThickness: 1,
    };

    const buttons = menuItems.map(item => {
      const btn = this.add.text(cx, item.y, `> ${item.label}`, buttonStyle)
        .setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => {
        btn.setStyle({ color: '#00ffee', stroke: '#006655', strokeThickness: 2,
          shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 12, fill: true } });
        this.tweens.add({ targets: btn, x: cx + 6, duration: 80, ease: 'Power2' });
        try { this.sound.play('enter', { volume: 0.2 }); } catch(e) {}
      });

      btn.on('pointerout', () => {
        btn.setStyle({ ...buttonStyle });
        this.tweens.add({ targets: btn, x: cx, duration: 100, ease: 'Power2' });
      });

      btn.on('pointerdown', () => this._onMenuClick(item.key));

      return btn;
    });

    // ── Audio ────────────────────────────────────────────────
    // Music (persist across scenes via AudioManager pattern)
    if (!this.sound.get('menu_music')) {
      const music = this.sound.add('menu_music', { loop: true, volume: 0 });
      music.play();
      this.tweens.add({ targets: music, volume: 0.28, duration: 2000 });
    } else {
      const m = this.sound.get('menu_music');
      if (!m.isPlaying) m.play();
    }

    try {
      const rain = this.sound.add('rain', { loop: true, volume: 0.18 });
      rain.play();
      this._rainSound = rain;
    } catch(e) {}

    // Sync mute state to freshly-started sounds
    this.time.delayedCall(50, () => { if (this._muteBtn) this._muteBtn.sync(); });

    // Occasional neon flicker
    this.time.addEvent({
      delay: Phaser.Math.Between(3000, 6000),
      loop: true,
      callback: () => {
        this.tweens.add({
          targets: neonOverlay, alpha: { from: 0, to: 0.06 },
          duration: 60, yoyo: true,
          onComplete: () => {
            try { this.sound.play('neon_buzz', { volume: 0.08 }); } catch(e) {}
          }
        });
      }
    });

    // ── Rain update ──────────────────────────────────────────
    this.events.on('update', () => {
      rainGfx.clear();
      rainGfx.lineStyle(1, 0xaaddff, 0.5);
      rainDrops.forEach(d => {
        d.y += d.speed;
        d.x -= 0.5;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        if (d.x < 0) { d.x = W; }
        rainGfx.lineBetween(d.x, d.y, d.x - 1, d.y + d.len);
      });
    });

    // ── Mute button ──────────────────────────────────────────
    this._muteBtn = new MuteButton(this);

    // ── Fade in ──────────────────────────────────────────────
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _onMenuClick(key) {
    if (key === 'play') {
      this._doPlayTransition();
    } else if (key === 'settings') {
      // settings stub — could open overlay in future
    } else if (key === 'quit') {
      // In browser, just go back to menu (no real quit)
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.restart();
      });
    }
  }

  _doPlayTransition() {
    // Stop interactions
    this.input.enabled = false;

    // Muffle music
    const music = this.sound.get('menu_music');
    if (music) this.tweens.add({ targets: music, volume: 0.1, duration: 1200 });

    // Rain slightly louder
    if (this._rainSound) this.tweens.add({ targets: this._rainSound, volume: 0.32, duration: 800 });

    // Flash neon overlay then fade to MissionScene
    this.time.delayedCall(800, () => {
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // Stop rain in this scene — MissionScene will manage its own
        if (this._rainSound) this._rainSound.stop();
        this.scene.start('MissionScene');
      });
    });
  }
}
