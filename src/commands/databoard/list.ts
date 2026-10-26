import DashboardList from '../dashboard/list.js'

/** `dashboard list` under its old name, kept until a major release removes it. oclif prints the warning. */
export default class DataboardList extends DashboardList {
  static deprecationOptions = {to: 'dashboard list'}

  static description = 'List dashboards (deprecated: use "dashboard list")'

  static examples = [
    '<%= config.bin %> databoard list',
    '<%= config.bin %> databoard list --search marketing --json',
  ]

  static state = 'deprecated'
}
