import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localFilename } from './download-images.mjs';

test('prefers feedId, keeps extension', () => {
  assert.equal(localFilename({ id: 'x', feedId: 'D3T90KMBM',
    image: 'https://s13emagst.akamaized.net/a/res_x.jpg?width=720' }), 'd3t90kmbm.jpg');
});
test('falls back to id, defaults to jpg', () => {
  assert.equal(localFilename({ id: 'gree12', image: 'https://x/y.png?z=1' }), 'gree12.png');
  assert.equal(localFilename({ id: 'gree12', image: 'https://x/y' }), 'gree12.jpg');
});
