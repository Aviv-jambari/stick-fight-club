import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
// Hallway imports phaser and extensionless paths, so load it the way combat.test.ts does.
const cache = new Map();
function load(file: string): any {
    file = resolve(file);
    if (cache.has(file))
        return cache.get(file);
    const mod = { exports: {} };
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const require = (id: string) => id === 'phaser' ? {} : load(resolve(dirname(file), id + '.ts'));
    new Function('require', 'module', 'exports', source)(require, mod, mod.exports);
    cache.set(file, mod.exports);
    return mod.exports;
}
const { B } = load('src/game/balance.ts');
const { Hallway } = load('src/game/Hallway.ts');

/** Records the vertical strokes Hallway emits so wall placement can be asserted. */
function trace(scroll: number) {
    const verticals: { x: number; width: number }[] = [];
    let width = 1;
    const g: any = {
        clear: () => g, fillStyle: () => g, fillRect: () => g, fillRoundedRect: () => g,
        lineStyle: (w: number) => { width = w; return g; },
        lineBetween: (x1: number, y1: number, x2: number, y2: number) => {
            if (x1 === x2 && y1 !== y2) verticals.push({ x: x1, width });
            return g;
        },
    };
    new Hallway({ add: { graphics: () => ({ setScrollFactor: () => ({ setDepth: () => g }) }) } }).draw(scroll);
    return verticals;
}

// Walls are the only 3px verticals; pilasters are hairlines, so width identifies them.
const walls = (scroll: number) => trace(scroll).filter(v => v.width === 3).map(v => v.x).sort((a, b) => a - b);

test('the left wall lands on screen exactly when the camera is against it', () => {
    assert.deepEqual(walls(0), [0], 'fully scrolled left, the wall sits on the screen edge');
    assert.deepEqual(walls(30), [-30], 'just off the edge it is still drawn');
    assert.deepEqual(walls(300), [], 'scrolled well clear, it is culled');
});
test('the right wall lands on screen when the camera reaches the far end', () => {
    const limit = B.arenaWidth - B.view;
    assert.deepEqual(walls(limit), [B.view], 'fully scrolled right, the wall sits on the screen edge');
    assert.deepEqual(walls(limit - 30), [B.view + 30], 'just off the edge it is still drawn');
    assert.deepEqual(walls(limit - 300), [], 'scrolled well clear, it is culled');
});
test('the middle of the arena shows no walls at all', () => {
    assert.deepEqual(walls((B.arenaWidth - B.view) / 2), []);
});
test('the playable height leaves headroom for a full jump', () => {
    assert.equal(walls(0).length, 1);
    const apex = B.jump * B.jump / (2 * B.gravity);
    assert.ok(B.floor - B.ceiling > apex + 160, 'a jumping fighter must not clip the ceiling');
});
