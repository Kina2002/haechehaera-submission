#!/usr/bin/env node
// Plays one user type in the real game (desktop app, hidden window) until the goal, in several launches.
//   node run-user.cjs --user=normal [--goal=promotion|title] [--max-seasons=40] [--chunk=4] [--minutes=14]
//        [--data=<save folder>] [--out=<results folder>] [--electron=<electron.exe>] [--fresh] [--max-launches=40]
// --goal=promotion stops when the club is promoted into 1부 (the offseason after that season); --goal=title stops at a 1부 title.
// The save lives in --data (default: <temp>/haechehaera-playtest/<user>), never in the participant's own save folder.
// Output: <out>/<user>.summary.json (compact), <out>/<user>.seasons.jsonl (one line per season), <out>/<user>.launches.jsonl.
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), {spawn} = require('node:child_process');
const {PERSONAS} = require('./personas.cjs');

const arg = (name, def) => { const hit = process.argv.find(a => a.startsWith('--' + name + '=')); return hit ? hit.slice(name.length + 3) : process.argv.includes('--' + name) ? true : def; };
const user = arg('user'); if (!PERSONAS[user]) { console.error('unknown --user. one of: ' + Object.keys(PERSONAS).join(', ')); process.exit(2); }
const here = __dirname, repo = path.resolve(here, '..', '..', '..', '..');
const opts = {
  goal: arg('goal', 'promotion'), maxSeasons: Number(arg('max-seasons', 40)), chunk: Number(arg('chunk', 4)), minutes: Number(arg('minutes', 14)),
  data: path.resolve(arg('data', path.join(os.tmpdir(), 'haechehaera-playtest', user))), out: path.resolve(arg('out', path.join(here, 'results-latest'))),
  electron: arg('electron', 'D:\\해체해라-앱\\electron\\electron.exe'), fresh: !!arg('fresh', false), maxLaunches: Number(arg('max-launches', 40)),
};
if (/해체해라-앱[\\/]+저장/.test(opts.data)) { console.error('refusing to use the participant save folder: ' + opts.data); process.exit(2); }
fs.mkdirSync(opts.out, {recursive: true});
if (opts.fresh && fs.existsSync(opts.data)) fs.rmSync(opts.data, {recursive: true, force: true});
fs.mkdirSync(opts.data, {recursive: true});
const work = path.join(opts.data, '..', user + '-work'); fs.mkdirSync(work, {recursive: true});
const files = {summary: path.join(opts.out, user + '.summary.json'), seasons: path.join(opts.out, user + '.seasons.jsonl'), launches: path.join(opts.out, user + '.launches.jsonl'), games: path.join(opts.out, user + '.games.jsonl')};
if (opts.fresh) for (const f of [files.seasons, files.launches, files.games]) if (fs.existsSync(f)) fs.rmSync(f);
const driver = fs.readFileSync(path.join(here, 'page-driver.js'), 'utf8');

function launch(n, expect) {
  const cfg = {user, persona: PERSONAS[user], goal: opts.goal, maxSeasons: opts.maxSeasons, chunkSeasons: opts.chunk, maxMinutes: opts.minutes, launch: n, expect, teamName: PERSONAS[user].teamName};
  const script = path.join(work, 'launch-' + n + '.js');
  fs.writeFileSync(script, 'const CFG=' + JSON.stringify(cfg) + ';\n' + driver);
  const png = path.join(work, 'launch-' + n + '.png');
  const args = ['--enable-logging', path.join(repo, 'desktop'), '--data-dir=' + opts.data, '--self-check=' + png, '--self-check-script=' + script, '--self-check-wait=3000'];
  return new Promise(resolve => {
    const t0 = Date.now(), p = spawn(opts.electron, args, {windowsHide: true});
    let so = '', se = '';
    p.stdout.on('data', d => so += d);
    p.stderr.on('data', d => { se += d; const lines = String(d).split(/\r?\n/).filter(l => l.includes('"PT|')); for (const l of lines) { const m = l.match(/"PT\|(\w+)\|(.*)", source/); if (m && ['season', 'end', 'start', 'finding'].includes(m[1])) process.stdout.write('[' + user + '#' + n + '] ' + m[1] + ' ' + m[2].slice(0, 220) + '\n'); } });
    const killAt = (opts.minutes + 10) * 60000, timer = setTimeout(() => { p.kill(); }, killAt);
    p.on('exit', (code, signal) => {
      clearTimeout(timer);
      fs.writeFileSync(path.join(work, 'launch-' + n + '.stderr.txt'), se.split(/\r?\n/).filter(l => l.includes('"PT|') || !/:INFO:CONSOLE/.test(l)).join('\n'));
      fs.writeFileSync(path.join(work, 'launch-' + n + '.stdout.txt'), so.length > 2e6 ? so.slice(0, 2e6) : so);
      if (signal) console.log('[' + user + '#' + n + '] exit signal ' + signal);
      let parsed = null; try { const i = so.indexOf('{'); parsed = JSON.parse(so.slice(i)); } catch (e) { /* killed or crashed */ }
      // Rebuild from the console lines when the launch did not return (timeout or crash).
      const pt = []; for (const l of se.split(/\r?\n/)) { const m = l.match(/"PT\|(\w+)\|(.*)", source/); if (m) { try { pt.push({type: m[1], data: JSON.parse(m[2])}); } catch (e) { pt.push({type: m[1], raw: m[2].slice(0, 300)}); } } }
      resolve({code, secs: Math.round((Date.now() - t0) / 1000), result: parsed?.script || null, consoleErrors: parsed?.errors || [], pt, timedOut: Date.now() - t0 >= killAt - 1000});
    });
  });
}

function loadPrev() { try { return JSON.parse(fs.readFileSync(files.summary, 'utf8')); } catch (e) { return null; } }
(async () => {
  const prev = opts.fresh ? null : loadPrev();
  const S = prev || {user, label: PERSONAS[user].label, persona: PERSONAS[user], goal: opts.goal, launches: [], seasons: [], findings: {}, consoleErrors: [], reason: null, reached: {}, wallSec: 0, gameMs: []};
  S.goal = opts.goal;
  let expect = S.launches.at(-1)?.end || null, stuckRuns = 0;
  for (let n = S.launches.length + 1; n <= opts.maxLaunches; n++) {
    const r = await launch(n, expect && {season: expect.season, round: expect.round, phase: expect.phase});
    const res = r.result || {};
    const seasons = res.seasons?.length ? res.seasons : r.pt.filter(x => x.type === 'season').map(x => x.data).filter(Boolean);
    for (const s of seasons) { const i = S.seasons.findIndex(x => x.season === s.season && x.tier === s.tier && x.rank === s.rank); if (i < 0) S.seasons.push(s); }
    for (const [season, list] of Object.entries(res.offseasons || {})) { const s = S.seasons.filter(x => x.season === Number(season)).at(-1); if (s) { s.offseason = list; s.afterOffseason = res.offseasonSnap?.[season]; } }
    for (const f of Object.values(res.findings || {})) { const g = S.findings[f.id] ??= {...f, count: 0, launches: []}; g.count += f.count; if (g.launches.length < 5) g.launches.push(n); }
    for (const e of r.consoleErrors) if (S.consoleErrors.length < 50) S.consoleErrors.push({launch: n, msg: e});
    for (const e of res.errors || []) if (S.consoleErrors.length < 50) S.consoleErrors.push({launch: n, msg: e.msg, where: e.where});
    S.gameMs.push(...(res.timing?.gameMs || []));
    const row = {n, code: r.code, secs: r.secs, timedOut: r.timedOut, reason: res.reason || (r.timedOut ? 'killed' : 'no-result'), boot: res.boot, start: res.start, end: res.end || r.pt.filter(x => x.type === 'end').at(-1)?.data?.end,
      seasons: seasons.length, games: res.games?.length ?? r.pt.filter(x => x.type === 'game').length, minutes: res.minutes, sizesAtStart: res.sizesAtStart, sizesAtEnd: res.sizesAtEnd, exception: res.exception, stop: res.stop, trainClicks: res.trainClicks, youngSwaps: res.youngSwaps, clubEvents: res.clubEvents};
    S.launches.push(row); S.wallSec += r.secs; S.leagueHistory = res.leagueHistory || S.leagueHistory;
    // A launch that was killed (no result) loses its season rows; the save's league history still has rank and result.
    for (const h of S.leagueHistory || []) if (!S.seasons.some(s => s.season === h.season) && Number.isInteger(h.w)) {
      S.seasons.push({season: h.season, tier: h.tier, tierName: ['동네 리그', '지역 리그', '2부 리그', '1부 리그'][h.tier], rank: h.rank, pts: h.pts, w: h.w, d: h.d, l: h.l, rf: h.rf, ra: h.ra, diff: h.rf - h.ra, prize: h.prize, move: h.move, nextTier: h.nextTier, partial: true});
      S.seasons.sort((a, b) => a.season - b.season);
    }
    fs.appendFileSync(files.launches, JSON.stringify({...row, toasts: res.toasts, leftovers: res.leftovers, events: (res.events || []).slice(-80)}) + '\n');
    const games = res.games?.length ? res.games : r.pt.filter(x => x.type === 'game').map(x => x.data).filter(Boolean);
    if (games.length) fs.appendFileSync(path.join(opts.out, user + '.games.jsonl'), games.map(g => JSON.stringify(g)).join('\n') + '\n');
    console.log(`[${user}] launch ${n}: ${row.reason} · seasons ${seasons.length} · games ${row.games} · ${r.secs}s · end ${JSON.stringify(row.end && {season: row.end.season, tier: row.end.tier, phase: row.end.phase, funds: row.end.funds})}`);
    if (row.end) expect = row.end;
    // reached tiers from the league history (the season whose end moved the club up)
    for (const h of S.leagueHistory || []) if (['up', 'champion'].includes(h.move)) { const k = h.move === 'champion' ? 'title' : String(h.nextTier); S.reached[k] ??= h.season; }
    S.reason = row.reason;
    fs.writeFileSync(files.summary, JSON.stringify(S, null, 1));
    fs.writeFileSync(files.seasons, S.seasons.map(s => JSON.stringify(s)).join('\n') + '\n');
    if (['goal', 'cap'].includes(row.reason)) break;
    if (['stuck', 'exception', 'killed', 'no-result', 'error'].includes(row.reason)) { if (++stuckRuns >= 2) break; } else stuckRuns = 0;
  }
  console.log(`[${user}] done: ${S.reason} · reached ${JSON.stringify(S.reached)} · ${S.seasons.length} seasons · ${Math.round(S.wallSec / 60)} min`);
})();
