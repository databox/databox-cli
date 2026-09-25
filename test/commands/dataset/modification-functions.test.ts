import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const items = [{
  description: 'Joins two strings',
  example: 'CONCAT($first, $last)',
  name: 'CONCAT',
  parameters: [{description: 'The first string', isOptional: false, name: 'text1'}, {description: 'The second string', isOptional: false, name: 'text2'}],
  signature: 'CONCAT(text1, text2)',
}]

describe('dataset modification-functions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/modifications/functions', response: envelope({items})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists modification functions', async () => {
    const {stdout} = await runCommand(['dataset', 'modification-functions'], {root: process.cwd()})
    expect(stdout).to.include('CONCAT(text1, text2)')
    expect(stdout).to.include('Joins two strings')
  })

  it('unwraps items to a bare array with --json, parameters included', async () => {
    const {stdout} = await runCommand(['dataset', 'modification-functions', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(items)
  })
})
