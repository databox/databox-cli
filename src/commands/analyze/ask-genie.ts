/* eslint-disable camelcase -- the agentic service's wire format is snake_case */
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {ApiConnectionError} from '../../lib/api-client.js'

/**
 * How long to wait for the response headers. Mirrors ApiClient's bound on every other request,
 * which is not exported. It covers the connect only: the answer then streams for as long as it takes.
 */
const CONNECT_TIMEOUT_MS = 30_000

/** How long the stream may stay silent. Genie can pause mid-answer while the model works. */
const IDLE_TIMEOUT_MS = 120_000

type ReadResult = Awaited<ReturnType<ReadableStreamDefaultReader<Uint8Array>['read']>>

interface SSEChunk {
  content: string
  done: boolean
  error: boolean
  thread_id?: string
}

export default class AskGenie extends BaseCommand<typeof AskGenie> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to query', required: true}),
    question: Args.string({description: 'The question to ask Genie', required: true}),
  }

  /** The unit tests lower this and idleTimeoutMs so a timeout fires without a real wait. */
  static connectTimeoutMs = CONNECT_TIMEOUT_MS

  static description = 'Ask Genie AI a question about a dataset'

  static examples = [
    '<%= config.bin %> analyze ask-genie abc-123 "What are the top metrics?"',
    '<%= config.bin %> analyze ask-genie abc-123 "Show trends" --thread-id tid-456',
    '<%= config.bin %> analyze ask-genie abc-123 "Summarize data" --json',
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Output as JSON'}),
    'service-url': Flags.string({
      default: 'https://agentic-service.databox.com',
      description: 'Override the agentic service base URL',
      env: 'DATABOX_AGENTIC_SERVICE_URL',
    }),
    'thread-id': Flags.string({description: 'Continue an existing conversation thread'}),
  }

  static idleTimeoutMs = IDLE_TIMEOUT_MS

  async run(): Promise<void> {
    const {args, flags} = await this.parse(AskGenie)

    const baseUrl = flags['service-url'].replace(/\/+$/, '')
    const url = `${baseUrl}/api/v1/datasets/query/stream`

    const body: Record<string, string> = {
      dataset_id: args.datasetId,
      prompt: args.question,
    }

    if (flags['thread-id']) {
      body.thread_id = flags['thread-id']
    }

    // Not AbortSignal.timeout(): its signal would also abort the body, cutting off any answer
    // that streams for longer than the connect bound. This timer is cleared once the headers arrive.
    const connectMs = AskGenie.connectTimeoutMs
    const controller = new AbortController()
    const connectTimer = setTimeout(() => controller.abort(), connectMs)

    let response: Response
    try {
      response = await fetch(url, {
        body: JSON.stringify(body),
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          'x-api-key': this.apiClient.apiKey,
        },
        method: 'POST',
        signal: controller.signal,
      })
    } catch {
      throw new ApiConnectionError(controller.signal.aborted
        ? `Genie request timed out after ${seconds(connectMs)}s.`
        : 'Could not connect to Genie. Check your internet connection.')
    } finally {
      clearTimeout(connectTimer)
    }

    if (!response.ok) {
      this.error(`Request failed: ${response.status} ${response.statusText}`, {exit: 1})
    }

    if (!response.body) {
      this.error('No response body received.', {exit: 1})
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullAnswer = ''
    let threadId: string | undefined
    let buffer = ''

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const {done, value} = await this.readChunk(reader)
      if (done) break

      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const json = trimmed.slice(6)
        let chunk: SSEChunk
        try {
          chunk = JSON.parse(json) as SSEChunk
        } catch {
          continue
        }

        if (chunk.error) {
          this.error(`Genie error: ${chunk.content}`, {exit: 1})
        }

        if (chunk.content) {
          fullAnswer += chunk.content
          if (this.outputFormat !== 'json') {
            process.stdout.write(chunk.content)
          }
        }

        if (chunk.thread_id) {
          threadId = chunk.thread_id
        }
      }
    }

    if (this.outputFormat === 'json') {
      console.log(JSON.stringify({
        answer: fullAnswer,
        dataset_id: args.datasetId,
        success: true,
        thread_id: threadId ?? null,
      }, null, 2))
    } else {
      process.stdout.write('\n')
      if (threadId) {
        process.stderr.write(`thread_id: ${threadId}\n`)
      }
    }
  }

  /**
   * The next read from the stream, failing if nothing arrives within idleTimeoutMs. A read that
   * fails outright (the socket closed mid-answer) is a transport failure too.
   */
  private async readChunk(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<ReadResult> {
    const idleMs = AskGenie.idleTimeoutMs
    let idleTimer: NodeJS.Timeout | undefined
    const idle = new Promise<never>((_resolve, reject) => {
      idleTimer = setTimeout(() => {
        // Reject before cancelling: cancel() settles the pending read as done, and whichever
        // settles first wins the race — a truncated answer must not pass as a finished one.
        reject(new ApiConnectionError(`Genie stopped responding: nothing received for ${seconds(idleMs)}s.`))
        reader.cancel().catch(() => {})
      }, idleMs)
    })

    try {
      return await Promise.race([reader.read(), idle])
    } catch (error) {
      if (error instanceof ApiConnectionError) throw error
      throw new ApiConnectionError('The connection to Genie was lost while streaming its answer.')
    } finally {
      clearTimeout(idleTimer)
    }
  }
}

function seconds(ms: number): number {
  return Math.round(ms / 1000)
}
