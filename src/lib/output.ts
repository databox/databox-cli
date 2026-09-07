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

export function showPagination(
  pagination: {page: number; pageSize: number; totalItems: number} | undefined,
  json: boolean,
): void {
  if (!pagination || json) return

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
