const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
test('core loads without native APIs', () => {
  const original = Module._load;
  Module._load = function(name, ...args) {
    if (name.startsWith('node:')) throw Error('native API blocked');
    return original.call(this, name, ...args);
  };
  try { assert.equal(typeof require('../core.cjs').createMediatedIO, 'function'); }
  finally { Module._load = original; }
});
test('event client and dispatcher use portable values and reject unknown operations', async () => {
  const {createEventClient, createDispatcher} = require('../core.cjs');
  const seen = [];
  const dispatch = createDispatcher({files: {readFile: async (p, enc) => {seen.push([p,enc]); return 'hello';}}});
  const client = createEventClient(dispatch);
  assert.equal(await client.readText('data/a.txt'), 'hello');
  assert.deepEqual(seen, [['data/a.txt','utf8']]);
  await assert.rejects(dispatch('files::event:remove', {}), /Unsupported/);
  await assert.rejects(dispatch('files::event:readText', {path:4}), /path/);
});
