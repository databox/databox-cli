import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const rules = {
  dataTypeRules: {
    conversionsByPhysicalType: {
      string: [
        {inputFormats: [null], outputLogicalType: 'number'},
        {inputFormats: [{displayName: 'ISO Datetime', id: 'isoDatetime'}], outputLogicalType: 'datetime'},
      ],
    },
    outputFormats: {
      byLogicalType: {currency: [{displayName: 'Prefixed $', format: '$#,###.##', id: 'AUTO_DOLLAR'}]},
      scalableLogicalTypes: ['currency', 'number'],
      scaleOptions: [{displayName: 'Million', example: '1.23M', id: 'million'}],
    },
  },
  filterRules: {number: ['equals', 'greater_than'], string: ['equals', 'contains']},
}

describe('dataset modification-rules', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/modifications/rules', response: envelope(rules)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists filter operators and type conversions readably', async () => {
    const {stdout} = await runCommand(['dataset', 'modification-rules'], {root: process.cwd()})
    expect(stdout).to.include('  number: equals, greater_than')
    expect(stdout).to.include('  string: number; datetime (input formats: isoDatetime)')
    expect(stdout).to.include('  currency: AUTO_DOLLAR ($#,###.##)')
    expect(stdout).to.include('Scales (for currency, number): million (1.23M)')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'modification-rules', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(rules)
  })
})
