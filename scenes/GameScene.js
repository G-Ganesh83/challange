import Phaser from 'phaser';
import NoiseSystem  from './systems/NoiseSystem.js';
import LootSystem   from './systems/LootSystem.js';
import OwnerAI      from './systems/OwnerAI.js';
import TimerSystem  from './systems/TimerSystem.js';
import RankSystem   from './systems/RankSystem.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    // Runtime flags (reset in create)
    this.chaseMode = false;
    this.hidden = false;
    this.gameOver = false;
    this.wallBumpArmed = true;
    this.playerSafeAlpha = 1;
    this.safeZoneSoundArmed = true;
    this.lastSideWallBumpAt = 0;
    this.lastFootstepAt = 0;
    this.exitUnlocked = false;
    this.roomCompleted = false;
    this.exitPromptVisible = false;
    this.exitPromptMode = '';
    this.chaseModeHappened = false;
    this.hiddenSuccessfully = false;
    this.safeZoneEnterAt = null;
    this.wasInSafeZone = false;
    this.safeZoneCalmMs = 5000;
  }

  /* ───────────────────────── PRELOAD ───────────────────────── */
  preload() {
    this.load.image('room_bg',         'assets/background/room.png');
    this.load.image('thief_idle_src',  'assets/characters/thief_idle.png');
    this.load.image('thief_walk_1_src','assets/characters/thief_walk_1.png');
    this.load.image('thief_walk_2_src','assets/characters/thief_walk_2.png');
    this.load.image('owner_sleep_src', 'assets/characters/owner_sleep.png');
    this.load.image('owner_alert_src', 'assets/characters/owner_alert.png');
    this.load.image('thief_walk_up_src','assets/characters/walk_up.png');
    this.load.image('bed_src',    'assets/furniture/bed.png');
    this.load.image('closet_src', 'assets/furniture/closet.png');
    this.load.image('desk_src',   'assets/furniture/desk.png');
    this.load.image('chair_src',  'assets/furniture/chair.png');
    this.load.image('books_src',  'assets/furniture/books.png');
    this.load.image('lamp_src',   'assets/furniture/lamp.png');
    this.load.image('plant_src',  'assets/furniture/plant.png');
    this.load.image('bottle_src', 'assets/props/bottle.png');
    this.load.image('gem_src',    'assets/props/gem.png');
    this.load.image('gold_src',   'assets/props/gold.png');
    this.load.image('key_src',    'assets/props/key.png');
    this.load.audio('footstep',       'assets/sounds/footstep.mp3');
    this.load.audio('fahh',           'assets/sounds/fahh.mp3');
    this.load.audio('enter',          'assets/sounds/enter.mp3');
    this.load.audio('pickup',         'assets/sounds/pickup.mp3');
    this.load.audio('coreTransition', 'assets/sounds/core_transition.mp3');
    this.load.audio('out',            'assets/sounds/out.mp3');
    this.load.audio('safe',           'assets/sounds/safe.mp3');
    this.load.audio('success',        'assets/sounds/transfer.mp3');
  }

  /* ───────────────────────── CREATE ────────────────────────── */
  create() {
    // Reset flags
    this.chaseMode = false;
    this.hidden = false;
    this.gameOver = false;
    this.wallBumpArmed = true;
    this.playerSafeAlpha = 1;
    this.safeZoneSoundArmed = true;
    this.lastSideWallBumpAt = 0;
    this.lastFootstepAt = 0;
    this.exitUnlocked = false;
    this.roomCompleted = false;
    this.exitPromptVisible = false;
    this.exitPromptMode = '';
    this.chaseModeHappened = false;
    this.hiddenSuccessfully = false;
    this.safeZoneEnterAt = null;
    this.wasInSafeZone = false;
    this.debugWallsEnabled = new URLSearchParams(window.location.search).has('debugWalls');

    // Systems
    this.noiseSystem = new NoiseSystem(this);
    this.lootSystem  = new LootSystem(this);
    this.ownerAI     = new OwnerAI(this);
    this.timerSystem = new TimerSystem(this);
    this.rankSystem  = new RankSystem(this);

    this.createTextures();
    this.createRoom();
    this.createPlayer();
    this.createOwner();
    this.createUI();
    this.bindInput();
    this.createAudio();
    this.setupPolish();
    this.timerSystem.start();
    this.updatePrompt('Sneak. The room is weirdly cozy.');
  }

  /* ──────────────────── TEXTURE PIPELINE ───────────────────── */
  createTextures() {
    const keys = [
      ['thief_idle_src','thief_idle'],['thief_walk_1_src','thief_walk_1'],
      ['thief_walk_2_src','thief_walk_2'],['owner_sleep_src','owner_sleep'],
      ['thief_walk_up_src','walk_up'],['bed_src','bed'],['closet_src','closet'],
      ['desk_src','desk'],['chair_src','chair'],['books_src','books'],
      ['lamp_src','lamp'],['plant_src','plant'],['bottle_src','bottle'],
      ['gem_src','gem'],['gold_src','gold'],['key_src','key']
    ];
    keys.forEach(([src, tgt]) => this.prepareVisualTexture(src, tgt));
    this.prepareVisualTexture('owner_alert_src', 'owner_alert', { keyColorTrim: true, keyColorTolerance: 18 });
  }

  prepareVisualTexture(sourceKey, targetKey, options = {}) {
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
    const W=960, H=640;
    this.add.image(0,0,'room_bg').setOrigin(0).setScale(W/1536,H/1024).setDepth(-50);

    this.roomGlow   = this.add.rectangle(W*.5,H*.5,W,H,0xffb86b,0.04).setBlendMode(Phaser.BlendModes.ADD).setDepth(-45);
    this.vignette   = this.add.rectangle(0,0,W,H,0x000000,0.14).setOrigin(0).setDepth(95);
    this.floorShadow  = this.add.ellipse(480,390,680,340,0x000000,0.08).setDepth(1);
    this.floorShadow2 = this.add.ellipse(760,220,260,160,0x000000,0.06).setDepth(1);
    this.dustGroup  = this.add.group();
    for (let i=0;i<10;i++) {
      const d=this.add.circle(Phaser.Math.Between(80,900),Phaser.Math.Between(60,580),Phaser.Math.Between(1,2),0xfff1d5,0.14).setDepth(92);
      d.data=new Phaser.Data.DataManager(d);
      d.data.set('speed',Phaser.Math.FloatBetween(0.05,0.18));
      this.dustGroup.add(d);
    }

    // Walls
    this.wallColliders = [];
    this.roomWalls = this.physics.add.staticGroup();
    const addWall = (x,y,w2,h2) => {
      const alpha = this.debugWallsEnabled ? 0.22 : 0;
      const wall = this.add.rectangle(x,y,w2,h2,0xff3b3b,alpha).setDepth(2);
      if (this.debugWallsEnabled) wall.setStrokeStyle(2,0xffffff,0.35);
      this.physics.add.existing(wall,true);
      wall.body.setSize(w2,h2); wall.body.updateFromGameObject();
      this.roomWalls.add(wall); this.wallColliders.push(wall); return wall;
    };
    addWall(216,40,384,26); addWall(480,40,144,26); addWall(744,40,384,26);
    addWall(40,216,26,384); addWall(40,480,26,144); addWall(40,576,26,48);
    addWall(920,216,26,384); addWall(920,480,26,144); addWall(920,576,26,48);
    addWall(216,600,384,26); addWall(480,600,144,26); addWall(744,600,384,26);

    // Furniture
    this.desk  = this.add.image(300,200,'desk').setScale(0.30).setDepth(20);
    this.chair = this.add.image(180,400,'chair').setScale(0.22).setDepth(19);
    this.lamp  = this.add.image(370,130,'lamp').setScale(0.14).setDepth(21);
    this.books = this.add.image(820,180,'books').setScale(0.16).setDepth(21);
    this.add.image(340,520,'plant').setScale(0.24).setDepth(21);
    this.add.image(720,550,'plant').setScale(0.21).setDepth(21);
    this.bed   = this.add.image(744,214,'bed').setScale(0.3).setDepth(20);

    const closetX=820, closetY=440;
    this.closet = this.add.image(closetX,closetY,'closet').setScale(0.24).setDepth(20);
    this.bottle = this.add.image(650,416,'bottle').setScale(0.13).setDepth(22);

    // Zones
    this.safeZoneRect = new Phaser.Geom.Rectangle(closetX-77,closetY-78,154,156);
    this.exitZone     = new Phaser.Geom.Rectangle(408,56,144,96);

    const sbm=14, sbW=this.safeZoneRect.width+sbm*2, sbH=this.safeZoneRect.height+sbm*2;
    this.safeZoneBlock = this.add.rectangle(this.safeZoneRect.centerX,this.safeZoneRect.centerY,sbW,sbH,0x000000,0).setDepth(2);
    this.physics.add.existing(this.safeZoneBlock,true);
    this.safeZoneBlock.body.setSize(sbW,sbH); this.safeZoneBlock.body.updateFromGameObject();

    this.safeZoneShade = this.add.rectangle(
      this.safeZoneRect.centerX, this.safeZoneRect.centerY,
      this.safeZoneRect.width+22, this.safeZoneRect.height+22,
      0x000000, 0.10
    ).setDepth(12).setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Shadows
    this.add.ellipse(this.bed.x, this.bed.y+78, 276,88,0x000000,0.14).setDepth(13);
    this.add.ellipse(closetX, closetY+74, 162,88,0x000000,0.12).setDepth(15);
    this.add.ellipse(this.desk.x, this.desk.y+70, 208,66,0x000000,0.12).setDepth(14);
    this.add.ellipse(this.chair.x, this.chair.y+44, 96,44,0x000000,0.1).setDepth(15);

    // Labels / glows
    this.ownerAlertScale = 0.28;
    this.exitLabel = this.add.text(480,18,'EXIT',{
      fontFamily:'"Press Start 2P"',fontSize:'14px',color:'#ffd55c',stroke:'#241c18',strokeThickness:4
    }).setOrigin(0.5).setDepth(40).setShadow(0,2,'#1f120f',3,true,true);

    this.closetGlow = this.add.circle(closetX,closetY,88,0xffef7a,0.22).setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
    this.closetRing = this.add.rectangle(closetX,closetY,128,156,0xfff0a0,0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(17);

    this.hideLabelOffsetX=20; this.hideLabelOffsetY=50;
    const cb=this.closet.getBounds();
    this.hideLabel = this.add.text(cb.centerX+this.hideLabelOffsetX,cb.top+this.hideLabelOffsetY,'HIDE\nSPOT',{
      fontFamily:'"Press Start 2P"',fontSize:'11px',color:'#fff0b8',stroke:'#241c18',strokeThickness:4,align:'center'
    }).setOrigin(0.5,1).setDepth(41).setShadow(0,2,'#2e1c10',3,true,true);

    // Loot (delegates to LootSystem)
    const refs = this.lootSystem.create(this.bottle);
    this.bottleGlow   = refs.bottleGlow;
    this.bottleRing   = refs.bottleRing;
    this.bottleShadow = refs.bottleShadow;

    this.physics.world.setBounds(0,0,960,640);
  }

  /* ─────────────────────── PLAYER ──────────────────────────── */
  createPlayer() {
    this.playerShadow = this.add.ellipse(480,372,28,12,0x000000,0.22).setDepth(29);
    this.player = this.physics.add.sprite(480,520,'thief_idle');
    this.player.setSize(22,16).setOffset(27,58);
    this.player.body.enable = true;
    this.player.speed = 180;
    this.player.runSpeed = 260;
    this.playerDisplayScale = 0.18;
    this.player.setScale(this.playerDisplayScale).setDepth(30).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.wallColliders ?? this.roomWalls, this.onPlayerWallContact, null, this);
  }

  /* ─────────────────────── OWNER ───────────────────────────── */
  createOwner() {
    this.owner = this.physics.add.sprite(744,210,'owner_sleep');
    this.owner.setSize(58,66).setOffset(12,10);
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
    this.flash    = this.add.rectangle(0,0,960,640,0xff3b3b,0).setOrigin(0).setDepth(100);
    this.vignette = this.add.rectangle(0,0,960,640,0x000000,0.18).setOrigin(0).setDepth(99)
                       .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.lootSystem._syncHUD();
  }

  bindInput() {
    this.cursors = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E');
  }

  createAudio() {
    this.sfx = {
      footstep:       this.sound.add('footstep',       { volume: 0.18 }),
      fahh:           this.sound.add('fahh',            { volume: 0.92 }),
      enter:          this.sound.add('enter',           { volume: 0.6  }),
      pickup:         this.sound.add('pickup',          { volume: 0.55 }),
      coreTransition: this.sound.add('coreTransition',  { volume: 0.75 }),
      out:            this.sound.add('out',             { volume: 0.6  }),
      safe:           this.sound.add('safe',            { volume: 0.5  }),
      success:        this.sound.add('success',         { volume: 0.85 })
    };
  }

  setupPolish() {
    this.time.delayedCall(80, () => this.cameras.main.flash(120,255,240,210));
    this.tweens.add({ targets: this.bottle, y:'+=2', duration:1400, yoyo:true, repeat:-1, ease:'Sine.inOut' });
    this.tweens.add({ targets: this.chair,  y:'+=1.2', duration:1900, yoyo:true, repeat:-1, ease:'Sine.inOut' });
    this.ownerBobTween   = this.tweens.add({ targets: this.owner, y:'+=1.2', duration:2400, yoyo:true, repeat:-1, ease:'Sine.inOut' });
    this.ownerPulseTween = this.tweens.add({ targets: this.owner, scaleX:0.102, scaleY:0.098, duration:2200, yoyo:true, repeat:-1, ease:'Sine.inOut' });
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
    this.updateAmbientMotion(time);
    this.updatePlayerReadability();
    this.updatePlayerSafeZoneVisual(delta);
    this.timerSystem.update(delta);
    this.updateExitGlow(time);
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
    const target = new Phaser.Math.Vector2(left+right, up+down).normalize().scale(moving ? speed : 0);
    this.player.body.velocity.x = Phaser.Math.Linear(this.player.body.velocity.x, target.x, 0.28);
    this.player.body.velocity.y = Phaser.Math.Linear(this.player.body.velocity.y, target.y, 0.28);

    if (moving && this.cursors.SHIFT.isDown) {
      this.noiseSystem.add(0.12 * Math.max(0, delta ?? 16) / 1000);
    }
    this.player.setDrag(1000,1000);
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

  updatePlayerSafeZoneVisual(delta) {
    if (!this.player || this.hidden || this.gameOver) return;
    const inSafe = this.isPlayerInSafeZone();
    const target = inSafe ? 0.55 : 1.0;
    const t = Phaser.Math.Clamp((delta ?? 16)/1000, 0.01, 0.05);
    this.playerSafeAlpha = Phaser.Math.Linear(this.playerSafeAlpha??1, target, 0.22+t);
    this.player.setAlpha(this.playerSafeAlpha);
    if (this.playerOutline) this.playerOutline.setAlpha(this.playerSafeAlpha*0.55);
    if (this.playerShadow)  this.playerShadow.setAlpha(inSafe ? 0.14 : 0.22);
  }

  updatePlayerReadability() {
    if (!this.player) return;
    if (!this.playerOutline) {
      this.playerOutline = this.add.image(this.player.x, this.player.y, this.player.texture.key)
        .setTint(0x0a0706).setAlpha(0.55).setDepth(29);
    }
    this.playerOutline.setTexture(this.player.texture.key);
    this.playerOutline.setScale(this.player.scaleX*1.08, this.player.scaleY*1.08);
    this.playerOutline.x = this.player.x;
    this.playerOutline.y = this.player.y;
    this.playerOutline.setVisible(this.player.visible);
    this.player.setTint(this.chaseMode ? 0xfff0d8 : 0xffffff);
  }

  /* ─────────────────────── WALL COLLISIONS ─────────────────── */
  isSideWall(solid) {
    const body=solid?.body;
    return !!body && body.width<=30 && body.height>body.width && (solid.x<120||solid.x>840);
  }

  bumpPlayerBackFromSideWall(solid) {
    if (!this.isSideWall(solid)||!this.player?.body) return;
    const dir = solid.x<this.player.x ? 1 : -1;
    this.player.body.reset(Phaser.Math.Clamp(this.player.x+dir*18,48,912), this.player.y);
  }

  onPlayerWallContact(_player, solid) {
    if (this.gameOver||this.hidden||this.isWallTouchExempt()) return;
    if (this.isSideWall(solid)) {
      const now=this.time.now;
      if (now-(this.lastSideWallBumpAt??0)<420) return;
      this.lastSideWallBumpAt=now;
    } else {
      if (!this.wallBumpArmed) return;
      this.wallBumpArmed=false;
    }
    this.noiseSystem.add(0.08);
    this.playSfx('fahh',{minGap:180,delay:10});
    this.bumpPlayerBackFromSideWall(solid);

    if (this.chaseMode) { this.screenShake(16); return; }
    if (this.noiseSystem.noise>=0.8) {
      this.chaseMode=true; this.owner.state='chase';
      this.setOwnerBreathing(false);
      this.owner.setTexture('owner_alert').setScale(this.ownerAlertScale).setVisible(true);
      this.playSfx('coreTransition',{minGap:1200,delay:90});
      this.flashRed(); this.screenShake(80); this.ownerWakeBurst();
      this.updatePrompt('Wall bump! The owner heard that.');
    } else {
      this.screenShake(10);
      this.updatePrompt('Careful... wall bumps are loud.');
    }
  }

  /* ─────────────────────── SAFE ZONE ───────────────────────── */
  isPlayerInSafeZone() { return this.safeZoneRect ? Phaser.Geom.Rectangle.Contains(this.safeZoneRect,this.player.x,this.player.y) : false; }
  isPlayerInExitZone() { return this.exitZone ? Phaser.Geom.Rectangle.Contains(this.exitZone,this.player.x,this.player.y) : false; }
  isWallTouchExempt()  { return this.isPlayerInSafeZone()||this.isPlayerInExitZone(); }

  updateSafeZoneTransition(time) {
    const inSafe = this.isPlayerInSafeZone();
    if (inSafe) {
      if (this.safeZoneSoundArmed) {
        this.safeZoneSoundArmed=false; this.safeZoneEnterAt=time;
        this.playSfx('safe',{minGap:700});
        this.updatePrompt('Safe zone: closet. Stay hidden for a moment.');
      }
    } else { this.safeZoneEnterAt=null; this.safeZoneSoundArmed=true; }

    if (this.player && !this.hidden) {
      if (inSafe && !this.playerDimmed) {
        this.playerDimmed=true;
        this.tweens.killTweensOf(this.player);
        this.tweens.add({targets:this.player,alpha:0.65,duration:140,ease:'Sine.out'});
      } else if (!inSafe && this.playerDimmed) {
        this.playerDimmed=false;
        this.tweens.killTweensOf(this.player);
        this.tweens.add({targets:this.player,alpha:1,duration:140,ease:'Sine.out'});
      }
    }
    this.wasInSafeZone=inSafe;
  }

  updateOwnerState(time) {
    if (!this.chaseMode) {
      this.setOwnerBreathing(true);
      this.owner.setTexture('owner_sleep').setScale(0.25).setVisible(true);
      return;
    }
    const inSafe=this.isPlayerInSafeZone();
    if (inSafe && this.safeZoneEnterAt==null) this.safeZoneEnterAt=time;
    if (!inSafe && this.safeZoneEnterAt!=null) this.safeZoneEnterAt=null;

    if (this.hidden && this.chaseMode) {
      this.noiseSystem.noise = Phaser.Math.Clamp(this.noiseSystem.noise-0.02,0,1);
      if (this.noiseSystem.noise<0.18) this.ownerAI.resetToSleep('You hid successfully. The owner calmed down.');
      return;
    }
    if (this.safeZoneEnterAt!=null && time-this.safeZoneEnterAt>=this.safeZoneCalmMs) {
      this.noiseSystem.noise=Phaser.Math.Clamp(this.noiseSystem.noise-0.1,0,1);
      this.ownerAI.resetToSleep('The closet stayed quiet. The owner is asleep again.');
    }
  }

  tryHide() {
    if (!this.chaseMode||this.hidden) return;
    if (this.safeZoneRect && Phaser.Geom.Rectangle.Contains(this.safeZoneRect,this.player.x,this.player.y)) {
      this.hidden=true;
      this.player.setVisible(false);
      this.player.body.enable=false;
      this.player.setVelocity(0,0);
      this.playSfx('enter',{minGap:900,delay:40});
      this.updatePrompt('Hidden in closet. Pretend you were never here.');
    }
  }

  /* ─────────────────────── EXIT ────────────────────────────── */
  checkExitInteraction() {
    const inExit=this.isPlayerInExitZone();
    if (!inExit) { this.exitPromptVisible=false; this.exitPromptMode=''; return; }
    if (this.gameOver) return;
    if (!this.lootSystem.allCollected()) {
      if (this.exitPromptMode!=='blocked') {
        this.exitPromptVisible=true; this.exitPromptMode='blocked';
        this.updatePrompt(`Still missing loot! (${this.lootSystem.collectedCount}/${this.lootSystem.total}) — Loot first, escape later!`);
        this.onExitDenied();
      }
      return;
    }
    if (this.exitPromptMode!=='ready') {
      this.exitPromptVisible=true; this.exitPromptMode='ready';
      this.updatePrompt('All loot secured! Press E to escape.');
    }
    if (!Phaser.Input.Keyboard.JustDown(this.cursors.E)) return;
    this.completeRoom();
  }

  completeRoom() {
    if (this.roomCompleted) return;
    this.roomCompleted=true; this.gameOver=true;
    this.timerSystem.stop();
    this.player.setVelocity(0,0); this.owner.setVelocity(0,0);
    this.playSfx('success',{minGap:2000,delay:70});
    this.cameras.main.fade(600,14,9,9);
    this.updatePrompt('ESCAPED!');
    this.time.delayedCall(620, () => this.rankSystem.showEscapeScreen());
  }

  onCaught() {
    if (this.hidden||this.gameOver||!this.chaseMode) return;
    this.gameOver=true; this.timerSystem.stop();
    this.player.setVelocity(0,0); this.owner.setVelocity(0,0);
    this.updatePrompt('BUSTED! The owner caught the tiny thief.');
    this.screenShake(140); this.flashRed();
    this.sound.play('fahh',{volume:1.0,rate:0.9,detune:-220});
    this.add.text(480,312,'BUSTED!',{
      fontFamily:'"Press Start 2P"',fontSize:'30px',color:'#fffbf2',stroke:'#a51f1f',strokeThickness:6
    }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(1600, () => this.rankSystem.showBustedScreen());
  }

  onExitDenied() {
    const el=document.getElementById('prompt'); if(!el) return;
    el.classList.remove('deny-shake'); void el.offsetWidth;
    el.classList.add('deny-shake');
    el.addEventListener('animationend',()=>el.classList.remove('deny-shake'),{once:true});
    this.screenShake(6);
  }

  /* ─────────────────────── AMBIENT ─────────────────────────── */
  updateAmbientMotion(time) {
    const t=time*0.001;
    this.roomGlow.alpha = 0.05+Math.sin(t*1.2)*0.01;
    const chasePulse = this.chaseMode ? (0.5+Math.sin(t*3.2)*0.5) : 0;
    this.vignette.alpha = this.chaseMode ? 0.24 : 0.16+Math.sin(t*0.7)*0.008;
    this.flash.alpha = Math.max(this.flash.alpha, this.chaseMode ? 0.02+chasePulse*0.03 : 0);
    this.floorShadow.alpha  = 0.16+Math.sin(t*0.9)*0.008;
    this.floorShadow2.alpha = 0.08+Math.cos(t*1.1)*0.006;

    if (this.ownerWakeText) this.ownerWakeText.x=this.owner.x+6;
    if (this.dustGroup) this.dustGroup.children.each(d => {
      d.y -= d.data.get('speed');
      if (d.y<24) { d.y=620; d.x=Phaser.Math.Between(50,910); }
    });

    if (this.closetGlow) { this.closetGlow.x=this.closet.x; this.closetGlow.y=this.closet.y; }
    if (this.closetRing) { this.closetRing.x=this.closet.x; this.closetRing.y=this.closet.y; }
    if (this.hideLabel && this.closet) {
      const cb=this.closet.getBounds();
      this.hideLabel.x=cb.centerX+(this.hideLabelOffsetX??0);
      this.hideLabel.y=cb.top+(this.hideLabelOffsetY??0);
    }
    if (this.safeZoneShade) {
      this.safeZoneShade.x=this.safeZoneRect.centerX; this.safeZoneShade.y=this.safeZoneRect.centerY;
      const inSafe=this.isPlayerInSafeZone()||this.hidden;
      this.safeZoneShade.alpha=(inSafe?0.18:0.10)+Math.sin(t*1.1)*0.01;
    }
    if (this.playerShadow) {
      const moving=this.player?.body ? (Math.abs(this.player.body.velocity.x)+Math.abs(this.player.body.velocity.y))>6 : false;
      const bob=moving ? Math.sin(t*10)*1.1 : 0;
      this.playerShadow.x=this.player.x+2; this.playerShadow.y=this.player.y+3+bob;
      this.playerShadow.scaleX=1+(moving?0.06:0); this.playerShadow.scaleY=1+(moving?0.03:0);
    }

    const pulse=0.5+Math.sin(t*2.4)*0.5;
    if (this.bottleGlow) { this.bottleGlow.x=this.bottle.x; this.bottleGlow.y=this.bottle.y; this.bottleGlow.setScale(1+pulse*0.14); this.bottleGlow.alpha=0.12+pulse*0.12; }
    if (this.closetGlow) { this.closetGlow.setScale(1+pulse*0.10); this.closetGlow.alpha=0.12+pulse*0.14; }
    if (this.closetRing) { this.closetRing.setScale(1+pulse*0.03); this.closetRing.alpha=0.12+pulse*0.12; }
    if (this.bottleRing) { this.bottleRing.x=this.bottle.x; this.bottleRing.y=this.bottle.y; this.bottleRing.setScale(1+pulse*0.03); this.bottleRing.alpha=0.18+pulse*0.18; }

    this.lootSystem.updateAmbient(time);
  }

  updateExitGlow(time) {
    if (!this.exitGlowObj) {
      this.exitGlowObj=this.add.circle(480,28,68,0xffd55c,0).setBlendMode(Phaser.BlendModes.ADD).setDepth(38);
    }
    if (this.lootSystem.allCollected()) {
      const p=0.5+Math.sin(time*0.003)*0.5;
      this.exitGlowObj.alpha=0.18+p*0.14;
    } else { this.exitGlowObj.alpha=0; }
  }

  /* ─────────────────────── AUDIO ───────────────────────────── */
  updateMovementAudio(time) {
    const moving=this.cursors.A.isDown||this.cursors.D.isDown||this.cursors.W.isDown||this.cursors.S.isDown||
                 this.cursors.LEFT.isDown||this.cursors.RIGHT.isDown||this.cursors.UP.isDown||this.cursors.DOWN.isDown;
    if (!moving) { this.lastFootstepAt=0; return; }
    const sprinting=this.cursors.SHIFT.isDown;
    const interval=sprinting?180:260, volume=sprinting?0.22:0.16;
    if (time-this.lastFootstepAt<interval) return;
    this.lastFootstepAt=time;
    this.sound.play('footstep',{volume,rate:sprinting?1.08:1.0,detune:sprinting?10:0});
  }

  playSfx(key, options={}) {
    const sound=this.sfx?.[key]; if(!sound) return;
    const now=this.time.now;
    const minGap=options.minGap??0;
    const gateKey=`last${key[0].toUpperCase()}${key.slice(1)}At`;
    if (minGap>0 && now-(this[gateKey]??0)<minGap) return;
    this[gateKey]=now;
    const play=()=>{
      if (options.volume!=null) sound.setVolume(options.volume);
      if (options.rate!=null)   sound.setRate(options.rate);
      if (options.detune!=null) sound.setDetune(options.detune);
      sound.play();
      if (options.fadeIn) this.tweens.add({targets:sound,volume:options.volume??1,duration:options.fadeIn});
    };
    options.delay ? this.time.delayedCall(options.delay,play) : play();
  }

  /* ─────────────────────── FX HELPERS ──────────────────────── */
  flashRed() {
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0);
    this.tweens.add({targets:this.flash,alpha:0.34,duration:90,yoyo:true,repeat:2,ease:'Sine.inOut'});
    this.updatePromptStyle(true);
  }

  screenShake(intensity) { this.cameras.main.shake(intensity,intensity*0.015); }

  ownerWakeBurst(symbol='!') {
    if (this.ownerWakeText) this.ownerWakeText.destroy();
    this.ownerWakeText=this.add.text(this.owner.x+6,this.owner.y-18,symbol,{
      fontFamily:'"Press Start 2P"',fontSize:symbol==='!'?'24px':'18px',color:'#fff3a8',stroke:'#6b281f',strokeThickness:4
    }).setDepth(120).setOrigin(0.5);
    this.tweens.add({targets:this.ownerWakeText,y:this.owner.y-38,alpha:0,duration:650,ease:'Sine.out',
      onComplete:()=>this.ownerWakeText&&this.ownerWakeText.destroy()});
  }

  clearAlertEffects() { this.flash.setAlpha(0); this.updatePromptStyle(false); }

  updatePromptStyle(alert) {
    const el=document.getElementById('prompt'); if(!el) return;
    el.style.boxShadow=alert ? '0 0 18px rgba(255,90,70,0.35)' : '0 8px 0 rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.08)';
    el.style.borderColor=alert ? '#d65a4e' : '#5a3a2c';
  }

  updatePrompt(text) {
    const el=this.promptEl; if(!el) return;
    el.style.opacity='0.72'; el.style.transform='translateY(2px) scale(0.99)';
    window.clearTimeout(this.promptResetTimer);
    el.textContent=text;
    this.promptResetTimer=window.setTimeout(()=>{ el.style.opacity='1'; el.style.transform='translateY(0) scale(1)'; },20);
  }

  setOwnerBreathing(active) {
    if (this.ownerBobTween)   this.ownerBobTween.paused=!active;
    if (this.ownerPulseTween) this.ownerPulseTween.paused=!active;
  }
}
