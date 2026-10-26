import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {getConfigPath} from '../../../src/lib/config.js'
import {
  cleanupTestConfig, mockApi, pipeStdin, requests, restoreApi, setupEmptyConfig,
} from '../../helpers.js'

/** Writes a config file as it might be hand-edited, and returns its exact content. */
function write(config: unknown): string {
  fs.mkdirSync(path.dirname(getConfigPath()), {recursive: true})
  const content = JSON.stringify(config)
  fs.writeFileSync(getConfigPath(), content)
  return content
}

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

  it('saves the --api-url it was given', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/auth/validate-key',
      response: {data: {}, requestId: 'test', status: 'success'},
    }])

    const {error} = await runCommand(['auth', 'login', '--api-key', 'my-test-key', '--api-url', 'http://localhost:8080'], {root: process.cwd()})

    expect(error).to.equal(undefined)
    expect(JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')).apiUrl).to.equal('http://localhost:8080')
  })

  // Was saved, with only a warning and exit 0, and then failed every later command.
  it('refuses an --api-url without a scheme with exit 2, and saves nothing', async () => {
    mockApi([])

    const {error} = await runCommand(['auth', 'login', '--api-key', 'my-test-key', '--api-url', 'api.databox.com'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--api-url must be an http:// or https:// base URL with no username, password, query string or fragment')
    expect(requests()).to.have.length(0)
    expect(fs.existsSync(getConfigPath())).to.equal(false)
  })

  it('never prints a refused --api-url', async () => {
    mockApi([])

    const {error, stderr, stdout} = await runCommand(['auth', 'login', '--api-key', 'my-test-key', '--api-url', 'pak_SECRET'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(`${error?.message}${stderr}${stdout}`).to.not.contain('SECRET')
    expect(fs.existsSync(getConfigPath())).to.equal(false)
  })

  for (const apiUrl of ['https://api.databox.com ', 'https://api.databox.com/ ', ' https://api.databox.com', 'https://api.databox.com\n']) {
    it(`saves --api-url ${JSON.stringify(apiUrl)} trimmed, and validates against it`, async () => {
      mockApi([{
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {data: {}, requestId: 'test', status: 'success'},
      }])

      const {error, stdout} = await runCommand(['auth', 'login', '--api-key', 'my-test-key', '--api-url', apiUrl], {root: process.cwd()})

      expect(error).to.equal(undefined)
      expect(stdout).to.contain('Authenticated successfully.')
      expect(requests().map(r => r.path)).to.deep.equal(['/v2/auth/validate-key'])
      expect(JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')).apiUrl).to.equal('https://api.databox.com')
    })
  }

  describe('with a URL already saved', () => {
    let restore: (() => void) | undefined

    afterEach(() => {
      restore?.()
      restore = undefined
    })

    // Was re-saved with the new key, a warning, and exit 0, leaving every later command failing.
    // Nothing piped: had the key been read first, this would be the exit-2 "No API key provided".
    it('refuses a bad stored URL with exit 1 before reading the key, and changes nothing', async () => {
      const before = write({apiKey: 'old-key', apiUrl: 'pak_SECRET'})
      restore = pipeStdin('')
      mockApi([])

      const {error, stderr, stdout} = await runCommand(['auth', 'login'], {root: process.cwd()})

      expect(error?.oclif?.exit).to.equal(1)
      expect(error?.message).to.equal(`The API URL saved in ${getConfigPath()} does not start with http:// or https://. `
        + 'Run "databox auth login --api-url https://api.databox.com" to replace it.')
      expect(`${error?.message}${stderr}${stdout}`).to.not.contain('SECRET')
      expect(requests()).to.have.length(0)
      expect(fs.readFileSync(getConfigPath(), 'utf8')).to.equal(before)
    })

    it('replaces a bad stored URL given --api-url', async () => {
      write({apiKey: 'old-key', apiUrl: 'api.databox.com'})
      mockApi([{
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {data: {}, requestId: 'test', status: 'success'},
      }])

      const {error} = await runCommand(['auth', 'login', '--api-key', 'my-test-key', '--api-url', 'https://api.databox.com'], {root: process.cwd()})

      expect(error).to.equal(undefined)
      expect(JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'))).to.deep.equal({apiKey: 'my-test-key', apiUrl: 'https://api.databox.com'})
    })

    it('treats a stored null URL as none', async () => {
      write({apiKey: 'old-key', apiUrl: null})
      mockApi([{
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {data: {}, requestId: 'test', status: 'success'},
      }])

      const {error} = await runCommand(['auth', 'login', '--api-key', 'my-test-key'], {root: process.cwd()})

      expect(error).to.equal(undefined)
      expect(JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'))).to.deep.equal({apiKey: 'my-test-key'})
    })
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

    it('refuses a bad --api-url before reading the piped key', async () => {
      restore = pipeStdin('piped-test-key\n')
      mockApi([])

      const {error} = await runCommand(['auth', 'login', '--api-url', 'localhost:8080'], {root: process.cwd()})

      expect(error?.oclif?.exit).to.equal(2)
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
