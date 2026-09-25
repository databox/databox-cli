export interface Column<T> {
  get?: (row: T) => string
  header: string
  key?: keyof T
}

export const OUTPUT_FORMATS = ['table', 'json', 'csv'] as const

/** Chosen by the global --output flag (or its --json shorthand); see BaseCommand.outputFormat. */
export type OutputFormat = typeof OUTPUT_FORMATS[number]

/**
 * Whether the CLI's own output may be coloured: off under --no-color or a non-empty NO_COLOR
 * (https://no-color.org). That output has no colour today, so nothing calls this yet; any
 * colour added later must check it.
 *
 * oclif's red error marker is separate. oclif decides it with supports-color 8, which honours
 * `--no-color` in argv, FORCE_COLOR, and a non-TTY stream, but not NO_COLOR.
 */
export function colorEnabled(noColorFlag: boolean, env: NodeJS.ProcessEnv = process.env): boolean {
  return !noColorFlag && !env.NO_COLOR
}

/** RFC 4180: a field holding a comma, quote or line break is quoted, with inner quotes doubled. */
function csvField(value: string): string {
  return /[\n\r",]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function csvLine(cells: string[]): string {
  return cells.map(cell => csvField(cell)).join(',')
}

export function formatOutput<T>(
  data: T[],
  columns: Column<T>[],
  format: OutputFormat,
): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2))
    return
  }

  const headers = columns.map(c => c.header)
  const rows = data.map(row =>
    columns.map(col => {
      if (col.get) return col.get(row)
      if (col.key) return String((row as Record<string, unknown>)[col.key as string] ?? '')
      return ''
    }),
  )

  // The header is printed even for no rows, so a consumer can always tell the columns.
  if (format === 'csv') {
    for (const line of [headers, ...rows]) console.log(csvLine(line))
    return
  }

  if (data.length === 0) {
    console.log('No results found.')
    return
  }

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => r[i].length)),
  )

  const line = widths.map(w => '─'.repeat(w + 2)).join('┼')
  const formatRow = (cells: string[]) =>
    cells.map((c, i) => ` ${c.padEnd(widths[i])} `).join('│')

  console.log(formatRow(headers))
  console.log(line)
  for (const row of rows) {
    console.log(formatRow(row))
  }
}

/** The footer is table-only: it would corrupt a JSON or CSV stream. */
export function showPagination(
  pagination: {page: number; pageSize: number; totalItems: number} | undefined,
  format: OutputFormat,
): void {
  if (!pagination || format !== 'table') return

  // The API pages from 0; the display is 1-based. Guard the degenerate cases:
  // totalItems 0 would read "Page 1 of 0", and pageSize 0 divides to Infinity.
  // Nothing to say when there is nothing to page through — formatOutput has already
  // printed "No results found."
  const {page, pageSize, totalItems} = pagination
  if (!totalItems) return

  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1
  console.log(`Page ${page + 1} of ${Math.max(totalPages, 1)} (${totalItems} total items)`)
}

export function formatSingle<T>(
  data: T,
  format: OutputFormat,
): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2))
    return
  }

  // One `field,value` row per property, keyed by the API's own field name.
  if (format === 'csv') {
    console.log(csvLine(['field', 'value']))
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const display = value === null || value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value))
      console.log(csvLine([key, display]))
    }

    return
  }

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const label = key.replaceAll(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
    const display = value === null || value === undefined ? 'N/A' : (typeof value === 'object' ? JSON.stringify(value) : String(value))
    console.log(`${label}: ${display}`)
  }
}
