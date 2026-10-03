# Validation Plan

Browser CI uses the version-pinned official Playwright container, which includes browser binaries and system libraries. This avoids installing operating-system packages on every run. Keep its version aligned with the locked Playwright package. The test server uses Node.js and listens only on loopback. See [Playwright's container guidance](https://playwright.dev/docs/docker).

## Simulator verification

`npm test` exercises the actual exported script and markup with a deterministic clock. The checks cover startup-off behavior, saved-level and maximum indication, J short and long presses, latched maximum setup, nearest-step rounding, clamping, rocker rearming, interrupted movement, canceled gestures, fault inhibition, and reduced-motion behavior.

These checks validate control behavior in a simulated DOM. They do not establish physical valve accuracy, electrical reliability, browser rendering quality, or environmental durability.

Verification on 2026-10-03: the 117-test behavior/startup suite and 21-test expanded remapping/fault suite passed locally (138 tests total). The expanded matrix exercises all 2,000 old-cap/new-cap/level/on-off combinations and all 90 ordered distinct fault pairs. Existing coverage includes 100 paused-marker combinations, 4,000 seeded stress actions, all ten faults across the three modes, cause removal versus acknowledgement, invalid settings, held startup controls, interrupted closure, neutral qualification, held-trigger deadlines, delayed callbacks, canceled gestures and reduced motion. This is behavioral coverage, not a claim of exhaustive electrical or browser-state coverage.

`npm run check` rebuilds the simulator, verifies local Markdown links and the illustration file, then runs deterministic tests. CI checks that generated assets match the committed source. GitHub Actions runs this on Node.js 22 and 24. Its Playwright job runs fourteen scenarios in three configurations (42 cases): desktop Chromium, mobile Chromium and mobile WebKit. Browser cases use actual button, pointer, keyboard and select events and check held-startup inputs, recovery, reset cancellation, Flush, paused markers, layout, reduced motion, runtime errors and failed asset requests. Retries are disabled; reports, screenshots and failure traces are retained for 14 days.

The local browser installer returned invalid/truncated archives in the audit workspace. Browser results must therefore be read from the [GitHub Actions run](https://github.com/aeae1/Rock-Saw-Water-Control/actions) for the published commit; they are not inferred from the deterministic DOM suite. `npm audit` reported zero known dependency vulnerabilities during this review. That is a dated registry check, not a guarantee that dependencies have no defects.

A passing workflow is evidence for the software revision tested, not a guarantee against field failures. No firmware or assembled hardware has passed acceptance testing.

## Hardware acceptance work

| Area | Required evidence | Status |
| :--- | :--- | :--- |
| Machine interface | Measured voltage, polarity, pin assignment, G/H latch behavior, J behavior, and hydraulic-function independence | Not performed |
| Valve motion | Opening/closing stroke, minimum repeatable pulse, reverse delay, drift, and endpoint behavior | Not performed |
| Driver sizing | Startup/stall current, current-limit behavior, temperature rise, and diagnostic output | Not performed |
| Power | Actual power/key cycles, brownout/reset behavior, existing fuse and wiring ratings, peripheral current and parked draw | Not performed |
| Indicators | Color-channel current, sunlight readability, alternating-marker visibility, sealing | Not performed |
| Environment | Internal enclosure temperature, condensation management, UV exposure, vibration, and wiring strain relief | Not performed |
| Retention | Saved values after power loss; invalid settings recovery; unknown-position handling | Not performed |
| Water delivery | Hose-pressure compatibility, leak checks, strainer performance, and practical adjustment range | Not performed |

Record actual test conditions and measurements before changing any hardware status to validated. A useful first actuator test is repeated movement between adjacent low-opening settings under hose pressure, including full-close references, to establish actual feedback accuracy and repeatability. Collect the [flow curve](flow-calibration.md) through the real hose and nozzle configuration.

## Firmware reliability requirements

Before field use, add watchdog and brownout recovery tests, bounded motor-run tests, stuck-input and contradictory-input tests, corrupted-settings recovery, DAC/HSD bus loss, stale output and module reset tests for the selected wired valve, and interrupted writes to nonvolatile storage. Exercise actual power cycling and motor loads on the bench; a simulated OFF command does not prove the valve is mechanically closed. Record endurance results at representative temperature and water pressure.

## Bench record template

For each test, record date, hardware/firmware revisions, supply voltage, water pressure, ambient/enclosure temperature, initial mode/position, injected condition, expected response, measured response, elapsed time and pass/fail. Include a waveform or log where timing matters. Treat unperformed checks as open.

| Test | Acceptance evidence |
| :--- | :--- |
| Held G/H/J at cold start | No opening or setting change; closure finishes; stable neutral and fresh action required |
| Nano-only reset with valve/DAC still powered | No stale opening request is accepted; defined inhibit/startup behavior observed |
| Bus stuck or unplugged | Bounded detection, no loop hang, physical fault response despite unavailable display |
| Command or feedback open/short | Defined behavior at 0 mA/out-of-range; no inferred close from loss of current |
| Jam and very slow movement | Bounded fault detection without repeated automatic retries; current measured if used |
| Feedback integrity | Readback follows physical motion and cannot falsely validate a jammed closed position |
| Valve hold and smallest steps | Repeatable motion under water pressure; stable Set Max hold; quantified error/hysteresis |
| Power loss from every mode | Document actual actuator behavior; no automatic run/Flush restoration on recovery |
| Calibration/settings interrupted write | Last complete valid record recovered, or a latched settings fault; no ON restoration |
| Long uptime / counter rollover | All gesture, watchdog and motion deadlines work across 32-bit wrap |
| Hot enclosure, full lamp load and parked feed | Every component remains within measured/rated limits; acceptable battery draw |
| Machine functions | Correct connector orientation and independence from depth/alignment hydraulics |
