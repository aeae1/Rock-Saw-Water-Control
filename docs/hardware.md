# Hardware Candidates

Revision 0.3 · Candidate register, not a purchase release

See the [build guide](build-guide.md) for the current priced proportional-valve plan, including twenty lamp channels and enclosures. The simulator models generic non-return actuation. A wired proportional valve is the preferred next bench candidate when repeatable percentage control is required. Selection must account for temperature inside a sun-exposed enclosure, power transients, water ingress, vibration, actuator current, and repeatability of short movements. The simulator does not depend on a particular microcontroller.

## Controller and power electronics

| Function | Candidate | Selection condition |
| :--- | :--- | :--- |
| Microcontroller | [Arduino Nano Every, ABX00028](https://docs.arduino.cc/hardware/nano-every/) | Sufficient for the control logic with external I/O expansion; requires protected inputs and an enclosure |
| Motor driver (economy reversing option only) | [Pololu TB67H453FNG carrier, 4971](https://www.pololu.com/product/4971) | Characterize motor startup/stall current and thermal margin before selecting |
| Regulated 12 V supply | [Pololu S18V20F12, 2577](https://www.pololu.com/product/2577) | Candidate only; system protection and combined lamp/motor load require evaluation |
| Enclosure | [Hammond 1554VA2GY](https://www.hammfg.com/part/1554VA2GY) | Confirm usable volume, mounting, UV exposure, glands, and internal temperature |
| Lamp interface | Two MCP23017 expanders and twenty power-switch channels | TBD62783APG bench candidate if common-negative; verify current and protection |
| Machine inputs | Three protected input channels | Thresholds, filtering, transient limits, and physical pinout remain open |

The Nano Every uses 5 V logic and specifies 7–21 V at VIN in the [manufacturer documentation](https://docs.arduino.cc/resources/datasheets/ABX00028-datasheet.pdf). These ratings do not make its pins suitable for machine wiring or establish automotive transient immunity. The motor-driver carrier specifies 4.5–44 V operation and 1.3 A continuous output under its stated conditions; that is a component rating rather than a validated sealed-enclosure capability.

## Valve alternatives

Current procurement comparisons use 1/2-inch valves. A suitable 3/8-inch two-way alternative remains open; verify spray performance with the actual hose and supply. The previously considered HSH-Flo 3/4-inch option is retained for reference only.

| Candidate | Interface | Principal considerations |
| :--- | :--- | :--- |
| [U.S. Solid USS-MSV00012](https://ussolid.com/products/u-s-solid-motorized-ball-valve-1-2-brass-electrical-ball-valve-with-full-port-9-24-v-dc-2-wire-reverse-polarity-html) | 1/2-inch brass, 9–24 V DC, two-wire reversing | Low-cost wired candidate; confirm environmental limits and intermediate-position repeatability |
| [HSH-Flo CR201-B, 12 V, 3/4-inch NPT](https://www.hhflo.com/products/hsh-flo-brass-2-way-dc12v-cr201-electric-motorized-ball-valve-2-wires-switching-control-valve) | Two-wire reversing actuator with manual override | Manufacturer lists IP67 and ambient −15 to 50°C; exact variant and movement characteristics require confirmation |
| [U.S. Solid smart Wi-Fi 1/2-inch valve](https://ussolid.com/products/wifi-12-brass-remote-control-motorized-ball-valve-with-power-off-memory-5v-dc-usb-manual-switch) | Integrated smart controller | Research alternative; a supported local percentage-command interface has not been established |
| [U.S. Solid USS-MSV50033](https://ussolid.com/products/1-2-proportional-motorized-ball-valve-brass-dc-9-24v-4-20ma-control-5-wire-ip67-full-port) | 1/2-inch brass, 9–24 V DC, 4–20 mA command and feedback | Preferred percentage-control bench candidate; needs current-output interface and feedback receiver |

The wired valves include the motor and gearbox. A separate mechanical motor is unnecessary. An H-bridge reverses the electrical drive and permits timed movement. With no position feedback, partial opening remains an estimate; motor speed, backlash, startup delay, and supply voltage can affect repeatability. Closing to a known endpoint can establish a reference only after the actuator's limit behavior and timeout are verified.

The HSH-Flo listing covers multiple sizes and configurations, with several switching times. Specify CR201-B, 12 V, 3/4-inch NPT explicitly and confirm its data before ordering. The default product-page price may refer to a different variant. An IP rating does not establish UV resistance or operating temperature in direct sunlight.

## Lamp assembly

The proposed display uses ten 12 V blue/white lamps with a common negative and separately powered positive color leads. Brand is flexible: the user supplied [BJZ B0CT8G71TW](https://www.amazon.com/BJZ-Trailer-Marker-Clearance-Indicator/dp/B0CT8G71TW/) and [Nilight B0F7XP3QZB](https://www.amazon.com/Nilight-Clearance-Indicator-Trailer-Warranty/dp/B0F7XP3QZB) as examples. The [build guide](build-guide.md) records the Nilight manufacturer's wiring and an example ten-pack price. Record the actual supplied item, wire functions, per-color current, brightness, and mounting dimensions during bench inspection. Twenty independently switched color channels are required by the current display behavior. The lamps contain their own current limiting, but controller GPIO cannot supply their twelve-volt power directly.

## Smart-valve research path

The [valve-control research](valve-control-research.md) compares three U.S. Solid models, provides current component prices, and describes local Tuya LAN and internal UART approaches. It also documents the wired proportional alternative, which does not require a Tuya modification. Neither percentage interface has been bench-tested for this project.

An ESP32 could be considered if a compatible local protocol is established. [TinyTuya](https://github.com/jasonacox/tinytuya) is a potential discovery and protocol-investigation tool for the owner's device. It is not proof of compatibility with this valve. Required evidence includes the percentage data point, local key provisioning, operation without internet, cold-start behavior, and recovery after communication loss. An app's percentage indication does not establish position feedback or measured flow.

A valve using its integrated smart controller would use a different power/interface design and would not be driven simultaneously by the external H-bridge. Internal modification and UART access remain unverified alternatives.

## Procurement status

The current complete-prototype allowance is approximately $445–665 plus lamps, tax, shipping and labor; see the [build guide](build-guide.md) for inclusions and exclusions. This is not a fixed quotation. Dated valve and interface prices appear in the research note. The lamp-switch bank, harness, input protection, and environmental provisions are incomplete; component-only subtotals do not represent the final assembly. The [planning BOM](bom.csv) records these omissions explicitly. Manufacturer references were reviewed where available on 2026-10-01; listed candidates have not been tested as a complete system.
