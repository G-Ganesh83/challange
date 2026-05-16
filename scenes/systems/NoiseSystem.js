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

  add(amount, source = 'noise') {
    const v = Math.max(0, amount);
    this.totalAccumulated += v;
    this.noise = Phaser.Math.Clamp(this.noise + v, 0, 1);
    if (typeof this.scene.handleSoundEvent === 'function') this.scene.handleSoundEvent(v, source);
  }

  /** Call each frame. Decay rate is tiered — higher suspicion lingers longer. */
  update(delta, chaseMode) {
    const dt = Math.max(0, delta ?? 16) / 1000;
    const n = this.noise;

    let decayPerSec;
    if (chaseMode) {
      decayPerSec = 0.008; // almost no decay while owner is chasing
    } else if (n > 0.75) {
      decayPerSec = 0.012; // very slow — danger zone lingers
    } else if (n > 0.50) {
      decayPerSec = 0.022; // slow
    } else if (n > 0.25) {
      decayPerSec = 0.034; // medium
    } else {
      decayPerSec = 0.055; // fast — low suspicion clears quickly
    }

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
