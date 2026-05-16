// MainMenuScene — fullscreen neon alley, no panel, floating UI
import MuteButton from './systems/MuteButton.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor('#03020a');

    // ── BG: cover fill entire canvas ─────────────────────────
    const bg = this.add.image(cx, H / 2, 'menu_bg').setDepth(0);
    const scaleH = H / 992;
    const scaleW = W / 1586;
    bg.setScale(Math.max(scaleH, scaleW)).setAlpha(1);

    // Slight overall darkening so text pops
    this.add.rectangle(cx, H / 2, W, H, 0x000000, 0.22).setDepth(1);

    // ── Neon flicker rectangles (multi-layer) ─────────────────
    // Primary full-screen flash
    const neonFlash = this.add.rectangle(cx, H / 2, W, H, 0x6600ff, 0).setDepth(3);
    this._neonFlash = neonFlash;
    // Secondary warm flicker (pink)
    const neonWarm  = this.add.rectangle(cx, H / 2, W, H, 0xff0066, 0).setDepth(3);
    this._neonWarm  = neonWarm;

    // ── Rain ─────────────────────────────────────────────────
    // Layer A — distant thin drops (background)
    const rainBg = this.add.graphics().setDepth(2).setAlpha(0.22);
    const dropsB = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 2.8 + Math.random() * 1.8, len: 5 + Math.random() * 5,
      alpha: 0.15 + Math.random() * 0.2,
    }));
    // Layer B — closer vivid drops (foreground)
    const rainFg = this.add.graphics().setDepth(5).setAlpha(0.55);
    const dropsF = Array.from({ length: 45 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 5 + Math.random() * 3, len: 8 + Math.random() * 10,
      alpha: 0.35 + Math.random() * 0.45,
    }));

    // ── Thief icon ────────────────────────────────────────────
    // Positioned above title area, gentle float
    const iconY = 118;
    const thief = this.add.image(cx, iconY, 'thief_idle_src')
      .setScale(0.07).setDepth(7).setAlpha(0.92);
    this.tweens.add({
      targets: thief, y: iconY - 6,
      duration: 1900, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Title ─────────────────────────────────────────────────
    const titleY = 194;

    // Drop shadow
    this.add.text(cx + 4, titleY + 4, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '76px', color: '#000000', stroke: '#000000', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(6).setAlpha(0.55);

    // Outer glow layer
    this.add.text(cx, titleY, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '76px', color: '#00ffee',
      stroke: '#00ffee', strokeThickness: 14,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 48, fill: true }
    }).setOrigin(0.5).setDepth(7).setAlpha(0.18);

    // Main title
    const title = this.add.text(cx, titleY, 'TINY THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '76px', color: '#e0ffff',
      stroke: '#cc00ff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#00eeff', blur: 24, fill: true }
    }).setOrigin(0.5).setDepth(8);

    // Breathe
    this.tweens.add({
      targets: title, alpha: { from: 1, to: 0.84 },
      duration: 2600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // Tagline
    this.add.text(cx, titleY + 52, '— S N E A K   ·   S T E A L   ·   S U R V I V E —', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px', color: '#7755bb', letterSpacing: 1,
      shadow: { offsetX: 0, offsetY: 0, color: '#aa66ff', blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(8);

    // Separator line
    const sep = this.add.graphics().setDepth(7);
    sep.lineStyle(1, 0x6600cc, 0.5);
    sep.lineBetween(cx - 140, titleY + 68, cx + 140, titleY + 68);

    this._setupTitleGlitch(title, cx);

    // ── Menu buttons ──────────────────────────────────────────
    const menuItems = [
      { label: 'PLAY',     y: 326, action: () => this._doPlayTransition() },
      { label: 'SETTINGS', y: 382, action: () => {} },
      { label: 'QUIT',     y: 438, action: () => this._doQuit() },
    ];

    this._activeIdx = -1;

    menuItems.forEach((item, i) => {
      const baseX  = cx;
      const arrowX = cx - 116;

      // Arrow
      const arrow = this.add.text(arrowX, item.y, '▶', {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px', color: '#00ffcc',
        shadow: { offsetX: 0, offsetY: 0, color: '#00ffcc', blur: 12, fill: true }
      }).setOrigin(0.5).setDepth(9).setAlpha(0);

      let arrowTween = null;

      // Button label
      const btn = this.add.text(baseX, item.y, item.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '26px', color: '#9988cc',
        stroke: '#000000', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });

      // Subtle underline line per button (hidden until hover)
      const uline = this.add.graphics().setDepth(8);

      btn.on('pointerover', () => {
        this._activeIdx = i;
        btn.setStyle({
          color: '#ffffff',
          stroke: '#000000', strokeThickness: 2,
          shadow: { offsetX: 0, offsetY: 0, color: '#ff00cc', blur: 22, fill: true }
        });
        this.tweens.add({ targets: btn, x: baseX + 14, duration: 70, ease: 'Power2' });
        this.tweens.add({ targets: arrow, alpha: 1, x: arrowX + 10, duration: 70 });

        if (!arrowTween) {
          arrowTween = this.tweens.add({
            targets: arrow, x: { from: arrowX + 10, to: arrowX + 22 },
            duration: 380, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
          });
        }

        uline.clear();
        uline.lineStyle(1, 0x00ffcc, 0.45);
        uline.lineBetween(baseX - 90, item.y + 16, baseX + 90, item.y + 16);

        try { this.sound.play('enter', { volume: 0.12 }); } catch(e) {}
      });

      btn.on('pointerout', () => {
        btn.setStyle({ color: '#9988cc', stroke: '#000000', strokeThickness: 1, shadow: undefined });
        this.tweens.add({ targets: btn, x: baseX, duration: 110, ease: 'Power2' });
        this.tweens.add({ targets: arrow, alpha: 0, x: arrowX, duration: 110 });
        if (arrowTween) { arrowTween.stop(); arrowTween = null; }
        uline.clear();
      });

      btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, alpha: 0.4, duration: 55, yoyo: true });
        item.action();
      });
    });

    // ── Scanlines ─────────────────────────────────────────────
    const sl = this.add.graphics().setDepth(20).setAlpha(0.055);
    for (let y = 0; y < H; y += 4) {
      sl.lineStyle(1, 0x000000, 1);
      sl.lineBetween(0, y, W, y);
    }

    // ── Audio ─────────────────────────────────────────────────
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

    // ── Mute button ───────────────────────────────────────────
    this._muteBtn = new MuteButton(this);
    this.time.delayedCall(80, () => this._muteBtn.sync());

    // ── Neon flicker scheduler ────────────────────────────────
    this._scheduleFlicker();

    // ── Update loop: rain ─────────────────────────────────────
    this.events.on('update', () => {
      // Background drops — thin, faint, pale blue
      rainBg.clear();
      dropsB.forEach(d => {
        d.y += d.speed; d.x -= 0.4;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        if (d.x < 0)  d.x = W;
        rainBg.lineStyle(1, 0xbbddff, d.alpha);
        rainBg.lineBetween(d.x, d.y, d.x - 1, d.y + d.len);
      });

      // Foreground drops — thicker, more visible, cyan tint
      rainFg.clear();
      dropsF.forEach(d => {
        d.y += d.speed; d.x -= 0.8;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        if (d.x < 0)  d.x = W;
        rainFg.lineStyle(1.5, 0x99eeff, d.alpha);
        rainFg.lineBetween(d.x, d.y, d.x - 1.5, d.y + d.len);
      });
    });

    // ── Fade in ───────────────────────────────────────────────
    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  _setupTitleGlitch(title, cx) {
    this.time.addEvent({
      delay: Phaser.Math.Between(3000, 5500),
      loop: true,
      callback: () => {
        if (Math.random() > 0.45) return;
        // Quick RGB split glitch
        const seq = [
          { ox: 4,  tint: 0x00ffff, dur: 35 },
          { ox: -4, tint: 0xff44ff, dur: 35 },
          { ox: 2,  tint: 0xffff44, dur: 25 },
          { ox: 0,  tint: 0xffffff, dur: 55 },
        ];
        let delay = 0;
        seq.forEach(s => {
          this.time.delayedCall(delay, () => {
            title.setX(cx + s.ox).setTint(s.tint);
          });
          delay += s.dur;
        });
      }
    });
  }

  _scheduleFlicker() {
    // Randomised multi-burst neon flicker
    const doFlicker = () => {
      const bursts = Math.floor(Math.random() * 3) + 1; // 1–3 quick pops
      let t = 0;
      for (let i = 0; i < bursts; i++) {
        this.time.delayedCall(t, () => {
          const warm = Math.random() > 0.6;
          const target = warm ? this._neonWarm : this._neonFlash;
          target.setAlpha(0);
          this.tweens.add({
            targets: target,
            alpha: { from: 0, to: warm ? 0.06 : 0.05 },
            duration: 40, yoyo: true,
            onComplete: () => {
              try { this.sound.play('neon_buzz', { volume: 0.05 }); } catch(e) {}
            }
          });
        });
        t += 90 + Math.random() * 60;
      }

      // Schedule next flicker cluster
      this.time.delayedCall(
        Phaser.Math.Between(3000, 7500),
        doFlicker
      );
    };

    this.time.delayedCall(Phaser.Math.Between(1500, 3500), doFlicker);
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
