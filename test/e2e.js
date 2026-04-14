const { VDCPEmulator } = require('./emulator')
const { positionRequest, goToTimeCode } = require('../src/vdcp')
const { parseFollowing } = require('../src/config')

let passed = 0
let failed = 0

const tick = () => new Promise((r) => setTimeout(r, 50))

function assert(label, actual, expected) {
	if (actual === expected) {
		console.log(`  ✓ ${label}`)
		passed++
	} else {
		console.log(`  ✗ ${label} — expected "${expected}", got "${actual}"`)
		failed++
	}
}

async function run() {
	const orig = new VDCPEmulator({ port: 9000, label: 'ORIG', hr: 1, min: 23, sec: 45, frame: 10, quiet: true })
	const follow1 = new VDCPEmulator({ port: 9001, label: 'FOLLOW-1', quiet: true })
	const follow2 = new VDCPEmulator({ port: 9002, label: 'FOLLOW-2', quiet: true })

	await Promise.all([orig.start(), follow1.start(), follow2.start()])
	console.log('')

	// --- Test 1: Position Request ---
	console.log('Test: Position Request (read_tc)')
	const tc = await positionRequest('127.0.0.1', 9000)
	assert('returns correct timecode', tc, '01:23:45:10')

	// --- Test 2: GoToTimeCode single target ---
	console.log('\nTest: GoToTimeCode (single target)')
	await goToTimeCode('127.0.0.1', 9001, '01:23:45:10')
	await tick()
	assert('follow-1 received cue', follow1.cuedTo, '01:23:45:10')

	// --- Test 3: GoToTimeCode parallel targets ---
	console.log('\nTest: GoToTimeCode (parallel targets)')
	follow1.cuedTo = null
	follow2.cuedTo = null
	const targets = parseFollowing('127.0.0.1:9001, 127.0.0.1:9002')
	await Promise.all(targets.map(({ host, port }) => goToTimeCode(host, port, '02:00:00:00')))
	await tick()
	assert('follow-1 received cue', follow1.cuedTo, '02:00:00:00')
	assert('follow-2 received cue', follow2.cuedTo, '02:00:00:00')

	// --- Test 4: Full TP Sync flow ---
	console.log('\nTest: TP Sync (read + cue all)')
	follow1.cuedTo = null
	follow2.cuedTo = null
	orig.setTimecode(0, 15, 30, 5)
	const readTc = await positionRequest('127.0.0.1', 9000)
	assert('reads updated timecode', readTc, '00:15:30:05')
	await Promise.all(targets.map(({ host, port }) => goToTimeCode(host, port, readTc)))
	await tick()
	assert('follow-1 cued to new TC', follow1.cuedTo, '00:15:30:05')
	assert('follow-2 cued to new TC', follow2.cuedTo, '00:15:30:05')

	// --- Test 5: parseFollowing ---
	console.log('\nTest: parseFollowing config parser')
	const parsed = parseFollowing('10.0.1.50:8000, 10.0.1.51:8001')
	assert('parses first host', parsed[0].host, '10.0.1.50')
	assert('parses first port', parsed[0].port, 8000)
	assert('parses second host', parsed[1].host, '10.0.1.51')
	assert('parses second port', parsed[1].port, 8001)
	const empty = parseFollowing('')
	assert('empty string returns empty array', empty.length, 0)

	// --- Test 6: Error handling ---
	console.log('\nTest: Error handling')
	try {
		await positionRequest('127.0.0.1', 9999, 1000)
		assert('connection refused throws', false, true)
	} catch (err) {
		assert('connection refused throws', err.message.includes('Position Request'), true)
	}

	// --- Summary ---
	await Promise.all([orig.stop(), follow1.stop(), follow2.stop()])
	console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
	process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
	console.error('Test runner error:', err)
	process.exit(1)
})
