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

| Platform | Mechanism | Notes |
|---|---|---|
| Windows | PowerShell `[console]::beep` | full tone/duration control |
| WSL | same, via `powershell.exe` interop | requires Windows interop enabled (default on WSL2) |
| macOS | `osascript -e "beep N"` | no tone control, differentiates by beep count |
| Linux (no WSL) | terminal bell (`\x07`) | best-effort; audible only if your terminal's audio bell is on |

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
