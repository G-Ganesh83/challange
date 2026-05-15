/**
 * TimerSystem — countdown timer, urgent UI, full-panic trigger.
 */
export default class TimerSystem {
  constructor(scene) {
    this.scene = scene;
    this.seconds = 150;
    this.running = false;
    this.panicTriggered = false;
    this.timerEl = document.getElementById('timer-display');
    this.timerWrapEl = document.getElementById('timer-wrap');
  }

  reset() {
    this.seconds = 150;
    this.running = false;
    this.panicTriggered = false;
    this.timerEl = document.getElementById('timer-display');
    this.timerWrapEl = document.getElementById('timer-wrap');
  }

  start() {
    this.running = true;
    this._syncDisplay();
  }

  stop() {
    this.running = false;
  }

  update(delta) {
    if (!this.running || this.scene.gameOver) return;
    this.seconds = Math.max(0, this.seconds - delta / 1000);
    this._syncDisplay();

    if (this.seconds <= 30 && this.timerEl) {
      this.timerEl.classList.add('urgent');
      if (this.timerWrapEl) this.timerWrapEl.classList.add('panic-wrap');
    }

    if (this.seconds <= 0 && !this.panicTriggered) {
      this._triggerFullPanic();
    }
  }

  _syncDisplay() {
    if (!this.timerEl) return;
    const m = Math.floor(this.seconds / 60);
    const s = Math.floor(this.seconds % 60);
    this.timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  _triggerFullPanic() {
    this.panicTriggered = true;
    const s = this.scene;
    s.chaseMode = true;
    s.chaseModeHappened = true;
    s.owner.state = 'chase';
    s.setOwnerBreathing(false);
    s.owner.setTexture('owner_alert');
    s.owner.setScale(s.ownerAI.alertScale);
    s.owner.setVisible(true);
    s.flashRed();
    s.screenShake(40);
    s.ownerWakeBurst('!');
    s.playSfx('coreTransition', { minGap: 100 });
    s.playSfx('fahh', { minGap: 800, delay: 280 });
    s.updatePrompt("TIME'S UP! FULL PANIC — collect loot and RUN!");
    const txt = s.add.text(480, 200, "TIME'S UP!", {
      fontFamily: '"Press Start 2P"', fontSize: '28px',
      color: '#ff6a5f', stroke: '#2a0808', strokeThickness: 6
    }).setOrigin(0.5).setDepth(200);
    s.tweens.add({ targets: txt, alpha: 0, y: 168, duration: 2200, ease: 'Sine.out', onComplete: () => txt.destroy() });
  }
}
