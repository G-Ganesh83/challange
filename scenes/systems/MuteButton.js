/**
 * MuteButton — two neon pixel-art icon buttons, top-right corner.
 * Ambient (music+rain) + SFX. Tooltip on hover. Pixel-drawn icons.
 * Delegates all state to AudioManager.
 */
import AM from './AudioManager.js';

export default class MuteButton {
  constructor(scene, opts = {}) {
    this._scene = scene;
    const baseX = opts.x ?? 916;
    const baseY = opts.y ?? 28;
    const depth  = opts.depth ?? 99;

    AM.init(scene);

    // Ambient btn — cyan speaker icon, X=870, SFX btn — purple wave icon, X=916
    this._ambBtn = this._makeButton({
      scene, x: baseX - 46, y: baseY, depth,
      color: '#00ffcc', colorInt: 0x00ffcc,
      type: 'ambient',
      tipTitle: 'AMBIENT AUDIO',
      tipDesc:  'Controls rain ambience\nand background music.',
      drawIcon: (g, x, y, active) => this._drawSpeaker(g, x, y, active, 0x00ffcc),
      onClick: () => {
        AM.toggleAmbient(scene);
        this._updateVisuals();
      }
    });

    this._sfxBtn = this._makeButton({
      scene, x: baseX, y: baseY, depth,
      color: '#cc44ff', colorInt: 0xcc44ff,
      type: 'sfx',
      tipTitle: 'SFX AUDIO',
      tipDesc:  'Controls footsteps, alerts,\ninteractions and UI sounds.',
      drawIcon: (g, x, y, active) => this._drawWave(g, x, y, active, 0xcc44ff),
      onClick: () => {
        AM.toggleSfx(scene);
        this._updateVisuals();
      }
    });

    this._updateVisuals();
  }

  // ── Icon drawers ──────────────────────────────────────────

  _drawSpeaker(g, x, y, active, colorInt) {
    g.clear();
    const a = active ? 1 : 0.28;
    // Speaker body (trapezoid using fillPoints)
    g.fillStyle(colorInt, a);
    g.fillRect(x - 7, y - 4, 5, 8);      // box
    g.fillTriangle(x - 2, y - 4, x - 2, y + 4, x + 5, y + 7);  // cone
    g.fillTriangle(x - 2, y - 4, x - 2, y + 4, x + 5, y - 7);
    // Sound waves (right side)
    if (active) {
      g.lineStyle(1.5, colorInt, 0.7);
      g.beginPath(); g.arc(x + 4, y, 5, -0.7, 0.7); g.strokePath();
      g.lineStyle(1.5, colorInt, 0.4);
      g.beginPath(); g.arc(x + 4, y, 9, -0.8, 0.8); g.strokePath();
    } else {
      // Muted slash
      g.lineStyle(2, 0xff3355, 0.7);
      g.lineBetween(x + 8, y - 8, x - 8, y + 8);
    }
  }

  _drawWave(g, x, y, active, colorInt) {
    g.clear();
    const a = active ? 1 : 0.25;
    // Equalizer bars: 4 bars of varying heights
    const bars = active ? [3, 7, 5, 8, 4] : [2, 2, 2, 2, 2];
    bars.forEach((h, i) => {
      const bx = x - 8 + i * 4;
      g.fillStyle(colorInt, a - i * 0.04);
      g.fillRect(bx, y - h, 3, h * 2);
    });
    if (active) {
      // Top glow dots
      bars.forEach((h, i) => {
        const bx = x - 8 + i * 4 + 1.5;
        g.fillStyle(colorInt, 0.9);
        g.fillCircle(bx, y - h, 1.5);
      });
    } else {
      g.lineStyle(2, 0xff3355, 0.65);
      g.lineBetween(x + 9, y - 8, x - 9, y + 8);
    }
  }

  // ── Button factory ────────────────────────────────────────

  _makeButton({ scene, x, y, depth, color, colorInt, type, tipTitle, tipDesc, drawIcon, onClick }) {
    // Hit-area circle (invisible, interactive)
    const hitArea = scene.add.circle(x, y, 18, 0x000000, 0)
      .setDepth(depth + 2)
      .setInteractive({ useHandCursor: true });

    // BG circle
    const bg = scene.add.graphics().setDepth(depth);
    const drawBg = (hovered, active) => {
      bg.clear();
      bg.fillStyle(0x07041a, active ? 0.92 : 0.55);
      bg.fillCircle(x, y, 16);
      bg.lineStyle(1.5, colorInt, active ? 0.75 : 0.22);
      bg.strokeCircle(x, y, 16);
      if (hovered) {
        bg.lineStyle(2.5, colorInt, 0.5);
        bg.strokeCircle(x, y, 20);
      }
    };

    // Icon graphics layer
    const iconGfx = scene.add.graphics().setDepth(depth + 1);

    // ── Tooltip ───────────────────────────────────────────────
    // Wider tooltip: title + description
    const TIP_W = 170, TIP_H = 62;
    // Keep tooltip inside screen — if near right edge, shift left
    const tipX = x > 800 ? x - TIP_W + 18 : x - TIP_W / 2;
    const tipY = y + 30;

    const ttBg = scene.add.graphics().setDepth(depth + 10).setAlpha(0);

    const ttTitle = scene.add.text(tipX + TIP_W / 2, tipY + 14, tipTitle, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px', fontStyle: 'bold', color,
    }).setOrigin(0.5).setDepth(depth + 11).setAlpha(0);

    const ttDesc = scene.add.text(tipX + TIP_W / 2, tipY + 33, tipDesc, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px', color: '#bbaadd',
      wordWrap: { width: TIP_W - 16 },
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5).setDepth(depth + 11).setAlpha(0);

    const drawTooltip = () => {
      ttBg.clear();
      ttBg.fillStyle(0x060210, 0.96);
      ttBg.fillRoundedRect(tipX, tipY, TIP_W, TIP_H, 5);
      ttBg.lineStyle(1, colorInt, 0.55);
      ttBg.strokeRoundedRect(tipX, tipY, TIP_W, TIP_H, 5);
      // top accent
      ttBg.lineStyle(1.5, colorInt, 0.7);
      ttBg.lineBetween(tipX + 6, tipY + 1, tipX + TIP_W - 6, tipY + 1);
    };

    const showTip = () => {
      drawTooltip();
      scene.tweens.add({ targets: [ttBg, ttTitle, ttDesc], alpha: 1, duration: 130, ease: 'Power2' });
    };
    const hideTip = () => {
      scene.tweens.add({ targets: [ttBg, ttTitle, ttDesc], alpha: 0, duration: 130, ease: 'Power2' });
    };

    // ── Events ────────────────────────────────────────────────
    let hovered = false;

    hitArea.on('pointerover', () => {
      hovered = true;
      const active = this._isActive(type);
      drawBg(true, active);
      drawIcon(iconGfx, x, y, active);
      scene.tweens.add({ targets: [hitArea], scaleX: 1.12, scaleY: 1.12, duration: 80, ease: 'Power2' });
      showTip();
    });

    hitArea.on('pointerout', () => {
      hovered = false;
      const active = this._isActive(type);
      drawBg(false, active);
      scene.tweens.add({ targets: [hitArea], scaleX: 1, scaleY: 1, duration: 100, ease: 'Power2' });
      hideTip();
    });

    hitArea.on('pointerdown', () => {
      hideTip();
      // Click pulse — scale down then back
      scene.tweens.add({
        targets: hitArea, scaleX: 0.82, scaleY: 0.82,
        duration: 55, ease: 'Power2', yoyo: true,
        onComplete: () => onClick()
      });
    });

    return { bg, iconGfx, hitArea, drawBg, drawIcon, ttBg, ttTitle, ttDesc, x, y, colorInt, type, onClick };
  }

  _isActive(type) {
    return type === 'ambient' ? !AM.ambientMuted : !AM.sfxMuted;
  }

  _updateVisuals() {
    const ambActive = !AM.ambientMuted;
    const sfxActive = !AM.sfxMuted;

    const ab = this._ambBtn;
    ab.drawBg(false, ambActive);
    ab.drawIcon(ab.iconGfx, ab.x, ab.y, ambActive);

    const sb = this._sfxBtn;
    sb.drawBg(false, sfxActive);
    sb.drawIcon(sb.iconGfx, sb.x, sb.y, sfxActive);
  }

  /** Call after starting bg sounds to sync current state */
  sync() {
    this._updateVisuals();
    AM.applyAmbientVolume(this._scene, 0);
    AM.applySfxVolume(this._scene);
  }

  destroy() {
    [this._ambBtn, this._sfxBtn].forEach(b => {
      if (!b) return;
      b.bg.destroy();
      b.iconGfx.destroy();
      b.hitArea.destroy();
      b.ttBg.destroy();
      b.ttTitle.destroy();
      b.ttDesc.destroy();
    });
  }
}
