import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DOMParser } from 'linkedom';

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
if (!readme.includes('![Revision F circuit sheet 03:')) errors.push('README must display the current detailed schematic preview.');
if (!readme.includes('![Revision F assembly concept')) errors.push('README must display the current meter-free assembly illustration.');
const image = readFileSync(resolve(root, 'docs/assets/hardware/assembly-concept-rev-f.png'));
if (image.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') errors.push('Assembly illustration must be a PNG.');
const netlistBytes = readFileSync(resolve(root, 'hardware/rev-f/netlist.json'));
const netlist = JSON.parse(netlistBytes);
const shopping = JSON.parse(readFileSync(resolve(root, 'docs/shopping-data.json')));
const purchasing = [...shopping.items, ...shopping.smallParts, ...shopping.reusedParts];
const purchasedRefs = purchasing.flatMap(item => item.refs || []);
if (new Set(purchasedRefs).size !== purchasedRefs.length || JSON.stringify(purchasedRefs.toSorted()) !== JSON.stringify(Object.keys(netlist.components).toSorted())) errors.push('Every schematic component must appear exactly once in purchasing or reuse records.');
for (const item of shopping.smallParts) {
  if (item.installed !== item.refs.length || item.buy < item.installed || !Number.isInteger(item.buy) || item.price <= 0 || !item.url.startsWith('https://')) errors.push(`Invalid small-parts purchase: ${item.part}`);
}
const passiveTotal = Math.round(shopping.smallParts.reduce((sum,item) => sum + item.buy * item.price,0)*100)/100;
if (shopping.items.find(item => item.item === 'Small electronic parts').price !== passiveTotal) errors.push('Main passive-parts budget differs from the individual purchase lots.');
const preview = readFileSync(resolve(root, 'docs/assets/hardware/water-controller-single-page-rev-f.png'));
if (preview.subarray(-12).toString('hex') !== '0000000049454e44ae426082') errors.push('Single-page PNG is truncated or has no IEND chunk.');
const single = readFileSync(resolve(root, 'docs/assets/hardware/water-controller-single-page-rev-f.svg'), 'utf8');
const hash = data => createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(root, 'hardware/rev-f/single-page-manifest.json')));
if (manifest.pdf_pages !== 1 || manifest.netlist_sha256 !== hash(netlistBytes)) errors.push('Single-page export manifest is stale or not one page.');
for (const [name, sha] of Object.entries(manifest.outputs)) {
  if (hash(readFileSync(resolve(root, 'docs/assets/hardware', name))) !== sha) errors.push('Stale single-page export: '+name);
}
if (!single.includes(`data-netlist-sha256="${hash(netlistBytes)}"`)) errors.push('Single-page schematic has a stale netlist.');
const attr = (tag,key) => tag.match(new RegExp(`${key}="([^"]*)"`))?.[1];
const wires = [...single.matchAll(/<g\b[^>]*data-wire-id="[^>]+>/g)].map(([tag]) => ({id:attr(tag,'data-wire-id'),net:attr(tag,'data-net'),from:attr(tag,'data-from'),to:attr(tag,'data-to')}));
const expected = netlist.wires.map(({id,net,from,to}) => ({id,net,from,to}));
if (JSON.stringify(wires) !== JSON.stringify(expected)) errors.push('Single-page drawn wires differ from the audited netlist.');
const parts = [...single.matchAll(/<g\b[^>]*data-component-ref="[^>]+>/g)].map(([tag]) => [attr(tag,'data-component-ref'),attr(tag,'data-component-part')]);
if (JSON.stringify(parts) !== JSON.stringify(Object.entries(netlist.components).map(([ref,c]) => [ref,c.part]))) errors.push('Single-page component register differs from the audited netlist.');
if (manifest.drawing_type !== 'continuous-wiring' || !single.includes('data-drawing-type="continuous-wiring"') || single.includes('data-circuit-source=')) errors.push('The overall sheet must be one continuous wiring drawing, never tiled detail sheets.');
const svgDocument = new DOMParser().parseFromString(single, 'image/svg+xml');
const geometry = JSON.parse(svgDocument.querySelector('#wiring-geometry').textContent);
const points = element => element.getAttribute('points').trim().split(/\s+/).map(p => p.split(',').map(Number));
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const segments = p => p.slice(1).map((b,i) => [p[i],b]);
const on = (p,a,b) => Math.min(a[0],b[0]) <= p[0] && p[0] <= Math.max(a[0],b[0]) && Math.min(a[1],b[1]) <= p[1] && p[1] <= Math.max(a[1],b[1]) && (a[0] === b[0] && b[0] === p[0] || a[1] === b[1] && b[1] === p[1]);
const drawnSegments = [];
for (const [rail,p] of Object.entries(geometry.rails)) {
  const element = svgDocument.querySelector(`[data-rail="${rail}.rail"]`);
  if (!element || !same(points(element),p)) errors.push(`Distribution rail differs from its geometry: ${rail}`);
  for (const [a,b] of segments(p)) drawnSegments.push({net:element.getAttribute('data-net'),a,b,id:rail});
}
for (const w of netlist.wires) {
  const group = svgDocument.querySelector(`[data-wire-id="${w.id}"]`);
  const conductors = group.querySelectorAll('[data-conductor="true"]');
  if (conductors.length !== 1) { errors.push(`${w.id}: expected one continuous conductor.`); continue; }
  const p = points(conductors[0]);
  if (!same(p,geometry.routes[w.id]) || conductors[0].getAttribute('fill') !== 'none' || Number(conductors[0].getAttribute('stroke-width')) <= 0) errors.push(`${w.id}: missing or inconsistent visible conductor.`);
  for (const [key,endpoint] of [[w.from,p[0]],[w.to,p.at(-1)]]) {
    if (key.endsWith('.rail')) {
      if (!segments(geometry.rails[key.split('.')[0]]).some(([a,b]) => on(endpoint,a,b))) errors.push(`${w.id}: tap is not on its distribution rail.`);
    } else {
      const terminal = svgDocument.querySelector(`[data-pin="${key}"]`);
      const actual = terminal && [Number(terminal.getAttribute('cx')),Number(terminal.getAttribute('cy'))];
      if (!same(endpoint,geometry.pins[key]) || !same(endpoint,actual)) errors.push(`${w.id}: wire does not reach terminal ${key}.`);
    }
  }
  for (const [a,b] of segments(p)) {
    if (a[0] !== b[0] && a[1] !== b[1]) errors.push(`${w.id}: nonorthogonal route.`);
    drawnSegments.push({net:w.net,a,b,id:w.id});
  }
}
for (let i=0;i<drawnSegments.length;i++) {
  const {net,a,b,id} = drawnSegments[i];
  for (const other of drawnSegments.slice(i+1)) {
    if (net === other.net) continue;
    const {a:c,b:d} = other;
    const vertical = a[0] === b[0];
    if (vertical !== (c[0] === d[0])) continue;
    const axis = vertical ? 1 : 0;
    const overlap = Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis])) - Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]));
    if ((vertical ? a[0] === c[0] : a[1] === c[1]) && overlap > 0) errors.push(`${id}/${other.id}: different nets overlap along the same line.`);
  }
  for (const [ref,[x,y,w,h]] of Object.entries(geometry.bodies)) {
    const intrudes = a[0] === b[0]
      ? x+2<a[0] && a[0]<x+w-2 && Math.min(Math.max(a[1],b[1]),y+h-2)>Math.max(Math.min(a[1],b[1]),y+2)
      : y+2<a[1] && a[1]<y+h-2 && Math.min(Math.max(a[0],b[0]),x+w-2)>Math.max(Math.min(a[0],b[0]),x+2);
    if (intrudes) errors.push(`${id}: wire runs through component ${ref}.`);
  }
}
// Open wire bends must not acquire SVG\'s default black polygon fill.
for (const file of readdirSync(resolve(root, 'docs/assets/hardware')).filter(name => name.endsWith('.svg'))) {
  const svg = readFileSync(resolve(root, 'docs/assets/hardware', file), 'utf8');
  for (const [tag] of svg.matchAll(/<polyline\b[^>]*>/g)) {
    if (!/fill\s*=\s*["']none["']|fill\s*:\s*none\b/.test(tag)) errors.push(`${file}: an open wire polyline has no explicit fill=none.`);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Documentation checks passed: ${checked} local links, simulator link, PNG images, continuous wire geometry, ${wires.length} connections, ${parts.length} components and complete shopping coverage.`);
