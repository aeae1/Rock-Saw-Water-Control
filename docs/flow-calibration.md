# Flow Calibration Plan

The intended hardware control scale is **percentage of calibrated flow**, using measurements from the actual valve, hose and spray heads. The current simulator still uses linear actuator-opening percentages because measured calibration data has not yet been supplied. Its ball readout will continue to show physical opening even after a flow curve is added.

## Collect the data

1. Assemble the real hose, strainer, valve, manifold and nozzles. Measure through the whole arrangement; discharging the bare valve into a bucket creates a different restriction curve.
2. Record inlet pressure while flowing, hose length, nozzle configuration and water conditions. Keep them stable during a measurement series.
3. Command known valve positions and wait for position and flow to settle. Start with 0–100% in 5–10-point increments, then add closer samples near first flow and any steep changes. The useful range may occupy only part of ball travel.
4. Collect a known volume over a measured time, or use a temporary reference meter. `GPM = gallons × 60 / seconds`. Capture all spray outlets if measuring by collection. Repeat each point and measure both opening and closing directions to expose backlash/hysteresis.
5. Record true shutoff, the smallest repeatable useful spray, and full-open flow. Confirm results with several intermediate target flows that were not used to fit the table. Repeat a few points at weaker/stronger expected supply pressure.

Do not force noisy/nonmonotonic data into an aggressive polynomial. Prefer a validated monotone piecewise-linear table with bounded interpolation, explicit zero/shutoff handling and no extrapolation beyond measured limits. Flat regions need a documented inverse convention, such as the lowest opening that reaches a requested flow. If opening/closing curves differ materially, resolve that repeatability issue before promising fine levels.

## Translate controls into valve position

Let `F(p)` be normalized measured flow at physical opening `p`, with 100% flow defined by the measured full-open flow at the calibration conditions.

```text
Normal flow request = level / 10 × saved flow cap
Physical valve target = inverseLookup(Normal flow request)
Valve command mA = 4 + 0.16 × physical opening percent
OFF = physical closed
Flush = physical fully open, regardless of the calibrated cap
```

For example, level 4 under a 50% flow cap requests 20% of the calibration's full-open flow. It does **not** necessarily command 20% ball opening. Set Max's single lamp would represent the flow cap in ten-point increments; the ball readout would remain a separately labeled opening percentage.

On leaving Set Max, preserve the existing nearest-repeatable-physical-position rule: calculate the ten inverse-curve positions allowed under the new cap, and select the one closest to the held physical opening (or the saved resume opening when paused). Clamp to the physical position corresponding to the new cap. Define ties consistently; the current simulator rounds upward. Do not round a nonlinear curve using the old linear opening formula. Water remains off if it was off before editing.

Preserve the last committed calibration until a complete replacement validates. Check version, checksum, finite values, bounds, increasing position samples, nondecreasing flow, real closed/full-scale endpoints and usable resolution. Reject invalid data without opening the valve. Confirm that every available level is repeatable; a mathematically distinct 1% flow step may be below mechanical resolution.

## What calibration can and cannot do

A lookup curve improves the spacing of the controls without a permanent flow sensor. It predicts flow at the conditions used for calibration. Different supply pressure, nozzle wear, blockage or hose routing can change actual flow. Label this **calibrated flow %**, not live measured GPM. Closed-loop flow regulation would require a flow meter and a separate control loop; the valve's position feedback is not a flow meter.

A pressure regulator and gauge may help keep the calibration useful. The regulator requires sufficient upstream pressure and capacity; it cannot correct an inadequate source. Keep the selected valve and plumbing within their pressure limits.
