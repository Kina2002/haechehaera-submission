// Read-only page script (run with run-audit.cjs): how many players each rebuild kept (P09: loyalty 70+, up to 3).
const d = JSON.parse(localStorage.getItem(KEY)), t = d.slots[d.current];
const rb = t.opinion?.rebuilds || [];
return {disbands: t.opinion?.disbands, rebuilds: rb.map(r => ({season: r.season, tier: r.tier, rank: r.rank, kept: (r.kept || []).length, left: r.left, added: r.added})), loyaltyNow: t.players.map(p => p.loyalty)};
