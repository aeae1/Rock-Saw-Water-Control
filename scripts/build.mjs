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
      <p><strong>Start:</strong> center G/H, release J, then switch power on. Wait for closing to finish. Water starts off.</p>
      <p><strong>Normal:</strong> tap J for water on/off. G increases the level; H decreases it. Center or reverse the rocker to make another adjustment. Blue shows the running level; white shows the paused level. While paused, the maximum lamp blinks blue/off or blue/white.</p>
      <p><strong>Set Max:</strong> hold J for 1.5 seconds, then release. G/H changes the maximum from 10% to 100%; one blue/white lamp shows it. Tap J to save and return. Running water holds its opening while editing; an OFF command continues closing. Saving selects the nearest available level under the new cap.</p>
      <p><strong>Flush:</strong> in Set Max, release J and hold it again for 1.5 seconds. This saves the cap and opens fully. A fresh J press returns immediately to the previous Normal on/off state. G/H is locked. Wait for any earlier closing command to finish before starting the Flush hold.</p>
      <p><strong>Tap or hold:</strong> a tap is shorter than 0.5 seconds. Releasing between 0.5 and 1.5 seconds cancels the gesture. Hold feedback starts at 0.5 seconds with an inward white fill. Flush uses an outward white ripple.</p>
      <p><strong>Fault recovery:</strong> select No active fault cause, release J and center G/H, then hold J for 3 seconds or use Reset fault. Wait for closing; water remains off. Removing the cause or cycling power alone does not acknowledge a fault. A continuously held J faults after 30 seconds.</p>
      <p>Settings and latched faults persist through the simulated power switch but reset on page reload. Power loss stops the modeled motor at its current position; it does not close the valve.</p>
      <p>Keyboard: focus J and use Space or Enter. Reduced-motion preferences replace flashing with steady markers. <a href="https://github.com/aeae1/Rock-Saw-Water-Control/blob/main/docs/operator-guide.md">Full operator guide</a> · <a href="https://github.com/aeae1/Rock-Saw-Water-Control/blob/main/docs/faults.md">Fault codes</a></p>
    </details>
  </main>
  <footer>Engineering simulation · Opening percentage is not measured water flow · Hardware integration pending</footer>
</body>
</html>
`);
console.log('Built docs/index.html and local simulator assets.');
