// MissionScene — cinematic HOW TO PLAY briefing screen
import MuteButton from './systems/MuteButton.js';
import AM         from './systems/AudioManager.js';

export default class MissionScene extends Phaser.Scene {
  constructor() { super('MissionScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2, cy = H / 2;

    this.input.enabled = true;
    this.cameras.main.resetFX();
    document.body.classList.remove('hud-visible');
    document.body.classList.add('hud-hidden');
    document.getElementById('end-screen')?.classList.add('hidden');
    document.getElementById('message-toast')?.classList.add('hidden');

    this.cameras.main.setBackgroundColor('#05040f');

    // ── Background ────────────────────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x05040f, 1).setDepth(0);

    // Subtle radial fog center
    const fog = this.add.circle(cx, cy + 40, 360, 0x0a0030, 0.45).setDepth(1);
    this.tweens.add({
      targets: fog, scaleX: 1.08, scaleY: 1.06,
      duration: 3800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
    });

    // ── Rain ──────────────────────────────────────────────────
    const rainDrops = Array.from({ length: 55 }, () => this._makeRainDrop(W, H, true));
    const rainGfx   = this.add.graphics().setDepth(2).setAlpha(0.22);

    this._buildDomBriefing();

    // ── Audio ─────────────────────────────────────────────────
    AM.init(this);
    AM.sync(this);
    AM.raiseAmbient(this, 600);

    this._muteBtn = new MuteButton(this);
    this.time.delayedCall(80, () => this._muteBtn.sync());

    // ── Input ─────────────────────────────────────────────────
    this._ready = false;
    this.input.keyboard.once('keydown-SPACE', () => this._startHeist());
    this.input.once('pointerdown', (ptr) => {
      // Only trigger if not clicking mute buttons
      if (ptr.y < 50) return;
      this._startHeist();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._removeDomBriefing());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this._removeDomBriefing());

    // ── Fade in ───────────────────────────────────────────────
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // ── Update — rain ─────────────────────────────────────────
    this.events.on('update', () => {
      rainGfx.clear();
      rainGfx.lineStyle(1, 0x6688cc, 1);
      rainDrops.forEach(d => {
        d.y += d.speed;
        if (d.y > H + 20) { d.y = -20; d.x = Math.random() * W; }
        rainGfx.lineBetween(d.x, d.y, d.x + d.drift, d.y + d.len);
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  _buildDomBriefing() {
    this._removeDomBriefing();

    const overlay = document.createElement('section');
    overlay.className = 'mission-briefing';
    overlay.innerHTML = `
      <div class="mission-panel">
        <header class="mission-header">
          <h1>How To Play</h1>
          <div class="mission-rule"></div>
        </header>

        <div class="mission-grid">
          <div class="mission-stack">
            <article>
              <h2>Objective</h2>
              <p>Sneak into the apartment, collect all 4 loot items, avoid waking the owner, and escape safely.</p>
            </article>

            <article>
              <h2>Controls</h2>
              <div class="control-block">
                <div class="wasd">
                  <kbd>W</kbd>
                  <div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
                  <span>Move</span>
                </div>
                <div class="control-row control-run">
                  <kbd>SHIFT</kbd>
                  <span>Run <strong>creates more noise</strong></span>
                </div>
                <div class="control-row">
                  <kbd>E</kbd>
                  <span>Interact / Pickup / Hide</span>
                </div>
              </div>
            </article>

            <article>
              <h2>Game Rules</h2>
              <ul class="rule-list">
                <li>Bumping walls or furniture creates noise.</li>
                <li>Loud actions can wake the owner immediately.</li>
                <li>Noisy loot pickup can wake or trigger a chase.</li>
                <li class="safe-rule">Hide in safe zones for 5 seconds if the owner wakes up.</li>
                <li>Collect all loot and escape safely.</li>
              </ul>
            </article>
          </div>

          <div class="mission-stack">
            <article>
              <h2>Win Condition</h2>
              <p>Collect every loot item and reach the exit door without getting caught.</p>
            </article>

            <article>
              <h2>Sound & Audio</h2>
              <p>Rain and lo-fi ambience create the stealth atmosphere.</p>
              <p class="audio-note">Speaker icon = Ambient audio<br>Waveform icon = Sound effects</p>
              <p class="headphones">Best experienced with headphones.</p>
            </article>
          </div>
        </div>

        <button class="mission-start" type="button">
          <span>Press Space To Start</span>
          <small>Begin the heist</small>
        </button>
      </div>
    `;

    this._missionOverlay = overlay;
    this._missionStartButton = overlay.querySelector('.mission-start');
    this._missionStartHandler = () => this._startHeist();
    this._missionStartButton.addEventListener('click', this._missionStartHandler);
    document.body.appendChild(overlay);
  }

  _removeDomBriefing() {
    if (this._missionStartButton && this._missionStartHandler) {
      this._missionStartButton.removeEventListener('click', this._missionStartHandler);
    }
    this._missionOverlay?.remove();
    this._missionOverlay = null;
    this._missionStartButton = null;
    this._missionStartHandler = null;
  }

  _makeRainDrop(W, H, randomY = false) {
    return {
      x:     Math.random() * W,
      y:     randomY ? Math.random() * H : -20,
      speed: 3.5 + Math.random() * 3,
      len:   9 + Math.random() * 10,
      drift: 0.5 + Math.random() * 1,
    };
  }

  _drawRoundRect(gfx, x, y, w, h, r, fillColor, fillAlpha, strokeColor, strokeAlpha) {
    if (fillAlpha > 0) {
      gfx.fillStyle(fillColor, fillAlpha);
      gfx.fillRoundedRect(x, y, w, h, r);
    }
    if (strokeColor && strokeAlpha > 0) {
      gfx.lineStyle(2, strokeColor, strokeAlpha);
      gfx.strokeRoundedRect(x, y, w, h, r);
    }
  }

  _text(x, y, text, style) {
    const obj = this.add.text(x, y, text, style);
    const scale = Math.min(4, Math.max(2, window.devicePixelRatio || 2));
    obj.setResolution(scale);
    return obj;
  }

  _sectionLabel(x, y, label, color, depth) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    this._text(x, y, label, {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '12px', fontStyle: '700',
      color: hex,
    }).setDepth(depth);
    return y + 18;
  }

  _section(x, y, label, body, color, depth, bullets = null) {
    y = this._sectionLabel(x, y, label, color, depth);
    if (body) {
      this._text(x, y, body, {
        fontFamily: '"Poppins", Arial, sans-serif',
        fontSize: '11.5px', fontStyle: '500', color: '#ded8ef',
        wordWrap: { width: 300 }, lineSpacing: 5,
      }).setDepth(depth);
      const lines = body.split('\n').length;
      y += lines * 16 + 10;
    }
    if (bullets) {
      bullets.forEach(b => {
        const text = typeof b === 'string' ? b : b.text;
        if (typeof b !== 'string' && b.highlight) {
          const bg = this.add.graphics().setDepth(depth - 1);
          bg.fillStyle(0x103526, 0.78);
          bg.fillRoundedRect(x - 7, y - 3, 332, 21, 5);
          bg.lineStyle(1, 0x42f5a7, 0.62);
          bg.strokeRoundedRect(x - 7, y - 3, 332, 21, 5);
        }
        this._text(x, y, '• ' + text, {
          fontFamily: '"Poppins", Arial, sans-serif',
          fontSize: '11px',
          fontStyle: typeof b === 'string' ? '500' : '700',
          color: typeof b === 'string' ? '#ded8ef' : '#ffffff',
          wordWrap: { width: 310 },
        }).setDepth(depth);
        y += 18;
      });
      y += 6;
    }
    return y;
  }

  _drawControls(x, y) {
    const keys = [
      { keys: ['W'], label: null },
      { keys: ['A', 'S', 'D'], label: 'Move' },
      { keys: ['SHIFT'], label: 'Run (creates more noise)' },
      { keys: ['E'], label: 'Interact / Pickup / Hide' },
    ];

    const keyH = 20, keyPad = 5;
    const keyColor = 0x1a0840;
    const keyBorder = 0x6622cc;
    const gfx = this.add.graphics().setDepth(6);

    // WASD group
    const wasdRows = [['W'], ['A', 'S', 'D']];
    let ky = y;
    wasdRows.forEach((row, ri) => {
      let kx = x + (ri === 0 ? 22 : 0); // indent W
      row.forEach(k => {
        const kw = k === 'SHIFT' ? 52 : (k.length > 1 ? 40 : 22);
        gfx.fillStyle(keyColor, 0.95);
        gfx.fillRoundedRect(kx, ky, kw, keyH, 4);
        gfx.lineStyle(1.5, keyBorder, 0.85);
        gfx.strokeRoundedRect(kx, ky, kw, keyH, 4);
        this._text(kx + kw / 2, ky + keyH / 2, k, {
          fontFamily: '"Poppins", Arial, sans-serif',
          fontSize: '10px', fontStyle: '600', color: '#e3d8ff',
        }).setOrigin(0.5).setDepth(7);
        kx += kw + keyPad;
      });
      ky += keyH + keyPad;
    });
    // Move label
    this._text(x + 72, y + 8, 'Move', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '11px', fontStyle: '500', color: '#beb1db',
    }).setDepth(6);

    ky += 4;

    // SHIFT row
    const shiftKw = 52;
    gfx.fillStyle(0x3b2410, 0.78);
    gfx.fillRoundedRect(x - 7, ky - 4, 318, keyH + 8, 6);
    gfx.lineStyle(1, 0xffc857, 0.7);
    gfx.strokeRoundedRect(x - 7, ky - 4, 318, keyH + 8, 6);
    gfx.fillStyle(0x2a1550, 0.98);
    gfx.fillRoundedRect(x, ky, shiftKw, keyH, 4);
    gfx.lineStyle(1.5, 0xffc857, 0.95);
    gfx.strokeRoundedRect(x, ky, shiftKw, keyH, 4);
    this._text(x + shiftKw / 2, ky + keyH / 2, 'SHIFT', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '9px', fontStyle: '700', color: '#fff6d0',
    }).setOrigin(0.5).setDepth(7);
    this._text(x + shiftKw + 8, ky + keyH / 2, 'Run (creates more noise)', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '11.5px', fontStyle: '700', color: '#fff1bd',
    }).setOrigin(0, 0.5).setDepth(6);
    ky += keyH + keyPad + 4;

    // E row
    const ekw = 22;
    gfx.fillStyle(keyColor, 0.95);
    gfx.fillRoundedRect(x, ky, ekw, keyH, 4);
    gfx.lineStyle(1.5, keyBorder, 0.85);
    gfx.strokeRoundedRect(x, ky, ekw, keyH, 4);
    this._text(x + ekw / 2, ky + keyH / 2, 'E', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '10px', fontStyle: '600', color: '#e3d8ff',
    }).setOrigin(0.5).setDepth(7);
    this._text(x + ekw + 8, ky + keyH / 2, 'Interact / Pickup / Hide', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '11px', fontStyle: '500', color: '#beb1db',
    }).setOrigin(0, 0.5).setDepth(6);
    ky += keyH + 6;

    return ky;
  }

  _startHeist() {
    if (this._ready) return;
    this._ready = true;
    this._missionOverlay?.classList.add('leaving');
    AM.playSfx(this, 'door_unlock', { volume: 0.6 });
    this.time.delayedCall(300, () => {
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this._removeDomBriefing();
        this.scene.start('GameScene');
      });
    });
  }
}
