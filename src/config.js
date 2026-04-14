const { Regex } = require('@companion-module/base')

function getConfigFields() {
	return [
		{
			type: 'textinput',
			id: 'orig_host',
			label: 'Originating Server IP',
			width: 6,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'orig_port',
			label: 'Originating Server VDCP Port',
			width: 6,
			default: 8000,
			min: 1,
			max: 65535,
		},
		{
			type: 'textinput',
			id: 'following',
			label: 'Following Servers (comma-separated IP:port)',
			width: 12,
			default: '',
		},
	]
}

/**
 * Parse the "following" config string into an array of { host, port } objects.
 */
function parseFollowing(str) {
	if (!str || !str.trim()) return []

	return str.split(',').map((entry) => {
		const trimmed = entry.trim()
		const lastColon = trimmed.lastIndexOf(':')
		if (lastColon === -1) {
			return { host: trimmed, port: 8000 }
		}
		return {
			host: trimmed.substring(0, lastColon),
			port: parseInt(trimmed.substring(lastColon + 1), 10),
		}
	})
}

module.exports = { getConfigFields, parseFollowing }
