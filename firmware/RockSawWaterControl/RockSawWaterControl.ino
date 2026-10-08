/* Rock Saw Water Control 1.0.0-bench — Arduino Nano Every / ATmega4809.
   Revision G wiring. No relay, external watchdog, flow meter or temperature probes.
   Bench qualification is required; this is not a guaranteed water shutoff. */
#include "Controller.h"
#include "Diagnostics.h"
#include "Lamps.h"
#include "Protocol.h"
#include "SoftI2C.h"
#include "Storage.h"
#include <Arduino.h>
#include <EEPROM.h>
#include <avr/cpufunc.h>
#include <avr/io.h>
#include <avr/wdt.h>
#if !defined(__AVR_ATmega4809__)
#error Select Arduino Nano Every (arduino:megaavr:nona4809).
#endif
using namespace water;
struct Pins {
  void sda(bool low) {
    digitalWrite(A4, LOW);
    pinMode(A4, low ? OUTPUT : INPUT);
  }
  void scl(bool low) {
    digitalWrite(A5, LOW);
    pinMode(A5, low ? OUTPUT : INPUT);
  }
  bool readSda() { return digitalRead(A4) == HIGH; }
  bool readScl() { return digitalRead(A5) == HIGH; }
  uint32_t time() { return micros(); }
  void pause() { delayMicroseconds(4); } // Maximum <100 kHz; actual GPIO overhead makes it slower.
} pins;
struct Bus : SoftI2C<Pins> {
  Bus() : SoftI2C<Pins>(pins) {}
  void waitResponse() { delayMicroseconds(1000); }
} bus;
Protocol<Bus> protocol(bus);
Lamps<Protocol<Bus>> lamps(protocol);
Controller controller;
struct Memory {
  uint8_t read(uint16_t a) { return EEPROM.read(a); }
  void update(uint16_t a, uint8_t v) { EEPROM.update(a, v); }
} memory;
Storage<Memory> storage(memory);
static_assert(2 * RECORD_SIZE <= 256, "EEPROM layout exceeds Nano Every capacity");
uint8_t resetFlags = 0, diagnosticBoard = 0;
uint16_t adcMv = 0, vin[3] = {0, 0, 0};
bool driverFault[3] = {false, false, false};
bool ready = false, diagnosticsReady[3] = {false, false, false};
uint16_t sentTarget = 65535;
uint32_t lastInit = 0, lastDiagnostic = 0, lastCommand = 0, saveAfter = 0, healthySince = 0;
bool commBad = true, healthyPending = false, savePending = false;
char versions[6][8]{};
FrameMonitor frameHealth[6];

void enableWatchdog() {
  // ATmega4809 protected write; two-second period from its independent oscillator.
  wdt_reset();
  while (WDT.STATUS & WDT_SYNCBUSY_bm) {
  }
  _PROTECTED_WRITE(WDT.CTRLA, WDT_PERIOD_2KCLK_gc);
  while (WDT.STATUS & WDT_SYNCBUSY_bm) {
  }
}
bool initializeBoards() {
  if (!bus.recover())
    return false;
  // Close command is issued before display/diagnostic initialization.
  if (!protocol.dacRange() || !protocol.command(0))
    return false;
  sentTarget = 0;
  lastCommand = millis();
  uint8_t rx[8];
  for (uint8_t b = 0; b < 3; ++b) {
    const uint8_t even = 0x60 + 2 * b, odd = even + 1;
    for (uint8_t chip = 0; chip < 2; ++chip) {
      if (!protocol.version(even + chip, rx) || rx[4] != 'B')
        return false;
      for (uint8_t k = 0; k < 7; ++k)
        versions[2 * b + chip][k] = rx[k + 1];
      versions[2 * b + chip][7] = 0;
    }
    for (uint8_t ch = 0; ch < 8; ++ch)
      if (!protocol.digital(even, ch, 0))
        return false; // Also disarms any old CH4 watchdog configuration.
    if (!protocol.analog(odd, 1) || !protocol.digital(odd, 0, 0) || !protocol.digital(odd, 6, 0) ||
        !protocol.digital(odd, 2, 1) || !protocol.digital(odd, 5, 2, true) ||
        !protocol.digital(odd, 7, 2, true))
      return false;
    diagnosticsReady[b] = false;
    driverFault[b] = false;
    frameHealth[2 * b].reset();
    frameHealth[2 * b + 1].reset();
  }
  lamps.reset(millis());
  return true;
}
bool readDiagnostics(uint8_t b) {
  uint16_t vcc, raw, lower, upper = 1;
  const uint8_t odd = 0x61 + 2 * b;
  if (!protocol.publicData(odd, 75, vcc) || !protocol.publicData(odd, 1, raw) ||
      !protocol.publicData(odd, 7, lower))
    return false;
  if (b < 2 && !protocol.publicData(odd, 5, upper))
    return false; // HSD3 upper bank is completely unused.
  for (uint8_t k = 0; k < 2; ++k) {
    const uint8_t i = 2 * b + k;
    uint32_t frame;
    if (!protocol.frames(0x60 + i, frame))
      return false;
    if (!frameHealth[i].update(frame, millis()))
      return false;
  }
  if (vcc < 4000 || vcc > 5500)
    return false;
  const uint32_t mv = uint32_t(raw) * vcc / 65536UL * 11UL;
  if (mv > 65535)
    return false;
  vin[b] = uint16_t(mv);
  driverFault[b] = !lower || !upper;
  diagnosticsReady[b] = true;
  return true;
}
Feedback readFeedback() {
  // Fixed-size average; invalid ranges remain invalid rather than clamped healthy.
  static uint16_t samples[8]{};
  static uint8_t next = 0, count = 0;
  static uint32_t sum = 0;
  const uint16_t raw = analogRead(A0);
  sum -= samples[next];
  samples[next] = raw;
  sum += raw;
  next = (next + 1) % 8;
  if (count < 8)
    ++count;
  adcMv = uint32_t(sum) * ADC_REFERENCE_MV / (uint32_t(count) * 1023);
  return Feedback{validFeedback(adcMv), feedbackPosition(adcMv)};
}
void scheduleSave(uint32_t now, bool urgent) {
  savePending = true;
  saveAfter = now + (urgent ? 0 : 2000);
}
void saveStep(uint32_t now) {
  storage.step();
  if (!savePending || storage.writing() || int32_t(now - saveAfter) < 0)
    return;
  Saved s;
  s.level = controller.settings.level;
  s.cap = controller.settings.cap;
  s.faults = controller.latched;
  s.reset = resetFlags;
  if (s.level != storage.saved.level || s.cap != storage.saved.cap ||
      s.faults != storage.saved.faults || s.reset != storage.saved.reset ||
      storage.saved.sequence == 0)
    storage.start(s);
  savePending = false;
}
// Bounded service console: no commands can open the valve or bypass fault acknowledgement.
char input[16]{}, output[256]{};
uint8_t inputLength = 0;
uint16_t outputLength = 0, outputAt = 0;
bool lineOverflow = false;
int8_t logIndex = -1;
void queueStatus() {
  outputLength =
      snprintf(output, sizeof(output),
               "v1.0.0-bench reset=%u mode=%u level=%u cap=%u target=%u adc_mV=%u vin=%u/%u/%u "
               "active=%u latched=%u ready=%u\r\n",
               resetFlags, unsigned(controller.mode), controller.settings.level,
               controller.settings.cap, controller.target(), adcMv, vin[0], vin[1], vin[2],
               controller.active, controller.latched, unsigned(controller.armed));
  if (outputLength >= sizeof(output))
    outputLength = sizeof(output) - 1;
  outputAt = 0;
}
void serviceConsole() {
  if (outputAt < outputLength) {
    int room = Serial.availableForWrite();
    if (room <= 0)
      return;
    uint16_t n = outputLength - outputAt;
    if (n > 16)
      n = 16;
    if (n > uint16_t(room))
      n = room;
    if (n) {
      Serial.write((uint8_t *)output + outputAt, n);
      outputAt += n;
    }
    return;
  }
  if (logIndex >= 0) {
    if (logIndex >= controller.eventCount) {
      logIndex = -1;
      return;
    }
    const uint8_t i = (controller.eventNext + 16 - controller.eventCount + logIndex) % 16;
    const Event &e = controller.events[i];
    outputLength = snprintf(output, sizeof(output), "ms=%lu active=%u latched=%u\r\n",
                            (unsigned long)e.ms, e.active, e.latched);
    outputAt = 0;
    ++logIndex;
    return;
  }
  for (uint8_t i = 0; i < 8 && Serial.available(); ++i) {
    char c = Serial.read();
    if (c == '\r')
      continue;
    if (c == '\n') {
      input[inputLength] = 0;
      if (!lineOverflow && strcmp(input, "status") == 0)
        queueStatus();
      else if (!lineOverflow && strcmp(input, "log") == 0)
        logIndex = 0;
      else if (!lineOverflow && strcmp(input, "boards") == 0) {
        outputLength =
            snprintf(output, sizeof(output), "0x60..65: %s %s %s %s %s %s\r\n", versions[0],
                     versions[1], versions[2], versions[3], versions[4], versions[5]);
        outputAt = 0;
      } else {
        const char text[] = "Commands: status, log, boards, help. Fault reset uses J.\r\n";
        memcpy(output, text, sizeof(text));
        outputLength = sizeof(text) - 1;
        outputAt = 0;
      }
      inputLength = 0;
      lineOverflow = false;
      break;
    } else if (inputLength < sizeof(input) - 1)
      input[inputLength++] = c;
    else
      lineOverflow = true;
  }
}
void setup() {
  resetFlags = RSTCTRL.RSTFR;
  RSTCTRL.RSTFR = resetFlags;
  enableWatchdog();
  pinMode(2, INPUT);
  pinMode(3, INPUT);
  pinMode(4, INPUT);
  pinMode(A0, INPUT);
  Serial.begin(115200);
  bool valid = storage.load(), blank = true;
  for (uint8_t i = 0; i < 2 * RECORD_SIZE; ++i)
    if (memory.read(i) != 0xFF)
      blank = false;
  Settings s;
  if (valid) {
    s.level = storage.saved.level;
    s.cap = storage.saved.cap;
  }
  uint16_t faults = valid ? storage.saved.faults : 0;
  if ((resetFlags & RSTCTRL_WDRF_bm) ||
      ((resetFlags & RSTCTRL_BORF_bm) && !(resetFlags & RSTCTRL_PORF_bm)))
    faults |= faultBit(1);
  ready = initializeBoards();
  commBad = !ready;
  lastInit = millis();
  controller.begin(millis(), s, valid || blank, faults, digitalRead(2), digitalRead(3),
                   digitalRead(4));
  scheduleSave(millis(), true);
  wdt_reset();
}
void loop() {
  uint32_t now = millis();
  if (!ready && elapsed(now, lastInit) >= 1000) {
    lastInit = now;
    ready = initializeBoards();
    if (ready) {
      healthyPending = true;
      healthySince = millis();
    }
  }
  bool ioOk = ready;
  if (ready && elapsed(now, lastDiagnostic) >= 100) {
    lastDiagnostic = now;
    ioOk = readDiagnostics(diagnosticBoard);
    diagnosticBoard = (diagnosticBoard + 1) % 3;
  }
  if (!ioOk) {
    commBad = true;
    healthyPending = false;
    ready = false;
  } else if (commBad) {
    if (!healthyPending) {
      healthyPending = true;
      healthySince = now;
    }
    if (elapsed(now, healthySince) >= 500 && diagnosticsReady[0] && diagnosticsReady[1] &&
        diagnosticsReady[2])
      commBad = false;
  }
  uint16_t causes = commBad ? faultBit(3) : 0;
  static uint32_t badPowerSince = 0, badDriverSince = 0;
  static bool powerPending = false, driverPending = false;
  bool badPower = false, badDriver = false;
  for (uint8_t b = 0; b < 3; ++b)
    if (diagnosticsReady[b]) {
      badPower |= vin[b] < SUPPLY_LOW_MV || vin[b] > SUPPLY_HIGH_MV;
      badDriver |= driverFault[b];
    }
  if (badPower) {
    if (!powerPending) {
      powerPending = true;
      badPowerSince = now;
    }
    if (elapsed(now, badPowerSince) >= 200)
      causes |= faultBit(1);
  } else
    powerPending = false;
  if (badDriver) {
    if (!driverPending) {
      driverPending = true;
      badDriverSince = now;
    }
    if (elapsed(now, badDriverSince) >= 100)
      causes |= faultBit(4);
  } else
    driverPending = false;
  const uint16_t before = controller.latched;
  controller.tick(millis(), digitalRead(2), digitalRead(3), digitalRead(4), readFeedback(), causes);
  const uint16_t target = controller.target();
  if (target != sentTarget || elapsed(now, lastCommand) >= 500) {
    lastCommand = now;
    if (protocol.command(ready ? target : 0))
      sentTarget = ready ? target : 0;
    else {
      commBad = true;
      ready = false;
      healthyPending = false;
    }
  }
  if (ready) {
    bool complete = false;
    if (!lamps.step(controller.lamps, millis(), complete)) {
      commBad = true;
      ready = false;
      healthyPending = false;
    } else if (complete)
      controller.lampFrameApplied(millis());
  }
  if (controller.settingsChanged)
    scheduleSave(millis(), false);
  if (before != controller.latched || controller.acknowledged)
    scheduleSave(millis(), true);
  saveStep(millis());
  serviceConsole();
  // Deliberately no watchdog servicing inside bus waits or serial writes.
  wdt_reset();
}
