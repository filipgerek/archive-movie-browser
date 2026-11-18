import test from 'node:test';
import assert from 'node:assert/strict';
import { playOnArrival, spin, takePlayOnArrival, watchUrl } from './reel.js';
import { setPosterIndex } from './posterIndex.js';

function replaceGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}

test('watchUrl safely encodes an Archive.org identifier for the URL fragment', () => {
  assert.equal(watchUrl('film #1/?'), '/browse#film%20%231%2F%3F');
});

test('playOnArrival and takePlayOnArrival use a storage fake and the stubbed time', t => {
  const values = new Map();
  replaceGlobal(t, 'sessionStorage', {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  });
  t.mock.method(Date, 'now', () => 1_000);

  playOnArrival('detour');
  assert.deepEqual(JSON.parse(values.get('play-on-arrival')), { id: 'detour', at: 1_000 });
  assert.equal(takePlayOnArrival('detour', 15_999), true, 'the wish is valid for just under 15 seconds');
  assert.equal(takePlayOnArrival('detour', 16_000), false, 'the boundary itself is expired');
  assert.equal(takePlayOnArrival('another-film', 1_001), false, 'the wish belongs to one film');
});

test('play-on-arrival fails safely when session storage is malformed or disabled', t => {
  let read = () => '{not valid json';
  replaceGlobal(t, 'sessionStorage', {
    getItem: key => read(key),
    setItem: () => { throw new Error('storage disabled'); },
  });

  assert.equal(takePlayOnArrival('detour'), false);
  read = () => { throw new Error('storage disabled'); };
  assert.equal(takePlayOnArrival('detour'), false);
  assert.doesNotThrow(() => playOnArrival('detour'));
});

test('spin uses the random-number mock to navigate to one indexed film', async t => {
  setPosterIndex({
    first_upload: { i: 1, t: 'First', y: 1950, p: '/first.jpg', v: 8, c: 0.99, d: 80 },
    second_upload: { i: 2, t: 'Second', y: 1951, p: '/second.jpg', v: 7, c: 0.99, d: 90 },
  });
  t.after(() => setPosterIndex({}));
  replaceGlobal(t, 'window', { location: { href: '' } });
  const random = t.mock.method(Math, 'random', () => 0.99);

  await spin();

  assert.equal(window.location.href, '/browse#second_upload');
  assert.equal(random.mock.callCount(), 1);
});

test('spin navigates to browse without consulting randomness when the index is empty', async t => {
  setPosterIndex({});
  replaceGlobal(t, 'window', { location: { href: '' } });
  const random = t.mock.method(Math, 'random', () => 0.5);

  await spin();

  assert.equal(window.location.href, '/browse');
  assert.equal(random.mock.callCount(), 0);
});
