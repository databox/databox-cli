import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

/** MetricsResponse.cs MetricUsageItem; datablockName is null outside boards. */
const usages = [
  {
    datablockName: 'Total Revenue', referenceId: 789_012, referenceName: 'Sales Dashboard', referenceType: 'board',
  },
  {
    datablockName: null, referenceId: 890, referenceName: 'Net Revenue', referenceType: 'calculatedMetric',
  },
]

describe('metric usages', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/metrics/42%7Ccustom_query_1/usages', response: envelope({items: usages})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows one row per usage', async () => {
    const {stdout} = await runCommand(['metric', 'usages', '42|custom_query_1'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/Type.+ID.+Name.+Datablock/)
    expect(lines[2]).to.match(/board\s.+789012\s.+Sales Dashboard\s.+Total Revenue/)
    expect(lines[3]).to.match(/calculatedMetric\s.+890\s.+Net Revenue/)
    expect(stdout).to.not.include('null')
  })

  it('outputs the items whole as an array with --json', async () => {
    const {stdout} = await runCommand(['metric', 'usages', '42|custom_query_1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(usages)
  })
})
