import Phaser from 'phaser';
import NoiseSystem     from './systems/NoiseSystem.js';
import OwnerAI         from './systems/OwnerAI.js';
import TimerSystem     from './systems/TimerSystem.js';
import RankSystem      from './systems/RankSystem.js';
import FurnitureSystem from './systems/FurnitureSystem.js';
import MuteButton      from './systems/MuteButton.js';
import AM              from './systems/AudioManager.js';

/**
 * Room 2 — Gamer / Tech Room
 * Reference image layout:
 *   TOP-LEFT:    gaming desk + chair
 *   TOP-CENTER:  shelf / wardrobe door (exit above)
 *   TOP-RIGHT:   wardrobe (SAFE ZONE) + closet organizer
 *   BOTTOM-LEFT: tech side-table + plant
 *   BOTTOM-CENTER: bean bag + coffee table
 *   BOTTOM-RIGHT: sofa (owner sleeping) + floor lamp + plant
 *   MID-RIGHT:   cable zone (noisy floor area, glowing cyan circle)
 * Timer: 120 seconds
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
    this.safeZoneCalmMs     = 4500;
    this._cableZoneActive   = false;
    this._cableNoiseArmed   = true;
    this.currentPlayerTexture = null;
    this.playerDimmed       = false;
    this.catchContactMs     = 0;
    this.lastRunNoiseAt     = 0;
    this.toastTimer         = null;
    this.roomIntroActive    = false;
  }

  /* ───────────────────────── PRELOAD ───────────────────────── */
  preload() {
    const safeImg = (key, path) => { if (!this.textures.exists(key)) this.load.image(key, path); };
    const safeAud = (key, path) => { if (!this.cache.audio.exists(key)) this.load.audio(key, path); };

    // Shared character assets (may already be loaded from Room 1)
    safeImg('thief_idle_src',   'assets/characters/thief_idle.png');
    safeImg('thief_walk_1_src', 'assets/characters/thief_walk_1.png');
    safeImg('thief_walk_2_src', 'assets/characters/thief_walk_2.png');
    safeImg('thief_walk_up_src','assets/characters/walk_up.png');

    // Room 2 exclusive assets
    safeImg('r2_bg',        'assets/room2/bg.png');
    safeImg('r2_owner_src', 'assets/room2/owner2.png');
    safeImg('r2_cpdesk',    'assets/room2/furniture/cpDesk.png');
    safeImg('r2_chair',     'assets/room2/furniture/chair.png');
    safeImg('r2_gmgtable',  'assets/room2/furniture/gmgtable.png');
    safeImg('r2_sofa',      'assets/room2/furniture/sofa.png');
    safeImg('r2_wardrobe',  'assets/room2/furniture/wardrobe.png');
    safeImg('r2_bag',       'assets/room2/furniture/bag.png');
    safeImg('r2_plant1',    'assets/room2/furniture/plant1.png');
    safeImg('r2_plant2',    'assets/room2/furniture/plant2.png');
    safeImg('r2_gpu',       'assets/room2/loot/gpu.png');
    safeImg('r2_headphone', 'assets/room2/loot/headphone.png');
    safeImg('r2_keyboard',  'assets/room2/loot/keyboard.png');
    safeImg('r2_mouse',     'assets/room2/loot/mouse.png');
    safeImg('r2_usb',       'assets/room2/loot/usb.png');

    // Sounds (same pool as Room 1)
    safeAud('footstep',       'assets/sounds/footstep.mp3');
    safeAud('fahh',           'assets/sounds/fahh.mp3');
    safeAud('enter',          'assets/sounds/enter.mp3');
    safeAud('pickup',         'assets/sounds/pickup.mp3');
    safeAud('door_unlock',    'assets/sounds/door_unlock.mp3');
    safeAud('coreTransition', 'assets/sounds/core_transition.mp3');
    safeAud('out',            'assets/sounds/out.mp3');
    safeAud('safe',           'assets/sounds/safe.mp3');
    safeAud('success',        'assets/sounds/transfer.mp3');
  }

  /* ───────────────────────── CREATE ────────────────────────── */
  create() {
    // Show game HUD for Room 2
    document.body.classList.remove('hud-hidden');
    document.body.classList.add('hud-visible');
    document.getElementById('end-screen')?.classList.add('hidden');
    document.getElementById('message-toast')?.classList.add('hidden');
    this.input.enabled = true;
    if (this.input.keyboard) this.input.keyboard.enabled = true;
    this.physics.world.resume();

    // Reset all flags
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
    this._cableZoneActive   = false;
    this._cableNoiseArmed   = true;
    this.currentPlayerTexture = null;
    this.playerDimmed       = false;
    this.playerOutline      = null;
    this.debugWallsEnabled  = new URLSearchParams(window.location.search).has('debugWalls');
    this.debugHitboxesEnabled = new URLSearchParams(window.location.search).has('debugHitboxes');
    this.catchContactMs     = 0;
    this.lastRunNoiseAt     = 0;
    this.roomIntroActive    = true;

    // Systems
    this.noiseSystem     = new NoiseSystem(this);
    this.timerSystem     = new TimerSystem(this, 120);
    this.rankSystem      = new RankSystem(this);
    this.furnitureSystem = new FurnitureSystem(this);
    this.furnitureSystem.init();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._cleanupSceneState());

    this._prepareTextures();
    this._createRoom();
    this._createPlayer();
    this._createOwner();
    this._createLoot();
    this._createUI();
    this._bindInput();
    this._createAudio();
    this._setupPolish();
    this.physics.world.resume();
    this.input.enabled = true;
    if (this.input.keyboard) this.input.keyboard.enabled = true;

    // Owner AI — harder config for Room 2
    this.ownerAI = new OwnerAI(this, {
      stirThreshold : 0.45,   // reacts earlier
      wakeThreshold : 0.72,   // lower wake bar
      chaseSpeed    : 88,     // faster chase
      stirCooldown  : 1800,
      patrolPoints  : [
        { x: 820, y: 490 },   // sofa area (start)
        { x: 690, y: 350 },   // mid right
        { x: 600, y: 430 },   // cable zone edge
        { x: 760, y: 240 },   // top right
        { x: 820, y: 490 },   // back to sofa
      ],
      patrolSpeed   : 44,
    });

    this.player.setVelocity(0, 0);
    this.owner.setVelocity(0, 0);
    this.timerSystem.start(120);
    this.updatePrompt('New apartment. Stay quiet.');

    this.cameras.main.fadeIn(850, 0, 0, 0);
    this.time.delayedCall(760, () => {
      this.roomIntroActive = false;
      this.updatePrompt('New apartment. Stay quiet.', 'info');
    });
  }

  _cleanupSceneState() {
    window.clearTimeout(this.promptResetTimer);
    window.clearTimeout(this.toastTimer);
    try { this.physics?.world?.resume(); } catch(e) {}
    try { this.input.keyboard?.removeAllListeners(); } catch(e) {}
    try { this.events?.removeAllListeners('update'); } catch(e) {}
  }

  /* ──────────────────── TEXTURE PIPELINE ───────────────────── */
  _prepareTextures() {
    const pairs = [
      ['thief_idle_src','thief_idle'],
      ['thief_walk_1_src','thief_walk_1'],
      ['thief_walk_2_src','thief_walk_2'],
      ['thief_walk_up_src','walk_up'],
    ];
    pairs.forEach(([src, tgt]) => {
      if (!this.textures.exists(tgt)) this._cropTex(src, tgt);
    });
    // Owner alert (reuse from Room 1 if exists, otherwise use r2_owner)
    if (!this.textures.exists('owner_alert')) {
      this._cropTex('r2_owner_src', 'owner_alert', { keyColorTrim: true, keyColorTolerance: 18 });
    }
    // Room 2 owner sleep texture
    this._cropTex('r2_owner_src', 'r2_owner_sleep', { keyColorTrim: true, keyColorTolerance: 18 });
    // Room 2 furniture
    const furniturePairs = [
      ['r2_cpdesk','r2t_cpdesk'],['r2_chair','r2t_chair'],
      ['r2_gmgtable','r2t_gmgtable'],['r2_sofa','r2t_sofa'],
      ['r2_wardrobe','r2t_wardrobe'],['r2_bag','r2t_bag'],
      ['r2_plant1','r2t_plant1'],['r2_plant2','r2t_plant2'],
    ];
    furniturePairs.forEach(([src, tgt]) => this._cropTex(src, tgt, { keyColorTrim: true, keyColorTolerance: 22 }));
    // Loot
    const lootPairs = [
      ['r2_gpu','r2t_gpu'],['r2_headphone','r2t_headphone'],
      ['r2_keyboard','r2t_keyboard'],['r2_mouse','r2t_mouse'],
      ['r2_usb','r2t_usb'],
    ];
    lootPairs.forEach(([src, tgt]) => this._cropTex(src, tgt, { keyColorTrim: true, keyColorTolerance: 24 }));
  }

  _cropTex(sourceKey, targetKey, options = {}) {
    if (this.textures.exists(targetKey)) return;
    const source = this.textures.get(sourceKey)?.getSourceImage();
    if (!source) return;
    const canvas = document.createElement('canvas');
    canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;

    let bg = null;
    if (options.keyColorTrim) {
      const corners = [[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]];
      const sum = [0,0,0];
      corners.forEach(([x,y]) => { const i=(y*canvas.width+x)*4; sum[0]+=data[i]; sum[1]+=data[i+1]; sum[2]+=data[i+2]; });
      bg = sum.map(v => v / corners.length);
    }

    const tol = options.keyColorTolerance ?? 14;
    let minX=canvas.width, minY=canvas.height, maxX=-1, maxY=-1;
    for (let y=0;y<canvas.height;y++) for (let x=0;x<canvas.width;x++) {
      const i=(y*canvas.width+x)*4;
      let alpha = data[i+3];
      if (bg && alpha>0) {
        const dr=data[i]-bg[0], dg=data[i+1]-bg[1], db=data[i+2]-bg[2];
        if (dr*dr+dg*dg+db*db <= tol*tol) alpha=0;
      }
      if (alpha>0) { if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
    }
    if (maxX < minX || maxY < minY) { minX=0; minY=0; maxX=canvas.width-1; maxY=canvas.height-1; }

    const pad = options.padding ?? 0;
    const cx  = Phaser.Math.Clamp(minX-pad, 0, canvas.width-1);
    const cy  = Phaser.Math.Clamp(minY-pad, 0, canvas.height-1);
    const cw  = Phaser.Math.Clamp(maxX-minX+1+pad*2, 1, canvas.width-cx);
    const ch  = Phaser.Math.Clamp(maxY-minY+1+pad*2, 1, canvas.height-cy);

    const cc = document.createElement('canvas'); cc.width=cw; cc.height=ch;
    const cctx = cc.getContext('2d'); cctx.imageSmoothingEnabled=false;
    cctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);

    if (this.textures.exists(targetKey)) this.textures.remove(targetKey);
    const tex = this.textures.createCanvas(targetKey, cw, ch);
    tex.context.clearRect(0,0,cw,ch); tex.context.drawImage(cc, 0, 0);
    tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return tex;
  }

  /* ─────────────────────── ROOM SETUP ──────────────────────── */
  _createRoom() {
    const W=960, H=640;
    // Background
    this.add.image(0,0,'r2_bg').setOrigin(0).setScale(W/1536, H/1024).setDepth(-50);

    // Atmosphere layers — dark with RGB tint
    this.roomGlow = this.add.rectangle(W*.5,H*.5,W,H,0x00e5ff,0.03)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(-45);
    this.vignette = this.add.rectangle(0,0,W,H,0x000000,0.22).setOrigin(0).setDepth(95);
    this.flash    = this.add.rectangle(0,0,W,H,0xff3b3b,0).setOrigin(0).setDepth(100);

    // Dust particles
    this.dustGroup = this.add.group();
    for (let i=0;i<14;i++) {
      const d = this.add.circle(
        Phaser.Math.Between(50,910), Phaser.Math.Between(60,580),
        Phaser.Math.Between(1,2), 0x6effff, 0.10
      ).setDepth(92).setBlendMode(Phaser.BlendModes.ADD);
      d.data = new Phaser.Data.DataManager(d);
      d.data.set('speed', Phaser.Math.FloatBetween(0.04, 0.15));
      this.dustGroup.add(d);
    }

    // ── WALLS ────────────────────────────────────────────────
    this.wallColliders = [];
    this.roomWalls = this.physics.add.staticGroup();
    const addWall = (x,y,w2,h2) => {
      const alpha = this.debugWallsEnabled ? 0.22 : 0;
      const wall = this.add.rectangle(x,y,w2,h2,0xff3b3b,alpha).setDepth(2);
      if (this.debugWallsEnabled) wall.setStrokeStyle(2,0xffffff,0.35);
      this.physics.add.existing(wall, true);
      wall.body.setSize(w2,h2); wall.body.updateFromGameObject();
      this.roomWalls.add(wall); this.wallColliders.push(wall); return wall;
    };
    // Top wall — leave the center open for the exit door.
    addWall(216,40,384,26); addWall(744,40,384,26);
    // Left wall
    addWall(40,216,26,384); addWall(40,480,26,144); addWall(40,576,26,48);
    // Right wall
    addWall(920,216,26,384); addWall(920,480,26,144); addWall(920,576,26,48);
    // Bottom wall — full
    addWall(216,600,384,26); addWall(480,600,144,26); addWall(744,600,384,26);

    // ── FURNITURE SPRITES (reference image layout) ────────────
    // TOP-LEFT: gaming desk + chair
    this.cpDesk = this.add.image(230, 230, 'r2t_cpdesk').setScale(0.28).setDepth(20);
    this.gamingChair = this.add.image(370, 240, 'r2t_chair').setScale(0.22).setDepth(19).setAngle(-10);

    // TOP-CENTER: small shelf/gmg table (bottom-center position)
    this.gmgTable = this.add.image(340, 550, 'r2t_gmgtable').setScale(0.22).setDepth(20);

    // TOP-RIGHT: wardrobe (SAFE ZONE) — ref shows it right of center-right
    const wardrobeX = 820, wardrobeY = 150;
    this.wardrobe = this.add.image(wardrobeX, wardrobeY, 'r2t_wardrobe').setScale(0.28).setDepth(20);

    // CENTER: bean bag on carpet (swapped from cable zone position)
    this.techBag = this.add.image(610, 380, 'r2t_bag').setScale(0.22).setDepth(20);

    // BOTTOM-RIGHT: sofa (owner sleeps here) — flipped to face left toward desk
    this.sofa = this.add.image(820, 480, 'r2t_sofa').setScale(0.28).setDepth(20).setFlipX(true).setAngle(90);

    // Plants — near desk (bottom-left) and near sofa (bottom-right)
    this.plant1 = this.add.image(100, 520, 'r2t_plant1').setScale(0.18).setDepth(21);
    this.plant2 = this.add.image(650, 130, 'r2t_plant2').setScale(0.18).setDepth(21);

    // ── FURNITURE FOOTPRINTS ─────────────────────────────────
    // Gaming desk — blocks front-bottom edge
    { const sp = this.cpDesk, sw = sp.displayWidth, sh = sp.displayHeight;
      this.furnitureSystem.add('cpDesk', 180, 200, sw*0.40, 16); }
    // Gaming chair — small base footprint
    this.furnitureSystem.add('chair',  380,240, 40, 20);
    // GMG table — blocks bottom edge
    { const sp = this.gmgTable, sw = sp.displayWidth, sh = sp.displayHeight;
      this.furnitureSystem.add('shelf', sp.x, 480, 55, 40); }
    // Wardrobe — NO footprint: it's the safe zone, player must walk in freely
    // Sofa — front edge blocker
    { const sp = this.sofa, sw = sp.displayWidth, sh = sp.displayHeight;
      this.furnitureSystem.add('sofa', sp.x, 450 , 16, sw*0.5); }
    // Bag/side-table
    this.furnitureSystem.add('bag', 640,320, 60, 30);
    // Plants — tiny collision circles
    this.furnitureSystem.addFromSprite('plant1', this.plant1, 0.16, 0.50);
    this.furnitureSystem.addFromSprite('plant2', this.plant2, 0.16, 0.50);

    // ── CABLE ZONE (noisy floor area) ────────────────────────
    // Mid-right as per reference — glowing cyan circle on floor
    this.cableZonePos = { x: 140, y: 510 };
    this.cableZoneRadius = 72;
    this.cableZoneGlow = this.add.circle(
      this.cableZonePos.x, this.cableZonePos.y,
      this.cableZoneRadius, 0x00fff7, 0.10
    ).setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
    this.cableZoneRing = this.add.circle(
      this.cableZonePos.x, this.cableZonePos.y,
      this.cableZoneRadius + 6, 0x00fff7, 0
    ).setDepth(5);
    // Cable zone label
    this.add.text(this.cableZonePos.x, this.cableZonePos.y + this.cableZoneRadius - 10, 'CABLE ZONE', {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#00fff7', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(6).setAlpha(0.65);

    // ── SAFE ZONE (wardrobe) ──────────────────────────────────
    this.safeZoneRect = new Phaser.Geom.Rectangle(
      wardrobeX - 66, wardrobeY - 80, 132, 120
    );
    this.exitZone = new Phaser.Geom.Rectangle(408, 30, 144, 90);

    // Invisible safe-zone blocker (owner can't enter)
    const sbm = 12;
    const sbW = this.safeZoneRect.width + sbm*2;
    const sbH = this.safeZoneRect.height + sbm*2;
    this.safeZoneBlock = this.add.rectangle(
      this.safeZoneRect.centerX, this.safeZoneRect.centerY, sbW, sbH, 0x000000, 0
    ).setDepth(2);
    this.physics.add.existing(this.safeZoneBlock, true);
    this.safeZoneBlock.body.setSize(sbW, sbH); this.safeZoneBlock.body.updateFromGameObject();

    this.safeZoneShade = this.add.rectangle(
      this.safeZoneRect.centerX, this.safeZoneRect.centerY,
      this.safeZoneRect.width + 20, this.safeZoneRect.height + 20,
      0x000000, 0.10
    ).setDepth(12).setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Wardrobe glow (cyan for RGB vibe)
    this.wardrobeGlow = this.add.circle(wardrobeX, wardrobeY, 80, 0x00fff7, 0.16)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
    this.wardrobeRing = this.add.rectangle(wardrobeX, wardrobeY, 118, 140, 0x00e5ff, 0.14)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(17);

    // Hide spot label
    const wb = this.wardrobe.getBounds();
    this.hideLabel = this.add.text(
      wb.centerX, wb.top + 50, 'HIDE\nSPOT', {
        fontFamily: '"Press Start 2P"', fontSize: '10px',
        color: '#00ffff', stroke: '#0d1f3c', strokeThickness: 4, align: 'center'
      }
    ).setOrigin(0.5, 1).setDepth(41).setShadow(0,2,'#0d1f3c',3,true,true);

    // Shadows under furniture
    this.add.ellipse(this.cpDesk.x, this.cpDesk.y + 60, 220, 70, 0x000000, 0.16).setDepth(13);
    this.add.ellipse(this.sofa.x, this.sofa.y + 60, 200, 70, 0x000000, 0.16).setDepth(13);
    this.add.ellipse(wardrobeX, wardrobeY + 70, 140, 60, 0x000000, 0.14).setDepth(13);

    // Exit label
    this.exitLabel = this.add.text(480, 18, 'EXIT', {
      fontFamily: '"Press Start 2P"', fontSize: '14px',
      color: '#00ffff', stroke: '#0d1f3c', strokeThickness: 4
    }).setOrigin(0.5).setDepth(40).setShadow(0, 2, '#0d1f3c', 3, true, true);

    // Exit glow placeholder (animated in update)
    this.exitGlowObj = null;

    this.physics.world.setBounds(0, 0, W, H);
  }

  /* ─────────────────────── LOOT ───────────────────────────── */
  _createLoot() {
    const s = this;
    // 5 loot items — placed in risky, hard-to-reach spots per reference
    const makeGlow = (x, y, color, r=22) =>
      s.add.circle(x, y, r, color, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(18);
    const makeRing = (x, y, color) =>
      s.add.circle(x, y, 14, color, 0.08).setBlendMode(Phaser.BlendModes.ADD).setDepth(17);
    const makeShadow = (x, y) =>
      s.add.ellipse(x, y+10, 24, 10, 0x000000, 0.18).setDepth(16);

    // Scale for loot sprites
    const LS = 0.11;

    // 1. GPU — near desk corner (risky, near patrol start)
    const gpuX=250, gpuY=300;
    const gpu  = s.add.image(gpuX, gpuY, 'r2t_gpu').setScale(LS).setDepth(24);

    // 2. Headphones — on shelf top-center (hard to reach, noise zone nearby)
    const hpX=530, hpY=170;
    const hp   = s.add.image(hpX, hpY, 'r2t_headphone').setScale(LS).setDepth(24);

    // 3. Keyboard — near wardrobe edge (safe zone adjacent, risky)
    const kbX=780, kbY=290;
    const kb   = s.add.image(kbX, kbY, 'r2t_keyboard').setScale(LS).setDepth(24).setAngle(20);

    // 4. Mouse — inside cable zone (noisiest spot)
    const msX=340, msY=450;
    const ms   = s.add.image(msX, msY, 'r2t_mouse').setScale(0.1).setDepth(24).setAngle(70);

    // 5. USB — near sofa edge (owner sleeps here — max risk)
    const usbX=650, usbY=530;
    const usb  = s.add.image(usbX, usbY, 'r2t_usb').setScale(0.1).setDepth(24).setAngle(-30);

    this._lootItems = [
      { id:'gpu',      name:'GPU',          sprite:gpu, glow:makeGlow(gpuX, gpuY, 0xff6f00), ring:makeRing(gpuX, gpuY, 0xffab40), shadow:makeShadow(gpuX,gpuY), radius:38, noise:0.08, shake:8,  prompt:'GPU grabbed!' },
      { id:'headphone',name:'Headphones',   sprite:hp,  glow:makeGlow(hpX,  hpY,  0x00e5ff), ring:makeRing(hpX,  hpY,  0x80d8ff), shadow:makeShadow(hpX,hpY),  radius:36, noise:0.04, shake:6,  prompt:'RGB headphones snagged!' },
      { id:'keyboard', name:'Keyboard',     sprite:kb,  glow:makeGlow(kbX,  kbY,  0xaa00ff), ring:makeRing(kbX,  kbY,  0xce93d8), shadow:makeShadow(kbX,kbY),  radius:38, noise:0.06, shake:7,  prompt:'Keyboard lifted!' },
      { id:'mouse',    name:'Gaming Mouse', sprite:ms,  glow:makeGlow(msX,  msY,  0x00ff9d), ring:makeRing(msX,  msY,  0x69ffcb), shadow:makeShadow(msX,msY),  radius:36, noise:0.12, shake:10, prompt:'Mouse got — noisy cable zone!' },
      { id:'usb',      name:'Crypto USB',   sprite:usb, glow:makeGlow(usbX, usbY, 0xffd600), ring:makeRing(usbX, usbY, 0xffe57f), shadow:makeShadow(usbX,usbY),radius:34, noise:0.14, shake:12, prompt:'USB key — high risk, high reward!' },
    ];
    this._lootTotal     = this._lootItems.length;
    this._lootCollected = 0;
    this._syncLootHUD();
  }

  _getLootClosest(px, py, range=48) {
    let closest=null, minD=Infinity;
    for (const item of this._lootItems) {
      if (item.collected || !item.sprite?.visible) continue;
      const d = Phaser.Math.Distance.Between(px, py, item.sprite.x, item.sprite.y);
      if (d<=range && d<minD) { closest=item; minD=d; }
    }
    return closest;
  }

  _collectLoot(item) {
    if (!item || item.collected) return;
    item.collected = true;
    this._lootCollected = Math.min(this._lootCollected+1, this._lootTotal);
    this._syncLootHUD();

    // Pickup FX
    this._spawnPickupFX(item.sprite.x, item.sprite.y);
    this.noiseSystem.add(item.noise ?? 0.06, 'loot');
    this.playSfx('pickup', { minGap:180, volume:0.55 });
    this.screenShake(item.shake ?? 6);
    this.updatePrompt(`${item.prompt} (${this._lootCollected}/${this._lootTotal})`, 'success');

    // Tween + hide
    const sx=item.sprite.scaleX, sy=item.sprite.scaleY;
    this.tweens.add({
      targets: item.sprite, scaleX:sx*1.2, scaleY:sy*1.2, alpha:0,
      duration:160, ease:'Back.out',
      onComplete: () => { item.sprite.setVisible(false); item.sprite.setAlpha(1); item.sprite.setScale(sx,sy); }
    });
    if (item.shadow) item.shadow.setVisible(false);
    if (item.glow)   item.glow.setVisible(false);
    if (item.ring)   item.ring.setVisible(false);

    if (this._lootCollected >= this._lootTotal) {
      this.updatePrompt('All 5 items secured. Get to the EXIT.', 'success');
    }
  }

  _allLootCollected() {
    return this._lootTotal > 0 && this._lootCollected >= this._lootTotal;
  }

  _syncLootHUD() {
    const col = Math.min(this._lootCollected, this._lootTotal);
    const pct = this._lootTotal > 0 ? Math.round(col / this._lootTotal * 100) : 0;
    const lootCountEl = document.getElementById('loot-count');
    const lootFillEl  = document.getElementById('loot-fill');
    const objEl       = document.getElementById('objective-status');
    if (lootCountEl) lootCountEl.textContent = `${col}/${this._lootTotal}`;
    if (lootFillEl)  lootFillEl.style.width  = `${pct}%`;
    if (objEl) {
      if (!this._lootTotal) objEl.textContent = 'Loading loot...';
      else if (col >= this._lootTotal) objEl.textContent = 'All loot secured. Head for the exit!';
      else objEl.textContent = 'Collect all 5 items before escaping.';
    }
  }

  _spawnPickupFX(x, y) {
    for (let i=0;i<7;i++) {
      const p = this.add.circle(x, y-6, Phaser.Math.Between(1,2), 0x00ffff, 0.9)
        .setDepth(120).setBlendMode(Phaser.BlendModes.ADD);
      const a = Phaser.Math.FloatBetween(0, Math.PI*2);
      const r = Phaser.Math.Between(10, 28);
      this.tweens.add({ targets:p, x:x+Math.cos(a)*r, y:y-6+Math.sin(a)*r,
        alpha:0, duration:280, ease:'Sine.out', onComplete:()=>p.destroy() });
    }
    const ft = this.add.text(x, y-18, '+1 Loot', {
      fontFamily:'"Press Start 2P"', fontSize:'11px',
      color:'#00ffff', stroke:'#0d1f3c', strokeThickness:4
    }).setOrigin(0.5).setDepth(121);
    this.tweens.add({ targets:ft, y:y-44, alpha:0, duration:540, ease:'Sine.out',
      onComplete:()=>ft.destroy() });
  }

  /* ─────────────────────── PLAYER ──────────────────────────── */
  _createPlayer() {
    this.playerShadow = this.add.ellipse(480,520,28,12,0x000000,0.22).setDepth(29);
    this.player = this.physics.add.sprite(480, 530, 'thief_idle');
    this.player.setSize(22,16).setOffset(27,58);
    this.player.body.enable = true;
    this.player.speed    = 210;
    this.player.runSpeed = 310;
    this.playerDisplayScale = 0.18;
    this.player.setScale(this.playerDisplayScale).setDepth(30).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.wallColliders ?? this.roomWalls, this._onPlayerWallContact, null, this);
    this.furnitureSystem.wirePlayer(this.player);
    this._resetPlayerToStart();
  }

  /* ─────────────────────── OWNER ───────────────────────────── */
  _createOwner() {
    // Scene-level owner texture config — used by OwnerAI.resetToSleep()
    this.ownerSleepTexture = 'r2_owner_sleep';
    this.ownerSleepScale   = 0.24;

    // Owner sleeps on sofa
    const sleepTex = this.textures.exists('r2_owner_sleep') ? 'r2_owner_sleep' : 'r2_owner_src';
    this.ownerSleepPosition = { x: 820, y: 470 };
    this.owner = this.physics.add.sprite(820, 470, sleepTex);
    this.owner.setImmovable(true).setScale(0.24).setDepth(22).setCollideWorldBounds(true);
    this.owner.body.allowGravity = false;
    this.owner.state = 'sleeping';
    this._applyOwnerFootHitbox();

    this.physics.add.collider(this.owner, this.wallColliders ?? this.roomWalls);
    this.physics.add.collider(this.owner, this.safeZoneBlock);
    this._resetOwnerToStart();
  }

  _resetPlayerToStart() {
    if (!this.player) return;
    this.player.body?.reset(480, 530);
    this.player.setPosition(480, 530);
    this.player.setVelocity(0, 0);
    this.player.setTexture('thief_idle').setVisible(true).setAlpha(1).setFlipX(false);
    this.player.body.enable = true;
    this.player.setSize(22,16).setOffset(27,58);
    this.currentPlayerTexture = 'thief_idle';
  }

  _resetOwnerToStart() {
    if (!this.owner) return;
    const sleepTex = this.textures.exists('r2_owner_sleep') ? 'r2_owner_sleep' : 'r2_owner_src';
    this.owner.body?.reset(820, 470);
    this.owner.setPosition(820, 470);
    this.owner.setVelocity(0, 0);
    this.owner.body.enable = true;
    this.owner.body.moves = true;
    this.owner.state = 'sleeping';
    this.owner.setTexture(sleepTex).setScale(0.24).setVisible(true).setAlpha(1);
    this._applyOwnerFootHitbox();
    this.chaseMode = false;
    this.catchContactMs = 0;
  }

  _applyOwnerFootHitbox() {
    if (!this.owner?.body || !this.owner.frame) return;
    const frame = this.owner.frame;
    const bodyW = Math.min(30, Math.max(22, frame.width * 0.32));
    const bodyH = Math.min(20, Math.max(14, frame.height * 0.18));
    const offsetX = (frame.width - bodyW) / 2;
    const offsetY = frame.height - bodyH - 5;
    this.owner.setSize(bodyW, bodyH);
    this.owner.setOffset(offsetX, offsetY);
    this.owner.body.updateFromGameObject();
  }

  /* ─────────────────────── UI ──────────────────────────────── */
  _createUI() {
    this.promptEl = document.getElementById('prompt');
    this._syncLootHUD();
  }

  _bindInput() {
    this.cursors = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E');
    // Dev: press 1 to go back to room 1
    this.input.keyboard.once('keydown-ONE', () => this.scene.start('GameScene'));
  }

  _createAudio() {
    this.sfx = {
      footstep:       this.sound.add('footstep',       { volume:0.18 }),
      fahh:           this.sound.add('fahh',            { volume:0.92 }),
      enter:          this.sound.add('enter',           { volume:0.6  }),
      pickup:         this.sound.add('pickup',          { volume:0.55 }),
      door_unlock:    this.sound.add('door_unlock',     { volume:0.65 }),
      coreTransition: this.sound.add('coreTransition',  { volume:0.75 }),
      out:            this.sound.add('out',             { volume:0.6  }),
      safe:           this.sound.add('safe',            { volume:0.5  }),
      success:        this.sound.add('success',         { volume:0.85 })
    };

    // Audio manager sync — keep ambient music running through gameplay
    AM.init(this);
    AM.sync(this);
    AM.raiseAmbient(this, 800);

    // Mute button — top-right corner, bg audio only
    this._muteBtn = new MuteButton(this);
    this.time.delayedCall(80, () => this._muteBtn.sync());
  }

  _setupPolish() {
    // Owner breathing bob on sofa
    this.ownerBobTween = this.tweens.add({
      targets:this.owner, y:'+=1.4', duration:2600, yoyo:true, repeat:-1, ease:'Sine.inOut'
    });
    this.ownerPulseTween = this.tweens.add({
      targets:this.owner, scaleX:0.098, scaleY:0.094, duration:2400, yoyo:true, repeat:-1, ease:'Sine.inOut'
    });
    this.setOwnerBreathing(true);

    // Plant gentle sway
    this.tweens.add({ targets:this.plant1, angle:1.2, duration:2200, yoyo:true, repeat:-1, ease:'Sine.inOut' });
    this.tweens.add({ targets:this.plant2, angle:-1.2, duration:2600, yoyo:true, repeat:-1, ease:'Sine.inOut' });

    // Wardrobe glow pulse
    this.tweens.add({
      targets:this.wardrobeGlow, alpha:0.22, duration:1600, yoyo:true, repeat:-1, ease:'Sine.inOut'
    });
  }

  /* ─────────────────────── UPDATE ──────────────────────────── */
  update(time, delta) {
    if (this.gameOver) return;
    this._handlePlayer(delta);
    this._updateWallBumpArming();
    this._handleInteract(time);
    this.ownerAI.update(delta);
    this.noiseSystem.update(delta, this.chaseMode);
    this._updateMovementAudio(time);
    this._updateSafeZoneTransition(time);
    this._updateOwnerState(time);
    this._checkExitInteraction();
    this._updateAmbient(time);
    this._updatePlayerReadability();
    this._updatePlayerSafeZoneVisual(delta);
    this.timerSystem.update(delta);
    this._updateExitGlow(time);
    this._updateCableZone(time);
    this._updateLootAmbient(time);
    this._updateCatchContact(delta);
  }

  /* ─────────────────────── PLAYER LOGIC ────────────────────── */
  _handlePlayer(delta) {
    if (this.roomIntroActive) {
      this.player?.setVelocity(0, 0);
      return;
    }
    if (this.player?.body && !this.hidden && !this.player.body.enable) this.player.body.enable = true;
    if (this.player && !this.hidden) this.player.setVisible(true);

    const left  = (this.cursors.A.isDown || this.cursors.LEFT.isDown)  ? -1 : 0;
    const right = (this.cursors.D.isDown || this.cursors.RIGHT.isDown) ?  1 : 0;
    const up    = (this.cursors.W.isDown || this.cursors.UP.isDown)    ? -1 : 0;
    const down  = (this.cursors.S.isDown || this.cursors.DOWN.isDown)  ?  1 : 0;
    const moving = left || right || up || down;
    const speed  = this.cursors.SHIFT.isDown ? this.player.runSpeed : this.player.speed;
    const target = new Phaser.Math.Vector2(left+right, up+down).normalize().scale(moving ? speed : 0);
    this.player.body.velocity.x = Phaser.Math.Linear(this.player.body.velocity.x, target.x, 0.28);
    this.player.body.velocity.y = Phaser.Math.Linear(this.player.body.velocity.y, target.y, 0.28);

    if (moving && this.cursors.SHIFT.isDown) {
      this.noiseSystem.add(0.14 * Math.max(0, delta ?? 16) / 1000, 'run'); // slightly more noise in room 2
      if (this.time.now - (this.lastRunNoiseAt ?? 0) > 620) {
        this.lastRunNoiseAt = this.time.now;
        this.handleSoundEvent(0.13, 'run');
      }
    }
    this.player.setDrag(1000, 1000);
    this._updatePlayerAnimation({ moving, left, right, up, down });
  }

  handleSoundEvent(intensity, source = 'noise') {
    if (!this.ownerAI || this.gameOver || this.roomCompleted) return;
    if (this.isPlayerInSafeZone()) this.safeZoneEnterAt = this.time.now;
    const mappedIntensity = this.mapSoundIntensity(intensity, source);
    this.ownerAI.setSoundTarget(this.player.x, this.player.y);
    this.ownerAI.reactToSound(mappedIntensity, source);
  }

  mapSoundIntensity(intensity, source) {
    if (source === 'loot') return intensity >= 0.12 ? 0.32 : 0.17;
    if (source === 'run') return intensity >= 0.10 ? 0.16 : intensity;
    if (source === 'bump') return Math.max(intensity, 0.14);
    if (source === 'cable') return Math.max(intensity, 0.16);
    return intensity;
  }

  _handleInteract(time) {
    if (!Phaser.Input.Keyboard.JustDown(this.cursors.E) || this.hidden || this.gameOver) return;
    // Check loot first
    const loot = this._getLootClosest(this.player.x, this.player.y, 50);
    if (loot) { this._collectLoot(loot); return; }
    // Check wardrobe hide
    const nearWardrobe = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.wardrobe.x, this.wardrobe.y
    ) < 60;
    if (nearWardrobe) this._tryHide();
  }

  _updateWallBumpArming() {
    if (!this.player?.body) return;
    const b = this.player.body;
    const touching = b.blocked.left||b.blocked.right||b.blocked.up||b.blocked.down||
                     b.touching.left||b.touching.right||b.touching.up||b.touching.down;
    if (!touching) this.wallBumpArmed = true;
  }

  _updatePlayerAnimation({ moving, left, right, up, down }) {
    if (!moving) {
      if (this.currentPlayerTexture !== 'thief_idle') { this.player.setTexture('thief_idle'); this.currentPlayerTexture='thief_idle'; }
      this.player.setFlipX(false); return;
    }
    if (up || down) {
      const tex = up ? 'walk_up' : 'thief_idle';
      if (this.currentPlayerTexture !== tex) { this.player.setTexture(tex); this.currentPlayerTexture=tex; }
      this.player.setFlipX(false); return;
    }
    const frame = Math.floor(this.time.now/140)%2===0 ? 'thief_walk_1' : 'thief_walk_2';
    if (frame !== this.currentPlayerTexture) { this.player.setTexture(frame); this.currentPlayerTexture=frame; }
    if (left) this.player.setFlipX(false);
    else if (right) this.player.setFlipX(true);
  }

  _updatePlayerSafeZoneVisual(delta) {
    if (!this.player || this.hidden || this.gameOver) return;
    const inSafe = this.isPlayerInSafeZone();
    const target = inSafe ? 0.55 : 1.0;
    const t = Phaser.Math.Clamp((delta??16)/1000, 0.01, 0.05);
    this.playerSafeAlpha = Phaser.Math.Linear(this.playerSafeAlpha??1, target, 0.22+t);
    this.player.setAlpha(this.playerSafeAlpha);
    if (this.playerOutline) this.playerOutline.setAlpha(this.playerSafeAlpha*0.55);
    if (this.playerShadow)  this.playerShadow.setAlpha(inSafe ? 0.14 : 0.22);
  }

  _updatePlayerReadability() {
    if (!this.player) return;
    if (!this.playerOutline) {
      this.playerOutline = this.add.image(this.player.x, this.player.y, this.player.texture.key)
        .setTint(0x0a0a14).setAlpha(0.55).setDepth(29);
    }
    this.playerOutline.setTexture(this.player.texture.key);
    this.playerOutline.setScale(this.player.scaleX*1.08, this.player.scaleY*1.08);
    this.playerOutline.x = this.player.x;
    this.playerOutline.y = this.player.y;
    this.playerOutline.setVisible(this.player.visible);
    this.player.setTint(this.chaseMode ? 0xffe0c8 : 0xffffff);
  }

  /* ─────────────────────── WALL COLLISION ──────────────────── */
  _isSideWall(solid) {
    const body = solid?.body;
    return !!body && body.width<=30 && body.height>body.width && (solid.x<120 || solid.x>840);
  }

  _bumpPlayerFromSideWall(solid) {
    if (!this._isSideWall(solid)||!this.player?.body) return;
    const dir = solid.x < this.player.x ? 1 : -1;
    this.player.body.reset(Phaser.Math.Clamp(this.player.x+dir*18, 50, 910), this.player.y);
  }

  _onPlayerWallContact(_player, solid) {
    if (this.gameOver||this.hidden||this._isWallTouchExempt()) return;
    if (this._isSideWall(solid)) {
      const now = this.time.now;
      if (now - (this.lastSideWallBumpAt??0) < 420) return;
      this.lastSideWallBumpAt = now;
    } else {
      if (!this.wallBumpArmed) return;
      this.wallBumpArmed = false;
    }
    this.noiseSystem.add(0.09, 'bump');
    this.playSfx('fahh', { minGap:180, delay:10, volume:0.34 });
    this._bumpPlayerFromSideWall(solid);
    if (this.chaseMode) { this.screenShake(16); return; }
    if (this.noiseSystem.noise >= this.ownerAI?.cfg?.wakeThreshold ?? 0.72) {
      this.updatePrompt('Wall bump. The owner stirred.', 'warning');
    } else {
      this.screenShake(10);
      this.updatePrompt('Careful. Walls carry sound.', 'warning');
    }
  }

  /* ─────────────────────── CABLE ZONE ──────────────────────── */
  _updateCableZone(time) {
    const d = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.cableZonePos.x, this.cableZonePos.y
    );
    const inCable = d < this.cableZoneRadius;
    const wasIn   = this._cableZoneActive;
    this._cableZoneActive = inCable;

    // Pulse glow when player is inside
    const t = time * 0.001;
    if (this.cableZoneGlow) {
      if (inCable) {
        const pulse = 0.5 + Math.sin(t*4)*0.5;
        this.cableZoneGlow.alpha = 0.16 + pulse*0.14;
      } else {
        this.cableZoneGlow.alpha = Phaser.Math.Linear(this.cableZoneGlow.alpha, 0.08, 0.06);
      }
    }

    if (!inCable) { this._cableNoiseArmed = true; return; }

    // While in cable zone: add passive noise each 600ms
    const now = this.time.now;
    if (!this._lastCableNoiseAt) this._lastCableNoiseAt = 0;
    if (now - this._lastCableNoiseAt > 600) {
      this._lastCableNoiseAt = now;
      const moving = this.cursors.A.isDown || this.cursors.D.isDown ||
                     this.cursors.W.isDown || this.cursors.S.isDown ||
                     this.cursors.LEFT.isDown || this.cursors.RIGHT.isDown ||
                     this.cursors.UP.isDown || this.cursors.DOWN.isDown;
      if (moving) {
        this.noiseSystem.add(0.06, 'cable');
        if (this._cableNoiseArmed) {
          this._cableNoiseArmed = false;
          this.updatePrompt('Cable zone. Watch your step.', 'warning');
        }
      }
    }
  }

  /* ─────────────────────── SAFE ZONE ───────────────────────── */
  isPlayerInSafeZone()  { return this.safeZoneRect ? Phaser.Geom.Rectangle.Contains(this.safeZoneRect, this.player.x, this.player.y) : false; }
  isPlayerInExitZone()  { return this.exitZone ? Phaser.Geom.Rectangle.Contains(this.exitZone, this.player.x, this.player.y) : false; }
  _isWallTouchExempt()  { return this.isPlayerInSafeZone() || this.isPlayerInExitZone(); }

  _updateSafeZoneTransition(time) {
    const inSafe = this.isPlayerInSafeZone();
    if (inSafe) {
      if (this.safeZoneEnterAt == null) this.safeZoneEnterAt = time;
      if (this.safeZoneSoundArmed) {
        this.safeZoneSoundArmed = false; this.safeZoneEnterAt = time;
        this.playSfx('safe', { minGap:700 });
        this.updatePrompt('Safe zone entered', 'info');
        this._showHideTension(true);
      }
    } else {
      this.safeZoneEnterAt=null; this.safeZoneSoundArmed=true;
      this._showHideTension(false);
    }

    if (this.player && !this.hidden) {
      if (inSafe && !this.playerDimmed) {
        this.playerDimmed=true;
        this.tweens.killTweensOf(this.player);
        this.tweens.add({ targets:this.player, alpha:0.62, duration:140, ease:'Sine.out' });
      } else if (!inSafe && this.playerDimmed) {
        this.playerDimmed=false;
        this.tweens.killTweensOf(this.player);
        this.tweens.add({ targets:this.player, alpha:1, duration:140, ease:'Sine.out' });
      }
    }
    this.wasInSafeZone = inSafe;
  }

  _updateOwnerState(time) {
    if (!this.chaseMode) {
      if (this.owner.state === 'alert' || this.owner.state === 'searching') return;
      this.setOwnerBreathing(true);
      const sleepTex = this.textures.exists('r2_owner_sleep') ? 'r2_owner_sleep' : 'r2_owner_src';
      this.owner.setTexture(sleepTex).setScale(0.24).setVisible(true);
      return;
    }
    const inSafe = this.isPlayerInSafeZone();
    if (inSafe && this.safeZoneEnterAt==null) this.safeZoneEnterAt = time;
    if (!inSafe && this.safeZoneEnterAt!=null) this.safeZoneEnterAt = null;

    if (this.hidden && this.chaseMode) {
      this.noiseSystem.noise = Phaser.Math.Clamp(this.noiseSystem.noise-0.018, 0, 1);
      if (this.noiseSystem.noise < 0.16) {
        this.ownerAI.resetToSleep('You hid in the wardrobe. The owner gave up.');
      }
      return;
    }
    if (this.safeZoneEnterAt!=null && time-this.safeZoneEnterAt >= this.safeZoneCalmMs) {
      this.noiseSystem.noise = Phaser.Math.Clamp(this.noiseSystem.noise-0.1, 0, 1);
      this.ownerAI.resetToSleep('The wardrobe stayed quiet. Owner went back to sleep.');
    }
  }

  _tryHide() {
    if (!this.chaseMode || this.hidden) return;
    if (this.safeZoneRect && Phaser.Geom.Rectangle.Contains(this.safeZoneRect, this.player.x, this.player.y)) {
      this.hidden = true;
      this.player.setVisible(false);
      this.player.body.enable = false;
      this.player.setVelocity(0, 0);
      this.playSfx('enter', { minGap:900, delay:40 });
      this.updatePrompt('Hidden. Stay quiet.', 'info');
      this._showHideTension(true);
    }
  }

  /* ─────────────────────── EXIT ───────────────────────────── */
  _checkExitInteraction() {
    const inExit = this.isPlayerInExitZone();
    if (!inExit) { this.exitPromptVisible=false; this.exitPromptMode=''; return; }
    if (this.gameOver) return;
    if (!this._allLootCollected()) {
      if (this.exitPromptMode!=='blocked') {
        this.exitPromptVisible=true; this.exitPromptMode='blocked';
        this.updatePrompt(`Need all loot before escaping (${this._lootCollected}/${this._lootTotal})`, 'warning');
        this._onExitDenied();
      }
      return;
    }
    if (this.exitPromptMode!=='ready') {
      this.exitPromptVisible=true; this.exitPromptMode='ready';
      this.updatePrompt('All loot secured. Press E to escape.', 'success');
    }
    if (!Phaser.Input.Keyboard.JustDown(this.cursors.E)) return;
    this._completeRoom();
  }

  _completeRoom() {
    if (this.roomCompleted) return;
    this.roomCompleted=true; this.gameOver=true;
    this.timerSystem.stop();
    this.player.setVelocity(0,0); this.owner.setVelocity(0,0);
    this.input.enabled = false;
    this.playSfx('door_unlock', { minGap:1200, volume:0.65 });
    this.playSfx('success', { minGap:2000, delay:520 });
    this.cameras.main.fade(1150, 0, 10, 20);
    this.updatePrompt('Escaping...', 'success');
    this.time.delayedCall(1250, () => this.rankSystem.showEscapeScreen());
  }

  onCaught() {
    if (this.gameOver) return;
    if (this.hidden) return;
    if (!this._isOwnerCatchActive()) return;
    if (this.isPlayerInSafeZone()) return;
    this.gameOver = true;
    this.timerSystem.stop();
    this.input.enabled = false;
    this.player.setVelocity(0,0);
    this.owner.setVelocity(0,0);
    this.player.body.enable = false;
    if (this.owner.body) this.owner.body.enable = false;
    this.updatePrompt('CAUGHT', 'danger');
    this.playSfx('coreTransition', { volume:0.52, rate:0.84, detune:-180 });
    this.physics.world.pause();
    this.screenShake(95);
    this.cameras.main.zoomTo(1.035, 1200, 'Sine.easeOut');
    this.rankSystem.showCaughtSequence();
  }

  _updateCatchContact(delta) {
    if (this.gameOver || this.hidden || !this._isOwnerCatchActive() || !this.player?.body || !this.owner?.body) {
      this.catchContactMs = 0;
      return;
    }
    if (this.isPlayerInSafeZone()) {
      this.catchContactMs = 0;
      return;
    }
    const touching = this._isOwnerTouchingPlayer();
    this.catchContactMs = touching ? this.catchContactMs + (delta ?? 16) : 0;
    if (this.catchContactMs >= 120) this.onCaught();
  }

  _isOwnerCatchActive() {
    return this.chaseMode || this.owner?.state === 'alert' || this.owner?.state === 'searching' || this.owner?.state === 'chase';
  }

  _isOwnerTouchingPlayer() {
    const pb = this.player.body;
    const ob = this.owner.body;
    if (!pb || !ob) return false;
    const playerMarker = this._getPlayerMarkerRect(4);
    const ownerCatch = this._getOwnerCatchRect();
    const overlaps = Phaser.Geom.Intersects.RectangleToRectangle(playerMarker, ownerCatch);
    const closeEnough = Phaser.Math.Distance.Between(
      playerMarker.centerX,
      playerMarker.centerY,
      ownerCatch.centerX,
      ownerCatch.centerY
    ) <= 42;
    return overlaps && closeEnough;
  }

  _getBodyRect(sprite, pad = 0) {
    const b = sprite.body;
    return new Phaser.Geom.Rectangle(
      b.x - pad,
      b.y - pad,
      b.width + pad * 2,
      b.height + pad * 2
    );
  }

  _onExitDenied() {
    const el = document.getElementById('prompt'); if (!el) return;
    el.classList.remove('deny-shake'); void el.offsetWidth;
    el.classList.add('deny-shake');
    el.addEventListener('animationend', ()=>el.classList.remove('deny-shake'), {once:true});
    this.screenShake(6);
  }

  /* ─────────────────────── AMBIENT ───────────────────────────*/
  _updateAmbient(time) {
    const t = time * 0.001;

    // Room glow pulse (cyan)
    if (this.roomGlow) this.roomGlow.alpha = 0.03 + Math.sin(t*1.2)*0.01;

    // Chase pulse on vignette
    const chasePulse = this.chaseMode ? (0.5+Math.sin(t*3.2)*0.5) : 0;
    if (this.vignette) this.vignette.alpha = this.chaseMode ? 0.30 : 0.22+Math.sin(t*0.7)*0.008;
    if (this.flash)    this.flash.alpha    = Math.max(this.flash.alpha, this.chaseMode ? 0.02+chasePulse*0.03 : 0);

    // Owner wake text tracking
    if (this.ownerWakeText) { this.ownerWakeText.x=this.owner.x+6; }

    // Dust float up
    if (this.dustGroup) this.dustGroup.children.each(d => {
      d.y -= d.data.get('speed');
      if (d.y < 24) { d.y=620; d.x=Phaser.Math.Between(50,910); }
    });

    // Wardrobe safe-zone glow
    if (this.wardrobeGlow) {
      this.wardrobeGlow.x = this.wardrobe.x;
      this.wardrobeGlow.y = this.wardrobe.y;
    }
    if (this.wardrobeRing) {
      this.wardrobeRing.x = this.wardrobe.x;
      this.wardrobeRing.y = this.wardrobe.y;
    }
    if (this.safeZoneShade) {
      this.safeZoneShade.x = this.safeZoneRect.centerX;
      this.safeZoneShade.y = this.safeZoneRect.centerY;
      const inSafe = this.isPlayerInSafeZone() || this.hidden;
      this.safeZoneShade.alpha = (inSafe?0.20:0.10)+Math.sin(t*1.1)*0.01;
    }

    // Player shadow bob
    if (this.playerShadow) {
      const moving = this.player?.body
        ? (Math.abs(this.player.body.velocity.x)+Math.abs(this.player.body.velocity.y))>6
        : false;
      const bob = moving ? Math.sin(t*10)*1.1 : 0;
      const anchor = this._getPlayerCenterMarker();
      this.playerShadow.x = anchor.x;
      this.playerShadow.y = anchor.y+6+bob;
      this.playerShadow.scaleX = 1+(moving?0.06:0);
      this.playerShadow.scaleY = 1+(moving?0.03:0);
    }

    // Hide label follows wardrobe
    if (this.hideLabel && this.wardrobe) {
      const wb = this.wardrobe.getBounds();
      this.hideLabel.x = wb.centerX;
      this.hideLabel.y = wb.top + 50;
    }
    this._updateHitboxDebug();
  }

  _updateHitboxDebug() {
    if (!this.debugHitboxesEnabled || !this.player?.body || !this.owner?.body) return;
    if (!this.hitboxDebugGfx) this.hitboxDebugGfx = this.add.graphics().setDepth(500);
    const g = this.hitboxDebugGfx;
    g.clear();
    const playerMarker = this._getPlayerMarkerRect();
    const ownerMarker = this._getOwnerMarkerRect();
    const catchRect = this._getOwnerCatchRect();
    g.fillStyle(0x42f5a7, 0.22);
    g.fillRectShape(playerMarker);
    g.lineStyle(2, 0x42f5a7, 0.95);
    g.strokeRectShape(playerMarker);
    g.fillStyle(0xff526d, 0.22);
    g.fillRectShape(ownerMarker);
    g.lineStyle(2, 0xff526d, 0.95);
    g.strokeRectShape(ownerMarker);
    g.lineStyle(1, 0xffc857, 0.75);
    g.strokeRectShape(catchRect);
    g.strokeCircle(catchRect.centerX, catchRect.centerY, 42);
  }

  _getPlayerCenterMarker() {
    return {
      x: this.player?.x ?? 0,
      y: (this.player?.y ?? 0) - 8
    };
  }

  _getPlayerMarkerRect(pad = 0) {
    const p = this._getPlayerCenterMarker();
    return new Phaser.Geom.Rectangle(p.x - 11 - pad, p.y - 8 - pad, 22 + pad * 2, 16 + pad * 2);
  }

  _getOwnerCenterMarker() {
    return {
      x: this.owner?.x ?? 0,
      y: (this.owner?.y ?? 0) - 8
    };
  }

  _getOwnerMarkerRect() {
    const p = this._getOwnerCenterMarker();
    return new Phaser.Geom.Rectangle(p.x - 13, p.y - 10, 26, 20);
  }

  _getOwnerCatchRect() {
    const p = this._getOwnerCenterMarker();
    return new Phaser.Geom.Rectangle(p.x - 18, p.y - 14, 36, 28);
  }

  _updateExitGlow(time) {
    if (!this.exitGlowObj) {
      this.exitGlowObj = this.add.circle(480,28,68,0x00ffff,0)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(38);
    }
    if (this._allLootCollected()) {
      const p = 0.5+Math.sin(time*0.003)*0.5;
      this.exitGlowObj.alpha = 0.18+p*0.14;
    } else { this.exitGlowObj.alpha=0; }
  }

  _updateLootAmbient(time) {
    const t = time * 0.001;
    if (!this._lootItems) return;
    this._lootItems.forEach((item, idx) => {
      if (!item || item.collected) return;
      if (item.glow?.active && item.sprite) { item.glow.x=item.sprite.x; item.glow.y=item.sprite.y; }
      if (item.ring?.active && item.sprite) { item.ring.x=item.sprite.x; item.ring.y=item.sprite.y; }
      if (item.shadow?.active && item.sprite) { item.shadow.x=item.sprite.x; item.shadow.y=item.sprite.y+10; }
      const pulse = 0.5+Math.sin(t*2.4+idx)*0.5;
      if (item.glow) { item.glow.setScale(1+pulse*0.12); item.glow.alpha=0.12+pulse*0.12; }
      if (item.ring) { item.ring.setScale(1+pulse*0.04); item.ring.alpha=0.08+pulse*0.10; }
    });
  }

  /* ─────────────────────── AUDIO ──────────────────────────── */
  _updateMovementAudio(time) {
    const moving = this.cursors.A.isDown||this.cursors.D.isDown||this.cursors.W.isDown||this.cursors.S.isDown||
                   this.cursors.LEFT.isDown||this.cursors.RIGHT.isDown||this.cursors.UP.isDown||this.cursors.DOWN.isDown;
    if (!moving) { this.lastFootstepAt=0; return; }
    const sprinting = this.cursors.SHIFT.isDown;
    const interval  = sprinting?175:255, volume=sprinting?0.22:0.16;
    if (time-this.lastFootstepAt < interval) return;
    this.lastFootstepAt = time;
    if (!AM.sfxMuted) this.sound.play('footstep', { volume, rate:sprinting?1.08:1.0, detune:sprinting?10:0 });
  }

  playSfx(key, options={}) {
    if (AM.sfxMuted) return;
    const sound = this.sfx?.[key]; if (!sound) return;
    const now   = this.time.now;
    const minGap = options.minGap ?? 0;
    const gateKey = `last${key[0].toUpperCase()}${key.slice(1)}At`;
    if (minGap>0 && now-(this[gateKey]??0)<minGap) return;
    this[gateKey] = now;
    const play = () => {
      if (options.volume!=null) sound.setVolume(options.volume);
      if (options.rate!=null)   sound.setRate(options.rate);
      if (options.detune!=null) sound.setDetune(options.detune);
      sound.play();
    };
    options.delay ? this.time.delayedCall(options.delay, play) : play();
  }

  /* ─────────────────────── FX HELPERS ────────────────────── */
  flashRed() {
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0);
    this.tweens.add({ targets:this.flash, alpha:0.36, duration:90, yoyo:true, repeat:2, ease:'Sine.inOut' });
    this.updatePromptStyle(true);
  }

  screenShake(intensity) { this.cameras.main.shake(intensity, intensity*0.015); }

  ownerWakeBurst(symbol='!') {
    if (this.ownerWakeText) this.ownerWakeText.destroy();
    this.ownerWakeText = this.add.text(this.owner.x+6, this.owner.y-18, symbol, {
      fontFamily:'"Press Start 2P"', fontSize:symbol==='!'?'24px':'18px',
      color:'#00ffff', stroke:'#0d1f3c', strokeThickness:4
    }).setDepth(120).setOrigin(0.5);
    this.tweens.add({
      targets:this.ownerWakeText, y:this.owner.y-40, alpha:0,
      duration:680, ease:'Sine.out',
      onComplete: () => this.ownerWakeText && this.ownerWakeText.destroy()
    });
  }

  clearAlertEffects() {
    this.flash.setAlpha(0);
    this.updatePromptStyle(false);
  }

  updatePromptStyle(alert) {
    const el = document.getElementById('prompt'); if (!el) return;
    el.style.boxShadow = alert
      ? '0 0 18px rgba(0,255,247,0.35)'
      : '0 8px 0 rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.08)';
    el.style.borderColor = alert ? '#00fff7' : '#5a3a2c';
  }

  updatePrompt(text, type = 'info') {
    const el = this.promptEl; if (!el) return;
    el.style.opacity='0.72'; el.style.transform='translateY(2px) scale(0.99)';
    window.clearTimeout(this.promptResetTimer);
    el.textContent = text;
    this.promptResetTimer = window.setTimeout(() => {
      el.style.opacity='1'; el.style.transform='translateY(0) scale(1)';
    }, 20);
    this._showNotification(text, type);
  }

  _showNotification(text, type = 'info') {
    const toast = document.getElementById('message-toast');
    const body = document.getElementById('message-toast-text');
    if (!toast || !body) return;
    body.textContent = text;
    toast.classList.remove('hidden','message-info','message-warning','message-success','message-danger');
    toast.classList.add(`message-${type}`);
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.add('hidden'), type === 'danger' ? 2200 : 1700);
  }

  _showHideTension(active) {
    if (!this.hideTensionOverlay) {
      this.hideTensionOverlay = this.add.rectangle(0,0,960,640,0x000000,0)
        .setOrigin(0).setDepth(98).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }
    this.tweens.killTweensOf(this.hideTensionOverlay);
    this.tweens.add({
      targets: this.hideTensionOverlay,
      alpha: active ? 0.18 : 0,
      duration: 260,
      ease: 'Sine.out'
    });
  }

  setOwnerBreathing(active) {
    if (this.ownerBobTween)   this.ownerBobTween.paused   = !active;
    if (this.ownerPulseTween) this.ownerPulseTween.paused = !active;
  }

  /* ─────────────────────── OWNER TEXTURE HELPERS ─────────────*/
  _setOwnerSleepTexture() {
    const sleepTex = this.textures.exists('r2_owner_sleep') ? 'r2_owner_sleep' : 'r2_owner_src';
    this.owner.setTexture(sleepTex).setScale(0.24);
  }
}
