// 해체해라 완성본(.exe 폴더) 만들기. 다른 컴퓨터에 폴더째 복사해도 실행됩니다.
// 게임 파일은 구현 폴더의 dev.html · src/ · assets/를 그대로 넣습니다(단일 파일 index.html이나 Python이 필요 없음).
// 쓰는 법 1 (바로가기): electron.exe "<저장소>\desktop" --build-exe --out="D:\해체해라-앱\배포" [--data-dir="D:\해체해라-앱\저장"]
// 쓰는 법 2 (명령줄): set ELECTRON_RUN_AS_NODE=1 & electron.exe desktop\build-exe.cjs --out=... [--data-dir=...]
// --data-dir를 주면 완성본이 그 폴더에 저장합니다(개발용 실행과 같은 저장을 쓰려면 같은 폴더). 없으면 .exe 옆 "저장" 폴더입니다.
const fs = require('node:fs');
const path = require('node:path');

const MARK = '.haechehaera-desktop-build';
const GAME_FILES = ['dev.html', 'src', 'assets'];

function folderSize(dir) { let n = 0; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); n += e.isDirectory() ? folderSize(p) : fs.statSync(p).size; } return n; }

function buildExe(opts) {
  // Electron 안에서 돌 때 fs는 .asar 파일을 폴더처럼 다룹니다. 파일 그대로 복사·삭제하도록 잠시 끕니다.
  const before = process.noAsar; process.noAsar = true;
  try { return build(opts); } finally { process.noAsar = before; }
}

function build({ electronDir, out, dataDir = null, name = '해체해라' }) {
  const appSrc = __dirname, gameSrc = path.resolve(appSrc, '..', '구현', '해체해라-2026-10-07-v01');
  if (!fs.existsSync(path.join(electronDir, 'electron.exe'))) throw new Error('electron.exe가 없습니다: ' + electronDir);
  for (const f of GAME_FILES) if (!fs.existsSync(path.join(gameSrc, f))) throw new Error('게임 파일이 없습니다: ' + path.join(gameSrc, f));
  const target = path.join(out, name);
  // 예전 완성본은 이 스크립트가 만든 폴더일 때만 지웁니다(표시 파일로 확인).
  if (fs.existsSync(target)) {
    if (!fs.existsSync(path.join(target, MARK))) throw new Error('이 스크립트가 만들지 않은 폴더가 이미 있습니다. 다른 --out을 쓰세요: ' + target);
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.mkdirSync(out, { recursive: true });
  fs.cpSync(electronDir, target, { recursive: true });
  fs.renameSync(path.join(target, 'electron.exe'), path.join(target, name + '.exe'));
  fs.rmSync(path.join(target, 'resources', 'default_app.asar'), { force: true });
  const appDir = path.join(target, 'resources', 'app');
  fs.mkdirSync(appDir, { recursive: true });
  for (const f of ['main.js', 'package.json']) fs.copyFileSync(path.join(appSrc, f), path.join(appDir, f));
  for (const f of GAME_FILES) fs.cpSync(path.join(gameSrc, f), path.join(appDir, 'game', f), { recursive: true });
  const config = { entry: 'dev.html', ...(dataDir ? { dataDir } : {}) };
  fs.writeFileSync(path.join(appDir, '설정.json'), JSON.stringify(config, null, 1) + '\n');
  const stamp = new Date().toISOString();
  fs.writeFileSync(path.join(target, MARK), `built ${stamp}\nfrom ${gameSrc}\n`);
  return { target, exe: path.join(target, name + '.exe'), sizeMB: Math.round(folderSize(target) / 1048576), gameMB: Math.round(folderSize(path.join(appDir, 'game')) / 1048576), dataDir: dataDir || path.join(target, '저장'), stamp };
}

module.exports = { buildExe };

if (require.main === module) {
  const arg = n => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3).replace(/^"|"$/g, '') : null; };
  const out = arg('out'); if (!out) { console.error('--out=<폴더>가 필요합니다'); process.exit(1); }
  const r = buildExe({ electronDir: arg('electron') || path.dirname(process.execPath), out: path.resolve(out), dataDir: arg('data-dir') });
  console.log(JSON.stringify(r, null, 1));
}
