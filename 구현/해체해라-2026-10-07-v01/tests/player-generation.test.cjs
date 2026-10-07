const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {randomUUID} = require('node:crypto');
const vm = require('node:vm');

const game = readFileSync(join(__dirname, '../src/game.js'), 'utf8');
const extensions = readFileSync(join(__dirname, '../src/extensions.js'), 'utf8');
const coreEnd = game.indexOf('\nfunction opponent(');
const extensionStart = extensions.indexOf('const BALANCE=');
const extensionEnd = extensions.indexOf('\nconst oldInitial=');
assert.ok(coreEnd > 0 && extensionStart > 0 && extensionEnd > extensionStart);

// Execute the real constructors and stamina wrapper without booting the UI or storage.
function fixture() {
  let state = 20261007;
  const draws = [];
  const math = Object.create(Math);
  math.random = () => {
    if (draws.length) return draws.shift();
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const context = vm.createContext({Math: math, crypto: {randomUUID},
    location: {hash: ''}, document: {documentElement: {hasAttribute: () => true}},
    performance: {now: () => 0}});
  vm.runInContext(game.slice(0, coreEnd), context);
  vm.runInContext(extensions.slice(extensionStart, extensionEnd), context);
  return {
    run(code, values = []) {
      draws.push(...values);
      const result = vm.runInContext(`JSON.stringify(${code})`, context, {timeout: 5000});
      assert.equal(draws.length, 0, 'All controlled random draws must be consumed');
      return JSON.parse(result);
    }
  };
}

const keys = ['contact', 'power', 'eye', 'speed', 'sense', 'catch', 'throw', 'velocity', 'control'];
const high = 1 - Number.EPSILON;

test('initial players: every strong/weak role reaches the new inclusive boundaries', () => {
  const f = fixture();
  for (let strong = 0; strong < 9; strong++) {
    const weak = (strong + 1) % 9;
    for (const edge of [0, high]) {
      const p = f.run('player(true)', [strong / 9, weak / 9,
        ...Array(10).fill(edge), .5, .5, .5, edge]);
      assert.equal(p.strong, keys[strong]);
      assert.equal(p.weak, keys[weak]);
      for (const key of keys) {
        const range = key === p.strong ? (key === 'sense' ? [55, 65] : [60, 80])
          : key === p.weak ? [1, 25] : [20, 55];
        assert.equal(p.a[key], range[edge === 0 ? 0 : 1]);
      }
      assert.equal(p.a.stamina, edge === 0 ? 40 : 60);
      assert.equal(p.energy, p.a.stamina);
    }
  }
});

test('new clubs receive 12 players with the updated ability ranges', () => {
  const t = fixture().run('newTeam("생성 검사", 11, 5)');
  assert.equal(t.players.length, 12);
  assert.equal(t.lineup.length, 9);
  for (const p of t.players) {
    assert.notEqual(p.strong, p.weak);
    assert.ok(p.a[p.strong] >= (p.strong === 'sense' ? 55 : 60));
    assert.ok(p.a[p.strong] <= (p.strong === 'sense' ? 65 : 80));
    assert.ok(p.a[p.weak] >= 1 && p.a[p.weak] <= 25);
    assert.ok(p.a.stamina >= 40 && p.a.stamina <= 60);
  }
});

test('ordinary recruits reach 10 and 70; a roll of exactly 0.001 is ordinary', () => {
  const f = fixture();
  for (const edge of [0, high]) {
    const abilities = f.run('recruitAbilities()', [...Array(9).fill(edge), .001]);
    assert.deepEqual(Object.keys(abilities), keys);
    assert.ok(Object.values(abilities).every(n => n === (edge === 0 ? 10 : 70)));
  }
});

test('a special recruit has exactly one 80..100 ability, including when it is baseball sense', () => {
  const f = fixture();
  for (let selected = 0; selected < 9; selected++) {
    for (const edge of [0, high]) {
      const a = f.run('recruitAbilities()', [...Array(9).fill(high), .000999,
        selected / 9, edge]);
      assert.equal(a[keys[selected]], edge === 0 ? 80 : 100);
      assert.equal(Object.values(a).filter(n => n >= 80).length, 1);
      assert.ok(keys.filter(k => k !== keys[selected]).every(k => a[k] === 70));
      assert.equal(a.stamina, undefined);
    }
  }
});

test('0.1% is one special player per 1000 equally spaced chance rolls, not per stat', () => {
  const f = fixture();
  let specials = 0;
  for (let i = 0; i < 1000; i++) {
    const chance = (i + .5) / 1000;
    const a = f.run('recruitAbilities()', [...Array(9).fill(.5), chance,
      ...(chance < .001 ? [0, high] : [])]);
    specials += Object.values(a).some(n => n > 70) ? 1 : 0;
  }
  assert.equal(specials, 1);
});

test('full recruit generation preserves one special ability and independent 40..60 stamina', () => {
  const f = fixture();
  for (const edge of [0, high]) {
    const p = f.run('player(false)', [0, .2, ...Array(9).fill(.5), 0, 4 / 9, high,
      .5, .5, .5, edge]);
    assert.equal(p.strong, null);
    assert.equal(p.weak, null);
    assert.equal(p.a.sense, 100);
    assert.equal(keys.filter(k => p.a[k] > 70).length, 1);
    assert.equal(p.a.stamina, edge === 0 ? 40 : 60);
    assert.equal(p.energy, p.a.stamina);
  }
});

test('enriching saved players retains previously generated and trained abilities', () => {
  const f = fixture();
  const p = f.run('(() => { const p=player(true); p.a.contact=99; p.a.sense=100; '
    + 'p.a.stamina=80; p.energy=17; return enrich(p); })()');
  assert.equal(p.a.contact, 99);
  assert.equal(p.a.sense, 100);
  assert.equal(p.a.stamina, 80);
  assert.equal(p.energy, 17);
});
