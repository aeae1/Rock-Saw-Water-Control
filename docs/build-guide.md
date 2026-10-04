# Build and Wiring Plan

Reviewed 4 October 2026 · Revision C bench design · Hardware release on hold

**Use the [Revision C electrical audit and schematic](hardware-audit-2026-10-04.md) as the current connection reference.** It supersedes the earlier conceptual wiring and specifies every external connection. Download the [printable package](assets/hardware/water-controller-audit-rev-c.pdf), [wire schedule](../hardware/rev-c/connections.csv), and [parts schedule](../hardware/rev-c/bom.csv).

The selected assembly uses an Arduino Nano Every, a 1/2-inch stainless U.S. Solid USS-MSV50030 proportional valve, a four-wire ScioSense UFM-02-03NP4 flow meter, and ten common-negative 12 V blue/white lamps. Three Serial Wombat PCB0046 HSD V2 boards provide twenty lamp channels and a proposed supervised valve-power channel. Two documented SparkFun BOB-09118 input boards with external resistors condition G/H/J.

The circuit specification is complete for review and staged bench assembly. It is not a field construction release. The actual machine cavities, existing fuse/conductor coordination, purchased part revisions, valve signal-return/compliance behavior, and firmware/bench acceptance remain the five explicit release holds in the audit. No flashable Arduino firmware is supplied.

## Assembly relationships

1. The reused machine connector supplies nominal 12 V and a wired return. These feed the Nano VIN and HSD load inputs in parallel. The installation retains the existing fuse and adds no separate battery source or extra fuse block; its protection must be verified against the added wiring.
2. Nano 5 V supplies the low-voltage modules and sensors. Each raw G/H/J signal passes through its own 1 kohm resistor and opto input. Conditioned G/H/J reach D2/D3/D4.
3. A4/A5 provide the local I2C bus. The DAC is at 0x58; HSD boards use 0x60/61, 0x62/63 and 0x64/65. Use the DAC's onboard pull-ups and open all HSD pull-up jumpers.
4. Each lamp's blue and white lead has its own HSD output. Lamp black leads return to the load-ground distribution. HSD3 channel 4 is reserved for the valve watchdog; channels 5-7 remain OFF.
5. DFR1229 sends the valve's current command through a normally-open relay contact. SEN0262 receives position feedback through the other contact and feeds A0 through the specified filter/bias network.
6. HSD3 channel 4 supplies the valve and a dedicated 5 V relay-coil regulator. The local watchdog is intended to remove drive power and disconnect both signal positives if the host stops making verified progress. This path requires the acceptance tests in the audit; power removal does not guarantee water stops.
7. The meter receives regulated 5 V; yellow flow and white error connect through separate 4.7 kohm pull-ups and 1 kohm series resistors to D8/D9. Two powered DS18B20 temperature sensors share D7.
8. Plumbing remains separate: manual shutoff/appropriate strainer, meter and specified straight pipe, valve, then sprayer. No electrical wire connects to a hose or the stainless valve body.

The detailed audit includes component pin numbers, relay bottom-view orientation, HSD jumper/terminal orientation, all resistor/capacitor values, fault coverage, logging limits and a staged power-up procedure.

## Nano allocation

| Terminal | Revision C use |
| :--- | :--- |
| VIN / GND | Verified machine supply / wired return |
| 5 V | Low-voltage module/sensor supply; load and thermal qualification required |
| D2 / D3 / D4 | Conditioned G / H / J |
| D7 | Two DS18B20 sensors on powered 1-Wire bus |
| D8 / D9 | Flow pulse / error pulse inputs |
| A0 | Filtered, biased position-feedback voltage |
| A4 / A5 | SDA / SCL, local 100 kHz I2C |
| Other I/O | Unused; see the complete terminal schedule |
| USB | Programming and service; can power the logic rail |

## Budget status

The historical 3 October 2026 quotations were $12.90 for the Nano Every, $105.29 for the valve, $15.90 for DFR1229 and $4.90 for SEN0262, totaling $138.99. With the previously observed $25.99 lamp pack, that becomes $164.98. These are dated partial costs, not a current complete quote.

Three HSD boards, two input boards, the meter, relay/regulator, sensors, passive components, weatherproof enclosure, connectors and assembly materials are additional. **The current design has not been demonstrated to fit a $200 complete-build budget.** Unpriced items in [the budget BOM](bom.csv) are not free. The [Rev C parts schedule](../hardware/rev-c/bom.csv) controls circuit values; prices need a separate procurement pass.

Use a serviceable UV-resistant enclosure and strain-relieved connections. Qualify the complete enclosure temperature before coating or potting; the valve's 50 C ambient limit remains relevant. A truly constant supply keeps the controller alive with the key off and draws parked power. The current design does not add ignition sensing or a master switch implicitly.

The [firmware contract](../firmware/README.md), [fault policy](faults.md) and [validation plan](validation.md) remain requirements to implement and test, not evidence that physical protection already runs on an Arduino.
