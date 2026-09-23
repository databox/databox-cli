import {expect} from 'chai'

import {
  colorEnabled, formatOutput, formatSingle, showPagination,
} from '../../src/lib/output.js'

/** Captures what the output functions print, one entry per console.log call. */
function capture(fn: () => void): string[] {
  const lines: string[] = []
  const original = console.log
  console.log = (line?: unknown) => {
    lines.push(String(line))
  }

  try {
    fn()
  } finally {
    console.log = original
  }

  return lines
}

describe('output: csv', () => {
  it('quotes fields holding a comma, quote or line break, and nothing else', () => {
    const rows = [{a: 'plain', b: 'with, comma'}, {a: 'say "hi"', b: 'two\nlines'}]

    const lines = capture(() => formatOutput(rows, [{header: 'A', key: 'a'}, {header: 'B', key: 'b'}], 'csv'))

    expect(lines).to.deep.equal(['A,B', 'plain,"with, comma"', '"say ""hi""","two\nlines"'])
  })

  it('prints the header alone for zero rows', () => {
    const lines = capture(() => formatOutput<{a: string}>([], [{header: 'A', key: 'a'}, {header: 'B, b', key: 'a'}], 'csv'))

    expect(lines).to.deep.equal(['A,"B, b"'])
  })

  it('renders a single record as field,value rows, with empty for null', () => {
    const lines = capture(() => formatSingle({id: 1, name: null, tags: ['x', 'y']}, 'csv'))

    expect(lines).to.deep.equal(['field,value', 'id,1', 'name,', 'tags,"[""x"",""y""]"'])
  })

  it('prints no pagination footer outside table mode', () => {
    const pagination = {page: 0, pageSize: 10, totalItems: 30}

    expect(capture(() => showPagination(pagination, 'csv'))).to.deep.equal([])
    expect(capture(() => showPagination(pagination, 'json'))).to.deep.equal([])
    expect(capture(() => showPagination(pagination, 'table'))).to.deep.equal(['Page 1 of 3 (30 total items)'])
  })
})

describe('output: colour', () => {
  it('is on by default', () => {
    expect(colorEnabled(false, {})).to.equal(true)
  })

  it('is off under --no-color', () => {
    expect(colorEnabled(true, {})).to.equal(false)
  })

  it('is off when NO_COLOR is set to anything non-empty', () => {
    expect(colorEnabled(false, {NO_COLOR: '1'})).to.equal(false)
    expect(colorEnabled(false, {NO_COLOR: 'false'})).to.equal(false)
  })

  it('ignores an empty NO_COLOR, as no-color.org specifies', () => {
    expect(colorEnabled(false, {NO_COLOR: ''})).to.equal(true)
  })
})
