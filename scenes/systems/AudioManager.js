/**
 * AudioManager — singleton on window._AM
 * Single source of truth for audio state across all scenes.
 */

const AMBIENT_VOL = 0.26;
const RAIN_VOL    = 0.16;

const AM = {
  ambientMuted: false,
  sfxMuted:     false,

  init(scene) {
    if (window._AM_ambientMuted !== undefined) this.ambientMuted = window._AM_ambientMuted;
    if (window._AM_sfxMuted     !== undefined) this.sfxMuted     = window._AM_sfxMuted;
    window._AM       = this;
    window._bgMuted  = this.ambientMuted;
    window._sfxMuted = this.sfxMuted;
  },

  _persist() {
    window._AM_ambientMuted = this.ambientMuted;
    window._AM_sfxMuted     = this.sfxMuted;
    window._bgMuted  = this.ambientMuted;
    window._sfxMuted = this.sfxMuted;
  },

  // ── Ambient: music + rain ──────────────────────────────────

  startAmbient(scene) {
    this._startTrack(scene, 'menu_music', AMBIENT_VOL, 2200);
    this._startTrack(scene, 'rain',       RAIN_VOL,    1800);
    // DO NOT call applyAmbientVolume here — it races with the fade tweens above.
    // The muted check is already inside _startTrack.
  },

  _startTrack(scene, key, targetVol, fadeDur) {
    try {
      // Kill any leftover tweens on this sound to avoid races
      let snd = scene.sound.get(key);

      if (!snd) {
        // Sound instance doesn't exist yet — add it
        snd = scene.sound.add(key, { loop: true, volume: 0 });
      }

      // Stop cleanly if it was in a weird state
      if (snd.isPaused) snd.resume();

      if (!snd.isPlaying) {
        snd.setVolume(0);
        snd.play();
      }

      // Tween to target vol only if not muted
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
    const targets = { 'menu_music': AMBIENT_VOL, 'rain': RAIN_VOL };
    Object.entries(targets).forEach(([key, vol]) => {
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
    this.applyAmbientVolume(scene, 220);
    return this.ambientMuted;
  },

  toggleSfx(scene) {
    this.sfxMuted = !this.sfxMuted;
    this._persist();
    this.applySfxVolume(scene);
    return this.sfxMuted;
  },

  // Call at scene create() after init() — restores volumes without re-starting tracks
  sync(scene) {
    // Re-apply volumes only — don't restart sounds
    this.applyAmbientVolume(scene, 0);
    this.applySfxVolume(scene);
  },
};

if (window._AM) {
  AM.ambientMuted = window._AM.ambientMuted;
  AM.sfxMuted     = window._AM.sfxMuted;
}

export default AM;
