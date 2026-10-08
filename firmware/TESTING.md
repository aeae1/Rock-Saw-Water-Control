# Firmware v1 verification record

8 October 2026 · v1.0.0-bench · Revision G circuit

## Automated checks

The native suite passes **301,788 assertions**, compiled with strict warnings treated as errors, AddressSanitizer and UndefinedBehaviorSanitizer. The local managed runtime requires `ASAN_OPTIONS=detect_leaks=0` because LeakSanitizer cannot inspect its process environment. ASan/UBSan remain enabled; CI uses the default sanitizer configuration. Project firmware does not dynamically allocate memory.

Coverage includes:

- All eight combinations of held startup inputs; no inherited tap/open action; full lamp-frame acknowledgement before each one-second hold.
- Exact 499/500/1499/1500 ms tap/hold boundaries, delayed release classification, 30-second stuck J and 32-bit timer rollover.
- Normal, Set Max and Flush; nearest-position cap changes, held rocker, cancelled hold and discarded input edges.
- Single and multiple faults, new fault during reset, active-cause reset rejection, fresh-press requirement, and both G/H directions throughout acknowledgement and rearming.
- Immediate OFF lamps at reset completion, fill timing behind fault lamps, qualified closed position before enabling and finite motion deadlines that survive changed targets.
- Invalid feedback, jam/no-progress, contradictory controls, invalid saved settings and exclusion of unfitted fault codes 2/9.
- All candidate levels/caps against sampled physical positions, nonlinear interpolation, ties, invalid curves and DAC endpoint/midpoint encoding.
- EEPROM write interruption at every byte boundary, corruption of each of 192 record bits, CRC, alternating copies and sequence wrap.
- Actual packet layouts, channel/address mapping, rejected dual-color output, I²C ACK/read/error responses and two-millisecond break-before-make lamp transitions.
- Stuck SCL/SDA, bounded transaction timeout across microsecond wrap, feedback scaling and Wombat frame-counter freeze/reset/wrap detection.
- 12,000 deterministic stress steps combining finite-speed motion, inputs and fault chatter; bounds, OFF-on-fault and valid lamp states checked after each step.

Run from the repository root:

```sh
bash scripts/test-firmware.sh
```

The separate GitHub **Firmware checks** workflow runs these tests and compiles the real Nano Every target using Arduino CLI 1.3.1 and `arduino:megaavr@1.8.8`, exporting HEX/ELF build artifacts. The browser/Node suites continue separately; those test the simulator, not AVR machine code.

The stable local target build completes with **no compiler warnings**: **15,383 / 49,152 bytes flash (31%)** and **982 / 6,144 bytes static RAM (15%)**, leaving 5,162 bytes for stack/runtime. This is a compile-time allocation report, not a measured stack high-water mark.

## Remaining physical evidence

A successful compile confirms board/core compatibility and resource fit. Native tests exercise project logic and mocked transport, not real I²C waveforms, actual Arduino runtime peripherals or hardware fault thresholds. No hardware-in-the-loop test was performed. The exact installed Wombat firmware, DAC compliance, current feedback return, ADC reference, actuator motion, electrical resets and enclosure temperature must be measured on the bench.

The controller has no independent valve-power cutoff and cannot prove hydraulic shutoff. Fault display can remain stale when its bus/boards fail. The internal watchdog can restart the Nano; a dead peripheral may require the owner's manual power cycle. Brownout fuse behavior and watchdog recovery under real load remain explicit bench checks. There is no automatic flow meter, actuator-current detector, ambient-temperature detector or per-lamp current measurement in v1.

For commissioning and logging limitations, see [Firmware v1](README.md), the [Revision G audit](../docs/hardware-audit-rev-g.md) and [validation plan](../docs/validation.md).
