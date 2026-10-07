# Single-page schematic verification

7 October 2026 · Revision D · External temperature sensing removed

The [complete schematic PDF](assets/hardware/water-controller-single-page-rev-d.pdf) contains all six circuit sections, the complete wire register, component schedule, internal common connections and unused terminals on **one A0 landscape page**. The [SVG](assets/hardware/water-controller-single-page-rev-d.svg) is also available. Zoom electronically or print at A0; letter/A4 reduction makes the connection register too small for assembly work.

## Three verification passes

| Pass | Evidence |
| :--- | :--- |
| Connectivity and change review | 126 wire records, 49 component references, 230 declared terminals and 46 nets are accounted for. Nineteen electrical-document checks cover terminal completeness, separated supply domains, component values, channel mapping, deliberate wiring corruption and the exact Revision C-to-D change. The comparison verifies that removing TS1, TS2, R10, C3 and C6 removes only their branch; all retained connections, internal commons, addresses and watchdog assignments remain unchanged. D7 is unused. |
| Manufacturer interfaces | Rechecked the retained primary-source documents listed below against the circuit, including signal direction, voltage domains, polarity and physical viewing direction. The TPS4H160 diagnostic review confirms that THER is an input and the shared FAULT indication is not a unique temperature measurement. No external temperature fault is claimed. Physical compatibility holds remain explicit. |
| Export and visual inspection | The PDF has exactly one page. Each of the 126 wire IDs appears once in its text, and every component is represented. The six source SVG sections are embedded with separate IDs; their hashes and the wire/component registers are checked automatically. The PDF, SVG and PNG hashes are recorded together to reject stale exports. The full rendered page and enlarged circuit/table areas were reviewed for readability, polarity, crossings, missing labels and clipping. |

## Critical connections

The [electrical audit source register](hardware-audit-2026-10-07.md#source-register) links the manufacturer's documents. This review uses the retained source copies; it is not a new price or availability check.

| Primary source | Connection or behavior checked |
| :--- | :--- |
| U.S. Solid Manual 11917 / 5003X | Red power positive; black power negative; green command positive; white signal common; yellow feedback positive. One cable enters the integrated actuator. Signal-return compatibility remains H4. |
| Panasonic TQ catalog, standard single-side-stable bottom view | Coil 1 positive / 10 negative; normally-open paths 3–4 and 8–7. Unused positions remain disconnected. This is not a top-view footprint. |
| ST L78 datasheet | L7805ABV TO-220: 1 input, 2 ground, 3 output; grounded tab. Its relay supply remains separate from the Nano 5 V rail. D4 cathode goes to coil positive. |
| ScioSense UFM-02 Table 7 and pulse-interface application drawing | Red regulated 5 V, black return, yellow flow, white error. Each raw signal has its own 4.7 kohm pull-up, followed by a 1 kohm series resistor to D8/D9. The recorded table/prose pin-number discrepancy still requires a water/empty-tube check on the purchased meter. |
| DFRobot DFR1229 and SEN0262 documentation/schematics | Command source and analog feedback receiver remain distinct. SEN0262 uses nominal 120-ohm conversion. No extra 250-ohm shunt is installed. The current command never connects to A0. |
| PCB0046 V2 board drawing, schematic and HSD library | Separate logic/load supplies, shared module grounds, printed channel ordering, local I2C pull-up settings and reserved HSD3 channel 4 valve power. Lamp animations exclude this channel. |
| TI TPS4H160-Q1 datasheet, fault table and pin functions | Thermal protection is built in. THER selects behavior; it does not report temperature. Global FAULT covers several conditions. Hardware thermal retry does not authorize a firmware restart. |
| SparkFun BOB-09118 v1.2 and Nano Every pinout | Raw G/H/J retain external 1 kohm resistors and reverse diodes; opto HV receives 5 V. Conditioned inputs go to D2/D3/D4; A4/A5 serve I2C. D7 is unconnected. |

## Scope and open physical checks

H1–H5 remain open: actual machine connector cavities; existing fuse and conductor coordination; purchased part identities/revisions; valve signal-common and loop compliance; firmware and bench qualification. No flashable Arduino application or physical acceptance record exists. These checks establish the drawing's consistency, not field readiness. Removing drive power can leave the ball open; the manual water shutoff remains necessary.

Revision D has no permanent enclosure or actuator-temperature probes. Environmental limits and thermal bench qualification still apply. Fault 9 is reserved, while code 10 remains the stuck-J code. The simulator retains ten physical lamps and a full-width reset sweep.

The realistic assembly illustration is a layout concept. Its wire routing, component appearance and fittings do not override the schematic or connection register.

## Reproduction

```sh
python3 scripts/build-hardware-package.py
python3 scripts/build-single-page-schematic.py
node scripts/check-docs.mjs
node --test tests/hardware-netlist.test.cjs
npm run check
```

Generation requires Python 3, ReportLab, pypdf, DejaVu fonts and Inkscape. Review PDF renders after a circuit or layout change. The generator checks PDF page count and wire coverage; documentation checks compare the netlist, embedded circuits and export hashes. Simulator and browser results for the published commit are available in [GitHub Actions](https://github.com/aeae1/Rock-Saw-Water-Control/actions).
