# Fault Detection and Recovery

Revision 0.6 · Simulator behavior and proposed firmware contract

## Common response

The simulator has one ON/OFF toggle for each of the ten fault causes. ON injects and keeps the cause active; OFF removes that injected cause without acknowledging its latched code. Any number of toggles can be ON simultaneously. Briefly switching ON then OFF simulates a transient fault. The status beside each toggle distinguishes an active cause, a cleared cause awaiting reset, and acknowledged recovery. The controls are disabled while controller power is OFF. A continuously held J also triggers fault 10 automatically after 30 powered seconds, including when held at startup. Delayed release handling checks the same deadline. Physical supply, current, position, temperature, communication, and switch diagnostics require the sensors and firmware described below; the browser does not detect those physical conditions.

On a fault, cancel pending gestures and draft edits, clear Normal/Flush run commands, stop modeled movement, invalidate the position reference, and latch the code. All opening commands are inhibited. Every latched code has its own numbered lamp; simultaneous faults are displayed together. The heading names the lowest numbered code and reports how many are latched. A blue code means that cause has cleared; any remaining white code still blocks acknowledgement of the entire set.

**Stopped is not closed.** An actuator may hold an open position and continue passing water. For the proportional hardware, a fault response must be mapped to a characterized stop/power-inhibit circuit; removing a 4–20 mA signal is not assumed to close or stop it. Do not repeatedly drive a jammed actuator. Use the upstream manual shutoff if flow must stop and the actuator cannot close.

## Codes

| Lamp | Fault | Proposed detection in firmware | Correct before reset |
| ---: | :--- | :--- | :--- |
| 1 | Supply / brownout | Protected-rail voltage outside its validated operating window; brownout or watchdog reset cause | Repair supply/ground; wait for stable voltage. Watchdog resets require investigation if repeated. |
| 2 | Valve jam / overcurrent | Sustained measured current above characterized limit, or motion fails with elevated current; exclude verified startup inrush | Isolate water, clear obstruction, inspect actuator and wiring. No automatic reversal/retry. |
| 3 | Interface communication | DAC/lamp-board transfer timeout, failed initialization or stale required telemetry | Repair connector/bus/device; require repeated healthy transfers before reset. |
| 4 | Output driver | Hardware diagnostic, short circuit, overtemperature, or commanded-vs-measured output disagreement | Remove short/overload; repair failed driver. A driver without diagnostics cannot report this reliably. |
| 5 | Motion timeout | Target not reached within a characterized travel deadline; no progress despite valid command and feedback | Check water load, mechanical travel and feedback. Do not extend the deadline automatically. |
| 6 | Invalid saved settings | Bad format/version, checksum, range or interrupted write with no valid redundant record | Acknowledge to restore level 4 / max 100%, still OFF; service memory if it repeats. |
| 7 | Conflicting inputs | G and H simultaneously asserted beyond the debounce window; invalid conditioned input state | Center rocker; repair wiring. A latched G or H alone is normal and is not a fault. |
| 8 | Position unavailable | Feedback disconnected, out of characterized electrical range, implausible change or persistent disagreement | Restore feedback and reference closed. Stale calculated travel is not a position measurement. |
| 9 | Overtemperature | Measured enclosure or actuator-region temperature exceeds limits of the selected parts | Cool equipment and correct placement/heat source; require hysteresis and a stable cool interval. |
| 10 | Stuck J | J continuously active for 30 seconds | Release J; inspect sticking switch/shorted wiring. This detection is implemented in the simulator. |

Thresholds and confirmation times are deliberately not released as hardware constants until the selected assembly is measured. The simulator uses a five-second ideal stroke; the candidate proportional valve has a different manufacturer stroke limit. Fault 8 includes failure to confirm closure during recovery. Electrical feedback health alone cannot prove physical valve movement: test feedback behavior under a jam.

## Lamp indications

| State | Indication |
| :--- | :--- |
| Cause active | Its numbered lamp blinks white/off continuously, 600 ms per phase. |
| Cause removed, code still latched | Its numbered lamp blinks blue/off at the same rate. Other active codes continue blinking white. |
| Valid reset hold | All latched code lamps stay solid blue. Remaining lamps fill white from left to right over the 3-second hold, skipping every code lamp. |
| Reset acknowledged, recovery pending | Code lamps stay solid blue until closing completes and released/centered controls qualify for 100 ms. Then the normal paused display returns. |
| Blocked reset hold | The row alternates staggered blue/white at 600 ms per phase. This hold cannot acknowledge faults. |
| Blocked hold reaches 3 seconds | All lamps alternate blue/white at 250 ms per phase for 1.5 seconds, then ordinary fault blinking returns. No automatic retry occurs. |

White progress uses only lamps not occupied by fault codes. With all ten codes latched, all ten remain blue; the simulator's separate progress bar still shows elapsed hold time. With reduced motion enabled, active codes are steady white and cleared/reset codes steady blue; blocked/rejected holds use steady white, and the white progress animation is suppressed. Text identifies each state. The rejection still expires after 1.5 seconds.

## Acknowledgement

1. Turn OFF each injected cause (or use **Turn off all fault toggles**). For a real automatic stuck-J fault, release J as well; the toggles cannot remove that physical-input condition.
2. Release J and center G/H. Every cause must be absent before starting a fresh hold.
3. Hold J for three seconds. Blue code lamps remain visible while the other lamps fill white. Releasing early cancels; moving G/H or introducing a new fault cancels the gesture, even if corrected before its deadline.
4. Release J and wait for closing/reference recovery. Controls must remain released/centered for 100 ms afterward. Water stays OFF; no opening command is queued.

A hold started while a cause is active or G/H is not centered is blocked for its entire duration. Clearing a cause or centering during that hold does not make it valid; release and press J again. A blocked hold never changes saved settings, clears latches or moves the valve. Its short warning does not repeat if J remains held; the 30-second stuck-J detector remains active.

**Reset now · sim shortcut** skips the hold and its progress animation, but still requires all causes absent, J released and G/H centered. Acknowledgement restores defaults if code 6 was among the latched codes and starts closing/reference recovery. The solid blue acknowledgement remains visible through recovery and release, preventing a premature switch to the normal white saved-level bar. A new fault during closing stops recovery and takes over the display.

The simulator retains latches through its machine-power switch, not a page reload. Firmware must use a bounded, integrity-checked persistent fault record or reset-cause handling so power cycling cannot silently resume a previously faulted run. Persist only state changes and use redundant records; do not write flash/EEPROM on every loop or animation frame.

For Revision C hardware, opening the inhibit relay also removes position feedback. Recovery must first check independently observable preconditions, then permit one deliberate, bounded closing attempt to requalify powered feedback/current/closure. Keep actuator-dependent checks marked pending and retain the fault record until that attempt passes. Requiring valid powered feedback before supplying actuator power would deadlock recovery. The simulator's injected-cause controls are a proxy for these checks; they are not the hardware sequence. See the [electrical audit](hardware-audit-2026-10-04.md) for the proposed recovery contract.

## Limits and additional protections

- Revision C specifies a flow meter, but no pressure sensor. Flow can support no-flow and flow-while-closed diagnostics after characterization; it cannot uniquely distinguish an empty supply, blocked nozzle, disconnected sensor or leak. The browser does not implement this physical acquisition.
- A disconnected trigger can look exactly like a released trigger with simple digital inputs. Detecting open wires requires supervised inputs and compatible end-of-line hardware.
- Lamp open-circuit detection needs diagnostic drivers or channel-current measurement. A software pattern test only checks commanded colors.
- Hardware brownout handling and an independent watchdog/output-inhibit path must work if firmware freezes. A watchdog reboot is not itself a guaranteed water shutoff.
- On healthy power loss, a non-return actuator can stay open. Guaranteed electrical-failure closure requires a separately engineered normally-closed shutoff or stored-energy/spring-return system; it is outside the present BOM.
- Opening as low as 1% is possible in the level/cap arithmetic. Verify minimum repeatable travel and useful spray on the actual valve/nozzle before finalizing physical calibration.

## Detection coverage of the current hardware direction

The [Revision C circuit](hardware-audit-2026-10-04.md) specifies HSD supply measurement, a supervised actuator branch with current measurement, position feedback, a flow meter and two temperature sensors. It has no completed acquisition firmware or physical qualification. Therefore none of these is claimed as implemented hardware protection. The actuator-branch current includes the relay/regulator baseline. Code 3 requires bounded communication and initialization checks; analog feedback has no I2C acknowledgement and must be checked by range, plausibility and progress instead.

For the proposed metered firmware, code 8 can carry measurement subcodes distinguishing position and flow-interface errors; code 5 can carry a characterized failure-to-establish/stop-flow subcode. These are firmware requirements, not newly implemented simulator behavior. A disconnected open-drain meter wire can look inactive. The [logging specification](hardware-audit-2026-10-04.md#does-the-arduino-log-faults) records how detailed causes can be retained without adding more indicator lamps.

A fault affecting the display board or bus may prevent the fault lamp from lighting. The display must never be the mechanism that enforces valve inhibition. The physical inhibit response, feedback independence and output states during reset remain acceptance requirements in the [audit](audit-2026-10-03.md).
