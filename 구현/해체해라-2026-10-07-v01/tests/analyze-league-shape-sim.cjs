// 리그 모양 비교(run-economy-sim.cjs shape) 결과를 요약합니다.
// 사용: node tests/analyze-league-shape-sim.cjs <결과 폴더> [요약.json]
// 결과 폴더에는 shape-<t4g10|t5g10|t4g20|t5g20>-<thrifty|normal|aggressive>.json이 있어야 합니다.
const fs = require('fs'), path = require('path');
const dir = process.argv[2], out = process.argv[3];
const SHAPES = ['t4g10', 't5g10', 't4g20', 't5g20'], PERSONAS = ['thrifty', 'normal', 'aggressive'];
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0;
const summary = { version: '2026-11-11-league-shape-v01', cells: {} };

for (const sh of SHAPES) for (const pk of PERSONAS) {
  const f = path.join(dir, `shape-${sh}-${pk}.json`);
  if (!fs.existsSync(f)) { console.log('없음', f); continue; }
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  const TOP = r.tiers - 1, G = r.gamesPerSeason, sameGames = Math.floor(240 / G);
  const clubs = r.results, n = clubs.length;
  let promos = 0, relegs = 0, elev = 0, seasons = 0, tieFirst = 0, tieLast = 0, topSeasons = 0, streak = 0, firstRanks = 0, firstTies = 0;
  const reachTop = [], reachTop2 = [], reach1 = [], disb = [], mlb = [], finalTier = Array(r.tiers).fill(0);
  for (const log of clubs) {
    let firstTop = null, first1 = null;
    log.forEach((l, i) => {
      seasons++;
      if (l.tier === TOP) topSeasons++;
      if (l.tieFirst) tieFirst++;
      if (l.tieLast) tieLast++;
      if (l.rank === 1) { firstRanks++; if (l.tieFirst) firstTies++; }
      const promo = !l.disbanded && l.nextTier > l.tier, releg = !l.disbanded && l.nextTier < l.tier;
      if (promo) { promos++; const nx = log[i + 1]; if (nx && !nx.disbanded && nx.nextTier < nx.tier) elev++; }
      if (releg) relegs++;
      if (firstTop == null && l.nextTier === TOP) firstTop = l.season;
      if (first1 == null && l.nextTier >= 1) first1 = l.season;
    });
    if (firstTop != null) reachTop.push(firstTop);
    if (firstTop != null && firstTop <= sameGames) reachTop2.push(firstTop);
    if (first1 != null) reach1.push(first1);
    const last = log.at(-1);
    disb.push(last.disbands || 0); mlb.push(last.mlbCount || 0); streak += last.streakHits || 0;
    finalTier[last.nextTier]++;
  }
  const cell = {
    shape: sh, shapeName: r.shapeName, persona: pk, personaName: r.personaName, clubs: n, seasons: r.seasons, gamesPerSeason: G,
    topReachPct: pct(reachTop.length, n), topReachMedianSeason: median(reachTop),
    topReachSameGamesPct: pct(reachTop2.length, n), sameGamesSeasons: sameGames,
    firstPromoMedianSeason: median(reach1),
    promotionsPerClub: Math.round(10 * promos / n) / 10, relegationsPerClub: Math.round(10 * relegs / n) / 10,
    movesPer100Games: Math.round(100 * (promos + relegs) / (seasons * G) * 100) / 100,
    elevatorPct: pct(elev, promos),
    disbandAnyPct: pct(disb.filter(x => x > 0).length, n), disbandsPerClub: Math.round(100 * disb.reduce((a, b) => a + b, 0) / n) / 100,
    tieFirstSeasonPct: pct(tieFirst, seasons), tieLastSeasonPct: pct(tieLast, seasons), firstPlaceByTiePct: pct(firstTies, firstRanks),
    topLeagueSeasonPct: pct(topSeasons, seasons), streakHitsPerClub: Math.round(100 * streak / n) / 100,
    mlbPerClub: Math.round(10 * mlb.reduce((a, b) => a + b, 0) / n) / 10,
    finalTierPct: finalTier.map(x => pct(x, n)),
  };
  summary.cells[`${sh}:${pk}`] = cell;
}

const rows = [
  ['맨 위 리그 도달 (25시즌)', c => `${c.topReachPct}% · ${c.topReachMedianSeason ?? '-'}시즌`],
  ['맨 위 리그 도달 (같은 240경기)', c => `${c.topReachSameGamesPct}% (${c.sameGamesSeasons}시즌까지)`],
  ['처음 승격 (중앙값)', c => `${c.firstPromoMedianSeason ?? '-'}시즌`],
  ['승격 · 강등 (구단당 25시즌)', c => `${c.promotionsPerClub} · ${c.relegationsPerClub}`],
  ['승강 (100경기당)', c => `${c.movesPer100Games}`],
  ['승격 바로 다음 시즌 강등', c => `${c.elevatorPct}%`],
  ['해체 1번 이상 · 구단당', c => `${c.disbandAnyPct}% · ${c.disbandsPerClub}`],
  ['1위 자리 동률 시즌', c => `${c.tieFirstSeasonPct}%`],
  ['1위 중 동률로 갈린 비율', c => `${c.firstPlaceByTiePct}%`],
  ['6위 자리 동률 시즌', c => `${c.tieLastSeasonPct}%`],
  ['맨 위 리그에서 보낸 시즌', c => `${c.topLeagueSeasonPct}%`],
  ['동네 연속 6위 +10 (구단당)', c => `${c.streakHitsPerClub}`],
  ['MLB 진출 (구단당)', c => `${c.mlbPerClub}`],
  ['25시즌 뒤 리그 분포', c => c.finalTierPct.join(' / ')],
];
for (const pk of PERSONAS) {
  const cells = SHAPES.map(sh => summary.cells[`${sh}:${pk}`]).filter(Boolean);
  if (!cells.length) continue;
  console.log(`\n## ${cells[0].personaName}\n`);
  console.log('| 항목 | ' + cells.map(c => c.shapeName).join(' | ') + ' |');
  console.log('|---|' + cells.map(() => '---:').join('|') + '|');
  for (const [label, fmt] of rows) console.log(`| ${label} | ` + cells.map(fmt).join(' | ') + ' |');
}
if (out) { fs.writeFileSync(out, JSON.stringify(summary, null, 1) + '\n'); console.log('\n요약 저장', out); }
