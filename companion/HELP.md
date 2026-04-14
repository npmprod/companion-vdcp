## VDCP Video Server Control

This module controls video servers that support the VDCP (Video Disk Control Protocol) over IP. Compatible servers include Harmonic Omneon Spectrum, Grass Valley K2, EVS XT/XS, Avid AirSpeed, and Imagine Communications.

### Configuration

- **Originating Server IP** — the server to read timecode from
- **Originating Server VDCP Port** — VDCP port (typically 8000 for Channel A, 8001 for Channel B)
- **Following Servers** — comma-separated list of `IP:port` pairs for servers that should be cued to the same timecode (e.g. `10.0.1.50:8000, 10.0.1.51:8000`)

### Actions

| Action | Description |
|--------|-------------|
| **TP Sync** | Reads timecode from the originating server and cues all following servers to that timecode |
| **Read Timecode** | Reads the current timecode from the originating server and stores it |
| **Go To Timecode** | Sends the last read timecode to all following servers |

### Variables

| Variable | Description |
|----------|-------------|
| `$(vdcp:last_tc)` | The last timecode read from the originating server (HH:MM:SS:FF) |

### Typical workflow

1. Configure the originating server and following servers
2. Trigger **TP Sync** via a button press or external trigger
3. The module reads the current timecode and cues all following servers simultaneously
4. Use `$(vdcp:last_tc)` in other modules (e.g. Slack notifications) as needed
