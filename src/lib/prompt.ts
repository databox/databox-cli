import {Errors} from '@oclif/core'
import * as readline from 'node:readline'

export async function prompt(message: string, options?: {mask?: boolean}): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  })

  return new Promise((resolve, reject) => {
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
        rl.close()
        process.stderr.write('\n')
      }

      const onData = (char: string) => {
        switch (char) {
        case '\n':
        case '\r': {
          finish()
          resolve(input)

          break
        }

        // Raw mode delivers Ctrl-C as a character rather than SIGINT, so abort explicitly,
        // with the conventional 130 exit code for an interrupt.
        case '\u0003': {
          finish()
          reject(new Errors.CLIError('Aborted.', {exit: 130}))

          break
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

      process.stdin.on('data', onData)
    } else {
      rl.question(`${message}: `, answer => {
        rl.close()
        resolve(answer)
      })
    }
  })
}

export async function confirm(message: string): Promise<boolean> {
  const answer = await prompt(`${message} (y/n)`)
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}
