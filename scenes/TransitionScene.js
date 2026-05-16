import Phaser from 'phaser';
import AM from './systems/AudioManager.js';

// TransitionScene — cinematic room-complete transition between rooms.
// Launched with data: { nextScene, night, lootCount, subtitle }
export default class TransitionScene extends Phaser.Scene {
  constructor() {
    super('TransitionScene');
  }

  init(data = {}) {
    this._nextScene = data.nextScene || 'Room2Scene';
    this._night = data.night || 2;
    this._subtitle = data.subtitle || 'Gaming Apartment';
    this._elapsed = 0;
  }

  create() {
    document.body.classList.remove('hud-visible');
    document.body.classList.add('hud-hidden');
    document.getElementById('message-toast')?.classList.add('hidden');

    const W = 960;
    const H = 640;
    const cx = W / 2;
    const cy = H / 2;

    this.cameras.main.setBackgroundColor('#02050c');
    AM.init(this);
    AM.duckAmbient(this, 0.09, 600);

    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x02050c, 0x02050c, 0x07152a, 0x02050c, 1, 1, 1, 1);
    bg.fillRect(0, 0, W, H);

    const glow = this.add.circle(cx, cy - 30, 190, 0x2c7cff, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);
    this.tweens.add({
      targets: glow,
      alpha: 0.14,
      scale: 1.08,
      duration: 1800,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    });

    const particles = [];
    for (let i = 0; i < 42; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(80, W - 80),
        Phaser.Math.Between(70, H - 70),
        Phaser.Math.FloatBetween(0.8, 1.8),
        0x9cc8ff,
        Phaser.Math.FloatBetween(0.08, 0.22)
      ).setDepth(2);
      p.speed = Phaser.Math.FloatBetween(0.05, 0.22);
      p.drift = Phaser.Math.FloatBetween(-0.08, 0.08);
      particles.push(p);
    }

    const rainGfx = this.add.graphics().setDepth(3).setAlpha(0.28);
    const rainDrops = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 5 + Math.random() * 4,
      len: 10 + Math.random() * 12
    }));

    const nightText = this.add.text(cx, cy - 56, `NIGHT ${this._night}`, {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '46px',
      color: '#f4f8ff',
      stroke: '#102341',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#4fa3ff', blur: 24, fill: true }
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    const subtitle = this.add.text(cx, cy + 8, this._subtitle, {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '23px',
      color: '#a9c7ea',
      shadow: { offsetX: 0, offsetY: 0, color: '#1c6cff', blur: 14, fill: true }
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    const loading = this.add.text(cx, cy + 68, 'Loading', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#d8e8ff'
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    const veil = this.add.rectangle(0, 0, W, H, 0x000000, 1)
      .setOrigin(0)
      .setDepth(20);

    this.tweens.add({ targets: veil, alpha: 0, duration: 650, ease: 'Sine.out' });
    this.tweens.add({ targets: nightText, alpha: 1, y: cy - 64, duration: 700, delay: 260, ease: 'Sine.out' });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 600, delay: 760, ease: 'Sine.out' });
    this.tweens.add({ targets: loading, alpha: { from: 0.45, to: 1 }, duration: 760, delay: 980, ease: 'Sine.inOut', yoyo: true, repeat: -1 });

    this.time.addEvent({
      delay: 360,
      loop: true,
      callback: () => {
        const dots = '.'.repeat((Math.floor(this._elapsed / 360) % 3) + 1);
        loading.setText(`Loading${dots}`);
      }
    });

    this.events.on('update', (_time, dt = 16) => {
      this._elapsed += dt;
      rainGfx.clear();
      rainGfx.lineStyle(1, 0x79b8ff, 0.55);
      rainDrops.forEach(drop => {
        drop.y += drop.speed;
        drop.x -= 0.7;
        if (drop.y > H + 20) {
          drop.y = -drop.len;
          drop.x = Math.random() * W;
        }
        rainGfx.lineBetween(drop.x, drop.y, drop.x - 2, drop.y + drop.len);
      });

      particles.forEach(p => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < 40) p.y = H - 40;
        if (p.x < 40) p.x = W - 40;
        if (p.x > W - 40) p.x = 40;
      });
    });

    this.time.delayedCall(3100, () => {
      this.tweens.add({
        targets: veil,
        alpha: 1,
        duration: 650,
        ease: 'Sine.inOut',
        onComplete: () => {
          AM.raiseAmbient(this, 900);
          this.scene.start(this._nextScene, { fromTransition: true });
        }
      });
    });
  }
}
