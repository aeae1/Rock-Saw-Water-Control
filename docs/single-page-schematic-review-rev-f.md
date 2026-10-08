# Single-page schematic review — Revision F

Updated 8 October 2026. The overall reference is [one continuous A0 vector PDF](assets/hardware/water-controller-single-page-rev-f.pdf), with [SVG](assets/hardware/water-controller-single-page-rev-f.svg) and [PNG](assets/hardware/water-controller-single-page-rev-f.png) versions. It is not a collage of detail pages. The [multipage booklet](assets/hardware/water-controller-audit-rev-f.pdf) is retained.

All five machine connections enter together from the left: supply, ground, G, H and J. The sheet has 108 external wires and 41 component references. Surviving wire identifiers are preserved, with W086/W095/W097 intentionally rerouted and W127–W132 added. No reference numbers are recycled.

Automated checks compare every drawn conductor and terminal to the netlist, check distribution taps, reject different-net collinear overlaps and wires crossing component bodies, verify every component is represented exactly once, validate purchasing coverage, and compare exported-file hashes. Electrical mutation tests exercise wrong voltages, reset polarity/duration, missing returns and pull-downs, base-resistor bypass, swapped transistor terminals, lamp-channel conflicts and I2C address errors. Historical revision comparisons remain.

Visual review covers the complete sheet and enlarged machine-input, valve/reset and lamp portions, plus the corresponding detail pages. Junction dots indicate connections; gaps mark unconnected crossings. The symbol layout is functional, not a board footprint or exact physical terminal arrangement. Use the manufacturer pin drawing for transistor orientation.

These are documentation checks, not SPICE simulation, PCB design-rule checks, installed-wire inspection or physical qualification. The [electrical audit](hardware-audit-rev-f.md) lists H1–H5 bench evidence still required. No flashable Arduino firmware is included. In particular, the host watchdog is not a guaranteed water shutoff, and USB-only service requires the valve cable disconnected.
