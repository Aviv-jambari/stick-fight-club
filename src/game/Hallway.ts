import Phaser from 'phaser';
import { B } from './balance';

/** Repeating architectural marks imply distance; walls at the arena edges bound it. */
export class Hallway {
    private graphics: Phaser.GameObjects.Graphics;
    constructor(scene: Phaser.Scene) {
        this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(-100);
    }
    draw(scroll: number) {
        const g = this.graphics, floor = B.floor, ceiling = B.ceiling;
        g.clear();
        g.fillStyle(0xf1f1ed).fillRect(0, floor, B.view, 130);
        g.lineStyle(2, 0x777771).lineBetween(0, floor, B.view, floor);
        g.lineStyle(1, 0xdadad4).lineBetween(0, ceiling, B.view, ceiling);
        g.lineStyle(1, 0xe6e6e0).lineBetween(0, floor - 12, B.view, floor - 12);
        const offset = ((scroll * .65) % 400 + 400) % 400;
        for (let x = -offset; x < B.view + 120; x += 400) {
            g.lineStyle(1, 0xe2e2dc).lineBetween(x, ceiling + 1, x, floor - 13);
            g.fillStyle(0xe6e6df).fillRoundedRect(x + 140, ceiling + 22, 110, 4, 2);
        }
        const tiles = ((scroll % 160) + 160) % 160;
        for (let x = -tiles; x < B.view + 160; x += 160) {
            g.lineStyle(1, 0xe2e2db).lineBetween(x, floor + 1, x - 35, floor + 90);
        }
        // End walls sit at true world positions, so they track the camera one-to-one.
        for (const worldX of [0, B.arenaWidth]) {
            const x = worldX - scroll;
            if (x < -50 || x > B.view + 50) continue;
            g.fillStyle(0xe4e4dd).fillRect(worldX === 0 ? x - 50 : x, ceiling, 50, floor - ceiling);
            g.lineStyle(3, 0x777771).lineBetween(x, ceiling, x, floor);
        }
    }
}
