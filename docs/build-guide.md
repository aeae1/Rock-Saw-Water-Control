# Build and Wiring Plan

Reviewed 2026-10-03 · Current prebuilt-board design · Bench verification required

The selected direction is an **Arduino Nano Every**, a **1/2-inch stainless U.S. Solid USS-MSV50030 proportional valve**, and **ten common-negative 12 V blue/white lamps**. Three prebuilt Serial Wombat PCB0046 HSD boards supply the twenty lamp color channels. This document supersedes the earlier brass-valve, MCP23017/TBD62783, external-ADC arrangement.

The simulator is implemented. Machine firmware, final terminal-level wiring, and a tested hardware fault-inhibit circuit are not yet supplied. The [audit](audit-2026-10-03.md) distinguishes completed software checks from outstanding bench work.

## Parts and current budget

Prices below are manufacturer prices reviewed on 2026-10-03, in USD before tax and shipping. Blank prices are unresolved, not zero-cost components.

| Quantity | Part | Function | Extended price |
| ---: | :--- | :--- | ---: |
| 1 | [Arduino Nano Every ABX00028](https://store-usa.arduino.cc/products/nano-every) | Controls inputs, valve requests, lamp patterns and faults | $12.90 |
| 1 | [U.S. Solid USS-MSV50030 / JFMSV50030](https://ussolid.com/products/1-2-proportional-motorized-ball-valve-stainless-steel-dc-9-24v-4-20ma-control-5-wire-ip67-full-port) | 1/2-inch stainless proportional valve; integrated motor/controller | $105.29 |
| 1 | [DFRobot DFR1229 / GP8600](https://www.dfrobot.com/product-3073.html) | I²C to current command | $15.90 |
| 1 | [DFRobot SEN0262](https://www.dfrobot.com/product-1755.html) | Current feedback to analog voltage | $4.90 |
| 3 | [Serial Wombat PCB0046 HSD](https://www.serialwombat.com/p46) | Prebuilt high-side lamp drivers and output expansion | Price/availability unverified |
| 1 | Four-channel 12 V-input, 5 V-output optocoupler board | G/H/J conversion; one spare channel | Exact board unselected |
| 10 | Common-negative 12 V blue/white marker lamps | Ten-position display | Brand/quote unconfirmed |
| 1 | Opaque UV-resistant enclosure and mounting plate | Houses controller and boards | Layout/quote pending |
| 1 set | Distribution terminals, wire, glands, sealed connectors, standoffs, labels | Electrical assembly | Layout/quote pending |
| 1 set | Manual shutoff, strainer, hose/NPT adapters, removable fittings | Plumbing and service | Reuse existing items where suitable |
| 1 | Existing machine connector | Power, ground and three control lines | Reused; no new 14-pin connector |

The four verified core items total **$138.99**. This is not a complete project total. If the previously observed $25.99 lamp pack is still available, that subtotal becomes **$164.98**, leaving only $35.02 under $200 for all three driver boards, inputs, enclosure and assembly materials. The current prebuilt design has **not** been shown to fit a $200 complete-build budget. Do not add the historical prototype budget to this list; it described different hardware.

A [LaskaKit four-channel 12 V-to-5 V PC817 module](https://www.laskakit.cz/en/4-kanalovy-modul-optoizolatoru-pc817-12v-na-5v/) illustrates the input-board category. It is not a released part selection: input thresholds across the machine voltage range, polarity, shared returns, pull-ups, and temperature rating still need confirmation. An optocoupler on a board does not guarantee complete system isolation when grounds are shared.

## Connect the system in this order

1. **Machine connector to distribution.** Use the reference machine's existing constant-hot 12 V and wired ground. Feed the Nano VIN and the boards' 12 V load connections from this distribution. The installation relies on the existing machine fuse, assumes clean nominal 12 V as specified for this project, and adds no fuse block or separate power source. Record the existing fuse, wiring and connector ratings rather than assuming their values.
2. **Machine controls to input board.** G/H/J go into three 12 V input channels. The conditioned outputs go to Nano D2/D3/D4. Connect the input and logic returns according to the actual board. Raw machine voltage never connects directly to a Nano I/O pin.
3. **Nano to the local I²C bus.** A4/SDA and A5/SCL connect to the command module and three lamp boards. Connect their logic supply and logic ground. Keep this bus inside the enclosure; do not extend it across the attachment. Account for every board's pull-ups rather than enabling all of them automatically.
4. **Lamp boards to lamps.** Each blue and white positive lead gets its own high-side output. All ten lamp negatives return to the distribution ground. Lamp current comes from the 12 V branch, not from Nano pins or its 5 V rail.
5. **Nano to valve command.** Configure DFR1229 for current output, then command 4 mA for closed. Its OUT goes to the valve's green wire; output return goes to valve signal common after confirming the supplied unit's common connections.
6. **Valve feedback to Nano.** Valve yellow feeds SEN0262 current input; white supplies signal return. SEN0262 voltage output goes to Nano A0. This is an analog input, not I²C. The module needs its specified low-voltage supply and ground.
7. **Valve power.** Red goes to the actuator 12 V branch; black goes to power return. A field build still needs a verified method of inhibiting continued actuation if the controller or command interface fails. That circuit is an open design item, not a feature already supplied by the picture.
8. **Water fittings.** Garden hose, manual shutoff, strainer, valve and saw spray plumbing form a separate hydraulic path. There are no electrical connections to the stainless valve body or the hoses.

The [connection diagrams](connections.md) show these relationships. The illustration in the README identifies parts; terminal placement and drawn cable routing are not construction instructions.

## Lamp channel allocation

Use only **off**, **blue**, or **white** per lamp. Turn the old color off before enabling the replacement. The following allocation keeps each lamp's colors adjacent and leaves four outputs spare.

| Board | Output-control address | Diagnostic address | Local outputs | Lamp leads |
| :--- | :--- | :--- | :--- | :--- |
| HSD 1 | 0x60 | 0x61 | 0/1, 2/3, 4/5, 6/7 | Blue/white for lamps 1, 2, 3, 4 |
| HSD 2 | 0x62 | 0x63 | 0/1, 2/3, 4/5, 6/7 | Blue/white for lamps 5, 6, 7, 8 |
| HSD 3 | 0x64 | 0x65 | 0/1, 2/3 | Blue/white for lamps 9, 10 |
| HSD 3 | 0x64 | 0x65 | 4–7 | Spare; keep off until assigned |

Each PCB0046 contains two addressed devices. Set distinct address pairs with its jumpers and identify all six devices during initialization. The manufacturer documents separate load and 3.3–5 V logic connections, current feedback, and bank fault signals. Its published tested load is 2.4 A per four-output bank; qualify actual lamp loads and enclosed temperature. The default inrush limit is not a steady-state current limit, and board faults are not latched by default. Firmware must retain a diagnosed fault until acknowledged. See the [manufacturer's guide](https://www.serialwombat.com/p46) for jumper and terminal details.

A single PCA9685 is not a replacement: it has sixteen low-voltage outputs, whereas this display needs twenty switched 12 V color leads. Its [datasheet](https://www.nxp.com/docs/en/data-sheet/PCA9685.pdf) requires external drivers for higher-voltage loads. Prebuilt HSD boards combine the expansion and power-switch functions.

If the display is remote from its drivers, it needs twenty switched conductors plus a return sized for the total lamp load. Locating the controller immediately behind the lamp bar avoids that bulky cable. The lamp body's water rating does not establish sealing around a drilled mounting hole or its connectors.

## Valve cable and analog scaling

The actuator has **one five-wire cable**. The [5003X manual](https://file.ussolid.com/content/JFMSV/Manual-5003X.pdf) gives the following functions; verify the actual unit before wiring.

| Valve wire | Function | Connection direction |
| :--- | :--- | :--- |
| Red | DC power positive | 12 V actuator branch |
| Black | DC power negative | Power return |
| Green | Current command positive | DFR1229 OUT |
| White | Command/feedback signal common | Command return and receiver input return |
| Yellow | Position feedback positive | SEN0262 current input |

The motor, gearbox and position controller are already inside the actuator. No additional motor or reversing H-bridge is required. Confirm the relationship between black and white before joining returns; neither interface module should be assumed isolated. Route load returns separately from the analog signal return to the distribution point.

For opening `p` percent, the target command is `4 + 0.16 × p` mA. The [DFR1229 specification](https://wiki.dfrobot.com/dfr1229/) describes a raw 0–20 mA scale: raw zero is not closed. At that scale, 4 mA is code 13107 and 20 mA is 65535. Confirm the library's selected range, measured output and valve input load at 4, 12 and 20 mA before enabling actuation. Current-loop compliance, startup glitches, and retained output after MCU reset remain bench questions.

[SEN0262](https://wiki.dfrobot.com/sen0262/) nominally converts 0–25 mA into 0–3 V. Therefore 4–20 mA corresponds to approximately **0.48–2.40 V**, not 0–5 V. At a nominal 5 V, 10-bit ADC reference, useful feedback spans about 393 counts, or 0.25% travel per count before noise/reference error. This arithmetic is not a claim of valve accuracy. Calibrate closed/full-open feedback and reference voltage; decide whether an external ADC is justified only after measuring noise and repeatability.

Do not add a parallel 250-ohm shunt while retaining SEN0262: it changes the received current. A shunt-only receiver would be a different circuit, with ADC protection, load-compliance and voltage-headroom checks. The prebuilt receiver remains selected.

## Nano connections and firmware prerequisites

| Nano connection | Proposed use |
| :--- | :--- |
| VIN / GND | Connector's nominal 12 V / wired ground |
| D2 / D3 / D4 | Conditioned G / H / J |
| A4 / A5 | Local SDA / SCL; DFR1229 0x58 and HSD address pairs above |
| A0 | SEN0262 position voltage |
| A1 / A2 / A3 | Reserved for voltage, actuator-current and temperature sensing; circuits not selected |
| D5 / D6 / D7 | Reserved for supervision/enable functions; hardware not finalized |
| USB | Programming and service |

The [Nano Every documentation](https://docs.arduino.cc/resources/datasheets/ABX00028-datasheet.pdf) specifies 5 V logic and a VIN regulator using an MPM3610 buck converter. Do not apply the classic Nano's linear-regulator heat calculation to this board. Measure the complete 5 V peripheral load and regulator temperature before relying on its rail for every module. Avoid tying together independently regulated 5 V outputs during service.

Always initialize lamp outputs off and establish the closed command before allowing valve motion. Disconnecting USB, resetting only the Nano, losing the I²C bus, or rebooting a lamp board must not leave an unnoticed stale command. Serial Wombat documents a [watchdog mode](https://broadwellconsultinginc.github.io/SerialWombatArdLib/class_serial_wombat_watchdog.html); its suitability for this board's installed firmware and the desired inhibit path must be demonstrated, not assumed from the API name. A spare HSD output alone is not an independent safety shutdown.

Fault 2 requires actuator-current sensing; lamp-driver current feedback does not measure a separately powered actuator. Fault 9 needs a temperature sensor. Supply diagnostics, feedback electrical limits, bank diagnostics and timeout thresholds require actual acquisition code and measurements. The [fault table](faults.md) records what the browser only injects.

## Constant power, heat and enclosure

**The simulated power switch represents controller power, not necessarily the ignition key.** With a truly constant-hot connector, turning off the engine does not trigger startup, cancel Flush or close an already open valve. Measure key-off behavior and parked current. A master disconnect or ignition-sense input could address this, but neither is selected or shown as existing hardware.

Use an opaque, light-colored, UV-resistant enclosure with a mounting plate, standoffs, strain relief, serviceable connectors and appropriately rated glands. [Hammond 1554VA2GY](https://www.hammfg.com/part/1554VA2GY), approximately 240 × 160 × 90 mm, is one candidate; fit all three HSD boards and wiring bend radii on a scale layout before choosing a size. The lamp bar may require a separate longer housing. Mount away from exhaust, hydraulics, impact and direct sun where possible. Enclosure ingress ratings apply to the finished penetrations only when installed accordingly.

The valve manual specifies ambient −15 to 50°C, liquid 2 to 90°C, up to eight seconds travel and no manual override. Its listing also quotes 11 W, while the manual quotes up to 500 mA; these do not define a single measured 12 V startup load. Characterize inrush, running and idle current. The listing contains generic normally-closed language alongside warnings that only auto-return models return on power loss. Do not infer a return mechanism from that label. Confirm the supplied model's actual power-loss and broken-signal behavior.

Measure regulator, lamp-driver, enclosure-air and actuator temperatures during a hot soak with representative load. Use shade and practical drainage/freezing provisions. Leave the first build serviceable. Conformal coating after validation is preferable to immediately encapsulating it; mask connectors, USB, switches and service points. Potting compounds can trap heat, stress parts and prevent repairs. Pot only a proven design using a compatible electronics-grade compound and a repeated thermal test.

## Assembly and acceptance sequence

1. Identify connector cavities with the correct machine/harness documentation and measurements. Record viewing direction and confirm that sensing G/H/J cannot backfeed or command existing hydraulics.
2. On a current-limited bench supply, verify input polarity, normal/held startup, all twenty lamp outputs, board addresses, current readings and reset states.
3. Prove valve command/feedback scaling without water first, then under hose pressure. Test closed, full-open, adjacent small steps, reversals, hold-at-current-position, jam/no-progress and broken signal wires.
4. Implement the [firmware contract](../firmware/README.md): bounded input/bus work, startup closure, neutral qualification, latched faults, persistence and watchdog recovery. Bench-test the inhibit circuit with the MCU deliberately stopped.
5. Measure the [flow curve](flow-calibration.md) through the real nozzles. The simulator currently displays opening percentage; do not silently substitute an invented flow curve.
6. Test actual key/power cycles, hot soak, vibration-resistant mounting, leak-free fittings and all fault-recovery paths. Record results in the [acceptance plan](validation.md) before field use.
