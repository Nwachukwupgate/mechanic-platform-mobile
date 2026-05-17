import { api } from './api'

export type GeocodeSearchResult = { lat: number; lng: number; label: string }

export type ReverseGeocodeResult = {
  street: string
  city: string
  state: string
  fullAddress: string
}

/** Split backend/OSM formatted address into display fields. */
function parseFormattedAddress(address: string): ReverseGeocodeResult {
  const fullAddress = address.trim()
  const parts = fullAddress.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 3) {
    return {
      street: parts[0],
      city: parts[parts.length - 2] ?? '',
      state: parts[parts.length - 1] ?? '',
      fullAddress,
    }
  }
  if (parts.length === 2) {
    return { street: parts[0], city: parts[1], state: '', fullAddress }
  }
  return { street: fullAddress, city: '', state: '', fullAddress }
}

/**
 * Reverse geocode via platform API (no Google key required on device).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const { data } = await api.get<{ address: string }>('/geocoding/reverse', {
    params: { lat, lng },
  })
  return parseFormattedAddress(data.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
}

/** Forward geocode (address search) via platform API. */
export async function searchAddress(query: string): Promise<GeocodeSearchResult[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const { data } = await api.get<{ results: GeocodeSearchResult[] }>('/geocoding/search', {
    params: { q },
  })
  return Array.isArray(data.results) ? data.results : []
}
