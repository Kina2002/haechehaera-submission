// Inspection page script for a finished playtest save (2026-11-12, run with run-audit.cjs): loads slot 1 and copies the
// visible text of the main screens (home budget and opinion, finance, league, facilities, market, the contract dialog),
// the character image cache size, the save size by part and the time of one save(). Navigation uses go() because this
// is a reading tool, not a play test; it changes nothing except the save written when the slot loads and the timed save.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = {};
if (!activeGame) { document.querySelector('[data-action="load-slot"][data-i="0"]').click(); await sleep(100); document.querySelector('#dialog [data-action="confirm-dialog"]').click(); await sleep(600); }
for (const d of document.querySelectorAll('dialog[open]')) out['dialog-' + d.className] = d.innerText.slice(0, 600);
const grab = (sel, n = 1500) => (document.querySelector(sel)?.innerText || '').replace(/\n+/g, ' / ').slice(0, n);
go('home'); await sleep(400);
out.homeBudget = grab('.home-budget'); out.homeOpinion = grab('[data-opinion-home]'); out.homeLeague = grab('.league-home'); out.homeSupport = grab('[data-mlb-support-home]');
go('finance'); await sleep(300); out.financeBanner = grab('#app .ops-banner', 400); out.financeNote = grab('#app .muted-note', 400);
go('league'); await sleep(300); out.league = grab('#app', 2500);
go('facilities'); await sleep(300); out.facilities = grab('#app .facility-summary', 600) + ' // ' + grab('#app .league-stadium', 400);
go('market'); await sleep(300); out.market = grab('#app', 1200);
const t = team(); out.state = {season: t.league.season, tier: t.league.tier, phase: t.league.phase, round: t.league.round, funds: t.funds, ticket: t.ticket, stadium: t.stadium, players: t.players.length, wages: t.players.reduce((s, p) => s + p.salary, 0), upkeep: facilityUpkeepTotal(t, null), payout: LEAGUE.payout[t.league.tier]};
out.recentFinance = (t.history || []).slice(0, 6).map(h => ({home: h.home === 0, net: h.finance?.net, league: h.finance?.league, ticket: h.finance?.ticket, reward: h.finance?.reward, paid: h.finance?.paid, loanRepay: h.finance?.loanRepay}));
// Contract dialog wording
go('finance'); await sleep(200); const b = document.querySelector('[data-contract-open]'); if (b) { b.click(); await sleep(200); out.contractDialog = grab('#dialog', 700); document.querySelector('#dialog [data-action="close-dialog"]')?.click(); }
// Character image cache: entries by mode and their canvas pixel memory
const cacheRows = {}; for (const [k, v] of charCache) { const mode = k.split('|')[4]; const r = cacheRows[mode] ??= {n: 0, mb: 0, w: v.canvas.width, h: v.canvas.height}; r.n++; r.mb += v.canvas.width * v.canvas.height * 4 / 1048576; }
for (const r of Object.values(cacheRows)) r.mb = Math.round(r.mb);
out.charCache = {size: charCache.size, byMode: cacheRows};
out.saveChars = {main: (localStorage.getItem(KEY) || '').length, lastGood: (localStorage.getItem(KEY + '.last-good') || '').length};
const tt = JSON.parse(localStorage.getItem(KEY)).slots[data.current];
out.saveParts = Object.fromEntries(Object.keys(tt).map(k => [k, JSON.stringify(tt[k] ?? null).length]).sort((a, b) => b[1] - a[1]).slice(0, 8));
out.historyEventsShare = (tt.history || []).reduce((s, h) => s + JSON.stringify(h.events || []).length, 0);
// time one save()
const t0 = performance.now(); save(true); out.saveMs = Math.round(performance.now() - t0);
return out;
