/**
 * OwnerAI — sleeping → patrol → stir → chase state machine.
 * Accepts a config object to tune thresholds and patrol behaviour per room.
 *
 * Config defaults (Room 1 compatible):
 *   stirThreshold  : 0.55   — noise level that triggers a stir bubble
 *   wakeThreshold  : 0.80   — noise level that triggers full chase
 *   chaseSpeed     : 72     — px/s during chase
 *   stirCooldown   : 2200   — ms between stir events
 *   patrolPoints   : null   — array of {x,y} for patrol (null = stationary)
 *   patrolSpeed    : 38     — px/s during patrol
 */
export default class OwnerAI {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.cfg = {
      stirThreshold : config.stirThreshold  ?? 0.55,
      wakeThreshold : config.wakeThreshold  ?? 0.80,
      chaseSpeed    : config.chaseSpeed     ?? 118,
      stirCooldown  : config.stirCooldown   ?? 2200,
      patrolPoints  : config.patrolPoints   ?? null,
      patrolSpeed   : config.patrolSpeed    ?? 38,
    };

    this.stuckMs     = 0;
    this.lastPos     = { x: 0, y: 0 };
    this.detourUntil = 0;
    this.detourDir   = new Phaser.Math.Vector2(0, 0);
    this.lastStirAt  = 0;
    this.alertScale  = 0.28;
    this._alertPhaseUntil = 0;  // timestamp when alert phase ends → full chase
    this._soundTarget = null;

    // Patrol state
    this._patrolIdx   = 0;
    this._patrolPause = 0; // timestamp until which owner stands still at waypoint
  }

  reset() {
    this.stuckMs      = 0;
    this.lastPos      = { x: 0, y: 0 };
    this.detourUntil  = 0;
    this.detourDir    = new Phaser.Math.Vector2(0, 0);
    this.lastStirAt   = 0;
    this._patrolIdx   = 0;
    this._patrolPause = 0;
    this._alertPhaseUntil = 0;
    this._soundTarget = null;
  }

  setSoundTarget(x, y) {
    this._soundTarget = { x, y };
  }

  update(dt) {
    const s = this.scene;
    const { owner, noiseSystem } = s;
    const noise = noiseSystem.noise;

    if (s.chaseMode) {
      this._handleChase(dt);
      return;
    }

    // Suspicion is now internal only; visible gameplay reacts to sound events.
    if (noise >= this.cfg.stirThreshold && noise < this.cfg.wakeThreshold) {
      const now = s.time.now;
      if (now - this.lastStirAt > this.cfg.stirCooldown) {
        this.reactToSound(0.05, 'stir');
      }
    }

    // Alert phase — owner wakes up and looks around before chasing
    // Triggers from sleeping OR patrol state
    if (noise >= this.cfg.wakeThreshold && (owner.state === 'sleeping' || owner.state === 'patrol')) {
      this.reactToSound(0.16, 'search');
      return;
    }

    // Still in alert/searching phase — move toward the sound source.
    if (owner.state === 'alert' || owner.state === 'searching') {
      this._handleSearch(dt);
      if (s.time.now >= this._alertPhaseUntil) {
        this.forceChase('search');
      }
      return;
    }

    // Patrol or stand still
    if (this.cfg.patrolPoints?.length) {
      this._handlePatrol(dt);
    } else {
      owner.setVelocity(0, 0);
    }
  }

  reactToSound(intensity = 0.04, source = 'noise') {
    const s = this.scene;
    const { owner } = s;
    if (!owner || s.gameOver || s.roomCompleted) return;
    if (s.hidden && intensity < 0.10) return;

    const now = s.time.now;
    if (intensity >= 0.28) {
      this.forceChase(source);
      return;
    }

    if (intensity >= 0.10) {
      if (owner.state === 'chase' || s.chaseMode) return;
      s.chaseMode = true;
      s.chaseModeHappened = true;
      owner.state = 'chase';
      this._alertPhaseUntil = 0;
      if (s.hidden) s.hiddenSuccessfully = true;
      s.setOwnerBreathing(false);
      owner.setTexture(s.ownerAlertTexture ?? 'owner_alert');
      owner.setScale(s.ownerAlertScale ?? this.alertScale);
      this._syncOwnerBody();
      owner.setVisible(true);
      s.tweens.killTweensOf(owner);
      s.ownerWakeBurst('!?');
      s.playSfx('coreTransition', { minGap: 900, delay: 60, volume: 0.45 });
      s.screenShake(10);
      s.flashRed();
      s.updatePrompt(source === 'run' ? 'Loud footsteps. He is coming!' : 'Owner woke up and is coming!', 'danger');
      return;
    }

    if (now - this.lastStirAt > this.cfg.stirCooldown) {
      this.lastStirAt = now;
      if (owner.state === 'sleeping' || owner.state === 'patrol') owner.state = 'disturbed';
      this._soundTarget = this._soundTarget ?? { x: s.player?.x ?? owner.x, y: s.player?.y ?? owner.y };
      s.ownerWakeBurst('?');
      s.playSfx('coreTransition', { minGap: 700, volume: 0.18, rate: 1.12, detune: 40 });
      s.updatePrompt('The owner stirred...', 'warning');
      s.time.delayedCall(900, () => {
        if (!s.chaseMode && owner.state === 'disturbed') {
          owner.state = this.cfg.patrolPoints?.length ? 'patrol' : 'sleeping';
        }
      });
    }
  }

  forceChase(source = 'noise') {
    const s = this.scene;
    const { owner } = s;
    if (!owner || s.gameOver || s.roomCompleted) return;
    s.chaseMode = true;
    s.chaseModeHappened = true;
    owner.state = 'chase';
    this._alertPhaseUntil = 0;
    s.setOwnerBreathing(false);
    owner.setTexture(s.ownerAlertTexture ?? 'owner_alert');
    owner.setScale(s.ownerAlertScale ?? this.alertScale);
    this._syncOwnerBody();
    owner.setVisible(true);
    s.tweens.killTweensOf(owner);
    s.playSfx('coreTransition', { minGap: 700, volume: 0.72 });
    s.screenShake(28);
    s.flashRed();
    s.ownerWakeBurst('!!!');
    s.updatePrompt(source === 'loot' ? 'Loud loot! Run or hide!' : 'Owner is chasing you!', 'danger');
  }

  _handlePatrol(dt) {
    const s = this.scene;
    const { owner } = s;
    const now = s.time.now;

    // Paused at waypoint
    if (now < this._patrolPause) {
      owner.setVelocity(0, 0);
      return;
    }

    const pts = this.cfg.patrolPoints;
    const target = pts[this._patrolIdx % pts.length];
    const dist = Phaser.Math.Distance.Between(owner.x, owner.y, target.x, target.y);

    if (dist < 10) {
      // Reached waypoint — pause then advance
      owner.setVelocity(0, 0);
      this._patrolPause = now + Phaser.Math.Between(600, 1400);
      this._patrolIdx = (this._patrolIdx + 1) % pts.length;
      return;
    }

    const dir = new Phaser.Math.Vector2(target.x - owner.x, target.y - owner.y).normalize();
    owner.setVelocity(dir.x * this.cfg.patrolSpeed, dir.y * this.cfg.patrolSpeed);
  }

  _handleSearch(dt) {
    const s = this.scene;
    const { owner } = s;
    const target = this._soundTarget ?? { x: s.player?.x ?? owner.x, y: s.player?.y ?? owner.y };
    const desired = new Phaser.Math.Vector2(target.x - owner.x, target.y - owner.y);
    if (desired.lengthSq() < 12 * 12) {
      owner.setVelocity(0, 0);
      return;
    }

    desired.normalize();
    let steer = desired.clone();
    const body = owner.body;
    if (body?.blocked?.left || body?.blocked?.right) {
      steer.x = 0;
      if (Math.abs(steer.y) < 0.25) steer.y = body.blocked.left ? 1 : -1;
    }
    if (body?.blocked?.up || body?.blocked?.down) {
      steer.y = 0;
      if (Math.abs(steer.x) < 0.25) steer.x = body.blocked.up ? 1 : -1;
    }
    if (steer.lengthSq() < 0.0001) steer = desired;
    steer.normalize();
    owner.setVelocity(steer.x * (this.cfg.patrolSpeed + 18), steer.y * (this.cfg.patrolSpeed + 18));
  }

  _handleChase(dt) {
    const s = this.scene;
    const { owner, player } = s;

    if (s.hidden) { owner.setVelocity(0, 0); return; }

    s.setOwnerBreathing(false);
    owner.setTexture(s.ownerAlertTexture ?? 'owner_alert');
    owner.setScale(s.ownerAlertScale ?? this.alertScale);
    owner.body.enable = true;
    owner.body.moves = true;

    const inSafe = s.isPlayerInSafeZone();
    const targetX = inSafe
      ? Phaser.Math.Clamp(
          s.safeZoneRect.centerX + Math.sin(s.time.now * 0.004) * (s.safeZoneRect.width * 0.42),
          s.safeZoneRect.left - 28, s.safeZoneRect.right + 28
        )
      : player.x;
    const targetY = inSafe
      ? s.safeZoneRect.bottom + 34 + Math.cos(s.time.now * 0.0035) * 10
      : player.y;

    if (inSafe && Phaser.Math.Distance.Between(owner.x, owner.y, targetX, targetY) < 14) {
      owner.setVelocity(0, 0); return;
    }

    const desired = new Phaser.Math.Vector2(targetX - owner.x, targetY - owner.y);
    if (desired.lengthSq() < 0.0001) { owner.setVelocity(0, 0); return; }
    desired.normalize();

    let steer = desired.clone();
    const body = owner.body;
    if (body?.blocked?.left || body?.blocked?.right) {
      steer.x = 0;
      if (Math.abs(steer.y) < 0.25) steer.y = body.blocked.left ? 1 : -1;
    }
    if (body?.blocked?.up || body?.blocked?.down) {
      steer.y = 0;
      if (Math.abs(steer.x) < 0.25) steer.x = body.blocked.up ? 1 : -1;
    }

    const moved = Phaser.Math.Distance.Between(owner.x, owner.y, this.lastPos.x, this.lastPos.y);
    this.lastPos.x = owner.x;
    this.lastPos.y = owner.y;
    if (moved < 0.35) this.stuckMs += dt; else this.stuckMs = 0;

    if (s.time.now < this.detourUntil) {
      steer = steer.scale(0.35).add(this.detourDir.clone().scale(0.65));
    } else if (this.stuckMs > 380) {
      const clockwise = owner.x < s.safeZoneRect.centerX;
      this.detourDir = clockwise
        ? new Phaser.Math.Vector2(-desired.y, desired.x)
        : new Phaser.Math.Vector2(desired.y, -desired.x);
      this.detourUntil = s.time.now + 850;
      this.stuckMs = 0;
      steer = desired.clone().scale(0.35).add(this.detourDir.clone().scale(0.65));
    }

    if (steer.lengthSq() < 0.0001) steer = desired;
    steer.normalize();
    const speed = this.cfg.chaseSpeed;
    owner.setVelocity(steer.x * speed, steer.y * speed);
    if (owner.body?.velocity?.lengthSq?.() === 0 && desired.lengthSq() > 0.0001) {
      owner.x += steer.x * speed * (dt ?? 16) / 1000;
      owner.y += steer.y * speed * (dt ?? 16) / 1000;
      owner.body.updateFromGameObject();
    }
    owner.setVisible(true);
  }

  resetToSleep(promptText = 'The owner calmed down and went back to sleep.') {
    const s = this.scene;
    s.chaseMode = false;
    s.hidden = false;
    s.hiddenSuccessfully = true;
    s.owner.state = 'sleeping';
    this._alertPhaseUntil = 0;
    s.setOwnerBreathing(true);
    s.owner.setTexture(s.ownerSleepTexture ?? 'owner_sleep');
    s.owner.setScale(s.ownerSleepScale ?? 0.25);
    this._syncOwnerBody();
    s.owner.setVisible(true);
    s.owner.setVelocity(0, 0);
    if (s.ownerSleepPosition) {
      s.owner.body?.reset(s.ownerSleepPosition.x, s.ownerSleepPosition.y);
      s.owner.setPosition(s.ownerSleepPosition.x, s.ownerSleepPosition.y);
      s.owner.setVelocity(0, 0);
    }
    s.player.body.enable = true;
    s.player.setVisible(true);
    s.clearAlertEffects();
    if (promptText) s.updatePrompt(promptText);
    s.playSfx('out', { minGap: 900 });
    s.safeZoneEnterAt = null;
    s.wasInSafeZone = s.isPlayerInSafeZone();
    s.safeZoneSoundArmed = !s.wasInSafeZone;
  }

  _syncOwnerBody() {
    const s = this.scene;
    if (typeof s.applyOwnerFootHitbox === 'function') s.applyOwnerFootHitbox();
    if (typeof s._applyOwnerFootHitbox === 'function') s._applyOwnerFootHitbox();
  }
}
