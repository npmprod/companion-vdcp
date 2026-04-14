# companion-module-vdcp

Bitfocus Companion module for controlling video servers via VDCP over IP.

## Overview

During live multi-campus church production, the TP (Title Package) video is recorded simultaneously on video servers at each campus. The TP plays just before the speaker takes the stage. When TP starts on the originating campus, an operator needs all other campuses to cue their server to the same timecode so playback is synchronized. This module automates that workflow.

## How it works

```
Bitfocus Companion
  └── TP Sync action (this module)
        ├── VDCP Position Request → originating server → reads TC
        ├── Stores TC as $(vdcp:last_tc) variable
        └── VDCP GoToTimeCode → all following campus servers (parallel)
```

Triggering and Slack notifications are handled by separate Companion modules.

## Actions

| Action | Description |
|--------|-------------|
| `tp_sync` | Reads TC from originating server and cues all following campuses to that TC |
| `read_tc` | Reads the current timecode from the originating server |
| `goto_tc` | Sends a GoToTimeCode command to all following campuses |

## Configuration

| Field | Description |
|-------|-------------|
| `orig_host` | IP address of the originating server |
| `orig_port` | VDCP port on the originating server (8000 = Channel A, 8001 = Channel B) |
| `following` | Comma-separated list of `IP:port` pairs for following campus servers |

## VDCP protocol

VDCP (Video Disk Control Protocol) is derived from Sony 9-pin (BVW) and typically exposed over TCP on port 8000 (Channel A) and 8001 (Channel B). All multi-byte values are BCD encoded.

Compatible servers include Harmonic Omneon Spectrum, Grass Valley K2, EVS XT/XS, Avid AirSpeed, and Imagine Communications.

## Setup

```bash
yarn install
```

Requires [`@companion-module/base`](https://github.com/bitfocus/companion-module-base) ~1.14.1.

## Project structure

```
src/
  main.js      — VDCPInstance (extends InstanceBase), entry point
  vdcp.js      — VDCP protocol logic (BCD encode/decode, TCP socket)
  actions.js   — Action definitions (tp_sync, read_tc, goto_tc)
  config.js    — Configuration field definitions
  upgrades.js  — Migration scripts (none yet)
```

## Status

This module has not yet been tested against live hardware. VDCP command bytes follow the standard spec but should be verified against your specific firmware documentation before production use.
