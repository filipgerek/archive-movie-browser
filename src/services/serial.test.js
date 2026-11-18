import test from 'node:test';
import assert from 'node:assert/strict';
import { serial } from './serial.js';

test('serial runs work with the same key one at a time and preserves its results', async () => {
  const events = [];
  let releaseFirst;
  const first = serial('same-key', async () => {
    events.push('first started');
    await new Promise(resolve => { releaseFirst = resolve; });
    events.push('first finished');
    return 'first result';
  });
  await Promise.resolve();

  const second = serial('same-key', () => {
    events.push('second started');
    return 'second result';
  });
  await Promise.resolve();

  assert.deepEqual(events, ['first started'], 'the second operation is still queued');
  releaseFirst();
  assert.deepEqual(await Promise.all([first, second]), ['first result', 'second result']);
  assert.deepEqual(events, ['first started', 'first finished', 'second started']);
});

test('serial lets independent keys run concurrently', async () => {
  let releaseBlocked;
  const blocked = serial('blocked-key', () => new Promise(resolve => { releaseBlocked = resolve; }));
  await Promise.resolve();

  const independent = serial('independent-key', () => 'already done');
  assert.equal(await independent, 'already done');
  releaseBlocked('released');
  assert.equal(await blocked, 'released');
});

test('serial propagates a failure but still runs the next operation for that key', async () => {
  const failure = new Error('write failed');
  const failed = serial('recovering-key', async () => { throw failure; });
  const recovered = serial('recovering-key', () => 'recovered');

  await assert.rejects(failed, failure);
  assert.equal(await recovered, 'recovered');
});
