#pragma once
#include "Config.h"
namespace water {
// Packet layouts checked against manufacturer drivers; no vendor library dependency.
template <class Bus> class Protocol {
  Bus &bus;

public:
  explicit Protocol(Bus &b) : bus(b) {}
  bool dacRange() {
    const uint8_t b[] = {1, 4};
    return bus.write(0x58, b, 2);
  }
  bool command(uint16_t position) {
    if (position > 10000)
      return false;
    uint16_t code = dacCode(position);
    const uint8_t b[] = {2, uint8_t(code), uint8_t(code >> 8)};
    return bus.write(0x58, b, 3);
  }
  bool packet(uint8_t addr, const uint8_t *tx, uint8_t *rx, uint8_t echo) {
    if (!bus.write(addr, tx, 8))
      return false;
    bus.waitResponse();
    if (!bus.read(addr, rx, 8) || rx[0] == 'E')
      return false;
    for (uint8_t i = 0; i < echo; ++i)
      if (rx[i] != tx[i])
        return false;
    return true;
  }
  bool version(uint8_t addr, uint8_t *rx) {
    const uint8_t t[] = {'V', 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55};
    return packet(addr, t, rx, 1) && rx[2] == '0' && rx[3] == '8';
  }
  bool digital(uint8_t addr, uint8_t pin, uint8_t state, bool pullup = false) {
    uint8_t rx[8];
    const uint8_t t[] = {200, pin, 0, state, uint8_t(pullup), 0, 0, 0x55};
    return packet(addr, t, rx, 3);
  }
  bool analog(uint8_t addr, uint8_t pin) {
    uint8_t rx[8];
    const uint8_t t[] = {200, pin, 2, 0, 0, 0, 0, 0};
    const uint8_t t2[] = {201, pin, 2, 16, 0, 0x80, 0xFF, 0};
    return packet(addr, t, rx, 3) && packet(addr, t2, rx, 3);
  }
  bool frames(uint8_t addr, uint32_t &value) {
    uint8_t rx[8];
    const uint8_t t[] = {0x81, 67, 68, 0x55, 0x55, 0x55, 0x55, 0x55};
    if (!packet(addr, t, rx, 2))
      return false;
    value = uint32_t(rx[2]) | (uint32_t(rx[3]) << 8) | (uint32_t(rx[4]) << 16) |
            (uint32_t(rx[5]) << 24);
    return true;
  }
  bool publicData(uint8_t addr, uint8_t pin, uint16_t &value) {
    uint8_t rx[8];
    const uint8_t t[] = {0x81, pin, 255, 255, 0x55, 0x55, 0x55, 0x55};
    if (!packet(addr, t, rx, 2))
      return false;
    value = uint16_t(rx[2]) | (uint16_t(rx[3]) << 8);
    return true;
  }
  // One request changes a lamp pair together, after digital output mode has been initialized.
  // First value is always zero: turn the old color OFF before enabling its replacement.
  bool lamp(uint8_t lamp, bool blue, bool white) {
    if (lamp >= 10 || (blue && white))
      return false;
    const uint8_t addr = 0x60 + 2 * (lamp / 4), b = (lamp % 4) * 2, w = b + 1;
    uint8_t first = blue ? w : b, second = blue ? b : w;
    uint16_t value = (blue || white) ? 65535 : 0;
    uint8_t rx[8];
    const uint8_t t[] = {0x82, first, 0, 0, second, uint8_t(value), uint8_t(value >> 8), 0x55};
    return packet(addr, t, rx, 2);
  }
};
} // namespace water
