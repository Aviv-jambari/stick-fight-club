import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stamina, SPRINT } from '../src/game/Stamina.ts';

test('sprint drains stamina, stops at empty, and waits for enough recovery', () => {
    const s = new Stamina();
    s.update(1, true);
    assert.equal(s.value, 72); assert.equal(s.running, true);
    s.update(3, true);
    assert.equal(s.value, 0); assert.equal(s.running, false);
    s.update(.5, true);
    assert.equal(s.value, 0);
    s.update(.5, true);
    assert.ok(s.value > 0 && s.value < SPRINT.resume);
    assert.equal(s.running, false);
    s.update(1, false); s.update(.016, true);
    assert.equal(s.running, true);
});
test('rest refills to the maximum and a fresh run starts full', () => {
    const s = new Stamina(); s.update(1, true); s.update(100, false);
    assert.equal(s.value, 100); assert.equal(s.running, false);
    assert.equal(new Stamina().value, 100);
});
