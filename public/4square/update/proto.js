// The 4square serial protocol, as the page uses it. Pure functions only, so
// Node can test them (flasher/test/) without a browser or a board.
//
// Firmware side: firmware-c/foursquare/foursquare.ino, poll_serial().
//   T YYYY MM DD HH MM SS\n   set the clock from wall time (what a person reads)
//   reply: # time set wall=YYYY-MM-DDTHH:MM:SS std=YYYY-MM-DDTHH:MM:SS dst=N
//   then:  C YYYY-MM-DD HH:MM:SS osf=N dst=N wall=YYYY-MM-DDTHH:MM:SS up=N
// The C report also arrives once a second on its own, which is how the page
// knows the clock has finished starting up.

export const ESPRESSIF_VID = 0x303a;
export const USB_JTAG_SERIAL_PID = 0x1001;
export const BAUD = 115200;

const pad = (n, w = 2) => String(n).padStart(w, "0");

// The firmware accepts years 2000 to 2099 only (it stores two BCD digits).
export function formatTimeCommand(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("formatTimeCommand needs a valid Date");
  }
  const y = date.getFullYear();
  if (y < 2000 || y > 2099) {
    throw new RangeError(`The clock can only hold years 2000 to 2099, not ${y}`);
  }
  return `T ${y} ${pad(date.getMonth() + 1)} ${pad(date.getDate())} ` +
         `${pad(date.getHours())} ${pad(date.getMinutes())} ${pad(date.getSeconds())}`;
}

const STAMP = "(\\d{4})-(\\d{2})-(\\d{2})[T ](\\d{2}):(\\d{2}):(\\d{2})";

function stamp(m, i) {
  return { year: +m[i], month: +m[i + 1], day: +m[i + 2],
           hour: +m[i + 3], minute: +m[i + 4], second: +m[i + 5] };
}

// "# time set wall=... std=... dst=N" -> { wall, std, dst }, or null.
// A firmware without the daylight rule replies a bare "# time set"; that is
// still a success, with wall/std/dst left null.
export function parseTimeReply(line) {
  const s = String(line).trim();
  if (!s.startsWith("# time set")) return null;
  const w = s.match(new RegExp("wall=" + STAMP));
  const st = s.match(new RegExp("std=" + STAMP));
  const d = s.match(/dst=([01])/);
  return {
    wall: w ? stamp(w, 1) : null,
    std: st ? stamp(st, 1) : null,
    dst: d ? d[1] === "1" : null,
  };
}

export function isBadTimeReply(line) {
  return String(line).trim().startsWith("# bad T command");
}

// "C 2026-11-02 09:41:07 osf=0 dst=0 wall=2026-11-02T09:41:07 up=1234"
export function parseReport(line) {
  const s = String(line).trim();
  if (!s.startsWith("C ")) return null;
  if (s.startsWith("C READFAIL")) return { readFail: true, std: null, wall: null, dst: null, osf: null };
  const st = s.match(new RegExp("^C " + STAMP));
  const w = s.match(new RegExp("wall=" + STAMP));
  const d = s.match(/\bdst=([01])/);
  const o = s.match(/\bosf=([01])/);
  if (!st) return null;
  return {
    readFail: false,
    std: stamp(st, 1),
    wall: w ? stamp(w, 1) : null,
    dst: d ? d[1] === "1" : null,
    osf: o ? o[1] === "1" : null,
  };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];

// { hour: 9, minute: 41, ... } -> "9:41 AM, Sunday, November 2"
export function describeWall(t) {
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const ampm = t.hour < 12 ? "AM" : "PM";
  // Weekday from the calendar date alone, independent of this computer's zone.
  const dow = new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay();
  return `${h12}:${pad(t.minute)} ${ampm}, ${DAYS[dow]}, ${MONTHS[t.month - 1]} ${t.day}`;
}

export function wallFromDate(date) {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(),
           hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() };
}

// Seconds between a wall stamp and a local Date (positive: clock is ahead).
export function secondsOff(wall, date) {
  const w = new Date(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return Math.round((w.getTime() - date.getTime()) / 1000);
}

export const DST_SENTENCE =
  "From now on it moves its own hour forward in March and back in November, so you never need to set it again.";

export function doneMessage(wall) {
  return {
    headline: `Your clock now reads ${describeWall(wall)}.`,
    detail: DST_SENTENCE,
  };
}

// Splits a stream of text chunks into lines. "\r" is dropped, as the firmware does.
export class LineSplitter {
  constructor() { this.buf = ""; }
  push(chunk) {
    this.buf += String(chunk).replace(/\r/g, "");
    const parts = this.buf.split("\n");
    this.buf = parts.pop();
    return parts;
  }
}

export function isClockPort(info) {
  return !!info && info.usbVendorId === ESPRESSIF_VID && info.usbProductId === USB_JTAG_SERIAL_PID;
}
