import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

/** MetricsResponse.cs MetricLineageResponse: its own id is the metric key. */
const lineage = {
  children: [{id: '42|script_7', name: 'Revenue per order', type: 'customMetric'}],
  id: '42|custom_query_1',
  parents: [{id: '42', name: 'Orders', type: 'dataset'}],
}

describe('metric lineage', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/metrics/42%7Ccustom_query_1/lineage', response: envelope(lineage)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows parents and children as one table', async () => {
    const {stdout} = await runCommand(['metric', 'lineage', '42|custom_query_1'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/Relation.+ID.+Name.+Type/)
    expect(lines[2]).to.match(/parent\s.+42\s.+Orders\s.+dataset/)
    expect(lines[3]).to.match(/child\s.+42\|script_7\s.+Revenue per order\s.+customMetric/)
  })

  it('outputs the whole response with --json', async () => {
    const {stdout} = await runCommand(['metric', 'lineage', '42|custom_query_1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(lineage)
  })
})
