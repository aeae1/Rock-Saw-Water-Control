# Revision F Electrical Design

Updated 7 October 2026. This revision replaces the relay-based Revision E circuit with a serviceable DIY design. It retains the Arduino Nano Every, three Serial Wombat PCB0046 HSD V2 boards, proportional valve, command and feedback modules, and local supply capacitors. There is no relay, relay regulator, permanent flow meter, or external temperature sensor.

## Status and scope

This is a documented bench prototype, not physically tested hardware. No flashable firmware is included. The schematic, connection register and automated checks establish documented connections; they do not establish actual valve behavior, thermal performance or software recovery. Use the same component revisions and check the following before machine installation.

| Check | Required evidence |
| :--- | :--- |
| H1 - Machine harness | Identify actual supply, return and G/H/J cavities. X1.1-5 are project terminal names, not Takeuchi connector cavity numbers. Measure key-off behavior. |
| H2 - Supply and wiring | Existing fuse rating must suit the added wiring. Confirm conductor sizes, voltage under load and shared return connections. No new machine fuse block is specified. |
| H3 - Purchased parts | Confirm Nano Every, HSD V2, input-board revision, lamp polarity/current and transistor package. |
| H4 - Valve interface | Confirm five-wire actuator, signal-common compatibility, command compliance, reported-position behavior and startup/shutdown/USB sequencing. |
| H5 - Firmware and bench | Implement and test internal/external watchdogs, closed startup, faults, settings storage, buttons, current/voltage measurements where fitted, enclosure temperature and water operation. |

## Changes from Revision E

- Remove K1 (signal relay), U4 (dedicated coil regulator), D4 (coil diode), and C4/C5 (coil regulator capacitors).
- Connect valve RED directly to the same machine supply as Nano VIN and HSD VIN. GREEN connects directly to U2 OUT. YELLOW connects directly to U3 I+.
- Retain both watchdog capabilities without an additional board. HSD3 CH4 now drives a small transistor that resets the Nano; it no longer powers the valve.
- Add Q1 (onsemi 2N3904BU), R11 (4.7 kohm, 5%, 0.25 W) and R12 (1 kohm, 1%, 0.5 W). R12 shares the input-resistor purchase type.
- All five machine connections, +12 V / 0 V / G / H / J, enter together from the left of the continuous single-page drawing.
- Preserve surviving wire IDs. W086, W095 and W097 change endpoints intentionally. W127-W132 are new reset connections. Removed wire IDs are not reused.

## Component roles

| Reference | Component | Function |
| :--- | :--- | :--- |
| U1 | Genuine Arduino Nano Every ABX00028 | Main controller, onboard 5 V regulator and internal hardware watchdog |
| U2 | DFRobot DFR1229 / GP8600 | Converts digital commands to valve control current |
| U3 | DFRobot SEN0262 | Converts reported valve position current to voltage for A0 |
| HSD1-3 | Serial Wombat PCB0046 HSD V2 | Twenty lamp outputs; HSD3 CH4 is a host-reset output |
| O1/O2 | SparkFun BOB-09118 v1.2 | Three 12 V input channels converted to active-high 5 V logic |
| V1 | U.S. Solid USS-MSV50030 | 1/2-inch stainless five-wire proportional valve |
| L1-10 | Nilight TL-248BW or verified equivalent | Common negative, separate BLUE and WHITE positive inputs |
| Q1 | onsemi 2N3904BU TO-92 | Open-collector pull-down on Nano RESET |

## Power and local wiring

The reused machine connector supplies MACHINE_12V and 0V. TB12 feeds U1 VIN, HSD1/2/3 VIN and V1 RED in parallel. TB0 collects lamp, actuator and electronic returns. Keep load current out of Nano headers and signal-ground wiring. HSD logic G, load grounds and channel-return terminals are internally common.

The Nano onboard switching regulator supplies TB5 and the logic rails of U2, U3, all three HSDs, and O1/O2 HV. HV on the SparkFun input board means its logic-side voltage: use 5 V, not 12 V. Do not add a second 5 V source. Verify total load and regulator temperature in the enclosure.

Retain one 47 uF / 35 V / 105 C electrolytic and one 100 nF / 50 V X7R ceramic across each HSD VIN and LOAD_GND: C7/C10, C8/C11, C9/C12. Electrolytic positive goes to VIN. Place close to each board with short leads. These are local supply buffers, not comprehensive surge protection.

The 9-16 V envelope used in calculations is a proposed bench range, not a fully qualified supply range. V1 requires at least 9 V at its leads. Existing upstream fuse protection and wiring must be checked together.

## G/H/J inputs and main-power-off behavior

X1.3 is G, X1.4 is H and X1.5 is J in this project only. Each enters a 1 kohm / 0.5 W series resistor (R1-R3), followed by a BOB-09118 input and reverse diode (D1-D3). Diode cathode/band faces the board input; anode connects to its INPUT_GND. O1 OUT1/OUT2 connect to Nano D2/D3; O2 OUT1 connects to D4. O2 IN2 is grounded and OUT2 is unused.

The selected board includes 220 ohms in its input LED path. At 12 V, estimated asserted-input draw is (12 - 1.2) / 1220 = 8.9 mA. About 0.21 Ah is consumed by one continuously asserted input over 24 hours. A brief button press uses very little charge; the machine's own circuit consumption is additional.

With main supply absent, ground retained and USB unplugged, G/H/J energize only the optocoupler input side. Its output pull-ups use controller 5 V, so the specified circuit has no conductive positive-input path into the logic supply. Confirm this with off-state rail measurements. Shared grounds mean this is not complete galvanic isolation of the assembly.

At power-up, request closed, run the one-second-white / one-second-blue lamp test without accepting gestures, then require released J and centered G/H for 100 ms. Discard inputs held through startup. After fault acknowledgement, held G/H must not prevent recovery; consume the old rocker action and require a fresh J press.

## Valve command and feedback

| Valve lead | Revision F connection |
| :--- | :--- |
| RED | TB12 MACHINE_12V directly |
| BLACK | TB0 power return |
| GREEN | U2 OUT directly |
| WHITE | TB0 signal common, U2 OUT_GND and U3 I-; verify common compatibility |
| YELLOW | U3 I+ directly |

Initialize U2 to its 0-20 mA range, then command 4 mA for closed. The module is not intrinsically restricted to 4-20 mA: code zero produces 0 mA, which the valve manual does not define as closed. Nominal 16-bit codes are 13107 (closed), 39321 (50% travel), and 65535 (full travel). These are valve-position percentages, not calibrated flow percentages.

U2 contains a boosted output stage; never connect OUT to an Arduino input. Test it first with a separate removable 250-ohm precision load, then the actual valve. Its required input burden voltage and loss-of-signal behavior require measurement; matching the words 4-20 mA is not enough to establish the complete interface.

U3 uses a nominal 120-ohm conversion: 4-20 mA gives 0.48-2.40 V. SIGNAL connects through R4 = 1 kohm to A0. R5 = 100 kohm and C1 = 100 nF go from A0 to local Nano ground. The resistor divider gives a nominal 100/101 attenuation: approximately 0.475-2.376 V at A0. Calibrate with the measured 5 V reference. No additional parallel shunt is installed. This input is not galvanically isolated and its resistor/filter does not make it 12 V tolerant.

Valve-reported position is not measured flow or proof that water has stopped. Bucket/stopwatch calibration through the actual nozzles can provide a monotone position/flow table. No automatic meter sweep or live GPM is provided.

### Shared-power and USB limitation

Removing the relay removes physical isolation of the signal positives. Shared machine power avoids intentionally leaving the command module energized while switching off the valve alone. It does not prove harmless behavior during brownouts, unplugged valve power, or unequal rail decay. Measure these states during H4.

USB can independently energize the Nano 5 V rail and U2/U3. Before USB-only programming or testing, unplug the machine connector and disconnect the valve cable; isolate the water. Do not connect USB with the unpowered valve's signal leads still attached. No transistor in the new reset circuit isolates the command or feedback loops.

## Two watchdogs, no extra board

The Nano ATmega4809 internal hardware watchdog is the first recovery mechanism; approximately 1.024 seconds is the proposed timeout. Feed it only after useful, bounded control-loop progress. A handled fault may be a valid control-loop outcome; do not intentionally reboot continuously just because an acknowledged hardware fault remains. Bound I2C operations and logging.

The existing SW8B at HSD3 address 0x64 provides the second watchdog. CH4 is LOW normally and HIGH on timeout. CH4 connects through R11 = 4.7 kohm to Q1 base (pin 2). R12 = 1 kohm connects base to emitter (pin 1 / ground). Collector (pin 3) connects only to Nano RESET. The Nano already has a reset pull-up and capacitor; no external pull-up is added. Never connect CH4's 12 V output directly to RESET.

Use exact onsemi 2N3904BU pin numbering: 1 emitter, 2 base, 3 collector. Verify the manufacturer package view; do not infer pins from an unmarked transistor's shape. Q1 pulls RESET low without sourcing voltage into it. R12 prevents a floating base and shunts small HSD off-state leakage. At 16 V the 4.7 kohm resistor dissipates about 0.05 W while asserted, within its 0.25 W rating; only a short pulse is intended. Verify off-state leakage and reset voltage on the assembled boards.

Proposed external timing: 2000 ms timeout, check-in every 100 ms, HIGH pulse 100 ms, then return LOW. This is one recovery pulse per arm, not a permanently asserted reset. Reconfigure the watchdog after restart. The currently reviewed firmware decrements its return counter and does not restore that delay merely by refreshing the main countdown: reinitialization is required after a timeout. Confirm behavior in the installed SW8B firmware image.

Use checked protocol writes for both configuration packets: configure channel mode 7 with normal LOW, timeout HIGH and no Wombat self-reset; then explicitly set the return interval to 100 ms. Do not use the library's default false/self-reset setting without overriding its 0xFFFF permanent timeout state: that would hold the Nano in reset. Do not use the unfinished all-pins timeout bitfield. Verify packet failures, incomplete initialization and late check-ins on hardware. The initial default 10 ms interval must also release reset if the second packet fails.

Read the Nano reset cause before clearing it. Internal watchdog reset and external reset should both lead to a closed command and no restored ON/Flush state. An external reset flag alone does not distinguish Q1 from the physical reset button. Send the closed command before nonessential initialization and animations. Lamps and DAC may retain previous outputs until explicitly reinitialized; an MCU reset does not power-cycle them.

HSD3 CH4 must never appear in lamp PWM writes, sweeps or bulk board initialization during operation. Initialize all outputs inactive before assigning the watchdog. Leave CH5-CH7 off. The reset circuit is only a few milliamps; qualify or disable open-load diagnostics for CH4 so its intentionally small load does not cause a false lamp/driver fault. The circuit recovers a host, not a guaranteed shutoff: a jam, dead controller, stuck bus or failed DAC can defeat closure. A watchdog cannot make this valve spring-return on power loss.

## Faults and detection limits

Revision F has no independently switchable actuator supply and no actuator-current sensor. Do not claim to detect actuator overcurrent with a lamp-driver board whose outputs no longer supply that actuator. Code 2 has no fitted hardware detector; code 9 remains reserved because there are no external temperature probes. Wombat current and thermal diagnostics apply to its lamp/reset outputs only.

Hardware firmware must use best-effort closed commands when a fault occurs and the command path remains usable, then check reported position within a bounded deadline. If the command or feedback path is broken, report closure as unknown. Do not claim that an inhibit flag stopped the valve motor or water: there is no independent power cut. A persistent jam or uncertain closure requires the upstream manual water shutoff and repair. Fault acknowledgement must not automatically restore water ON or Flush.

The existing browser simulator retains its tested gesture and fault-display scenarios, including simulated faults without fitted detectors. Its movement-inhibit model is not a validated physical response for this relay-free design. Update that hardware-specific model with the eventual firmware; the simulator is not Arduino firmware or evidence of valve shutdown. Keep this limitation visible rather than silently claiming identical fault coverage.

## Logging, enclosure and service

Plan a bounded RAM history and redundant EEPROM settings/last-reset records. No logging firmware is supplied. Do not repeatedly write EEPROM while a button is held or a fault persists. Validate records after interrupted power and reject invalid values. Never store an ON state for automatic recovery.

Prefer a gasketed enclosure, sealed glands, supported wiring and removable modules. Conformal coating can protect clean boards while leaving connectors/service points accessible. The Wombat MOSFET outputs reduce load-switching dissipation compared with Darlington drivers; whole-board temperature still needs checking. Do not claim a potting rating for these assembled boards. Permanent resin conflicts with inexpensive replacement. No additional circuit board is required for Q1/R11/R12; mount them on the existing assembly carrier.

## Practical bench sequence

1. Inspect every wire and polarity with power absent. Confirm no 12 V connection to 5 V, A0, RESET or G/H/J logic pins. Check transistor pinout and capacitor polarity.
2. Power the Nano and logic modules with valve disconnected. Measure the 5 V rail and module load. Check USB-only service separation.
3. Exercise all three machine inputs, including asserted inputs with main supply off, then power restoration while held.
4. Test one lamp color, then the complete white/blue startup test and animations. Check current, temperature, return wiring and that CH4 is excluded from lamp writes.
5. Test Q1 separately: verify CH4 LOW releases RESET and HIGH asserts it, then a brief pulse releases it. Confirm neither position powers RESET from 12 V. Test one-shot timeout and both watchdog resets with no valve or water connected.
6. Test U2 on the removable load and U3 with known currents. Then verify actual valve wiring, common returns, command range and reported position without pressurized water.
7. Test shared-power sequencing, broken power/signal connections and bounded communication failures. Confirm boot always commands closed; identify any condition requiring manual water shutoff.
8. Run water through the actual nozzles. Verify settings, Max Cap and Flush behavior, calibration, manual shutoff, enclosure heat and recovery after interruptions. Record actual evidence in Validation.

## Source register

Reviewed 7 October 2026. Source inspection is not physical qualification.

| Source | Used for |
| :--- | :--- |
| [Arduino Nano Every schematic](https://docs.arduino.cc/resources/schematics/ABX00028-schematics.pdf) | VIN regulator, shared RESET headers, reset pull-up/capacitor, USB power |
| [ATmega4808/4809 datasheet](https://ww1.microchip.com/downloads/en/DeviceDoc/ATmega4808-09-DataSheet-DS40002173B.pdf) | Internal watchdog, reset flags and timing |
| [Serial Wombat PCB0046](https://www.serialwombat.com/p46) | Channels, addresses and diagnostic limits |
| [Watchdog API](https://broadwellconsultinginc.github.io/SerialWombatArdLib/class_serial_wombat_watchdog.html) | Host reset use and timeout configuration |
| [Watchdog firmware source](https://github.com/BroadwellConsultingInc/SerialWombat/blob/main/SerialWombatPinModes/watchdog.c) | Return-delay behavior; verify actual SW8B image |
| [onsemi 2N3904 datasheet](https://www.onsemi.com/pdf/datasheet/2n3904-d.pdf) | Q1 pin numbering and electrical limits |
| [TI TPS4H160-Q1](https://www.ti.com/lit/ds/symlink/tps4h160-q1.pdf) | HSD output leakage, protected MOSFET switching |
| [SparkFun input schematic](https://cdn.sparkfun.com/assets/d/e/4/5/e/Optoisolator-v12.pdf) | Input resistor/LED/inverter topology |
| [U.S. Solid valve manual](https://file.ussolid.com/content/JFMSV/Manual-5003X.pdf) | Five-wire connections and 4-20 mA position command |
| [DFRobot DFR1229](https://wiki.dfrobot.com/dfr1229/) | Current command configuration |
| [DFRobot SEN0262](https://wiki.dfrobot.com/sen0262/) | Position-current conversion |
