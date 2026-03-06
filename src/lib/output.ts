export interface Column<T> {
  get?: (row: T) => string
  header: string
  key?: keyof T
}

export function formatOutput<T>(
  data: T[],
  columns: Column<T>[],
  json: boolean,
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2))
    return
  }

  if (data.length === 0) {
    console.log('No results found.')
    return
  }

  const headers = columns.map((c) => c.header)
  const rows = data.map((row) =>
    columns.map((col) => {
      if (col.get) return col.get(row)
      if (col.key) return String((row as Record<string, unknown>)[col.key as string] ?? '')
      return ''
    }),
  )

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length)),
  )

  const line = widths.map((w) => '─'.repeat(w + 2)).join('┼')
  const formatRow = (cells: string[]) =>
    cells.map((c, i) => ` ${c.padEnd(widths[i])} `).join('│')

  console.log(formatRow(headers))
  console.log(line)
  for (const row of rows) {
    console.log(formatRow(row))
  }
}

export function formatSingle<T>(
  data: T,
  json: boolean,
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2))
    return
  }

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
    const display = value === null || value === undefined ? 'N/A' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    console.log(`${label}: ${display}`)
  }
}
