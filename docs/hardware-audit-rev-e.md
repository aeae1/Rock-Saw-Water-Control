# Electrical audit and revised schematic

Revision E · 7 October 2026 · **Engineering review complete; hardware release on hold**

[Printable schematic and audit](assets/hardware/water-controller-audit-rev-e.pdf) · [Connection schedule](../hardware/rev-e/connections.csv) · [Machine-readable netlist](../hardware/rev-e/netlist.json) · [Parts schedule](../hardware/rev-e/bom.csv)

This revision supersedes earlier conceptual wiring illustrations for construction purposes. It describes the selected Nano Every, proportional valve and twenty lamp outputs, with no permanent flow meter. It includes a proposed independent valve-power watchdog and signal-disconnect relay. It is a complete connection specification for a **controlled bench prototype**, not permission to connect an unverified harness to a machine. There is no flashable controller firmware in this repository.

The drawings use functional terminal labels. A repeated net name is an electrical connection, even when the wire continues on another sheet. A crossing without a dot is not a junction. Component boxes are not physical footprints. Connector viewing direction and actual board markings take precedence over the apparent position of terminals in a functional drawing.

## Release decision

The earlier drawing should not be used as a soldering guide. The following physical evidence is still required; software simulation cannot supply it.

| Hold point | Evidence required before machine connection |
| :--- | :--- |
| H1 - Machine harness | Connector face and wire-side photographs; cavity identification; measured supply, ground, and G/H/J states, including ignition off and engine running. The manual's ACC label does not prove a constant battery connection. |
| H2 - Existing fuse and wiring | Actual fuse rating, supply/return wire sizes, cable lengths, total attachment load, and coordination with every downstream conductor. A machine fuse does not automatically protect smaller added wires. No extra fuse block is drawn, as requested. If the existing protection is unsuitable, this arrangement cannot be released unchanged. |
| H3 - Actual purchased boards | Part numbers, revisions and photographs matching this schedule; exact lamp wire functions/current; HSD boot behavior and watchdog-mode availability on the installed SW8B image. A visually similar module is not an interchangeable part. |
| H4 - Valve electrical interface | Manufacturer confirmation or controlled measurements establishing shared black/white return compatibility, command input burden/compliance, feedback operation into 120 ohms, startup and signal-loss behavior, and motor inrush/running current. |
| H5 - Firmware and bench qualification | Checked bus driver, watchdog/inhibit tests, closure feedback, calibrated ADC/current readings, fault handling, power-interruption storage tests, input tests, enclosure thermal test and actual water tests. None is established by browser tests. |

Do not bridge an uncertain valve signal return, guess a machine cavity, or apply machine power simply because the diagram looks complete. Verified passive/interface subassemblies can be assembled and continuity-tested separately. First powered tests use a current-limited bench supply with the valve and water isolated.

## Corrections made

1. Replaced the unspecified four-channel input board with two documented SparkFun BOB-09118 two-channel boards, each operated with a **5 V output-side supply**. Each used input receives its own external 1 kohm series resistor; the board's original 220-ohm input resistor alone is inappropriate for a raw 12 V signal.
2. Separated the HSD boards' 12 V load terminals from their 5 V logic terminals. Documented the reversed orientation of their two supply connectors and the reversal between schematic OUT1..OUT8 names and printed channel 7..0 labels.
3. Specified one effective I2C pull-up pair: the DFR1229's onboard 4.7 kohm resistors. All six HSD pull-up jumpers remain open. The I2C bus runs at 100 kHz inside the enclosure.
4. Retained twenty independently switched lamp-positive leads. One PCA9685 cannot directly drive these twenty 12 V loads. Lamp negatives share the wired supply return.
5. Added a series resistor, filter capacitor and open-wire bias to the position ADC input. SEN0262 is an analog receiver, not an I2C peripheral; no parallel 250-ohm resistor is added to its input.
6. Explicitly showed that the DFR1229 output return and its logic ground are internally common. The selected non-isolated architecture therefore joins valve white and black at the system return, subject to H4.
7. Added a proposed valve inhibit branch on HSD3 channel 4, supervised by a local SW8B watchdog. A small relay disconnects both signal positives when actuator power is removed. The new relay regulator is separate from the Nano's 5 V rail.
8. Revision D removed external temperature sensing; Revision E retains that change. TS1, TS2, R10, C3 and C6 are omitted; D7 is unused. Built-in driver protection remains. Fault 9 is reserved.
9. Revision E removes FM1, R6, R7, R8, R9 and C2 for cost and plumbing simplicity. D8 and D9 are unused. Surviving wire IDs, valve feedback, lamp outputs, operator inputs and watchdog connections are unchanged from Revision D.
10. Identified a command-driver error-reporting defect: the reviewed DFRobot library discards ordinary I2C write status. A checked driver is a release requirement.

## Exact design basis

| Reference | Part / specification | Role |
| :--- | :--- | :--- |
| U1 | Genuine Arduino Nano Every ABX00028 | 5 V controller; machine supply to VIN only |
| HSD1-3 | Serial Wombat PCB0046 HSD, public V2 | Twenty lamp channels; one supervised valve-power channel |
| U2 | DFRobot DFR1229 / GP8600 | 0-20 mA capable DAC, operated only in the 4-20 mA valve range |
| U3 | DFRobot SEN0262 | 0-25 mA to 0-3 V feedback receiver |
| O1, O2 | SparkFun BOB-09118, v1.2 circuit | Two channels each; three used |
| V1 | U.S. Solid USS-MSV50030 | 1/2-inch SS304, 9-24 V, five-wire proportional ball valve |
| L1-10 | Nilight TL-248BW or electrically verified equivalent | Common black negative, separate blue and white 12 V positive leads |
| K1 | Panasonic TQ2-5V, single-side-stable, standard through-hole | DPDT signal disconnect; not a latching or MBB variant |
| U4 | ST L7805ABV, TO-220 | Dedicated relay-coil 5 V regulator; not connected to logic 5 V |

The proportional actuator already includes its motor, gearbox and controller. Its only electrical connections are the five wires leaving the actuator housing. Neither the valve body nor either hose receives an electrical wire.

## Power and grounding

The reused connector supplies `MACHINE_12V` and `0V`. The input-interface calculations use a **9-16 V test envelope**, pending H1/H4; it is not a released whole-system operating range or a qualified vehicle transient range. U1 VIN and all three HSD load VIN terminals connect to this supply in parallel. The actuator must receive at least 9 V at its own red/black leads under load. A 9 V connector supply cannot guarantee that after HSD and cable voltage drops; the eventual low-voltage cutoff must include measured drop and margin. Load wiring returns to the distribution point, not through a Nano header or thin logic-ground wire. Do not use the chassis as the sole return.

The Nano Every uses an MPM3610 switching regulator. Its 5 V header supplies U2, U3, the three HSD logic VDD terminals, O1/O2 HV terminals. No lamp or actuator is powered from this rail. Measure total peripheral current and regulator temperature; the IC's headline current capability is not proof of the assembled board's enclosed capacity.

At each HSD load input, add one local 47 uF, 35 V, 105 C electrolytic capacitor in parallel with a 100 nF, 50 V X7R capacitor. C7/C10 serve HSD1, C8/C11 HSD2, and C9/C12 HSD3. Electrolytic positive goes to VIN and negative to LOAD_GND. These provide local bypassing; they do not make the assembly a qualified automotive transient-protection circuit.

Each HSD already joins its load GND and logic GND internally. Use its rated load-ground connection to the main return. The duplicate D/C/V/G header's G pad need not have a second thin return wire; do not route lamp return current through it. The netlist records this internal common explicitly. Other module grounds and valve white use short dedicated returns to the distribution point, separate from the actuator-black and lamp-current paths until that point.

U4 powers only the relay coil. Its input comes from `VALVE_12V`, not constant supply. TO-220, text facing the observer and leads downward: pin 1 IN, pin 2 GND, pin 3 OUT; metal tab is GND. Place C4 = 330 nF between IN/GND and C5 = 100 nF between OUT/GND near its leads. The external parts schedule uses 50 V X7R capacitors. D4, a 1N4148 across the relay coil, has its **band/cathode toward coil positive**.

The official Nano V4.0 schematic shows USB VBUS feeding the 5 V rail through a Schottky diode. USB can therefore energize the DAC and peripherals with machine power absent. Service with the machine connector unplugged, the valve disconnected, and the water isolated. Do not assume unplugging the 12 V lead makes the electronics electrically dead while USB is attached. Do not connect a second regulated 5 V supply to the rail.

Constant supply also means constant parked draw. Normal water OFF does not disconnect controller power. Whether a key cycle actually causes a reboot depends on H1. If the supply truly remains live, isolate the controller using an appropriate existing disconnect when stored; a new master-switch design is not hidden in this schematic.

Final wire gauges, connector current ratings, distribution hardware and enclosure size are deliberately not guessed before H2 and actual dimensions. Use locking, polarized connectors and strain relief; do not use loose breadboard/Dupont jumpers on the attachment. Labels X1.1..X1.5 are **new internal harness terminal names**, not machine connector cavity numbers.

## G/H/J input circuit

For each signal, the machine line passes through R1/R2/R3 = **1 kohm, 1%, 0.5 W** before the selected opto-board IN terminal. D1/D2/D3 is a 1N4148 from input return to that IN terminal: anode at return, band/cathode at IN. It limits reverse voltage across the optocoupler LED. Both input return and output-side HV-GND ultimately connect to system 0V; this design uses optocouplers for signal translation and buffering, not whole-system galvanic isolation.

O1 IN1 = G, O1 IN2 = H, O2 IN1 = J. O2 IN2 is tied to input return; O2 OUT2 is unused. On both boards **HV means the output-side supply and connects to regulated 5 V here**. It must not connect to 12 V. O1 OUT1/OUT2 go to D2/D3; O2 OUT1 goes to D4. Machine input HIGH produces Arduino input HIGH because the board contains two inversions. Configure these as inputs; do not enable a contradictory pull-up scheme.

The published Eagle schematic has input connector JP2: 1 unused, 2 IN1, 3 IN2, 4 GND. Output connector JP1: 1 HV-GND, 2 OUT2, 3 HV, 4 OUT1. Use the board's printed functions; this numbering is not an instruction to count left to right from an arbitrary photograph.

Including the onboard 220-ohm resistor, nominal input current is approximately 6-12 mA over 9-16 V. At 16 V, low LED forward voltage and resistor tolerances, the external resistor dissipates about 0.16 W. A 0.5 W part provides margin. Verify logic thresholds, inactive leakage and temperature on the actual machine output. These opto boards do not distinguish an open input wire from an unpressed switch.

### Live control signals with main power off

The owner raised this hypothetical power sequence: main supply OFF, but G/H/J can still receive battery voltage. With the specified resistor/opto circuits, ground retained and USB disconnected, an asserted signal powers only its optocoupler input LED. There is no conductive positive-supply path from IN to HV/OUT; HV and the output pull-ups use the controller's own regulated 5 V. The schematic therefore predicts no damaging input backfeed or Arduino boot in this case. This conclusion applies to the documented circuit, not arbitrary substitute modules, and still requires the H5 bench test.

At 12 V, one active input draws approximately `(12 - 1.2) / (1000 + 220) = 8.9 mA`: about 0.21 Ah per day if continuously asserted. Two active inputs draw about 18 mA; all three about 27 mA. These figures exclude the machine's own switch/relay circuitry. Released inputs add essentially no DC draw through these LED branches. Software sleep cannot eliminate the LED draw while the controller is unpowered. On restoration, consume held controls through the existing startup-neutral check; do not replay them as fresh commands.

## I2C and lamp drivers

U1 A4 = SDA and A5 = SCL. Connect these to U2 SDA/SCL and HSD1-3 D/C respectively. HSD V means logic VDD = 5 V, not load VIN. The four-pad header reads D/C/V/G. Do not plug a 3.3 V-only Qwiic peripheral into an HSD board whose VDD is 5 V: its connector power is the same VDD net.

| Board | Address straps | Expected 7-bit addresses |
| :--- | :--- | :--- |
| U2 | All three address DIP switches open/OFF | 0x58 |
| HSD1 | A1/A2/A3 open | 0x60 and 0x61 |
| HSD2 | A1 closed to GND; A2/A3 open | 0x62 and 0x63 |
| HSD3 | A2 closed to GND; A1/A3 open | 0x64 and 0x65 |

An SW8B address saved in its firmware can override straps. Scan and identify all seven addresses; a scan alone does not prove the right device or pin mode. Leave every HSD SJSDA/SJSCL jumper open, MAX AMP jumpers open, and the default VIN divider intact. Record factory jumper states before changes. The DAC's 4.7 kohm pull-ups provide approximately 1 mA sink current. At 100 kHz they support about 250 pF under the standard 1-microsecond rise-time criterion; measure the actual assembled bus if cable/layout uncertainty remains. Do not extend I2C to the cab or valve.

With the V2 board viewed component-side, output terminals at the right: top supply block is VIN then GND from left to right; bottom block is GND then VIN. Verify silkscreen and continuity before powering. Output terminals are printed 7 at the top through 0 at the bottom. The switched-positive terminal is toward the board interior; its paired G terminal is toward the outside. The schematic's OUT1 is printed channel 7, and OUT8 is printed channel 0. This reversal is intentional and agrees with the manufacturer's library; it is not a library bank-mapping defect.

| Lamp | Blue positive | White positive | Common negative |
| ---: | :--- | :--- | :--- |
| 1 | HSD1 ch0 | HSD1 ch1 | 0V |
| 2 | HSD1 ch2 | HSD1 ch3 | 0V |
| 3 | HSD1 ch4 | HSD1 ch5 | 0V |
| 4 | HSD1 ch6 | HSD1 ch7 | 0V |
| 5 | HSD2 ch0 | HSD2 ch1 | 0V |
| 6 | HSD2 ch2 | HSD2 ch3 | 0V |
| 7 | HSD2 ch4 | HSD2 ch5 | 0V |
| 8 | HSD2 ch6 | HSD2 ch7 | 0V |
| 9 | HSD3 ch0 | HSD3 ch1 | 0V |
| 10 | HSD3 ch2 | HSD3 ch3 | 0V |

HSD3 ch4 supplies the valve/relay branch; ch5-7 are unused and must remain OFF. A lamp effect must never iterate over all eight HSD3 outputs. Turn the old color OFF before turning the other ON. PWM is optional for lamps; the valve-power channel must remain steady DC under its watchdog state machine.

The board manufacturer reports testing to 2.4 A per four-channel bank; this is not a complete assembly qualification. The default approximately 3.9 A inrush chopping is not a branch fuse or a normal operating current. Measure each lamp color at actual charging voltage and test both worst-case blue and white patterns. Do not assume a product labeled 12 V is qualified at every voltage seen on the machine.

## Valve command, feedback and inhibit

| Valve lead | Connection |
| :--- | :--- |
| Red | HSD3 printed ch4 switched-positive, `VALVE_12V` |
| Black | Main power return, `0V` |
| Green | K1 pin 4, normally-open command contact |
| White | Signal return to 0V distribution; U2 OUT GND and U3 I- share this return, subject to H4 |
| Yellow | K1 pin 7, normally-open feedback contact |

U2 OUT goes to K1 pin 3, the first contact common. K1 pins 3 and 4 connect only while the coil is energized. U3 I+ goes to K1 pin 8, the second contact common; pins 8 and 7 connect while energized. K1 pins 2/9 are normally closed and are left unconnected; positions 5/6 have no function for the selected single-coil, non-latching variant and must not be wired. **The manufacturer's relay terminal diagram is a bottom view.** Coil positive is pin 1; negative is pin 10. Verify continuity unpowered and with a current-limited 5 V coil supply before connecting the DAC or valve. No valve-motor current passes through these signal contacts.

U2 requires initialization into 0-20 mA current mode, then a closed command of 4 mA. The GP8600 is not intrinsically a 4-20 mA-only device. Use `eOutputRange20MA` and checked transactions. Nominal 16-bit codes are 13,107 at closed, 39,321 at half travel, and 65,535 fully open. A zero code is 0 mA, not a valid closed command. The output stage contains a boosted supply of approximately 15 V; its OUT terminal must never connect directly to the Nano's ADC.

Bench-test U2 with a separate 250-ohm, 0.1%, 0.5 W test resistor from OUT to OUT GND: expected voltages are 1, 3 and 5 V at 4, 12 and 20 mA. This is a removable test load, **not** part of the final valve/SEN0262 wiring. Then test the actual valve input. Its required burden voltage is not in the available manual, so adequate current-loop compliance cannot be inferred from the words "4-20 mA" alone.

U3 I+ receives valve yellow through K1; I- receives white/common. U3 VCC = 5 V and GND = 0V. SIGNAL passes through R4 = 1 kohm to Nano A0. C1 = 100 nF connects A0 to 0V; R5 = 100 kohm also connects A0 to 0V, preventing a disconnected receiver-signal wire from floating high. These two resistors slightly attenuate the signal (100/101 nominal); calibrate the complete circuit. They are filtering/bias components, not protection against accidentally applying 12 V to A0.

The receiver's nominal conversion is 120 ohms: 4-20 mA becomes 0.48-2.40 V at its SIGNAL terminal. With the added 1k/100k network, nominal A0 is about 0.475-2.376 V, or 97-486 counts with a 5.000 V, 10-bit ADC. Use measured reference voltage and endpoint calibration, not these rounded counts as exact fault thresholds. SEN0262's differential input is not an isolated input. Do not add another shunt in parallel.

### Independent timeout proposal

The even SW8B at 0x64 can run a watchdog on pin/channel 4. Proposed timeout: 500 ms, refreshed every 100 ms **only after successful required acquisition and control-loop progress**. Normal output HIGH supplies V1 red and U4; timeout output LOW removes actuator power and releases K1. Use no automatic return to HIGH after timeout. This protects against a stalled host only if the SW8B, HSD and relay path operate correctly; it is not a certified safety channel.

The reviewed `SerialWombatWatchdog::begin()` sends two packets. The first sets the default state and a temporary 10 ms return delay; the second sets the delay to 0xFFFF for a latched timeout. Both must succeed. Do not arm with an open command present. Initialize and verify a closed DAC command first, then configure the watchdog and prove the second packet's behavior. A failure between the packets is a mandatory bench test. The convenience function returns no status, so a checked protocol wrapper is required. Confirm watchdog mode is present in the actual SW8B firmware image.

The HSD convenience `begin()` configures all eight outputs as PWM. Reconfigure channel 4 as the watchdog afterward, and never call a whole-board initialization or lamp animation on it during operation. After a timeout, a late feed must not re-energize it; recovery requires explicit reinitialization under the closed-command sequence. Arduino reset, local SW8B reset, SDA/SCL stuck low, missing DAC, failed first/second watchdog packet and unplugged modules must all be tested.

This circuit's final timing, enable sequence and fault thresholds remain H5. In normal OFF, leave actuator power available long enough to close and verify closure. Do not remove its power immediately and call that water OFF. For an actuator overcurrent or uncertain command, inhibit drive and report that water may remain on. A frozen controller, broken wire, failed relay or shorted HSD can defeat parts of the response. **A non-return ball valve can remain open without electricity.** Use the upstream manual shutoff whenever flow cannot be confirmed stopped. Guaranteed power-failure closure would require a separate fail-closed valve or stored-energy actuator, outside this design.

## Operation without a flow meter

Revision E omits the meter, its two pull-ups, two series resistors, bypass capacitor, cable and dedicated plumbing adapters. D8 and D9 stay unconnected. The proportional valve still receives its 4-20 mA command and reports position through the retained SEN0262 receiver to A0.

The ten levels can initially represent valve opening. An optional manual calibration can map them to estimated flow: measure collected volume and elapsed time at several settled openings using the actual hose and all spray outlets, then store a validated monotone lookup table. See [Flow calibration](flow-calibration.md). There is no automatic meter-driven sweep, live GPM, closed-loop flow correction, or automatic no-flow/flow-while-closed diagnosis.

Position feedback can support target tracking, bounded motion and closed-position qualification after bench tests. It cannot independently prove that water is flowing or that the valve seal has stopped a leak. Changes in hose pressure, nozzle condition and restrictions change the relationship between position and flow. Keep the manual shutoff accessible and verify physical shutoff during commissioning.

## Enclosure and thermal limits

Revision E retains Revision D's omission of TS1, TS2, R10, C3 and C6 and leaves Nano D7 unconnected. No external temperature acquisition is specified. Code 9 is reserved; the supported simulator fault set has nine causes without renumbering other codes. Driver-chip thermal protection remains integral to the HSD boards. The generic FAULT indication can represent overload, short circuit or thermal shutdown and cannot uniquely identify ambient overheating. Report it as code 4. TPS4H160 THER is a behavior-control input, not a thermal sensor output. Its low state permits thermal auto-retry; software must latch the application fault and inhibit the actuator branch on a driver fault, with no automatic application restart when the chip cools. Validate this interaction during H5.

Use an opaque UV-resistant enclosure, secured board standoffs, sealed cable glands, serviceable terminals and a drip-loop arrangement. Select its dimensions after the actual modules and wire bend radii are laid out. Keep load wiring away from analog wiring. A sealed box in sunlight can exceed outside-air temperature substantially. The valve's documented ambient limit of 50 C is a system constraint, regardless of a higher Arduino limit.

U4 dissipates approximately 0.3-0.5 W in the proposed 9-16 V branch with the small 5 V relay coil; confirm the measured value and enclosure temperature. The Nano regulator, DAC boost stage and HSD drivers also dissipate heat. Do not pot the entire assembly in ordinary resin. Complete electrical/thermal qualification first; prefer serviceable mounting and suitable conformal coating, keeping connectors, contacts, pressure vents and adjustment points clear. Potting chemistry, cure heat, stress and repairability would need separate qualification.

## Diagnostic coverage and firmware requirements

The circuit adds observability, not completed fault detection. HSD VIN measurement uses its default 11:1 divider. HSD3 channel-current selection measures the valve branch including U4/relay current; measure/subtract its baseline where useful. This is not isolated motor-phase current. The bank fault line also covers channels 5-7, which must be unused/OFF. Follow the manufacturer's channel selection and settling time before accepting current readings. Accuracy at very small lamp current is limited; qualify open-lamp thresholds experimentally.

The published DFRobot `writeRegister()` calls `endTransmission()` but discards its return and returns success. `begin()` checks an address ACK only. The production driver must propagate every transfer result, bound bus waits/retries and fail closed at the command-policy level. An ACK is not evidence of the actual output current. No checked driver has been implemented or hardware-tested here. Do not invoke the DAC's nonvolatile `store()` during routine operation.

Fault numbers retain their operator meanings in [Fault Detection and Recovery](faults.md); code 9 remains reserved. Revision E has no required flow acquisition, so no missing-meter or no-flow fault may be raised. Code 8 covers position/reference measurement problems, and code 5 covers bounded motion or failure to reach the commanded closed position. Neither code proves a hydraulic leak or lack of water. Characterize position-feedback behavior during real jams before relying on these checks.

Power loss, watchdog reset and fault acknowledgement must never resume a previous ON/Flush command. A fault latch should survive a normal restart where storage permits; even a torn write or missing fault record must still lead to OFF, startup verification and neutral inputs. Per the 5 October control update, fault clearing requires cause removal and a fresh 3-second J hold regardless of G/H position or movement, then any unfinished closure/reference recovery and 100 ms of released J before normal commands rearm. G/H may remain held after fault acknowledgement; healthy startup still requires centered G/H. Clearing the fault must not erase the diagnostic history.

**Avoid a recovery deadlock:** K1 deliberately disconnects feedback when valve power is inhibited. Zero feedback during that state is expected; it is not proof of a repaired or newly broken sensor. Before a recovery attempt, verify independently observable conditions (supply, bus, valid input states and corrected wiring/obstruction). Treat actuator-dependent checks as pending requalification, not already healthy. A fresh acknowledgement may authorize one supervised closing attempt with the DAC initialized to 4 mA before enabling power. Keep the fault history/latch until powered feedback, current and closed-position checks pass. Apply characterized startup-settle and motion deadlines; a failed attempt immediately inhibits drive again and requires a new deliberate acknowledgement after correction. Do not wait for powered feedback before supplying its power, and do not clear the fault simply because power removal made its current zero. The simulator's injected-cause controls stand in for these physical checks; this sequence still needs firmware and hardware testing.

### Updated fault response policy (5 October)

The simulator and firmware contract now distinguish operator/settings faults (6, 7, 10) from movement-inhibiting faults (1–5, 8). With independent actuator supervision healthy, operator faults retain valve power and issue a closed command while fault codes remain visible. A movement-inhibiting latch always wins, including after cause removal. Do not drop K1 solely because an operator code latched before the valve has closed; do drop the inhibit path on unsafe actuator conditions or watchdog expiry. Closing deadlines must survive new operator faults and acknowledgement without restarting. Reset makes no additional movement after confirmed closure, otherwise it authorizes/finishes bounded recovery and leaves water OFF. This policy changes software requirements only; the relay/sensor circuit remains unqualified and requires the bench checks described here.

### Does the Arduino log faults?

**Not automatically, and not yet in this project.** The repository contains a simulator and firmware contract, not running Arduino firmware. USB serial output is transient unless a connected computer saves it. The Nano Every has only 256 bytes of EEPROM, so an unlimited persistent log cannot be assumed.

For the base hardware, use a bounded RAM event ring for detailed recent diagnostics, plus a small redundant EEPROM record for the most recent fault/reset summary. One possible allocation remains two 112-byte calibration/settings slots and two 16-byte diagnostic slots, totaling 256 bytes. A 16-byte diagnostic record can contain commit/schema bytes, a 16-bit sequence, 16-bit fault mask, 32-bit uptime, quantized target/position, mode/reset flags and CRC16. It cannot also hold a full curve, timestamps, voltage, current and many past events. This is a specification, not implemented storage code.

Record fault onset, added/cleared causes, acknowledgement, watchdog/brownout reset and calibration completion; coalesce repeated identical failures. Detailed RAM events should include code/subcode, uptime, raw controls, mode, requested target, measured position, supply, branch current and last bus error. Do not log every sample or animation frame. Save only state changes with wear-aware transactional writes; retain the last valid record after an interrupted write. A sudden total power loss may prevent recording the final event, so report the next boot's reset cause as well.

No real-time clock is present. Records can contain uptime and sequence/boot context, but not reliable calendar dates while disconnected. A USB service command can export and inspect records later without clearing latches or moving the valve. Keep serial output nonblocking; a disconnected laptop must not stall control. For a substantial history that survives power removal, add a separately specified nonvolatile memory such as FRAM later. It is **not** included or wired in Revision E.

## Bench acceptance sequence

1. **Unpowered inspection:** match all SKUs/revisions and mark polarities. Check every scheduled wire, solder joint and net. Confirm no 12 V continuity to 5 V or signal nets; account for legitimate semiconductor paths. Check supply-to-ground resistance after capacitors settle. Verify K1 pin numbering/NO contacts and diode bands. Water and machine remain disconnected.
2. **Nano only:** use a current-limited nominal 12 V supply into VIN/GND; verify polarity and 5 V regulation. Check the actual board with USB absent, then service configuration separately. Set current limits for each connected stage using measured quiescent current, not a guessed final large limit.
3. **Logic modules:** add one module at a time. Verify 5 V load/current/temperature, seven I2C addresses, device identities, bus rise/low levels and default outputs. DFR output stays on the removable test load. All lamps and the valve remain disconnected initially.
4. **Inputs:** apply 0, 9, 12 and 16 V test signals separately through the completed resistor/opto circuits. Confirm D2/D3/D4 LOW/HIGH within logic limits and no channel cross-coupling. With main positive disconnected, ground retained, USB absent and valve isolated, assert each input and combinations; measure input current and verify no unintended positive-supply/5 V rail rise or Arduino boot. Restore main power while controls remain held and verify startup-neutral gating. Test G/H overlap and disconnected wires. Reverse-polarity qualification, if needed, is current-limited and separate from the Nano.
5. **DAC and receiver:** measure 4/12/20 mA commands with the test load. Independently test U3 with a known current source into I+/I-, verify SIGNAL and A0, then unplug SIGNAL to confirm the pull-down. Never put a multimeter in current mode directly across a voltage supply.
6. **Lamp outputs:** connect one lamp and identify both color leads. Test channels individually and confirm the table, including the V2 numbering reversal. Then test full patterns and thermal/current limits. Verify no pattern can energize HSD3 ch4-7. Default/reset condition must leave all lamp outputs and valve branch OFF.
7. **Inhibit, no valve:** use a safe dummy load on ch4. Verify U4 5 V, relay polarity/NO operation, 500 ms timeout proposal, latched timeout, no restart on a late feed, and actual power-off leakage. Test host reset, local SW8B reset, missing DAC, bus stuck-low and interruption between the two watchdog setup packets. Verify recovery can reach its powered requalification phase without requiring unavailable unpowered feedback, while never clearing a latch prematurely. Failure of any required response keeps H5 open.
8. **Valve interface, no pressurized water:** satisfy H4 before joining returns. Use a current-limited supply and correctly configured command source. Measure inrush, current, input burden and feedback voltage at several targets. Test close/open endpoints, signal disconnects and power loss. Determine whether feedback represents actual mechanical position during a jam; do not force or repeatedly stall the actuator.
9. **Manual calibration and environment:** if using a flow curve, compare collected volume/time at measured valve positions through the actual hose and all nozzles. Confirm shutoff by observation. Check external temperatures with bench instruments during hot-soak qualification; no permanent probes are installed.
10. **Water and integration:** secure plumbing, provide the manual shutoff and test at low pressure first. Measure closure leak, motion time, repeatability, useful minimum opening, voltage range, full-pattern lamp current and enclosure hot soak. Inject faults by safe disconnections/test fixtures, not uncontrolled shorts. Validate power interruption during each storage phase and controls held during every reset path.
11. **Machine release:** resolve H1/H2, then repeat the relevant tests with the actual harness and running machine, secured attachment and safe water discharge. Record measured thresholds and acceptance evidence. Only then change the drawing status to construction/field release.

## Source register

Primary sources were collected for the 4 October audit; critical connections and thermal-diagnostic behavior were rechecked from retained copies on 7 October 2026. Manufacturer documents establish component facts; proposed combinations and calculated margins remain this project's engineering assumptions.

| ID | Primary source | Used for |
| :--- | :--- | :--- |
| S1 | [Nano Every datasheet](https://docs.arduino.cc/resources/datasheets/ABX00028-datasheet.pdf), [V4.0 schematic](https://docs.arduino.cc/resources/schematics/ABX00028-schematics.pdf), [pinout](https://docs.arduino.cc/resources/pinouts/ABX00028-full-pinout.pdf) | VIN, logic, pin labels, EEPROM, USB power path |
| S2 | [PCB0046 guide](https://www.serialwombat.com/p46), [V2 schematic](https://images.squarespace-cdn.com/content/v1/619ece9561f419760806a927/128caefe-64fd-4728-ba48-380cd703eb83/PCB_0046_V2_Schematic.png), [V2 drawing](https://images.squarespace-cdn.com/content/v1/619ece9561f419760806a927/7dcc598d-3537-4cc9-8b72-35188590463b/PCB_0046_V2_Drawing.png) | Terminals, power, channel mapping, pull-ups, diagnostics |
| S3 | [TI TPS4H160-Q1 datasheet](https://www.ti.com/lit/ds/symlink/tps4h160-q1.pdf) | Driver limits, current selection, leakage, fault behavior |
| S4 | [Serial Wombat Arduino library](https://github.com/BroadwellConsultingInc/SerialWombatArdLib), [device firmware](https://github.com/BroadwellConsultingInc/SerialWombat) | PWM setup, watchdog packets, timeout behavior; deployed image still to verify |
| S5 | [DFR1229 documentation](https://wiki.dfrobot.com/dfr1229/), [schematic](https://dfimg.dfrobot.com/wiki/23289/DFR1229_gp8600-dac-module_schematics_V1.0.pdf), [driver source](https://github.com/DFRobot/DFRobot_GP8XXX) | Current mode/scaling, boost stage, shared return, I2C error handling |
| S6 | [SEN0262 documentation](https://wiki.dfrobot.com/sen0262/), [schematic](https://dfimg.dfrobot.com/wiki/17563/SEN0262_current-to-voltage_schematics_v1.pdf) | Differential shunt, analog voltage, pin functions |
| S7 | [U.S. Solid Manual 11917 / 5003X](https://file.ussolid.com/content/JFMSV/Manual-5003X.pdf) | Valve wire colors, ratings, integrated actuator |
| S9 | [SparkFun BOB-09118](https://www.sparkfun.com/sparkfun-opto-isolator-breakout.html), [v1.2 schematic](https://cdn.sparkfun.com/assets/d/e/4/5/e/Optoisolator-v12.pdf), [Eagle source](https://github.com/sparkfun/Opto_Isolator_Breakout), [Vishay ILD213T family](https://www.vishay.com/docs/83647/ild205t.pdf) | Exact input circuit and pin functions |
| S10 | [Panasonic TQ relay catalog](https://industry.panasonic.com/ac/cdn/e/control/relay/signal/catalog/mech_eng_tq.pdf), [ST L78 datasheet](https://www.st.com/resource/en/datasheet/l78.pdf) | Coil, contact numbering, regulator pins/thermal calculation |
| S12 | [Skid Steer Genius technical reference](https://www.skidsteergenius.com/pages/technical) | Reproduced Takeuchi TL10V2/TL12V2/TL12R2 manual page 2-40; not proof of the individual harness |
| S13 | [Nilight TL-248BW](https://www.nilight.com/products/3-4inch-dual-color-marker-light-10pcs-blue-to-white-auxiliary-side-marker-bullet-clearance-indicator-lights-3-plug-connector-ip68-waterproof-for-trailer-truck-pickup-camper-rv-atv-utv-van-bus) | Common negative and separate blue/white positives; load measurements still required |

## Verification performed here

This review compared manufacturer schematics, manuals, board drawings and driver source. The connection schedule is generated from an endpoint netlist; the circuit drawings were reviewed against that same specification. Automated tests check every declared pin, forbidden supply connections, unique lamp assignments, relay polarity/contact separation, address uniqueness and numeric interface margins, with deliberately damaged netlists to confirm detection. The document and diagrams were rendered for visual inspection. These checks catch documentation and design inconsistencies; they are not electrical-rule certification, hardware-in-the-loop testing, or proof of field reliability.
