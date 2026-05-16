import Phaser from 'phaser';
import NoiseSystem  from './systems/NoiseSystem.js';
import LootSystem   from './systems/LootSystem.js';
import OwnerAI      from './systems/OwnerAI.js';
import TimerSystem  from './systems/TimerSystem.js';
import RankSystem   from './systems/RankSystem.js';

/**
 * Room 2 — Gamer / Tech Room
 * Darker, RGB-lit, tighter, 5 loot items.
 * New mechanic: noisy cable zone on the floor.
 */
export default class Room2Scene extends Phaser.Scene {
  constructor() {
    super('Room2Scene');
    this.chaseMode          = false;
    this.hidden             = false;
    this.gameOver           = false;
    this.wallBumpArmed      = true;
    this.playerSafeAlpha    = 1;
    this.safeZoneSoundArmed = true;
    this.lastSideWallBumpAt = 0;
    this.lastFootstepAt     = 0;
    this.exitUnlocked       = false;
    this.roomCompleted      = false;
    this.exitPromptVisible  = false;
    this.exitPromptMode     = '';
    this.chaseModeHappened  = false;
    this.hiddenSuccessfully = false;
    this.safeZoneEnterAt    = null;
    this.wasInSafeZone      = false;
    this.safeZoneCalmMs     = 4000; // slightly faster calm-down
    // Cable zone flag
    this._cablePromptShown  = false;
  }

  /* ───────────────────────── PRELOAD ───────────────────────── */
  preload() {
    // All assets already loaded by GameScene — Phaser caches them.
    // Only load if not already present (handles direct-start of Room2 in dev).
    const safe = (key, path, type = 'image') => {
      if (type === 'image' && this.textures.exists(key)) return;
      if (type === 'audio' && this.cache.audio.exists(key)) return;
      if (type === 'image') this.load.image(key, path);
      if (type === 'audio') this.load.audio(key, path);
    };
    safe('room_bg',          'assets/background/room.png');
    safe('thief_idle_src',   'assets/characters/thief_idle.png');
    safe('thief_walk_1_src', 'assets/characters/thief_walk_1.png');
    safe('thief_walk_2_src', 'assets/characters/thief_walk_2.png');
    safe('owner_sleep_src',  'assets/characters/owner_sleep.png');
    safe('owner_alert_src',  'assets/characters/owner_alert.png');
    safe('thief_walk_up_src','assets/characters/walk_up.png');
    safe('bed_src',    'assets/furniture/bed.png');
    safe('closet_src', 'assets/furniture/closet.png');
    safe('desk_src',   'assets/furniture/desk.png');
    safe('chair_src',  'assets/furniture/chair.png');
    safe('books_src',  'assets/furniture/books.png');
    safe('lamp_src',   'assets/furniture/lamp.png');
    safe('plant_src',  'assets/furniture/plant.png');
    safe('bottle_src', 'assets/props/bottle.png');
    safe('gem_src',    'assets/props/gem.png');
    safe('gold_src',   'assets/props/gold.png');
    safe('key_src',    'assets/props/key.png');

    safe('footstep',       'assets/sounds/footstep.mp3',       'audio');
    safe('fahh',           'assets/sounds/fahh.mp3',           'audio');
    safe('enter',          'assets/sounds/enter.mp3',          'audio');
    safe('pickup',         'assets/sounds/pickup.mp3',         'audio');
    safe('coreTransition', 'assets/sounds/core_transition.mp3','audio');
    safe('out',            'assets/sounds/out.mp3',            'audio');
    safe('safe',           'assets/sounds/safe.mp3',           'audio');
    safe('success',        'assets/sounds/transfer.mp3',       'audio');
  }

  /* ───────────────────────── CREATE ────────────────────────── */
  create() {
    // Reset flags
    this.chaseMode          = false;
    this.hidden             = false;
    this.gameOver           = false;
    this.wallBumpArmed      = true;
    this.playerSafeAlpha    = 1;
    this.safeZoneSoundArmed = true;
    this.lastSideWallBumpAt = 0;
    this.lastFootstepAt     = 0;
    this.exitUnlocked       = false;
    this.roomCompleted      = false;
    this.exitPromptVisible  = false;
    this.exitPromptMode     = '';
    this.chaseModeHappened  = false;
    this.hiddenSuccessfully = false;
    this.safeZoneEnterAt    = null;
    this.wasInSafeZone      = false;
    this._cablePromptShown  = false;
    this.debugWallsEnabled  = new URLSearchParams(window.location.search).has('debugWalls');

    // Update HUD room label
    this._updateRoomLabel();

    // Systems — Room 2 tuning passed into OwnerAI
    this.noiseSystem = new NoiseSystem(this);
    this.lootSystem  = new LootSystem(this);
    this.ownerAI     = new OwnerAI(this, {
      stirThreshold : 0.45,
      wakeThreshold : 0.65,
      chaseSpeed    : 95,
      stirCooldown  : 1600,
      patrolPoints  : [
        { x: 760, y: 200 },
        { x: 500, y: 300 },
        { x: 760, y: 440 },
        { x: 600, y: 180 },
      ],
      patrolSpeed   : 40,
    });
    this.timerSystem = new TimerSystem(this);
    this.timerSystem.seconds = 120; // tighter timer
    this.rankSystem  = new RankSystem(this);

    this._ensureTextures();
    this.createRoom();
    this.createPlayer();
    this.createOwner();
    this.createUI();
    this.bindInput();
    this.createAudio();
    this.setupPolish();
    this.timerSystem.start();
    this.updatePrompt('Room 2. Gamer\'s den. It smells like energy drinks.');
  }

  /* ─────────────────────── HUD LABEL ───────────────────────── */
  _updateRoomLabel() {
    const eyebrow = document.querySelector('.eyebrow');
    const h1      = document.querySelector('#hud h1');
    const subline = document.querySelector('.subline');
    if (eyebrow) eyebrow.textContent = 'ROOM 2 - TECH DEN';
    if (h1)      h1.textContent      = 'Meme Panic Stealth';
    if (subline) subline.textContent = 'Faster owner, more loot, noisy cables!';
  }

  /* ──────────────────── TEXTURE PIPELINE ───────────────────── */
  _ensureTextures() {
    // Textures prepared by GameScene are cached globally — just re-check.
    // If starting Room2 directly in dev, rebuild them.
    const needed = [
      ['thief_idle_src','thief_idle'],['thief_walk_1_src','thief_walk_1'],
      ['thief_walk_2_src','thief_walk_2'],['owner_sleep_src','owner_sleep'],
      ['thief_walk_up_src','walk_up'],['bed_src','bed'],['closet_src','closet'],
      ['desk_src','desk'],['chair_src','chair'],['books_src','books'],
      ['lamp_src','lamp'],['plant_src','plant'],['bottle_src','bottle'],
      ['gem_src','gem'],['gold_src','gold'],['key_src','key']
    ];
    needed.forEach(([src, tgt]) => {
      if (!this.textures.exists(tgt)) this._prepTex(src, tgt);
    });
    if (!this.textures.exists('owner_alert')) {
      this._prepTex('owner_alert_src', 'owner_alert', { keyColorTrim: true, keyColorTolerance: 18 });
    }
  }

  _prepTex(sourceKey, targetKey, options = {}) {
    const source = this.textures.get(sourceKey)?.getSourceImage();
    if (!source) return;
    const canvas = document.createElement('canvas');
    canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    let bg = null;
    if (options.keyColorTrim) {
      const sample = [[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]];
      const sum = [0,0,0];
      sample.forEach(([x,y]) => { const i=(y*canvas.width+x)*4; sum[0]+=data[i]; sum[1]+=data[i+1]; sum[2]+=data[i+2]; });
      bg = sum.map(v => v / sample.length);
    }
    const tol = options.keyColorTolerance ?? 14;
    let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
    for (let y=0;y<canvas.height;y++) for (let x=0;x<canvas.width;x++) {
      const i=(y*canvas.width+x)*4;
      let alpha=data[i+3];
      if (bg && alpha>0) {
        const dr=data[i]-bg[0],dg=data[i+1]-bg[1],db=data[i+2]-bg[2];
        if (dr*dr+dg*dg+db*db<=tol*tol) alpha=0;
      }
      if (alpha>0) { if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
    }
    if (maxX<minX||maxY<minY) { minX=0;minY=0;maxX=canvas.width-1;maxY=canvas.height-1; }
    const pad=options.padding??0;
    const cx=Phaser.Math.Clamp(minX-pad,0,canvas.width-1);
    const cy=Phaser.Math.Clamp(minY-pad,0,canvas.height-1);
    const cw=Phaser.Math.Clamp(maxX-minX+1+pad*2,1,canvas.width-cx);
    const ch=Phaser.Math.Clamp(maxY-minY+1+pad*2,1,canvas.height-cy);
    const cc=document.createElement('canvas'); cc.width=cw; cc.height=ch;
    const cctx=cc.getContext('2d'); cctx.imageSmoothingEnabled=false;
    cctx.drawImage(canvas,cx,cy,cw,ch,0,0,cw,ch);
    if (this.textures.exists(targetKey)) this.textures.remove(targetKey);
    const tex=this.textures.createCanvas(targetKey,cw,ch);
    tex.context.clearRect(0,0,cw,ch); tex.context.drawImage(cc,0,0);
    tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return tex;
  }

  /* ─────────────────────── ROOM SETUP ──────────────────────── */
  createRoom() {
    const W = 960, H = 640;

    // Background — same room.png but darker, blue-tinted
    this.add.image(0, 0, 'room_bg').setOrigin(0).setScale(W/1536, H/1024).setDepth(-50).setTint(0x334466);

    // RGB glow overlay — cycling color tint on the room
    this.rgbOverlay = this.add.rectangle(W*.5, H*.5, W, H, 0x0033ff, 0.07)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(-44);
    this.rgbOverlay2 = this.add.rectangle(W*.5, H*.5, W, H, 0xff0044, 0.04)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(-43);

    this.roomGlow  = this.add.rectangle(W*.5, H*.5, W, H, 0x2244ff, 0.06)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(-45);
    this.vignette  = this.add.rectangle(0, 0, W, H, 0x000000, 0.28)
      .setOrigin(0).setDepth(95);
    this.floorShadow  = this.add.ellipse(480, 390, 680, 340, 0x000000, 0.12).setDepth(1);
    this.floorShadow2 = this.add.ellipse(760, 220, 260, 160, 0x000000, 0.08).setDepth(1);

    // Dust particles (blue-tinted)
    this.dustGroup = this.add.group();
    for (let i = 0; i < 14; i++) {
      const d = this.add.circle(
        Phaser.Math.Between(80, 900), Phaser.Math.Between(60, 580),
        Phaser.Math.Between(1, 2), 0xaaccff, 0.16
      ).setDepth(92);
      d.data = new Phaser.Data.DataManager(d);
      d.data.set('speed', Phaser.Math.FloatBetween(0.04, 0.16));
      this.dustGroup.add(d);
    }

    // Walls (same layout as Room 1)
    this.wallColliders = [];
    this.roomWalls = this.physics.add.staticGroup();
    const addWall = (x, y, w2, h2) => {
      const alpha = this.debugWallsEnabled ? 0.22 : 0;
      const wall = this.add.rectangle(x, y, w2, h2, 0xff3b3b, alpha).setDepth(2);
      if (this.debugWallsEnabled) wall.setStrokeStyle(2, 0xffffff, 0.35);
      this.physics.add.existing(wall, true);
      wall.body.setSize(w2, h2); wall.body.updateFromGameObject();
      this.roomWalls.add(wall); this.wallColliders.push(wall); return wall;
    };
    addWall(216, 40, 384, 26); addWall(480, 40, 144, 26); addWall(744, 40, 384, 26);
    addWall(40, 216, 26, 384); addWall(40, 480, 26, 144); addWall(40, 576, 26, 48);
    addWall(920, 216, 26, 384); addWall(920, 480, 26, 144); addWall(920, 576, 26, 48);
    addWall(216, 600, 384, 26); addWall(480, 600, 144, 26); addWall(744, 600, 384, 26);

    // ── Furniture — Tech Den layout ──
    // Gaming desk (top-left area, big)
    this.desk  = this.add.image(280, 180, 'desk').setScale(0.34).setDepth(20).setTint(0x9988cc);
    this.chair = this.add.image(220, 380, 'chair').setScale(0.24).setDepth(19).setTint(0x222244);
    // Lamp replaced by RGB strip (re-use lamp, tint blue)
    this.lamp  = this.add.image(160, 120, 'lamp').setScale(0.14).setDepth(21).setTint(0x4488ff);
    // Bookshelf → shelves with gear
    this.books = this.add.image(820, 160, 'books').setScale(0.18).setDepth(21).setTint(0x334466);
    // Plants (keep — gamers have plants)
    this.add.image(100, 530, 'plant').setScale(0.22).setDepth(21).setTint(0x226644);
    this.add.image(860, 530, 'plant').setScale(0.20).setDepth(21).setTint(0x226644);
    // "Bed" → gaming couch/beanbag (reuse bed, tint dark purple)
    this.bed = this.add.image(760, 200, 'bed').setScale(0.28).setDepth(20).setTint(0x221133);

    // Safe zone: closet in bottom-right corner
    const closetX = 820, closetY = 430;
    this.closet = this.add.image(closetX, closetY, 'closet').setScale(0.24).setDepth(20).setTint(0x334455);

    // ── CABLE ZONE ── (the new mechanic)
    // A noisy area in the middle-lower section — visually distinct
    this.cableZoneRect = new Phaser.Geom.Rectangle(340, 420, 240, 100);
    this._buildCableZoneVisual();

    // Zones
    this.safeZoneRect = new Phaser.Geom.Rectangle(closetX - 77, closetY - 78, 154, 156);
    this.exitZone     = new Phaser.Geom.Rectangle(408, 56, 144, 96);

    const sbm = 14;
    const sbW = this.safeZoneRect.width + sbm * 2;
    const sbH = this.safeZoneRect.height + sbm * 2;
    this.safeZoneBlock = this.add.rectangle(
      this.safeZoneRect.centerX, this.safeZoneRect.centerY, sbW, sbH, 0x000000, 0
    ).setDepth(2);
    this.physics.add.existing(this.safeZoneBlock, true);
    this.safeZoneBlock.body.setSize(sbW, sbH);
    this.safeZoneBlock.body.updateFromGameObject();

    this.safeZoneShade = this.add.rectangle(
      this.safeZoneRect.centerX, this.safeZoneRect.centerY,
      this.safeZoneRect.width + 22, this.safeZoneRect.height + 22,
      0x000000, 0.12
    ).setDepth(12).setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Furniture shadows
    this.add.ellipse(this.bed.x, this.bed.y + 72, 260, 80, 0x000000, 0.16).setDepth(13);
    this.add.ellipse(closetX, closetY + 74, 162, 88, 0x000000, 0.14).setDepth(15);
    this.add.ellipse(this.desk.x, this.desk.y + 70, 220, 66, 0x000000, 0.14).setDepth(14);
    this.add.ellipse(this.chair.x, this.chair.y + 44, 96, 44, 0x000000, 0.12).setDepth(15);

    // Labels
    this.ownerAlertScale = 0.28;
    this.exitLabel = this.add.text(480, 18, 'EXIT', {
      fontFamily: '"Press Start 2P"', fontSize: '14px',
      color: '#88ccff', stroke: '#0a0a1a', strokeThickness: 4
    }).setOrigin(0.5).setDepth(40).setShadow(0, 2, '#001133', 3, true, true);

    this.closetGlow = this.add.circle(closetX, closetY, 88, 0x4466ff, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
    this.closetRing = this.add.rectangle(closetX, closetY, 128, 156, 0x88aaff, 0.14)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(17);

    this.hideLabelOffsetX = 20; this.hideLabelOffsetY = 50;
    const cb = this.closet.getBounds();
    this.hideLabel = this.add.text(
      cb.centerX + this.hideLabelOffsetX, cb.top + this.hideLabelOffsetY,
      'HIDE\nSPOT',
      { fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#aaccff', stroke: '#0a0a1a', strokeThickness: 4, align: 'center' }
    ).setOrigin(0.5, 1).setDepth(41).setShadow(0, 2, '#001133', 3, true, true);

    // Loot (pass null for bottle — Room 2 loot system creates its own first item)
    this._createLoot();

    this.physics.world.setBounds(0, 0, 960, 640);
  }

  _buildCableZoneVisual() {
    const r = this.cableZoneRect;
    // Base tinted floor area
    this.cableZoneBase = this.add.rectangle(r.centerX, r.centerY, r.width, r.height, 0xff4400, 0.06)
      .setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    // Dashed cable lines (just visual stripes)
    for (let i = 0; i < 4; i++) {
      const cx = r.x + 24 + i * 58;
      this.add.rectangle(cx, r.centerY, 3, r.height - 10, 0xff6622, 0.28).setDepth(4);
    }
    // Label
    this.cableLabel = this.add.text(r.centerX, r.centerY - 8, '⚡ CABLES', {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#ff8844', stroke: '#1a0800', strokeThickness: 3
    }).setOrigin(0.5).setDepth(5).setAlpha(0.6);
  }

  /** Room 2 loot — 5 items using existing sprites with tints */
  _createLoot() {
    const s = this;

    const makeGlow = (x, y, color, r = 32) =>
      s.add.circle(x, y, r, color, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
    const makeRing = (x, y, color) =>
      s.add.ellipse(x, y, 22, 14, color, 0.08).setBlendMode(Phaser.BlendModes.ADD).setDepth(17);
    const makeShadow = (x, y) =>
      s.add.ellipse(x, y + 10, 26, 12, 0x000000, 0.18).setDepth(15);

    // 1. Headphones — desk area, high-value (use bottle sprite, cyan tint)
    const hpSprite = s.add.image(180, 260, 'bottle').setScale(0.15).setDepth(22).setTint(0x00ddff);
    // 2. Keyboard — on desk (use books sprite, purple tint)
    const kbSprite = s.add.image(340, 160, 'books').setScale(0.14).setDepth(22).setTint(0xcc88ff);
    // 3. Gaming Mouse — desk corner (use key sprite, green tint)
    const gmSprite = s.add.image(400, 220, 'key').setScale(0.18).setDepth(22).setTint(0x44ff88);
    // 4. GPU — near books/shelf (use gold sprite, orange tint)
    const gpuSprite = s.add.image(820, 260, 'gold').setScale(0.20).setDepth(22).setTint(0xff6600);
    // 5. Crypto Wallet — dark corner joke item (use gem sprite, yellow tint)
    const cryptoSprite = s.add.image(110, 180, 'gem').setScale(0.16).setDepth(22).setTint(0xffdd00);

    this._lootDefs = [
      {
        id: 'headphones', name: 'Headphones',
        sprite: hpSprite,
        glow: makeGlow(180, 260, 0x00ddff),
        ring: makeRing(180, 260, 0x88eeff),
        shadow: makeShadow(180, 260),
        radius: 38, noise: 0.06, shake: 8,
        prompt: 'Nice headphones. +1 loot.', volume: 0.5,
      },
      {
        id: 'keyboard', name: 'Keyboard',
        sprite: kbSprite,
        glow: makeGlow(340, 160, 0xcc88ff),
        ring: makeRing(340, 160, 0xddaaff),
        shadow: makeShadow(340, 160),
        radius: 38, noise: 0.08, shake: 10,
        prompt: 'Mechanical keyboard. Very clickety.', volume: 0.5,
      },
      {
        id: 'gaming_mouse', name: 'Gaming Mouse',
        sprite: gmSprite,
        glow: makeGlow(400, 220, 0x44ff88),
        ring: makeRing(400, 220, 0x88ffbb),
        shadow: makeShadow(400, 220),
        radius: 34, noise: 0.04, shake: 6,
        prompt: '16000 DPI. Cursed acquisition.', volume: 0.45,
      },
      {
        id: 'gpu', name: 'GPU',
        sprite: gpuSprite,
        glow: makeGlow(820, 260, 0xff6600, 44),
        ring: makeRing(820, 260, 0xff9944),
        shadow: makeShadow(820, 260),
        radius: 40, noise: 0.10, shake: 14,
        prompt: 'RTX 9999. Sweating already.', volume: 0.55,
      },
      {
        id: 'crypto', name: 'Crypto Wallet',
        sprite: cryptoSprite,
        glow: makeGlow(110, 180, 0xffdd00),
        ring: makeRing(110, 180, 0xffee88),
        shadow: makeShadow(110, 180),
        radius: 34, noise: 0.03, shake: 6,
        prompt: 'Crypto wallet. You monster.', volume: 0.45,
      },
    ];

    // Inject into LootSystem manually (bypass LootSystem.create() bottle API)
    this.lootSystem.items = this._lootDefs;
    this.lootSystem.total = this._lootDefs.length;
    this.lootSystem.collectedCount = 0;
    this.lootSystem._syncHUD();

    // Bob tweens on loot sprites
    this._lootDefs.forEach((item, i) => {
      this.tweens.add({
        targets: item.sprite, y: `+=${2 + i % 2}`,
        duration: 1200 + i * 180, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
    });

    // Expose refs GameScene-style for updateAmbient compatibility
    this.bottleGlow   = this._lootDefs[0].glow;
    this.bottleRing   = this._lootDefs[0].ring;
    this.bottleShadow = this._lootDefs[0].shadow;
  }

  /* ─────────────────────── PLAYER ──────────────────────────── */
  createPlayer() {
    this.playerShadow = this.add.ellipse(480, 520, 28, 12, 0x000000, 0.22).setDepth(29);
    this.player = this.physics.add.sprite(480, 520, 'thief_idle');
    this.player.setSize(22, 16).setOffset(27, 58);
    this.player.body.enable = true;
    this.player.speed = 180;
    this.player.runSpeed = 260;
    this.playerDisplayScale = 0.18;
    this.player.setScale(this.playerDisplayScale).setDepth(30).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.wallColliders ?? this.roomWalls, this.onPlayerWallContact, null, this);
  }

  /* ─────────────────────── OWNER ───────────────────────────── */
  createOwner() {
    // Owner starts at patrol point 0
    this.owner = this.physics.add.sprite(760, 200, 'owner_sleep');
    this.owner.setSize(58, 66).setOffset(12, 10);
    this.owner.setImmovable(true).setScale(0.25).setDepth(21).setCollideWorldBounds(true);
    this.owner.body.allowGravity = false;
    this.owner.state = 'sleeping';
    this.physics.add.collider(this.owner, this.wallColliders ?? this.roomWalls);
    this.physics.add.collider(this.owner, this.safeZoneBlock);
    this.physics.add.overlap(this.player, this.owner, () => this.onCaught());
  }

  /* ─────────────────────── UI ───────────────────────────────── */
  createUI() {
    this.promptEl = document.getElementById('prompt');
    this.flash    = this.add.rectangle(0, 0, 960, 640, 0x2244ff, 0).setOrigin(0).setDepth(100);
    this.vignette = this.add.rectangle(0, 0, 960, 640, 0x000011, 0.22)
      .setOrigin(0).setDepth(99).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.lootSystem._syncHUD();
  }

  bindInput() {
    this.cursors = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E');
  }

  createAudio() {
    const add = (k, vol) => this.sound.add(k, { volume: vol });
    this.sfx = {
      footstep:       add('footstep',       0.18),
      fahh:           add('fahh',           0.92),
      enter:          add('enter',          0.6 ),
      pickup:         add('pickup',         0.55),
      coreTransition: add('coreTransition', 0.75),
      out:            add('out',            0.6 ),
      safe:           add('safe',           0.5 ),
      success:        add('success',        0.85),
    };
  }

  setupPolish() {
    this.time.delayedCall(80, () => this.cameras.main.flash(180, 10, 20, 60));
    this.tweens.add({ targets: this.chair, y: '+=1.2', duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.ownerBobTween   = this.tweens.add({ targets: this.owner, y: '+=1.2', duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.ownerPulseTween = this.tweens.add({ targets: this.owner, scaleX: 0.102, scaleY: 0.098, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.setOwnerBreathing(true);
  }

  /* ─────────────────────── UPDATE LOOP ─────────────────────── */
  update(time, delta) {
    if (this.gameOver) return;
    this.handlePlayer(delta);
    this.updateWallBumpArming();
    this.handleInteract(time);
    this.ownerAI.update(delta);
    this.noiseSystem.update(delta, this.chaseMode);
    this.updateMovementAudio(time);
    this.updateSafeZoneTransition(time);
    this.updateOwnerState(time);
    this.checkExitInteraction();
    this.updateCableZone(delta);    // NEW
    this.updateAmbientMotion(time);
    this.updatePlayerReadability();
    this.updatePlayerSafeZoneVisual(delta);
    this.timerSystem.update(delta);
    this.updateExitGlow(time);
    this.updateRGBCycle(time);      // NEW
  }

  /* ─────────────────────── CABLE ZONE ──────────────────────── */
  updateCableZone(delta) {
    if (!this.player || this.hidden || this.gameOver) return;
    const inCable = Phaser.Geom.Rectangle.Contains(this.cableZoneRect, this.player.x, this.player.y);
    if (!inCable) return;

    // Noise per frame — mild but persistent
    this.noiseSystem.add(0.009 * (delta / 16));

    // Show prompt once
    if (!this._cablePromptShown) {
      this._cablePromptShown = true;
      this.updatePrompt('Careful — cables crunch underfoot!');
    }

    // Visual pulse on zone
    if (this.cableZoneBase) {
      this.cableZoneBase.alpha = 0.10 + Math.random() * 0.06;
    }
  }

  /* ─────────────────────── RGB CYCLE ───────────────────────── */
  updateRGBCycle(time) {
    if (!this.rgbOverlay) return;
    const t = time * 0.0008;
    const r = Math.sin(t) * 0.5 + 0.5;
    const g = Math.sin(t + 2.094) * 0.5 + 0.5;
    const b = Math.sin(t + 4.189) * 0.5 + 0.5;
    const color = Phaser.Display.Color.GetColor(Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255));
    this.rgbOverlay.setFillStyle(color, 0.05);
  }

  /* ─────────────────────── PLAYER LOGIC ────────────────────── */
  handlePlayer(delta) {
    if (this.player?.body && !this.hidden && !this.player.body.enable) this.player.body.enable = true;
    if (this.player && !this.hidden) this.player.setVisible(true);

    const left  = (this.cursors.A.isDown  || this.cursors.LEFT.isDown)  ? -1 : 0;
    const right = (this.cursors.D.isDown  || this.cursors.RIGHT.isDown) ?  1 : 0;
    const up    = (this.cursors.W.isDown  || this.cursors.UP.isDown)    ? -1 : 0;
    const down  = (this.cursors.S.isDown  || this.cursors.DOWN.isDown)  ?  1 : 0;
    const moving = left || right || up || down;
    const speed = this.cursors.SHIFT.isDown ? this.player.runSpeed : this.player.speed;
    const target = new Phaser.Math.Vector2(left + right, up + down).normalize().scale(moving ? speed : 0);
    this.player.body.velocity.x = Phaser.Math.Linear(this.player.body.velocity.x, target.x, 0.28);
    this.player.body.velocity.y = Phaser.Math.Linear(this.player.body.velocity.y, target.y, 0.28);

    if (moving && this.cursors.SHIFT.isDown) {
      this.noiseSystem.add(0.12 * Math.max(0, delta ?? 16) / 1000);
    }
    this.player.setDrag(1000, 1000);
    this.updatePlayerAnimation({ moving, left, right, up, down });
  }

  handleInteract(time) {
    if (!Phaser.Input.Keyboard.JustDown(this.cursors.E) || this.hidden || this.gameOver) return;
    const loot = this.lootSystem.getClosest(this.player.x, this.player.y, 48);
    if (loot) { this.lootSystem.collect(loot); return; }
    const nearCloset = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.closet.x, this.closet.y) < 54;
    if (nearCloset) this.tryHide();
  }

  updateWallBumpArming() {
    if (!this.player?.body) return;
    const b = this.player.body;
    const touching = b.blocked.left||b.blocked.right||b.blocked.up||b.blocked.down||
                     b.touching.left||b.touching.right||b.touching.up||b.touching.down;
    if (!touching) this.wallBumpArmed = true;
  }

  updatePlayerAnimation({ moving, left, right, up, down }) {
    const active = !!moving;
    if (!active) {
      if (this.currentPlayerTexture !== 'thief_idle') { this.player.setTexture('thief_idle'); this.currentPlayerTexture = 'thief_idle'; }
      this.player.setFlipX(false); return;
    }
    if (up || down) {
      const tex = up ? 'walk_up' : 'thief_idle';
      if (this.currentPlayerTexture !== tex) { this.player.setTexture(tex); this.currentPlayerTexture = tex; }
      this.player.setFlipX(false); return;
    }
    const frame = Math.floor(this.time.now / 140) % 2 === 0 ? 'thief_walk_1' : 'thief_walk_2';
    if (frame !== this.currentPlayerTexture) { this.player.setTexture(frame); this.currentPlayerTexture = frame; }
    if (left) this.player.setFlipX(false);
    else if (right) this.player.setFlipX(true);
  }

  updatePlayerSafeZoneVisual(delta) {
    if (!this.player || this.hidden || this.gameOver) return;
    const inSafe = this.isPlayerInSafeZone();
    const target = inSafe ? 0.55 : 1.0;
    const t = Phaser.Math.Clamp((delta ?? 16) / 1000, 0.01, 0.05);
    this.playerSafeAlpha = Phaser.Math.Linear(this.playerSafeAlpha ?? 1, target, 0.22 + t);
    this.player.setAlpha(this.playerSafeAlpha);
    if (this.playerOutline) this.playerOutline.setAlpha(this.playerSafeAlpha * 0.55);
    if (this.playerShadow)  this.playerShadow.setAlpha(inSafe ? 0.14 : 0.22);
  }

  updatePlayerReadability() {
    if (!this.player) return;
    if (!this.playerOutline) {
      this.playerOutline = this.add.image(this.player.x, this.player.y, this.player.texture.key)
        .setTint(0x0a0a14).setAlpha(0.55).setDepth(29);
    }
    this.playerOutline.setTexture(this.player.texture.key);
    this.playerOutline.setScale(this.player.scaleX * 1.08, this.player.scaleY * 1.08);
    this.playerOutline.x = this.player.x;
    this.playerOutline.y = this.player.y;
    this.playerOutline.setVisible(this.player.visible);
    this.player.setTint(this.chaseMode ? 0xddeeff : 0xeeeeff);
  }

  /* ─────────────────────── WALL COLLISIONS ─────────────────── */
  isSideWall(solid) {
    const body = solid?.body;
    return !!body && body.width <= 30 && body.height > body.width && (solid.x < 120 || solid.x > 840);
  }

  bumpPlayerBackFromSideWall(solid) {
    if (!this.isSideWall(solid) || !this.player?.body) return;
    const dir = solid.x < this.player.x ? 1 : -1;
    this.player.body.reset(Phaser.Math.Clamp(this.player.x + dir * 18, 48, 912), this.player.y);
  }

  onPlayerWallContact(_player, solid) {
    if (this.gameOver || this.hidden || this.isWallTouchExempt()) return;
    if (this.isSideWall(solid)) {
      const now = this.time.now;
      if (now - (this.lastSideWallBumpAt ?? 0) < 420) return;
      this.lastSideWallBumpAt = now;
    } else {
      if (!this.wallBumpArmed) return;
      this.wallBumpArmed = false;
    }
    this.noiseSystem.add(0.08);
    this.playSfx('fahh', { minGap: 180, delay: 10 });
    this.bumpPlayerBackFromSideWall(solid);

    if (this.chaseMode) { this.screenShake(16); return; }
    if (this.noiseSystem.noise >= this.ownerAI.cfg.wakeThreshold) {
      this.chaseMode = true; this.owner.state = 'chase';
      this.setOwnerBreathing(false);
      this.owner.setTexture('owner_alert').setScale(this.ownerAlertScale).setVisible(true);
      this.playSfx('coreTransition', { minGap: 1200, delay: 90 });
      this.flashRed(); this.screenShake(80); this.ownerWakeBurst();
      this.updatePrompt('Wall bump! Owner heard it.');
    } else {
      this.screenShake(10);
      this.updatePrompt('Careful... noise builds fast in here.');
    }
  }

  /* ─────────────────────── SAFE ZONE ───────────────────────── */
  isPlayerInSafeZone() { return this.safeZoneRect ? Phaser.Geom.Rectangle.Contains(this.safeZoneRect, this.player.x, this.player.y) : false; }
  isPlayerInExitZone() { return this.exitZone      ? Phaser.Geom.Rectangle.Contains(this.exitZone,    this.player.x, this.player.y) : false; }
  isWallTouchExempt()  { return this.isPlayerInSafeZone() || this.isPlayerInExitZone(); }

  updateSafeZoneTransition(time) {
    const inSafe = this.isPlayerInSafeZone();
    if (inSafe) {
      if (this.safeZoneSoundArmed) {
        this.safeZoneSoundArmed = false; this.safeZoneEnterAt = time;
        this.playSfx('safe', { minGap: 700 });
        this.updatePrompt('Inside the closet zone. Stay still.');
      }
    } else { this.safeZoneEnterAt = null; this.safeZoneSoundArmed = true; }

    if (this.player && !this.hidden) {
      if (inSafe && !this.playerDimmed) {
        this.playerDimmed = true;
        this.tweens.killTweensOf(this.player);
        this.tweens.add({ targets: this.player, alpha: 0.65, duration: 140, ease: 'Sine.out' });
      } else if (!inSafe && this.playerDimmed) {
        this.playerDimmed = false;
        this.tweens.killTweensOf(this.player);
        this.tweens.add({ targets: this.player, alpha: 1, duration: 140, ease: 'Sine.out' });
      }
    }
    this.wasInSafeZone = inSafe;
  }

  updateOwnerState(time) {
    if (!this.chaseMode) {
      this.setOwnerBreathing(true);
      this.owner.setTexture('owner_sleep').setScale(0.25).setVisible(true);
      return;
    }
    const inSafe = this.isPlayerInSafeZone();
    if (inSafe && this.safeZoneEnterAt == null) this.safeZoneEnterAt = time;
    if (!inSafe && this.safeZoneEnterAt != null) this.safeZoneEnterAt = null;

    if (this.hidden && this.chaseMode) {
      this.noiseSystem.noise = Phaser.Math.Clamp(this.noiseSystem.noise - 0.02, 0, 1);
      if (this.noiseSystem.noise < 0.18) this.ownerAI.resetToSleep('You hid. Owner gave up.');
      return;
    }
    if (this.safeZoneEnterAt != null && time - this.safeZoneEnterAt >= this.safeZoneCalmMs) {
      this.noiseSystem.noise = Phaser.Math.Clamp(this.noiseSystem.noise - 0.1, 0, 1);
      this.ownerAI.resetToSleep('Zone went quiet. Owner resumed patrol.');
    }
  }

  tryHide() {
    if (!this.chaseMode || this.hidden) return;
    if (this.safeZoneRect && Phaser.Geom.Rectangle.Contains(this.safeZoneRect, this.player.x, this.player.y)) {
      this.hidden = true;
      this.player.setVisible(false);
      this.player.body.enable = false;
      this.player.setVelocity(0, 0);
      this.playSfx('enter', { minGap: 900, delay: 40 });
      this.updatePrompt('Stashed between old desks. Don\'t breathe.');
    }
  }

  /* ─────────────────────── EXIT ────────────────────────────── */
  checkExitInteraction() {
    const inExit = this.isPlayerInExitZone();
    if (!inExit) { this.exitPromptVisible = false; this.exitPromptMode = ''; return; }
    if (this.gameOver) return;
    if (!this.lootSystem.allCollected()) {
      if (this.exitPromptMode !== 'blocked') {
        this.exitPromptVisible = true; this.exitPromptMode = 'blocked';
        this.updatePrompt(`Still missing loot! (${this.lootSystem.collectedCount}/${this.lootSystem.total}) — loot first.`);
        this.onExitDenied();
      }
      return;
    }
    if (this.exitPromptMode !== 'ready') {
      this.exitPromptVisible = true; this.exitPromptMode = 'ready';
      this.updatePrompt('All loot! Press E to escape.');
    }
    if (!Phaser.Input.Keyboard.JustDown(this.cursors.E)) return;
    this.completeRoom();
  }

  completeRoom() {
    if (this.roomCompleted) return;
    this.roomCompleted = true; this.gameOver = true;
    this.timerSystem.stop();
    this.player.setVelocity(0, 0); this.owner.setVelocity(0, 0);
    this.playSfx('success', { minGap: 2000, delay: 70 });
    this.cameras.main.fade(600, 14, 9, 9);
    this.updatePrompt('ESCAPED Room 2!');
    this.time.delayedCall(620, () => this.rankSystem.showEscapeScreen());
  }

  onCaught() {
    if (this.hidden || this.gameOver || !this.chaseMode) return;
    this.gameOver = true; this.timerSystem.stop();
    this.player.setVelocity(0, 0); this.owner.setVelocity(0, 0);
    this.updatePrompt('BUSTED by the gamer! The shame.');
    this.screenShake(140); this.flashRed();
    this.sound.play('fahh', { volume: 1.0, rate: 0.9, detune: -220 });
    this.add.text(480, 312, 'BUSTED!', {
      fontFamily: '"Press Start 2P"', fontSize: '30px',
      color: '#fffbf2', stroke: '#a51f1f', strokeThickness: 6
    }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(1600, () => this.rankSystem.showBustedScreen());
  }

  onExitDenied() {
    const el = document.getElementById('prompt'); if (!el) return;
    el.classList.remove('deny-shake'); void el.offsetWidth;
    el.classList.add('deny-shake');
    el.addEventListener('animationend', () => el.classList.remove('deny-shake'), { once: true });
    this.screenShake(6);
  }

  /* ─────────────────────── AMBIENT ─────────────────────────── */
  updateAmbientMotion(time) {
    const t = time * 0.001;
    this.roomGlow.alpha = 0.06 + Math.sin(t * 1.2) * 0.01;

    const chasePulse = this.chaseMode ? (0.5 + Math.sin(t * 3.2) * 0.5) : 0;
    this.vignette.alpha = this.chaseMode ? 0.34 : 0.22 + Math.sin(t * 0.7) * 0.008;
    this.flash.alpha = Math.max(this.flash.alpha, this.chaseMode ? 0.02 + chasePulse * 0.03 : 0);
    this.floorShadow.alpha  = 0.16 + Math.sin(t * 0.9) * 0.008;
    this.floorShadow2.alpha = 0.08 + Math.cos(t * 1.1) * 0.006;

    if (this.ownerWakeText) this.ownerWakeText.x = this.owner.x + 6;
    if (this.dustGroup) this.dustGroup.children.each(d => {
      d.y -= d.data.get('speed');
      if (d.y < 24) { d.y = 620; d.x = Phaser.Math.Between(50, 910); }
    });

    if (this.closetGlow) { this.closetGlow.x = this.closet.x; this.closetGlow.y = this.closet.y; }
    if (this.closetRing) { this.closetRing.x = this.closet.x; this.closetRing.y = this.closet.y; }
    if (this.hideLabel && this.closet) {
      const cb = this.closet.getBounds();
      this.hideLabel.x = cb.centerX + (this.hideLabelOffsetX ?? 0);
      this.hideLabel.y = cb.top + (this.hideLabelOffsetY ?? 0);
    }
    if (this.safeZoneShade) {
      this.safeZoneShade.x = this.safeZoneRect.centerX; this.safeZoneShade.y = this.safeZoneRect.centerY;
      const inSafe = this.isPlayerInSafeZone() || this.hidden;
      this.safeZoneShade.alpha = (inSafe ? 0.18 : 0.10) + Math.sin(t * 1.1) * 0.01;
    }
    if (this.playerShadow) {
      const moving = this.player?.body ? (Math.abs(this.player.body.velocity.x) + Math.abs(this.player.body.velocity.y)) > 6 : false;
      const bob = moving ? Math.sin(t * 10) * 1.1 : 0;
      this.playerShadow.x = this.player.x + 2; this.playerShadow.y = this.player.y + 3 + bob;
      this.playerShadow.scaleX = 1 + (moving ? 0.06 : 0); this.playerShadow.scaleY = 1 + (moving ? 0.03 : 0);
    }

    const pulse = 0.5 + Math.sin(t * 2.4) * 0.5;
    if (this.closetGlow) { this.closetGlow.setScale(1 + pulse * 0.10); this.closetGlow.alpha = 0.12 + pulse * 0.14; }
    if (this.closetRing) { this.closetRing.setScale(1 + pulse * 0.03); this.closetRing.alpha = 0.12 + pulse * 0.12; }

    this.lootSystem.updateAmbient(time);
  }

  updateExitGlow(time) {
    if (!this.exitGlowObj) {
      this.exitGlowObj = this.add.circle(480, 28, 68, 0x88ccff, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(38);
    }
    if (this.lootSystem.allCollected()) {
      const p = 0.5 + Math.sin(time * 0.003) * 0.5;
      this.exitGlowObj.alpha = 0.18 + p * 0.14;
    } else {
      this.exitGlowObj.alpha = 0;
    }
  }

  /* ─────────────────────── AUDIO ───────────────────────────── */
  updateMovementAudio(time) {
    const moving = this.cursors.A.isDown||this.cursors.D.isDown||this.cursors.W.isDown||this.cursors.S.isDown||
                   this.cursors.LEFT.isDown||this.cursors.RIGHT.isDown||this.cursors.UP.isDown||this.cursors.DOWN.isDown;
    if (!moving) { this.lastFootstepAt = 0; return; }
    const sprinting = this.cursors.SHIFT.isDown;
    const interval = sprinting ? 180 : 260, volume = sprinting ? 0.22 : 0.16;
    if (time - this.lastFootstepAt < interval) return;
    this.lastFootstepAt = time;
    this.sound.play('footstep', { volume, rate: sprinting ? 1.08 : 1.0, detune: sprinting ? 10 : 0 });
  }

  playSfx(key, options = {}) {
    const sound = this.sfx?.[key]; if (!sound) return;
    const now = this.time.now;
    const minGap = options.minGap ?? 0;
    const gateKey = `last${key[0].toUpperCase()}${key.slice(1)}At`;
    if (minGap > 0 && now - (this[gateKey] ?? 0) < minGap) return;
    this[gateKey] = now;
    const play = () => {
      if (options.volume != null) sound.setVolume(options.volume);
      if (options.rate != null)   sound.setRate(options.rate);
      if (options.detune != null) sound.setDetune(options.detune);
      sound.play();
    };
    options.delay ? this.time.delayedCall(options.delay, play) : play();
  }

  /* ─────────────────────── FX HELPERS ──────────────────────── */
  flashRed() {
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0);
    this.tweens.add({ targets: this.flash, alpha: 0.34, duration: 90, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    this.updatePromptStyle(true);
  }

  screenShake(intensity) { this.cameras.main.shake(intensity, intensity * 0.015); }

  ownerWakeBurst(symbol = '!') {
    if (this.ownerWakeText) this.ownerWakeText.destroy();
    this.ownerWakeText = this.add.text(this.owner.x + 6, this.owner.y - 18, symbol, {
      fontFamily: '"Press Start 2P"',
      fontSize: symbol === '!' ? '24px' : '18px',
      color: '#aaddff', stroke: '#001133', strokeThickness: 4
    }).setDepth(120).setOrigin(0.5);
    this.tweens.add({
      targets: this.ownerWakeText, y: this.owner.y - 38, alpha: 0, duration: 650, ease: 'Sine.out',
      onComplete: () => this.ownerWakeText && this.ownerWakeText.destroy()
    });
  }

  clearAlertEffects() { this.flash.setAlpha(0); this.updatePromptStyle(false); }

  updatePromptStyle(alert) {
    const el = document.getElementById('prompt'); if (!el) return;
    el.style.boxShadow = alert ? '0 0 18px rgba(50,100,255,0.45)' : '0 8px 0 rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.08)';
    el.style.borderColor = alert ? '#4466cc' : '#5a3a2c';
  }

  updatePrompt(text) {
    const el = this.promptEl; if (!el) return;
    el.style.opacity = '0.72'; el.style.transform = 'translateY(2px) scale(0.99)';
    window.clearTimeout(this.promptResetTimer);
    el.textContent = text;
    this.promptResetTimer = window.setTimeout(() => {
      el.style.opacity = '1'; el.style.transform = 'translateY(0) scale(1)';
    }, 20);
  }

  setOwnerBreathing(active) {
    if (this.ownerBobTween)   this.ownerBobTween.paused   = !active;
    if (this.ownerPulseTween) this.ownerPulseTween.paused = !active;
  }
}
