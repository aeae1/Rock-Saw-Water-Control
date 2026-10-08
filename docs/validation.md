# Validation

## Revision F checks

Revision F removes K1/U4/D4/C4/C5, reroutes three valve wires and adds Q1/R11/R12 for host reset. All 108 wires and 41 components are checked against the continuous drawing and purchasing records. The single-page PDF is one A0 sheet; the detailed booklet remains separate. [Review record](single-page-schematic-review-rev-f.md) · [Current electrical audit](hardware-audit-rev-f.md).

Local run: **230 tests passed** (206 simulator scenarios and 24 electrical checks); documentation checks passed for 193 local links and the complete drawing/purchase records. Browser behavior was not changed; hosted CI remains the cross-browser gate.

The test suite retains 206 deterministic simulator scenarios and historical circuit comparisons. Current electrical mutation tests cover direct 12 V on RESET, a bypassed base resistor, reversed transistor terminals, missing pull-down, wrong watchdog polarity/duration, ADC/input errors and lamp/address conflicts. Resistor drive/leakage/thermal calculations are checked across the proposed 9–16 V bench envelope. These do not establish semiconductor behavior or field reliability.

The browser keeps its existing gesture and fault-motion model. Revision F physical firmware is not supplied: it must use a usable command path for best-effort closure and cannot independently cut valve power or measure motor current. Simulated code 2 does not imply a fitted detector. H1–H5 remain open; new acceptance work must include shared-supply loss, USB-only separation, retained DAC state, reset pulses, broken signals, measured feedback and enclosure heat.

## Historical validation records

 Plan

## Revision E checks

Revision E removes only FM1, R6–R9 and C2 from Revision D. D7/D8/D9 are unused. Twenty wiring checks verify the entire current topology, preserve the earlier C-to-D temperature-removal comparison and prove that all surviving D-to-E connections, wire IDs, module configurations and valve-position feedback remain unchanged. Mutation checks reject an accidentally wired D8 and a missing position-receiver ground, in addition to the existing voltage, relay, driver and ADC errors.

Targeted local result on 7 October 2026: all **20 wiring tests passed**. Simulator code is unchanged; the full configured suite now has **226 tests** (206 simulator and 20 wiring) plus 69 browser cases. Full CI results are attached to the published commit in [GitHub Actions](https://github.com/aeae1/Rock-Saw-Water-Control/actions).

The [overall schematic](assets/hardware/water-controller-single-page-rev-e.pdf) is one continuous A0 drawing with 114 wires and 43 components, rendered and visually reviewed. The [24-page audit booklet](assets/hardware/water-controller-audit-rev-e.pdf) provides the detailed companion sheets. Automated checks validate actual wire endpoints, crossings, component coverage, local links and export hashes; see the [verification record](single-page-schematic-review-rev-e.md).

The shopping workbook maps all 43 references to purchases or the reused connector. Its six small-part purchase lots total $12.02. The planning total is $642.90; setting the driver quantity from three to zero gives $545.47, and restoring it returns the original total. This is a budget calculation, not a destination checkout or hardware acceptance result.

`npm run check` rebuilds the simulator, checks local documentation links and generated schematic hashes, and runs the deterministic suite. Coverage includes all 2,000 old-cap/new-cap/level/on-off combinations, 100 paused-marker combinations, all 72 ordered pairs of supported fault codes, 4,000 seeded stress actions and the startup, reset and gesture cases. These exercise the actual exported script and markup with a deterministic clock. They do not establish electrical or mechanical reliability.

GitHub Actions runs the deterministic suite on Node.js 22 and 24 and checks simulator build reproducibility. The browser job runs 23 scenarios in three configurations (69 cases): desktop Chromium, mobile Chromium and mobile WebKit. Retries are disabled. Reports, screenshots and failure traces are retained for 14 days. The version-pinned official Playwright container supplies browser binaries and system libraries. See [GitHub Actions](https://github.com/aeae1/Rock-Saw-Water-Control/actions) for the result on the published commit.

The [3 October software audit](audit-2026-10-03.md) and [superseded Revision C audit](hardware-audit-2026-10-04.md) record earlier configurations and test counts. The [Revision D audit](hardware-audit-2026-10-07.md) retains the removed flow-meter branch for historical reference. Those sensor requirements do not apply to Revision E.

A passing workflow establishes the behavior of the software revision tested. No Arduino firmware or assembled hardware has passed acceptance testing. H1–H5 remain open, including watchdog initialization, valve-loop compatibility and recovery with initially unpowered feedback.

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


## G/H-independent fault acknowledgement

The later 5 October control update removes G/H position and movement from fault-reset eligibility. Existing regressions were revised to verify resets in both held directions across all ten codes and both motion preferences, rocker movement without restarting the hold deadline or changing settings, all 45 cause-removal/retry combinations without requiring centering, and the simulator shortcut with held G/H. Active causes, a press started before cause removal, interrupted J holds and new faults still block/cancel acknowledgement. Two browser scenarios verify held H and rocker movement during a valid reset. The 100 ms neutral requirement remains after closure to rearm normal operation; no rocker action is queued. Configured totals remain 204 deterministic tests and 63 browser cases.


## Reset fill timing across fault lamps

The reset fill now uses all ten physical positions at 300 ms per position. Blue fault codes overlay the sweep without compressing its timeline. A new deterministic regression checks immediately before and at every visible position boundary for all ten single-code layouts, leading/trailing groups, separated/alternating codes and all ten codes together. The browser reset scenario checks the interval hidden behind code 4 and the subsequent arrival at lamp 5. Acknowledgement still occurs at 3000 ms with immediate OFF indication. Configured totals are 205 deterministic tests and 63 browser cases.


## Fault-directed closing and G/H-independent recovery

The next 5 October update commands automatic closing for codes 6, 7 and 10, while any latched code 1–5, 8 or 9 inhibits movement. Twenty-one added deterministic tests cover each response, all 90 ordered fault pairs, control modes, reduced motion, power interruption, cause chatter, original closing deadlines, automatic stuck J, startup interruption and reset after confirmed closure. They also verify both G/H directions through acknowledgement and closing, fresh J use without centering, discarded rocker activations, 99/100 ms J-release boundaries and restoration of startup centering on a later power cycle. Existing broad fault and stress regressions now check the two response categories. Two added browser scenarios exercise automatic closure and jam interruption; the held-H browser scenario verifies water can be enabled after reset without centering. Configured totals are 226 deterministic checks and 69 browser cases. The ideal model and injected causes do not establish physical fault-detection or shutoff performance.

## Revision G and firmware v1 — 8 October 2026

Revision G removes only Q1/R11/R12 and represents the machine connection as five incoming wires. The 21 hardware topology tests and drawn-wire validation cover 102 connections and 38 references. The new [firmware test record](../firmware/TESTING.md) documents 301,788 native assertions with ASan/UBSan and an actual Nano Every compile. CI now checks firmware independently of the simulator. Existing browser behavior is unchanged by this hardware release.

These software checks do not close H1–H5. There is no external watchdog, valve-power disconnect, flow meter, temperature sensor or actuator-current detector. Physical fault response uses best-effort closed commands; bench tests must establish interface compatibility, watchdog/peripheral recovery, valve motion and enclosure performance.

Local final results: `npm run check` passed **227 deterministic tests** plus documentation/link/geometry checks. `bash scripts/test-firmware.sh` passed **301,788 assertions**. Arduino CLI 1.3.1 with megaAVR 1.8.8 built the Nano Every sketch without warnings. Firmware CI and the existing 69 browser cases run on GitHub after publication; local results do not imply those hosted jobs have completed.
