/**
 * FurnitureSystem — reusable footprint-based furniture collision.
 *
 * HOW IT WORKS:
 *   - Furniture PNGs are visual only — no physics on them.
 *   - Each piece gets ONE invisible static rectangle placed at its
 *     walk-blocking edge (front/base from the player's approach).
 *   - Player collides with these via Arcade physics — clean, no drift.
 *   - Touching any footprint plays fahh + tiny noise + small pushback.
 *   - ?debugWalls=true draws all footprints visibly for tuning.
 *
 * USAGE:
 *   this.furnitureSystem = new FurnitureSystem(this);
 *   this.furnitureSystem.init();                  // call in create()
 *   this.furnitureSystem.add('desk', 300, 240, 110, 18);
 *   this.furnitureSystem.wirePlayer(this.player); // after player created
 *
 * FOOTPRINT ARGS:
 *   add(label, cx, cy, w, h)
 *     cx/cy = CENTER of the blocking rectangle in world space
 *     w/h   = width/height of the rectangle
 *
 * DEBUG:
 *   Append ?debugWalls=true to URL — all footprints rendered cyan.
 *   Each is labeled with its furniture name.
 */
export default class FurnitureSystem {
  constructor(scene) {
    this.scene       = scene;
    this.group       = null;   // Phaser StaticGroup
    this.footprints  = [];     // { label, rect }
    this.debug       = false;
    this._lastBumpAt = 0;
    this._bumping    = false;
  }

  /** Call once in scene create(), before adding any footprints. */
  init() {
    this.debug = this.scene.debugWallsEnabled || false;
    this.group = this.scene.physics.add.staticGroup();
    if (this.debug) {
      this._gfx = this.scene.add.graphics().setDepth(200);
    }
  }

  /**
   * Auto-derive footprint from a sprite object.
   * Places a thin block at the BOTTOM FRONT edge of the sprite.
   * @param {string} label
   * @param {Phaser.GameObjects.Image} sprite
   * @param {number} [widthFrac=0.7]  — fraction of sprite width to block
   * @param {number} [yFrac=0.72]     — how far down the sprite (0=top,1=bottom)
   */
  addFromSprite(label, sprite, widthFrac = 0.7, yFrac = 0.72) {
    const sw  = sprite.displayWidth;
    const sh  = sprite.displayHeight;
    const w   = sw * widthFrac;
    const h   = 16;
    const cx  = sprite.x;
    const cy  = (sprite.y - sh / 2) + sh * yFrac;
    return this.add(label, cx, cy, w, h);
  }

  /**
   * Add one furniture footprint.
   * @param {string} label  — name shown in debug mode
   * @param {number} cx     — world X center of block
   * @param {number} cy     — world Y center of block
   * @param {number} w      — block width
   * @param {number} h      — block height
   */
  /**
   * Add one furniture footprint.
   * @param {string}  label   — name shown in debug mode
   * @param {number}  cx      — world X center of block
   * @param {number}  cy      — world Y center of block
   * @param {number}  w       — block width
   * @param {number}  h       — block height
   * @param {object}  [opts]  — { silent: true } = no fahh sound on collision
   */
  add(label, cx, cy, w, h, opts = {}) {
    const s = this.scene;

    // Invisible physics rectangle
    const rect = s.add.rectangle(cx, cy, w, h, 0xffffff, 0).setDepth(50);
    s.physics.add.existing(rect, true);   // true = static
    // Set body position explicitly — cx/cy are CENTER coords
    rect.body.reset(cx, cy);
    rect.body.setSize(w, h);
    rect.body.position.x = cx - w / 2;
    rect.body.position.y = cy - h / 2;

    // Debug overlay — drawn on top via Graphics so it's always visible
    if (this.debug && this._gfx) {
      this._gfx.lineStyle(2, 0x00ffff, 1);
      this._gfx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      this._gfx.fillStyle(0x00ffff, 0.3);
      this._gfx.fillRect(cx - w / 2, cy - h / 2, w, h);
      s.add.text(cx, cy, label, {
        fontFamily: 'monospace', fontSize: '9px',
        color: '#00ffff', stroke: '#000000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(201).setAlpha(1);
    }

    // Store silent flag directly on the rect object
    rect._silent = opts.silent ?? false;

    this.group.add(rect);
    this.footprints.push({ label, rect });
    return rect;
  }

  /**
   * Wire the player sprite to collide with all footprints.
   * Call AFTER createPlayer() so player body exists.
   */
  wirePlayer(player) {
    this.scene.physics.add.collider(
      player,
      this.group,
      this._onHit.bind(this),
      null,
      this
    );
  }

  /** Also wire the owner so they don't walk through furniture. */
  wireOwner(owner) {
    this.scene.physics.add.collider(owner, this.group);
  }

  _onHit(player, block) {
    const s   = this.scene;
    const now = s.time.now;

    if (s.gameOver || s.hidden) return;

    // Suppress if this footprint is marked silent
    if (block._silent) return;

    // Suppress if player is within pickup range of any loot item (avoids false fahh near loot)
    if (s._lootItems) {
      const closeToLoot = s._lootItems.some(item => {
        if (item.collected || !item.sprite?.visible) return false;
        return Phaser.Math.Distance.Between(player.x, player.y, item.sprite.x, item.sprite.y) < 55;
      });
      if (closeToLoot) return;
    }

    // Gate: don't fire repeatedly every frame
    if (now - this._lastBumpAt < 320) return;
    this._lastBumpAt = now;

    // Small noise — less than wall bumps
    s.noiseSystem.add(0.04, 'bump');
    s.playSfx('fahh', { minGap: 300, volume: 0.32 });
    s.screenShake(5);
    s.updatePrompt('Careful. That made noise.', 'warning');

    // Pushback — nudge player away from block center
    const dx = player.x - block.x;
    const dy = player.y - block.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const pushX = (dx / len) * 24;
    const pushY = (dy / len) * 24;
    player.body.reset(player.x + pushX, player.y + pushY);
  }
}
