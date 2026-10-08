#pragma once
#include <stdint.h>
// Open-drain I2C, bounded by elapsed microseconds. Pins must provide external pull-ups.
// Keeping the transport portable lets tests force SCL/SDA stalls without Arduino hardware.
template <class Pins> class SoftI2C {
  Pins &p;
  uint32_t started = 0;
  bool failed = false;
  bool expired() {
    if (uint32_t(p.time() - started) >= 20000)
      failed = true;
    return failed;
  }
  void pause() { p.pause(); }
  bool high() {
    p.scl(false);
    while (!p.readScl()) {
      if (expired())
        return false;
    }
    pause();
    return !expired();
  }
  bool start() {
    p.sda(false);
    if (!high() || !p.readSda()) {
      failed = true;
      return false;
    }
    p.sda(true);
    pause();
    p.scl(true);
    return true;
  }
  bool stop() {
    p.sda(true);
    pause();
    bool ok = high();
    p.sda(false);
    pause();
    return ok && !expired();
  }
  bool send(uint8_t b) {
    for (uint8_t i = 0; i < 8; ++i) {
      p.sda(!(b & 0x80));
      pause();
      if (!high())
        return false;
      p.scl(true);
      b <<= 1;
    }
    p.sda(false);
    pause();
    if (!high())
      return false;
    bool ack = !p.readSda();
    p.scl(true);
    if (!ack)
      failed = true;
    return ack;
  }
  bool receive(uint8_t &b, bool last) {
    b = 0;
    p.sda(false);
    for (uint8_t i = 0; i < 8; ++i) {
      pause();
      if (!high())
        return false;
      b = uint8_t((b << 1) | (p.readSda() ? 1 : 0));
      p.scl(true);
    }
    p.sda(!last);
    pause();
    if (!high())
      return false;
    p.scl(true);
    p.sda(false);
    return true;
  }
  void finish() {
    stop();
    p.sda(false);
    p.scl(false);
  }

public:
  explicit SoftI2C(Pins &pins) : p(pins) {}
  bool recover() {
    started = p.time();
    failed = false;
    p.sda(false);
    for (uint8_t i = 0; i < 9 && !p.readSda(); ++i) {
      p.scl(true);
      pause();
      if (!high())
        break;
    }
    finish();
    return !failed && p.readSda() && p.readScl();
  }
  bool write(uint8_t address, const uint8_t *data, uint8_t n) {
    started = p.time();
    failed = false;
    bool ok = start() && send(address << 1);
    for (uint8_t i = 0; ok && i < n; ++i)
      ok = send(data[i]);
    finish();
    return ok && !failed;
  }
  bool read(uint8_t address, uint8_t *data, uint8_t n) {
    started = p.time();
    failed = false;
    bool ok = start() && send((address << 1) | 1);
    for (uint8_t i = 0; ok && i < n; ++i)
      ok = receive(data[i], i == n - 1);
    finish();
    return ok && !failed;
  }
};
