/**
 * LootSystem — creates loot items, handles pickup, fires callbacks, syncs HUD.
 */
export default class LootSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.collectedCount = 0;
    this.total = 0;

    // DOM refs
    this.lootCountEl = document.getElementById('loot-count');
    this.lootFillEl = document.getElementById('loot-fill');
    this.objectiveStatusEl = document.getElementById('objective-status');
  }

  reset() {
    this.items = [];
    this.collectedCount = 0;
    this.total = 0;
  }

  /** Build all loot items and return the bottle sprite reference (room needs it). */
  create(bottle) {
    const s = this.scene;
    const makeGlow = (x, y, color, alpha, depth = 16, r = 22) =>
      s.add.circle(x, y, r, color, alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const makeRing = (x, y, color, alpha, w = 18, h = 18, depth = 17) =>
      s.add.ellipse(x, y, w, h, color, alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const makeShadow = (x, y, w, h, alpha = 0.16, depth = 15) =>
      s.add.ellipse(x, y, w, h, 0x000000, alpha).setDepth(depth);

    // --- Bottle (already created in room, passed in) ---
    const bottleItem = {
      id: 'bottle', name: 'Bottle',
      sprite: bottle,
      glow: s.add.circle(bottle.x, bottle.y, 46, 0xff7a69, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(16),
      ring: s.add.circle(bottle.x, bottle.y, 22, 0xff5f58, 0.0).setDepth(17),
      shadow: s.add.ellipse(bottle.x, bottle.y + 10, 26, 12, 0x000000, 0.18).setDepth(16),
      radius: 42, noise: 0.45, shake: 12,
      prompt: 'Bottle collected.', volume: 0.55
    };

    // --- Gold (easy, chair corner) ---
    const lootScale = 0.20;
    const goldSprite = s.add.image(130, 520, 'gold').setScale(lootScale).setDepth(22);
    const goldItem = {
      id: 'gold', name: 'Gold',
      sprite: goldSprite,
      glow: makeGlow(130, 520, 0xffd56d, 0.8, 18, 50),
      ring: makeRing(130, 520, 0xffe498, 0.08, 20, 16, 18),
      shadow: makeShadow(130, 532, 22, 10, 0.16, 17),
      radius: 34, noise: 0.02, shake: 6,
      prompt: 'Gold collected.', volume: 0.45
    };

    // --- Key (desk area) ---
    const keySprite = s.add.image(130, 200, 'key').setScale(lootScale).setDepth(23);
    const keyItem = {
      id: 'key', name: 'Key',
      sprite: keySprite,
      glow: makeGlow(130, 200, 0x91b7ff, 0.8, 17, 36),
      ring: makeRing(130, 200, 0xbcd3ff, 0.08, 20, 16, 18),
      shadow: makeShadow(130, 200, 22, 10, 0.12, 17),
      radius: 34, noise: 0.04, shake: 6,
      prompt: 'Key obtained.', volume: 0.45
    };

    // --- Gem (risky, near owner/bed) ---
    const gemSprite = s.add.image(816, 276, 'gem').setScale(0.16).setDepth(23);
    const gemItem = {
      id: 'gem', name: 'Gem',
      sprite: gemSprite,
      glow: makeGlow(816, 276, 0xff9452, 0.8, 18, 32),
      ring: makeRing(816, 276, 0xffc09a, 0.08, 20, 16, 18),
      shadow: makeShadow(816, 288, 22, 10, 0.12, 17),
      radius: 34, noise: 0.06, shake: 6,
      prompt: 'Gem secured.', volume: 0.45
    };

    this.items = [bottleItem, goldItem, keyItem, gemItem];
    this.total = this.items.length;
    this.collectedCount = 0;
    this._syncHUD();

    return { bottleGlow: bottleItem.glow, bottleRing: bottleItem.ring, bottleShadow: bottleItem.shadow };
  }

  getClosest(px, py, range = 48) {
    let closest = null;
    let minDist = Infinity;
    for (const item of this.items) {
      if (!item || item.collected || !item.sprite?.visible) continue;
      const d = Phaser.Math.Distance.Between(px, py, item.sprite.x, item.sprite.y);
      if (d <= range && d < minDist) { closest = item; minDist = d; }
    }
    return closest;
  }

  collect(item) {
    if (!item || item.collected) return;
    item.collected = true;
    this.collectedCount = Math.min(this.collectedCount + 1, this.total);
    this._syncHUD();
    this._spawnPickupFX(item);
    this._hideItemVisuals(item);

    const s = this.scene;
    if (item.id === 'bottle') {
      s.noiseSystem.add(item.noise ?? 0.45, 'loot');
      s.playSfx('pickup', { minGap: 180, volume: item.volume ?? 0.55 });
      s.screenShake(item.shake ?? 12);
      s.updatePrompt(`Loot collected (${this.collectedCount}/${this.total})`, 'success');
    } else {
      s.noiseSystem.add(item.noise ?? 0.06, 'loot');
      s.playSfx('pickup', { minGap: 180, volume: item.volume ?? 0.45 });
      s.screenShake(item.shake ?? 6);
      s.updatePrompt(`${item.prompt || 'Loot secured.'} ${this.collectedCount}/${this.total}`, 'success');
    }

    if (this.allCollected()) {
      s.updatePrompt('All loot secured. Head for the exit.', 'success');
    }
  }

  allCollected() {
    return this.total > 0 && this.collectedCount >= this.total;
  }

  /** Animate loot glows/rings each frame. */
  updateAmbient(time) {
    const t = time * 0.001;
    this.items.forEach((item, index) => {
      if (!item || item.collected) return;
      if (item.glow?.active && item.sprite) { item.glow.x = item.sprite.x; item.glow.y = item.sprite.y; }
      if (item.ring?.active && item.sprite) { item.ring.x = item.sprite.x; item.ring.y = item.sprite.y; }
      if (item.shadow?.active && item.sprite) { item.shadow.x = item.sprite.x; item.shadow.y = item.sprite.y + 8; }
      const pulse = 0.5 + Math.sin(t * 2.4 + index) * 0.5;
      if (item.glow) {
        item.glow.setScale(1 + pulse * 0.12);
        item.glow.alpha = item.id === 'bottle' ? 0.12 + pulse * 0.12 : 0.08 + pulse * 0.1;
      }
      if (item.ring) {
        item.ring.setScale(1 + pulse * 0.03);
        item.ring.alpha = 0.08 + pulse * 0.12;
      }
    });
  }

  _syncHUD() {
    const collected = Math.min(this.collectedCount, this.total);
    const pct = this.total > 0 ? Math.round((collected / this.total) * 100) : 0;
    if (this.lootCountEl) this.lootCountEl.textContent = `${collected}/${this.total}`;
    if (this.lootFillEl) this.lootFillEl.style.width = `${pct}%`;
    if (this.objectiveStatusEl) {
      if (!this.total) this.objectiveStatusEl.textContent = 'Loot is loading...';
      else if (collected >= this.total) this.objectiveStatusEl.textContent = 'All loot secured. Head for the exit.';
      else this.objectiveStatusEl.textContent = 'Collect every item before escaping.';
    }
  }

  _spawnPickupFX(item) {
    const s = this.scene;
    const fxX = item.sprite?.x ?? s.player.x;
    const fxY = item.sprite?.y ?? s.player.y;

    for (let i = 0; i < 6; i++) {
      const p = s.add.circle(fxX, fxY - 6, Phaser.Math.Between(1, 2), 0xfff1b0, 0.85).setDepth(119);
      p.setBlendMode(Phaser.BlendModes.ADD);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const r = Phaser.Math.Between(10, 22);
      s.tweens.add({
        targets: p, x: fxX + Math.cos(a) * r, y: fxY - 6 + Math.sin(a) * r,
        alpha: 0, duration: 260, ease: 'Sine.out', onComplete: () => p.destroy()
      });
    }

    const floatText = s.add.text(fxX, fxY - 18, '+1 Loot', {
      fontFamily: '"Press Start 2P"', fontSize: '11px',
      color: '#fff1c6', stroke: '#3a241c', strokeThickness: 4
    }).setOrigin(0.5).setDepth(120);
    s.tweens.add({
      targets: floatText, y: fxY - 40, alpha: 0,
      duration: 520, ease: 'Sine.out', onComplete: () => floatText.destroy()
    });
  }

  _hideItemVisuals(item) {
    const s = this.scene;
    if (item.sprite) {
      const sx = item.sprite.scaleX ?? 1;
      const sy = item.sprite.scaleY ?? 1;
      s.tweens.add({
        targets: item.sprite, scaleX: sx * 1.18, scaleY: sy * 1.18, alpha: 0,
        duration: 160, ease: 'Back.out',
        onComplete: () => {
          item.sprite.setVisible(false);
          item.sprite.setAlpha(1);
          item.sprite.setScale(sx, sy);
        }
      });
    }
    if (item.shadow) item.shadow.setVisible(false);
    if (item.glow) item.glow.setVisible(false);
    if (item.ring) item.ring.setVisible(false);
  }
}
