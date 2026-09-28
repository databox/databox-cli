import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'node:fs'

import {getConfigPath} from '../../../src/lib/config.js'
import {
  cleanupTestConfig, mockApi, pipeStdin, requests, restoreApi, setupEmptyConfig,
} from '../../helpers.js'

const NOTHING_PIPED = 'No API key provided: stdin is not a terminal and nothing was piped. '
  + 'Pass --api-key, pipe the key in, or skip auth login and set DATABOX_API_KEY.'

describe('auth login', () => {
  // `auth login` calls saveConfig for real — without a throwaway HOME it writes the
  // developer's own ~/.config/databox-cli/config.json.
  beforeEach(() => {
    setupEmptyConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('saves API key and validates successfully', async () => {
    mockApi([
      {
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {data: {}, requestId: 'test', status: 'success'},
      },
    ])

    const result = await runCommand(['auth', 'login', '--api-key', 'my-test-key'], {root: process.cwd()})

    expect(result.stdout).to.contain('Authenticated successfully.')
  })

  it('saves API key and warns on validation failure', async () => {
    mockApi([
      {
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {errors: [{message: 'Invalid API key'}], requestId: 'test', status: 'error'},
        status: 401,
      },
    ])

    const result = await runCommand(['auth', 'login', '--api-key', 'bad-key'], {root: process.cwd()})

    expect(result.stderr).to.contain('API key could not be validated')
    expect(result.stderr).to.not.contain('Warning: Warning:')
  })

  describe('when stdin is not a terminal', () => {
    let restore: () => void
    const savedApiKey = process.env.DATABOX_API_KEY

    afterEach(() => {
      restore()
      if (savedApiKey === undefined) {
        delete process.env.DATABOX_API_KEY
      } else {
        process.env.DATABOX_API_KEY = savedApiKey
      }
    })

    it('reads a piped key, saves it, and never echoes it', async () => {
      restore = pipeStdin('piped-test-key\n')
      mockApi([{
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {data: {}, requestId: 'test', status: 'success'},
      }])

      const {stderr, stdout} = await runCommand(['auth', 'login'], {root: process.cwd()})

      expect(stdout).to.contain('Authenticated successfully.')
      expect(`${stdout}${stderr}`).to.not.contain('piped-test-key')
      expect(requests()[0].headers['x-api-key']).to.equal('piped-test-key')
      expect(JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')).apiKey).to.equal('piped-test-key')
    })

    it('refuses with exit 2 when nothing is piped, and saves nothing', async () => {
      restore = pipeStdin('')
      mockApi([])

      const {error} = await runCommand(['auth', 'login'], {root: process.cwd()})

      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.equal(NOTHING_PIPED)
      expect(requests()).to.have.length(0)
      expect(fs.existsSync(getConfigPath())).to.equal(false)
    })

    // auth login does not read DATABOX_API_KEY: the variable is for the other commands.
    it('refuses the same way with DATABOX_API_KEY set', async () => {
      process.env.DATABOX_API_KEY = 'env-test-key'
      restore = pipeStdin('')
      mockApi([])

      const {error} = await runCommand(['auth', 'login'], {root: process.cwd()})

      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.equal(NOTHING_PIPED)
      expect(requests()).to.have.length(0)
      expect(fs.existsSync(getConfigPath())).to.equal(false)
    })

    it('uses --api-key without reading stdin', async () => {
      restore = pipeStdin('piped-test-key\n')
      mockApi([{
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {data: {}, requestId: 'test', status: 'success'},
      }])

      const result = await runCommand(['auth', 'login', '--api-key', 'my-test-key'], {root: process.cwd()})

      expect(result.stdout).to.contain('Authenticated successfully.')
      expect(requests()[0].headers['x-api-key']).to.equal('my-test-key')
    })
  })
})
