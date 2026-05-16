import Phaser from 'phaser';
import AM from './systems/AudioManager.js';

// TransitionScene — Night 2 briefing between Room 1 and Room 2.
export default class TransitionScene extends Phaser.Scene {
  constructor() {
    super('TransitionScene');
  }

  init(data = {}) {
    this._nextScene = data.nextScene || 'Room2Scene';
    this._night = data.night || 2;
    this._subtitle = data.subtitle || 'Gaming Apartment';
    this._durationMs = data.durationMs || 12000;
    this._elapsed = 0;
  }

  create() {
    document.body.classList.remove('hud-visible');
    document.body.classList.add('hud-hidden');
    document.getElementById('message-toast')?.classList.add('hidden');

    const W = 960;
    const H = 640;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor('#02050c');
    AM.init(this);
    AM.duckAmbient(this, 0.09, 900);

    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x01030a, 0x061427, 0x071a32, 0x02040b, 1, 1, 1, 1);
    bg.fillRect(0, 0, W, H);

    const glow = this.add.circle(cx, 200, 220, 0x1f8cff, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);
    this.tweens.add({
      targets: glow,
      alpha: 0.15,
      scale: 1.08,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });

    const particles = [];
    for (let i = 0; i < 56; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(50, W - 50),
        Phaser.Math.Between(50, H - 40),
        Phaser.Math.FloatBetween(0.8, 1.8),
        0x9cc8ff,
        Phaser.Math.FloatBetween(0.07, 0.20)
      ).setDepth(2);
      p.speed = Phaser.Math.FloatBetween(0.04, 0.16);
      p.drift = Phaser.Math.FloatBetween(-0.06, 0.06);
      particles.push(p);
    }

    const rainGfx = this.add.graphics().setDepth(3).setAlpha(0.24);
    const rainDrops = Array.from({ length: 110 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 4.2 + Math.random() * 4.4,
      len: 9 + Math.random() * 13
    }));

    const title = this.add.text(cx, 68, `NIGHT ${this._night}`, {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '44px',
      color: '#f3f8ff',
      stroke: '#0b2648',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#3aa4ff', blur: 24, fill: true }
    }).setOrigin(0.5).setDepth(8).setAlpha(0).setScale(0.94);

    const subtitle = this.add.text(cx, 126, this._subtitle, {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '22px',
      color: '#a9c7ea',
      shadow: { offsetX: 0, offsetY: 0, color: '#1c6cff', blur: 14, fill: true }
    }).setOrigin(0.5).setDepth(8).setAlpha(0);

    const warningCard = this.add.rectangle(cx, 190, 760, 64, 0x071221, 0.82)
      .setStrokeStyle(2, 0x46d8ff, 0.45)
      .setDepth(6);
    const warningText = this.add.text(cx, 190, 'IMPORTANT: Loot items NO LONGER glow. Identify them manually.', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '11px',
      color: '#f7fbff',
      align: 'center',
      wordWrap: { width: 680 }
    }).setOrigin(0.5).setDepth(8);

    const lootTitle = this.add.text(220, 266, 'TARGET LOOT', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '13px',
      color: '#64eaff'
    }).setOrigin(0.5).setDepth(8);

    const lootNames = ['GPU', 'Gaming Headphones', 'Keyboard', 'Gaming Mouse', 'Crypto USB'];
    const cardStartX = 160;
    lootNames.forEach((name, index) => {
      const x = cardStartX + index * 160;
      const card = this.add.rectangle(x, 324, 132, 74, 0x081428, 0.76)
        .setStrokeStyle(1, 0x64eaff, 0.38)
        .setDepth(6);
      const dot = this.add.circle(x, 297, 5, 0x64eaff, 0.88).setDepth(8);
      const label = this.add.text(x, 328, name, {
        fontFamily: '"Poppins", Arial, sans-serif',
        fontSize: '14px',
        color: '#e6f4ff',
        align: 'center',
        fontStyle: '700',
        wordWrap: { width: 108 }
      }).setOrigin(0.5).setDepth(8);
      card.setAlpha(0);
      dot.setAlpha(0);
      label.setAlpha(0);
      this.tweens.add({ targets: [card, dot, label], alpha: 1, duration: 360, delay: 1200 + index * 170 });
      this.tweens.add({ targets: card, scaleY: 1.04, duration: 1200, yoyo: true, repeat: -1, delay: index * 140, ease: 'Sine.inOut' });
    });

    const memory = this.add.text(cx, 410, 'Remember these items carefully.\nFind them and escape without getting caught.', {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '19px',
      color: '#f2f7ff',
      align: 'center',
      lineSpacing: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#338dff', blur: 12, fill: true }
    }).setOrigin(0.5).setDepth(8).setAlpha(0);

    const tips = [
      'Loot does not glow anymore',
      'Search carefully around furniture',
      'Noise wakes the owner instantly',
      'Hide quickly if discovered'
    ];
    const tipsText = this.add.text(cx, 498, tips.map(t => `• ${t}`).join('\n'), {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: '15px',
      color: '#9fb8d6',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setDepth(8).setAlpha(0);

    const countdown = this.add.text(cx, 590, 'Entering apartment in 10...', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '13px',
      color: '#ffe08a',
      shadow: { offsetX: 0, offsetY: 0, color: '#ffb000', blur: 12, fill: true }
    }).setOrigin(0.5).setDepth(8).setAlpha(0);

    const veil = this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0).setDepth(30);
    this.tweens.add({ targets: veil, alpha: 0, duration: 850, ease: 'Sine.out' });
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 620, delay: 250, ease: 'Back.out' });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 520, delay: 620 });
    this.tweens.add({ targets: warningCard, alpha: 0.96, duration: 420, delay: 900 });
    this.tweens.add({ targets: warningText, alpha: 1, duration: 420, delay: 900 });
    this.tweens.add({ targets: [lootTitle, memory], alpha: 1, duration: 520, delay: 1700 });
    this.tweens.add({ targets: tipsText, alpha: 1, duration: 520, delay: 2400 });
    this.tweens.add({ targets: countdown, alpha: 1, duration: 420, delay: 3000 });

    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        const remaining = Math.max(0, Math.ceil((this._durationMs - this._elapsed) / 1000));
        const dots = '.'.repeat((Math.floor(this._elapsed / 500) % 3) + 1);
        countdown.setText(`Entering apartment in ${remaining}${dots}`);
      }
    });

    this.events.on('update', (_time, dt = 16) => {
      this._elapsed += dt;
      rainGfx.clear();
      rainGfx.lineStyle(1, 0x79b8ff, 0.48);
      rainDrops.forEach(drop => {
        drop.y += drop.speed;
        drop.x -= 0.7;
        if (drop.y > H + 24) {
          drop.y = -drop.len;
          drop.x = Math.random() * W;
        }
        rainGfx.lineBetween(drop.x, drop.y, drop.x - 2, drop.y + drop.len);
      });
      particles.forEach(p => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < 34) p.y = H - 34;
        if (p.x < 34) p.x = W - 34;
        if (p.x > W - 34) p.x = 34;
      });
    });

    this.time.delayedCall(this._durationMs, () => {
      this.tweens.add({
        targets: veil,
        alpha: 1,
        duration: 850,
        ease: 'Sine.inOut',
        onComplete: () => {
          AM.raiseAmbient(this, 1000);
          this.scene.start(this._nextScene, { fromTransition: true });
        }
      });
    });
  }
}
