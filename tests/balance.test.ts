import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B, difficulty, killValue } from '../src/game/balance.ts';
test('opening stays at one enemy, then two, before expanding', () => {
    assert.equal(difficulty(19).cap, 1);
    assert.equal(difficulty(20).cap, 2);
    assert.equal(difficulty(49).cap, 2);
    assert.equal(difficulty(50).cap, 3);
});
test('difficulty ramps without unbounded population or speed', () => { assert.equal(difficulty(0).cap, 1); assert.ok(difficulty(120).cap > difficulty(0).cap); assert.equal(difficulty(36000).cap, B.maxEnemies); assert.ok(difficulty(36000).interval >= .65); assert.ok(difficulty(36000).speed <= 140); });
test('Fatty is worth four normal kills at every combo multiplier', () => { for (const combo of [0, 5, 17, 100])
    assert.equal(killValue(true, combo), 4 * killValue(false, combo)); });
test('aggression outweighs passive survival and multiplier stays bounded', () => { assert.ok(10 * killValue(false, 15) + 300 > 480); assert.equal(killValue(false, 10000), killValue(false, 20)); assert.equal(B.fattyHeal / B.maxHP, .12); });

