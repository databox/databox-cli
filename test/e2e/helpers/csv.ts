/**
 * Reads `--output csv` back into rows, so a suite can check a cell under a named header rather
 * than grep the raw text. RFC 4180, as src/lib/output.ts writes it: a field holding a comma, quote
 * or line break is quoted, with inner quotes doubled.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }

      continue
    }

    switch (char) {
    case '"': {
      quoted = true

      break
    }

    case ',': {
      row.push(field)
      field = ''

      break
    }

    case '\n': {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''

      break
    }

    default: {
      field += char
    }
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/** The cells under `header`, one per data row. Throws when the header is missing. */
export function csvColumn(rows: string[][], header: string): string[] {
  const index = rows[0]?.indexOf(header) ?? -1
  if (index === -1) {
    throw new Error(`CSV has no "${header}" column; headers are ${JSON.stringify(rows[0] ?? [])}`)
  }

  return rows.slice(1).map(row => row[index] ?? '')
}
