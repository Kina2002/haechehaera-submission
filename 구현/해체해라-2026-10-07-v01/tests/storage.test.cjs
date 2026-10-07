const {test} = require('node:test');
const assert = require('node:assert/strict');
const {create} = require('../src/storage.js');

function fixture(values = {}) {
  const rows = new Map(Object.entries(values));
  let failKey = null;
  const storage = {
    getItem: key => rows.has(key) ? rows.get(key) : null,
    setItem: (key, raw) => { if (key === failKey) throw Error('quota'); rows.set(key, raw); }
  };
  const validate = x => { if (x?.saveVersion !== 1 || !Array.isArray(x.slots) || x.slots.length !== 2) throw Error('invalid'); };
  return {rows, storage, validate, fail: key => {failKey = key;},
    store: create({key:'game', storage, validate, now:()=>123})};
}
const save = name => ({saveVersion:1, slots:[{name},null]});

test('first save and reload keep two independent slots', () => {
  const f = fixture(); assert.equal(f.store.load().status, 'empty');
  const data = save('first'); data.slots[1] = {name:'second'};
  assert.equal(f.store.write(data).ok, true);
  assert.deepEqual(create({key:'game',storage:f.storage,validate:f.validate}).load().value, data);
});
test('a previous save survives a damaged primary; damaged bytes are archived', () => {
  const raw = JSON.stringify(save('safe'));
  const f = fixture({'game':'{broken', 'game.last-good':raw});
  assert.deepEqual(f.store.load(), {status:'recovered',value:save('safe')});
  assert.equal(f.rows.get('game'), '{broken');
  assert.equal(f.store.write(save('safe')).ok, true);
  assert.equal(f.rows.get('game.damaged.123.0'), '{broken');
  assert.equal(f.rows.get('game'),raw);
});
test('JSON that fails validation is protected as well', () => {
  const f = fixture({'game':'{"saveVersion":999}'});
  assert.equal(f.store.load().status,'blocked');
  assert.equal(f.store.write(save('empty')).ok,false);
  assert.equal(f.rows.get('game'),' {"saveVersion":999}'.trim());
});
test('startup autosave cannot overwrite an unreadable save', () => {
  const f = fixture({'game':'{broken'});
  assert.equal(f.store.load().status,'blocked');
  assert.equal(f.store.write(save('new')).blocked,true);
  assert.equal(f.store.original(),'{broken');
  assert.equal(f.rows.get('game'),'{broken');
});
test('fresh start archives the original before writes become possible', () => {
  const f = fixture({'game':'{broken','game.damaged.123.0':'older'}); f.store.load();
  assert.equal(f.store.startFresh().ok,true);
  assert.equal(f.rows.get('game.damaged.123.0'),'older');
  assert.equal(f.rows.get('game.damaged.123.1'),'{broken');
  assert.equal(f.store.write(save('new')).ok,true);
});
test('archive quota failure keeps the original and the write block', () => {
  const f = fixture({'game':'{broken'}); f.store.load(); f.fail('game.damaged.123.0');
  assert.equal(f.store.startFresh().ok,false);
  assert.equal(f.store.state().blocked,true);
  assert.equal(f.rows.get('game'),'{broken');
});
test('recovery quota failure does not replace the main save', () => {
  const raw = JSON.stringify(save('old'));
  const f = fixture({'game':raw}); f.store.load(); f.fail('game.last-good');
  assert.equal(f.store.write(save('new')).ok,false);
  assert.equal(f.rows.get('game'),raw);
});
test('main write failure leaves a valid recovery checkpoint', () => {
  const raw = JSON.stringify(save('old'));
  const f = fixture({'game':raw}); f.store.load(); f.fail('game');
  assert.equal(f.store.write(save('new')).ok,false);
  assert.equal(f.rows.get('game.last-good'),raw);
  assert.equal(f.rows.get('game'),raw);
});
test('unavailable browser storage is reported and never crashes startup', () => {
  const f = create({key:'game',storage:()=>{throw Error('denied');},validate:()=>{}});
  assert.equal(f.load().status,'unavailable');
  assert.equal(f.write(save('new')).ok,false);
});
