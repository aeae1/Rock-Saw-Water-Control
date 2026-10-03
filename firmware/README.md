# Firmware Integration Contract

Revision 0.4 · Reviewed 2026-10-03

No flashable firmware is supplied. The browser simulator is an executable operator-interface reference, not Arduino firmware. The current hardware direction is Nano Every, DFR1229 command, SEN0262 feedback to A0, and three PCB0046 lamp boards. See the [build guide](../docs/build-guide.md) for proposed pins and unresolved circuits.

## Processing order

Use a monotonic, nonblocking main loop with explicit budgets. A recommended order is acquisition → fault evaluation → startup/recovery → gesture/mode processing → valve request → lamp update → storage/service. A fault takes precedence over a gesture becoming eligible in the same cycle. Animations must never delay acquisition, fault response or closure.

| Layer | Required behavior |
| :--- | :--- |
| Raw input acquisition | Read all three conditioned inputs in every state, including startup, faults and Flush; normalize polarity |
| Debounce | Qualify press/release and G/H conflict duration using measured switch/input behavior; a continuously active G or H is normal |
| Startup/recovery | Request closed, validate closure/position, then require J released and G/H centered for 100 ms; consume all earlier activations |
| Gestures | Fresh press and matching release; <500 ms tap, 500–1499 ms cancel, 1500 ms mode change; one mode transition per press |
| Fault acknowledgement | All causes absent; fresh 3000 ms J hold with G/H centered throughout; any rocker movement or new cause cancels |
| Stuck trigger | 30000 ms continuous powered assertion, including startup; compare elapsed time even if scheduling was delayed |
| Valve interface | Explicit 4–20 mA range/scaling, initialized closed command and verified feedback; bounded motion deadline and progress checks |
| Lamp interface | Twenty output channels, one color per lamp, old color off before replacement; initialize off and poll diagnostics |
| Bus handling | Bound transactions and retry count; report failed initialization/transfers; never wait forever for an I²C device |
| Persistence | Version, checksum, bounds, redundant committed records and wear-conscious writes; never restore an ON or Flush command |
| Supervision | Hardware watchdog and a characterized output-inhibit path; feeding a watchdog requires successful control-loop progress |

The simulator's 5-second full stroke and 200 ms minimum move are visual-model values. They are not hardware motion deadlines. Characterize the actual valve and feedback before selecting timeouts, tolerances, settle windows and current thresholds.

## Required state distinctions

Keep the requested water command, requested valve target, measured position, position validity and fault latch separate. An OFF command is not proof of closure. Do not declare reference complete merely because an estimated travel timer expired. Check feedback plausibility and target arrival for a stable interval. On feedback failure, do not replace the lost measurement with the old target and claim it is actual position.

Set Max holds the actual opening reached at entry when running; an existing OFF command continues closing. Verify that commanding the latest feedback position actually produces a stable hold on this actuator. Saving selects the nearest repeatable target under the new cap. Flush bypasses the cap and consumes its exit press, including the later release. A reset never resumes Flush or a previous run.

## Memory and time budget

The Nano Every has limited EEPROM and RAM. Its [datasheet](https://docs.arduino.cc/resources/datasheets/ABX00028-datasheet.pdf) lists 256 bytes EEPROM and 6 kB SRAM. Do not assume a large JSON calibration table or an unbounded fault log will fit. Establish the compiled memory footprint of three HSD objects, command library, bus buffers and service output before release. Avoid dynamic allocation in the operating loop and bound serial logging so a disconnected host cannot stall it.

A possible storage budget is two 112-byte settings/calibration slots plus two 16-byte fault/reset records, totaling 256 bytes. This is a planning example, not an implemented layout. A compact 21-point table of two uint16 values per point requires 84 bytes per slot; headers, settings, sequence and CRC must fit the remaining 28 bytes. Assert the final packed size and test interrupted writes at every byte boundary. Commit markers must be written last; validate both copies before selecting the newest valid sequence, including sequence rollover. If neither record is valid, latch the settings fault and wait for acknowledgement before restoring defaults.

Use unsigned subtraction for elapsed durations and test around the 32-bit millisecond rollover (about 49.7 days). Keep durations well below half the counter range. Compare elapsed time when processing a release, not only when an earlier timer was scheduled. The browser's floating-point clock does not validate MCU rollover behavior.

## Driver and fault acceptance

Measure the DAC's reset/power-loss/retained-output behavior. A Nano reset does not necessarily reset the separately powered DAC or lamp boards. Never assume a disconnected command means close. Current-output compliance into the valve, feedback load/common connections and fault-inhibit behavior remain open hardware tests.

Fault 2 needs actuator-current acquisition; lamp-board diagnostics do not provide it on the separate actuator feed. Fault 9 requires a temperature sensor. A failed display or I²C bus must not disable valve inhibition. The physical response for each code must be implemented and observed, not inferred from a simulator lamp.

Before field release, compile for the exact Nano Every/core/library revisions, record flash/RAM use, test all inputs and bus failures with hardware, stop the MCU deliberately, interrupt settings writes, exercise repeated power cycles and perform hot-soak and motion tests. Record results in [Validation](../docs/validation.md). No board firmware is represented as ready until those checks pass.
