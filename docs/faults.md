# Fault Detection and Recovery

Revision 0.3 · Simulator behavior and proposed firmware contract

## Common response

All ten fault codes can be injected in the simulator. A continuously held J also triggers fault 10 automatically after 30 seconds. Physical supply, current, position, temperature, communication, and switch diagnostics require the sensors and firmware described below; the browser does not detect those physical conditions.

On a fault, cancel pending gestures and draft edits, clear Normal/Flush run commands, stop modeled movement, invalidate the position reference, and latch the code. All opening commands are inhibited. Multiple codes remain latched; the lowest numbered code is displayed first. The white code lamp flashes three times, then remains steady. Reduced-motion mode uses a steady lamp.

**Stopped is not closed.** An actuator may hold an open position and continue passing water. For the proportional hardware, a fault response must be mapped to a characterized stop/power-inhibit circuit; removing a 4–20 mA signal is not assumed to close or stop it. Do not repeatedly drive a jammed actuator. Use the upstream manual shutoff if flow must stop and the actuator cannot close.

## Codes

| Lamp | Fault | Proposed detection in firmware | Correct before reset |
| ---: | :--- | :--- | :--- |
| 1 | Supply / brownout | Protected-rail voltage outside its validated operating window; brownout or watchdog reset cause | Repair supply/ground; wait for stable voltage. Watchdog resets require investigation if repeated. |
| 2 | Valve jam / overcurrent | Sustained measured current above characterized limit, or motion fails with elevated current; exclude verified startup inrush | Isolate water, clear obstruction, inspect actuator and wiring. No automatic reversal/retry. |
| 3 | Interface communication | DAC/ADC/lamp-expander transfer timeout, failed initialization or stale required telemetry | Repair connector/bus/device; require repeated healthy transfers before reset. |
| 4 | Output driver | Hardware diagnostic, short circuit, overtemperature, or commanded-vs-measured output disagreement | Remove short/overload; repair failed driver. A driver without diagnostics cannot report this reliably. |
| 5 | Motion timeout | Target not reached within a characterized travel deadline; no progress despite valid command and feedback | Check water load, mechanical travel and feedback. Do not extend the deadline automatically. |
| 6 | Invalid saved settings | Bad format/version, checksum, range or interrupted write with no valid redundant record | Acknowledge to restore level 4 / max 100%, still OFF; service memory if it repeats. |
| 7 | Conflicting inputs | G and H simultaneously asserted beyond the debounce window; invalid conditioned input state | Center rocker; repair wiring. A latched G or H alone is normal and is not a fault. |
| 8 | Position unavailable | Feedback disconnected, out of characterized electrical range, implausible change or persistent disagreement | Restore feedback and reference closed. Stale calculated travel is not a position measurement. |
| 9 | Overtemperature | Measured enclosure or actuator-region temperature exceeds limits of the selected parts | Cool equipment and correct placement/heat source; require hysteresis and a stable cool interval. |
| 10 | Stuck J | J continuously active for 30 seconds | Release J; inspect sticking switch/shorted wiring. This detection is implemented in the simulator. |

Thresholds and confirmation times are deliberately not released as hardware constants until the selected assembly is measured. The simulator uses a five-second ideal stroke; the candidate proportional valve has a different manufacturer stroke limit. Fault 8 includes failure to confirm closure during recovery. Electrical feedback health alone cannot prove physical valve movement: test feedback behavior under a jam.

## Acknowledgement

Removing a cause does not clear a latch. Require all causes absent, G/H centered, and a fresh J press after release. Hold J for three seconds; earlier release cancels. The simulator also offers Reset fault when controls are neutral. Acknowledgement clears latched codes, restores defaults if code 6 was present, and starts closing/reference recovery. No opening input is queued. J must be released before Normal rearms. A new cause during the hold cancels it, and a new fault during closing stops recovery and latches again.

The simulator retains latches through its machine-power switch, not a page reload. Firmware must use a bounded, integrity-checked persistent fault record or reset-cause handling so power cycling cannot silently resume a previously faulted run. Persist only state changes and use redundant records; do not write flash/EEPROM on every loop or animation frame.

## Limits and additional protections

- No flow/pressure sensor is specified. Empty supply, blocked nozzle, hose leak, or an open valve with no water cannot be diagnosed from position alone. Add actual sensing if these diagnoses become requirements.
- A disconnected trigger can look exactly like a released trigger with simple digital inputs. Detecting open wires requires supervised inputs and compatible end-of-line hardware.
- Lamp open-circuit detection needs diagnostic drivers or channel-current measurement. A software pattern test only checks commanded colors.
- Hardware brownout handling and an independent watchdog/output-inhibit path must work if firmware freezes. A watchdog reboot is not itself a guaranteed water shutoff.
- On healthy power loss, a non-return actuator can stay open. Guaranteed electrical-failure closure requires a separately engineered normally-closed shutoff or stored-energy/spring-return system; it is outside the present BOM.
- Opening as low as 1% is possible in the level/cap arithmetic. Verify minimum repeatable travel and useful spray on the actual valve/nozzle before finalizing physical calibration.
