// MissionScene — stylish mission briefing card, SPACE to begin heist
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

    // ── Mission card ─────────────────────────────────────────
    // Card background
    const cardW = 480, cardH = 340;
    const cardX = cx - cardW / 2, cardY = cy - cardH / 2;

    // Card border glow
    const cardGlow = this.add.rectangle(cx, cy, cardW + 8, cardH + 8, 0x8800ff, 0.25).setDepth(3);
    this.tweens.add({
      targets: cardGlow, alpha: { from: 0.25, to: 0.5 },
      duration: 1600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    this.add.rectangle(cx, cy, cardW, cardH, 0x0d0820, 0.97).setDepth(4);
    // Top accent line
    this.add.rectangle(cx, cardY + 2, cardW, 2, 0x8800ff, 1).setDepth(5);
    this.add.rectangle(cx, cardY + cardH - 2, cardW, 2, 0x00ffee, 0.6).setDepth(5);

    // Header
    this.add.text(cx, cardY + 28, '── MISSION BRIEFING ──', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px', color: '#6644aa', letterSpacing: 3
    }).setOrigin(0.5).setDepth(6);

    this.add.text(cx, cardY + 56, 'NIGHT 1', {
      fontFamily: '"Courier New", monospace',
      fontSize: '36px', color: '#ffffff',
      stroke: '#8800ff', strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#aa44ff', blur: 18, fill: true }
    }).setOrigin(0.5).setDepth(6);

    // Divider
    this.add.rectangle(cx, cardY + 88, cardW - 60, 1, 0x442266, 1).setDepth(6);

    // Data rows
    const rows = [
      { label: 'TARGET',        value: 'Apartment 01',   color: '#ffffff' },
      { label: 'LOOT',          value: '3 ITEMS',         color: '#ffdd44' },
      { label: 'OWNER STATUS',  value: 'Sleeping  💤',    color: '#44ffaa' },
      { label: 'TIME LIMIT',    value: '90 SECONDS',      color: '#ff6644' },
    ];

    rows.forEach((row, i) => {
      const rowY = cardY + 118 + i * 46;
      this.add.text(cardX + 50, rowY, row.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px', color: '#554488', letterSpacing: 2
      }).setDepth(6);
      this.add.text(cardX + 50, rowY + 18, row.value, {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px', color: row.color,
        shadow: { offsetX: 0, offsetY: 0, color: row.color, blur: 8, fill: true }
      }).setDepth(6);
    });

    // ── Prompt ───────────────────────────────────────────────
    const prompt = this.add.text(cx, cardY + cardH + 44, 'Press SPACE to begin the heist', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px', color: '#00ffee',
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 12, fill: true }
    }).setOrigin(0.5).setDepth(6);

    this.tweens.add({
      targets: prompt, alpha: { from: 1, to: 0.2 },
      duration: 900, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Soft music continuation ──────────────────────────────
    const music = this.sound.get('menu_music');
    if (music && music.isPlaying) {
      this.tweens.add({ targets: music, volume: 0.15, duration: 600 });
    }

    // ── Input ────────────────────────────────────────────────
    this._ready = false;
    this.input.keyboard.once('keydown-SPACE', () => this._startHeist());

    // Also support click/tap
    this.input.once('pointerdown', () => this._startHeist());

    // ── Particle + card fade-in ──────────────────────────────
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Slide card in from below
    const cardObjects = [cardGlow];
    this.add.tween = undefined; // dummy

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
