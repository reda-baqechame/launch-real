# Build loop (Claude Code Creator style)

LaunchReel uses an **agent build loop** to ship features faster: a backlog file + verify script + timed wake ticks.

## Quick start

```bash
# One tick: verify + print next task for the agent
npm run loop:tick

# Continuous loop every 15 minutes (Windows PowerShell)
npm run loop:start
```

## How it works

```
BUILD_BACKLOG.md  ──►  scripts/build-loop.ps1  ──►  AGENT_LOOP_WAKE_BUILD
        ▲                      │                         │
        │                      ▼                         ▼
   mark [x]              npm run verify            Agent implements
   after task            (build + lint)            next P0 task
```

1. **`BUILD_BACKLOG.md`** — prioritized checkbox backlog (P0 → P6). **All complete** — loop ticks verify green unless new tasks are added.
2. **`scripts/build-loop.ps1`** — runs `npm run verify`, finds the next `- [ ]` task, emits `AGENT_LOOP_WAKE_BUILD` JSON for Cursor/agent sessions.
3. **`scripts/start-build-loop.ps1`** — fixed 15m interval; use with Cursor loop skill / monitored shell.

## Agent instructions (each tick)

When you see `AGENT_LOOP_WAKE_BUILD`:

1. Read `BUILD_BACKLOG.md` and `docs/BUILD_STATUS.md`.
2. If verify failed last tick, fix build/lint first.
3. If all tasks are `[x]`, run `npm run verify` only — add new `- [ ]` items when scope expands.
4. Otherwise implement **one** unchecked task, mark `[x]`, run verify.

## Stopping the loop

```powershell
# Find and stop the background loop (if running)
Get-Process | Where-Object { $_.CommandLine -like '*start-build-loop*' }
```

Or ask the agent: "stop the build loop".
