/**
 * AudioManager — singleton on window._AM
 * Single source of truth for audio state across all scenes.
 *
 * IMPORTANT: Browsers block audio until a user gesture.
 * Call AM.unlockAndStart(scene) on first pointer/key event.
 */

const AMBIENT_VOL = 0.26;
const RAIN_VOL    = 0.16;

const AM = {
  ambientMuted: false,
  sfxMuted:     false,
  _started:     false,   // have we kicked off ambient yet?

  init(scene) {
    if (window._AM_ambientMuted !== undefined) this.ambientMuted = window._AM_ambientMuted;
    if (window._AM_sfxMuted     !== undefined) this.sfxMuted     = window._AM_sfxMuted;
    if (window._AM_started      !== undefined) this._started     = window._AM_started;
    window._AM       = this;
    window._bgMuted  = this.ambientMuted;
    window._sfxMuted = this.sfxMuted;
  },

  _persist() {
    window._AM_ambientMuted = this.ambientMuted;
    window._AM_sfxMuted     = this.sfxMuted;
    window._AM_started      = this._started;
    window._bgMuted  = this.ambientMuted;
    window._sfxMuted = this.sfxMuted;
  },

  // ── Ambient ────────────────────────────────────────────────

  // Call this from MainMenuScene — hooks first-interaction unlock
  startAmbientWhenReady(scene) {
    if (this._started) {
      // Already unlocked in a previous scene — just ensure playing
      this._startTrack(scene, 'menu_music', AMBIENT_VOL, 1200);
      this._startTrack(scene, 'rain',       RAIN_VOL,    1000);
      return;
    }

    // Show a subtle "tap to start" pulse on the screen,
    // then start audio on first ANY input event
    const unlock = () => {
      // Remove listeners immediately
      scene.input.off('pointerdown', unlock);
      try { scene.input.keyboard.off('keydown', unlock); } catch(e) {}

      this._started = true;
      this._persist();

      this._startTrack(scene, 'menu_music', AMBIENT_VOL, 2000);
      this._startTrack(scene, 'rain',       RAIN_VOL,    1600);
    };

    // Attach to first user interaction
    scene.input.once('pointerdown', unlock);
    try { scene.input.keyboard.once('keydown', unlock); } catch(e) {}

    // Also try immediately — if audio context already unlocked (e.g. after intro click)
    scene.time.delayedCall(200, () => {
      try {
        const ctx = scene.sound.context;
        if (ctx && ctx.state === 'running' && !this._started) {
          unlock();
        }
      } catch(e) {}
    });
  },

  _startTrack(scene, key, targetVol, fadeDur) {
    try {
      let snd = scene.sound.get(key);
      if (!snd) {
        snd = scene.sound.add(key, { loop: true, volume: 0 });
      }
      if (snd.isPaused) snd.resume();
      if (!snd.isPlaying) {
        snd.setVolume(0);
        snd.play();
      }
      const target = this.ambientMuted ? 0 : targetVol;
      scene.tweens.killTweensOf(snd);
      scene.tweens.add({ targets: snd, volume: target, duration: fadeDur });
    } catch(e) { console.warn('[AM] startTrack error', key, e); }
  },

  stopAmbient(scene, fadeDur = 700) {
    ['menu_music', 'rain'].forEach(key => {
      try {
        const snd = scene.sound.get(key);
        if (snd && (snd.isPlaying || snd.isPaused)) {
          scene.tweens.killTweensOf(snd);
          scene.tweens.add({
            targets: snd, volume: 0, duration: fadeDur,
            onComplete: () => { try { snd.stop(); } catch(e) {} }
          });
        }
      } catch(e) {}
    });
  },

  duckAmbient(scene, toVol = 0.10, fadeDur = 600) {
    ['menu_music', 'rain'].forEach(key => {
      try {
        const snd = scene.sound.get(key);
        if (snd && snd.isPlaying && !this.ambientMuted) {
          scene.tweens.killTweensOf(snd);
          scene.tweens.add({ targets: snd, volume: toVol, duration: fadeDur });
        }
      } catch(e) {}
    });
  },

  raiseAmbient(scene, fadeDur = 800) {
    const vols = { 'menu_music': AMBIENT_VOL, 'rain': RAIN_VOL };
    Object.entries(vols).forEach(([key, vol]) => {
      try {
        const snd = scene.sound.get(key);
        if (!snd) return;
        if (!snd.isPlaying) { snd.setVolume(0); snd.play(); }
        const target = this.ambientMuted ? 0 : vol;
        scene.tweens.killTweensOf(snd);
        scene.tweens.add({ targets: snd, volume: target, duration: fadeDur });
      } catch(e) {}
    });
  },

  applyAmbientVolume(scene, fadeDur = 300) {
    const vols = { 'menu_music': AMBIENT_VOL, 'rain': RAIN_VOL };
    Object.entries(vols).forEach(([key, vol]) => {
      try {
        const snd = scene.sound.get(key);
        if (!snd) return;
        const target = this.ambientMuted ? 0 : vol;
        scene.tweens.killTweensOf(snd);
        if (fadeDur > 0) {
          scene.tweens.add({ targets: snd, volume: target, duration: fadeDur });
        } else {
          snd.setVolume(target);
        }
      } catch(e) {}
    });
  },

  // ── SFX ───────────────────────────────────────────────────

  playSfx(scene, key, opts = {}) {
    if (this.sfxMuted) return;
    try { scene.sound.play(key, opts); } catch(e) {}
  },

  applySfxVolume(scene) {
    const SFX = ['fahh','footstep','pickup','enter','out','safe','success',
                 'coreTransition','neon_buzz','door_unlock'];
    SFX.forEach(k => {
      try {
        const s = scene.sound.get(k);
        if (s) s.setVolume(this.sfxMuted ? 0 : (s._baseVol ?? s.volume));
      } catch(e) {}
    });
  },

  // ── Mute toggles ──────────────────────────────────────────

  toggleAmbient(scene) {
    this.ambientMuted = !this.ambientMuted;
    this._persist();
    if (!this.ambientMuted && !this._started) {
      // User unmuted before audio was started — start now
      this._started = true;
      this._startTrack(scene, 'menu_music', AMBIENT_VOL, 800);
      this._startTrack(scene, 'rain',       RAIN_VOL,    800);
    } else {
      this.applyAmbientVolume(scene, 220);
    }
    return this.ambientMuted;
  },

  toggleSfx(scene) {
    this.sfxMuted = !this.sfxMuted;
    this._persist();
    this.applySfxVolume(scene);
    return this.sfxMuted;
  },

  sync(scene) {
    this.applyAmbientVolume(scene, 0);
    this.applySfxVolume(scene);
  },
};

if (window._AM) {
  AM.ambientMuted = window._AM.ambientMuted;
  AM.sfxMuted     = window._AM.sfxMuted;
  AM._started     = window._AM._started || false;
}

export default AM;
