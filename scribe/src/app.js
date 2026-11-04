import * as pdfjs from 'app:vendor/pdfjs/pdf.min.mjs';

const $ = (id) => document.getElementById(id);
const scribe = window.scribe;

/* ---------------- pdf.js setup ---------------- */
pdfjs.GlobalWorkerOptions.workerSrc = 'app:vendor/pdfjs/pdf.worker.min.mjs';

/* ---------------- language map ---------------- */
const EXT_MODE = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx',
  ts: 'text/typescript', mts: 'text/typescript', cts: 'text/typescript', tsx: 'text/typescript',
  py: 'python', pyw: 'python',
  html: 'htmlmixed', htm: 'htmlmixed', xhtml: 'htmlmixed', vue: 'htmlmixed', svelte: 'htmlmixed',
  css: 'css', scss: 'text/x-scss', less: 'text/x-less',
  json: 'application/json', map: 'application/json',
  xml: 'xml', svg: 'xml', xhtml: 'xml',
  md: 'markdown', markdown: 'markdown', gfm: 'gfm',
  yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'properties', cfg: 'properties', conf: 'properties', env: 'properties', properties: 'properties',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
  sql: 'text/x-sql',
  c: 'text/x-csrc', h: 'text/x-csrc', cpp: 'text/x-c++src', cc: 'text/x-c++src', cxx: 'text/x-c++src', hpp: 'text/x-c++src',
  cs: 'text/x-csharp', java: 'text/x-java', go: 'text/x-go', rs: 'text/x-rust', swift: 'text/x-swift',
  kt: 'text/x-kotlin', php: 'application/x-httpd-php', rb: 'text/x-ruby', pl: 'text/x-perl',
  lua: 'text/x-lua', r: 'text/x-rsrc', m: 'text/x-objectivec',
  diff: 'diff', patch: 'diff', log: 'text',
  csv: 'text', tex: 'stex', org: 'orgmode', adoc: 'asciidoc', rst: 'rst',
  dockerfile: 'dockerfile', makefile: 'makefile', cmake: 'cmake', gradle: 'groovy',
};
const MODE_NAMES = new Set(['javascript', 'jsx', 'text/typescript', 'python', 'htmlmixed', 'css', 'markdown', 'gfm', 'yaml', 'xml', 'shell', 'application/json']);
const PLAIN_EXTS = new Set(['txt', 'text', 'log', 'csv', 'gitignore', 'env']);

function extOf(name) {
  const m = /\.([A-Za-z0-9]+)$/.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}
function modeFor(name) {
  const e = extOf(name);
  if (EXT_MODE[e]) return EXT_MODE[e];
  if (e === 'rtf' || e === 'pdf' || e === 'doc' || e === 'docx') return null;
  return null;
}

/* ---------------- editor ---------------- */
const editor = CodeMirror.fromTextArea($('editor'), {
  lineNumbers: true,
  lineWrapping: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  styleActiveLine: true,
  indentUnit: 2,
  tabSize: 2,
  keyMap: 'sublime',
  foldGutter: true,
  gutters: ['CodeMirror-linenumber', 'CodeMirror-foldgutter'],
  extraKeys: {
    'Cmd-S': () => save(),
    'Ctrl-S': () => save(),
    'Shift-Cmd-S': () => saveAs(),
    'Shift-Ctrl-S': () => saveAs(),
    'Cmd-N': () => newDoc(),
    'Cmd-O': () => openDialog(),
    'Shift-Cmd-T': () => toggleTheme(),
  },
});
CodeMirror.modeURL = 'app:vendor/codemirror/mode/%N/%N.js';

const state = {
  path: null,          // current file path (null = unsaved)
  name: 'Untitled.txt',
  kind: 'text',
  originalText: '',
  dirty: false,
  readOnly: false,
  binaryHint: null,
};

function setModeFor(name) {
  const mode = modeFor(name);
  if (mode && MODE_NAMES.has(mode)) {
    CodeMirror.modeLoadPromise = CodeMirror.requireMode(mode, () => {});
    editor.setOption('mode', mode);
  } else if (mode) {
    CodeMirror.requireMode(mode, () => editor.setOption('mode', mode));
  } else {
    editor.setOption('mode', null);
  }
}

function setReadOnly(ro) {
  state.readOnly = ro;
  editor.setOption('readOnly', ro ? 'nocursor' : false);
  $('btn-save').disabled = ro;
  $('btn-save-as').disabled = false;
}

function updateChrome() {
  $('doc-title').textContent = state.name + (state.dirty ? ' — Edited' : '');
  $('doc-dot').classList.toggle('dirty', state.dirty);
  $('doc-kind').textContent = state.kind.toUpperCase();
  $('btn-reveal').disabled = !state.path;
  scribe.setRepresented(state.path || '');
  scribe.setEdited(state.dirty);
  updateStatus();
}

function updateStatus() {
  const cur = editor.getCursor();
  const text = editor.getValue();
  $('st-pos').textContent = `Ln ${cur.line + 1}, Col ${cur.ch + 1}`;
  $('st-count').textContent = `${text.length.toLocaleString()} chars`;
  $('st-enc').textContent = 'UTF-8';
  const p = state.path || state.name;
  $('st-left').textContent = p + (state.dirty ? ' •' : '');
}

editor.on('cursorActivity', updateStatus);
editor.on('change', () => {
  if (state.readOnly) return;
  const now = editor.getValue();
  const dirty = now !== state.originalText;
  if (dirty !== state.dirty) { state.dirty = dirty; updateChrome(); }
});

/* ---------------- document model ---------------- */
function loadTextDoc({ name, text, kind }) {
  state.path = null;
  state.name = name;
  state.kind = kind || 'text';
  state.originalText = text;
  state.dirty = false;
  setReadOnly(false);
  setModeFor(name);
  editor.setValue(text);
  editor.clearHistory();
  editor.focus();
  updateChrome();
}

function loadFileDoc({ path, name, text, kind, readOnly }) {
  state.path = path;
  state.name = name;
  state.kind = kind;
  state.originalText = text;
  state.dirty = false;
  setReadOnly(!!readOnly);
  setModeFor(name);
  editor.setValue(text);
  editor.clearHistory();
  editor.focus();
  scribe.addRecent(path);
  updateChrome();
}

async function openPaths(paths) {
  for (const p of paths) {
    try { await openPath(p); } catch (e) { showError(`Could not open ${p}: ${e.message}`); }
  }
}

async function openPath(p) {
  const res = await scribe.readFile(p);
  if (!res.ok) throw new Error(res.error || 'unreadable');
  const buf = Uint8Array.from(atob(res.data), (c) => c.charCodeAt(0));
  const name = res.name;
  const ext = extOf(name);
  showProgress(true, `Reading ${name}…`, 10);
  try {
    if (ext === 'pdf') return await openPdf(p, name, buf);
    if (ext === 'docx') return await openDocx(p, name, buf);
    if (ext === 'rtf') return await openRtf(p, name, buf);
    if (ext === 'doc') return await openLegacyDoc(p, name, buf);
    return openPlain(p, name, buf);
  } finally {
    showProgress(false);
  }
}

function openPlain(p, name, buf) {
  const text = decodeText(buf);
  loadFileDoc({ path: p, name, text, kind: PLAIN_EXTS.has(extOf(name)) ? 'text' : extOf(name) || 'text' });
}

function decodeText(buf) {
  const td = new TextDecoder('utf-8', { fatal: false });
  return td.decode(buf);
}

/* ---------------- PDF ---------------- */
async function openPdf(path, name, buf) {
  const pdf = await pdfjs.getDocument({ data: buf.slice() }).promise;
  const pages = [];
  let total = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const strings = content.items.map((it) => it.str);
    const text = strings.join(' ').replace(/\s+/g, ' ').trim();
    pages.push({ n: i, w: vp.width, h: vp.height, text, empty: !text });
    total += text.length;
    showProgress(true, `Reading ${name} — page ${i}/${pdf.numPages}`, (i / pdf.numPages) * 70);
  }
  const hasText = total > 40;
  const text = pages.map((pg) => `───── Page ${pg.n} ─────\n${pg.text}`).join('\n\n');
  loadFileDoc({ path, name, text: hasText ? text : '(No embedded text — this looks like a scanned PDF. Use “OCR PDF” to transcribe it.)\n\n' + text, kind: 'pdf', readOnly: false });
  window.__pdf = { doc: pdf, pages };
  $('btn-ocr').disabled = false;
}

async function runOcr() {
  const ctx = window.__pdf;
  if (!ctx) return;
  const { doc, pages } = ctx;
  const lang = 'eng';
  showProgress(true, 'Preparing OCR engine…', 5);
  const { createWorker } = await import('app:vendor/tesseract/tesseract.esm.min.js');
  const worker = await createWorker(lang, 1, {
    workerPath: 'app:vendor/tesseract/worker.min.js',
    corePath: 'app:vendor/tesseract-core/tesseract-core-lstm.wasm.js',
    langPath: 'app:vendor/tesseract-lang',
    cacheMethod: 'none',
    logger: (m) => {
      if (m.status === 'recognizing text') {
        showProgress(true, `OCR page ${m.progress ? '' : ''}${currentOcrPage}/${doc.numPages}`, 20 + 75 * m.progress);
      }
    },
  });
  const out = [];
  let currentOcrPage = 0;
  for (const pg of pages) {
    currentOcrPage = pg.n;
    showProgress(true, `OCR — rendering page ${pg.n}/${doc.numPages}`, 15 + (pg.n / doc.numPages) * 20);
    const page = await doc.getPage(pg.n);
    const scale = 2.2;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    showProgress(true, `OCR — recognizing page ${pg.n}/${doc.numPages}…`, 20 + (pg.n / doc.numPages) * 75);
    const { data } = await worker.recognize(canvas);
    out.push(`───── Page ${pg.n} ─────\n${data.text.trim()}`);
  }
  await worker.terminate();
  const text = out.join('\n\n');
  if (state.kind === 'pdf') {
    editor.setValue(text);
    state.originalText = text;
    state.dirty = false;
    updateChrome();
  }
  showProgress(false);
  flashStatus(`OCR complete — ${doc.numPages} page(s) transcribed.`);
}

/* ---------------- DOCX ---------------- */
async function openDocx(path, name, buf) {
  const html = await mammoth.convertToHtml({ arrayBuffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
  const tmp = document.createElement('div');
  tmp.innerHTML = html.value || '';
  const text = htmlToText(tmp);
  loadFileDoc({ path, name, text, kind: 'docx' });
}

function htmlToText(root) {
  const blocks = [];
  root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, tr').forEach((el) => {
    const t = el.textContent.replace(/\s+/g, ' ').trim();
    if (t) blocks.push(t);
  });
  return blocks.join('\n');
}

/* ---------------- RTF ---------------- */
function openRtf(path, name, buf) {
  const raw = decodeText(buf);
  const text = rtfToText(raw);
  loadFileDoc({ path, name, text, kind: 'rtf' });
}

function rtfToText(rtf) {
  const out = [];
  let i = 0;
  const stack = [];
  let skip = 0;
  while (i < rtf.length) {
    const c = rtf[i];
    if (c === '{') { stack.push({ skip }); i++; continue; }
    if (c === '}') { const s = stack.pop(); if (s) skip = s.skip; i++; continue; }
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i));
      if (m) {
        const [, cmd, param] = m;
        if (cmd === 'par') out.push('\n');
        else if (cmd === 'line' || cmd === 'sect') out.push('\n');
        else if (cmd === 'tab') out.push('\t');
        else if (cmd === 'u' && param) { try { out.push(String.fromCodePoint(parseInt(param, 10))); } catch (_) {} }
        else if (cmd === "'" ) {
          const hex = rtf.slice(i + 2, i + 4);
          if (/^[0-9a-fA-F]{2}$/.test(hex)) out.push(String.fromCharCode(parseInt(hex, 16)));
          i += 4; continue;
        }
        if (['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'themedata', 'datastore', 'xmlnstbl', 'generator'].includes(cmd)) skip++;
        i += m[0].length; continue;
      }
      i += 2; continue;
    }
    if (skip > 0) { i++; continue; }
    if (c === '\n' || c === '\r') { i++; continue; }
    out.push(c); i++;
  }
  return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------------- legacy DOC (best-effort) ---------------- */
function openLegacyDoc(path, name, buf) {
  const text = extractDocText(buf);
  loadFileDoc({ path, name, text, kind: 'doc' });
}

function extractDocText(buf) {
  // Word 97-2003 stores text in the WordDocument stream as UTF-16LE / Windows-1252 mix.
  // Simple heuristic: scan for runs of printable UTF-16LE chars and latin1 chars.
  const s = new TextDecoder('latin1').decode(buf);
  const chunks = [];
  let cur = '';
  const isWord = (ch) => (ch >= ' ' && ch <= '~') || ch === '\n' || ch === '\t' || ch >= ' ' ;
  for (let i = 0; i < s.length; i += 2) {
    const lo = s.charCodeAt(i), hi = s.charCodeAt(i + 1);
    const ch = hi === 0 && lo >= 32 && lo < 127 ? String.fromCharCode(lo) : null;
    if (ch) { cur += ch === '\r' ? '\n' : ch; }
    else { if (cur.trim().length >= 3) chunks.push(cur); cur = ''; }
  }
  if (cur.trim().length >= 3) chunks.push(cur);
  let text = chunks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) {
    // fallback: latin1 run
    const m = s.match(/[\x20-\x7E\n\t]{40,}/g);
    text = m ? m.join('\n') : '(Could not extract text from this legacy .doc file. Try converting it to .docx in TextEdit/Pages first.)';
  }
  return text;
}

/* ---------------- actions ---------------- */
function newDoc() {
  state.path = null; state.name = 'Untitled.txt'; state.kind = 'text';
  state.originalText = ''; state.dirty = false;
  setReadOnly(false); setModeFor('Untitled.txt');
  editor.setValue(''); editor.clearHistory(); editor.focus();
  updateChrome();
}

async function openDialog() {
  const paths = await scribe.openDialog();
  if (paths && paths.length) await openPaths(paths);
}

async function save() {
  if (state.readOnly) return;
  let p = state.path;
  if (!p) return saveAs();
  const text = editor.getValue();
  await scribe.writeFile(p, text);
  state.originalText = text; state.dirty = false;
  updateChrome();
  flashStatus(`Saved ${state.name}`);
}

async function saveAs() {
  const p = await scribe.saveDialog(state.name);
  if (!p) return;
  state.path = p; state.name = p.split('/').pop();
  setModeFor(state.name);
  await scribe.writeFile(p, editor.getValue());
  state.originalText = editor.getValue(); state.dirty = false;
  scribe.addRecent(p);
  updateChrome();
  flashStatus(`Saved as ${state.name}`);
}

async function revert() {
  if (state.path) await openPath(state.path);
}

function toggleTheme() {
  const cur = document.documentElement.dataset.theme || 'auto';
  const next = cur === 'auto' ? (prefersDark() ? 'light' : 'dark') : cur === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('scribe.theme', next);
}
function prefersDark() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme(t) {
  const eff = t === 'auto' ? (prefersDark() ? 'dark' : 'light') : t;
  document.documentElement.dataset.theme = eff;
  editor.setOption('theme', eff === 'dark' ? 'material-darker' : 'eclipse');
  $('opt-theme').value = t;
}

function showProgress(show, label, pct) {
  const p = $('progress');
  p.hidden = !show;
  if (show) {
    $('progress-label').textContent = label || '';
    $('progress-bar').style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
  }
}

let statusTimer = null;
function flashStatus(msg) {
  $('st-left').textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(updateStatus, 2500);
}
function showError(msg) { flashStatus(msg); }

/* ---------------- drag & drop ---------------- */
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; $('drop-hint').hidden = false; });
window.addEventListener('dragleave', (e) => { e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; $('drop-hint').hidden = true; } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0; $('drop-hint').hidden = true;
  const files = e.dataTransfer && e.dataTransfer.files;
  if (files && files.length) openPaths(Array.from(files).map((f) => f.path));
});

/* ---------------- toolbar wiring ---------------- */
$('btn-new').onclick = newDoc;
$('btn-open').onclick = openDialog;
$('btn-save').onclick = save;
$('btn-save-as').onclick = saveAs;
$('btn-ocr').onclick = runOcr;
$('btn-reveal').onclick = () => state.path && scribe.reveal(state.path);
$('opt-wrap').onchange = (e) => editor.setOption('lineWrapping', e.target.checked);
$('opt-theme').onchange = (e) => { applyTheme(e.target.value); localStorage.setItem('scribe.theme', e.target.value); };
$('opt-font').onchange = (e) => {
  const v = e.target.value;
  const f = v === 'mono' ? '"SF Mono", ui-monospace, Menlo, Consolas, monospace' : v === 'serif' ? 'Georgia, "Times New Roman", serif' : '';
  document.documentElement.style.setProperty('--ed-font', f || 'inherit');
  editor.refresh();
};
$('opt-size').onchange = (e) => {
  document.documentElement.style.setProperty('--ed-size', e.target.value + 'px');
  editor.refresh();
};

/* ---------------- menu / external events ---------------- */
scribe.onMenu((action) => {
  if (action === 'new') newDoc();
  else if (action === 'open') openDialog();
  else if (action === 'save') save();
  else if (action === 'saveAs') saveAs();
  else if (action === 'revert') revert();
  else if (action === 'reveal') state.path && scribe.reveal(state.path);
  else if (action === 'toggleTheme') toggleTheme();
});
scribe.onOpenPath((p) => openPaths([p]));
scribe.onOpenPaths((ps) => openPaths(ps));

/* ---------------- init ---------------- */
applyTheme(localStorage.getItem('scribe.theme') || 'auto');
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((localStorage.getItem('scribe.theme') || 'auto') === 'auto') applyTheme('auto');
});
updateChrome();
