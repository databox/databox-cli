import DashboardMetrics from '../dashboard/metrics.js'

/** `dashboard metrics` under its old name, kept until a major release removes it. oclif prints the warning. */
export default class DataboardMetrics extends DashboardMetrics {
  // Restated because oclif's parse() spreads the command class, which copies only its own statics.
  static args = DashboardMetrics.args

  static deprecationOptions = {to: 'dashboard metrics'}

  static description = 'Get the metrics on a dashboard (deprecated: use "dashboard metrics")'

  static examples = [
    '<%= config.bin %> databoard metrics 12345',
    '<%= config.bin %> databoard metrics 12345 --json',
  ]

  static state = 'deprecated'
}
