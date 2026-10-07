# Fault Detection and Recovery

Revision 0.11 · Simulator behavior and proposed firmware contract

## Common response

The simulator has one ON/OFF toggle for each of the nine supported fault causes. ON injects and keeps the cause active; OFF removes that injected cause without acknowledging its latched code. Any number of toggles can be ON simultaneously. Briefly switching ON then OFF simulates a transient fault. The status beside each toggle distinguishes an active cause, a cleared cause awaiting reset, and an unlatched code. The controls are disabled while controller power is OFF. A continuously held J also triggers fault 10 automatically after 30 powered seconds, including when held at startup. Delayed release handling checks the same deadline. Physical supply, current, position, communication, and switch diagnostics require the sensors and firmware described below; the browser does not detect those physical conditions.

On a fault, cancel pending gestures and draft edits, clear Normal/Flush run commands and latch the code. Codes 6, 7 and 10 request one automatic close when no drive-inhibiting fault is latched. Codes 1–5 and 8 stop movement and invalidate the position reference. All opening commands are inhibited. Every latched code has its own numbered lamp; simultaneous faults are displayed together. The heading names the lowest numbered code and reports how many are latched. A blue code means that cause has cleared; any remaining white code still blocks acknowledgement of the entire set.

**Stopped is not closed.** An actuator may hold an open position and continue passing water. For the proportional hardware, a fault response must be mapped to a characterized stop/power-inhibit circuit; removing a 4–20 mA signal is not assumed to close or stop it. Do not repeatedly drive a jammed actuator. Use the upstream manual shutoff if flow must stop and the actuator cannot close.

## Automatic closing versus movement inhibition

| Latched codes | Response |
| :--- | :--- |
| Only 6 (settings), 7 (conflicting inputs), and/or 10 (stuck J) | Command closed once, independently of the saved opening/flow curve. Keep fault lamps displayed throughout closing and after closure. |
| Any of 1–5 or 8 | Inhibit drive immediately. Do not attempt to force a jammed, overheated or untrusted actuator closed. Water may remain flowing. |

A drive-inhibiting code takes priority regardless of arrival order, including when its injected cause has already cleared. A new such fault during automatic closing stops the attempt. Removing a cause, adding another operator fault or cycling power does not restart an interrupted close; a fresh acknowledgement is required. Additional settings/input faults do not restart an existing closing deadline. A new fault always cancels a reset hold, even if it permits closing to continue.

Reset leaves water OFF. If closure is already confirmed, reset causes no additional movement. If an automatic close is underway, it retains its original deadline. Otherwise a deliberate reset authorizes one closing/reference attempt. A failure during that attempt inhibits drive again and requires correction and a new acknowledgement. J must be released for 100 ms after closure before a fresh command is accepted; G/H may remain held. Prior rocker activity is consumed.

The ideal browser motion reaches its closed target on a five-second full-stroke model. Inject a jam/timeout/position fault to test an interrupted attempt; the browser does not simulate physical sensors or autonomously discover mechanical failure. Production firmware must separately validate voltage, driver/bus health, feedback progress and bounded closure time. Keep supervised valve power and the closed command available during healthy automatic closing; do not remove power merely because an operator fault latched. A watchdog or unsafe valve-path condition must still inhibit drive independently. A closed indication requires qualified position feedback, not elapsed time alone.

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
| 9 | Reserved | External temperature sensing removed in Revision D; still omitted in Revision E | Not generated or offered as a simulator cause; remaining codes keep their numbers. |
| 10 | Stuck J | J continuously active for 30 seconds | Release J; inspect sticking switch/shorted wiring. This detection is implemented in the simulator. |

Thresholds and confirmation times are deliberately not released as hardware constants until the selected assembly is measured. The simulator uses a five-second ideal stroke; the candidate proportional valve has a different manufacturer stroke limit. Fault 8 includes failure to confirm closure during recovery. Electrical feedback health alone cannot prove physical valve movement: test feedback behavior under a jam.

## Lamp indications

| State | Indication |
| :--- | :--- |
| Cause active | Its numbered lamp blinks white/off continuously, 600 ms per phase. |
| Cause removed, code still latched | Its numbered lamp blinks blue/off at the same rate. Other active codes continue blinking white. |
| Valid reset hold | All latched code lamps stay solid blue. White fill advances across all ten positions over the 3-second hold, spending 300 ms per position, including positions hidden behind blue code lamps. |
| Reset acknowledged, recovery pending | Immediately return to the normal water-OFF display: white saved-level bar and blinking blue maximum marker. Closing and 100 ms of released J still inhibit opening. G/H may stay held. |
| Reset blocked by an active cause | The row alternates staggered blue/white at 600 ms per phase. No reset progress bar is shown. This hold cannot acknowledge faults. |
| Causes cleared, but reset interlocked | Code lamps continue blinking blue. Text identifies the need to release J and start a fresh hold. G/H position does not block reset. No active-fault warning or reset progress is shown. |
| Blocked hold reaches 3 seconds with a cause still active | All lamps alternate blue/white at 250 ms per phase for 1.5 seconds, then ordinary fault blinking returns. Clearing the final cause ends this warning immediately. No automatic retry occurs. |

White progress follows physical positions: lamp 1 is reached at 300 ms, lamp 2 at 600 ms, and so on. A blue code overlays the fill without shortening or redistributing its time. At 3000 ms acknowledgement immediately restores the OFF display; the completed fill is not held. With all nine supported codes latched, lamps 1–8 and 10 remain blue; lamp 9 turns white when the sweep reaches it at 2700 ms. The simulator's separate progress bar also shows elapsed hold time. With reduced motion enabled, active codes are steady white and cleared/reset codes steady blue; holds blocked by active causes and their rejection warnings use steady white, and the white progress animation is suppressed. Text identifies each state. The rejection still expires after 1.5 seconds.

## What clears a cause on real hardware?

The browser toggles are manual stand-ins for physical detection. Production firmware must distinguish directly observable healthy conditions from actuator checks that cannot be completed with drive inhibited:

| Condition | Recovery evidence |
| :--- | :--- |
| Stuck J or conflicting inputs | Debounced J release or removal of the simultaneous G/H assertion. A single held G or H is valid. |
| Supply fault | Measured voltage inside a characterized recovery range for a stable interval. |
| Communication or driver fault | Required initialization/transfers and independent diagnostics healthy; do not infer output correctness from a bus ACK alone. |
| Jam, overcurrent, timeout or lost position | Correct the physical problem, verify independent preconditions and use a deliberate reset to authorize one bounded closing/requalification attempt. Current, feedback progress and closure must then pass before recovery completes. |
| Invalid settings | Validate an available redundant record or acknowledge recovery to known defaults; do not use corrupt values to command closure. |

Zero current with valve power disabled does not prove an overcurrent or jam is repaired. Actuator-dependent conditions remain pending verification, rather than falsely healthy or permanently impossible to reset. A reset may authorize the supervised test while these checks are pending; it does not erase their diagnostic record or authorize ordinary opening. A failed test inhibits movement again and requires a new deliberate attempt after correction. There are no final hardware thresholds or acquisition firmware in this repository yet.

## Simulator acknowledgement

1. Turn OFF each injected cause (or use **Turn off all fault toggles**). For a real automatic stuck-J fault, release J as well; the toggles cannot remove that physical-input condition.
2. Release J. Every cause must be absent before starting a fresh hold. G/H may remain held in either direction.
3. Hold J for three seconds. Blue code lamps remain visible while the other lamps fill white. Releasing early or introducing a new fault cancels the gesture, even if corrected before its deadline. Holding or moving G/H does not interrupt it and does not edit settings.
4. Release J and wait for any unfinished closing/reference recovery. After closure, J must remain released for 100 ms; G/H may stay held or move. Water stays OFF until a fresh J tap. Earlier rocker activations are discarded, not queued.

A hold started while a cause is active is blocked for its entire duration. Clearing that cause during the hold does not make it valid; release and press J again. G/H position and movement do not affect reset eligibility. A blocked hold never changes saved settings, clears latches or initiates valve movement. An automatic close already authorized by the fault response continues independently of the reset gesture. The active-cause warning ends as soon as the final cause clears. The short warning does not repeat if J remains held; the 30-second stuck-J detector remains active. The display and acknowledgement handler use the same reset-state decision. Only a hold displayed as eligible can acknowledge; the progress bar is reserved for that state.

**Reset now · sim shortcut** skips the hold and its progress animation, but still requires all causes absent and J released; G/H may be held. Acknowledgement restores defaults if code 6 was among the latched codes. If the valve is already confirmed closed, it remains closed without another movement. An automatic close already underway continues on its original deadline. Otherwise acknowledgement authorizes one closing/reference recovery attempt. At the instant acknowledgement succeeds, the reset animation ends and the normal water-OFF lamp display returns, even if J is still held or the valve is still closing. The progress bar clears immediately. The maximum marker starts on its blue phase and continues its usual blue/off or blue/white cycle; reduced motion uses a steady blue marker. The display shows the OFF command, not proof of physical closure. A new fault takes over the display and requires another acknowledgement. Codes 6, 7 and 10 allow an existing close to continue; a drive-inhibiting code stops it immediately.

The simulator retains latches through its machine-power switch, not a page reload. Firmware must use a bounded, integrity-checked persistent fault record or reset-cause handling so power cycling cannot silently resume a previously faulted run. Persist only state changes and use redundant records; do not write flash/EEPROM on every loop or animation frame.

For Revision E hardware, opening the inhibit relay also removes position feedback. Recovery must first check independently observable preconditions, then permit one deliberate, bounded closing attempt to requalify powered feedback/current/closure. Keep actuator-dependent checks marked pending and retain the fault record until that attempt passes. Requiring valid powered feedback before supplying actuator power would deadlock recovery. The simulator's injected-cause controls are a proxy for these checks; they are not the hardware sequence. See the [electrical audit](hardware-audit-rev-e.md) for the proposed recovery contract.

## Limits and additional protections

- Revision E has no flow meter or pressure sensor. It cannot automatically detect no water, a blocked nozzle, water leaking through a closed valve, or actual flow rate. Valve feedback reports position; it does not independently confirm hydraulic shutoff.
- A disconnected trigger can look exactly like a released trigger with simple digital inputs. Detecting open wires requires supervised inputs and compatible end-of-line hardware.
- Lamp open-circuit detection needs diagnostic drivers or channel-current measurement. A software pattern test only checks commanded colors.
- Hardware brownout handling and an independent watchdog/output-inhibit path must work if firmware freezes. A watchdog reboot is not itself a guaranteed water shutoff.
- On healthy power loss, a non-return actuator can stay open. Guaranteed electrical-failure closure requires a separately engineered normally-closed shutoff or stored-energy/spring-return system; it is outside the present BOM.
- Opening as low as 1% is possible in the level/cap arithmetic. Verify minimum repeatable travel and useful spray on the actual valve/nozzle before finalizing physical calibration.

## Detection coverage of the current hardware direction

The [Revision E circuit](hardware-audit-rev-e.md) specifies HSD supply measurement, a supervised actuator branch with current measurement and position feedback, with no flow meter or external temperature sensors. It has no completed acquisition firmware or physical qualification. Therefore none of these is claimed as implemented hardware protection. The actuator-branch current includes the relay/regulator baseline. Code 3 requires bounded communication and initialization checks; analog feedback has no I2C acknowledgement and must be checked by range, plausibility and progress instead.

For Revision E firmware, code 8 covers position/reference measurement failures and code 5 covers motion/closed-position timeouts. No flow-interface subcode or missing-meter condition is enabled. Existing lamp numbers and acknowledgement behavior remain unchanged. Detailed causes can be recorded through the [logging specification](hardware-audit-rev-e.md#does-the-arduino-log-faults).

A fault affecting the display board or bus may prevent the fault lamp from lighting. The display must never be the mechanism that enforces valve inhibition. The physical inhibit response, feedback independence and output states during reset remain acceptance requirements in the [audit](audit-2026-10-03.md).

Revision E has no automatic enclosure or actuator-temperature measurement. The HSD chips retain intrinsic thermal shutdown. Their shared FAULT output can also indicate other conditions, so software must report code 4 without claiming a unique thermal diagnosis. THER is a behavior-control input, not a temperature-reading output. Characterize retry/latch behavior during H5; thermal hardware recovery alone must not authorize an application restart.
