# Procurement and Enclosure Plan

Reviewed 4 October 2026 · USD · Revision C bench design

**[Download the editable shopping workbook](assets/procurement/shopping-list.xlsx)** · [Electrical audit](hardware-audit-2026-10-04.md) · [Exact circuit parts](../hardware/rev-c/bom.csv)

This guide includes the controller, twenty lamp channels, proportional valve, flow meter, enclosure materials, assembly supplies and temporary bench accessories. It does not authorize substitutions in the Revision C schematic. There is no flashable Arduino application yet; simulator tests do not qualify assembled electronics.

## Cost and purchase status

The conservative **buy-everything planning total is approximately $747**, excluding a bench supply and tools that may already be owned. This is **not a delivered quotation**: $339 of the $624 merchandise budget consists of explicit allowances. These include $90 for the three unpriced driver boards, $85 for wiring/assembly materials, and allowances for plumbing and secondary housings. Actual purchases may be lower when suitable materials are reused, or higher when unresolved parts are quoted.

| Budget component | USD |
| :--- | ---: |
| Items with observed published prices, including the backordered relay | 285.37 |
| Merchandise allowances, including the lamp pack and unpriced drivers | 338.99 |
| Merchandise subtotal | 624.36 |
| Combined shipping allowances | 46.00 |
| Unquoted tariff/fee reserve | 20.00 |
| Estimated tax at 8.25% on the above | 56.95 |
| **Planning total; supply and additional tools excluded** | **747.31** |

The earlier $200 goal is not met by this design. The valve, meter, lamp pack, Nano and command/feedback boards alone are approximately $225 before tax, drivers or housing. Substituting an inexpensive Arduino clone would not solve that gap. A firm $200 ceiling would require a substantially simpler design and a new electrical review. The current list should not be interpreted as a recommendation to purchase $747 of parts immediately.

**Resolve these before placing the complete order:**

- **Driver procurement:** PCB0046 HSD V2 price and retail stock could not be verified. Its $30/unit allowance is invented only as an editable budget assumption, not a supplier offer. Confirm the exact V2 boards before buying the rest of the harness or cutting the enclosure.
- **Relay availability:** DigiKey lists TQ2-5V at $2.36 but shows zero stock and an expected November 4 replenishment. [Mouser lists the same part](https://www.mouser.com/en/ProductDetail/Panasonic-Industry/TQ2-5V?qs=HLLy2pIPwutHaTSpVfb1kw%3D%3D); verify its US stock at checkout. Do not substitute a latching TQ2-L relay.
- **Meter plumbing:** the NP4 meter has **3/8-inch NPS straight threads**. Its adapters and sealing geometry remain unselected. A generic NPT coupling or hydraulic cone-seat NPSM swivel is not automatically compatible. Obtain the mating detail from ScioSense or inspect the actual sealing faces before ordering fittings.
- **Physical fit:** confirm board dimensions, mounting holes, connector heights, cable diameters and wire bends before drilling. Neither enclosure option below has a completed mechanical layout.
- The electrical audit's H1–H5 machine, protection, component, valve-interface and firmware/bench holds remain open. In particular, the five-wire valve's shared returns and loop compliance still require verification.

## Controller, valve and sensors

Prices below exclude tax and shipping unless stated. A published price does not establish in-stock availability or delivery to a particular address.

| Type / quantity | Preferred item and purchase link | Price | Alternative or selection note |
| :--- | :--- | ---: | :--- |
| Controller, 1 | [Nano Every ABX00028 at SparkFun](https://www.sparkfun.com/arduino-nano-every.html) | $13.70 | [Arduino USA](https://store-usa.arduino.cc/products/nano-every) lists $12.90. Combine SparkFun with both input boards if that avoids another shipping charge. Verify supplied headers; allow two 15-pin rows and sockets. |
| Valve, 1 | [U.S. Solid USS-MSV50030 / JFMSV50030](https://ussolid.com/products/1-2-proportional-motorized-ball-valve-stainless-steel-dc-9-24v-4-20ma-control-5-wire-ip67-full-port) | $105.29 | Selected 1/2-inch stainless, five-wire 4–20 mA model. Integrated actuator; no extra motor, H-bridge or Tuya controller. Match the exact SKU, not merely the blue housing. |
| Current command, 1 | [DFRobot DFR1229](https://www.dfrobot.com/product-3073.html) | $15.90 | Keep this low-voltage-powered model. The $9.90 DFR0972 comparison model requires 18–24 V, adding a converter for this project. |
| Feedback receiver, 1 | [DFRobot SEN0262](https://www.dfrobot.com/product-1755.html) | $4.90 | Its cost is small; retain the documented receiver and input filter rather than redesigning around a bare 250-ohm shunt. |
| Input interface, 2 | [SparkFun BOB-09118](https://www.sparkfun.com/sparkfun-opto-isolator-breakout.html) | $5.95 each | Four available opto channels; use three. External resistors/diodes remain necessary. Generic PC817 boards vary in input and output wiring and are not a qualified replacement. |
| Lamp drivers, 3 | [Serial Wombat PCB0046 HSD V2](https://www.serialwombat.com/p46) | **Unverified** | [Manufacturer's Amazon store](https://www.amazon.com/stores/SerialWombat/page/8AE4C563-9A41-45F5-B1CE-5BA3690D4918). Confirm exact model/stock. Budget contains $90 total solely as an allowance. |
| Lamps, 10 | [Nilight TL-248BW, Amazon listing](https://www.amazon.com/Nilight-Clearance-Indicator-Trailer-Warranty/dp/B0F7XP3QZB) | $25.99 allowance / pack | Amazon checkout price unavailable. Another brand can work if it has separate blue and white positives, common negative, suitable 12 V operation and measured current. Appearance alone is insufficient. |
| Flow meter, 1 | [ScioSense UFM-02-03NP4 at DigiKey](https://www.digikey.com/en/products/detail/sciosense/UFM-02-03NP4-3-8-NPS-PULSE-4-WIRE/29771278) | $59.66 | Four-wire pulse version, not SPI. DigiKey showed stock but warns that a US tariff may apply. Electronics need separate weather protection. |
| Signal-disconnect relay, 1 | [Panasonic TQ2-5V](https://www.digikey.com/en/products/detail/panasonic-industry/TQ2-5V/251773) | $2.36, backorder | Use the nonlatching DPDT part specified in the drawing. It disconnects signal circuits; it is not the twenty-channel lamp driver. |
| Relay regulator, 1 | [ST L7805ABV](https://www.digikey.com/en/products/detail/stmicroelectronics/L7805ABV/634711) | $0.96 | TO-220 part for the relay coil only. Its pin orientation and capacitors are specified in Revision C. |
| Temperature sensors, 2 | [Genuine DS18B20+ TO-92](https://www.digikey.com/en/products/detail/analog-devices-inc-maxim-integrated/DS18B20/956983) | $7.35 each | One enclosure sensor and one protected actuator-region sensor. Cheap prewired probes are an alternative only after pinout, authenticity, response and sealing checks. |

The Nano Every is retained: it accepts the nominal machine supply at VIN, has 5 V logic and avoids changing every interface. Its regulated 5 V rail supplies the logic and meter; **12 V never goes to a Nano I/O pin or meter wire**. The lamp/valve power paths bypass the Nano's regulator. Actual peripheral current and enclosed temperature still need measurement.

The three HSD boards serve twenty lamp colors and the proposed separate valve-power watchdog output. A PCA9685 alone is neither a 12 V power switch nor a twenty-channel replacement. Mechanical relay banks are unsuitable for the repeated animation duty. [MIKROE-6074 IPD Click](https://www.mikroe.com/ipd-click-tpd2015) is a documented eight-channel high-side alternative at $29, but the manufacturer showed it out of stock; its control interface and supervision would require a redesign. It is not included in the purchase list.

## Enclosures and weather protection

**Preferred main box: Hammond 1554VA2GY, opaque light-gray polycarbonate, nominal 240 × 160 × 90 mm (about 9.4 × 6.3 × 3.5 inches).** It offers a reasonable first-build compromise between compactness and access to terminals. Keep the valve, water fittings and meter plumbing outside the electronics compartment.

| Option | Box price | Notes |
| :--- | ---: | :--- |
| [Hammond 1554VA2GY](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/miniature_cases/1554va2gy), preferred | $43.50 | Add [1554VAPL plate](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/subpanels/1554vapl), $9.25. Box + plate = $52.75, or **$57.10 with estimated 8.25% tax** if advertised free shipping applies. |
| [Hammond 1554U2GY](https://www.automationdirect.com/adc/shopping/catalog/enclosures_-a-_racks/miniature_cases/1554u2gy), compact candidate | $30.50 | Nominal 200 × 120 × 90 mm. Smaller footprint, likely needs two mounting levels and more difficult cable routing. Plate extra; do not buy until fit is demonstrated. |
| Generic Amazon gasketed box | Not quoted | Only consider a documented UV-resistant polycarbonate model with a credible ingress rating and usable internal dimensions. Many inexpensive look-alikes are ABS; no exact generic model is approved here. |

[Hammond documents UV stabilization and IP66/IP67/IP68 testing for these polycarbonate models](https://www.hammfg.com/electronics/small-case/plastic/1554). Select **1554VA2GY**, with the `A`: the similarly named 1554V2GY has different published enclosure ratings. Ratings apply to the manufactured enclosure; drilled holes, lamp penetrations and cable entries need their own appropriate seals. An IP68 marking does not mean unlimited submersion or pressure-washer resistance.

Plan a removable plate with boards on standoffs, access to USB, separate load and signal wiring, and enough clearance to tighten each terminal. Use external mounting features or sealed specified hardware rather than casually drilling mounting holes through the wet boundary. Keep the lid gasket clean and close it to the manufacturer's instructions. Shade the box where possible; the valve's 50 °C ambient limit remains a constraint even if other parts tolerate more heat.

For cable entries, [Bimed BM-ENX-2S-W](https://www.automationdirect.com/adc/shopping/catalog/wire_-a-_cable_management/cable_glands/metric_thread/bm-enx-2s-w) is a documented **$3.25 five-pack**, M12 × 1.5, for **3–6.5 mm cable outside diameter**, with mounting hardware. Other cables will need different sizes. A normal gland seals around one round cable jacket; several loose wires shoved through one hole leave leak paths. Use a matching multi-hole insert or proper jacketed cable. Put entries low or downward with drip loops and strain relief. Seal unused holes with rated plugs.

The ten lamps also need a mounting rail and protection for rear connections. Approximately 300 mm overall length is a starting layout allowance, not a drill template; measure the supplied grommets and choose readable spacing. A weather-rated lamp body does not establish a watertight cable connector or panel penetration. The workbook allows $15 for this rail/cover but no finished rated assembly is selected. A separate $15 allowance covers meter/exterior-sensor protection; the actual meter geometry and plumbing supports must be resolved before choosing that housing. Keep possible plumbing leaks away from control boards.

### Coating and potting

Use the gasketed enclosure first, followed by a thin electronics conformal coating after all soldering, cleaning and tests. [MG Chemicals 422C](https://www.mgchemicals.com/downloads/tds/tds-422c-l.pdf) is a serviceable coating option; the $20 workbook entry is an allowance for a small bottle, not a verified current offer. [Amazon search](https://www.amazon.com/s?k=MG+Chemicals+422C+55ml).

Mask USB contacts, screw terminals, headers, relay contacts/vents where applicable, adjustments and service test points. Follow the coating's compatibility, cure and ventilation instructions. Coating helps against moisture and contamination; it does not turn connectors or an unsealed assembly into an immersion-rated product.

Do not fill the first build with epoxy, polyester casting resin or household silicone. Suitable electronics-grade, noncorrosive silicone can later support a vulnerable joint or form a separately qualified sealed probe. Full encapsulation needs a specific compound, compatible cure process, thermal design and a repair plan. Neutral cure alone does not establish suitability for every component. The relay-coil regulator is expected to dissipate roughly 0.3–0.5 W over the design range; the Nano regulator, DAC and drivers also produce heat. Measure the closed-box temperature before deciding whether to encapsulate anything.

## Small parts and assembly supplies

These are required even though several are inexpensive. Prefer specified components from an authorized distributor rather than unidentified assortments where voltage rating, dielectric or tolerance cannot be verified.

| Circuit item | Installed quantity | Purchase specification |
| :--- | ---: | :--- |
| R1–R3 | 3 | 1 kΩ, 1%, **0.5 W**, axial |
| R4, R8, R9 | 3 | 1 kΩ, 1%, 0.25 W minimum; the same 0.5 W stock is acceptable if it fits |
| R5 | 1 | 100 kΩ, 1%, 0.25 W minimum |
| R6, R7, R10 | 3 | 4.7 kΩ, 1%, 0.25 W minimum |
| D1–D4 | 4 | 1N4148 axial; identify cathode band |
| C1, C2, C3, C5, C6, C10, C11, C12 | 8 | 100 nF, X7R, 50 V; suitable leaded package |
| C4 | 1 | 330 nF, X7R, 50 V |
| C7–C9 | 3 | 47 µF, 35 V, 105 °C electrolytic; polarity and lead spacing matter |
| Removable DAC test load | 1, bench only | 250 Ω, 0.1%, 0.5 W; **not a permanent valve/feedback shunt** |

The workbook allows $10 for the installed passives plus small spares, and $2 for the test resistor. [DigiKey](https://www.digikey.com/) or [Mouser](https://www.mouser.com/) can consolidate these with sensors/regulator/relay. Confirm quantity breaks and packaging rather than buying an unnecessary reel.

| Assembly type | Planning quantity / budget | Selection guidance and shopping link |
| :--- | :--- | :--- |
| Carrier boards and headers | 1 set / $8 | [FR4 perfboard and 2.54 mm headers](https://www.amazon.com/s?k=FR4+perfboard+2.54mm+headers+female+socket). Use secured soldered connections in the final assembly. |
| Distribution | 3 separate buses / $10 | [Covered terminals](https://www.amazon.com/s?k=covered+barrier+terminal+block+bus+bar). Label 12 V, regulated 5 V, and ground distinctly; check each terminal's wire range and rating. |
| Internal wire | Small assortment / $10 | [Stranded copper hookup wire](https://www.amazon.com/s?k=stranded+copper+hookup+wire+22+awg+kit). 22 AWG is a signal-wire planning choice, not approval for the fused supply or common lamp return. |
| Outdoor harness | Measured runs / $20 | [Jacketed multicore copper cable](https://www.amazon.com/s?k=outdoor+multiconductor+copper+control+cable). Final gauge, length and conductor count remain layout/protection decisions. Keep I2C local to the box. |
| Detachable connections | As needed / $12 | [Sealed connector examples](https://www.amazon.com/s?k=Deutsch+DT+sealed+connector+kit). Verify authentic contacts, current limits, wire seals and crimp tool. Permanent gland entry can avoid some connector expense. |
| Finishing | Small lot / $8 | [Adhesive-lined shrink, ferrules, labels](https://www.amazon.com/s?k=adhesive+lined+heat+shrink+ferrules+wire+labels), abrasion sleeve and cable ties. Do not put solder-tinned stranded ends under terminals that prohibit them. |
| Mounting | Small lot / $7 | [PCB standoffs](https://www.amazon.com/s?k=nylon+pcb+standoff+M3+kit), screws and brackets. Keep solder points clear of the steel plate. |

Amazon links described as **searches** are comparison starting points, not approved exact products or verified checkout prices. The existing machine connector, machine supply/ground, hose, battery and multimeter are reused and are not charged again. No separate machine battery cable or additional machine fuse block is included. The existing fuse still has to protect the actual added conductors.

## Plumbing

Allow $20 for a [manual shutoff and cleanable strainer](https://www.amazon.com/s?k=garden+hose+shut+off+valve+inline+filter+brass), $20 for the correct meter adapter pair/seals, $15 for [garden-hose/NPT adapters](https://www.amazon.com/s?k=3%2F4+GHT+to+1%2F2+NPT+brass+adapter), and $8 for straight pipe, washers, supports and sealant. These are estimates; reuse suitable existing parts. No fully specified fitting basket has been established.

US garden hose thread (3/4-inch GHT), the valve's 1/2-inch NPT ports, and the meter's 3/8-inch NPS ports are three different interfaces. Specify both ends of each adapter, gender, sealing method and pressure rating. Do not rely on a listing saying only “3/8 adapter.” Support the valve/meter so a pulled hose does not load plastic meter threads. Install the meter upstream of the valve with its specified full-pipe orientation and straight lengths; the reviewed 3/8-inch installation entry specifies 50 mm straight sections. Retain a manual shutoff: electrical power removal does not mechanically return this valve closed.

## Optional bench supply and battery-first work

**A multimeter and a 12 V battery are enough for continuity checks and cautious, staged nominal-voltage testing. They do not provide adjustable current limiting or establish all acceptance criteria.** The work can start without purchasing a bench supply; the expensive valve and meter should be connected only after the relevant inexpensive interfaces have passed their checks.

| Option | Cost basis | Assessment |
| :--- | :--- | :--- |
| Existing battery + temporary fused test lead | $10 allowance for lead/small fuses | Budget route. A fuse addresses a shorted wire; it may not save a semiconductor from a wrong connection. No refund or cheap-failure outcome is guaranteed. |
| [FNIRSI DPS-150](https://www.fnirsi.com/products/dps-150) | $57.99 without input adapter; advertised code **DPS154** deducts $4 if accepted | Approx. **$58.44 including estimated tax** after the code if advertised free shipping applies. This excludes its input adapter. It is a **step-down** instrument: for a regulated 12 V output use a suitable higher-voltage supply, such as a compatible 20 V USB-C PD source with adequate power. A phone charger or nominal 12 V battery is not automatically sufficient. |
| [Jesverty SPS-3010](https://www.amazon.com/dp/B09YSJQWRG) | $60 planning allowance, **Amazon price unverified** | Conventional AC-powered adjustable CC/CV unit; simpler if buying everything together. Select a US 110/120 V input version. A 10 A capability does not mean the first test should use a 10 A limit. [Manufacturer product/manual page](https://www.jesverty.com/products/view?id=10448&lang=en). |

The bench supply is not part of the installed machine. Start it at 12.0 V with a low stage-appropriate current limit, output off while wiring, and verify voltage with the multimeter before attaching electronics. A current-limited supply still cannot guarantee survival of a reversed connection or 12 V applied to a logic pin.

For the battery route:

1. **Prepare a removable test harness.** Put the inline fuse close to battery positive and use insulated, polarity-labeled connections on a nonconductive surface. Keep the machine harness, valve and water disconnected. Select the fuse from the expected test-stage load and the weakest conductor, not from the battery's capacity. Do not increase it to cure an unexplained blown fuse. This bench lead is separate from the final existing-fuse machine installation.
2. **Check unpowered work.** Confirm every connection, diode band, capacitor polarity and module orientation against Revision C. Use continuity/resistance only with power removed. A capacitor can briefly affect readings; investigate a persistent short rather than treating every initial beep as one.
3. **Test the Nano alone.** Disconnect USB and all external modules. Measure battery polarity/voltage first, then connect positive to **VIN**, negative to **GND**. Measure the 5 V header relative to ground before attaching anything to it. Expect approximately 5 V; stop for an unexpected reading or rapid heating. Recheck after each added load.
4. **Add one inexpensive interface at a time, power removed between changes.** Test the input boards and their completed resistor/diode circuits before connecting Nano input pins. Never apply battery voltage directly to a logic terminal. Complete programming/functional tests need suitable firmware; there is no upload-ready application in this repository yet.
5. **Test the command module on its resistor, not the valve.** Across the removable 250-ohm resistor, 4, 12 and 20 mA should produce approximately 1, 3 and 5 V. This lets the meter stay in DC-voltage mode. Test the feedback receiver separately with a known current source before exposing the Arduino ADC.
6. **Test one lamp and one output before the full bar.** Confirm color leads and current, then add channels. Prove the watchdog/signal-relay branch with a suitable dummy load before connecting the actuator. Ordinary lamp animation must never exercise the reserved valve-power output.
7. **Connect the valve and meter last.** First resolve valve return/compliance questions; verify the meter's 5 V supply at its connector before attachment. Dry valve tests precede water tests. Keep manual water shutoff accessible, start at low pressure and support the plumbing.

Keep the multimeter black lead in COM and the red lead in V/Ω for these voltage checks. **Do not place a meter set to amps across the battery.** Current measurement requires a different, series connection and the correct fused meter input; it is not necessary for the first voltage checks above.

A fixed battery cannot test the full 9–16 V input range, and a basic multimeter cannot establish short pulse integrity, I2C rise time or brief brownout behavior. Those audit items remain unverified until suitable borrowed equipment or another qualified test method is available. A successful battery test is progress toward qualification, not proof that every hardware fault detector works.

If not already owned, separately allow roughly $35 for a temperature-controlled soldering tool, $30 for appropriate stripping/crimping/drilling tools, and $15 for electronics solder/flux/cleaning materials. Connector choice may require a more expensive matched crimper. These estimates are excluded from the $747 build budget. A computer and data-capable Micro-USB cable are needed for programming; the workbook includes a $5 cable allowance that can be set to zero if owned.

## Shipping, tax and coupons

The workbook uses **8.25% as a Helotes-area planning rate**, based on the [Texas Comptroller city-rate table](https://comptroller.texas.gov/taxes/sales/docs/city-rates.pdf). ZIP 78023 alone does not identify every delivery address's tax jurisdiction. Confirm the actual rate at checkout. Texas generally includes delivery charges associated with taxable goods in the taxable amount; see [Comptroller guidance](https://comptroller.texas.gov/taxes/sales/faq/collection.php). The workbook conservatively taxes its entire shipping/fee reserve as well; this is a budgeting assumption, not a final tax determination.

| Basket | Shipping budget | What was established |
| :--- | ---: | :--- |
| U.S. Solid | $10 allowance | [Weight-based rates at checkout](https://ussolid.com/policies/shipping-policy); no destination quote obtained. |
| SparkFun | $8 allowance | Combine Nano and two opto boards. |
| DFRobot | $8 allowance | Combine DAC and receiver. Manufacturer notice says direct shipping resumes October 8 after its holiday closure. |
| DigiKey / possible Mouser split | $10 allowance | DigiKey advertises shipping from $4.99, not a quote for this basket. A second supplier may add shipping. Several part pages flag possible US tariffs. |
| AutomationDirect | $0 assumed | Advertises free eligible shipping over $49; the box and plate total $52.75. Confirm split/drop-ship conditions at checkout. |
| Amazon / local / other | $10 allowance | Prime eligibility, seller terms and final item choices are unknown. |

The separate **$20 tariff/fee reserve is not a calculated tariff or an upper limit**. Replace it with the actual charges when known. The model uses one shipping allowance per basket, not one per component.

The only directly observed product-specific coupon in this pass was **FNIRSI DPS154 ($4)**. It is advertised on the product page but was not redeemed in checkout. It is optional and is not deducted from the installed-system budget. No verified U.S. Solid or Amazon coupon is included. Third-party “up to” coupon listings and account-specific offers were not counted as savings. No mailing-list registration, account creation or order was performed.

Amazon's signed-in checkout was inaccessible in the available browser, so ZIP-specific Amazon shipping, tax, coupons and exact seller prices could not be verified. The links, dated published prices and explicit allowances remain useful for comparison; they should not be relabeled as checkout totals.

## Using the workbook

The **Shopping** tab contains editable quantities/prices, formula line totals, category totals, tax, one set of shipping allowances, a fee reserve and a discount input. Set an item's quantity to zero only when it is already owned or deliberately removed from the scope. Prices marked “Allowance” are assumptions. The **Options** tab is separate and is not included in the main total, avoiding double-counting alternative controllers, enclosures and power supplies. Links and source/basis notes accompany each entry. The source data is also available in [JSON](shopping-data.json).

Purchase the small, independently testable electronics first if beginning immediately. Delay nonreturnable or layout-dependent purchases until the driver source, meter fittings and enclosure layout are established. No potting is included in the initial assembly plan.
