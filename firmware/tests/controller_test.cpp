#include "Controller.h"
#include "Diagnostics.h"
#include "Lamps.h"
#include "Protocol.h"
#include "SoftI2C.h"
#include "Storage.h"
#include <cassert>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <vector>
using namespace water;
static unsigned checks = 0;
#define CHECK(x)                                                                                   \
  do {                                                                                             \
    ++checks;                                                                                      \
    if (!(x)) {                                                                                    \
      std::cerr << "FAILED line " << __LINE__ << ": " << #x << "\n";                               \
      std::abort();                                                                                \
    }                                                                                              \
  } while (0)
struct Rig {
  Controller c;
  uint32_t t = 0;
  bool g = false, h = false, j = false;
  Feedback f{true, 0};
  uint16_t faults = 0;
  explicit Rig(uint32_t start = 0, bool G = false, bool H = false, bool J = false)
      : t(start), g(G), h(H), j(J) {
    c.begin(t, Settings{}, true, 0, g, h, j);
    c.lampFrameApplied(t);
  }
  void step(uint32_t ms = 10, bool track = true) {
    t += ms;
    if (track)
      f.position = c.target();
    c.tick(t, g, h, j, f, faults);
    c.lampFrameApplied(t);
  }
  void wait(uint32_t ms, bool track = true) {
    while (ms) {
      uint32_t n = ms < 10 ? ms : 10;
      step(n, track);
      ms -= n;
    }
  }
  void boot() { wait(2400); }
  void trigger(bool v) {
    j = v;
    wait(40);
  }
  void tap() {
    trigger(true);
    wait(80);
    trigger(false);
    wait(20);
  }
  void hold(uint32_t ms = 1500) {
    trigger(true);
    wait(ms);
  }
  void release() { trigger(false); }
  void rocker(int dir) {
    g = dir == 1;
    h = dir == -1;
    wait(40);
  }
  void setFault(uint8_t code, bool v) {
    if (v)
      faults |= faultBit(code);
    else
      faults &= ~faultBit(code);
    step();
  }
};
struct Mem {
  uint8_t b[256];
  Mem() { memset(b, 0xFF, sizeof(b)); }
  uint8_t read(uint16_t a) {
    assert(a < 256);
    return b[a];
  }
  void update(uint16_t a, uint8_t v) {
    assert(a < 256);
    b[a] = v;
  }
};
struct FakeBus {
  uint8_t tx[8]{}, address = 0;
  bool writeOk = true, readOk = true, echoBad = false;
  unsigned writes = 0;
  bool write(uint8_t a, const uint8_t *d, uint8_t n) {
    ++writes;
    address = a;
    memset(tx, 0, 8);
    memcpy(tx, d, n);
    return writeOk;
  }
  void waitResponse() {}
  bool read(uint8_t, uint8_t *d, uint8_t) {
    memcpy(d, tx, 8);
    if (echoBad)
      d[0] = 'E';
    return readOk;
  }
};
struct FakeDriver {
  std::vector<unsigned> states;
  bool fail = false;
  bool lamp(uint8_t i, bool b, bool w) {
    CHECK(!(b && w));
    states.push_back(i * 4 + (b ? 1 : 0) + (w ? 2 : 0));
    return !fail;
  }
};
struct StuckPins {
  uint32_t ticks = 0;
  bool sclLow = false, sdaLow = false, externalScl = false, externalSda = false;
  unsigned clocks = 0;
  uint32_t time() { return ticks++; }
  void pause() { ticks += 4; }
  void sda(bool v) { sdaLow = v; }
  void scl(bool v) {
    sclLow = v;
    if (!v)
      ++clocks;
  }
  bool readScl() { return !sclLow && !externalScl; }
  bool readSda() { return !sdaLow && !externalSda; }
};
void startupTests() {
  for (unsigned combo = 0; combo < 8; ++combo) {
    Rig r(0, combo & 1, combo & 2, combo & 4);
    r.boot();
    CHECK(!r.c.running);
    if (combo == 0)
      CHECK(r.c.armed);
    else
      CHECK(!r.c.armed);
    r.g = r.h = r.j = false;
    r.wait(500);
    if (r.c.latched) {
      r.hold(3000);
      r.release();
      r.wait(400);
    }
    CHECK(!r.c.running);
    CHECK(r.c.armed);
    r.tap();
    CHECK(r.c.running);
  }
  Rig r;
  for (auto x : r.c.lamps)
    CHECK(x == Color::White);
  r.wait(990);
  for (auto x : r.c.lamps)
    CHECK(x == Color::White);
  r.wait(20);
  for (auto x : r.c.lamps)
    CHECK(x == Color::Blue);
  CHECK(!r.c.armed);
  r.boot();
  CHECK(r.c.armed);
  Controller c;
  c.begin(0, Settings{}, true, 0);
  c.tick(9000, false, false, false, {true, 0}, 0);
  CHECK(!c.armed);
  for (auto x : c.lamps)
    CHECK(x == Color::White); // Missing display acknowledgement cannot shorten lamp test.
}
void controlTests() {
  Rig r;
  r.boot();
  r.tap();
  CHECK(r.c.running);
  CHECK(r.c.target() == 4000);
  r.rocker(1);
  CHECK(r.c.settings.level == 5);
  r.wait(2500);
  CHECK(r.c.settings.level == 5);
  r.rocker(-1);
  CHECK(r.c.settings.level == 4);
  r.rocker(0);
  r.hold();
  CHECK(r.c.mode == Mode::SetMax);
  r.release();
  for (int i = 0; i < 5; ++i) {
    r.rocker(-1);
    r.rocker(0);
  }
  CHECK(r.c.draft == 5);
  CHECK(r.c.target() == 4000);
  r.tap();
  CHECK(r.c.settings.cap == 5);
  CHECK(r.c.settings.level == 8);
  CHECK(r.c.target() == 4000);
  r.hold();
  r.release();
  r.hold();
  CHECK(r.c.mode == Mode::Flush);
  CHECK(r.c.target() == 10000);
  r.release();
  r.rocker(1);
  r.trigger(true);
  CHECK(r.c.mode == Mode::Normal);
  CHECK(r.c.target() == 4000);
  r.release();
  CHECK(r.c.running);
  CHECK(r.c.settings.level == 8);
  for (uint32_t duration : {499U, 500U, 1499U, 1500U, 30000U}) {
    Rig x;
    x.boot();
    x.j = true;
    x.step(1, false);
    x.step(25, false);
    x.step(duration - 25, false);
    x.j = false;
    x.step(0, false);
    x.step(25, false);
    if (duration == 499)
      CHECK(x.c.running);
    if (duration == 500 || duration == 1499)
      CHECK(!x.c.running && x.c.mode == Mode::Normal);
    if (duration == 1500)
      CHECK(x.c.mode == Mode::SetMax);
    if (duration == 30000)
      CHECK(x.c.latched & faultBit(10));
  }
  // Mode holds ignore G/H and consume the activation.
  Rig x;
  x.boot();
  x.hold(700);
  x.rocker(1);
  x.release();
  CHECK(x.c.settings.level == 4);
  x.wait(200);
  CHECK(x.c.settings.level == 4);
  x.tap();
  CHECK(x.c.running);
  // Millisecond wrap must not create a tap, early mode change or false stuck trigger.
  Rig wrap(0xFFFFF800U);
  wrap.boot();
  wrap.tap();
  CHECK(wrap.c.running);
  wrap.hold();
  CHECK(wrap.c.mode == Mode::SetMax);
}
void faultTests() {
  for (uint8_t code : {uint8_t(1), uint8_t(3), uint8_t(4), uint8_t(8)})
    for (int rocker : {-1, 0, 1}) {
      Rig r;
      r.boot();
      r.tap();
      r.wait(100);
      r.rocker(rocker);
      r.setFault(code, true);
      CHECK(r.c.latched & faultBit(code));
      CHECK(r.c.target() == 0);
      r.wait(500);
      r.setFault(code, false);
      r.hold(3000);
      CHECK(r.c.latched == 0);
      CHECK(!r.c.running);
      for (uint8_t i = 0; i < r.c.settings.level; ++i)
        CHECK(r.c.lamps[i] == Color::White);
      r.release();
      r.wait(400);
      CHECK(r.c.armed);
      r.tap();
      CHECK(r.c.running);
    }
  Rig r;
  r.boot();
  r.setFault(3, true);
  r.setFault(4, true);
  r.setFault(3, false);
  r.hold(3100);
  CHECK(r.c.latched == (faultBit(3) | faultBit(4)));
  r.setFault(4, false);
  r.wait(5000);
  CHECK(r.c.latched);
  r.release();
  r.hold(3000);
  CHECK(!r.c.latched);
  Rig x;
  x.boot();
  x.setFault(3, true);
  x.setFault(3, false);
  x.hold(1400);
  x.setFault(4, true);
  x.setFault(4, false);
  x.wait(2000);
  CHECK(x.c.latched);
  x.release();
  x.hold(3000);
  CHECK(!x.c.latched);
  Rig bad;
  bad.boot();
  bad.tap();
  bad.f.valid = false;
  bad.wait(400, false);
  CHECK(bad.c.active & faultBit(8));
  CHECK(bad.c.target() == 0);
  bad.f.valid = true;
  bad.f.position = 0;
  bad.wait(400);
  CHECK(!(bad.c.active & faultBit(8)));
  Rig stuck;
  stuck.boot();
  stuck.tap();
  stuck.f.position = 0;
  stuck.wait(4500, false);
  CHECK(stuck.c.latched & faultBit(5));
  CHECK(stuck.c.target() == 0);
  Rig trigger(0, false, false, true);
  trigger.wait(30100);
  CHECK(trigger.c.active & faultBit(10));
  trigger.release();
  trigger.step();
  CHECK(!(trigger.c.active & faultBit(10)));
  CHECK(trigger.c.latched & faultBit(10));
  Rig conflict;
  conflict.boot();
  conflict.g = conflict.h = true;
  conflict.wait(200);
  CHECK(conflict.c.active & faultBit(7));
  conflict.h = false;
  conflict.wait(40);
  CHECK(!(conflict.c.active & faultBit(7)));
  // Unsupported sensors never become fitted fault detectors.
  Rig unsupported;
  unsupported.boot();
  unsupported.faults = faultBit(2) | faultBit(9);
  unsupported.step();
  CHECK(unsupported.c.latched == 0);
  // Fault fill consumes code positions instead of skipping them.
  Rig fill;
  fill.boot();
  fill.setFault(1, true);
  fill.setFault(1, false);
  fill.hold(280);
  CHECK(fill.c.lamps[0] == Color::Blue);
  CHECK(fill.c.lamps[1] != Color::White);
  fill.wait(350);
  CHECK(fill.c.lamps[0] == Color::Blue);
  CHECK(fill.c.lamps[1] == Color::White);
}
void curveTests() {
  CHECK(validCurve(OPENING_AT_FLOW));
  CHECK(dacCode(0) == 13107);
  CHECK(dacCode(5000) == 39321);
  CHECK(dacCode(10000) == 65535);
  for (uint8_t cap = 1; cap <= 10; ++cap)
    for (uint16_t ref = 0; ref <= 10000; ref += 10) {
      const uint8_t level = nearestLevel(ref, cap);
      CHECK(level >= 1 && level <= 10);
      for (uint8_t other = 1; other <= 10; ++other)
        CHECK(distance(opening(level, cap), ref) <= distance(opening(other, cap), ref));
    }
  uint16_t curve[11] = {0, 300, 500, 800, 1200, 1800, 2500, 3500, 5000, 7000, 10000};
  CHECK(validCurve(curve));
  CHECK(opening(4, 5, curve) == 500);
  curve[5] = 100;
  CHECK(!validCurve(curve));
  CHECK(nearestLevel(4000, 5) == 8);
  CHECK(nearestLevel(4000, 6) == 7);
}
void persistenceTests() {
  Mem m;
  Storage<Mem> store(m);
  CHECK(!store.load());
  Saved a;
  a.level = 3;
  a.cap = 7;
  a.faults = faultBit(3);
  CHECK(store.start(a));
  while (store.writing())
    store.step();
  Storage<Mem> first(m);
  CHECK(first.load());
  CHECK(first.saved.level == 3);
  for (unsigned cut = 0; cut <= RECORD_SIZE + 1; ++cut) {
    Mem trial = m;
    Storage<Mem> writer(trial);
    CHECK(writer.load());
    Saved b = writer.saved;
    b.level = 8;
    b.cap = 5;
    CHECK(writer.start(b));
    for (unsigned i = 0; i < cut; ++i)
      writer.step();
    Storage<Mem> reader(trial);
    CHECK(reader.load());
    CHECK(reader.saved.level == (cut < RECORD_SIZE + 1 ? 3 : 8));
  }
  uint8_t record[RECORD_SIZE];
  encode(a, record);
  Saved decoded;
  CHECK(decode(record, decoded));
  for (unsigned byte = 0; byte < RECORD_SIZE; ++byte)
    for (unsigned bitno = 0; bitno < 8; ++bitno) {
      record[byte] ^= 1U << bitno;
      CHECK(!decode(record, decoded));
      record[byte] ^= 1U << bitno;
    }
  Saved old = a, newer = a;
  old.sequence = 0xFFFFFFFFU;
  newer.sequence = 0;
  encode(old, m.b);
  encode(newer, m.b + RECORD_SIZE);
  Storage<Mem> wrap(m);
  CHECK(wrap.load());
  CHECK(wrap.saved.sequence == 0);
}
void protocolTests() {
  FakeBus bus;
  Protocol<FakeBus> p(bus);
  CHECK(p.dacRange());
  CHECK(bus.address == 0x58 && bus.tx[0] == 1 && bus.tx[1] == 4);
  CHECK(p.command(0));
  CHECK(bus.tx[1] == 0x33 && bus.tx[2] == 0x33);
  CHECK(!p.command(10001));
  for (uint8_t i = 0; i < 10; ++i) {
    CHECK(p.lamp(i, true, false));
    CHECK(bus.address == 0x60 + 2 * (i / 4));
    CHECK(bus.tx[1] == (i % 4) * 2 + 1);
    CHECK(bus.tx[2] == 0 && bus.tx[3] == 0);
    CHECK(bus.tx[4] == (i % 4) * 2);
    CHECK(bus.tx[5] == 255 && bus.tx[6] == 255);
    CHECK(!p.lamp(i, true, true));
  }
  CHECK(!p.lamp(10, true, false));
  bus.writeOk = false;
  CHECK(!p.command(1000));
  CHECK(!p.digital(0x60, 0, 1));
  bus.writeOk = true;
  bus.readOk = false;
  CHECK(!p.digital(0x60, 0, 1));
  bus.readOk = true;
  bus.echoBad = true;
  CHECK(!p.digital(0x60, 0, 1));
  FakeDriver d;
  Lamps<FakeDriver> lamps(d);
  Color desired[10]{};
  bool complete;
  lamps.reset(0);
  desired[0] = Color::White;
  CHECK(lamps.step(desired, 3, complete));
  CHECK(!complete);
  desired[0] = Color::Blue;
  CHECK(lamps.step(desired, 4, complete));
  CHECK(d.states.back() == 0);
  auto n = d.states.size();
  CHECK(lamps.step(desired, 5, complete));
  CHECK(d.states.size() == n);
  CHECK(lamps.step(desired, 6, complete));
  CHECK(d.states.back() == 1);
  for (bool scl : {false, true}) {
    StuckPins pins;
    pins.externalScl = scl;
    pins.externalSda = !scl;
    SoftI2C<StuckPins> i2c(pins);
    uint8_t b = 0;
    CHECK(!i2c.write(0x58, &b, 1));
    CHECK(pins.ticks < 20500);
    CHECK(!pins.sclLow && !pins.sdaLow);
    CHECK(!i2c.recover());
  }
  StuckPins rollover;
  rollover.ticks = 0xFFFFF000;
  rollover.externalScl = true;
  SoftI2C<StuckPins> i2c(rollover);
  uint8_t b = 0;
  CHECK(!i2c.write(0x58, &b, 1));
  CHECK(uint32_t(rollover.ticks - 0xFFFFF000) < 20500);
}

void diagnosticTests() {
  CHECK(!validFeedback(349));
  CHECK(validFeedback(350));
  CHECK(validFeedback(2700));
  CHECK(!validFeedback(2701));
  CHECK(feedbackPosition(475) == 0);
  CHECK(feedbackPosition(2376) == 10000);
  for (uint16_t mv = 0; mv < 5500; ++mv) {
    CHECK(feedbackPosition(mv) <= 10000);
    if (mv)
      CHECK(feedbackPosition(mv) >= feedbackPosition(mv - 1));
  }
  FrameMonitor f;
  CHECK(f.update(100, 0));
  CHECK(f.update(400, 300));
  CHECK(!f.update(400, 600));
  f.reset();
  CHECK(f.update(0xFFFFFF00, 0xFFFFFF00));
  CHECK(f.update(44, 44));
  CHECK(!f.update(0, 344));
  f.reset();
  CHECK(f.update(1000, 100));
  CHECK(!f.update(5000, 400));
}
void enduranceTests() {
  // Repeated new targets must not restart an already-running movement deadline.
  Rig moving;
  moving.boot();
  moving.tap();
  moving.f.position = 1000;
  for (unsigned i = 0; i < 160; ++i) {
    moving.f.position = (i % 2) ? 1000 : 1200;
    moving.g = i % 4 == 0;
    moving.h = i % 4 == 2;
    moving.step(100, false);
  }
  CHECK(moving.c.latched & faultBit(5));
  CHECK(moving.c.target() == 0);
  // A cleared latch does not open while closed-position recovery is unfinished.
  Rig recovery;
  recovery.boot();
  recovery.tap();
  recovery.setFault(3, true);
  recovery.f.position = 2000;
  recovery.setFault(3, false);
  recovery.j = true;
  recovery.step(1, false);
  recovery.step(25, false);
  recovery.step(3000, false);
  CHECK(recovery.c.latched == 0);
  CHECK(recovery.c.target() == 0);
  CHECK(!recovery.c.armed);
  CHECK(!recovery.c.running);
  // Invalid saved settings cannot become array indices or opening requests.
  Controller invalid;
  Settings s;
  s.level = 0;
  s.cap = 255;
  invalid.begin(0, s, true, 0);
  CHECK(invalid.latched & faultBit(6));
  CHECK(invalid.settings.level == 4 && invalid.settings.cap == 10);
  CHECK(invalid.target() == 0);
  // Seeded state/gesture/fault stress with a finite-speed simulated actuator.
  uint32_t seed = 0x5EEDC0DE;
  auto random = [&]() {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return seed;
  };
  Rig r(0xFFFF0000);
  r.boot();
  for (unsigned i = 0; i < 12000; ++i) {
    unsigned action = random() % 40;
    if (action == 0)
      r.g = !r.g;
    if (action == 1)
      r.h = !r.h;
    if (action == 2)
      r.j = !r.j;
    if (action == 3)
      r.faults ^= faultBit(3);
    if (action == 4)
      r.faults ^= faultBit(4);
    if (action == 5)
      r.f.valid = !r.f.valid;
    uint16_t goal = r.c.target();
    if (goal > r.f.position)
      r.f.position += goal - r.f.position > 200 ? 200 : goal - r.f.position;
    else
      r.f.position -= r.f.position - goal > 200 ? 200 : r.f.position - goal;
    r.step(50 + random() % 100, false);
    CHECK(r.c.settings.level >= 1 && r.c.settings.level <= 10);
    CHECK(r.c.settings.cap >= 1 && r.c.settings.cap <= 10);
    CHECK(r.c.target() <= 10000);
    CHECK((r.c.active & ~r.c.latched) == 0);
    if (r.c.latched || r.c.recovery)
      CHECK(r.c.target() == 0);
    for (auto color : r.c.lamps)
      CHECK(color == Color::Off || color == Color::Blue || color == Color::White);
  }
}
int main() {
  startupTests();
  controlTests();
  faultTests();
  curveTests();
  persistenceTests();
  protocolTests();
  diagnosticTests();
  enduranceTests();
  std::cout << "Firmware tests passed: " << checks << " assertions\n";
}
