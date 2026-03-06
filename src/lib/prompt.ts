import * as readline from 'node:readline'

export async function prompt(message: string, options?: {mask?: boolean}): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  })

  return new Promise((resolve) => {
    if (options?.mask) {
      process.stderr.write(`${message}: `)
      let input = ''
      process.stdin.setRawMode?.(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf-8')

      const onData = (char: string) => {
        if (char === '\n' || char === '\r') {
          process.stdin.setRawMode?.(false)
          process.stdin.pause()
          process.stdin.removeListener('data', onData)
          rl.close()
          process.stderr.write('\n')
          resolve(input)
        } else if (char === '\u0003') {
          process.exit(1)
        } else if (char === '\u007F' || char === '\b') {
          if (input.length > 0) {
            input = input.slice(0, -1)
            process.stderr.write('\b \b')
          }
        } else {
          input += char
          process.stderr.write('*')
        }
      }

      process.stdin.on('data', onData)
    } else {
      rl.question(`${message}: `, (answer) => {
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
