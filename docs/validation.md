# Validation Plan

## Simulator verification

`npm test` exercises the actual exported script and markup with a deterministic clock. The checks cover startup-off behavior, saved-level and maximum indication, J short and long presses, latched maximum setup, nearest-step rounding, clamping, rocker rearming, interrupted movement, canceled gestures, fault inhibition, and reduced-motion behavior.

These checks validate control behavior in a simulated DOM. They do not establish physical valve accuracy, electrical reliability, browser rendering quality, or environmental durability.

Initial verification on 2026-10-01: all eight behavior tests passed. Local documentation links resolved, JavaScript syntax validation passed, and the selected banner's source-image region matched the original decoded RGB pixels exactly. Full browser screenshot verification was unavailable in the preparation environment.

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
