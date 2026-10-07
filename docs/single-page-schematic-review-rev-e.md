# Revision E schematic verification

7 October 2026 · Continuous one-page wiring · No permanent flow or temperature sensors

[Overall PDF](assets/hardware/water-controller-single-page-rev-e.pdf) · [SVG](assets/hardware/water-controller-single-page-rev-e.svg) · [Detailed audit booklet](assets/hardware/water-controller-audit-rev-e.pdf) · [Netlist](../hardware/rev-e/netlist.json) · [Connections](../hardware/rev-e/connections.csv)

Revision E removes FM1, R6, R7, R8, R9 and C2 from the metered Revision D design. It removes twelve wires and four signal nets, leaving **114 wires, 43 components and 42 nets**. Surviving wire IDs remain unchanged. D8/D9 join D7 as unused terminals. Valve command, position feedback, lamp outputs, operator inputs and watchdog/inhibit circuits are retained.

## Verification

- Twenty electrical-document tests check complete terminal accounting, separated supply domains, retained component values and lamp mappings, relay paths, ADC conditioning and deliberate wiring corruption. The D-to-E comparison checks every retained component, conductor, wire ID, internal common, address, jumper and watchdog assignment against the archived Revision D netlist.
- The overall drawing is one continuous A0 landscape page. Every surviving wire ID appears once in PDF text and every component is represented. Automated SVG checks compare visible conductor endpoints with actual terminal coordinates, reject wires through component bodies and different-net collinear overlaps, and verify export hashes. Gapped crossings are unconnected; dots mark joined conductors.
- The rendered overall page and changed detailed pages were inspected for omitted meter wiring, retained position feedback, unused-pin labels and text clipping. The multipage booklet remains a separate detailed reference; its pages are not tiled into the overall sheet.
- Purchasing coverage includes every one of the 43 current component references exactly once. The six small-part purchase lots and their linked workbook subtotal agree. The meter, dedicated adapters/housing and meter-only pull-up purchase lot are removed from the base budget.
- The SparkFun v1.2 schematic was reviewed for independently energized G/H/J with main power absent. Its optical input barrier and controller-powered output pull-ups avoid a conductive positive-supply backfeed path. The documented input current is about 9 mA per asserted line at 12 V. Actual off-state rail measurements and held-input power restoration are now explicit H5 tests; they have not been performed.

This is a branch-removal and document-consistency review of the previously audited interfaces, not new physical qualification or a new manufacturer certification. [H1–H5 remain open](hardware-audit-rev-e.md#release-decision); no flashable controller firmware exists. Position feedback supports commanded-position tracking after qualification, but cannot independently prove water flow or hydraulic shutoff. No automatic flow sensing or external temperature acquisition is claimed.

## Reproduction

```sh
python3 scripts/build-hardware-package.py
python3 scripts/build-single-page-schematic.py
node --test tests/hardware-netlist.test.cjs
node scripts/check-docs.mjs
```

Full simulator and browser results are available for the published commit in [GitHub Actions](https://github.com/aeae1/Rock-Saw-Water-Control/actions). Passing software/document tests do not qualify an assembled controller for field use.
