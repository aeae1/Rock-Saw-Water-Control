import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || ['node_modules', 'test-results', 'playwright-report'].includes(entry.name)) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}

let checked = 0;
const errors = [];
for (const file of markdownFiles(root)) {
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const url = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('#')) continue;
    const target = resolve(dirname(file), decodeURIComponent(url.split(/[?#]/)[0]));
    checked++;
    if (!target.startsWith(root + sep) || !existsSync(target)) errors.push(`${relative(root, file)}: missing/local-outside-repository target ${url}`);
  }
}
const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
if (!readme.slice(0, 600).includes('https://aeae1.github.io/Rock-Saw-Water-Control/')) errors.push('README simulator link must remain near the top.');
const png = readFileSync(resolve(root, 'docs/assets/hardware/water-controller-wiring-flow.png'));
if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') errors.push('Current wiring overview must be a PNG, not an error response.');
if (!readme.includes('![Revision C circuit sheet 03:')) errors.push('README must display the current detailed schematic preview.');
// Open wire bends must not acquire SVG\'s default black polygon fill.
for (const file of readdirSync(resolve(root, 'docs/assets/hardware')).filter(name => name.endsWith('.svg'))) {
  const svg = readFileSync(resolve(root, 'docs/assets/hardware', file), 'utf8');
  for (const [tag] of svg.matchAll(/<polyline\b[^>]*>/g)) {
    if (!/fill\s*=\s*["']none["']|fill\s*:\s*none\b/.test(tag)) errors.push(`${file}: an open wire polyline has no explicit fill=none.`);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Documentation checks passed: ${checked} local links, prominent simulator link, PNG signature.`);
