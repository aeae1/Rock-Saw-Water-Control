# Control Specification

Revision 0.1 · Design baseline

## State variables

| Variable | Range or values | Initial value |
| :--- | :--- | :--- |
| Machine power | Off, on | Off |
| Water command | Paused, on | Paused |
| Selected level | Integer 1–10 | 4 |
| Saved maximum | 10–100%, in 10-point increments | 100% |
| Draft maximum | 10–100%, in 10-point increments | Saved maximum |
| Saved resume opening | Level × maximum / 10 | 40% |
| Simulated valve position | 0–100% | 0% |
| Mode | Normal, maximum setup | Normal |
| Rocker state | G, center, H | Center |
| Diagnostic | None, driver, conflicting inputs | None |

The opening scale represents actuator travel. It does not imply linear water flow, an encoder, or measured position in a physical controller.

## Normal operation

G and H increment or decrement the level once per activation, within 1–10. A direction remains latched until the rocker returns to center or reverses. A reversal is interpreted as passage through center. Holding a direction produces no autorepeat. While J is being held before entry into setup, normal G/H adjustment is ignored.

A short J press toggles the water command on release. The on target is the saved resume opening; the paused target is fully closed. A long press must not produce a subsequent short-press toggle.

## Maximum setup

1. Hold J continuously for 2.5 seconds. Enter setup at the threshold.
2. Stop simulated motion and retain the valve position reached at entry. Releasing J leaves setup active.
3. Set the reference opening to the actual simulated position if the water command was on, or to the saved resume opening if paused.
4. Adjust a draft maximum with G/H. Do not move the valve or change the committed maximum while editing.
5. Display only the lamp at `draft maximum / 10`, alternating blue and white every 600 ms.
6. Tap J to commit, quantize, and exit. A second long hold in setup does not save or toggle.

The committed level is calculated as follows. Exact halfway values round upward.

```text
boundedReference = min(referenceOpening, newMaximum)
newLevel = clamp(round(boundedReference × 10 / newMaximum), 1, 10)
resumeOpening = newLevel × newMaximum / 10
valveTarget = previousWaterCommandIsOn ? resumeOpening : 0
```

| Reference opening | New maximum | New level | Resume opening |
| ---: | ---: | ---: | ---: |
| 40% | 50% | 8 | 40% |
| 40% | 60% | 7 | 42% |
| 42% | 30% | 10 | 30% |
| 30%, paused | 50% | 6 | 30%; valve remains closed |
| 0%, on during initial motion | 50% | 1 | 5% |

Level zero is reserved for the off command and is not a selectable running level. If setup is entered while a closing valve is still moving, motion stops at that intermediate position; saving while paused resumes closing.

## Startup and power interruption

On machine power-up, the water command is paused and the valve is commanded closed. Saved level and maximum are retained. For 3.6 seconds, the white saved-level bar is overlaid by the maximum lamp alternating blue and white. Normal interaction ends this cue early. Reduced-motion mode substitutes a steady maximum marker.

Removing power extinguishes all lamps, cancels motor motion at the current simulated position, discards an unsaved draft, and clears the water command. The simulated actuator is non-return: electrical power loss does not mechanically shut off water. On the next power-up, closing is commanded again.

Settings persist across the simulator's power switch within the current page session. Reloading the page resets the model. Physical firmware will require versioned nonvolatile settings and a power-up position-reference procedure.

## Animation and timing

| Parameter | Simulator value |
| :--- | :--- |
| Full actuator stroke | 5 seconds |
| Minimum modeled move | 200 ms |
| Maximum-mode J threshold | 2.5 seconds |
| Startup display duration | 3.6 seconds |
| Blue/white interval | 600 ms |

Fill progresses from left to right as the modeled valve opens. Drain replaces blue with white from right to left as it closes. Timing is illustrative and must be replaced by characterized actuator behavior in firmware.

## Diagnostic previews

| Code | Meaning | Response |
| ---: | :--- | :--- |
| 4 | Motor-driver fault | Stop motor commands; inhibit operator commands |
| 7 | Conflicting control inputs | Stop motor commands; inhibit operator commands |

The simulator's fault selector injects these conditions; it does not read physical diagnostics. Clearing a preview commands closing while powered. White fault indication flashes three times and then remains steady; reduced-motion mode uses steady indication. Stopping an actuator does not establish closed position. Physical diagnostic detection and recovery remain unimplemented.
