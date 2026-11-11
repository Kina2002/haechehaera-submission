// 경기 한 번에 선수가 받는 경기 경험치(배수 곱하기 전)를 실제 경기 판정으로 잽니다.
// 사용: node tests/measure-exp-per-game.cjs [경기 수=400]  (2026-11-11, P10 경험치 초안을 실제 경기 판정으로 잼)
const path = require('path');
const { createWorld } = require(path.join(__dirname, 'run-season-sim.cjs'));
const N = Number(process.argv[2]) || 400;
const POSW = { P: { velocity: .4, control: .4, sense: .15, stamina: .05 }, C: { catch: .5, throw: .3, sense: .2 }, '1B': { catch: .65, sense: .2, throw: .15 },
  '2B': { catch: .35, throw: .2, sense: .25, speed: .2 }, '3B': { catch: .35, throw: .4, sense: .25 }, SS: { catch: .3, throw: .3, sense: .2, speed: .2 },
  LF: { catch: .4, speed: .35, throw: .15, sense: .1 }, CF: { catch: .35, speed: .4, throw: .15, sense: .1 }, RF: { catch: .35, speed: .25, throw: .3, sense: .1 }, DH: {} };
const KEYS = ['contact', 'power', 'eye', 'speed', 'sense', 'catch', 'throw', 'velocity', 'control', 'stamina'];
// 시뮬레이터 gainExp와 같은 식(배수 없음)
function exp(pos, s) {
  const e = Object.fromEntries(KEYS.map(k => [k, 0]));
  if (pos !== 'P') {
    e.contact += s.h * 2 + s.pa * .5; e.power += (s.doubles + s.triples) * 3 + s.hr * 5 + s.rbi; e.eye += (s.bb + s.hbp) * 3 + s.pa * .3;
    e.speed += s.sb * 3 + s.r * 2; e.sense += 1 + s.bh * 2;
    if (pos !== 'DH') { const w = POSW[pos]; e.catch += (w.catch || 0) * 4 + s.e; e.throw += (w.throw || 0) * 4; e.sense += (w.sense || 0) * 2; e.speed += (w.speed || 0) * 2; }
  } else { e.control += s.pout * .5; e.velocity += s.pk * 1.5; e.stamina += s.pout * .3; e.sense += 1; }
  return e;
}
function run(label, boost, level) {
  const world = createWorld(20261111);
  const t = world.initialTeam();
  if (boost) for (const p of t.players) for (const k of KEYS) if (k !== 'stamina') p.a[k] = Math.min(100, p.a[k] + boost);
  t.lineup = world.autoLineup(t.players);
  const sum = {}, cnt = {}, stat = {};
  let seed = 1;
  for (let g = 0; g < N; g++) {
    for (const p of t.players) p.energy = p.a.stamina; // 체력 문제 없이 재기
    const opp = world.botTeam(level, 'dh');
    world.playGame(t, opp, g % 2, seed++);
    for (const x of t.lineup) {
      const p = t.players.find(q => q.id === x.id); if (!p) continue;
      const grp = x.pos === 'P' ? '투수' : x.pos === 'DH' ? '지명타자' : '야수';
      const e = exp(x.pos, p.stats);
      sum[grp] ??= Object.fromEntries(KEYS.map(k => [k, 0])); cnt[grp] = (cnt[grp] || 0) + 1; stat[grp] ??= {};
      for (const k of KEYS) sum[grp][k] += e[k];
      for (const k of ['pa', 'h', 'doubles', 'triples', 'hr', 'rbi', 'bb', 'hbp', 'sb', 'r', 'bh', 'e', 'pout', 'pk']) stat[grp][k] = (stat[grp][k] || 0) + (p.stats[k] || 0);
    }
  }
  console.log(`\n### ${label} (${N}경기)`);
  for (const grp of ['야수', '지명타자', '투수']) {
    if (!cnt[grp]) continue;
    const st = Object.entries(stat[grp]).map(([k, v]) => `${k} ${(v / cnt[grp]).toFixed(2)}`).join(' · ');
    const ex = KEYS.map(k => `${k} ${(sum[grp][k] / cnt[grp]).toFixed(2)}`).filter(x => !x.endsWith(' 0.00')).join(' · ');
    console.log(`${grp} 경기당 기록: ${st}\n${grp} 경기당 경험치: ${ex}`);
  }
}
run('동네 수준: 우리 시작 선수 vs 동네 중위권(39)', 0, (39 - 43.5) / 4);
run('2부 수준: 우리 +20 vs 2부 중위권(63)', 20, (63 - 43.5) / 4);
