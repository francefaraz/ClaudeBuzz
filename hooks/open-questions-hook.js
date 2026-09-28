#!/usr/bin/env node
// ponytail: naive per-turn detector. Resets ALL tracked questions on any user
// reply (not just the one answered) - fine for "did this turn end with a
// loose thread", not for tracking a specific question across many turns.
// Upgrade path: match reply content against each open question before
// clearing it, if the crude reset proves too noisy in practice.
const fs = require('fs');
const { execSync } = require('child_process');

function isWSL() {
  try { return /microsoft/i.test(fs.readFileSync('/proc/version', 'utf8')); }
  catch (e) { return false; }
}

// Windows native, or WSL calling out to the Windows host via interop -
// both get real tone/duration control via PowerShell's console beep.
function playTonesWindows(tones) {
  const cmd = tones.map(([freq, ms]) => `[console]::beep(${freq},${ms})`).join(';');
  execSync(`powershell.exe -NoProfile -Command "${cmd}"`, { stdio: 'ignore', windowsHide: true });
}

// macOS: osascript's built-in `beep N` is the native primitive - no tone
// control, so we differentiate by beep count instead.
function playBeepsMac(count) {
  execSync(`osascript -e "beep ${count}"`, { stdio: 'ignore' });
}

// ponytail: native Linux (no WSL/interop) has no guaranteed audio command
// without extra packages (beep/aplay + sound file). Falls back to the
// terminal bell character - audible if the terminal's audio bell is on,
// otherwise just a visual flash. Upgrade: detect `paplay`/`aplay` + a
// system sound file and use that instead, if this ceiling proves too low.
function playBeepsBell(count) {
  for (let i = 0; i < count; i++) process.stdout.write('\x07');
}

function play(tones, bellCount) {
  try {
    if (process.platform === 'win32') return playTonesWindows(tones);
    if (process.platform === 'darwin') return playBeepsMac(bellCount);
    if (process.platform === 'linux') {
      return isWSL() ? playTonesWindows(tones) : playBeepsBell(bellCount);
    }
  } catch (e) {
    try { playBeepsBell(bellCount); } catch (e2) {}
  }
}

const doneSound = () => play([[600, 150], [900, 150]], 1);           // ascending chime: clean finish
const questionSound = () => play([[1200, 120], [1200, 120], [1200, 120]], 3); // repeated buzz: waiting on you

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  const { transcript_path } = JSON.parse(input);
  const lines = fs.readFileSync(transcript_path, 'utf8').trim().split('\n');
  const openQs = [];
  for (const line of lines) {
    const msg = JSON.parse(line);
    if (msg.type === 'assistant') {
      const text = (msg.message?.content || [])
        .filter(c => c.type === 'text').map(c => c.text).join('\n');
      const qs = text.match(/[^.?!\n]+\?/g) || [];
      openQs.push(...qs.map(q => q.trim()));
    }
    if (msg.type === 'user') openQs.length = 0;
  }
  if (openQs.length) {
    questionSound();
    console.log(JSON.stringify({
      systemMessage: `Task done. Open questions:\n- ${openQs.slice(-5).join('\n- ')}`
    }));
  } else {
    doneSound();
  }
});
