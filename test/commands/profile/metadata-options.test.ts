import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('profile metadata-options', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/profile/metadata-options',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            departments: [
              {value: 'engineering', label: 'Engineering', roles: [{value: 'software_engineer', label: 'Software Engineer'}]},
            ],
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists metadata options', async () => {
    const {stdout} = await runCommand(['profile', 'metadata-options'])
    expect(stdout).to.include('engineering')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['profile', 'metadata-options', '--json'])
    const json = JSON.parse(stdout)
    expect(json.departments[0].value).to.equal('engineering')
  })
})
