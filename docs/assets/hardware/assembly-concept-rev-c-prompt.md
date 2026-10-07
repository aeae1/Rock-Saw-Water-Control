# Assembly illustration provenance

Created 6 October 2026 with the built-in image generation tool. Physical layout concept only; component appearance, harness routing and fittings are illustrative. The precise connections are specified by the Revision C netlist and circuit sheets.

## Initial prompt

```
Use case: product-mockup.
Asset: realistic assembly illustration for the GitHub README of Rock Saw Water Control.
Input image 1 is a STYLE AND COMPOSITION REFERENCE for the older assembly concept. Make a NEW updated Revision C illustration in the same polished realistic technical-product photography style. It is a physical layout concept, not a pin-by-pin schematic; do not invent exact terminal assignments.

Scene: everything splayed out neatly on a pale warm-gray workshop tabletop, viewed almost directly from above with slight three-dimensional perspective and soft realistic shadows. Large, very crisp landscape image, roughly 4:3. Navy typography, modest red accent, attractive clear spacing. All electronics visible outside an enclosure. Show realistic solder masks, terminal blocks, screw heads, braided cable sleeves, wire insulation, brass fittings and brushed stainless steel.

Heading exactly: "ROCK-SAW WATER CONTROL"
Subtitle exactly: "Revision C • Arduino assembly concept"

Top row: EXACTLY TEN round black-bezel blue/white 12 V marker lamps, numbered 1 through 10 once each from left to right. Lamps 1-4 glow blue; lamps 5-10 glow white. Each lamp has three wires, with harnesses gathered neatly to the lamp boards below. Label "10 blue / white 12 V lamps".

Middle electronics: one small teal Arduino Nano Every mounted on a practical terminal carrier at left. To its right, EXACTLY THREE matching prebuilt Serial Wombat PCB0046 HSD boards, white PCBs, prominent black chips and green screw terminals. Label the group "3 × Serial Wombat PCB0046 HSD". Individual board captions "Lamps 1–4", "Lamps 5–8", and "Lamps 9–10 + valve watchdog". A small group sublabel reads "20 lamp outputs • 1 valve output • 3 spare". Wire looms visibly connect these boards, with separate color-coded power and logic bundles. Show the conceptual grouping, not readable tiny pin numbers.

Lower left: the reused black circular 14-pin machine connector, connected by a short black jacketed harness to compact 12 V, 5 V and ground distribution terminals. Clearly label "Reused 14-pin connector" and "Machine power + G / H / J". NO separate battery, NO fuse block. Two small red TWO-CHANNEL SparkFun-style optoisolator boards, not one four-channel board, with a tidy small supporting resistor/diode carrier beside them. Label "2 × BOB-09118 input boards" and "G / H / J conditioning". Their low-voltage harness goes to the Nano. Include a small inset of the vertical G/H rocker and right joystick with red trigger J, physically plausible compact machine joystick.

Lower middle: distinct small green modules labeled "DFR1229" with "4–20 mA command" and "SEN0262" with "Position feedback". Beside them, one modest small perfboard with a miniature sealed signal relay, TO-220 regulator and supporting passives, labeled "Valve power / signal disconnect" and small "TQ2 relay + dedicated regulator". A branch from the THIRD HSD board goes to this valve-power area. Command and feedback wiring conceptually pass through this relay interface. ONE five-conductor actuator cable containing red, black, green, white and yellow wires goes from this interface area into the BLUE ACTUATOR HOUSING of the valve. Absolutely no electrical wire connects to the hose, brass fitting or stainless valve body. Do NOT draw a separate valve motor.

Bottom plumbing, well separated from electronics: left-to-right garden hose inlet, compact manual shutoff and cleanable strainer, straight run, compact inline ScioSense flow-meter assembly, straight run, 1/2-inch stainless U.S. Solid proportional motorized ball valve with its blue actuator housing, hose outlet to saw sprayer. Include visibly generous straight pipe on BOTH sides of the meter. Adapters are illustrative and not detailed thread specifications. Meter has a small protective electronics cover and its OWN four-wire electrical cable returning UP to the 5 V / Arduino interface area, clearly separate from the five-wire valve cable. Label "ScioSense UFM-02-03NP4" and "5 V flow meter". Valve label "U.S. Solid USS-MSV50030" and "1/2-inch stainless proportional valve". Water path labels "Garden hose in" and "To saw sprayer" with left-to-right arrows, no electrical wire-like arrows.

Include two small three-lead temperature-sensor assemblies, one near the controller and one near the actuator, with slim sensor cables returning toward the Arduino; group label "2 × DS18B20 temperature sensors". Do not depict them as extra flow meters.

Keep the diagram understandable without cramming individual resistors, circuit symbols or precise pin maps into it. Cable harnesses should terminate at modules, with plausible routing and no wires disappearing into text. Board appearances and fittings are illustrative. No giant empty electrical boxes, no enclosure enclosing the arrangement, no PCA9685, no 250-ohm feedback resistor substituted for SEN0262, no generic four-channel input module, no extra lamps, no spare motor, no duplicate valves. Do not copy the outdated four-spare caption from the reference.

Footer exactly: "ASSEMBLY CONCEPT • Use the Revision C schematic for wiring • Component appearance and fittings illustrative"
```

## Targeted correction prompt

```
Use case: precise-object-edit. Edit this existing realistic Revision C assembly illustration. Preserve the overall composition, every label, typography, all ten lamps, all three lamp driver boards, Arduino, two red input boards, the command and feedback modules, relay board, and all plumbing exactly as currently shown. Make ONLY these local corrections:
1. The ScioSense flow meter currently has a short four-color wire loop that ends at the metal pipe fitting on its right. REMOVE that loop completely. Instead show one FOUR-conductor cable (red, black, white, yellow, thin wires gathered in a small black protective sleeve) exiting the BLUE ELECTRONICS CAP on top of the meter, routing toward the LEFT along the space ABOVE the plumbing, then UP along the left side of the green DFR1229 module to join the low-voltage terminal carrier beside the Arduino. The cable must visibly terminate at an electrical connector on that carrier. Route neatly around the text rather than across it. No cable or wire ends in plumbing, fittings, hose, or a valve body. Preserve the separate FIVE-wire cable going into the blue U.S. Solid actuator housing.
2. There are currently four gold-tipped sensor probes. Remove the two UNLABELED probes and their short leads located immediately ABOVE the Arduino, between the lamps and the Nano. Keep exactly the two probes beside the existing caption "2 × DS18B20 temperature sensors", just above the small green DFR1229/SEN0262 modules. Keep their electrical leads visibly running toward the Arduino terminal carrier. Restore the pale tabletop behind the removed pair.
3. The leader arrow of the "5-wire valve cable" caption should point to the five colored conductors between the RIGHT side of the relay board and the BLUE valve actuator, not to the incoming power loom above the relay board. Move only the leader arrow, not the caption.
Everything else unchanged. This is an assembly concept, not a pin-by-pin wiring schematic; keep its footer intact.
```

