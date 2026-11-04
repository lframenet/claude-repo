import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = path.join(root, 'node_modules');
const vendor = path.join(root, 'src', 'vendor');

function cp(src, dest, { minOnly = false } = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.statSync(src).isDirectory()) {
    for (const f of fs.readdirSync(src)) cp(path.join(src, f), path.join(dest, f));
    return;
  }
  fs.copyFileSync(src, dest);
}

function rmUnused(dir, keep) {
  for (const f of fs.readdirSync(dir)) {
    if (!keep.some((k) => f.includes(k))) {
      fs.rmSync(path.join(dir, f), { recursive: true, force: true });
    }
  }
}

fs.rmSync(vendor, { recursive: true, force: true });

// CodeMirror core + selected modes/themes/addons
cp(path.join(nm, 'codemirror/lib'), path.join(vendor, 'codemirror/lib'));
const modes = [
  'javascript/javascript.js', 'jsx/jsx.js', 'clike/clike.js', 'python/python.js',
  'htmlmixed/htmlmixed.js', 'xml/xml.js', 'css/css.js', 'javascript/typescript is in clike',
  'markdown/markdown.js', 'gfm/gfm.js', 'yaml/yaml.js', 'shell/shell.js', 'sql/sql.js',
  'diff/diff.js', 'properties/properties.js', 'dockerfile/dockerfile.js', 'cmake/cmake.js',
  'groovy/groovy.js', 'stex/stex.js', 'clike/clike.js', 'ruby/ruby.js', 'php/php.js',
  'lua/lua.js', 'perl/perl.js', 'rust/rust.js', 'swift/swift.js', 'go/go.js', 'java/clike.js',
  'crystal/crystal.js', 'vue/vue.js', 'svelte/svelte.js', 'toml/toml.js', 'cmake/cmake.js',
  'nginx/nginx.js', 'powershell/powershell.js', 'vb/vbscript.js', 'haml/haml.js', 'pug/pug.js',
  'twig/twig.js', 'handlebars/handlebars.js', 'django/django.js', 'jinja2/jinja2.js',
  'sass/sass.js', 'less is css', 'r/r.js', 'sql variants in sql.js', 'commonlisp/commonlisp.js',
  'scheme/scheme.js', 'haskell/haskell.js', 'ocaml is mllike', 'mllike/mllike.js', 'clojure/clojure.js',
  'erlang/erlang.js', 'elixir not present', 'dart/dart.js', 'kotlin is clike', 'solidity not present',
  'coffeescript/coffeescript.js', 'livescript/livescript.js', 'typescript in clike', 'rst/rst.js',
  'orgmode not present -> use meta', 'asciidoc not present -> meta', 'spreadsheet/spreadsheet.js',
];
fs.mkdirSync(path.join(vendor, 'codemirror/mode'), { recursive: true });
// copy whole mode dir is ~3MB; keep it, it's fine — but trim exotic ones to save space
const modeDir = path.join(nm, 'codemirror/mode');
const keepModes = ['javascript', 'jsx', 'clike', 'python', 'htmlmixed', 'xml', 'css', 'markdown', 'gfm', 'yaml', 'shell', 'sql', 'diff', 'properties', 'dockerfile', 'cmake', 'groovy', 'stex', 'ruby', 'php', 'lua', 'perl', 'rust', 'swift', 'go', 'crystal', 'vue', 'svelte', 'toml', 'nginx', 'powershell', 'vbscript', 'haml', 'pug', 'twig', 'handlebars', 'django', 'jinja2', 'sass', 'r', 'commonlisp', 'scheme', 'haskell', 'mllike', 'clojure', 'erlang', 'dart', 'coffeescript', 'livescript', 'rst', 'spreadsheet', 'meta.js', 'apl', 'asciidoc not', 'nginx'];
for (const d of fs.readdirSync(modeDir)) {
  const p = path.join(modeDir, d);
  if (fs.statSync(p).isDirectory() && keepModes.includes(d)) {
    cp(p, path.join(vendor, 'codemirror/mode', d));
  } else if (d === 'meta.js') {
    cp(p, path.join(vendor, 'codemirror/mode', d));
  }
}
cp(path.join(nm, 'codemirror/addon'), path.join(vendor, 'codemirror/addon'), {});
cp(path.join(nm, 'codemirror/keymap/sublime.js'), path.join(vendor, 'codemirror/keymap/sublime.js'));
const themes = ['material-darker.css', 'one-dark.css', 'dracula.css', 'eclipse.css', 'default.css', 'base16-dark.css', 'monokai.css', 'solarized.css'];
fs.mkdirSync(path.join(vendor, 'codemirror/theme'), { recursive: true });
for (const t of themes) {
  const src = path.join(nm, 'codemirror/theme', t);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(vendor, 'codemirror/theme', t));
}

// pdf.js
fs.mkdirSync(path.join(vendor, 'pdfjs'), { recursive: true });
fs.copyFileSync(path.join(nm, 'pdfjs-dist/build/pdf.min.mjs'), path.join(vendor, 'pdfjs/pdf.min.mjs'));
fs.copyFileSync(path.join(nm, 'pdfjs-dist/build/pdf.worker.min.mjs'), path.join(vendor, 'pdfjs/pdf.worker.min.mjs'));

// tesseract worker + core + english traineddata
fs.mkdirSync(path.join(vendor, 'tesseract'), { recursive: true });
fs.copyFileSync(path.join(nm, 'tesseract.js/dist/tesseract.esm.min.js'), path.join(vendor, 'tesseract/tesseract.esm.min.js'));
fs.copyFileSync(path.join(nm, 'tesseract.js/dist/worker.min.js'), path.join(vendor, 'tesseract/worker.min.js'));
fs.mkdirSync(path.join(vendor, 'tesseract-core'), { recursive: true });
fs.copyFileSync(path.join(nm, 'tesseract.js-core/tesseract-core-lstm.wasm.js'), path.join(vendor, 'tesseract-core/tesseract-core-lstm.wasm.js'));
fs.copyFileSync(path.join(nm, 'tesseract.js-core/tesseract-core-lstm.wasm'), path.join(vendor, 'tesseract-core/tesseract-core-lstm.wasm'));
fs.mkdirSync(path.join(vendor, 'tesseract-lang'), { recursive: true });

const langUrl = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata';
const langDest = path.join(vendor, 'tesseract-lang/eng.traineddata');
if (!fs.existsSync(langDest)) {
  const r = await fetch(langUrl);
  if (!r.ok) throw new Error('traineddata download failed: ' + r.status);
  fs.writeFileSync(langDest, Buffer.from(await r.arrayBuffer()));
}

// mammoth
fs.mkdirSync(path.join(vendor), { recursive: true });
fs.copyFileSync(path.join(nm, 'mammoth/mammoth.browser.min.js'), path.join(vendor, 'mammoth.browser.min.js'));

console.log('vendor ready:', fs.readdirSync(vendor).join(', '));
