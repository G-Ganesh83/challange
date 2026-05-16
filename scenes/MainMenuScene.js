// MainMenuScene — polished rainy neon alley, cinematic thief, PLAY/SETTINGS/QUIT
import MuteButton from './systems/MuteButton.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor('#070510');

    // ── Layer 1: Background image ────────────────────────────
    this.add.image(cx, H / 2, 'menu_bg')
      .setDisplaySize(W, H).setDepth(0).setAlpha(0.88);

    // ── Layer 2: Dark atmosphere gradient ────────────────────
    // Bottom darkening — anchors the ground
    const ground = this.add.graphics().setDepth(1);
    ground.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.75, 0.75);
    ground.fillRect(0, H * 0.55, W, H * 0.45);

    // Top fade
    const topFade = this.add.graphics().setDepth(1);
    topFade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    topFade.fillRect(0, 0, W, H * 0.35);

    // ── Layer 3: Fog / depth layers ──────────────────────────
    const fog1 = this.add.rectangle(cx, H * 0.72, W, 180, 0x1a0d2e, 0.38).setDepth(2);
    const fog2 = this.add.rectangle(cx, H * 0.88, W, 120, 0x0a0618, 0.55).setDepth(2);
    // Fog drift
    this.tweens.add({ targets: fog1, x: cx + 12, duration: 5000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    this.tweens.add({ targets: fog2, x: cx - 8,  duration: 7000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    // ── Layer 4: Neon flicker overlay ────────────────────────
    const neonFlash = this.add.rectangle(cx, H / 2, W, H, 0x6600cc, 0).setDepth(3);
    this._neonFlash = neonFlash;

    // ── Layer 5: Rain ────────────────────────────────────────
    const rainGfx = this.add.graphics().setDepth(4).setAlpha(0.28);
    const rainDrops = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 2.5 + Math.random() * 3,
      len:   5   + Math.random() * 8,
      alpha: 0.3 + Math.random() * 0.5,
    }));

    // ── Layer 6: Thief silhouette ────────────────────────────
    const thief = this.add.image(175, 445, 'thief_idle_src')
      .setScale(2.0).setTint(0x080410).setDepth(5).setAlpha(0.9);

    // Rim-light edge (separate faint copy, slightly offset, tinted purple)
    const thiefRim = this.add.image(173, 443, 'thief_idle_src')
      .setScale(2.0).setTint(0x4400aa).setDepth(4).setAlpha(0.25);

    // Breathing bob
    this.tweens.add({
      targets: [thief, thiefRim], y: '+=5',
      duration: 2000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });
    // Subtle lean
    this.tweens.add({
      targets: [thief, thiefRim], angle: { from: -1, to: 1 },
      duration: 3200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // Shadow puddle under thief
    this.add.ellipse(175, 480, 90, 20, 0x000000, 0.35).setDepth(4);

    // ── Layer 7: Title ───────────────────────────────────────
    // Glow halo behind title
    const titleGlow = this.add.rectangle(cx, 148, 440, 80, 0x8800ff, 0.08).setDepth(6);
    this.tweens.add({
      targets: titleGlow, alpha: { from: 0.08, to: 0.18 },
      duration: 2000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // Shadow copy
    this.add.text(cx + 4, 153, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '74px', color: '#000000',
      stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5).setDepth(6).setAlpha(0.5);

    // Main title
    const title = this.add.text(cx, 149, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '74px', color: '#f0eeff',
      stroke: '#6600cc', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#bb66ff', blur: 32, fill: true }
    }).setOrigin(0.5).setDepth(7);

    // Tagline
    const tagline = this.add.text(cx, 210, 's n e a k  ·  s t e a l  ·  s u r v i v e', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px', color: '#7755aa', letterSpacing: 1
    }).setOrigin(0.5).setDepth(7);

    // Title pulse + RGB glitch
    this.tweens.add({
      targets: title, alpha: { from: 1, to: 0.88 },
      duration: 2400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });
    this._setupTitleGlitch(title);

    // ── Layer 8: Menu buttons ────────────────────────────────
    const menuItems = [
      { label: 'PLAY',     y: 320 },
      { label: 'SETTINGS', y: 378 },
      { label: 'QUIT',     y: 436 },
    ];

    menuItems.forEach((item, i) => {
      const btn = this.add.text(cx, item.y, item.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '26px', color: '#9988bb',
        stroke: '#220033', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(8).setInteractive({ useHandCursor: true });

      // Indicator dash
      const dash = this.add.text(cx - 110, item.y, '—', {
        fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#550088'
      }).setOrigin(0.5).setDepth(8).setAlpha(0);

      btn.on('pointerover', () => {
        btn.setStyle({
          color: '#ddccff',
          shadow: { offsetX: 0, offsetY: 0, color: '#bb66ff', blur: 14, fill: true }
        });
        this.tweens.add({ targets: btn, x: cx + 8, duration: 90, ease: 'Power2' });
        this.tweens.add({ targets: dash, alpha: 1, x: cx - 102, duration: 90 });
        try { this.sound.play('enter', { volume: 0.12 }); } catch(e) {}
      });

      btn.on('pointerout', () => {
        btn.setStyle({ color: '#9988bb', shadow: undefined });
        this.tweens.add({ targets: btn, x: cx, duration: 120, ease: 'Power2' });
        this.tweens.add({ targets: dash, alpha: 0, x: cx - 110, duration: 120 });
      });

      btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, alpha: 0.5, duration: 60, yoyo: true });
        if (item.label === 'PLAY')     this._doPlayTransition();
        if (item.label === 'QUIT')     this._doQuit();
      });
    });

    // ── Layer 9: Scanlines (subtle) ──────────────────────────
    const sl = this.add.graphics().setDepth(20).setAlpha(0.07);
    for (let y = 0; y < H; y += 4) {
      sl.lineStyle(1, 0x000000, 1);
      sl.lineBetween(0, y, W, y);
    }

    // ── Audio ────────────────────────────────────────────────
    if (!this.sound.get('menu_music')) {
      const music = this.sound.add('menu_music', { loop: true, volume: 0 });
      music.play();
      this.tweens.add({ targets: music, volume: 0.26, duration: 2200 });
    } else {
      const m = this.sound.get('menu_music');
      if (!m.isPlaying) { m.setVolume(0); m.play(); this.tweens.add({ targets: m, volume: 0.26, duration: 1500 }); }
    }

    try {
      if (!this.sound.get('rain')) {
        const rain = this.sound.add('rain', { loop: true, volume: 0 });
        rain.play();
        this.tweens.add({ targets: rain, volume: 0.16, duration: 1800 });
        this._rainSound = rain;
      } else {
        const r = this.sound.get('rain');
        if (!r.isPlaying) { r.setVolume(0); r.play(); this.tweens.add({ targets: r, volume: 0.16, duration: 1800 }); }
        this._rainSound = r;
      }
    } catch(e) {}

    // ── Audio buttons ────────────────────────────────────────
    this._muteBtn = new MuteButton(this);
    this.time.delayedCall(80, () => this._muteBtn.sync());

    // ── Occasional neon flicker ──────────────────────────────
    this._scheduleFlicker();

    // ── Rain update ──────────────────────────────────────────
    this.events.on('update', () => {
      rainGfx.clear();
      rainDrops.forEach(d => {
        d.y += d.speed; d.x -= 0.5;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        if (d.x < 0)  d.x = W;
        rainGfx.lineStyle(1, 0xaaddff, d.alpha * 0.55);
        rainGfx.lineBetween(d.x, d.y, d.x - 1, d.y + d.len);
      });
    });

    // ── Fade in ──────────────────────────────────────────────
    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  _setupTitleGlitch(title) {
    const cx = 480;
    // Occasional RGB glitch shift
    this.time.addEvent({
      delay: Phaser.Math.Between(3500, 6000),
      loop: true,
      callback: () => {
        if (Math.random() > 0.4) return;
        const seq = [
          { x: cx + 3, tint: 0xff88ff, dur: 40 },
          { x: cx - 3, tint: 0x88ffff, dur: 40 },
          { x: cx,     tint: 0xf0eeff, dur: 60 },
        ];
        let delay = 0;
        seq.forEach(s => {
          this.time.delayedCall(delay, () => {
            title.setX(s.x);
            title.setTint(s.tint);
          });
          delay += s.dur;
        });
      }
    });
  }

  _scheduleFlicker() {
    this.time.addEvent({
      delay: Phaser.Math.Between(4000, 8000),
      loop: true,
      callback: () => {
        this.tweens.add({
          targets: this._neonFlash, alpha: { from: 0, to: 0.04 },
          duration: 50, yoyo: true,
          onComplete: () => {
            try { this.sound.play('neon_buzz', { volume: 0.06 }); } catch(e) {}
          }
        });
      }
    });
  }

  _doPlayTransition() {
    this.input.enabled = false;

    const music = this.sound.get('menu_music');
    if (music) this.tweens.add({ targets: music, volume: 0.08, duration: 1000 });
    if (this._rainSound) this.tweens.add({ targets: this._rainSound, volume: 0.28, duration: 700 });

    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (this._rainSound) this._rainSound.stop();
        this.scene.start('MissionScene');
      });
    });
  }

  _doQuit() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
  }
}
