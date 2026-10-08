# Revision G Electrical Design

Updated 8 October 2026. This revision removes the external host-reset circuit from Revision F. It retains the Arduino Nano Every, three Serial Wombat PCB0046 HSD V2 boards, proportional valve, command and feedback modules, and local supply capacitors. There is no relay, relay regulator, permanent flow meter, or external temperature sensor.

## Status and scope

This is a documented bench prototype, not physically tested hardware. Flashable Nano Every firmware v1 is included and compiled; physical hardware remains unqualified. See [firmware instructions](../firmware/README.md). The schematic, connection register and automated checks establish documented connections; they do not establish actual valve behavior, thermal performance or software recovery. Use the same component revisions and check the following before machine installation.

| Check | Required evidence |
| :--- | :--- |
| H1 - Machine harness | Identify actual supply, return and G/H/J cavities. The five IN wire names are not Takeuchi connector cavity numbers. Measure key-off behavior. |
| H2 - Supply and wiring | Existing fuse rating must suit the added wiring. Confirm conductor sizes, voltage under load and shared return connections. No new machine fuse block is specified. |
| H3 - Purchased parts | Confirm Nano Every, HSD V2, input-board revision, lamp polarity/current. |
| H4 - Valve interface | Confirm five-wire actuator, signal-common compatibility, command compliance, reported-position behavior and startup/shutdown/USB sequencing. |
| H5 - Firmware and bench | Bench-test the implemented internal watchdog, closed startup, faults, settings storage, buttons, current/voltage measurements where fitted, enclosure temperature and water operation. |

## Changes from Revision F

- Remove Q1, R11 and R12 and their six external reset connections. Nano RESET headers remain unconnected.
- Keep the ATmega4809 internal watchdog. HSD3 CH4-CH7 stay off and unconnected. No extra watchdog board is added.
- Show five individual incoming wires from the left: 12 V, 0 V, J, H, G. IN denotes this drawing boundary; the reused connector is not drawn as a harness block.
- Preserve all 102 remaining wire IDs and all retained circuit values. The drawing has 38 references, including the incoming-wire boundary, and 37 physical component/module references.
- Supply real v1 source, native automated tests and a Nano Every compile workflow. This is a bench release, not proof of field reliability.

## Component roles

| Reference | Component | Function |
| :--- | :--- | :--- |
| U1 | Genuine Arduino Nano Every ABX00028 | Main controller, onboard 5 V regulator and internal hardware watchdog |
| U2 | DFRobot DFR1229 / GP8600 | Converts digital commands to valve control current |
| U3 | DFRobot SEN0262 | Converts reported valve position current to voltage for A0 |
| HSD1-3 | Serial Wombat PCB0046 HSD V2 | Twenty lamp outputs; HSD3 CH4-CH7 unused/off |
| O1/O2 | SparkFun BOB-09118 v1.2 | Three 12 V input channels converted to active-high 5 V logic |
| V1 | U.S. Solid USS-MSV50030 | 1/2-inch stainless five-wire proportional valve |
| L1-10 | Nilight TL-248BW or verified equivalent | Common negative, separate BLUE and WHITE positive inputs |

## Power and local wiring

The reused machine connector supplies MACHINE_12V and 0V. TB12 feeds U1 VIN, HSD1/2/3 VIN and V1 RED in parallel. TB0 collects lamp, actuator and electronic returns. Keep load current out of Nano headers and signal-ground wiring. HSD logic G, load grounds and channel-return terminals are internally common.

The Nano onboard switching regulator supplies TB5 and the logic rails of U2, U3, all three HSDs, and O1/O2 HV. HV on the SparkFun input board means its logic-side voltage: use 5 V, not 12 V. Do not add a second 5 V source. Verify total load and regulator temperature in the enclosure.

Retain one 47 uF / 35 V / 105 C electrolytic and one 100 nF / 50 V X7R ceramic across each HSD VIN and LOAD_GND: C7/C10, C8/C11, C9/C12. Electrolytic positive goes to VIN. Place close to each board with short leads. These are local supply buffers, not comprehensive surge protection.

The 9-16 V envelope used in calculations is a proposed bench range, not a fully qualified supply range. V1 requires at least 9 V at its leads. Existing upstream fuse protection and wiring must be checked together.

## G/H/J inputs and main-power-off behavior

IN.G, IN.H and IN.J identify the three incoming control wires. Each enters a 1 kohm / 0.5 W series resistor (R1-R3), followed by a BOB-09118 input and reverse diode (D1-D3). Diode cathode/band faces the board input; anode connects to its INPUT_GND. O1 OUT1/OUT2 connect to Nano D2/D3; O2 OUT1 connects to D4. O2 IN2 is grounded and OUT2 is unused.

The selected board includes 220 ohms in its input LED path. At 12 V, estimated asserted-input draw is (12 - 1.2) / 1220 = 8.9 mA. About 0.21 Ah is consumed by one continuously asserted input over 24 hours. A brief button press uses very little charge; the machine's own circuit consumption is additional.

With main supply absent, ground retained and USB unplugged, G/H/J energize only the optocoupler input side. Its output pull-ups use controller 5 V, so the specified circuit has no conductive positive-input path into the logic supply. Confirm this with off-state rail measurements. Shared grounds mean this is not complete galvanic isolation of the assembly.

At power-up, request closed, run the one-second-white / one-second-blue lamp test without accepting gestures, then require released J and centered G/H for 100 ms. Discard inputs held through startup. After fault acknowledgement, held G/H must not prevent recovery; consume the old rocker action and require a fresh J press.

## Valve command and feedback

| Valve lead | Revision G connection |
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

USB can independently energize the Nano 5 V rail and U2/U3. Before USB-only programming or testing, unplug the machine connector and disconnect the valve cable; isolate the water. Do not connect USB with the unpowered valve's signal leads still attached. There is no signal-disconnect circuit.

## Internal watchdog only

Firmware v1 enables the Nano ATmega4809 internal hardware watchdog at a nominal 2.048 seconds. It is fed only after a bounded foreground loop completes. Software I2C transactions are limited to 20 ms each; serial output is sent in short nonblocking pieces. A handled fault remains a valid loop outcome and does not deliberately create a reboot loop.

A watchdog restart records the reset cause, requests 4 mA CLOSED before board initialization, and never restores ON or Flush. DAC and Wombat outputs can retain their previous state during a Nano reset; initialization explicitly reconfigures them. The internal watchdog cannot reset a failed peripheral. Firmware retries bounded bus recovery and board initialization while retaining the fault latch. If recovery fails, manually shut off water and power-cycle the shared supply.

Nano RESET headers and HSD3 CH4-CH7 have no external connections. All four spare outputs are initialized off; only CH0-CH3 of HSD3 appear in lamp writes. No Wombat host-reset mode is configured. The internal watchdog, brownout behavior and actual peripheral recovery still require H5 tests. A reset or power removal is not a guaranteed valve closure.

## Faults and detection limits

Revision G has no independently switchable actuator supply and no actuator-current sensor. Do not claim to detect actuator overcurrent with a lamp-driver board whose outputs no longer supply that actuator. Code 2 has no fitted hardware detector; code 9 remains reserved because there are no external temperature probes. Wombat current and thermal diagnostics apply to its lamp outputs only.

Hardware firmware must use best-effort closed commands when a fault occurs and the command path remains usable, then check reported position within a bounded deadline. If the command or feedback path is broken, report closure as unknown. Do not claim that an inhibit flag stopped the valve motor or water: there is no independent power cut. A persistent jam or uncertain closure requires the upstream manual water shutoff and repair. Fault acknowledgement must not automatically restore water ON or Flush.

The existing browser simulator retains its tested gesture and fault-display scenarios, including simulated faults without fitted detectors. Its movement-inhibit model is not a validated physical response for this relay-free design. The physical v1 response is documented separately; the simulator is not Arduino firmware or evidence of valve shutdown. Keep this limitation visible rather than silently claiming identical fault coverage.

## Logging, enclosure and service

Firmware v1 keeps a 16-event RAM ring and two CRC-checked, alternating 24-byte EEPROM records containing settings, latched fault mask and reset flags. The commit marker is written last; native tests interrupt every write boundary. Normal setting saves wait two seconds; fault changes request an immediate transaction, which still needs multiple loop passes. Sudden power loss can lose the latest event. Serial `status`, `log` and `boards` commands are read-only. RAM history is lost on power removal; this is not a permanent event recorder. ON and Flush are never stored.

Prefer a gasketed enclosure, sealed glands, supported wiring and removable modules. Conformal coating can protect clean boards while leaving connectors/service points accessible. The Wombat MOSFET outputs reduce load-switching dissipation compared with Darlington drivers; whole-board temperature still needs checking. Do not claim a potting rating for these assembled boards. Permanent resin conflicts with inexpensive replacement.

## Practical bench sequence

1. Inspect every wire and polarity with power absent. Confirm no 12 V connection to 5 V, A0, RESET or G/H/J logic pins. Check capacitor polarity.
2. Power the Nano and logic modules with valve disconnected. Measure the 5 V rail and module load. Check USB-only service separation.
3. Exercise all three machine inputs, including asserted inputs with main supply off, then power restoration while held.
4. Test one lamp color, then the complete white/blue startup test and animations. Check current, temperature, return wiring and that HSD3 CH4-CH7 remain off.
5. Test internal watchdog recovery with valve/water disconnected; confirm boot requests closed, restores neither ON nor Flush, and reports watchdog reset. Interrupt the bus and power-cycle a Wombat; confirm bounded retries and retained fault indication.
6. Test U2 on the removable load and U3 with known currents. Then verify actual valve wiring, common returns, command range and reported position without pressurized water.
7. Test shared-power sequencing, broken power/signal connections and bounded communication failures. Confirm boot always commands closed; identify any condition requiring manual water shutoff.
8. Run water through the actual nozzles. Verify settings, Max Cap and Flush behavior, calibration, manual shutoff, enclosure heat and recovery after interruptions. Record actual evidence in Validation.

## Source register

Reviewed 8 October 2026. Source inspection is not physical qualification.

| Source | Used for |
| :--- | :--- |
| [Arduino Nano Every schematic](https://docs.arduino.cc/resources/schematics/ABX00028-schematics.pdf) | VIN regulator, shared RESET headers, reset pull-up/capacitor, USB power |
| [ATmega4808/4809 datasheet](https://ww1.microchip.com/downloads/en/DeviceDoc/ATmega4808-09-DataSheet-DS40002173B.pdf) | Internal watchdog, reset flags and timing |
| [Serial Wombat PCB0046](https://www.serialwombat.com/p46) | Channels, addresses and diagnostic limits |
| [TI TPS4H160-Q1](https://www.ti.com/lit/ds/symlink/tps4h160-q1.pdf) | HSD output leakage, protected MOSFET switching |
| [SparkFun input schematic](https://cdn.sparkfun.com/assets/d/e/4/5/e/Optoisolator-v12.pdf) | Input resistor/LED/inverter topology |
| [U.S. Solid valve manual](https://file.ussolid.com/content/JFMSV/Manual-5003X.pdf) | Five-wire connections and 4-20 mA position command |
| [DFRobot DFR1229](https://wiki.dfrobot.com/dfr1229/) | Current command configuration |
| [DFRobot SEN0262](https://wiki.dfrobot.com/sen0262/) | Position-current conversion |
