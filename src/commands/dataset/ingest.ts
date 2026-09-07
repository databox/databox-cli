import * as fs from 'node:fs'

import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {UPLOAD_TIMEOUT_MS} from '../../lib/api-client.js'
import {formatSingle} from '../../lib/output.js'

/** Mirrors the API's IngestSettings (MaxRecords / MaxPayloadSizeMb). */
const MAX_RECORDS = 10_000
const MAX_PAYLOAD_MB = 100
const MAX_PAYLOAD_BYTES = MAX_PAYLOAD_MB * 1024 * 1024

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
      let bytes = 0
      for await (const chunk of process.stdin) {
        bytes += (chunk as Buffer).length
        if (bytes > MAX_PAYLOAD_BYTES) {
          this.error(`Input exceeds the ${MAX_PAYLOAD_MB} MB limit the API accepts.`, {exit: 2})
        }

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

    if (!Array.isArray(records)) {
      this.error('Records must be a JSON array of objects.', {exit: 2})
    }

    // Checked before uploading: the server rejects these too, but only after the
    // whole payload has gone over the wire.
    if (records.length > MAX_RECORDS) {
      this.error(
        `${records.length} records exceeds the API limit of ${MAX_RECORDS} per request. Split the payload.`,
        {exit: 2},
      )
    }

    const payloadBytes = Buffer.byteLength(JSON.stringify({records}), 'utf-8')
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      this.error(
        `Payload is ${Math.round(payloadBytes / 1024 / 1024)} MB, over the API limit of ${MAX_PAYLOAD_MB} MB. Split the payload.`,
        {exit: 2},
      )
    }

    const response = await this.apiClient.post<IngestResponse>(
      `/v2/datasets/${args.datasetId}/data`,
      {records},
      this.accountHeaders,
      {timeoutMs: UPLOAD_TIMEOUT_MS},
    )

    formatSingle(response, this.flags.json)
  }
}
