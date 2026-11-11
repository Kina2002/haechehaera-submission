// Read-only audit of a finished playtest save (2026-11-12). Run it like page-driver.js through the desktop app's self-check
// with the same --data-dir; it reads the stored save (it does not load the slot or write anything) and checks the logs the
// game keeps against the rules in the planning docs (P09 opinion and moves, P21 aging, P17 academy, P15 rewards, P19 prizes).
const raw = localStorage.getItem(KEY); if (!raw) return {error: 'no save'};
const d = JSON.parse(raw), t = d.slots[d.current] || d.slots.find(Boolean); if (!t) return {error: 'no team'};
const out = {team: t.name, saveChars: raw.length, lastGoodChars: (localStorage.getItem(KEY + '.last-good') || '').length, checks: {}, samples: {}};
const bad = (k, x) => { const c = out.checks[k] ??= {ok: 0, bad: 0, samples: []}; c.bad++; if (c.samples.length < 4) c.samples.push(x); };
const ok = k => { (out.checks[k] ??= {ok: 0, bad: 0, samples: []}).ok++; };
try { validateTeam(JSON.parse(raw).slots[d.current]); ok('validateTeam'); } catch (e) { bad('validateTeam', String(e.message)); }
// P09 moves: 1st → up (or blocked / champion), 6th above 동네 → down (or saved / disband)
for (const h of t.league?.history || []) {
  const want = h.rank === 1 ? (h.tier === 3 ? ['champion'] : ['up', 'blocked', 'stay']) : h.rank === 6 && h.tier > 0 ? ['down', 'saved'] : ['stay'];
  if (h.move === 'disband' || want.includes(h.move)) ok('move'); else bad('move', {season: h.season, tier: h.tier, rank: h.rank, move: h.move});
  if (h.move === 'stay' && h.rank === 1 && h.tier < 3) ok('promotion-not-taken');
  const prize = h.move === 'disband' ? 0 : (LEAGUE.prize[h.tier]?.[h.rank - 1] || 0);
  if (h.prize === prize) ok('prize'); else bad('prize', {season: h.season, tier: h.tier, rank: h.rank, prize: h.prize, want: prize});
}
// P09 season-end opinion: rank part −30 −15 0 0 +10 +20
for (const e of t.opinion?.log || []) if (e.kind === 'season') {
  const r = e.parts.find(p => p.key === 'rank'); const rank = Number((r?.label || '').match(/(\d)위/)?.[1]);
  if (r && OPINION.rank[rank - 1] === r.delta) ok('opinion-rank'); else bad('opinion-rank', e.parts);
  const sum = e.parts.reduce((s, p) => s + p.delta, 0), want = Math.min(100, Math.max(0, e.from + sum));
  if (Math.abs(want - e.to) < 0.01) ok('opinion-clamp-once'); else bad('opinion-clamp-once', {from: e.from, to: e.to, parts: e.parts});
}
// P21 aging: 30~35 three abilities −2, 36~40 five −3, 41+ all ten −5 (never below 1)
for (const s of t.aging?.log || []) for (const r of s.rows || []) {
  const n = Object.keys(r.drop || {}).length, vals = Object.values(r.drop || {});
  const want = r.age >= 41 ? [10, 5] : r.age >= 36 ? [5, 3] : r.age >= 30 ? [3, 2] : [0, 0];
  if (n <= want[0] && vals.every(v => v <= want[1]) && (want[0] === 0 ? n === 0 : n > 0)) ok('aging'); else bad('aging', {season: s.season, name: r.name, age: r.age, drop: r.drop});
}
out.samples.retired = (t.departed || []).filter(p => p.departureKind === 'retired').map(p => ({name: p.name, age: p.retired?.age, reason: p.retired?.reason, season: p.retired?.season}));
out.samples.departed = (t.departed || []).reduce((o, p) => { const k = p.departureKind || 'loyalty0'; o[k] = (o[k] || 0) + 1; return o; }, {});
// P17 academy: one prospect per season end while the facility stands
const A = t.facilityData?.academy; if (A) out.samples.academy = A.log.map(x => x.season + ':' + x.result);
// P15 rewards and tickets
const succ = (t.mlbHistory || []).filter(h => h.success);
out.samples.mlb = {tries: (t.mlbHistory || []).length, success: succ.length, rewards: succ.map(h => h.reward?.choice || h.reward?.status || '-'), tickets: t.mlbSupport?.tickets, used: (t.mlbSupport?.used || []).map(u => u.kind + ':' + u.season), fees: succ.map(h => h.fee)};
const milestones = [1, 5, 10].filter(n => succ.length >= n).length;
if ((t.mlbSupport?.tickets || 0) + (t.mlbSupport?.used?.length || 0) === Math.max(0, milestones - 0)) ok('tickets-from-mlb'); else bad('tickets-from-mlb', {success: succ.length, tickets: t.mlbSupport?.tickets, used: t.mlbSupport?.used?.length, base: t.mlbSupport?.base});
for (const h of succ) if (h.reward && h.reward.status !== 'done') bad('reward-pending', {name: h.player.name, status: h.reward.status}); else ok('reward-done');
// Names: same name twice on the roster
const names = t.players.map(p => p.name), dup = names.filter((n, i) => names.indexOf(n) !== i);
out.samples.duplicateNames = dup; out.samples.roster = t.players.map(p => p.name + '#' + p.number + '(' + p.age + ')');
// Ticket price: the home gate the club gets at its price and the best price on the same formula (F-economy attendance()).
const fans = t.players.reduce((s, p) => s + p.fans, 0), crowd = leagueCrowd(t.league?.tier ?? 0), seats = t.stadium * 200;
const gate = tk => Math.round(Math.min(seats, (fans * .3 + 80) * crowd * (10 / tk) ** 1.8)) * tk;
let best = 10; for (let tk = 1; tk <= 50; tk++) if (gate(tk) > gate(best)) best = tk;
out.samples.ticket = {fans, ticket: t.ticket, seats: seats * 10, demandAt10: Math.round((fans * .3 + 80) * crowd * 10), gateNow: gate(t.ticket), bestTicket: best * 1000, gateBest: gate(best)};
// History size share
out.samples.historyChars = JSON.stringify(t.history || []).length; out.samples.historyGames = (t.history || []).length;
out.samples.newsCount = (t.news || []).length; out.samples.ledgerCount = (t.ledger || []).length;
out.samples.opinionLogKinds = (t.opinion?.log || []).reduce((o, e) => { o[e.kind] = (o[e.kind] || 0) + 1; return o; }, {});
return out;
