/**
 * NoiseSystem — owns the suspicion meter (0–1), decay, and HUD sync.
 * GameScene passes `scene` so this can reach Phaser APIs without being a Scene itself.
 */
export default class NoiseSystem {
  constructor(scene) {
    this.scene = scene;
    this.noise = 0;
    this.noiseDisplay = 0;
    this.totalAccumulated = 0;

    // DOM refs
    this.noiseFillEl = document.getElementById('noise-fill');
    this.noiseValueEl = document.getElementById('noise-value');
  }

  reset() {
    this.noise = 0;
    this.noiseDisplay = 0;
    this.totalAccumulated = 0;
  }

  add(amount) {
    const v = Math.max(0, amount);
    this.totalAccumulated += v;
    this.noise = Phaser.Math.Clamp(this.noise + v, 0, 1);
    if (this.noise > 0.45 && !this.scene.chaseMode) {
      this.scene.updatePrompt('Uh oh. The noise meter is getting rude.');
    }
  }

  /** Call each frame. chaseMode slows decay. */
  update(delta, chaseMode) {
    const dt = Math.max(0, delta ?? 16) / 1000;
    const decayPerSec = chaseMode ? 0.02 : 0.035;
    this.noise = Phaser.Math.Clamp(this.noise - decayPerSec * dt, 0, 1);
    this._syncHUD();
  }

  _syncHUD() {
    this.noiseDisplay = Phaser.Math.Linear(this.noiseDisplay, this.noise, 0.08);
    const pct = Math.round(this.noiseDisplay * 100);
    if (this.noiseFillEl) this.noiseFillEl.style.width = `${pct}%`;
    if (this.noiseValueEl) this.noiseValueEl.textContent = `${pct}%`;
  }
}
