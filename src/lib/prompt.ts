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
        process.stderr.write('\n')
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

      // stdin ended with no answer (EOF, or a script without --force): an empty answer, which
      // confirm() reads as "no".
      rl.on('close', () => resolve(''))

      rl.question(`${message}: `, answer => {
        resolve(answer)
        rl.close()
      })
    }
  })
}

export async function confirm(message: string): Promise<boolean> {
  const answer = await prompt(`${message} (y/n)`)
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}
