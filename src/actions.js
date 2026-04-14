const { positionRequest, goToTimeCode } = require('./vdcp')
const { parseFollowing } = require('./config')

function getActions(instance) {
	return {
		read_tc: {
			name: 'Read Timecode',
			description: 'Read the current timecode from the originating server',
			options: [],
			callback: async () => {
				const { orig_host, orig_port } = instance.config

				if (!orig_host) {
					instance.log('error', 'Originating server IP is not configured')
					return
				}

				try {
					const tc = await positionRequest(orig_host, orig_port)
					instance.log('info', `Read timecode: ${tc}`)
					instance.setVariableValues({ last_tc: tc })
				} catch (err) {
					instance.log('error', `Read TC failed: ${err.message}`)
				}
			},
		},

		goto_tc: {
			name: 'Go To Timecode',
			description: 'Send GoToTimeCode to all following servers using the last read timecode',
			options: [],
			callback: async () => {
				const tc = instance.getVariableValue('last_tc')

				if (!tc) {
					instance.log('error', 'No timecode available — run Read Timecode first')
					return
				}

				const targets = parseFollowing(instance.config.following)

				if (targets.length === 0) {
					instance.log('warn', 'No following servers configured')
					return
				}

				const results = await Promise.all(
					targets.map(({ host, port }) =>
						goToTimeCode(host, port, tc).catch((err) => {
							instance.log('warn', `GoToTimeCode failed for ${host}:${port}: ${err.message}`)
						})
					)
				)

				instance.log('info', `GoToTimeCode sent to ${targets.length} server(s) at TC ${tc}`)
			},
		},

		tp_sync: {
			name: 'TP Sync',
			description: 'Read timecode from originating server and cue all following servers',
			options: [],
			callback: async () => {
				const { orig_host, orig_port } = instance.config

				if (!orig_host) {
					instance.log('error', 'Originating server IP is not configured')
					return
				}

				// Step 1: Read TC from originating server
				let tc
				try {
					tc = await positionRequest(orig_host, orig_port)
					instance.log('info', `TP Sync — read timecode: ${tc}`)
					instance.setVariableValues({ last_tc: tc })
				} catch (err) {
					instance.log('error', `TP Sync — read TC failed: ${err.message}`)
					return
				}

				// Step 2: Cue all following servers in parallel
				const targets = parseFollowing(instance.config.following)

				if (targets.length === 0) {
					instance.log('warn', 'TP Sync — no following servers configured')
					return
				}

				await Promise.all(
					targets.map(({ host, port }) =>
						goToTimeCode(host, port, tc).catch((err) => {
							instance.log('warn', `TP Sync — GoToTimeCode failed for ${host}:${port}: ${err.message}`)
						})
					)
				)

				instance.log('info', `TP Sync complete — ${targets.length} server(s) cued to ${tc}`)
			},
		},
	}
}

module.exports = { getActions }
