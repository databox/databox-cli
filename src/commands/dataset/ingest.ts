import * as fs from 'node:fs'

import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface IngestResponse {
  ingestionId: string
  message: string
  status: string
}

export default class DatasetIngest extends BaseCommand<typeof DatasetIngest> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to ingest data into', required: true}),
  }

  static description = 'Ingest data into a dataset'

  static examples = [
    '<%= config.bin %> dataset ingest abc-123 --records \'[{"date":"2024-01-01","value":42}]\'',
    '<%= config.bin %> dataset ingest abc-123 --file ./data.json',
    'cat data.json | <%= config.bin %> dataset ingest abc-123',
    '<%= config.bin %> dataset ingest abc-123 --records \'[{"date":"2024-01-01","value":42}]\' --json',
  ]

  static flags = {
    file: Flags.string({
      description: 'Path to a JSON file containing records array',
      exclusive: ['records'],
    }),
    records: Flags.string({
      description: 'Inline JSON array of records',
      exclusive: ['file'],
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetIngest)

    let records: unknown[]

    if (flags.records) {
      records = JSON.parse(flags.records) as unknown[]
    } else if (flags.file) {
      const fileContent = fs.readFileSync(flags.file, 'utf-8')
      records = JSON.parse(fileContent) as unknown[]
    } else if (!process.stdin.isTTY) {
      const chunks: Buffer[] = []
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer)
      }

      const input = Buffer.concat(chunks).toString('utf-8')
      records = JSON.parse(input) as unknown[]
    } else {
      this.error('Provide data via --records, --file, or stdin pipe.', {exit: 1})
    }

    const response = await this.apiClient.post<IngestResponse>(`/v1/datasets/${args.datasetId}/data`, {records})

    formatSingle(response, this.flags.json)
  }
}
