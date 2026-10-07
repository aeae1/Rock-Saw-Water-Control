# Build and Wiring Plan

Reviewed 7 October 2026 · Revision E bench design · Hardware release on hold

**Use the [Revision E electrical audit and schematic](hardware-audit-rev-e.md) as the current connection reference.** It supersedes the earlier conceptual wiring and specifies every external connection. Download the [printable package](assets/hardware/water-controller-audit-rev-e.pdf), [wire schedule](../hardware/rev-e/connections.csv), and [parts schedule](../hardware/rev-e/bom.csv).

For the complete circuit on one sheet, use the [single-page schematic PDF](assets/hardware/water-controller-single-page-rev-e.pdf), drawn 7 October 2026. This is one continuous terminal-to-terminal drawing with all 114 wires and 43 components, joined power/ground rails and no off-sheet wire destinations. The [verification record](single-page-schematic-review-rev-e.md) describes the checks. Zoom or print at A0; use the existing booklet for smaller individual pages and physical pin orientation.

The selected assembly uses an Arduino Nano Every, a 1/2-inch stainless U.S. Solid USS-MSV50030 proportional valve and ten common-negative 12 V blue/white lamps. Three Serial Wombat PCB0046 HSD V2 boards provide twenty lamp channels and a proposed supervised valve-power channel. Two documented SparkFun BOB-09118 input boards with external resistors condition G/H/J.

The circuit specification is complete for review and staged bench assembly. It is not a field construction release. The actual machine cavities, existing fuse/conductor coordination, purchased part revisions, valve signal-return/compliance behavior, and firmware/bench acceptance remain the five explicit release holds in the audit. No flashable Arduino firmware is supplied.

## Assembly relationships

1. The reused machine connector supplies nominal 12 V and a wired return. These feed the Nano VIN and HSD load inputs in parallel. The installation retains the existing fuse and adds no separate battery source or extra fuse block; its protection must be verified against the added wiring.
2. Nano 5 V supplies the low-voltage modules. Each raw G/H/J signal passes through its own 1 kohm resistor and opto input. Conditioned G/H/J reach D2/D3/D4.
3. A4/A5 provide the local I2C bus. The DAC is at 0x58; HSD boards use 0x60/61, 0x62/63 and 0x64/65. Use the DAC's onboard pull-ups and open all HSD pull-up jumpers.
4. Each lamp's blue and white lead has its own HSD output. Lamp black leads return to the load-ground distribution. HSD3 channel 4 is reserved for the valve watchdog; channels 5-7 remain OFF.
5. DFR1229 sends the valve's current command through a normally-open relay contact. SEN0262 receives position feedback through the other contact and feeds A0 through the specified filter/bias network.
6. HSD3 channel 4 supplies the valve and a dedicated 5 V relay-coil regulator. The local watchdog is intended to remove drive power and disconnect both signal positives if the host stops making verified progress. This path requires the acceptance tests in the audit; power removal does not guarantee water stops.
7. D7, D8 and D9 are unused. The flow meter and its pull-ups, series resistors and bypass capacitor are removed. Valve position feedback to A0 is retained.

If G/H/J remain live while the main supply is off, the specified opto inputs still draw about 9 mA per asserted signal at 12 V, but should not power the Nano through its inputs. Their output-side HV terminals stay on the controller's own 5 V rail. See the [power-off input review and bench test](hardware-audit-rev-e.md#live-control-signals-with-main-power-off). A latched rocker can maintain this small draw even with the engine stopped; key-off behavior must be measured.
8. Plumbing remains separate: manual shutoff/appropriate strainer, valve, then sprayer. No electrical wire connects to a hose or the stainless valve body.

The detailed audit includes component pin numbers, relay bottom-view orientation, HSD jumper/terminal orientation, all resistor/capacitor values, fault coverage, logging limits and a staged power-up procedure.

## Nano allocation

| Terminal | Revision E use |
| :--- | :--- |
| VIN / GND | Verified machine supply / wired return |
| 5 V | Low-voltage module/sensor supply; load and thermal qualification required |
| D2 / D3 / D4 | Conditioned G / H / J |
| D7 / D8 / D9 | Unused; leave unconnected |
| A0 | Filtered, biased position-feedback voltage |
| A4 / A5 | SDA / SCL, local 100 kHz I2C |
| Other I/O | Unused; see the complete terminal schedule |
| USB | Programming and service; can power the logic rail |

## Budget status

The [Markdown shopping list](shopping-list.md) and [7 October procurement guide](shopping-guide.md) supersede earlier partial estimates for purchasing. The list includes sellers, product links, quantities, alternatives and prices; no spreadsheet is required. The conservative buy-everything budget is approximately $643 including estimated tax, shipping and fees, but excluding a bench supply and additional tools. It includes $266 in merchandise allowances, including $90 for unpriced driver boards; it is not a checkout quotation. Exact small-part numbers and purchase quantities are linked individually. Reuse of suitable wiring, fittings and supplies can reduce purchases.

**The current design does not fit a $200 complete-build budget.** Driver availability, valve interface qualification and the enclosure layout must be established before placing a complete order. Unpriced items in [the budget BOM](bom.csv) are not free. The [Rev E parts schedule](../hardware/rev-e/bom.csv) controls circuit values; [shopping data](shopping-data.json) distinguishes observed prices from estimates.

Use a serviceable UV-resistant enclosure and strain-relieved connections. Qualify the complete enclosure temperature before coating or potting; the valve's 50 C ambient limit remains relevant. A truly constant supply keeps the controller alive with the key off and draws parked power. The current design does not add ignition sensing or a master switch implicitly.

The preferred enclosure planning size is the opaque polycarbonate Hammond 1554VA2GY with 1554VAPL mounting plate. Confirm actual fit before drilling. The procurement guide covers a smaller alternative, cable glands, separate lamp-connection protection and removable coated electronics. It also describes the limited checks possible with an existing 12 V battery and multimeter; an adjustable current-limited supply is optional for starting assembly, while the full hardware acceptance sequence remains unverified.

The [firmware contract](../firmware/README.md), [fault policy](faults.md) and [validation plan](validation.md) remain requirements to implement and test, not evidence that physical protection already runs on an Arduino.
