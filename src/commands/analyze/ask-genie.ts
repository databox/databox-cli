import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'

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

  static description = 'Ask Genie AI a question about a dataset'

  static examples = [
    '<%= config.bin %> analyze ask-genie abc-123 "What are the top metrics?"',
    '<%= config.bin %> analyze ask-genie abc-123 "Show trends" --thread-id tid-456',
    '<%= config.bin %> analyze ask-genie abc-123 "Summarize data" --json',
  ]

  static flags = {
    json: Flags.boolean({description: 'Output as JSON', default: false}),
    'service-url': Flags.string({
      default: 'https://agentic-service.databox.com',
      description: 'Override the agentic service base URL',
      env: 'DATABOX_AGENTIC_SERVICE_URL',
    }),
    'thread-id': Flags.string({description: 'Continue an existing conversation thread'}),
  }

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

    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        'x-api-key': this.apiClient.apiKey,
      },
      method: 'POST',
    })

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
      const {done, value} = await reader.read()
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
          if (!flags.json) {
            process.stdout.write(chunk.content)
          }
        }

        if (chunk.thread_id) {
          threadId = chunk.thread_id
        }
      }
    }

    if (!flags.json) {
      process.stdout.write('\n')
      if (threadId) {
        process.stderr.write(`thread_id: ${threadId}\n`)
      }
    } else {
      console.log(JSON.stringify({
        answer: fullAnswer,
        dataset_id: args.datasetId,
        success: true,
        thread_id: threadId ?? null,
      }, null, 2))
    }
  }
}
