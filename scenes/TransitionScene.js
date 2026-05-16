// TransitionScene — cinematic room-complete transition between rooms
// Launched with data: { from: 'Room1'|'Room2', to: 'Room2Scene'|..., night: 2 }
export default class TransitionScene extends Phaser.Scene {
  constructor() { super('TransitionScene'); }

  init(data) {
    this._nextScene = data.nextScene || 'Room2Scene';
    this._night     = data.night     || 2;
    this._lootCount = data.lootCount || 0;
  }

  create() {
    const W = 960, H = 640;
    const cx = W / 2, cy = H / 2;

    this.cameras.main.setBackgroundColor('#000000');

    // ── Scrolling neon city silhouette ───────────────────────
    const cityColors = [0x8800ff, 0x0088ff, 0x00ffcc];

    // Draw simple pixel city skyline
    const city = this.add.graphics().setDepth(1).setAlpha(0.5);
    const buildingData = [
      {x:0,   w:80,  h:200}, {x:90,  w:60,  h:150}, {x:160, w:100, h:260},
      {x:270, w:70,  h:180}, {x:350, w:90,  h:220}, {x:450, w:65,  h:160},
      {x:525, w:110, h:280}, {x:645, w:75,  h:195}, {x:730, w:85,  h:240},
      {x:825, w:70,  h:170}, {x:905, w:100, h:210},
    ];
    // Draw buildings twice side by side for scroll
    const drawCity = (offsetX) => {
      buildingData.forEach((b, i) => {
        city.fillStyle(cityColors[i % cityColors.length], 0.15);
        city.fillRect(b.x + offsetX, H - b.h, b.w - 4, b.h);
        // Windows
        city.fillStyle(0xffff88, 0.25);
        for (let wy = H - b.h + 20; wy < H - 20; wy += 28) {
          for (let wx = b.x + offsetX + 10; wx < b.x + offsetX + b.w - 14; wx += 18) {
            if (Math.random() > 0.4) city.fillRect(wx, wy, 8, 12);
          }
        }
      });
    };
    drawCity(0);
    drawCity(W);

    // Scroll city
    let cityScrollX = 0;
    this.events.on('update', (t, dt) => {
      cityScrollX -= dt * 0.12;
      if (cityScrollX < -W) cityScrollX += W;
      city.clear();
      drawCity(cityScrollX);
      drawCity(cityScrollX + W);
    });

    // ── Scooter / thief silhouette moving across ─────────────
    const scooter = this.add.text(0, H - 120, '🛵', {
      fontSize: '40px'
    }).setDepth(3);

    this.tweens.add({
      targets: scooter, x: W + 60, duration: 2800,
      ease: 'Cubic.easeIn', delay: 500
    });

    // Thief riding
    const rider = this.add.image(60, H - 135, 'thief_walk_1_src')
      .setScale(1.2).setTint(0x110022).setDepth(4);
    this.tweens.add({
      targets: rider, x: W + 80, duration: 2800,
      ease: 'Cubic.easeIn', delay: 500
    });

    // ── Night text ───────────────────────────────────────────
    const nightText = this.add.text(cx, cy - 40, `NIGHT ${this._night}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '64px', color: '#ffffff',
      stroke: '#8800ff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#aa44ff', blur: 24, fill: true }
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    const subLine = this.add.text(cx, cy + 30, 'New target located...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px', color: '#8866cc',
      letterSpacing: 3
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    const lootLine = this._lootCount > 0
      ? this.add.text(cx, cy + 68, `Loot collected: ${this._lootCount} items`, {
          fontFamily: '"Courier New", monospace',
          fontSize: '14px', color: '#ffdd44'
        }).setOrigin(0.5).setDepth(5).setAlpha(0)
      : null;

    // Fade in text
    this.tweens.add({ targets: nightText, alpha: 1, duration: 500, delay: 300 });
    this.tweens.add({ targets: subLine,   alpha: 1, duration: 500, delay: 700 });
    if (lootLine) this.tweens.add({ targets: lootLine, alpha: 1, duration: 400, delay: 1000 });

    // Scanlines
    const sl = this.add.graphics().setDepth(10);
    for (let y = 0; y < H; y += 4) {
      sl.lineStyle(1, 0x000000, 0.14);
      sl.lineBetween(0, y, W, y);
    }

    // ── Rain particles ───────────────────────────────────────
    const rainGfx = this.add.graphics().setDepth(2).setAlpha(0.25);
    const rainDrops = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 4 + Math.random() * 3, len: 8 + Math.random() * 8,
    }));
    this.events.on('update', () => {
      rainGfx.clear();
      rainGfx.lineStyle(1, 0xaaddff, 0.5);
      rainDrops.forEach(d => {
        d.y += d.speed; d.x -= 0.6;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        rainGfx.lineBetween(d.x, d.y, d.x - 1, d.y + d.len);
      });
    });

    // ── Transition to next scene ─────────────────────────────
    this.time.delayedCall(3200, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(this._nextScene);
      });
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}
