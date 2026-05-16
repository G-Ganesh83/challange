import AM from './AudioManager.js';

/**
 * RankSystem — calculates stealth rank and renders end screens.
 */
export default class RankSystem {
  constructor(scene) {
    this.scene = scene;
    this._caughtTimers = [];
    this._caughtOverlay = null;
    this._celebrationTimers = [];
    this._celebrationOverlay = null;
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
    const tLeft = Math.max(0, Math.floor(s.timerSystem.seconds));
    const mm = String(Math.floor(tLeft / 60)).padStart(2, '0');
    const ss = String(tLeft % 60).padStart(2, '0');
    const noise = s.noiseSystem.totalAccumulated;
    const noiseLabel = noise < 0.3 ? 'Low 🤫' : noise < 0.8 ? 'Medium 😬' : 'HIGH 🔊';

    const el = document.getElementById('end-screen');
    el.classList.add('final-win');
    document.getElementById('end-eyebrow').textContent = 'NIGHT CLEARED';
    const rankEl = document.getElementById('end-rank');
    rankEl.textContent = 'HEIST COMPLETE';
    rankEl.style.color = '#f7fbff';
    document.getElementById('end-subtitle').textContent = 'Thanks for playing Tiny Thief ❤️';
    document.getElementById('end-stats').innerHTML = `
      <div class="final-message">I explored a completely new side of building games while creating this project.</div>
      <div class="final-message">I gave my full effort to make this small stealth experience fun and visually memorable.</div>
      <div class="final-message">Hope you enjoyed the cozy neon atmosphere and gameplay.</div>
      <div class="final-human">Sorry if you encountered any bugs or rough edges. This project was built with passion, experimentation and lots of learning.</div>
      <div class="final-support">Support the project in the #100_cans challenge ❤️</div>
      <div class="final-mini">Time Left: ${mm}:${ss} · Noise: ${noiseLabel}</div>
    `;
    const retry = document.getElementById('end-replay-btn');
    const menu = document.getElementById('end-menu-btn');
    if (retry) retry.textContent = 'PLAY AGAIN';
    if (menu) menu.textContent = 'RETURN TO MENU';
    el.classList.remove('hidden');
    this._wireButtons(el);
    this._startFinalCelebration(el);
  }

  showBustedScreen() {
    this._removeCaughtOverlay();
    const s = this.scene;
    const el = document.getElementById('end-screen');
    el.classList.remove('final-win');
    document.getElementById('end-eyebrow').textContent = '— NIGHT FAILED —';
    const rankEl = document.getElementById('end-rank');
    rankEl.textContent = 'CAUGHT';
    rankEl.style.color = '#ff4c60';
    document.getElementById('end-subtitle').textContent = 'The owner woke up...';
    document.getElementById('end-stats').innerHTML = `
      <div>Stay quiet. Move with intention.</div>
      <div>Hide before the search turns into a chase.</div>
    `;
    el.classList.remove('hidden');
    this._wireButtons(el);
  }

  showCaughtSequence() {
    const s = this.scene;
    this._removeCaughtOverlay();
    AM.duckAmbient(s, 0.075, 700);

    const overlay = document.createElement('div');
    overlay.className = 'caught-cinematic';
    overlay.innerHTML = `
      <div class="caught-red"></div>
      <div class="caught-center">
        <div class="caught-title">BUSTED</div>
        <div class="caught-count">3</div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._caughtOverlay = overlay;

    const countEl = overlay.querySelector('.caught-count');
    const setCount = (value) => {
      countEl.textContent = value;
      countEl.classList.remove('pulse');
      void countEl.offsetWidth;
      countEl.classList.add('pulse');
    };

    [2, 1, 0].forEach((value, index) => {
      this._caughtTimers.push(window.setTimeout(() => setCount(value), 760 * (index + 1)));
    });

    this._caughtTimers.push(window.setTimeout(() => {
      overlay.classList.add('done');
      this._caughtTimers.push(window.setTimeout(() => {
        this.showBustedScreen();
      }, 360));
    }, 3040));
  }

  _wireButtons(el) {
    const s = this.scene;
    const retry = document.getElementById('end-replay-btn');
    const menu = document.getElementById('end-menu-btn');
    if (retry) retry.onclick = () => {
      el.classList.add('hidden');
      el.classList.remove('final-win');
      this._removeFinalCelebration();
      this._removeCaughtOverlay();
      AM.raiseAmbient(s, 450);
      this._cleanupActiveScene();
      const isFinalWin = document.getElementById('end-rank')?.textContent === 'HEIST COMPLETE';
      window.setTimeout(() => {
        if (isFinalWin) {
          s.game.scene.stop(s.sys.settings.key);
          s.game.scene.start('GameScene');
        } else {
          const key = s.sys.settings.key;
          const SceneClass = s.constructor;
          s.game.scene.stop(key);
          s.game.scene.remove(key);
          s.game.scene.add(key, new SceneClass(), true);
        }
      }, 0);
    };
    if (menu) menu.onclick = () => {
      el.classList.add('hidden');
      el.classList.remove('final-win');
      this._removeFinalCelebration();
      this._removeCaughtOverlay();
      AM.raiseAmbient(s, 450);
      this._cleanupActiveScene();
      document.body.classList.remove('hud-visible');
      document.body.classList.add('hud-hidden');
      const key = s.sys.settings.key;
      const SceneClass = s.constructor;
      window.setTimeout(() => {
        s.game.scene.stop(key);
        s.game.scene.remove(key);
        s.game.scene.add(key, new SceneClass(), false);
        s.game.scene.start('MainMenuScene');
      }, 0);
    };
  }

  _cleanupActiveScene() {
    const s = this.scene;
    this._removeFinalCelebration();
    this._removeCaughtOverlay();
    try { s.physics?.world?.resume(); } catch(e) {}
    try { s.input.enabled = true; } catch(e) {}
    try { s.cameras?.main?.resetFX(); } catch(e) {}
    try { s.cameras?.main?.setZoom(1); } catch(e) {}
    try { document.getElementById('message-toast')?.classList.add('hidden'); } catch(e) {}
  }

  _removeCaughtOverlay() {
    this._caughtTimers.forEach((id) => window.clearTimeout(id));
    this._caughtTimers = [];
    this._caughtOverlay?.remove();
    this._caughtOverlay = null;
  }

  _startFinalCelebration(el) {
    this._removeFinalCelebration();
    const actions = el.querySelector('.end-actions');
    actions?.classList.remove('ready');

    const overlay = document.createElement('div');
    overlay.className = 'final-confetti-layer';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
    this._celebrationOverlay = overlay;

    this._celebrationTimers.push(window.setTimeout(() => {
      this._playSoftPartyPop();
      this._spawnConfetti(overlay, 34);
      el.querySelector('.end-rank')?.classList.add('celebrate');
    }, 620));

    this._celebrationTimers.push(window.setTimeout(() => {
      this._spawnConfetti(overlay, 18);
    }, 1450));

    this._celebrationTimers.push(window.setTimeout(() => {
      actions?.classList.add('ready');
    }, 1850));

    this._celebrationTimers.push(window.setTimeout(() => {
      overlay.classList.add('settle');
    }, 6200));
  }

  _spawnConfetti(overlay, count) {
    const colors = ['#65eaff', '#b866ff', '#ff74b8', '#ffe077', '#8bbcff'];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      piece.className = 'final-confetti';
      const x = 18 + Math.random() * 64;
      const delay = Math.random() * 0.42;
      const drift = `${Math.round((Math.random() - 0.5) * 220)}px`;
      const rotate = `${Math.round(220 + Math.random() * 420)}deg`;
      piece.style.left = `${x}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${delay}s`;
      piece.style.setProperty('--drift', drift);
      piece.style.setProperty('--spin', rotate);
      piece.style.setProperty('--fall', `${4.2 + Math.random() * 1.8}s`);
      piece.style.width = `${5 + Math.random() * 5}px`;
      piece.style.height = `${8 + Math.random() * 7}px`;
      overlay.appendChild(piece);
      window.setTimeout(() => piece.remove(), 7000);
    }
  }

  _playSoftPartyPop() {
    if (AM.sfxMuted) return;
    const s = this.scene;
    const ctx = s.sound?.context;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.10, now + 0.025);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      master.connect(ctx.destination);

      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.22), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
      }
      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1700, now);
      filter.Q.setValueAtTime(0.8, now);
      noise.buffer = buffer;
      noise.connect(filter);
      filter.connect(master);
      noise.start(now);

      [523.25, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.08 + idx * 0.055);
        gain.gain.setValueAtTime(0.0001, now + 0.08 + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.045, now + 0.11 + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42 + idx * 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.08 + idx * 0.055);
        osc.stop(now + 0.48 + idx * 0.07);
      });
    } catch(e) {}
  }

  _removeFinalCelebration() {
    this._celebrationTimers.forEach((id) => window.clearTimeout(id));
    this._celebrationTimers = [];
    this._celebrationOverlay?.remove();
    this._celebrationOverlay = null;
    document.getElementById('end-rank')?.classList.remove('celebrate');
    document.querySelector('#end-screen .end-actions')?.classList.remove('ready');
  }
}
