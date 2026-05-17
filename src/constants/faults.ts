/**
 * Catch-all fault names — keep in sync with API seed + migration
 * `add_catchall_faults`.
 */
export const CATCHALL_FAULT_NAMES = new Set([
  'Other electrical issue (not listed)',
  'Other mechanical issue (not listed)',
])

/** Puts catch-all options last so specific issues stay easy to find. */
export function sortFaultsForIssuePicker<T extends { name?: string }>(faults: T[]): T[] {
  return [...faults].sort((a, b) => {
    const aCatch = a.name && CATCHALL_FAULT_NAMES.has(a.name) ? 1 : 0
    const bCatch = b.name && CATCHALL_FAULT_NAMES.has(b.name) ? 1 : 0
    if (aCatch !== bCatch) return aCatch - bCatch
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
  })
}
