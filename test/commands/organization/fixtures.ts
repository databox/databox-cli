/**
 * The organization as ingestion-api returns it (Contracts/Response/V2/AccountResponse.cs `AccountResponse`,
 * published as `OrganizationResponse`), shared by organization info and organization update. Nullable
 * members are present as null.
 */
export const organization = {
  address: {
    city: 'Boston', country: 'US', state: 'MA', street: '1 Main St', zip: '02110',
  },
  billingName: 'Test Co Billing',
  companyName: 'Test Co',
  id: 1,
  managedBy: null,
  metadata: {
    annualRevenue: '$1M-$10M', businessType: ['B2B'], companySize: '11-50', industry: ['Technology'],
  },
  name: 'Test Organization',
  settings: {
    calendar: 'customFiscal',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 'monday',
    fiscalYearStart: {day: 1, month: 4},
    numberFormat: 'GroupingCommaDecimalDot',
  },
  taxNumber: 'US123',
  websiteUrl: 'https://example.com',
}
