import {Flags} from '@oclif/core'

/**
 * Shared flag definitions and parsing for patterns the commands repeat.
 *
 * Pagination is 0-indexed throughout, matching the API.
 */

/** ingestion-api PaginationConstants.MaxPageSize: the API clamps list page sizes to this. */
export const MAX_PAGE_SIZE = 100

/** ingestion-api PaginationConstants.MaxDataPageSize: the ceiling for the row-data endpoints. */
export const MAX_DATA_PAGE_SIZE = 1000

function buildPaginationFlags(maxPageSize: number) {
  return {
    all: Flags.boolean({
      default: false,
      description: `Fetch every page (${MAX_PAGE_SIZE} items per request unless --page-size is given) and print them as one list`,
      exclusive: ['page'],
    }),
    page: Flags.integer({description: 'Page number (0-indexed)', min: 0}),
    'page-size': Flags.integer({description: `Number of items per page (max ${maxPageSize})`, max: maxPageSize, min: 1}),
  }
}

export const paginationFlags = buildPaginationFlags(MAX_PAGE_SIZE)

/** For the endpoints that page through dataset rows, which allow larger pages. */
export const dataPaginationFlags = buildPaginationFlags(MAX_DATA_PAGE_SIZE)

export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
}

/** A list response. `items` is typed nullable because some endpoints (dataset data, drilldown) can send null. */
export interface Paginated<T> {
  items: T[] | null
  pagination?: Pagination | null
}

export type Query = Record<string, number | string | undefined>

type PaginationFlagValues = {all?: boolean; page?: number; 'page-size'?: number}

/** Adds `page`/`pageSize` to a query when the flags were given. */
export function addPagination(query: Query, flags: {page?: number; 'page-size'?: number}): Query {
  if (flags.page !== undefined) query.page = flags.page
  if (flags['page-size'] !== undefined) query.pageSize = flags['page-size']
  return query
}

/**
 * Fetches one page as the pagination flags ask, or under --all every page, concatenated.
 *
 * --all requests pages of `--page-size` (default 100) until it holds `totalItems` or a page
 * comes back empty. The page count is never read from the response's `pagination.pageSize`:
 * some endpoints echo an upstream value there that differs from the size they actually served.
 * The number of requests is capped at what `totalItems` needs at the smaller of the requested
 * size and the first page's length, plus one, so an endpoint that ignores `page` cannot loop.
 *
 * A result short of `totalItems`, or one with no total at all, is returned as-is and reported
 * through `warn` — stderr, so stdout stays parseable. The merged result carries no
 * `pagination`: there is no page left to describe, so no footer is printed.
 */
export async function fetchPaginated<R extends Paginated<unknown>>(
  flags: PaginationFlagValues,
  query: Query,
  fetchPage: (query: Query) => Promise<R>,
  warn: (message: string) => void,
): Promise<R> {
  if (!flags.all) return fetchPage(addPagination({...query}, flags))

  const pageSize = flags['page-size'] ?? MAX_PAGE_SIZE
  const first = await fetchPage({...query, page: 0, pageSize})
  const items = [...(first.items ?? [])]
  const totalItems = first.pagination?.totalItems

  if (totalItems === undefined) {
    if (items.length > 0) {
      warn(`Fetched ${items.length} items, but the API reported no total, so there may be more.`)
    }

    return {...first, items, pagination: undefined}
  }

  const servedPerPage = Math.max(1, Math.min(pageSize, items.length))
  const maxPages = Math.ceil(totalItems / servedPerPage) + 1

  for (let page = 1; page < maxPages && items.length < totalItems; page++) {
    // Sequential on purpose: each page is a request against a shared, rate-limited API.
    // eslint-disable-next-line no-await-in-loop
    const next = await fetchPage({...query, page, pageSize})
    const nextItems = next.items ?? []
    if (nextItems.length === 0) break
    items.push(...nextItems)
  }

  if (items.length < totalItems) {
    warn(`Fetched ${items.length} of ${totalItems} items: the API stopped returning pages early.`)
  }

  return {...first, items, pagination: undefined}
}

/** `options` restricts --sort-by to the fields the endpoint's service validates. */
export function sortFlags(options?: string[]) {
  return {
    'sort-by': Flags.string({description: 'Field to sort by', ...(options ? {options} : {})}),
    'sort-order': Flags.string({description: 'Sort direction', options: ['asc', 'desc']}),
  }
}

/** Adds `sortBy`/`sortOrder` to a query when the flags were given. */
export function addSorting(query: Query, flags: {'sort-by'?: string; 'sort-order'?: string}): Query {
  if (flags['sort-by']) query.sortBy = flags['sort-by']
  if (flags['sort-order']) query.sortOrder = flags['sort-order']
  return query
}

/**
 * ingestion-api SyncIntervalConstants.KnownIntervals, in minutes: the only values the dataset and
 * data-source set-sync-frequency accept; any other is a 400. Strings because oclif `options` are.
 */
export const SYNC_INTERVALS = ['1', '15', '60', '240', '360', '480', '1440']

/** For the routes ingestion-api marks [IdempotencyFilter]. */
export const idempotencyFlags = {
  'idempotency-key': Flags.string({
    description: 'A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours returns the first response instead of repeating the action',
  }),
}

export function idempotencyHeaders(flags: {'idempotency-key'?: string}): Record<string, string> {
  const key = flags['idempotency-key']
  return key ? {'Idempotency-Key': key} : {}
}
