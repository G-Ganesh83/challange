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
    this.lastAlertAt = 0;
    this.bottleCollected = false;
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
    this.load.image('bottle_src', 'assets/props/bottle.png');
    this.load.audio('footstep', 'assets/sounds/footstep.mp3');
    this.load.audio('fahh', 'assets/sounds/fahh.mp3');
    this.load.audio('enter', 'assets/sounds/enter.mp3');
    this.load.audio('pickup', 'assets/sounds/pickup.mp3');
    this.load.audio('coreTransition', 'assets/sounds/core_transition.mp3');
    this.load.audio('out', 'assets/sounds/out.mp3');
    this.load.audio('safe', 'assets/sounds/safe.mp3');
  }

  create() {
    this.noise = 0;
    this.chaseMode = false;
    this.hidden = false;
    this.gameOver = false;
    this.lastFootstepAt = 0;
    this.lastBottleAt = 0;
    this.lastAlertAt = 0;
    this.bottleCollected = false;
    this.safeZoneEnterAt = null;
    this.wasInSafeZone = false;
    this.safeZoneCalmMs = 5000;
    this.exitUnlocked = false;
    this.roomCompleted = false;
    this.exitPromptVisible = false;

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
    this.prepareVisualTexture('bottle_src', 'bottle');
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

    this.walls = this.physics.add.staticGroup();
    const solids = [
      [480, 46, 888, 32],
      [480, 594, 888, 32],
      [46, 320, 32, 548],
      [914, 320, 32, 548],
      [332, 94, 252, 24],
      [628, 94, 252, 24]
    ];
    solids.forEach(([x, y, w2, h2]) => {
      const wall = this.add.rectangle(x, y, w2, h2, 0x000000, 0).setDepth(2);
      this.physics.add.existing(wall, true);
      wall.body.setSize(w2, h2);
      wall.body.updateFromGameObject();
      this.walls.add(wall);
    });
    this.wallHint = this.add.rectangle(480, 94, 420, 14, 0x000000, 0).setDepth(2);
    this.physics.add.existing(this.wallHint, true);
    this.wallHint.body.setSize(420, 14);
    this.wallHint.body.updateFromGameObject();

    this.bed = this.physics.add.staticImage(748, 214, 'bed').setScale(0.25).refreshBody();
    this.closet = this.physics.add.staticImage(846, 304, 'closet').setScale(0.23).refreshBody();
    this.desk = this.physics.add.staticImage(178, 250, 'desk').setScale(0.26).refreshBody();
    this.chair = this.physics.add.staticImage(186, 344, 'chair').setScale(0.22).refreshBody();
    this.bottle = this.physics.add.staticImage(708, 384, 'bottle').setScale(0.12).refreshBody();
    this.bottleShadow = this.add.ellipse(708, 394, 26, 12, 0x000000, 0.18).setDepth(16);
    this.safeZoneRect = new Phaser.Geom.Rectangle(802, 244, 126, 132);
    this.exitZone = new Phaser.Geom.Rectangle(424, 28, 112, 86);
    this.safeZoneBlock = this.physics.add.staticImage(852, 304, 'bottle').setVisible(false);
    this.safeZoneBlock.setDisplaySize(104, 128);
    this.safeZoneBlock.refreshBody();

    this.bedShadow = this.add.ellipse(748, 288, 276, 88, 0x000000, 0.14).setDepth(13);
    this.closetShadow = this.add.ellipse(846, 372, 146, 78, 0x000000, 0.12).setDepth(15);
    this.deskShadow = this.add.ellipse(178, 318, 208, 66, 0x000000, 0.12).setDepth(14);
    this.chairShadow = this.add.ellipse(186, 394, 88, 40, 0x000000, 0.1).setDepth(15);

    this.ownerAlertScale = 0.28;
    this.exitLabel = this.add.text(480, 18, 'EXIT', {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      color: '#ffd55c',
      stroke: '#241c18',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(40);
    this.bottleRing = this.add.circle(708, 384, 22, 0xff4d46, 0).setStrokeStyle(3, 0xff6a5e, 1).setDepth(17);
    this.closetRing = this.add.rectangle(846, 304, 94, 116, 0x000000, 0).setStrokeStyle(3, 0xffd655, 1).setDepth(17);
    this.hideLabel = this.add.text(902, 318, 'HIDE\nSPOT', {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      color: '#ffd55c',
      stroke: '#241c18',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0, 0.5).setDepth(41);

    this.physics.world.setBounds(48, 48, 864, 544);
  }

  createPlayer() {
    this.playerShadow = this.add.ellipse(480, 372, 28, 12, 0x000000, 0.22).setDepth(29);
    this.player = this.physics.add.sprite(480, 360, 'thief_idle');
    this.player.setCollideWorldBounds(true);
    this.player.setSize(38, 56).setOffset(14, 20);
    this.player.body.enable = true;
    this.player.speed = 150;
    this.player.runSpeed = 220;
    this.player.noiseSource = 0;
    this.playerDisplayScale = 0.18;
    this.player.setScale(this.playerDisplayScale);
    this.player.setDepth(30);
    this.playerFacing = 'down';
    this.playerShadow.setDepth(29);
    this.physics.add.collider(this.player, this.walls, this.onPlayerWallContact, null, this);
    this.physics.add.collider(this.player, this.wallHint, this.onPlayerWallContact, null, this);
    this.physics.add.collider(this.player, [this.bed, this.desk, this.chair, this.bottle]);
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
    this.physics.add.collider(this.owner, this.walls);
    this.physics.add.collider(this.owner, this.wallHint);
    this.physics.add.collider(this.owner, [this.bed, this.closet, this.desk, this.chair, this.bottle, this.safeZoneBlock]);
    this.physics.add.overlap(this.player, this.owner, () => this.onCaught());
  }

  createUI() {
    this.uiPanel = this.add.rectangle(12, 12, 936, 72, 0x1a1110, 0.58).setOrigin(0).setStrokeStyle(2, 0x8e6244, 1);
    this.uiPanel.setDepth(49);
    this.add.text(28, 22, 'MEME PANIC STEALTH', {
      fontFamily: '"Press Start 2P"',
      fontSize: '17px',
      color: '#fff0d8',
      stroke: '#37211a',
      strokeThickness: 5
    }).setScrollFactor(0).setDepth(50);
    this.add.text(28, 48, 'tiny thief training room', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#d9b48a'
    }).setDepth(50);
    this.flash = this.add.rectangle(0, 0, 960, 640, 0xff3b3b, 0).setOrigin(0).setDepth(100);
    this.vignette = this.add.rectangle(0, 0, 960, 640, 0x000000, 0.18).setOrigin(0).setDepth(99);
    this.vignette.setStrokeStyle(0, 0);
    this.vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
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
      safe: this.sound.add('safe', { volume: 0.5 })
    };
  }

  setupPolish() {
    this.time.delayedCall(80, () => this.cameras.main.flash(120, 255, 240, 210));
    this.idleTweens = [
      this.tweens.add({ targets: this.bottle, y: '+=2', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' }),
      this.tweens.add({ targets: this.chair, y: '+=1.2', duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    ];
    this.ownerBobTween = this.tweens.add({ targets: this.owner, y: '+=1.2', duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.ownerPulseTween = this.tweens.add({ targets: this.owner, scaleX: 0.102, scaleY: 0.098, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.setOwnerBreathing(true);
    this.promptGlow = null;
  }

  update(time, delta) {
    if (this.gameOver) return;
    this.handlePlayer(delta);
    this.handleBottleNoise(time);
    this.handleOwner(delta);
    this.updateMovementAudio(time);
    this.updateNoiseUI();
    this.updateSafeZoneTransition(time);
    this.updateOwnerState(time);
    this.checkExitInteraction();
    this.updateAmbientMotion(time);
    this.updatePlayerReadability();
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
    this.player.body.velocity.x = Phaser.Math.Linear(this.player.body.velocity.x, target.x, 0.24);
    this.player.body.velocity.y = Phaser.Math.Linear(this.player.body.velocity.y, target.y, 0.24);
    if (moving && this.cursors.SHIFT.isDown) this.addNoise(0.08);
    this.player.setDrag(1000, 1000);
    this.updatePlayerAnimation({ moving, left, right, up, down });
  }

  handleBottleNoise(time) {
    if (!this.bottleCollected && Phaser.Input.Keyboard.JustDown(this.cursors.E) && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bottle.x, this.bottle.y) < 40) {
      this.bottleCollected = true;
      this.bottle.setVisible(false);
      this.bottle.body.enable = false;
      this.bottleRing.setVisible(false);
      this.bottleShadow.setVisible(false);
      this.addNoise(0.45);
      this.playSfx('pickup', { minGap: 180 });
      this.flashRed();
      this.screenShake(150);
      this.updatePrompt('Bottle hit. The room is now extremely alerted.');
      this.lastBottleAt = time;
    }
    const touchingBottle = !this.bottleCollected && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bottle.x, this.bottle.y) < 22;
    if (touchingBottle && time - this.lastBottleAt > 250) {
      this.addNoise(0.015);
      this.screenShake(24);
      this.lastBottleAt = time;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.E)) {
      const nearCloset = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.closet.x, this.closet.y) < 54;
      if (nearCloset) this.tryHide();
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
      const dir = new Phaser.Math.Vector2(this.player.x - this.owner.x, this.player.y - this.owner.y).normalize();
      this.owner.setVelocity(dir.x * 72, dir.y * 72);
      this.owner.setVisible(true);
      return;
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

  isWallAlertExempt() {
    return this.isPlayerInSafeZone() || this.isPlayerInExitZone();
  }

  onPlayerWallContact() {
    if (this.gameOver || this.hidden || this.isWallAlertExempt()) return;
    if (this.time.now - this.lastAlertAt < 650) return;
    this.lastAlertAt = this.time.now;
    this.addNoise(0.06);
    if (!this.chaseMode) {
      this.chaseMode = true;
      this.owner.state = 'chase';
      this.setOwnerBreathing(false);
      this.owner.setTexture('owner_alert');
      this.owner.setScale(this.ownerAlertScale);
      this.owner.setVisible(true);
      this.playSfx('coreTransition', { minGap: 1200, delay: 90 });
      this.playSfx('fahh', { minGap: 1600, delay: 120 });
      this.flashRed();
      this.screenShake(80);
      this.ownerWakeBurst();
      this.updatePrompt('Wall bump! The owner heard that.');
    }
  }

  updateSafeZoneTransition(time) {
    const inSafeZone = this.isPlayerInSafeZone();
    if (inSafeZone && !this.wasInSafeZone) {
      this.safeZoneEnterAt = time;
      this.playSfx('safe', { minGap: 700 });
      this.updatePrompt('Safe zone: closet. Stay hidden for a moment.');
    }
    if (!inSafeZone) {
      this.safeZoneEnterAt = null;
    }
    this.wasInSafeZone = inSafeZone;
  }

  resetOwnerToSleep(promptText = 'The owner calmed down and went back to sleep.', unlockExit = true) {
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
    if (unlockExit) this.exitUnlocked = true;
    if (promptText) this.updatePrompt(promptText);
    this.playSfx('out', { minGap: 900 });
    this.safeZoneEnterAt = null;
    this.wasInSafeZone = false;
  }

  updateOwnerState(time) {
    if (!this.chaseMode) {
      this.setOwnerBreathing(true);
      this.owner.setTexture('owner_sleep');
      this.owner.setScale(0.25);
      this.owner.setVisible(true);
      return;
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
      return;
    }
    if (this.gameOver || !this.exitUnlocked) return;
    if (!this.exitPromptVisible) {
      this.exitPromptVisible = true;
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
    this.cameras.main.fade(450, 16, 10, 10);
    this.updatePrompt('Room cleared. Tiny thief escaped the bedroom.');
    this.add.text(480, 320, 'ROOM CLEARED', {
      fontFamily: '"Press Start 2P"',
      fontSize: '26px',
      color: '#fff2cc',
      stroke: '#4b2f24',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(200);
  }

  tryHide() {
    if (!this.chaseMode || this.hidden) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.closet.x, this.closet.y) < 54) {
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
    const fill = document.getElementById('noise-fill');
    const value = document.getElementById('noise-value');
    if (!this.noiseDisplay) this.noiseDisplay = 0;
    this.noiseDisplay = Phaser.Math.Linear(this.noiseDisplay, this.noise, 0.08);
    if (fill) fill.style.width = `${Math.round(this.noiseDisplay * 100)}%`;
    if (value) value.textContent = `${Math.round(this.noiseDisplay * 100)}%`;
  }

  updatePrompt(text) {
    const el = document.getElementById('prompt');
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

  ownerWakeBurst() {
    if (this.ownerWakeText) this.ownerWakeText.destroy();
    this.ownerWakeText = this.add.text(this.owner.x + 6, this.owner.y - 18, '!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '24px',
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
    this.vignette.alpha = this.chaseMode ? 0.22 : 0.16 + Math.sin(t * 0.7) * 0.008;
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
    if (this.closetRing) {
      this.closetRing.x = this.closet.x;
      this.closetRing.y = this.closet.y;
    }
    if (this.playerShadow) {
      this.playerShadow.x = this.player.x + 2;
      this.playerShadow.y = this.player.y + 3;
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
      this.playerFacing = 'down';
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
        this.playerFacing = 'up';
      } else {
        if (this.currentPlayerTexture !== 'thief_idle') {
          this.player.setTexture('thief_idle');
          this.currentPlayerTexture = 'thief_idle';
        }
        this.player.setFlipX(false);
        this.playerFacing = 'down';
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
      this.playerFacing = 'left';
    } else if (right) {
      this.player.setFlipX(true);
      this.playerFacing = 'right';
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
    this.updatePrompt('GAME OVER. The owner caught the tiny thief.');
    this.flashRed();
    this.add.text(480, 320, 'GAME OVER', {
      fontFamily: '"Press Start 2P"',
      fontSize: '28px',
      color: '#fffbf2',
      stroke: '#a51f1f',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(200);
  }
}
