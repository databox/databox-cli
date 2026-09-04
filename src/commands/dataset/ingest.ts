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
    '<%= config.bin %> dataset ingest 12345 --records \'[{"date":"2024-01-01","value":42}]\'',
    '<%= config.bin %> dataset ingest 12345 --file ./data.json',
    'cat data.json | <%= config.bin %> dataset ingest 12345',
    '<%= config.bin %> dataset ingest 12345 --records \'[{"date":"2024-01-01","value":42}]\' --json',
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

    this.requireNumericId(args.datasetId, 'Dataset ID')

    let records: unknown[]

    if (flags.records) {
      try {
        records = JSON.parse(flags.records) as unknown[]
      } catch {
        this.error('Invalid JSON in --records. Expected a JSON array of records.', {exit: 2})
      }
    } else if (flags.file) {
      if (!fs.existsSync(flags.file)) {
        this.error(`File not found: ${flags.file}`, {exit: 2})
      }

      const fileContent = fs.readFileSync(flags.file, 'utf-8')
      try {
        records = JSON.parse(fileContent) as unknown[]
      } catch {
        this.error(`Invalid JSON in file "${flags.file}". Expected a JSON array of records.`, {exit: 2})
      }
    } else if (!process.stdin.isTTY) {
      const chunks: Buffer[] = []
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer)
      }

      const input = Buffer.concat(chunks).toString('utf-8')
      try {
        records = JSON.parse(input) as unknown[]
      } catch {
        this.error('Invalid JSON from stdin. Expected a JSON array of records.', {exit: 2})
      }
    } else {
      this.error('Provide data via --records, --file, or stdin pipe.', {exit: 1})
    }

    const response = await this.apiClient.post<IngestResponse>(`/v2/datasets/${args.datasetId}/data`, {records}, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
