import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'simulator/source.html'), 'utf8');
const style = source.match(/<style>([\s\S]*?)<\/style>/);
const script = source.match(/<script>([\s\S]*?)<\/script>/);
if (!style || !script) throw new Error('Simulator source must contain one style and one script block.');
const markup = source.replace(style[0], '').replace(script[0], '').replace(/[ \t]+$/gm, '').trim();
mkdirSync(resolve(root, 'docs/assets'), { recursive: true });
writeFileSync(resolve(root, 'docs/assets/simulator.css'), style[1].trim() + '\n');
writeFileSync(resolve(root, 'docs/assets/simulator.js'), script[1].trim() + '\n');
writeFileSync(resolve(root, 'docs/index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="Interactive prototype of a ten-level attachment water controller using three operator-control outputs.">
  <title>Rock Saw Water Control · Simulator</title>
  <link rel="stylesheet" href="assets/site.css">
  <link rel="stylesheet" href="assets/simulator.css">
  <script defer src="assets/simulator.js"></script>
</head>
<body>
  <header class="site-header">
    <p class="eyebrow">THREE-INPUT ATTACHMENT CONTROL · SIMULATOR</p>
    <h1>Rock Saw Water Control</h1>
    <nav aria-label="Project"><a href="#simulator" aria-current="page">Simulator</a><a href="https://github.com/aeae1/Rock-Saw-Water-Control">Repository</a></nav>
  </header>
  <main id="simulator">
    <noscript>This simulator requires JavaScript. Its operation is documented in the repository.</noscript>
    ${markup}
    <details class="instructions">
      <summary>Operating instructions</summary>
      <ol>
        <li>Switch machine power on. Water starts off; white lamps show the saved level. The maximum lamp keeps blinking blue/off above the white bar, or blue/white within it.</li>
        <li>Tap J to toggle water. G increases the level; H decreases it. Center or reverse the rocker to make another adjustment.</li>
        <li>Hold J for 1.5 seconds to enter maximum setup. Release J, then use G/H to choose a maximum from 10% to 100%. The valve remains at its current position.</li>
        <li>Tap J to save and exit. The controller selects the nearest available level under the new maximum, preserving the prior on/off command.</li>
        <li>For full-open cleaning, release J in maximum setup, then hold it again for 1.5 seconds. This saves your maximum edit and opens the ball to 100%. Tap J to restore normal operation and the prior on/off state. G/H is locked during cleaning.</li>
      </ol>
      <p>Mode-changing holds keep the normal display for the first 0.5 seconds, then show white lamps filling inward until the mode changes at 1.5 seconds. Cleaning uses a white ripple moving outward across blue lamps. These effects are separate from the normal fill/drain animation.</p>
      <p>Settings persist through the simulated power switch, but reset on page reload. Power loss stops the modeled motor at its current position; it does not close the valve.</p>
      <p>To operate J with a keyboard, focus the button and press or hold Space or Enter. Reduced-motion preferences disable flashing and moving water effects.</p>
    </details>
  </main>
  <footer>Engineering simulation · Opening percentage is not measured water flow · Hardware integration pending</footer>
</body>
</html>
`);
console.log('Built docs/index.html and local simulator assets.');
