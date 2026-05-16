// MainMenuScene — polished fullscreen rainy neon alley, cinematic thief, PLAY/SETTINGS/QUIT
import MuteButton from './systems/MuteButton.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor('#06040f');

    // ── Layer 1: Background image ────────────────────────────
    // Image is 1586×992, canvas 960×640 (ratio ~1.65 vs 1.5)
    // Scale to fill height (992→640 = 0.645x → width becomes 1022px)
    // then crop centered — shows the full street scene
    const bg = this.add.image(cx, H / 2, 'menu_bg').setDepth(0);
    const scaleH = H / 992;      // fill height
    const scaleW = W / 1586;     // fill width
    const bgScale = Math.max(scaleH, scaleW) * 1.01; // tiny overscan, no gaps
    bg.setScale(bgScale).setAlpha(1);

    // ── Layer 2: Very subtle top vignette (preserve sky) ─────
    const topFade = this.add.graphics().setDepth(1);
    topFade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    topFade.fillRect(0, 0, W, H * 0.22);

    // Bottom darkening — just enough to anchor the ground
    const ground = this.add.graphics().setDepth(1);
    ground.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
    ground.fillRect(0, H * 0.72, W, H * 0.28);

    // Left edge darkening — blends menu text panel area
    const leftFade = this.add.graphics().setDepth(1);
    leftFade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0, 0.45, 0);
    leftFade.fillRect(W * 0.4, 0, W * 0.6, H);

    // ── Layer 3: Neon flicker overlay (purple tint, matches image) ──
    const neonFlash = this.add.rectangle(cx, H / 2, W, H, 0x3300aa, 0).setDepth(3);
    this._neonFlash = neonFlash;

    // ── Layer 4: Light rain overlay (image already has rain,
    //    just add sparse fast drops for life) ─────────────────
    const rainGfx = this.add.graphics().setDepth(4).setAlpha(0.18);
    const rainDrops = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 3.5 + Math.random() * 2.5,
      len:   6   + Math.random() * 7,
      alpha: 0.25 + Math.random() * 0.4,
    }));

    // ── Layer 5: Title ───────────────────────────────────────
    // Positioned right-of-center to avoid the thief in the image
    const titleGlow = this.add.rectangle(cx + 80, 148, 440, 80, 0x330066, 0.18).setDepth(6);
    this.tweens.add({
      targets: titleGlow, alpha: { from: 0.08, to: 0.18 },
      duration: 2000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    const TX = cx + 80; // title X — right side avoids the thief figure

    // Shadow copy
    this.add.text(TX + 4, 153, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '74px', color: '#000000',
      stroke: '#000000', strokeThickness: 10
    }).setOrigin(0.5).setDepth(6).setAlpha(0.7);

    // Main title — matches the pink/magenta neon of "HOTEL" sign in image
    const title = this.add.text(TX, 149, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '74px', color: '#ffffff',
      stroke: '#cc00aa', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff44cc', blur: 28, fill: true }
    }).setOrigin(0.5).setDepth(7);

    // Tagline — teal, matches the hotel/open-24h signs
    this.add.text(TX, 212, 'SNEAK  ·  STEAL  ·  SURVIVE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px', color: '#00ccaa', letterSpacing: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffcc', blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(7);

    this.tweens.add({
      targets: title, alpha: { from: 1, to: 0.85 },
      duration: 2400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });
    this._setupTitleGlitch(title, TX);

    // ── Layer 6: Menu buttons — right side ───────────────────
    const MX = TX; // menu center X aligned with title
    const menuItems = [
      { label: 'PLAY',     y: 320, action: () => this._doPlayTransition() },
      { label: 'SETTINGS', y: 378, action: () => {} },
      { label: 'QUIT',     y: 436, action: () => this._doQuit() },
    ];

    this._activeIdx = -1;

    menuItems.forEach((item, i) => {
      // Arrow indicator — teal to match sign palette
      const arrow = this.add.text(MX - 128, item.y, '>', {
        fontFamily: '"Courier New", monospace',
        fontSize: '22px', color: '#00ffcc',
        shadow: { offsetX: 0, offsetY: 0, color: '#00ffcc', blur: 10, fill: true }
      }).setOrigin(0.5).setDepth(8).setAlpha(0);

      let arrowTween = null;

      const btn = this.add.text(MX, item.y, item.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '26px', color: '#aa99cc',
        stroke: '#110022', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(8).setInteractive({ useHandCursor: true });

      const tick = this.add.graphics().setDepth(7);

      btn.on('pointerover', () => {
        this._activeIdx = i;
        btn.setStyle({
          color: '#ffffff',
          shadow: { offsetX: 0, offsetY: 0, color: '#ff44cc', blur: 14, fill: true }
        });
        this.tweens.add({ targets: btn, x: MX + 10, duration: 80, ease: 'Power2' });
        this.tweens.add({ targets: arrow, alpha: 1, x: MX - 118, duration: 80 });

        if (!arrowTween) {
          arrowTween = this.tweens.add({
            targets: arrow, x: { from: MX - 118, to: MX - 108 },
            duration: 420, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
          });
        }

        tick.clear();
        tick.lineStyle(1, 0x00ccaa, 0.7);
        tick.lineBetween(MX - 145, item.y - 14, MX - 145, item.y + 14);

        try { this.sound.play('enter', { volume: 0.12 }); } catch(e) {}
      });

      btn.on('pointerout', () => {
        btn.setStyle({ color: '#aa99cc', shadow: undefined });
        this.tweens.add({ targets: btn, x: MX, duration: 120, ease: 'Power2' });
        this.tweens.add({ targets: arrow, alpha: 0, x: MX - 128, duration: 120 });
        if (arrowTween) { arrowTween.stop(); arrowTween = null; }
        tick.clear();
      });

      btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, alpha: 0.5, duration: 60, yoyo: true });
        item.action();
      });
    });

    // ── Layer 9: Scanlines ───────────────────────────────────
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

    // ── Rain overlay update ───────────────────────────────────
    this.events.on('update', () => {
      rainGfx.clear();
      rainDrops.forEach(d => {
        d.y += d.speed; d.x -= 0.6;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        if (d.x < 0)  d.x = W;
        rainGfx.lineStyle(1, 0xaaddff, d.alpha * 0.45);
        rainGfx.lineBetween(d.x, d.y, d.x - 1, d.y + d.len);
      });
    });

    // ── Fade in ──────────────────────────────────────────────
    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  _setupTitleGlitch(title, tx) {
    this.time.addEvent({
      delay: Phaser.Math.Between(3500, 6000),
      loop: true,
      callback: () => {
        if (Math.random() > 0.4) return;
        const seq = [
          { x: tx + 3, tint: 0xff88ff, dur: 40 },
          { x: tx - 3, tint: 0x88ffff, dur: 40 },
          { x: tx,     tint: 0xf0eeff, dur: 60 },
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
        this._neonFlash.setFillStyle(0x3300aa);
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
