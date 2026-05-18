// BootScene — preloads ALL shared assets, then starts IntroScene
export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // ── backgrounds ──────────────────────────────────────────
    this.load.image('menu_bg',          'assets/menu_bg.png');
    this.load.image('room_bg',          'assets/background/room.png');
    this.load.image('room2_bg',         'assets/room2/bg.png');

    // ── characters ───────────────────────────────────────────
    this.load.image('thief_idle_src',   'assets/characters/thief_idle.png');
    this.load.image('thief_walk_1_src', 'assets/characters/thief_walk_1.png');
    this.load.image('thief_walk_2_src', 'assets/characters/thief_walk_2.png');
    this.load.image('thief_walk_up_src','assets/characters/walk_up.png');
    this.load.image('owner_sleep_src',  'assets/characters/owner_sleep.png');
    this.load.image('owner_alert_src',  'assets/characters/owner_alert.png');

    // ── room1 furniture ──────────────────────────────────────
    this.load.image('bed_src',    'assets/furniture/bed.png');
    this.load.image('closet_src', 'assets/furniture/closet.png');
    this.load.image('desk_src',   'assets/furniture/desk.png');
    this.load.image('chair_src',  'assets/furniture/chair.png');
    this.load.image('books_src',  'assets/furniture/books.png');
    this.load.image('lamp_src',   'assets/furniture/lamp.png');
    this.load.image('plant_src',  'assets/furniture/plant.png');

    // ── room1 props ──────────────────────────────────────────
    this.load.image('bottle_src',       'assets/props/bottle.png');
    this.load.image('gem_src',          'assets/props/gem.png');
    this.load.image('gold_src',         'assets/props/gold.png');
    this.load.image('key_src',          'assets/props/key.png');
    this.load.image('headphones_src',   'assets/props/headphones.png');
    this.load.image('keyboard_src',     'assets/props/keyboard.png');
    this.load.image('gaming_mouse_src', 'assets/props/gaming_mouse.png');
    this.load.image('gpu_src',          'assets/props/gpu.png');
    this.load.image('crypto_wallet_src','assets/props/crypto_wallet.png');

    // ── room2 furniture ──────────────────────────────────────
    this.load.image('r2_bg',        'assets/room2/bg.png');
    this.load.image('r2_cpdesk',    'assets/room2/furniture/cpDesk.png');
    this.load.image('r2_chair',     'assets/room2/furniture/chair.png');
    this.load.image('r2_gmgtable',  'assets/room2/furniture/gmgtable.png');
    this.load.image('r2_wardrobe',  'assets/room2/furniture/wardrobe.png');
    this.load.image('r2_bag',       'assets/room2/furniture/bag.png');
    this.load.image('r2_sofa',      'assets/room2/furniture/sofa.png');
    this.load.image('r2_plant1',    'assets/room2/furniture/plant1.png');
    this.load.image('r2_plant2',    'assets/room2/furniture/plant2.png');
    this.load.image('r2_owner_idle_src',  'assets/room2/owner idle.png');
    this.load.image('r2_owner_front_a',   'assets/room2/owner2_frontA.png');
    this.load.image('r2_owner_front_b',   'assets/room2/owner2_frontB.png');
    this.load.image('r2_owner_left_a',    'assets/room2/owner2_leftA.png');
    this.load.image('r2_owner_left_b',    'assets/room2/owner2_leftB.png');
    this.load.image('r2_owner_back_src',  'assets/room2/owner2_back.png');
    this.load.image('r2_owner_sleep_src', 'assets/room2/owner2_sleep.png');
    this.load.image('r2_owner_doubt_src', 'assets/room2/owner2_doubt.png');

    // ── room2 loot ───────────────────────────────────────────
    this.load.image('r2_loot_gpu',       'assets/room2/loot/gpu.png');
    this.load.image('r2_loot_headphone', 'assets/room2/loot/headphone.png');
    this.load.image('r2_loot_keyboard',  'assets/room2/loot/keyboard.png');
    this.load.image('r2_loot_mouse',     'assets/room2/loot/mouse.png');
    this.load.image('r2_loot_usb',       'assets/room2/loot/usb.png');

    // ── audio ────────────────────────────────────────────────
    this.load.audio('menu_music',    'assets/sounds/menu_music.mp3');
    this.load.audio('rain',          'assets/sounds/rain.mp3');
    this.load.audio('neon_buzz',     'assets/sounds/neon_buzz.mp3');
    this.load.audio('door_unlock',   'assets/sounds/door_unlock.mp3');
    this.load.audio('footstep',      'assets/sounds/footstep.mp3');
    this.load.audio('fahh',          'assets/sounds/fahh.mp3');
    this.load.audio('enter',         'assets/sounds/enter.mp3');
    this.load.audio('pickup',        'assets/sounds/pickup.mp3');
    this.load.audio('coreTransition','assets/sounds/core_transition.mp3');
    this.load.audio('out',           'assets/sounds/out.mp3');
    this.load.audio('safe',          'assets/sounds/safe.mp3');
    this.load.audio('success',       'assets/sounds/transfer.mp3');
  }

  create() {
    this.scene.start('IntroScene');
  }
}
