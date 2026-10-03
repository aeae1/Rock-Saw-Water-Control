# Hardware Selection

Reviewed 2026-10-03 · Current direction, not a construction release

The [build guide](build-guide.md) is the current component and wiring reference. The [audit](audit-2026-10-03.md) records remaining hardware questions. Earlier prototype costs and pin assignments have been superseded.

| Function | Selected direction | Outstanding evidence |
| :--- | :--- | :--- |
| Controller | Arduino Nano Every | Peripheral power, firmware/library integration and thermal test |
| Water valve | U.S. Solid USS-MSV50030, 1/2-inch stainless | Command/feedback compatibility, signal-loss response and outdoor mounting |
| Command / feedback | DFR1229 current output / SEN0262 analog receiver to Nano A0 | Loop compliance, electrical limits and ADC calibration |
| Lamps | Ten common-negative 12 V blue/white indicators | Exact unit, color current, visibility and sealing |
| Lamp interface | Three Serial Wombat PCB0046 HSD boards | Price/availability, addresses, output defaults and diagnostics |
| Operator inputs | Prebuilt four-channel 12 V-to-5 V optocoupler board | Exact SKU, thresholds, polarity and temperature range |
| Power | Reused connector constant 12 V and wired ground; existing machine fuse | Key-off behavior, current capacity and parked draw |
| Housing | Opaque UV-resistant enclosure, glands and mounting plate | Fit, finished sealing and hot-soak temperature |
| Fault inhibition / extra sensing | Not finalized | Controller freeze response; supply, actuator-current and temperature sensing |

The current layout uses no new 14-pin connector, separate battery feed, extra fuse block, external ADC, separate GPIO expanders, or reversing motor driver. Three HSD boards provide both output expansion and lamp power switching. A bare PCA9685 does not directly replace them for twenty 12 V color leads.

## Valve alternatives

Current procurement comparisons use 1/2-inch valves. A suitable 3/8-inch two-way alternative remains open; verify spray performance with the actual hose and supply. The previously considered HSH-Flo 3/4-inch option is retained for reference only.

| Candidate | Interface | Principal considerations |
| :--- | :--- | :--- |
| [U.S. Solid USS-MSV00012](https://ussolid.com/products/u-s-solid-motorized-ball-valve-1-2-brass-electrical-ball-valve-with-full-port-9-24-v-dc-2-wire-reverse-polarity-html) | 1/2-inch brass, 9–24 V DC, two-wire reversing | Low-cost wired candidate; confirm environmental limits and intermediate-position repeatability |
| [HSH-Flo CR201-B, 12 V, 3/4-inch NPT](https://www.hhflo.com/products/hsh-flo-brass-2-way-dc12v-cr201-electric-motorized-ball-valve-2-wires-switching-control-valve) | Two-wire reversing actuator with manual override | Manufacturer lists IP67 and ambient −15 to 50°C; exact variant and movement characteristics require confirmation |
| [U.S. Solid smart Wi-Fi 1/2-inch valve](https://ussolid.com/products/wifi-12-brass-remote-control-motorized-ball-valve-with-power-off-memory-5v-dc-usb-manual-switch) | Integrated smart controller | Research alternative; a supported local percentage-command interface has not been established |
| [U.S. Solid USS-MSV50030](https://ussolid.com/products/1-2-proportional-motorized-ball-valve-stainless-steel-dc-9-24v-4-20ma-control-5-wire-ip67-full-port) | 1/2-inch stainless, 9–24 V DC, 4–20 mA command and feedback | Preferred percentage-control bench candidate; needs current-output interface and feedback receiver |

The wired valves include their motor and gearbox. The proportional model includes its controller and takes a current command; it does not use an external H-bridge. Only the two-wire reversing alternatives use an H-bridge for timed movement. With no position feedback, partial opening remains an estimate; motor speed, backlash, startup delay, and supply voltage can affect repeatability. Closing to a known endpoint can establish a reference only after the actuator's limit behavior and timeout are verified.

The HSH-Flo listing covers multiple sizes and configurations, with several switching times. Specify CR201-B, 12 V, 3/4-inch NPT explicitly and confirm its data before ordering. The default product-page price may refer to a different variant. An IP rating does not establish UV resistance or operating temperature in direct sunlight.

## Lamp assembly

The proposed display uses ten 12 V blue/white lamps with a common negative and separately powered positive color leads. Brand is flexible: the user supplied [BJZ B0CT8G71TW](https://www.amazon.com/BJZ-Trailer-Marker-Clearance-Indicator/dp/B0CT8G71TW/) and [Nilight B0F7XP3QZB](https://www.amazon.com/Nilight-Clearance-Indicator-Trailer-Warranty/dp/B0F7XP3QZB) as examples. The [build guide](build-guide.md) records the Nilight manufacturer's wiring and an example ten-pack price. Record the actual supplied item, wire functions, per-color current, brightness, and mounting dimensions during bench inspection. Twenty independently switched color channels are required by the current display behavior. The lamps contain their own current limiting, but controller GPIO cannot supply their twelve-volt power directly.

## Smart-valve research path

The [valve-control research](valve-control-research.md) compares three U.S. Solid models, retains dated alternative prices, and describes local Tuya LAN and internal UART approaches. It also documents the wired proportional alternative, which does not require a Tuya modification. Neither percentage interface has been bench-tested for this project.

An ESP32 could be considered if a compatible local protocol is established. [TinyTuya](https://github.com/jasonacox/tinytuya) is a potential discovery and protocol-investigation tool for the owner's device. It is not proof of compatibility with this valve. Required evidence includes the percentage data point, local key provisioning, operation without internet, cold-start behavior, and recovery after communication loss. An app's percentage indication does not establish position feedback or measured flow.

A valve using its integrated smart controller would use a different power/interface design and would not be driven simultaneously by the external H-bridge. Internal modification and UART access remain unverified alternatives.

## Procurement status

The four verified core items total $138.99 before lamps, HSD boards, input board, assembly materials, enclosure, tax and shipping. A complete price is unresolved. See the current [BOM](bom.csv) and [build guide](build-guide.md); unknown prices must not be treated as zero. No assembled hardware has been qualified for field operation.
