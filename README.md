![Rock Saw Water Control — Takeuchi TL12R2](docs/assets/artwork/red-stripe-original.png)

# Rock Saw Water Control

**[▶ Open Live Simulator](https://aeae1.github.io/Rock-Saw-Water-Control/)** · [Control specification](docs/control-specification.md) · [Connection diagrams](docs/connections.md)

A configurable attachment water controller for machines that provide three independent operator-control outputs. The proposed system adjusts a motorized water valve and presents operating status on ten blue/white indicator lamps. Typical applications include rock saws and other attachments supplied from a pressurized water hose.

**Project status:** interactive simulator and engineering specification. Controller selection, electrical design, actuator characterization, and machine integration remain open. No hardware-ready firmware is included in this revision.

## Simulator

The simulator implements the proposed operator interface, valve motion, maximum-opening configuration, startup indication, and diagnostic previews. It operates entirely in the browser and requires no account or network connection after loading.

To run locally, open [`docs/index.html`](docs/index.html) in a current browser, or serve the `docs` directory:

```sh
python3 -m http.server 8000 --directory docs
```

Then open `http://localhost:8000`. GitHub Pages configuration is described in [Publishing](docs/publishing.md). The hosted version is available at [aeae1.github.io/Rock-Saw-Water-Control](https://aeae1.github.io/Rock-Saw-Water-Control/).

## Machine compatibility

The control scheme requires three functions: **increase**, **decrease**, and **toggle/setup**. These can be provided by a two-direction joystick rocker plus a trigger, three suitable joystick outputs, or equivalent operator controls. The control logic is independent of the machine manufacturer.

The Takeuchi TL12R2 with an HDRS24 rock saw is the reference installation. Its G, H, and J labels are used in the simulator and table below; other machines can map their outputs to the same functions. Connector type, supply voltage, signal polarity, protection, and existing attachment functions must be verified for each installation. Three available outputs establish the interface concept, not plug-and-play electrical compatibility.

## Operating interface

![Reference control layout: G/H console rocker and J right joystick trigger](docs/assets/control-layout.svg)

The illustration shows the reference machine controls schematically. It is not a connector pinout.

| Control | Normal operation | Maximum-opening setup |
| :--- | :--- | :--- |
| Increase (G) | Increase the selected level by one | Increase the draft maximum by 10 percentage points |
| Decrease (H) | Decrease the selected level by one | Decrease the draft maximum by 10 percentage points |
| Rocker center | Rearm G/H | Rearm G/H |
| Toggle/setup (J), short press | Toggle the water command | Save the maximum and return to operation |
| Toggle/setup (J), 1.5-second hold | Enter maximum-opening setup | Remain in setup |
| Machine power | Start with water commanded off | Discard an unsaved maximum on power loss |

G/H produces one adjustment per activation. Holding a rocker direction does not repeat. A reversal passes through center and rearms the input.

During maximum-opening setup, the simulated valve holds its current position. On exit, the selected level is recalculated to the nearest repeatable opening under the new maximum. The prior on/off command is retained.

For example, level 4 with a 100% maximum represents 40% opening. Reducing the maximum to 50% selects level 8 and retains 40% opening. Changing it to 60% selects level 7 and moves to 42% opening.

## Indicator behavior

| State | Indication |
| :--- | :--- |
| Water commanded on | Blue bar representing the selected level |
| Water paused | White bar representing the saved level |
| Opening or closing | Fill or drain animation between white and blue |
| Maximum-opening setup | One lamp alternates blue and white; its index represents 10–100% maximum opening |
| Startup | Saved level in white with the maximum lamp alternating blue and white for 3.6 seconds |
| Diagnostic preview | White lamp at the diagnostic index |
| Machine power off | All lamps off |

The ten levels represent commanded valve opening, not measured GPM. The water animation is illustrative. A non-return motorized valve may remain open after electrical power is removed.

## Architecture

The proposed wired system comprises protected machine-power and control inputs, a microcontroller, a bidirectional valve driver, and twenty independently switched lamp channels. The valve assembly includes its motor and gearbox; the external driver controls electrical direction and duration.

A wired proportional valve with a 4–20 mA command and position feedback is the preferred next bench candidate for repeatable percentage control. It uses a current-output interface instead of the external motor driver. An alternative smart-valve path is retained as a research option; local Tuya control has not been verified for the candidate valve. The [valve-control research](docs/valve-control-research.md) compares costs, documented interfaces, and internal serial modification.

## Documentation

| Document | Purpose |
| :--- | :--- |
| [Control specification](docs/control-specification.md) | State transitions, timing, rounding, and retention rules |
| [Connection diagrams](docs/connections.md) | Conceptual power, signal, lamp, and water connections |
| [Hardware candidates](docs/hardware.md) | Candidate components and unresolved selection criteria |
| [Valve-control research](docs/valve-control-research.md) | Wired proportional control, Tuya feasibility, prices, and bench investigation |
| [Planning BOM](docs/bom.csv) | Quantities and procurement status |
| [Validation plan](docs/validation.md) | Simulator coverage and hardware acceptance work |
| [Firmware integration](firmware/README.md) | Required hardware interfaces and implementation scope |
| [Artwork swatches](docs/artwork.md) | Four banner directions and corresponding color palettes |

## Development

Node.js 22 or later is required for development. The published simulator has no runtime package dependencies.

```sh
npm ci
npm run check
```

Edit `simulator/source.html`, then run `npm run build`. The build extracts the simulator into the committed HTML, CSS, and JavaScript under `docs/`. The 46 deterministic tests include all 200 initial-level/new-maximum combinations across running and paused operation, gesture boundaries, interrupted motion, and 4,000 seeded stress actions. GitHub Actions runs them on Node.js 22 and 24, checks build reproducibility, and runs 12 real-browser cases across desktop Chromium, mobile Chromium, and mobile WebKit. Browser reports and failure traces are retained as workflow artifacts.

To run browser checks locally:

```sh
npx playwright install --with-deps chromium webkit
npm run test:browser
```

The test suite covers the simulator. Physical controller firmware will need its own fault-injection and hardware acceptance tests before field deployment.

## Scope and attribution

This is an independent project and is not affiliated with Takeuchi, Clark, or the component manufacturers. The original machine artwork was supplied for this project. The selected red-stripe banner contains an unchanged, native-size copy of the original artwork. Four earlier AI-assisted banner studies are retained as superseded design swatches; they are not technical representations of the machine.

No project-wide redistribution license has been selected. Third-party product names and marks retain their respective ownership.
