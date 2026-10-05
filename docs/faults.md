# Fault Detection and Recovery

Revision 0.10 · Simulator behavior and proposed firmware contract

## Common response

The simulator has one ON/OFF toggle for each of the ten fault causes. ON injects and keeps the cause active; OFF removes that injected cause without acknowledging its latched code. Any number of toggles can be ON simultaneously. Briefly switching ON then OFF simulates a transient fault. The status beside each toggle distinguishes an active cause, a cleared cause awaiting reset, and an unlatched code. The controls are disabled while controller power is OFF. A continuously held J also triggers fault 10 automatically after 30 powered seconds, including when held at startup. Delayed release handling checks the same deadline. Physical supply, current, position, temperature, communication, and switch diagnostics require the sensors and firmware described below; the browser does not detect those physical conditions.

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
| Valid reset hold | All latched code lamps stay solid blue. White fill advances across all ten positions over the 3-second hold, spending 300 ms per position, including positions hidden behind blue code lamps. |
| Reset acknowledged, recovery pending | Immediately return to the normal water-OFF display: white saved-level bar and blinking blue maximum marker. Closing and released/centered control qualification still inhibit opening. |
| Reset blocked by an active cause | The row alternates staggered blue/white at 600 ms per phase. No reset progress bar is shown. This hold cannot acknowledge faults. |
| Causes cleared, but reset interlocked | Code lamps continue blinking blue. Text identifies the need to release J and start a fresh hold. G/H position does not block reset. No active-fault warning or reset progress is shown. |
| Blocked hold reaches 3 seconds with a cause still active | All lamps alternate blue/white at 250 ms per phase for 1.5 seconds, then ordinary fault blinking returns. Clearing the final cause ends this warning immediately. No automatic retry occurs. |

White progress follows physical positions: lamp 1 is reached at 300 ms, lamp 2 at 600 ms, and so on. A blue code overlays the fill without shortening or redistributing its time. At 3000 ms acknowledgement immediately restores the OFF display; the completed fill is not held. With all ten codes latched, all ten remain blue; the simulator's separate progress bar still shows elapsed hold time. With reduced motion enabled, active codes are steady white and cleared/reset codes steady blue; holds blocked by active causes and their rejection warnings use steady white, and the white progress animation is suppressed. Text identifies each state. The rejection still expires after 1.5 seconds.

## Acknowledgement

1. Turn OFF each injected cause (or use **Turn off all fault toggles**). For a real automatic stuck-J fault, release J as well; the toggles cannot remove that physical-input condition.
2. Release J. Every cause must be absent before starting a fresh hold. G/H may remain held in either direction.
3. Hold J for three seconds. Blue code lamps remain visible while the other lamps fill white. Releasing early or introducing a new fault cancels the gesture, even if corrected before its deadline. Holding or moving G/H does not interrupt it and does not edit settings.
4. Release J and wait for closing/reference recovery. Controls must remain released/centered for 100 ms afterward. Water stays OFF; no opening command is queued.

A hold started while a cause is active is blocked for its entire duration. Clearing that cause during the hold does not make it valid; release and press J again. G/H position and movement do not affect reset eligibility. A blocked hold never changes saved settings, clears latches or moves the valve. The active-cause warning ends as soon as the final cause clears. The short warning does not repeat if J remains held; the 30-second stuck-J detector remains active. The display and acknowledgement handler use the same reset-state decision. Only a hold displayed as eligible can acknowledge; the progress bar is reserved for that state.

**Reset now · sim shortcut** skips the hold and its progress animation, but still requires all causes absent and J released; G/H may be held. Acknowledgement restores defaults if code 6 was among the latched codes and starts closing/reference recovery. At the instant acknowledgement succeeds, the reset animation ends and the normal water-OFF lamp display returns, even if J is still held or the valve is still closing. The progress bar clears immediately. The maximum marker starts on its blue phase and continues its usual blue/off or blue/white cycle; reduced motion uses a steady blue marker. The display shows the OFF command, not proof of physical closure. A new fault during closing stops recovery and takes over the display.

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
