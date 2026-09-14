import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
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
const { step, STRIDE, RIG } = load('src/game/StickFigure.ts');
const planted = (cycle: number) => step(cycle)[1] === 0;

test('a planted foot slides backward at a constant rate, which is what reads as ground contact', () => {
    // Even spacing across the stance phase means no skating and no stutter.
    const samples = [.05, .15, .25, .35, .45, .55].map(p => step(p * STRIDE.stance / .6)[0]);
    const gaps = samples.slice(1).map((x, i) => samples[i] - x);
    for (const gap of gaps) {
        assert.ok(gap > 0, 'a planted foot must always travel backward');
        assert.ok(Math.abs(gap - gaps[0]) < 1e-9, 'planted travel must be perfectly linear');
    }
});
test('the swing foot lifts clear of the floor and peaks mid-swing', () => {
    const mid = STRIDE.stance + (1 - STRIDE.stance) / 2;
    assert.ok(Math.abs(step(mid)[1] + STRIDE.lift) < 1e-9, 'peak clearance at mid-swing');
    assert.ok(step(mid)[0] > step(STRIDE.stance)[0], 'the swing carries the foot forward');
});
test('at least one foot is always planted, so the figure never floats', () => {
    for (let i = 0; i < 720; i++) {
        const cycle = i / 720;
        assert.ok(planted(cycle) || planted(cycle + .5), `both feet airborne at cycle ${cycle}`);
    }
});
test('the cycle is seamless where it wraps and where stance hands off to swing', () => {
    for (const [a, b] of [[0, 1], [STRIDE.stance - 1e-9, STRIDE.stance]] as [number, number][]) {
        assert.ok(Math.abs(step(a)[0] - step(b)[0]) < 1e-6, `x jumps between ${a} and ${b}`);
        assert.ok(Math.abs(step(a)[1] - step(b)[1]) < 1e-6, `y jumps between ${a} and ${b}`);
    }
});
test('a full cycle covers exactly one stride, so cadence can be matched to speed', () => {
    assert.ok(Math.abs(step(0)[0] - step(STRIDE.stance - 1e-12)[0] - STRIDE.reach * 2) < 1e-6);
});
test('the stride stays inside what the leg can reach with the foot on the floor', () => {
    // Overshoot this and the two-segment solver clamps at full extension, so the planted
    // foot silently lifts off the floor and the walk goes back to skating.
    const maxReach = Math.sqrt((RIG.leg * 2) ** 2 - RIG.hip ** 2);
    assert.ok(STRIDE.reach < maxReach, `reach ${STRIDE.reach} exceeds leg reach ${maxReach.toFixed(1)}`);
    assert.ok(RIG.leg * 2 > RIG.hip, 'knees must be bent when standing');
});
test('negative and large cycle values wrap instead of breaking', () => {
    assert.deepEqual(step(-.25), step(.75));
    assert.deepEqual(step(7.5), step(.5));
});
