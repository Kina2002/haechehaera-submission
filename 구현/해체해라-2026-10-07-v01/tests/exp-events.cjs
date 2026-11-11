// 경기 경험치 · 사건 방식 (P10 참가자 결정 2026-11-11: 역할별로 그 능력을 쓰는 사건이 일어날 때 오름)
// 경기 판정이 만드는 사건 기록(resolvePitch의 e)을 우리 팀 기준으로 세고, 경기가 끝나면 선수마다 능력별 경험치를 계산합니다.
// 숫자(EXP_EVENTS)는 Claude 초안 v01 · 시험값입니다. 배수(리그·나이·시설)는 곱하기 전 값입니다.
// 시뮬레이터에는 대타·대수비·불펜 교체가 없어서, 투수의 타격 칸과 지명타자의 수비 칸은 여기서 생기지 않습니다.

const EXP_EVENTS = {
  bat: { hit: 1.6, pa: .4, xbh: 2.4, hr: 4, rbi: .8, sf: .8, bb: 2.4, noWhiffPA: .3, sb: 2.4, run: 1.6, play: .8, bh: 1.6 },
  field: { catchOut: .6, error: .8, throwOut: .6, ofAssistThrow: 2.4, ofAssistVelocity: 1.6, caughtStealing: 1.6, rangePos: .5, dpTurn: 1.2, cleanThrow: .3, fullGame: .8, extraInnings: .8 },
  pitch: { k: .8, out: .2, cleanInning: .4, fivePlus: 3, play: .8, escape: .8, fieldCatch: .8, fieldThrow: .8, cover1B: .8, whiffInduced: .1 },
};
// v02p (2026-11-11): 야수는 v01 그대로, 투수만 — 투수 앞 타구 처리·송구 0.8 → 0.3, 주자 있을 때 무실점 이닝 0.8 → 0.3, 볼넷 없는 이닝 0.4 → 0.2
const EXP_PRESETS = { v01: EXP_EVENTS, v02p: { ...EXP_EVENTS, pitch: { ...EXP_EVENTS.pitch, fieldCatch: .3, fieldThrow: .3, escape: .3, cleanInning: .2 } } };
const OF = ['LF', 'CF', 'RF'], RANGE = ['LF', 'CF', 'RF', 'SS'];
const KEYS = ['contact', 'power', 'eye', 'speed', 'sense', 'catch', 'throw', 'velocity', 'control', 'stamina'];

// 한 경기 동안 우리 팀(경기 판정의 0번 쪽) 사건을 셉니다. onEvent를 경기 판정에 넘기면 됩니다.
function makeTracker() {
  const by = {}, halves = [], paWhiff = {};
  let cur = null;
  const g = id => by[id] ??= { pa: 0, noWhiffPA: 0, catchOut: 0, throwOut: 0, cleanThrow: 0, dpTurn: 0, ofAssist: 0, cs: 0, pCatch: 0, pThrow: 0, cover1B: 0, whiffInd: 0, cleanInn: 0, escape: 0, outs: 0, pitched: false };
  function onEvent(m, e) {
    if (!e) return;
    if (e.attack === 0) {
      // 우리 공격: 타석마다 헛스윙이 있었는지
      if (e.type === 'swing' || e.type === 'ks') paWhiff[e.batter] = true;
      if (e.pa) { const s = g(e.batter); s.pa++; if (!paWhiff[e.batter]) s.noWhiffPA++; paWhiff[e.batter] = false; }
      return;
    }
    // 우리 수비
    const key = e.inning + ':' + e.half;
    if (!cur || cur.key !== key) { cur = { key, walks: 0, runners: false, runs: 0, outs: 0, pitcher: null }; halves.push(cur); }
    cur.pitcher = e.pitcher; cur.outs += e.outsAdded || 0; cur.runs += e.runs?.length || 0;
    if (e.before?.bases?.some(Boolean)) cur.runners = true;
    if (e.pa && !e.ab && !e.hit && e.type !== 'sf') cur.walks++;
    const ps = g(e.pitcher); ps.pitched = true; ps.outs += e.outsAdded || 0;
    if (e.type === 'swing' || e.type === 'ks') ps.whiffInd++;
    const fid = e.fielderId, pos = e.fieldPos, outs = e.outsAdded || 0;
    if (!fid) return;
    const f = g(fid);
    if (e.type === 'cs') { f.cs++; return; }
    if ((e.type === 'ground' || e.type === 'dp') && outs > 0) {
      if (pos === 'P') { f.pCatch++; f.pThrow++; }
      else if (pos === '1B') { f.catchOut++; ps.cover1B++; }
      else { f.catchOut++; f.throwOut++; if (!e.errors?.length) f.cleanThrow++; }
      if (e.type === 'dp') f.dpTurn++;
    } else if (['fly', 'line', 'sf', 'flydp'].includes(e.type) && outs > 0) {
      if (pos === 'P') f.pCatch++; else f.catchOut++;
      if (e.type === 'flydp') { if (OF.includes(pos)) f.ofAssist++; else f.throwOut++; }
    }
    if (e.tag && outs > 0 && OF.includes(pos) && e.type !== 'flydp') f.ofAssist++;
  }
  function finish() {
    for (const h of halves) if (h.outs >= 3 && h.pitcher) { const p = g(h.pitcher); if (!h.walks) p.cleanInn++; if (h.runners && !h.runs) p.escape++; }
    return by;
  }
  return { onEvent, finish };
}

// 경기 하나의 경험치. pos: 그 경기 수비 자리('P'·'DH'·야수 자리, 출전하지 않았으면 null), s: 이번 경기 기록(p.stats), t: tracker.finish() 결과에서 이 선수 몫
function eventExp(pos, s, t, innings, E = EXP_EVENTS) {
  const e = Object.fromEntries(KEYS.map(k => [k, 0]));
  t ??= {};
  const batted = (t.pa || 0) > 0 || (pos && pos !== 'P');
  if (batted) {
    const b = E.bat;
    e.contact += s.h * b.hit + (t.pa || 0) * b.pa;
    e.power += (s.doubles + s.triples) * b.xbh + s.hr * b.hr + s.rbi * b.rbi + (s.sf || 0) * b.sf;
    e.eye += (s.bb + s.hbp) * b.bb + (t.noWhiffPA || 0) * b.noWhiffPA;
    e.speed += s.sb * b.sb + s.r * b.run;
    e.sense += b.play + s.bh * b.bh;
  }
  if (pos && pos !== 'P') {
    const f = E.field;
    e.stamina += f.fullGame + (innings > 5 ? f.extraInnings : 0);
    if (pos !== 'DH') {
      e.catch += (t.catchOut || 0) * f.catchOut + s.e * f.error;
      e.throw += (t.throwOut || 0) * f.throwOut + (t.ofAssist || 0) * f.ofAssistThrow + (t.cs || 0) * f.caughtStealing;
      e.speed += RANGE.includes(pos) ? f.rangePos : 0;
      e.sense += (t.dpTurn || 0) * f.dpTurn;
      e.velocity += (t.ofAssist || 0) * f.ofAssistVelocity;
      e.control += (t.cleanThrow || 0) * f.cleanThrow;
    }
  }
  if (t.pitched) {
    const p = E.pitch;
    e.velocity += s.pk * p.k;
    e.control += s.pout * p.out + (t.cleanInn || 0) * p.cleanInning;
    e.stamina += (t.outs || 0) >= 15 ? p.fivePlus : 0;
    e.sense += (batted ? 0 : p.play) + (t.escape || 0) * p.escape;
    e.catch += (t.pCatch || 0) * p.fieldCatch + (pos === 'P' ? s.e * E.field.error : 0);
    e.throw += (t.pThrow || 0) * p.fieldThrow;
    e.speed += (t.cover1B || 0) * p.cover1B;
    e.eye += (t.whiffInd || 0) * p.whiffInduced;
  }
  return e;
}

module.exports = { EXP_EVENTS, EXP_PRESETS, makeTracker, eventExp, KEYS };
