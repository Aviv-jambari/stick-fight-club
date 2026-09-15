import Phaser from 'phaser';
export type Action = 'light' | 'heavy' | 'launch' | 'jump' | 'dodge' | 'grab';
export class Input {
    keys: Record<string, Phaser.Input.Keyboard.Key>;
    private pending = new Map<string, number>();
    constructor(scene: Phaser.Scene) {
        this.keys = scene.input.keyboard!.addKeys('LEFT,RIGHT,UP,DOWN,CTRL,W,A,S,D,SPACE,ENTER,ESC,M,G,ONE,TWO,THREE') as typeof this.keys;
        // Latch down events: a short tap may begin and end between render frames.
        for (const [name, key] of Object.entries(this.keys)) {
            key.on('down', () => this.pending.set(name, performance.now()));
        }
    }
    axis() { return { x: Number(this.keys.RIGHT.isDown) - Number(this.keys.LEFT.isDown), y: Number(this.keys.DOWN.isDown) - Number(this.keys.UP.isDown) }; }
    running() { return this.keys.CTRL.isDown; }
    pressed(key: string) {
        const when = this.pending.get(key);
        this.pending.delete(key);
        return when !== undefined && performance.now() - when < 250;
    }
    action(): Action | undefined { if (this.pressed('G')) return 'grab'; if (this.pressed('D'))
        return 'launch'; if (this.pressed('S'))
        return 'heavy'; if (this.pressed('A'))
        return 'light'; }
}
