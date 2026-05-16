// MainMenuScene — fullscreen neon alley, no panel, floating UI
import MuteButton    from './systems/MuteButton.js';
import AM            from './systems/AudioManager.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2;

    this.input.enabled = true;
    this.cameras.main.resetFX();
    document.body.classList.remove('hud-visible');
    document.body.classList.add('hud-hidden');
    document.getElementById('end-screen')?.classList.add('hidden');
    document.getElementById('message-toast')?.classList.add('hidden');

    this.cameras.main.setBackgroundColor('#03020a');

    // ── Init audio manager ────────────────────────────────────
    AM.init(this);

    // ── BG: cover fill entire canvas ─────────────────────────
    const bg = this.add.image(cx, H / 2, 'menu_bg').setDepth(0);
    const scaleH = H / 992;
    const scaleW = W / 1586;
    bg.setScale(Math.max(scaleH, scaleW)).setAlpha(1);

    // Slight overall darkening so text pops
    this.add.rectangle(cx, H / 2, W, H, 0x000000, 0.22).setDepth(1);

    // ── Neon flicker rectangles ───────────────────────────────
    const neonFlash = this.add.rectangle(cx, H / 2, W, H, 0x6600ff, 0).setDepth(3);
    this._neonFlash = neonFlash;
    const neonWarm  = this.add.rectangle(cx, H / 2, W, H, 0xff0066, 0).setDepth(3);
    this._neonWarm  = neonWarm;

    // ── Rain ─────────────────────────────────────────────────
    const rainBg = this.add.graphics().setDepth(2).setAlpha(0.22);
    const dropsB = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 2.8 + Math.random() * 1.8, len: 5 + Math.random() * 5,
      alpha: 0.15 + Math.random() * 0.2,
    }));
    const rainFg = this.add.graphics().setDepth(5).setAlpha(0.55);
    const dropsF = Array.from({ length: 45 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 5 + Math.random() * 3, len: 8 + Math.random() * 10,
      alpha: 0.35 + Math.random() * 0.45,
    }));

    // ── Title ─────────────────────────────────────────────────
    const titleY = 194;

    // Drop shadow
    this.add.text(cx + 4, titleY + 4, 'TINY THIEF', {
      fontFamily: '"Rajdhani", "Arial Black", Arial, sans-serif',
      fontSize: '88px', color: '#000000', stroke: '#000000', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(6).setAlpha(0.55);

    // Outer glow
    this.add.text(cx, titleY, 'TINY THIEF', {
      fontFamily: '"Rajdhani", "Arial Black", Arial, sans-serif',
      fontSize: '88px', color: '#00ffee',
      stroke: '#00ffee', strokeThickness: 14,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 48, fill: true }
    }).setOrigin(0.5).setDepth(7).setAlpha(0.18);

    // Main title
    const title = this.add.text(cx, titleY, 'TINY THIEF', {
      fontFamily: '"Rajdhani", "Arial Black", Arial, sans-serif',
      fontSize: '88px', color: '#e0ffff',
      stroke: '#cc00ff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#00eeff', blur: 24, fill: true }
    }).setOrigin(0.5).setDepth(8);

    this.tweens.add({
      targets: title, alpha: { from: 1, to: 0.84 },
      duration: 2600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // Tagline
    this.add.text(cx, titleY + 68, 'SNEAK · STEAL · SURVIVE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px', color: '#ddccff',
    }).setOrigin(0.5).setDepth(8);

    // Separator
    const sep = this.add.graphics().setDepth(7);
    sep.lineStyle(1, 0x6600cc, 0.5);
    sep.lineBetween(cx - 140, titleY + 86, cx + 140, titleY + 86);

    this._setupTitleGlitch(title, cx);

    // ── Menu buttons ──────────────────────────────────────────
    const menuItems = [
      { label: 'PLAY',     y: 326, action: () => this._doPlayTransition() },
      { label: 'SETTINGS', y: 382, action: () => {} },
      { label: 'QUIT',     y: 438, action: () => this._doQuit() },
    ];

    this._activeIdx = -1;

    menuItems.forEach((item) => {
      const baseX  = cx;
      const arrowX = cx - 116;

      const arrow = this.add.text(arrowX, item.y, '▶', {
        fontFamily: '"Rajdhani", Arial, sans-serif',
        fontSize: '14px', color: '#00ffcc',
        shadow: { offsetX: 0, offsetY: 0, color: '#00ffcc', blur: 12, fill: true }
      }).setOrigin(0.5).setDepth(9).setAlpha(0);

      let arrowTween = null;

      const btn = this.add.text(baseX, item.y, item.label, {
        fontFamily: '"Rajdhani", Arial, sans-serif',
        fontStyle: 'normal',
        fontSize: '26px', color: '#e0d8ff',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });

      const uline = this.add.graphics().setDepth(8);

      btn.on('pointerover', () => {
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
        uline.lineStyle(1, 0x00ffcc, 0.4);
        uline.lineBetween(baseX - 90, item.y + 16, baseX + 90, item.y + 16);
        AM.playSfx(this, 'enter', { volume: 0.12 });
      });

      btn.on('pointerout', () => {
        btn.setStyle({ color: '#e0d8ff', stroke: '#000000', strokeThickness: 2, shadow: undefined });
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

    // ── Auto-start ambient (music + rain fade in) ─────────────
    AM.startAmbientWhenReady(this);

    // ── Mute buttons ─────────────────────────────────────────
    this._muteBtn = new MuteButton(this);
    this.time.delayedCall(80, () => this._muteBtn.sync());

    // ── Neon flicker ──────────────────────────────────────────
    this._scheduleFlicker();

    // ── Rain update ───────────────────────────────────────────
    this.events.on('update', () => {
      rainBg.clear();
      dropsB.forEach(d => {
        d.y += d.speed; d.x -= 0.4;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        if (d.x < 0)  d.x = W;
        rainBg.lineStyle(1, 0xbbddff, d.alpha);
        rainBg.lineBetween(d.x, d.y, d.x - 1, d.y + d.len);
      });
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
    const doFlicker = () => {
      const bursts = Math.floor(Math.random() * 3) + 1;
      let t = 0;
      for (let i = 0; i < bursts; i++) {
        this.time.delayedCall(t, () => {
          const warm   = Math.random() > 0.6;
          const target = warm ? this._neonWarm : this._neonFlash;
          target.setAlpha(0);
          this.tweens.add({
            targets: target, alpha: { from: 0, to: warm ? 0.06 : 0.05 },
            duration: 40, yoyo: true,
            onComplete: () => AM.playSfx(this, 'neon_buzz', { volume: 0.05 })
          });
        });
        t += 90 + Math.random() * 60;
      }
      this.time.delayedCall(Phaser.Math.Between(3000, 7500), doFlicker);
    };
    this.time.delayedCall(Phaser.Math.Between(1500, 3500), doFlicker);
  }

  _doPlayTransition() {
    this.input.enabled = false;
    // Duck ambient — it will continue into MissionScene
    AM.duckAmbient(this, 0.13, 800);
    this.time.delayedCall(700, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MissionScene');
      });
    });
  }

  _doQuit() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
  }
}
