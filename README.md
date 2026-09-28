# ClaudeBuzz

> Sound alerts for Claude Code — a chime when it's done, a buzz when it's waiting on you.

Claude Code plugin. When a turn ends, it checks whether Claude left a
question hanging that you never answered — and plays a distinct sound so
you don't drift off mid-task and lose track.

- **Clean finish** → ascending two-tone chime
- **Open question waiting** → repeated triple buzz, plus a text summary of
  the question(s)

## Install

```
/plugin marketplace add francefaraz/ClaudeBuzz
/plugin install claude-buzz
```

Requires Node.js available as `node` on your PATH.

## Sound support by platform

Bundled sounds are synthesized WAVs (`sounds/done.wav`, `sounds/question.wav`) played through each platform's native player:

| Platform | Player | Notes |
|---|---|---|
| Windows | PowerShell `Media.SoundPlayer` | WAV only |
| WSL | same, via `powershell.exe` interop | path converted with `wslpath -w`; requires interop enabled (default on WSL2) |
| macOS | `afplay` | WAV, MP3, AIFF, M4A all work |
| Linux (no WSL) | `paplay` → `aplay` → terminal bell | falls back a step if a player isn't installed |

## Custom sounds

Drop a config file at `~/.config/claude-buzz/config.json`:

```json
{
  "doneSound": "/path/to/your/done-sound.wav",
  "questionSound": "/path/to/your/question-sound.wav"
}
```

Missing file or invalid JSON silently falls back to the bundled defaults.
On Windows, custom sounds must be `.wav` (SoundPlayer can't play MP3) —
macOS/Linux players handle MP3/AIFF/M4A fine.

## How detection works (v0.1, naive)

Scans the transcript for assistant text ending in `?`. Any user message
after that point clears **all** tracked questions, not just the one it
answered — so a reply to something else can look like "resolved." Good
enough to test the core mechanic; not yet smart about *which* question
got answered.

## Known limitations

- Fires every turn, not only "the real moment you're done" — no
  drift/idle detection yet.
- Regex-based question detection, no semantic understanding.
- No per-user config (on/off, sound choice, sensitivity) yet.

## License

MIT
