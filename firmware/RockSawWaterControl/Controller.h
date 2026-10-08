#pragma once
#include "Config.h"
namespace water {
enum class Mode : uint8_t { Normal, SetMax, Flush };
enum class Color : uint8_t { Off, Blue, White };
struct Feedback {
  bool valid;
  uint16_t position;
};
struct Settings {
  uint8_t level = 4, cap = 10;
};
struct Debounce {
  bool raw = false, value = false;
  uint32_t changed = 0;
  void begin(bool v, uint32_t now) {
    raw = value = v;
    changed = now;
  }
  bool update(bool v, uint32_t now) {
    if (v != raw) {
      raw = v;
      changed = now;
    }
    if (v != value && elapsed(now, changed) >= DEBOUNCE_MS) {
      value = v;
      return true;
    }
    return false;
  }
};
struct Event {
  uint32_t ms;
  uint16_t active, latched;
};
class Controller {
public:
  Settings settings;
  Mode mode = Mode::Normal;
  bool running = false, armed = false, recovery = true, startup = true;
  uint8_t draft = 10;
  uint16_t active = 0, latched = 0;
  Color lamps[10]{};
  bool settingsChanged = false, acknowledged = false;
  uint32_t now = 0;
  Event events[16]{};
  uint8_t eventCount = 0, eventNext = 0;
  void begin(uint32_t time, Settings s, bool settingsValid, uint16_t savedFaults, bool g = false,
             bool h = false, bool j = false) {
    now = boot = time;
    settings = s;
    if (!settingsValid || s.level < 1 || s.level > 10 || s.cap < 1 || s.cap > 10) {
      settings = Settings{};
      savedFaults |= faultBit(6);
    }
    latched = savedFaults & SUPPORTED_FAULTS;
    draft = settings.cap;
    for (uint8_t i = 0; i < 3; ++i)
      in[i].begin(i == 0 ? g : i == 1 ? h : j, time);
    jSince = time;
    jWas = j;
    lastRocker = g && h ? 2 : g ? 1 : h ? -1 : 0;
    log();
    render();
  }
  uint16_t target() const {
    if (latched || recovery)
      return 0;
    if (mode == Mode::Flush)
      return 10000;
    if (!running)
      return 0;
    if (mode == Mode::SetMax)
      return heldOpening;
    return opening(settings.level, settings.cap);
  }
  uint16_t resumeOpening() const { return opening(settings.level, settings.cap); }
  void lampFrameApplied(uint32_t t) {
    if (startup && !latched && (lampStage == 0 || lampStage == 2)) {
      ++lampStage;
      lampSince = t;
    }
  }
  bool pressedJ() const { return in[2].value; }
  bool closed() const { return closedQualified; }
  void tick(uint32_t time, bool g, bool h, bool j, Feedback f, uint16_t external) {
    now = time;
    if ((lampStage == 1 || lampStage == 3) && elapsed(now, lampSince) >= 1000)
      ++lampStage;
    acknowledged = false;
    settingsChanged = false;
    feedback = f;
    for (uint8_t i = 0; i < 3; ++i)
      in[i].update(i == 0 ? g : i == 1 ? h : j, now);
    const bool G = in[0].value, H = in[1].value, J = in[2].value;
    const bool down = J && !jWas, up = !J && jWas;
    if (down)
      jSince = now;
    const bool overdue = (J || up) && elapsed(now, jSince) >= STUCK_J_MS;
    uint16_t causes = external & SUPPORTED_FAULTS;
    if (overdue)
      causes |= faultBit(10);
    if (G && H) {
      if (!conflictPending) {
        conflictPending = true;
        conflictSince = now;
      }
      if (elapsed(now, conflictSince) >= CONFLICT_MS)
        causes |= faultBit(7);
    } else
      conflictPending = false;
    if (!validCurve(OPENING_AT_FLOW))
      causes |= faultBit(6);
    if (f.valid && f.position <= CLOSED_TOLERANCE) {
      if (!closePending) {
        closePending = true;
        closeSince = now;
      }
      closedQualified = elapsed(now, closeSince) >= POSITION_SETTLE_MS;
    } else {
      closePending = false;
      closedQualified = false;
    }
    if (!f.valid) {
      if (!badPending) {
        badPending = true;
        badSince = now;
      }
      if (elapsed(now, boot) >= FEEDBACK_GRACE_MS && elapsed(now, badSince) >= FEEDBACK_BAD_MS)
        causes |= faultBit(8);
    } else
      badPending = false;
    if (closedQualified)
      motionFailed = false;
    supervise();
    if (motionFailed)
      causes |= faultBit(5);
    const uint16_t newlyActive = causes & ~active, newlyLatched = causes & ~latched;
    if (causes != active || newlyLatched) {
      active = causes;
      latched |= causes;
      log();
    }
    if (newlyActive || newlyLatched) {
      running = false;
      mode = Mode::Normal;
      draft = settings.cap;
      armed = false;
      recovery = true;
      neutralPending = false;
      press = Press::None;
      consumed = true;
    }
    const int8_t rocker = G && H ? 2 : G ? 1 : H ? -1 : 0;
    if (down) {
      pressSince = now;
      consumed = false;
      if (latched) {
        press = Press::Fault;
        eligible = active == 0;
      } else if (!armed) {
        press = Press::None;
        consumed = true;
      } else if (mode == Mode::Flush) {
        mode = Mode::Normal;
        press = Press::None;
        consumed = true;
      } else {
        press = Press::Mode;
        eligible = !(mode == Mode::SetMax && !running && !closedQualified);
      }
    }
    // Elapsed-time classification also runs on a delayed release.
    if ((J || up) && !consumed) {
      const uint32_t held = elapsed(now, pressSince);
      if (press == Press::Fault) {
        if (active)
          eligible = false;
        if (eligible && held >= RESET_HOLD_MS) {
          if (latched & faultBit(6))
            settings = Settings{};
          latched = 0;
          running = false;
          mode = Mode::Normal;
          recovery = true;
          startup = false;
          armed = false;
          neutralPending = false;
          consumed = true;
          press = Press::None;
          acknowledged = true;
          settingsChanged = true;
          blinkEpoch = now;
          log();
        }
      } else if (press == Press::Mode && eligible && held >= HOLD_MS) {
        if (mode == Mode::Normal) {
          mode = Mode::SetMax;
          draft = settings.cap;
          reference = running && feedback.valid ? feedback.position : resumeOpening();
          heldOpening = reference;
        } else {
          commitMax();
          mode = Mode::Flush;
        }
        consumed = true;
      }
    }
    if (up) {
      if (!consumed && press == Press::Mode && elapsed(now, pressSince) < TAP_MS) {
        if (mode == Mode::Normal) {
          if (running) {
            drainOpening = feedback.valid ? feedback.position : resumeOpening();
            drainLevel = settings.level;
          }
          running = !running;
          blinkEpoch = now;
        } else if (mode == Mode::SetMax)
          commitMax();
      }
      press = Press::None;
      consumed = true;
    }
    if (!latched && !J && armed && rocker != lastRocker && (rocker == 1 || rocker == -1) &&
        mode != Mode::Flush) {
      uint8_t &v = mode == Mode::SetMax ? draft : settings.level;
      if (rocker == 1 && v < 10)
        ++v;
      else if (rocker == -1 && v > 1)
        --v;
      if (mode == Mode::Normal)
        settingsChanged = true;
    }
    lastRocker = rocker;
    jWas = J;
    if (!latched && recovery && closedQualified && (!startup || lampStage == 4)) {
      const bool neutral = !J && (!startup || (!G && !H));
      if (neutral) {
        if (!neutralPending) {
          neutralPending = true;
          neutralSince = now;
        }
        if (elapsed(now, neutralSince) >= NEUTRAL_MS) {
          recovery = false;
          startup = false;
          armed = true;
        }
      } else
        neutralPending = false;
    }
    render();
  }

private:
  enum class Press : uint8_t { None, Mode, Fault };
  Press press = Press::None;
  Debounce in[3];
  Feedback feedback{false, 0};
  bool jWas = false, consumed = true, eligible = false;
  bool neutralPending = false, conflictPending = false, badPending = false, closePending = false,
       closedQualified = false;
  bool moving = false, motionFailed = false;
  int8_t lastRocker = 0;
  uint8_t lampStage = 0;
  uint32_t lampSince = 0;
  uint32_t boot = 0, jSince = 0, pressSince = 0, neutralSince = 0, conflictSince = 0, badSince = 0,
           closeSince = 0;
  uint32_t moveSince = 0, progressSince = 0, blinkEpoch = 0;
  uint16_t monitoredTarget = 65535, progressPosition = 0, heldOpening = 0, reference = 0,
           drainOpening = 0;
  uint8_t drainLevel = 0;
  void log() {
    events[eventNext] = {now, active, latched};
    eventNext = (eventNext + 1) % 16;
    if (eventCount < 16)
      ++eventCount;
  }
  void commitMax() {
    settings.cap = draft;
    settings.level = nearestLevel(reference, draft);
    mode = Mode::Normal;
    settingsChanged = true;
  }
  void supervise() {
    const uint16_t t = target();
    if (!feedback.valid)
      return;
    const uint16_t tolerance = t == 0 ? CLOSED_TOLERANCE : ARRIVAL_TOLERANCE;
    if (distance(feedback.position, t) <= tolerance) {
      moving = false;
      monitoredTarget = t;
      return;
    }
    if (!moving) {
      moving = true;
      moveSince = progressSince = now;
      progressPosition = feedback.position;
    }
    monitoredTarget = t;
    if (distance(progressPosition, feedback.position) >= PROGRESS_STEP) {
      progressPosition = feedback.position;
      progressSince = now;
    }
    if (elapsed(now, moveSince) >= MOVE_TIMEOUT_MS || elapsed(now, progressSince) >= NO_PROGRESS_MS)
      motionFailed = true;
  }
  void render() {
    for (auto &c : lamps)
      c = Color::Off;
    const bool phase = (elapsed(now, blinkEpoch) / 600) % 2 == 0;
    if (latched) {
      if (press == Press::Fault && in[2].value && !consumed && !eligible && active) {
        const uint32_t h = elapsed(now, pressSince);
        if (h < 4500) {
          const uint32_t period = h >= 3000 ? 250 : 600;
          for (uint8_t i = 0; i < 10; ++i)
            lamps[i] = ((h / period + i) % 2) ? Color::Blue : Color::White;
          return;
        }
      }
      const bool fill = press == Press::Fault && in[2].value && eligible && !consumed;
      const uint8_t count = fill ? uint8_t(elapsed(now, pressSince) / 300) : 0;
      for (uint8_t i = 0; i < 10; ++i) {
        if (i < count)
          lamps[i] = Color::White;
        if (latched & faultBit(i + 1))
          lamps[i] = fill    ? Color::Blue
                     : phase ? ((active & faultBit(i + 1)) ? Color::White : Color::Blue)
                             : Color::Off;
      }
      return;
    }
    if (startup && lampStage < 4) {
      for (auto &c : lamps)
        c = lampStage < 2 ? Color::White : Color::Blue;
      return;
    }
    if (mode == Mode::SetMax)
      lamps[draft - 1] = phase ? Color::Blue : Color::White;
    else if (mode == Mode::Flush) {
      for (auto &c : lamps)
        c = Color::Blue;
      uint8_t k = (now / 140) % 5;
      lamps[4 - k] = lamps[5 + k] = Color::White;
    } else {
      for (uint8_t i = 0; i < settings.level; ++i)
        lamps[i] = Color::White;
      if (running) {
        uint16_t goal = resumeOpening();
        uint8_t count =
            feedback.valid && goal
                ? uint8_t((uint32_t(feedback.position) * settings.level + goal / 2) / goal)
                : 0;
        if (count > settings.level)
          count = settings.level;
        for (uint8_t i = 0; i < count; ++i)
          lamps[i] = Color::Blue;
      } else {
        if (!recovery && feedback.valid && drainOpening && feedback.position > CLOSED_TOLERANCE) {
          uint32_t count =
              (uint32_t(feedback.position) * drainLevel + drainOpening / 2) / drainOpening;
          if (count > drainLevel)
            count = drainLevel;
          for (uint8_t i = 0; i < count; ++i)
            lamps[i] = Color::Blue;
        }
        lamps[settings.cap - 1] = phase                            ? Color::Blue
                                  : settings.cap <= settings.level ? Color::White
                                                                   : Color::Off;
      }
    }
    if (press == Press::Mode && in[2].value && !consumed && eligible) {
      uint32_t h = elapsed(now, pressSince);
      if (h >= TAP_MS && h < HOLD_MS) {
        uint8_t pairs = 1 + (h - TAP_MS) / 200;
        for (uint8_t i = 0; i < pairs && i < 5; ++i)
          lamps[i] = lamps[9 - i] = Color::White;
      }
    }
  }
};
} // namespace water
