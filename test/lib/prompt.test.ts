import {Errors} from '@oclif/core'
import {expect} from 'chai'

import {confirm, prompt, readPipedLine} from '../../src/lib/prompt.js'
import {pipeStdin} from '../helpers.js'

/**
 * A fake terminal for prompt(). stdin's mode switches and reads are stubbed, so the real stdin
 * is never touched and input arrives only through type(). stdin claims to be a TTY, as confirm()
 * requires, and so does stderr, which puts
 * any readline interface into terminal mode: the mode that echoed the masked key. Everything
 * written to stderr is recorded.
 */
function fakeTerminal(): {end(): void; restore(): void; type(chunk: string): void; written(): string} {
  const written: string[] = []
  const saved: Array<{descriptor?: PropertyDescriptor; key: string; target: object}> = []

  const stub = (target: object, key: string, value: unknown): void => {
    saved.push({descriptor: Object.getOwnPropertyDescriptor(target, key), key, target})
    Object.defineProperty(target, key, {configurable: true, value, writable: true})
  }

  for (const method of ['pause', 'resume', 'setEncoding', 'setRawMode']) {
    stub(process.stdin, method, () => process.stdin)
  }

  stub(process.stdin, 'isTTY', true)
  stub(process.stderr, 'isTTY', true)
  stub(process.stderr, 'write', (chunk: unknown) => {
    written.push(String(chunk))
    return true
  })

  return {
    end: () => process.stdin.emit('end'),
    restore() {
      for (const {descriptor, key, target} of saved.reverse()) {
        if (descriptor) Object.defineProperty(target, key, descriptor)
        else delete (target as Record<string, unknown>)[key]
      }
    },
    type: chunk => process.stdin.emit('data', chunk),
    written: () => written.join(''),
  }
}

async function rejection(promise: Promise<unknown>): Promise<Errors.CLIError> {
  try {
    await promise
  } catch (error) {
    return error as Errors.CLIError
  }

  throw new Error('Expected the prompt to reject')
}

describe('prompt with mask', () => {
  let terminal: ReturnType<typeof fakeTerminal>

  beforeEach(() => {
    terminal = fakeTerminal()
  })

  afterEach(() => {
    terminal.restore()
  })

  it('writes only the mask for typed characters, never the characters', async () => {
    const answer = prompt('Key', {mask: true})
    for (const char of 'FAKE') terminal.type(char)
    terminal.type('\r')

    expect(await answer).to.equal('FAKE')
    expect(terminal.written()).to.equal('Key: ****\n')
  })

  it('ends a pasted chunk at its Enter and drops what follows', async () => {
    const answer = prompt('Key', {mask: true})
    terminal.type('FAKE\r\njunk')

    expect(await answer).to.equal('FAKE')
    expect(terminal.written()).to.equal('Key: ****\n')
  })

  it('erases the last character on backspace', async () => {
    const answer = prompt('Key', {mask: true})
    terminal.type('FAKX')
    terminal.type('\u007F')
    terminal.type('E\r')

    expect(await answer).to.equal('FAKE')
    expect(terminal.written()).to.equal('Key: ****\b \b*\n')
  })

  it('aborts on Ctrl-C with exit 130', async () => {
    const answer = prompt('Key', {mask: true})
    terminal.type('FA\u0003')

    const error = await rejection(answer)
    expect(error.message).to.equal('Aborted.')
    expect(error.oclif.exit).to.equal(130)
  })

  it('stops listening to stdin once it settles', async () => {
    const before = process.stdin.listenerCount('data')
    const answer = prompt('Key', {mask: true})
    terminal.type('FAKE\r')
    await answer

    expect(process.stdin.listenerCount('data')).to.equal(before)
  })

  it('rejects with exit 2 when stdin ends before Enter, instead of never settling', async () => {
    const before = process.stdin.listenerCount('end')
    const answer = prompt('Key', {mask: true})
    terminal.type('FA')
    terminal.end()

    const error = await rejection(answer)
    expect(error.message).to.equal('No input: stdin closed before Enter.')
    expect(error.oclif.exit).to.equal(2)
    expect(process.stdin.listenerCount('end')).to.equal(before)
  })
})

describe('confirm', () => {
  let terminal: ReturnType<typeof fakeTerminal>

  beforeEach(() => {
    terminal = fakeTerminal()
  })

  afterEach(() => {
    terminal.restore()
  })

  it('reads a yes', async () => {
    const answer = confirm('Sure')
    terminal.type('y\r')

    expect(await answer).to.equal(true)
  })

  it('reads anything else as no', async () => {
    const answer = confirm('Sure')
    terminal.type('n\r')

    expect(await answer).to.equal(false)
  })

  it('aborts on Ctrl-C with exit 130 instead of never settling', async () => {
    const answer = confirm('Sure')
    terminal.type('\u0003')

    const error = await rejection(answer)
    expect(error.message).to.equal('Aborted.')
    expect(error.oclif.exit).to.equal(130)
  })

  it('reads a closed stdin as no instead of never settling', async () => {
    const answer = confirm('Sure')
    terminal.end()

    expect(await answer).to.equal(false)
  })
})

describe('confirm off a terminal', () => {
  let restore: () => void
  let written: string[]
  const realWrite = process.stderr.write

  beforeEach(() => {
    written = []
    process.stderr.write = ((chunk: string) => written.push(String(chunk)) > 0) as typeof process.stderr.write
  })

  afterEach(() => {
    process.stderr.write = realWrite
    restore()
  })

  // A person on a non-terminal stdin (ssh without -t) must still see what is being asked.
  it('writes the question to stderr before reading the answer', async () => {
    restore = pipeStdin('y\n')

    await confirm('Delete dataset 1?')
    expect(written.join('')).to.equal('Delete dataset 1? (y/n): \n')
  })

  it('refuses with exit 2 when the first piped line is empty', async () => {
    restore = pipeStdin('\ny\n')

    const error = await rejection(confirm('Sure'))
    expect(error.oclif.exit).to.equal(2)
  })

  for (const answer of ['y\n', 'yes\n', 'Y\r\n']) {
    it(`reads a piped ${JSON.stringify(answer)} as yes`, async () => {
      restore = pipeStdin(answer)

      expect(await confirm('Sure')).to.equal(true)
    })
  }

  it('reads a piped n as no', async () => {
    restore = pipeStdin('n\n')

    expect(await confirm('Sure')).to.equal(false)
  })

  it('refuses with exit 2 when nothing is piped, instead of reading it as no', async () => {
    restore = pipeStdin('')

    const error = await rejection(confirm('Sure'))
    expect(error.message).to.equal(
      'Refusing to prompt: stdin is not a terminal and no confirmation was piped. Pass --force to confirm.',
    )
    expect(error.oclif.exit).to.equal(2)
  })
})

describe('readPipedLine', () => {
  let restore: () => void

  afterEach(() => {
    restore()
  })

  it('returns the first line, trimmed, and stops listening', async () => {
    const before = process.stdin.listenerCount('data')
    restore = pipeStdin('  pak_FAKE \r\nsecond line\n')

    expect(await readPipedLine()).to.equal('pak_FAKE')
    expect(process.stdin.listenerCount('data')).to.equal(before)
  })

  it('returns a last line with no line ending', async () => {
    restore = pipeStdin('pak_FAKE')

    expect(await readPipedLine()).to.equal('pak_FAKE')
  })

  it('returns an empty string when stdin ends with nothing', async () => {
    restore = pipeStdin('')

    expect(await readPipedLine()).to.equal('')
  })

  it('rejects with exit 2 a first line longer than any key or answer', async () => {
    restore = pipeStdin('x'.repeat((64 * 1024) + 1))

    const error = await rejection(readPipedLine())
    expect(error.message).to.equal('Piped input is not a single short line.')
    expect(error.oclif.exit).to.equal(2)
  })
})
