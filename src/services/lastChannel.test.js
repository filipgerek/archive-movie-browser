import test from 'node:test';
import assert from 'node:assert/strict';
import { readLast, writeLast } from './lastChannel.js';

function replaceGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}

test('lastChannel writes and reads the last channel through an in-memory storage fake', t => {
  const values = new Map();
  replaceGlobal(t, 'localStorage', {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  });

  assert.equal(readLast(), null);
  writeLast('horror-night');
  assert.equal(readLast(), 'horror-night');
  assert.equal(values.get('last-channel'), 'horror-night');
});

test('lastChannel tolerates disabled storage and calls the expected storage methods', t => {
  const getItem = t.mock.fn(() => { throw new Error('storage disabled'); });
  const setItem = t.mock.fn(() => { throw new Error('storage disabled'); });
  replaceGlobal(t, 'localStorage', { getItem, setItem });

  assert.equal(readLast(), null);
  assert.doesNotThrow(() => writeLast('channel-7'));
  assert.equal(getItem.mock.callCount(), 1);
  assert.equal(setItem.mock.callCount(), 1);
  assert.deepEqual(setItem.mock.calls[0].arguments, ['last-channel', 'channel-7']);
});
