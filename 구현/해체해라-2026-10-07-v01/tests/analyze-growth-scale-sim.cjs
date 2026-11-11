// 경기 경험치 전체 배수 확인 시험 요약 (run-economy-sim.cjs shape t4g10p12·t4g10p125·t4g10p135, 2026-11-11).
// 사용: node tests/analyze-growth-scale-sim.cjs <결과 폴더> [요약.json]
// 결과 폴더의 shape-<모양><묶음>-<유저>.json을 읽습니다. 묶음 표시는 없음(a: world 20261130·구단 21000) 또는 b(20261150·22000)입니다.
// 맨 위 리그 도달은 analyze-league-shape-sim.cjs와 같은 기준(처음으로 다음 시즌 리그가 1부가 된 시즌)입니다.
const fs = require('fs'), path = require('path');
const [dir, out] = process.argv.slice(2);
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0, r1 = x => x == null ? null : Math.round(10 * x) / 10;
const NAME = { thrifty: '아끼는', normal: '보통', aggressive: '무리하는' };
const files = fs.readdirSync(dir).filter(f => /^shape-.*\.json$/.test(f));
const cells = {};
for (const f of files) {
  const m = f.match(/^shape-(t4g10p\d+)(b?)-(\w+)\.json$/); if (!m) continue;
  const [, shape, grp, pk] = m, r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const key = `${shape}:${pk}`, c = cells[key] ??= { shape, shapeName: r.shapeName, persona: pk, groups: [], logs: [] };
  c.groups.push(grp || 'a'); c.logs.push(...r.results.map(log => ({ grp: grp || 'a', log })));
}
const summarize = list => {
  const n = list.length, top = [], reach2 = [], s25 = [], disb = [], mlb = [], ropeTop = [];
  let topSeasons = 0, seasons = 0, rel = 0, firstRel = 0;
  for (const { log } of list) {
    const ft = log.find(l => l.nextTier === 3)?.season, f2 = log.find(l => l.nextTier >= 2 && !l.disbanded)?.season;
    if (ft != null) top.push(ft); if (f2 != null) reach2.push(f2);
    s25.push(log.at(-1).starterMean); disb.push(log.at(-1).disbands || 0); mlb.push(log.at(-1).mlbCount || 0);
    log.forEach((l, i) => { seasons++; if (l.tier === 3) topSeasons++;
      if (l.tier === 3 && l.nextTier === 2 && !l.disbanded) { rel++; if (i > 0 && log[i - 1].tier === 2) firstRel++; } });
  }
  return { clubs: n, topReachPct: pct(top.length, n), topReachMedianSeason: median(top), reach2Pct: pct(reach2.length, n), reach2MedianSeason: median(reach2),
    starter25: r1(median(s25)), disbandAnyPct: pct(disb.filter(x => x > 0).length, n), mlbPerClub: r1(mlb.reduce((a, b) => a + b, 0) / n),
    topSeasonPct: pct(topSeasons, seasons), topFirstSeasonRelegationPct: pct(firstRel, rel) };
};
const summary = { version: '2026-11-11-growth-scale-v01', cells: {} };
for (const [key, c] of Object.entries(cells).sort()) {
  summary.cells[key] = { shape: c.shape, shapeName: c.shapeName, persona: c.persona, groups: c.groups.sort().join('+'),
    all: summarize(c.logs), a: summarize(c.logs.filter(x => x.grp === 'a')), b: summarize(c.logs.filter(x => x.grp === 'b')) };
}
for (const pk of ['normal', 'thrifty', 'aggressive']) {
  const rows = Object.values(summary.cells).filter(c => c.persona === pk); if (!rows.length) continue;
  console.log(`\n## ${NAME[pk]} 유저`);
  for (const c of rows) for (const g of ['a', 'b', 'all']) { const s = c[g]; if (!s.clubs) continue;
    console.log(`${c.shapeName.padEnd(28)} [${g === 'all' ? c.groups : g}] ${s.clubs}구단 · 1부 도달 ${s.topReachPct}% (중앙값 ${s.topReachMedianSeason ?? '-'}시즌) · 2부 ${s.reach2Pct}% (${s.reach2MedianSeason ?? '-'}) · 25시즌 출전 ${s.starter25} · 해체 ${s.disbandAnyPct}% · MLB ${s.mlbPerClub} · 1부 시즌 ${s.topSeasonPct}% · 1부 첫시즌 강등 ${s.topFirstSeasonRelegationPct}%`); }
}
if (out) { fs.writeFileSync(out, JSON.stringify(summary, null, 1) + '\n'); console.log('\n요약 저장', out); }
