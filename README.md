# companion-module-harmonic-omneon

Bitfocus Companion module for controlling Harmonic Omneon Spectrum video servers via VDCP over IP.

## Overview

During live multi-campus church production, the Teaching Pastor (TP) message is recorded simultaneously on Omneon Spectrum servers at each campus. When TP starts on the originating campus, an operator needs all other campuses to cue their Omneon to the same timecode so playback is synchronized. This module automates that workflow.

## How it works

```
Ross Switcher (plays TP)
  └── RossTalk CC event (TCP port 7788)
        └── Bitfocus Companion (native RossTalk listener)
              └── TP Sync action (this module)
                    ├── VDCP Position Request → originating Omneon → reads TC
                    ├── Stores TC as $(omneon:last_tc) variable
                    └── VDCP GoToTimeCode → all following Omneon campuses (parallel)
```

Slack notification is handled by a separate Companion module that reads `$(omneon:last_tc)`.

## Actions

| Action | Description |
|--------|-------------|
| `tp_sync` | Reads TC from originating Omneon and cues all following campuses to that TC |
| `read_tc` | Reads the current timecode from the originating Omneon |
| `goto_tc` | Sends a GoToTimeCode command to all following campuses |

## Configuration

| Field | Description |
|-------|-------------|
| `orig_host` | IP address of the originating Omneon server |
| `orig_port` | VDCP port on the originating server (8000 = Channel A, 8001 = Channel B) |
| `following` | Comma-separated list of `IP:port` pairs for following campus Omneons |

## VDCP protocol

VDCP (Video Disk Control Protocol) is derived from Sony 9-pin (BVW). Omneon Spectrum exposes it over TCP on port 8000 (Channel A) and 8001 (Channel B). All multi-byte values are BCD encoded.

The protocol is widely supported beyond Omneon — Grass Valley K2, EVS XT/XS, Avid AirSpeed, and Imagine Communications servers all speak VDCP.

## Setup

```bash
yarn install
```

Requires [`@companion-module/base`](https://github.com/bitfocus/companion-module-base) ~1.14.1.

## Project structure

```
src/
  main.js      — OmneonInstance (extends InstanceBase), entry point
  vdcp.js      — VDCP protocol logic (BCD encode/decode, TCP socket)
  actions.js   — Action definitions (tp_sync, read_tc, goto_tc)
  config.js    — Configuration field definitions
  upgrades.js  — Migration scripts (none yet)
```

## Status

This module has not yet been tested against live Omneon hardware. VDCP command bytes follow the standard spec but should be verified against your specific firmware documentation before production use.
