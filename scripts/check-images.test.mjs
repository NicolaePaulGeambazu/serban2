import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalImage } from './check-images.mjs';

test('local paths pass', () => {
  assert.equal(isLocalImage('/img/products/abc.jpg'), true);
  assert.equal(isLocalImage(''), true); // empty = placeholder icon, allowed
});

test('external hosts fail', () => {
  assert.equal(isLocalImage('https://s13emagst.akamaized.net/x.jpg'), false);
  assert.equal(isLocalImage('http://example.com/x.jpg'), false);
  assert.equal(isLocalImage('//cdn.foo/x.jpg'), false);
});
