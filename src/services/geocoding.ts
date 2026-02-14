const GEOCODING_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

export type ReverseGeocodeResult = {
  street: string;
  city: string;
  state: string;
  fullAddress: string;
};

/**
 * Reverse geocode lat/lng to address using Google Geocoding API.
 * Returns street, city, state, and a full formatted address.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set');
  }

  const url = `${GEOCODING_BASE}?latlng=${lat},${lng}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Geocoding failed: ${data.status}`);
  }

  const results = data.results || [];
  if (results.length === 0) {
    return {
      street: '',
      city: '',
      state: '',
      fullAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  }

  const components = results[0].address_components || [];
  const fmt = results[0].formatted_address || '';

  let street = '';
  let city = '';
  let state = '';

  for (const c of components) {
    const types = c.types || [];
    if (types.includes('street_number')) street = (street + ' ' + c.long_name).trim();
    if (types.includes('route')) street = (street + ' ' + c.long_name).trim();
    if (types.includes('locality')) city = c.long_name;
    if (types.includes('administrative_area_level_1')) state = c.long_name;
  }

  if (!street && components.length > 0) {
    const route = components.find((c: { types: string[] }) => c.types?.includes('route'));
    const num = components.find((c: { types: string[] }) => c.types?.includes('street_number'));
    if (num?.long_name) street = num.long_name;
    if (route?.long_name) street = (street + ' ' + route.long_name).trim();
  }
  if (!city) {
    const admin = components.find((c: { types: string[] }) => c.types?.includes('administrative_area_level_2'));
    if (admin?.long_name) city = admin.long_name;
  }

  return {
    street: street || fmt.split(',')[0]?.trim() || '',
    city,
    state,
    fullAddress: fmt,
  };
}
