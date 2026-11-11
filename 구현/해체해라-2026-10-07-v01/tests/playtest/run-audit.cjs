#!/usr/bin/env node
// Runs a read-only page script (audit-save.js, audit-rebuilds.js or screen-text.js) on finished playtest saves,
// one hidden desktop-app launch per user, one after another.
//   node run-audit.cjs <data-root> <script.js> <out.json> [users] [--electron=<electron.exe>]
// <data-root> holds one save folder per user (the --data-root of run-all.cjs). screen-text.js loads the slot and moves
// between screens (it saves once when the slot loads); the two audit scripts only read the stored save.
'use strict';
const {spawnSync} = require('node:child_process'), fs = require('node:fs'), path = require('node:path');
const pos = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [root, script, outFile, list] = pos;
const electron = (process.argv.find(a => a.startsWith('--electron=')) || '').slice(11) || 'D:\\해체해라-앱\\electron\\electron.exe';
const repo = path.resolve(__dirname, '..', '..', '..', '..');
const users = (list || 'thrifty,normal,aggressive,youth,star,normal_ticket').split(',');
const res = {};
for (const u of users) {
  const work = path.join(root, u + '-work'); fs.mkdirSync(work, {recursive: true});
  const t0 = Date.now();
  const r = spawnSync(electron, [path.join(repo, 'desktop'), '--data-dir=' + path.join(root, u), '--self-check=' + path.join(work, 'audit.png'), '--self-check-script=' + path.resolve(script), '--self-check-wait=3000'], {encoding: 'utf8', timeout: 180000, windowsHide: true});
  try { const so = r.stdout; res[u] = JSON.parse(so.slice(so.indexOf('{'))); } catch (e) { res[u] = {error: String(e), stdout: (r.stdout || '').slice(0, 500)}; }
  console.log(u, Math.round((Date.now() - t0) / 1000) + 's', res[u].error || 'ok');
}
fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
