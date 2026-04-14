const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base')
const { getConfigFields } = require('./config')
const { getActions } = require('./actions')
const upgrades = require('./upgrades')

class VDCPInstance extends InstanceBase {
	async init(config) {
		this.config = config

		this.setVariableDefinitions([
			{ variableId: 'last_tc', name: 'Last read timecode' },
		])

		this.setVariableValues({ last_tc: '' })
		this.setActionDefinitions(getActions(this))
		this.updateStatus(InstanceStatus.Ok)
	}

	getConfigFields() {
		return getConfigFields()
	}

	async configUpdated(config) {
		this.config = config
	}

	async destroy() {
		// nothing to clean up
	}
}

runEntrypoint(VDCPInstance, upgrades)
