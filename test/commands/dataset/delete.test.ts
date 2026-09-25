import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, pipeStdin, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'DELETE',
        path: '/v2/datasets/123',
        response: {data: {}, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('deletes with --force', async () => {
    const {stdout} = await runCommand(['dataset', 'delete', '123', '--force'], {root: process.cwd()})
    expect(stdout).to.contain('Dataset 123 deleted')
  })

  describe('without --force, when stdin is not a terminal', () => {
    let restore: () => void

    afterEach(() => {
      restore()
    })

    it('deletes on a piped yes', async () => {
      restore = pipeStdin('y\n')

      const {stdout} = await runCommand(['dataset', 'delete', '123'], {root: process.cwd()})

      expect(stdout).to.contain('Dataset 123 deleted')
      expect(requests()).to.have.length(1)
    })

    it('aborts with exit 0 on a piped no, and deletes nothing', async () => {
      restore = pipeStdin('n\n')

      const {error, stdout} = await runCommand(['dataset', 'delete', '123'], {root: process.cwd()})

      expect(error).to.equal(undefined)
      expect(stdout).to.contain('Aborted.')
      expect(requests()).to.have.length(0)
    })

    // Read as "no", an empty stdin used to print Aborted. and exit 0 having deleted nothing.
    it('refuses with exit 2 when nothing is piped, and deletes nothing', async () => {
      restore = pipeStdin('')

      const {error, stdout} = await runCommand(['dataset', 'delete', '123'], {root: process.cwd()})

      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.equal(
        'Refusing to prompt: stdin is not a terminal and no confirmation was piped. Pass --force to confirm.',
      )
      expect(stdout).to.not.contain('Aborted.')
      expect(requests()).to.have.length(0)
    })
  })
})
