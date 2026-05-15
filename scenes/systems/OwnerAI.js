/**
 * OwnerAI — sleeping → stir → chase state machine + stuck/detour pathfinding.
 */
export default class OwnerAI {
  constructor(scene) {
    this.scene = scene;
    this.stuckMs = 0;
    this.lastPos = { x: 0, y: 0 };
    this.detourUntil = 0;
    this.detourDir = new Phaser.Math.Vector2(0, 0);
    this.lastStirAt = 0;
    this.alertScale = 0.28;
  }

  reset() {
    this.stuckMs = 0;
    this.lastPos = { x: 0, y: 0 };
    this.detourUntil = 0;
    this.detourDir = new Phaser.Math.Vector2(0, 0);
    this.lastStirAt = 0;
  }

  update(dt) {
    const s = this.scene;
    const { owner, player, noiseSystem } = s;
    const noise = noiseSystem.noise;

    if (s.chaseMode) {
      this._handleChase(dt);
      return;
    }

    // Mid suspicion — stir without waking fully
    if (noise >= 0.55 && noise < 0.8) {
      const now = s.time.now;
      if (now - this.lastStirAt > 2200) {
        this.lastStirAt = now;
        s.ownerWakeBurst('?');
        s.sound.play('coreTransition', { volume: 0.18, rate: 1.12, detune: 40 });
        s.updatePrompt('Shh... the owner is stirring.');
      }
    }

    // Full panic threshold
    if (noise >= 0.8) {
      s.chaseMode = true;
      s.chaseModeHappened = true;
      owner.state = 'chase';
      s.setOwnerBreathing(false);
      owner.setTexture('owner_alert');
      owner.setScale(this.alertScale);
      owner.setVisible(true);
      s.playSfx('coreTransition', { minGap: 1200, delay: 120 });
      s.flashRed();
      s.ownerWakeBurst();
      s.playSfx('fahh', { minGap: 1600, delay: 80 });
      s.tweens.killTweensOf(owner);
      const baseY = owner.y;
      s.tweens.add({ targets: owner, y: baseY - 8, duration: 90, yoyo: true, ease: 'Sine.out' });
      s.tweens.add({ targets: owner, scaleX: this.alertScale * 1.06, scaleY: this.alertScale * 1.06, duration: 110, yoyo: true, ease: 'Back.out' });
      s.screenShake(28);
      s.updatePrompt('OH NO. OWNER HAS ENTERED PANIC MODE.');
      return;
    }

    owner.setVelocity(0, 0);
  }

  _handleChase(dt) {
    const s = this.scene;
    const { owner, player } = s;

    if (s.hidden) { owner.setVelocity(0, 0); return; }

    s.setOwnerBreathing(false);
    owner.setTexture('owner_alert');
    owner.setScale(this.alertScale);

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
    owner.setVelocity(steer.x * 72, steer.y * 72);
    owner.setVisible(true);
  }

  resetToSleep(promptText = 'The owner calmed down and went back to sleep.') {
    const s = this.scene;
    s.chaseMode = false;
    s.hidden = false;
    s.hiddenSuccessfully = true;
    s.owner.state = 'sleeping';
    s.setOwnerBreathing(true);
    s.owner.setTexture('owner_sleep');
    s.owner.setScale(0.25);
    s.owner.setVisible(true);
    s.owner.setVelocity(0, 0);
    s.player.body.enable = true;
    s.player.setVisible(true);
    s.clearAlertEffects();
    if (promptText) s.updatePrompt(promptText);
    s.playSfx('out', { minGap: 900 });
    s.safeZoneEnterAt = null;
    s.wasInSafeZone = s.isPlayerInSafeZone();
    s.safeZoneSoundArmed = !s.wasInSafeZone;
  }
}
