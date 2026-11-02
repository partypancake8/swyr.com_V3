// 4square gift flasher: installs the clock firmware over Web Serial, then sets
// the clock from this computer's time over the same USB cable.
//
// Flashing library: esptool-js 0.7.0 (Apache-2.0), vendored byte for byte from
//   https://unpkg.com/esptool-js@0.7.0/bundle.js
//   sha256 00ebe6fb0b202976d3e2a3c6b9a6bd438c26a81d2af6739c95ac276a64c1a84e
// It is loaded from ./vendor/ only when an install starts, so the page has no
// runtime dependency on a CDN.
import {
  BAUD, ESPRESSIF_VID, LineSplitter, formatTimeCommand, parseTimeReply,
  isBadTimeReply, parseReport, doneMessage, isClockPort, secondsOff, wallFromDate,
} from "./proto.js";

const ESPTOOL_URL = "./vendor/esptool-js-0.7.0.js";
const MANIFEST_URL = "./firmware/current.json";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- the steps UI
const ALL_STEPS = ["connect", "install", "restart", "clock", "done"];

function showSteps(which) {
  $("steps").hidden = false;
  for (const s of ALL_STEPS) {
    const li = $("step-" + s);
    li.hidden = !which.includes(s);
    li.dataset.state = "todo";
    li.querySelector(".note").textContent = "";
  }
  $("progress").hidden = true;
  $("result").hidden = true;
  $("problem").hidden = true;
  $("again").hidden = true;
}

function stepState(step, state, note) {
  const li = $("step-" + step);
  li.dataset.state = state; // todo | active | ok | bad
  if (note !== undefined) li.querySelector(".note").textContent = note;
  if (state === "active") li.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function setProgress(pct) {
  $("progress").hidden = false;
  $("progress-bar").style.width = pct + "%";
  $("progress-text").textContent = pct + "%";
  $("progress").setAttribute("aria-valuenow", String(pct));
}

function showProblem(title, text) {
  $("problem-title").textContent = title;
  $("problem-text").textContent = text;
  $("problem").hidden = false;
  $("problem").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function setBusy(busy) {
  $("go").disabled = busy;
  $("clock-only").disabled = busy;
}

// A plain-words error the page can show as is.
class Plain extends Error {
  constructor(title, text) { super(title); this.title = title; this.text = text; }
}

// --------------------------------------------------------------------- serial
async function choosePort() {
  try {
    return await navigator.serial.requestPort({ filters: [{ usbVendorId: ESPRESSIF_VID }] });
  } catch (e) {
    if (e && e.name === "NotFoundError") {
      throw new Plain("No clock was picked.",
        "Click the button again, then click \"USB JTAG/serial debug unit\" in the list and press Connect. " +
        "If the list was empty, see \"Nothing shows up in the list\" below.");
    }
    throw e;
  }
}

async function openPort(port) {
  try {
    await port.open({ baudRate: BAUD });
  } catch (e) {
    if (e && e.name === "InvalidStateError") return; // already open
    throw e;
  }
}

async function closeQuietly(port) {
  try { await port.close(); } catch { /* already closed or gone */ }
}

// After an install the chip restarts and its USB port disappears and comes
// back. Chrome keeps the permission, so the returning port is found through
// getPorts() without asking the person again. Returns an OPEN port or null.
async function findPortAgain(oldPort, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    let candidates = [];
    try { candidates = await navigator.serial.getPorts(); } catch { /* ignore */ }
    candidates = candidates.filter((p) => p === oldPort || isClockPort(p.getInfo()));
    // Prefer the very same object if the browser kept it.
    candidates.sort((a, b) => (b === oldPort) - (a === oldPort));
    for (const p of candidates) {
      try {
        await p.open({ baudRate: BAUD });
        return p;
      } catch (e) {
        if (e && e.name === "InvalidStateError") return p;
      }
    }
    await sleep(500);
  }
  return null;
}

// Reads lines from an open port until stop() resolves true for one, or time
// runs out. onLine sees every line. Returns the matching line or null.
async function readUntil(port, stop, timeoutMs, onLine) {
  const reader = port.readable.getReader();
  const dec = new TextDecoder();
  const split = new LineSplitter();
  let timer;
  const timeout = new Promise((r) => { timer = setTimeout(() => r({ timeout: true }), timeoutMs); });
  try {
    for (;;) {
      const res = await Promise.race([reader.read(), timeout]);
      if (res.timeout || res.done) return null;
      for (const line of split.push(dec.decode(res.value, { stream: true }))) {
        if (onLine) onLine(line);
        if (await stop(line)) return line;
      }
    }
  } finally {
    clearTimeout(timer);
    try { await reader.cancel(); } catch { /* ignore */ }
    reader.releaseLock();
  }
}

async function writeLine(port, text) {
  const w = port.writable.getWriter();
  try { await w.write(new TextEncoder().encode(text + "\n")); }
  finally { w.releaseLock(); }
}

// Waits for the running clock to report (it prints a "C ..." line every
// second once it is up), sends the T line with this computer's time, and
// returns { reply, report, sent }.
async function setClock(port, log) {
  // 1. Is the clock talking yet? Opening the port can restart it, which takes
  //    a few seconds. A "?" asks for a report in case the periodic one is off.
  let alive = await readUntil(port, (l) => !!parseReport(l), 4000, log);
  if (!alive) {
    await writeLine(port, "?");
    alive = await readUntil(port, (l) => !!parseReport(l), 8000, log);
  }
  if (!alive) {
    throw new Plain("The clock did not answer.",
      "Unplug the clock, wait five seconds, plug it back in, and click \"Just set the clock\".");
  }
  // 2. Send the time and wait for the clock to say what it now shows.
  for (let attempt = 0; attempt < 3; attempt++) {
    const sent = new Date();
    await writeLine(port, formatTimeCommand(sent));
    let bad = false;
    const reply = await readUntil(port, (l) => {
      if (isBadTimeReply(l)) { bad = true; return true; }
      return !!parseTimeReply(l);
    }, 4000, log);
    if (bad) continue;
    if (reply) {
      const report = await readUntil(port, (l) => !!parseReport(l), 2500, log);
      return { reply: parseTimeReply(reply), report: report ? parseReport(report) : null, sent };
    }
  }
  throw new Plain("The clock did not take the new time.",
    "Unplug the clock, wait five seconds, plug it back in, and click \"Just set the clock\".");
}

function finish(result) {
  const wall = (result.reply && result.reply.wall) ||
               (result.report && result.report.wall) ||
               wallFromDate(result.sent);
  const off = Math.abs(secondsOff(wall, result.sent));
  const msg = doneMessage(wall);
  $("result-headline").textContent = msg.headline;
  $("result-detail").textContent = msg.detail;
  $("result-unplug").textContent = "You can unplug it now and put it back where it lives.";
  $("result").hidden = false;
  stepState("clock", "ok", off <= 5 ? "The clock agrees with this computer." : "");
  stepState("done", "ok");
  $("result").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// --------------------------------------------------------------- the two flows
const transcript = [];
const log = (line) => { transcript.push(line); if (transcript.length > 400) transcript.shift(); };

async function loadFirmware() {
  const m = await (await fetch(MANIFEST_URL, { cache: "no-store" })).json();
  const res = await fetch("./firmware/" + m.file, { cache: "no-store" });
  if (!res.ok) throw new Plain("The update file did not download.", "Check the internet connection and reload this page.");
  const data = new Uint8Array(await res.arrayBuffer());
  if (crypto.subtle) {
    const d = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
    const hex = Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
    if (hex !== m.sha256) throw new Plain("The update file arrived damaged.", "Reload this page and try again.");
  }
  return { data, manifest: m };
}

async function updateFlow() {
  showSteps(ALL_STEPS);
  setBusy(true);
  let port = null;
  let transport = null;
  let step = "connect";
  try {
    // Connect
    stepState("connect", "active", "Pick \"USB JTAG/serial debug unit\" in the window that opens.");
    const fw = loadFirmware(); // download while the person is choosing
    fw.catch(() => {});
    port = await choosePort();
    stepState("connect", "ok", "Found your clock.");

    // Install
    step = "install";
    stepState("install", "active", "Getting ready. Keep the clock plugged in.");
    const { data } = await fw;
    const { ESPLoader, Transport } = await import(ESPTOOL_URL);
    transport = new Transport(port, false);
    const loader = new ESPLoader({
      transport,
      baudrate: BAUD,
      romBaudrate: BAUD, // USB serial: no baud change, so no port reopen
      terminal: { clean() {}, writeLine: log, write: log },
      debugLogging: false,
    });
    const chip = await loader.main();
    log("# chip " + chip);
    if (!/ESP32-C3/i.test(chip)) {
      throw new Plain("That is not a 4square clock.", "Unplug other devices, then try again and pick \"USB JTAG/serial debug unit\".");
    }
    setProgress(0);
    stepState("install", "active", "Installing. This takes about a minute. Keep the clock plugged in.");
    await loader.writeFlash({
      fileArray: [{ data, address: 0x0 }],
      flashMode: "keep", flashFreq: "keep", flashSize: "keep",
      eraseAll: false, compress: true,
      reportProgress: (_i, written, total) => setProgress(Math.min(100, Math.round((written / total) * 100))),
    });
    setProgress(100);
    $("progress").hidden = true;
    stepState("install", "ok", "Installed.");

    // Restart
    step = "restart";
    stepState("restart", "active", "Restarting the clock.");
    try { await loader.after("hard_reset", false); } catch (e) { log("# reset: " + e); }
    try { await transport.disconnect(); } catch { await closeQuietly(port); }
    transport = null;
    await sleep(1500);
    let again = await findPortAgain(port, 20000);
    if (!again) {
      // The browser did not hand the port back on its own. Ask for one more
      // pick, which needs a fresh click.
      stepState("restart", "active", "");
      again = await askToPickAgain();
    }
    port = again;
    stepState("restart", "ok", "Restarted.");

    // Set clock
    step = "clock";
    stepState("clock", "active", "Setting the time from this computer.");
    const result = await setClock(port, log);
    finish(result);
  } catch (e) {
    fail(step, e);
  } finally {
    if (transport) { try { await transport.disconnect(); } catch { /* ignore */ } }
    if (port) await closeQuietly(port);
    setBusy(false);
  }
}

async function clockOnlyFlow() {
  showSteps(["connect", "clock", "done"]);
  setBusy(true);
  let port = null;
  let step = "connect";
  try {
    stepState("connect", "active", "Pick \"USB JTAG/serial debug unit\" in the window that opens.");
    port = await choosePort();
    await openPort(port);
    stepState("connect", "ok", "Found your clock.");
    step = "clock";
    stepState("clock", "active", "Setting the time from this computer.");
    const result = await setClock(port, log);
    finish(result);
  } catch (e) {
    fail(step, e);
  } finally {
    if (port) await closeQuietly(port);
    setBusy(false);
  }
}

// Shows a plain-words note and a button; resolves with an open port after the
// person picks the clock again.
function askToPickAgain() {
  return new Promise((resolve, reject) => {
    $("again").hidden = false;
    $("again").scrollIntoView({ block: "nearest", behavior: "smooth" });
    $("again-button").onclick = async () => {
      try {
        const p = await choosePort();
        await openPort(p);
        $("again").hidden = true;
        resolve(p);
      } catch (e) { $("again").hidden = true; reject(e); }
    };
  });
}

function fail(step, e) {
  console.warn("4square flasher:", e, "\nlast lines from the clock:\n" + transcript.slice(-20).join("\n"));
  stepState(step, "bad");
  if (e instanceof Plain) return showProblem(e.title, e.text);
  const name = (e && e.name) || "";
  const text = String((e && e.message) || e);
  if (name === "NetworkError" || /open|busy|access/i.test(text)) {
    return showProblem("The clock is busy or was unplugged.",
      "Close any other tab or app that might be using it, unplug the clock, plug it back in, and click the button again.");
  }
  if (step === "install") {
    return showProblem("The install stopped partway.",
      "Unplug the clock, plug it back in, and click \"Update my 4square\" again. Nothing is broken; a full install fixes it.");
  }
  showProblem("Something went wrong.",
    "Unplug the clock, plug it back in, and try again. If it keeps happening, try a different USB cable.");
}

// ----------------------------------------------------------------------- boot
function init() {
  const supported = "serial" in navigator && window.isSecureContext;
  $("unsupported").hidden = supported;
  $("actions").hidden = !supported;
  if (!supported) return;
  $("go").addEventListener("click", updateFlow);
  $("clock-only").addEventListener("click", clockOnlyFlow);
  // Let the tester read the clock's own lines: window.fourSquareTranscript()
  window.fourSquareTranscript = () => transcript.join("\n");
}

init();
