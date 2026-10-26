import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {dashboardListItem, envelope} from './fixtures.js'

const PATH = '/v2/dashboards/1'
const renamed = {...dashboardListItem, name: 'Q4 pipeline'}

describe('dashboard rename', () => {
  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  describe('when the API accepts the name', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{method: 'PATCH', path: PATH, response: envelope(renamed)}])
    })

    // DataboardRequests.cs RenameDashboardRequest: the name and nothing else.
    it('sends exactly {name}', async () => {
      await runCommand(['dashboard', 'rename', '1', '--name', '"Q4 pipeline"'], {root: process.cwd()})
      expect(requests().map(request => `${request.method} ${request.path}`)).to.deep.equal([`PATCH ${PATH}`])
      expect(lastBody('PATCH', PATH)).to.deep.equal({name: 'Q4 pipeline'})
    })

    // The API trims and checks the name; the CLI does not repeat its rules.
    it('sends the name as given, surrounding spaces included', async () => {
      await runCommand(['dashboard', 'rename', '1', '--name', '"  Q4 pipeline  "'], {root: process.cwd()})
      expect(lastBody('PATCH', PATH)).to.deep.equal({name: '  Q4 pipeline  '})
    })

    it('prints the renamed dashboard', async () => {
      const {stdout} = await runCommand(['dashboard', 'rename', '1', '--name', '"Q4 pipeline"'], {root: process.cwd()})
      expect(stdout).to.include('Name: Q4 pipeline')
      expect(stdout).to.include('Id: 1')
    })

    it('prints the returned dashboard whole with --json', async () => {
      const {stdout} = await runCommand(['dashboard', 'rename', '1', '--name', '"Q4 pipeline"', '--json'], {root: process.cwd()})
      expect(JSON.parse(stdout)).to.deep.equal(renamed)
    })

    it('requires --name, exit 2 and nothing sent', async () => {
      const {error} = await runCommand(['dashboard', 'rename', '1'], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(requests()).to.have.lengthOf(0)
    })
  })

  describe('when the API refuses the name', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{
        method: 'PATCH',
        path: PATH,
        response: {
          errors: [{
            code: 'invalid_input', field: 'name', message: 'Name must be at most 65 characters.', type: 'validation',
          }],
          requestId: 'req-400',
          status: 'error',
        },
        status: 400,
      }])
    })

    it('shows the API error on name, exit 1', async () => {
      const {error} = await runCommand(['dashboard', 'rename', '1', '--name', 'x'.repeat(66)], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(1)
      expect(error?.message).to.contain('Name must be at most 65 characters.')
      expect(error?.message).to.contain('Field: name')
    })
  })
})
