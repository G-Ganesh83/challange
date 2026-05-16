// MissionScene — cinematic HOW TO PLAY briefing screen
import MuteButton from './systems/MuteButton.js';
import AM         from './systems/AudioManager.js';

export default class MissionScene extends Phaser.Scene {
  constructor() { super('MissionScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2, cy = H / 2;

    this.input.enabled = true;
    this.cameras.main.resetFX();
    document.body.classList.remove('hud-visible');
    document.body.classList.add('hud-hidden');
    document.getElementById('end-screen')?.classList.add('hidden');
    document.getElementById('message-toast')?.classList.add('hidden');

    this.cameras.main.setBackgroundColor('#05040f');

    // ── Background ────────────────────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x05040f, 1).setDepth(0);

    // Subtle radial fog center
    const fog = this.add.circle(cx, cy + 40, 360, 0x0a0030, 0.45).setDepth(1);
    this.tweens.add({
      targets: fog, scaleX: 1.08, scaleY: 1.06,
      duration: 3800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Rain ──────────────────────────────────────────────────
    const rainDrops = Array.from({ length: 55 }, () => this._makeRainDrop(W, H, true));
    const rainGfx   = this.add.graphics().setDepth(2).setAlpha(0.22);

    // ── Glassmorphism card ────────────────────────────────────
    const cardW = 700, cardH = 510;
    const cardX = cx - cardW / 2, cardY = cy - cardH / 2 - 4;

    // Outer glow border (pulsing)
    const cardGlow = this.add.graphics().setDepth(3);
    this._drawRoundRect(cardGlow, cardX - 3, cardY - 3, cardW + 6, cardH + 6, 18, 0x8800ff, 0.0, 0x7700ee, 0.55);
    this.tweens.add({
      targets: cardGlow, alpha: { from: 0.7, to: 1 },
      duration: 2000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // Card body — dark semi-transparent glass
    const cardBg = this.add.graphics().setDepth(4);
    this._drawRoundRect(cardBg, cardX, cardY, cardW, cardH, 16, 0x0c0820, 0.94, null, 0);

    // Inner top cyan accent line
    const accentTop = this.add.graphics().setDepth(5);
    accentTop.lineStyle(1, 0x00eeff, 0.35);
    accentTop.strokeRoundedRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 15);

    // ── HOW TO PLAY title ─────────────────────────────────────
    this.add.text(cx, cardY + 38, 'HOW TO PLAY', {
      fontFamily: '"Poppins", "Rajdhani", Arial, sans-serif',
      fontSize: '30px', fontStyle: 'bold',
      color: '#cc88ff',
      shadow: { offsetX: 0, offsetY: 0, color: '#8800ff', blur: 22, fill: true }
    }).setOrigin(0.5).setDepth(6);

    // Divider
    const divGfx = this.add.graphics().setDepth(6);
    divGfx.lineStyle(1, 0x5500aa, 0.7);
    divGfx.lineBetween(cardX + 60, cardY + 62, cardX + cardW - 60, cardY + 62);
    divGfx.fillStyle(0x9944ff, 1);
    divGfx.fillRect(cx - 3, cardY + 59, 6, 6); // center diamond

    // ── Two column layout ─────────────────────────────────────
    const colL = cardX + 44;
    const colR = cx + 20;
    let yL = cardY + 82;
    let yR = cardY + 82;

    // ── LEFT COLUMN ───────────────────────────────────────────

    // OBJECTIVE
    yL = this._section(colL, yL, 'OBJECTIVE',
      'Collect all 4 loot items\nand escape without getting caught.\nThe owner wakes up if you make too much noise.',
      0x00eeff, 6);

    yL += 14;

    // CONTROLS
    this._sectionLabel(colL, yL, 'CONTROLS', 0x00eeff, 6);
    yL += 22;
    yL = this._drawControls(colL, yL);

    yL += 14;

    // GAME RULES
    yL = this._section(colL, yL, 'GAME RULES', null, 0x00eeff, 6, [
      'Making noise increases suspicion.',
      'Running creates more noise.',
      'If suspicion maxes, owner wakes up.',
      'Hide in wardrobes / safe zones.',
      'Escape after collecting all loot.',
    ]);

    // ── RIGHT COLUMN ──────────────────────────────────────────

    // WIN CONDITION
    yR = this._section(colR, yR, 'WIN CONDITION',
      'Collect all loot and reach\nthe exit door safely.',
      0xaa44ff, 6);

    yR += 14;

    // SOUND & AUDIO
    yR = this._section(colR, yR, 'SOUND & AUDIO',
      'Rain and music create the atmosphere.\nUse the top-right audio buttons anytime.\n🎵 = ambient   🔊 = sound effects',
      0xaa44ff, 6);

    yR += 8;
    this.add.text(colR, yR, '🎧 Best experienced with headphones', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '11px', fontStyle: 'italic',
      color: '#443366',
    }).setDepth(6);

    // ── CONTINUE BUTTON ───────────────────────────────────────
    const btnY = cardY + cardH - 42;
    const btnW = 220, btnH = 38;

    const btnGfx = this.add.graphics().setDepth(7);
    this._drawRoundRect(btnGfx, cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 10, 0x1a0840, 0.92, 0x8800ff, 0.85);

    const btnText = this.add.text(cx, btnY, 'PRESS SPACE TO START', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '13px', fontStyle: 'bold',
      color: '#ddbbff',
      shadow: { offsetX: 0, offsetY: 0, color: '#8800ff', blur: 10, fill: true }
    }).setOrigin(0.5).setDepth(8);

    this.add.text(cx, btnY + 26, 'Begin the heist', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '11px', fontStyle: 'italic',
      color: '#554477',
    }).setOrigin(0.5).setDepth(8);

    // Pulse
    this.tweens.add({
      targets: [btnGfx, btnText], alpha: { from: 1, to: 0.45 },
      duration: 900, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Audio ─────────────────────────────────────────────────
    AM.init(this);
    AM.sync(this);
    AM.raiseAmbient(this, 600);

    this._muteBtn = new MuteButton(this);
    this.time.delayedCall(80, () => this._muteBtn.sync());

    // ── Input ─────────────────────────────────────────────────
    this._ready = false;
    this.input.keyboard.once('keydown-SPACE', () => this._startHeist());
    this.input.once('pointerdown', (ptr) => {
      // Only trigger if not clicking mute buttons
      if (ptr.y < 50) return;
      this._startHeist();
    });

    // ── Fade in ───────────────────────────────────────────────
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // ── Update — rain ─────────────────────────────────────────
    this.events.on('update', () => {
      rainGfx.clear();
      rainGfx.lineStyle(1, 0x6688cc, 1);
      rainDrops.forEach(d => {
        d.y += d.speed;
        if (d.y > H + 20) { d.y = -20; d.x = Math.random() * W; }
        rainGfx.lineBetween(d.x, d.y, d.x + d.drift, d.y + d.len);
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  _makeRainDrop(W, H, randomY = false) {
    return {
      x:     Math.random() * W,
      y:     randomY ? Math.random() * H : -20,
      speed: 3.5 + Math.random() * 3,
      len:   9 + Math.random() * 10,
      drift: 0.5 + Math.random() * 1,
    };
  }

  _drawRoundRect(gfx, x, y, w, h, r, fillColor, fillAlpha, strokeColor, strokeAlpha) {
    if (fillAlpha > 0) {
      gfx.fillStyle(fillColor, fillAlpha);
      gfx.fillRoundedRect(x, y, w, h, r);
    }
    if (strokeColor && strokeAlpha > 0) {
      gfx.lineStyle(2, strokeColor, strokeAlpha);
      gfx.strokeRoundedRect(x, y, w, h, r);
    }
  }

  _sectionLabel(x, y, label, color, depth) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    this.add.text(x, y, label, {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '12px', fontStyle: 'bold',
      color: hex,
      shadow: { offsetX: 0, offsetY: 0, color: hex, blur: 8, fill: true }
    }).setDepth(depth);
    return y + 18;
  }

  _section(x, y, label, body, color, depth, bullets = null) {
    y = this._sectionLabel(x, y, label, color, depth);
    if (body) {
      this.add.text(x, y, body, {
        fontFamily: '"Poppins", Arial, sans-serif',
        fontSize: '11px', color: '#aaa8cc',
        wordWrap: { width: 290 }, lineSpacing: 4,
      }).setDepth(depth);
      const lines = body.split('\n').length;
      y += lines * 16 + 10;
    }
    if (bullets) {
      bullets.forEach(b => {
        this.add.text(x, y, '· ' + b, {
          fontFamily: '"Poppins", Arial, sans-serif',
          fontSize: '11px', color: '#9988bb',
          wordWrap: { width: 290 },
        }).setDepth(depth);
        y += 16;
      });
      y += 6;
    }
    return y;
  }

  _drawControls(x, y) {
    const keys = [
      { keys: ['W'], label: null },
      { keys: ['A', 'S', 'D'], label: 'Move' },
      { keys: ['SHIFT'], label: 'Run (more noise)' },
      { keys: ['E'], label: 'Interact / Pickup / Hide' },
    ];

    const keyH = 20, keyPad = 5;
    const keyColor = 0x1a0840;
    const keyBorder = 0x6622cc;
    const gfx = this.add.graphics().setDepth(6);

    // WASD group
    const wasdRows = [['W'], ['A', 'S', 'D']];
    let ky = y;
    wasdRows.forEach((row, ri) => {
      let kx = x + (ri === 0 ? 22 : 0); // indent W
      row.forEach(k => {
        const kw = k === 'SHIFT' ? 52 : (k.length > 1 ? 40 : 22);
        gfx.fillStyle(keyColor, 0.95);
        gfx.fillRoundedRect(kx, ky, kw, keyH, 4);
        gfx.lineStyle(1.5, keyBorder, 0.85);
        gfx.strokeRoundedRect(kx, ky, kw, keyH, 4);
        this.add.text(kx + kw / 2, ky + keyH / 2, k, {
          fontFamily: '"Poppins", Arial, sans-serif',
          fontSize: '10px', fontStyle: 'bold', color: '#ccbbee',
        }).setOrigin(0.5).setDepth(7);
        kx += kw + keyPad;
      });
      ky += keyH + keyPad;
    });
    // Move label
    this.add.text(x + 72, y + 8, 'Move', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '11px', color: '#9988bb',
    }).setDepth(6);

    ky += 4;

    // SHIFT row
    const shiftKw = 52;
    gfx.fillStyle(keyColor, 0.95);
    gfx.fillRoundedRect(x, ky, shiftKw, keyH, 4);
    gfx.lineStyle(1.5, keyBorder, 0.85);
    gfx.strokeRoundedRect(x, ky, shiftKw, keyH, 4);
    this.add.text(x + shiftKw / 2, ky + keyH / 2, 'SHIFT', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '9px', fontStyle: 'bold', color: '#ccbbee',
    }).setOrigin(0.5).setDepth(7);
    this.add.text(x + shiftKw + 8, ky + keyH / 2, 'Run (more noise)', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '11px', color: '#9988bb',
    }).setOrigin(0, 0.5).setDepth(6);
    ky += keyH + keyPad + 4;

    // E row
    const ekw = 22;
    gfx.fillStyle(keyColor, 0.95);
    gfx.fillRoundedRect(x, ky, ekw, keyH, 4);
    gfx.lineStyle(1.5, keyBorder, 0.85);
    gfx.strokeRoundedRect(x, ky, ekw, keyH, 4);
    this.add.text(x + ekw / 2, ky + keyH / 2, 'E', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '10px', fontStyle: 'bold', color: '#ccbbee',
    }).setOrigin(0.5).setDepth(7);
    this.add.text(x + ekw + 8, ky + keyH / 2, 'Interact / Hide', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '11px', color: '#9988bb',
    }).setOrigin(0, 0.5).setDepth(6);
    ky += keyH + 6;

    return ky;
  }

  _startHeist() {
    if (this._ready) return;
    this._ready = true;
    AM.playSfx(this, 'door_unlock', { volume: 0.6 });
    this.time.delayedCall(300, () => {
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene');
      });
    });
  }
}
