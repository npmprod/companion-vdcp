const { positionRequest, goToTimeCode } = require('./vdcp')

function getActions(instance) {
	return {
		read_tc: {
			name: 'Read Timecode',
			description: 'Read the current timecode from this server',
			options: [],
			callback: async () => {
				const { host, port } = instance.config

				if (!host) {
					instance.log('error', 'Server IP is not configured')
					return
				}

				try {
					const tc = await positionRequest(host, port)
					instance.log('info', `Read timecode: ${tc}`)
					instance.setVariableValues({ last_tc: tc })
				} catch (err) {
					instance.log('error', `Read TC failed: ${err.message}`)
				}
			},
		},

		goto_tc: {
			name: 'Go To Timecode',
			description: 'Cue this server to a timecode',
			options: [
				{
					type: 'textinput',
					id: 'timecode',
					label: 'Timecode (HH:MM:SS:FF)',
					default: '',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const { host, port } = instance.config

				if (!host) {
					instance.log('error', 'Server IP is not configured')
					return
				}

				const tc = await instance.parseVariablesInString(action.options.timecode)

				if (!tc) {
					instance.log('error', 'No timecode provided')
					return
				}

				try {
					await goToTimeCode(host, port, tc)
					instance.log('info', `GoToTimeCode sent: ${tc}`)
				} catch (err) {
					instance.log('error', `GoToTimeCode failed: ${err.message}`)
				}
			},
		},
	}
}

module.exports = { getActions }
