// MainMenuScene — fullscreen pixel art neon alley, centered menu
import MuteButton from './systems/MuteButton.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor('#03020a');

    // ── BG: cover fill entire canvas ──────────────────────────
    const bg = this.add.image(cx, H / 2, 'menu_bg').setDepth(0);
    const scaleH = H / 992;
    const scaleW = W / 1586;
    bg.setScale(Math.max(scaleH, scaleW)).setAlpha(1);

    // ── Slight global darkening to make text pop ──────────────
    this.add.rectangle(cx, H / 2, W, H, 0x000000, 0.28).setDepth(1);

    // ── Dark panel behind menu (center) ──────────────────────
    const panelW = 380, panelH = 380;
    const panelY = H / 2 + 20;
    const panel = this.add.graphics().setDepth(2);
    panel.fillStyle(0x050210, 0.72);
    panel.fillRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 8);
    // Neon border
    panel.lineStyle(1.5, 0x6600cc, 0.7);
    panel.strokeRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 8);

    // Panel pulse
    this.tweens.add({
      targets: panel, alpha: { from: 0.9, to: 1.0 },
      duration: 2000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Neon flicker overlay ──────────────────────────────────
    const neonFlash = this.add.rectangle(cx, H / 2, W, H, 0x3300aa, 0).setDepth(3);
    this._neonFlash = neonFlash;

    // ── Light rain drops ─────────────────────────────────────
    const rainGfx = this.add.graphics().setDepth(4).setAlpha(0.18);
    const rainDrops = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 3.5 + Math.random() * 2.5,
      len:   6   + Math.random() * 7,
      alpha: 0.25 + Math.random() * 0.4,
    }));

    // ── Thief icon above title ────────────────────────────────
    const iconY = panelY - panelH / 2 - 18;
    const thief = this.add.image(cx, iconY, 'thief_idle_src')
      .setScale(0.075)
      .setDepth(6)
      .setAlpha(0.95);

    // Subtle bob
    this.tweens.add({
      targets: thief, y: iconY - 5,
      duration: 1800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Title: TINY THIEF (two lines) ─────────────────────────
    const titleTop = panelY - panelH / 2 + 32;

    // Shadow
    this.add.text(cx + 3, titleTop + 3, 'TINY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '72px', color: '#000000',
      stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5).setDepth(6).setAlpha(0.6);

    this.add.text(cx + 3, titleTop + 76, 'THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '72px', color: '#000000',
      stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5).setDepth(6).setAlpha(0.6);

    // Main title lines — cyan neon matching reference
    const titleLine1 = this.add.text(cx, titleTop, 'TINY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '72px', color: '#00e5ff',
      stroke: '#cc00ff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 32, fill: true }
    }).setOrigin(0.5).setDepth(7);

    const titleLine2 = this.add.text(cx, titleTop + 76, 'THIEF', {
      fontFamily: '"Courier New", monospace',
      fontSize: '72px', color: '#00e5ff',
      stroke: '#cc00ff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 32, fill: true }
    }).setOrigin(0.5).setDepth(7);

    // Tagline
    this.add.text(cx, titleTop + 152, 'SNEAK  ·  STEAL  ·  SURVIVE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px', color: '#aa88ff', letterSpacing: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#cc88ff', blur: 6, fill: true }
    }).setOrigin(0.5).setDepth(7);

    // Title breathe
    this.tweens.add({
      targets: [titleLine1, titleLine2], alpha: { from: 1, to: 0.82 },
      duration: 2400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    this._setupTitleGlitch(titleLine1, titleLine2, cx);

    // ── Menu buttons ──────────────────────────────────────────
    const menuItems = [
      { label: 'PLAY',     y: panelY + 44,  action: () => this._doPlayTransition() },
      { label: 'SETTINGS', y: panelY + 102, action: () => {} },
      { label: 'QUIT',     y: panelY + 160, action: () => this._doQuit() },
    ];

    this._activeIdx = -1;

    menuItems.forEach((item, i) => {
      const arrowX = cx - 112;

      const arrow = this.add.text(arrowX, item.y, '>', {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px', color: '#00e5ff',
        shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 10, fill: true }
      }).setOrigin(0.5).setDepth(8).setAlpha(0);

      let arrowTween = null;

      const btn = this.add.text(cx, item.y, item.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '24px', color: '#b899ee',
        stroke: '#110022', strokeThickness: 1,
      }).setOrigin(0.5).setDepth(8).setInteractive({ useHandCursor: true });

      const tick = this.add.graphics().setDepth(7);

      btn.on('pointerover', () => {
        this._activeIdx = i;
        btn.setStyle({
          color: '#ffffff',
          shadow: { offsetX: 0, offsetY: 0, color: '#cc00ff', blur: 18, fill: true }
        });
        this.tweens.add({ targets: btn, x: cx + 12, duration: 80, ease: 'Power2' });
        this.tweens.add({ targets: arrow, alpha: 1, x: arrowX + 10, duration: 80 });

        if (!arrowTween) {
          arrowTween = this.tweens.add({
            targets: arrow, x: { from: arrowX + 10, to: arrowX + 20 },
            duration: 400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
          });
        }

        tick.clear();
        tick.lineStyle(1.5, 0x00cccc, 0.6);
        tick.lineBetween(cx - 140, item.y - 12, cx - 140, item.y + 12);

        try { this.sound.play('enter', { volume: 0.12 }); } catch(e) {}
      });

      btn.on('pointerout', () => {
        btn.setStyle({ color: '#b899ee', shadow: undefined });
        this.tweens.add({ targets: btn, x: cx, duration: 120, ease: 'Power2' });
        this.tweens.add({ targets: arrow, alpha: 0, x: arrowX, duration: 120 });
        if (arrowTween) { arrowTween.stop(); arrowTween = null; }
        tick.clear();
      });

      btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, alpha: 0.5, duration: 60, yoyo: true });
        item.action();
      });
    });

    // ── Scanlines ─────────────────────────────────────────────
    const sl = this.add.graphics().setDepth(20).setAlpha(0.06);
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

    // ── Neon flicker ──────────────────────────────────────────
    this._scheduleFlicker();

    // ── Rain update ───────────────────────────────────────────
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

    // ── Fade in ───────────────────────────────────────────────
    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  _setupTitleGlitch(line1, line2, cx) {
    this.time.addEvent({
      delay: Phaser.Math.Between(3500, 6000),
      loop: true,
      callback: () => {
        if (Math.random() > 0.4) return;
        const seq = [
          { ox: 3, tint: 0x88ffff, dur: 40 },
          { ox: -3, tint: 0xff88ff, dur: 40 },
          { ox: 0,  tint: 0xffffff, dur: 60 },
        ];
        let delay = 0;
        seq.forEach(s => {
          this.time.delayedCall(delay, () => {
            line1.setX(cx + s.ox).setTint(s.tint);
            line2.setX(cx + s.ox).setTint(s.tint);
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
