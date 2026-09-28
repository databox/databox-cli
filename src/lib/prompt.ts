import {Errors} from '@oclif/core'
import * as readline from 'node:readline'

export async function prompt(message: string, options?: {mask?: boolean}): Promise<string> {
  return new Promise((resolve, reject) => {
    // The mask path reads stdin itself. A readline interface must not be open here: on a
    // terminal it echoes every keystroke in clear text, next to the mask's '*'.
    if (options?.mask) {
      process.stderr.write(`${message}: `)
      let input = ''
      process.stdin.setRawMode?.(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')

      // Hands the terminal back before the prompt settles either way.
      const finish = () => {
        process.stdin.setRawMode?.(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onData)
        process.stdin.removeListener('end', onEnd)
        process.stderr.write('\n')
      }

      // stdin closed before Enter: without this the promise never settles, and Node exits 13
      // with "unsettled top-level await".
      const onEnd = () => {
        finish()
        reject(new Errors.CLIError('No input: stdin closed before Enter.', {exit: 2}))
      }

      // A paste arrives as one chunk, usually with its line ending, so walk it a character at
      // a time: an Enter inside the chunk ends the input, and whatever follows it is dropped.
      const onData = (chunk: string) => {
        for (const char of chunk) {
          switch (char) {
          case '\n':
          case '\r': {
            finish()
            resolve(input)

            return
          }

          // Raw mode delivers Ctrl-C as a character rather than SIGINT, so abort explicitly,
          // with the conventional 130 exit code for an interrupt.
          case '\u0003': {
            finish()
            reject(new Errors.CLIError('Aborted.', {exit: 130}))

            return
          }

          case '\u007F':
          case '\b': {
            if (input.length > 0) {
              input = input.slice(0, -1)
              process.stderr.write('\b \b')
            }

            break
          }

          default: {
            input += char
            process.stderr.write('*')
          }
          }
        }
      }

      process.stdin.on('data', onData)
      process.stdin.once('end', onEnd)
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stderr,
      })

      // Without these the promise never settles on Ctrl-C or a closed stdin, and Node exits 13
      // with "unsettled top-level await". A settled promise ignores the later calls, so the
      // close that follows an answer or an abort changes nothing.
      rl.on('SIGINT', () => {
        reject(new Errors.CLIError('Aborted.', {exit: 130}))
        rl.close()
        process.stderr.write('\n')
      })

      // stdin ended with no answer (Ctrl-D at the terminal): an empty answer, which confirm()
      // reads as "no".
      rl.on('close', () => resolve(''))

      rl.question(`${message}: `, answer => {
        resolve(answer)
        rl.close()
      })
    }
  })
}

/** An API key or a y/n answer is far shorter; a longer first line is not what was asked for. */
const MAX_PIPED_LINE_LENGTH = 64 * 1024

/**
 * Reads the first line piped on stdin, trimmed, for when stdin is not a terminal. Resolves ''
 * when that line is empty or stdin ends with nothing. The input is never echoed, but `message`
 * is written to stderr first: a person on a non-terminal stdin (`ssh host cmd` without -t)
 * still sees what is being asked, and stdout stays clean for scripts.
 */
export async function readPipedLine(message?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let input = ''
    if (message) {
      process.stderr.write(`${message}: `)
    }

    const finish = () => {
      process.stdin.removeListener('data', onData)
      process.stdin.removeListener('end', onEnd)
      process.stdin.removeListener('error', onError)
      process.stdin.pause()
      if (message) {
        process.stderr.write('\n')
      }
    }

    const onData = (chunk: Buffer | string) => {
      input += String(chunk)
      const lineEnd = input.search(/[\n\r]/)
      if (lineEnd !== -1) {
        finish()
        resolve(input.slice(0, lineEnd).trim())
      } else if (input.length > MAX_PIPED_LINE_LENGTH) {
        finish()
        reject(new Errors.CLIError('Piped input is not a single short line.', {exit: 2}))
      }
    }

    const onEnd = () => {
      finish()
      resolve(input.trim())
    }

    const onError = () => {
      finish()
      reject(new Errors.CLIError('Could not read stdin.', {exit: 2}))
    }

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', onData)
    process.stdin.once('end', onEnd)
    process.stdin.once('error', onError)
    process.stdin.resume()
  })
}

function isYes(answer: string): boolean {
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

// Off a terminal the answer can still be piped (`yes | databox dataset delete 1`). An empty
// first line, or a stdin that ends with nothing, is not a "no": reading it as one would exit 0
// having done nothing, which a script cannot tell from success. Refuse instead.
export async function confirm(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    const answer = await readPipedLine(`${message} (y/n)`)
    if (!answer) {
      throw new Errors.CLIError(
        'Refusing to prompt: stdin is not a terminal and no confirmation was piped. Pass --force to confirm.',
        {exit: 2},
      )
    }

    return isYes(answer)
  }

  return isYes(await prompt(`${message} (y/n)`))
}
