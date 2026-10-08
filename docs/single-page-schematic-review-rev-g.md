# Single-page schematic review — Revision G

Updated 8 October 2026. The overall reference is [one continuous A0 vector PDF](assets/hardware/water-controller-single-page-rev-g.pdf), with [SVG](assets/hardware/water-controller-single-page-rev-g.svg) and [PNG](assets/hardware/water-controller-single-page-rev-g.png) versions. The [multipage booklet](assets/hardware/water-controller-audit-rev-g.pdf) remains available.

Five individual wires enter from the left in this vertical order: **12 V, 0 V, J, H, G**. There is no connector/harness block. IN is a drawing boundary, not a physical purchased part. The sheet contains 102 external connections and 38 references (37 physical component/module references plus IN). Q1/R11/R12 and W127–W132 are removed; surviving wire IDs and component values remain unchanged. Nano RESET and HSD3 CH4–CH7 stay unconnected.

Automated checks compare each visible conductor and terminal to the netlist, check distribution taps, reject different-net collinear overlap and wires through component bodies, verify every reference appears exactly once, validate purchasing coverage and exported-file hashes, and require exactly one PDF page. Twenty-one hardware tests include mutation checks and historical revision comparisons. F-to-G proves that only the reset branch is removed and the five incoming endpoints renamed.

Visual review covers the complete drawing, the enlarged left input area, retained valve/lamp wiring and all pages of the booklet. Solid dots mark electrical joins; gaps mark unconnected crossings. Functional symbol positions are not physical footprints. Use manufacturer terminal markings and the detailed sheets when assembling modules.

These checks establish consistency of the documentation, not physical voltage, thermal, vibration or valve behavior. [Firmware v1](../firmware/README.md) is supplied, compiled for Nano Every and software-tested. The [electrical audit](hardware-audit-rev-g.md) lists H1–H5 physical evidence still needed. The internal watchdog is not a guaranteed water shutoff; USB-only service requires the complete valve cable disconnected.
