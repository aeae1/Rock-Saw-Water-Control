# Revision G assembly views

Created 8 October 2026 using the built-in image-generation tool. These images supplement the circuit documentation and are mechanical assembly concepts. They do not revise the electrical design or establish enclosure dimensions, a drilling template, or a solder-by-hole carrier layout.

## Selected images

| Image | Purpose |
| :--- | :--- |
| [Complete assembly](assembly-complete-rev-g.png) | Closed enclosure, ten dual-color lamps, separate proportional valve, and external water hoses. The selected edit corrects the earlier rendering in which the inlet hose appeared to enter the enclosure. |
| [Enclosure interior](assembly-interior-rev-g.png) | Proposed placement of three lamp drivers, the controller carrier, two input boards, valve interface modules, and power distribution. |
| [Removable Arduino](assembly-carrier-rev-g.png) | Exploded mechanical concept of the Nano Every, sockets, perfboard, insulating standoffs, and mounting plate. Small circuit components and wiring are omitted. |

The [earlier component overview](assembly-concept-rev-g.png) and its [generation record](assembly-concept-rev-g-prompt.md) are retained for reference.

## Accuracy and construction limits

The chosen component types and quantities follow Revision G: one Nano Every, three Serial Wombat PCB0046 HSD boards, two SparkFun BOB-09118 input boards, one DFR1229 command module, one SEN0262 feedback module, ten dual-color lamps, and a stainless proportional valve with integrated actuator. No flow meter, temperature sensor, relay, or external watchdog is added.

The images retain generation errors in small PCB details, including terminal counts and numbering. They must not be used to identify pins, infer electrical connections, choose component footprints, or count individual conductors. The intended lamp allocation is eight outputs on HSD1, eight on HSD2, and four on HSD3; HSD3 channels 4–7 remain unconnected.

For wiring, use the [single-page schematic](water-controller-single-page-rev-g.pdf), [connection schedule](../../../hardware/rev-g/connections.csv), and [electrical audit](../../hardware-audit-rev-g.md). Actual board markings and documented revisions must be checked during assembly. Physical qualification remains outstanding.

The removable-carrier concept requires two 15-position, 2.54 mm female socket strips matching the Nano headers, plus suitable mechanical retention. Their selection and the carrier layout must be finalized before construction. A header socket does not establish vibration resistance by itself.

## Appearance references

Manufacturer images were consulted for the [Nano Every](https://www.sparkfun.com/arduino-nano-every.html), [PCB0046 HSD](https://www.serialwombat.com/p46), [BOB-09118](https://www.sparkfun.com/sparkfun-opto-isolator-breakout.html), [DFR1229](https://wiki.dfrobot.com/dfr1229/), and [SEN0262](https://wiki.dfrobot.com/sen0262/). The generated representations are not manufacturer photographs or approved installation drawings.

## Generation directions

The built-in tool was used for generation and subsequent edits; the CLI/API fallback was not used. The final directions were:

- **Complete assembly:** preserve the selected product image, ten lamps, valve, enclosure, input leads, labels, and lighting. Remove the hose segment that appeared to enter the enclosure. Route the inlet hose from the valve forward across the workbench, leaving visible space around the enclosure. Give the lamp and actuator cables separate glands; all water plumbing remains outside the enclosure.
- **Interior:** arrange the selected board types inside a gasketed enclosure with mounting spacers, short local control wiring, separate power distribution, and separate lamp/valve cable exits. Show four spare HSD3 outputs unwired. State that terminal details and physical fit remain illustrative. The requested terminal fidelity was not fully achieved; the limitations above control interpretation.
- **Carrier:** show a Nano Every above two matching female socket strips on perfboard, with insulating standoffs and a mounting plate below. Retain USB access, illustrate removable mechanical retention, and omit small circuit components and underside wiring. This is a mechanical explanation rather than a fabrication drawing.
