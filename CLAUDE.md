# companion-module-harmonic-omneon

Bitfocus Companion module for controlling Harmonic Omneon Spectrum video servers via VDCP over IP.

## Purpose

During live multi-campus church production, the TP (Title Package) video is recorded simultaneously on Omneon Spectrum servers at each campus. The TP plays just before the speaker takes the stage. When TP starts on the originating campus, an operator needs all other campuses to cue their Omneon to the same timecode so playback is synchronized. This module automates that workflow.

## How it fits into the larger system

```
Bitfocus Companion
  └── TP Sync action (this module)
        ├── VDCP Position Request → originating server → reads TC
        ├── Stores TC as $(vdcp:last_tc) variable
        └── VDCP GoToTimeCode → all following campus servers (parallel)
```

Triggering and Slack notifications are handled by separate Companion modules.

## Architecture

```
src/
  main.js      — OmneonInstance (extends InstanceBase), entry point, exposes last_tc variable
  vdcp.js      — All VDCP protocol logic (BCD encode/decode, TCP socket, Position Request, GoToTimeCode)
  actions.js   — Three actions: tp_sync, read_tc, goto_tc
  config.js    — Three config fields: orig_host, orig_port, following (comma-separated IP:port list)
  upgrades.js  — Empty array (no migrations yet)
companion/
  HELP.md      — User-facing documentation shown inside Companion UI
```

## VDCP protocol details

VDCP (Video Disk Control Protocol) is derived from Sony 9-pin (BVW). Omneon Spectrum exposes it over TCP:
- Channel A → port 8000
- Channel B → port 8001

All multi-byte values are BCD encoded (e.g. 0x25 = decimal 25).

**Position Request** (read current TC):
- Send: `0x61 0x20 [checksum]`
- Response: `0x74 0x20 [frame] [sec] [min] [hr] [checksum]`

**Cue Up with Data / GoToTimeCode**:
- Send: `0x24 0x31 [frame] [sec] [min] [hr] [checksum]`
- No response expected (fire and forget)

**Checksum**: sum of all preceding bytes, masked to 8 bits (`& 0xFF`).

VDCP is widely supported beyond Omneon — Grass Valley K2, EVS XT/XS, Avid AirSpeed, and Imagine Communications servers all speak the same protocol. The module is not Omneon-specific at the protocol level.

## Key decisions

- **No Slack in this module.** Slack is intentionally left to a separate Companion module. This module exposes `$(vdcp:last_tc)` as a Companion variable so any downstream module (Slack, HTTP, etc.) can consume it.
- **Parallel GoToTimeCode.** All following campuses are cued simultaneously via `Promise.all`, not sequentially.
- **Fire and forget for GoToTimeCode.** Per VDCP spec, Cue Up with Data has no response. The TCP connection is closed immediately after the command is sent.
- **Per-campus error isolation.** A GoToTimeCode failure on one campus logs a warning but does not abort the others.

## What still needs field verification

- VDCP command bytes (`0x61 0x20` for Position Request, `0x24 0x31` for GoToTimeCode) follow the standard VDCP spec — verify against your specific Omneon firmware's VDCP documentation before relying on these in production.
- The module has not yet been tested against live Omneon hardware.

## Running locally

```bash
yarn install
# No test runner yet — add one (jest recommended) for vdcp.js unit tests
```

## Companion SDK

Uses `@companion-module/base` ~1.14.1. Key methods used:
- `instance.setActionDefinitions({})`
- `instance.setVariableDefinitions([])` / `instance.setVariableValues({})`
- `instance.getVariableValue('last_tc')`
- `instance.log('info' | 'warn' | 'error', message)`
- `instance.updateStatus(InstanceStatus.Ok)`
