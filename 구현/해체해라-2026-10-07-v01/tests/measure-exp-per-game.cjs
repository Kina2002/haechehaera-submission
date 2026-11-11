// 경기 한 번에 선수가 받는 경기 경험치(배수 곱하기 전)를 실제 경기 판정으로 잽니다.
// 사용: node tests/measure-exp-per-game.cjs [경기 수=400] [숫자 묶음 v01|v02p]  (2026-11-11)
// "지금 초안"(능력별 공식)과 "사건 방식"(exp-events.cjs, P10 참가자 결정)을 같은 경기로 함께 잽니다.
const path = require('path');
const { createWorld } = require(path.join(__dirname, 'run-season-sim.cjs'));
const { makeTracker, eventExp, KEYS, EXP_PRESETS } = require(path.join(__dirname, 'exp-events.cjs'));
const N = Number(process.argv[2]) || 400, PRESET = process.argv[3] || 'v01', E = EXP_PRESETS[PRESET];
if (!E) throw new Error('숫자 묶음이 없습니다: ' + PRESET);
const POSW = { P: { velocity: .4, control: .4, sense: .15, stamina: .05 }, C: { catch: .5, throw: .3, sense: .2 }, '1B': { catch: .65, sense: .2, throw: .15 },
  '2B': { catch: .35, throw: .2, sense: .25, speed: .2 }, '3B': { catch: .35, throw: .4, sense: .25 }, SS: { catch: .3, throw: .3, sense: .2, speed: .2 },
  LF: { catch: .4, speed: .35, throw: .15, sense: .1 }, CF: { catch: .35, speed: .4, throw: .15, sense: .1 }, RF: { catch: .35, speed: .25, throw: .3, sense: .1 }, DH: {} };
const KO = { contact: '컨택', power: '파워', eye: '선구안', speed: '주력', sense: '야구센스', catch: '포구', throw: '송구', velocity: '구속', control: '제구', stamina: '스태미나' };
// 지금 초안(run-economy-sim.cjs gainExp와 같은 식, 배수 없음)
function oldExp(pos, s) {
  const e = Object.fromEntries(KEYS.map(k => [k, 0]));
  if (pos !== 'P') {
    e.contact += s.h * 2 + s.pa * .5; e.power += (s.doubles + s.triples) * 3 + s.hr * 5 + s.rbi; e.eye += (s.bb + s.hbp) * 3 + s.pa * .3;
    e.speed += s.sb * 3 + s.r * 2; e.sense += 1 + s.bh * 2;
    if (pos !== 'DH') { const w = POSW[pos]; e.catch += (w.catch || 0) * 4 + s.e; e.throw += (w.throw || 0) * 4; e.sense += (w.sense || 0) * 2; e.speed += (w.speed || 0) * 2; }
  } else { e.control += s.pout * .5; e.velocity += s.pk * 1.5; e.stamina += s.pout * .3; e.sense += 1; }
  return e;
}
const COUNTS = ['pa', 'noWhiffPA', 'catchOut', 'throwOut', 'cleanThrow', 'dpTurn', 'ofAssist', 'cs', 'pCatch', 'pThrow', 'cover1B', 'whiffInd', 'cleanInn', 'escape', 'outs'];
function run(label, boost, level) {
  const world = createWorld(20261111);
  const t = world.initialTeam();
  if (boost) for (const p of t.players) for (const k of KEYS) if (k !== 'stamina') p.a[k] = Math.min(100, p.a[k] + boost);
  t.lineup = world.autoLineup(t.players);
  const acc = {};
  let seed = 1, five = 0, extra = 0;
  for (let g = 0; g < N; g++) {
    for (const p of t.players) p.energy = p.a.stamina;
    const tr = makeTracker();
    const res = world.playGame(t, world.botTeam(level, 'dh'), g % 2, seed++, { onEvent: tr.onEvent });
    const by = tr.finish();
    if (res.innings > 5) extra++;
    for (const x of t.lineup) {
      const p = t.players.find(q => q.id === x.id); if (!p) continue;
      const grp = x.pos === 'P' ? '투수' : x.pos === 'DH' ? '지명타자' : '야수';
      const a = acc[grp] ??= { n: 0, old: {}, ev: {}, cnt: {} };
      a.n++;
      const o = oldExp(x.pos, p.stats), v = eventExp(x.pos, p.stats, by[p.id], res.innings, E);
      for (const k of KEYS) { a.old[k] = (a.old[k] || 0) + o[k]; a.ev[k] = (a.ev[k] || 0) + v[k]; }
      for (const k of COUNTS) a.cnt[k] = (a.cnt[k] || 0) + ((by[p.id] || {})[k] || 0);
      if (x.pos === 'P' && (by[p.id]?.outs || 0) >= 15) five++;
    }
  }
  console.log(`\n### ${label} (${N}경기, 연장 ${Math.round(100 * extra / N)}%, 투수 5이닝 이상 ${Math.round(100 * five / N)}%)`);
  for (const grp of ['야수', '지명타자', '투수']) {
    const a = acc[grp]; if (!a) continue;
    console.log(`\n${grp} 경기당 사건: ` + COUNTS.map(k => `${k} ${(a.cnt[k] / a.n).toFixed(2)}`).filter(x => !x.endsWith(' 0.00')).join(' · '));
    console.log(`| 능력 | 지금 초안 | 사건 방식 ${PRESET} |\n|---|---:|---:|`);
    for (const k of KEYS) console.log(`| ${KO[k]} | ${(a.old[k] / a.n).toFixed(2)} | ${(a.ev[k] / a.n).toFixed(2)} |`);
    const so = KEYS.reduce((s, k) => s + a.old[k], 0) / a.n, sv = KEYS.reduce((s, k) => s + a.ev[k], 0) / a.n;
    console.log(`| 합계 | ${so.toFixed(2)} | ${sv.toFixed(2)} (${Math.round(100 * (sv / so - 1))}%) |`);
  }
}
run('동네 수준: 우리 시작 선수 vs 동네 중위권(39)', 0, (39 - 43.5) / 4);
run('2부 수준: 우리 +20 vs 2부 중위권(63)', 20, (63 - 43.5) / 4);
