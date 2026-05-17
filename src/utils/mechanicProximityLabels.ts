/** Mechanics within this many km of the global minimum distance share the "Nearest" badge (max 2 garages). */
export const NEAREST_TIE_DELTA_KM = 0.5

/** Straight-line distance threshold for the optional "Very close" copy (not driving time). */
export const VERY_CLOSE_STRAIGHT_LINE_KM = 3

/**
 * Which mechanic ids get the "Nearest" badge: the one(s) with the smallest distance,
 * plus a second if it is within {@link NEAREST_TIE_DELTA_KM} of that minimum (max 2 ids).
 */
export function nearestMechanicIdsForBadge(
  mechanics: Array<{ mechanic?: { id?: string }; distanceKm?: number }>
): Set<string> {
  const withDist = mechanics
    .map((m) => ({ id: m.mechanic?.id, d: m.distanceKm }))
    .filter((x): x is { id: string; d: number } => typeof x.id === 'string' && typeof x.d === 'number' && !Number.isNaN(x.d))
  if (withDist.length === 0) return new Set()
  const minD = Math.min(...withDist.map((x) => x.d))
  const tied = withDist
    .filter((x) => x.d <= minD + NEAREST_TIE_DELTA_KM)
    .sort((a, b) => a.d - b.d)
    .slice(0, 2)
  return new Set(tied.map((t) => t.id))
}

export function isVeryCloseStraightLine(distanceKm: number | undefined): boolean {
  return typeof distanceKm === 'number' && !Number.isNaN(distanceKm) && distanceKm <= VERY_CLOSE_STRAIGHT_LINE_KM
}
