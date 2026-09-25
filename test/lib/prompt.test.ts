import {Errors} from '@oclif/core'
import {expect} from 'chai'

import {confirm, prompt} from '../../src/lib/prompt.js'

/**
 * A fake terminal for prompt(). stdin's mode switches and reads are stubbed, so the real stdin
 * is never touched and input arrives only through type(). stderr claims to be a TTY, which puts
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
