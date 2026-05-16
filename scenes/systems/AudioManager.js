/**
 * AudioManager — singleton, lives on window._AM
 * Single source of truth for audio state across all scenes.
 *
 * Usage:
 *   import AudioManager from './systems/AudioManager.js';
 *   AudioManager.init(scene);   // call once per scene create()
 *   AudioManager.startAmbient(scene);
 *   AudioManager.stopAmbient(scene);
 *   AudioManager.playSfx(scene, key, opts);
 */

const AMBIENT_VOL = 0.26;
const RAIN_VOL    = 0.16;
const AMBIENT_KEYS = ['menu_music'];
const RAIN_KEYS    = ['rain'];

const AM = {
  ambientMuted: false,
  sfxMuted:     false,

  // called at the start of every scene that uses audio
  init(scene) {
    // Restore from window flags (persist across hot reloads)
    if (window._AM_ambientMuted !== undefined) this.ambientMuted = window._AM_ambientMuted;
    if (window._AM_sfxMuted     !== undefined) this.sfxMuted     = window._AM_sfxMuted;
    window._AM = this;
    // legacy compat shims
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
    this.applyAmbientVolume(scene);
  },

  _startTrack(scene, key, targetVol, fadeDur) {
    try {
      let snd = scene.sound.get(key);
      if (!snd) {
        snd = scene.sound.add(key, { loop: true, volume: 0 });
      }
      if (!snd.isPlaying) {
        snd.setVolume(0);
        snd.play();
      }
      if (!this.ambientMuted) {
        scene.tweens.add({ targets: snd, volume: targetVol, duration: fadeDur });
      }
    } catch(e) {}
  },

  stopAmbient(scene, fadeDur = 700) {
    ['menu_music', 'rain'].forEach(key => {
      try {
        const snd = scene.sound.get(key);
        if (snd && snd.isPlaying) {
          scene.tweens.add({
            targets: snd, volume: 0, duration: fadeDur,
            onComplete: () => { try { snd.stop(); } catch(e) {} }
          });
        }
      } catch(e) {}
    });
  },

  // Soft handoff — keep playing but duck to lower vol
  duckAmbient(scene, toVol = 0.10, fadeDur = 600) {
    ['menu_music', 'rain'].forEach(key => {
      try {
        const snd = scene.sound.get(key);
        if (snd && snd.isPlaying && !this.ambientMuted) {
          scene.tweens.add({ targets: snd, volume: toVol, duration: fadeDur });
        }
      } catch(e) {}
    });
  },

  // Re-raise after duck
  raiseAmbient(scene, fadeDur = 800) {
    this.applyAmbientVolume(scene, fadeDur);
  },

  applyAmbientVolume(scene, fadeDur = 300) {
    const vols = { menu_music: AMBIENT_VOL, rain: RAIN_VOL };
    Object.entries(vols).forEach(([key, vol]) => {
      try {
        const snd = scene.sound.get(key);
        if (!snd) return;
        const target = this.ambientMuted ? 0 : vol;
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

  // ── Scene sync ────────────────────────────────────────────
  // Call at the top of every scene create() after init()
  sync(scene) {
    this.applyAmbientVolume(scene, 0);
    this.applySfxVolume(scene);
  },
};

// Initialise from window on first import
if (window._AM) {
  AM.ambientMuted = window._AM.ambientMuted;
  AM.sfxMuted     = window._AM.sfxMuted;
}

export default AM;
