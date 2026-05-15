/**
 * RankSystem — calculates stealth rank and renders end screens.
 */
export default class RankSystem {
  constructor(scene) {
    this.scene = scene;
  }

  calculate() {
    const s = this.scene;
    const noise = s.noiseSystem.totalAccumulated;
    const chased = s.chaseModeHappened;
    const panicked = s.timerSystem.panicTriggered;
    const hid = s.hiddenSuccessfully;

    if (!chased && !panicked && noise < 0.25) return { title: 'PERFECT THIEF 🐱', color: '#ffd86e' };
    if (!chased && !panicked)                 return { title: 'CLEAN ESCAPE 🕶️',  color: '#91b7ff' };
    if (hid && !panicked)                     return { title: 'SILENT RAT 🐀',     color: '#c9c2b4' };
    if (panicked && chased)                   return { title: 'PANIC SURVIVOR 🏃', color: '#ff944d' };
    return                                           { title: 'CHAOS GOBLIN 🤌',   color: '#ff6a5f' };
  }

  showEscapeScreen() {
    const s = this.scene;
    const rank = this.calculate();
    const tLeft = Math.max(0, Math.floor(s.timerSystem.seconds));
    const mm = String(Math.floor(tLeft / 60)).padStart(2, '0');
    const ss = String(tLeft % 60).padStart(2, '0');
    const noise = s.noiseSystem.totalAccumulated;
    const noiseLabel = noise < 0.3 ? 'Low 🤫' : noise < 0.8 ? 'Medium 😬' : 'HIGH 🔊';

    const el = document.getElementById('end-screen');
    document.getElementById('end-eyebrow').textContent = '— ESCAPED —';
    const rankEl = document.getElementById('end-rank');
    rankEl.textContent = rank.title;
    rankEl.style.color = rank.color;
    document.getElementById('end-stats').innerHTML = `
      <div>⏱ Time Left: ${mm}:${ss}</div>
      <div>🔊 Noise: ${noiseLabel}</div>
      <div>${s.chaseModeHappened ? '⚠️ Chase: YES' : '✅ Chase: NEVER'}</div>
      <div>${s.timerSystem.panicTriggered ? '🚨 Timed Out' : '🎯 Escaped in Time'}</div>
    `;
    el.classList.remove('hidden');
    document.getElementById('end-replay-btn').onclick = () => {
      el.classList.add('hidden');
      s.scene.restart();
    };
  }

  showBustedScreen() {
    const s = this.scene;
    const noise = s.noiseSystem.totalAccumulated;
    const noiseLabel = noise < 0.5 ? 'Medium 😬' : 'Extremely HIGH 🔊';
    const el = document.getElementById('end-screen');
    document.getElementById('end-eyebrow').textContent = '— BUSTED —';
    const rankEl = document.getElementById('end-rank');
    rankEl.textContent = 'CAUGHT RED-HANDED 😤';
    rankEl.style.color = '#ff6a5f';
    document.getElementById('end-stats').innerHTML = `
      <div>🔊 Noise Generated: ${noiseLabel}</div>
      <div>💀 The owner got ya.</div>
      <div>Better luck next time...</div>
    `;
    el.classList.remove('hidden');
    document.getElementById('end-replay-btn').onclick = () => {
      el.classList.add('hidden');
      s.scene.restart();
    };
  }
}
