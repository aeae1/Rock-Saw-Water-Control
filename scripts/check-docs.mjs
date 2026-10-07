import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

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
if (!readme.includes('![Revision D circuit sheet 03:')) errors.push('README must display the current detailed schematic preview.');
if (!readme.includes('![Realistic Revision D assembly concept')) errors.push('README must display the current realistic assembly illustration.');
const image = readFileSync(resolve(root, 'docs/assets/hardware/assembly-concept-rev-d.png'));
if (image.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') errors.push('Assembly illustration must be a PNG.');
const netlistBytes = readFileSync(resolve(root, 'hardware/rev-d/netlist.json'));
const netlist = JSON.parse(netlistBytes);
const single = readFileSync(resolve(root, 'docs/assets/hardware/water-controller-single-page-rev-d.svg'), 'utf8');
const hash = data => createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(root, 'hardware/rev-d/single-page-manifest.json')));
if (manifest.pdf_pages !== 1 || manifest.netlist_sha256 !== hash(netlistBytes)) errors.push('Single-page export manifest is stale or not one page.');
for (const [name, sha] of Object.entries(manifest.outputs)) {
  if (hash(readFileSync(resolve(root, 'docs/assets/hardware', name))) !== sha) errors.push('Stale single-page export: '+name);
}
if (!single.includes(`data-netlist-sha256="${hash(netlistBytes)}"`)) errors.push('Single-page schematic has a stale netlist.');
const attr = (tag,key) => tag.match(new RegExp(`${key}="([^"]*)"`))?.[1];
const wires = [...single.matchAll(/<g\b[^>]*data-wire-id="[^>]+>/g)].map(([tag]) => ({id:attr(tag,'data-wire-id'),net:attr(tag,'data-net'),from:attr(tag,'data-from'),to:attr(tag,'data-to')}));
const expected = netlist.wires.map(({id,net,from,to}) => ({id,net,from,to}));
if (JSON.stringify(wires) !== JSON.stringify(expected)) errors.push('Single-page connection register differs from the audited netlist.');
const parts = [...single.matchAll(/<g\b[^>]*data-component-ref="[^>]+>/g)].map(([tag]) => [attr(tag,'data-component-ref'),attr(tag,'data-component-part')]);
if (JSON.stringify(parts) !== JSON.stringify(Object.entries(netlist.components).map(([ref,c]) => [ref,c.part]))) errors.push('Single-page component register differs from the audited netlist.');
const circuits = [...single.matchAll(/<g\b[^>]*data-circuit-source="[^>]+>/g)];
if (circuits.length !== 6) errors.push('Single-page schematic must include all six circuit sections.');
for (const [tag] of circuits) {
  const source = readFileSync(resolve(root, 'docs/assets/hardware', attr(tag,'data-circuit-source')));
  if (attr(tag,'data-source-sha256') !== hash(source)) errors.push('Single-page circuit section is stale: '+attr(tag,'data-circuit-source'));
}
// Open wire bends must not acquire SVG\'s default black polygon fill.
for (const file of readdirSync(resolve(root, 'docs/assets/hardware')).filter(name => name.endsWith('.svg'))) {
  const svg = readFileSync(resolve(root, 'docs/assets/hardware', file), 'utf8');
  for (const [tag] of svg.matchAll(/<polyline\b[^>]*>/g)) {
    if (!/fill\s*=\s*["']none["']|fill\s*:\s*none\b/.test(tag)) errors.push(`${file}: an open wire polyline has no explicit fill=none.`);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Documentation checks passed: ${checked} local links, simulator link, PNG images, six schematic sections, ${wires.length} connections and ${parts.length} components.`);
