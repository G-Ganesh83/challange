// IntroScene — "GANESH GAMES" neon flash logo ~2.2s then cinematic wipe → MainMenuScene
export default class IntroScene extends Phaser.Scene {
  constructor() { super('IntroScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2, cy = H / 2;

    this.cameras.main.setBackgroundColor('#000000');

    // ── Triple-layer bloom (stacked glow for depth) ──────────
    // Layer 1: wide outer halo
    const halo = this.add.text(cx, cy, 'GANESH GAMES', {
      fontFamily: '"Courier New", monospace',
      fontSize: '52px',
      color: '#00ffff',
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 80, fill: true }
    }).setOrigin(0.5).setAlpha(0).setDepth(1);

    // Layer 2: mid glow
    const midGlow = this.add.text(cx, cy, 'GANESH GAMES', {
      fontFamily: '"Courier New", monospace',
      fontSize: '52px',
      color: '#00ffff',
      shadow: { offsetX: 0, offsetY: 0, color: '#00eeff', blur: 36, fill: true }
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    // Layer 3: crisp top text
    const mainText = this.add.text(cx, cy, 'GANESH GAMES', {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#00ffff',
      strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 16, fill: true }
    }).setOrigin(0.5).setAlpha(0).setDepth(3);

    // Subtitle
    const subText = this.add.text(cx, cy + 54, 'P R E S E N T S', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#0099aa',
      letterSpacing: 8
    }).setOrigin(0.5).setAlpha(0).setDepth(3);

    // ── Scanlines — slightly more visible than before ────────
    const scanlines = this.add.graphics().setDepth(10);
    for (let y = 0; y < H; y += 3) {
      scanlines.lineStyle(1, 0x000000, 0.22);
      scanlines.lineBetween(0, y, W, y);
    }

    // ── Vignette — corner darkening ──────────────────────────
    // Four corner gradients converging inward
    const vig = this.add.graphics().setDepth(9);
    // Top bar
    vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.85, 0.85, 0, 0);
    vig.fillRect(0, 0, W, H * 0.32);
    // Bottom bar
    vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
    vig.fillRect(0, H * 0.68, W, H * 0.32);
    // Left bar
    vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.6, 0, 0.6, 0);
    vig.fillRect(0, 0, W * 0.18, H);
    // Right bar
    vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.6, 0, 0.6);
    vig.fillRect(W * 0.82, 0, W * 0.18, H);

    // ── RGB chromatic aberration copies ─────────────────────
    // Red channel — offset left
    const rgbR = this.add.text(cx - 3, cy, 'GANESH GAMES', {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px', color: '#ff0044',
    }).setOrigin(0.5).setAlpha(0).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);

    // Blue channel — offset right
    const rgbB = this.add.text(cx + 3, cy, 'GANESH GAMES', {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px', color: '#0044ff',
    }).setOrigin(0.5).setAlpha(0).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);

    // ── Power-on line sweep (horizontal bright line) ─────────
    const powerLine = this.add.graphics().setDepth(8);
    let lineY = 0;
    let lineSweepDone = false;
    const drawPowerLine = (y, alpha) => {
      powerLine.clear();
      if (alpha <= 0) return;
      powerLine.lineStyle(2, 0x00ffff, alpha);
      powerLine.lineBetween(0, y, W, y);
      // Wider glow band
      powerLine.lineStyle(8, 0x00ffff, alpha * 0.12);
      powerLine.lineBetween(0, y, W, y);
      powerLine.lineStyle(20, 0x00ffff, alpha * 0.04);
      powerLine.lineBetween(0, y, W, y);
    };

    // ── Flicker logic ────────────────────────────────────────
    const flicker = () => {
      const alpha = Math.random() > 0.15 ? 1 : (Math.random() * 0.4 + 0.1);
      mainText.setAlpha(alpha);
      midGlow.setAlpha(alpha * 0.7);
      halo.setAlpha(alpha * 0.35);

      // RGB aberration fires on heavy flicker
      if (alpha < 0.5) {
        const shift = Math.random() * 6 - 3;
        rgbR.setX(cx - Math.abs(shift) * 1.2).setAlpha(0.18);
        rgbB.setX(cx + Math.abs(shift) * 1.2).setAlpha(0.18);
        this.time.delayedCall(50, () => { rgbR.setAlpha(0); rgbB.setAlpha(0); });
      } else {
        // Light aberration always visible
        const shift = Math.random() > 0.7 ? (Math.random() * 3 - 1.5) : 0;
        mainText.setX(cx + shift);
        midGlow.setX(cx + shift);
      }
    };

    // ── SEQUENCE ─────────────────────────────────────────────

    // Step 1: Power-on sweep (0ms) — line races from top to center
    this.time.addEvent({
      delay: 8,
      repeat: 80,
      callback: () => {
        lineY += H / 80;
        const progress = lineY / H;
        drawPowerLine(lineY, 1 - progress * 0.3);
        if (lineY >= H * 0.5 && !lineSweepDone) {
          lineSweepDone = true;
          // Line hits center → text flash in
          this.tweens.add({ targets: mainText,  alpha: { from: 0, to: 1 },   duration: 60, delay: 0 });
          this.tweens.add({ targets: midGlow,   alpha: { from: 0, to: 0.7 }, duration: 60, delay: 0 });
          this.tweens.add({ targets: halo,      alpha: { from: 0, to: 0.35 },duration: 80, delay: 0 });
          this.tweens.add({ targets: subText,   alpha: { from: 0, to: 0.8 }, duration: 200, delay: 180 });
          // Buzz on flash
          try { this.sound.play('neon_buzz', { volume: 0.55 }); } catch(e) {}
        }
      }
    });

    // After sweep done, fade power line
    this.time.delayedCall(700, () => {
      this.tweens.add({ targets: powerLine, alpha: 0, duration: 300 });
    });

    // Step 2: Flicker loop (starts after flash-in)
    this.time.delayedCall(750, () => {
      this._flickerTimer = this.time.addEvent({
        delay: 80, repeat: 18, callback: flicker
      });
    });

    // Second buzz hit mid-flicker
    this.time.delayedCall(950, () => {
      try { this.sound.play('neon_buzz', { volume: 0.28 }); } catch(e) {}
    });

    // Step 3: Cinematic transition out (1900ms)
    // — horizontal scanline wipe: lines collapse to center, then hard cut
    this.time.delayedCall(1900, () => {
      // Stop flicker
      if (this._flickerTimer) this._flickerTimer.remove();
      mainText.setAlpha(1); midGlow.setAlpha(0.7); halo.setAlpha(0.35);

      // CRT power-off: text scrunches vertically to a thin line then gone
      this.tweens.add({
        targets: [mainText, midGlow, halo, subText],
        scaleY: { from: 1, to: 0 },
        alpha: { from: undefined, to: 0 },
        duration: 220,
        ease: 'Power3.easeIn'
      });

      // White flash on collapse
      const flash = this.add.rectangle(cx, cy, W, H, 0x00ffff, 0).setDepth(20);
      this.time.delayedCall(160, () => {
        this.tweens.add({
          targets: flash, alpha: { from: 0.18, to: 0 },
          duration: 280, ease: 'Power2.easeOut'
        });
        try { this.sound.play('neon_buzz', { volume: 0.15 }); } catch(e) {}
      });

      // Fade to black and go
      this.time.delayedCall(260, () => {
        this.cameras.main.fadeOut(340, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MainMenuScene');
        });
      });
    });
  }
}
