import type {Column} from './output.js'
import type {SchemaColumn} from './types.js'

export type Row = Record<string, unknown>

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/**
 * Table and CSV columns for dataset rows (dataset data, modification preview). The response's
 * `schema` decides them: in `order`, headed by `displayName`, without the columns a modification
 * hid. Taking them from the schema rather than the first row keeps the CSV header when no row
 * matched. Without a schema, the first row's keys are the fallback.
 */
export function rowColumns(schema: SchemaColumn[] | null | undefined, rows: Row[]): Column<Row>[] {
  if (!schema) {
    return Object.keys(rows[0] ?? {}).map(key => ({get: row => cell(row[key]), header: key}))
  }

  return schema
  .filter(column => column.visible)
  .sort((a, b) => a.order - b.order)
  .map(column => ({get: row => cell(row[column.id]), header: column.displayName}))
}
