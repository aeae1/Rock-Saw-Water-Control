# Firmware v1.0.0-bench

A complete, flashable **Arduino Nano Every / ATmega4809** sketch for the [Revision G circuit](../docs/hardware-audit-rev-g.md). It controls the proportional valve, reads position feedback and three operator inputs, and drives all twenty lamp-color outputs. The internal watchdog is enabled; there is no external watchdog circuit.

**Release status:** compiled for the real target and tested on a host computer. No assembled controller or valve was available for physical testing. This is a bench prototype, not a field-qualified release. The five hardware acceptance items H1–H5 in the electrical audit remain open. [Test evidence and limits](TESTING.md).

## Install and upload

1. Download this repository using GitHub **Code → Download ZIP**, and extract it.
2. Install Arduino IDE 2. In Boards Manager, install **Arduino megaAVR Boards 1.8.8**.
3. Open [RockSawWaterControl/RockSawWaterControl.ino](RockSawWaterControl/RockSawWaterControl.ino). Keep all the adjacent `.h` files in that same folder. No third-party Arduino libraries are needed; EEPROM is supplied by the board package.
4. Select **Arduino Nano Every**, its USB port, and **Registers emulation: None (ATMEGA4809)**. A classic Nano or ESP board is not interchangeable with this sketch.
5. For USB-only programming, unplug machine power and disconnect the complete valve cable; close the manual water shutoff. USB can energize the DAC through the Nano's 5 V rail even when actuator power is absent.
6. Connect a Micro-USB **data** cable, click Verify, then Upload. Remove USB before reconnecting the machine/valve for standalone testing. Check voltage and polarity before energizing the assembly.

Uploading does not authorize a water command. The firmware always starts OFF, sends 4 mA CLOSED and requires startup/closed-feedback checks. A bare Nano without the required modules/feedback will report faults; it is not a standalone lamp demonstration.

Equivalent command-line build:

```sh
arduino-cli core update-index
arduino-cli core install arduino:megaavr@1.8.8
arduino-cli compile --warnings all --fqbn arduino:megaavr:nona4809:mode=off --output-dir build/firmware firmware/RockSawWaterControl
arduino-cli upload --fqbn arduino:megaavr:nona4809:mode=off --port YOUR_PORT firmware/RockSawWaterControl
```

The committed [bench HEX](releases/v1.0.0-bench/RockSawWaterControl-NanoEvery.hex) and [build manifest](releases/v1.0.0-bench/build.json) match the shipped default configuration. They are for Nano Every only. The GitHub Actions **Firmware checks** workflow also builds a downloadable HEX/ELF artifact. Use the IDE source upload for initial commissioning; it makes the selected board and configuration visible.

## Hardware mapping

| Nano / bus connection | Function |
| :--- | :--- |
| VIN / GND | Verified incoming nominal 12 V / 0 V |
| D2 / D3 / D4 | Conditioned active-high G / H / J; never connect raw 12 V directly |
| A0 | SEN0262 position feedback through R4/R5/C1 |
| A4 / A5 | Open-drain software SDA / SCL, local bus below 100 kHz |
| 0x58 | DFR1229 GP8600 command DAC |
| 0x60/61 | HSD1 outputs / diagnostics, lamps 1–4 |
| 0x62/63 | HSD2 outputs / diagnostics, lamps 5–8 |
| 0x64/65 | HSD3 outputs / diagnostics, lamps 9–10 |
| HSD3 CH4–CH7, Nano RESET | Unconnected; spare HSD outputs initialized OFF |

Each lamp uses channel `2 × lamp-index` for BLUE and the next channel for WHITE, on the appropriate board. Opposite colors are separated by an acknowledged OFF packet and at least 2 ms before the new color is enabled. HSD3's upper bank is unused and omitted from aggregate lamp-fault reads.

Open all HSD SDA/SCL pull-up jumpers; use the DFR1229's existing pull-ups. HSD1 address jumpers all open; HSD2 A1 closed; HSD3 A2 closed. Keep the I²C wiring local to the electronics enclosure. Source-checked SW08B packet handling is in [Protocol.h](RockSawWaterControl/Protocol.h); actual installed board versions must still be verified. `boards` prints the six reported version strings.

## Operation

| Mode | Action |
| :--- | :--- |
| Normal | J tap under 0.5 s toggles water. G/H changes one level per activation; a held rocker does not repeat. |
| Set Max | Hold J for 1.5 s, release, adjust with G/H, tap J to save. Running water holds its measured opening while editing. |
| Flush | From Set Max, release J and hold again for 1.5 s. Opens fully, bypassing the cap. A fresh J press returns immediately to the prior Normal ON/OFF state. |

Hold indication starts after 0.5 s; release between 0.5 and 1.5 s cancels the gesture. Saving a cap chooses the nearest repeatable valve position under that cap, ties upward. OFF stays OFF. Flush from an OFF session requires qualified closed position at the start of the hold.

Startup commands CLOSED and tests all ten lamps: **all white for a full second, then all blue for a full second**. Timing starts only after the hardware has applied each complete color frame. Inputs are locked out. Faults override the test. Then position must be qualified closed, J released and G/H centered for 100 ms. Held startup inputs are discarded.

Paused lamps show the saved level in white and the cap marker blinking blue: blue/OFF above the bar, blue/white within it. Fill/drain follows reported actuator position; it is an animation, not measured flow.

## Faults and acknowledgement

Every fitted fault latches OFF and requests CLOSED when the command path can still operate. There is **no independent valve-power cutoff**. A broken bus, failed DAC, jammed actuator or loss of power can leave water flowing. Use the manual shutoff if closure is uncertain; power-cycle the controller if needed. Do not interpret an unresponsive lamp bar as a healthy controller.

| Lamp | Implemented cause | What removes the active cause |
| :--- | :--- | :--- |
| 1 | HSD-reported supply outside 9–16 V for 200 ms; remembered watchdog/brownout reset | Stable supply; reset reason remains recorded and needs acknowledgement |
| 2 | Not fitted; browser-only scenario | No actuator-current sensor is installed |
| 3 | Failed DAC/I²C transfer, incompatible board response, or stopped/reset Wombat frame counter | Successful reinitialization, diagnostics from all boards and 500 ms healthy communication |
| 4 | Active-low lamp-bank FAULT held for 100 ms | Hardware FAULT returns healthy; investigate wiring/load/temperature rather than assuming a unique cause |
| 5 | More than 15 s continuous unfinished movement, or 4 s without 1% position progress | A valid closed position settles for 200 ms after the obstruction/interface problem is corrected |
| 6 | Both saved records invalid or compile-time calibration invalid | Acknowledge to restore default settings; an invalid compiled curve requires corrected firmware |
| 7 | G and H both asserted for 100 ms after input debounce | Contradictory input combination removed |
| 8 | Out-of-range feedback for 250 ms after the first 1 s | Feedback returns to its valid electrical range; closing still must finish |
| 9 | Reserved; no temperature probe | Not generated |
| 10 | J held for 30 s, including startup | Release J |

These voltage/timing thresholds are bench defaults, not measured limits of the installed assembly. Firmware cannot detect blocked nozzles, actual GPM, a leaking closed valve, true actuator overcurrent, or a position sensor that falsely reports closed. HSD FAULT is an aggregate driver indication; per-lamp current diagnostics are not implemented.

Active causes blink white; cleared, still-latched codes blink blue. All latched codes appear together. Correct every active cause, release J, then hold it freshly for **3 s**. Fault lamps stay solid blue; a white sweep advances behind them across all ten positions. Active causes block reset; a new cause cancels an eligible hold. G/H can remain held or move without affecting acknowledgement or changing settings.

Successful acknowledgement immediately restores the normal OFF display. Water remains commanded closed; after closure and 100 ms with J released, a fresh tap works even with G/H still held. A tap does not bypass incomplete closure. Fault 5 will not clear merely because a timer expired: restore actual closed feedback after fixing the cause. If a stuck valve cannot close, shut off water and repair it; there is no automatic opening/reversal to clear a jam.

## Watchdog and bounded recovery

The ATmega4809 internal hardware watchdog has a nominal 2.048 s period. It is fed at the end of completed foreground iterations, not within serial or bus waits. Software I²C times out each transaction after 20 ms and attempts at most nine recovery clocks. Failed initialization is retried about once per second while OFF and fault-latched. The DAC closed command precedes display initialization; commands refresh every 500 ms.

Wombat frame counters are checked on both chips of each board to detect a peripheral reset/freeze even if it still acknowledges I²C. Reinitialization restores outputs and diagnostics. Physical retry timing, electrical bus behavior, core brownout configuration and reset under real loads require bench tests. The watchdog cannot fix dead hardware or guarantee valve closure. No reset output is assigned to a Wombat channel.

## Settings and logging

Default level is **4/10**, cap **100%**, water **OFF**. Only level, cap, latched fault mask, last saved reset flags and calibration signature are persisted. Normal settings wait two seconds before saving; fault changes request a save immediately. Two alternating 24-byte EEPROM records use a CRC and commit marker written last, one byte per loop. Old valid data survives interrupted writes. Both records invalid causes fault 6; completely erased factory EEPROM uses defaults without a corruption fault. EEPROM wear is finite; state changes are coalesced rather than written every loop.

ON, Flush and an unfinished cap edit are never restored. A sudden power cut may lose the latest pending save/fault. No design can promise that the last instant before total power loss is logged without additional energy/storage hardware.

A 16-event **RAM ring** records uptime plus active/latched fault masks. It is lost on reboot and is not a persistent chronological log. EEPROM retains the latest completed snapshot, not all events. At 115200 baud with newline ending, the read-only serial commands are:

| Command | Output |
| :--- | :--- |
| `status` | Version, current reset flags, mode, level, cap, target, ADC mV, three VIN estimates, fault masks and armed state |
| `log` | Up to 16 fault-state changes since boot; masks combine codes using bit 0 for code 1 through bit 9 for code 10 |
| `boards` | Six Wombat reported firmware strings |
| `help` | Command list |

There is no serial command to open water, bypass faults or change settings. Use the USB isolation procedure above; continuous logging with powered water hardware needs a separately qualified service connection.

## Calibration and bench commissioning

Edit [Config.h](RockSawWaterControl/Config.h) only after measurements. Positions use **basis points: 0–10000 = 0–100%**.

- Set `ADC_REFERENCE_MV` to measured Nano reference/5 V voltage. Measure the actual A0 voltages with the valve at closed and fully open, then update `FEEDBACK_CLOSED_MV` and `FEEDBACK_OPEN_MV`. Nominal values are 475 and 2376 mV. Verify adequate error margin and monotone feedback through the stroke.
- Without water calibration, the identity `OPENING_AT_FLOW` table means valve opening, not flow. For calibrated operation, bucket-test the actual nozzles/hose at representative pressure and construct the strictly increasing inverse table of openings for 0,10,…100% reference flow. Set `CALIBRATED_FLOW=true` to mark the changed calibration signature. Values and endpoint choices need measurement; no curve is invented by firmware. See [manual flow calibration](../docs/flow-calibration.md).
- Firmware requires curve endpoints 0 and 10000 and strictly increasing entries. A saturated flow curve with a long flat plateau needs a deliberate full-open endpoint and distinct intermediate positions; do not enter duplicate/nonmonotone values. Pressure changes still change actual flow.
- Changing the curve/signature invalidates older settings records deliberately; acknowledge fault 6 to restore defaults. Verify all ten cap/level positions with the new table.
- Confirm actual stroke speed before accepting 15 s travel and 4 s no-progress deadlines. Do not increase them to conceal a jam or incorrect feedback.

Start with the valve electrically disconnected and water isolated: verify 12/5 V rails, input polarity and main-power-OFF input behavior, individual lamp colors and the full lamp test. Test the DAC into the removable 250-ohm load; 4/12/20 mA corresponds to 1/3/5 V across that resistor. This firmware normally keeps a missing-feedback system closed/faulted: use the manufacturer's separate DAC example for the three isolated output measurements, then reflash this sketch. Do not bypass the controller's feedback fault just to drive an unverified valve.

Next qualify the command/feedback interface and valve without pressurized water. Then test actual nozzles and water, all modes, unplugged bus/feedback, held controls, power interruption and internal watchdog recovery. Use only current-limited or appropriately fused bench leads. A battery and multimeter support staged checks but do not prove fast timing or all fault transients. Keep modules replaceable and defer coating/potting until these measurements and hot-enclosure tests pass.

## Source and maintenance

The control core, storage, packets, lamp scheduler and bounded transport are portable C++ headers. The `.ino` file is the Nano hardware adapter. No dynamic allocation is used by project code; fixed-size event and serial buffers bound memory use. Arduino core code and hardware drivers remain external dependencies.

Packet layouts were checked against [Serial Wombat's official library](https://github.com/BroadwellConsultingInc/SerialWombatArdLib) (`PCB0046_HSD.h`, digital I/O, analog input, public data and frame counters) and [DFRobot GP8XXX](https://github.com/DFRobot/DFRobot_GP8XXX). These sources establish protocol intent, not confirmation that an untested assembly behaves correctly. The browser remains an interface simulator with some deliberately broader fault scenarios; it is not the executing firmware.
