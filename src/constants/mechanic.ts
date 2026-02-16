export const MECHANIC_VEHICLE_TYPES = [
  { value: 'SEDAN', label: 'Saloon / Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'HATCHBACK', label: 'Hatchback' },
  { value: 'VAN', label: 'Van' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
] as const

export const EXPERTISE_OPTIONS = [
  { value: 'MECHANICAL', label: 'Mechanical' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'AC', label: 'AC / Climate' },
  { value: 'BRAKES', label: 'Brakes' },
  { value: 'ENGINE', label: 'Engine' },
  { value: 'TRANSMISSION', label: 'Transmission' },
  { value: 'OTHER', label: 'Other' },
] as const

export type ExpertiseValue = typeof EXPERTISE_OPTIONS[number]['value']
