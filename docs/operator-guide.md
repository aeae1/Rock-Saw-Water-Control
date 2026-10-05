# Operator Guide

**[Open the simulator](https://aeae1.github.io/Rock-Saw-Water-Control/)** · [Fault reference](faults.md)

The controller has three modes: **Normal**, **Set Max**, and **Flush**. Most operation takes place in Normal. G and H are the two directions of the rocker; J is the trigger. Other machines can use equivalent increase, decrease, and trigger controls.

## Start here

1. Center G/H and release J.
2. Turn controller power on. Watch the two-second lamp check: all ten lamps light white for one second, then all ten light blue for one second. Operator commands are ignored during the test. It commands the valve closed at the same time. Wait for the test and closing to finish; a previously open valve may pass water while closing.
3. Tap J to turn water on. Tap again to turn it off.
4. Press G for more water or H for less. There are ten levels. Center the rocker before pressing the same direction again; reversing direction also passes through center.

If a control was held during startup, release J and center G/H. After the lamp test and closing, keep them neutral for one tenth of a second, then make a fresh command. Releasing a startup-held J does not turn water on.

Check that all ten lamps show both colors during startup; a missing color needs inspection. A fault replaces the test immediately. The same sequence applies with reduced motion enabled. The test follows controller power-up, so a machine key cycle will not repeat it if the controller remains powered from constant hot.

Holding G or H makes only one change. Once controls are ready, either direction may remain held while J toggles water normally. During startup or recovery, the J label identifies a held rocker that must be centered first. The selected level is remembered when water is off.

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

Each fault lights its own numbered lamp. **Blinking white means the cause is still active. Blinking blue means it has cleared but still needs acknowledgement.** Several faults can be shown together; all must be cleared before reset. Faults stop further valve movement, so **water may still be flowing**. Use the upstream manual shutoff when necessary.

1. Correct every active cause using the [fault reference](faults.md).
2. Release J and center G/H.
3. **Hold J for 3 seconds.** Fault lamps stay blue while the remaining lamps fill white from left to right. Release after acknowledgement.
4. As soon as the three-second hold succeeds, the normal water-OFF lights return: white saved level and blinking blue maximum. Closing still completes in the background. Release J and keep G/H centered for 0.1 seconds after closing before a fresh tap can resume water.

In the simulator, turn fault toggles ON to activate causes and OFF to remove them. Try several at once. OFF does not erase a latched code. **Reset now · sim shortcut** skips the hold; use J to see its progress lights.

If an active cause blocks reset, the row shows staggered blue/white. At three seconds, a brief faster blue/white warning indicates refusal if the cause remains. If all causes are cleared but G/H is held, the code lamps stay blinking blue and the text says which direction to center. If J needs a fresh press, the text says to release it. Only an eligible reset shows progress. Correct the causes, release J and try again; clearing a cause midway through a hold cannot make that hold valid. Moving G/H or a new fault interrupts a reset hold. A new fault also interrupts recovery. Cycling power alone does not acknowledge faults. Invalid saved settings restore level 4 and a 100% maximum when acknowledged. Reduced-motion preferences use steady colors and text instead of flashing.

## Power and simulator notes

The simulated power switch retains saved settings and latched faults, but discards an unfinished maximum edit. Reloading the page starts a new simulation. Physical settings storage is a firmware requirement, not a browser feature.

Removing electrical power does not guarantee that a motorized ball valve closes. On restart, opening commands remain locked until closing completes and the controls remain released/centered for 0.1 seconds. Commands made during recovery are discarded.

For keyboard operation, focus J and use Space or Enter. Reduced-motion settings replace flashing patterns with steady markers. The animated water and valve position are modeled; they are not measurements from a real machine.

The simulator buttons can be operated with power off or while commands are locked. This lets you test held-switch behavior. The physical reference installation uses constant power from its connector: switching the machine key off may leave the controller, lamps and valve powered. Its key-off behavior must be measured before installation.
