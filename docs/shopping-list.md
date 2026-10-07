# Shopping List — Revision E

7 October 2026 · USD · No permanent flow meter or temperature probes

[Detailed purchasing and enclosure notes](shopping-guide.md) · [Single-page wiring schematic](assets/hardware/water-controller-single-page-rev-e.pdf) · [Build guide](build-guide.md)

This is the primary shopping list, readable directly on GitHub or in any Markdown/text editor. It retains the parts, sellers and dated price assumptions from the current design; no spreadsheet is required.

**Planning total: $642.90.** This includes estimated tax, shipping and reserves, but excludes optional bench power supplies and additional tools. It is not a checkout quote. Published prices and allowances are distinguished below; Amazon search links do not identify a verified seller or approved exact product.

**Before ordering:** the three Serial Wombat boards still have unverified price/availability. Their $90 budget is an allowance. Final enclosure fit, harness/fuse compatibility and valve-interface qualification remain open; see the [electrical audit](hardware-audit-rev-e.md).

## Budget

| Item | Amount |
| :--- | ---: |
| Merchandise, including spare parts | $517.90 |
| Shipping allowances | $56.00 |
| Unquoted tariff/fee reserve | $20.00 |
| Estimated tax at 8.25% | $49.00 |
| **Total** | **$642.90** |

Of the merchandise budget, $251.90 uses previously observed published prices and $266.00 consists of allowances. Tax and shipping for the exact delivery address in ZIP 78023 have not been confirmed in checkout.

## Main purchases

Prices in the following tables are **line totals for the listed purchase quantity**, before tax and shipping. A set/lot is a budgeting quantity where exact dimensions or lengths remain to be selected. Reuse suitable supplies already owned.

### Controller and electrical interfaces

| Purchase quantity | Item | Seller / product link | Line total | Price basis and notes |
| :--- | :--- | :--- | ---: | :--- |
| 1 board | Arduino Nano Every ABX00028 | [SparkFun](https://www.sparkfun.com/arduino-nano-every.html) | $13.70 | Published. Combine with opto boards; Arduino direct is $12.90 before separate shipping. Headers required. |
| 1 board | DFRobot DFR1229 current command | [DFRobot](https://www.dfrobot.com/product-3073.html) | $15.90 | Published. 3.3–5 V supply; keep exact SKU. Direct shipping resumes Oct 8. |
| 1 board | DFRobot SEN0262 feedback receiver | [DFRobot](https://www.dfrobot.com/product-1755.html) | $4.90 | Published. 120-ohm receiver; analog output. Do not add a 250-ohm shunt in parallel. |
| 2 boards | SparkFun BOB-09118 v1.2 input boards | [SparkFun](https://www.sparkfun.com/sparkfun-opto-isolator-breakout.html) | $11.90 | Published. Three channels used; external input resistors/diodes still required. |
| 1 relay | Panasonic TQ2-5V nonlatching DPDT | [Mouser](https://www.mouser.com/en/ProductDetail/Panasonic-Industry/TQ2-5V?qs=HLLy2pIPwutHaTSpVfb1kw%3D%3D) | $1.94 | Published. Mouser showed stock at $1.94 on 7 Oct. DigiKey $2.36 backorder is an alternate. Exact nonlatching TQ2-5V only; verify physical pin orientation. |
| 1 regulator | ST L7805ABV TO-220 | [DigiKey](https://www.digikey.com/en/products/detail/stmicroelectronics/L7805ABV/634711) | $0.90 | Published. Dedicated relay-coil supply only; retain specified capacitors. |

### Ten lamps and their drivers

| Purchase quantity | Item | Seller / product link | Line total | Price basis and notes |
| :--- | :--- | :--- | ---: | :--- |
| 3 boards | Serial Wombat PCB0046 HSD V2 | [Serial Wombat](https://www.serialwombat.com/p46) | $90.00 | Allowance. PRICE/STOCK UNVERIFIED. $30 each is a budgeting placeholder, not a quotation. Procurement hold. |
| 1 10-pack | Nilight TL-248BW blue/white lamps | [Nilight direct](https://www.nilight.com/products/3-4inch-dual-color-marker-light-10pcs-blue-to-white-auxiliary-side-marker-bullet-clearance-indicator-lights-3-plug-connector-ip68-waterproof-for-trailer-truck-pickup-camper-rv-atv-utv-van-bus) | $25.99 | Published. Exact TL-248BW ten-pack: $25.99 observed; advertised free continental-US shipping over $19.99. Amazon price unverified. Common negative, separate blue/white positives; measure current. |

Lamp alternative: [Nilight ten-pack on Amazon](https://www.amazon.com/Nilight-Clearance-Indicator-Trailer-Warranty/dp/B0F7XP3QZB). Amazon price and marketplace seller remain unverified. [Serial Wombat manufacturer Amazon store](https://www.amazon.com/stores/SerialWombat/page/8AE4C563-9A41-45F5-B1CE-5BA3690D4918); confirm exact PCB0046 HSD V2 stock.

### Valve and plumbing

| Purchase quantity | Item | Seller / product link | Line total | Price basis and notes |
| :--- | :--- | :--- | ---: | :--- |
| 1 valve | U.S. Solid USS-MSV50030 / JFMSV50030 | [U.S. Solid](https://ussolid.com/products/1-2-proportional-motorized-ball-valve-stainless-steel-dc-9-24v-4-20ma-control-5-wire-ip67-full-port) | $105.29 | Published. 1/2-inch stainless; 9–24 V; five-wire 4–20 mA command and feedback. H4 qualification pending. |
| 1 set allowance | Manual shutoff and cleanable inlet strainer | [Amazon / local](https://www.amazon.com/s?k=garden+hose+shut+off+valve+inline+filter+brass) | $20.00 | Allowance. Reuse existing suitable items; select pressure rating and mesh for nozzle requirements. |
| 1 set allowance | Garden-hose to valve NPT fittings | [Amazon / local](https://www.amazon.com/s?k=3%2F4+GHT+to+1%2F2+NPT+brass+adapter) | $15.00 | Allowance. US garden hose thread is 3/4 GHT, distinct from 1/2 NPT valve threads. Include removable unions as required. |
| 1 small lot | Straight pipe, washers, supports and sealant | [Local / Amazon search](https://www.amazon.com/s?k=brass+1%2F2+NPT+pipe+nipple+plumbing) | $8.00 | Allowance. Choose supports and short pipe as the valve/hose layout requires; no meter-specific straight sections or NPS fittings. |

Water path: **hose → manual shutoff / strainer → proportional valve → saw sprayer**. The valve includes its motor/controller. Match 3/4-inch garden-hose thread to the valve’s 1/2-inch NPT ports with the correct genders. No meter or meter adapters are needed.

### Enclosure and weather protection

| Purchase quantity | Item | Seller / product link | Line total | Price basis and notes |
| :--- | :--- | :--- | ---: | :--- |
| 1 box | Hammond 1554VA2GY opaque polycarbonate | [AutomationDirect](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/miniature_cases/1554va2gy) | $43.50 | Published. Nominal 240 x 160 x 90 mm. Preferred planning size; confirm physical layout before drilling. |
| 1 plate | Hammond 1554VAPL mounting plate | [AutomationDirect](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/subpanels/1554vapl) | $9.25 | Published. Box plus plate clears advertised $49 free-shipping threshold; checkout confirmation still required. |
| 1 5-pack | Bimed BM-ENX-2S-W cable glands | [AutomationDirect](https://www.automationdirect.com/adc/shopping/catalog/wire_-a-_cable_management/cable_glands/metric_thread/bm-enx-2s-w) | $3.25 | Published. M12 x 1.5; jacket OD 3–6.5 mm. Use only where cable diameter fits; mounting hardware included. |
| 1 allowance | Larger glands, sealing plugs and seals | [AutomationDirect](https://www.automationdirect.com/adc/overview/catalog/wire_-a-_cable_management/cable_glands) | $8.00 | Allowance. Machine/display cable may need larger glands or matched multi-hole inserts; measure first. |
| 1 assembly allowance | Ten-lamp rail / rear wiring cover | [Local / Amazon](https://www.amazon.com/s?k=aluminum+u+channel+12+inch) | $15.00 | Allowance. Plan approximately 300 mm long; verify actual grommet diameter/pitch. No rated finished housing selected. |
| 1 bottle allowance | MG Chemicals 422C coating, small bottle | [Amazon / distributor](https://www.amazon.com/s?k=MG+Chemicals+422C+55ml) | $20.00 | Allowance. Later, after testing; mask contacts, connectors and vents. Not a substitute for the gasketed box. |

Preferred box: **Hammond 1554VA2GY**, nominal 240 × 160 × 90 mm, plus its 1554VAPL plate. Keep the **A** in the box part number. Confirm the physical layout before drilling. Cable glands must match the actual cable-jacket diameters.

### Wiring and assembly supplies

| Purchase quantity | Item | Seller / product link | Line total | Price basis and notes |
| :--- | :--- | :--- | ---: | :--- |
| 1 small lot | Exact resistors, diodes and capacitors | [DigiKey — six lots below](#exact-small-part-purchase-lots) | $12.02 | Published. Six exact part numbers with modest spares; installed and purchase quantities below. $12.02 at observed quantity breaks. |
| 1 set | FR4 perfboard, Nano headers and sockets | [Amazon](https://www.amazon.com/s?k=FR4+perfboard+2.54mm+headers+female+socket) | $8.00 | Allowance. Soldered carrier with secure mounting; ordinary loose Dupont jumpers are for bench use only. |
| 1 set | 12 V, 5 V and ground distribution terminals | [Amazon](https://www.amazon.com/s?k=covered+barrier+terminal+block+bus+bar) | $10.00 | Allowance. Three separate labeled buses. Quantity depends on harness layout; size to verified fuse and loads. |
| 1 assortment | Stranded copper internal hookup wire | [Amazon](https://www.amazon.com/s?k=stranded+copper+hookup+wire+22+awg+kit) | $10.00 | Allowance. 22 AWG signal wire planning only; load/feed gauges subject to H2. Avoid copper-clad aluminum. |
| 1 length allowance | Jacketed outdoor harness cable | [Amazon / local](https://www.amazon.com/s?k=outdoor+multiconductor+copper+control+cable) | $20.00 | Allowance. Measure runs first. Lamp loom needs twenty color conductors plus suitably sized common return(s). |
| 1 set | Locking sealed cable connectors | [Amazon / distributor](https://www.amazon.com/s?k=Deutsch+DT+sealed+connector+kit) | $12.00 | Allowance. Use genuine rated parts with matching wire seals. Reused 14-pin machine connector excluded. |
| 1 small lot | Heat shrink, ferrules, loom and labels | [Amazon](https://www.amazon.com/s?k=adhesive+lined+heat+shrink+ferrules+wire+labels) | $8.00 | Allowance. Adhesive-lined shrink at splices; secure cable strain relief. Reduce if already owned. |
| 1 small lot | Standoffs, fasteners and mounting brackets | [Amazon / local](https://www.amazon.com/s?k=nylon+pcb+standoff+M3+kit) | $7.00 | Allowance. Insulated board clearance above steel plate; mounting should not puncture the sealing cavity. |

### Bench accessories

| Purchase quantity | Item | Seller / product link | Line total | Price basis and notes |
| :--- | :--- | :--- | ---: | :--- |
| 1 set allowance | Temporary fused battery lead and small fuses | [Amazon / local](https://www.amazon.com/s?k=inline+ATO+fuse+holder+1A+2A+fuse) | $10.00 | Allowance. Bench only, close to battery; size fuse to test stage and weakest wire. Not a new machine fuse block. |
| 1 resistor | 250-ohm 0.1% 0.5 W removable test resistor | [DigiKey](https://www.digikey.com/en/products/detail/vishay-dale/RN65E2500BB14/3193953) | $3.36 | Published. Vishay RN65E2500BB14: 250 ohm, 0.1%, 0.5 W. Removable DAC bench load only; never add as a permanent valve/feedback shunt. |
| 1 cable allowance | Micro-USB data cable | [Amazon / existing](https://www.amazon.com/s?k=micro+usb+data+cable) | $5.00 | Allowance. Reuse if already owned. Must carry data, not charging-only. |

## Exact small-part purchase lots

These six lots are **already included** in the $12.02 resistors/diodes/capacitors line above. Do not add them to the budget twice. Buy quantities include spares. All six sellers are **DigiKey**.

| Circuit references | Part / purchase link | Specification | Installed | Buy | Lot total |
| :--- | :--- | :--- | ---: | ---: | ---: |
| R1, R2, R3, R4 | [MFR-50FTE52-1K](https://www.digikey.com/en/products/detail/yageo/MFR-50FTE52-1K/9147015) | 1 kohm, 1%, 0.5 W axial | 4 | 10 | $0.76 |
| R5 | [MFR-25FBF52-100K](https://www.digikey.com/en/products/detail/yageo/MFR-25FBF52-100K/13473) | 100 kohm, 1%, 0.25 W axial | 1 | 10 | $0.42 |
| D1, D2, D3, D4 | [1N4148 (onsemi)](https://www.digikey.com/en/products/detail/onsemi/1N4148/458603) | 1N4148 axial DO-35; band = cathode | 4 | 10 | $0.60 |
| C1, C5, C10, C11, C12 | [C315C104K5R5TA](https://www.digikey.com/en/products/detail/kemet/C315C104K5R5TA/12701330) | 100 nF, 50 V, X7R, radial | 5 | 10 | $4.88 |
| C4 | [SR305C334KARTR1](https://www.digikey.com/en/products/detail/kyocera-avx/SR305C334KARTR1/9948632) | 330 nF, 50 V, X7R, radial | 1 | 2 | $2.96 |
| C7, C8, C9 | [EEU-FC1V470B](https://www.digikey.com/en/products/detail/panasonic-industry/EEU-FC1V470B/16639056) | 47 uF, 35 V, 105 C, polarized radial | 3 | 5 | $2.40 |

The separate 250-ohm test resistor is listed under Bench accessories; it is a removable test load, not an extra resistor across the installed position receiver.

## Alternatives and optional tools

These are **excluded from the $642.90 total**. An alternative enclosure/controller replaces the corresponding base item; do not purchase both unless intentional. Optional supplies and tools add to the budget.

| Option | Seller / link | Listed price or allowance | Notes |
| :--- | :--- | ---: | :--- |
| Smaller Hammond 1554U2GY | [AutomationDirect](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/miniature_cases/1554u2gy) | $30.50 | Published; box only. 200 x 120 x 91 mm; consider only after measured two-level layout. Plate extra; smaller is harder to wire/service. |
| Nano Every from Arduino USA | [Arduino USA](https://store-usa.arduino.cc/products/nano-every) | $12.90 | Published; shipping extra below threshold. Same exact ABX00028; $0.80 cheaper but separate shipping may cost more. |
| FNIRSI DPS-150, without input adapter | [FNIRSI](https://www.fnirsi.com/products/dps-150) | $57.99 | Published; optional. CC/CV. Advertised DPS154 code subtracts $4 if accepted. Requires suitable higher-voltage DC/USB-C PD input; not an all-in-one AC supply. |
| Jesverty SPS-3010 AC bench supply | [Amazon; seller unverified](https://www.amazon.com/dp/B09YSJQWRG) | $60.00 | Allowance only; Amazon price unverified. Simpler all-in-one option if 110/120 V US version is near $60. Adjustable CC/CV; 10 A rating is not the current-limit setting. |
| Temperature-controlled soldering iron kit | [Amazon search](https://www.amazon.com/s?k=temperature+controlled+soldering+iron+kit) | $35.00 | Allowance; only if not owned. Includes suitable tip/stand; buy electronics solder and flux, not plumbing acid flux. |
| Stripper, appropriate crimper and step bit | [Amazon search](https://www.amazon.com/s?k=wire+stripper+ferrule+crimper+step+drill+bit) | $30.00 | Allowance; only if not owned. Match crimper to chosen contacts/ferrules. Ordinary pliers do not replace the correct contact crimp tool. |
| Electronics solder, flux and cleaning supplies | [Amazon search](https://www.amazon.com/s?k=electronics+solder+rosin+flux+isopropyl+alcohol) | $15.00 | Allowance; only if not owned. Allow complete cleaning/drying before coating. Reuse existing suitable supplies. |

The FNIRSI **DPS154** $4 coupon was advertised during the 7 October review but not redeemed; its input power adapter costs extra if not already owned. No verified U.S. Solid or Amazon discount is included.

## Shipping allowances by seller

These are per-basket estimates, not per-item shipping charges.

| Seller / basket | Allowance | Basis |
| :--- | ---: | :--- |
| [U.S. Solid](https://ussolid.com/policies/shipping-policy) | $10.00 | Allowance; weight-based checkout quote unavailable |
| [SparkFun](https://www.sparkfun.com/) | $8.00 | Allowance; combine Nano and both opto boards |
| [DFRobot](https://www.dfrobot.com/product-3073.html) | $8.00 | Allowance; combine both modules; shipping resumes Oct 8 |
| [DigiKey + Mouser](https://www.mouser.com/en/ProductDetail/Panasonic-Industry/TQ2-5V?qs=HLLy2pIPwutHaTSpVfb1kw%3D%3D) | $20.00 | Combined allowance for DigiKey passives/regulator and Mouser relay; neither is a destination quote |
| [AutomationDirect](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/miniature_cases/1554va2gy) | $0.00 | Advertised free shipping over $49; assumed eligible box/plate/glands basket |
| [Amazon / local / other](https://www.amazon.com/) | $10.00 | Allowance for Amazon/local/other purchases. Nilight advertises free continental-US shipping over $19.99; no additional lamp shipping included. |

The fee reserve is not an actual tariff calculation or a maximum. Confirm delivery charges, tax jurisdiction, applicable fees and coupon eligibility before payment.

## Reuse — do not purchase again

- Existing 14-pin machine connector/harness; verify cavity functions before use.
- Existing machine supply and wired ground return; no separate machine battery feed is listed.
- Existing hose, 12 V battery and multimeter.
- Suitable wire, fittings, tools and programming cable already owned.

No additional machine fuse block is included. The temporary fused battery test lead above is separate bench equipment. The installed circuit still requires verification that the existing machine fuse protects the added conductors.

## Purchase sequence

1. Confirm the driver-board source and the exact valve interface before ordering the entire system.
2. Obtain the small electronics and bench accessories for staged checks.
3. Measure board layout, cable sizes and lamp arrangement before buying layout-dependent enclosures, harnesses and connectors.
4. Complete testing before applying conformal coating. Full potting is not included.

The detailed [procurement guide](shopping-guide.md) contains coating, enclosure, battery-first testing, shipping and coupon explanations. The [source price data](shopping-data.json) records the same base quantities and allowances.
