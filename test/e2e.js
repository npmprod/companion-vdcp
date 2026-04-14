const { VDCPEmulator } = require('./emulator')
const { positionRequest, goToTimeCode } = require('../src/vdcp')

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
	const server = new VDCPEmulator({ port: 9000, label: 'SERVER', hr: 1, min: 23, sec: 45, frame: 10, quiet: true })
	await server.start()

	// --- Test 1: Position Request ---
	console.log('Test: Position Request (read_tc)')
	const tc = await positionRequest('127.0.0.1', 9000)
	assert('returns correct timecode', tc, '01:23:45:10')

	// --- Test 2: GoToTimeCode ---
	console.log('\nTest: GoToTimeCode')
	await goToTimeCode('127.0.0.1', 9000, '02:00:00:00')
	await tick()
	assert('server received cue', server.cuedTo, '02:00:00:00')

	// --- Test 3: Updated timecode ---
	console.log('\nTest: Read updated timecode')
	server.setTimecode(0, 15, 30, 5)
	const tc2 = await positionRequest('127.0.0.1', 9000)
	assert('reads updated timecode', tc2, '00:15:30:05')

	// --- Test 4: GoToTimeCode with read value ---
	console.log('\nTest: GoToTimeCode with read value')
	server.cuedTo = null
	await goToTimeCode('127.0.0.1', 9000, tc2)
	await tick()
	assert('server cued to read TC', server.cuedTo, '00:15:30:05')

	// --- Test 5: Error handling ---
	console.log('\nTest: Error handling')
	try {
		await positionRequest('127.0.0.1', 9999, 1000)
		assert('connection refused throws', false, true)
	} catch (err) {
		assert('connection refused throws', err.message.includes('Position Request'), true)
	}

	try {
		await goToTimeCode('127.0.0.1', 9999, '01:00:00:00', 1000)
		assert('GoToTimeCode connection refused throws', false, true)
	} catch (err) {
		assert('GoToTimeCode connection refused throws', err.message.includes('GoToTimeCode'), true)
	}

	// --- Summary ---
	await server.stop()
	console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
	process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
	console.error('Test runner error:', err)
	process.exit(1)
})
