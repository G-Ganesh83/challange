// IntroScene — "GANESH GAMES" neon flicker logo ~2s then → MainMenuScene
export default class IntroScene extends Phaser.Scene {
  constructor() { super('IntroScene'); }

  create() {
    const W = 960, H = 640;
    const cx = W / 2, cy = H / 2;

    this.cameras.main.setBackgroundColor('#000000');

    // Neon glow layers (stacked for bloom effect)
    const glowStyle = {
      fontFamily: '"Courier New", monospace',
      fontSize: '52px',
      color: '#00ffff',
      stroke: '#003344',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 32, fill: true }
    };
    const outerGlow = this.add.text(cx, cy, 'GANESH GAMES', {
      ...glowStyle, color: '#00ffffff', alpha: 0.18,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 64, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    const mainText = this.add.text(cx, cy, 'GANESH GAMES', {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#00ffff',
      strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 20, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    const subText = this.add.text(cx, cy + 52, 'P R E S E N T S', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#0099aa',
      letterSpacing: 8
    }).setOrigin(0.5).setAlpha(0);

    // RGB scanline overlay
    const scanlines = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scanlines.lineStyle(1, 0x000000, 0.18);
      scanlines.lineBetween(0, y, W, y);
    }
    scanlines.setDepth(10);

    // Noise vignette
    const vignette = this.add.graphics().setDepth(9);
    const grad = vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.7, 0.7, 0, 0);
    vignette.fillRect(0, 0, W, H);

    // Flicker timeline
    let t = 0;
    const flicker = () => {
      const alpha = Math.random() > 0.15 ? 1 : (Math.random() * 0.4 + 0.1);
      mainText.setAlpha(alpha);
      outerGlow.setAlpha(alpha * 0.5);
      // tiny RGB shift
      const shift = Math.random() > 0.85 ? (Math.random() * 4 - 2) : 0;
      mainText.setX(cx + shift);
    };

    // Sequence
    this.tweens.add({ targets: mainText, alpha: { from: 0, to: 1 }, duration: 80, delay: 200 });
    this.tweens.add({ targets: outerGlow, alpha: { from: 0, to: 0.5 }, duration: 80, delay: 200 });
    this.tweens.add({ targets: subText, alpha: { from: 0, to: 0.8 }, duration: 300, delay: 400 });

    // Neon buzz sound
    try {
      const buzz = this.sound.add('neon_buzz', { volume: 0.3 });
      buzz.play();
    } catch(e) {}

    // Flicker loop
    this._flickerTimer = this.time.addEvent({
      delay: 80, repeat: 20, callback: flicker
    });

    // After ~2s → fade out → MainMenu
    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });
  }
}
