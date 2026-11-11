// 해체해라 데스크톱 앱 (Electron). 게임 화면과 규칙은 모두 게임 폴더의 파일을 그대로 씁니다.
// - 개발용 실행: 저장소의 구현 폴더(dev.html, src/, assets/)를 바로 읽습니다. 코드를 고친 뒤 F5를 누르면 반영됩니다.
// - 완성본(build-exe.cjs로 만든 .exe): 앱 안에 넣은 단일 파일 index.html을 읽습니다.
// 게임은 app://game/ 주소로 열립니다. file:// 주소에서는 소리 파일을 fetch로 불러올 수 없어서 이 방식을 씁니다.
// 저장(브라우저 저장소)은 --data-dir 또는 설정.json의 dataDir 폴더에 남습니다.
const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const SCHEME = 'app', HOST = 'game';
protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

// 설정: 명령줄 > 앱 폴더의 설정.json > 기본값
const arg = name => { const hit = process.argv.find(a => a.startsWith(`--${name}=`)); return hit ? hit.slice(name.length + 3).replace(/^"|"$/g, '') : null; };
let config = {};
try { config = JSON.parse(fs.readFileSync(path.join(__dirname, '설정.json'), 'utf8')); } catch { /* 없으면 기본값 */ }
const packagedGame = path.join(__dirname, 'game');
const devGame = path.resolve(__dirname, '..', '구현', '해체해라-2026-10-07-v01');
const gameDir = path.resolve(arg('game-dir') || config.gameDir || (fs.existsSync(packagedGame) ? packagedGame : devGame));
const entry = arg('entry') || config.entry || (fs.existsSync(path.join(gameDir, 'dev.html')) && !process.argv.includes('--built') ? 'dev.html' : 'index.html');
const dataDir = arg('data-dir') || config.dataDir || (app.isPackaged ? path.join(path.dirname(process.execPath), '저장') : null);
if (dataDir) { fs.mkdirSync(dataDir, { recursive: true }); app.setPath('userData', dataDir); }
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// 같은 저장을 두 창이 동시에 쓰지 않도록 한 번에 하나만 엽니다.
if (!process.argv.includes('--build-exe') && !app.requestSingleInstanceLock()) app.quit();

let win = null;
function serveGameFiles() {
  protocol.handle(SCHEME, request => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/' + entry;
    const file = path.normalize(path.join(gameDir, rel));
    if (url.host !== HOST || (file !== gameDir && !file.startsWith(gameDir + path.sep)) || !fs.existsSync(file)) return new Response('없는 파일입니다', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 960, minWidth: 1024, minHeight: 680, title: '해체해라', backgroundColor: '#101010', autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.setMenu(null);
  if (!arg('self-check')) win.once('ready-to-show', () => win.show());
  // 바깥 링크는 기본 브라우저로, 게임 창 안에서는 게임 주소만 엽니다.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(`${SCHEME}://${HOST}/`)) { event.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
  // 단축키: F5·Ctrl+R 다시 읽기(고친 코드 반영), F11 전체 화면, F12·Ctrl+Shift+I 개발 도구
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const key = input.key, ctrl = input.control || input.meta;
    if (key === 'F5' || (ctrl && !input.shift && key.toLowerCase() === 'r')) { event.preventDefault(); win.webContents.reloadIgnoringCache(); }
    else if (key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    else if (key === 'F12' || (ctrl && input.shift && key.toLowerCase() === 'i')) { event.preventDefault(); win.webContents.toggleDevTools(); }
  });
  win.loadURL(`${SCHEME}://${HOST}/${entry}`);
}

// 자가 점검(--self-check=결과.png): 창을 띄우지 않고 게임을 열어 화면을 찍고, 오류·파일 읽기·저장을 확인한 뒤 끝냅니다.
function selfCheck(png) {
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(String(event.message).slice(0, 300)); });
  win.webContents.on('did-fail-load', (e, code, desc, url) => errors.push(`불러오기 실패 ${code} ${desc} ${url}`));
  win.webContents.once('did-finish-load', () => setTimeout(async () => {
    const page = await win.webContents.executeJavaScript(`(async()=>({title:document.title,url:location.href,appText:(document.querySelector('#app')?.innerText||'').slice(0,160),
      fetchOk:await fetch('src/game.js').then(r=>r.ok).catch(()=>false),storageKeys:Object.keys(localStorage).length,
      marker:(()=>{const before=localStorage.getItem('haechehaera.desktop-check');localStorage.setItem('haechehaera.desktop-check',String(Date.now()));return before;})()}))()`);
    const image = await win.webContents.capturePage();
    fs.writeFileSync(png, image.toPNG());
    console.log(JSON.stringify({ gameDir, entry, userData: app.getPath('userData'), page, errors }, null, 1));
    app.quit();
  }, 4000));
}

// 완성본 만들기(--build-exe --out=폴더 [--data-dir=폴더]): 창을 띄우지 않고 build-exe.cjs를 실행한 뒤 결과를 알려 줍니다.
async function buildMode() {
  const { dialog } = require('electron');
  try {
    const { buildExe } = require('./build-exe.cjs');
    const r = buildExe({ electronDir: path.dirname(process.execPath), out: path.resolve(arg('out') || path.join(path.dirname(process.execPath), '..', '배포')), dataDir: arg('data-dir') });
    console.log(JSON.stringify(r, null, 1));
    if (!process.argv.includes('--quiet')) await dialog.showMessageBox({ type: 'info', title: '해체해라', message: '완성본을 만들었습니다', detail: `${r.exe}\n크기 약 ${r.sizeMB}MB (게임 ${r.gameMB}MB)\n저장 위치: ${r.dataDir}` });
  } catch (e) {
    console.error(e.message);
    if (!process.argv.includes('--quiet')) await dialog.showMessageBox({ type: 'error', title: '해체해라', message: '완성본을 만들지 못했습니다', detail: e.message });
    process.exitCode = 1;
  }
  app.quit();
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  if (process.argv.includes('--build-exe') && !app.isPackaged) return buildMode();
  serveGameFiles(); createWindow();
  const check = arg('self-check'); if (check) selfCheck(path.resolve(check));
});
app.on('window-all-closed', () => app.quit());
