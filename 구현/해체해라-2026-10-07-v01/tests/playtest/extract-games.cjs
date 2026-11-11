#!/usr/bin/env node
// Rebuilds <user>.games.jsonl (one line per game) from the console lines that run-user.cjs keeps in <data>/../<user>-work.
//   node extract-games.cjs <data-root> <results folder> [users]
'use strict';
const fs = require('node:fs'), path = require('node:path');
const [root, out, list] = process.argv.slice(2);
const users = (list || 'thrifty,normal,aggressive,youth,star').split(',');
for (const u of users) {
  const work = path.join(root, u + '-work'); if (!fs.existsSync(work)) continue;
  const files = fs.readdirSync(work).filter(f => /^launch-\d+\.stderr\.txt$/.test(f)).sort((a, b) => parseInt(a.slice(7)) - parseInt(b.slice(7)));
  const games = [];
  for (const f of files) for (const l of fs.readFileSync(path.join(work, f), 'utf8').split(/\r?\n/)) { const m = l.match(/"PT\|game\|(.*)", source/); if (m) try { games.push(JSON.parse(m[1])); } catch (e) { /* skip */ } }
  fs.writeFileSync(path.join(out, u + '.games.jsonl'), games.map(g => JSON.stringify(g)).join('\n') + '\n');
  console.log(u + ': ' + games.length + ' games');
}
