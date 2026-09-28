import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const items = [
  {
    availability: 'included', isDefault: true, isSelected: true, label: 'Hourly', syncInterval: 60,
  },
  {
    availability: 'availableInHigherPlan', isDefault: false, isSelected: false, label: 'Every 15 minutes', syncInterval: 15,
  },
]

describe('dataset sync-frequency-options', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/sync-frequency-options', response: envelope({items})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists the sync frequency options', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-frequency-options', '123'], {root: process.cwd()})
    expect(stdout).to.include('Hourly')
    expect(stdout).to.include('Default')
    expect(stdout).to.include('availableInHigherPlan')
  })

  it('marks the default and selected option', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-frequency-options', '123'], {root: process.cwd()})
    // Header, rule, then one line per option; cells are separated by │.
    const [header, , ...rows] = stdout.trim().split('\n').map(line => line.split('│').map(cell => cell.trim()))
    expect(header).to.deep.equal(['Interval (min)', 'Label', 'Default', 'Selected', 'Availability'])
    expect(rows).to.deep.equal([
      ['60', 'Hourly', 'yes', 'yes', 'included'],
      ['15', 'Every 15 minutes', '', '', 'availableInHigherPlan'],
    ])
  })

  it('unwraps items to a bare array with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-frequency-options', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(items)
  })
})
