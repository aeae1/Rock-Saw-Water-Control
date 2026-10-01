# Operator Guide

**[Open the simulator](https://aeae1.github.io/Rock-Saw-Water-Control/)** · [Fault reference](faults.md)

The controller has three modes: **Normal**, **Set Max**, and **Flush**. Most operation takes place in Normal. G and H are the two directions of the rocker; J is the trigger. Other machines can use equivalent increase, decrease, and trigger controls.

## Start here

1. Center G/H and release J.
2. Turn machine power on. The controller closes the valve before accepting commands. Water starts off.
3. Tap J to turn water on. Tap again to turn it off.
4. Press G for more water or H for less. There are ten levels. Center the rocker before pressing the same direction again; reversing direction also passes through center.

Holding G or H makes only one change. The selected level is remembered when water is off.

A **tap** means press and release J in less than half a second. A **hold** means keep J pressed for 1.5 seconds, then release it. Releasing between those times cancels the gesture without changing anything. White lamps start filling inward after half a second to show that a mode-changing hold is underway.

## Normal — everyday water adjustment

Use G/H to select a level from 1 to 10. Use J to turn water on or off.

- A **blue bar** shows the selected level when water is on.
- A **white bar** shows the saved level when water is off.
- While off, one lamp **blinks blue** to show the maximum opening. Lamp 7 means a 70% maximum. It alternates blue/off above the white bar, or blue/white within the bar.
- Blue fills the white bar as the valve opens. White moves back through blue as it closes.

The current simulator scales valve opening. The planned hardware will use your measured [flow curve](flow-calibration.md) to make levels fractions of calibrated flow. Actual flow can still vary with supply conditions; it is not a live measurement.

## Set Max — make level 10 useful

Use this when level 10 delivers too much water.

1. From Normal, **hold J for 1.5 seconds**, then release.
2. Use **G/H** to choose the maximum opening. One blue/white lamp shows the choice: lamp 1 = 10%, lamp 5 = 50%, lamp 10 = 100%.
3. **Tap J** to save and return to Normal.

If water was on, the valve holds its opening while you edit. If water was off, it stays off; a valve already closing continues to close.

Saving chooses the closest available level under the new maximum. For example, level 4 with a 100% maximum is 40% open. Changing the maximum to 50% selects level 8, still 40% open. Changing it to 60% selects level 7 and moves slightly to 42% open. If the new cap is below the old opening, the valve moves down to the cap. Water that was off remains off.

## Flush — temporarily use the whole valve

Use this for a temporary full-open command, such as cleaning.

1. Enter Set Max and **release J**.
2. **Hold J again for 1.5 seconds**, then release. This saves the displayed maximum and enters Flush.
3. The valve opens to **100%**, even if the saved maximum is lower. White lamps ripple outward across blue.
4. **Press J once to leave immediately.** It restores Normal and the previous on/off state at the saved level. If water was on before Flush, it remains on afterward; tap J again if you want it off.

G/H does not change settings in Flush. Keeping J held after an exit cannot enter another mode. If an earlier OFF command is still closing the valve, wait for it to finish, then start a fresh hold to enter Flush.

## If a fault appears

A numbered white lamp identifies the fault; the simulator also shows its name. Faults stop further valve movement, so **water may still be flowing**. Use the upstream manual shutoff when necessary.

1. Correct the cause using the [fault reference](faults.md).
2. Release J and center G/H.
3. **Hold J for 3 seconds** to acknowledge, then release. In the simulator, the **Reset fault** button performs the same acknowledgement.
4. Wait for the closing/reference cycle. Water remains off. Tap J only when ready to resume.

In the simulator, select **No active fault cause** after injecting a fault, then reset it. Removing the cause or cycling machine power alone does not acknowledge a latched fault. A new fault interrupts recovery. Invalid saved settings restore level 4 and a 100% maximum when acknowledged.

## Power and simulator notes

The simulated power switch retains saved settings and latched faults, but discards an unfinished maximum edit. Reloading the page starts a new simulation. Physical settings storage is a firmware requirement, not a browser feature.

Removing electrical power does not guarantee that a motorized ball valve closes. On restart, opening commands remain locked until closing completes and the controls are released/centered. Commands made during recovery are discarded.

For keyboard operation, focus J and use Space or Enter. Reduced-motion settings replace flashing patterns with steady markers. The animated water and valve position are modeled; they are not measurements from a real machine.
