/* eslint-disable camelcase -- the agentic service's wire format is snake_case */
import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import AskGenie from '../../../src/commands/analyze/ask-genie.js'
import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

/**
 * ask-genie is the one command that calls fetch() itself (SSE streaming), so these tests stub
 * fetch directly instead of going through mockApi's JSON routes.
 */

const STREAM_URL = 'https://agentic-service.databox.com/api/v1/datasets/query/stream'

type Sent = {body: unknown; headers: Record<string, string>; method?: string; url: string}

let sent: Sent[]

const encoder = new TextEncoder()

function event(chunk: Record<string, unknown>): string {
  return `data: ${JSON.stringify(chunk)}\n\n`
}

/** A response streaming `parts` as separate chunks, then closing. */
function sse(parts: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part))
      controller.close()
    },
  })
  return new Response(body, {headers: {'Content-Type': 'text/event-stream'}, status: 200})
}

function respondWith(response: (init?: RequestInit) => Promise<Response> | Response): void {
  mockApi([])
  global.fetch = (async (input: Request | URL | string, init?: RequestInit) => {
    sent.push({
      body: JSON.parse(init?.body as string),
      headers: {...init?.headers as Record<string, string>},
      method: init?.method,
      url: input.toString(),
    })
    return response(init)
  }) as typeof global.fetch
}

function activeTimers(): number {
  return process.getActiveResourcesInfo().filter(resource => resource === 'Timeout').length
}

/**
 * The change in running timers across `args`. The first runCommand in a process starts one
 * long-lived timer of its own, whatever the command, so a warm-up run goes first.
 */
async function timersLeftBy(args: string[]): Promise<number> {
  await runCommand(args, {root: process.cwd()})
  const before = activeTimers()
  await runCommand(args, {root: process.cwd()})
  return activeTimers() - before
}

const ANSWER = [
  event({content: 'Revenue ', done: false, error: false}),
  event({
    content: 'grew 12%.', done: false, error: false, thread_id: 'tid-1',
  }),
  event({content: '', done: true, error: false}),
]

describe('analyze ask-genie', () => {
  const {connectTimeoutMs, idleTimeoutMs} = AskGenie

  beforeEach(() => {
    sent = []
    setupTestConfig()
  })

  afterEach(() => {
    AskGenie.connectTimeoutMs = connectTimeoutMs
    AskGenie.idleTimeoutMs = idleTimeoutMs
    restoreApi()
    cleanupTestConfig()
  })

  it('streams the answer to stdout and the thread ID to stderr', async () => {
    respondWith(() => sse(ANSWER))

    const {error, stderr, stdout} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Revenue?'], {root: process.cwd()})

    expect(error).to.equal(undefined)
    expect(stdout).to.equal('Revenue grew 12%.\n')
    expect(stderr).to.contain('thread_id: tid-1')
  })

  it('posts dataset_id and prompt with the API key', async () => {
    respondWith(() => sse(ANSWER))

    await runCommand(['analyze', 'ask-genie', 'ds-1', 'Revenue?'], {root: process.cwd()})

    expect(sent).to.have.lengthOf(1)
    expect(sent[0].url).to.equal(STREAM_URL)
    expect(sent[0].method).to.equal('POST')
    expect(sent[0].body).to.deep.equal({dataset_id: 'ds-1', prompt: 'Revenue?'})
    expect(sent[0].headers['x-api-key']).to.equal('test-api-key')
    expect(sent[0].headers.Accept).to.equal('text/event-stream')
  })

  it('sends thread_id with --thread-id', async () => {
    respondWith(() => sse(ANSWER))

    await runCommand(['analyze', 'ask-genie', 'ds-1', 'Costs?', '--thread-id', 'tid-1'], {root: process.cwd()})

    expect(sent[0].body).to.deep.equal({dataset_id: 'ds-1', prompt: 'Costs?', thread_id: 'tid-1'})
  })

  it('uses --service-url, without its trailing slash', async () => {
    respondWith(() => sse(ANSWER))

    await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q', '--service-url', 'http://127.0.0.1:8080/'], {root: process.cwd()})

    expect(sent[0].url).to.equal('http://127.0.0.1:8080/api/v1/datasets/query/stream')
  })

  it('reassembles an event split across chunks', async () => {
    const whole = event({content: 'Split answer.', done: false, error: false})
    respondWith(() => sse([whole.slice(0, 15), whole.slice(15)]))

    const {stdout} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q'], {root: process.cwd()})

    expect(stdout).to.equal('Split answer.\n')
  })

  it('outputs the collected answer as JSON with --json', async () => {
    respondWith(() => sse(ANSWER))

    const {stdout} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q', '--json'], {root: process.cwd()})

    expect(JSON.parse(stdout)).to.deep.equal({
      answer: 'Revenue grew 12%.', dataset_id: 'ds-1', success: true, thread_id: 'tid-1',
    })
  })

  it('leaves no timer running after a finished answer', async () => {
    respondWith(() => sse(ANSWER))

    expect(await timersLeftBy(['analyze', 'ask-genie', 'ds-1', 'Q'])).to.equal(0)
  })

  it('exits 1 on a Genie error event', async () => {
    respondWith(() => sse([event({content: 'Dataset is not ready.', done: true, error: true})]))

    const {error} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(1)
    expect(error?.message).to.contain('Genie error: Dataset is not ready.')
  })

  it('exits 1 on an HTTP error status', async () => {
    respondWith(() => new Response('', {status: 503, statusText: 'Service Unavailable'}))

    const {error} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(1)
    expect(error?.message).to.contain('Request failed: 503')
  })

  it('exits 2 when the service cannot be reached', async () => {
    respondWith(() => {
      throw new TypeError('fetch failed')
    })

    const {error} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('Could not connect to Genie')
  })

  it('exits 2 when the response headers do not arrive in time', async () => {
    AskGenie.connectTimeoutMs = 20
    respondWith(init => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    }))

    const {error} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('timed out')
  })

  it('exits 2 and closes the stream when it goes silent', async () => {
    AskGenie.idleTimeoutMs = 20
    let cancelled = false
    respondWith(() => new Response(new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true
      },
      start(controller) {
        // One event, then nothing: neither more data nor a close.
        controller.enqueue(encoder.encode(event({content: 'Partial', done: false, error: false})))
      },
    }), {status: 200}))

    const {error, stdout} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('nothing received')
    expect(stdout).to.equal('Partial')
    expect(cancelled).to.equal(true)
    expect(await timersLeftBy(['analyze', 'ask-genie', 'ds-1', 'Q'])).to.equal(0)
  })

  it('exits 2 when the connection drops mid-answer', async () => {
    respondWith(() => new Response(new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new TypeError('terminated'))
      },
    }), {status: 200}))

    const {error} = await runCommand(['analyze', 'ask-genie', 'ds-1', 'Q'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('connection to Genie was lost')
  })
})
