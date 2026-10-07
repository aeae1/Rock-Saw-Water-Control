# Revision D electrical package

Status: controlled bench design. Machine/field release remains on hold H1-H5.

- [Audit and release requirements](../../docs/hardware-audit-2026-10-07.md)
- [Printable circuit sheets and connection schedule](../../docs/assets/hardware/water-controller-audit-rev-d.pdf)
- [Netlist](netlist.json), [connections](connections.csv), [parts](bom.csv), [generation manifest](manifest.json)

`netlist.json` records component terminals, external wires, board-internal common connections, unused pins, address configuration and the proposed watchdog assignment. It is a documentation model, not a KiCad electrical-rule-checked PCB or SPICE model. The diagrams show functional terminals, not footprints. X1 numbers are internal harness labels, not verified machine connector cavities.

Regenerate from the repository root with `python3 scripts/build-hardware-package.py`. The script requires ReportLab, pypdf, DejaVu fonts and Inkscape; it regenerates the JSON/CSV, SVG circuit sheets, PNG overview and PDF. Narrative text comes from the audit Markdown. Run `node --test tests/hardware-netlist.test.cjs` and `node scripts/check-docs.mjs`, then render and inspect the PDF after any change. Wiring documentation does not qualify substituted parts automatically.

No Arduino firmware is generated or flashed. Do not infer a safe electrical state from a passing documentation test.
