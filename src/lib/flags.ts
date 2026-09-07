import {Flags} from '@oclif/core'

/**
 * Shared flag definitions and parsing for patterns the commands repeat.
 *
 * Pagination is 0-indexed throughout, matching the API.
 */

export const paginationFlags = {
  page: Flags.integer({description: 'Page number (0-indexed)', min: 0}),
  'page-size': Flags.integer({description: 'Number of items per page', min: 1}),
}

export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
}

export interface Paginated<T> {
  items: T[]
  pagination?: Pagination
}

export type Query = Record<string, number | string | undefined>

/** Adds `page`/`pageSize` to a query when the flags were given. */
export function addPagination(query: Query, flags: {'page-size'?: number; page?: number}): Query {
  if (flags.page !== undefined) query.page = flags.page
  if (flags['page-size'] !== undefined) query.pageSize = flags['page-size']
  return query
}

export const sortFlags = {
  'sort-by': Flags.string({description: 'Field to sort by'}),
  'sort-order': Flags.string({description: 'Sort direction', options: ['asc', 'desc']}),
}

/** Adds `sortBy`/`sortOrder` to a query when the flags were given. */
export function addSorting(query: Query, flags: {'sort-by'?: string; 'sort-order'?: string}): Query {
  if (flags['sort-by']) query.sortBy = flags['sort-by']
  if (flags['sort-order']) query.sortOrder = flags['sort-order']
  return query
}
