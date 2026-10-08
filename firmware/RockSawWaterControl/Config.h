#pragma once
#include <stdint.h>
namespace water {
// Bench defaults. Measure the installed valve and feedback chain before field use.
constexpr uint32_t DEBOUNCE_MS = 25, NEUTRAL_MS = 100, TAP_MS = 500, HOLD_MS = 1500;
constexpr uint32_t RESET_HOLD_MS = 3000, STUCK_J_MS = 30000, LAMP_TEST_MS = 2000;
constexpr uint32_t FEEDBACK_GRACE_MS = 1000, FEEDBACK_BAD_MS = 250, CONFLICT_MS = 100;
constexpr uint32_t MOVE_TIMEOUT_MS = 15000, NO_PROGRESS_MS = 4000, POSITION_SETTLE_MS = 200;
constexpr uint16_t ARRIVAL_TOLERANCE = 75, CLOSED_TOLERANCE = 50, PROGRESS_STEP = 100;
constexpr uint16_t SUPPLY_LOW_MV = 9000, SUPPLY_HIGH_MV = 16000;
constexpr uint16_t ADC_REFERENCE_MV = 5000, FEEDBACK_CLOSED_MV = 475, FEEDBACK_OPEN_MV = 2376;
constexpr uint16_t FEEDBACK_LOW_MV = 350, FEEDBACK_HIGH_MV = 2700;
// Inverse curve: openings in 0.01% units at 0,10,...100% calibrated flow.
// Identity values mean opening %, not measured flow. Replace only with measured data.
constexpr bool CALIBRATED_FLOW = false;
constexpr uint16_t OPENING_AT_FLOW[11] = {0,    1000, 2000, 3000, 4000, 5000,
                                          6000, 7000, 8000, 9000, 10000};
constexpr uint16_t faultBit(uint8_t code) { return uint16_t(1U << (code - 1)); }
constexpr uint16_t SUPPORTED_FAULTS = faultBit(1) | faultBit(3) | faultBit(4) | faultBit(5) |
                                      faultBit(6) | faultBit(7) | faultBit(8) | faultBit(10);
inline uint32_t elapsed(uint32_t now, uint32_t then) { return now - then; }
inline uint16_t distance(uint16_t a, uint16_t b) { return a > b ? a - b : b - a; }
inline uint16_t opening(uint8_t level, uint8_t cap, const uint16_t *curve = OPENING_AT_FLOW) {
  const uint16_t demand = uint16_t(level) * cap * 100; // basis points, cap is 1..10
  const uint8_t i = demand / 1000;
  if (i >= 10)
    return curve[10];
  return curve[i] + uint32_t(curve[i + 1] - curve[i]) * (demand % 1000) / 1000;
}
inline bool validCurve(const uint16_t *p) {
  if (p[0] != 0 || p[10] != 10000)
    return false;
  for (uint8_t i = 1; i < 11; ++i)
    if (p[i] <= p[i - 1] || p[i] > 10000)
      return false;
  return true;
}
inline uint8_t nearestLevel(uint16_t ref, uint8_t cap, const uint16_t *curve = OPENING_AT_FLOW) {
  uint8_t best = 1;
  uint16_t error = 65535;
  for (uint8_t level = 1; level <= 10; ++level) {
    uint16_t e = distance(ref, opening(level, cap, curve));
    if (e <= error) {
      error = e;
      best = level;
    }
  }
  return best; // Equal distances choose the higher repeatable level.
}
inline uint16_t dacCode(uint16_t position) {
  return uint16_t(13107UL + (uint32_t(position) * 52428UL + 5000) / 10000);
}
inline uint16_t curveSignature() {
  uint16_t crc = 0xFFFF;
  for (uint8_t i = 0; i < 11; ++i)
    for (uint8_t j = 0; j < 2; ++j) {
      crc ^= uint8_t(OPENING_AT_FLOW[i] >> (8 * j));
      for (uint8_t k = 0; k < 8; ++k)
        crc = crc & 1 ? (crc >> 1) ^ 0xA001 : crc >> 1;
    }
  return crc ^ uint16_t(CALIBRATED_FLOW);
}
} // namespace water
