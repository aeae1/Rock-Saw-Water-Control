#pragma once
#include "Controller.h"
namespace water {
template <class Driver> class Lamps {
  Driver &driver;
  Color actual[10]{};
  uint32_t blanked[10]{};

public:
  explicit Lamps(Driver &d) : driver(d) {}
  void reset(uint32_t now) {
    for (uint8_t i = 0; i < 10; ++i) {
      actual[i] = Color::Off;
      blanked[i] = now;
    }
  }
  // At most one transaction per loop; input sampling continues during animations.
  bool step(const Color *desired, uint32_t now, bool &complete) {
    complete = true;
    for (uint8_t i = 0; i < 10; ++i) {
      if (actual[i] == desired[i])
        continue;
      complete = false;
      if (actual[i] != Color::Off) {
        if (!driver.lamp(i, false, false))
          return false;
        actual[i] = Color::Off;
        blanked[i] = now;
        return true;
      }
      if (elapsed(now, blanked[i]) < 2)
        continue;
      if (!driver.lamp(i, desired[i] == Color::Blue, desired[i] == Color::White))
        return false;
      actual[i] = desired[i];
      return true;
    }
    return true;
  }
};
} // namespace water
