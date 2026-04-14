const net = require('net')
const { toBCD, fromBCD, checksum } = require('../src/vdcp')

class VDCPEmulator {
	constructor(options = {}) {
		this.host = options.host || '127.0.0.1'
		this.port = options.port || 8000
		this.label = options.label || `VDCP:${this.port}`

		// Current timecode state (HH:MM:SS:FF)
		this.hr = options.hr ?? 1
		this.min = options.min ?? 0
		this.sec = options.sec ?? 0
		this.frame = options.frame ?? 0

		this.quiet = options.quiet || false
		this.running = false
		this.server = null
		this.cuedTo = null // last GoToTimeCode received
	}

	_log(msg) {
		if (!this.quiet) this._log(msg)
	}

	/**
	 * Set the current timecode the emulator will report.
	 */
	setTimecode(hr, min, sec, frame) {
		this.hr = hr
		this.min = min
		this.sec = sec
		this.frame = frame
	}

	/**
	 * Start the emulator TCP server.
	 */
	start() {
		return new Promise((resolve, reject) => {
			this.server = net.createServer((socket) => {
				const remote = `${socket.remoteAddress}:${socket.remotePort}`
				this._log(`[${this.label}] Client connected: ${remote}`)

				socket.on('data', (data) => {
					this._handlePacket(socket, data, remote)
				})

				socket.on('close', () => {
					this._log(`[${this.label}] Client disconnected: ${remote}`)
				})

				socket.on('error', (err) => {
					this._log(`[${this.label}] Socket error from ${remote}: ${err.message}`)
				})
			})

			this.server.listen(this.port, this.host, () => {
				this.running = true
				this._log(`[${this.label}] Emulator listening on ${this.host}:${this.port}`)
				this._log(`[${this.label}] Current TC: ${this._formatTC()}`)
				resolve()
			})

			this.server.on('error', reject)
		})
	}

	/**
	 * Stop the emulator.
	 */
	stop() {
		return new Promise((resolve) => {
			if (this.server) {
				this.server.close(() => {
					this.running = false
					this._log(`[${this.label}] Emulator stopped`)
					resolve()
				})
			} else {
				resolve()
			}
		})
	}

	_handlePacket(socket, data, remote) {
		if (data.length < 3) {
			this._log(`[${this.label}] Ignoring short packet (${data.length} bytes) from ${remote}`)
			return
		}

		const cmd1 = data[0]
		const cmd2 = data[1]

		// Position Request: 0x61 0x20 [checksum]
		if (cmd1 === 0x61 && cmd2 === 0x20) {
			this._log(`[${this.label}] ← Position Request from ${remote}`)
			this._log(`[${this.label}] → Responding with TC: ${this._formatTC()}`)

			const resp = [0x74, 0x20, toBCD(this.frame), toBCD(this.sec), toBCD(this.min), toBCD(this.hr)]
			const packet = Buffer.from([...resp, checksum(resp)])
			socket.write(packet)
			return
		}

		// GoToTimeCode (Cue Up with Data): 0x24 0x31 [frame] [sec] [min] [hr] [checksum]
		if (cmd1 === 0x24 && cmd2 === 0x31) {
			if (data.length < 7) {
				this._log(`[${this.label}] GoToTimeCode packet too short (${data.length} bytes) from ${remote}`)
				return
			}

			const frame = fromBCD(data[2])
			const sec = fromBCD(data[3])
			const min = fromBCD(data[4])
			const hr = fromBCD(data[5])
			const tc = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(frame).padStart(2, '0')}`

			this.cuedTo = tc
			this._log(`[${this.label}] ← GoToTimeCode from ${remote}: ${tc}`)
			this._log(`[${this.label}]   Cued to ${tc}`)
			return
		}

		this._log(`[${this.label}] Unknown command 0x${cmd1.toString(16)} 0x${cmd2.toString(16)} from ${remote}`)
	}

	_formatTC() {
		return `${String(this.hr).padStart(2, '0')}:${String(this.min).padStart(2, '0')}:${String(this.sec).padStart(2, '0')}:${String(this.frame).padStart(2, '0')}`
	}
}

// Run standalone if executed directly
if (require.main === module) {
	const args = process.argv.slice(2)
	const usage = `
Usage: node emulator.js [options]

Options:
  --originating <port>   Start an originating server on this port (default: 8000)
  --following <ports>    Comma-separated ports for following servers (e.g. 8001,8002)
  --tc <HH:MM:SS:FF>    Initial timecode for the originating server (default: 01:00:00:00)
  --host <ip>            Bind address (default: 127.0.0.1)
`

	let origPort = 8000
	let followingPorts = []
	let tc = { hr: 1, min: 0, sec: 0, frame: 0 }
	let host = '127.0.0.1'

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--originating':
				origPort = parseInt(args[++i], 10)
				break
			case '--following':
				followingPorts = args[++i].split(',').map((p) => parseInt(p.trim(), 10))
				break
			case '--tc':
				const parts = args[++i].split(':').map(Number)
				tc = { hr: parts[0], min: parts[1], sec: parts[2], frame: parts[3] }
				break
			case '--host':
				host = args[++i]
				break
			case '--help':
				console.log(usage)
				process.exit(0)
			default:
				console.error(`Unknown option: ${args[i]}`)
				console.log(usage)
				process.exit(1)
		}
	}

	const emulators = []

	// Originating server
	const orig = new VDCPEmulator({
		host,
		port: origPort,
		label: 'ORIG',
		...tc,
	})
	emulators.push(orig)

	// Following servers
	for (const port of followingPorts) {
		emulators.push(
			new VDCPEmulator({
				host,
				port,
				label: `FOLLOW:${port}`,
			})
		)
	}

	Promise.all(emulators.map((e) => e.start()))
		.then(() => {
			console.log('\nAll emulators running. Press Ctrl+C to stop.\n')
		})
		.catch((err) => {
			console.error('Failed to start emulators:', err.message)
			process.exit(1)
		})

	process.on('SIGINT', async () => {
		console.log('\nShutting down...')
		await Promise.all(emulators.map((e) => e.stop()))
		process.exit(0)
	})
}

module.exports = { VDCPEmulator }
