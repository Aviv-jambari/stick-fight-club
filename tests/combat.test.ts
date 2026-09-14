import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
// Run the actual scene combat methods with rendering/audio replaced by no-ops.
const cache = new Map();
function load(file: string): any {
    file = resolve(file);
    if (cache.has(file))
        return cache.get(file);
    const mod = { exports: {} };
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const require = (id: string) => id === 'phaser' ? { Scene: class {
        }, Math: { Clamp: (n: number, a: number, b: number) => Math.max(a, Math.min(b, n)) } } : load(resolve(dirname(file), id + '.ts'));
    new Function('require', 'module', 'exports', source)(require, mod, mod.exports);
    cache.set(file, mod.exports);
    return mod.exports;
}
const { Arena } = load('src/game/Arena.ts');
const { Fighter } = load('src/game/Fighter.ts');
test('short key taps remain available until consumed exactly once', () => {
    const { Input } = load('src/game/Input.ts');
    const callbacks: Record<string, () => void> = {};
    const keys = Object.fromEntries('LEFT,RIGHT,UP,DOWN,W,A,S,D,SPACE,ENTER,ESC,M'.split(',').map(name => [name, { isDown: false, on: (_event: string, callback: () => void) => { callbacks[name] = callback; } }]));
    const input = new Input({ input: { keyboard: { addKeys: () => keys } } });
    callbacks.A();
    assert.equal(input.action(), 'light');
    assert.equal(input.action(), undefined);
    callbacks.ENTER();
    assert.equal(input.pressed('ENTER'), true);
    assert.equal(input.pressed('ENTER'), false);
    callbacks.S(); assert.equal(input.action(), 'heavy');
    callbacks.D(); assert.equal(input.action(), 'launch');
    callbacks.W(); assert.equal(input.pressed('W'), true);
    keys.A.isDown = true; keys.S.isDown = true;
    assert.deepEqual(input.axis(), { x: 0, y: 0 });
    keys.RIGHT.isDown = true; keys.UP.isDown = true;
    assert.deepEqual(input.axis(), { x: 1, y: -1 });
});
function setup() {
    const arena = new Arena();
    arena.player = new Fighter(500, 500, true);
    arena.fighters = [arena.player];
    arena.controls = { axis: () => ({ x: 0, y: 0 }) };
    arena.sfx = { play() { } };
    arena.cameras = { main: { shake() { } } };
    arena.impact = arena.announce = arena.showOverlay = () => { };
    return arena;
}
test('A A S leaves a living launched target for an aerial finisher', () => {
    const a = setup(), enemy = new Fighter(550, 500);
    a.fighters.push(enemy);
    for (const action of ['light', 'light', 'heavy']) {
        enemy.invulnerable = 0;
        a.act(action);
        a.attackHits(a.player);
    }
    assert.equal(a.player.attack.kind, 'upper');
    assert.ok(enemy.hp > 0);
    assert.equal(enemy.vz, 760);
    enemy.invulnerable = 0;
    enemy.z = 130;
    a.player.z = 130;
    a.act('light');
    a.attackHits(a.player);
    assert.equal(enemy.dead, true);
    assert.equal(a.kills, 1);
    assert.equal(a.combo, 4);
});
test('D launches a living enemy close enough for a delayed jump and aerial punch', () => {
    const a = setup(), target = new Fighter(550, 555);
    a.player.y = 555; a.fighters.push(target);
    a.act('launch'); a.attackHits(a.player);
    assert.equal(a.player.attack.limb, 'foot');
    assert.equal(target.vz, 680); assert.equal(target.hp, 60);
    for (let i=0;i<9;i++) a.integrate(target, 1/60);
    a.player.vz = 640;
    for (let i=0;i<14;i++) { a.integrate(target,1/60); a.integrate(a.player,1/60); }
    assert.ok(a.player.z > 0 && target.z > 0);
    target.invulnerable=0;
    a.act('light'); a.attackHits(a.player);
    assert.equal(target.hp,42); assert.equal(a.combo,2);
    target.invulnerable=0;
    a.act('heavy'); a.attackHits(a.player);
    assert.equal(a.player.attack.kind,'slam'); assert.ok(target.vz < 0);
});
test('launched bodies still transfer momentum and score collisions once', () => {
    const a=setup(), body=new Fighter(535,555), target=new Fighter(565,555);
    a.fighters.push(body,target);
    a.hit(body,20,600,320,true,true);
    a.bodyCollisions();
    assert.equal(target.hp,55);
    target.invulnerable=0; a.bodyCollisions(); assert.equal(target.hp,55);
});
test('Fatty kill heals 12 HP, clamps health, and cannot award twice', () => {
    for (const [before, after] of [[50, 62], [95, 100]]) {
        const a = setup(), fatty = new Fighter(550, 500, false, true);
        a.player.hp = before;
        a.hit(fatty, 999, 500, 300, true, true);
        assert.equal(a.player.hp, after);
        assert.equal(a.fattys, 1);
        a.hit(fatty, 999, 500, 300, true, true);
        assert.equal(a.fattys, 1);
    }
});
// The arena walls clamp the player in update(), so integrate() must still let launched bodies fly past.
test('dodge immunity and floor bounce leave launched bodies unclamped', () => {
    const a = setup();
    a.player.invulnerable = .2;
    a.hit(a.player, 18, 100, 0, false, false);
    assert.equal(a.player.hp, 100);
    const f = new Fighter(1230, 500);
    f.vx = 600;
    f.z = 1;
    f.vz = -600;
    a.integrate(f, .016);
    assert.ok(f.x > 1230);
    assert.ok(f.vx > 0);
    assert.equal(f.y, 555);
    assert.ok(f.vz > 0);
    assert.equal(f.z, 0);
});
test('hallway removes depth velocity while keeping jump height independent', () => {
    const a = setup(), f = a.player;
    f.y = 420; f.vy = 560; f.z = 80; f.vz = 300;
    a.integrate(f, .016);
    assert.equal(f.y, 555);
    assert.equal(f.vy, 0);
    assert.ok(f.z > 80);
    f.x = -4000; f.vx = -300;
    a.integrate(f, .016);
    assert.ok(f.x < -4000);
});
test('camera follows horizontally and stops while paused', () => {
    const a = setup();
    a.started = true;
    a.player.x = 4000;
    a.cameras.main.scrollX = 0;
    a.game = { loop: { delta: 16 } };
    let drawnAt = 0;
    a.hallway = { draw: (scroll: number) => { drawnAt = scroll; } };
    a.render();
    assert.ok(a.cameras.main.scrollX > 0);
    assert.equal(drawnAt, a.cameras.main.scrollX);
    const before = drawnAt;
    a.paused = true;
    a.render();
    assert.equal(drawnAt, before);
});
test('the camera stops at the arena walls instead of scrolling forever', () => {
    const { B } = load('src/game/balance.ts');
    const limit = B.arenaWidth - B.view;
    for (const [x, bound] of [[B.arenaWidth * 4, limit], [-B.arenaWidth, 0]] as [number, number][]) {
        const a = setup();
        a.started = true;
        a.player.x = x;
        a.cameras.main.scrollX = bound;
        a.game = { loop: { delta: 16 } };
        a.hallway = { draw() { } };
        for (let i = 0; i < 400; i++) a.render();
        assert.ok(Math.abs(a.cameras.main.scrollX - bound) < .5, `camera left the arena chasing x=${x}`);
    }
});
test('punch and kick buttons select distinct attack limbs', () => {
    const a = setup();
    a.act('light'); assert.equal(a.player.attack.limb, 'hand');
    a.act('heavy'); assert.equal(a.player.attack.limb, 'foot');
});
test('charge trails build toward opponents and fade when turning away', () => {
    const a = setup();
    a.started = true; a.player.moving = true;
    a.fighters.push(new Fighter(700, 555));
    a.cameras.main.scrollX = 0;
    a.game = { loop: { delta: 16 } };
    a.hallway = { draw() {} };
    a.render();
    assert.equal(a.player.charge, 0);
    a.stamina.running = true;
    a.render();
    const toward = a.player.charge;
    assert.ok(toward > 0);
    a.player.face = -1;
    a.render();
    assert.ok(a.player.charge < toward);
});
test('regular punches and kicks hold grounded targets in a pain pose', () => {
    for (const action of ['light', 'heavy']) {
        const a = setup(), target = new Fighter(550, 555);
        a.player.y = 555; a.fighters.push(target);
        a.act(action); a.attackHits(a.player);
        assert.equal(target.z, 0); assert.equal(target.vz, 0);
        assert.equal(target.projectile, 0); assert.ok(target.hurtHold > 0);
        const x = target.x;
        a.integrate(target, .05);
        assert.equal(target.x, x);
    }
});
test('Fatty takes kick damage but cannot be launched by D or rising kick combos', () => {
    for (const action of ['launch', 'heavy']) {
        const a = setup(), fatty = new Fighter(550, 555, false, true);
        a.player.y = 555; a.fighters.push(fatty);
        a.controls.axis = () => ({ x: 0, y: -1 });
        a.act(action); a.attackHits(a.player);
        assert.ok(fatty.hp < fatty.maxHP);
        assert.equal(fatty.z, 0); assert.equal(fatty.vz, 0);
        assert.equal(fatty.projectile, 0);
    }
});
test('grounded deaths settle into a fallen pose instead of spinning forever', () => {
    const a = setup(), target = new Fighter(550, 555);
    a.hit(target, 999, 80, 0, false, true, true);
    for (let i = 0; i < 60; i++) a.integrate(target, 1 / 60);
    assert.equal(target.dead, true);
    assert.equal(target.spin, 0);
    assert.ok(Math.abs(target.angle - Math.PI / 2) < .01);
});

