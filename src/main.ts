import Phaser from 'phaser';
class StarterScene extends Phaser.Scene {
  create() {
    this.cameras.main.setBackgroundColor('#203a2c');
    this.add.text(400, 170, 'KNIGHT GAME', { fontSize: '40px', color: '#f4d78b' }).setOrigin(0.5);
    this.add.text(400, 240, 'Phaser + TypeScript + Vite are ready', { fontSize: '20px' }).setOrigin(0.5);
    this.add.text(400, 300, 'Next: build the knight, dragons, and rescue quest.', { fontSize: '16px' }).setOrigin(0.5);
  }
}
new Phaser.Game({ type: Phaser.AUTO, width: 800, height: 500, scene: StarterScene });
