#pragma once
#include "Config.h"
namespace water {
// The board reference and endpoint values must be measured during commissioning.
inline uint16_t feedbackPosition(uint16_t mv) {
  if (mv <= FEEDBACK_CLOSED_MV)
    return 0;
  if (mv >= FEEDBACK_OPEN_MV)
    return 10000;
  return uint32_t(mv - FEEDBACK_CLOSED_MV) * 10000 / (FEEDBACK_OPEN_MV - FEEDBACK_CLOSED_MV);
}
inline bool validFeedback(uint16_t mv) { return mv >= FEEDBACK_LOW_MV && mv <= FEEDBACK_HIGH_MV; }
struct FrameMonitor {
  uint32_t previous = 0, time = 0;
  bool known = false;
  void reset() { known = false; }
  bool update(uint32_t frame, uint32_t now) {
    const uint32_t delta = frame - previous, ms = elapsed(now, time);
    const bool ok = !known || (delta > 0 && delta <= ms * 2 + 100);
    previous = frame;
    time = now;
    known = true;
    return ok;
  }
};
} // namespace water
