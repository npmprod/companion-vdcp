const net = require('net')

/**
 * Encode a decimal number to BCD byte.
 * e.g. 25 → 0x25
 */
function toBCD(value) {
	const tens = Math.floor(value / 10)
	const ones = value % 10
	return (tens << 4) | ones
}

/**
 * Decode a BCD byte to decimal number.
 * e.g. 0x25 → 25
 */
function fromBCD(byte) {
	return ((byte >> 4) & 0x0f) * 10 + (byte & 0x0f)
}

/**
 * Calculate VDCP checksum: sum of all bytes, masked to 8 bits.
 */
function checksum(bytes) {
	let sum = 0
	for (const b of bytes) {
		sum += b
	}
	return sum & 0xff
}

/**
 * Send a VDCP Position Request and return the timecode as "HH:MM:SS:FF".
 */
function positionRequest(host, port, timeout = 3000) {
	return new Promise((resolve, reject) => {
		const socket = new net.Socket()
		let timer

		const cleanup = () => {
			clearTimeout(timer)
			socket.destroy()
		}

		timer = setTimeout(() => {
			cleanup()
			reject(new Error(`Position Request timed out connecting to ${host}:${port}`))
		}, timeout)

		socket.connect(port, host, () => {
			const cmd = [0x61, 0x20]
			const packet = Buffer.from([...cmd, checksum(cmd)])
			socket.write(packet)
		})

		socket.on('data', (data) => {
			cleanup()

			// Expected response: 0x74 0x20 [frame] [sec] [min] [hr] [checksum]
			if (data.length < 7) {
				return reject(new Error(`Invalid Position Request response: expected 7 bytes, got ${data.length}`))
			}

			if (data[0] !== 0x74 || data[1] !== 0x20) {
				return reject(new Error(`Unexpected response header: 0x${data[0].toString(16)} 0x${data[1].toString(16)}`))
			}

			const frame = fromBCD(data[2])
			const sec = fromBCD(data[3])
			const min = fromBCD(data[4])
			const hr = fromBCD(data[5])

			const tc = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(frame).padStart(2, '0')}`
			resolve(tc)
		})

		socket.on('error', (err) => {
			cleanup()
			reject(new Error(`Position Request failed for ${host}:${port}: ${err.message}`))
		})
	})
}

/**
 * Send a VDCP GoToTimeCode (Cue Up with Data) command.
 * Fire and forget — no response expected.
 */
function goToTimeCode(host, port, timecode, timeout = 3000) {
	return new Promise((resolve, reject) => {
		const socket = new net.Socket()
		let timer

		const cleanup = () => {
			clearTimeout(timer)
			socket.destroy()
		}

		timer = setTimeout(() => {
			cleanup()
			reject(new Error(`GoToTimeCode timed out connecting to ${host}:${port}`))
		}, timeout)

		// Parse "HH:MM:SS:FF"
		const parts = timecode.split(':')
		if (parts.length !== 4) {
			cleanup()
			return reject(new Error(`Invalid timecode format: ${timecode}`))
		}

		const [hr, min, sec, frame] = parts.map(Number)

		socket.connect(port, host, () => {
			const cmd = [0x24, 0x31, toBCD(frame), toBCD(sec), toBCD(min), toBCD(hr)]
			const packet = Buffer.from([...cmd, checksum(cmd)])
			socket.write(packet, () => {
				cleanup()
				resolve()
			})
		})

		socket.on('error', (err) => {
			cleanup()
			reject(new Error(`GoToTimeCode failed for ${host}:${port}: ${err.message}`))
		})
	})
}

module.exports = { toBCD, fromBCD, checksum, positionRequest, goToTimeCode }
