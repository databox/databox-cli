import {OutputFormat, formatOutput, formatSingle} from './output.js'
import {DatasetModification, ModificationFilterGroup} from './types.js'

function describeFilter(group: ModificationFilterGroup | undefined): string {
  if (!group) return ''
  const conditions = group.conditions.map(({type, value}) => {
    if (value === null || value === undefined) return type
    return `${type} ${typeof value === 'string' ? value : JSON.stringify(value)}`
  })
  return conditions.join(` ${group.logicalOperator} `)
}

/**
 * Prints a modification definition, as `dataset modifications` reads it and `dataset
 * update-modification` saves it. JSON is the definition whole; the table and CSV have one row
 * per column, in the dataset's column order.
 */
export function printModification(modification: DatasetModification, format: OutputFormat): void {
  if (format === 'json') {
    formatSingle(modification, format)
    return
  }

  // `order` lists every column; a key set only in another map (none expected) still gets a row.
  const columnIds = [...new Set([
    ...modification.order,
    ...Object.keys(modification.displayNames),
    ...Object.keys(modification.formulas),
    ...Object.keys(modification.filters),
    ...Object.keys(modification.dataTypes),
    ...Object.keys(modification.visibility),
  ])]

  formatOutput(
    columnIds,
    [
      {get: id => id, header: 'Column'},
      {get: id => modification.displayNames[id] ?? '', header: 'Display Name'},
      {get: id => (modification.visibility[id] === false ? 'no' : 'yes'), header: 'Visible'},
      {get: id => modification.formulas[id] ?? '', header: 'Formula'},
      {get: id => describeFilter(modification.filters[id]), header: 'Filter'},
      {get: id => modification.dataTypes[id]?.outputLogicalType ?? '', header: 'Type'},
    ],
    format,
  )
}
