// IntroScene — cinematic studio intro: animated logo, typewriter, particle burst → MainMenuScene
export default class IntroScene extends Phaser.Scene {
  constructor() { super('IntroScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2, cy = H / 2;

    this.cameras.main.setBackgroundColor('#000000');

    // ── Deep space background ────────────────────────────────
    // Star field
    const stars = this.add.graphics().setDepth(0);
    const starData = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() > 0.85 ? 1.5 : 0.8,
      alpha: 0.2 + Math.random() * 0.6,
      twinkleSpeed: 800 + Math.random() * 2000,
    }));
    starData.forEach(s => {
      this.tweens.add({
        targets: s, alpha: { from: s.alpha, to: s.alpha * 0.2 },
        duration: s.twinkleSpeed, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        delay: Math.random() * 2000
      });
    });

    // ── Vignette ─────────────────────────────────────────────
    const vig = this.add.graphics().setDepth(1);
    // Radial dark border
    for (let i = 0; i < 6; i++) {
      const alpha = 0.08 + i * 0.06;
      const pad = i * 30;
      vig.fillStyle(0x000000, alpha);
      vig.fillRect(0, 0, W, pad);
      vig.fillRect(0, H - pad, W, pad);
      vig.fillRect(0, 0, pad, H);
      vig.fillRect(W - pad, 0, pad, H);
    }

    // ── Scanlines ────────────────────────────────────────────
    const sl = this.add.graphics().setDepth(20).setAlpha(0.08);
    for (let y = 0; y < H; y += 3) {
      sl.lineStyle(1, 0x000000, 1);
      sl.lineBetween(0, y, W, y);
    }

    // ── Logo diamond / badge ──────────────────────────────────
    const badgeGfx = this.add.graphics().setDepth(4);
    const drawBadge = (alpha = 1) => {
      badgeGfx.clear();
      // Outer hexagon
      badgeGfx.lineStyle(2, 0x6600cc, alpha * 0.9);
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push({ x: cx + 58 * Math.cos(angle), y: cy - 60 + 58 * Math.sin(angle) });
      }
      badgeGfx.strokePoints(pts, true);

      // Inner fill
      badgeGfx.fillStyle(0x220044, alpha * 0.85);
      badgeGfx.fillPoints(pts, true);

      // Inner hex glow ring
      badgeGfx.lineStyle(1, 0xaa44ff, alpha * 0.4);
      const pts2 = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts2.push({ x: cx + 44 * Math.cos(angle), y: cy - 60 + 44 * Math.sin(angle) });
      }
      badgeGfx.strokePoints(pts2, true);
    };
    drawBadge(0);

    // Center "G" monogram
    const gMono = this.add.text(cx, cy - 60, 'G', {
      fontFamily: '"Courier New", monospace',
      fontSize: '36px', color: '#aa44ff',
      shadow: { offsetX: 0, offsetY: 0, color: '#8800ff', blur: 18, fill: true }
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    // ── Studio name — typewriter ──────────────────────────────
    const studioFull = 'GANESH GAMES';
    const studioText = this.add.text(cx, cy - 60 + 76, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px', color: '#ffffff',
      stroke: '#6600cc', strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#bb66ff', blur: 24, fill: true }
    }).setOrigin(0.5).setDepth(6).setAlpha(0);

    const presentsText = this.add.text(cx, cy - 60 + 120, 'P R E S E N T S', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px', color: '#7755aa', letterSpacing: 8
    }).setOrigin(0.5).setDepth(6).setAlpha(0);

    // Cursor blink
    const cursor = this.add.text(0, 0, '_', {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px', color: '#bb66ff'
    }).setDepth(7).setAlpha(0);

    // ── Neon glow pulse lines ─────────────────────────────────
    const lineGfx = this.add.graphics().setDepth(3);
    const drawLines = (progress = 0) => {
      lineGfx.clear();
      if (progress <= 0) return;
      const maxW = 180 * progress;
      lineGfx.lineStyle(1, 0x6600cc, 0.5 * progress);
      lineGfx.lineBetween(cx - maxW - 20, cy - 60 + 76, cx - 80, cy - 60 + 76);
      lineGfx.lineBetween(cx + 80, cy - 60 + 76, cx + maxW + 20, cy - 60 + 76);
      // small diamond caps
      lineGfx.fillStyle(0xaa44ff, 0.7 * progress);
      lineGfx.fillRect(cx - maxW - 24, cy - 60 + 74, 4, 4);
      lineGfx.fillRect(cx + maxW + 20, cy - 60 + 74, 4, 4);
    };

    // ── Particle burst container ──────────────────────────────
    const burstGfx = this.add.graphics().setDepth(8);
    const particles = [];

    const triggerBurst = () => {
      for (let i = 0; i < 28; i++) {
        const angle = (Math.PI * 2 / 28) * i + Math.random() * 0.3;
        const speed = 60 + Math.random() * 120;
        particles.push({
          x: cx, y: cy - 60,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1, decay: 0.018 + Math.random() * 0.012,
          r: 1 + Math.random() * 2.5,
          color: [0xbb66ff, 0x00ffee, 0x6600cc, 0xffffff][Math.floor(Math.random() * 4)]
        });
      }
    };

    // ── Arrow / chevron transition indicator ─────────────────
    const arrowGfx = this.add.graphics().setDepth(9);
    let arrowProgress = 0;
    let arrowAnim = false;

    const drawArrow = (prog) => {
      arrowGfx.clear();
      if (prog <= 0) return;
      const ax = cx, ay = H - 52;
      // Three animated chevrons pointing down
      for (let i = 0; i < 3; i++) {
        const delay = i * 0.25;
        const p = Math.max(0, Math.min(1, prog * 3 - delay * 1.5));
        if (p <= 0) continue;
        const yOff = i * 14;
        const hw = 22 * p;
        arrowGfx.lineStyle(2, 0x8844cc, p * (i === 2 ? 1 : 0.5));
        arrowGfx.lineBetween(ax - hw, ay + yOff - 8, ax, ay + yOff);
        arrowGfx.lineBetween(ax, ay + yOff, ax + hw, ay + yOff - 8);
      }
    };

    // ── "ENTERING GAME" label ────────────────────────────────
    const enterLabel = this.add.text(cx, H - 28, '— ENTERING GAME —', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px', color: '#443366', letterSpacing: 4
    }).setOrigin(0.5).setDepth(9).setAlpha(0);

    // ── UPDATE loop ──────────────────────────────────────────
    this.events.on('update', () => {
      // Star field
      stars.clear();
      starData.forEach(s => {
        stars.fillStyle(0xffffff, s.alpha);
        stars.fillRect(s.x, s.y, s.r, s.r);
      });

      // Burst particles
      burstGfx.clear();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        burstGfx.fillStyle(p.color, p.life * 0.85);
        burstGfx.fillCircle(p.x, p.y, p.r * p.life);
      }

      // Arrow
      if (arrowAnim) {
        arrowProgress = Math.min(1, arrowProgress + 0.018);
        drawArrow(arrowProgress);
      }
    });

    // ── SEQUENCE ─────────────────────────────────────────────

    // Phase 1: Badge fades in (0ms)
    this.tweens.add({
      targets: badgeGfx, alpha: { from: 0, to: 1 }, duration: 400, delay: 150,
      onUpdate: (tw) => drawBadge(tw.progress)
    });

    // Phase 2: G monogram + subtle rotate scale in (300ms)
    this.tweens.add({
      targets: gMono, alpha: 1, scaleX: { from: 0.3, to: 1 }, scaleY: { from: 0.3, to: 1 },
      duration: 400, delay: 300, ease: 'Back.easeOut'
    });

    // Phase 3: Studio name typewriter (700ms)
    this.time.delayedCall(700, () => {
      studioText.setAlpha(1);
      cursor.setAlpha(1);
      let idx = 0;
      const typeTimer = this.time.addEvent({
        delay: 65,
        repeat: studioFull.length - 1,
        callback: () => {
          idx++;
          studioText.setText(studioFull.slice(0, idx));
          // Position cursor after last char
          const tw = studioText.width / 2;
          cursor.setPosition(cx + tw + 6, cy - 60 + 76 - studioText.height / 2 + 4);
          drawLines(idx / studioFull.length);
          // Play neon buzz tick
          if (idx % 3 === 0) {
            try { this.sound.play('neon_buzz', { volume: 0.05 }); } catch(e) {}
          }
        }
      });
    });

    // Phase 4: Cursor blink stops, PRESENTS fades in + burst (1700ms)
    this.time.delayedCall(1700, () => {
      cursor.setAlpha(0);
      studioText.setText(studioFull);

      // Badge pulse burst
      triggerBurst();
      try { this.sound.play('neon_buzz', { volume: 0.25 }); } catch(e) {}

      // Badge flash
      this.tweens.add({
        targets: badgeGfx, alpha: { from: 1.0, to: 0.3 },
        duration: 80, yoyo: true, repeat: 3
      });

      this.tweens.add({
        targets: presentsText, alpha: { from: 0, to: 0.85 },
        duration: 400, delay: 200
      });
    });

    // Phase 5: Arrow + enter label (2400ms)
    this.time.delayedCall(2400, () => {
      arrowAnim = true;
      this.tweens.add({
        targets: enterLabel, alpha: { from: 0, to: 0.7 },
        duration: 400
      });
      // Pulse arrow
      this.tweens.add({
        targets: arrowGfx, y: { from: 0, to: 6 },
        duration: 600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
      });
    });

    // Phase 6: Fade out → MainMenu (3000ms)
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });
  }
}
