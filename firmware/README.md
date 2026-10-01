# Firmware Integration

No flashable firmware is supplied in revision 0.1. The browser simulator is the executable interface reference. It uses idealized valve position and cannot substitute for physical actuator characterization.

## Required interfaces

| Interface | Required behavior |
| :--- | :--- |
| Input acquisition | Read protected G/H/J signals; debounce; recognize neutral; reject conflicting inputs |
| Time source | Monotonic, nonblocking timing for long presses, movement, and indication |
| Valve driver | Open, close, and stop; enforce direction-change timing and bounded run time |
| Position model | Record known/unknown reference state and estimate travel, or read selected position feedback |
| Lamp driver | Set ten independent blue/white/off states through twenty switched outputs |
| Settings storage | Versioned maximum and level with integrity checking and wear-conscious writes |
| Diagnostics | Acquire actual driver/power/input faults and inhibit motion as required |
| Startup | Keep the water command off and establish the actuator reference before normal operation |

Port the rules in [Control Specification](../docs/control-specification.md), including release-based short presses, maximum-mode position hold, nearest-step rounding, and prior on/off-state retention. Driver outputs must have defined reset and brownout behavior. Do not treat retained settings as proof of mechanical position.

Before implementation, select the actuator and output electronics, measure movement behavior, establish the machine pinout, and choose the position-reference strategy. The simulator's 5-second stroke and 200 ms minimum movement are display-model values, not approved firmware constants.
