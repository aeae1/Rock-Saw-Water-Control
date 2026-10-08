# Firmware Integration Contract

Revision 1.0 · Updated 2026-10-07

No flashable firmware is supplied. The browser simulator is an executable operator-interface reference, not Arduino firmware. The current hardware direction is Nano Every, DFR1229 command, SEN0262 feedback to A0, three PCB0046 boards, with no flow meter or external temperature sensors. See the [Revision F electrical audit](../docs/hardware-audit-rev-f.md) for the complete proposed circuit and release holds.

## Revision F hardware integration requirements

- D2/D3/D4 are active-high G/H/J inputs after the selected opto boards. D7/D8/D9 are unused; configure them without a required sensor acquisition or missing-meter fault.
- A control input may already be electrically asserted when the main supply returns. Preserve startup-neutral qualification and consume those assertions; never replay them as a new gesture. Off-state input backfeed and LED current are hardware acceptance checks, not behaviors a sleeping or unpowered sketch can enforce.
- HSD3 CH4 is reserved for a SW8B watchdog driving Q1/R11/R12 to Nano RESET. It never powers the valve. Normal LOW, timeout HIGH, proposed timeout 2000 ms, feed 100 ms, return LOW after 100 ms, Wombat self-reset disabled. Channels 5–7 remain OFF. Qualify/disable CH4 open-load diagnostics for its deliberately small reset-circuit load; do not apply lamp-current thresholds to it. Exclude CH4 from lamp writes and sweeps.
- Enable the Nano ATmega4809 internal watchdog at approximately 1.024 s. Feed both watchdogs only after useful bounded progress; a handled fault is valid progress. Do not create reboot loops just because a hardware fault remains latched.
- Configure both Wombat watchdog packets with checked transfers. The convenience library defaults to a 65535 ms return delay with self-reset disabled; override it to the proposed 100 ms or the Nano can remain held in reset. The return-delay countdown must be reinitialized after a timeout; merely feeding the timer does not restore it. Prove timeout polarity, pulse release, partial initialization and repeated recovery on the actual SW8B firmware before connecting the valve.
- The reviewed GP8XXX convenience driver discards ordinary I2C write results. Use bounded, checked transactions for the DAC and Wombats. On reset, write a validated 4 mA close command; do not rely on retained peripheral state. Valve power remains present during Nano reset.
- There is no actuator-current measurement in Revision F. Code 2 is a simulator-only scenario with no fitted hardware detector. Wombat current/thermal diagnostics cover its lamp/reset loads; HSD VIN uses the default 11:1 divider.
- A0's 1 kohm series resistor and 100 kohm pull-down introduce a 100/101 nominal attenuation. Calibrate the complete chain. Do not use a 0-5 V feedback assumption.
- No flow acquisition, automatic sweep, live GPM, no-flow detector or flow-while-closed detector is present. Optional manual flow calibration supplies a validated lookup table; store an explicit opening-scale versus calibrated-scale mode. Position feedback remains mandatory, and a closed-position indication is not proof of hydraulic shutoff.
- The audit's fault-logging section specifies a bounded RAM history and a small redundant EEPROM last-fault/reset summary. Neither exists as running firmware. No external log memory or real-time clock is in the circuit.
- Recovery checks supply, communication and position independently. A fresh acknowledgement may authorize one bounded closing/requalification attempt after the physical problem is corrected. Never resume ON or Flush automatically. A failed feedback path leaves closure unknown; do not substitute calculated travel for measured position. No reset action can physically isolate a jammed actuator in this design.

## Processing order

Use a monotonic, nonblocking main loop with explicit budgets. A recommended order is acquisition → fault evaluation → startup/recovery → gesture/mode processing → valve request → lamp update → storage/service. A fault takes precedence over a gesture becoming eligible in the same cycle. Animations must never delay acquisition, fault response or closure.

| Layer | Required behavior |
| :--- | :--- |
| Raw input acquisition | Read all three conditioned inputs in every state, including startup, faults and Flush; normalize polarity |
| Debounce | Qualify press/release and G/H conflict duration using measured switch/input behavior; a continuously active G or H is normal |
| Startup/recovery | Request closed; startup also runs the two-second lamp test concurrently and requires J released / G/H centered for 100 ms. Fault recovery only requires J released for 100 ms after verified closure; G/H may stay held. Consume earlier activations; do not repeat the lamp test on acknowledgement |
| Gestures | Fresh press and matching release; <500 ms tap, 500–1499 ms cancel, 1500 ms mode change; one mode transition per press |
| Fault acknowledgement | Fresh 3000 ms J hold after independently observable causes clear; actuator-dependent checks may remain pending one bounded requalification attempt. Ordinary opening stays inhibited until that attempt passes. G/H position/movement does not affect acknowledgement or edit settings; a new cause or interrupted J hold cancels |
| Stuck trigger | 30000 ms continuous powered assertion, including startup; compare elapsed time even if scheduling was delayed |
| Valve interface | Explicit 4–20 mA range/scaling, initialized closed command and verified feedback; bounded motion deadline and progress checks |
| Lamp interface | Twenty output channels, one color per lamp, old color off before replacement; initialize off and poll diagnostics |
| Bus handling | Bound transactions and retry count; report failed initialization/transfers; never wait forever for an I²C device |
| Persistence | Version, checksum, bounds, redundant committed records and wear-conscious writes; never restore an ON or Flush command |
| Supervision | Internal watchdog and characterized external host-reset pulse; bounded progress required; no independent output-inhibit circuit |

## Revision F physical fault response

The browser retains its earlier simulated movement-inhibit policy. It is an operator-interface reference, not the physical fault-response implementation for this relay-free design. Do not translate its `inhibited` state into a claim that the actuator is deenergized.

On a detected fault, clear the requested ON/Flush state and prohibit opening. If the command path is usable, issue one best-effort 4 mA closed command independent of saved calibration. Monitor feedback with an original bounded deadline; additional faults do not extend it. If command or feedback fails, mark closure unknown and retain the fault record. No automatic reverse/retry is allowed. There is no independent actuator power cut and no measured motor-current detector. A jammed valve may remain powered; isolate water manually and remove machine power for repair when needed.

Do not label every unavailable detector as healthy. Code 2 (actuator overcurrent) is not fitted; code 9 remains reserved. Position/progress failures use codes 5/8 after characterization. Driver code 4 pertains to HSD outputs, not the directly powered actuator. A display/bus failure may prevent a warning from appearing.

Acknowledgement keeps water requested OFF. After correction, confirm closed position or allow one bounded reference attempt, then require J released for 100 ms. G/H may remain held during fault clearing and rearming; consume their earlier activations. Return the lamps to the normal OFF indication immediately after acknowledgement, while separately gating opening on completed requalification. The electrical audit defines the remaining H1–H5 bench checks.

## Fault display contract

Implement independent active-cause and latched-code bitsets. Show all latched codes concurrently: white/off while active, blue/off after a cause clears (600 ms phases). A valid fresh three-second reset hold keeps every code lamp solid blue while white fill advances across all ten physical positions at 300 ms per position. Overlay blue codes on that fill; their positions still consume time. Do not redistribute the three seconds among only unoccupied lamps. Code 9 remains reserved, so lamp 9 participates in the ordinary white progress sweep even when every supported code is latched. Immediately after acknowledgement, end the reset animation and restore the normal OFF-command display: white saved-level bar with the maximum marker blinking blue (steady blue with reduced motion). Closing/requalification and 100 ms of released J still gate all opening commands; G/H may stay held; the held reset input is consumed. Do not interpret acknowledgement as verified hardware recovery; retain the actual fault record until requalification succeeds as specified above.

Reset eligibility is captured at the start of the press. Clearing causes during a blocked hold cannot authorize it. Holds blocked by active causes stagger blue/white at 600 ms phases; reaching three seconds with a cause still active gives a 1.5-second warning with 250 ms phases, then resumes the normal fault indication without retrying. With all causes cleared but a fresh J press still required, retain blue-code blinking instead; do not show an active-cause warning or reset progress. Clearing the final cause ends the warning immediately without authorizing the existing hold. Use the same eligibility state for reset completion and its lamp indication. Any new fault cancels an eligible hold; G/H movement does not. After acknowledgement, retain closure and 100 ms of released J before rearming normal commands. G/H position or movement must not block rearming or replay an old setting command. A fault always outranks animation. See the [fault reference](../docs/faults.md) for the complete simulator contract, including reduced motion. This is a firmware requirement, not implemented Arduino code.

## Startup lamp test

After successful output initialization, test only the twenty explicitly mapped lamp channels: all ten lamps white for one second, then all ten blue for one second. Clear all previous lamp-color channels before setting the next color; never energize both colors of a lamp simultaneously. HSD1/HSD2 channels 0–7 and HSD3 channels 0–3 are the lamp allowlist; HSD3 channel 4 remains owned exclusively by host-reset supervision, and channels 5–7 remain OFF. Never implement a sweep over every driver output or a bulk clear that changes the reset output.

Run this as a nonblocking elapsed-time state alongside acquisition, supervision and closed-position recovery. Inhibit opening/gestures until the test and closure complete, then qualify neutral controls. A fault or failed lamp-driver transaction aborts the test immediately; faults have priority even at its completion deadline. Do not run over a latched fault or replay it after acknowledgement. A healthy controller power-up/reset restarts it; repeated loop iterations do not. The same all-white/all-blue sequence applies to reduced-motion mode. Ignore operator commands during the test while continuing raw-input monitoring and stuck-trigger detection.

This checks visibility and harness/color assignment for the operator. It does not prove electrical health automatically. Current diagnostics need separate qualified thresholds. Bench acceptance must verify every color, break-before-make switching, test interruption, held controls, timer rollover, and that all lamp-test writes leave the host-reset channel unchanged. No test code may delay closure, watchdog servicing or fault evaluation.

The simulator's 5-second full stroke and 200 ms minimum move are visual-model values. They are not hardware motion deadlines. Characterize the actual valve and feedback before selecting timeouts, tolerances, settle windows and current thresholds.

## Required state distinctions

Keep the requested water command, requested valve target, measured position, position validity and fault latch separate. An OFF command is not proof of closure. Do not declare reference complete merely because an estimated travel timer expired. Check feedback plausibility and target arrival for a stable interval. On feedback failure, do not replace the lost measurement with the old target and claim it is actual position.

Set Max holds the actual opening reached at entry when running; an existing OFF command continues closing. Verify that commanding the latest feedback position actually produces a stable hold on this actuator. Saving selects the nearest repeatable target under the new cap. Flush bypasses the cap and consumes its exit press, including the later release. A reset never resumes Flush or a previous run.

## Memory and time budget

The Nano Every has limited EEPROM and RAM. Its [datasheet](https://docs.arduino.cc/resources/datasheets/ABX00028-datasheet.pdf) lists 256 bytes EEPROM and 6 kB SRAM. Do not assume a large JSON calibration table or an unbounded fault log will fit. Establish the compiled memory footprint of three HSD objects, command library, bus buffers and service output before release. Avoid dynamic allocation in the operating loop and bound serial logging so a disconnected host cannot stall it.

A possible storage budget is two 112-byte settings/calibration slots plus two 16-byte fault/reset records, totaling 256 bytes. This is a planning example, not an implemented layout. A compact 21-point table of two uint16 values per point requires 84 bytes per slot; headers, settings, sequence and CRC must fit the remaining 28 bytes. Assert the final packed size and test interrupted writes at every byte boundary. Commit markers must be written last; validate both copies before selecting the newest valid sequence, including sequence rollover. If neither record is valid, latch the settings fault and wait for acknowledgement before restoring defaults.

Use unsigned subtraction for elapsed durations and test around the 32-bit millisecond rollover (about 49.7 days). Keep durations well below half the counter range. Compare elapsed time when processing a release, not only when an earlier timer was scheduled. The browser's floating-point clock does not validate MCU rollover behavior.

## Driver and fault acceptance

Before USB-only programming, disconnect the machine harness and valve cable and isolate water. USB can energize the DAC while the actuator has no main supply. Shared machine power does not establish safe signal behavior during separate connector loss or rail decay.

Measure the DAC's reset/power-loss/retained-output behavior. A Nano reset does not necessarily reset the separately powered DAC or lamp boards. Never assume a disconnected command means close. Current-output compliance into the valve, feedback load/common connections and startup, shutdown and signal-loss behavior remain open hardware tests.

Fault 2 has no fitted actuator-current detector in Revision F and must not be emitted as measured hardware overcurrent. Fault 9 remains reserved. HSD drivers retain built-in thermal protection; generic FAULT maps to code 4 without claiming a unique thermal diagnosis. There is no ambient or actuator temperature acquisition. Observe actual actuator response and reset recovery; a passing simulator test is not physical validation.

Before field release, compile for the exact Nano Every/core/library revisions, record flash/RAM use, test all inputs and bus failures with hardware, stop the MCU deliberately, interrupt settings writes, exercise repeated power cycles and perform hot-soak and motion tests. Record results in [Validation](../docs/validation.md). No board firmware is represented as ready until those checks pass.
