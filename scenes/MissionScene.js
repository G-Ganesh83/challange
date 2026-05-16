// MissionScene — stylish mission briefing card, SPACE to begin heist
import MuteButton from './systems/MuteButton.js';
export default class MissionScene extends Phaser.Scene {
  constructor() { super('MissionScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2, cy = H / 2;

    this.cameras.main.setBackgroundColor('#060410');

    // ── Dark BG with subtle city glow ────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x0a0618, 1).setDepth(0);

    // Radial glow center
    const glowCircle = this.add.circle(cx, cy, 280, 0x6600cc, 0.07).setDepth(1);
    this.tweens.add({
      targets: glowCircle, scaleX: 1.12, scaleY: 1.12,
      duration: 2400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // Floating particles
    const pts = Array.from({ length: 30 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.5,
      r: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.5
    }));
    const ptGfx = this.add.graphics().setDepth(2);

    // Scanlines
    const sl = this.add.graphics().setDepth(20).setAlpha(0.07);
    for (let y = 0; y < H; y += 4) {
      sl.lineStyle(1, 0x000000, 1);
      sl.lineBetween(0, y, W, y);
    }

    // ── Mission card ─────────────────────────────────────────
    const cardW = 500, cardH = 360;
    const cardX = cx - cardW / 2, cardY = cy - cardH / 2;

    // Card border glow
    const cardGlow = this.add.rectangle(cx, cy, cardW + 10, cardH + 10, 0x8800ff, 0.22).setDepth(3);
    this.tweens.add({
      targets: cardGlow, alpha: { from: 0.22, to: 0.48 },
      duration: 1600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    this.add.rectangle(cx, cy, cardW, cardH, 0x0d0820, 0.97).setDepth(4);
    // Top accent line
    this.add.rectangle(cx, cardY + 2, cardW, 2, 0x8800ff, 1).setDepth(5);
    this.add.rectangle(cx, cardY + cardH - 2, cardW, 2, 0x00ffee, 0.6).setDepth(5);
    // Side accent lines
    this.add.rectangle(cardX + 2, cy, 2, cardH - 4, 0x440066, 0.5).setDepth(5);
    this.add.rectangle(cardX + cardW - 2, cy, 2, cardH - 4, 0x440066, 0.5).setDepth(5);

    // Corner decorations
    const cornerGfx = this.add.graphics().setDepth(5);
    const corners = [
      [cardX + 1, cardY + 1], [cardX + cardW - 1, cardY + 1],
      [cardX + 1, cardY + cardH - 1], [cardX + cardW - 1, cardY + cardH - 1]
    ];
    corners.forEach(([x, y]) => {
      cornerGfx.fillStyle(0xaa44ff, 0.8);
      cornerGfx.fillRect(x - 3, y - 3, 6, 6);
    });

    // Header
    this.add.text(cx, cardY + 28, '── MISSION BRIEFING ──', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px', color: '#6644aa', letterSpacing: 3
    }).setOrigin(0.5).setDepth(6);

    this.add.text(cx, cardY + 60, 'NIGHT 1', {
      fontFamily: '"Courier New", monospace',
      fontSize: '40px', color: '#ffffff',
      stroke: '#8800ff', strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#aa44ff', blur: 22, fill: true }
    }).setOrigin(0.5).setDepth(6);

    // Divider with diamonds
    this.add.rectangle(cx, cardY + 94, cardW - 60, 1, 0x442266, 1).setDepth(6);
    this.add.text(cx, cardY + 90, '◆', {
      fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#6600cc'
    }).setOrigin(0.5).setDepth(6);

    // Data rows
    const rows = [
      { label: 'TARGET',       value: 'Apartment 01',  color: '#ffffff' },
      { label: 'LOOT',         value: '3 ITEMS',        color: '#ffdd44' },
      { label: 'OWNER STATUS', value: 'Sleeping  \u{1F4A4}', color: '#44ffaa' },
      { label: 'TIME LIMIT',   value: '90 SECONDS',     color: '#ff6644' },
    ];

    rows.forEach((row, i) => {
      const rowY = cardY + 118 + i * 48;
      // Row separator
      if (i > 0) {
        this.add.rectangle(cx, rowY - 6, cardW - 80, 1, 0x221133, 0.6).setDepth(6);
      }
      this.add.text(cardX + 54, rowY, row.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px', color: '#554488', letterSpacing: 2
      }).setDepth(6);
      this.add.text(cardX + 54, rowY + 18, row.value, {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px', color: row.color,
        shadow: { offsetX: 0, offsetY: 0, color: row.color, blur: 8, fill: true }
      }).setDepth(6);
    });

    // ── Press SPACE key visual ────────────────────────────────
    const keyY = cardY + cardH + 48;

    // Keyboard key frame
    const keyW = 92, keyH = 34;
    const keyBg = this.add.graphics().setDepth(7);
    keyBg.fillStyle(0x1a0d36, 0.95);
    keyBg.fillRoundedRect(cx - keyW / 2, keyY - keyH / 2, keyW, keyH, 6);
    keyBg.lineStyle(2, 0x8800ff, 0.9);
    keyBg.strokeRoundedRect(cx - keyW / 2, keyY - keyH / 2, keyW, keyH, 6);
    // Key bottom shadow (3D effect)
    keyBg.lineStyle(3, 0x440066, 0.6);
    keyBg.lineBetween(cx - keyW / 2 + 4, keyY + keyH / 2 + 2, cx + keyW / 2 - 4, keyY + keyH / 2 + 2);

    this.add.text(cx, keyY, 'SPACE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px', color: '#ddccff',
      shadow: { offsetX: 0, offsetY: 0, color: '#8800ff', blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(8);

    // "to begin" label
    const promptLabel = this.add.text(cx, keyY + 30, 'to begin the heist', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px', color: '#665588', letterSpacing: 2
    }).setOrigin(0.5).setDepth(7);

    // Key press pulse animation
    this.tweens.add({
      targets: [keyBg, promptLabel], alpha: { from: 1, to: 0.35 },
      duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // Key shadow bob
    this.tweens.add({
      targets: keyBg, y: { from: 0, to: 2 },
      duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Soft music continuation ──────────────────────────────
    const music = this.sound.get('menu_music');
    if (music && music.isPlaying) {
      this.tweens.add({ targets: music, volume: 0.15, duration: 600 });
    }

    // ── Mute button ──────────────────────────────────────────
    this._muteBtn = new MuteButton(this);

    // ── Input ────────────────────────────────────────────────
    this._ready = false;
    this.input.keyboard.once('keydown-SPACE', () => this._startHeist());
    this.input.once('pointerdown', () => this._startHeist());

    // ── Particle + fade in ───────────────────────────────────
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // ── Update loop ──────────────────────────────────────────
    this.events.on('update', () => {
      ptGfx.clear();
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 5; p.x = Math.random() * W; }
        ptGfx.fillStyle(0xaa44ff, p.alpha * 0.6);
        ptGfx.fillCircle(p.x, p.y, p.r);
      });
    });
  }

  _startHeist() {
    if (this._ready) return;
    this._ready = true;

    try { this.sound.play('door_unlock', { volume: 0.6 }); } catch(e) {}

    const music = this.sound.get('menu_music');
    if (music) this.tweens.add({ targets: music, volume: 0, duration: 1000 });

    this.time.delayedCall(400, () => {
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (music) music.stop();
        this.scene.start('GameScene');
      });
    });
  }
}
