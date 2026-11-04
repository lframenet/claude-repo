'use strict';

const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isPackaged = app.isPackaged;
const appBase = isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
  '.traineddata': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.map': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, bypassCSP: false } },
]);

const recentPath = path.join(app.getPath('userData'), 'recent.json');
let recentFiles = [];
try { recentFiles = JSON.parse(fs.readFileSync(recentPath, 'utf8')); } catch (_) { recentFiles = []; }

function saveRecent() {
  try { fs.writeFileSync(recentPath, JSON.stringify(recentFiles.slice(0, 10))); } catch (_) {}
}
function addRecent(p) {
  if (!p) return;
  recentFiles = [p, ...recentFiles.filter((f) => f !== p)].slice(0, 10);
  saveRecent();
  try { app.addRecentDocument(p); } catch (_) {}
}

let mainWindow = null;
const pendingOpen = [];

function sendToWindow(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function flushPendingOpen() {
  if (pendingOpen.length && mainWindow) {
    sendToWindow('open-paths', pendingOpen.splice(0));
  }
}

function buildMenu() {
  const recentSubmenu = [
    ...recentFiles.map((f) => ({
      label: f.length > 60 ? '…' + f.slice(-57) : f,
      click: () => sendToWindow('open-path', f),
    })),
    ...(recentFiles.length ? [{ type: 'separator' }] : []),
    { label: 'Clear Menu', enabled: recentFiles.length > 0, click: () => { recentFiles = []; saveRecent(); buildMenu(); sendToWindow('recent-cleared', true); } },
  ];

  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendToWindow('menu', 'new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => sendToWindow('menu', 'open') },
        { label: 'Open Recent', submenu: recentSubmenu.length ? recentSubmenu : [{ label: 'No Recent Documents', enabled: false }] },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendToWindow('menu', 'save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendToWindow('menu', 'saveAs') },
        { label: 'Revert to Saved', click: () => sendToWindow('menu', 'revert') },
        { type: 'separator' },
        { label: 'Reveal in Finder', click: () => sendToWindow('menu', 'reveal') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'pasteAndMatchStyle' },
        { role: 'delete' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Theme', accelerator: 'CmdOrCtrl+Shift+T', click: () => sendToWindow('menu', 'toggleTheme') },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'close' }, { role: 'front' }],
    },
  ];
  if (!isPackaged) {
    template.push({
      label: 'Developer',
      submenu: [
        { role: 'reload' }, { role: 'toggleDevTools' },
      ],
    });
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  if (app.dock) {
    const dockMenu = Menu.buildFromTemplate([
      { label: 'New', click: () => sendToWindow('menu', 'new') },
      { label: 'Open…', click: () => sendToWindow('menu', 'open') },
      { type: 'separator' },
      ...recentFiles.slice(0, 5).map((f) => ({ label: path.basename(f), click: () => sendToWindow('open-path', f) })),
    ]);
    app.dock.setMenu(dockMenu);
  }
}

function createWindow() {
  const dark = require('electron').nativeTheme.shouldUseDarkColors;
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 640,
    minHeight: 420,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: dark ? '#1e1e1e' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => { mainWindow.show(); flushPendingOpen(); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/src/index.html';
    const filePath = path.join(appBase, rel);
    if (!filePath.startsWith(appBase)) return new Response('Forbidden', { status: 403 });
    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return new Response(data, { headers: { 'Content-Type': MIME[ext] || 'application/octet-stream' } });
    } catch (_) {
      return new Response('Not Found', { status: 404 });
    }
  });

  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) { app.quit(); return; }
  app.on('second-instance', (_e, argv) => {
    const files = argv.slice(1).filter((a) => !a.startsWith('-') && fs.existsSync(a));
    if (files.length) { pendingOpen.push(...files); flushPendingOpen(); }
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });

  app.on('open-file', (event, p) => { event.preventDefault(); pendingOpen.push(p); flushPendingOpen(); });

  createWindow();
  buildMenu();

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  app.on('window-all-closed', () => app.quit());
});

app.on('will-finish-launching', () => {
  app.on('open-file', (event, p) => { event.preventDefault(); pendingOpen.push(p); });
});

const OPEN_FILTERS = [
  { name: 'All Supported', extensions: ['txt', 'md', 'markdown', 'text', 'rtf', 'pdf', 'doc', 'docx', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'py', 'pyw', 'html', 'htm', 'xhtml', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'sh', 'bash', 'zsh', 'fish', 'sql', 'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'cs', 'java', 'go', 'rs', 'swift', 'kt', 'php', 'rb', 'pl', 'lua', 'r', 'm', 'swift', 'vue', 'svelte', 'diff', 'patch', 'log', 'csv', 'env', 'gitignore', 'dockerfile', 'makefile', 'cmake', 'gradle', 'properties', 'svg', 'tex', 'org', 'adoc', 'rst'] },
  { name: 'Documents', extensions: ['txt', 'md', 'rtf', 'pdf', 'doc', 'docx'] },
  { name: 'Code', extensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'py', 'html', 'htm', 'css', 'json', 'yaml', 'yml', 'xml', 'sh', 'sql', 'c', 'cpp', 'h', 'java', 'go', 'rs', 'swift', 'php', 'rb', 'lua'] },
  { name: 'All Files', extensions: ['*'] },
];

ipcMain.handle('dialog:open', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: OPEN_FILTERS });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('dialog:save', async (_e, defaultName) => {
  const r = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName || 'Untitled.txt', filters: [{ name: 'All Files', extensions: ['*'] }] });
  return r.canceled ? null : r.filePath;
});
ipcMain.handle('fs:read', async (_e, p) => {
  const st = fs.statSync(p);
  if (st.size > 256 * 1024 * 1024) return { ok: false, error: 'File too large (256 MB max)' };
  const buf = fs.readFileSync(p);
  return { ok: true, name: path.basename(p), size: st.size, data: buf.toString('base64') };
});
ipcMain.handle('fs:write', async (_e, { path: p, text }) => {
  fs.writeFileSync(p, text, 'utf8');
  addRecent(p);
  return { ok: true };
});
ipcMain.handle('fs:exists', async (_e, p) => fs.existsSync(p));
ipcMain.handle('shell:reveal', async (_e, p) => { if (p) shell.showItemInFolder(p); });
ipcMain.handle('recent:get', async () => recentFiles);
ipcMain.handle('doc:addRecent', async (_e, p) => { addRecent(p); buildMenu(); });
ipcMain.handle('win:setRepresented', async (_e, p) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.setRepresentedFilename(p || ''); } catch (_) {}
  }
});
ipcMain.handle('win:setEdited', async (_e, edited) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setDocumentEdited(!!edited);
});
