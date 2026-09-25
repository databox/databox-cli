import {expect} from 'chai'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'
import * as ts from 'typescript'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const E2E_DIR = path.join(REPO_ROOT, 'test', 'e2e')
const COMMANDS_DIR = path.join(REPO_ROOT, 'src', 'commands')

/** Commands a plugin contributes rather than src/commands (package.json `oclif.plugins`). */
const PLUGIN_COMMANDS = new Set(['help'])

/**
 * Argv the suites run knowing no such command exists. Keyed by the command words, so an
 * entry covers every call site that spells them. Add to this only for a deliberate negative
 * test, never to quiet a stale call.
 */
const NEGATIVE_TESTS = new Set([
  // organization.e2e.ts: the v1 account listing twins, pinned so they do not creep back.
  'account data-sources',
  'account datasets',
  // cli-contract.e2e.ts: an unknown command must not print the key either.
  'nonesuch',
])

/** Calls that take an argv array, and which argument it is. */
const ARGV_PARAMETERS: Record<string, number> = {
  cli: 0,
  cliWithRetry: 0,
  rememberRestore: 1,
  withRestore: 1,
}

interface ArgvSite {
  location: string
  words: string[]
}

function listTsFiles(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listTsFiles(full)
    return entry.name.endsWith('.ts') ? [full] : []
  })
}

function isStringLiteral(node: ts.Node): node is ts.NoSubstitutionTemplateLiteral | ts.StringLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
}

/**
 * Every argv array literal in a file, found where it is used: an argument to one of
 * ARGV_PARAMETERS, or the array a variable passed there was declared with, or each argv of
 * a `for (const argv of [[…], […]])` loop passed there.
 */
function argvSites(file: string): ArgvSite[] {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)

  // What an identifier can hold, by name. Same-named bindings in different scopes are all
  // checked, which only ever checks more.
  const bindings = new Map<string, ts.Expression[]>()
  const bind = (name: string, value: ts.Expression) => bindings.set(name, [...(bindings.get(name) ?? []), value])
  const calls: ts.Expression[] = []

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      bind(node.name.text, node.initializer)
    }

    if (
      ts.isForOfStatement(node)
      && ts.isVariableDeclarationList(node.initializer)
      && ts.isIdentifier(node.initializer.declarations[0].name)
      && ts.isArrayLiteralExpression(node.expression)
    ) {
      for (const element of node.expression.elements) bind(node.initializer.declarations[0].name.text, element)
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text in ARGV_PARAMETERS) {
      const argument = node.arguments[ARGV_PARAMETERS[node.expression.text]]
      if (argument) calls.push(argument)
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  // An identifier resolves to the arrays it was bound to; anything else (a parameter, a
  // property) is built at runtime and cannot be checked statically.
  const arraysOf = (expression: ts.Expression, seen: Set<string>): ts.ArrayLiteralExpression[] => {
    if (ts.isArrayLiteralExpression(expression)) return [expression]
    if (!ts.isIdentifier(expression) || seen.has(expression.text)) return []
    const next = new Set(seen).add(expression.text)
    return (bindings.get(expression.text) ?? []).flatMap(value => arraysOf(value, next))
  }

  // The leading string literals up to the first flag or runtime value. `[...argv, '--json']`
  // takes the words of the array it spreads.
  const wordsOf = (array: ts.ArrayLiteralExpression, seen: Set<string>): string[][] => {
    const [first] = array.elements
    if (first && ts.isSpreadElement(first)) {
      return arraysOf(first.expression, seen).flatMap(inner => wordsOf(inner, seen))
    }

    const words: string[] = []
    for (const element of array.elements) {
      if (!isStringLiteral(element) || element.text.startsWith('-')) break
      words.push(element.text)
    }

    return [words]
  }

  const arrays = new Set(calls.flatMap(call => arraysOf(call, new Set())))
  return [...arrays].flatMap(array => {
    const {line} = source.getLineAndCharacterOfPosition(array.getStart())
    const location = `${path.relative(REPO_ROOT, file)}:${line + 1}`
    return wordsOf(array, new Set()).map(words => ({location, words}))
  })
}

/**
 * Whether oclif would find a command for these words: the first `<topic>/…/<command>.ts`
 * they reach wins, as the rest are arguments. Words that stop at a topic with nothing
 * after them, or before a runtime value, cannot be judged and pass.
 */
function resolvesToCommand(words: string[]): boolean {
  if (words.length === 0 || PLUGIN_COMMANDS.has(words[0])) return true

  let dir = COMMANDS_DIR
  for (const word of words) {
    if (fs.existsSync(path.join(dir, `${word}.ts`))) return true
    dir = path.join(dir, word)
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false
  }

  return true
}

/** The allowlist entry an argv matches, if any. */
function negativeTestFor(words: string[]): string | undefined {
  return [...NEGATIVE_TESTS].find(entry => entry === words.slice(0, entry.split(' ').length).join(' '))
}

/**
 * `npm test` never loads an e2e file, so a command renamed or removed in src/commands/
 * leaves a stale `cli(['old-topic', 'cmd'])` green until someone runs the live suite. This
 * checks every argv the suites build against the commands that exist.
 */
describe('e2e argv', () => {
  const sites = listTsFiles(E2E_DIR).flatMap(file => argvSites(file))

  it('finds the argv the suites build, in every form they build it', () => {
    const spelled = new Set(sites.map(site => site.words.join(' ')))

    // One per form: a multi-line literal in a helper, a multi-line literal passed through a
    // variable to withRestore(), a spread of a variable, and a for-of over argv literals.
    for (const words of ['dataset create', 'connection set-permissions', 'metric drilldown', 'account datasets']) {
      expect(spelled, `the scanner no longer sees "${words}"`).to.include(words)
    }
  })

  it('calls only commands that exist in src/commands/', () => {
    const stale = sites
    .filter(site => !negativeTestFor(site.words) && !resolvesToCommand(site.words))
    .map(site => `  ${site.location}  databox ${site.words.join(' ')}`)

    expect(stale, `e2e call sites name a command src/commands/ does not have:\n${stale.join('\n')}\n`).to.deep.equal([])
  })

  it('keeps its negative-test allowlist to argv that is still used and still names no command', () => {
    for (const entry of NEGATIVE_TESTS) {
      const words = entry.split(' ')
      expect(sites.some(site => negativeTestFor(site.words) === entry), `"${entry}" is no longer called by any suite`).to.equal(true)
      expect(resolvesToCommand(words), `"${entry}" is a command now; drop it from the allowlist`).to.equal(false)
    }
  })
})
