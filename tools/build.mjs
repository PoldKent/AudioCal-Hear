import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const MODULES = [
  'src/js/01-core.js',
  'src/js/02-setup.js',
  'src/js/03-hearing-test.js',
  'src/js/03b-frequency-sweep.js',
  'src/js/04-equalization.js',
  'src/js/05-audio-player.js',
  'src/js/05b-eq-transfer.js',
  'src/js/05c-loudness.js',
  'src/js/05d-evidence.js',
  'src/js/06-interactions.js'
];

const template = read('src/index.template.html');
const css = read('src/styles.css');
const json = read('src/translations.json');
const script = MODULES.map(read).join('');
const translations = JSON.parse(json);
for (const locale of ['en', 'fr', 'pt', 'it', 'de', 'zh', 'ja']) {
  if (!translations[locale] || typeof translations[locale] !== 'object')
    throw Error('Missing translation dictionary: ' + locale);
}
new vm.Script(script, {filename: 'audiocal-embedded.js'});
function inject(html, token, replacement) {
  if (html.split(token).length !== 2) throw Error('Expected exactly one ' + token + ' token');
  if (replacement.includes(token)) throw Error('Source contains reserved token ' + token);
  return html.replace(token, replacement);
}
let output = inject(template, '__AUDIOCAL_CSS__', css);
output = inject(output, '__AUDIOCAL_I18N__', json);
output = inject(output, '__AUDIOCAL_JS__', script);
if (!output.startsWith('<!doctype html>') || !output.trimEnd().endsWith('</html>')) throw Error('HTML output is incomplete');

if (process.argv.includes('--check')) {
  if (output !== read('index.html')) {
    console.error('Generated HTML differs from index.html. Run npm run build and commit the result.');
    process.exitCode = 1;
  } else {
    console.log('Verified: index.html is byte-identical to generated standalone HTML.');
  }
} else {
  fs.writeFileSync(path.join(ROOT, 'index.html'), output, 'utf8');
  console.log('Built index.html (' + Buffer.byteLength(output, 'utf8') + ' bytes).');
}
