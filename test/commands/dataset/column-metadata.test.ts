import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const items = [
  {
    conceptType: 'timeDimension', description: 'When the order was placed', displayName: 'Order date', id: 'orderDate', synonyms: null,
  },
  {
    conceptType: 'measure', description: null, displayName: 'Revenue', id: 'amount', synonyms: ['sales', 'turnover'],
  },
  {
    // The API reports an unset concept type as null.
    conceptType: null, description: null, displayName: 'Region', id: 'region', synonyms: null,
  },
]

describe('dataset column-metadata', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/column-metadata', response: envelope({items})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows column metadata with concept type and synonyms', async () => {
    const {stdout} = await runCommand(['dataset', 'column-metadata', '123'], {root: process.cwd()})
    expect(stdout).to.include('orderDate')
    expect(stdout).to.include('timeDimension')
    expect(stdout).to.include('sales, turnover')
  })

  it('shows an unset concept type as blank, not "null"', async () => {
    const {stdout} = await runCommand(['dataset', 'column-metadata', '123'], {root: process.cwd()})
    expect(stdout).to.include('region')
    expect(stdout).to.not.include('null')
  })

  it('unwraps items to a bare array with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'column-metadata', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(items)
  })
})
