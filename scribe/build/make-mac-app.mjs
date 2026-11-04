import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const archArg = process.argv[2] || 'arm64';
const arch = archArg === 'x64' ? 'x64' : 'arm64';

console.log(`Building Scribe.app for darwin-${arch} …`);

// 1. vendor assets
execFileSync(process.execPath, [path.join(root, 'build/vendor.mjs')], { stdio: 'inherit' });

// 2. download matching electron zip
const electronVersion = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/electron/package.json'), 'utf8')).version;
const zipName = `electron-v${electronVersion}-darwin-${arch}.zip`;
const cacheDir = path.join(root, 'build/cache');
fs.mkdirSync(cacheDir, { recursive: true });
const zipPath = path.join(cacheDir, zipName);
if (!fs.existsSync(zipPath)) {
  const url = `https://github.com/electron/electron/releases/download/v${electronVersion}/${zipName}`;
  console.log('Downloading', url);
  const r = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!r.ok) throw new Error('download failed: ' + r.status);
  fs.writeFileSync(zipPath, Buffer.from(await r.arrayBuffer()));
}

// 3. unzip to dist
const dist = path.join(root, 'dist', `darwin-${arch}`);
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
execFileSync('unzip', ['-q', '-o', zipPath, '-d', dist]);

const appPath = path.join(dist, 'Electron.app');
const newAppPath = path.join(dist, 'Scribe.app');
fs.renameSync(appPath, newAppPath);

const macosDir = path.join(newAppPath, 'Contents', 'MacOS');
for (const exe of fs.readdirSync(macosDir)) {
  if (exe !== 'Scribe') fs.renameSync(path.join(macosDir, exe), path.join(macosDir, 'Scribe'));
}

// 4. replace app package
const contents = path.join(newAppPath, 'Contents');
const res = path.join(contents, 'Resources');
fs.rmSync(path.join(res, 'app'), { recursive: true, force: true });
fs.rmSync(path.join(res, 'default_app.asar'), { force: true });
fs.mkdirSync(path.join(res, 'app'), { recursive: true });
const appSrc = path.join(root, 'src');
fs.cpSync(appSrc, path.join(res, 'app/src'), { recursive: true });
fs.cpSync(path.join(root, 'package.json'), path.join(res, 'app/package.json'));
fs.cpSync(path.join(root, 'build/Info.plist'), path.join(contents, 'Info.plist'));

// 5. icon (icns generated at build time from PNG)
const iconSrc = path.join(root, 'build/AppIcon.icns');
if (fs.existsSync(iconSrc)) fs.copyFileSync(iconSrc, path.join(res, 'AppIcon.icns'));

// 6. trim resources not needed
fs.rmSync(path.join(res, 'LICENSE'), { force: true });
fs.rmSync(path.join(res, 'LICENSES.chromium.html'), { force: true });
fs.rmSync(path.join(res, 'version'), { force: true });

console.log('Scribe.app assembled at', newAppPath);
console.log('Size:', execFileSync('du', ['-sh', newAppPath]).toString().trim());
