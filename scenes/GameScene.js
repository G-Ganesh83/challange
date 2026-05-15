import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.noise = 0;
    this.chaseMode = false;
    this.hidden = false;
    this.gameOver = false;
    this.lastFootstepAt = 0;
    this.lastBottleAt = 0;
    this.wallBumpArmed = true;
    this.bottleCollected = false;
    this.lootItems = [];
    this.lootCollectedCount = 0;
    this.lootTotal = 0;
    this.ownerStuckMs = 0;
    this.ownerLastPos = { x: 0, y: 0 };
    this.ownerDetourUntil = 0;
    this.ownerDetourDir = new Phaser.Math.Vector2(0, 0);
    this.playerSafeAlpha = 1;
    this.safeZoneSoundArmed = true;
    this.lastStirAt = 0;
    this.debugWallsEnabled = false;
  }

  preload() {
    this.load.image('room_bg', 'assets/background/room.png');
    this.load.image('thief_idle_src', 'assets/characters/thief_idle.png');
    this.load.image('thief_walk_1_src', 'assets/characters/thief_walk_1.png');
    this.load.image('thief_walk_2_src', 'assets/characters/thief_walk_2.png');
    this.load.image('owner_sleep_src', 'assets/characters/owner_sleep.png');
    this.load.image('owner_alert_src', 'assets/characters/owner_alert.png');
    this.load.image('thief_walk_up_src', 'assets/characters/walk_up.png');
    this.load.image('bed_src', 'assets/furniture/bed.png');
    this.load.image('closet_src', 'assets/furniture/closet.png');
    this.load.image('desk_src', 'assets/furniture/desk.png');
    this.load.image('chair_src', 'assets/furniture/chair.png');
    this.load.image('books_src', 'assets/furniture/books.png');
    this.load.image('lamp_src', 'assets/furniture/lamp.png');
    this.load.image('plant_src', 'assets/furniture/plant.png');
    this.load.image('bottle_src', 'assets/props/bottle.png');
    this.load.image('gem_src', 'assets/props/gem.png');
    this.load.image('gold_src', 'assets/props/gold.png');
    this.load.image('key_src', 'assets/props/key.png');
    this.load.audio('footstep', 'assets/sounds/footstep.mp3');
    this.load.audio('fahh', 'assets/sounds/fahh.mp3');
    this.load.audio('enter', 'assets/sounds/enter.mp3');
    this.load.audio('pickup', 'assets/sounds/pickup.mp3');
    this.load.audio('coreTransition', 'assets/sounds/core_transition.mp3');
    this.load.audio('out', 'assets/sounds/out.mp3');
    this.load.audio('safe', 'assets/sounds/safe.mp3');
    this.load.audio('success', 'assets/sounds/transfer.mp3');
  }

  create() {
    this.noise = 0;
    this.chaseMode = false;
    this.hidden = false;
    this.gameOver = false;
    this.lastFootstepAt = 0;
    this.lastBottleAt = 0;
    this.wallBumpArmed = true;
    this.bottleCollected = false;
    this.lootItems = [];
    this.lootCollectedCount = 0;
    this.lootTotal = 0;
    this.ownerStuckMs = 0;
    this.ownerLastPos = { x: 0, y: 0 };
    this.ownerDetourUntil = 0;
    this.ownerDetourDir = new Phaser.Math.Vector2(0, 0);
    this.playerSafeAlpha = 1;
    this.safeZoneSoundArmed = true;
    this.lastStirAt = 0;
    this.safeZoneEnterAt = null;
    this.wasInSafeZone = false;
    this.safeZoneCalmMs = 5000;
    this.exitUnlocked = false;
    this.roomCompleted = false;
    this.exitPromptVisible = false;
    this.exitPromptMode = '';
    this.debugWallsEnabled = new URLSearchParams(window.location.search).has('debugWalls');

    this.createTextures();
    this.createRoom();
    this.createPlayer();
    this.createOwner();
    this.createUI();
    this.bindInput();
    this.createAudio();
    this.setupPolish();
    this.updatePrompt('Sneak. The room is weirdly cozy.');
  }

  createTextures() {
    this.prepareVisualTexture('thief_idle_src', 'thief_idle');
    this.prepareVisualTexture('thief_walk_1_src', 'thief_walk_1');
    this.prepareVisualTexture('thief_walk_2_src', 'thief_walk_2');
    this.prepareVisualTexture('owner_sleep_src', 'owner_sleep');
    this.prepareVisualTexture('owner_alert_src', 'owner_alert', { keyColorTrim: true, keyColorTolerance: 18 });
    this.prepareVisualTexture('thief_walk_up_src', 'walk_up');
    this.prepareVisualTexture('bed_src', 'bed');
    this.prepareVisualTexture('closet_src', 'closet');
    this.prepareVisualTexture('desk_src', 'desk');
    this.prepareVisualTexture('chair_src', 'chair');
    this.prepareVisualTexture('books_src', 'books');
    this.prepareVisualTexture('lamp_src', 'lamp');
    this.prepareVisualTexture('plant_src', 'plant');
    this.prepareVisualTexture('bottle_src', 'bottle');
    this.prepareVisualTexture('gem_src', 'gem');
    this.prepareVisualTexture('gold_src', 'gold');
    this.prepareVisualTexture('key_src', 'key');
  }

  prepareVisualTexture(sourceKey, targetKey, options = {}) {
    const source = this.textures.get(sourceKey)?.getSourceImage();
    if (!source) return;

    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;

    let bg = null;
    if (options.keyColorTrim) {
      const sample = [
        [0, 0],
        [canvas.width - 1, 0],
        [0, canvas.height - 1],
        [canvas.width - 1, canvas.height - 1]
      ];
      const sum = [0, 0, 0];
      sample.forEach(([x, y]) => {
        const idx = (y * canvas.width + x) * 4;
        sum[0] += data[idx];
        sum[1] += data[idx + 1];
        sum[2] += data[idx + 2];
      });
      bg = sum.map((value) => value / sample.length);
    }

    const tolerance = options.keyColorTolerance ?? 14;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        let alpha = data[idx + 3];
        if (bg && alpha > 0) {
          const dr = data[idx] - bg[0];
          const dg = data[idx + 1] - bg[1];
          const db = data[idx + 2] - bg[2];
          if ((dr * dr) + (dg * dg) + (db * db) <= tolerance * tolerance) {
            alpha = 0;
          }
        }

        if (alpha > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      minX = 0;
      minY = 0;
      maxX = canvas.width - 1;
      maxY = canvas.height - 1;
    }

    const pad = options.padding ?? 0;
    const cropX = Phaser.Math.Clamp(minX - pad, 0, canvas.width - 1);
    const cropY = Phaser.Math.Clamp(minY - pad, 0, canvas.height - 1);
    const cropW = Phaser.Math.Clamp(maxX - minX + 1 + (pad * 2), 1, canvas.width - cropX);
    const cropH = Phaser.Math.Clamp(maxY - minY + 1 + (pad * 2), 1, canvas.height - cropY);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.imageSmoothingEnabled = false;
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    if (this.textures.exists(targetKey)) {
      this.textures.remove(targetKey);
    }
    const texture = this.textures.createCanvas(targetKey, cropW, cropH);
    texture.context.clearRect(0, 0, cropW, cropH);
    texture.context.drawImage(cropCanvas, 0, 0);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return texture;
  }

  createLootTexture(targetKey, kind) {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawPx = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    if (kind === 'book') {
      drawPx(5, 4, 14, 16, '#394f8a');
      drawPx(6, 5, 12, 14, '#5e79c3');
      drawPx(7, 6, 10, 12, '#d9e5ff');
      drawPx(11, 5, 1, 14, '#2c3d6b');
      drawPx(9, 8, 5, 1, '#7da2ff');
      drawPx(9, 11, 5, 1, '#7da2ff');
    } else if (kind === 'gem') {
      drawPx(8, 3, 8, 1, '#fff0a6');
      drawPx(7, 4, 10, 1, '#ffd55b');
      drawPx(6, 5, 12, 1, '#d79c26');
      drawPx(5, 6, 14, 1, '#c2831e');
      drawPx(4, 7, 16, 4, '#e5b23e');
      drawPx(5, 11, 14, 1, '#c2831e');
      drawPx(6, 12, 12, 1, '#d79c26');
      drawPx(7, 13, 10, 1, '#ffd55b');
      drawPx(8, 14, 8, 1, '#fff0a6');
      drawPx(10, 8, 4, 8, '#ffdf7a');
      drawPx(9, 9, 2, 2, '#fff7cf');
    }

    if (this.textures.exists(targetKey)) {
      this.textures.remove(targetKey);
    }
    const texture = this.textures.createCanvas(targetKey, canvas.width, canvas.height);
    texture.context.clearRect(0, 0, canvas.width, canvas.height);
    texture.context.drawImage(canvas, 0, 0);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return texture;
  }

  createRoom() {
    const w = 960, h = 640;
    this.add.image(0, 0, 'room_bg').setOrigin(0).setScale(w / 1536, h / 1024).setDepth(-50);

    this.roomGlow = this.add.rectangle(w * 0.5, h * 0.5, w, h, 0xffb86b, 0.04).setBlendMode(Phaser.BlendModes.ADD).setDepth(-45);
    this.vignette = this.add.rectangle(0, 0, w, h, 0x000000, 0.14).setOrigin(0).setDepth(95);
    this.floorShadow = this.add.ellipse(480, 390, 680, 340, 0x000000, 0.08).setDepth(1);
    this.floorShadow2 = this.add.ellipse(760, 220, 260, 160, 0x000000, 0.06).setDepth(1);
    this.dustGroup = this.add.group();
    for (let i = 0; i < 10; i++) {
      const dust = this.add.circle(Phaser.Math.Between(80, 900), Phaser.Math.Between(60, 580), Phaser.Math.Between(1, 2), 0xfff1d5, 0.14).setDepth(92);
      dust.data = new Phaser.Data.DataManager(dust);
      dust.data.set('speed', Phaser.Math.FloatBetween(0.05, 0.18));
      this.dustGroup.add(dust);
    }

    this.roomWalls = this.physics.add.staticGroup();
    const addWall = (x, y, w2, h2) => {
      const alpha = this.debugWallsEnabled ? 0.22 : 0;
      const wall = this.add.rectangle(x, y, w2, h2, 0xff3b3b, alpha).setDepth(2);
      if (this.debugWallsEnabled) {
        wall.setStrokeStyle(2, 0xffffff, 0.35);
      }
      this.physics.add.existing(wall, true);
      wall.body.setSize(w2, h2);
      wall.body.updateFromGameObject();
      this.roomWalls.add(wall);
      return wall;
    };
    addWall(216, 40, 384, 26);
    addWall(480, 40, 144, 26);
    addWall(744, 40, 384, 26);
    addWall(24, 320, 28, 592);
    // Right and bottom walls strengthened to fully contain movement.
    addWall(952, 320, 56, 592);
    addWall(480, 636, 960, 48);

    // Collision obstacles (furniture) live in one group for consistency.
    this.obstacles = this.physics.add.staticGroup();
    const addObstacle = (x, y, w2, h2) => {
      const box = this.add.rectangle(x, y, w2, h2, 0x000000, 0).setDepth(2);
      this.physics.add.existing(box, true);
      box.body.setSize(w2, h2);
      box.body.updateFromGameObject();
      this.obstacles.add(box);
      return box;
    };

    // Composition: left workstation, open center, right tension zone.
    // Left = cozy work area (tight + organized).
    // Nudge the workstation slightly right to create a tighter left lane and a clearer mid route.
    this.desk = this.add.image(230, 246, 'desk').setScale(0.27).setDepth(20);
    this.chair = this.add.image(242, 350, 'chair').setScale(0.25).setDepth(19);
    // Desk-top props: keep them visually "on the desk", not stacking over the chair lane.
    this.lamp = this.add.image(170, 214, 'lamp').setScale(0.20).setDepth(21);
    this.books = this.add.image(296, 218, 'books').setScale(0.20).setDepth(21);
    this.plant = this.add.image(116, 178, 'plant').setScale(0.22).setDepth(21);

    // Right = risk / tension zone (owner + bed + safe closet).
    this.bed = this.add.image(744, 214, 'bed').setScale(0.26).setDepth(20);
    const closetX = 846;
    const closetY = 440;
    this.closet = this.add.image(closetX, closetY, 'closet').setScale(0.24).setDepth(20);

    // Fair collision rectangles (smaller than the art).
    // Keep center mostly open; only major furniture blocks movement.
    addObstacle(230, 266, 170, 70); // desk footprint
    addObstacle(252, 370, 92, 60);  // chair body (wider to force routing)
    addObstacle(744, 258, 190, 86); // bed footprint
    addObstacle(116, 186, 44, 44);  // plant pot

    // Bottle stays a loot item (no physics body needed).
    // Put it near the right lane (tempting, but not blocking the central rug).
    // Bottle: place near the bed lane so the bed footprint forces a careful approach.
    this.bottle = this.add.image(650, 416, 'bottle').setScale(0.13).setDepth(22);
    this.bottleShadow = this.add.ellipse(this.bottle.x, this.bottle.y + 10, 26, 12, 0x000000, 0.18).setDepth(16);

    // Safe zone follows closet placement (centered).
    this.safeZoneRect = new Phaser.Geom.Rectangle(closetX - 77, closetY - 78, 154, 156);
    this.exitZone = new Phaser.Geom.Rectangle(408, 56, 144, 96);
    const safeBlockMargin = 14;
    const safeBlockW = this.safeZoneRect.width + safeBlockMargin * 2;
    const safeBlockH = this.safeZoneRect.height + safeBlockMargin * 2;
    this.safeZoneBlock = this.add.rectangle(this.safeZoneRect.centerX, this.safeZoneRect.centerY, safeBlockW, safeBlockH, 0x000000, 0).setDepth(2);
    this.physics.add.existing(this.safeZoneBlock, true);
    this.safeZoneBlock.body.setSize(safeBlockW, safeBlockH);
    this.safeZoneBlock.body.updateFromGameObject();
    this.safeZoneShade = this.add.rectangle(
      this.safeZoneRect.centerX,
      this.safeZoneRect.centerY,
      this.safeZoneRect.width + 22,
      this.safeZoneRect.height + 22,
      0x000000,
      0.10
    ).setDepth(12);
    this.safeZoneShade.setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.bedShadow = this.add.ellipse(this.bed.x, this.bed.y + 78, 276, 88, 0x000000, 0.14).setDepth(13);
    this.closetShadow = this.add.ellipse(closetX, closetY + 74, 162, 88, 0x000000, 0.12).setDepth(15);
    this.deskShadow = this.add.ellipse(this.desk.x, this.desk.y + 70, 208, 66, 0x000000, 0.12).setDepth(14);
    this.chairShadow = this.add.ellipse(this.chair.x, this.chair.y + 44, 96, 44, 0x000000, 0.1).setDepth(15);

    this.ownerAlertScale = 0.28;
    this.exitLabel = this.add.text(480, 18, 'EXIT', {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      color: '#ffd55c',
      stroke: '#241c18',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(40).setShadow(0, 2, '#1f120f', 3, true, true);
    this.bottleGlow = this.add.circle(this.bottle.x, this.bottle.y, 46, 0xff7a69, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
    this.bottleRing = this.add.circle(this.bottle.x, this.bottle.y, 22, 0xff5f58, 0.0).setDepth(17);
    this.closetGlow = this.add.circle(this.closet.x, this.closet.y, 88, 0xffef7a, 0.22).setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
    this.closetRing = this.add.rectangle(this.closet.x, this.closet.y, 128, 156, 0xfff0a0, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(17);
    this.hideLabelOffsetX = 20;
    this.hideLabelOffsetY = 50; // relative to closet top
    const closetBounds = this.closet.getBounds();
    this.hideLabel = this.add.text(closetBounds.centerX + this.hideLabelOffsetX, closetBounds.top + this.hideLabelOffsetY, 'HIDE\nSPOT', {
      fontFamily: '"Press Start 2P"',
      fontSize: '11px',
      color: '#fff0b8',
      stroke: '#241c18',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5, 1).setDepth(41).setShadow(0, 2, '#2e1c10', 3, true, true);

    this.createLootItems();
    this.physics.world.setBounds(0, 0, 960, 640);
  }

  createLootItems() {
    const makeGlow = (x, y, color, alpha, depth = 16, r = 22) => this.add.circle(x, y, r, color, alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const makeRing = (x, y, color, alpha, w = 18, h = 18, depth = 17) => this.add.ellipse(x, y, w, h, color, alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const makeShadow = (x, y, w, h, alpha = 0.16, depth = 15) => this.add.ellipse(x, y, w, h, 0x000000, alpha).setDepth(depth);

    const bottleItem = {
      id: 'bottle',
      name: 'Bottle',
      sprite: this.bottle,
      glow: this.bottleGlow,
      ring: this.bottleRing,
      shadow: this.bottleShadow,
      radius: 42,
      noise: 0.45,
      shake: 12,
      prompt: 'Bottle collected.',
      volume: 0.55
    };

    // Loot spread: gold easy (left), key important (near exit route), gem risky (near bed/owner).
    const lootScale = 0.22;
    // Easy gold: tucked behind the chair/desk corner so you must route around furniture.
    const goldSprite = this.add.image(328, 360, 'gold').setScale(lootScale).setDepth(22);
    const goldShadow = makeShadow(328, 372, 22, 10, 0.12, 17);
    const goldGlow = makeGlow(328, 360, 0xffd56d, 0.14, 17, 20);
    const goldRing = makeRing(328, 360, 0xffe498, 0.08, 20, 16, 18);

    // Key: on the desk (no floating under the top wall), still encourages left-side visit.
    const keySprite = this.add.image(278, 208, 'key').setScale(lootScale).setDepth(23);
    const keyShadow = makeShadow(278, 220, 22, 10, 0.12, 17);
    const keyGlow = makeGlow(278, 208, 0x91b7ff, 0.14, 17, 20);
    const keyRing = makeRing(278, 208, 0xbcd3ff, 0.08, 20, 16, 18);

    // Risky loot: gem beside the bed/owner area.
    const gemSprite = this.add.image(816, 276, 'gem').setScale(lootScale).setDepth(23);
    const gemShadow = makeShadow(816, 288, 22, 10, 0.12, 17);
    const gemGlow = makeGlow(816, 276, 0xff9452, 0.14, 17, 20);
    const gemRing = makeRing(816, 276, 0xffc09a, 0.08, 20, 16, 18);

    this.lootItems = [bottleItem];
    this.lootItems.push(
      {
        id: 'gold',
        name: 'Gold',
        sprite: goldSprite,
        glow: goldGlow,
        ring: goldRing,
        shadow: goldShadow,
        radius: 34,
        noise: 0.02,
        shake: 6,
        prompt: 'Gold collected.',
        volume: 0.45
      },
      {
        id: 'key',
        name: 'Key',
        sprite: keySprite,
        glow: keyGlow,
        ring: keyRing,
        shadow: keyShadow,
        radius: 34,
        noise: 0.04,
        shake: 6,
        prompt: 'Key obtained.',
        volume: 0.45
      },
      {
        id: 'gem',
        name: 'Gem',
        sprite: gemSprite,
        glow: gemGlow,
        ring: gemRing,
        shadow: gemShadow,
        radius: 34,
        noise: 0.06,
        shake: 6,
        prompt: 'Gem secured.',
        volume: 0.45
      }
    );
    this.lootTotal = this.lootItems.length;
    this.lootCollectedCount = 0;
    this.updateLootUI();
  }

  createPlayer() {
    this.playerShadow = this.add.ellipse(480, 372, 28, 12, 0x000000, 0.22).setDepth(29);
    this.player = this.physics.add.sprite(480, 520, 'thief_idle');
    this.player.setSize(38, 56).setOffset(14, 20);
    this.player.body.enable = true;
    this.player.speed = 180;
    this.player.runSpeed = 260;
    this.player.noiseSource = 0;
    this.playerDisplayScale = 0.18;
    this.player.setScale(this.playerDisplayScale);
    this.player.setDepth(30);
    this.playerShadow.setDepth(29);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.roomWalls, this.onPlayerWallContact, null, this);
    if (this.obstacles) {
      this.physics.add.collider(this.player, this.obstacles);
    }
  }

  createOwner() {
    this.owner = this.physics.add.sprite(744, 210, 'owner_sleep');
    this.owner.setSize(58, 66).setOffset(12, 10);
    this.owner.setImmovable(true);
    this.owner.body.allowGravity = false;
    this.owner.state = 'sleeping';
    this.owner.setVisible(true);
    this.owner.setScale(0.25);
    this.owner.setDepth(21);
    this.owner.setCollideWorldBounds(true);
    this.physics.add.collider(this.owner, this.roomWalls);
    if (this.obstacles) {
      this.physics.add.collider(this.owner, this.obstacles);
    }
    this.physics.add.collider(this.owner, this.safeZoneBlock);
    this.physics.add.overlap(this.player, this.owner, () => this.onCaught());
  }

  createUI() {
    this.promptEl = document.getElementById('prompt');
    this.noiseFillEl = document.getElementById('noise-fill');
    this.noiseValueEl = document.getElementById('noise-value');
    this.lootCountEl = document.getElementById('loot-count');
    this.lootFillEl = document.getElementById('loot-fill');
    this.objectiveStatusEl = document.getElementById('objective-status');
    this.flash = this.add.rectangle(0, 0, 960, 640, 0xff3b3b, 0).setOrigin(0).setDepth(100);
    this.vignette = this.add.rectangle(0, 0, 960, 640, 0x000000, 0.18).setOrigin(0).setDepth(99);
    this.vignette.setStrokeStyle(0, 0);
    this.vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.updateLootUI();
  }

  bindInput() {
    this.cursors = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E');
  }

  createAudio() {
    this.sfx = {
      footstep: this.sound.add('footstep', { volume: 0.18 }),
      fahh: this.sound.add('fahh', { volume: 0.92 }),
      enter: this.sound.add('enter', { volume: 0.6 }),
      pickup: this.sound.add('pickup', { volume: 0.55 }),
      coreTransition: this.sound.add('coreTransition', { volume: 0.75 }),
      out: this.sound.add('out', { volume: 0.6 }),
      safe: this.sound.add('safe', { volume: 0.5 }),
      success: this.sound.add('success', { volume: 0.85 })
    };
  }

  setupPolish() {
    this.time.delayedCall(80, () => this.cameras.main.flash(120, 255, 240, 210));
    this.tweens.add({ targets: this.bottle, y: '+=2', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.chair, y: '+=1.2', duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.ownerBobTween = this.tweens.add({ targets: this.owner, y: '+=1.2', duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.ownerPulseTween = this.tweens.add({ targets: this.owner, scaleX: 0.102, scaleY: 0.098, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.setOwnerBreathing(true);
  }

  update(time, delta) {
    if (this.gameOver) return;
    this.handlePlayer(delta);
    this.updateWallBumpArming();
    this.handleBottleNoise(time);
    this.handleOwner(delta);
    this.updateSuspicion(delta);
    this.updateMovementAudio(time);
    this.updateNoiseUI();
    this.updateSafeZoneTransition(time);
    this.updateOwnerState(time);
    this.checkExitInteraction();
    this.updateAmbientMotion(time);
    this.updatePlayerReadability();
    this.updatePlayerSafeZoneVisual(delta);
  }

  updateSuspicion(delta) {
    // Slow decay keeps tension, but prevents instant permanent panic.
    const dt = Math.max(0, delta ?? 16) / 1000;
    const decayPerSec = this.chaseMode ? 0.02 : 0.035;
    this.noise = Phaser.Math.Clamp(this.noise - decayPerSec * dt, 0, 1);
  }

  updatePlayerSafeZoneVisual(delta) {
    if (!this.player || this.hidden || this.gameOver) return;
    const inSafe = this.isPlayerInSafeZone();
    const target = inSafe ? 0.55 : 1.0;
    const t = Phaser.Math.Clamp((delta ?? 16) / 1000, 0.01, 0.05);
    // Smooth fade so it feels intentional, not flickery.
    this.playerSafeAlpha = Phaser.Math.Linear(this.playerSafeAlpha ?? 1, target, 0.22 + t);
    this.player.setAlpha(this.playerSafeAlpha);
    if (this.playerOutline) this.playerOutline.setAlpha(this.playerSafeAlpha * 0.55);
    if (this.playerShadow) this.playerShadow.setAlpha(inSafe ? 0.14 : 0.22);
  }

  handlePlayer(delta) {
    if (this.player?.body && !this.hidden && !this.player.body.enable) {
      this.player.body.enable = true;
    }
    if (this.player && !this.hidden) {
      this.player.setVisible(true);
    }
    const left = (this.cursors.A.isDown || this.cursors.LEFT.isDown) ? -1 : 0;
    const right = (this.cursors.D.isDown || this.cursors.RIGHT.isDown) ? 1 : 0;
    const up = (this.cursors.W.isDown || this.cursors.UP.isDown) ? -1 : 0;
    const down = (this.cursors.S.isDown || this.cursors.DOWN.isDown) ? 1 : 0;
    const moving = left || right || up || down;
    const speed = this.cursors.SHIFT.isDown ? this.player.runSpeed : this.player.speed;
    const target = new Phaser.Math.Vector2(left + right, up + down).normalize().scale(moving ? speed : 0);
    this.player.body.velocity.x = Phaser.Math.Linear(this.player.body.velocity.x, target.x, 0.28);
    this.player.body.velocity.y = Phaser.Math.Linear(this.player.body.velocity.y, target.y, 0.28);
    // Sprinting increases suspicion gradually (time-based, not frame-based).
    if (moving && this.cursors.SHIFT.isDown) {
      const dt = Math.max(0, delta ?? 16) / 1000;
      this.addNoise(0.12 * dt);
    }
    this.player.setDrag(1000, 1000);
    this.updatePlayerAnimation({ moving, left, right, up, down });
  }

  handleBottleNoise(time) {
    if (!Phaser.Input.Keyboard.JustDown(this.cursors.E) || this.hidden || this.gameOver) return;

    const loot = this.getClosestLootItem(48);
    if (loot) {
      this.collectLootItem(loot);
      this.lastBottleAt = time;
      return;
    }

    const nearCloset = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.closet.x, this.closet.y) < 54;
    if (nearCloset) this.tryHide();
  }

  getClosestLootItem(range = 48) {
    if (!this.lootItems?.length) return null;
    let closest = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    this.lootItems.forEach((item) => {
      if (!item || item.collected || !item.sprite?.visible) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.sprite.x, item.sprite.y);
      if (distance <= range && distance < closestDistance) {
        closest = item;
        closestDistance = distance;
      }
    });

    return closest;
  }

  collectLootItem(item) {
    if (!item || item.collected) return;
    item.collected = true;
    this.lootCollectedCount = Math.min(this.lootCollectedCount + 1, this.lootTotal);
    this.updateLootUI();

    // Safety: loot pickup must never disable player movement.
    if (this.player?.body && !this.hidden && !this.player.body.enable) {
      this.player.body.enable = true;
    }

    // Rewarding pickup feedback: small pop + floating text.
    const fxX = item.sprite?.x ?? this.player.x;
    const fxY = item.sprite?.y ?? this.player.y;
    const floatText = this.add.text(fxX, fxY - 18, '+1 Loot', {
      fontFamily: '"Press Start 2P"',
      fontSize: '11px',
      color: '#fff1c6',
      stroke: '#3a241c',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(120);
    this.tweens.add({
      targets: floatText,
      y: fxY - 40,
      alpha: 0,
      duration: 520,
      ease: 'Sine.out',
      onComplete: () => floatText.destroy()
    });

    if (item.sprite) {
      const sx = item.sprite.scaleX ?? 1;
      const sy = item.sprite.scaleY ?? 1;
      this.tweens.add({
        targets: item.sprite,
        scaleX: sx * 1.18,
        scaleY: sy * 1.18,
        alpha: 0,
        duration: 160,
        yoyo: false,
        ease: 'Back.out',
        onComplete: () => {
          item.sprite.setVisible(false);
          item.sprite.setAlpha(1);
          item.sprite.setScale(sx, sy);
        }
      });
    }
    if (item.shadow) item.shadow.setVisible(false);
    if (item.glow) item.glow.setVisible(false);
    if (item.ring) item.ring.setVisible(false);
    if (item.sprite === this.bottle && this.bottle.body) {
      this.bottle.body.enable = false;
    }

    if (item.id === 'bottle') {
      this.bottleCollected = true;
      this.addNoise(item.noise ?? 0.45);
      this.playSfx('pickup', { minGap: 180, volume: item.volume ?? 0.55 });
      this.screenShake(item.shake ?? 12);
      this.updatePrompt(`Bottle collected. (${this.lootCollectedCount}/${this.lootTotal})`);
    } else {
      this.addNoise(item.noise ?? 0.06);
      this.playSfx('pickup', { minGap: 180, volume: item.volume ?? 0.45 });
      this.screenShake(item.shake ?? 6);
      this.updatePrompt(`${item.prompt || 'Loot secured.'} ${this.lootCollectedCount}/${this.lootTotal} collected.`);
    }

    this.updateEscapeAvailability();
    if (this.allLootCollected()) {
      this.updatePrompt('All loot secured. Head for the exit.');
    }
  }

  allLootCollected() {
    return this.lootTotal > 0 && this.lootCollectedCount >= this.lootTotal;
  }

  updateEscapeAvailability() {
    this.exitUnlocked = this.allLootCollected();
  }

  updateWallBumpArming() {
    if (!this.player?.body) return;
    const touchingWall = !!(
      this.player.body.blocked.left ||
      this.player.body.blocked.right ||
      this.player.body.blocked.up ||
      this.player.body.blocked.down
    );
    if (!touchingWall) {
      this.wallBumpArmed = true;
    }
  }

  handleOwner(dt) {
    if (this.chaseMode) {
      if (this.hidden) {
        this.owner.setVelocity(0, 0);
        return;
      }
      this.setOwnerBreathing(false);
      this.owner.setTexture('owner_alert');
      this.owner.setScale(this.ownerAlertScale);
      const inSafeZone = this.isPlayerInSafeZone();
      const targetX = inSafeZone
        ? Phaser.Math.Clamp(this.player.x, this.safeZoneRect.left + 10, this.safeZoneRect.right - 10)
        : this.player.x;
      const targetY = inSafeZone ? this.safeZoneRect.bottom + 36 : this.player.y;
      if (inSafeZone && Phaser.Math.Distance.Between(this.owner.x, this.owner.y, targetX, targetY) < 14) {
        this.owner.setVelocity(0, 0);
        return;
      }
      const desired = new Phaser.Math.Vector2(targetX - this.owner.x, targetY - this.owner.y);
      if (desired.lengthSq() < 0.0001) {
        this.owner.setVelocity(0, 0);
        return;
      }
      desired.normalize();

      // Lightweight steering: slide along blockers and add a short detour when stuck.
      const body = this.owner.body;
      let steer = desired.clone();
      if (body?.blocked?.left || body?.blocked?.right) {
        steer.x = 0;
        if (Math.abs(steer.y) < 0.25) steer.y = body.blocked.left ? 1 : -1;
      }
      if (body?.blocked?.up || body?.blocked?.down) {
        steer.y = 0;
        if (Math.abs(steer.x) < 0.25) steer.x = body.blocked.up ? 1 : -1;
      }

      const moved = Phaser.Math.Distance.Between(this.owner.x, this.owner.y, this.ownerLastPos.x, this.ownerLastPos.y);
      this.ownerLastPos.x = this.owner.x;
      this.ownerLastPos.y = this.owner.y;
      if (moved < 0.35) this.ownerStuckMs += dt;
      else this.ownerStuckMs = 0;

      if (this.time.now < this.ownerDetourUntil) {
        steer = steer.scale(0.35).add(this.ownerDetourDir.clone().scale(0.65));
      } else if (this.ownerStuckMs > 380) {
        // Pick a consistent perpendicular direction based on where the owner is relative to the safe zone.
        const clockwise = this.owner.x < this.safeZoneRect.centerX;
        this.ownerDetourDir = clockwise
          ? new Phaser.Math.Vector2(-desired.y, desired.x)
          : new Phaser.Math.Vector2(desired.y, -desired.x);
        this.ownerDetourUntil = this.time.now + 850;
        this.ownerStuckMs = 0;
        steer = desired.clone().scale(0.35).add(this.ownerDetourDir.clone().scale(0.65));
      }

      if (steer.lengthSq() < 0.0001) steer = desired;
      steer.normalize();
      this.owner.setVelocity(steer.x * 72, steer.y * 72);
      this.owner.setVisible(true);
      return;
    }

    // Mid suspicion: owner stirs but doesn't fully panic yet.
    if (this.noise >= 0.55 && this.noise < 0.8) {
      const now = this.time.now;
      if (now - (this.lastStirAt ?? 0) > 2200) {
        this.lastStirAt = now;
        this.ownerWakeBurst('?');
        this.sound.play('coreTransition', { volume: 0.18, rate: 1.12, detune: 40 });
        this.updatePrompt('Shh... the owner is stirring.');
      }
    }

    if (this.noise >= 0.8) {
      this.chaseMode = true;
      this.owner.state = 'chase';
      this.setOwnerBreathing(false);
      this.owner.setTexture('owner_alert');
      this.owner.setScale(this.ownerAlertScale);
      this.owner.setVisible(true);
      this.playSfx('coreTransition', { minGap: 1200, delay: 120 });
      this.flashRed();
      this.ownerWakeBurst();
      this.playSfx('fahh', { minGap: 1600, delay: 80 });
      this.updatePrompt('OH NO. OWNER HAS ENTERED PANIC MODE.');
      return;
    }
    this.owner.setVelocity(0, 0);
  }

  isPlayerInSafeZone() {
    return this.safeZoneRect ? Phaser.Geom.Rectangle.Contains(this.safeZoneRect, this.player.x, this.player.y) : false;
  }

  isPlayerInExitZone() {
    return this.exitZone ? Phaser.Geom.Rectangle.Contains(this.exitZone, this.player.x, this.player.y) : false;
  }

  isWallTouchExempt() {
    return this.isPlayerInSafeZone() || this.isPlayerInExitZone();
  }

  onPlayerWallContact() {
    if (this.gameOver || this.hidden || this.isWallTouchExempt()) return;
    if (!this.wallBumpArmed) return;
    this.wallBumpArmed = false;

    // Wall bumps are suspicious, but shouldn't instantly force full panic.
    this.addNoise(0.08);
    this.playSfx('fahh', { minGap: 180, delay: 10 });

    if (this.chaseMode) {
      this.screenShake(16);
      return;
    }

    if (this.noise >= 0.8) {
      this.chaseMode = true;
      this.owner.state = 'chase';
      this.setOwnerBreathing(false);
      this.owner.setTexture('owner_alert');
      this.owner.setScale(this.ownerAlertScale);
      this.owner.setVisible(true);
      this.playSfx('coreTransition', { minGap: 1200, delay: 90 });
      this.flashRed();
      this.screenShake(80);
      this.ownerWakeBurst();
      this.updatePrompt('Wall bump! The owner heard that.');
    } else {
      this.screenShake(10);
      this.updatePrompt('Careful... wall bumps are loud.');
    }
  }

  updateSafeZoneTransition(time) {
    const inSafeZone = this.isPlayerInSafeZone();
    if (inSafeZone) {
      if (this.safeZoneSoundArmed) {
        this.safeZoneSoundArmed = false;
        this.safeZoneEnterAt = time;
        this.playSfx('safe', { minGap: 700 });
        this.updatePrompt('Safe zone: closet. Stay hidden for a moment.');
      }
    } else {
      this.safeZoneEnterAt = null;
      this.safeZoneSoundArmed = true;
    }
    this.wasInSafeZone = inSafeZone;
  }

  resetOwnerToSleep(promptText = 'The owner calmed down and went back to sleep.') {
    this.chaseMode = false;
    this.hidden = false;
    this.owner.state = 'sleeping';
    this.setOwnerBreathing(true);
    this.owner.setTexture('owner_sleep');
    this.owner.setScale(0.25);
    this.owner.setVisible(true);
    this.owner.setVelocity(0, 0);
    this.player.body.enable = true;
    this.player.setVisible(true);
    this.clearAlertEffects();
    this.updateEscapeAvailability();
    if (promptText) this.updatePrompt(promptText);
    this.playSfx('out', { minGap: 900 });
    this.safeZoneEnterAt = null;
    this.wasInSafeZone = this.isPlayerInSafeZone();
    this.safeZoneSoundArmed = !this.wasInSafeZone;
  }

  updateOwnerState(time) {
    if (!this.chaseMode) {
      this.setOwnerBreathing(true);
      this.owner.setTexture('owner_sleep');
      this.owner.setScale(0.25);
      this.owner.setVisible(true);
      return;
    }

    // If panic starts while the player is already in the safe zone, we still want
    // the 5s calm-down timer to run (not only on "entry" events).
    const inSafeZone = this.isPlayerInSafeZone();
    if (inSafeZone && this.safeZoneEnterAt == null) {
      this.safeZoneEnterAt = time;
    }
    if (!inSafeZone && this.safeZoneEnterAt != null) {
      this.safeZoneEnterAt = null;
    }

    if (this.hidden && this.chaseMode) {
      const calm = Phaser.Math.Clamp(this.noise - 0.02, 0, 1);
      this.noise = calm;
      if (this.noise < 0.18) {
        this.resetOwnerToSleep('You hid successfully. The owner calmed down. Suspicious silence.');
      }
      return;
    }

    if (this.safeZoneEnterAt != null && time - this.safeZoneEnterAt >= this.safeZoneCalmMs) {
      this.noise = Phaser.Math.Clamp(this.noise - 0.1, 0, 1);
      this.resetOwnerToSleep('The closet stayed quiet. The owner is asleep again.');
    }
  }

  checkExitInteraction() {
    const inExitZone = this.isPlayerInExitZone();
    if (!inExitZone) {
      this.exitPromptVisible = false;
      this.exitPromptMode = '';
      return;
    }
    if (this.gameOver) return;
    if (!this.allLootCollected()) {
      if (this.exitPromptMode !== 'blocked') {
        this.exitPromptVisible = true;
        this.exitPromptMode = 'blocked';
        this.updatePrompt(`Collect all items before escaping! (${this.lootCollectedCount}/${this.lootTotal})`);
      }
      return;
    }
    if (this.exitPromptMode !== 'ready') {
      this.exitPromptVisible = true;
      this.exitPromptMode = 'ready';
      this.updatePrompt('Exit ready. Press E to leave the room.');
    }
    if (!Phaser.Input.Keyboard.JustDown(this.cursors.E)) {
      return;
    }
    this.completeRoom();
  }

  completeRoom() {
    if (this.roomCompleted) return;
    this.roomCompleted = true;
    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.owner.setVelocity(0, 0);
    this.flashRed();
    this.playSfx('success', { minGap: 2000, delay: 70 });
    this.cameras.main.fade(560, 16, 10, 10);
    this.updatePrompt('ESCAPED! Loot secured. Perfect stealth.');
    this.add.text(480, 308, 'ESCAPED!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '30px',
      color: '#fff2cc',
      stroke: '#4b2f24',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(200);
    this.add.text(480, 360, 'Loot secured.', {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      color: '#f8e7c8',
      stroke: '#4b2f24',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(200);
  }

  tryHide() {
    if (!this.chaseMode || this.hidden) return;
    const canHide = this.safeZoneRect && Phaser.Geom.Rectangle.Contains(this.safeZoneRect, this.player.x, this.player.y);
    if (canHide) {
      this.hidden = true;
      this.player.setVisible(false);
      this.player.body.enable = false;
      this.player.setVelocity(0, 0);
      this.playSfx('enter', { minGap: 900, delay: 40 });
      this.updatePrompt('Hidden in closet. Pretend you were never here.');
    }
  }

  addNoise(amount) {
    this.noise = Phaser.Math.Clamp(this.noise + amount, 0, 1);
    if (this.noise > 0.45 && !this.chaseMode) this.updatePrompt('Uh oh. The noise meter is getting rude.');
  }

  updateNoiseUI() {
    if (!this.noiseDisplay) this.noiseDisplay = 0;
    this.noiseDisplay = Phaser.Math.Linear(this.noiseDisplay, this.noise, 0.08);
    if (this.noiseFillEl) this.noiseFillEl.style.width = `${Math.round(this.noiseDisplay * 100)}%`;
    if (this.noiseValueEl) this.noiseValueEl.textContent = `${Math.round(this.noiseDisplay * 100)}%`;
  }

  updateLootUI() {
    const total = this.lootTotal || 0;
    const collected = Math.min(this.lootCollectedCount || 0, total);
    const progress = total > 0 ? Math.round((collected / total) * 100) : 0;
    if (this.lootCountEl) this.lootCountEl.textContent = `${collected}/${total}`;
    if (this.lootFillEl) this.lootFillEl.style.width = `${progress}%`;
    if (this.objectiveStatusEl) {
      if (!total) {
        this.objectiveStatusEl.textContent = 'Loot is loading...';
      } else if (collected >= total) {
        this.objectiveStatusEl.textContent = 'All loot secured. Head for the exit.';
      } else {
        this.objectiveStatusEl.textContent = `Collect every item before escaping.`;
      }
    }
  }

  updatePrompt(text) {
    const el = this.promptEl;
    if (!el) return;
    el.style.opacity = '0.72';
    el.style.transform = 'translateY(2px) scale(0.99)';
    window.clearTimeout(this.promptResetTimer);
    el.textContent = text;
    this.promptResetTimer = window.setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
    }, 20);
  }

  flashRed() {
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0.0);
    this.tweens.add({ targets: this.flash, alpha: 0.34, duration: 90, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    this.updatePromptStyle(true);
  }

  screenShake(intensity) {
    this.cameras.main.shake(intensity, intensity * 0.015);
  }

  ownerWakeBurst(symbol = '!') {
    if (this.ownerWakeText) this.ownerWakeText.destroy();
    const size = symbol === '!' ? '24px' : '18px';
    this.ownerWakeText = this.add.text(this.owner.x + 6, this.owner.y - 18, symbol, {
      fontFamily: '"Press Start 2P"',
      fontSize: size,
      color: '#fff3a8',
      stroke: '#6b281f',
      strokeThickness: 4
    }).setDepth(120).setOrigin(0.5);
    this.tweens.add({
      targets: this.ownerWakeText,
      y: this.owner.y - 38,
      alpha: 0,
      duration: 650,
      ease: 'Sine.out',
      onComplete: () => this.ownerWakeText && this.ownerWakeText.destroy()
    });
  }

  clearAlertEffects() {
    this.flash.setAlpha(0);
    this.updatePromptStyle(false);
  }

  updatePromptStyle(alert) {
    const prompt = document.getElementById('prompt');
    if (!prompt) return;
    prompt.style.boxShadow = alert ? '0 0 18px rgba(255, 90, 70, 0.35)' : '0 8px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)';
    prompt.style.borderColor = alert ? '#d65a4e' : '#5a3a2c';
  }

  updateAmbientMotion(time) {
    const t = time * 0.001;
    this.roomGlow.alpha = 0.05 + Math.sin(t * 1.2) * 0.01;
    // During chase: slightly darker room + softer red pulse (less harsh).
    const chasePulse = this.chaseMode ? (0.5 + Math.sin(t * 3.2) * 0.5) : 0;
    this.vignette.alpha = this.chaseMode ? 0.24 : 0.16 + Math.sin(t * 0.7) * 0.008;
    this.flash.alpha = Math.max(this.flash.alpha, this.chaseMode ? 0.02 + chasePulse * 0.03 : 0);
    this.floorShadow.alpha = 0.16 + Math.sin(t * 0.9) * 0.008;
    this.floorShadow2.alpha = 0.08 + Math.cos(t * 1.1) * 0.006;
    if (this.ownerWakeText) {
      this.ownerWakeText.x = this.owner.x + 6;
    }
    if (this.dustGroup) {
      this.dustGroup.children.each((dust) => {
        dust.y -= dust.data.get('speed');
        if (dust.y < 24) {
          dust.y = 620;
          dust.x = Phaser.Math.Between(50, 910);
        }
      });
    }
    if (this.bottleRing) {
      this.bottleRing.x = this.bottle.x;
      this.bottleRing.y = this.bottle.y;
    }
    if (this.bottleGlow) {
      this.bottleGlow.x = this.bottle.x;
      this.bottleGlow.y = this.bottle.y;
    }
    if (this.closetRing) {
      this.closetRing.x = this.closet.x;
      this.closetRing.y = this.closet.y;
    }
    if (this.closetGlow) {
      this.closetGlow.x = this.closet.x;
      this.closetGlow.y = this.closet.y;
    }
    if (this.hideLabel && this.closet) {
      const closetBounds = this.closet.getBounds();
      this.hideLabel.x = closetBounds.centerX + (this.hideLabelOffsetX ?? 0);
      this.hideLabel.y = closetBounds.top + (this.hideLabelOffsetY ?? 0);
    }
    if (this.safeZoneShade) {
      this.safeZoneShade.x = this.safeZoneRect.centerX;
      this.safeZoneShade.y = this.safeZoneRect.centerY;
      const inSafe = this.isPlayerInSafeZone() || this.hidden;
      const base = inSafe ? 0.18 : 0.10;
      this.safeZoneShade.alpha = base + Math.sin(t * 1.1) * 0.01;
    }
    if (this.lootItems?.length) {
      this.lootItems.forEach((item, index) => {
        if (!item || item.collected) return;
        if (item.glow && item.sprite) {
          item.glow.x = item.sprite.x;
          item.glow.y = item.sprite.y;
        }
        if (item.ring && item.sprite) {
          item.ring.x = item.sprite.x;
          item.ring.y = item.sprite.y;
        }
        if (item.shadow && item.sprite) {
          item.shadow.x = item.sprite.x;
          item.shadow.y = item.sprite.y + 8;
        }
        const itemPulse = 0.5 + (Math.sin(t * 2.4 + index) * 0.5);
        if (item.glow) {
          item.glow.setScale(1 + itemPulse * 0.12);
          item.glow.alpha = item.id === 'bottle' ? 0.12 + itemPulse * 0.12 : 0.08 + itemPulse * 0.1;
        }
        if (item.ring) {
          item.ring.setScale(1 + itemPulse * 0.03);
          item.ring.alpha = 0.08 + itemPulse * 0.12;
        }
      });
    }
    if (this.playerShadow) {
      const moving = this.player?.body ? (Math.abs(this.player.body.velocity.x) + Math.abs(this.player.body.velocity.y)) > 6 : false;
      const bob = moving ? Math.sin(t * 10) * 1.1 : 0;
      this.playerShadow.x = this.player.x + 2;
      this.playerShadow.y = this.player.y + 3 + bob;
      this.playerShadow.scaleX = 1 + (moving ? 0.06 : 0);
      this.playerShadow.scaleY = 1 + (moving ? 0.03 : 0);
    }
    const pulse = 0.5 + (Math.sin(t * 2.4) * 0.5);
    if (this.bottleGlow) {
      this.bottleGlow.setScale(1 + pulse * 0.14);
      this.bottleGlow.alpha = 0.12 + pulse * 0.12;
    }
    if (this.closetGlow) {
      this.closetGlow.setScale(1 + pulse * 0.10);
      this.closetGlow.alpha = 0.12 + pulse * 0.14;
    }
    if (this.closetRing) {
      this.closetRing.setScale(1 + pulse * 0.03);
      this.closetRing.alpha = 0.12 + pulse * 0.12;
    }
    if (this.bottleRing) {
      this.bottleRing.setScale(1 + pulse * 0.03);
      this.bottleRing.alpha = 0.18 + pulse * 0.18;
    }
  }

  updatePlayerReadability() {
    if (!this.player) return;
    if (!this.playerOutline) {
      this.playerOutline = this.add.image(this.player.x, this.player.y, this.player.texture.key).setTint(0x0a0706).setAlpha(0.55);
      this.playerOutline.setDepth(29);
    }
    this.playerOutline.setTexture(this.player.texture.key);
    this.playerOutline.setScale(this.player.scaleX * 1.08, this.player.scaleY * 1.08);
    this.playerOutline.x = this.player.x;
    this.playerOutline.y = this.player.y;
    this.playerOutline.setVisible(this.player.visible);
    this.player.setTint(this.chaseMode ? 0xfff0d8 : 0xffffff);
  }

  updatePlayerAnimation(moving) {
    const input = typeof moving === 'object' ? moving : { moving };
    const { left = 0, right = 0, up = 0, down = 0 } = input;
    const active = !!input.moving;

    if (!active) {
      if (this.currentPlayerTexture !== 'thief_idle') {
        this.player.setTexture('thief_idle');
        this.currentPlayerTexture = 'thief_idle';
      }
      this.player.setFlipX(false);
      return;
    }

    const verticalPriority = up || down;
    if (verticalPriority) {
      if (up) {
        if (this.currentPlayerTexture !== 'walk_up') {
          this.player.setTexture('walk_up');
          this.currentPlayerTexture = 'walk_up';
        }
        this.player.setFlipX(false);
      } else {
        if (this.currentPlayerTexture !== 'thief_idle') {
          this.player.setTexture('thief_idle');
          this.currentPlayerTexture = 'thief_idle';
        }
        this.player.setFlipX(false);
      }
      return;
    }

    const frame = Math.floor(this.time.now / 140) % 2 === 0 ? 'thief_walk_1' : 'thief_walk_2';
    if (frame !== this.currentPlayerTexture) {
      this.player.setTexture(frame);
      this.currentPlayerTexture = frame;
    }

    if (left) {
      this.player.setFlipX(false);
    } else if (right) {
      this.player.setFlipX(true);
    }
  }

  addFloorVariation() {
    return;
  }

  addDust() {
    return;
  }

  setOwnerBreathing(active) {
    if (this.ownerBobTween) this.ownerBobTween.paused = !active;
    if (this.ownerPulseTween) this.ownerPulseTween.paused = !active;
  }

  updateMovementAudio(time) {
    const moving = this.cursors.A.isDown || this.cursors.D.isDown || this.cursors.W.isDown || this.cursors.S.isDown ||
      this.cursors.LEFT.isDown || this.cursors.RIGHT.isDown || this.cursors.UP.isDown || this.cursors.DOWN.isDown;
    if (!moving) {
      this.lastFootstepAt = 0;
      return;
    }

    const sprinting = this.cursors.SHIFT.isDown;
    const interval = sprinting ? 180 : 260;
    const volume = sprinting ? 0.22 : 0.16;
    if (time - this.lastFootstepAt < interval) return;

    this.lastFootstepAt = time;
    this.sound.play('footstep', {
      volume,
      rate: sprinting ? 1.08 : 1.0,
      detune: sprinting ? 10 : 0
    });
  }

  playSfx(key, options = {}) {
    const sound = this.sfx?.[key];
    if (!sound) return;
    const now = this.time.now;
    const minGap = options.minGap ?? 0;
    const gateKey = `last${key[0].toUpperCase()}${key.slice(1)}At`;
    if (minGap > 0 && now - (this[gateKey] ?? 0) < minGap) return;
    this[gateKey] = now;

    const play = () => {
      if (options.volume != null) sound.setVolume(options.volume);
      if (options.rate != null) sound.setRate(options.rate);
      if (options.detune != null) sound.setDetune(options.detune);
      sound.play();
      if (options.fadeIn) {
        sound.setVolume(0);
        this.tweens.add({
          targets: sound,
          volume: options.volume ?? 1,
          duration: options.fadeIn
        });
      }
    };

    if (options.delay) {
      this.time.delayedCall(options.delay, play);
    } else {
      play();
    }
  }

  onCaught() {
    if (this.hidden || this.gameOver || !this.chaseMode) return;
    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.owner.setVelocity(0, 0);
    this.updatePrompt('BUSTED! The owner caught the tiny thief.');
    this.screenShake(120);
    this.flashRed();
    // Funny fail sting (re-use existing sound with a goofy pitch).
    this.sound.play('fahh', { volume: 1.0, rate: 0.9, detune: -220 });
    this.add.text(480, 312, 'BUSTED!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '30px',
      color: '#fffbf2',
      stroke: '#a51f1f',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(1400, () => {
      this.scene.restart();
    });
  }
}