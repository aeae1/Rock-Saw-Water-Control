#pragma once
#include "Config.h"
namespace water {
struct Saved {
  uint32_t sequence = 0;
  uint8_t level = 4, cap = 10;
  uint16_t faults = 0;
  uint8_t reset = 0;
};
constexpr uint8_t RECORD_SIZE = 24;
inline uint16_t crc16(const uint8_t *p, uint8_t n) {
  uint16_t crc = 0xFFFF;
  while (n--) {
    crc ^= *p++;
    for (uint8_t k = 0; k < 8; ++k)
      crc = crc & 1 ? (crc >> 1) ^ 0xA001 : crc >> 1;
  }
  return crc;
}
inline void encode(const Saved &s, uint8_t *b) {
  for (uint8_t i = 0; i < RECORD_SIZE; ++i)
    b[i] = 0;
  b[0] = 0xA5;
  b[1] = 1;
  b[2] = 0x52;
  b[3] = 0x57;
  for (uint8_t i = 0; i < 4; ++i)
    b[4 + i] = uint8_t(s.sequence >> (8 * i));
  b[8] = s.level;
  b[9] = s.cap;
  b[10] = uint8_t(s.faults);
  b[11] = s.faults >> 8;
  b[12] = s.reset;
  const uint16_t sig = curveSignature();
  b[14] = sig & 255;
  b[15] = sig >> 8;
  const uint16_t crc = crc16(b + 1, 21);
  b[22] = crc & 255;
  b[23] = crc >> 8;
}
inline bool decode(const uint8_t *b, Saved &s) {
  if (b[0] != 0xA5 || b[1] != 1 || b[2] != 0x52 || b[3] != 0x57 || b[8] < 1 || b[8] > 10 ||
      b[9] < 1 || b[9] > 10)
    return false;
  if ((uint16_t(b[14]) | (uint16_t(b[15]) << 8)) != curveSignature())
    return false;
  if (crc16(b + 1, 21) != (uint16_t(b[22]) | (uint16_t(b[23]) << 8)))
    return false;
  s.sequence = 0;
  for (uint8_t i = 0; i < 4; ++i)
    s.sequence |= uint32_t(b[4 + i]) << (8 * i);
  s.level = b[8];
  s.cap = b[9];
  s.faults = uint16_t(b[10]) | (uint16_t(b[11]) << 8);
  s.reset = b[12];
  return (s.faults & ~SUPPORTED_FAULTS) == 0;
}
template <class Memory> class Storage {
  Memory &mem;
  uint8_t current = 1, destination = 0, stage = 0;
  uint8_t bytes[RECORD_SIZE]{};
  bool busy = false;

public:
  Saved saved;
  explicit Storage(Memory &m) : mem(m) {}
  bool load() {
    uint8_t a[RECORD_SIZE], b[RECORD_SIZE];
    for (uint8_t i = 0; i < RECORD_SIZE; ++i) {
      a[i] = mem.read(i);
      b[i] = mem.read(i + RECORD_SIZE);
    }
    Saved x, y;
    bool va = decode(a, x), vb = decode(b, y);
    if (!va && !vb)
      return false;
    if (vb && (!va || int32_t(y.sequence - x.sequence) > 0)) {
      saved = y;
      current = 1;
    } else {
      saved = x;
      current = 0;
    }
    return true;
  }
  bool writing() const { return busy; }
  bool start(Saved value) {
    if (busy)
      return false;
    value.sequence = saved.sequence + 1;
    encode(value, bytes);
    destination = current ^ 1;
    stage = 0;
    busy = true;
    return true;
  }
  // One EEPROM byte per call. The previous slot remains committed throughout.
  void step() {
    if (!busy)
      return;
    const uint16_t base = destination * RECORD_SIZE;
    if (stage == 0)
      mem.update(base, 0);
    else if (stage < RECORD_SIZE)
      mem.update(base + stage, bytes[stage]);
    else {
      mem.update(base, 0xA5);
      decode(bytes, saved);
      current = destination;
      busy = false;
    }
    ++stage;
  }
};
} // namespace water
