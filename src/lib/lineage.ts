import {OutputFormat, formatOutput, formatSingle} from './output.js'
import {LineageNode} from './types.js'

/** The node lists DatasetLineageResponse and MetricLineageResponse share; only their own `id` differs. */
export interface Lineage {
  children: LineageNode[]
  parents: LineageNode[]
}

/**
 * Prints a lineage response, as `dataset lineage` and `metric lineage` read it. JSON is the
 * response whole; the table and CSV have one row per node, parents first.
 */
export function printLineage(lineage: Lineage, format: OutputFormat): void {
  if (format === 'json') {
    formatSingle(lineage, format)
    return
  }

  formatOutput(
    [
      ...lineage.parents.map(node => ({...node, relation: 'parent'})),
      ...lineage.children.map(node => ({...node, relation: 'child'})),
    ],
    [
      {header: 'Relation', key: 'relation'},
      {header: 'ID', key: 'id'},
      {header: 'Name', key: 'name'},
      {header: 'Type', key: 'type'},
    ],
    format,
  )
}
