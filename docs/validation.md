# Validation Plan

Browser CI uses the version-pinned official Playwright container, which includes browser binaries and system libraries. This avoids installing operating-system packages on every run. Keep its version aligned with the locked Playwright package. The test server uses Node.js and listens only on loopback. See [Playwright's container guidance](https://playwright.dev/docs/docker).

## Simulator verification

`npm test` exercises the actual exported script and markup with a deterministic clock. The checks cover startup-off behavior, saved-level and maximum indication, J short and long presses, latched maximum setup, nearest-step rounding, clamping, rocker rearming, interrupted movement, canceled gestures, fault inhibition, and reduced-motion behavior.

These checks validate control behavior in a simulated DOM. They do not establish physical valve accuracy, electrical reliability, browser rendering quality, or environmental durability.

Verification on 2026-10-01: all 46 deterministic behavior tests passed locally. The suite includes 200 remapping combinations and 4,000 seeded stress actions. Local documentation links and JavaScript syntax were checked. The live Pages simulator was inspected in Chromium, including startup and water-toggle operation. The selected banner's machine region matches the original decoded RGB pixels exactly.

GitHub Actions runs the deterministic suite on Node.js 22 and 24. A separate Playwright job runs four browser scenarios in each of three configurations: desktop Chromium, mobile Chromium, and mobile WebKit. It checks real input events, select controls, layout overflow, reduced motion, dark appearance, runtime errors, and failed asset requests. Retries are disabled so failures remain visible. Reports, screenshots, and failure traces are retained for 14 days.

A passing workflow is evidence for the software revision tested, not a guarantee against field failures. No firmware or assembled hardware has passed acceptance testing.

## Hardware acceptance work

| Area | Required evidence | Status |
| :--- | :--- | :--- |
| Machine interface | Measured voltage, polarity, pin assignment, G/H latch behavior, J behavior, and hydraulic-function independence | Not performed |
| Valve motion | Opening/closing stroke, minimum repeatable pulse, reverse delay, drift, and endpoint behavior | Not performed |
| Driver sizing | Startup/stall current, current-limit behavior, temperature rise, and diagnostic output | Not performed |
| Power | Starting/brownout behavior, selected transient protection, fusing, and current budget | Not performed |
| Indicators | Color-channel current, sunlight readability, alternating-marker visibility, sealing | Not performed |
| Environment | Internal enclosure temperature, condensation management, UV exposure, vibration, and wiring strain relief | Not performed |
| Retention | Saved values after power loss; invalid settings recovery; unknown-position handling | Not performed |
| Water delivery | Hose-pressure compatibility, leak checks, strainer performance, and practical adjustment range | Not performed |

Record actual test conditions and measurements before changing any hardware status to validated. A useful first actuator test is repeated movement between adjacent low-opening settings under hose pressure, including full-close references, to establish whether timed control meets the required repeatability.

## Firmware reliability requirements

Before field use, add watchdog and brownout recovery tests, bounded motor-run tests, stuck-input and contradictory-input tests, corrupted-settings recovery, communication loss/reconnect tests for a smart valve, and interrupted writes to nonvolatile storage. Exercise actual power cycling and motor loads on the bench; a simulated OFF command does not prove the valve is mechanically closed. Record endurance results at representative temperature and water pressure.
