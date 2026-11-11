// Five user types for the real-game playtest (2026-11-12). Money is in the game's 만원 units.
// Shared rules (page-driver.js): auto lineup every game, re-sign everyone at the asking wage × wageMul, fill the roster to 10 at any
// cost and to 12 while one game of costs stays, answer every pending decision, take the emergency loan when it is the only way
// to field ten players (otherwise forfeits follow), use a revival ticket against a disband (ticketDisband) and against a
// relegation when tickets ≥ ticketRelegation ('always' = every time), expand the stadium when 1st place waits for it and the money
// is there. "reserve" = reserveGames × (wages + facility upkeep of the next game); training, facilities and upgrade hires only
// spend money above reserve + stadium savings (saveForStadium: 'always' saves the next expansion cost from 지역 리그 on,
// 'late' only while 1st after round 5 or when a promotion waits, 'never').
const PERSONAS = {
  thrifty: {
    label: '아끼는 유저', teamName: '아끼는 구단',
    summary: '경기 4번 치를 운영비를 늘 남김. 훈련 시설은 타격 훈련장·불펜만. 남는 돈으로만 훈련. 경기장은 승격에 필요할 때만 확장. 조건이 되면 MLB로 보냄.',
    reserveGames: 4, saveForStadium: 'late', expand: 'promotion',
    facilities: [['bat', 1], ['pitch', 1]],
    trainPerGame: 4, trainOffseason: 25, upgradeHire: 0, maxRoster: 12, wageMul: 1,
    mlb: true, reward: 'sensible', ticketRelegation: 2, retireAge: 33, retireKeep: 12,
  },
  normal: {
    label: '보통 유저', teamName: '보통 구단',
    summary: '경기 2번 치를 운영비를 남김. 훈련 시설 4개 → 응원단 버스 → 유니폼 매장 → 라커룸 → 광고판 → 선수 식당 순서로 짓고, 타격 훈련장·불펜 2단계. 건물 자리가 차면 여유 있을 때 경기장 확장. MLB로 보냄.',
    reserveGames: 2, saveForStadium: 'late', expand: 'slots',
    facilities: [['bat', 1], ['pitch', 1], ['field', 1], ['conditioning', 1], ['bus', 1], ['uniform', 1], ['locker', 1], ['billboard', 1], ['food', 1], ['bat', 2], ['pitch', 2]],
    trainPerGame: 6, trainOffseason: 40, upgradeHire: 6, maxRoster: 14, wageMul: 1,
    mlb: true, reward: 'sensible', ticketRelegation: 2, retireAge: 34, retireKeep: 12,
  },
  aggressive: {
    label: '무리하는 유저', teamName: '무리 구단',
    summary: '운영비는 경기 1번 치만 남김. 시설을 일찍 많이 짓고 단계를 올림. 돈이 남으면 경기장 확장. 선수가 모자라고 돈이 없으면 긴급 대출. MLB로 보냄.',
    reserveGames: 1, saveForStadium: 'never', expand: 'spare',
    facilities: [['bat', 1], ['pitch', 1], ['field', 1], ['conditioning', 1], ['food', 1], ['bat', 2], ['pitch', 2], ['billboard', 1], ['restaurant', 1], ['uniform', 1], ['bus', 1], ['locker', 1], ['field', 2], ['conditioning', 2], ['bat', 3], ['pitch', 3], ['massage', 1], ['fans', 1], ['bus', 2], ['sleep', 1], ['field', 3], ['conditioning', 3], ['hall', 1], ['academy', 1]],
    trainPerGame: 10, trainOffseason: 60, upgradeHire: 4, maxRoster: 16, wageMul: 1,
    mlb: true, reward: 'sensible', ticketRelegation: 2, retireAge: 34, retireKeep: 12, loan: true,
  },
  youth: {
    label: '육성형 유저', teamName: '육성 구단',
    summary: '어린 선수 위주. 영입은 젊은 후보 우대, 선발에 25세 이하 2명 이상, 유소년 아카데미를 먼저 짓고 유망주는 늘 데려옴, 오프시즌에 30세 이상 후보는 은퇴시킴. MLB 진출 보상은 "막내 +15", 자주 MLB로 보냄.',
    reserveGames: 2, saveForStadium: 'late', expand: 'slots',
    facilities: [['academy', 1], ['bat', 1], ['pitch', 1], ['field', 1], ['food', 1], ['conditioning', 1], ['bat', 2], ['pitch', 2]],
    trainPerGame: 6, trainOffseason: 40, upgradeHire: 6, maxRoster: 15, wageMul: 1, preferYoung: 1.5, youngStarters: 2, academyAlways: true,
    mlb: true, mlbMinChance: 0, reward: 'ability', ticketRelegation: 2, retireAge: 30, retireKeep: 11,
  },
  star: {
    label: '스타 지키기 유저', teamName: '스타 구단',
    summary: 'MLB로 보내지 않음. 희망급여의 120%를 줘서 애정도를 높게 유지. 라커룸·명예의 전당을 먼저 짓고 훈련 시설. 회생권은 강등·해체 모두에 씀(MLB를 보내지 않으니 회생권이 거의 없음).',
    reserveGames: 2, saveForStadium: 'late', expand: 'slots',
    facilities: [['locker', 1], ['hall', 1], ['bat', 1], ['pitch', 1], ['field', 1], ['conditioning', 1]],
    trainPerGame: 6, trainOffseason: 40, upgradeHire: 6, maxRoster: 14, wageMul: 1.2,
    mlb: false, reward: 'sensible', ticketRelegation: 'always', retireAge: 34, retireKeep: 12,
  },
};
// Comparison run (not one of the five): the 보통 유저 who also tries ticket prices on the finance screen (P23's simulator
// set the best price every game; the five users above keep the default 10,000원).
PERSONAS.normal_ticket = {...PERSONAS.normal, label: '보통 유저 + 입장료 조정 (비교용)', teamName: '입장료 구단', ticketTune: true,
  summary: '보통 유저와 같고, 오프시즌과 5경기마다 재정 화면에서 입장료를 바꿔 보며 "예상 홈 관중 × 입장료"가 가장 큰 값으로 둠.'};
module.exports = {PERSONAS};
