const { Regex } = require('@companion-module/base')

function getConfigFields() {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Server IP',
			width: 6,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'port',
			label: 'VDCP Port',
			width: 6,
			default: 8000,
			min: 1,
			max: 65535,
		},
	]
}

module.exports = { getConfigFields }
