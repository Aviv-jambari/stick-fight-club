import Phaser from 'phaser';
import { B } from './balance';

/** Repeating architectural marks imply distance without a finite room boundary. */
export class Hallway {
    private graphics: Phaser.GameObjects.Graphics;
    constructor(scene: Phaser.Scene) {
        this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(-100);
    }
    draw(scroll: number) {
        const g = this.graphics, floor = B.floor;
        g.clear();
        g.fillStyle(0xf1f1ed).fillRect(0, floor, 1280, 130);
        g.lineStyle(2, 0x777771).lineBetween(0, floor, 1280, floor);
        g.lineStyle(1, 0xdadad4).lineBetween(0, 300, 1280, 300);
        g.lineStyle(1, 0xe6e6e0).lineBetween(0, floor - 12, 1280, floor - 12);
        const offset = ((scroll * .65) % 400 + 400) % 400;
        for (let x = -offset; x < 1400; x += 400) {
            g.lineStyle(1, 0xe2e2dc).lineBetween(x, 301, x, floor - 13);
            g.fillStyle(0xe6e6df).fillRoundedRect(x + 140, 322, 110, 4, 2);
        }
        const tiles = ((scroll % 160) + 160) % 160;
        for (let x = -tiles; x < 1440; x += 160) {
            g.lineStyle(1, 0xe2e2db).lineBetween(x, floor + 1, x - 35, floor + 90);
        }
    }
}
