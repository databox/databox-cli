import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const lineage = {
  children: [
    {id: '456', name: 'Orders (modified)', type: 'dataset'},
    {id: '123|custom_query_abc', name: 'Revenue', type: 'customMetric'},
  ],
  id: 123,
  parents: [{id: '100', name: 'Shop', type: 'dataSource'}],
}

describe('dataset lineage', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/lineage', response: envelope(lineage)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows parents and children as one table', async () => {
    const {stdout} = await runCommand(['dataset', 'lineage', '123'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/Relation.+ID.+Name.+Type/)
    expect(lines[2]).to.match(/parent\s.+100\s.+Shop\s.+dataSource/)
    expect(stdout).to.match(/child\s.+123\|custom_query_abc\s.+Revenue\s.+customMetric/)
  })

  it('outputs the whole response with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'lineage', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(lineage)
  })
})
