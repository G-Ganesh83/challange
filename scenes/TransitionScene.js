// TransitionScene — cinematic room-complete transition between rooms
// Launched with data: { nextScene, night, lootCount }
export default class TransitionScene extends Phaser.Scene {
  constructor() { super('TransitionScene'); }

  init(data) {
    this._nextScene = data.nextScene || 'Room2Scene';
    this._night     = data.night     || 2;
    this._lootCount = data.lootCount || 0;
  }

  create() {
    document.body.classList.remove('hud-visible');
    document.body.classList.add('hud-hidden');

    const W = 960, H = 640;
    const cx = W / 2, cy = H / 2;

    this.cameras.main.setBackgroundColor('#000000');

    // ── Stars ────────────────────────────────────────────────
    const starGfx = this.add.graphics().setDepth(0);
    const starData = Array.from({ length: 100 }, () => ({
      x: Math.random() * W,
      y: Math.random() * (H * 0.6),
      r: Math.random() > 0.85 ? 1.5 : 0.8,
      alpha: 0.1 + Math.random() * 0.7,
    }));
    starData.forEach(s => {
      this.tweens.add({
        targets: s, alpha: { from: s.alpha, to: s.alpha * 0.15 },
        duration: 900 + Math.random() * 2000,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        delay: Math.random() * 2000
      });
    });

    // ── Moon ─────────────────────────────────────────────────
    const moonX = W * 0.82, moonY = H * 0.18;
    const moonGfx = this.add.graphics().setDepth(1);

    // Moon glow halo
    for (let r = 60; r > 0; r -= 6) {
      moonGfx.fillStyle(0xddccff, 0.012);
      moonGfx.fillCircle(moonX, moonY, r + 20);
    }
    // Moon disk
    moonGfx.fillStyle(0xf0ecff, 1);
    moonGfx.fillCircle(moonX, moonY, 32);
    // Moon crater shadows
    moonGfx.fillStyle(0xd8d0f0, 0.45);
    moonGfx.fillCircle(moonX - 8, moonY + 6, 9);
    moonGfx.fillCircle(moonX + 10, moonY - 8, 6);
    moonGfx.fillCircle(moonX + 4, moonY + 14, 4);
    // Moon shadow arc (phase effect)
    moonGfx.fillStyle(0x0d0a1e, 0.55);
    moonGfx.fillCircle(moonX + 14, moonY, 28);

    // Moon shimmer
    this.tweens.add({
      targets: moonGfx, alpha: { from: 1, to: 0.78 },
      duration: 3200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── City skyline ──────────────────────────────────────────
    const cityGfx = this.add.graphics().setDepth(2);
    const buildingData = [
      {x:0,   w:80,  h:200, wc: 0x8800ff},
      {x:90,  w:60,  h:150, wc: 0x0088ff},
      {x:160, w:100, h:260, wc: 0x8800ff},
      {x:270, w:70,  h:180, wc: 0x00ffcc},
      {x:350, w:90,  h:220, wc: 0x8800ff},
      {x:450, w:65,  h:160, wc: 0x0088ff},
      {x:525, w:110, h:280, wc: 0x8800ff},
      {x:645, w:75,  h:195, wc: 0x00ffcc},
      {x:730, w:85,  h:240, wc: 0x8800ff},
      {x:825, w:70,  h:170, wc: 0x0088ff},
      {x:905, w:100, h:210, wc: 0x8800ff},
    ];

    // Window state — randomize once
    const windowStates = buildingData.map(b => {
      const rows = [];
      for (let wy = H - b.h + 20; wy < H - 20; wy += 26) {
        const cols = [];
        for (let wx = b.x + 10; wx < b.x + b.w - 14; wx += 16) {
          cols.push(Math.random() > 0.38);
        }
        rows.push(cols);
      }
      return rows;
    });

    let cityOffX = 0;
    let windowFlicker = 0;

    const drawCity = (offsetX) => {
      buildingData.forEach((b, bi) => {
        // Building silhouette
        cityGfx.fillStyle(0x0d0a1e, 1);
        cityGfx.fillRect(b.x + offsetX, H - b.h, b.w - 4, b.h);
        // Building edge highlight (neon outline top)
        cityGfx.lineStyle(1, b.wc, 0.2);
        cityGfx.lineBetween(b.x + offsetX, H - b.h, b.x + offsetX + b.w - 4, H - b.h);
        cityGfx.lineBetween(b.x + offsetX, H - b.h, b.x + offsetX, H);
        cityGfx.lineBetween(b.x + offsetX + b.w - 4, H - b.h, b.x + offsetX + b.w - 4, H);

        // Windows
        windowStates[bi].forEach((row, ri) => {
          row.forEach((on, ci) => {
            const wy = H - b.h + 20 + ri * 26;
            const wx = b.x + offsetX + 10 + ci * 16;
            if (on) {
              // Slight random flicker
              const isFlickering = (windowFlicker % 120 < 3) && Math.random() > 0.7;
              cityGfx.fillStyle(isFlickering ? 0xaaddff : 0xffff88,
                isFlickering ? 0.6 : 0.22 + Math.random() * 0.06);
              cityGfx.fillRect(wx, wy, 7, 10);
            }
          });
        });

        // Rooftop antenna / water tower
        if (b.h > 200) {
          cityGfx.lineStyle(1, b.wc, 0.35);
          const tx = b.x + offsetX + b.w / 2;
          cityGfx.lineBetween(tx, H - b.h, tx, H - b.h - 18);
          cityGfx.fillStyle(b.wc, 0.7);
          cityGfx.fillCircle(tx, H - b.h - 20, 2);
          // Blinking antenna light
          if (Math.floor(Date.now() / 800) % 2 === 0) {
            cityGfx.fillStyle(0xff4444, 0.9);
            cityGfx.fillCircle(tx, H - b.h - 20, 2.5);
          }
        }
      });
    };

    // ── Ground / road ─────────────────────────────────────────
    this.add.rectangle(cx, H - 8, W, 16, 0x0a0818, 1).setDepth(3);
    // Road center line
    const roadGfx = this.add.graphics().setDepth(3);
    for (let x = 0; x < W; x += 40) {
      roadGfx.fillStyle(0x332244, 0.6);
      roadGfx.fillRect(x, H - 10, 24, 3);
    }
    // Puddle reflections
    const puddleGfx = this.add.graphics().setDepth(3);
    [[180, H - 6, 60, 4], [440, H - 5, 80, 3], [700, H - 6, 50, 4]].forEach(([x, y, w, h]) => {
      puddleGfx.fillStyle(0x2a1a5e, 0.45);
      puddleGfx.fillEllipse(x, y, w, h);
    });

    // ── Rain ─────────────────────────────────────────────────
    const rainGfx = this.add.graphics().setDepth(9).setAlpha(0.22);
    const rainDrops = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      speed: 4 + Math.random() * 3, len: 8 + Math.random() * 8,
    }));

    // ── Scooter + rider ───────────────────────────────────────
    const scooter = this.add.text(-60, H - 118, '🛵', {
      fontSize: '40px'
    }).setDepth(5);

    const rider = this.add.image(-20, H - 133, 'thief_walk_1_src')
      .setScale(1.2).setTint(0x110022).setDepth(6);

    this.tweens.add({
      targets: [scooter, rider], x: W + 80, duration: 3000,
      ease: 'Cubic.easeIn', delay: 500
    });

    // ── Night text ────────────────────────────────────────────
    const nightText = this.add.text(cx, cy - 50, `NIGHT ${this._night}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '72px', color: '#ffffff',
      stroke: '#8800ff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#aa44ff', blur: 28, fill: true }
    }).setOrigin(0.5).setDepth(7).setAlpha(0);

    const subLine = this.add.text(cx, cy + 26, 'New target located...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px', color: '#8866cc', letterSpacing: 3
    }).setOrigin(0.5).setDepth(7).setAlpha(0);

    const lootLine = this._lootCount > 0
      ? this.add.text(cx, cy + 62, `Loot collected: ${this._lootCount} items`, {
          fontFamily: '"Courier New", monospace',
          fontSize: '14px', color: '#ffdd44'
        }).setOrigin(0.5).setDepth(7).setAlpha(0)
      : null;

    // ── Progress bar ─────────────────────────────────────────
    const barW = 240, barH = 6;
    const barY = cy + 100;
    this.add.rectangle(cx, barY, barW, barH, 0x221133, 0.8).setDepth(7);
    const barFill = this.add.rectangle(cx - barW / 2, barY, 0, barH, 0x8800ff, 1)
      .setOrigin(0, 0.5).setDepth(8);
    // Bar glow
    this.add.rectangle(cx, barY, barW + 4, barH + 4, 0x6600cc, 0.15).setDepth(6);

    // "LOADING NEW ZONE" label
    const barLabel = this.add.text(cx, barY + 18, 'LOADING NEW ZONE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px', color: '#443366', letterSpacing: 3
    }).setOrigin(0.5).setDepth(7).setAlpha(0);

    // Animate bar fill over ~2.4s
    this.tweens.add({ targets: barFill, width: barW, duration: 2400, delay: 600, ease: 'Power2.easeInOut' });
    this.tweens.add({ targets: barLabel, alpha: 0.8, duration: 300, delay: 600 });

    // Bar fill color shift
    this.time.delayedCall(2600, () => {
      this.tweens.add({ targets: barFill, alpha: 0, duration: 200 });
    });

    // Scanlines
    const slGfx = this.add.graphics().setDepth(15);
    for (let y = 0; y < H; y += 4) {
      slGfx.lineStyle(1, 0x000000, 0.14);
      slGfx.lineBetween(0, y, W, y);
    }

    // Text fade in
    this.tweens.add({ targets: nightText, alpha: 1, duration: 500, delay: 300 });
    this.tweens.add({ targets: subLine,   alpha: 1, duration: 500, delay: 700 });
    if (lootLine) this.tweens.add({ targets: lootLine, alpha: 1, duration: 400, delay: 1000 });

    // ── UPDATE LOOP ───────────────────────────────────────────
    this.events.on('update', (time, dt) => {
      // Stars
      starGfx.clear();
      starData.forEach(s => {
        starGfx.fillStyle(0xffffff, s.alpha);
        starGfx.fillRect(s.x, s.y, s.r, s.r);
      });

      // City scroll
      cityOffX -= dt * 0.10;
      if (cityOffX < -W) cityOffX += W;
      windowFlicker++;
      cityGfx.clear();
      drawCity(cityOffX);
      drawCity(cityOffX + W);

      // Rain
      rainGfx.clear();
      rainGfx.lineStyle(1, 0xaaddff, 0.5);
      rainDrops.forEach(d => {
        d.y += d.speed; d.x -= 0.6;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
        rainGfx.lineBetween(d.x, d.y, d.x - 1, d.y + d.len);
      });
    });

    // ── Transition to next scene ──────────────────────────────
    this.time.delayedCall(3400, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(this._nextScene);
      });
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}
