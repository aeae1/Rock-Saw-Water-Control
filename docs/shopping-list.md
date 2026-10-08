# Shopping List — Revision G

Design updated 8 October 2026. USD. Retained product prices reviewed 7 October. **Planning budget, not a delivered quote to 78023.** Stock, shipping, checkout tax and coupons have not been reconfirmed. The 8.25% tax allowance is a budgeting assumption.

[Single-page schematic](assets/hardware/water-controller-single-page-rev-g.pdf) · [Firmware v1](../firmware/README.md) · [Electrical audit](hardware-audit-rev-g.md) · [Enclosure and bench notes](shopping-guide.md)

| Budget item | USD |
| :--- | ---: |
| Merchandise, including allowances | 512.10 |
| Shipping allowance | 46.00 |
| Unquoted fee/tariff reserve | 20.00 |
| Planning tax at 8.25% | 47.69 |
| **Planning total** | **625.79** |

Revision G removes Q1, R11 and R12. This saves $0.85 in purchased component lots ($0.92 including budgeted tax); the existing ten-pack of 1 kohm resistors remains. No reset transistor or extra watchdog board is required. The earlier $200 target remains unmet with the retained prebuilt architecture.

**Purchase order:** confirm PCB0046 HSD V2 availability and price with Serial Wombat first; its $30-per-board figure remains an unverified allowance. Then obtain the exact Nano, valve, DAC, receiver, input boards and lamps for bench verification. Buy enclosure glands, wire lengths and fittings after measuring the actual layout. Reuse suitable tools, connector, wiring and plumbing where available.

## Control

| Quantity | Item / seller | Unit USD | Basis and notes |
| :--- | :--- | ---: | :--- |
| 1 board | [Arduino Nano Every ABX00028](https://www.sparkfun.com/arduino-nano-every.html) — SparkFun | 13.70 | Published. Combine with opto boards; Arduino direct is $12.90 before separate shipping. Headers required. |
| 1 board | [DFRobot DFR1229 current command](https://www.dfrobot.com/product-3073.html) — DFRobot | 15.90 | Published. 3.3–5 V supply; keep exact SKU. Direct shipping resumes Oct 8. |
| 1 board | [DFRobot SEN0262 feedback receiver](https://www.dfrobot.com/product-1755.html) — DFRobot | 4.90 | Published. 120-ohm receiver; analog output. Do not add a 250-ohm shunt in parallel. |
| 2 board | [SparkFun BOB-09118 v1.2 input boards](https://www.sparkfun.com/sparkfun-opto-isolator-breakout.html) — SparkFun | 5.95 | Published. Three channels used; external input resistors/diodes still required. |

## Water

| Quantity | Item / seller | Unit USD | Basis and notes |
| :--- | :--- | ---: | :--- |
| 1 valve | [U.S. Solid USS-MSV50030 / JFMSV50030](https://ussolid.com/products/1-2-proportional-motorized-ball-valve-stainless-steel-dc-9-24v-4-20ma-control-5-wire-ip67-full-port) — U.S. Solid | 105.29 | Published. 1/2-inch stainless; 9–24 V; five-wire 4–20 mA command and feedback. H4 qualification pending. |
| 1 set allowance | [Manual shutoff and cleanable inlet strainer](https://www.amazon.com/s?k=garden+hose+shut+off+valve+inline+filter+brass) — Amazon / local | 20.00 | Allowance. Reuse existing suitable items; select pressure rating and mesh for nozzle requirements. |
| 1 set allowance | [Garden-hose to valve NPT fittings](https://www.amazon.com/s?k=3%2F4+GHT+to+1%2F2+NPT+brass+adapter) — Amazon / local | 15.00 | Allowance. US garden hose thread is 3/4 GHT, distinct from 1/2 NPT valve threads. Include removable unions as required. |
| 1 small lot | [Straight pipe, washers, supports and sealant](https://www.amazon.com/s?k=brass+1%2F2+NPT+pipe+nipple+plumbing) — Local | 8.00 | Allowance. Choose supports and short pipe as the valve/hose layout requires; no meter-specific straight sections or NPS fittings. |

## Display

| Quantity | Item / seller | Unit USD | Basis and notes |
| :--- | :--- | ---: | :--- |
| 3 board | [Serial Wombat PCB0046 HSD V2](https://www.serialwombat.com/p46) — Serial Wombat | 30.00 | Allowance. PRICE/STOCK UNVERIFIED. $30 each is a budgeting placeholder, not a quotation. Procurement hold. |
| 1 10-pack | [Nilight TL-248BW blue/white lamps](https://www.nilight.com/products/3-4inch-dual-color-marker-light-10pcs-blue-to-white-auxiliary-side-marker-bullet-clearance-indicator-lights-3-plug-connector-ip68-waterproof-for-trailer-truck-pickup-camper-rv-atv-utv-van-bus) — Nilight direct | 25.99 | Published. Exact TL-248BW ten-pack: $25.99 observed; advertised free continental-US shipping over $19.99. Amazon price unverified. Common negative, separate blue/white positives; measure current. |

## Assembly

| Quantity | Item / seller | Unit USD | Basis and notes |
| :--- | :--- | ---: | :--- |
| 1 small lot | [Small electronic parts](https://www.digikey.com/en/products/detail/yageo/MFR-50FTE52-1K/9147015) — DigiKey | 9.06 | Published. Five exact resistor/diode/capacitor lots with spares. No Q1/R11/R12; retain three HSD bypass pairs. |
| 1 set | [FR4 perfboard, Nano headers and sockets](https://www.amazon.com/s?k=FR4+perfboard+2.54mm+headers+female+socket) — Amazon | 8.00 | Allowance. Soldered carrier with secure mounting; ordinary loose Dupont jumpers are for bench use only. |
| 1 set | [12 V, 5 V and ground distribution terminals](https://www.amazon.com/s?k=covered+barrier+terminal+block+bus+bar) — Amazon | 10.00 | Allowance. Three separate labeled buses. Quantity depends on harness layout; size to verified fuse and loads. |
| 1 assortment | [Stranded copper internal hookup wire](https://www.amazon.com/s?k=stranded+copper+hookup+wire+22+awg+kit) — Amazon | 10.00 | Allowance. 22 AWG signal wire planning only; load/feed gauges subject to H2. Avoid copper-clad aluminum. |
| 1 length allowance | [Jacketed outdoor harness cable](https://www.amazon.com/s?k=outdoor+multiconductor+copper+control+cable) — Amazon / local | 20.00 | Allowance. Measure runs first. Lamp loom needs twenty color conductors plus suitably sized common return(s). |
| 1 set | [Locking sealed cable connectors](https://www.amazon.com/s?k=Deutsch+DT+sealed+connector+kit) — Amazon / distributor | 12.00 | Allowance. Use genuine rated parts with matching wire seals. Reused 14-pin machine connector excluded. |
| 1 small lot | [Heat shrink, ferrules, loom and labels](https://www.amazon.com/s?k=adhesive+lined+heat+shrink+ferrules+wire+labels) — Amazon | 8.00 | Allowance. Adhesive-lined shrink at splices; secure cable strain relief. Reduce if already owned. |
| 1 small lot | [Standoffs, fasteners and mounting brackets](https://www.amazon.com/s?k=nylon+pcb+standoff+M3+kit) — Amazon / local | 7.00 | Allowance. Insulated board clearance above steel plate; mounting should not puncture the sealing cavity. |

## Enclosure

| Quantity | Item / seller | Unit USD | Basis and notes |
| :--- | :--- | ---: | :--- |
| 1 box | [Hammond 1554VA2GY opaque polycarbonate](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/miniature_cases/1554va2gy) — AutomationDirect | 43.50 | Published. Nominal 240 x 160 x 90 mm. Preferred planning size; confirm physical layout before drilling. |
| 1 plate | [Hammond 1554VAPL mounting plate](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/subpanels/1554vapl) — AutomationDirect | 9.25 | Published. Box plus plate clears advertised $49 free-shipping threshold; checkout confirmation still required. |
| 1 5-pack | [Bimed BM-ENX-2S-W cable glands](https://www.automationdirect.com/adc/shopping/catalog/wire_-a-_cable_management/cable_glands/metric_thread/bm-enx-2s-w) — AutomationDirect | 3.25 | Published. M12 x 1.5; jacket OD 3–6.5 mm. Use only where cable diameter fits; mounting hardware included. |
| 1 allowance | [Larger glands, sealing plugs and seals](https://www.automationdirect.com/adc/overview/catalog/wire_-a-_cable_management/cable_glands) — AutomationDirect | 8.00 | Allowance. Machine/display cable may need larger glands or matched multi-hole inserts; measure first. |
| 1 assembly allowance | [Ten-lamp rail / rear wiring cover](https://www.amazon.com/s?k=aluminum+u+channel+12+inch) — Local / Amazon | 15.00 | Allowance. Plan approximately 300 mm long; verify actual grommet diameter/pitch. No rated finished housing selected. |
| 1 bottle allowance | [MG Chemicals 422C coating, small bottle](https://www.amazon.com/s?k=MG+Chemicals+422C+55ml) — Amazon / distributor | 20.00 | Allowance. Later, after testing; mask contacts, connectors and vents. Not a substitute for the gasketed box. |

## Bench

| Quantity | Item / seller | Unit USD | Basis and notes |
| :--- | :--- | ---: | :--- |
| 1 set allowance | [Temporary fused battery lead and small fuses](https://www.amazon.com/s?k=inline+ATO+fuse+holder+1A+2A+fuse) — Amazon / local | 10.00 | Allowance. Bench only, close to battery; size fuse to test stage and weakest wire. Not a new machine fuse block. |
| 1 resistor allowance | [250-ohm 0.1% 0.5 W removable test resistor](https://www.digikey.com/en/products/detail/vishay-dale/RN65E2500BB14/3193953) — DigiKey | 3.36 | Published. Vishay RN65E2500BB14: 250 ohm, 0.1%, 0.5 W. Removable DAC bench load only; never add as a permanent valve/feedback shunt. |
| 1 cable allowance | [Micro-USB data cable](https://www.amazon.com/s?k=micro+usb+data+cable) — Amazon / existing | 5.00 | Allowance. Set quantity to zero if owned. Must carry data, not charging-only. |

## Small electronic parts

Included above; do not add again.

| References | Product / seller / specification | Installed / buy | Unit USD | Lot USD |
| :--- | :--- | ---: | ---: | ---: |
| R1, R2, R3, R4 | [MFR-50FTE52-1K](https://www.digikey.com/en/products/detail/yageo/MFR-50FTE52-1K/9147015) — DigiKey; 1 kohm, 1%, 0.5 W axial | 4 / 10 | 0.076 | 0.76 |
| R5 | [MFR-25FBF52-100K](https://www.digikey.com/en/products/detail/yageo/MFR-25FBF52-100K/13473) — DigiKey; 100 kohm, 1%, 0.25 W axial | 1 / 10 | 0.042 | 0.42 |
| D1, D2, D3 | [1N4148 (onsemi)](https://www.digikey.com/en/products/detail/onsemi/1N4148/458603) — DigiKey; 1N4148 axial DO-35; band = cathode | 3 / 10 | 0.060 | 0.60 |
| C1, C10, C11, C12 | [C315C104K5R5TA](https://www.digikey.com/en/products/detail/kemet/C315C104K5R5TA/12701330) — DigiKey; 100 nF, 50 V, X7R, radial | 4 / 10 | 0.488 | 4.88 |
| C7, C8, C9 | [EEU-FC1V470B](https://www.digikey.com/en/products/detail/panasonic-industry/EEU-FC1V470B/16639056) — DigiKey; 47 uF, 35 V, 105 C, polarized radial | 3 / 5 | 0.480 | 2.40 |

Component lots total **$9.06**. Keep all three HSD 47 µF / 100 nF bypass pairs.

## Alternatives and optional tools

Excluded from the main basket.

| Type | Option | USD | Notes |
| :--- | :--- | ---: | :--- |
| Enclosure | [Smaller Hammond 1554U2GY](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/miniature_cases/1554u2gy) | 30.50 | Published; box only. 200 x 120 x 91 mm; consider only after measured two-level layout. Plate extra; smaller is harder to wire/service. |
| Controller | [Nano Every from Arduino USA](https://store-usa.arduino.cc/products/nano-every) | 12.90 | Published; shipping extra below threshold. Same exact ABX00028; $0.80 cheaper but separate shipping may cost more. |
| Bench supply | [FNIRSI DPS-150, without input adapter](https://www.fnirsi.com/products/dps-150) | 57.99 | Published; optional. CC/CV. Advertised DPS154 code subtracts $4 if accepted. Requires suitable higher-voltage DC/USB-C PD input; not an all-in-one AC supply. |
| Bench supply | [Jesverty SPS-3010 AC bench supply](https://www.amazon.com/dp/B09YSJQWRG) | 60.00 | Allowance only; Amazon price unverified. Simpler all-in-one option if 110/120 V US version is near $60. Adjustable CC/CV; 10 A rating is not the current-limit setting. |
| Lamp drivers | [MIKROE-6074 IPD Click TPD2015](https://www.mikroe.com/ipd-click-tpd2015) | 29.00 | Published 4 Oct; out of stock at that review; excluded comparison only. Eight high-side channels, but not a drop-in: different interface, extra I/O hardware and watchdog/diagnostic redesign. Do not buy as a substitute. |
| Valve command | [DFRobot DFR0972](https://www.dfrobot.com/product-3073.html) | 9.90 | Published comparison price observed 4 Oct; excluded option. Not selected: 18–24 V power requirement adds another converter to this nominal-12 V project. |
| Tools | [Temperature-controlled soldering iron kit](https://www.amazon.com/s?k=temperature+controlled+soldering+iron+kit) | 35.00 | Allowance; only if not owned. Includes suitable tip/stand; buy electronics solder and flux, not plumbing acid flux. |
| Tools | [Stripper, appropriate crimper and step bit](https://www.amazon.com/s?k=wire+stripper+ferrule+crimper+step+drill+bit) | 30.00 | Allowance; only if not owned. Match crimper to chosen contacts/ferrules. Ordinary pliers do not replace the correct contact crimp tool. |
| Consumables | [Electronics solder, flux and cleaning supplies](https://www.amazon.com/s?k=electronics+solder+rosin+flux+isopropyl+alcohol) | 15.00 | Allowance; only if not owned. Allow complete cleaning/drying before coating. Reuse existing suitable supplies. |

## Shipping and reused parts

| Seller | Allowance USD | Basis |
| :--- | ---: | :--- |
| [U.S. Solid](https://ussolid.com/policies/shipping-policy) | 10.00 | Allowance; weight-based checkout quote unavailable |
| [SparkFun](https://www.sparkfun.com/) | 8.00 | Allowance; combine Nano and both opto boards |
| [DFRobot](https://www.dfrobot.com/product-3073.html) | 8.00 | Allowance; combine both modules; shipping resumes Oct 8 |
| [DigiKey](https://www.digikey.com/) | 10.00 | Allowance for one component basket; no destination checkout quote. |
| [AutomationDirect](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/miniature_cases/1554va2gy) | 0.00 | Advertised free shipping over $49; assumed eligible box/plate/glands basket |
| [Amazon / local / other](https://www.amazon.com/) | 10.00 | Allowance for Amazon/local/other purchases. Nilight advertises free continental-US shipping over $19.99; no additional lamp shipping included. |

Reuse the existing 14-pin machine connector; it is not a purchase item. The schematic represents it only by incoming wires named **12 V, 0 V, J, H, G**. IN is that drawing boundary. No flow meter, temperature probe, relay, external watchdog or Q1/R11/R12 is required. Existing multimeter and 12 V battery are assumed. A temporary fused battery test lead is included only for the bench, not as a new machine fuse block.
