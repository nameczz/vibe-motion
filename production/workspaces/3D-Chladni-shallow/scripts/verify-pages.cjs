const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { app, BrowserWindow } = require('electron');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, '.pages');
const PROFILE = path.join(ROOT, '.cache', `pages-verify-${process.pid}`);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
};

app.setPath('userData', PROFILE);
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.on('window-all-closed', () => {});

function buildSite() {
  const result = spawnSync('bash', [path.join(ROOT, 'scripts', 'build-pages.sh')], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Pages build failed');
}

function createServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    let file = path.resolve(SITE, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(`${SITE}${path.sep}`) && file !== SITE) {
      response.writeHead(403).end();
      return;
    }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      const body = fs.readFileSync(file);
      response.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': body.length
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (_error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
}

async function waitFor(win, expression, label, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await win.webContents.executeJavaScript(expression).catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  buildSite();
  await app.whenReady();
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const errors = [];
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  win.webContents.on('console-message', (event) => {
    if (event.level >= 2) errors.push(event.message);
  });

  try {
    await win.loadURL(`${base}/`);
    await waitFor(
      win,
      "Boolean(document.getElementById('engine').contentWindow.soundMotionTest)",
      'embedded visualizer'
    );
    await waitFor(
      win,
      `(() => {
        const api=document.getElementById('engine').contentWindow;
        const expected=api.soundMotionTest.webDefaultPattern('cosmic');
        const actual=JSON.parse(api.soundMotionNative.exportPatternJSON());
        return actual.style===expected.style && Math.abs(actual.goal-expected.goal)<1e-9 &&
          Math.abs(actual.detail-expected.detail)<1e-9 && actual.ex.every((value,index)=>Math.abs(value-expected.ex[index])<1e-9);
      })()`,
      'shared Web default pattern'
    );
    const initial = await win.webContents.executeJavaScript(`(() => {
      const frame=document.getElementById('engine');
      const state=frame.contentWindow.soundMotionTest.state();
      return {
        detail:state.detail,
        detailControl:Number(document.querySelector('input[data-param="detail"]').value),
        audio:frame.contentDocument.getElementById('hero-meta').textContent,
        source:new URL(frame.src).pathname,
        dock:Boolean(document.getElementById('dock')),
        title:document.title,
        heading:document.querySelector('h1.title')?.textContent,
        engineTitle:frame.contentDocument.title,
        engineHeading:frame.contentDocument.querySelector('header h1')?.textContent,
        downloadButton:Boolean(document.getElementById('exportBtn')),
        hasLegacyName:document.documentElement.textContent.includes('3D Chladni Plate'),
        pattern:JSON.parse(frame.contentWindow.soundMotionNative.exportPatternJSON())
      };
    })()`);
    if (Math.abs(initial.detail - 1) > 1e-6 || Math.abs(initial.detailControl - 1) > 1e-6) {
      throw new Error(`Pages Cosmic detail default is invalid: ${JSON.stringify(initial)}`);
    }
    if (!initial.audio.includes('pulsebox-lofi-production-522875.mp3')) throw new Error(`Unexpected Pages audio: ${initial.audio}`);
    if (initial.source !== '/app/index.html' || !initial.dock) throw new Error(`Invalid Pages shell: ${JSON.stringify(initial)}`);
    if (initial.title !== '3D Chladni' || initial.heading !== '3D Chladni' ||
        initial.engineTitle !== '3D Chladni' || initial.engineHeading !== '3D Chladni' || initial.hasLegacyName) {
      throw new Error(`Invalid Pages product name: ${JSON.stringify(initial)}`);
    }
    if (initial.downloadButton) throw new Error('Pages download button is still present');
    const licenseResponses = await win.webContents.executeJavaScript(`Promise.all([
      'LICENSE',
      'ASSET_LICENSE.md',
      'LICENSES/CC-BY-NC-4.0.txt',
      'THIRD_PARTY_NOTICES.md'
    ].map(async (file) => ({file,status:(await fetch(file)).status})))`);
    if (licenseResponses.some((response) => response.status !== 200)) {
      throw new Error(`Pages license files unavailable: ${JSON.stringify(licenseResponses)}`);
    }

    const detailDefaults = await win.webContents.executeJavaScript(
      "document.getElementById('engine').contentWindow.soundMotionTest.detailDefaults()"
    );
    const expectedDetailDefaults = { sand: 1.5, msand: 1, cosmic: 1, dcosmic: 1.5 };
    for (const [style, expected] of Object.entries(expectedDetailDefaults)) {
      if (Math.abs(detailDefaults[style] - expected) > 1e-6) {
        throw new Error(`Unexpected per-style detail defaults: ${JSON.stringify(detailDefaults)}`);
      }
    }
    const webPatterns = await win.webContents.executeJavaScript(
      "['sand','msand','cosmic','dcosmic'].map(style=>document.getElementById('engine').contentWindow.soundMotionTest.webDefaultPattern(style))"
    );
    const expectedGoal = 10.69808181085723;
    const expectedEx = [0.8314424852873101, 0.3722374639108269, 0.7994605376770149];
    for (const pattern of webPatterns) {
      if (Math.abs(pattern.goal - expectedGoal) > 1e-9 ||
          Math.abs(pattern.detail - expectedDetailDefaults[pattern.style]) > 1e-9 ||
          pattern.ex.some((value, index) => Math.abs(value - expectedEx[index]) > 1e-9)) {
        throw new Error(`Unexpected shared Web default pattern: ${JSON.stringify(webPatterns)}`);
      }
    }

    const languages = await win.webContents.executeJavaScript(`(() => {
      const button=document.getElementById('langBtn');
      if(document.documentElement.lang!=='en') button.click();
      const english={lang:document.documentElement.lang,style:document.querySelector('[data-style="sand"]').textContent,detail:document.querySelector('[data-i18n="detail"]').textContent};
      button.click();
      const chinese={lang:document.documentElement.lang,style:document.querySelector('[data-style="sand"]').textContent,detail:document.querySelector('[data-i18n="detail"]').textContent};
      return {english,chinese};
    })()`);
    if (languages.english.lang !== 'en' || languages.english.style !== 'Dynamic Sand' || languages.english.detail !== 'Detail') {
      throw new Error(`English UI failed: ${JSON.stringify(languages.english)}`);
    }
    if (languages.chinese.lang !== 'zh-CN' || languages.chinese.style !== '动态声沙' || languages.chinese.detail !== '细节') {
      throw new Error(`Chinese UI failed: ${JSON.stringify(languages.chinese)}`);
    }

    await win.loadURL(`${base}/website/?source=legacy#demo`);
    await waitFor(win, "location.pathname==='/'", 'legacy website redirect');
    const redirect = await win.webContents.executeJavaScript('({path:location.pathname,search:location.search,hash:location.hash})');
    if (redirect.search !== '?source=legacy' || redirect.hash !== '#demo') throw new Error(`Legacy redirect lost URL state: ${JSON.stringify(redirect)}`);
    if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);
    console.log('PASS Pages branding, shared Web default pattern, per-style details, Lofi audio, bilingual UI, licenses, and /website/ redirect');
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(PROFILE, { recursive: true, force: true });
    app.quit();
  }
}

main().catch((error) => {
  console.error(error);
  fs.rmSync(PROFILE, { recursive: true, force: true });
  app.exit(1);
});
