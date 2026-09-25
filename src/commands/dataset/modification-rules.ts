import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DataTypeOption {
  displayName: string
  id: string
}

/** DatasetResponse.cs `ModificationRulesResponse`. */
interface ModificationRules {
  dataTypeRules: {
    /** Keyed by the column's current physical type. A null input format means none is needed. */
    conversionsByPhysicalType: Record<string, Array<{inputFormats: Array<DataTypeOption | null>; outputLogicalType: string}>>
    outputFormats: {
      byLogicalType: Record<string, Array<{format: string} & DataTypeOption>>
      scalableLogicalTypes: string[]
      scaleOptions: Array<{example: string} & DataTypeOption>
    }
  }
  /** Filter operators allowed per column type. */
  filterRules: Record<string, string[]>
}

export default class DatasetModificationRules extends BaseCommand<typeof DatasetModificationRules> {
  static description = `List the filter operators and type conversions modifications accept

Filter operators are what "filters" conditions take as "type", per column type. Type conversions are what "dataTypes" accepts as "outputLogicalType" (and "inputFormat"), per current column type, followed by the output formats and scales.`

  static examples = [
    '<%= config.bin %> dataset modification-rules',
    '<%= config.bin %> dataset modification-rules --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<ModificationRules>('/v2/datasets/modifications/rules', undefined, this.accountHeaders)

    if (this.outputFormat !== 'table') {
      formatSingle(response, this.outputFormat)
      return
    }

    const {conversionsByPhysicalType, outputFormats} = response.dataTypeRules

    this.log('Filter operators by column type:')
    for (const [type, operators] of Object.entries(response.filterRules)) {
      this.log(`  ${type}: ${operators.join(', ')}`)
    }

    this.log('')
    this.log('Type conversions by current column type:')
    for (const [type, conversions] of Object.entries(conversionsByPhysicalType)) {
      const targets = conversions.map(({inputFormats, outputLogicalType}) => {
        const formats = inputFormats.filter(f => f !== null).map(f => f.id)
        return formats.length > 0 ? `${outputLogicalType} (input formats: ${formats.join(', ')})` : outputLogicalType
      })
      this.log(`  ${type}: ${targets.join('; ')}`)
    }

    this.log('')
    this.log('Output formats by logical type:')
    for (const [type, formats] of Object.entries(outputFormats.byLogicalType)) {
      this.log(`  ${type}: ${formats.map(f => `${f.id} (${f.format})`).join(', ')}`)
    }

    this.log('')
    this.log(`Scales (for ${outputFormats.scalableLogicalTypes.join(', ')}): ${outputFormats.scaleOptions.map(s => `${s.id} (${s.example})`).join(', ')}`)
  }
}
