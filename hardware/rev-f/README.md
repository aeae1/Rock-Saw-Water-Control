# Revision F electrical package

Status: controlled bench design; relay-free host-reset circuit; no flow or temperature sensor. D7/D8/D9 are unused. Machine/field release remains on hold H1-H5.

- [Audit and release requirements](../../docs/hardware-audit-rev-f.md)
- [Printable circuit sheets and connection schedule](../../docs/assets/hardware/water-controller-audit-rev-f.pdf)
- [Continuous single-page wiring PDF](../../docs/assets/hardware/water-controller-single-page-rev-f.pdf) and [SVG](../../docs/assets/hardware/water-controller-single-page-rev-f.svg)
- [Netlist](netlist.json), [connections](connections.csv), [parts](bom.csv), [generation manifest](manifest.json)

`netlist.json` records component terminals, external wires, board-internal common connections, unused pins, address configuration and the proposed watchdog assignment. It is a documentation model, not a KiCad electrical-rule-checked PCB or SPICE model. The diagrams show functional terminals, not footprints. X1 numbers are internal harness labels, not verified machine connector cavities.

Regenerate from the repository root with `python3 scripts/build-hardware-package.py`, followed by `python3 scripts/build-single-page-schematic.py`. These require ReportLab, pypdf, PyMuPDF, DejaVu fonts and Inkscape. The first script regenerates the JSON/CSV, individual circuit sheets, overview and audit booklet. The second routes the resulting netlist into one continuous wiring drawing and exports PDF/SVG/PNG. Narrative audit text comes from the audit Markdown. Run `node --test tests/hardware-netlist.test.cjs` and `node scripts/check-docs.mjs`, then render and inspect the PDFs after any change. Wiring documentation does not qualify substituted parts automatically.

No Arduino firmware is generated or flashed. Do not infer a safe electrical state from a passing documentation test.
