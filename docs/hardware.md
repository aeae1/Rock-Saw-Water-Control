# Hardware Candidates

Revision 0.1 · Candidate register, not a purchase release

The low-cost wired architecture is the present baseline. Selection must account for temperature inside a sun-exposed enclosure, power transients, water ingress, vibration, actuator current, and repeatability of short movements. The simulator does not depend on a particular microcontroller.

## Controller and power electronics

| Function | Candidate | Selection condition |
| :--- | :--- | :--- |
| Microcontroller | [Arduino Nano Every, ABX00028](https://docs.arduino.cc/hardware/nano-every/) | Sufficient for the control logic with external I/O expansion; requires protected inputs and an enclosure |
| Motor driver | [Pololu TB67H453FNG carrier, 4971](https://www.pololu.com/product/4971) | Characterize motor startup/stall current and thermal margin before selecting |
| Regulated 12 V supply | [Pololu S18V20F12, 2577](https://www.pololu.com/product/2577) | Candidate only; system protection and combined lamp/motor load require evaluation |
| Enclosure | [Bud PN-1339-A](https://www.budind.com/product/nema-ip-rated-boxes/pn-a-series-nema-6p-box/ip68-nema-6p-box-pn-1339-a/) | Confirm usable volume, mounting, UV exposure, glands, and internal temperature |
| Lamp interface | I/O expansion and twenty high-side outputs | Device selection remains open; use measured current for each color channel |
| Machine inputs | Three protected input channels | Thresholds, filtering, transient limits, and physical pinout remain open |

The Nano Every uses 5 V logic and specifies 7–21 V at VIN in the [manufacturer documentation](https://docs.arduino.cc/resources/datasheets/ABX00028-datasheet.pdf). These ratings do not make its pins suitable for machine wiring or establish automotive transient immunity. The motor-driver carrier specifies 4.5–44 V operation and 1.3 A continuous output under its stated conditions; that is a component rating rather than a validated sealed-enclosure capability.

## Valve alternatives

| Candidate | Interface | Principal considerations |
| :--- | :--- | :--- |
| [U.S. Solid USS-MSV00021](https://ussolid.com/products/u-s-solid-motorized-ball-valve-3-4-brass-electrical-ball-valve-with-standard-port-9-24-v-dc-2-wire-reverse-polarity-html) | 3/4-inch brass, 9–24 V DC, two-wire reversing | Low-cost wired candidate; confirm environmental limits and intermediate-position repeatability |
| [HSH-Flo CR201-B, 12 V, 3/4-inch NPT](https://www.hhflo.com/products/hsh-flo-brass-2-way-dc12v-cr201-electric-motorized-ball-valve-2-wires-switching-control-valve) | Two-wire reversing actuator with manual override | Manufacturer lists IP67 and ambient −15 to 50°C; exact variant and movement characteristics require confirmation |
| [U.S. Solid smart Wi-Fi 3/4-inch valve](https://ussolid.com/products/wifi-34-brass-remote-control-motorized-ball-valve-with-power-off-memory-ac-100-240v-plug-adapter-with-dc-5v-output-manual-switch) | Integrated smart controller | Research alternative; a supported local percentage-command interface has not been established |

The wired valves include the motor and gearbox. A separate mechanical motor is unnecessary. An H-bridge reverses the electrical drive and permits timed movement. With no position feedback, partial opening remains an estimate; motor speed, backlash, startup delay, and supply voltage can affect repeatability. Closing to a known endpoint can establish a reference only after the actuator's limit behavior and timeout are verified.

The HSH-Flo listing covers multiple sizes and configurations, with several switching times. Specify CR201-B, 12 V, 3/4-inch NPT explicitly and confirm its data before ordering. The default product-page price may refer to a different variant. An IP rating does not establish UV resistance or operating temperature in direct sunlight.

## Lamp assembly

The proposed display uses the user's [ten-pack of PSEQT blue/white lamps](https://www.amazon.com/dp/B0CTK4KGY6). Record the exact supplied item, wire functions, current, brightness, and mounting dimensions during bench inspection. Twenty independently driven color channels are required by the current display behavior. The controller cannot drive the lamps directly.

## Smart-valve research path

An ESP32 could be considered if a compatible local protocol is established. [TinyTuya](https://github.com/jasonacox/tinytuya) is a potential discovery and protocol-investigation tool for the owner's device. It is not proof of compatibility with this valve. Required evidence includes the percentage data point, local key provisioning, operation without internet, cold-start behavior, and recovery after communication loss. An app's percentage indication does not establish position feedback or measured flow.

A valve using its integrated smart controller would use a different power/interface design and would not be driven simultaneously by the external H-bridge. Internal modification and UART access remain unverified alternatives.

## Procurement status

Prices and a final system total are intentionally not fixed in this revision. The lamp-driver bank, harness, input protection, and environmental provisions are incomplete; earlier component-only estimates cannot represent the final assembly. The [planning BOM](bom.csv) records these omissions explicitly. Manufacturer references were reviewed where available on 2026-10-01; listed candidates have not been tested as a complete system.
