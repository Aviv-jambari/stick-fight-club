import { test } from 'node:test';
import assert from 'node:assert/strict';
import { B, REACH, difficulty, killValue } from '../src/game/balance.ts';
test('the opening is populated and the cap only ever rises', () => {
    // Asserted as shape, not constants, so retuning the ramp does not break the suite.
    assert.ok(difficulty(0).cap >= 2, 'opening must not leave the player alone');
    let previous = 0;
    for (let t = 0; t <= 600; t += 5) {
        const cap = difficulty(t).cap;
        assert.ok(cap >= previous, `cap fell at ${t}s`);
        previous = cap;
    }
    assert.ok(difficulty(120).cap > difficulty(0).cap);
});
test('difficulty ramps without unbounded population or speed', () => { assert.equal(difficulty(36000).cap, B.maxEnemies); assert.ok(difficulty(36000).interval >= .65); const ceiling = difficulty(36000).speed; assert.ok(difficulty(1e9).speed === ceiling, 'speed must saturate'); assert.ok(ceiling < B.playerSpeed, 'enemies must stay outrunnable'); });
test('enemies close the opening gap without the player having to walk in', () => {
    // Spawns arrive just beyond a 1280 view, so a standing player is reached in a few seconds.
    const gap = B.view / 2 + 70 - REACH.aiStop;
    assert.ok(gap / difficulty(0).speed < 5, 'first contact takes too long');
});
test('Fatty is worth four normal kills at every combo multiplier', () => { for (const combo of [0, 5, 17, 100])
    assert.equal(killValue(true, combo), 4 * killValue(false, combo)); });
test('aggression outweighs passive survival and multiplier stays bounded', () => { assert.ok(10 * killValue(false, 15) + 300 > 480); assert.equal(killValue(false, 10000), killValue(false, 20)); assert.equal(B.fattyHeal / B.maxHP, .12); });

