import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const COLUMNS = '[{"id":"amount","description":"Order value","conceptType":"measure","synonyms":["sales"]}]'

const items = [
  {
    conceptType: 'measure', description: 'Order value', displayName: 'Revenue', id: 'amount', synonyms: ['sales'],
  },
]

describe('dataset set-column-metadata', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PATCH', path: '/v2/datasets/123/column-metadata', response: envelope({items})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('prints the returned column metadata', async () => {
    const {stdout} = await runCommand(['dataset', 'set-column-metadata', '123', '--columns', COLUMNS], {root: process.cwd()})
    expect(stdout).to.include('Revenue')
    expect(stdout).to.include('measure')
  })

  // ColumnMetadataUpdate is {id, description?, conceptType?, synonyms?}: `columnId` and
  // `displayName` are not accepted.
  it('sends the columns as given under {columns}', async () => {
    await runCommand(['dataset', 'set-column-metadata', '123', '--columns', COLUMNS], {root: process.cwd()})
    expect(lastBody('PATCH', '/v2/datasets/123/column-metadata')).to.deep.equal({
      columns: [{
        conceptType: 'measure', description: 'Order value', id: 'amount', synonyms: ['sales'],
      }],
    })
  })

  it('unwraps items to a bare array with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'set-column-metadata', '123', '--columns', COLUMNS, '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(items)
  })

  it('names the expected shape when --columns is not JSON', async () => {
    const {error} = await runCommand(['dataset', 'set-column-metadata', '123', '--columns', '{nope'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('"id"')
    expect(error?.message).to.not.contain('columnId')
  })

  // DatasetService.ValidateColumnMetadata rejects an empty columns list with a 400 on `columns`.
  it('rejects an empty --columns array with exit 2 before calling the API', async () => {
    const {error} = await runCommand(['dataset', 'set-column-metadata', '123', '--columns', '[]'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('At least one column must be provided')
    expect(requests()).to.have.length(0)
  })
})
