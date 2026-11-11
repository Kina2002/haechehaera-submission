#!/usr/bin/env node
// Summarizes a results folder made by run-user.cjs / run-all.cjs.
//   node summarize.cjs <results folder>   → writes summary-all.json and summary-all.md there and prints the overview table.
'use strict';
const fs = require('node:fs'), path = require('node:path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, 'results-latest'));
const order = ['thrifty', 'normal', 'aggressive', 'youth', 'star', 'normal_ticket'];
const users = fs.readdirSync(dir).filter(f => f.endsWith('.summary.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  .sort((a, b) => (order.indexOf(a.user) + 99) % 99 - (order.indexOf(b.user) + 99) % 99);
const man = n => n == null ? '-' : (Math.round(n) >= 10000 ? (Math.floor(Math.round(n) / 10000) + '억 ' + (Math.round(n) % 10000 ? (Math.round(n) % 10000).toLocaleString('ko-KR') + '만' : '')).trim() : Math.round(n).toLocaleString('ko-KR') + '만');
const tierShort = ['동네', '지역', '2부', '1부'];
// Results made before 2026-11-12 02:45 stored the tier after the move in "tier"; the league name is always the season's own.
for (const u of users) for (const s of u.seasons) { const i = ['동네 리그', '지역 리그', '2부 리그', '1부 리그'].indexOf(s.tierName); if (i >= 0) s.tier = i; }
function overview(u) {
  const S = u.seasons, last = S.at(-1) || {}, end = u.launches.at(-1)?.end || last;
  const tickets = Math.max(0, ...S.map(s => (s.tickets || 0) + (s.ticketsUsed || 0)), (end.tickets || 0) + (end.ticketsUsed || 0));
  const games = u.gameMs || [];
  return {user: u.user, label: u.label, reason: u.reason, seasons: S.length, reached: u.reached || {},
    disbands: end.disbands ?? last.disbands ?? 0, loans: end.loans ?? last.loans ?? 0, mlb: end.mlb ?? last.mlb ?? 0, mlbTries: end.mlbTries ?? last.mlbTries ?? 0,
    ticketsGot: tickets, ticketsUsed: end.ticketsUsed ?? last.ticketsUsed ?? 0, forfeits: end.forfeits ?? 0, finalFunds: end.funds ?? last.funds, finalTier: end.tier ?? last.nextTier,
    stadium: end.stadium, facilities: end.facilities, wallMin: Math.round((u.wallSec || 0) / 60), launches: u.launches.length,
    gameSec: games.length ? +(games.reduce((a, b) => a + b, 0) / games.length / 1000).toFixed(1) : null,
    maxSave: Math.max(0, ...S.map(s => s.saveChars || 0)), findings: Object.keys(u.findings || {}).length, consoleErrors: (u.consoleErrors || []).length};
}
const rows = users.map(overview);
let md = '# 플레이 시험 요약 · ' + path.basename(dir) + '\n\n';
md += '| 유저 | 끝난 이유 | 시즌 | 지역 | 2부 | 1부 | 해체 | 대출 | MLB 성공/도전 | 회생권 받음/씀 | 부전패 | 마지막 자금 | 경기장 | 경기당 초 |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for (const r of rows) md += `| ${r.label} | ${r.reason} | ${r.seasons} | ${r.reached['1'] ?? '-'} | ${r.reached['2'] ?? '-'} | ${r.reached['3'] ?? '-'} | ${r.disbands} | ${r.loans} | ${r.mlb}/${r.mlbTries} | ${r.ticketsGot}/${r.ticketsUsed} | ${r.forfeits} | ${man(r.finalFunds)} | ${r.stadium ?? '-'} | ${r.gameSec ?? '-'} |\n`;
md += '\n지역·2부·1부 칸은 그 리그로 올라가게 된 시즌 번호입니다(그 시즌이 끝난 뒤 승격).\n';
for (const u of users) {
  md += '\n## ' + u.label + ' (' + u.user + ')\n\n| 시즌 | 리그 | 순위 | 승-무-패 | 득실 | 결과 | 여론 | 자금 | 급여/경기 | 선발 평균 | 평균 나이 | 선수 | MLB | 회생권 | 대출 | 해체 | 경기장 | 시설 |\n|---:|---|---:|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|\n';
  const v = x => x ?? '-';// rows rebuilt from the league history (a killed launch) only have the league columns
  for (const s of u.seasons) md += `| ${s.season}${s.partial ? '*' : ''} | ${tierShort[s.tier]} | ${s.rank} | ${s.w}-${s.d}-${s.l} | ${s.diff > 0 ? '+' : ''}${s.diff} | ${s.move} | ${v(s.opinionEnd)} | ${man(s.funds)} | ${man(s.wages)} | ${v(s.startersMean)} | ${v(s.meanAge)} | ${v(s.roster)} | ${v(s.mlb)} | ${v(s.tickets)} | ${v(s.loans)} | ${v(s.disbands)} | ${v(s.stadium)} | ${(s.facilities || []).join(' ')} |\n`;
  if (u.seasons.some(s => s.partial)) md += '\n\\* 실행이 중간에 끊겨 리그 기록(순위·승무패·결과)만 남은 시즌입니다.\n';
}
const allFindings = {};
for (const u of users) for (const f of Object.values(u.findings || {})) { const g = allFindings[f.id] ??= {id: f.id, cat: f.cat, text: f.text, users: {}, first: f.first}; g.users[u.user] = f.count; }
md += '\n## 시험 중 자동으로 잡힌 것\n\n| 종류 | 내용 | 유저(횟수) |\n|---|---|---|\n';
for (const f of Object.values(allFindings).sort((a, b) => a.cat.localeCompare(b.cat))) md += `| ${f.cat} | ${f.text.replace(/\|/g, '/')} | ${Object.entries(f.users).map(([k, v]) => k + '(' + v + ')').join(' ')} |\n`;
fs.writeFileSync(path.join(dir, 'summary-all.md'), md);
fs.writeFileSync(path.join(dir, 'summary-all.json'), JSON.stringify({made: new Date().toISOString(), overview: rows, findings: Object.values(allFindings)}, null, 1));
console.log(md.split('\n').slice(0, 10).join('\n'));
