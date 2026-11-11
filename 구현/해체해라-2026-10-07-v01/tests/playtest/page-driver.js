// Playtest page driver (2026-11-12). Runs INSIDE the game page through the desktop app's self-check:
//   electron.exe <repo>\desktop --data-dir=<folder> --self-check=<png> --self-check-script=<this file with CFG on top>
// The file is the body of an async function (the app wraps it in "(async()=>{ ... })()").
// run-user.cjs prepends one line: const CFG={user,persona,goal,maxSeasons,chunkSeasons,maxMinutes,launch,...};
// It plays the real game like a user: it clicks the real buttons (new game, lineup, match start, skip, re-sign dialog,
// market, training, facilities, stadium, MLB offer, reward choice, revival ticket, loan, retirement, next season) and
// only calls a game function when no reasonable UI path exists; every such call is recorded as a "fallback" finding.
// The save stays in the data folder, so the next launch continues where this one stopped.
const P = CFG.persona;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = performance.now();
const R = {v: 1, user: CFG.user, launch: CFG.launch, started: Date.now(), games: [], seasons: [], offseasons: {}, offseasonSnap: {}, events: [], findings: {}, errors: [], toasts: [], stop: null, timing: {gameMs: [], offseasonMs: []}, start: null, end: null};
const now = () => Math.round(performance.now() - T0);
const out = (type, data) => { try { console.log('PT|' + type + '|' + JSON.stringify(data)); } catch (e) { /* ignore */ } };
function ev(kind, text, data) { const e = {kind, text, season: team()?.league?.season ?? null, round: team()?.league?.round ?? null, t: now(), ...(data ? {data} : {})}; R.events.push(e); out('event', e); return e; }
// Findings are de-duplicated by id; the first sample and a count are kept.
function finding(id, cat, text, data) {
  const f = R.findings[id] ??= {id, cat, text, count: 0, first: {season: team()?.league?.season ?? null, round: team()?.league?.round ?? null, data: data ?? null}};
  f.count++; if (f.count <= 3) out('finding', {id, cat, text, count: f.count, data});
  return f;
}
const fallback = (id, text, data) => finding('fallback:' + id, 'fallback', text, data);

// ---- errors and toasts ----
window.addEventListener('error', e => { R.errors.push({t: now(), msg: String(e.message).slice(0, 300)}); out('error', {msg: String(e.message).slice(0, 300)}); });
window.addEventListener('unhandledrejection', e => { R.errors.push({t: now(), msg: 'rejection: ' + String(e.reason).slice(0, 300)}); });
let lastToast = '', runtimeSeen = (typeof runtimeErrors !== 'undefined' ? runtimeErrors.length : 0);
const toastEl = document.querySelector('#toast');
if (toastEl) new MutationObserver(() => { const s = toastEl.textContent; if (s && s !== lastToast) { lastToast = s; R.toasts.push({t: now(), s: s.slice(0, 160), season: team()?.league?.season, round: team()?.league?.round}); if (R.toasts.length > 400) R.toasts.splice(0, 100); } }).observe(toastEl, {childList: true, characterData: true, subtree: true});
function checkRuntimeErrors(where) {
  if (typeof runtimeErrors === 'undefined') return;
  while (runtimeSeen < runtimeErrors.length) { const msg = String(runtimeErrors[runtimeSeen++]); R.errors.push({t: now(), where, msg: msg.slice(0, 300)}); finding('runtime:' + msg.slice(0, 60), 'error', '게임이 기록한 화면 오류: ' + msg.slice(0, 200), {where}); }
}

// ---- DOM helpers (real buttons only) ----
const $1 = (sel, root = document) => root.querySelector(sel);
const $all = (sel, root = document) => [...root.querySelectorAll(sel)];
const shown = el => !!el && (el.offsetParent !== null || !!el.closest('dialog[open]') || el.closest('.entrance-overlay') !== null);
const btn = (sel, root = document) => $all(sel, root).find(b => shown(b) && !b.disabled) || null;
const anyBtn = (sel, root = document) => $all(sel, root).find(shown) || null;
async function press(el, wait = 25) { if (!el || el.disabled) return false; el.click(); await sleep(wait); checkRuntimeErrors('click'); return true; }
async function waitFor(fn, ms = 30000, step = 50) { const end = performance.now() + ms; while (performance.now() < end) { try { if (fn()) return true; } catch (e) { /* keep waiting */ } await sleep(step); } return false; }
const appText = (n = 400) => ($1('#app')?.innerText || '').replace(/\s+/g, ' ').slice(0, n);
async function nav(where) {
  await settle();
  const b = $all('#header nav [data-go="' + where + '"]').find(x => !x.disabled) || btn('[data-go="' + where + '"]');
  if (b) { await press(b); if (screen === where) return true; }
  fallback('nav-' + where, '"' + where + '" 화면으로 가는 버튼을 누를 수 없어 go()를 불렀습니다.', {screen, toast: lastToast});
  go(where); await sleep(20); return screen === where;
}

// ---- state reading (what the screen shows) ----
const T = () => team();
const L = () => team()?.league;
const mean9 = p => meanAbility(p);
const starters = t => (t.lineup || []).map(x => t.players.find(p => p.id === x.id)).filter(Boolean);
function costPerGame(t) { try { return operatingBudget(t).total; } catch (e) { return t.players.reduce((s, p) => s + p.salary, 0); } }
function reserve(t) { return Math.round(P.reserveGames * costPerGame(t)); }
function stadiumSavings(t) {
  const lg = t.league; if (!lg || P.saveForStadium === 'never') return 0;
  const need = LEAGUE.stadiumNeed[Math.min(3, lg.tier + 1)] || 1; if (lg.tier >= 3 || t.stadium >= need) return 0;
  if (P.saveForStadium === 'late') { const us = leagueStandings(lg).find(r => r.id === 'us'); if (!(lg.phase === 'season' && lg.round >= 5 && us?.rank === 1) && !lg.pendingPromotion) return 0; }
  if (lg.tier === 0 && P.saveForStadium !== 'early') return 0;
  let sum = 0; for (let g = t.stadium; g < need; g++) sum += LEAGUE.stadiumCost[g] || 0; return sum;
}
const spare = t => t.funds - reserve(t) - stadiumSavings(t);
function tierOf(t) { return t.league?.tier ?? 0; }
function snapshot(t = T()) {
  const lg = t.league, st = starters(t);
  return {season: lg?.season, tier: lg?.tier, phase: lg?.phase, round: lg?.round, funds: Math.round(t.funds), debt: Math.round(t.debt || 0), opinion: Math.round(t.opinion?.value ?? 0), roster: t.players.length,
    startersMean: st.length ? +(st.reduce((s, p) => s + mean9(p), 0) / st.length).toFixed(1) : null, rosterMean: +(t.players.reduce((s, p) => s + mean9(p), 0) / Math.max(1, t.players.length)).toFixed(1),
    meanAge: +(t.players.reduce((s, p) => s + (p.age || 0), 0) / Math.max(1, t.players.length)).toFixed(1), stadium: t.stadium,
    facilities: t.facilities.map(id => id + (facilityLevel(t, id) > 1 ? ':' + facilityLevel(t, id) : '')), tickets: t.mlbSupport?.tickets ?? 0, ticketsUsed: t.mlbSupport?.used?.length ?? 0,
    mlb: (t.mlbHistory || []).filter(h => h.success).length, mlbTries: (t.mlbHistory || []).length, loans: t.opinion?.loans ?? 0, loanLeft: Math.round(t.loan?.left || 0), disbands: t.opinion?.disbands ?? 0, forfeits: t.opinion?.forfeits ?? 0,
    wages: Math.round(t.players.reduce((s, p) => s + p.salary, 0)), upkeep: Math.round(facilityUpkeepTotal(t, null)), loyaltyMean: Math.round(t.players.reduce((s, p) => s + p.loyalty, 0) / Math.max(1, t.players.length)),
    left: (t.departed || []).reduce((o, p) => { const k = p.departureKind || 'loyalty0'; o[k] = (o[k] || 0) + 1; return o; }, {}), trainClicks: R.trainClicks || 0,
    charCache: typeof charCache !== 'undefined' ? charCache.size : null, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null};
}
function saveSizes() { try { return {main: (localStorage.getItem(KEY) || '').length, lastGood: (localStorage.getItem(KEY + '.last-good') || '').length, keys: Object.keys(localStorage).length}; } catch (e) { return {error: String(e)}; } }
function checkSave(where) {
  try { validateTeam(clone(team())); } catch (e) { finding('validate:' + String(e.message).slice(0, 50), 'bug', '저장 검사(validateTeam) 실패: ' + e.message, {where}); }
  if (typeof saveError !== 'undefined' && saveError) finding('save-error', 'bug', '저장 실패 표시: ' + saveError, {where, sizes: saveSizes()});
  const t = team(); if (!Number.isFinite(t.funds) || t.funds < 0) finding('funds-negative', 'bug', '자금이 음수 또는 숫자가 아님: ' + t.funds, {where});
}

// ---- dialogs and overlays (answered like a user) ----
async function settle(depth = 0) {
  for (let i = 0; i < 25; i++) {
    checkRuntimeErrors('settle');
    // Entrance overlay: "바로 경기로 ▶" (a hidden window never paints, so the 5.4 s animation would never end by itself).
    const ent = $1('.entrance-overlay [data-entrance="skip"]'); if (ent) { await press(ent); continue; }
    // Tutorial: "안내 건너뛰기".
    const tut = btn('[data-tutorial="skip"]'); if (tut) { await press(tut); ev('tutorial', '첫 경기 안내 건너뛰기'); continue; }
    const club = $1('.club-event-dialog[open] [data-club-event-close]'); if (club) { const title = $1('.club-event-dialog[open] h2')?.textContent || ''; await press(club); if ($1('.club-event-dialog[open]')) await press($1('.club-event-dialog[open] [data-club-event-close]')); R.clubEvents = (R.clubEvents || 0) + 1; if (R.clubEvents <= 5) ev('club-event', title.slice(0, 60)); continue; }
    const rev = $1('dialog.revival-dialog[open]'); if (rev) { await answerRevival(rev); continue; }
    const rew = $1('dialog.mlb-reward-dialog[open]'); if (rew) { await answerReward(rew); continue; }
    const mlbDis = $1('dialog.mlb-dialog[open] [data-mlb-dismiss]'); if (mlbDis && !$1('dialog.mlb-dialog[open] [data-mlb-confirm]')) { await press(mlbDis); continue; }
    const dlg = $1('#dialog[open]');
    if (dlg) {
      const title = dlg.querySelector('h2')?.textContent || '';
      finding('dialog:' + title.slice(0, 30), 'info', '예상하지 않은 창을 닫음: ' + title, {text: dlg.innerText.slice(0, 200)});
      const close = dlg.querySelector('[data-action="close-dialog"]'); if (close) await press(close); else dlg.close();
      continue;
    }
    const ach = btn('.achievement-notice [data-ach-dismiss]'); if (ach) { await press(ach); continue; }
    if ($1('dialog[open]')) { const d = $1('dialog[open]'); finding('dialog-other:' + d.className, 'info', '처리하지 못한 창: ' + d.className, {text: d.innerText.slice(0, 200)}); d.close(); continue; }
    return true;
  }
  finding('settle-loop', 'stuck', '창을 25번 닫아도 계속 열림', {screen, dialogs: $all('dialog[open]').map(d => d.className + ':' + d.innerText.slice(0, 80))});
  return false;
}
async function answerReward(el) {
  const t = T(), h = pendingMlbReward(t), op = t.opinion?.value ?? 0;
  let kind = P.reward === 'ability' ? 'ability' : op >= 50 ? 'opinion' : 'ability';
  let b = btn('[data-mlb-reward="' + kind + '"]', el);
  if (!b) { for (const k of ['ability', 'opinion', 'loyalty']) { b = btn('[data-mlb-reward="' + k + '"]', el); if (b) { kind = k; break; } } }
  const preview = $all('.mlb-reward-option', el).map(x => x.innerText.replace(/\s+/g, ' ').slice(0, 120));
  if (!b) { finding('reward-nobutton', 'stuck', 'MLB 진출 보상 창에 누를 수 있는 보기가 없음', {preview}); el.close(); return; }
  await press(b, 40);
  ev('mlb-reward', (h?.player?.name || '?') + ' 진출 보상: ' + kind, {preview: preview[['opinion', 'loyalty', 'ability'].indexOf(kind)], opinion: Math.round(op)});
}
async function answerRevival(el) {
  const t = T(), P2 = t.mlbSupport?.pending, tickets = t.mlbSupport?.tickets || 0;
  let use = P2?.kind === 'disband' ? P.ticketDisband !== false : (P.ticketRelegation === 'always' || tickets >= (P.ticketRelegation || 2));
  const text = el.innerText.replace(/\s+/g, ' ').slice(0, 300);
  const b = btn('[data-revival-choice="' + (use ? 'use' : 'proceed') + '"]', el);
  if (!b) { finding('revival-nobutton', 'stuck', '회생권 창에 버튼이 없음', {text}); return; }
  await press(b, 40);
  if (!use && P2?.kind === 'disband') { const again = btn('dialog.revival-dialog[open] [data-revival-choice="proceed"]'); if (again) await press(again, 40); }
  ev('revival', (P2?.kind === 'disband' ? '해체' : '강등') + ' 판정 · 회생권 ' + (use ? '사용' : '쓰지 않음') + ' (가진 회생권 ' + tickets + '장)', {text: text.slice(0, 160)});
}

// ---- new game ----
async function bootGame() {
  if (activeGame && team()) return 'active';
  if (data.slots[0]) {
    await press(btn('[data-action="load-slot"][data-i="0"]'));
    await press(btn('#dialog [data-action="confirm-dialog"]'));
    await waitFor(() => activeGame, 5000);
    return activeGame ? 'loaded' : 'load-failed';
  }
  await press(btn('[data-action="new-slot"][data-i="0"]'));
  const name = $1('#teamName'); if (name) name.value = CFG.teamName || P.teamName || '시험 구단';
  await press(btn('[data-action="create-team"]'));
  await waitFor(() => activeGame && screen === 'home', 5000);
  // "⚾ 바로 시작" → names/numbers (defaults) → lineup (tutorial: skip) → auto lineup; the first game starts in playGame().
  await press(btn('#app [data-action="start"]'));
  await press(btn('[data-action="setup-next"]'));
  await settle();
  ev('new-game', '새 구단 · ' + team().name + ' · 선수 ' + team().players.length + '명 · 자금 ' + money(team().funds));
  return 'new';
}

// ---- management actions (all through the real screens) ----
async function resignAll() {
  const t = T(); let n = 0;
  const todo = () => T().players.filter(p => !(p.contract > 0));
  if (!todo().length) return 0;
  await nav('finance');
  for (let guard = 0; guard < 40 && todo().length; guard++) {
    const p = todo()[0], open = btn('[data-contract-open="' + p.id + '"]');
    if (!open) { fallback('resign-button', '재정 화면에 ' + p.name + ' 협상 버튼이 없어 negotiate()를 직접 불렀습니다.'); negotiate(p, Math.round(salaryAsk(p) * (P.wageMul || 1))); save(); continue; }
    await press(open);
    const input = $1('#salaryOffer26'); const ask = salaryAsk(p), offer = Math.min(10000, Math.max(1, Math.ceil(ask * (P.wageMul || 1))));
    if (!input) { finding('resign-noinput', 'bug', '협상 창에 금액 칸이 없음'); break; }
    input.value = String(offer * 10000);
    await press(btn('#dialog [data-contract-offer="' + p.id + '"]'), 30);
    n++;
    if (p.contract > 0 !== true && T().players.includes(p)) { finding('resign-failed', 'bug', '재계약 제안 뒤에도 계약이 0', {name: p.name, toast: lastToast}); break; }
  }
  if (n) ev('resign', n + '명 재계약 (희망급여 ×' + (P.wageMul || 1) + ')');
  return n;
}
function hireScore(p) { let s = mean9(p); if (P.preferYoung) s += Math.max(0, 25 - (p.age || 25)) * P.preferYoung; return s; }
async function hireUntil(target, budgetFn, why) {
  let hired = 0;
  for (let guard = 0; guard < 12 && T().players.length < target; guard++) {
    if (screen !== 'market') await nav('market');
    const t = T(), money0 = budgetFn(t);
    const cands = (t.market || []).filter(p => p.price <= money0).sort((a, b) => hireScore(b) - hireScore(a));
    if (!cands.length) {
      // A paid refresh (100만) only when ten players are missing and there is money for a cheap recruit after it.
      if (t.players.length < 10 && t.funds > MARKET_REFRESH_COST * 5 && (R.refreshes = (R.refreshes || 0) + 1) < 40) { await press(btn('[data-v8="market-refresh"]')); ev('market-refresh', '후보 새로 찾기 (선수 ' + t.players.length + '명)'); continue; }
      break;
    }
    const p = cands[0], b = btn('[data-v8="hire"][data-id="' + p.id + '"]');
    if (!b) { finding('hire-disabled', 'info', '영입 버튼이 꺼져 있음', {price: p.price, funds: t.funds, toast: lastToast}); break; }
    await press(b, 30); hired++;
    ev('hire', why + ' · ' + p.name + '(' + p.age + '세, 평균 ' + mean9(p).toFixed(1) + ') ' + money(p.price), {age: p.age, mean: +mean9(p).toFixed(1), price: p.price});
  }
  return hired;
}
async function fillRoster() {
  const t = T();
  // Academy prospect first (free).
  const pr = t.facilityData?.academy?.prospect;
  if (pr && (P.academyAlways || t.players.length < 12)) { await nav('market'); const b = btn('[data-facility-act="academy-hire"]'); if (b) { await press(b); ev('academy', '아카데미 유망주 영입 ' + pr.name + '(' + pr.age + '세, 평균 ' + mean9(pr).toFixed(1) + ')'); } }
  // To 10 at any cost (needed to play), to 12 keeping one game of costs.
  if (T().players.length < 10) await hireUntil(10, t => t.funds, '10명 채우기');
  if (T().players.length < 12) await hireUntil(12, t => t.funds - costPerGame(t), '12명 채우기');
  // Better players while money is spare (not the thrifty user).
  if (P.upgradeHire && T().players.length < P.maxRoster) {
    const t2 = T(), st = starters(t2), weakest = st.length ? Math.min(...st.map(mean9)) : 0;
    const good = (t2.market || []).filter(p => mean9(p) >= weakest + P.upgradeHire && p.price <= spare(t2));
    if (good.length) { if (screen !== 'market') await nav('market'); await hireUntil(T().players.length + 1, t => spare(t), '보강'); }
  }
}
// Facility plan: [id, level] in order; unaffordable item → stop (save for it); no slot → skip to the next item.
async function buildFacilities() {
  let done = 0;
  for (const [id, lv] of P.facilities) {
    const t = T(), have = facilityLevel(t, id);
    if (have >= lv) continue;
    const def = facilityDef(id);
    const price = have === 0 ? facilityPrice(def) : facilityUpgradeCost(t, id);
    if (have === 0 && t.facilities.length >= facilitySlots(t)) continue;
    if (have > 0 && have < lv - 1) continue;
    if (t.funds - price < reserve(t) + stadiumSavings(t)) break;
    if (screen !== 'facilities') await nav('facilities');
    const b = have === 0 ? btn('[data-v8="build"][data-id="' + id + '"]') : btn('[data-facility-act="level"][data-id="' + id + '"]');
    if (!b) { const any = anyBtn((have === 0 ? '[data-v8="build"]' : '[data-facility-act="level"]') + '[data-id="' + id + '"]'); finding('facility-button-' + id, 'info', def.name + ' 버튼을 누를 수 없음: ' + (any?.title || '버튼 없음'), {funds: t.funds, price}); break; }
    await press(b, 30); done++;
    ev('facility', def.name + (have === 0 ? ' 건설' : ' ' + (have + 1) + '단계') + ' ' + money(price));
  }
  return done;
}
async function uiExpandStadium(reason) {
  const t = T(), cost = stadiumUpgradeCost(t);
  if (screen !== 'facilities') await nav('facilities');
  const b = btn('[data-v8="upgrade"]');
  if (!b) { const any = anyBtn('[data-v8="upgrade"]'); finding('expand-blocked', 'info', '경기장 확장 버튼이 꺼짐: ' + (any?.title || ''), {funds: t.funds, cost}); return false; }
  await press(b, 40);
  ev('stadium', '경기장 ' + T().stadium + '등급 확장 (' + reason + ') ' + money(cost));
  return true;
}
// Training: starters' key abilities with the facility, cheapest first, while spare money lasts.
function keyStats(t, p) { const slot = t.lineup.find(x => x.id === p.id); return slot?.pos === 'P' ? ['velocity', 'control'] : slot?.pos === 'DH' ? ['contact', 'power', 'eye'] : ['contact', 'power', 'eye', 'catch', 'throw']; }
async function train(maxClicks) {
  let clicks = 0;
  for (; clicks < maxClicks; clicks++) {
    const t = T(); let best = null;
    for (const p of starters(t)) for (const k of keyStats(t, p)) {
      const f = trainingFacility(k); if (!f || !t.facilities.includes(f[0])) continue;
      const c = costGrowth(p, k); if (!c) continue;
      if (!best || p.a[k] < best.v || (p.a[k] === best.v && c < best.c)) best = {p, k, c, v: p.a[k]};
    }
    if (!best || best.c > spare(t)) break;
    if (screen !== 'growth') await nav('growth');
    const sel = $1('#growthPlayer');
    if (sel && sel.value !== best.p.id) { sel.value = best.p.id; sel.dispatchEvent(new Event('change', {bubbles: true})); await sleep(20); }
    const b = btn('[data-v8="train"][data-stat="' + best.k + '"]');
    if (!b) { finding('train-disabled', 'info', '훈련 버튼이 꺼져 있음', {stat: best.k, funds: t.funds, cost: best.c}); break; }
    await press(b, 15);
  }
  if (clicks) { R.trainClicks = (R.trainClicks || 0) + clicks; }
  return clicks;
}
async function sendMlb() {
  if (!P.mlb) return 0;
  let sent = 0;
  for (let guard = 0; guard < 6; guard++) {
    const t = T(); if (pendingMlbReward(t) || t.mlbSupport?.pending) await settle();
    const cand = t.players.map(p => ({p, q: mlbQuote(t, p.id)})).filter(x => x.q?.eligible && x.q.chance >= (P.mlbMinChance || 0)).sort((a, b) => b.q.score - a.q.score)[0];
    if (!cand) break;
    await nav('players');
    const pick = btn('[data-action="select-player"][data-id="' + cand.p.id + '"]'); if (pick) await press(pick);
    const offer = btn('.mlb-profile [data-mlb-offer="' + cand.p.id + '"]') || btn('[data-mlb-offer="' + cand.p.id + '"]');
    if (!offer) { finding('mlb-offer-button', 'bug', 'MLB 제안 버튼을 찾지 못함', {name: cand.p.name}); break; }
    await press(offer, 40);
    const conf = btn('dialog.mlb-dialog[open] [data-mlb-confirm]');
    if (!conf) { finding('mlb-confirm-disabled', 'info', 'MLB 도전 버튼이 꺼짐', {reasons: cand.q.reasons}); await press(btn('dialog.mlb-dialog[open] [data-mlb-dismiss]')); break; }
    const before = (t.mlbHistory || []).length;
    await press(conf, 60);
    const h = (T().mlbHistory || [])[before];
    ev('mlb', cand.p.name + '(' + cand.p.age + '세 · ' + cand.q.role + ' ' + cand.q.score.toFixed(1) + ') MLB 도전 ' + (h?.success ? '성공 +' + money(h.fee) : '실패'), {chance: cand.q.chance, success: !!h?.success});
    sent += h?.success ? 1 : 0;
    await settle();
  }
  return sent;
}
async function supportRequests() {
  const t = T(); if (!(t.mlbHistory || []).some(h => h.success)) return 0;
  if (!((t.opinion?.value ?? 0) >= (P.supportAtOpinion ?? 60) || t.funds < reserve(t))) return 0;
  const list = mlbSuccessRecords(t).map(h => ({h, q: mlbSupportQuote(t, h)})).filter(x => x.q?.ok && !x.q.refuse && x.q.rate >= 0.2);
  if (!list.length) return 0;
  await nav('records');
  let n = 0;
  for (const {h, q} of list.slice(0, 2)) {
    const b = btn('[data-mlb-support="' + h.id + '"]'); if (!b) { finding('support-button', 'info', '후원 요청 버튼을 찾지 못함'); continue; }
    await press(b); await press(btn('#dialog [data-action="confirm-dialog"]'), 30); n++;
    ev('support', h.player.name + ' 후원 요청 ' + money(q.amount));
  }
  return n;
}
async function retireOld() {
  if (!P.retireAge) return 0;
  const t = T(), inLineup = new Set(t.lineup.map(x => x.id));
  const old = t.players.filter(p => !inLineup.has(p.id) && (p.age || 0) >= P.retireAge).sort((a, b) => b.age - a.age);
  let n = 0;
  for (const p of old) {
    if (T().players.length - 1 < (P.retireKeep || 11)) break;
    await nav('players');
    const pick = btn('[data-action="select-player"][data-id="' + p.id + '"]'); if (pick) await press(pick);
    const b = btn('[data-growth-retire="' + p.id + '"]');
    if (!b) { finding('retire-button', 'info', '은퇴 버튼이 꺼짐: ' + (anyBtn('[data-growth-retire="' + p.id + '"]') ? '꺼짐' : '없음')); break; }
    await press(b); await press(btn('#dialog [data-action="confirm-dialog"]'), 30); n++;
    ev('retire', p.name + '(' + p.age + '세, 평균 ' + mean9(p).toFixed(1) + ') 은퇴 지시');
  }
  return n;
}
async function youngStarters() {
  if (!P.youngStarters) return;
  const t = T(), d = battingDraft(t), ids = new Set(d.map(x => x.id)), age = id => t.players.find(p => p.id === id)?.age || 99;
  let have = d.filter(x => x.id && age(x.id) <= 25).length;
  const bench = t.players.filter(p => !ids.has(p.id) && p.age <= 25).sort((a, b) => mean9(b) - mean9(a));
  for (const p of bench) {
    if (have >= P.youngStarters) break;
    const slots = d.slice(0, 9).map((x, i) => ({i, id: x.id})).filter(x => x.id && age(x.id) > 25).sort((a, b) => mean9(t.players.find(p => p.id === a.id)) - mean9(t.players.find(p => p.id === b.id)));
    if (!slots.length) break;
    await press(btn('[data-action="lineup-select"][data-i="' + slots[0].i + '"]'));
    const a = btn('[data-action="lineup-assign"][data-id="' + p.id + '"]');
    if (!a) { finding('lineup-assign', 'info', '타순에 넣을 선수 버튼이 꺼짐'); break; }
    await press(a); have++;
    R.youngSwaps = (R.youngSwaps || 0) + 1;
  }
}
async function manage(kind) {
  await settle();
  const t = T(); if (!t || needsSetup(t)) return;// before the first game the club screens are locked
  if (kind === 'offseason') { await retireOld(); await resignAll(); }
  // Running out of players: loan (all users when there is no other way) or forfeit.
  if (t.players.length < 10 && t.league.phase === 'season') {
    const s = operationState(T());
    if (s.kind === 'hire') await fillRoster();
    const s2 = operationState(T());
    if (s2.kind === 'loan') await takeLoan();
  }
  if (t.players.length < 10 && t.league.phase === 'offseason') { const s = operationState(T()); if (s.kind === 'loan') await takeLoan(); }
  await fillRoster();
  await ensureTen();
  if (kind === 'offseason' || (T().league.round % 5 === 0)) await tuneTicket();
  await sendMlb();
  await fillRoster();
  await supportRequests();
  await buildFacilities();
  await train(kind === 'offseason' ? (P.trainOffseason || 40) : (P.trainPerGame || 6));
  checkSave('manage-' + kind);
}
// Optional (persona.ticketTune): try ticket prices on the finance screen and keep the one with the best expected gate
// (예상 홈 관중 × 입장료), like a user who experiments with the price input. Only the comparison persona uses it.
async function tuneTicket() {
  if (!P.ticketTune) return;
  await nav('finance');
  const readCrowd = () => { const m = ($1('#app .ops-banner')?.innerText || '').match(/예상 홈 관중\s*([\d,]+)명/); return m ? Number(m[1].replace(/,/g, '')) : null; };
  let best = {tk: T().ticket, v: -1};
  for (const tk of [8, 10, 12, 14, 16, 18, 20, 23, 26, 30, 35]) {
    const input = $1('#ticketPrice'), save = btn('[data-v8="ticket"]'); if (!input || !save) { finding('ticket-input', 'info', '입장료 칸을 찾지 못함'); return; }
    input.value = String(tk * 1000); await press(save, 20);
    const crowd = readCrowd(); if (crowd == null) continue;
    const v = crowd * tk; if (v > best.v) best = {tk, v};
  }
  const input = $1('#ticketPrice'); input.value = String(best.tk * 1000); await press(btn('[data-v8="ticket"]'), 20);
  if (best.tk !== R.lastTicket) { R.lastTicket = best.tk; ev('ticket', '입장료 ' + (best.tk * 1000).toLocaleString('ko-KR') + '원 (예상 홈 관중 × 입장료가 가장 큰 값)'); }
}
// Hiring can stop at 9 players when the money runs out; the screen then offers the loan (P14), which a user takes.
async function ensureTen() {
  for (let i = 0; i < 2 && T().players.length < 10; i++) {
    const s = operationState(T());
    if (s.kind === 'loan') { if (!(await takeLoan())) break; await fillRoster(); }
    else if (s.kind === 'hire') await fillRoster();
    else break;
  }
}
async function takeLoan() {
  if (P.loan === false) return false;
  const t = T(); const where = t.league.phase === 'season' ? 'market' : 'league';
  await nav(where);
  const b = btn('[data-opinion-loan]') || (await nav('home'), btn('[data-opinion-loan]'));
  if (!b) { finding('loan-button', 'bug', '긴급 대출이 가능한데 버튼이 없음', {screen, op: operationState(t)}); return false; }
  const o = loanOffer(t);
  await press(b); await press(btn('#dialog [data-action="confirm-dialog"]'), 40);
  ev('loan', '긴급 대출 ' + money(o.amount) + ' (갚을 금액 ' + money(o.repay) + ')', {players: t.players.length, funds: t.funds});
  return true;
}

// ---- a game ----
async function playGame() {
  const t0 = performance.now(), t = T(), lg = t.league, before = snapshot(t);
  await settle();
  if (t.players.length < 10) {
    const s = operationState(t);
    if (s.kind === 'forfeit') {
      await nav('home'); const b = btn('[data-opinion-forfeit]') || (await nav('league'), btn('[data-opinion-forfeit]'));
      if (!b) { finding('forfeit-button', 'bug', '부전패만 남았는데 버튼이 없음', {screen}); return {blocked: 'forfeit-missing'}; }
      await press(b); await press(btn('#dialog [data-action="confirm-dialog"]'), 60);
      ev('forfeit', '남은 경기 부전패 처리 · 선수 ' + t.players.length + '명', {from: before.round});
      return {forfeit: true};
    }
  }
  await nav('lineup');
  const auto = btn('[data-action="lineup-auto"]'); if (auto) await press(auto); else finding('lineup-auto-off', 'info', '자동 배치 버튼이 꺼져 있음', {players: t.players.length});
  await youngStarters();
  const start = btn('[data-action="lineup-start"]');
  if (!start) return {blocked: 'lineup-start-off', text: appText(200)};
  await press(start, 60);
  await settle();
  if (screen !== 'match' || !live(T())) return {blocked: 'not-started', screen, toast: lastToast, text: appText(200)};
  const skip = await waitFor(() => btn('[data-action="skip-match"]'), 5000);
  if (!skip) return {blocked: 'no-skip', screen};
  await press(btn('[data-action="skip-match"]'));
  const ok = await waitFor(() => screen === 'result' && T().match?.done && !skipJob, 120000, 60);
  if (!ok) { finding('skip-timeout', 'stuck', '남은 경기 스킵이 2분 안에 끝나지 않음', {screen, inning: T().match?.inning}); return {blocked: 'skip-timeout'}; }
  const m = T().match, ms = Math.round(performance.now() - t0);
  R.timing.gameMs.push(ms); if (ms > 20000) finding('slow-game', 'perf', '한 경기(편성·시작·스킵·결과)가 20초를 넘음', {ms});
  const g = {s: m.league?.season, r: m.league?.round, tier: m.league?.tier, res: m.score[0] > m.score[1] ? 'W' : m.score[0] < m.score[1] ? 'L' : 'D', sc: m.score.join(':'), home: m.home === 0, net: Math.round(m.finance?.net ?? 0), funds: Math.round(T().funds), op: Math.round(T().opinion?.value ?? 0), ms};
  R.games.push(g); out('game', g);
  // Result screen checks: the payout, opinion and growth panels should be there.
  const txt = appText(3000);
  if (m.league && !/리그 시즌/.test(txt)) finding('result-no-league', 'ui', '결과 화면에 리그 칸이 없음');
  if (m.opinion && !/해체 여론/.test(txt)) finding('result-no-opinion', 'ui', '결과 화면에 해체 여론 칸이 없음');
  if ((m.finance?.debt || 0) > 0) ev('unpaid', '급여·유지비 미지급 ' + money(m.finance.debt));
  checkLeagueRules(m, before);
  await settle();
  checkSave('after-game');
  return {played: true, m};
}
// Doc-vs-code checks that are cheap to make from one game (P19 payout, P09 opinion).
function checkLeagueRules(m, before) {
  const tier = m.league?.tier; if (tier == null) return;
  if (Number.isFinite(m.finance?.league) && m.finance.league !== LEAGUE.payout[tier]) finding('payout-mismatch', 'doc', '리그 배당금이 P19 표와 다름', {tier, got: m.finance.league});
  if (m.opinion) {
    const sum = m.opinion.parts.reduce((s, p) => s + p.delta, 0), want = Math.min(100, Math.max(0, before.opinion + sum));
    const res = m.score[0] > m.score[1] ? 'W' : m.score[0] < m.score[1] ? 'L' : 'D';
    const base = m.opinion.parts.find(p => ['win', 'loss', 'draw', 'forfeit'].includes(p.key));
    if (!base || (res === 'W' && base.delta !== -5) || (res === 'L' && base.delta !== 5) || (res === 'D' && base.delta !== 0)) finding('opinion-base', 'doc', '경기 결과의 해체 여론 변화가 P09와 다름', {res, parts: m.opinion.parts});
    if (Math.abs(Math.round(m.opinion.from) - before.opinion) > 1) finding('opinion-from', 'bug', '경기 전 여론과 결과 화면의 시작 값이 다름', {before: before.opinion, from: m.opinion.from});
  }
}

// ---- season end and offseason ----
function recordSeason(wallMs) {
  const t = T(), lg = t.league, h = lg.history.at(-1); if (!h) return null;
  const s = {...snapshot(t), season: h.season, tier: h.tier, tierName: leagueTierName(h.tier), rank: h.rank, pts: h.pts, w: h.w, d: h.d, l: h.l, rf: h.rf, ra: h.ra, diff: h.rf - h.ra, prize: h.prize, move: h.move, nextTier: lg.tier,
    opinionEnd: Math.round(t.opinion?.value ?? 0), opinionSettle: h.opinion ? {from: Math.round(h.opinion.from), to: Math.round(h.opinion.to), parts: h.opinion.parts?.map(p => p.label + ' ' + p.delta)} : null,
    disband: !!h.disband, forfeits: h.forfeits || 0, pending: t.mlbSupport?.pending?.kind || null, pendingPromotion: lg.pendingPromotion ? lg.pendingPromotion.need : null,
    wallSec: Math.round(wallMs / 1000), saveChars: saveSizes().main, events: []};
  // Rule checks at the season end (P09/P19).
  const prize = LEAGUE.prize[h.tier]?.[h.rank - 1] || 0;
  if (!h.disband && h.prize !== prize) finding('prize-mismatch', 'doc', '시즌 상금이 P19 표와 다름', {tier: h.tier, rank: h.rank, got: h.prize});
  if (h.rank === 1 && h.tier < 3 && !['up', 'blocked', 'disband'].includes(h.move)) finding('promo-missing', 'bug', '1위인데 승격·보류가 아님', {move: h.move});
  if (h.rank === 6 && h.tier > 0 && !['down', 'saved', 'disband', 'pending'].includes(h.move)) finding('releg-missing', 'bug', '6위인데 강등이 아님', {move: h.move});
  R.seasons.push(s); out('season', s);
  return s;
}
async function offseason() {
  const t0 = performance.now();
  await settle();
  let t = T(), lg = t.league;
  // 1. promotion waiting for the stadium: expand if the money is there (every user wants 1부).
  if (lg.pendingPromotion) {
    const cost = stadiumUpgradeCost(t);
    if (t.funds >= cost) { await nav('league'); const b = btn('[data-league-expand]'); if (b) { await press(b, 40); ev('stadium', '경기장 ' + T().stadium + '등급 확장하고 승격 (리그 화면) ' + money(cost)); } else await uiExpandStadium('승격'); }
    else { ev('promotion-blocked', '1위지만 경기장 확장비 ' + money(cost) + '이 없음 (자금 ' + money(t.funds) + ')'); finding('promotion-blocked-money', 'balance', '1위를 했지만 경기장 확장비가 없어 승격하지 못함', {tier: lg.tier, cost, funds: Math.round(t.funds)}); }
  }
  // 2. stadium for slots or seats (persona)
  t = T();
  if (!t.league.pendingPromotion && P.expand !== 'promotion' && t.stadium < 5) {
    const cost = stadiumUpgradeCost(t), slotsFull = t.facilities.length >= facilitySlots(t);
    const want = P.expand === 'spare' ? t.funds - cost >= reserve(t) : (P.expand === 'slots' && slotsFull && t.funds - cost >= reserve(t) + 2 * costPerGame(t));
    if (want && !(P.expandMax && t.stadium >= P.expandMax)) await uiExpandStadium(P.expand === 'spare' ? '여유 자금' : '건물 자리');
  }
  await manage('offseason');
  if (leagueNextSeasonBlock(T())) await ensureTen();
  t = T();
  // 3. next season
  const block = leagueNextSeasonBlock(t);
  const goalHit = CFG.goal === 'title' ? t.league.history.some(h => h.move === 'champion') : t.league.tier >= 3;
  R.timing.offseasonMs.push(Math.round(performance.now() - t0));
  if (goalHit) return 'goal';
  if (t.league.season >= CFG.maxSeasons) return 'cap';
  await nav('league');
  const nb = btn('[data-league-next]');
  if (!nb) { finding('next-season-blocked', 'stuck', '"다음 시즌 시작"이 꺼져 있음: ' + (block || '?'), {roster: t.players.length, funds: t.funds, text: appText(300)}); return 'blocked'; }
  await press(nb, 40);
  if ($1('#dialog[open]')) { const title = $1('#dialog h2')?.textContent || ''; ev('confirm', title); await press(btn('#dialog [data-action="confirm-dialog"]'), 40); }
  await settle();
  if (T().league.phase !== 'season') { finding('next-season-failed', 'stuck', '다음 시즌 시작을 눌렀지만 시즌이 시작되지 않음', {toast: lastToast}); return 'blocked'; }
  // Offseason actions belong to the season that just ended (merged by season number in run-user.cjs).
  const ended = T().league.season - 1;
  R.offseasons[ended] = R.events.filter(e => !e.counted && e.season === ended).map(e => { e.counted = true; return e.kind + ': ' + e.text; }).slice(0, 40);
  R.offseasonSnap[ended] = snapshot();
  ev('season-start', leagueTierName(T().league.tier) + ' 시즌 ' + T().league.season + ' 시작 · 자금 ' + money(T().funds) + ' · 선수 ' + T().players.length + '명');
  return 'next';
}

// ---- main loop ----
let reason = null;
try {
  await waitFor(() => typeof data !== 'undefined' && $1('#app')?.innerText?.length > 0, 10000);
  const boot = await bootGame();
  R.start = snapshot(); R.boot = boot; R.sizesAtStart = saveSizes();
  if (CFG.expect && R.start.season != null && (R.start.season < CFG.expect.season || (R.start.season === CFG.expect.season && R.start.round < CFG.expect.round && R.start.phase === CFG.expect.phase)))
    finding('resume-lost', 'bug', '다시 켰을 때 저장이 지난 실행의 마지막 상태보다 뒤로 돌아감', {expect: CFG.expect, got: R.start});
  out('start', {boot, ...R.start});
  let seasonsThisLaunch = 0, seasonT0 = performance.now(), blocked = 0;
  while (!reason) {
    if ((performance.now() - T0) / 60000 > CFG.maxMinutes) { reason = 'time'; break; }
    const t = T(); const lg = t.league;
    if (!lg) { finding('no-league', 'bug', '리그 자료가 없음'); reason = 'error'; break; }
    if (lg.phase === 'offseason') {
      if (t.mlbSupport?.pending) await settle();
      const r = await offseason();
      if (r === 'goal') { reason = 'goal'; break; }
      if (r === 'cap') { reason = 'cap'; break; }
      if (r === 'blocked') { reason = 'stuck'; break; }
      seasonT0 = performance.now();
      if (seasonsThisLaunch >= CFG.chunkSeasons) { reason = 'chunk'; break; }
      continue;
    }
    // in season: a game left running by an earlier launch is resumed from the home button and skipped
    if (live(t)) {
      await nav('home'); const resume = btn('#app [data-action="resume-home"]');
      if (resume) await press(resume); else { fallback('resume', '진행 중인 경기를 이어 갈 버튼이 없어 go("match")를 불렀습니다.'); go('match'); }
      await settle(); await press(btn('[data-action="skip-match"]')); await waitFor(() => T().match?.done && screen === 'result', 60000); await settle();
      ev('resume', '진행 중이던 경기를 이어서 끝냄');
    }
    await manage('game');
    const roundBefore = T().league.round, seasonBefore = T().league.season;
    const r = await playGame();
    const lg2 = T().league;
    const progressed = lg2.season !== seasonBefore || lg2.round !== roundBefore || lg2.phase === 'offseason';
    if (!progressed) {
      blocked++; finding('game-blocked:' + (r.blocked || '?'), 'stuck', '경기를 시작하지 못함: ' + (r.blocked || '?'), {screen, toast: lastToast, text: r.text || appText(200), roster: T().players.length, funds: Math.round(T().funds)});
      if (blocked >= 4) { reason = 'stuck'; R.stop = {screen, toast: lastToast, text: appText(800), state: snapshot()}; break; }
      continue;
    }
    blocked = 0;
    if (lg2.phase === 'offseason' && lg2.history.at(-1)?.season === seasonBefore) {
      await settle();
      const s = recordSeason(performance.now() - seasonT0); seasonsThisLaunch++;
      if (s) { s.events = R.events.filter(e => e.season === s.season && !e.counted).map(e => { e.counted = true; return e.kind + ': ' + e.text; }).slice(0, 40); }
      // Pending revival decision → answered in settle(); the record is updated once more after the decision.
      if (T().league.history.at(-1)?.move !== s.move) { s.moveAfterDecision = T().league.history.at(-1)?.move; s.nextTier = T().league.tier; s.disbands = T().opinion?.disbands ?? 0; s.tickets = T().mlbSupport?.tickets ?? 0; }
      if (T().league.season >= CFG.maxSeasons && !(CFG.goal === 'title' ? T().league.history.some(h => h.move === 'champion') : T().league.tier >= 3)) { reason = 'cap'; break; }
    }
  }
} catch (e) {
  reason = 'exception'; R.exception = {msg: String(e && e.message || e), stack: String(e && e.stack || '').slice(0, 1200)}; finding('harness-exception', 'harness', '시험 스크립트 예외: ' + R.exception.msg, {stack: R.exception.stack.slice(0, 400)});
}
checkRuntimeErrors('end');
try { save(true); } catch (e) { /* ignore */ }
R.end = snapshot(); R.reason = reason; R.sizesAtEnd = saveSizes(); R.minutes = +((performance.now() - T0) / 60000).toFixed(2);
R.leagueHistory = (team()?.league?.history || []).map(h => ({season: h.season, tier: h.tier, rank: h.rank, pts: h.pts, w: h.w, d: h.d, l: h.l, rf: h.rf, ra: h.ra, prize: h.prize, move: h.move, nextTier: h.nextTier}));
R.leftovers = R.events.filter(e => !e.counted).map(e => ({season: e.season, s: e.kind + ': ' + e.text}));
R.events = R.events.slice(-300);
R.toasts = R.toasts.slice(-120);
out('end', {reason, end: R.end, minutes: R.minutes});
return R;
