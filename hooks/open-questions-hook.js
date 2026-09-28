#!/usr/bin/env node
// ponytail: naive per-turn detector. Resets ALL tracked questions on any user
// reply (not just the one answered) - fine for "did this turn end with a
// loose thread", not for tracking a specific question across many turns.
// Upgrade path: match reply content against each open question before
// clearing it, if the crude reset proves too noisy in practice.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

function isWSL() {
  try { return /microsoft/i.test(fs.readFileSync('/proc/version', 'utf8')); }
  catch (e) { return false; }
}

function bell(count) {
  for (let i = 0; i < count; i++) process.stdout.write('\x07');
}

// WSL: the wav lives on the Linux side, but playback happens via the
// Windows host - convert to a Windows-visible path first.
function toWindowsPath(p) {
  return execSync(`wslpath -w "${p}"`, { encoding: 'utf8' }).trim();
}

// ponytail: stderr is captured (not 'ignore'd) specifically so a playback
// failure leaves a diagnosable trace instead of silently falling to a bell
// nobody notices - see logError below.
function playFile(filePath, bellCount) {
  try {
    if (process.platform === 'win32') {
      execSync(`powershell.exe -NoProfile -Command "(New-Object Media.SoundPlayer '${filePath}').PlaySync()"`,
        { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    } else if (process.platform === 'linux' && isWSL()) {
      const winPath = toWindowsPath(filePath);
      execSync(`powershell.exe -NoProfile -Command "(New-Object Media.SoundPlayer '${winPath}').PlaySync()"`,
        { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    } else if (process.platform === 'darwin') {
      execSync(`afplay "${filePath}"`, { stdio: ['ignore', 'ignore', 'pipe'] });
    } else {
      // native Linux, no WSL interop. Try common players in order.
      try { execSync(`paplay "${filePath}"`, { stdio: ['ignore', 'ignore', 'pipe'] }); }
      catch (e) { execSync(`aplay "${filePath}"`, { stdio: ['ignore', 'ignore', 'pipe'] }); }
    }
  } catch (e) {
    logError(filePath, e);
    try { bell(bellCount); } catch (e2) {}
  }
}

function logError(filePath, e) {
  try {
    const logDir = path.join(os.homedir(), '.config', 'claude-buzz');
    fs.mkdirSync(logDir, { recursive: true });
    const stderr = e.stderr ? e.stderr.toString().trim() : e.message;
    fs.appendFileSync(path.join(logDir, 'last-error.log'),
      `[${new Date().toISOString()}] platform=${process.platform} file=${filePath}\n${stderr}\n\n`);
  } catch (e2) {}
}

const DEFAULT_SOUNDS = {
  done: path.join(__dirname, '..', 'sounds', 'done.wav'),
  question: path.join(__dirname, '..', 'sounds', 'question.wav'),
};

// ponytail: config is optional and minimal - {"doneSound": "<path>",
// "questionSound": "<path>"}. Missing file or bad JSON silently falls
// back to bundled defaults; no validation beyond "does it exist".
function loadUserSounds() {
  const configPath = path.join(os.homedir(), '.config', 'claude-buzz', 'config.json');
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const resolved = {};
    if (cfg.doneSound && fs.existsSync(cfg.doneSound)) resolved.done = cfg.doneSound;
    if (cfg.questionSound && fs.existsSync(cfg.questionSound)) resolved.question = cfg.questionSound;
    return resolved;
  } catch (e) {
    return {};
  }
}

const sounds = { ...DEFAULT_SOUNDS, ...loadUserSounds() };

const doneSound = () => playFile(sounds.done, 1);
const questionSound = () => playFile(sounds.question, 3);

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
