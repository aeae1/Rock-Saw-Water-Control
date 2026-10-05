# Validation Plan

## Revision C electrical-document checks

On 4 October 2026, the existing 138 simulator tests passed locally. The Rev C hardware-netlist suite adds 18 passing checks, including terminal completeness, separated supply domains, correct lamp channels, input-resistor ratings, current/voltage calculations, relay contact/polarity checks and deliberately corrupted connections. The startup lamp-test update adds twelve simulator tests, bringing the configured suite to 168 deterministic tests (150 simulator and 18 wiring checks). These checks run automatically in the existing Node 22/24 GitHub workflow. They do not energize hardware, validate firmware timing or establish field reliability.

The 24-page [electrical audit and circuit package](assets/hardware/water-controller-audit-rev-c.pdf) was rendered and visually reviewed. Its [138-connection schedule](../hardware/rev-c/connections.csv) is generated from the [endpoint netlist](../hardware/rev-c/netlist.json). Five physical release holds remain explicit. Use the staged acceptance procedure in the [audit](hardware-audit-2026-10-04.md), including partial watchdog initialization and recovery with initially unpowered feedback.

Browser CI uses the version-pinned official Playwright container, which includes browser binaries and system libraries. This avoids installing operating-system packages on every run. Keep its version aligned with the locked Playwright package. The test server uses Node.js and listens only on loopback. See [Playwright's container guidance](https://playwright.dev/docs/docker).

## Simulator verification

On 4 October 2026, `npm run check` passed all 168 deterministic tests after the startup lamp-test update. Its twelve added cases cover each of the twenty color outputs, timing boundaries, held/queued inputs, concurrent closure, all ten fault overrides, interrupted power, saved settings, delayed callbacks and reduced motion. Browser execution for this revision is checked by the GitHub workflow; local browser binaries were unavailable.

On 4 October 2026, the fault-control update passed all 196 deterministic tests locally (178 simulator and 18 wiring checks), including 28 new regression cases. These cover all ten continuous blink indications, independent fault toggles, simultaneous mixed active/cleared causes, all ten codes at once, white progress skipping blue code lamps, acknowledgment through closing/release, blocked-hold rejection, interrupted holds, automatic stuck-J precedence, reduced motion and delayed callbacks. Three additional browser scenarios exercise fault toggles, simultaneous reset progress and blocked resets across all three browser configurations. Results must be checked for the published commit in GitHub Actions.

`npm test` exercises the actual exported script and markup with a deterministic clock. The checks cover startup-off behavior, saved-level and maximum indication, J short and long presses, latched maximum setup, nearest-step rounding, clamping, rocker rearming, interrupted movement, canceled gestures, fault inhibition, and reduced-motion behavior.

These checks validate control behavior in a simulated DOM. They do not establish physical valve accuracy, electrical reliability, browser rendering quality, or environmental durability.

Verification on 2026-10-03: the 117-test behavior/startup suite and 21-test expanded remapping/fault suite passed locally (138 tests total). The expanded matrix exercises all 2,000 old-cap/new-cap/level/on-off combinations and all 90 ordered distinct fault pairs. Existing coverage includes 100 paused-marker combinations, 4,000 seeded stress actions, all ten faults across the three modes, cause removal versus acknowledgement, invalid settings, held startup controls, interrupted closure, neutral qualification, held-trigger deadlines, delayed callbacks, canceled gestures and reduced motion. This is behavioral coverage, not a claim of exhaustive electrical or browser-state coverage.

`npm run check` rebuilds the simulator, verifies local Markdown links and the illustration file, then runs deterministic tests. CI checks that generated assets match the committed source. GitHub Actions runs this on Node.js 22 and 24. Its Playwright job runs twenty-one scenarios in three configurations (63 cases): desktop Chromium, mobile Chromium and mobile WebKit. The added browser scenarios verify the complete all-white/all-blue startup test and reduced-motion/fault interruption. Browser cases use actual button, pointer, keyboard and fault-toggle events and check held-startup inputs, recovery, reset cancellation, Flush, paused markers, layout, reduced motion, runtime errors and failed asset requests. Retries are disabled; reports, screenshots and failure traces are retained for 14 days.

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

## Immediate OFF display after acknowledgement

The 5 October update replaces the post-reset blue-code hold with the normal paused display at the instant acknowledgement succeeds. The existing fault-display tests now verify the exact 3-second boundary, preserved saved level, both maximum-marker placements, reduced motion, a held J, background closure and neutral lockout. The browser reset scenario also checks immediate OFF lamps while closure is still running and confirms that the progress bar stays cleared. The configured totals remain 196 deterministic checks and 57 browser cases.

## Reset-indication consistency

The subsequent 5 October update separates an active-cause warning from a neutral/fresh-press interlock. Eight added tests cover 45 cause-removal/retry combinations, cleared faults with either rocker held, cancellation of warnings when the last cause clears, fixed blue code lamps during a valid fill, interrupted retries, and ordinary J operation with G/H held. The display and acknowledgement share a single eligibility decision. Two browser scenarios cover the reported confusing conditions; the configured suite now has 204 deterministic tests and 63 browser cases. Simulator asset URLs include a content-derived version so a newly loaded page requests the matching script and stylesheet after an update.
