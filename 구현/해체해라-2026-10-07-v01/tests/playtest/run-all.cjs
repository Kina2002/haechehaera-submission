#!/usr/bin/env node
// Runs several user types at once (one desktop-app process each, at most --parallel at a time).
//   node run-all.cjs --out=<results folder> --data-root=<folder> [--users=thrifty,normal,aggressive,youth,star] [--parallel=5] [other run-user.cjs options]
'use strict';
const path = require('node:path'), {spawn} = require('node:child_process'), fs = require('node:fs');
const {PERSONAS} = require('./personas.cjs');
const arg = (name, def) => { const hit = process.argv.find(a => a.startsWith('--' + name + '=')); return hit ? hit.slice(name.length + 3) : def; };
const users = arg('users', Object.keys(PERSONAS).join(',')).split(',');
const parallel = Number(arg('parallel', 5)), dataRoot = arg('data-root'), out = arg('out');
const pass = process.argv.slice(2).filter(a => !/^--(users|parallel|data-root)=/.test(a));
if (!dataRoot || !out) { console.error('--data-root and --out are required'); process.exit(2); }
fs.mkdirSync(out, {recursive: true});
let next = 0, running = 0;
function startOne() {
  if (next >= users.length) return;
  const u = users[next++]; running++;
  const p = spawn(process.execPath, [path.join(__dirname, 'run-user.cjs'), '--user=' + u, '--data=' + path.join(dataRoot, u), ...pass], {stdio: ['ignore', 'pipe', 'pipe']});
  const log = fs.createWriteStream(path.join(out, u + '.console.txt'), {flags: 'a'});
  p.stdout.on('data', d => { log.write(d); process.stdout.write(d); });
  p.stderr.on('data', d => { log.write(d); process.stderr.write(d); });
  p.on('exit', code => { running--; log.end(); console.log('[' + u + '] exit ' + code); startOne(); if (!running && next >= users.length) console.log('all done'); });
}
for (let i = 0; i < Math.min(parallel, users.length); i++) startOne();
